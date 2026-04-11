/**
 * Navigation Registry — Simplified 13-item structure
 *
 * Sidebar consolidates all pages under 13 top-level entries.
 * Detailed sub-sections are handled via tabs within each page.
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, CalendarCheck, ShoppingBag, Package, Users,
  Layers, Box, UsersRound, Wallet, BarChart3, Globe, Send, Star, ShoppingCart, Tag,
  Settings, Shield, Bell, MessageCircle, ClipboardList, CreditCard, BookOpen,
  Plug, ScanBarcode, FileSignature,
  // specialty icons
  Flower2, UtensilsCrossed, Building, Truck, Key, PartyPopper, Camera, Wrench, Warehouse, ClipboardCheck,
  GraduationCap, BookOpenCheck, ClipboardPen, Calendar, AlertCircle, Upload, UserCheck, ShieldAlert, ShieldCheck,
  // property icons
  Building2, DoorOpen, FileText, Receipt, Banknote, TrendingDown, Archive, BarChart2,
  TrendingUp, HardHat, FileBarChart, Megaphone, MessageSquare, DollarSign, Monitor, Briefcase, Zap,
  UserCog,
} from "lucide-react";

// Plan hierarchy — each plan includes all plans below it
export type SubscriptionPlan = "free" | "basic" | "advanced" | "pro" | "enterprise";

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free:       0,
  basic:      1,
  advanced:   2,
  pro:        3,
  enterprise: 4,
};

/** Returns true if currentPlan meets or exceeds requiredPlan */
export function planAllows(currentPlan: SubscriptionPlan | undefined, requiredPlan: SubscriptionPlan): boolean {
  if (!currentPlan) return false;
  return (PLAN_RANK[currentPlan] ?? 0) >= PLAN_RANK[requiredPlan];
}

export interface NavItemEntry {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string;
  requiredCapabilities: string[];
  /** Minimum plan required to see this item. Omit = visible on all plans */
  requiredPlan?: SubscriptionPlan;
  /** If set, item only shows for these business types */
  allowedBusinessTypes?: string[];
  /** If set, item is hidden for these business types */
  excludedBusinessTypes?: string[];
}

export interface NavGroupEntry {
  id: string;
  label: string;
  /** فاصل مرئي فوق المجموعة — يُعرض كعنوان قسم في الشريط الجانبي */
  sectionLabel?: string;
  items: NavItemEntry[];
  requiredCapabilities: string[];
  anyCapability: string[];
  allowedBusinessTypes: string[];
  allowedOperatingProfiles: string[];
}

export interface OrgNavContext {
  businessType: string;
  operatingProfile: string;
  capabilities: string[];
  /** Current subscription plan — used to gate premium nav items */
  plan?: SubscriptionPlan;
}

// ============================================================
// REGISTRY — 13 core items + specialty
// ============================================================

