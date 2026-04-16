// ============================================================
// WORKFLOW ENGINE — محرك تدفق عمل الحجوزات
//
// التصميم:
//   - Pure core logic (canTransition) — لا DB، قابل للاختبار
//   - DB loaders مستقلة (getWorkflowStagesForOrg)
//   - resolveWorkflowExecutionMode — مركزي، deterministic، مختبر
//   - getOrgWorkflowConfigState — يصنّف المنشأة: workflow-ready / legacy / invalid
//   - Soft mode افتراضي؛ strict فقط على workflow-ready + env مفعّل
//   - Legacy fallback دائم عند غياب مراحل مُهيأة
//
// قواعد الانتقال:
//   - TRUE_TERMINAL (cancelled, no_show): لا يمكن الخروج منها إطلاقاً
//   - GUARDED_STATES (completed, reviewed): الرجوع منها يتطلب force
//   - forward skip لمرحلة isSkippable=false: strict→مرفوض / soft→تحذير
//   - backward (غير terminal): مسموح دائماً
//   - terminal destination: مسموح دائماً (إلغاء/no_show من أي حالة)
//
// أمان force:
//   - force لا يُقيَّم هنا — canTransition يُرجع requiresForce كإشارة
//   - الـ route هو المسؤول عن التحقق من bookings.force_transition permission
//   - هذا يفصل منطق الانتقال عن منطق الصلاحيات (separation of concerns)
// ============================================================

import { db } from "@nasaq/db/client";
import { bookingPipelineStages } from "@nasaq/db/schema";
import { eq, asc } from "drizzle-orm";
import { log } from "./logger";

// ── Types ─────────────────────────────────────────────────────

export type BookingStatus =
  | "pending" | "confirmed" | "deposit_paid" | "fully_confirmed"
  | "preparing" | "in_progress" | "completed" | "reviewed"
  | "cancelled" | "no_show";

export type WorkflowMode = "strict" | "soft" | "legacy";

/** حالة إعداد الـ workflow لمنشأة معينة */
export type OrgWorkflowConfigState =
  | "workflow-ready"   // stages موجودة ومكتملة وبدون تكرار
  | "legacy-compatible" // لا stages أو stages بدون mappedStatus
  | "invalid-config";  // stages بها تكرار في mappedStatus

export interface WorkflowStage {
  id:                     string;
  name:                   string;
  sortOrder:              number;
  mappedStatus:           string | null;
  isSkippable:            boolean;
  isTerminal:             boolean;
  autoTransitionCondition: Record<string, string> | null;
  notificationTemplate:   string | null;
}

export interface TransitionResult {
  allowed:               boolean;
  requiresForce?:        boolean;  // true = blocked but can be overridden with force + permission
  mode:                  WorkflowMode;
  warning?:              string;   // soft mode violation that was allowed through
  error?:                string;   // block reason (shown to user)
  blockedBy?:            string;   // stage name that blocked the transition
  resolvedCurrentStage?: WorkflowStage | null;
  resolvedTargetStage?:  WorkflowStage | null;
}

export interface WorkflowExecutionMode {
  mode:        WorkflowMode;
  configState: OrgWorkflowConfigState;
  reason:      string;  // human-readable explanation for logging/debugging
}

// ── Constants ─────────────────────────────────────────────────

/**
 * Fallback order used when no pipeline stages have mappedStatus configured.
 * Terminal statuses (cancelled, no_show) use 99 — reachable from any state as destination.
 */
export const FALLBACK_STATUS_ORDER: Record<string, number> = {
  pending:          1,
  confirmed:        2,
  deposit_paid:     3,
  fully_confirmed:  4,
  preparing:        5,
  in_progress:      6,
  completed:        7,
  reviewed:         8,
  cancelled:        99,
  no_show:          99,
};

/**
 * True terminal statuses — cannot be LEFT without force + bookings.force_transition permission.
 * These represent final states where no further action is expected.
 */
export const TRUE_TERMINAL_STATUSES = new Set<string>(["cancelled", "no_show"]);

/**
 * Guarded states — can be entered freely, but LEAVING them requires force.
 * These represent completed workflows that should not be silently reversed.
 */
export const GUARDED_TERMINAL_STATUSES = new Set<string>(["completed", "reviewed"]);

/**
 * All terminal-like statuses (for destination — always allowed as target from non-terminal sources).
 * @deprecated Use TRUE_TERMINAL_STATUSES for source checks
 */
export const TERMINAL_STATUSES = TRUE_TERMINAL_STATUSES;

// ── Pure Core Logic (no DB, fully testable) ───────────────────

/**
 * Finds the pipeline stage that maps to a given status value.
 * Returns null if none found (triggers fallback logic in callers).
 */
export function resolveCurrentStage(
  stages: WorkflowStage[],
  status: string,
): WorkflowStage | null {
  return stages.find((s) => s.mappedStatus === status) ?? null;
}

