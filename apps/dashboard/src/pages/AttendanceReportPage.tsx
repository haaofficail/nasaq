import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, CalendarCheck, UserX, XCircle, TrendingUp, Download, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";

function today() { return new Date().toISOString().split("T")[0]; }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
        <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 w-9 text-left">{value}%</span>
    </div>
  );
}

export function AttendanceReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo,   setDateTo]   = useState(today());

  const params = { dateFrom, dateTo };
  const { data: res, loading, refetch } = useApi(() => financeApi.attendanceReport(params), [dateFrom, dateTo]);
  const report = res?.data;
  const byService: any[] = report?.byService || [];
  const total         = report?.total         || 0;
  const completed     = report?.completed     || 0;
  const noShow        = report?.noShow        || 0;
  const cancelled     = report?.cancelled     || 0;
  const attendanceRate = report?.attendanceRate || 0;
  const noShowRate     = report?.noShowRate     || 0;

  const exportCsv = () => {
    const header = "الخدمة,الإجمالي,مكتملة,غياب,ملغاة,نسبة الحضور\n";
    const csvRows = byService.map((r: any) =>
      [r.serviceName, r.total, r.completed, r.noShow, r.cancelled, `${r.rate}%`].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + csvRows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `attendance-${dateFrom}-${dateTo}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> التقارير
        </Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقرير حضور الحجوزات</span>
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
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                <CalendarCheck className="w-4 h-4 text-brand-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-brand-600">{total}</p>
              <p className="text-xs text-gray-400 mt-0.5">إجمالي الحجوزات</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold tabular-nums text-emerald-700">{attendanceRate}%</p>
              <p className="text-xs text-gray-400 mt-0.5">نسبة الحضور</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                <UserX className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-amber-600">{noShow}</p>
              <p className="text-xs text-gray-400 mt-0.5">غياب ({noShowRate}%)</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-red-600">{cancelled}</p>
              <p className="text-xs text-gray-400 mt-0.5">ملغاة</p>
            </div>
          </div>

          {/* Donut-style summary bar */}
          {total > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">توزيع الحجوزات</h3>
              <div className="h-3 rounded-full overflow-hidden flex bg-gray-100">
                <div className="bg-emerald-400 h-full transition-all" style={{ width: `${(completed / total) * 100}%` }} />
                <div className="bg-amber-400 h-full transition-all"  style={{ width: `${(noShow    / total) * 100}%` }} />
                <div className="bg-red-400  h-full transition-all"   style={{ width: `${(cancelled / total) * 100}%` }} />
              </div>
              <div className="flex flex-wrap gap-4 mt-3">
                {[
                  { label: "مكتملة",  count: completed, color: "bg-emerald-400" },
                  { label: "غياب",    count: noShow,    color: "bg-amber-400"  },
                  { label: "ملغاة",   count: cancelled, color: "bg-red-400"    },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className={clsx("w-2.5 h-2.5 rounded-full shrink-0", s.color)} />
                    {s.label}: <span className="font-semibold tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By-service table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">تفصيل حسب الخدمة</h2>
              <span className="text-xs text-gray-400">{byService.length} خدمة</span>
            </div>
            {byService.length === 0 ? (
              <div className="text-center py-12">
                <CalendarCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">لا توجد حجوزات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {["الخدمة", "الإجمالي", "مكتملة", "غياب", "ملغاة", "نسبة الحضور"].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byService.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{r.serviceName}</td>
                        <td className="px-4 py-3 tabular-nums text-gray-700">{r.total}</td>
                        <td className="px-4 py-3 tabular-nums text-emerald-700 font-medium">{r.completed}</td>
                        <td className="px-4 py-3 tabular-nums text-amber-600">{r.noShow}</td>
                        <td className="px-4 py-3 tabular-nums text-red-500">{r.cancelled}</td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <RateBar value={r.rate} color={r.rate >= 70 ? "bg-emerald-400" : r.rate >= 40 ? "bg-amber-400" : "bg-red-400"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
            <div className="space-y-3">
              {[
                { q: "ما الفرق بين «غياب» و«ملغى»؟", a: "«غياب» يعني العميل لم يُلغِ الحجز ولم يحضر، وهذا يُعتبر فرصة ضائعة. «ملغى» يعني العميل أبلغ بالإلغاء قبل الموعد." },
                { q: "كيف تُحسب نسبة الحضور؟", a: "نسبة الحضور = (الحجوزات المكتملة ÷ إجمالي الحجوزات) × 100. الحجوزات المعلقة والقادمة تُحسب في الإجمالي." },
                { q: "كيف أُقلل نسبة الغياب؟", a: "فعّل التذكيرات التلقائية قبل الموعد بـ 24 ساعة وقبل ساعة، واطلب عربوناً مسبقاً للحجوزات ذات الطلب العالي." },
                { q: "هل يمكن تصفية التقرير حسب موظف معين؟", a: "سيُضاف تصفية حسب الموظف في تحديث قادم. حالياً التقرير يُجمع حسب الخدمة." },
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
