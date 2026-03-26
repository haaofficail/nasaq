import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, TrendingUp, AlertCircle, Download, RefreshCw } from "lucide-react";
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

const STATUS_LABELS: Record<string, string> = {
  paid: "مدفوع", issued: "بانتظار الدفع", partially_paid: "مدفوع جزئياً", overdue: "متأخر", draft: "مسودة", cancelled: "ملغى",
};
const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700", issued: "bg-amber-50 text-amber-700",
  partially_paid: "bg-blue-50 text-blue-700", overdue: "bg-red-50 text-red-600",
};

export function CollectionReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());

  const params = { dateFrom, dateTo };
  const { data: res, loading, refetch } = useApi(() => financeApi.collectionReport(params), [dateFrom, dateTo]);
  const report = res?.data;
  const summary = report?.summary || {};
  const byStatus: any[] = report?.byStatus || [];
  const overdueInvoices: any[] = report?.overdueInvoices || [];

  const exportCsv = () => {
    const header = "رقم الفاتورة,اسم العميل,الجوال,الإجمالي,المدفوع,المتبقي,تاريخ الاستحقاق\n";
    const rows = overdueInvoices.map(inv =>
      [inv.invoice_number, inv.buyer_name, inv.buyer_phone || "",
       inv.total_amount, inv.paid_amount || "0",
       (Number(inv.total_amount) - Number(inv.paid_amount || 0)).toFixed(2),
       inv.due_date ? fmtDate(inv.due_date) : ""].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `collection-${dateFrom}-${dateTo}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> التقارير</Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقرير التحصيل</span>
      </div>

      {/* filters */}
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
          {/* summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "إجمالي الفواتير",    value: fmt(summary.totalIssued),    color: "text-gray-900",    sub: "ر.س" },
              { label: "المحصّل فعلاً",       value: fmt(summary.totalCollected), color: "text-emerald-700", sub: "ر.س" },
              { label: "المتبقي غير المحصّل", value: fmt(summary.outstanding),   color: "text-red-600",     sub: "ر.س" },
              { label: "نسبة التحصيل",        value: `${summary.collectionRate || 0}%`, color: "text-brand-600", sub: "" },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className={clsx("text-2xl font-bold tabular-nums", card.color)}>{card.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.label} {card.sub}</p>
              </div>
            ))}
          </div>

          {/* collection rate bar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">معدل التحصيل</h3>
              <span className="text-sm font-bold text-brand-600">{summary.collectionRate || 0}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-400 rounded-full transition-all" style={{ width: `${summary.collectionRate || 0}%` }} />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
              <div className="flex gap-4">
                <span><span className="font-bold text-emerald-600">{summary.paidCount}</span> مدفوعة</span>
                <span><span className="font-bold text-amber-500">{summary.pendingCount}</span> معلّقة</span>
                <span><span className="font-bold text-blue-500">{summary.partialCount}</span> جزئية</span>
                <span><span className="font-bold text-red-500">{summary.overdueCount}</span> متأخرة</span>
              </div>
              <span>{summary.totalCount} فاتورة</span>
            </div>
          </div>

          {/* by status */}
          {byStatus.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">توزيع الفواتير حسب الحالة</h3>
              <div className="space-y-2">
                {byStatus.map((s: any) => (
                  <div key={s.status} className="flex items-center gap-3 text-sm">
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full w-28 text-center shrink-0", STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600")}>
                      {STATUS_LABELS[s.status] || s.status}
                    </span>
                    <span className="text-gray-600 w-8 text-left">{s.count}</span>
                    <span className="tabular-nums text-gray-800 font-medium">{fmt(s.total)} ر.س</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* outstanding invoices */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-gray-900 text-sm">الفواتير غير المحصّلة</h2>
              <span className="text-xs text-gray-400 mr-auto">{overdueInvoices.length} فاتورة</span>
            </div>
            {overdueInvoices.length === 0 ? (
              <div className="text-center py-10">
                <TrendingUp className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">جميع الفواتير محصّلة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {["رقم الفاتورة", "العميل", "الجوال", "الإجمالي", "المدفوع", "المتبقي", "تاريخ الاستحقاق"].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overdueInvoices.map((inv: any) => {
                      const remaining = Number(inv.total_amount) - Number(inv.paid_amount || 0);
                      const isOverdue = inv.due_date && new Date(inv.due_date) < new Date();
                      return (
                        <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3">
                            <Link to={`/dashboard/invoices/${inv.id}`} className="text-brand-500 hover:underline font-mono text-xs">
                              {inv.invoice_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{inv.buyer_name}</td>
                          <td className="px-4 py-3 text-xs text-gray-400" dir="ltr">{inv.buyer_phone || "—"}</td>
                          <td className="px-4 py-3 tabular-nums text-gray-700">{fmt(inv.total_amount)} ر.س</td>
                          <td className="px-4 py-3 tabular-nums text-emerald-600">{fmt(inv.paid_amount || 0)} ر.س</td>
                          <td className="px-4 py-3 tabular-nums font-bold text-red-600">{fmt(remaining)} ر.س</td>
                          <td className={clsx("px-4 py-3 text-xs whitespace-nowrap", isOverdue ? "text-red-500 font-medium" : "text-gray-400")}>
                            {inv.due_date ? fmtDate(inv.due_date) : "—"}
                            {isOverdue && <span className="mr-1 text-red-400">(متأخر)</span>}
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
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
            <div className="space-y-3">
              {[
                { q: "ما المقصود بـ «نسبة التحصيل»؟", a: "هي نسبة ما تم تحصيله فعلياً من إجمالي مبالغ الفواتير. مثلاً: إذا أصدرت فواتير بـ 100,000 ر.س وحصّلت 80,000 ر.س فالنسبة 80%." },
                { q: "ما الفرق بين «متأخر» و«بانتظار الدفع»؟", a: "«بانتظار الدفع» يعني لم يحن موعد الاستحقاق بعد، أما «متأخر» فيعني تجاوز تاريخ الاستحقاق ولم يُسدَّد." },
                { q: "ما المقصود بـ «المبلغ المتبقي»؟", a: "هو الفرق بين إجمالي الفاتورة والمبالغ المدفوعة منها حتى الآن." },
                { q: "لماذا لا تظهر الفواتير الملغاة في تقرير التحصيل؟", a: "يستثني التقرير الفواتير الملغاة لأنها لا تُمثّل إيرادات حقيقية ولا التزامات قائمة." },
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