/**
 * Pure transition check. No DB calls. Fully testable.
 *
 * Rules (evaluated in this order):
 *   0. Same status → trivially allowed (no-op)
 *   1. fromStatus is TRUE_TERMINAL → requiresForce (blocked unless force+permission)
 *   2. toStatus is TRUE_TERMINAL → always allowed (cancellation/no_show from any non-terminal state)
 *   3. No mapped stages → legacy mode, always allowed
 *   4. fromStatus is GUARDED_TERMINAL → requiresForce (backwards from completed/reviewed)
 *   5. toOrder <= fromOrder (other backwards) → allowed (correction)
 *   6. Forward: check for non-skippable skipped stages
 *      - strict → blocked
 *      - soft → warning but allowed
 *      - legacy → allowed
 */
export function canTransition(
  fromStatus: string,
  toStatus:   string,
  stages:     WorkflowStage[],
  mode:       WorkflowMode,
): TransitionResult {
  const mappedStages = stages.filter((s) => s.mappedStatus !== null);
  const fromStage = resolveCurrentStage(mappedStages, fromStatus) ?? null;
  const toStage   = resolveCurrentStage(mappedStages, toStatus) ?? null;

  // Rule 0: no-op
  if (fromStatus === toStatus) {
    return { allowed: true, mode, resolvedCurrentStage: fromStage, resolvedTargetStage: toStage };
  }

  // Rule 1: cannot leave a TRUE_TERMINAL without force
  if (TRUE_TERMINAL_STATUSES.has(fromStatus)) {
    return {
      allowed:              false,
      requiresForce:        true,
      mode,
      error:                `الحجز في حالة نهائية (${fromStatus}) — يتطلب صلاحية التجاوز للتغيير`,
      resolvedCurrentStage: fromStage,
      resolvedTargetStage:  toStage,
    };
  }

  // Rule 2: going TO a true terminal is always allowed
  if (TRUE_TERMINAL_STATUSES.has(toStatus)) {
    return { allowed: true, mode, resolvedCurrentStage: fromStage, resolvedTargetStage: toStage };
  }

  // Rule 3: no mapped stages → legacy mode
  if (mappedStages.length === 0) {
    return { allowed: true, mode: "legacy", resolvedCurrentStage: null, resolvedTargetStage: null };
  }

  const fromOrder = fromStage?.sortOrder ?? (FALLBACK_STATUS_ORDER[fromStatus] ?? 0);
  const toOrder   = toStage?.sortOrder   ?? (FALLBACK_STATUS_ORDER[toStatus]   ?? 999);

  // Rule 4: GUARDED_TERMINAL backwards → requiresForce
  if (GUARDED_TERMINAL_STATUSES.has(fromStatus) && toOrder < fromOrder) {
    return {
      allowed:              false,
      requiresForce:        true,
      mode,
      error:                `الرجوع من حالة "${fromStatus}" يتطلب صلاحية التجاوز الإدارية`,
      resolvedCurrentStage: fromStage,
      resolvedTargetStage:  toStage,
    };
  }

  // Rule 5: other backwards transitions (corrections) — always allowed
  if (toOrder <= fromOrder) {
    return { allowed: true, mode, resolvedCurrentStage: fromStage, resolvedTargetStage: toStage };
  }

  // Rule 6: forward — check non-skippable skipped stages
  const blockedStage = mappedStages.find(
    (s) =>
      !s.isSkippable &&
      s.sortOrder > fromOrder &&
      s.sortOrder < toOrder &&
      s.mappedStatus !== fromStatus &&
      s.mappedStatus !== toStatus,
  );

  if (blockedStage) {
    if (mode === "strict") {
      return {
        allowed:              false,
        requiresForce:        false, // non-skippable stages cannot be overridden even with force
        mode:                 "strict",
        error:                `لا يمكن تخطي المرحلة الإلزامية: ${blockedStage.name}`,
        blockedBy:            blockedStage.name,
        resolvedCurrentStage: fromStage,
        resolvedTargetStage:  toStage,
      };
    }
    // soft: allow but warn
    return {
      allowed:              true,
      mode:                 "soft",
      warning:              `تجاوز مرحلة إلزامية: ${blockedStage.name} (soft mode)`,
      blockedBy:            blockedStage.name,
      resolvedCurrentStage: fromStage,
      resolvedTargetStage:  toStage,
    };
  }

  return { allowed: true, mode, resolvedCurrentStage: fromStage, resolvedTargetStage: toStage };
}

// ── DB Loaders ────────────────────────────────────────────────

/**
 * Loads pipeline stages for an org, sorted by sortOrder.
 * Returns empty array if none configured (legacy fallback in canTransition).
 */
