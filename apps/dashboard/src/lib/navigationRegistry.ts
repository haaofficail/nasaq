/**
 * Navigation Registry — Simplified 13-item structure
 *
 * Sidebar consolidates all pages under 13 top-level entries.
 * Detailed sub-sections are handled via tabs within each page.
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, CalendarCheck, ShoppingBag, Package, Users,
  Layers, Box, UsersRound, Wallet, BarChart3, Globe, Send,
  Settings, Shield, Bell, MessageCircle,
  // specialty icons
  Flower2, UtensilsCrossed, Building, Truck, Key, PartyPopper, Camera, Wrench, Warehouse,
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
      { name: "الخدمات والمنتجات", href: "/dashboard/catalog",    icon: Layers,     requiredCapabilities: ["catalog"] },
      { name: "المخزون",          href: "/dashboard/inventory",  icon: Box,         requiredCapabilities: ["inventory"] },
      { name: "الفريق",           href: "/dashboard/team",       icon: UsersRound,  requiredCapabilities: [] },
      { name: "المالية",          href: "/dashboard/finance",    icon: Wallet,      requiredCapabilities: [] },
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
      { name: "واتساب",            href: "/dashboard/messaging", icon: MessageCircle,  requiredCapabilities: [] },
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
      { name: "الأصول",    href: "/dashboard/assets",      icon: Key,       requiredCapabilities: ["assets"] },
      { name: "العقود",    href: "/dashboard/contracts",   icon: Layers,    requiredCapabilities: ["contracts"] },
      { name: "المستودع",  href: "/dashboard/warehouse",   icon: Warehouse, requiredCapabilities: ["inventory"] },
      { name: "التفتيش",   href: "/dashboard/inspections", icon: Package,   requiredCapabilities: [] },
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
  { name: "التذكيرات", href: "/dashboard/reminders", icon: Bell,     exact: false, requiredCapabilities: [] },
  { name: "الاعدادات", href: "/dashboard/settings",  icon: Settings, exact: false, requiredCapabilities: [] },
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

  if (specialty.length === 0) return universal;

  const opsIdx   = universal.findIndex((g) => g.id === "operations");
  const insertAt = opsIdx >= 0 ? opsIdx + 1 : 1;

  return [
    ...universal.slice(0, insertAt),
    ...specialty,
    ...universal.slice(insertAt),
  ];
}
