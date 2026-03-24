import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Banknote, CalendarCheck, Users, Package,
  Flower2, Clock, BedDouble, DoorOpen,
  Car, ShoppingBag, BarChart2, Camera,
  UserCheck, AlertTriangle, Zap, Home,
} from "lucide-react";
import {
  bookingsApi, customersApi, servicesApi, flowerMasterApi,
  hotelApi, carRentalApi, inventoryApi, financeApi,
  attendanceEngineApi, onlineOrdersApi, flowerBuilderApi,
} from "./api";
import { WeeklyBookingsChartWidget } from "@/components/dashboard/widgets/WeeklyBookingsChartWidget";
import { BookingStatusWidget } from "@/components/dashboard/widgets/BookingStatusWidget";
import { RecentBookingsWidget } from "@/components/dashboard/widgets/RecentBookingsWidget";
import { TopServicesWidget } from "@/components/dashboard/widgets/TopServicesWidget";
import { FlowerStockWidget } from "@/components/dashboard/widgets/FlowerStockWidget";
import { ExpiringBatchesWidget } from "@/components/dashboard/widgets/ExpiringBatchesWidget";
import { FlowerOrdersWidget } from "@/components/dashboard/widgets/FlowerOrdersWidget";
import { RoomStatusWidget } from "@/components/dashboard/widgets/RoomStatusWidget";
import { FleetStatusWidget } from "@/components/dashboard/widgets/FleetStatusWidget";
import { StaffAvailabilityWidget } from "@/components/dashboard/widgets/StaffAvailabilityWidget";
import { InventoryAlertWidget } from "@/components/dashboard/widgets/InventoryAlertWidget";
import { OnlineOrdersWidget } from "@/components/dashboard/widgets/OnlineOrdersWidget";

export type BusinessType =
  | "flower_shop" | "salon" | "hotel" | "car_rental"
  | "retail" | "rental" | "restaurant" | "photography";

export type Role = "owner" | "admin" | "manager" | "branch_manager" | "staff" | "operator";

export interface KPIConfig {
  id: string;
  label: string;
  unit: string;
  icon: LucideIcon;
  bg: string;
  iconColor: string;
  fetcher: () => Promise<any>;
  transform: (data: any) => string | number;
  allowedRoles: Role[];
}

export interface QuickActionConfig {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  bg: string;
  text: string;
  allowedRoles: Role[];
}

export interface WidgetConfig {
  id: string;
  label: string;
  size: "full" | "two-thirds" | "half" | "third";
  allowedRoles: Role[];
  component: ComponentType;
}

export interface DashboardProfile {
  businessType: BusinessType | "default";
  label: string;
  primaryAction: { label: string; href: string };
  kpis: KPIConfig[];
  quickActions: QuickActionConfig[];
  widgets: WidgetConfig[];
}

export interface DashboardCustomization {
  hiddenKpis: string[];
  hiddenWidgets: string[];
  widgetOrder: string[];
  pinnedActions: string[];
}

// ============================================================
// Shared KPI factories
// ============================================================
const revenueKpi = (id = "revenue"): KPIConfig => ({
  id,
  label: "الإيرادات",
  unit: "ر.س",
  icon: Banknote,
  bg: "bg-emerald-50",
  iconColor: "text-emerald-600",
  fetcher: () => bookingsApi.stats("month"),
  transform: (d) => Number(d?.data?.revenue || 0).toLocaleString("ar-SA"),
  allowedRoles: ["owner", "admin", "manager"],
});

const bookingsKpi = (id = "bookings"): KPIConfig => ({
  id,
  label: "الحجوزات",
  unit: "حجز",
  icon: CalendarCheck,
  bg: "bg-blue-50",
  iconColor: "text-blue-600",
  fetcher: () => bookingsApi.stats("month"),
  transform: (d) => Number(d?.data?.total || 0).toLocaleString("ar-SA"),
  allowedRoles: [],
});

const customersKpi = (id = "customers"): KPIConfig => ({
  id,
  label: "العملاء",
  unit: "عميل",
  icon: Users,
  bg: "bg-violet-50",
  iconColor: "text-violet-600",
  fetcher: () => customersApi.stats(),
  transform: (d) => Number(d?.data?.total || 0).toLocaleString("ar-SA"),
  allowedRoles: [],
});

