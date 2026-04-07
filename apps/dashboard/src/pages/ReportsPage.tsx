import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3, TrendingUp, TrendingDown, Users, CalendarCheck,
  Banknote, Package, Star, Globe, ArrowUpRight, ArrowDownRight,
  CreditCard, RotateCcw, ShoppingBag, Receipt, UserCheck,
  Clock, FileText, Percent, ChevronLeft,
} from "lucide-react";
import { clsx } from "clsx";
import { bookingsApi, customersApi, servicesApi, websiteApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useBusiness } from "@/hooks/useBusiness";
import { PageHeader } from "@/components/ui";

const TABS = [
  { id: "overview", label: "نظرة عامة" },
  { id: "growth",   label: "النمو" },
  { id: "storefront", label: "المتجر الإلكتروني" },
];

const PERIODS = [
  { value: "week",    label: "الأسبوع" },
  { value: "month",   label: "الشهر" },
  { value: "quarter", label: "الربع" },
  { value: "year",    label: "السنة" },
];

const SOURCE_LABELS: Record<string, string> = {
  direct: "مباشر", referral: "إحالة", google_ads: "إعلانات جوجل",
  snapchat: "سناب شات", instagram: "إنستغرام", walk_in: "حضور مباشر",
  whatsapp: "واتساب", website: "الموقع",
};

