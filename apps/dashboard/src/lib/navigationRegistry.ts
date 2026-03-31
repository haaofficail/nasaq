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
  Plug, ScanBarcode,
  // specialty icons
  Flower2, UtensilsCrossed, Building, Truck, Key, PartyPopper, Camera, Wrench, Warehouse, ClipboardCheck,
  GraduationCap, BookOpenCheck, ClipboardPen, Calendar, AlertCircle, Upload, UserCheck, ShieldAlert, ShieldCheck,
  // property icons
  Building2, DoorOpen, FileText, Receipt, Banknote, TrendingDown, Archive, BarChart2,
  TrendingUp, HardHat, FileBarChart, Megaphone, MessageSquare, DollarSign, Monitor, Briefcase, Zap,
} from "lucide-react";

export interface NavItemEntry {
  name: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string;
  requiredCapabilities: string[];
}

export interface NavGroupEntry {
  id: string;
  label: string;
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
      { name: "الحجوزات",        href: "/dashboard/bookings",  icon: CalendarCheck, requiredCapabilities: ["bookings"] },
      { name: "نقطة البيع",      href: "/dashboard/pos",       icon: ShoppingBag,   requiredCapabilities: ["pos"] },
      { name: "الطلبات",         href: "/dashboard/orders",    icon: Package,       requiredCapabilities: ["online_orders"] },
      { name: "العملاء",         href: "/dashboard/customers", icon: Users,         requiredCapabilities: [] },
    ],
  },

  // ── الادارة ────────────────────────────────────────────────
  {
    id: "management",
    label: "الادارة",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
    items: [
      { name: "الخدمات والمنتجات", href: "/dashboard/catalog",        icon: Layers,        requiredCapabilities: ["catalog"] },
      { name: "بطاقات الباركود",  href: "/dashboard/barcode-labels", icon: ScanBarcode,   requiredCapabilities: ["catalog"] },
      { name: "المخزون",          href: "/dashboard/inventory",      icon: Box,           requiredCapabilities: ["inventory"] },
      { name: "الفريق",           href: "/dashboard/team",       icon: UsersRound,  requiredCapabilities: [] },
      { name: "المالية",          href: "/dashboard/finance",    icon: Wallet,      requiredCapabilities: [] },
      { name: "المدفوعات الإلكترونية", href: "/dashboard/payments", icon: CreditCard, requiredCapabilities: [] },
      { name: "التكاملات",        href: "/dashboard/integrations", icon: Plug,       requiredCapabilities: [] },
    ],
  },

  // ── النمو ──────────────────────────────────────────────────
  {
    id: "growth",
    label: "النمو",
    requiredCapabilities: [],
    anyCapability: [],
    allowedBusinessTypes: [],
    allowedOperatingProfiles: [],
    items: [
      { name: "التقارير",          href: "/dashboard/reports",   icon: BarChart3,      requiredCapabilities: [] },
      { name: "الموقع والمتجر",    href: "/dashboard/website",   icon: Globe,          requiredCapabilities: [] },
      { name: "التسويق",           href: "/dashboard/marketing", icon: Send,           requiredCapabilities: [] },
      { name: "التقييمات",         href: "/dashboard/reviews",              icon: Star,          requiredCapabilities: [] },
      { name: "الشرائح المستهدفة",  href: "/dashboard/segments",             icon: Tag,           requiredCapabilities: [] },
      { name: "السلات المتروكة",    href: "/dashboard/abandoned-carts",      icon: ShoppingCart,  requiredCapabilities: [] },
      { name: "اشتراكات العملاء",   href: "/dashboard/customer-subscriptions", icon: CreditCard,   requiredCapabilities: [] },
      { name: "واتساب",            href: "/dashboard/messaging",            icon: MessageCircle, requiredCapabilities: [] },
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
      { name: "العمولات",           href: "/dashboard/commissions",       icon: BarChart3,     requiredCapabilities: [] },
      { name: "الاستدعاء",          href: "/dashboard/recall",            icon: Users,         requiredCapabilities: [] },
      { name: "مستلزمات الصالون",   href: "/dashboard/salon-supplies",    icon: Box,           requiredCapabilities: ["inventory"] },
    ],
  },

  // ── SPECIALTY: Flower Shop ────────────────────────────────
  {
    id: "specialty_flower",
    label: "متجر الورود",
    requiredCapabilities: ["floral"],
    anyCapability: [],
    allowedBusinessTypes: ["flower_shop"],
    allowedOperatingProfiles: [],
    items: [
      { name: "مخزون الورد",   href: "/dashboard/flower-inventory",  icon: Flower2,       requiredCapabilities: ["floral"] },
      { name: "بيانات الورد",  href: "/dashboard/flower-master",     icon: Layers,        requiredCapabilities: ["floral"] },
      { name: "التنسيقات",     href: "/dashboard/arrangements",      icon: Package,       requiredCapabilities: ["floral"] },
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
      { name: "إدارة الفندق", href: "/dashboard/hotel", icon: Building, requiredCapabilities: ["hotel"] },
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
    allowedBusinessTypes: ["rental", "real_estate"],
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
    label: "إدارة العقارات",
    requiredCapabilities: ["property"],
    anyCapability: [],
    allowedBusinessTypes: ["real_estate"],
    allowedOperatingProfiles: ["real_estate_rental"],
    items: [
      { name: "الشاشة الذكية",       href: "/dashboard/property/smart-home",   icon: Monitor,       requiredCapabilities: ["property"] },
      { name: "المحفظة العقارية",     href: "/dashboard/property/portfolio",    icon: Briefcase,     requiredCapabilities: ["property"] },
      { name: "لوحة العقارات",        href: "/dashboard/property",              icon: Building,      requiredCapabilities: ["property"] },
      { name: "العقارات",             href: "/dashboard/property/properties",   icon: Building2,     requiredCapabilities: ["property"] },
      { name: "الوحدات",              href: "/dashboard/property/units",        icon: DoorOpen,      requiredCapabilities: ["property"] },
      { name: "المستأجرون",           href: "/dashboard/property/tenants",      icon: Users,         requiredCapabilities: ["property"] },
      { name: "العقود",               href: "/dashboard/property/contracts",    icon: FileText,      requiredCapabilities: ["property"] },
      { name: "دفعة سريعة",           href: "/dashboard/property/quick-payment",icon: Zap,           requiredCapabilities: ["property"] },
      { name: "الفواتير",             href: "/dashboard/property/invoices",     icon: Receipt,       requiredCapabilities: ["property"] },
      { name: "المدفوعات",            href: "/dashboard/property/payments",     icon: Banknote,      requiredCapabilities: ["property"] },
      { name: "الصيانة",              href: "/dashboard/property/maintenance",  icon: Wrench,        requiredCapabilities: ["property"] },
      { name: "المصروفات",            href: "/dashboard/property/expenses",     icon: TrendingDown,  requiredCapabilities: ["property"] },
      { name: "الفحوصات",             href: "/dashboard/property/inspections",  icon: ClipboardCheck,requiredCapabilities: ["property"] },
      { name: "الوثائق",              href: "/dashboard/property/documents",    icon: Archive,       requiredCapabilities: ["property"] },
      { name: "التقييمات",            href: "/dashboard/property/valuations",   icon: BarChart2,     requiredCapabilities: ["property"] },
      { name: "تحليل الاستثمار",      href: "/dashboard/property/investment",   icon: TrendingUp,    requiredCapabilities: ["property"] },
      { name: "إدارة البناء",         href: "/dashboard/property/construction", icon: HardHat,       requiredCapabilities: ["property"] },
      { name: "التقارير",             href: "/dashboard/property/reports",      icon: FileBarChart,  requiredCapabilities: ["property"] },
      { name: "الإعلانات",            href: "/dashboard/property/listings",     icon: Megaphone,     requiredCapabilities: ["property"] },
      { name: "الاستفسارات",          href: "/dashboard/property/inquiries",    icon: MessageSquare, requiredCapabilities: ["property"] },
      { name: "عمليات البيع",         href: "/dashboard/property/sales",        icon: DollarSign,    requiredCapabilities: ["property"] },
      { name: "الملاك",               href: "/dashboard/property/owners",       icon: UserCheck,     requiredCapabilities: ["property"] },
      { name: "الامتثال التنظيمي",    href: "/dashboard/property/compliance",   icon: ShieldCheck,   requiredCapabilities: ["property"] },
      { name: "بوابة المستأجر",       href: "/dashboard/property/portal",       icon: Monitor,       requiredCapabilities: ["property"] },
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
      { name: "مكتبة الوسائط", href: "/dashboard/media", icon: Camera, requiredCapabilities: [] },
    ],
  },

  // ── SPECIALTY: School ─────────────────────────────────────
  {
    id: "specialty_school",
    label: "إدارة المدرسة",
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
    ],
  },
];

