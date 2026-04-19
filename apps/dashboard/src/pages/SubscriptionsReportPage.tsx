import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, CreditCard, Users, TrendingUp, Download, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function today() { return new Date().toISOString().split("T")[0]; }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  paused: "موقوف",
  cancelled: "ملغى",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-yellow-50 text-yellow-700",
  cancelled: "bg-red-50 text-red-600",
};

const STATUS_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "active", label: "نشط" },
  { value: "paused", label: "موقوف" },
  { value: "cancelled", label: "ملغى" },
];

export function SubscriptionsReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [status, setStatus] = useState("");

  const params = { dateFrom, dateTo, ...(status ? { status } : {}) };
  const { data: res, loading, refetch } = useApi(() => financeApi.subscriptionsReport(params), [dateFrom, dateTo, status]);
  const report = res?.data;
  const rows: any[] = report?.rows || [];
  const totalSubscriptions = report?.totalSubscriptions || 0;
  const activeCount = report?.activeCount || 0;
  const totalRevenue = report?.totalRevenue || 0;
  const avgPrice = report?.avgPrice || 0;

  const exportCsv = () => {
    const header = "العميل,الجوال,الاشتراك,السعر,الاستخدام,تاريخ البدء,الحالة\n";
    const csvRows = rows.map((r: any) =>
      [r.clientName, r.phone, r.subscriptionName, r.price,
       `${r.usedSessions || 0}/${r.totalSessions || 0}`,
       r.startDate ? fmtDate(r.startDate) : "",
       STATUS_LABELS[r.status] || r.status].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + csvRows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `subscriptions-${dateFrom}-${dateTo}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> التقارير
        </Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقارير الاشتراكات</span>
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
            <label className="block text-xs font-medium text-gray-500 mb-1.5">الحالة</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-[#eef2f6] rounded-xl focus:outline-none focus:border-brand-400 bg-white">
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mr-auto">
            <button onClick={refetch}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#eef2f6] text-sm text-gray-600 hover:bg-[#f8fafc] transition-colors">
              <RefreshCw className="w-4 h-4" /> تحديث
            </button>
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f8fafc] border border-[#eef2f6] text-sm text-gray-600 hover:bg-gray-100 transition-colors">
              <Download className="w-4 h-4" /> تصدير CSV
            </button>
          </div>
        </div>
      </div>

      {loading ? <PageSkeleton /> : (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                <CreditCard className="w-4 h-4 text-brand-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-brand-600">{totalSubscriptions}</p>
              <p className="text-xs text-gray-400 mt-0.5">إجمالي الاشتراكات</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold tabular-nums text-emerald-700">{activeCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">نشطة</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-purple-700">{fmt(totalRevenue)}</p>
              <p className="text-xs text-gray-400 mt-0.5">إجمالي الإيرادات ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <p className="text-xl font-bold tabular-nums text-gray-900">{fmt(avgPrice)}</p>
              <p className="text-xs text-gray-400 mt-0.5">متوسط السعر ر.س</p>
            </div>
          </div>

          {/* table */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">تفاصيل الاشتراكات</h2>
              <span className="text-xs text-gray-400">{rows.length} اشتراك</span>
            </div>
            {rows.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">لا توجد اشتراكات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {["العميل", "الجوال", "الاشتراك", "السعر", "الاستخدام", "تاريخ البدء", "الحالة"].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, i: number) => {
                      const used = Number(r.usedSessions) || 0;
                      const total = Number(r.totalSessions) || 0;
                      const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                      return (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/40 transition-colors">
                          <td className="px-[10px] py-[6px] font-medium text-gray-800">{r.clientName || "—"}</td>
                          <td className="px-[10px] py-[6px] text-xs text-gray-400" dir="ltr">{r.phone || "—"}</td>
                          <td className="px-[10px] py-[6px] text-gray-700">{r.subscriptionName || "—"}</td>
                          <td className="px-[10px] py-[6px] tabular-nums font-bold text-emerald-700">{fmt(r.price)} ر.س</td>
                          <td className="px-[10px] py-[6px]">
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={clsx("h-full rounded-full transition-all", pct >= 80 ? "bg-red-400" : "bg-brand-400")}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">{used}/{total}</span>
                            </div>
                          </td>
                          <td className="px-[10px] py-[6px] text-xs text-gray-400 whitespace-nowrap">
                            {r.startDate ? fmtDate(r.startDate) : "—"}
                          </td>
                          <td className="px-[10px] py-[6px]">
                            <span className={clsx("text-xs px-2 py-0.5 rounded-full", STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600")}>
                              {STATUS_LABELS[r.status] || r.status || "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
            <div className="space-y-3">
              {[
                { q: "ما الفرق بين الاشتراك «الموقوف» و«الملغى»؟", a: "الاشتراك الموقوف يمكن استئنافه لاحقاً ويحتفظ بالرصيد المتبقي، بينما الاشتراك الملغى منتهٍ نهائياً ولا يمكن استرداده." },
                { q: "كيف تُحسب نسبة الاستخدام في شريط التقدم؟", a: "تمثل نسبة الجلسات المستخدمة إلى إجمالي الجلسات المتاحة في الاشتراك، وتتحول للون الأحمر عند تجاوز 80% للتنبيه." },
                { q: "هل يشمل «إجمالي الإيرادات» الاشتراكات الملغاة؟", a: "نعم، يشمل إجمالي مبالغ جميع الاشتراكات التي بدأت في الفترة المحددة بغض النظر عن حالتها الحالية." },
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