function Sk({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-lg", className)} />;
}

function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const up = value > 0;
  return (
    <span className={clsx("flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full",
      up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function TrendChart({ data }: { data: { month: string; revenue: number; bookings: number }[] }) {
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => {
        const pct = Math.max(4, Math.round((d.revenue / maxRev) * 100));
        const label = d.month.slice(5); // "MM"
        const isLast = i === data.length - 1;
        return (
          <div key={d.month} className="flex flex-col items-center gap-1 flex-1 group relative">
            <div className={clsx("w-full rounded-t-md transition-all duration-300",
              isLast ? "bg-brand-500" : "bg-brand-200 group-hover:bg-brand-300")}
              style={{ height: `${pct}%` }} />
            <span className="text-[9px] text-gray-400 tabular-nums">{label}</span>
            {/* tooltip */}
            <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-gray-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
              {d.revenue.toLocaleString("en-US")} ر.س — {d.bookings} حجز
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const biz = useBusiness();
  const [tab, setTab]         = useState("overview");
  const [period, setPeriod]   = useState("month");
  const [customRange, setCustomRange] = useState(false);
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [activePeriod, setActivePeriod] = useState("month");

  const { data: statsRes, loading } = useApi(() => bookingsApi.stats(activePeriod), [activePeriod]);
  const { data: custRes }           = useApi(() => customersApi.stats(), []);
  const { data: svcRes }            = useApi(() => servicesApi.list({ limit: "100" }), []);
  const { data: trendRes }          = useApi(() => bookingsApi.trend(6), []);
  const { data: growthRes }         = useApi(() => bookingsApi.growth(activePeriod), [activePeriod]);
  const { data: siteRes }           = useApi(() => websiteApi.analytics(), []);

  const stats     = statsRes?.data   || {};
  const custStats = custRes?.data    || {};
  const trendData: any[] = trendRes?.data || [];
  const growth    = growthRes?.data  || {};
  const siteStats = siteRes?.data    || {};
  const services: any[] = svcRes?.data || [];

  const revenue        = Number(stats.totalRevenue    || 0);
  const totalBookings  = Number(stats.totalBookings   || 0);
  const avgValue       = Number(stats.avgBookingValue || 0);
  const totalCustomers = Number(custStats.total       || 0);
  const newThisMonth   = Number(custStats.newThisMonth|| 0);

  const statusBreakdown: any[] = stats.statusBreakdown || [];
  const byStatus = Object.fromEntries(statusBreakdown.map((s: any) => [s.status, Number(s.count)]));
  const cancelled    = byStatus["cancelled"]   || 0;
  const completed    = byStatus["completed"]   || 0;
  const confirmed    = byStatus["confirmed"]   || 0;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelled / totalBookings) * 100) : 0;

  const applyCustomRange = () => {
    if (dateFrom && dateTo) {
      setActivePeriod(`custom:${dateFrom}:${dateTo}`);
      setCustomRange(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["الخدمة", "الفئة", "عدد الحجوزات", "السعر"],
      ...topServices.map((s: any) => [s.name, s.categoryName || "", s.totalBookings || 0, s.basePrice || 0]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير-ترميز OS-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const topServices = [...services]
    .sort((a, b) => (b.totalBookings || 0) - (a.totalBookings || 0))
    .slice(0, 8);
  const maxBookings = topServices[0]?.totalBookings || 1;

  const sourceBreakdown: any[] = custStats.sourceBreakdown || [];
  const maxSource = Math.max(...sourceBreakdown.map((s: any) => Number(s.count)), 1);

  const returning    = Number(custStats.returning || 0);
  const retentionRate = totalCustomers > 0 ? Math.round((returning / totalCustomers) * 100) : 0;

  const REPORT_CATEGORIES = [
    {
      title: "التقارير المالية",
      reports: [
        { label: "تقارير المبيعات",          desc: "تحليل بيانات المبيعات حسب الفترة والخدمة",            icon: TrendingUp,   href: "/dashboard/reports/sales",    color: "text-brand-500",   bg: "bg-brand-50" },
        { label: "تقارير المدفوعات",          desc: "تتبع طرق الدفع وقيم المدفوعات",                       icon: CreditCard,   href: "/dashboard/reports/payments",  color: "text-emerald-500", bg: "bg-emerald-50" },
        { label: "تقرير التحصيل",             desc: "عرض تفصيلي لعمليات الدفع والمرتجعات",                 icon: Receipt,      href: "/dashboard/reports/collection",color: "text-blue-500",    bg: "bg-blue-50" },
        { label: "تقرير المصروفات",           desc: "مراجعة وتتبع المصروفات بسهولة",                        icon: Banknote,     href: "/dashboard/reports/expenses",  color: "text-amber-500",   bg: "bg-amber-50" },
        { label: "تقارير العمولات",            desc: "تحليل بيانات العمولات للمنتجات والخدمات",              icon: Percent,      href: "/dashboard/reports/commissions",color: "text-violet-500", bg: "bg-violet-50" },
        { label: "تقارير المسترجعات",          desc: "عرض تفاصيل العمليات المسترجعة",                        icon: RotateCcw,    href: "/dashboard/reports/refunds",   color: "text-red-500",     bg: "bg-red-50" },
        { label: "تقارير مبيعات الحجوزات",    desc: "تحليل بيانات مبيعات الحجوزات",                        icon: CalendarCheck,href: "/dashboard/reports/booking-sales",color: "text-teal-500", bg: "bg-teal-50" },
        { label: "تقرير إغلاق الصندوق",       desc: "تقرير شامل لنشاطات النقد والمبيعات اليومية",           icon: ShoppingBag,  href: "/dashboard/reports/cash-close", color: "text-gray-500",   bg: "bg-gray-100" },
      ],
    },
    {
      title: "التقارير التشغيلية",
      reports: [
        { label: "تقارير مقدمي الخدمة",       desc: "تحليل تفاعل وسلوك مقدمي الخدمة",                     icon: UserCheck,    href: "/dashboard/reports/providers", color: "text-indigo-500",  bg: "bg-indigo-50" },
        { label: "تقارير حضور الحجوزات",      desc: "تقارير تفصيلية لحضور العملاء بالتاريخ",               icon: CalendarCheck,href: "/dashboard/reports/attendance", color: "text-brand-500",   bg: "bg-brand-50" },
        { label: "تقارير الاشتراكات",          desc: "تحليل بيانات الاشتراكات والباقات",                     icon: Package,      href: "/dashboard/reports/subscriptions",color: "text-purple-500",bg: "bg-purple-50" },
      ],
    },
    {
      title: "تقارير التحليلات",
      reports: [
        { label: "تقارير زوار الموقع",         desc: "سلوك زوار الموقع ومصادر الزيارة",                     icon: Globe,        href: "/dashboard/reports/visitors",  color: "text-cyan-500",    bg: "bg-cyan-50" },
        { label: "تقرير أوقات الذروة",          desc: "تحليل أوقات الذروة ومقدمي الخدمة الأكثر طلباً",      icon: Clock,        href: "/dashboard/reports/peak-times", color: "text-orange-500",  bg: "bg-orange-50" },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="التقارير والتحليلات"
        description="نظرة شاملة على الأداء"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 rounded-xl text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all"
            >
              تصدير CSV
            </button>
            <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1">
              {PERIODS.map((p) => (
                <button key={p.value} onClick={() => { setPeriod(p.value); setActivePeriod(p.value); setCustomRange(false); }}
                  className={clsx("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    activePeriod === p.value ? "bg-brand-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50")}>
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setCustomRange(v => !v)}
                className={clsx("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  customRange ? "bg-brand-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50")}
              >
                مخصص
              </button>
            </div>
          </div>
        }
      />

      {customRange && (
        <div className="flex gap-2 items-center flex-wrap bg-white border border-gray-100 rounded-2xl p-3">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-brand-300"
            dir="ltr"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-brand-300"
            dir="ltr"
          />
          <button
            onClick={applyCustomRange}
            className="px-4 py-1.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            تطبيق
          </button>
        </div>
      )}

      {/* ── Report Categories Hub ─────────────────────────── */}
      {REPORT_CATEGORIES.map(cat => (
        <div key={cat.title}>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">{cat.title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {cat.reports.map(rpt => {
              const Icon = rpt.icon;
              return (
                <Link key={rpt.href} to={rpt.href}
                  className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm hover:border-gray-200 transition-all group">
                  <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", rpt.bg)}>
                    <Icon className={clsx("w-4 h-4", rpt.color)} />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-600 transition-colors">{rpt.label}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{rpt.desc}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>عرض التقرير</span><ChevronLeft className="w-3 h-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* divider */}
      <div className="border-t border-gray-100 pt-2">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">نظرة عامة سريعة</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx("px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────── */}
      {tab === "overview" && (
        <>
          {/* KPI Cards */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Sk key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: biz.terminology.revenue,   value: `${revenue.toLocaleString("en-US")} ر.س`, icon: Banknote,      bg: "bg-emerald-50", ic: "text-emerald-600", g: growth.revenue?.growth },
                { label: biz.terminology.bookings,  value: totalBookings.toLocaleString("en-US"),      icon: CalendarCheck, bg: "bg-blue-50",    ic: "text-blue-600",   g: growth.bookings?.growth },
                { label: biz.terminology.clients,   value: totalCustomers.toLocaleString("en-US"),     icon: Users,         bg: "bg-violet-50",  ic: "text-violet-600", g: null },
                { label: "متوسط الحجز", value: `${Math.round(avgValue).toLocaleString("en-US")} ر.س`, icon: TrendingUp, bg: "bg-amber-50", ic: "text-amber-600", g: null },
              ].map((kpi, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", kpi.bg)}>
                      <kpi.icon className={clsx("w-4.5 h-4.5", kpi.ic)} />
                    </div>
                    {kpi.g != null && <GrowthBadge value={kpi.g} />}
                  </div>
                  <p className="text-xl font-bold text-gray-900 tabular-nums">{kpi.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{kpi.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Trend + Booking funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 text-sm">اتجاه الإيرادات (6 أشهر)</h2>
                <BarChart3 className="w-4 h-4 text-gray-300" />
              </div>
              {trendData.length > 0 ? <TrendChart data={trendData} /> : <Sk className="h-28" />}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-4">توزيع الحجوزات</h2>
              <div className="space-y-3">
                {[
                  { label: "إجمالي",  value: totalBookings, color: "bg-brand-400" },
                  { label: "مؤكدة",   value: confirmed,     color: "bg-blue-400" },
                  { label: "مكتملة",  value: completed,     color: "bg-emerald-400" },
                  { label: "ملغية",   value: cancelled,     color: "bg-red-400" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-14 shrink-0">{row.label}</span>
                    <MiniBar value={row.value} max={totalBookings || 1} color={row.color} />
                    <span className="text-sm font-semibold text-gray-700 tabular-nums w-8 text-left">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-sm">
                <span className="text-gray-500">معدل الإلغاء</span>
                <span className={clsx("font-bold", cancellationRate > 20 ? "text-red-500" : "text-gray-700")}>{cancellationRate}%</span>
              </div>
            </div>
          </div>

          {/* Top services */}
          {topServices.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900 text-sm">أداء الخدمات</h2>
                <span className="text-xs text-gray-400">{services.length} {biz.terminology.item}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">#</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الخدمة</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden md:table-cell">التصنيف</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الحجوزات</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden lg:table-cell">السعر</th>
                    <th className="py-3 px-4 hidden lg:table-cell w-32" />
                  </tr>
                </thead>
                <tbody>
                  {topServices.map((s: any, idx: number) => (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="py-3.5 px-5">
                        <span className="w-6 h-6 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-900 line-clamp-1">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 text-xs hidden md:table-cell">{s.categoryName || "—"}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-700 tabular-nums">{s.totalBookings || 0}</td>
                      <td className="py-3.5 px-4 text-gray-600 tabular-nums hidden lg:table-cell">{Number(s.basePrice || 0).toLocaleString()} ر.س</td>
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-300 rounded-full" style={{ width: `${Math.round(((s.totalBookings || 0) / maxBookings) * 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Growth Tab ────────────────────────────────────── */}
      {tab === "growth" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Growth comparison */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">مقارنة الأداء مع الفترة السابقة</h2>
            {growth.revenue ? (
              <div className="space-y-4">
                {[
                  { label: biz.terminology.revenue,  cur: growth.revenue?.current,  prev: growth.revenue?.previous,  g: growth.revenue?.growth,  suffix: " ر.س" },
                  { label: biz.terminology.bookings, cur: growth.bookings?.current, prev: growth.bookings?.previous, g: growth.bookings?.growth, suffix: "" },
                ].map((row, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">{row.label}</span>
                      <GrowthBadge value={row.g ?? 0} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">{Number(row.cur || 0).toLocaleString("en-US")}{row.suffix}</p>
                    <p className="text-xs text-gray-400 mt-1">الفترة السابقة: {Number(row.prev || 0).toLocaleString("en-US")}{row.suffix}</p>
                  </div>
                ))}
              </div>
            ) : <Sk className="h-40" />}
          </div>

          {/* Customer retention */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">استبقاء العملاء</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">معدل الاستبقاء</span>
                <span className={clsx("text-2xl font-bold tabular-nums", retentionRate >= 60 ? "text-emerald-600" : retentionRate >= 30 ? "text-amber-600" : "text-red-500")}>
                  {retentionRate}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={clsx("h-full rounded-full", retentionRate >= 60 ? "bg-emerald-400" : retentionRate >= 30 ? "bg-amber-400" : "bg-red-400")}
                  style={{ width: `${retentionRate}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {[
                  { label: "الإجمالي",        value: totalCustomers, color: "text-gray-900" },
                  { label: "عائدون",           value: returning,      color: "text-emerald-600" },
                  { label: "جديد هذا الشهر",  value: newThisMonth,   color: "text-blue-600" },
                ].map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={clsx("text-xl font-bold tabular-nums", r.color)}>{r.value}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{r.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Source breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">مصادر اكتساب العملاء</h2>
            {sourceBreakdown.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sourceBreakdown.sort((a: any, b: any) => b.count - a.count).map((s: any) => {
                  const pct = maxSource > 0 ? Math.round((Number(s.count) / maxSource) * 100) : 0;
                  return (
                    <div key={s.source} className="p-3 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">{SOURCE_LABELS[s.source] || s.source}</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{s.count}</p>
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-gray-400 text-center py-8">لا توجد بيانات مصادر بعد</p>}
          </div>
        </div>
      )}

      {/* ── Storefront Tab ────────────────────────────────── */}
      {tab === "storefront" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { label: "مشاهدات المتجر",    value: siteStats.storefrontViews ?? 0, icon: Globe,         color: "text-brand-600",   bg: "bg-brand-50" },
            { label: "طلبات التواصل",     value: siteStats.inquiries ?? 0,       icon: CalendarCheck, color: "text-blue-600",    bg: "bg-blue-50" },
            { label: "صفحات منشورة",      value: siteStats.publishedPages ?? 0,  icon: Package,       color: "text-violet-600",  bg: "bg-violet-50" },
            { label: "مقالات منشورة",     value: siteStats.publishedPosts ?? 0,  icon: TrendingUp,    color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "عدد التقييمات",     value: siteStats.reviewCount ?? 0,     icon: Star,          color: "text-amber-600",   bg: "bg-amber-50" },
            { label: "متوسط التقييم",     value: siteStats.avgRating ?? "—",     icon: Star,          color: "text-amber-600",   bg: "bg-amber-50", suffix: "/5" },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-3", card.bg)}>
                <card.icon className={clsx("w-5 h-5", card.color)} />
              </div>
              <p className={clsx("text-2xl font-bold tabular-nums", card.color)}>
                {typeof card.value === "number" ? card.value.toLocaleString("en-US") : card.value}
                {card.suffix && <span className="text-sm font-normal text-gray-400"> {card.suffix}</span>}
              </p>
              <p className="text-xs text-gray-400 mt-1">{card.label}</p>
            </div>
          ))}

          {siteStats.storefrontUrl && (
            <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl border border-brand-200 p-5 sm:col-span-2 lg:col-span-3">
              <p className="text-sm font-semibold text-brand-800 mb-2">رابط متجرك الإلكتروني</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-sm bg-white/70 rounded-lg px-3 py-2 text-brand-700 truncate">
                  {window.location.origin}{siteStats.storefrontUrl}
                </code>
                <button
                  onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${siteStats.storefrontUrl}`)}
                  className="bg-brand-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors shrink-0">
                  نسخ
                </button>
                <a href={siteStats.storefrontUrl} target="_blank" rel="noreferrer"
                  className="bg-white border border-brand-200 text-brand-600 text-sm px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors shrink-0 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> معاينة
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