// ============================================================
// BOTTOM items (always visible, rendered separately in Layout)
// ============================================================

export const BOTTOM_NAV: NavItemEntry[] = [
  { name: "إدارة الباقة",  href: "/dashboard/subscription",       icon: CreditCard,    exact: true,  requiredCapabilities: [] },
  { name: "سجل الأحداث",  href: "/dashboard/settings/audit-log", icon: ClipboardList, exact: false, requiredCapabilities: [] },
  { name: "التذكيرات",    href: "/dashboard/reminders",          icon: Bell,          exact: false, requiredCapabilities: [] },
  { name: "الدليل الشامل", href: "/dashboard/guide",             icon: BookOpen,      exact: false, requiredCapabilities: [] },
  { name: "الدعم الفني",  href: "/dashboard/support",            icon: MessageCircle, exact: false, requiredCapabilities: [] },
  { name: "الاعدادات",    href: "/dashboard/settings",           icon: Settings,      exact: false, requiredCapabilities: [] },
];

export const SUPER_ADMIN_NAV: NavItemEntry = {
  name: "ادارة المنصة", href: "/admin", icon: Shield, exact: false, requiredCapabilities: [],
};

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
      items: group.items.filter((item) =>
        item.requiredCapabilities.every((cap) => ctx.capabilities.includes(cap))
      ),
    }))
    .filter((group) => group.items.length > 0);

  const isSpecialty = (g: NavGroupEntry) => g.id.startsWith("specialty_");
  const universal   = visible.filter((g) => !isSpecialty(g));
  const specialty   = visible.filter((g) => isSpecialty(g));

  // School accounts: show only school-specific modules + home (no commercial nav)
  if (ctx.businessType === "school") {
    const homeGroup = universal.find((g) => g.id === "home");
    return [
      ...(homeGroup ? [homeGroup] : []),
      ...specialty,
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
