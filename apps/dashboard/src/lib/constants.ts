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

// ── Rental Amenities ──────────────────────────────────────────
// Used by: chalets, apartments, rooms, camps, hotels, equipment rental
export interface AmenityDef {
  key: string;
  label: string;
  category: string;
}

export const RENTAL_AMENITIES: AmenityDef[] = [
  // اتصال وترفيه
  { key: "wifi",          label: "واي فاي",           category: "connectivity" },
  { key: "tv",            label: "تلفزيون",            category: "entertainment" },
  { key: "smart_tv",      label: "شاشة ذكية",          category: "entertainment" },
  { key: "streaming",     label: "بث مباشر (Netflix...)", category: "entertainment" },
  // راحة
  { key: "ac",            label: "تكييف",              category: "comfort" },
  { key: "heating",       label: "تدفئة",              category: "comfort" },
  { key: "fan",           label: "مروحة",              category: "comfort" },
  // مطبخ
  { key: "kitchen",       label: "مطبخ كامل",          category: "kitchen" },
  { key: "kitchenette",   label: "مطبخ صغير",          category: "kitchen" },
  { key: "fridge",        label: "ثلاجة",              category: "kitchen" },
  { key: "microwave",     label: "مايكروويف",          category: "kitchen" },
  { key: "coffee_maker",  label: "ماكينة قهوة",        category: "kitchen" },
  { key: "dishwasher",    label: "غسالة أطباق",        category: "kitchen" },
  { key: "oven",          label: "فرن",                category: "kitchen" },
  { key: "bbq",           label: "شواء (باربيكيو)",    category: "kitchen" },
  // حمام
  { key: "private_bath",  label: "حمام خاص",           category: "bathroom" },
  { key: "jacuzzi",       label: "جاكوزي",             category: "bathroom" },
  { key: "hot_tub",       label: "حوض مائي ساخن",      category: "bathroom" },
  { key: "hair_dryer",    label: "مجفف شعر",           category: "bathroom" },
  // خارجي
  { key: "pool",          label: "مسبح",               category: "outdoor" },
  { key: "private_pool",  label: "مسبح خاص",           category: "outdoor" },
  { key: "garden",        label: "حديقة",              category: "outdoor" },
  { key: "balcony",       label: "شرفة",               category: "outdoor" },
  { key: "terrace",       label: "تراس",               category: "outdoor" },
  // إطلالة
  { key: "sea_view",      label: "إطلالة بحر",         category: "view" },
  { key: "mountain_view", label: "إطلالة جبال",        category: "view" },
  { key: "city_view",     label: "إطلالة المدينة",     category: "view" },
  { key: "garden_view",   label: "إطلالة حديقة",       category: "view" },
  // نقل وموقف
  { key: "parking",       label: "موقف سيارات",        category: "transport" },
  { key: "ev_charging",   label: "شاحن سيارة كهربائي", category: "transport" },
  // رياضة وترفيه
  { key: "gym",           label: "صالة رياضية",        category: "recreation" },
  { key: "games",         label: "ألعاب",              category: "recreation" },
  { key: "books",         label: "مكتبة",              category: "recreation" },
  { key: "playground",    label: "ملعب أطفال",         category: "recreation" },
  // غسيل وتنظيف
  { key: "washer",        label: "غسالة ملابس",        category: "appliances" },
  { key: "dryer",         label: "مجفف ملابس",         category: "appliances" },
  { key: "iron",          label: "مكواة",              category: "appliances" },
  // أمان
  { key: "cctv",          label: "كاميرات أمان",       category: "safety" },
  { key: "safe",          label: "خزنة",               category: "safety" },
  { key: "fire_ext",      label: "طفاية حريق",         category: "safety" },
  { key: "first_aid",     label: "إسعافات أولية",      category: "safety" },
  // عائلة وإضافات
  { key: "baby_crib",     label: "سرير أطفال",         category: "family" },
  { key: "high_chair",    label: "كرسي أطفال",         category: "family" },
  { key: "pet_friendly",  label: "حيوانات أليفة مرحب",  category: "family" },
  // إمكانية الوصول
  { key: "wheelchair",    label: "صديق لكرسي متحرك",   category: "accessibility" },
  { key: "elevator",      label: "مصعد",               category: "accessibility" },
];

export const AMENITY_MAP: Record<string, AmenityDef> = Object.fromEntries(
  RENTAL_AMENITIES.map(a => [a.key, a])
);

export const AMENITY_CATEGORY_LABELS: Record<string, string> = {
  connectivity:   "الاتصال والترفيه",
  entertainment:  "الترفيه",
  comfort:        "الراحة",
  kitchen:        "المطبخ",
  bathroom:       "الحمام",
  outdoor:        "الخارجي",
  view:           "الإطلالة",
  transport:      "الموقف والنقل",
  recreation:     "الرياضة والترفيه",
  appliances:     "الغسيل والتنظيف",
  safety:         "الأمان",
  family:         "العائلة",
  accessibility:  "إمكانية الوصول",
};

// ── Maintenance Task Types ────────────────────────────────────
export const MAINTENANCE_TYPES = [
  { key: "cleaning",      label: "تنظيف",         color: "bg-blue-50 text-blue-600" },
  { key: "maintenance",   label: "صيانة",          color: "bg-amber-50 text-amber-600" },
  { key: "inspection",    label: "فحص وتفتيش",    color: "bg-purple-50 text-purple-600" },
  { key: "damage_repair", label: "إصلاح تلف",     color: "bg-red-50 text-red-600" },
] as const;

export const MAINTENANCE_PRIORITIES = [
  { key: "low",    label: "منخفضة",  color: "bg-gray-100 text-gray-500" },
  { key: "normal", label: "عادية",   color: "bg-blue-50 text-blue-600" },
  { key: "high",   label: "عالية",   color: "bg-amber-50 text-amber-600" },
  { key: "urgent", label: "عاجلة",   color: "bg-red-50 text-red-600" },
] as const;

export const MAINTENANCE_STATUSES = [
  { key: "pending",          label: "معلقة",           color: "bg-gray-100 text-gray-500" },
  { key: "in_progress",      label: "قيد التنفيذ",     color: "bg-blue-50 text-blue-600" },
  { key: "completed",        label: "مكتملة",          color: "bg-emerald-50 text-emerald-600" },
  { key: "issue_reported",   label: "تم الإبلاغ عن مشكلة", color: "bg-red-50 text-red-600" },
] as const;

export const STORAGE_KEYS = {
  TOKEN: "nasaq_token",
  ORG_ID: "nasaq_org_id",
  USER_ID: "nasaq_user_id",
  DASHBOARD_PREFS_KEY: "nasaq_dashboard_prefs",
} as const;
