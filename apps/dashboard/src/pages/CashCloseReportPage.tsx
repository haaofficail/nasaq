import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, Wallet, TrendingDown, AlertTriangle, Download, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function today() { return new Date().toISOString().split("T")[0]; }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; }

function fmtDateTime(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS: Record<string, string> = { open: "مفتوحة", closed: "مُغلقة" };
const STATUS_COLORS: Record<string, string> = {
  open:   "bg-emerald-50 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
};

export function CashCloseReportPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo,   setDateTo]   = useState(today());

  const params = { dateFrom, dateTo };
  const { data: res, loading, refetch } = useApi(() => financeApi.cashCloseReport(params), [dateFrom, dateTo]);
  const report = res?.data;
  const rows: any[] = report?.rows || [];
  const shiftCount        = report?.shiftCount || 0;
  const totalCashIn       = report?.totalCashIn || 0;
  const totalCashOut      = report?.totalCashOut || 0;
  const totalDiscrepancy  = report?.totalDiscrepancy || 0;

  const exportCsv = () => {
    const header = "تاريخ الفتح,تاريخ الإغلاق,فتح بواسطة,الحساب,رصيد الفتح,نقد وارد,نقد صادر,رصيد الإغلاق,الفارق,الحالة\n";
    const csvRows = rows.map((r: any) => [
      fmtDateTime(r.openedAt), fmtDateTime(r.closedAt), r.openedBy, r.accountName,
      r.openingBalance, r.cashIn, r.cashOut, r.closingBalance,
      r.discrepancy !== null ? r.discrepancy : "",
      STATUS_LABELS[r.status] || r.status,
    ].join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + header + csvRows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `cash-close-${dateFrom}-${dateTo}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/reports" className="hover:text-brand-500 flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> التقارير
        </Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">تقرير إغلاق الصندوق</span>
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
                <Wallet className="w-4 h-4 text-brand-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-brand-600">{shiftCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">عدد الورديات</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <TrendingDown className="w-4 h-4 text-emerald-600 rotate-180" />
              </div>
              <p className="text-xl font-bold tabular-nums text-emerald-700">{fmt(totalCashIn)}</p>
              <p className="text-xs text-gray-400 mt-0.5">إجمالي نقد وارد ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-xl font-bold tabular-nums text-red-600">{fmt(totalCashOut)}</p>
              <p className="text-xs text-gray-400 mt-0.5">إجمالي نقد صادر ر.س</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <p className={clsx("text-xl font-bold tabular-nums", totalDiscrepancy > 0 ? "text-amber-600" : "text-gray-700")}>
                {fmt(totalDiscrepancy)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">إجمالي الفوارق ر.س</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">سجل الورديات</h2>
              <span className="text-xs text-gray-400">{rows.length} وردية</span>
            </div>
            {rows.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">لا توجد ورديات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      {["الحساب", "فُتح بواسطة", "وقت الفتح", "وقت الإغلاق", "رصيد الفتح", "نقد وارد", "نقد صادر", "رصيد الإغلاق", "الفارق", "الحالة"].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, i: number) => {
                      const disc = r.discrepancy !== null ? Number(r.discrepancy) : null;
                      return (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800">{r.accountName}</td>
                          <td className="px-4 py-3 text-gray-600">{r.openedBy}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDateTime(r.openedAt)}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {r.closedAt ? fmtDateTime(r.closedAt) : (
                              <span className="flex items-center gap-1 text-emerald-600"><Clock className="w-3 h-3" /> مفتوحة</span>
                            )}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-gray-600">{fmt(r.openingBalance)}</td>
                          <td className="px-4 py-3 tabular-nums text-emerald-700 font-medium">{fmt(r.cashIn)}</td>
                          <td className="px-4 py-3 tabular-nums text-red-600 font-medium">{fmt(r.cashOut)}</td>
                          <td className="px-4 py-3 tabular-nums font-bold text-gray-800">{r.closingBalance !== null ? fmt(r.closingBalance) : "—"}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {disc === null ? (
                              <span className="text-gray-300">—</span>
                            ) : (
                              <span className={clsx("flex items-center gap-1 text-xs font-medium",
                                Math.abs(disc) < 0.01 ? "text-emerald-600" : "text-amber-600"
                              )}>
                                {Math.abs(disc) < 0.01 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                {disc >= 0 ? "+" : ""}{fmt(disc)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx("text-xs px-2 py-0.5 rounded-full", STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600")}>
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t border-gray-200">
                      <td colSpan={5} className="px-4 py-3 text-gray-700">الإجمالي</td>
                      <td className="px-4 py-3 tabular-nums text-emerald-700">{fmt(totalCashIn)} ر.س</td>
                      <td className="px-4 py-3 tabular-nums text-red-600">{fmt(totalCashOut)} ر.س</td>
                      <td colSpan={3} className="px-4 py-3 text-xs text-gray-400">{rows.length} وردية</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
            <div className="space-y-3">
              {[
                { q: "ما الوردية (Shift) في نظام الصندوق؟", a: "الوردية هي جلسة عمل يفتحها الكاشير بتسجيل رصيد فتح، ثم يُغلقها بنهاية يوم العمل مع تسجيل رصيد الإغلاق. يساعد ذلك على محاسبة كل موظف بشكل مستقل." },
                { q: "ما معنى «الفارق»؟", a: "الفارق = رصيد الإغلاق المسجّل − (رصيد الفتح + نقد وارد − نقد صادر). قيمة صفر مثالية؛ فارق إيجابي = نقد زائد، فارق سلبي = نقص في الصندوق." },
                { q: "هل تظهر ورديات الفروع المختلفة هنا؟", a: "نعم، يشمل التقرير جميع ورديات المنشأة في الفترة المحددة بغض النظر عن الفرع أو الحساب." },
                { q: "ماذا لو كانت الوردية «مفتوحة»؟", a: "تظهر في القائمة بحالة «مفتوحة» ولا يُحسب الفارق لها لأن الإغلاق لم يتم بعد." },
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
