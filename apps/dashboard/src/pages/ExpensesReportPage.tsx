import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, Receipt, Download, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";

function fmt(n: any) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function today() { return new Date().toISOString().split("T")[0]; }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }

const CATEGORY_LABELS: Record<string, string> = {
  marketing: "تسويق", maintenance: "صيانة", rent: "إيجار",
  salaries: "رواتب", equipment: "معدات", transport: "نقل",
  utilities: "خدمات عامة", supplies: "مستلزمات", other: "أخرى",
};

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "bg-blue-100 text-blue-700", maintenance: "bg-orange-100 text-orange-700",
  rent: "bg-purple-100 text-purple-700", salaries: "bg-emerald-100 text-emerald-700",
  equipment: "bg-cyan-100 text-cyan-700", transport: "bg-amber-100 text-amber-700",
  utilities: "bg-red-100 text-red-700", supplies: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
};

export function ExpensesReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [category, setCategory] = useState("");

  const params: Record<string, string> = { dateFrom, dateTo };
  if (category) params.category = category;

  const { data: res, loading, refetch } = useApi(() => financeApi.expensesReport(params), [dateFrom, dateTo, category]);
  const report = res?.data;
  const summary = report?.summary || {};
  const byCategory: any[] = report?.byCategory || [];
  const expenses: any[] = report?.expenses || [];

  const exportCsv = () => {
    const header = "التاريخ,الفئة,الوصف,المبلغ,رقم الإيصال,ملاحظات\n";
    const rows = expenses.map(e =>
      [fmtDate(e.expense_date), CATEGORY_LABELS[e.category] || e.category, e.description, e.amount, e.receipt_number || "", e.notes || ""].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `expenses-${dateFrom}-${dateTo}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> التقارير</Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقرير المصروفات</span>
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
            <label className="block text-xs font-medium text-gray-500 mb-1.5">الفئة</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-[#eef2f6] rounded-xl focus:outline-none focus:border-brand-400 bg-white">
              <option value="">الكل</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                <Receipt className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-red-600">{fmt(summary.total)}</p>
              <p className="text-xs text-gray-400 mt-0.5">إجمالي المصروفات ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <p className="text-2xl font-bold text-gray-900">{summary.count || 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">عدد المصروفات</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <p className="text-2xl font-bold text-gray-900">{byCategory.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">فئات مختلفة</p>
            </div>
          </div>

          {/* by category */}
          {byCategory.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">توزيع المصروفات حسب الفئة</h3>
              <div className="space-y-3">
                {byCategory.map((cat: any) => {
                  const pct = summary.total > 0 ? Math.round((Number(cat.total) / summary.total) * 100) : 0;
                  return (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className={clsx("text-xs px-2 py-0.5 rounded-full w-24 text-center shrink-0", CATEGORY_COLORS[cat.category] || "bg-gray-100 text-gray-700")}>
                        {CATEGORY_LABELS[cat.category] || cat.category}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm tabular-nums text-gray-700 w-28 text-left">{fmt(cat.total)} ر.س</span>
                      <span className="text-xs text-gray-400 w-10 text-left">{cat.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* table */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">سجل المصروفات</h2>
              <span className="text-xs text-gray-400">{expenses.length} مصروف</span>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">لا توجد مصروفات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {["التاريخ", "الفئة", "الوصف", "المبلغ", "رقم الإيصال", "ملاحظات"].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e: any) => (
                      <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/40 transition-colors">
                        <td className="px-[10px] py-[6px] text-xs text-gray-400 whitespace-nowrap">{fmtDate(e.expense_date)}</td>
                        <td className="px-[10px] py-[6px]">
                          <span className={clsx("text-xs px-2 py-0.5 rounded-full", CATEGORY_COLORS[e.category] || "bg-gray-100 text-gray-700")}>
                            {CATEGORY_LABELS[e.category] || e.category}
                          </span>
                        </td>
                        <td className="px-[10px] py-[6px] text-gray-700 max-w-[180px] truncate">{e.description}</td>
                        <td className="px-[10px] py-[6px] tabular-nums font-bold text-red-600">{fmt(e.amount)} ر.س</td>
                        <td className="px-[10px] py-[6px] text-xs text-gray-400 font-mono">{e.receipt_number || "—"}</td>
                        <td className="px-[10px] py-[6px] text-xs text-gray-400 max-w-[140px] truncate">{e.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t border-[#eef2f6]">
                      <td colSpan={3} className="px-[10px] py-[6px] text-gray-700">الإجمالي</td>
                      <td className="px-[10px] py-[6px] tabular-nums text-red-600">{fmt(summary.total)} ر.س</td>
                      <td colSpan={2} className="px-[10px] py-[6px] text-xs text-gray-400">{expenses.length} مصروف</td>
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
                { q: "ما الفرق بين «فئة المصروف» و«الوصف»؟", a: "الفئة تصنيف عام (كـ صيانة أو تسويق)، أما الوصف فهو تفاصيل المصروف الفعلي مثل «إصلاح جهاز التكييف»." },
                { q: "هل تُحسب الرواتب ضمن المصروفات؟", a: "نعم، يمكن تسجيل الرواتب تحت فئة «رواتب» وستظهر في تقرير المصروفات وتُخصم من الأرباح." },
                { q: "ما المقصود بـ «رقم الإيصال»؟", a: "رقم الفاتورة أو الإيصال من المورّد، يُستخدم للمراجعة المحاسبية والتوثيق." },
                { q: "كيف يؤثر تقرير المصروفات على صافي الربح؟", a: "صافي الربح = إجمالي المبيعات − المصروفات. كلما ارتفعت المصروفات انخفض صافي الربح في التقارير المالية." },
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
