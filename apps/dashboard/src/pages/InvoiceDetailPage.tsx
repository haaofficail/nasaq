import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, ChevronLeft, Send, Printer, FileText, CreditCard,
  XCircle, AlertCircle, Clock, CheckCircle2, AlertTriangle,
  Plus, RotateCcw, Receipt, Eye, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

// ── helpers ──────────────────────────────────────────────────────
function fmt(n: any) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft:          { label: "مسودة",         color: "bg-gray-100 text-gray-600 border-gray-200",        icon: Clock },
  issued:         { label: "صادرة",          color: "bg-blue-50 text-blue-700 border-blue-200",          icon: FileText },
  sent:           { label: "مُرسلة",         color: "bg-indigo-50 text-indigo-700 border-indigo-200",    icon: FileText },
  paid:           { label: "مدفوعة",         color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  partially_paid: { label: "مدفوع جزئياً",  color: "bg-teal-50 text-teal-700 border-teal-200",          icon: Clock },
  overdue:        { label: "متأخرة",         color: "bg-red-50 text-red-700 border-red-200",             icon: AlertTriangle },
  cancelled:      { label: "ملغاة",          color: "bg-gray-100 text-gray-500 border-gray-200",         icon: XCircle },
};

const PAY_METHOD: Record<string, string> = {
  cash: "كاش", card: "بطاقة", bank_transfer: "تحويل بنكي",
  online: "إلكتروني", check: "شيك", other: "أخرى",
};

const TABS = [
  { key: "details",  label: "تفاصيل الفاتورة" },
  { key: "payments", label: "العمليات" },
  { key: "refunds",  label: "طلبات الاسترجاع" },
  { key: "invoices", label: "الفواتير" },
];

