import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, TrendingUp, Banknote, RotateCcw, Tag, Download } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";

function fmt(n: any) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() { return new Date().toISOString().split("T")[0]; }
function monthStart() {
  const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
}

const STATUS_OPTIONS = [
  { value: "", label: "الكل (بدون ملغاة)" },
  { value: "paid", label: "تم الدفع" },
  { value: "partially_paid", label: "مدفوع جزئياً" },
  { value: "issued", label: "بانتظار الدفع" },
];

export function SalesReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo,   setDateTo]   = useState(today());
  const [status,   setStatus]   = useState("");

  const params: Record<string, string> = { dateFrom, dateTo };
  if (status) params.status = status;

  const { data: res, loading } = useApi(() => financeApi.salesReport(params), [dateFrom, dateTo, status]);
  const report = res?.data;
  const summary = report?.summary || {};
  const items: any[] = report?.items || [];

  const exportCsv = () => {
    const header = "الخدمة,سعر الوحدة,الكمية,ضريبة القيمة المضافة,الخصم,الإجمالي,عدد الفواتير\n";
    const rows = items.map(it =>
      [it.description, it.unitPrice, it.totalQty, it.totalVat, it.totalDiscount, it.totalAmount, it.invoiceCount].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sales-report-${dateFrom}-${dateTo}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> التقارير</Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقارير المبيعات</span>
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
            <label className="block text-xs font-medium text-gray-500 mb-1.5">حالة الدفع</label>
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
              { icon: TrendingUp, label: "إجمالي المبيعات",    value: fmt(summary.totalSales),    color: "text-brand-600",   bg: "bg-brand-50" },
              { icon: RotateCcw, label: "إجمالي المسترجعات",   value: fmt(summary.totalRefunds),  color: "text-red-500",     bg: "bg-red-50" },
              { icon: Banknote,  label: "المبالغ المدفوعة",    value: fmt(summary.paidAmount),    color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: Banknote,  label: "صافي الدخل",           value: fmt(summary.netIncome),     color: "text-emerald-700", bg: "bg-emerald-100" },
              { icon: Tag,       label: "المبالغ المخصومة",    value: fmt(summary.totalDiscounts),color: "text-amber-600",   bg: "bg-amber-50" },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
                  <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-3", card.bg)}>
                    <Icon className={clsx("w-4 h-4", card.color)} />
                  </div>
                  <p className={clsx("text-xl font-bold tabular-nums", card.color)}>{card.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.label} ر.س</p>
                </div>
              );
            })}
          </div>

          {/* items table */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">تفاصيل المبيعات</h2>
              <span className="text-xs text-gray-400">{items.length} خدمة</span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">لا توجد مبيعات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {["الخدمة / الوصف", "سعر الوحدة", "الكمية", "قيمة الضريبة", "الخصم", "المبلغ الكلي", "المسترجع", "الفواتير"].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/40 transition-colors">
                        <td className="px-[10px] py-[6px] font-medium text-gray-800">{it.description}</td>
                        <td className="px-[10px] py-[6px] tabular-nums text-gray-600">{fmt(it.unitPrice)} ر.س</td>
                        <td className="px-[10px] py-[6px] text-center text-gray-600">{it.totalQty}</td>
                        <td className="px-[10px] py-[6px] tabular-nums text-gray-500">{fmt(it.totalVat)} ر.س</td>
                        <td className="px-[10px] py-[6px] tabular-nums text-amber-600">{fmt(it.totalDiscount)} ر.س</td>
                        <td className="px-[10px] py-[6px] tabular-nums font-bold text-gray-900">{fmt(it.totalAmount)} ر.س</td>
                        <td className="px-[10px] py-[6px] tabular-nums text-red-400">0.00 ر.س</td>
                        <td className="px-[10px] py-[6px]">
                          <span className="text-xs text-brand-500 font-medium">عرض ({it.invoiceCount})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t border-[#eef2f6]">
                      <td className="px-[10px] py-[6px] text-gray-700">الإجمالي</td>
                      <td className="px-[10px] py-[6px]" />
                      <td className="px-[10px] py-[6px] text-center text-gray-700">
                        {items.reduce((s: number, it: any) => s + Number(it.totalQty), 0)}
                      </td>
                      <td className="px-[10px] py-[6px] tabular-nums text-gray-600">{fmt(summary.totalVat)} ر.س</td>
                      <td className="px-[10px] py-[6px] tabular-nums text-amber-600">{fmt(summary.totalDiscounts)} ر.س</td>
                      <td className="px-[10px] py-[6px] tabular-nums text-brand-600">{fmt(summary.totalSales)} ر.س</td>
                      <td className="px-[10px] py-[6px] tabular-nums text-red-400">0.00 ر.س</td>
                      <td className="px-[10px] py-[6px] text-xs text-gray-400">{summary.invoiceCount} فاتورة</td>
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
                { q: "ما المقصود بـ «إجمالي المبيعات»؟", a: "إجمالي مبالغ الفواتير في الفترة المحددة (باستثناء الملغاة)." },
                { q: "هل «المبالغ المدفوعة» هي ما سأستلمه في حسابي البنكي؟", a: "نعم، هي المبالغ المسجّلة كدفعات مكتملة على الفواتير في الفترة المحددة." },
                { q: "ما المقصود بـ «المبالغ المخصومة»؟", a: "إجمالي الخصومات المطبّقة على بنود الفواتير." },
                { q: "ما المقصود بـ «صافي الدخل»؟", a: "المبالغ المدفوعة فعلياً بعد الخصومات والمسترجعات." },
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