export async function getWorkflowStagesForOrg(
  orgId: string,
): Promise<WorkflowStage[]> {
  const rows = await db
    .select()
    .from(bookingPipelineStages)
    .where(eq(bookingPipelineStages.orgId, orgId))
    .orderBy(asc(bookingPipelineStages.sortOrder));

  return rows.map((r) => ({
    id:                     r.id,
    name:                   r.name,
    sortOrder:              r.sortOrder,
    mappedStatus:           r.mappedStatus ?? null,
    isSkippable:            r.isSkippable ?? true,
    isTerminal:             r.isTerminal  ?? false,
    autoTransitionCondition: (r.autoTransitionCondition as Record<string, string> | null) ?? null,
    notificationTemplate:   r.notificationTemplate ?? null,
  }));
}

// ── Config State Detection ────────────────────────────────────

/**
 * Classifies an org's workflow configuration:
 *
 * "workflow-ready"    — has stages with mappedStatus, no duplicates
 * "legacy-compatible" — no stages or no stages with mappedStatus
 * "invalid-config"    — duplicate mappedStatus values for the same org
 *
 * Used by resolveWorkflowExecutionMode to prevent strict mode on broken configs.
 */
export function getOrgWorkflowConfigState(
  stages: WorkflowStage[],
): OrgWorkflowConfigState {
  const mapped = stages.filter((s) => s.mappedStatus !== null);

  if (mapped.length === 0) return "legacy-compatible";

  // Check for duplicate mappedStatus values
  const seen = new Set<string>();
  for (const s of mapped) {
    if (seen.has(s.mappedStatus!)) {
      log.warn(
        { mappedStatus: s.mappedStatus, stageId: s.id },
        "[workflow] duplicate mappedStatus detected — org classified as invalid-config",
      );
      return "invalid-config";
    }
    seen.add(s.mappedStatus!);
  }

  return "workflow-ready";
}

// ── Centralized Mode Resolution ───────────────────────────────

/**
 * Determines the effective workflow execution mode for an org.
 * Centralizes all mode-decision logic — single source of truth.
 *
 * Decision table:
 *   invalid-config + any env   → soft (never strict on broken data)
 *   legacy-compatible + any    → legacy
 *   workflow-ready + strict env → strict
 *   workflow-ready + soft env   → soft
 */
export function resolveWorkflowExecutionMode(
  stages: WorkflowStage[],
): WorkflowExecutionMode {
  const configState = getOrgWorkflowConfigState(stages);
  const envStrict   = process.env.WORKFLOW_STRICT_MODE === "true";

  if (configState === "invalid-config") {
    log.warn({}, "[workflow] invalid-config detected — downgrading to soft mode");
    return { mode: "soft", configState, reason: "invalid pipeline config — strict mode refused" };
  }

  if (configState === "legacy-compatible") {
    return { mode: "legacy", configState, reason: "no mapped stages configured" };
  }

  // workflow-ready
  const mode = envStrict ? "strict" : "soft";
  return {
    mode,
    configState,
    reason: envStrict
      ? "WORKFLOW_STRICT_MODE=true and org is workflow-ready"
      : "soft mode (default) — set WORKFLOW_STRICT_MODE=true to enforce",
  };
}

// ── Auto-Transition Hook ──────────────────────────────────────

/**
 * Evaluates whether a trigger event should fire an automatic status transition.
 *
 * Each stage can have autoTransitionCondition JSON:
 *   { "trigger": "payment_completed", "targetMappedStatus": "fully_confirmed" }
 *
 * Returns the target status if auto-transition applies, null otherwise.
 *
 * SAFETY: This function only evaluates — no writes happen here.
 * Calling code is responsible for executing the transition with proper validation.
 *
 * Currently wired for:
 *   - payment_completed → targetMappedStatus (configurable per stage)
 *
 * TODO: Wire to messaging-engine.ts for notification dispatch on auto-transition.
 * TODO: Add circuit-breaker for preventing auto-transition loops.
 */
export async function evaluateAutoTransitions(
  orgId:         string,
  currentStatus: string,
  trigger:       string,
): Promise<string | null> {
  const stages = await getWorkflowStagesForOrg(orgId);
  const currentStage = resolveCurrentStage(stages, currentStatus);

  if (!currentStage?.autoTransitionCondition) return null;

  const cond = currentStage.autoTransitionCondition;
  if (cond.trigger === trigger && cond.targetMappedStatus) {
    // Safety: never auto-transition FROM a true terminal
    if (TRUE_TERMINAL_STATUSES.has(currentStatus)) return null;
    return cond.targetMappedStatus;
  }

  return null;
}

// ── Stage Notification Hook ───────────────────────────────────

/**
 * Returns the notification template configured for the target stage entry.
 * Returns null if none configured or stages not mapped.
 *
 * TODO: Wire to messaging-engine.ts fireBookingEvent when templates are mapped.
 * Current state: returns template text, caller decides how to use it.
 */
export async function getStageEntryTemplate(
  orgId:        string,
  targetStatus: string,
): Promise<string | null> {
  const stages = await getWorkflowStagesForOrg(orgId);
  const stage  = resolveCurrentStage(stages, targetStatus);
  return stage?.notificationTemplate ?? null;
}
