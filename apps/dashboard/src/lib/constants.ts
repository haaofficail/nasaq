// ============================================================
// CONSTANTS — single source of truth for dashboard business values
// ============================================================

export const VAT_RATE = 0.15;        // 15% Saudi VAT — mirrors DEFAULT_VAT_RATE in db/constants.ts
export const DEPOSIT_RATIO = 0.30;   // 30% deposit required

export const DROPDOWN_FETCH_LIMIT = "100";   // fetch-all limit for select dropdowns
export const REDIRECT_DELAY_MS = 2000;       // ms before redirect after success
export const OTP_SUBMIT_DELAY_MS = 100;      // ms to let React state settle before OTP submit

export const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر",
  "الظهران", "الطائف", "أبها", "خميس مشيط", "تبوك", "حائل", "بريدة",
  "القصيم", "الأحساء", "الجبيل", "ينبع", "جازان", "نجران", "الباحة",
  "عرعر", "سكاكا", "القريات", "الجوف", "حفر الباطن", "بيشة", "أخرى",
] as const;

export const STORAGE_KEYS = {
  TOKEN: "nasaq_token",
  ORG_ID: "nasaq_org_id",
  USER_ID: "nasaq_user_id",
  DASHBOARD_PREFS_KEY: "nasaq_dashboard_prefs",
} as const;
