// ============================================================
// CONSTANTS — single source of truth for dashboard business values
// ============================================================

export const VAT_RATE = 0.15;        // 15% Saudi VAT — mirrors DEFAULT_VAT_RATE in db/constants.ts
export const DEPOSIT_RATIO = 0.30;   // 30% deposit required

export const DROPDOWN_FETCH_LIMIT = "100";   // fetch-all limit for select dropdowns
export const REDIRECT_DELAY_MS = 2000;       // ms before redirect after success
export const OTP_SUBMIT_DELAY_MS = 100;      // ms to let React state settle before OTP submit

// ── Subscription Plans ────────────────────────────────────────
export interface PlanDef {
  key: string;
  name: string;
  price: number;
  label?: string;   // للعرض عند السعر 0
}

export const PLANS: PlanDef[] = [
  { key: "basic",      name: "الأساسي",      price: 199 },
  { key: "advanced",   name: "المتقدم",      price: 499 },
  { key: "pro",        name: "الاحترافي",    price: 999 },
  { key: "enterprise", name: "المؤسسي",      price: 0, label: "حسب الطلب" },
];

export const PLAN_MAP: Record<string, PlanDef> = Object.fromEntries(PLANS.map(p => [p.key, p]));

// ── Subscription Add-ons ──────────────────────────────────────
export interface AddonDef {
  key: string;
  name: string;
  description: string;
  price: number;
}

export const ADDONS: AddonDef[] = [
  { key: "extra_providers",  name: "مقدمو خدمة إضافيون", description: "أضف المزيد من مقدمي الخدمة لفريقك",      price: 890 },
  { key: "extra_branches",   name: "فروع إضافية",         description: "توسّع إلى مواقع جديدة",                  price: 1900 },
  { key: "hide_branding",    name: "إخفاء علامة نسق",     description: "إزالة شعار نسق من صفحاتك العامة",        price: 690 },
  { key: "loyalty",          name: "برنامج الولاء",        description: "برنامج ولاء لزيادة الاحتفاظ بالعملاء",   price: 1190 },
  { key: "booking_sync",     name: "ربط الجدولة",          description: "مزامنة مع منصات الحجز الخارجية",          price: 1190 },
  { key: "accounting",       name: "ربط المحاسبة",         description: "مزامنة الفواتير مع برامج المحاسبة",       price: 1190 },
  { key: "business_email",   name: "بريد الأعمال",          description: "ربط البريد بالدومين الخاص",               price: 1190 },
  { key: "access_control",   name: "التحكم بالوصول",        description: "إدارة الحضور والدخول",                    price: 1190 },
  { key: "google_boost",     name: "تعزيز جوجل",            description: "تحفيز العملاء لترك تقييم على جوجل",       price: 399 },
  { key: "custom_domain",    name: "دومين مخصص",            description: "ربط دومين خاص بمتجرك الإلكتروني",         price: 0 },
];

export const ADDON_MAP: Record<string, AddonDef> = Object.fromEntries(ADDONS.map(a => [a.key, a]));

// ── Business Types ────────────────────────────────────────────
export interface BusinessTypeDef { key: string; name: string }

export const BUSINESS_TYPE_LIST: BusinessTypeDef[] = [
  { key: "general",          name: "عام" },
  { key: "salon",            name: "صالون تجميل" },
  { key: "barber",           name: "حلاق" },
  { key: "spa",              name: "سبا" },
  { key: "fitness",          name: "لياقة بدنية" },
  { key: "restaurant",       name: "مطعم" },
  { key: "cafe",             name: "مقهى" },
  { key: "bakery",           name: "مخبز" },
  { key: "catering",         name: "تموين وضيافة" },
  { key: "flower_shop",      name: "محل ورود" },
  { key: "hotel",            name: "فندق" },
  { key: "car_rental",       name: "تأجير سيارات" },
  { key: "rental",           name: "تأجير معدات" },
  { key: "real_estate",      name: "عقارات" },
  { key: "retail",           name: "متجر تجزئة" },
  { key: "printing",         name: "طباعة" },
  { key: "laundry",          name: "مغسلة" },
  { key: "events",           name: "فعاليات" },
  { key: "event_organizer",  name: "تنظيم مناسبات" },
  { key: "digital_services", name: "خدمات رقمية" },
  { key: "technology",       name: "تقنية" },
  { key: "maintenance",      name: "صيانة" },
  { key: "workshop",         name: "ورشة" },
  { key: "logistics",        name: "لوجستيات" },
  { key: "construction",     name: "مقاولات" },
  { key: "photography",      name: "تصوير" },
];

export const BUSINESS_TYPE_MAP: Record<string, string> = Object.fromEntries(
  BUSINESS_TYPE_LIST.map(b => [b.key, b.name])
);

// ── Cities ────────────────────────────────────────────────────
export const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر",
  "الظهران", "الطائف", "تبوك", "بريدة", "الأحساء", "حائل", "نجران",
  "جازان", "أبها", "خميس مشيط", "ينبع", "الجبيل", "القطيف", "عنيزة",
  "الباحة", "سكاكا", "عرعر", "الزلفي", "القصيم", "أخرى",
] as const;

export const STORAGE_KEYS = {
  TOKEN: "nasaq_token",
  ORG_ID: "nasaq_org_id",
  USER_ID: "nasaq_user_id",
  DASHBOARD_PREFS_KEY: "nasaq_dashboard_prefs",
} as const;