// ── print helpers ─────────────────────────────────────────────────
function printWindow(title: string, html: string) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
    <meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #e5e7eb;padding:8px 10px;text-align:right;font-size:13px}
    th{background:#f9fafb;font-weight:600}
    @media print{button{display:none}}</style>
    </head><body>${html}
    <script>window.onload=()=>{window.print()}<\/script></body></html>`);
  w.document.close();
}

// ── main component ────────────────────────────────────────────────
export function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab]             = useState("details");
  const [showPayment, setShowPayment] = useState(false);
  const [showRefund,  setShowRefund]  = useState(false);
  const [sending, setSending]     = useState(false);
  const [payForm, setPayForm]     = useState({
    amount: "", paymentMethod: "cash", paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "", transferName: "", notes: "",
  });

  const { data: res, loading, error, refetch } = useApi(() => financeApi.getInvoice(id!), [id]);
  const { data: pmtRes, refetch: refetchPmts }  = useApi(() => financeApi.invoicePayments(id!), [id]);

  const { mutate: addPayment, loading: addingPmt } = useMutation((data: any) => financeApi.addInvoicePayment(id!, data));
  const { mutate: updateStatus } = useMutation(({ s }: any) => financeApi.updateInvoiceStatus(id!, s));

  const inv: any   = res?.data;
  const pmts: any[] = pmtRes?.data || [];

  const handleSend = async () => {
    setSending(true);
    try {
      const r: any = await financeApi.sendInvoice(id!);
      const parts = [];
      if (r?.data?.email)    parts.push("البريد");
      if (r?.data?.whatsapp) parts.push("الواتساب");
      toast.success(parts.length ? `تم الإرسال عبر ${parts.join(" و ")}` : "تم الإرسال");
      refetch();
    } catch { toast.error("فشل الإرسال"); }
    finally { setSending(false); }
  };

  const handleCancel = async () => {
    if (!confirm("هل أنت متأكد من إلغاء هذه الفاتورة؟")) return;
    try {
      await updateStatus({ s: "cancelled" });
      toast.success("تم إلغاء الفاتورة");
      refetch();
    } catch { toast.error("فشل الإلغاء"); }
  };

  const handleAddPayment = async () => {
    if (!payForm.amount || isNaN(Number(payForm.amount))) {
      toast.error("أدخل مبلغاً صحيحاً"); return;
    }
    try {
      await addPayment({
        amount: Number(payForm.amount),
        paymentMethod: payForm.paymentMethod,
        paymentDate: payForm.paymentDate,
        referenceNumber: payForm.referenceNumber || undefined,
        transferName: payForm.transferName || undefined,
        notes: payForm.notes || undefined,
      });
      toast.success("تم تسجيل الدفعة");
      setShowPayment(false);
      setPayForm({ amount: "", paymentMethod: "cash", paymentDate: new Date().toISOString().split("T")[0], referenceNumber: "", transferName: "", notes: "" });
      refetch(); refetchPmts();
    } catch { toast.error("فشل تسجيل الدفعة"); }
  };

  const printInvoice = () => {
    if (!inv) return;
    const itemRows = (inv.items || []).map((it: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${it.description}</td>
        <td style="text-align:center">${it.quantity}</td>
        <td>${fmt(it.unitPrice)} ر.س</td>
        <td>${it.vatRate ?? 0}%</td>
        <td>${fmt(it.vatAmount ?? 0)} ر.س</td>
        <td>${fmt(it.totalAmount)} ر.س</td>
      </tr>`).join("");
    printWindow(`فاتورة ${inv.invoiceNumber}`, `
      <h2 style="margin-bottom:16px">فاتورة ضريبية — ${inv.invoiceNumber}</h2>
      <p>البائع: <strong>${inv.sellerName}</strong> ${inv.sellerVatNumber ? `| الرقم الضريبي: ${inv.sellerVatNumber}` : ""}</p>
      <p>العميل: <strong>${inv.buyerName}</strong> ${inv.buyerPhone ? `| ${inv.buyerPhone}` : ""}</p>
      <p>تاريخ الإصدار: ${inv.issueDate ? new Date(inv.issueDate).toLocaleDateString("ar-SA") : "—"}</p>
      <br/>
      <table>
        <thead><tr><th>#</th><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>الضريبة%</th><th>قيمة الضريبة</th><th>الإجمالي</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <br/>
      <table style="width:300px;margin-right:auto">
        <tr><td>المجموع الفرعي</td><td>${fmt(inv.taxableAmount ?? inv.subtotal)} ر.س</td></tr>
        <tr><td>قيمة الضريبة</td><td>${fmt(inv.vatAmount)} ر.س</td></tr>
        <tr style="font-weight:bold"><td>الإجمالي</td><td>${fmt(inv.totalAmount)} ر.س</td></tr>
      </table>`);
  };

  const printReceipt = () => {
    if (!inv) return;
    printWindow(`إيصال ${inv.invoiceNumber}`, `
      <h2 style="text-align:center;margin-bottom:16px">إيصال دفع</h2>
      <p>رقم الفاتورة: <strong>${inv.invoiceNumber}</strong></p>
      <p>العميل: <strong>${inv.buyerName}</strong></p>
      <p>الإجمالي: <strong>${fmt(inv.totalAmount)} ر.س</strong></p>
      <p>المدفوع: <strong>${fmt(inv.paidAmount ?? 0)} ر.س</strong></p>
      <p>المتبقي: <strong>${fmt(Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount ?? 0)))} ر.س</strong></p>
      <br/>
      ${pmts.length > 0 ? `<table>
        <thead><tr><th>#</th><th>المبلغ</th><th>الطريقة</th><th>التاريخ</th></tr></thead>
        <tbody>${pmts.map((p: any, i: number) => `<tr><td>${i + 1}</td><td>${fmt(p.amount)} ر.س</td><td>${PAY_METHOD[p.paymentMethod] || p.paymentMethod}</td><td>${p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("ar-SA") : "—"}</td></tr>`).join("")}</tbody>
      </table>` : ""}`);
  };

  if (loading) return <PageSkeleton />;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );
  if (!inv) return <div className="text-center py-12 text-gray-500">الفاتورة غير موجودة</div>;

  const st      = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
  const StatusIcon = st.icon;
  const canPay  = ["issued","sent","overdue","partially_paid"].includes(inv.status);
  const canCancel = ["draft","issued","sent"].includes(inv.status);
  const canSend = ["issued","sent","overdue","partially_paid"].includes(inv.status);
  const remaining = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));

  return (
    <div className="space-y-5">

      {/* breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/invoices" className="hover:text-brand-500 transition-colors flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> الفواتير
        </Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium font-mono">{inv.invoiceNumber}</span>
      </div>

      {/* ── header ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* left: order info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-lg font-bold text-gray-900 font-mono">{inv.invoiceNumber}</h1>
              <span className={clsx("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", st.color)}>
                <StatusIcon className="w-3.5 h-3.5" /> {st.label}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">العميل</p>
                <p className="font-medium text-gray-800">{inv.buyerName}</p>
                {inv.buyerPhone && <p className="text-xs text-gray-400" dir="ltr">{inv.buyerPhone}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">تاريخ الإصدار</p>
                <p className="font-medium text-gray-800">{inv.issueDate ? fmtDate(inv.issueDate) : "—"}</p>
              </div>
              {inv.dueDate && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">تاريخ الاستحقاق</p>
                  <p className="font-medium text-gray-800">{fmtDate(inv.dueDate)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-0.5">النوع</p>
                <p className="font-medium text-gray-800">{inv.invoiceType === "simplified" ? "مبسطة B2C" : "ضريبية B2B"}</p>
              </div>
            </div>
          </div>

          {/* right: actions */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {canSend && (
              <button
                onClick={handleSend} disabled={sending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-sm font-medium hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> إرسال للعميل
              </button>
            )}
            {canPay && (
              <button
                onClick={() => setShowPayment(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                <CreditCard className="w-4 h-4" /> تسجيل دفعة
              </button>
            )}
            <button
              onClick={printInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <Printer className="w-4 h-4" /> طباعة الفاتورة
            </button>
            <button
              onClick={printReceipt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <Receipt className="w-4 h-4" /> طباعة الإيصال
            </button>
            {canCancel && (
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <XCircle className="w-4 h-4" /> إلغاء الفاتورة
              </button>
            )}
            <button
              onClick={refetch}
              className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"
              title="تحديث"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* amounts summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-50">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">الإجمالي</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{fmt(inv.totalAmount)}</p>
            <p className="text-xs text-gray-400">ر.س</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-xs text-emerald-600">المبلغ المدفوع</p>
            <p className="text-lg font-bold text-emerald-700 tabular-nums">{fmt(inv.paidAmount || 0)}</p>
            <p className="text-xs text-emerald-500">ر.س</p>
          </div>
          <div className={clsx("rounded-xl p-3", remaining > 0 ? "bg-amber-50" : "bg-gray-50")}>
            <p className={clsx("text-xs", remaining > 0 ? "text-amber-600" : "text-gray-400")}>المبلغ المتبقي</p>
            <p className={clsx("text-lg font-bold tabular-nums", remaining > 0 ? "text-amber-700" : "text-gray-500")}>{fmt(remaining)}</p>
            <p className={clsx("text-xs", remaining > 0 ? "text-amber-500" : "text-gray-400")}>ر.س</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">ضريبة القيمة المضافة</p>
            <p className="text-lg font-bold text-gray-700 tabular-nums">{fmt(inv.vatAmount || 0)}</p>
            <p className="text-xs text-gray-400">ر.س</p>
          </div>
        </div>
      </div>

      {/* ── tabs card ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100 px-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                tab === t.key
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              {t.label}
              {t.key === "payments" && pmts.length > 0 && (
                <span className="mr-1.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{pmts.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── تفاصيل الفاتورة ─────────────────────────────── */}
          {tab === "details" && (
            <div className="space-y-6">
              {/* seller + buyer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">المورد / البائع</p>
                  <p className="font-bold text-gray-900">{inv.sellerName}</p>
                  {inv.sellerVatNumber && <p className="text-xs text-gray-500 mt-1">الرقم الضريبي: <span className="font-mono">{inv.sellerVatNumber}</span></p>}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">العميل / المشتري</p>
                  <p className="font-bold text-gray-900">{inv.buyerName}</p>
                  {inv.buyerCompanyName && <p className="text-sm text-violet-700 font-medium mt-0.5">{inv.buyerCompanyName}</p>}
                  {inv.buyerPhone && <p className="text-xs text-gray-500 mt-1" dir="ltr">{inv.buyerPhone}</p>}
                  {inv.buyerEmail && <p className="text-xs text-gray-500" dir="ltr">{inv.buyerEmail}</p>}
                  {inv.buyerVatNumber && <p className="text-xs text-gray-500 mt-1">الرقم الضريبي: <span className="font-mono">{inv.buyerVatNumber}</span></p>}
                  {inv.buyerCrNumber && <p className="text-xs text-gray-500">س.ت: <span className="font-mono">{inv.buyerCrNumber}</span></p>}
                </div>
              </div>

              {/* items table */}
              {inv.items?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">قائمة الخدمات / السلع</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 rounded-lg">
                          {["الاسم / الوصف", "الكمية", "سعر الوحدة", "الخصم", "السعر بدون ضريبة", "نسبة الضريبة", "قيمة الضريبة", "الإجمالي شامل الضريبة"].map(h => (
                            <th key={h} className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((item: any) => {
                          const net = Number(item.totalAmount || 0) / (1 + Number(item.vatRate || 0) / 100);
                          const vatAmt = Number(item.totalAmount || 0) - net;
                          return (
                            <tr key={item.id} className="border-b border-gray-50 last:border-0">
                              <td className="px-3 py-2.5 text-gray-800 font-medium">{item.description}</td>
                              <td className="px-3 py-2.5 text-center text-gray-600">{item.quantity}</td>
                              <td className="px-3 py-2.5 tabular-nums text-gray-600">{fmt(item.unitPrice)} ر.س</td>
                              <td className="px-3 py-2.5 tabular-nums text-gray-500">{fmt(item.discountAmount || 0)} ر.س</td>
                              <td className="px-3 py-2.5 tabular-nums text-gray-700">{fmt(net)} ر.س</td>
                              <td className="px-3 py-2.5 text-center text-gray-500">{item.vatRate ?? 15}%</td>
                              <td className="px-3 py-2.5 tabular-nums text-gray-500">{fmt(vatAmt)} ر.س</td>
                              <td className="px-3 py-2.5 tabular-nums font-bold text-gray-900">{fmt(item.totalAmount)} ر.س</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* transaction details + totals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* dates */}
                <div className="space-y-2 text-sm">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">تفاصيل المعاملة</h3>
                  {[
                    { label: "تاريخ الإصدار",    value: inv.issueDate ? fmtDate(inv.issueDate) : "—" },
                    { label: "تاريخ الاستحقاق",  value: inv.dueDate ? fmtDate(inv.dueDate) : "—" },
                    { label: "نوع الفاتورة",      value: inv.invoiceType === "simplified" ? "مبسطة B2C" : "ضريبية B2B" },
                    { label: "مصدر الفاتورة",    value: inv.sourceType === "booking" ? "حجز" : inv.sourceType === "order" ? "طلب" : "يدوي" },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-400">{row.label}</span>
                      <span className="text-gray-700 font-medium">{row.value}</span>
                    </div>
                  ))}
                  {inv.notes && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-800 border border-amber-100">
                      <strong>ملاحظات:</strong> {inv.notes}
                    </div>
                  )}
                </div>

                {/* totals */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">الإجمالي</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    {[
                      { label: "المجموع الفرعي",          value: fmt(inv.taxableAmount ?? inv.subtotal ?? inv.totalAmount) + " ر.س", cls: "text-gray-600" },
                      { label: "الخصم",                    value: fmt(inv.discountAmount || 0) + " ر.س", cls: "text-gray-600" },
                      { label: "المبلغ بدون الضريبة",      value: fmt(inv.taxableAmount ?? inv.subtotal ?? inv.totalAmount) + " ر.س", cls: "text-gray-600" },
                      { label: `قيمة ضريبة القيمة المضافة (${inv.vatRate ?? 15}%)`, value: fmt(inv.vatAmount || 0) + " ر.س", cls: "text-gray-600" },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between text-sm">
                        <span className="text-gray-400">{row.label}</span>
                        <span className={clsx("tabular-nums font-medium", row.cls)}>{row.value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2">
                      <span>السعر الكلي شامل الضريبة</span>
                      <span className="tabular-nums text-brand-600">{fmt(inv.totalAmount)} ر.س</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                      <span className="text-gray-400">المبلغ المدفوع</span>
                      <span className="tabular-nums text-emerald-600 font-medium">{fmt(inv.paidAmount || 0)} ر.س</span>
                    </div>
                    {remaining > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">المبلغ المتبقي</span>
                        <span className="tabular-nums text-amber-600 font-bold">{fmt(remaining)} ر.س</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── العمليات (payments) ──────────────────────────── */}
          {tab === "payments" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{pmts.length} عملية دفع مسجّلة</p>
                {canPay && (
                  <button
                    onClick={() => setShowPayment(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> تسجيل دفعة
                  </button>
                )}
              </div>

              {pmts.length === 0 ? (
                <div className="text-center py-10">
                  <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">لا توجد عمليات دفع مسجّلة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {["#", "رقم العملية", "المدفوع", "طريقة الدفع", "وقت الإنشاء", "تاريخ الدفع", "اسم المحوّل", "الرقم المرجعي", "ملاحظات"].map(h => (
                          <th key={h} className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pmts.map((p: any, i: number) => (
                        <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                          <td className="px-3 py-3 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-3 py-3 font-mono text-xs text-brand-500">{p.id?.substring(0, 8).toUpperCase()}</td>
                          <td className="px-3 py-3 font-bold text-emerald-600 tabular-nums">{fmt(p.amount)} ر.س</td>
                          <td className="px-3 py-3 text-gray-700">{PAY_METHOD[p.paymentMethod] || p.paymentMethod}</td>
                          <td className="px-3 py-3 text-gray-400">{p.createdAt ? new Date(p.createdAt).toLocaleDateString("ar-SA") : "—"}</td>
                          <td className="px-3 py-3 text-gray-600">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("ar-SA") : "—"}</td>
                          <td className="px-3 py-3 text-gray-600">{p.transferName || "—"}</td>
                          <td className="px-3 py-3 font-mono text-xs text-gray-500">{p.reference || "—"}</td>
                          <td className="px-3 py-3 text-gray-400 max-w-[160px] truncate">{p.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── طلبات الاسترجاع ──────────────────────────────── */}
          {tab === "refunds" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">طلبات الاسترجاع</p>
                {inv.status === "paid" && (
                  <button
                    onClick={() => setShowRefund(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> طلب استرجاع
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {["#", "المبلغ المسترجع", "طريقة الدفع الأصلية", "طريقة الاسترجاع", "سبب الاسترجاع", "حالة الاسترجاع", "سبب الرفض", "تاريخ الاسترجاع"].map(h => (
                        <th key={h} className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-400 text-sm">لا يوجد عمليات استرجاع</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── الفواتير (invoice record) ─────────────────────── */}
          {tab === "invoices" && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {["#", "الحالة", "المجموع الفرعي", "قيمة الضريبة", "المجموع", "تاريخ الإصدار", "طباعة"].map(h => (
                        <th key={h} className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 py-3 font-mono text-xs text-brand-500">{inv.invoiceNumber}</td>
                      <td className="px-3 py-3">
                        <span className={clsx("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border", st.color)}>
                          <StatusIcon className="w-3 h-3" /> {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-gray-700">{fmt(inv.taxableAmount ?? inv.subtotal ?? inv.totalAmount)} ر.س</td>
                      <td className="px-3 py-3 tabular-nums text-gray-600">{fmt(inv.vatAmount || 0)} ر.س</td>
                      <td className="px-3 py-3 tabular-nums font-bold text-gray-900">{fmt(inv.totalAmount)} ر.س</td>
                      <td className="px-3 py-3 text-gray-500">{inv.issueDate ? fmtDate(inv.issueDate) : "—"}</td>
                      <td className="px-3 py-3">
                        <button onClick={printInvoice} className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 transition-colors">
                          <Printer className="w-3.5 h-3.5" /> طباعة
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── add payment modal ─────────────────────────────────── */}
      <Modal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        title="تسجيل دفعة"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPayment(false)}>إلغاء</Button>
            <Button onClick={handleAddPayment} loading={addingPmt}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="المبلغ (ر.س)"
            name="amount"
            type="number"
            min={0}
            step={0.01}
            value={payForm.amount}
            onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
            placeholder={`المتبقي: ${fmt(remaining)} ر.س`}
            required
          />
          <Select
            label="طريقة الدفع"
            name="paymentMethod"
            value={payForm.paymentMethod}
            onChange={e => setPayForm(f => ({ ...f, paymentMethod: e.target.value }))}
            options={Object.entries(PAY_METHOD).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Input
            label="تاريخ الدفع"
            name="paymentDate"
            type="date"
            value={payForm.paymentDate}
            onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))}
          />
          {payForm.paymentMethod === "bank_transfer" && (
            <>
              <Input
                label="اسم المحوّل"
                name="transferName"
                value={payForm.transferName}
                onChange={e => setPayForm(f => ({ ...f, transferName: e.target.value }))}
                placeholder="اسم صاحب الحساب"
              />
              <Input
                label="الرقم المرجعي للتحويل"
                name="referenceNumber"
                value={payForm.referenceNumber}
                onChange={e => setPayForm(f => ({ ...f, referenceNumber: e.target.value }))}
                placeholder="رقم المرجع"
              />
            </>
          )}
          <Input
            label="ملاحظات (اختياري)"
            name="notes"
            value={payForm.notes}
            onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="أي ملاحظات إضافية"
          />
        </div>
      </Modal>

      {/* ── refund request modal (placeholder) ───────────────── */}
      <Modal
        open={showRefund}
        onClose={() => setShowRefund(false)}
        title="طلب استرجاع"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRefund(false)}>إلغاء</Button>
            <Button variant="danger" onClick={() => { toast.info("قيد التطوير"); setShowRefund(false); }}>إرسال الطلب</Button>
          </>
        }
      >
        <p className="text-sm text-gray-500 text-center py-6">ميزة طلبات الاسترجاع قيد التطوير.</p>
      </Modal>

    </div>
  );
}