const servicesKpi = (id = "services"): KPIConfig => ({
  id,
  label: "الخدمات",
  unit: "خدمة",
  icon: Package,
  bg: "bg-amber-50",
  iconColor: "text-amber-600",
  fetcher: () => servicesApi.list({ limit: "100" }),
  transform: (d) => String(d?.data?.length || 0),
  allowedRoles: [],
});

// ============================================================
// Shared widget factories
// ============================================================
const weeklyChartWidget = (): WidgetConfig => ({
  id: "weekly-chart",
  label: "الحجوزات الأسبوعية",
  size: "two-thirds",
  allowedRoles: [],
  component: WeeklyBookingsChartWidget,
});

const bookingStatusWidget = (): WidgetConfig => ({
  id: "booking-status",
  label: "حالة الحجوزات",
  size: "third",
  allowedRoles: [],
  component: BookingStatusWidget,
});

const recentBookingsWidget = (size: WidgetConfig["size"] = "two-thirds"): WidgetConfig => ({
  id: "recent-bookings",
  label: "آخر الحجوزات",
  size,
  allowedRoles: [],
  component: RecentBookingsWidget,
});

const topServicesWidget = (): WidgetConfig => ({
  id: "top-services",
  label: "أبرز الخدمات",
  size: "third",
  allowedRoles: [],
  component: TopServicesWidget,
});

const staffWidget = (size: WidgetConfig["size"] = "third"): WidgetConfig => ({
  id: "staff-availability",
  label: "حضور الموظفين",
  size,
  allowedRoles: [],
  component: StaffAvailabilityWidget,
});

const inventoryAlertWidget = (size: WidgetConfig["size"] = "third"): WidgetConfig => ({
  id: "inventory-alert",
  label: "تنبيهات المخزون",
  size,
  allowedRoles: [],
  component: InventoryAlertWidget,
});

