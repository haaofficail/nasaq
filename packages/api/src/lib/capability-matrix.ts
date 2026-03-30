/**
 * Capability Matrix — Nasaq
 *
 * SINGLE SOURCE OF TRUTH for all platform capabilities.
 *
 * Every capability:
 *   - Has a unique key (snake_case)
 *   - Belongs to an engine
 *   - Has a category (core|engine|vertical|addon)
 *   - Lists which routes it gates
 *   - Lists which UI pages it unlocks
 *
 * Rules:
 *   - Never add a capability outside this file
 *   - Never use raw strings for capability checks — import from here
 *   - All new features MUST declare their capability here first
 */

// ============================================================
// TYPE
// ============================================================

export type CapabilityCategory = "core" | "engine" | "vertical" | "addon" | "payment";
export type EngineType =
  | "platform"
  | "appointment"
  | "commerce"
  | "stay"
  | "lease"
  | "event"
  | "table"
  | "field_service"
  | "education";

export interface Capability {
  key: string;
  label: string;          // Arabic label
  category: CapabilityCategory;
  engine: EngineType;
  routes: string[];       // API route prefixes this gates
  pages: string[];        // Frontend page paths this unlocks
  description?: string;
}

// ============================================================
// CORE PLATFORM — always available
// ============================================================

const CORE: Capability[] = [
  {
    key: "core_bookings",
    label: "الحجوزات الأساسية",
    category: "core",
    engine: "platform",
    routes: ["/bookings"],
    pages: ["/dashboard/bookings", "/dashboard/calendar"],
    description: "الوصول للحجوزات وإدارتها",
  },
  {
    key: "core_customers",
    label: "إدارة العملاء",
    category: "core",
    engine: "platform",
    routes: ["/customers"],
    pages: ["/dashboard/customers"],
  },
  {
    key: "core_catalog",
    label: "الكتالوج والخدمات",
    category: "core",
    engine: "platform",
    routes: ["/services", "/categories", "/addons", "/bundles"],
    pages: ["/dashboard/catalog", "/dashboard/services"],
  },
  {
    key: "core_finance",
    label: "المالية والفواتير",
    category: "core",
    engine: "platform",
    routes: ["/finance", "/invoices"],
    pages: ["/dashboard/finance", "/dashboard/invoices"],
  },
  {
    key: "core_team",
    label: "إدارة الفريق",
    category: "core",
    engine: "platform",
    routes: ["/team", "/members", "/job-titles"],
    pages: ["/dashboard/staff"],
  },
  {
    key: "core_reports",
    label: "التقارير",
    category: "core",
    engine: "platform",
    routes: ["/finance/reports"],
    pages: ["/dashboard/reports"],
  },
];

// ============================================================
// ENGINES
// ============================================================

const ENGINES: Capability[] = [
  // Appointment Engine
  {
    key: "engine_appointment",
    label: "محرك المواعيد",
    category: "engine",
    engine: "appointment",
    routes: ["/engines/appointment"],
    pages: ["/dashboard/calendar", "/dashboard/schedule"],
    description: "الحجوزات الزمنية للخدمات: الصالونات، العيادات، الاستشارات",
  },

  // Commerce Engine
  {
    key: "engine_commerce",
    label: "محرك التجارة",
    category: "engine",
    engine: "commerce",
    routes: ["/engines/commerce", "/online-orders", "/pos"],
    pages: ["/dashboard/pos", "/dashboard/online-orders"],
    description: "المنتجات والطلبات ونقطة البيع",
  },

  // Stay Engine
  {
    key: "engine_stay",
    label: "محرك الإقامة",
    category: "engine",
    engine: "stay",
    routes: ["/engines/stay", "/hotel", "/car-rental"],
    pages: ["/dashboard/hotel", "/dashboard/car-rental"],
    description: "الحجوزات الزمنية للوحدات: الغرف، السيارات، الشاليهات",
  },

  // Lease Engine
  {
    key: "engine_lease",
    label: "محرك الإيجار",
    category: "engine",
    engine: "lease",
    routes: ["/engines/lease", "/rental", "/contracts"],
    pages: ["/dashboard/assets", "/dashboard/contracts"],
    description: "العقود والإيجار طويل الأمد",
  },

  // Event Engine
  {
    key: "engine_event",
    label: "محرك الفعاليات",
    category: "engine",
    engine: "event",
    routes: ["/engines/event", "/events"],
    pages: ["/dashboard/events", "/dashboard/packages"],
    description: "الأعراس والمؤتمرات والفعاليات",
  },

  // Table Engine
  {
    key: "engine_table",
    label: "محرك الطاولات",
    category: "engine",
    engine: "table",
    routes: ["/engines/table"],
    pages: ["/dashboard/reservations", "/dashboard/table-map"],
    description: "حجوزات الطاولات للمطاعم والمقاهي",
  },

  // Field Service Engine
  {
    key: "engine_field_service",
    label: "محرك الخدمات الميدانية",
    category: "engine",
    engine: "field_service",
    routes: ["/maintenance"],
    pages: ["/dashboard/maintenance"],
    description: "المهام الميدانية والصيانة في موقع العميل",
  },

  // Education Engine
  {
    key: "engine_education",
    label: "محرك التعليم",
    category: "engine",
    engine: "education",
    routes: ["/school", "/engines/education"],
    pages: ["/school"],
    description: "إدارة المدارس: الطلاب، المعلمون، الحضور، السلوك",
  },
];

