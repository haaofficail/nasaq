import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Banknote, CalendarCheck, Users, Package,
  Flower2, Clock, BedDouble, DoorOpen,
  Car, ShoppingBag, BarChart2, Camera,
  UserCheck, AlertTriangle, Zap, Home,
  ChefHat, Monitor, Briefcase, Sparkles, Percent,
  FileText, Wrench, ShieldCheck, Image, Building2, ClipboardList,
  Truck,
} from "lucide-react";
import {
  bookingsApi, customersApi, servicesApi, flowerMasterApi,
  hotelApi, carRentalApi, inventoryApi, financeApi,
  attendanceEngineApi, onlineOrdersApi, flowerBuilderApi,
  propertyApi, eventsApi, workOrdersApi, accessControlApi,
  flowerIntelligenceApi,
} from "./api";
import { BookingStatusWidget } from "@/components/dashboard/widgets/BookingStatusWidget";
import { RecentBookingsWidget } from "@/components/dashboard/widgets/RecentBookingsWidget";
import { TopServicesWidget } from "@/components/dashboard/widgets/TopServicesWidget";
import { WorkOrdersWidget } from "@/components/dashboard/widgets/WorkOrdersWidget";
import { AccessControlWidget } from "@/components/dashboard/widgets/AccessControlWidget";
import { FlowerStockWidget } from "@/components/dashboard/widgets/FlowerStockWidget";
import { ExpiringBatchesWidget } from "@/components/dashboard/widgets/ExpiringBatchesWidget";
import { FlowerOrdersWidget } from "@/components/dashboard/widgets/FlowerOrdersWidget";
import { FlowerMorningBriefWidget } from "@/components/dashboard/widgets/FlowerMorningBriefWidget";
import { RoomStatusWidget } from "@/components/dashboard/widgets/RoomStatusWidget";
import { FleetStatusWidget } from "@/components/dashboard/widgets/FleetStatusWidget";
import { StaffAvailabilityWidget } from "@/components/dashboard/widgets/StaffAvailabilityWidget";
import { InventoryAlertWidget } from "@/components/dashboard/widgets/InventoryAlertWidget";
import { OnlineOrdersWidget } from "@/components/dashboard/widgets/OnlineOrdersWidget";
import { TodayScheduleSummaryWidget } from "@/components/dashboard/widgets/TodayScheduleSummaryWidget";
import { RecentActivityWidget } from "@/components/dashboard/widgets/RecentActivityWidget";
import { PropertyMaintenanceWidget } from "@/components/dashboard/widgets/PropertyMaintenanceWidget";
import { EventQuotationsWidget } from "@/components/dashboard/widgets/EventQuotationsWidget";
import { SalesChartWidget } from "@/components/dashboard/widgets/SalesChartWidget";
import { WeeklyBookingsChartWidget } from "@/components/dashboard/widgets/WeeklyBookingsChartWidget";

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

export type QuickActionModal = "booking" | "customer" | "service" | "invoice";

export interface QuickActionConfig {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  bg: string;
  text: string;
  allowedRoles: Role[];
  modal?: QuickActionModal;  // if set, opens a modal instead of navigating
}

export interface WidgetConfig {
  id: string;
  label: string;
  size: "full" | "two-thirds" | "half" | "third";
  allowedRoles: Role[];
  component: ComponentType;
}

export interface DashboardProfile {
  profileKey: string;
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
  transform: (d) => Number(d?.data?.revenue || 0).toLocaleString("en-US"),
  allowedRoles: ["owner", "admin", "manager"],
});

const bookingsKpi = (id = "bookings", label = "الحجوزات", unit = "حجز"): KPIConfig => ({
  id,
  label,
  unit,
  icon: CalendarCheck,
  bg: "bg-blue-50",
  iconColor: "text-blue-600",
  fetcher: () => bookingsApi.stats("month"),
  transform: (d) => Number(d?.data?.total || 0).toLocaleString("en-US"),
  allowedRoles: [],
});

