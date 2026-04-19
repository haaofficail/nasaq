// ============================================================
// flowers_events — Centralized UI Config & Label Mapping
// All Arabic overrides live here — do NOT scatter across pages
// ============================================================

export const FLOWERS_EVENTS_BUSINESS_TYPE = "flowers_events";

/** Is this org a flowers_events vertical? */
export function isFlowersEvents(businessType?: string | null): boolean {
  return businessType === FLOWERS_EVENTS_BUSINESS_TYPE;
}

// ── Status labels (Step 12) ──────────────────────────────────────────────────
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
  draft:             "مسودة",
  deposit_pending:   "بانتظار العربون",
  confirmed:         "مؤكد",
  scheduled:         "مجدول",
  inspected:         "تم الفحص",
};

// ── Status badge colors ───────────────────────────────────────────────────────
export const FE_STATUS_COLORS: Record<string, string> = {
  preparing:         "bg-yellow-50 text-yellow-700 border-yellow-200",
  ready:             "bg-green-50  text-green-700  border-green-200",
  dispatched:        "bg-blue-50   text-blue-700   border-blue-200",
  arrived:           "bg-teal-50   text-teal-700   border-teal-200",
  in_setup:          "bg-violet-50 text-violet-700 border-violet-200",
  completed_on_site: "bg-orange-50 text-orange-700 border-orange-200",
  returned:          "bg-[#f8fafc] text-gray-600   border-[#eef2f6]",
  maintenance:       "bg-red-50    text-red-700    border-red-200",
  closed:            "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:         "bg-[#f1f5f9] text-gray-500   border-[#eef2f6]",
  draft:             "bg-[#f1f5f9] text-gray-500   border-[#eef2f6]",
};

// ── Product category labels (Step 3) ─────────────────────────────────────────
// Implemented as catalog categories — not DB renames
export const FE_PRODUCT_CATEGORIES = [
  { key: "ready_packages",   labelAr: "باقات جاهزة",    description: "الباقات الزهرية الجاهزة للبيع" },
  { key: "gifts_wrapping",   labelAr: "هدايا وتغليف",   description: "مواد التغليف والهدايا" },
  { key: "event_decoration", labelAr: "ديكور مناسبات",  description: "كوشة، ترتيبات، إكسسوارات" },
  { key: "loose_flowers",    labelAr: "ورد مقطوع",      description: "باعة بالسيقان والربطة" },
];

// ── Inventory unit labels for flowers_events (Step 6) ────────────────────────
export const FE_UNIT_LABELS = [
  { value: "ساق",        label: "ساق" },
  { value: "ربطة",      label: "ربطة" },
  { value: "غصن",       label: "غصن" },
  { value: "فازة",      label: "فازة" },
  { value: "رول تغليف", label: "رول تغليف" },
  { value: "قطعة",      label: "قطعة" },
  { value: "كرتون",     label: "كرتون" },
];

// ── Generic label overrides (Step 9) ─────────────────────────────────────────
// Map generic booking/order labels to flowers_events terminology
export const FE_LABEL_OVERRIDES = {
  // Generic → flowers_events
  "حجز جديد":              "حجز مناسبة",
  "الحجوزات":              "تجهيزات المناسبات",
  "طلب خدمة":              "طلب كوشة / حفل",
  "إنشاء طلب":             "ربط بمعاملة كوشة / حفل",
  "طلبات الخدمة":          "طلبات الكوشة والمناسبات",
  "تفاصيل الطلب":          "تفاصيل المناسبة",
  "موعد التنفيذ":          "موعد الحفل",
  "تعيين الفريق":          "فريق تجهيز المناسبة",
};

/**
 * Get label — returns flowers_events override if org is flowers_events,
 * otherwise returns the original label unchanged.
 */
export function feLabel(original: string, businessType?: string | null): string {
  if (!isFlowersEvents(businessType)) return original;
  return FE_LABEL_OVERRIDES[original as keyof typeof FE_LABEL_OVERRIDES] ?? original;
}

// ── Allowed status transitions for UI (mirrors backend state machine) ────────
export const FE_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  preparing:         ["ready",    "cancelled"],
  ready:             ["dispatched","cancelled"],
  dispatched:        ["arrived",  "cancelled"],
  arrived:           ["in_setup", "cancelled"],
  in_setup:          ["completed_on_site"],
  completed_on_site: ["returned"],
  returned:          ["closed",   "maintenance"],
  maintenance:       ["closed"],
  closed:            [],
  cancelled:         [],
};

export function feNextStatuses(current: string): string[] {
  return FE_ALLOWED_TRANSITIONS[current] ?? [];
}
