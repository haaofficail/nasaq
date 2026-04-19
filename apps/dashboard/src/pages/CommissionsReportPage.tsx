import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, TrendingUp, Users, Percent, Download, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function today() { return new Date().toISOString().split("T")[0]; }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }

export function CommissionsReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());

  const params = { dateFrom, dateTo };
  const { data: res, loading, refetch } = useApi(() => financeApi.commissionsReport(params), [dateFrom, dateTo]);
  const report = res?.data;
  const rows: any[] = report?.byMember || [];
  const totalCommissions = report?.summary?.totalCommissions || 0;
  const memberCount = report?.summary?.memberCount || 0;
  const avgRate = report?.summary?.avgRate || 0;

  const exportCsv = () => {
    const header = "الموظف,عدد الحجوزات,إجمالي المبيعات,نسبة العمولة%,مبلغ العمولة\n";
    const csvRows = rows.map((r: any) =>
      [r.memberName, r.bookingCount, r.totalRevenue, r.commissionRate, r.commissionAmount].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + csvRows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `commissions-${dateFrom}-${dateTo}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> التقارير
        </Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقارير العمولات</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold tabular-nums text-emerald-700">{fmt(totalCommissions)}</p>
              <p className="text-xs text-gray-400 mt-0.5">إجمالي العمولات ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                <Users className="w-4 h-4 text-brand-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-brand-600">{memberCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">عدد الأعضاء</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
                <Percent className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-purple-700">{fmt(avgRate)}</p>
              <p className="text-xs text-gray-400 mt-0.5">متوسط النسبة %</p>
            </div>
          </div>

          {/* table */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">تفاصيل العمولات</h2>
              <span className="text-xs text-gray-400">{rows.length} موظف</span>
            </div>
            {rows.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">لا توجد عمولات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {["الموظف", "عدد الحجوزات", "إجمالي المبيعات", "نسبة العمولة%", "مبلغ العمولة"].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/40 transition-colors">
                        <td className="px-[10px] py-[6px] font-medium text-gray-800">{r.memberName || "—"}</td>
                        <td className="px-[10px] py-[6px] tabular-nums text-gray-600">{r.bookingCount || 0}</td>
                        <td className="px-[10px] py-[6px] tabular-nums text-gray-700">{fmt(r.totalRevenue)} ر.س</td>
                        <td className="px-[10px] py-[6px]">
                          <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full tabular-nums">
                            {fmt(r.commissionRate)}%
                          </span>
                        </td>
                        <td className="px-[10px] py-[6px] tabular-nums font-bold text-emerald-700">{fmt(r.commissionAmount)} ر.س</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t border-[#eef2f6]">
                      <td className="px-[10px] py-[6px] text-gray-700">الإجمالي</td>
                      <td className="px-[10px] py-[6px] tabular-nums text-gray-600">
                        {rows.reduce((s: number, r: any) => s + (Number(r.bookingCount) || 0), 0)}
                      </td>
                      <td className="px-[10px] py-[6px] tabular-nums text-gray-700">
                        {fmt(rows.reduce((s: number, r: any) => s + (Number(r.totalRevenue) || 0), 0))} ر.س
                      </td>
                      <td className="px-[10px] py-[6px]" />
                      <td className="px-[10px] py-[6px] tabular-nums text-emerald-700">{fmt(totalCommissions)} ر.س</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
            <div className="space-y-3">
              {[
                { q: "كيف تُحسب نسبة العمولة لكل موظف؟", a: "تُحسب العمولة بناءً على النسبة المئوية المحددة في إعدادات الموظف مضروبةً في إجمالي مبيعاته خلال الفترة المحددة." },
                { q: "هل تشمل العمولة الحجوزات الملغاة؟", a: "لا، تُحتسب العمولة على الحجوزات المكتملة فقط، وتُستثنى الحجوزات الملغاة أو المسترجعة." },
                { q: "ما الفرق بين «إجمالي المبيعات» و«مبلغ العمولة»؟", a: "إجمالي المبيعات هو مجموع قيمة الحجوزات التي أتمها الموظف، بينما مبلغ العمولة هو النسبة المستحقة له من هذا الإجمالي." },
                { q: "هل يمكن تعديل نسبة العمولة بأثر رجعي؟", a: "لا، التقرير يعكس النسبة المطبقة وقت إتمام كل حجز. لتعديل النسب القادمة يمكن تحديثها من إعدادات الموظف." },
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
