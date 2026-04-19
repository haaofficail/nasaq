import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, Banknote, CreditCard, Download, RefreshCw } from "lucide-react";
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

const METHOD_LABELS: Record<string, string> = {
  cash: "نقداً",
  bank_transfer: "تحويل بنكي",
  card: "بطاقة",
  online: "دفع إلكتروني",
  check: "شيك",
  other: "أخرى",
};

export function PaymentsReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());

  const params = { dateFrom, dateTo };
  const { data: res, loading, refetch } = useApi(() => financeApi.paymentsReport(params), [dateFrom, dateTo]);
  const report = res?.data;
  const payments: any[] = report?.payments || [];
  const byMethod: any[] = report?.byMethod || [];
  const total = report?.total || 0;

  const exportCsv = () => {
    const header = "رقم الفاتورة,اسم العميل,الجوال,المبلغ,طريقة الدفع,اسم المحوّل,الرقم المرجعي,تاريخ الدفع,وقت الإنشاء\n";
    const rows = payments.map(p =>
      [p.invoice_number, p.buyer_name, p.buyer_phone, p.amount, METHOD_LABELS[p.payment_method] || p.payment_method,
       p.transfer_name || "", p.reference || "", p.payment_date ? fmtDate(p.payment_date) : "", fmtDate(p.created_at)].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `payments-${dateFrom}-${dateTo}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> التقارير</Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقارير المدفوعات</span>
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
          {/* summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <Banknote className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold tabular-nums text-emerald-700">{fmt(total)}</p>
              <p className="text-xs text-gray-400 mt-0.5">إجمالي المحصّل ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
              <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">عدد العمليات</p>
            </div>
            {byMethod.slice(0, 2).map((m: any) => (
              <div key={m.payment_method} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <CreditCard className="w-4 h-4 text-brand-500" />
                </div>
                <p className="text-xl font-bold tabular-nums text-brand-600">{fmt(m.total)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{METHOD_LABELS[m.payment_method] || m.payment_method} ر.س</p>
              </div>
            ))}
          </div>

          {/* by method breakdown */}
          {byMethod.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">توزيع طرق الدفع</h3>
              <div className="space-y-3">
                {byMethod.map((m: any) => {
                  const pct = total > 0 ? Math.round((Number(m.total) / total) * 100) : 0;
                  return (
                    <div key={m.payment_method} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-28 shrink-0">{METHOD_LABELS[m.payment_method] || m.payment_method}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm tabular-nums text-gray-700 w-28 text-left">{fmt(m.total)} ر.س</span>
                      <span className="text-xs text-gray-400 w-10 text-left">{m.count} عملية</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* payments table */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">سجل المدفوعات</h2>
              <span className="text-xs text-gray-400">{payments.length} عملية</span>
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <Banknote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">لا توجد مدفوعات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {["رقم الفاتورة", "العميل", "الجوال", "المبلغ", "طريقة الدفع", "اسم المحوّل", "المرجع", "تاريخ الدفع"].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/40 transition-colors">
                        <td className="px-[10px] py-[6px]">
                          <Link to={`/dashboard/invoices/${p.invoice_id}`} className="text-brand-500 hover:underline font-mono text-xs">
                            {p.invoice_number}
                          </Link>
                        </td>
                        <td className="px-[10px] py-[6px] font-medium text-gray-800">{p.buyer_name}</td>
                        <td className="px-[10px] py-[6px] text-xs text-gray-400" dir="ltr">{p.buyer_phone || "—"}</td>
                        <td className="px-[10px] py-[6px] tabular-nums font-bold text-emerald-700">{fmt(p.amount)} ر.س</td>
                        <td className="px-[10px] py-[6px]">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {METHOD_LABELS[p.payment_method] || p.payment_method}
                          </span>
                        </td>
                        <td className="px-[10px] py-[6px] text-xs text-gray-500">{p.transfer_name || "—"}</td>
                        <td className="px-[10px] py-[6px] text-xs text-gray-400 font-mono">{p.reference || "—"}</td>
                        <td className="px-[10px] py-[6px] text-xs text-gray-400 whitespace-nowrap">
                          {p.payment_date ? fmtDate(p.payment_date) : fmtDate(p.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t border-[#eef2f6]">
                      <td colSpan={3} className="px-[10px] py-[6px] text-gray-700">الإجمالي</td>
                      <td className="px-[10px] py-[6px] tabular-nums text-emerald-700">{fmt(total)} ر.س</td>
                      <td colSpan={4} className="px-[10px] py-[6px] text-xs text-gray-400">{payments.length} عملية</td>
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
                { q: "ما الفرق بين «تاريخ الدفع» و«وقت الإنشاء»؟", a: "«وقت الإنشاء» هو وقت تسجيل العملية في النظام، بينما «تاريخ الدفع» هو التاريخ الفعلي للدفع الذي يحدده المستخدم وقد يختلف عنه." },
                { q: "ما المقصود بـ «اسم المحوّل» و«الرقم المرجعي»؟", a: "يظهران في حالة التحويل البنكي فقط؛ اسم صاحب الحساب المحوِّل والرقم المرجعي للعملية المصرفية." },
                { q: "لماذا لا تتطابق «إجمالي المدفوعات» مع «إجمالي المبيعات» في تقرير المبيعات؟", a: "لأن بعض الفواتير قد تكون مدفوعة جزئياً أو لا تزال بانتظار الدفع، كما أن الدفعات قد تتم في فترات مختلفة عن تاريخ إصدار الفاتورة." },
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