export const NAV_REGISTRY: NavGroupEntry[] = [

  // ── الرئيسية ───────────────────────────────────────────────
  {
    id: "home",
    label: "الرئيسية",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
    items: [
      { name: "الرئيسية", href: "/dashboard", icon: LayoutDashboard, exact: true, requiredCapabilities: [] },
    ],
  },

  // ── العمليات ───────────────────────────────────────────────
  {
    id: "operations",
    label: "العمليات",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
    items: [
      { name: "الخدمات",          href: "/dashboard/catalog",        icon: Layers,        requiredCapabilities: ["catalog"], excludedBusinessTypes: ["car_rental", "hotel", "real_estate", "rental"] },
      { name: "الحجوزات",        href: "/dashboard/bookings",     icon: CalendarCheck, requiredCapabilities: ["bookings"] },
      { name: "نقطة البيع",        href: "/dashboard/pos",          icon: ShoppingBag,   requiredCapabilities: ["pos"], excludedBusinessTypes: ["car_rental", "hotel", "real_estate", "rental", "restaurant", "bakery", "catering", "flower_shop"] },
      { name: "الطلبات",         href: "/dashboard/orders",       icon: Package,       requiredCapabilities: ["online_orders"] },
      { name: "التوصيل",          href: "/dashboard/delivery",     icon: Truck,         requiredCapabilities: [], requiredPlan: "basic", excludedBusinessTypes: ["salon", "barber", "spa", "fitness", "massage", "photography", "hotel", "car_rental", "rental", "real_estate", "school"] },
      { name: "أوامر العمل",     href: "/dashboard/work-orders",  icon: ClipboardCheck, requiredCapabilities: [], allowedBusinessTypes: ["workshop", "maintenance", "logistics", "construction", "laundry", "photography"] },
      { name: "العملاء",         href: "/dashboard/customers",    icon: Users,         requiredCapabilities: [], excludedBusinessTypes: ["flower_shop"] },
      { name: "العقود",          href: "/dashboard/contracts",    icon: FileSignature, requiredCapabilities: [], requiredPlan: "basic", excludedBusinessTypes: ["salon", "spa", "restaurant", "cafe", "bakery", "flower_shop", "retail", "laundry"] },
    ],
  },

  // ── الإدارة ────────────────────────────────────────────────
  {
    id: "management",
    label: "الإدارة",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
    items: [
      { name: "المالية",          href: "/dashboard/finance",    icon: Wallet,      requiredCapabilities: [], requiredPlan: "basic" },
      { name: "المدفوعات الإلكترونية", href: "/dashboard/payments", icon: CreditCard, requiredCapabilities: [], requiredPlan: "basic" },
    ],
  },

  // ── أدوات إضافية ──────────────────────────────────────────
  {
    id: "system",
    label: "أدوات إضافية",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
    items: [
      { name: "ملصقات المنتجات",  href: "/dashboard/barcode-labels", icon: ScanBarcode,   requiredCapabilities: [] },
      { name: "ربط التطبيقات",    href: "/dashboard/integrations", icon: Plug,       requiredCapabilities: [], requiredPlan: "pro" },
    ],
  },

  // ── الموارد البشرية ─────────────────────────────────────────
  {
    id: "hr",
    label: "الموارد البشرية",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
    items: [
      { name: "الفريق",           href: "/dashboard/team",       icon: UsersRound,  requiredCapabilities: [] },
      { name: "الموظفين",         href: "/dashboard/hr",         icon: UserCog,     requiredCapabilities: [], requiredPlan: "basic" },
    ],
  },

  // ── المخزون ─────────────────────────────────────────────────
  {
    id: "inventory",
    label: "المخزون",
    requiredCapabilities: ["inventory"],
    anyCapability: [],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
    items: [
      { name: "المخزون",          href: "/dashboard/inventory",      icon: Box,           requiredCapabilities: ["inventory"], excludedBusinessTypes: ["flower_shop"] },
    ],
  },

  // ── التسويق والنمو ──────────────────────────────────────
  {
    id: "growth",
    label: "التسويق والنمو",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
    items: [
      { name: "المتجر الإلكتروني",   href: "/dashboard/storefront",      icon: Globe,        requiredCapabilities: [] },
      { name: "الموقع الإلكتروني",  href: "/dashboard/website",         icon: Monitor,      requiredCapabilities: [], requiredPlan: "basic" },
      { name: "التسويق",           href: "/dashboard/marketing", icon: Send,           requiredCapabilities: [], requiredPlan: "advanced" },
      { name: "التقييمات",         href: "/dashboard/reviews",              icon: Star,          requiredCapabilities: [], requiredPlan: "basic" },
      { name: "مجموعات العملاء",   href: "/dashboard/segments",             icon: Tag,           requiredCapabilities: [], requiredPlan: "advanced" },
      { name: "طلبات غير مكتملة",  href: "/dashboard/abandoned-carts",      icon: ShoppingCart,  requiredCapabilities: [], allowedBusinessTypes: ["flower_shop", "retail", "restaurant", "cafe", "bakery", "catering"], requiredPlan: "advanced" },
      { name: "اشتراكات العملاء",   href: "/dashboard/customer-subscriptions", icon: CreditCard,   requiredCapabilities: [], allowedBusinessTypes: ["salon", "barber", "spa", "fitness"], requiredPlan: "pro" },
      { name: "واتساب",            href: "/dashboard/messaging",            icon: MessageCircle, requiredCapabilities: [], requiredPlan: "advanced" },
    ],
  },

  // ── التحليل ────────────────────────────────────────────────
  {
    id: "analysis",
    label: "التحليل",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
    items: [
      { name: "التقارير",          href: "/dashboard/reports",   icon: BarChart3,      requiredCapabilities: [], requiredPlan: "basic", excludedBusinessTypes: ["flower_shop"] },
    ],
  },

  // ── SPECIALTY: Salon / Beauty ─────────────────────────────
  {
    id: "specialty_salon",
    label: "إدارة الصالون",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: ["salon", "barber", "spa", "fitness"],
    allowedOperatingProfiles: [],
    items: [
      { name: "الجدول الزمني",     href: "/dashboard/schedule",          icon: CalendarCheck, requiredCapabilities: ["schedules"] },
      { name: "العمولات",           href: "/dashboard/commissions",       icon: BarChart3,     requiredCapabilities: [], requiredPlan: "advanced" },
      { name: "الاستدعاء",          href: "/dashboard/recall",            icon: Users,         requiredCapabilities: [], requiredPlan: "advanced" },
      { name: "مستلزمات الصالون",   href: "/dashboard/salon-supplies",    icon: Box,           requiredCapabilities: ["inventory"] },
      { name: "مراقبة التشغيل",     href: "/dashboard/salon-monitoring",  icon: BarChart2,     requiredCapabilities: [] },
      { name: "التحكم في الدخول",   href: "/dashboard/access-control",   icon: ShieldCheck,   requiredCapabilities: [], allowedBusinessTypes: ["fitness"], requiredPlan: "pro" },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // FLOWER SHOP — Feature-Based Navigation (10 groups)
  // ══════════════════════════════════════════════════════════════

  // 1. العمليات — التشغيل اليومي
  {
    id: "specialty_flower_ops",
    label: "العمليات",
    requiredCapabilities: ["floral"],
    anyCapability: [],
    allowedBusinessTypes: ["flower_shop"],
    allowedOperatingProfiles: [],
    items: [
      { name: "الطلبات",  href: "/dashboard/flower-orders",   icon: Package,     requiredCapabilities: ["floral"] },
      { name: "نقطة البيع",  href: "/dashboard/flower-pos",      icon: ScanBarcode, requiredCapabilities: ["floral"] },
      { name: "التوصيل",  href: "/dashboard/flower-delivery", icon: Truck,       requiredCapabilities: ["floral"] },
    ],
  },

  // 2. المنتجات والتنسيقات — ما يُباع في المتجر
  {
    id: "specialty_flower_catalog",
    label: "المنتجات والتنسيقات",
    requiredCapabilities: ["floral"],
    anyCapability: [],
    allowedBusinessTypes: ["flower_shop"],
    allowedOperatingProfiles: [],
    items: [
      { name: "الباقات والتنسيقات", href: "/dashboard/arrangements",    icon: ShoppingBag,  requiredCapabilities: ["floral"] },
      { name: "خدمات التنسيق والكوش",   href: "/dashboard/flower-catalog",  icon: PartyPopper,  requiredCapabilities: ["floral"] },
      { name: "تخفيضات الطازج",    href: "/dashboard/flower-disposal", icon: TrendingDown, requiredCapabilities: ["floral"] },
    ],
  },

  // 3. المخزون — feature_inventory (floral)
  {
    id: "specialty_flower_inventory",
    label: "المخزون",
    requiredCapabilities: ["floral"],
    anyCapability: [],
    allowedBusinessTypes: ["flower_shop"],
    allowedOperatingProfiles: [],
    items: [
      { name: "مخزون الورد الطازج",  href: "/dashboard/flower-inventory", icon: Box,         requiredCapabilities: ["floral"] },
      { name: "أنواع الورد وأسعاره", href: "/dashboard/flower-master",    icon: Layers,      requiredCapabilities: ["floral"] },
      { name: "سجل الهدر",           href: "/dashboard/flower-waste",     icon: AlertCircle, requiredCapabilities: ["floral"] },
    ],
  },

  // 4. المشاريع والأصول — feature_projects (floral)
  {
    id: "specialty_flower_projects",
    label: "المشاريع والأصول",
    requiredCapabilities: ["floral"],
    anyCapability: [],
    allowedBusinessTypes: ["flower_shop"],
    allowedOperatingProfiles: [],
    items: [
      { name: "المشاريع الميدانية", href: "/dashboard/flower-service-orders", icon: Briefcase, requiredCapabilities: ["floral"] },
      { name: "المعدات والأدوات",  href: "/dashboard/flower-assets",         icon: Archive,   requiredCapabilities: ["floral"] },
      { name: "الموردون",           href: "/dashboard/flower-suppliers",      icon: Truck,     requiredCapabilities: ["floral"] },
    ],
  },

  // 5. العملاء والتجربة
  {
    id: "specialty_flower_customers",
    label: "العملاء والتجربة",
    requiredCapabilities: ["floral"],
    anyCapability: [],
    allowedBusinessTypes: ["flower_shop"],
    allowedOperatingProfiles: [],
    items: [
      { name: "العملاء",   href: "/dashboard/flower-customers", icon: Users,    requiredCapabilities: ["floral"] },
      { name: "المناسبات", href: "/dashboard/flower-occasions", icon: Calendar, requiredCapabilities: ["floral"] },
    ],
  },

  // 6. التحليل
  {
    id: "specialty_flower_analysis",
    label: "التحليل",
    requiredCapabilities: ["floral"],
    anyCapability: [],
    allowedBusinessTypes: ["flower_shop"],
    allowedOperatingProfiles: [],
    items: [
      { name: "التحليلات",   href: "/dashboard/flower-analytics", icon: TrendingUp, requiredCapabilities: ["floral"] },
      { name: "التقارير",    href: "/dashboard/flower-reports",   icon: BarChart3,  requiredCapabilities: ["floral"] },
      { name: "أرباح المنتجات", href: "/dashboard/flower-margins",  icon: DollarSign, requiredCapabilities: ["floral"] },
    ],
  },

  // 7. التسويق والنمو — feature_marketing (plan-gated items)
  {
    id: "specialty_flower_marketing",
    label: "التسويق والنمو",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: ["flower_shop"],
    allowedOperatingProfiles: [],
    items: [
      { name: "المتجر الإلكتروني",   href: "/dashboard/storefront",      icon: Globe,        requiredCapabilities: [] },
      { name: "الموقع الإلكتروني",  href: "/dashboard/website",         icon: Monitor,      requiredCapabilities: [], requiredPlan: "basic" as const },
      { name: "التسويق",           href: "/dashboard/marketing",       icon: Send,         requiredCapabilities: [], requiredPlan: "advanced" as const },
      { name: "التقييمات",         href: "/dashboard/reviews",         icon: Star,         requiredCapabilities: [], requiredPlan: "basic" as const },
      { name: "مجموعات العملاء",   href: "/dashboard/segments",        icon: Tag,          requiredCapabilities: [], requiredPlan: "advanced" as const },
      { name: "طلبات غير مكتملة",  href: "/dashboard/abandoned-carts", icon: ShoppingCart, requiredCapabilities: [], requiredPlan: "advanced" as const },
      { name: "واتساب",            href: "/dashboard/messaging",       icon: MessageCircle,requiredCapabilities: [], requiredPlan: "advanced" as const },
    ],
  },

  // 8. الموارد البشرية — feature_team (always) + feature_hr (plan-gated)
  {
    id: "specialty_flower_hr",
    label: "الموارد البشرية",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: ["flower_shop"],
    allowedOperatingProfiles: [],
    items: [
      { name: "الفريق",   href: "/dashboard/team", icon: UsersRound, requiredCapabilities: [] },
      { name: "الموظفين", href: "/dashboard/hr",   icon: UserCog,    requiredCapabilities: [], requiredPlan: "basic" as const },
    ],
  },

  // 9. الإدارة — المالية والمدفوعات (plan-gated)
  {
    id: "specialty_flower_admin",
    label: "الإدارة",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: ["flower_shop"],
    allowedOperatingProfiles: [],
    items: [
      { name: "المالية",              href: "/dashboard/finance",   icon: Wallet,    requiredCapabilities: [], requiredPlan: "basic" as const },
      { name: "المدفوعات الإلكترونية", href: "/dashboard/payments", icon: CreditCard,requiredCapabilities: [], requiredPlan: "basic" as const },
    ],
  },

  // 10. أدوات إضافية — أدوات تشغيلية
  {
    id: "specialty_flower_system",
    label: "أدوات إضافية",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: ["flower_shop"],
    allowedOperatingProfiles: [],
    items: [
      { name: "ملصقات المنتجات", href: "/dashboard/barcode-labels", icon: ScanBarcode, requiredCapabilities: [] },
      { name: "ربط التطبيقات",   href: "/dashboard/integrations",   icon: Plug,        requiredCapabilities: [], requiredPlan: "pro" as const },
    ],
  },

  // ── SPECIALTY: Food & Beverage ────────────────────────────
  {
    id: "specialty_food",
    label: "القائمة والمطبخ",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: ["restaurant", "cafe", "bakery", "catering"],
    allowedOperatingProfiles: [],
    items: [
      { name: "قائمة الطعام",  href: "/dashboard/menu",        icon: UtensilsCrossed, requiredCapabilities: [] },
      { name: "المطبخ",         href: "/dashboard/kitchen",     icon: Package,         requiredCapabilities: [] },
      { name: "الطاولات",       href: "/dashboard/table-map",   icon: Layers,          requiredCapabilities: [] },
      { name: "برنامج الولاء",  href: "/dashboard/loyalty",     icon: Star,            requiredCapabilities: ["customers"], allowedBusinessTypes: ["restaurant", "cafe", "bakery", "catering"] },
    ],
  },

  // ── SPECIALTY: Hotel ──────────────────────────────────────
  {
    id: "specialty_hotel",
    label: "الفندق",
    requiredCapabilities: ["hotel"],
    anyCapability: [],
    allowedBusinessTypes: ["hotel"],
    allowedOperatingProfiles: [],
    items: [
      { name: "الفندق", href: "/dashboard/hotel", icon: Building, requiredCapabilities: ["hotel"] },
    ],
  },

  // ── SPECIALTY: Car Rental ─────────────────────────────────
  {
    id: "specialty_car_rental",
    label: "تأجير السيارات",
    requiredCapabilities: ["car_rental"],
    anyCapability: [],
    allowedBusinessTypes: ["car_rental"],
    allowedOperatingProfiles: [],
    items: [
      { name: "تأجير السيارات", href: "/dashboard/car-rental", icon: Truck, requiredCapabilities: ["car_rental"] },
    ],
  },

  // ── SPECIALTY: Rental & Contracts ─────────────────────────
  {
    id: "specialty_rental",
    label: "التأجير والعقود",
    requiredCapabilities: [],
    anyCapability: ["assets", "contracts"],
    allowedBusinessTypes: ["rental"],
    allowedOperatingProfiles: [],
    items: [
      { name: "الأصول",         href: "/dashboard/assets",       icon: Key,             requiredCapabilities: ["assets"] },
      { name: "العقود",         href: "/dashboard/contracts",    icon: Layers,          requiredCapabilities: ["contracts"] },
      { name: "المستودع",       href: "/dashboard/warehouse",    icon: Warehouse,       requiredCapabilities: ["inventory"] },
      { name: "التفتيش",        href: "/dashboard/inspections",  icon: Package,         requiredCapabilities: [] },
      { name: "الصيانة والنظافة", href: "/dashboard/maintenance", icon: ClipboardCheck, requiredCapabilities: [] },
    ],
  },

  // ── SPECIALTY: Property Management ───────────────────────
  {
    id: "specialty_property",
    label: "العقارات",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: ["real_estate"],
    allowedOperatingProfiles: [],
    items: [
      { name: "لوحة العقارات",   href: "/dashboard/property",              icon: Building,      requiredCapabilities: [], exact: true },
      { name: "العقارات",        href: "/dashboard/property/properties",   icon: Building2,     requiredCapabilities: [] },
      { name: "الوحدات",         href: "/dashboard/property/units",        icon: DoorOpen,      requiredCapabilities: [] },
      { name: "المستأجرون",      href: "/dashboard/property/tenants",      icon: Users,         requiredCapabilities: [] },
      { name: "العقود",          href: "/dashboard/property/contracts",    icon: FileText,      requiredCapabilities: [] },
      { name: "الفواتير",        href: "/dashboard/property/invoices",     icon: Receipt,       requiredCapabilities: [] },
      { name: "المدفوعات",       href: "/dashboard/property/payments",     icon: Banknote,      requiredCapabilities: [] },
      { name: "الصيانة",         href: "/dashboard/property/maintenance",  icon: Wrench,        requiredCapabilities: [] },
      { name: "المصروفات",       href: "/dashboard/property/expenses",     icon: TrendingDown,  requiredCapabilities: [] },
      { name: "الإعلانات",       href: "/dashboard/property/listings",     icon: Megaphone,     requiredCapabilities: [] },
      { name: "الاستفسارات",     href: "/dashboard/property/inquiries",    icon: MessageSquare, requiredCapabilities: [] },
      { name: "عمليات البيع",    href: "/dashboard/property/sales",        icon: DollarSign,    requiredCapabilities: [] },
      { name: "التقارير",        href: "/dashboard/property/reports",      icon: FileBarChart,  requiredCapabilities: [] },
    ],
  },

  // ── SPECIALTY: Events ─────────────────────────────────────
  {
    id: "specialty_events",
    label: "الفعاليات",
    requiredCapabilities: [],
    anyCapability: ["contracts", "bookings"],
    allowedBusinessTypes: ["events", "event_organizer"],
    allowedOperatingProfiles: [],
    items: [
      { name: "الفعاليات", href: "/dashboard/events",   icon: PartyPopper, requiredCapabilities: [] },
      { name: "الباقات",   href: "/dashboard/packages", icon: Box,         requiredCapabilities: [] },
    ],
  },

  // ── SPECIALTY: Photography ────────────────────────────────
  {
    id: "specialty_photography",
    label: "الاستوديو",
    requiredCapabilities: [],
    anyCapability: ["media", "bookings"],
    allowedBusinessTypes: ["photography"],
    allowedOperatingProfiles: [],
    items: [
      { name: "مكتبة الوسائط",  href: "/dashboard/media",      icon: Camera,        requiredCapabilities: [] },
      { name: "معارض العملاء",  href: "/dashboard/galleries",  icon: ShieldCheck,   requiredCapabilities: [] },
    ],
  },

  // ── SPECIALTY: School ─────────────────────────────────────
  {
    id: "specialty_school",
    label: "المدرسة",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: ["school"],
    allowedOperatingProfiles: [],
    items: [
      { name: "مراقب اليوم",        href: "/dashboard/school/day-monitor",          icon: ClipboardCheck,  requiredCapabilities: [] },
      { name: "الطلاب",              href: "/dashboard/school/students",              icon: Users,           requiredCapabilities: [] },
      { name: "الفصول",              href: "/dashboard/school/classes",               icon: GraduationCap,   requiredCapabilities: [] },
      { name: "الحضور والغياب",      href: "/dashboard/school/attendance",            icon: UserCheck,       requiredCapabilities: [] },
      { name: "المعلمون",            href: "/dashboard/school/teachers",              icon: UsersRound,      requiredCapabilities: [] },
      { name: "حصص اليوم",           href: "/dashboard/school/periods/today",         icon: Calendar,        requiredCapabilities: [] },
      { name: "الحالات والمتابعة",   href: "/dashboard/school/cases",                icon: AlertCircle,     requiredCapabilities: [] },
      { name: "المخالفات",           href: "/dashboard/school/violations",            icon: ShieldAlert,     requiredCapabilities: [] },
      { name: "السلوك والمواظبة",    href: "/dashboard/school/behavior",             icon: ShieldCheck,     requiredCapabilities: [] },
      { name: "قوالب الجداول",       href: "/dashboard/school/timetable-templates",  icon: BookOpenCheck,   requiredCapabilities: [] },
      { name: "الأسابيع والجداول",   href: "/dashboard/school/schedules/weeks",       icon: ClipboardPen,    requiredCapabilities: [] },
      { name: "الاستيراد",           href: "/dashboard/school/import",                icon: Upload,          requiredCapabilities: [] },
      { name: "إعدادات المدرسة",     href: "/dashboard/school/account",              icon: Settings,        requiredCapabilities: [] },
      { name: "المواد الدراسية",      href: "/dashboard/school/subjects",             icon: BookOpen,        requiredCapabilities: [] },
      { name: "تهيئة النظام",        href: "/dashboard/school/setup",                icon: Wrench,          requiredCapabilities: [] },
    ],
  },

  // ── SPECIALTY: Field Service ──────────────────────────────
  {
    id: "specialty_field",
    label: "طلبات الخدمة",
    requiredCapabilities: [],
    anyCapability: ["schedules", "attendance"],
    allowedBusinessTypes: ["maintenance", "workshop", "logistics", "construction"],
    allowedOperatingProfiles: [],
    items: [
      { name: "طلبات الخدمة", href: "/dashboard/bookings", icon: Wrench, requiredCapabilities: [] },
      { name: "أوامر العمل",  href: "/dashboard/work-orders", icon: ClipboardCheck, requiredCapabilities: [] },
    ],
  },
];

// ============================================================
// BOTTOM items (always visible, rendered separately in Layout)
// ============================================================

export const BOTTOM_NAV: NavItemEntry[] = [
  { name: "الاشتراك والفوترة", href: "/dashboard/billing",            icon: CreditCard,    exact: true,  requiredCapabilities: [] },
  { name: "سجل العمليات",  href: "/dashboard/settings/audit-log", icon: ClipboardList, exact: false, requiredCapabilities: [] },
  { name: "التذكيرات",    href: "/dashboard/reminders",          icon: Bell,          exact: false, requiredCapabilities: [] },
  { name: "الدليل الشامل", href: "/dashboard/guide",             icon: BookOpen,      exact: false, requiredCapabilities: [] },
  { name: "الدعم الفني",  href: "/dashboard/support",            icon: MessageCircle, exact: false, requiredCapabilities: [] },
  { name: "الإعدادات",    href: "/dashboard/settings",           icon: Settings,      exact: false, requiredCapabilities: [] },
  { name: "ترقية الباقة", href: "/dashboard/subscription",       icon: Zap,           exact: true,  requiredCapabilities: [] },
];

export const SUPER_ADMIN_NAV: NavItemEntry = {
  name: "إدارة المنصة", href: "/admin", icon: Shield, exact: false, requiredCapabilities: [],
};

// ============================================================
// Flower Shop navigation is now fully defined in NAV_REGISTRY above
// (specialty_flower_* groups). The buildVisibleNav function handles
// flower_shop as an isolated vertical (home + specialty groups),
// same pattern as school and real_estate.
// ============================================================

// ============================================================
// Builder
// ============================================================

export function buildVisibleNav(ctx: OrgNavContext): NavGroupEntry[] {
  const visible = NAV_REGISTRY
    .filter((group) => {
      if (group.allowedBusinessTypes.length > 0 && !group.allowedBusinessTypes.includes(ctx.businessType)) return false;
      if (group.allowedOperatingProfiles.length > 0 && !group.allowedOperatingProfiles.includes(ctx.operatingProfile)) return false;
      if (group.requiredCapabilities.some((cap) => !ctx.capabilities.includes(cap))) return false;
      if (group.anyCapability.length > 0 && !group.anyCapability.some((cap) => ctx.capabilities.includes(cap))) return false;
      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.requiredCapabilities.every((cap) => ctx.capabilities.includes(cap))) return false;
        if (item.allowedBusinessTypes?.length && !item.allowedBusinessTypes.includes(ctx.businessType)) return false;
        if (item.excludedBusinessTypes?.length && item.excludedBusinessTypes.includes(ctx.businessType)) return false;
        // Plan gate: hide items that require a higher plan
        if (item.requiredPlan && !planAllows(ctx.plan, item.requiredPlan)) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const isSpecialty = (g: NavGroupEntry) => g.id.startsWith("specialty_");
  const universal   = visible.filter((g) => !isSpecialty(g));
  const specialty   = visible.filter((g) => isSpecialty(g));

  // Isolated verticals: show only home + their specialty modules (no commercial nav)
  if (ctx.businessType === "school" || ctx.businessType === "real_estate" || ctx.businessType === "flower_shop") {
    const homeGroup = universal.find((g) => g.id === "home");
    return [
      ...(homeGroup ? [homeGroup] : []),
      ...specialty,
    ];
  }

  // Food & Beverage: focused sidebar with only café-relevant items
  if (ctx.businessType === "restaurant" || ctx.businessType === "cafe" || ctx.businessType === "bakery" || ctx.businessType === "catering") {
    const homeGroup = universal.find((g) => g.id === "home");
    const opsGroup  = universal.find((g) => g.id === "operations");
    const growGroup = universal.find((g) => g.id === "growth");
    const foodGroup = specialty.find((g) => g.id === "specialty_food");

    const cafeAllowedOps = ctx.businessType === "cafe"
      ? ["/dashboard/pos", "/dashboard/orders", "/dashboard/customers"]
      : ["/dashboard/orders", "/dashboard/customers"];
    const cafeOps = opsGroup ? {
      ...opsGroup,
      items: opsGroup.items.filter((i) => cafeAllowedOps.includes(i.href)),
    } : null;

    const cafeGrowth = growGroup ? {
      ...growGroup,
      items: growGroup.items,
    } : null;

    const analysisGroup = universal.find((g) => g.id === "analysis");

    return [
      ...(homeGroup ? [homeGroup] : []),
      ...(foodGroup ? [foodGroup] : []),
      ...(cafeOps && cafeOps.items.length > 0 ? [cafeOps] : []),
      ...(analysisGroup && analysisGroup.items.length > 0 ? [analysisGroup] : []),
      ...(cafeGrowth && cafeGrowth.items.length > 0 ? [cafeGrowth] : []),
    ];
  }

  if (specialty.length === 0) return universal;

  const opsIdx   = universal.findIndex((g) => g.id === "operations");
  const insertAt = opsIdx >= 0 ? opsIdx + 1 : 1;

  return [
    ...universal.slice(0, insertAt),
    ...specialty,
    ...universal.slice(insertAt),
  ];
}
