import { useState } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, Users, CalendarCheck,
  Banknote, Download, Loader2, Package, Star,
} from "lucide-react";
import { clsx } from "clsx";
import { bookingsApi, customersApi, servicesApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui";

const periods = [
  { value: "today",   label: "اليوم" },
  { value: "week",    label: "الأسبوع" },
  { value: "month",   label: "الشهر" },
  { value: "quarter", label: "الربع" },
  { value: "year",    label: "السنة" },
];

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-lg", className)} />;
}

function MiniBar({ value, max, color = "bg-brand-400" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 tabular-nums w-8 text-left">{pct}%</span>
    </div>
  );
}

export function ReportsPage() {
  const [period, setPeriod] = useState("month");

  const { data: statsRes, loading }  = useApi(() => bookingsApi.stats(period), [period]);
  const { data: custRes }            = useApi(() => customersApi.stats(), []);
  const { data: svcRes }             = useApi(() => servicesApi.list({ limit: "100" }), []);

  const stats     = statsRes?.data || {};
  const custStats = custRes?.data   || {};
  const services: any[] = svcRes?.data || [];

  const revenue       = Number(stats.revenue      || 0);
  const totalBookings = Number(stats.total        || 0);
  const avgValue      = Number(stats.avgBookingValue || 0);
  const totalCustomers = Number(custStats.total   || 0);
  const cancelled     = Number(stats.cancelled    || 0);
  const cancellationRate = totalBookings > 0 ? Math.round((cancelled / totalBookings) * 100) : 0;

  const topServices = [...services]
    .sort((a, b) => (b.totalBookings || 0) - (a.totalBookings || 0))
    .slice(0, 8);
  const maxBookings = topServices[0]?.totalBookings || 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">التقارير والتحليلات</h1>
          <p className="text-sm text-gray-400 mt-0.5">نظرة شاملة على الأداء</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  period === p.value ? "bg-brand-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" icon={Download} size="sm">تصدير</Button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "الإيرادات",     value: `${revenue.toLocaleString("ar-SA")} ر.س`,  icon: Banknote,      bg: "bg-emerald-50", ic: "text-emerald-600", trend: stats.revenueGrowth },
            { label: "الحجوزات",      value: totalBookings.toLocaleString("ar-SA"),       icon: CalendarCheck, bg: "bg-blue-50",    ic: "text-blue-600",   trend: null },
            { label: "العملاء",       value: totalCustomers.toLocaleString("ar-SA"),      icon: Users,         bg: "bg-violet-50",  ic: "text-violet-600", trend: null },
            { label: "متوسط الحجز",   value: `${avgValue.toLocaleString("ar-SA")} ر.س`,  icon: TrendingUp,    bg: "bg-amber-50",   ic: "text-amber-600",  trend: null },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", kpi.bg)}>
                  <kpi.icon className={clsx("w-4.5 h-4.5", kpi.ic)} />
                </div>
                {kpi.trend != null && (
                  <span className={clsx(
                    "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    kpi.trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                  )}>
                    {kpi.trend >= 0 ? "+" : ""}{kpi.trend}%
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{kpi.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Two-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Booking funnel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">توزيع الحجوزات</h2>
          <div className="space-y-3">
            {[
              { label: "إجمالي",    value: totalBookings,          color: "bg-brand-400" },
              { label: "مؤكدة",    value: Number(stats.confirmed || 0), color: "bg-blue-400" },
              { label: "مكتملة",   value: Number(stats.completed || 0), color: "bg-emerald-400" },
              { label: "ملغية",    value: cancelled,               color: "bg-red-400" },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 shrink-0">{row.label}</span>
                <MiniBar value={row.value} max={totalBookings || 1} color={row.color} />
                <span className="text-sm font-semibold text-gray-700 tabular-nums w-10 text-left">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">معدل الإلغاء</span>
              <span className={clsx("font-bold", cancellationRate > 20 ? "text-red-500" : "text-gray-700")}>
                {cancellationRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Customer insights */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">رؤى العملاء</h2>
          <div className="space-y-3">
            {[
              { label: "إجمالي العملاء",  value: totalCustomers, color: "text-brand-600" },
              { label: "VIP",              value: custStats.vip || 0, color: "text-amber-600" },
              { label: "مؤسسات",           value: custStats.corporate || 0, color: "text-violet-600" },
              { label: "جديد هذا الشهر",  value: custStats.newThisMonth || 0, color: "text-emerald-600" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{row.label}</span>
                <span className={clsx("text-lg font-bold tabular-nums", row.color)}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top services table */}
      {topServices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">أداء الخدمات</h2>
            <span className="text-xs text-gray-400">{services.length} خدمة</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold uppercase tracking-wide">#</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الخدمة</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide hidden md:table-cell">التصنيف</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الحجوزات</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide hidden lg:table-cell">السعر</th>
                <th className="py-3 px-4 hidden lg:table-cell w-32"></th>
              </tr>
            </thead>
            <tbody>
              {topServices.map((s: any, idx: number) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-5">
                    <span className="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-900 line-clamp-1">{s.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 text-xs hidden md:table-cell">{s.categoryName || "—"}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-700 tabular-nums">{s.totalBookings || 0}</td>
                  <td className="py-3.5 px-4 text-gray-600 tabular-nums hidden lg:table-cell">
                    {Number(s.basePrice || 0).toLocaleString()} ر.س
                  </td>
                  <td className="py-3.5 px-4 hidden lg:table-cell">
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-300 rounded-full"
                        style={{ width: `${Math.round(((s.totalBookings || 0) / maxBookings) * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