// ============================================================
// Profile definitions
// ============================================================
const profiles: Record<BusinessType | "default", DashboardProfile> = {
  default: {
    businessType: "default",
    label: "لوحة التحكم",
    primaryAction: { label: "حجز جديد", href: "/dashboard/bookings" },
    kpis: [revenueKpi(), bookingsKpi(), customersKpi(), servicesKpi()],
    quickActions: [
      { id: "new-booking",  label: "حجز جديد",   href: "/dashboard/bookings",  icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "new-service",  label: "خدمة جديدة", href: "/dashboard/services",  icon: Package,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-customer", label: "عميل جديد",  href: "/dashboard/customers", icon: Users,         bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "reports",      label: "التقارير",   href: "/dashboard/reports",   icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [weeklyChartWidget(), bookingStatusWidget(), recentBookingsWidget(), topServicesWidget()],
  },

  flower_shop: {
    businessType: "flower_shop",
    label: "محل الورد",
    primaryAction: { label: "طلب جديد", href: "/dashboard/bookings" },
    kpis: [
      {
        id: "total-stems",
        label: "إجمالي السيقان",
        unit: "ساق",
        icon: Flower2,
        bg: "bg-pink-50",
        iconColor: "text-pink-600",
        fetcher: () => flowerMasterApi.stockReport(),
        transform: (d) => (d?.data ?? []).reduce((s: number, r: any) => s + parseInt(r.total_remaining || 0), 0).toLocaleString("ar-SA"),
        allowedRoles: [],
      },
      {
        id: "expiring-batches",
        label: "قاربت الانتهاء",
        unit: "دفعة",
        icon: Clock,
        bg: "bg-amber-50",
        iconColor: "text-amber-600",
        fetcher: () => flowerMasterApi.batchesExpiring(3),
        transform: (d) => String(d?.data?.length || 0),
        allowedRoles: [],
      },
      {
        id: "builder-orders",
        label: "طلبات الباقات",
        unit: "طلب",
        icon: ShoppingBag,
        bg: "bg-rose-50",
        iconColor: "text-rose-600",
        fetcher: () => flowerBuilderApi.orderStats(),
        transform: (d) => String(d?.data?.pending ?? d?.data?.total ?? 0),
        allowedRoles: [],
      },
      revenueKpi("flower-revenue"),
    ],
    quickActions: [
      { id: "new-booking",    label: "حجز جديد",    href: "/dashboard/bookings",             icon: CalendarCheck, bg: "bg-blue-50",  text: "text-blue-600",  allowedRoles: [] },
      { id: "receive-batch",  label: "إضافة دفعة",  href: "/dashboard/flower-master",        icon: Package,       bg: "bg-pink-50",  text: "text-pink-600",  allowedRoles: ["owner", "admin", "manager"] },
      { id: "builder-orders", label: "طلبات الباقات", href: "/dashboard/flower-builder/orders", icon: ShoppingBag,   bg: "bg-rose-50",  text: "text-rose-600",  allowedRoles: [] },
      { id: "flower-master",  label: "بيانات الورد", href: "/dashboard/flower-master",        icon: Flower2,       bg: "bg-emerald-50", text: "text-emerald-600", allowedRoles: [] },
      { id: "reports",        label: "التقارير",    href: "/dashboard/reports",              icon: BarChart2,     bg: "bg-amber-50", text: "text-amber-600", allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      // Row 1: Expiring batches (priority alert) + Flower Builder orders
      { id: "expiring-batches-widget", label: "دفعات قاربت الانتهاء", size: "two-thirds", allowedRoles: [], component: ExpiringBatchesWidget },
      { id: "flower-orders-widget",    label: "طلبات الباقات",        size: "third",      allowedRoles: [], component: FlowerOrdersWidget },
      // Row 2: Full-width stock overview with visual bars
      { id: "flower-stock", label: "مخزون الورد", size: "full", allowedRoles: [], component: FlowerStockWidget },
      // Row 3: Recent bookings + top services
      recentBookingsWidget(),
      topServicesWidget(),
    ],
  },

  salon: {
    businessType: "salon",
    label: "الصالون",
    primaryAction: { label: "حجز جديد", href: "/dashboard/bookings" },
    kpis: [
      revenueKpi(),
      bookingsKpi(),
      {
        id: "present-staff",
        label: "الموظفون الحاضرون",
        unit: "موظف",
        icon: UserCheck,
        bg: "bg-teal-50",
        iconColor: "text-teal-600",
        fetcher: () => attendanceEngineApi.summary(),
        transform: (d) => String(d?.data?.present || 0),
        allowedRoles: [],
      },
      customersKpi(),
    ],
    quickActions: [
      { id: "new-booking",  label: "حجز جديد",   href: "/dashboard/bookings",  icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "new-customer", label: "عميل جديد",  href: "/dashboard/customers", icon: Users,         bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "staff",        label: "الموظفون",   href: "/dashboard/team",      icon: UserCheck,     bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: ["owner", "admin", "manager"] },
      { id: "reports",      label: "التقارير",   href: "/dashboard/reports",   icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [weeklyChartWidget(), bookingStatusWidget(), recentBookingsWidget(), staffWidget()],
  },

  hotel: {
    businessType: "hotel",
    label: "الفندق",
    primaryAction: { label: "حجز غرفة", href: "/dashboard/hotel/reservations" },
    kpis: [
      {
        id: "available-rooms",
        label: "الغرف المتاحة",
        unit: "غرفة",
        icon: BedDouble,
        bg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        fetcher: () => hotelApi.dashboardStats(),
        transform: (d) => String(d?.data?.availableRooms ?? 0),
        allowedRoles: [],
      },
      {
        id: "occupied-rooms",
        label: "الغرف المشغولة",
        unit: "غرفة",
        icon: Home,
        bg: "bg-blue-50",
        iconColor: "text-blue-600",
        fetcher: () => hotelApi.dashboardStats(),
        transform: (d) => String(d?.data?.occupiedRooms ?? 0),
        allowedRoles: [],
      },
      {
        id: "checkins-today",
        label: "تسجيل الدخول اليوم",
        unit: "حجز",
        icon: DoorOpen,
        bg: "bg-violet-50",
        iconColor: "text-violet-600",
        fetcher: () => hotelApi.dashboardStats(),
        transform: (d) => String(d?.data?.checkinsToday ?? 0),
        allowedRoles: [],
      },
      {
        id: "cleaning-requests",
        label: "طلبات التنظيف",
        unit: "طلب",
        icon: Zap,
        bg: "bg-amber-50",
        iconColor: "text-amber-600",
        fetcher: () => hotelApi.dashboardStats(),
        transform: (d) => String(d?.data?.pendingCleaning ?? d?.data?.cleaningRequests ?? 0),
        allowedRoles: [],
      },
    ],
    quickActions: [
      { id: "new-reservation", label: "حجز غرفة",  href: "/dashboard/hotel/reservations", icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "rooms",           label: "الغرف",      href: "/dashboard/hotel/rooms",        icon: BedDouble,     bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "housekeeping",    label: "التنظيف",    href: "/dashboard/hotel/housekeeping", icon: Zap,           bg: "bg-amber-50",  text: "text-amber-600",  allowedRoles: [] },
      { id: "reports",         label: "التقارير",  href: "/dashboard/reports",            icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "room-status", label: "حالة الغرف", size: "full", allowedRoles: [], component: RoomStatusWidget },
      recentBookingsWidget(),
      bookingStatusWidget(),
    ],
  },

  car_rental: {
    businessType: "car_rental",
    label: "تأجير السيارات",
    primaryAction: { label: "حجز سيارة", href: "/dashboard/car-rental/reservations" },
    kpis: [
      {
        id: "available-vehicles",
        label: "السيارات المتاحة",
        unit: "سيارة",
        icon: Car,
        bg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        fetcher: () => carRentalApi.dashboardStats(),
        transform: (d) => String(d?.data?.availableVehicles ?? 0),
        allowedRoles: [],
      },
      {
        id: "rented-vehicles",
        label: "السيارات المؤجرة",
        unit: "سيارة",
        icon: Car,
        bg: "bg-blue-50",
        iconColor: "text-blue-600",
        fetcher: () => carRentalApi.dashboardStats(),
        transform: (d) => String(d?.data?.rentedVehicles ?? 0),
        allowedRoles: [],
      },
      {
        id: "pickups-today",
        label: "تسليم اليوم",
        unit: "عملية",
        icon: CalendarCheck,
        bg: "bg-violet-50",
        iconColor: "text-violet-600",
        fetcher: () => carRentalApi.dashboardStats(),
        transform: (d) => String(d?.data?.pickupsToday ?? 0),
        allowedRoles: [],
      },
      {
        id: "returns-today",
        label: "استلام اليوم",
        unit: "عملية",
        icon: AlertTriangle,
        bg: "bg-amber-50",
        iconColor: "text-amber-600",
        fetcher: () => carRentalApi.dashboardStats(),
        transform: (d) => String(d?.data?.returnsToday ?? 0),
        allowedRoles: [],
      },
    ],
    quickActions: [
      { id: "new-reservation", label: "حجز سيارة",   href: "/dashboard/car-rental/reservations", icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "fleet",           label: "الأسطول",      href: "/dashboard/car-rental/vehicles",    icon: Car,           bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "inspections",     label: "الفحوصات",     href: "/dashboard/car-rental/inspections", icon: AlertTriangle, bg: "bg-amber-50",  text: "text-amber-600",  allowedRoles: [] },
      { id: "reports",         label: "التقارير",    href: "/dashboard/reports",                icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "fleet-status", label: "حالة الأسطول", size: "full", allowedRoles: [], component: FleetStatusWidget },
      recentBookingsWidget(),
      bookingStatusWidget(),
    ],
  },

  retail: {
    businessType: "retail",
    label: "متجر التجزئة",
    primaryAction: { label: "طلب جديد", href: "/dashboard/bookings" },
    kpis: [
      revenueKpi(),
      bookingsKpi(),
      {
        id: "low-stock",
        label: "مخزون منخفض",
        unit: "صنف",
        icon: AlertTriangle,
        bg: "bg-amber-50",
        iconColor: "text-amber-600",
        fetcher: () => inventoryApi.report(),
        transform: (d) => String((d?.data?.lowStock ?? d?.data?.lowStockItems ?? []).length || d?.data?.lowStockCount || 0),
        allowedRoles: [],
      },
      customersKpi(),
    ],
    quickActions: [
      { id: "new-order",    label: "طلب جديد",    href: "/dashboard/bookings",  icon: ShoppingBag,   bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "products",     label: "المنتجات",    href: "/dashboard/services",  icon: Package,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-customer", label: "عميل جديد",  href: "/dashboard/customers", icon: Users,         bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "reports",      label: "التقارير",   href: "/dashboard/reports",   icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [weeklyChartWidget(), inventoryAlertWidget(), recentBookingsWidget(), topServicesWidget()],
  },

  rental: {
    businessType: "rental",
    label: "التأجير",
    primaryAction: { label: "عقد جديد", href: "/dashboard/bookings" },
    kpis: [
      {
        id: "rental-revenue",
        label: "الإيرادات",
        unit: "ر.س",
        icon: Banknote,
        bg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        fetcher: () => financeApi.pnl(),
        transform: (d) => Number(d?.data?.revenue || 0).toLocaleString("ar-SA"),
        allowedRoles: ["owner", "admin", "manager"],
      },
      bookingsKpi(),
      {
        id: "available-assets",
        label: "الأصول المتاحة",
        unit: "أصل",
        icon: Package,
        bg: "bg-teal-50",
        iconColor: "text-teal-600",
        fetcher: () => inventoryApi.report(),
        transform: (d) => String(d?.data?.availableCount ?? d?.data?.available ?? 0),
        allowedRoles: [],
      },
      customersKpi(),
    ],
    quickActions: [
      { id: "new-contract", label: "عقد جديد",  href: "/dashboard/bookings",  icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "assets",       label: "الأصول",    href: "/dashboard/inventory", icon: Package,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "customers",    label: "العملاء",   href: "/dashboard/customers", icon: Users,         bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "reports",      label: "التقارير",  href: "/dashboard/reports",   icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [weeklyChartWidget(), bookingStatusWidget(), recentBookingsWidget(), inventoryAlertWidget()],
  },

  restaurant: {
    businessType: "restaurant",
    label: "المطعم",
    primaryAction: { label: "طلب جديد", href: "/dashboard/online-orders" },
    kpis: [
      revenueKpi(),
      bookingsKpi(),
      {
        id: "online-orders",
        label: "الطلبات الإلكترونية",
        unit: "طلب",
        icon: ShoppingBag,
        bg: "bg-orange-50",
        iconColor: "text-orange-600",
        fetcher: () => onlineOrdersApi.stats(),
        transform: (d) => String(d?.data?.total ?? d?.data?.todayTotal ?? 0),
        allowedRoles: [],
      },
      {
        id: "present-staff",
        label: "الموظفون الحاضرون",
        unit: "موظف",
        icon: UserCheck,
        bg: "bg-teal-50",
        iconColor: "text-teal-600",
        fetcher: () => attendanceEngineApi.summary(),
        transform: (d) => String(d?.data?.present || 0),
        allowedRoles: [],
      },
    ],
    quickActions: [
      { id: "new-order",  label: "طلب جديد",  href: "/dashboard/online-orders", icon: ShoppingBag,   bg: "bg-orange-50", text: "text-orange-600", allowedRoles: [] },
      { id: "menu",       label: "القائمة",   href: "/dashboard/menu",          icon: Package,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "staff",      label: "الموظفون",  href: "/dashboard/team",          icon: UserCheck,     bg: "bg-violet-50", text: "text-violet-600", allowedRoles: ["owner", "admin", "manager"] },
      { id: "reports",    label: "التقارير",  href: "/dashboard/reports",       icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "online-orders-widget", label: "الطلبات الإلكترونية", size: "third", allowedRoles: [], component: OnlineOrdersWidget },
      weeklyChartWidget(),
      staffWidget(),
      recentBookingsWidget("full"),
    ],
  },

  photography: {
    businessType: "photography",
    label: "التصوير",
    primaryAction: { label: "حجز جديد", href: "/dashboard/bookings" },
    kpis: [
      revenueKpi(),
      bookingsKpi(),
      customersKpi(),
      {
        id: "pending-requests",
        label: "طلبات معلقة",
        unit: "طلب",
        icon: Camera,
        bg: "bg-indigo-50",
        iconColor: "text-indigo-600",
        fetcher: () => bookingsApi.stats("month"),
        transform: (d) => String(d?.data?.pending ?? 0),
        allowedRoles: [],
      },
    ],
    quickActions: [
      { id: "new-booking",  label: "حجز جديد",   href: "/dashboard/bookings",  icon: CalendarCheck, bg: "bg-blue-50",    text: "text-blue-600",    allowedRoles: [] },
      { id: "new-service",  label: "خدمة جديدة", href: "/dashboard/services",  icon: Camera,        bg: "bg-indigo-50",  text: "text-indigo-600",  allowedRoles: [] },
      { id: "new-customer", label: "عميل جديد",  href: "/dashboard/customers", icon: Users,         bg: "bg-violet-50",  text: "text-violet-600",  allowedRoles: [] },
      { id: "reports",      label: "التقارير",   href: "/dashboard/reports",   icon: BarChart2,     bg: "bg-rose-50",    text: "text-rose-600",    allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [weeklyChartWidget(), bookingStatusWidget(), recentBookingsWidget(), topServicesWidget()],
  },
};

// ============================================================
// Lookup
// ============================================================
export function getProfile(businessType?: string): DashboardProfile {
  if (businessType && businessType in profiles) {
    return profiles[businessType as BusinessType];
  }
  return profiles.default;
}
