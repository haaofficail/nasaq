import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, CalendarCheck, Banknote, Clock, TrendingUp, Download, XCircle } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";

function fmt(n: any) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(n: any) {
  return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function today()      { return new Date().toISOString().split("T")[0]; }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }

const STATUS_OPTIONS = [
  { value: "",            label: "كل الحالات" },
  { value: "pending",     label: "بانتظار التأكيد" },
  { value: "confirmed",   label: "مؤكد" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "completed",   label: "مكتمل" },
  { value: "cancelled",   label: "ملغي" },
];

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending:     { label: "بانتظار التأكيد", color: "bg-amber-50 text-amber-600 border-amber-200" },
  confirmed:   { label: "مؤكد",            color: "bg-blue-50 text-blue-600 border-blue-200" },
  in_progress: { label: "قيد التنفيذ",     color: "bg-brand-50 text-brand-600 border-brand-200" },
  completed:   { label: "مكتمل",           color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled:   { label: "ملغي",            color: "bg-red-50 text-red-500 border-red-200" },
};

export function BookingSalesReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo,   setDateTo]   = useState(today());
  const [status,   setStatus]   = useState("");

  const params: Record<string, string> = { dateFrom, dateTo };
  if (status) params.status = status;

  const { data: res, loading } = useApi(() => financeApi.bookingSalesReport(params), [dateFrom, dateTo, status]);
  const report    = res?.data;
  const summary   = report?.summary   || {};
  const byService: any[] = report?.byService || [];
  const byDay:     any[] = report?.byDay     || [];

  const maxDayRevenue = Math.max(...byDay.map((d: any) => Number(d.revenue || 0)), 1);

  const exportCsv = () => {
    const header = "الخدمة,عدد الحجوزات,إجمالي الإيرادات,متوسط السعر\n";
    const rows = byService.map((s: any) =>
      [s.serviceName, s.bookingCount, s.totalRevenue, s.avgPrice].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `booking-sales-${dateFrom}-${dateTo}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> التقارير
        </Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقارير مبيعات الحجوزات</span>
      </div>

      {/* filters */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">من تاريخ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-[#eef2f6] rounded-xl focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">إلى تاريخ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-[#eef2f6] rounded-xl focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">حالة الحجز</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-[#eef2f6] rounded-xl focus:outline-none focus:border-brand-400 bg-white">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f8fafc] border border-[#eef2f6] text-sm text-gray-600 hover:bg-gray-100 transition-colors mr-auto">
            <Download className="w-4 h-4" /> تصدير CSV
          </button>
        </div>
      </div>

      {loading ? <PageSkeleton /> : (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: CalendarCheck, label: "إجمالي الحجوزات",  value: fmtInt(summary.totalBookings), unit: "حجز",   color: "text-brand-600",   bg: "bg-brand-50" },
              { icon: Banknote,      label: "إجمالي الإيرادات", value: fmt(summary.totalRevenue),      unit: "ر.س",   color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: Banknote,      label: "المبالغ المحصّلة", value: fmt(summary.totalPaid),          unit: "ر.س",   color: "text-emerald-700", bg: "bg-emerald-100" },
              { icon: Clock,         label: "إيرادات معلقة",    value: fmt(summary.outstanding),        unit: "ر.س",   color: "text-amber-600",   bg: "bg-amber-50" },
              { icon: TrendingUp,    label: "متوسط قيمة الحجز", value: fmt(summary.avgValue),           unit: "ر.س",   color: "text-gray-800",    bg: "bg-[#f8fafc]" },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
                  <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-3", card.bg)}>
                    <Icon className={clsx("w-4 h-4", card.color)} />
                  </div>
                  <p className={clsx("text-xl font-bold tabular-nums", card.color)}>{card.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.label} {card.unit !== "حجز" ? card.unit : ""}</p>
                </div>
              );
            })}
          </div>

          {/* status breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { key: "completedCount",  label: "مكتمل",            color: "bg-emerald-50 text-emerald-700" },
              { key: "confirmedCount",  label: "مؤكد",              color: "bg-blue-50 text-blue-600" },
              { key: "pendingCount",    label: "بانتظار التأكيد",   color: "bg-amber-50 text-amber-600" },
              { key: "inProgressCount", label: "قيد التنفيذ",       color: "bg-brand-50 text-brand-600" },
              { key: "cancelledCount",  label: "ملغي",              color: "bg-red-50 text-red-500" },
            ].map(s => (
              <div key={s.key} className={clsx("rounded-2xl border border-[#eef2f6] p-4", s.color.split(" ")[0].replace("text-", "bg-").replace("700", "50").replace("600", "50").replace("500", "50"))}>
                <p className={clsx("text-2xl font-bold tabular-nums", s.color.split(" ")[1])}>{fmtInt(summary[s.key])}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Daily trend + by service — side by side on large screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Daily trend chart */}
            <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900 text-sm">الإيرادات اليومية</h2>
              </div>
              {byDay.length === 0 ? (
                <div className="p-10 text-center">
                  <TrendingUp className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">لا توجد بيانات</p>
                </div>
              ) : (
                <div className="p-5 space-y-2 overflow-y-auto max-h-80">
                  {byDay.map((d: any) => {
                    const pct = Math.round((Number(d.revenue || 0) / maxDayRevenue) * 100);
                    return (
                      <div key={d.day} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-24 shrink-0 tabular-nums" dir="ltr">{fmtDate(d.day)}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-brand-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-gray-700 w-20 text-left shrink-0">{fmt(d.revenue)} ر.س</span>
                        <span className="text-xs text-gray-400 shrink-0">{d.count} حجز</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* By service table */}
            <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">أداء الخدمات</h2>
                <span className="text-xs text-gray-400">{byService.length} خدمة</span>
              </div>
              {byService.length === 0 ? (
                <div className="p-10 text-center">
                  <CalendarCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">لا توجد بيانات</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50">
                        {["الخدمة", "الحجوزات", "الإيرادات", "متوسط السعر"].map(h => (
                          <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {byService.map((s: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/40 transition-colors">
                          <td className="px-[10px] py-[6px] font-medium text-gray-800">{s.serviceName || "—"}</td>
                          <td className="px-[10px] py-[6px] text-center tabular-nums text-gray-600">{s.bookingCount}</td>
                          <td className="px-[10px] py-[6px] tabular-nums font-semibold text-gray-900">{fmt(s.totalRevenue)} ر.س</td>
                          <td className="px-[10px] py-[6px] tabular-nums text-gray-500">{fmt(s.avgPrice)} ر.س</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
            <div className="space-y-3">
              {[
                { q: "ما الفرق بين «إجمالي الإيرادات» و«المبالغ المحصّلة»؟", a: "الإيرادات تمثّل إجمالي قيمة الحجوزات (مدفوعة وغير مدفوعة)، بينما المحصّلة هي ما دُفع فعلياً حتى الآن." },
                { q: "هل الحجوزات الملغاة تُحتسب في التقرير؟", a: "بشكل افتراضي نعم، لكنك تستطيع استثناءها باختيار حالة محددة من قائمة «حالة الحجز»." },
                { q: "ما المقصود بـ «متوسط قيمة الحجز»؟", a: "إجمالي الإيرادات مقسومًا على عدد الحجوزات في الفترة المحددة." },
                { q: "لماذا يختلف هذا التقرير عن تقرير المبيعات (الفواتير)؟", a: "تقرير الحجوزات يركّز على الحجوزات كوحدة، أما تقرير المبيعات فيركّز على بنود الفواتير. الحجوزات قد لا يكون لها فاتورة بعد." },
              ].map(faq => (
                <details key={faq.q} className="border border-[#eef2f6] rounded-xl">
                  <summary className="px-[10px] py-[6px] text-sm text-gray-700 cursor-pointer font-medium hover:bg-[#f8fafc] rounded-xl">{faq.q}</summary>
                  <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