// ============================================================
// VERTICALS — engine combinations per business type
// ============================================================

const VERTICALS: Capability[] = [
  {
    key: "vertical_salon",
    label: "الصالون والسبا",
    category: "vertical",
    engine: "appointment",
    routes: ["/salon"],
    pages: ["/dashboard/schedule", "/dashboard/commissions"],
    description: "ميزات خاصة بالصالونات: الجدول الزمني، العمولات، بطاقة الجمال",
  },
  {
    key: "vertical_flower",
    label: "محل الورود",
    category: "vertical",
    engine: "commerce",
    routes: ["/arrangements", "/flower-master", "/flower-builder"],
    pages: ["/dashboard/flower-inventory", "/dashboard/arrangements"],
  },
  {
    key: "vertical_restaurant",
    label: "المطعم",
    category: "vertical",
    engine: "table",
    routes: ["/restaurant", "/menu", "/kitchen"],
    pages: ["/dashboard/menu", "/dashboard/kitchen", "/dashboard/table-map"],
  },
  {
    key: "vertical_hotel",
    label: "الفندق",
    category: "vertical",
    engine: "stay",
    routes: ["/hotel"],
    pages: ["/dashboard/hotel"],
  },
  {
    key: "vertical_car_rental",
    label: "تأجير السيارات",
    category: "vertical",
    engine: "stay",
    routes: ["/car-rental"],
    pages: ["/dashboard/car-rental"],
  },
];

// ============================================================
// ADDONS — optional commercial features
// ============================================================

const ADDONS: Capability[] = [
  {
    key: "addon_inventory",
    label: "إدارة المخزون",
    category: "addon",
    engine: "commerce",
    routes: ["/inventory"],
    pages: ["/dashboard/inventory"],
  },
  {
    key: "addon_website",
    label: "الموقع الإلكتروني",
    category: "addon",
    engine: "platform",
    routes: ["/website"],
    pages: ["/dashboard/website"],
  },
  {
    key: "addon_marketing",
    label: "التسويق والأتمتة",
    category: "addon",
    engine: "platform",
    routes: ["/marketing", "/automation"],
    pages: ["/dashboard/marketing", "/dashboard/automation"],
  },
  {
    key: "addon_accounting",
    label: "المحاسبة المتقدمة",
    category: "addon",
    engine: "platform",
    routes: ["/accounting", "/treasury", "/reconciliation"],
    pages: ["/dashboard/accounting", "/dashboard/treasury"],
  },
  {
    key: "addon_procurement",
    label: "المشتريات والموردون",
    category: "addon",
    engine: "commerce",
    routes: ["/procurement", "/suppliers"],
    pages: ["/dashboard/suppliers"],
  },
  {
    key: "addon_marketplace",
    label: "السوق الإلكتروني",
    category: "addon",
    engine: "platform",
    routes: ["/marketplace"],
    pages: ["/dashboard/marketplace"],
  },
];

// ============================================================
// PAYMENTS
// ============================================================

const PAYMENTS: Capability[] = [
  {
    key: "payment_gateway_nasaq",
    label: "بوابة نسق للدفع",
    category: "payment",
    engine: "platform",
    routes: ["/payments/initiate", "/payments/settings"],
    pages: ["/dashboard/payments"],
    description: "الدفع عبر بوابة نسق المركزية (Moyasar Facilitator)",
  },
  {
    key: "payment_gateway_own",
    label: "بوابة الدفع الخاصة",
    category: "payment",
    engine: "platform",
    routes: ["/integrations/payment"],
    pages: ["/dashboard/integrations"],
    description: "ربط بوابة دفع خاصة بالمنشأة",
  },
  {
    key: "payment_tamara",
    label: "تمارا — الدفع الآجل",
    category: "payment",
    engine: "platform",
    routes: ["/payments/tamara"],
    pages: [],
  },
  {
    key: "payment_tabby",
    label: "تابي — الدفع الآجل",
    category: "payment",
    engine: "platform",
    routes: ["/payments/tabby"],
    pages: [],
  },
];

// ============================================================
// FULL REGISTRY
// ============================================================

export const CAPABILITY_REGISTRY: Capability[] = [
  ...CORE,
  ...ENGINES,
  ...VERTICALS,
  ...ADDONS,
  ...PAYMENTS,
];

/** All capability keys as a typed union */
export type CapabilityKey = (typeof CAPABILITY_REGISTRY)[number]["key"];

/** Lookup by key */
export const CAPABILITIES: Record<string, Capability> = Object.fromEntries(
  CAPABILITY_REGISTRY.map((c) => [c.key, c])
);

/** Keys only — for dropdown lists and org settings */
export const ALL_CAPABILITY_KEYS = CAPABILITY_REGISTRY.map((c) => c.key);

/** Get capabilities by engine */
export function getEngineCapabilities(engine: EngineType): Capability[] {
  return CAPABILITY_REGISTRY.filter((c) => c.engine === engine);
}

/** Get capabilities by category */
export function getCategoryCapabilities(category: CapabilityCategory): Capability[] {
  return CAPABILITY_REGISTRY.filter((c) => c.category === category);
}

/** Check if an org has a capability */
export function hasCapability(orgCapabilities: string[], key: CapabilityKey): boolean {
  return orgCapabilities.includes(key);
}
