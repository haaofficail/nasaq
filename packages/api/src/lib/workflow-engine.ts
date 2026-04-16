// ============================================================
// WORKFLOW ENGINE — محرك تدفق عمل الحجوزات
//
// التصميم:
//   - Pure core logic (canTransition) — لا DB، قابل للاختبار
//   - DB loaders مستقلة (getWorkflowStagesForOrg)
//   - validateTransition = loader + pure check + logging
//   - Soft mode افتراضي — strict mode عبر env أو خيار صريح
//   - Legacy fallback دائم عند غياب مراحل مُهيأة
//
// الوضع الحالي:
//   - soft validation مُفعّل لكل المنشآت
//   - strict validation يُفعَّل بـ WORKFLOW_STRICT_MODE=true
//     أو بتمرير opts.strict = true في مسارات محددة
//   - auto-transitions: hook جاهز، ينتظر ربط إشعارات كامل
// ============================================================

import { db } from "@nasaq/db/client";
import { bookingPipelineStages } from "@nasaq/db/schema";
import { eq, and, isNotNull, asc } from "drizzle-orm";
import { log } from "./logger";

// ── Types ─────────────────────────────────────────────────────

export type BookingStatus =
  | "pending" | "confirmed" | "deposit_paid" | "fully_confirmed"
  | "preparing" | "in_progress" | "completed" | "reviewed"
  | "cancelled" | "no_show";

export type WorkflowMode = "strict" | "soft" | "legacy";

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
  allowed:    boolean;
  mode:       WorkflowMode;
  warning?:   string;  // set in soft mode when violation detected but allowed through
  error?:     string;  // set when not allowed
  blockedBy?: string;  // stage name blocking the transition
}

// ── Constants ─────────────────────────────────────────────────

/**
 * Fallback order used when no pipeline stages have mappedStatus configured.
 * Terminal statuses (cancelled, no_show) use 99 — reachable from any state.
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

export const TERMINAL_STATUSES = new Set<string>(["cancelled", "no_show"]);

// ── Pure Core Logic (no DB, fully testable) ───────────────────

/**
 * Finds the pipeline stage that maps to a given status value.
 * Returns null if none found (triggers fallback logic).
 */
export function resolveCurrentStage(
  stages: WorkflowStage[],
  status: string,
): WorkflowStage | null {
  return stages.find((s) => s.mappedStatus === status) ?? null;
}

/**
 * Pure transition check. No DB calls.
 *
 * Rules (in priority order):
 *   1. Terminal statuses (cancelled, no_show) → always allowed
 *   2. No mapped stages found → legacy mode, always allowed
 *   3. Backwards transition (lower sortOrder) → allowed (status correction)
 *   4. Non-skippable stage being skipped:
 *      - strict mode  → blocked (error)
 *      - soft mode    → allowed with warning
 *      - legacy mode  → allowed (no check)
 */
export function canTransition(
  fromStatus: string,
  toStatus: string,
  stages: WorkflowStage[],
  mode: WorkflowMode,
): TransitionResult {
  // Rule 1: terminal is always allowed
  if (TERMINAL_STATUSES.has(toStatus)) {
    return { allowed: true, mode };
  }

  // Determine effective sortOrders
  const mappedStages = stages.filter((s) => s.mappedStatus !== null);

  if (mappedStages.length === 0) {
    // Rule 2: no pipeline configured → legacy mode
    return { allowed: true, mode: "legacy" };
  }

  const fromStage = mappedStages.find((s) => s.mappedStatus === fromStatus);
  const toStage   = mappedStages.find((s) => s.mappedStatus === toStatus);

  const fromOrder = fromStage?.sortOrder ?? (FALLBACK_STATUS_ORDER[fromStatus] ?? 0);
  const toOrder   = toStage?.sortOrder   ?? (FALLBACK_STATUS_ORDER[toStatus]   ?? 999);

  // Rule 3: backwards transition (correction) → always allowed
  if (toOrder <= fromOrder) {
    return { allowed: true, mode };
  }

  // Rule 4: check for non-skippable stages between from and to
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
        allowed:    false,
        mode:       "strict",
        error:      `لا يمكن تخطي المرحلة الإلزامية: ${blockedStage.name}`,
        blockedBy:  blockedStage.name,
      };
    }
    // soft mode: allow but warn
    return {
      allowed: true,
      mode:    "soft",
      warning: `تجاوز مرحلة إلزامية: ${blockedStage.name} (soft mode)`,
    };
  }

  return { allowed: true, mode };
}

