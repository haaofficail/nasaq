import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, RotateCcw, Download, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function today() { return new Date().toISOString().split("T")[0]; }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  completed: "مكتمل",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  completed: "bg-emerald-50 text-emerald-700",
};

export function RefundsReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());

  const params = { dateFrom, dateTo };
  const { data: res, loading, refetch } = useApi(() => financeApi.refundsReport(params), [dateFrom, dateTo]);
  const report = res?.data;
  const rows: any[] = report?.rows || [];
  const totalRefunds = report?.totalRefunds || 0;
  const count = report?.count || 0;
  const avgRefund = report?.avgRefund || 0;

  const exportCsv = () => {
    const header = "رقم الفاتورة,العميل,المبلغ,الحالة,التاريخ,الملاحظات\n";
    const csvRows = rows.map((r: any) =>
      [r.invoiceNumber, r.clientName, r.amount, STATUS_LABELS[r.status] || r.status,
       r.date ? fmtDate(r.date) : "", r.notes || ""].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + csvRows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `refunds-${dateFrom}-${dateTo}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> التقارير
        </Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقارير المسترجعات</span>
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
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                <RotateCcw className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-red-600">{fmt(totalRefunds)}</p>
              <p className="text-xs text-gray-400 mt-0.5">إجمالي المسترجعات ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400 mt-0.5">عدد الفواتير</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                <RotateCcw className="w-4 h-4 text-brand-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-brand-600">{fmt(avgRefund)}</p>
              <p className="text-xs text-gray-400 mt-0.5">متوسط المبلغ ر.س</p>
            </div>
          </div>

          {/* table */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">سجل المسترجعات</h2>
              <span className="text-xs text-gray-400">{rows.length} عملية</span>
            </div>
            {rows.length === 0 ? (
              <div className="text-center py-12">
                <RotateCcw className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">لا توجد مسترجعات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {["رقم الفاتورة", "العميل", "المبلغ", "الحالة", "التاريخ", "الملاحظات"].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/40 transition-colors">
                        <td className="px-[10px] py-[6px]">
                          {r.invoiceId ? (
                            <Link to={`/dashboard/invoices/${r.invoiceId}`} className="text-brand-500 hover:underline font-mono text-xs">
                              {r.invoiceNumber || "—"}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs text-gray-500">{r.invoiceNumber || "—"}</span>
                          )}
                        </td>
                        <td className="px-[10px] py-[6px] font-medium text-gray-800">{r.clientName || "—"}</td>
                        <td className="px-[10px] py-[6px] tabular-nums font-bold text-red-600">{fmt(r.amount)} ر.س</td>
                        <td className="px-[10px] py-[6px]">
                          <span className={clsx("text-xs px-2 py-0.5 rounded-full", STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600")}>
                            {STATUS_LABELS[r.status] || r.status || "—"}
                          </span>
                        </td>
                        <td className="px-[10px] py-[6px] text-xs text-gray-400 whitespace-nowrap">
                          {r.date ? fmtDate(r.date) : "—"}
                        </td>
                        <td className="px-[10px] py-[6px] text-xs text-gray-500 max-w-xs truncate">{r.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t border-[#eef2f6]">
                      <td colSpan={2} className="px-[10px] py-[6px] text-gray-700">الإجمالي</td>
                      <td className="px-[10px] py-[6px] tabular-nums text-red-600">{fmt(totalRefunds)} ر.س</td>
                      <td colSpan={3} className="px-[10px] py-[6px] text-xs text-gray-400">{rows.length} عملية</td>
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
                { q: "ما الفرق بين حالة «مقبول» و«مكتمل» في المسترجعات؟", a: "«مقبول» تعني أن طلب الاسترجاع تم الموافقة عليه لكن لم يُنفَّذ بعد، بينما «مكتمل» تعني أن المبلغ أُعيد فعلياً للعميل." },
                { q: "هل تؤثر المسترجعات على النظام المالي تلقائياً؟", a: "نعم، كل عملية استرجاع تُنشئ قيداً عكسياً تلقائياً في النظام المالي لضمان دقة الأرصدة والتقارير." },
                { q: "كيف يمكن تتبع سبب الاسترجاع؟", a: "يمكن مراجعة حقل «الملاحظات» في كل صف، وللتفاصيل الكاملة انتقل لصفحة الفاتورة مباشرة عبر رقم الفاتورة." },
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
