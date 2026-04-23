/**
 * @deprecated
 * Vertical-specific flowers/events status constants and transition guards are scheduled
 * for removal. `FE_STATUSES` and `validateFeTransition` are legacy compatibility only.
 * All new flow logic MUST use `workflow-engine.ts`, resolving `bookingPipelineStages`
 * through the Canonical Router instead of hardcoded vertical state machines.
 */
// ============================================================
// flowers_events Operational Status Machine
// Maps to service_orders.status field (text column, not PG enum)
// ============================================================

// Internal code values — stable, never change
export const FE_STATUSES = [
  "preparing",
  "ready",
  "dispatched",
  "arrived",
  "in_setup",
  "completed_on_site",
  "returned",
  "maintenance",
  "closed",
  "cancelled",
] as const;

export type FeStatus = (typeof FE_STATUSES)[number];

// Strict allowed transitions for flowers_events
export const FE_TRANSITIONS: Record<string, string[]> = {
  preparing:        ["ready",    "cancelled"],
  ready:            ["dispatched","cancelled"],
  dispatched:       ["arrived",  "cancelled"],
  arrived:          ["in_setup", "cancelled"],
  in_setup:         ["completed_on_site"],
  completed_on_site:["returned"],
  returned:         ["closed",   "maintenance"],
  maintenance:      ["closed"],
  closed:           [],
  cancelled:        [],
};

// Arabic UI labels (Step 12)
export const FE_STATUS_LABELS: Record<string, string> = {
  preparing:         "قيد التجهيز",
  ready:             "جاهز",
  dispatched:        "جاري النقل",
  arrived:           "وصل الموقع",
  in_setup:          "قيد التنفيذ",
  completed_on_site: "قيد الفك",
  returned:          "راجع",
  maintenance:       "صيانة",
  closed:            "مكتمل",
  cancelled:         "ملغي",
  // Legacy service_orders statuses — kept for non-flowers_events orgs
  draft:             "مسودة",
  deposit_pending:   "بانتظار العربون",
  confirmed:         "مؤكد",
  scheduled:         "مجدول",
  inspected:         "تم الفحص",
};

// Terminal statuses — edits blocked once reached
export const FE_TERMINAL = new Set(["closed", "cancelled"]);

// Pre-dispatch lock — once dispatched, sensitive fields are read-only
export const FE_LOCK_THRESHOLD = new Set([
  "dispatched", "arrived", "in_setup", "completed_on_site",
  "returned", "maintenance", "closed", "cancelled",
]);

/**
 * Validate status transition for flowers_events operational order.
 * Returns { ok: true } or { ok: false, reason: string }
 */
export function validateFeTransition(
  current: string,
  next: string
): { ok: true } | { ok: false; reason: string } {
  if (FE_TERMINAL.has(current)) {
    return { ok: false, reason: `الحالة "${FE_STATUS_LABELS[current] ?? current}" نهائية — لا يمكن التغيير` };
  }
  const allowed = FE_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    const currentLabel = FE_STATUS_LABELS[current] ?? current;
    const nextLabel    = FE_STATUS_LABELS[next]    ?? next;
    return {
      ok: false,
      reason: `الانتقال من "${currentLabel}" إلى "${nextLabel}" غير مسموح`,
    };
  }
  return { ok: true };
}

/**
 * Check whether sensitive order content is locked (dispatched or beyond).
 */
export function isFeOrderLocked(status: string): boolean {
  return FE_LOCK_THRESHOLD.has(status);
}