// ── DB Loaders ────────────────────────────────────────────────

/**
 * Loads pipeline stages for an org, sorted by sortOrder.
 * Returns empty array if none exist (triggers legacy fallback in canTransition).
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
    isTerminal:             r.isTerminal ?? false,
    autoTransitionCondition: (r.autoTransitionCondition as Record<string, string> | null) ?? null,
    notificationTemplate:   r.notificationTemplate ?? null,
  }));
}

// ── Composed Validator (DB + pure logic + logging) ────────────

interface ValidateOpts {
  strict?:     boolean;  // override env-based mode
  force?:      boolean;  // privileged bypass (logs warning, always allowed)
  actorType?:  string;   // "owner" | "manager" | "staff" | etc.
  requestId?:  string;
  bookingId?:  string;
}

/**
 * Full transition validation.
 * Loads stages, determines mode, runs pure check, logs outcome.
 * Never throws — returns TransitionResult with allowed:false on block.
 */
export async function validateTransition(
  orgId:      string,
  fromStatus: string,
  toStatus:   string,
  opts:       ValidateOpts = {},
): Promise<TransitionResult> {
  const stages = await getWorkflowStagesForOrg(orgId);

  // Determine enforcement mode
  const envStrict = process.env.WORKFLOW_STRICT_MODE === "true";
  const useStrict = opts.strict ?? envStrict;
  const mode: WorkflowMode =
    stages.filter((s) => s.mappedStatus).length === 0
      ? "legacy"
      : useStrict
      ? "strict"
      : "soft";

  const result = canTransition(fromStatus, toStatus, stages, mode);

  // Privileged force-bypass
  if (!result.allowed && opts.force) {
    log.warn(
      {
        orgId,
        bookingId:  opts.bookingId,
        requestId:  opts.requestId,
        actorType:  opts.actorType,
        fromStatus,
        toStatus,
        blockedBy:  result.blockedBy,
      },
      "[workflow] forced transition override by privileged actor",
    );
    return { allowed: true, mode, warning: result.error };
  }

  if (result.warning) {
    log.warn(
      {
        orgId,
        bookingId:  opts.bookingId,
        requestId:  opts.requestId,
        fromStatus,
        toStatus,
        warning:    result.warning,
        mode:       result.mode,
      },
      "[workflow] soft transition violation — allowed through",
    );
  }

  if (!result.allowed) {
    log.info(
      {
        orgId,
        bookingId:  opts.bookingId,
        requestId:  opts.requestId,
        fromStatus,
        toStatus,
        blockedBy:  result.blockedBy,
        mode:       result.mode,
      },
      "[workflow] transition blocked",
    );
  }

  return result;
}

// ── Auto-Transition Hook ──────────────────────────────────────

/**
 * Evaluates whether a trigger event should fire an automatic status transition.
 *
 * Each stage can have autoTransitionCondition:
 *   { "trigger": "payment_completed", "targetMappedStatus": "fully_confirmed" }
 *
 * Returns the target status string if a transition should fire, null otherwise.
 *
 * NOTE: calling code is responsible for actually executing the transition.
 * This function is pure evaluation — no writes.
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
    return cond.targetMappedStatus;
  }

  return null;
}

// ── Notification Hook (placeholder) ──────────────────────────

/**
 * Returns the notification template configured for the target stage.
 * Returns null if none configured or stages not mapped.
 *
 * Hook is ready — connect to messaging-engine.ts when templates are wired up.
 */
export async function getStageEntryTemplate(
  orgId:        string,
  targetStatus: string,
): Promise<string | null> {
  const stages = await getWorkflowStagesForOrg(orgId);
  const stage  = resolveCurrentStage(stages, targetStatus);
  return stage?.notificationTemplate ?? null;
}
