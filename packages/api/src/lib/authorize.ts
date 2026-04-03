import { eq } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { platformKillSwitches } from "@nasaq/db/schema";
import type { AuthUser } from "../middleware/auth";
import { resolveOrgContext } from "./org-context";

// ============================================================
// 6-LAYER AUTHORIZATION ENGINE
// Layer 1: Platform kill switch (instant global disable)
// Layer 2: Plan capability gates (via OrgContext)
// Layer 3: Org capability (custom enables)
// Layer 4: System role (owner bypasses layers 4-6)
// Layer 5: User dot-permissions
// Layer 6: User constraints (checked per-action by caller)
// ============================================================

// ── Kill switch cache (1 min TTL, in-memory) ───────────────
const ksCache = new Map<string, { disabled: boolean; reason: string | null; expiresAt: number }>();
const KS_TTL_MS = 60_000;

export async function isFeatureKilled(featureKey: string): Promise<{ disabled: boolean; reason: string | null }> {
  const now = Date.now();
  const cached = ksCache.get(featureKey);
  if (cached && cached.expiresAt > now) return { disabled: cached.disabled, reason: cached.reason };

  const [row] = await db
    .select({ isDisabled: platformKillSwitches.isDisabled, reason: platformKillSwitches.reason })
    .from(platformKillSwitches)
    .where(eq(platformKillSwitches.id, featureKey));

  const disabled = row?.isDisabled ?? false;
  const reason   = row?.reason ?? null;
  ksCache.set(featureKey, { disabled, reason, expiresAt: now + KS_TTL_MS });
  return { disabled, reason };
}

export function invalidateKillSwitchCache(featureKey: string): void {
  ksCache.delete(featureKey);
}

// ── Types ──────────────────────────────────────────────────

export interface AuthzContext {
  user:       AuthUser;
  orgId:      string;
  action:     string;        // e.g. "bookings.view", "finance.create"
  featureKey?: string;       // optional platform kill switch key
  capability?: string;       // org capability key to check (e.g. "access_control")
}

export interface AuthzResult {
  allowed: boolean;
  reason?: string;
  code?:   string;
}

// ── Main function ──────────────────────────────────────────

/**
 * Unified 6-layer authorization check.
 * Returns { allowed: true } or { allowed: false, reason, code }.
 *
 * Usage:
 *   const result = await authorize({ user, orgId, action: "bookings.view" });
 *   if (!result.allowed) return c.json({ error: result.reason, code: result.code }, 403);
 */
export async function authorize(ctx: AuthzContext): Promise<AuthzResult> {
  const { user, orgId, action, featureKey, capability } = ctx;

  // ── Layer 1: Platform kill switch ─────────────────────────
  if (featureKey) {
    const ks = await isFeatureKilled(featureKey);
    if (ks.disabled) {
      return {
        allowed: false,
        reason:  ks.reason ?? "هذه الميزة معطّلة مؤقتاً على مستوى المنصة",
        code:    "KILL_SWITCH",
      };
    }
  }

  // ── Layer 4: Owner always passes (after kill switch) ──────
  if (user.type === "owner" || user.systemRole === "owner") {
    return { allowed: true };
  }

  // ── Layers 2 + 3: Org context + capability ────────────────
  if (capability) {
    const orgCtx = await resolveOrgContext(orgId);
    if (!orgCtx) {
      return { allowed: false, reason: "المنشأة غير موجودة أو غير نشطة", code: "ORG_NOT_FOUND" };
    }
    if (!orgCtx.capabilities.includes(capability)) {
      return {
        allowed: false,
        reason:  `هذه الميزة غير مفعّلة لحسابك (${capability})`,
        code:    "CAPABILITY_DISABLED",
      };
    }
  }

  // ── Layer 5: Dot-permissions + legacy colon permissions ───
  const dotMatch    = user.dotPermissions.includes(action);
  const colonMatch  = user.permissions.includes(action.replace(".", ":"));
  const directMatch = user.permissions.includes(action);

  if (!dotMatch && !colonMatch && !directMatch) {
    return {
      allowed: false,
      reason:  `ليس لديك صلاحية: ${action}`,
      code:    "FORBIDDEN",
    };
  }

  return { allowed: true };
}

// ── Constraint helpers (Layer 6) ──────────────────────────

/**
 * Check if user can apply a discount of the given percentage.
 * Call after authorize() passes.
 */
export function checkDiscountConstraint(
  user: AuthUser,
  discountPct: number,
): AuthzResult {
  const max = user.constraints?.maxDiscountPct;
  if (max !== null && max !== undefined && discountPct > max) {
    return {
      allowed: false,
      reason:  `أقصى خصم مسموح لك ${max}٪ (طلبت ${discountPct}٪)`,
      code:    "CONSTRAINT_DISCOUNT",
    };
  }
  return { allowed: true };
}

/**
 * Check if a transaction amount needs approval.
 * Returns true if approval is required.
 */
export function requiresApproval(user: AuthUser, amount: number): boolean {
  const threshold = user.constraints?.requireApprovalAbove;
  if (threshold === null || threshold === undefined) return false;
  return amount > threshold;
}

/**
 * Check if user has an explicit boolean constraint gate.
 * gate = null means inherit from role (allow by default).
 */
export function checkBoolConstraint(
  user: AuthUser,
  gate: keyof NonNullable<AuthUser["constraints"]>,
): AuthzResult {
  const value = user.constraints?.[gate];
  if (value === false) {
    return { allowed: false, reason: `ليس لديك صلاحية لهذا الإجراء`, code: "CONSTRAINT_GATE" };
  }
  return { allowed: true };
}