const customersKpi = (id = "customers", label = "العملاء", unit = "عميل"): KPIConfig => ({
  id,
  label,
  unit,
  icon: Users,
  bg: "bg-violet-50",
  iconColor: "text-violet-600",
  fetcher: () => customersApi.stats(),
  transform: (d) => Number(d?.data?.total || 0).toLocaleString("en-US"),
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

const staffKpi = (id = "present-staff"): KPIConfig => ({
  id,
  label: "الموظفون الحاضرون",
  unit: "موظف",
  icon: UserCheck,
  bg: "bg-teal-50",
  iconColor: "text-teal-600",
  fetcher: () => attendanceEngineApi.summary(),
  transform: (d) => String(d?.data?.present || 0),
  allowedRoles: [],
});

const pendingKpi = (id = "pending", label = "طلبات معلقة", unit = "طلب"): KPIConfig => ({
  id,
  label,
  unit,
  icon: AlertTriangle,
  bg: "bg-amber-50",
  iconColor: "text-amber-600",
  fetcher: () => bookingsApi.stats("month"),
  transform: (d) => String(d?.data?.pending ?? 0),
  allowedRoles: [],
});

const lowStockKpi = (id = "low-stock"): KPIConfig => ({
  id,
  label: "مخزون منخفض",
  unit: "صنف",
  icon: AlertTriangle,
  bg: "bg-amber-50",
  iconColor: "text-amber-600",
  fetcher: () => inventoryApi.report(),
  transform: (d) => String((d?.data?.lowStock ?? d?.data?.lowStockItems ?? []).length || d?.data?.lowStockCount || 0),
  allowedRoles: [],
});

const todayAppointmentsKpi = (id = "today-appointments", label = "مواعيد اليوم", unit = "موعد"): KPIConfig => ({
  id,
  label,
  unit,
  icon: CalendarCheck,
  bg: "bg-blue-50",
  iconColor: "text-blue-600",
  fetcher: () => bookingsApi.list({ date: new Date().toISOString().split("T")[0], limit: "1" }),
  transform: (d) => String(d?.pagination?.total ?? d?.data?.length ?? 0),
  allowedRoles: [],
});

const onlineOrdersCountKpi = (id = "online-orders"): KPIConfig => ({
  id,
  label: "الطلبات الإلكترونية",
  unit: "طلب",
  icon: ShoppingBag,
  bg: "bg-orange-50",
  iconColor: "text-orange-600",
  fetcher: () => onlineOrdersApi.stats(),
  transform: (d) => String(d?.data?.total ?? d?.data?.todayTotal ?? 0),
  allowedRoles: [],
});

// ============================================================
// Shared widget factories
// ============================================================
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

const todayScheduleWidget = (size: WidgetConfig["size"] = "third"): WidgetConfig => ({
  id: "today-schedule",
  label: "مواعيد اليوم",
  size,
  allowedRoles: [],
  component: TodayScheduleSummaryWidget,
});

const recentActivityWidget = (size: WidgetConfig["size"] = "half"): WidgetConfig => ({
  id: "recent-activity",
  label: "الأنشطة الأخيرة",
  size,
  allowedRoles: [],
  component: RecentActivityWidget,
});

const propertyMaintenanceWidget = (size: WidgetConfig["size"] = "half"): WidgetConfig => ({
  id: "property-maintenance",
  label: "طلبات الصيانة",
  size,
  allowedRoles: [],
  component: PropertyMaintenanceWidget,
});

const eventQuotationsWidget = (size: WidgetConfig["size"] = "half"): WidgetConfig => ({
  id: "event-quotations",
  label: "عروض الأسعار",
  size,
  allowedRoles: [],
  component: EventQuotationsWidget,
});

const salesChartWidget = (size: WidgetConfig["size"] = "two-thirds"): WidgetConfig => ({
  id: "sales-chart",
  label: "مخطط المبيعات",
  size,
  allowedRoles: ["owner", "admin", "manager"],
  component: SalesChartWidget,
});

const weeklyBookingsWidget = (size: WidgetConfig["size"] = "third"): WidgetConfig => ({
  id: "weekly-bookings",
  label: "الحجوزات الأسبوعية",
  size,
  allowedRoles: [],
  component: WeeklyBookingsChartWidget,
});

// ============================================================
// Profile definitions — keyed by dashboardProfile string
// returned by the backend's deriveDashboardProfile()
// ============================================================
const profiles: Record<string, DashboardProfile> = {

  // ──────────────────────────────────────────────────────────
  // SAFE FALLBACK — used when dashboardProfile is unknown
  // ──────────────────────────────────────────────────────────
  default: {
    profileKey: "default",
    label: "لوحة التحكم",
    primaryAction: { label: "حجز جديد", href: "/dashboard/bookings" },
    kpis: [revenueKpi(), todayAppointmentsKpi(), customersKpi(), bookingsKpi()],
    quickActions: [
      { id: "new-booking",  modal: "booking"  as const, label: "حجز جديد",   href: "/dashboard/bookings",  icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد",  href: "/dashboard/customers", icon: Users,         bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "new-service",  modal: "service"  as const, label: "خدمة جديدة", href: "/dashboard/services",  icon: Package,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-invoice",  modal: "invoice"  as const, label: "فاتورة جديدة", href: "/dashboard/invoices", icon: Monitor,     bg: "bg-indigo-50", text: "text-indigo-600", allowedRoles: ["owner", "admin", "manager"] },
      { id: "reports",      label: "التقارير",   href: "/dashboard/reports",   icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [salesChartWidget("two-thirds"), weeklyBookingsWidget("third"), bookingStatusWidget(), recentBookingsWidget(), topServicesWidget(), recentActivityWidget()],
  },

  // ──────────────────────────────────────────────────────────
  // FLOWER SHOP profiles
  // ──────────────────────────────────────────────────────────
  flower_shop: {
    profileKey: "flower_shop",
    label: "محل الورود",
    primaryAction: { label: "طلب جديد", href: "/dashboard/flower-pos" },
    kpis: [
      {
        id: "total-stems",
        label: "إجمالي السيقان",
        unit: "ساق",
        icon: Flower2,
        bg: "bg-pink-50",
        iconColor: "text-pink-600",
        fetcher: () => flowerMasterApi.stockReport(),
        transform: (d) => (d?.data ?? []).reduce((s: number, r: any) => s + parseInt(r.total_remaining || 0), 0).toLocaleString("en-US"),
        allowedRoles: [],
      },
      {
        id: "loss-at-risk",
        label: "خسارة محتملة",
        unit: "ر.س",
        icon: AlertTriangle,
        bg: "bg-red-50",
        iconColor: "text-red-500",
        fetcher: () => flowerIntelligenceApi.lossAlerts(),
        transform: (d) => d?.summary?.totalCostAtRisk > 0 ? String(d.summary.totalCostAtRisk) : "0",
        allowedRoles: ["owner", "admin", "manager"],
      },
      {
        id: "builder-orders",
        label: "طلبات اليوم",
        unit: "طلب",
        icon: ShoppingBag,
        bg: "bg-rose-50",
        iconColor: "text-rose-600",
        fetcher: () => flowerBuilderApi.orderStats(),
        transform: (d) => String(d?.data?.today ?? d?.data?.todayTotal ?? d?.data?.total ?? 0),
        allowedRoles: [],
      },
      revenueKpi("flower-revenue"),
    ],
    quickActions: [
      { id: "flower-pos",      label: "الكاشير",        href: "/dashboard/flower-pos",       icon: ShoppingBag,   bg: "bg-pink-50",    text: "text-pink-600",    allowedRoles: [] },
      { id: "new-arrangement", label: "إنشاء باقة",    href: "/dashboard/arrangements",     icon: Flower2,       bg: "bg-rose-50",    text: "text-rose-600",    allowedRoles: [] },
      { id: "new-customer",    modal: "customer" as const, label: "عميل جديد",  href: "/dashboard/customers",    icon: Users,         bg: "bg-violet-50",  text: "text-violet-600",  allowedRoles: [] },
      { id: "receive-batch",   label: "استلام ورد",     href: "/dashboard/flower-master",    icon: Package,       bg: "bg-emerald-50", text: "text-emerald-600", allowedRoles: ["owner", "admin", "manager"] },
      { id: "flower-delivery", label: "قائمة التوصيل", href: "/dashboard/flower-delivery",  icon: Zap,           bg: "bg-blue-50",    text: "text-blue-600",    allowedRoles: [] },
      { id: "flower-margins",  label: "هوامش الربح",   href: "/dashboard/flower-margins",   icon: BarChart2,     bg: "bg-rose-50",    text: "text-rose-600",    allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "flower-morning-brief",    label: "ورقة الصباح",          size: "full",       allowedRoles: [], component: FlowerMorningBriefWidget },
      { id: "expiring-batches-widget", label: "دفعات قاربت الانتهاء", size: "two-thirds", allowedRoles: [], component: ExpiringBatchesWidget },
      { id: "flower-orders-widget",    label: "طلبات الباقات",        size: "third",      allowedRoles: [], component: FlowerOrdersWidget },
      { id: "flower-stock",            label: "مخزون الورد",          size: "full",       allowedRoles: [], component: FlowerStockWidget },
    ],
  },

  // Florist + kosha specialization
  flower_kosha: {
    profileKey: "flower_kosha",
    label: "محل الورود والكوشة",
    primaryAction: { label: "حجز كوشة", href: "/dashboard/bookings" },
    kpis: [
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
      bookingsKpi("kosha-bookings", "حجوزات الكوشة", "حجز"),
      revenueKpi("kosha-revenue"),
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
    ],
    quickActions: [
      { id: "new-booking", modal: "booking" as const,    label: "حجز كوشة",      href: "/dashboard/bookings",              icon: CalendarCheck, bg: "bg-blue-50",  text: "text-blue-600",  allowedRoles: [] },
      { id: "flower-pos",     label: "الكاشير",       href: "/dashboard/flower-pos",            icon: ShoppingBag,   bg: "bg-pink-50",  text: "text-pink-600",  allowedRoles: [] },
      { id: "builder-orders", label: "طلبات الباقات", href: "/dashboard/arrangements", icon: ShoppingBag,   bg: "bg-rose-50",  text: "text-rose-600",  allowedRoles: [] },
      { id: "new-customer",   modal: "customer" as const, label: "عميل جديد",  href: "/dashboard/customers",             icon: Users,         bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "arrangements",   label: "التنسيقات",     href: "/dashboard/arrangements",          icon: Flower2,       bg: "bg-pink-50",  text: "text-pink-600",  allowedRoles: [] },
      { id: "reports",        label: "التقارير",      href: "/dashboard/reports",               icon: BarChart2,     bg: "bg-amber-50", text: "text-amber-600", allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "flower-orders-widget",    label: "طلبات الباقات",        size: "two-thirds", allowedRoles: [], component: FlowerOrdersWidget },
      { id: "expiring-batches-widget", label: "دفعات قاربت الانتهاء", size: "third",      allowedRoles: [], component: ExpiringBatchesWidget },
      recentBookingsWidget("full"),
      recentActivityWidget(),
    ],
  },

  // Florist + wholesale/supply specialization
  flower_wholesale: {
    profileKey: "flower_wholesale",
    label: "توريد الورود",
    primaryAction: { label: "استلام دفعة", href: "/dashboard/flower-master" },
    kpis: [
      {
        id: "total-stems",
        label: "إجمالي السيقان",
        unit: "ساق",
        icon: Flower2,
        bg: "bg-pink-50",
        iconColor: "text-pink-600",
        fetcher: () => flowerMasterApi.stockReport(),
        transform: (d) => (d?.data ?? []).reduce((s: number, r: any) => s + parseInt(r.total_remaining || 0), 0).toLocaleString("en-US"),
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
      revenueKpi("wholesale-revenue"),
      lowStockKpi(),
    ],
    quickActions: [
      { id: "receive-batch", label: "استلام دفعة",    href: "/dashboard/flower-master",  icon: Package,   bg: "bg-pink-50",    text: "text-pink-600",    allowedRoles: ["owner", "admin", "manager"] },
      { id: "new-customer",  modal: "customer" as const, label: "عميل جديد",  href: "/dashboard/customers",  icon: Users,     bg: "bg-violet-50",  text: "text-violet-600",  allowedRoles: [] },
      { id: "suppliers",     label: "الموردون",       href: "/dashboard/suppliers",      icon: Flower2,   bg: "bg-emerald-50", text: "text-emerald-600", allowedRoles: ["owner", "admin", "manager"] },
      { id: "inventory",     label: "المخزون",        href: "/dashboard/inventory",      icon: Package,   bg: "bg-teal-50",    text: "text-teal-600",    allowedRoles: [] },
      { id: "reports",       label: "التقارير",       href: "/dashboard/reports",        icon: BarChart2, bg: "bg-rose-50",    text: "text-rose-600",    allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "flower-stock",            label: "مخزون الورد",          size: "full",       allowedRoles: [], component: FlowerStockWidget },
      { id: "expiring-batches-widget", label: "دفعات قاربت الانتهاء", size: "two-thirds", allowedRoles: [], component: ExpiringBatchesWidget },
      inventoryAlertWidget(),
      recentActivityWidget(),
    ],
  },

  // Full florist (kosha + wholesale)
  flower_full: {
    profileKey: "flower_full",
    label: "محل الورود - متكامل",
    primaryAction: { label: "حجز جديد", href: "/dashboard/bookings" },
    kpis: [
      {
        id: "total-stems",
        label: "إجمالي السيقان",
        unit: "ساق",
        icon: Flower2,
        bg: "bg-pink-50",
        iconColor: "text-pink-600",
        fetcher: () => flowerMasterApi.stockReport(),
        transform: (d) => (d?.data ?? []).reduce((s: number, r: any) => s + parseInt(r.total_remaining || 0), 0).toLocaleString("en-US"),
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
      { id: "new-booking", modal: "booking" as const,    label: "حجز جديد",      href: "/dashboard/bookings",              icon: CalendarCheck, bg: "bg-blue-50",    text: "text-blue-600",    allowedRoles: [] },
      { id: "flower-pos",     label: "الكاشير",       href: "/dashboard/flower-pos",            icon: ShoppingBag,   bg: "bg-pink-50",    text: "text-pink-600",    allowedRoles: [] },
      { id: "builder-orders", label: "طلبات الباقات", href: "/dashboard/arrangements", icon: ShoppingBag,   bg: "bg-rose-50",    text: "text-rose-600",    allowedRoles: [] },
      { id: "new-customer",   modal: "customer" as const, label: "عميل جديد",  href: "/dashboard/customers",             icon: Users,         bg: "bg-violet-50",  text: "text-violet-600",  allowedRoles: [] },
      { id: "receive-batch",  label: "استلام دفعة",   href: "/dashboard/flower-master",         icon: Package,       bg: "bg-pink-50",    text: "text-pink-600",    allowedRoles: ["owner", "admin", "manager"] },
      { id: "flower-master",  label: "بيانات الورد",  href: "/dashboard/flower-master",         icon: Flower2,       bg: "bg-emerald-50", text: "text-emerald-600", allowedRoles: [] },
      { id: "reports",        label: "التقارير",      href: "/dashboard/reports",               icon: BarChart2,     bg: "bg-amber-50",   text: "text-amber-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "expiring-batches-widget", label: "دفعات قاربت الانتهاء", size: "two-thirds", allowedRoles: [], component: ExpiringBatchesWidget },
      { id: "flower-orders-widget",    label: "طلبات الباقات",        size: "third",      allowedRoles: [], component: FlowerOrdersWidget },
      { id: "flower-stock",            label: "مخزون الورد",          size: "full",       allowedRoles: [], component: FlowerStockWidget },
      recentBookingsWidget(),
      topServicesWidget(),
      recentActivityWidget(),
    ],
  },

  // ──────────────────────────────────────────────────────────
  // BEAUTY & WELLNESS
  // ──────────────────────────────────────────────────────────
  salon: {
    profileKey: "salon",
    label: "الصالون",
    primaryAction: { label: "حجز جديد", href: "/dashboard/bookings" },
    // KPIs تعكس التشغيل اليومي: الإيرادات الشهرية + مواعيد اليوم + الحاضرون الآن + المعلقة
    kpis: [revenueKpi(), todayAppointmentsKpi(), staffKpi(), pendingKpi()],
    quickActions: [
      { id: "new-booking", modal: "booking" as const,  label: "حجز جديد",  href: "/dashboard/bookings",    icon: CalendarCheck, bg: "bg-blue-50",    text: "text-blue-600",    allowedRoles: [] },
      { id: "new-service",  modal: "service" as const, label: "خدمة جديدة", href: "/dashboard/services",   icon: Package,       bg: "bg-teal-50",    text: "text-teal-600",    allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد",  href: "/dashboard/customers",   icon: Users,         bg: "bg-violet-50",  text: "text-violet-600",  allowedRoles: [] },
      { id: "new-invoice",  modal: "invoice" as const, label: "فاتورة جديدة", href: "/dashboard/invoices", icon: Monitor,       bg: "bg-indigo-50",  text: "text-indigo-600",  allowedRoles: ["owner", "admin", "manager"] },
      { id: "schedule",     label: "الجدول",     href: "/dashboard/schedule",    icon: Clock,         bg: "bg-indigo-50",  text: "text-indigo-600",  allowedRoles: [] },
      { id: "commissions",  label: "العمولات",   href: "/dashboard/commissions", icon: Percent,       bg: "bg-teal-50",    text: "text-teal-600",    allowedRoles: ["owner", "admin", "manager"] },
      { id: "suppliers",    label: "الموردون",   href: "/dashboard/suppliers",   icon: Package,       bg: "bg-amber-50",   text: "text-amber-600",   allowedRoles: ["owner", "admin", "manager"] },
      { id: "reports",      label: "التقارير",   href: "/dashboard/reports",     icon: BarChart2,     bg: "bg-rose-50",    text: "text-rose-600",    allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [salesChartWidget("two-thirds"), weeklyBookingsWidget("third"), todayScheduleWidget(), recentBookingsWidget(), staffWidget(), recentActivityWidget()],
  },

  barber: {
    profileKey: "barber",
    label: "صالون الحلاقة",
    primaryAction: { label: "موعد جديد", href: "/dashboard/bookings" },
    kpis: [revenueKpi(), todayAppointmentsKpi("today-appts", "مواعيد اليوم", "موعد"), staffKpi(), pendingKpi()],
    quickActions: [
      { id: "new-booking", modal: "booking" as const,  label: "موعد جديد",  href: "/dashboard/bookings",    icon: CalendarCheck, bg: "bg-blue-50",    text: "text-blue-600",    allowedRoles: [] },
      { id: "new-service",  modal: "service" as const, label: "خدمة جديدة", href: "/dashboard/services",   icon: Package,       bg: "bg-teal-50",    text: "text-teal-600",    allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد",  href: "/dashboard/customers",   icon: Users,         bg: "bg-violet-50",  text: "text-violet-600",  allowedRoles: [] },
      { id: "new-invoice",  modal: "invoice" as const, label: "فاتورة جديدة", href: "/dashboard/invoices", icon: Monitor,       bg: "bg-indigo-50",  text: "text-indigo-600",  allowedRoles: ["owner", "admin", "manager"] },
      { id: "schedule",     label: "الجدول",     href: "/dashboard/schedule",    icon: Clock,         bg: "bg-indigo-50",  text: "text-indigo-600",  allowedRoles: [] },
      { id: "commissions",  label: "عمولات الحلاقين", href: "/dashboard/commissions", icon: Percent, bg: "bg-teal-50",    text: "text-teal-600",    allowedRoles: ["owner", "admin", "manager"] },
      { id: "reports",      label: "التقارير",   href: "/dashboard/reports",     icon: BarChart2,     bg: "bg-rose-50",    text: "text-rose-600",    allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [salesChartWidget("two-thirds"), weeklyBookingsWidget("third"), todayScheduleWidget(), recentBookingsWidget(), staffWidget(), recentActivityWidget()],
  },

  spa: {
    profileKey: "spa",
    label: "السبا",
    primaryAction: { label: "حجز جلسة", href: "/dashboard/bookings" },
    kpis: [revenueKpi(), todayAppointmentsKpi("today-sessions", "جلسات اليوم", "جلسة"), staffKpi(), pendingKpi()],
    quickActions: [
      { id: "new-booking", modal: "booking" as const,  label: "حجز جلسة",   href: "/dashboard/bookings",    icon: Sparkles,      bg: "bg-purple-50",  text: "text-purple-600",  allowedRoles: [] },
      { id: "new-service",  modal: "service" as const, label: "خدمة جديدة", href: "/dashboard/services",   icon: Package,       bg: "bg-teal-50",    text: "text-teal-600",    allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد",   href: "/dashboard/customers",   icon: Users,         bg: "bg-violet-50",  text: "text-violet-600",  allowedRoles: [] },
      { id: "new-invoice",  modal: "invoice" as const, label: "فاتورة جديدة", href: "/dashboard/invoices", icon: Monitor,       bg: "bg-indigo-50",  text: "text-indigo-600",  allowedRoles: ["owner", "admin", "manager"] },
      { id: "schedule",     label: "الجدول",      href: "/dashboard/schedule",    icon: Clock,         bg: "bg-indigo-50",  text: "text-indigo-600",  allowedRoles: [] },
      { id: "commissions",  label: "العمولات",    href: "/dashboard/commissions", icon: Percent,       bg: "bg-teal-50",    text: "text-teal-600",    allowedRoles: ["owner", "admin", "manager"] },
      { id: "reports",      label: "التقارير",    href: "/dashboard/reports",     icon: BarChart2,     bg: "bg-rose-50",    text: "text-rose-600",    allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [salesChartWidget("two-thirds"), weeklyBookingsWidget("third"), todayScheduleWidget(), recentBookingsWidget(), staffWidget(), recentActivityWidget()],
  },

  // salon_home profile (for home-service operating profile)
  salon_home: {
    profileKey: "salon_home",
    label: "خدمة منازل",
    primaryAction: { label: "حجز منزلي", href: "/dashboard/bookings" },
    kpis: [revenueKpi(), todayAppointmentsKpi("today-visits", "زيارات اليوم", "زيارة"), staffKpi(), pendingKpi()],
    quickActions: [
      { id: "new-booking", modal: "booking" as const,  label: "حجز منزلي",  href: "/dashboard/bookings",    icon: Home,          bg: "bg-blue-50",    text: "text-blue-600",    allowedRoles: [] },
      { id: "new-service",  modal: "service" as const, label: "خدمة جديدة", href: "/dashboard/services",   icon: Package,       bg: "bg-teal-50",    text: "text-teal-600",    allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد",   href: "/dashboard/customers",   icon: Users,         bg: "bg-violet-50",  text: "text-violet-600",  allowedRoles: [] },
      { id: "schedule",     label: "الجدول",      href: "/dashboard/schedule",    icon: Clock,         bg: "bg-teal-50",    text: "text-teal-600",    allowedRoles: [] },
      { id: "commissions",  label: "العمولات",    href: "/dashboard/commissions", icon: Percent,       bg: "bg-amber-50",   text: "text-amber-600",   allowedRoles: ["owner", "admin", "manager"] },
      { id: "reports",      label: "التقارير",    href: "/dashboard/reports",     icon: BarChart2,     bg: "bg-rose-50",    text: "text-rose-600",    allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [todayScheduleWidget(), recentBookingsWidget(), staffWidget(), recentActivityWidget()],
  },

  // ──────────────────────────────────────────────────────────
  // FOOD & BEVERAGE
  // ──────────────────────────────────────────────────────────
  restaurant: {
    profileKey: "restaurant",
    label: "المطعم",
    primaryAction: { label: "طلب جديد", href: "/dashboard/online-orders" },
    kpis: [revenueKpi(), bookingsKpi(), onlineOrdersCountKpi(), staffKpi()],
    quickActions: [
      { id: "new-order", label: "طلب جديد", href: "/dashboard/online-orders", icon: ShoppingBag,   bg: "bg-orange-50", text: "text-orange-600", allowedRoles: [] },
      { id: "menu",      label: "القائمة",  href: "/dashboard/menu",          icon: ChefHat,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد", href: "/dashboard/customers", icon: Users, bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "staff",     label: "الموظفون", href: "/dashboard/staff",          icon: UserCheck,     bg: "bg-violet-50", text: "text-violet-600", allowedRoles: ["owner", "admin", "manager"] },
      { id: "reports",   label: "التقارير", href: "/dashboard/reports",       icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      salesChartWidget("two-thirds"),
      weeklyBookingsWidget("third"),
      { id: "online-orders-widget", label: "الطلبات الإلكترونية", size: "third",      allowedRoles: [], component: OnlineOrdersWidget },
      staffWidget(),
      recentBookingsWidget("full"),
      recentActivityWidget(),
    ],
  },

  restaurant_delivery: {
    profileKey: "restaurant_delivery",
    label: "مطعم توصيل",
    primaryAction: { label: "طلب جديد", href: "/dashboard/online-orders" },
    kpis: [
      onlineOrdersCountKpi(),
      revenueKpi("delivery-revenue"),
      {
        id: "delivered-orders",
        label: "تم التوصيل اليوم",
        unit: "طلب",
        icon: Zap,
        bg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        fetcher: () => onlineOrdersApi.stats(),
        transform: (d) => String(d?.data?.delivered ?? 0),
        allowedRoles: [],
      },
      staffKpi(),
    ],
    quickActions: [
      { id: "new-order",  label: "طلب جديد",   href: "/dashboard/online-orders", icon: ShoppingBag,   bg: "bg-orange-50", text: "text-orange-600", allowedRoles: [] },
      { id: "menu",       label: "القائمة",    href: "/dashboard/menu",          icon: ChefHat,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد", href: "/dashboard/customers", icon: Users, bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "staff",      label: "الموظفون",   href: "/dashboard/staff",          icon: UserCheck,     bg: "bg-violet-50", text: "text-violet-600", allowedRoles: ["owner", "admin", "manager"] },
      { id: "reports",    label: "التقارير",   href: "/dashboard/reports",       icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "online-orders-widget", label: "الطلبات الإلكترونية", size: "full",       allowedRoles: [], component: OnlineOrdersWidget },
      staffWidget(),
      recentActivityWidget(),
    ],
  },

  cafe: {
    profileKey: "cafe",
    label: "المقهى",
    primaryAction: { label: "إضافة صنف", href: "/dashboard/menu" },
    kpis: [revenueKpi(), bookingsKpi("orders", "الطلبات اليوم", "طلب"), customersKpi(), bookingsKpi("menu_items", "أصناف المنيو", "صنف")],
    quickActions: [
      { id: "menu",         label: "المنيو",   href: "/dashboard/menu",      icon: ChefHat,   bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "orders",       label: "الطلبات",  href: "/dashboard/orders",    icon: Package,   bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "tables",       label: "الطاولات", href: "/dashboard/table-map", icon: BarChart2, bg: "bg-amber-50",  text: "text-amber-600",  allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد", href: "/dashboard/customers", icon: Users, bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
    ],
    widgets: [recentBookingsWidget(), recentActivityWidget()],
  },












  bakery: {
    profileKey: "bakery",
    label: "المخبز",
    primaryAction: { label: "طلب جديد", href: "/dashboard/pos" },
    kpis: [revenueKpi(), bookingsKpi("orders", "الطلبات", "طلب"), customersKpi(), servicesKpi("products")],
    quickActions: [
      { id: "pos",          label: "نقطة البيع", href: "/dashboard/pos",       icon: Monitor,   bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "menu",         label: "المنتجات",   href: "/dashboard/menu",      icon: ChefHat,   bg: "bg-amber-50",  text: "text-amber-600",  allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد", href: "/dashboard/customers", icon: Users, bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "reports",      label: "التقارير",   href: "/dashboard/reports",   icon: BarChart2, bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [salesChartWidget("two-thirds"), weeklyBookingsWidget("third"), bookingStatusWidget(), recentBookingsWidget(), topServicesWidget(), recentActivityWidget()],
  },

  catering: {
    profileKey: "catering",
    label: "خدمات الضيافة",
    primaryAction: { label: "حجز فعالية", href: "/dashboard/bookings" },
    kpis: [revenueKpi(), bookingsKpi("events", "الفعاليات", "فعالية"), customersKpi(), staffKpi()],
    quickActions: [
      { id: "new-booking", modal: "booking" as const,  label: "حجز فعالية", href: "/dashboard/bookings",  icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "menu",         label: "القائمة",    href: "/dashboard/menu",      icon: ChefHat,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد",  href: "/dashboard/customers", icon: Users,         bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "reports",      label: "التقارير",   href: "/dashboard/reports",   icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [salesChartWidget("two-thirds"), weeklyBookingsWidget("third"), bookingStatusWidget(), recentBookingsWidget(), staffWidget(), recentActivityWidget()],
  },

  // ──────────────────────────────────────────────────────────
  // HOSPITALITY & RENTAL
  // ──────────────────────────────────────────────────────────
  hotel: {
    profileKey: "hotel",
    label: "الفندق",
    primaryAction: { label: "حجز غرفة", href: "/dashboard/hotel" },
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
      { id: "new-reservation", label: "حجز غرفة",  href: "/dashboard/hotel", icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "rooms",           label: "الغرف",      href: "/dashboard/hotel",        icon: BedDouble,     bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-customer",    modal: "customer" as const, label: "عميل جديد", href: "/dashboard/customers", icon: Users, bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "housekeeping",    label: "التنظيف",    href: "/dashboard/hotel", icon: Zap,           bg: "bg-amber-50",  text: "text-amber-600",  allowedRoles: [] },
      { id: "reports",         label: "التقارير",   href: "/dashboard/reports",            icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "room-status", label: "حالة الغرف", size: "full", allowedRoles: [], component: RoomStatusWidget },
      salesChartWidget("two-thirds"),
      weeklyBookingsWidget("third"),
      recentBookingsWidget(),
      bookingStatusWidget(),
      recentActivityWidget(),
    ],
  },

  car_rental: {
    profileKey: "car_rental",
    label: "تأجير السيارات",
    primaryAction: { label: "حجز سيارة", href: "/dashboard/car-rental" },
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
      { id: "new-reservation", label: "حجز سيارة",  href: "/dashboard/car-rental", icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "fleet",           label: "الأسطول",     href: "/dashboard/car-rental",    icon: Car,           bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-customer",    modal: "customer" as const, label: "عميل جديد", href: "/dashboard/customers", icon: Users, bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "inspections",     label: "الفحوصات",    href: "/dashboard/car-rental", icon: AlertTriangle, bg: "bg-amber-50",  text: "text-amber-600",  allowedRoles: [] },
      { id: "reports",         label: "التقارير",    href: "/dashboard/reports",                icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "fleet-status", label: "حالة الأسطول", size: "full", allowedRoles: [], component: FleetStatusWidget },
      salesChartWidget("two-thirds"),
      weeklyBookingsWidget("third"),
      recentBookingsWidget(),
      bookingStatusWidget(),
      recentActivityWidget(),
    ],
  },

  rental: {
    profileKey: "rental",
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
        transform: (d) => Number(d?.data?.revenue || 0).toLocaleString("en-US"),
        allowedRoles: ["owner", "admin", "manager"],
      },
      bookingsKpi("contracts", "العقود النشطة", "عقد"),
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
      { id: "new-contract",  label: "عقد جديد",  href: "/dashboard/contracts", icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "assets",        label: "الأصول",    href: "/dashboard/assets",    icon: Package,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-customer",  modal: "customer" as const, label: "عميل جديد", href: "/dashboard/customers", icon: Users, bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "reports",       label: "التقارير",  href: "/dashboard/reports",   icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [salesChartWidget("two-thirds"), weeklyBookingsWidget("third"), bookingStatusWidget(), recentBookingsWidget(), inventoryAlertWidget(), recentActivityWidget()],
  },

  // ──────────────────────────────────────────────────────────
  // RETAIL
  // ──────────────────────────────────────────────────────────
  retail: {
    profileKey: "retail",
    label: "متجر التجزئة",
    primaryAction: { label: "طلب جديد", href: "/dashboard/bookings" },
    kpis: [revenueKpi(), bookingsKpi("orders", "الطلبات", "طلب"), lowStockKpi(), customersKpi()],
    quickActions: [
      { id: "new-order",    label: "طلب جديد",  href: "/dashboard/bookings",  icon: ShoppingBag,   bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "products",     label: "المنتجات",  href: "/dashboard/services",  icon: Package,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد", href: "/dashboard/customers", icon: Users,         bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "reports",      label: "التقارير",  href: "/dashboard/reports",   icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [inventoryAlertWidget(), recentBookingsWidget(), topServicesWidget(), recentActivityWidget()],
  },

  retail_pro: {
    profileKey: "retail_pro",
    label: "متجر متكامل",
    primaryAction: { label: "طلب جديد", href: "/dashboard/pos" },
    kpis: [revenueKpi(), bookingsKpi("orders", "الطلبات", "طلب"), lowStockKpi(), customersKpi()],
    quickActions: [
      { id: "pos",          label: "نقطة البيع", href: "/dashboard/pos",       icon: Monitor,   bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "products",     label: "المنتجات",   href: "/dashboard/services",  icon: Package,   bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "inventory",    label: "المخزون",    href: "/dashboard/inventory", icon: AlertTriangle, bg: "bg-amber-50", text: "text-amber-600", allowedRoles: ["owner", "admin", "manager"] },
      { id: "reports",      label: "التقارير",   href: "/dashboard/reports",   icon: BarChart2, bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [inventoryAlertWidget("two-thirds"), recentBookingsWidget(), topServicesWidget(), recentActivityWidget()],
  },

  // ──────────────────────────────────────────────────────────
  // EVENTS
  // ──────────────────────────────────────────────────────────
  events: {
    profileKey: "events",
    label: "الفعاليات",
    primaryAction: { label: "حجز جديد", href: "/dashboard/bookings" },
    kpis: [
      revenueKpi(),
      bookingsKpi("event-bookings", "الفعاليات", "فعالية"),
      {
        id: "event-quotations",
        label: "عروض الأسعار المرسلة",
        unit: "عرض",
        icon: FileText,
        bg: "bg-blue-50",
        iconColor: "text-blue-600",
        fetcher: () => eventsApi.quotations({ status: "sent" }),
        transform: (d) => String((d as any)?.data?.length ?? 0),
        allowedRoles: ["owner", "admin", "manager"],
      },
      customersKpi(),
    ],
    quickActions: [
      { id: "new-booking",   modal: "booking"  as const, label: "حجز جديد",    href: "/dashboard/bookings",        icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "new-quotation", label: "عرض سعر",            href: "/dashboard/event-quotations", icon: FileText,      bg: "bg-indigo-50", text: "text-indigo-600", allowedRoles: ["owner", "admin", "manager"] },
      { id: "assets",        label: "الأصول",              href: "/dashboard/assets",           icon: Package,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-customer",  modal: "customer" as const, label: "عميل جديد",   href: "/dashboard/customers",       icon: Users,         bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "reports",       label: "التقارير",             href: "/dashboard/reports",          icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [eventQuotationsWidget("third"), bookingStatusWidget(), recentBookingsWidget("full"), inventoryAlertWidget(), recentActivityWidget()],
  },

  event_organizer: {
    profileKey: "event_organizer",
    label: "تنظيم الفعاليات",
    primaryAction: { label: "عرض سعر جديد", href: "/dashboard/event-quotations" },
    kpis: [
      revenueKpi(),
      bookingsKpi("projects", "المشاريع", "مشروع"),
      {
        id: "active-quotations",
        label: "عروض نشطة",
        unit: "عرض",
        icon: FileText,
        bg: "bg-blue-50",
        iconColor: "text-blue-600",
        fetcher: () => eventsApi.quotations(),
        transform: (d) => String(((d as any)?.data ?? []).filter((q: any) => ["sent","draft"].includes(q.status)).length),
        allowedRoles: ["owner", "admin", "manager"],
      },
      customersKpi("clients", "العملاء", "عميل"),
    ],
    quickActions: [
      { id: "new-quotation", label: "عرض سعر جديد", href: "/dashboard/event-quotations", icon: FileText,      bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: ["owner", "admin", "manager"] },
      { id: "new-project",   label: "فعالية جديدة",  href: "/dashboard/bookings",          icon: CalendarCheck, bg: "bg-indigo-50", text: "text-indigo-600", allowedRoles: [] },
      { id: "new-customer",  modal: "customer" as const, label: "عميل جديد", href: "/dashboard/customers", icon: Users, bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "reports",       label: "التقارير",      href: "/dashboard/reports",           icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [eventQuotationsWidget("two-thirds"), bookingStatusWidget(), recentBookingsWidget("full"), recentActivityWidget()],
  },

  // ──────────────────────────────────────────────────────────
  // DIGITAL & CREATIVE
  // ──────────────────────────────────────────────────────────
  digital_services: {
    profileKey: "digital_services",
    label: "الخدمات الرقمية",
    primaryAction: { label: "مشروع جديد", href: "/dashboard/bookings" },
    kpis: [
      revenueKpi(),
      bookingsKpi("projects", "المشاريع", "مشروع"),
      customersKpi("clients", "العملاء", "عميل"),
      pendingKpi("pending-deliverables", "مهام معلقة", "مهمة"),
    ],
    quickActions: [
      { id: "new-project",  label: "مشروع جديد",  href: "/dashboard/bookings",  icon: Briefcase, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "new-invoice", modal: "invoice" as const,  label: "فاتورة جديدة", href: "/dashboard/invoices",  icon: Monitor,   bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: ["owner", "admin", "manager"] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد",   href: "/dashboard/customers", icon: Users,     bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "reports",      label: "التقارير",    href: "/dashboard/reports",   icon: BarChart2, bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [salesChartWidget("two-thirds"), weeklyBookingsWidget("third"), bookingStatusWidget(), recentBookingsWidget(), topServicesWidget(), recentActivityWidget()],
  },

  // ──────────────────────────────────────────────────────────
  // PHOTOGRAPHY
  // ──────────────────────────────────────────────────────────
  photography: {
    profileKey: "photography",
    label: "التصوير",
    primaryAction: { label: "حجز جلسة", href: "/dashboard/bookings" },
    kpis: [
      revenueKpi(),
      bookingsKpi("sessions", "الجلسات", "جلسة"),
      customersKpi(),
      pendingKpi("pending-sessions", "جلسات معلقة", "جلسة"),
    ],
    quickActions: [
      { id: "new-booking",   modal: "booking" as const,  label: "حجز جلسة",    href: "/dashboard/bookings",       icon: Camera,    bg: "bg-indigo-50", text: "text-indigo-600", allowedRoles: [] },
      { id: "galleries",                                 label: "معارض العملاء", href: "/dashboard/galleries",     icon: Image,     bg: "bg-pink-50",   text: "text-pink-600",   allowedRoles: [] },
      { id: "new-customer",  modal: "customer" as const, label: "عميل جديد",   href: "/dashboard/customers",      icon: Users,     bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "media-library",                             label: "مكتبة الوسائط", href: "/dashboard/media",        icon: Camera,    bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "reports",                                   label: "التقارير",     href: "/dashboard/reports",        icon: BarChart2, bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [salesChartWidget("two-thirds"), weeklyBookingsWidget("third"), bookingStatusWidget(), recentBookingsWidget(), topServicesWidget(), recentActivityWidget()],
  },

  // ──────────────────────────────────────────────────────────
  // REAL ESTATE — property management
  // ──────────────────────────────────────────────────────────
  real_estate: {
    profileKey: "real_estate",
    label: "إدارة العقارات",
    primaryAction: { label: "عقد جديد", href: "/dashboard/property/contracts" },
    kpis: [
      {
        id: "monthly-income",
        label: "الإيرادات الشهرية",
        unit: "ر.س",
        icon: Banknote,
        bg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        fetcher: () => propertyApi.dashboard(),
        transform: (d) => Number((d as any)?.data?.monthlyIncome || (d as any)?.monthlyIncome || 0).toLocaleString("en-US"),
        allowedRoles: ["owner", "admin", "manager"],
      },
      {
        id: "occupancy-rate",
        label: "نسبة الإشغال",
        unit: "%",
        icon: Home,
        bg: "bg-blue-50",
        iconColor: "text-blue-600",
        fetcher: () => propertyApi.dashboard(),
        transform: (d) => String((d as any)?.data?.occupancyRate || (d as any)?.occupancyRate || 0),
        allowedRoles: [],
      },
      {
        id: "overdue-invoices",
        label: "فواتير متأخرة",
        unit: "فاتورة",
        icon: AlertTriangle,
        bg: "bg-red-50",
        iconColor: "text-red-600",
        fetcher: () => propertyApi.dashboard(),
        transform: (d) => String((d as any)?.data?.overdueCount || (d as any)?.overdueCount || 0),
        allowedRoles: [],
      },
      {
        id: "active-contracts",
        label: "العقود النشطة",
        unit: "عقد",
        icon: FileText,
        bg: "bg-violet-50",
        iconColor: "text-violet-600",
        fetcher: () => propertyApi.dashboard(),
        transform: (d) => String((d as any)?.data?.activeContracts || (d as any)?.activeContracts || 0),
        allowedRoles: [],
      },
    ],
    quickActions: [
      { id: "new-contract",    label: "عقد جديد",       href: "/dashboard/property/contracts",    icon: FileText,    bg: "bg-blue-50",    text: "text-blue-600",    allowedRoles: [] },
      { id: "quick-payment",   label: "دفعة سريعة",     href: "/dashboard/property/quick-payment", icon: Zap,         bg: "bg-emerald-50", text: "text-emerald-600", allowedRoles: [] },
      { id: "new-maintenance", label: "طلب صيانة",      href: "/dashboard/property/maintenance",   icon: Wrench,      bg: "bg-amber-50",   text: "text-amber-600",   allowedRoles: [] },
      { id: "portfolio",       label: "المحفظة العقارية", href: "/dashboard/property/units",        icon: Building2,   bg: "bg-violet-50",  text: "text-violet-600",  allowedRoles: [] },
      { id: "reports",         label: "التقارير",        href: "/dashboard/reports",               icon: BarChart2,   bg: "bg-rose-50",    text: "text-rose-600",    allowedRoles: ["owner", "admin", "manager"] },
      { id: "compliance",      label: "الامتثال",        href: "/dashboard/property/compliance",   icon: ShieldCheck, bg: "bg-teal-50",    text: "text-teal-600",    allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [propertyMaintenanceWidget("two-thirds"), recentActivityWidget("third")],
  },

  // ──────────────────────────────────────────────────────────
  // WORKSHOP / REPAIR — أوامر العمل (ورشة، إصلاح جوالات، تفصيل، غسيل)
  // ──────────────────────────────────────────────────────────
  workshop: {
    profileKey: "workshop",
    label: "الورشة",
    primaryAction: { label: "أمر عمل جديد", href: "/dashboard/work-orders" },
    kpis: [
      {
        id: "active-orders",
        label: "أوامر نشطة",
        unit: "أمر",
        icon: ClipboardList,
        bg: "bg-brand-50",
        iconColor: "text-brand-500",
        fetcher: () => workOrdersApi.stats(),
        transform: (d) => String((d as any)?.data?.totalActive ?? 0),
        allowedRoles: [],
      },
      {
        id: "ready-orders",
        label: "جاهزة للاستلام",
        unit: "أمر",
        icon: ShieldCheck,
        bg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        fetcher: () => workOrdersApi.stats(),
        transform: (d) => String((d as any)?.data?.byStatus?.ready ?? 0),
        allowedRoles: [],
      },
      {
        id: "work-orders-revenue",
        label: "إيرادات أوامر العمل",
        unit: "ر.س",
        icon: Banknote,
        bg: "bg-teal-50",
        iconColor: "text-teal-600",
        fetcher: () => workOrdersApi.stats(),
        transform: (d) => Number((d as any)?.data?.totalRevenue ?? 0).toLocaleString("en-US"),
        allowedRoles: ["owner", "admin", "manager"],
      },
      customersKpi(),
    ],
    quickActions: [
      { id: "new-order",    label: "أمر عمل جديد", href: "/dashboard/work-orders",  icon: ClipboardList, bg: "bg-brand-50",   text: "text-brand-500",   allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد",   href: "/dashboard/customers",   icon: Users,    bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "new-invoice",  modal: "invoice" as const, label: "فاتورة جديدة", href: "/dashboard/invoices", icon: Monitor,  bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: ["owner", "admin", "manager"] },
      { id: "reports",      label: "التقارير",    href: "/dashboard/reports",        icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "work-orders", label: "أوامر العمل", size: "half" as const, allowedRoles: [], component: WorkOrdersWidget },
      recentActivityWidget(),
    ],
  },

  // ──────────────────────────────────────────────────────────
  // GENERIC SERVICES — medical, maintenance, laundry, education,
  // construction, logistics, real_estate, workshop, other
  // ──────────────────────────────────────────────────────────
  services: {
    profileKey: "services",
    label: "الخدمات",
    primaryAction: { label: "حجز جديد", href: "/dashboard/bookings" },
    kpis: [revenueKpi(), bookingsKpi(), customersKpi(), servicesKpi()],
    quickActions: [
      { id: "new-booking", modal: "booking" as const,  label: "حجز جديد",   href: "/dashboard/bookings",  icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "new-service", modal: "service" as const,  label: "خدمة جديدة", href: "/dashboard/services",  icon: Package,       bg: "bg-teal-50",   text: "text-teal-600",   allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد",  href: "/dashboard/customers", icon: Users,         bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "reports",      label: "التقارير",   href: "/dashboard/reports",   icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [salesChartWidget("two-thirds"), weeklyBookingsWidget("third"), bookingStatusWidget(), recentBookingsWidget(), topServicesWidget(), recentActivityWidget()],
  },

  // ──────────────────────────────────────────────────────────
  // FITNESS / GYM
  // ──────────────────────────────────────────────────────────
  fitness: {
    profileKey: "fitness",
    label: "النادي الرياضي",
    primaryAction: { label: "تسجيل دخول", href: "/dashboard/access-control" },
    kpis: [
      {
        id: "today-checkins",
        label: "دخول اليوم",
        unit: "عضو",
        icon: ShieldCheck,
        bg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        fetcher: () => accessControlApi.stats(),
        transform: (d) => String((d?.data?.todayGranted ?? 0) + (d?.data?.todayDenied ?? 0)),
        allowedRoles: [],
      },
      customersKpi("members", "الأعضاء", "عضو"),
      revenueKpi(),
      staffKpi(),
    ],
    quickActions: [
      { id: "access-control", label: "تسجيل دخول",  href: "/dashboard/access-control", icon: ShieldCheck,   bg: "bg-emerald-50", text: "text-emerald-600", allowedRoles: [] },
      { id: "new-customer",   modal: "customer" as const, label: "عضو جديد",     href: "/dashboard/customers",    icon: Users,         bg: "bg-violet-50",  text: "text-violet-600", allowedRoles: [] },
      { id: "schedule",       label: "الجدول",      href: "/dashboard/schedule",      icon: Clock,         bg: "bg-blue-50",    text: "text-blue-600",   allowedRoles: [] },
      { id: "reports",        label: "التقارير",    href: "/dashboard/reports",       icon: BarChart2,     bg: "bg-rose-50",    text: "text-rose-600",   allowedRoles: ["owner", "admin", "manager"] },
    ],
    widgets: [
      { id: "access-control-widget", label: "سجل الدخول", size: "half" as const, allowedRoles: [], component: AccessControlWidget },
      recentBookingsWidget("half"),
      recentActivityWidget(),
    ],
  },

  // maintenance alias — same profile as workshop but accessible by "maintenance" key
  maintenance: {
    profileKey: "maintenance",
    label: "الصيانة والخدمات",
    primaryAction: { label: "أمر عمل جديد", href: "/dashboard/work-orders" },
    kpis: [
      {
        id: "active-orders-m",
        label: "أوامر نشطة",
        unit: "أمر",
        icon: ClipboardList,
        bg: "bg-brand-50",
        iconColor: "text-brand-500",
        fetcher: () => workOrdersApi.stats(),
        transform: (d) => String((d as any)?.data?.totalActive ?? 0),
        allowedRoles: [],
      },
      revenueKpi(),
      customersKpi(),
      bookingsKpi(),
    ],
    quickActions: [
      { id: "new-order",    label: "أمر عمل جديد", href: "/dashboard/work-orders",  icon: ClipboardList, bg: "bg-brand-50",   text: "text-brand-500",   allowedRoles: [] },
      { id: "new-booking",  modal: "booking" as const, label: "حجز جديد",    href: "/dashboard/bookings",   icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600",   allowedRoles: [] },
      { id: "new-customer", modal: "customer" as const, label: "عميل جديد",  href: "/dashboard/customers",   icon: Users,         bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
    ],
    widgets: [
      { id: "work-orders-m", label: "أوامر العمل", size: "half" as const, allowedRoles: [], component: WorkOrdersWidget },
      recentBookingsWidget("half"),
      recentActivityWidget(),
    ],
  },

  // ──────────────────────────────────────────────────────────
  // FLOWERS & EVENTS — محل الورود والمناسبات
  // ──────────────────────────────────────────────────────────
  flowers_events: {
    profileKey: "flowers_events",
    label: "محل الورود والمناسبات",
    primaryAction: { label: "طلب كوشة / مناسبة", href: "/dashboard/flower-service-orders" },
    kpis: [
      {
        id: "fe-upcoming-events",
        label: "مناسبات قادمة",
        unit: "حفل",
        icon: CalendarCheck,
        bg: "bg-blue-50",
        iconColor: "text-blue-600",
        fetcher: () => import("@/lib/api").then(m => m.flowersEventsApi.dashboardMetrics()),
        transform: (d: any) => String(d?.data?.upcoming_events?.count ?? 0),
        allowedRoles: [],
      },
      {
        id: "fe-expiring",
        label: "دفعات تنتهي",
        unit: "دفعة",
        icon: AlertTriangle,
        bg: "bg-amber-50",
        iconColor: "text-amber-600",
        fetcher: () => import("@/lib/api").then(m => m.flowersEventsApi.dashboardMetrics()),
        transform: (d: any) => String(d?.data?.flower_alerts?.expiring_count ?? 0),
        allowedRoles: [],
      },
      {
        id: "builder-orders",
        label: "طلبات الباقات",
        unit: "طلب",
        icon: ShoppingBag,
        bg: "bg-rose-50",
        iconColor: "text-rose-600",
        fetcher: () => import("@/lib/api").then(m => m.flowerBuilderApi.orderStats()),
        transform: (d: any) => String(d?.data?.today ?? d?.data?.todayTotal ?? d?.data?.total ?? 0),
        allowedRoles: [],
      },
      revenueKpi("fe-revenue"),
    ],
    quickActions: [
      { id: "fe-service-orders", label: "طلب مناسبة",     href: "/dashboard/flower-service-orders", icon: CalendarCheck, bg: "bg-blue-50",    text: "text-blue-600",    allowedRoles: [] },
      { id: "flower-pos",        label: "الكاشير",         href: "/dashboard/pos",                   icon: ShoppingBag,   bg: "bg-pink-50",    text: "text-pink-600",    allowedRoles: [] },
      { id: "new-arrangement",   label: "إنشاء باقة",     href: "/dashboard/arrangements",          icon: Flower2,       bg: "bg-rose-50",    text: "text-rose-600",    allowedRoles: [] },
      { id: "new-customer",      modal: "customer" as const, label: "عميل جديد", href: "/dashboard/customers", icon: Users, bg: "bg-violet-50", text: "text-violet-600", allowedRoles: [] },
      { id: "receive-batch",     label: "استلام ورد",      href: "/dashboard/flower-master",         icon: Package,       bg: "bg-emerald-50", text: "text-emerald-600", allowedRoles: ["owner","admin","manager"] },
      { id: "flower-delivery",   label: "قائمة التوصيل",   href: "/dashboard/flower-delivery",       icon: Truck,         bg: "bg-orange-50",  text: "text-orange-600",  allowedRoles: [] },
    ],
    widgets: [
      { id: "expiring-batches-widget", label: "دفعات قاربت الانتهاء", size: "third"      as const, allowedRoles: [], component: ExpiringBatchesWidget },
      { id: "flower-orders-widget",    label: "طلبات الباقات",        size: "two-thirds" as const, allowedRoles: [], component: FlowerOrdersWidget },
      { id: "flower-morning-brief",    label: "ورقة الصباح",          size: "full"       as const, allowedRoles: [], component: FlowerMorningBriefWidget },
      recentActivityWidget(),
    ],
  },
};

// ============================================================
// Lookup — accepts dashboardProfile key from backend org context
// Safe fallback: any unknown key → default (generic_dashboard)
// NEVER falls back to a specialized profile (florist, hotel, etc.)
// ============================================================
export function getProfile(dashboardProfileKey: string): DashboardProfile {
  if (dashboardProfileKey && dashboardProfileKey in profiles) {
    return profiles[dashboardProfileKey];
  }
  return profiles.default;
}
