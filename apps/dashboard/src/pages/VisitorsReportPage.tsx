import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, Globe, Smartphone, Users, TrendingUp, Download, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";

function today() { return new Date().toISOString().split("T")[0]; }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }

export function VisitorsReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo,   setDateTo]   = useState(today());

  const params = { dateFrom, dateTo };
  const { data: res, loading, refetch } = useApi(() => financeApi.visitorsReport(params), [dateFrom, dateTo]);
  const report = res?.data;
  const daily: any[] = report?.daily || [];
  const totalBookings = report?.totalBookings || 0;
  const onlineCount   = report?.onlineCount   || 0;
  const manualCount   = report?.manualCount   || 0;
  const onlineRate    = report?.onlineRate    || 0;

  // Simple sparkline heights
  const maxTotal = Math.max(...daily.map((d: any) => d.total), 1);

  const exportCsv = () => {
    const header = "التاريخ,إلكتروني,يدوي,الإجمالي\n";
    const csvRows = daily.map((r: any) =>
      [fmtDate(r.date), r.online, r.manual, r.total].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + csvRows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `visitors-${dateFrom}-${dateTo}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> التقارير
        </Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقرير مصادر الحجوزات</span>
      </div>

      {/* Filters */}
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
          <div className="flex gap-2 mr-auto">
            <button onClick={refetch}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <RefreshCw className="w-4 h-4" /> تحديث
            </button>
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-colors">
              <Download className="w-4 h-4" /> تصدير CSV
            </button>
          </div>
        </div>
      </div>

      {loading ? <PageSkeleton /> : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                <Users className="w-4 h-4 text-brand-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-brand-600">{totalBookings}</p>
              <p className="text-xs text-gray-400 mt-0.5">إجمالي الحجوزات</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <Globe className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold tabular-nums text-emerald-700">{onlineCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">إلكترونية</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                <Smartphone className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-purple-700">{manualCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">يدوية</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-amber-600">{onlineRate}%</p>
              <p className="text-xs text-gray-400 mt-0.5">نسبة الحجز الإلكتروني</p>
            </div>
          </div>

          {/* Channel breakdown */}
          {totalBookings > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">مصادر الحجوزات</h3>
              <div className="h-3 rounded-full overflow-hidden flex bg-gray-100 mb-3">
                <div className="bg-emerald-400 h-full transition-all" style={{ width: `${onlineRate}%` }} />
                <div className="bg-purple-400 h-full transition-all" style={{ width: `${100 - onlineRate}%` }} />
              </div>
              <div className="flex flex-wrap gap-6">
                {[
                  { label: "إلكتروني (عبر رابط الحجز أو الموقع)", count: onlineCount, color: "bg-emerald-400", pct: onlineRate },
                  { label: "يدوي (أضافه الموظف من الداشبورد أو POS)",  count: manualCount, color: "bg-purple-400",  pct: 100 - onlineRate },
                ].map(s => (
                  <div key={s.label} className="flex items-start gap-2.5">
                    <span className={clsx("w-3 h-3 rounded-full shrink-0 mt-0.5", s.color)} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 tabular-nums">{s.count} <span className="text-gray-400 font-normal">({s.pct}%)</span></p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily trend chart */}
          {daily.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">الاتجاه اليومي</h3>
              <div className="flex items-end gap-1 h-32">
                {daily.map((d: any, i: number) => {
                  const h = maxTotal > 0 ? Math.max(4, Math.round((d.total / maxTotal) * 100)) : 4;
                  const onlineH = d.total > 0 ? Math.round((d.online / d.total) * h) : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
                      <div className="w-full flex flex-col justify-end rounded-t overflow-hidden" style={{ height: `${h}%` }}>
                        <div className="w-full bg-emerald-400" style={{ height: `${onlineH}%`, minHeight: d.online > 0 ? "2px" : "0" }} />
                        <div className="w-full bg-purple-300" style={{ height: `${h - onlineH}%`, minHeight: d.manual > 0 ? "2px" : "0" }} />
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        <p className="font-semibold">{fmtDate(d.date)}</p>
                        <p>إلكتروني: {d.online}</p>
                        <p>يدوي: {d.manual}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> إلكتروني
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-300" /> يدوي
                </span>
              </div>
            </div>
          )}

          {/* Daily table */}
          {daily.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">التفصيل اليومي</h2>
                <span className="text-xs text-gray-400">{daily.length} يوم</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {["التاريخ", "إلكتروني", "يدوي", "الإجمالي"].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="px-4 py-3 tabular-nums text-emerald-700 font-medium">{r.online}</td>
                        <td className="px-4 py-3 tabular-nums text-purple-600">{r.manual}</td>
                        <td className="px-4 py-3 tabular-nums font-bold text-gray-800">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {daily.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-12">
              <Globe className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">لا توجد حجوزات في هذه الفترة</p>
            </div>
          )}

          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
            <div className="space-y-3">
              {[
                { q: "ما الفرق بين الحجز الإلكتروني واليدوي؟", a: "الإلكتروني: أنشأه العميل بنفسه عبر رابط الحجز العام أو الموقع. اليدوي: أضافه موظف من الداشبورد أو نقطة البيع." },
                { q: "كيف أزيد نسبة الحجز الإلكتروني؟", a: "شارك رابط الحجز عبر واتساب وانستغرام، وأضفه في Bio الحساب، وفعّل زر الحجز في إعدادات الموقع." },
                { q: "هل يشمل التقرير حجوزات الفروع المختلفة؟", a: "نعم، يشمل جميع الحجوزات على مستوى المنشأة بكل فروعها." },
                { q: "لماذا لا تظهر زيارات الموقع (Page Views)؟", a: "يعتمد النظام حالياً على تحليل مصادر الحجوزات الفعلية. لتتبع زيارات الصفحة، يمكن ربط Google Analytics في إعدادات الموقع." },
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
