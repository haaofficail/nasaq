import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, UserCheck, Banknote, TrendingUp, Download } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";

function fmt(n: any) { return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function today()      { return new Date().toISOString().split("T")[0]; }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }

export function ProvidersReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo,   setDateTo]   = useState(today());

  const { data: res, loading } = useApi(() => financeApi.providersReport({ dateFrom, dateTo }), [dateFrom, dateTo]);
  const report    = res?.data;
  const summary   = report?.summary   || {};
  const providers: any[] = report?.providers || [];

  const exportCsv = () => {
    const header = "المزود,الحجوزات,المكتملة,الملغاة,الإيرادات,متوسط الحجز\n";
    const rows = providers.map((p: any) =>
      [p.providerName, p.bookingCount, p.completedCount, p.cancelledCount, p.totalRevenue, p.avgBookingValue].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `providers-${dateFrom}-${dateTo}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> التقارير</Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقارير مقدمي الخدمة</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">من تاريخ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">إلى تاريخ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400" />
          </div>
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-colors mr-auto">
            <Download className="w-4 h-4" /> تصدير CSV
          </button>
        </div>
      </div>

      {loading ? <PageSkeleton /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: UserCheck,  label: "عدد المزودين",   value: summary.providerCount ?? providers.length, color: "text-brand-600",   bg: "bg-brand-50" },
              { icon: Banknote,   label: "إجمالي الإيرادات", value: `${fmt(summary.totalRevenue)} ر.س`,       color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: TrendingUp, label: "أفضل مزود",       value: summary.topProvider || "—",                color: "text-violet-600",  bg: "bg-violet-50" },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-3", card.bg)}>
                    <Icon className={clsx("w-4 h-4", card.color)} />
                  </div>
                  <p className={clsx("text-xl font-bold tabular-nums truncate", card.color)}>{card.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">أداء مقدمي الخدمة</h2>
              <span className="text-xs text-gray-400">{providers.length} موظف</span>
            </div>
            {providers.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">لا توجد بيانات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {["المزود", "الحجوزات", "المكتملة", "الملغاة", "معدل الإنجاز", "الإيرادات", "متوسط الحجز"].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((p: any, i: number) => {
                      const rate = p.bookingCount > 0 ? Math.round((p.completedCount / p.bookingCount) * 100) : 0;
                      return (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800">{p.providerName}</td>
                          <td className="px-4 py-3 text-center tabular-nums text-gray-600">{p.bookingCount}</td>
                          <td className="px-4 py-3 text-center tabular-nums text-emerald-600">{p.completedCount}</td>
                          <td className="px-4 py-3 text-center tabular-nums text-red-400">{p.cancelledCount}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={clsx("h-full rounded-full", rate >= 80 ? "bg-emerald-400" : rate >= 50 ? "bg-amber-400" : "bg-red-400")}
                                  style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{rate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 tabular-nums font-semibold text-gray-900">{fmt(p.totalRevenue)} ر.س</td>
                          <td className="px-4 py-3 tabular-nums text-gray-500">{fmt(p.avgBookingValue)} ر.س</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
            <div className="space-y-3">
              {[
                { q: "ما «معدل الإنجاز»؟", a: "نسبة الحجوزات المكتملة من إجمالي حجوزات الموظف. موظف بمعدل 90%+ يُنجز معظم حجوزاته بنجاح." },
                { q: "لماذا يظهر موظف بصفر حجوزات؟", a: "هذا الموظف لم يُسنَد له أي حجوز في الفترة المحددة. تحقق من إعدادات تعيين الحجوزات." },
                { q: "كيف أستخدم هذا التقرير لتقييم الفريق؟", a: "قارن معدل الإنجاز وإجمالي الإيرادات بين الموظفين. استخدمه في مراجعات الأداء الدورية." },
              ].map(faq => (
                <details key={faq.q} className="border border-gray-100 rounded-xl">
                  <summary className="px-4 py-3 text-sm text-gray-700 cursor-pointer font-medium hover:bg-gray-50 rounded-xl">{faq.q}</summary>
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
