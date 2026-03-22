import { Link, useNavigate } from "react-router-dom";
import {
  CalendarCheck, Users, Banknote, TrendingUp, Plus,
  ArrowLeft, Package, Clock, CheckCircle2, XCircle,
  AlertCircle, BarChart2, Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { bookingsApi, customersApi, servicesApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  pending:     { label: "بانتظار",     color: "text-amber-600 bg-amber-50",  dot: "bg-amber-400" },
  confirmed:   { label: "مؤكد",        color: "text-blue-600 bg-blue-50",    dot: "bg-blue-400" },
  in_progress: { label: "قيد التنفيذ", color: "text-purple-600 bg-purple-50", dot: "bg-purple-400" },
  completed:   { label: "مكتمل",       color: "text-green-600 bg-green-50",  dot: "bg-green-400" },
  cancelled:   { label: "ملغي",        color: "text-red-500 bg-red-50",      dot: "bg-red-400" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-lg", className)} />;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={clsx("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: statsRes, loading: statsLoading } = useApi(() => bookingsApi.stats("month"), []);
  const { data: bookingsRes, loading: bookingsLoading } = useApi(() => bookingsApi.list({ limit: "5" }), []);
  const { data: customersRes } = useApi(() => customersApi.stats(), []);
  const { data: servicesRes } = useApi(() => servicesApi.list({ limit: "100" }), []);

  const stats = statsRes?.data || {};
  const recentBookings: any[] = bookingsRes?.data || [];
  const customerStats = customersRes?.data || {};
  const services: any[] = servicesRes?.data || [];

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
  })();

  const revenue = Number(stats.revenue || 0);
  const totalBookings = Number(stats.total || 0);
  const totalCustomers = Number(customerStats.total || 0);
  const totalServices = services.length;

  const kpis = [
    {
      label: "الإيرادات",
      value: revenue.toLocaleString("ar-SA"),
      unit: "ر.س",
      icon: Banknote,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      trend: "+12%",
      trendUp: true,
    },
    {
      label: "الحجوزات",
      value: totalBookings.toLocaleString("ar-SA"),
      unit: "حجز",
      icon: CalendarCheck,
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
      trend: "+8%",
      trendUp: true,
    },
    {
      label: "العملاء",
      value: totalCustomers.toLocaleString("ar-SA"),
      unit: "عميل",
      icon: Users,
      bg: "bg-violet-50",
      iconColor: "text-violet-600",
      trend: "+5%",
      trendUp: true,
    },
    {
      label: "الخدمات",
      value: totalServices.toLocaleString("ar-SA"),
      unit: "خدمة",
      icon: Package,
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      trend: "نشط",
      trendUp: null,
    },
  ];

  // Fake weekly bar chart data
  const weekDays = ["سب", "أح", "إث", "ثل", "أر", "خم", "جم"];
  const weekValues = [4, 7, 5, 9, 6, 11, 8];
  const maxWeek = Math.max(...weekValues);

  // Booking status distribution
  const statusCounts = recentBookings.reduce((acc: any, b: any) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  const quickActions = [
    { label: "حجز جديد",    href: "/dashboard/bookings",  icon: CalendarCheck, bg: "bg-blue-50",   text: "text-blue-600" },
    { label: "خدمة جديدة",  href: "/dashboard/services",  icon: Package,       bg: "bg-teal-50",   text: "text-teal-600" },
    { label: "عميل جديد",   href: "/dashboard/customers", icon: Users,         bg: "bg-violet-50", text: "text-violet-600" },
    { label: "التقارير",    href: "/dashboard/reports",   icon: BarChart2,     bg: "bg-rose-50",   text: "text-rose-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Welcome row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            مرحباً{user.name ? ` ${user.name}` : ""} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard/bookings")}
          className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          حجز جديد
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", kpi.bg)}>
                <kpi.icon className={clsx("w-4.5 h-4.5", kpi.iconColor)} />
              </div>
              {kpi.trendUp !== null ? (
                <span className={clsx("text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  kpi.trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                )}>
                  {kpi.trend}
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {kpi.trend}
                </span>
              )}
            </div>
            {statsLoading ? (
              <Skeleton className="h-7 w-24 mb-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{kpi.value}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{kpi.label} · {kpi.unit}</p>
          </div>
        ))}
      </div>

      {/* Middle row: Chart + Status dist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">الحجوزات الأسبوعية</h2>
              <p className="text-xs text-gray-400 mt-0.5">هذا الأسبوع</p>
            </div>
            <span className="text-xs bg-brand-50 text-brand-600 px-2.5 py-1 rounded-lg font-medium">
              {weekValues.reduce((a, b) => a + b, 0)} حجز
            </span>
          </div>
          <div className="flex items-end gap-2 h-28">
            {weekValues.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-lg bg-brand-100 relative overflow-hidden transition-all duration-500"
                  style={{ height: `${(v / maxWeek) * 100}%` }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-brand-400 rounded-t-lg transition-all duration-500"
                    style={{ height: "60%" }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{weekDays[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Booking status overview */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900 text-sm">حالة الحجوزات</h2>
            <p className="text-xs text-gray-400 mt-0.5">التوزيع الحالي</p>
          </div>
          <div className="space-y-3">
            {Object.entries(statusConfig).map(([key, cfg]) => {
              const count = statusCounts[key] || 0;
              const total = recentBookings.length || 1;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={clsx("w-2 h-2 rounded-full", cfg.dot)} />
                      <span className="text-xs text-gray-600">{cfg.label}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700">{count}</span>
                  </div>
                  <MiniBar
                    value={count}
                    max={total}
                    color={key === "completed" ? "bg-green-400" : key === "cancelled" ? "bg-red-400" : key === "pending" ? "bg-amber-400" : key === "confirmed" ? "bg-blue-400" : "bg-purple-400"}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row: Recent bookings + Quick actions + Top services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent bookings */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">آخر الحجوزات</h2>
            <Link
              to="/dashboard/bookings"
              className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium"
            >
              عرض الكل
              <ArrowLeft className="w-3 h-3 rotate-180" />
            </Link>
          </div>
          <div>
            {bookingsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                ))}
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="p-8 text-center">
                <CalendarCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">لا توجد حجوزات بعد</p>
              </div>
            ) : (
              recentBookings.slice(0, 5).map((b: any) => {
                const s = statusConfig[b.status] || statusConfig.pending;
                return (
                  <Link
                    key={b.id}
                    to={`/dashboard/bookings/${b.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.color)}>
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {b.customerName || b.customer?.name || "عميل"}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {b.eventDate ? new Date(b.eventDate).toLocaleDateString("ar-SA") : "—"}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-sm font-bold text-gray-900 tabular-nums">
                        {Number(b.totalAmount || 0).toLocaleString("ar-SA")} ر.س
                      </p>
                      <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-medium", s.color)}>
                        {s.label}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Side panel: quick actions + top services */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">إجراءات سريعة</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, i) => (
                <Link
                  key={i}
                  to={action.href}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all"
                >
                  <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", action.bg)}>
                    <action.icon className={clsx("w-4.5 h-4.5", action.text)} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Top services */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 text-sm">أبرز الخدمات</h2>
              <Link to="/dashboard/services" className="text-xs text-brand-500 hover:text-brand-600 font-medium">الكل</Link>
            </div>
            <div className="space-y-2.5">
              {services.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">لا توجد خدمات</p>
              ) : (
                services.slice(0, 4).map((service: any, i: number) => (
                  <Link
                    key={service.id}
                    to={`/dashboard/services/${service.id}`}
                    className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 truncate">{service.name}</span>
                    <span className="text-xs text-gray-400 tabular-nums shrink-0">
                      {service.totalBookings || 0} حجز
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
