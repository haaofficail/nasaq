import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/useToast";
import { FileText, Plus, RefreshCw, CheckCircle2, Clock, XCircle, AlertTriangle, Eye, Search, CreditCard, Building2, Send } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button, Modal, Input, Select, confirmDialog } from "@/components/ui";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft:          { label: "مسودة",         color: "bg-gray-100 text-gray-600 border-gray-200",       icon: Clock },
  issued:         { label: "صادرة",          color: "bg-blue-50 text-blue-700 border-blue-200",         icon: FileText },
  sent:           { label: "مُرسلة",         color: "bg-indigo-50 text-indigo-700 border-indigo-200",   icon: FileText },
  paid:           { label: "مدفوعة",         color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  partially_paid: { label: "مدفوعة جزئياً", color: "bg-teal-50 text-teal-700 border-teal-200",         icon: Clock },
  overdue:        { label: "متأخرة",         color: "bg-red-50 text-red-700 border-red-200",             icon: AlertTriangle },
  cancelled:      { label: "ملغاة",          color: "bg-gray-100 text-gray-500 border-gray-200",        icon: XCircle },
};

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  booking:  { label: "حجز",     color: "bg-brand-50 text-brand-700 border-brand-200" },
  order:    { label: "طلب",     color: "bg-violet-50 text-violet-700 border-violet-200" },
  services: { label: "خدمات",   color: "bg-amber-50 text-amber-700 border-amber-200" },
  manual:   { label: "يدوي",    color: "bg-gray-100 text-gray-500 border-gray-200" },
};


function fmt(n: any) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "2-digit", month: "short", year: "numeric" });
}

export function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch]           = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentMethod: "cash", reference: "", notes: "" });
  const [savingPayment, setSavingPayment] = useState(false);
  const [cancelInvoiceId, setCancelInvoiceId] = useState<string | null>(null);
  const [sendConfirmId, setSendConfirmId] = useState<string | null>(null);

  const { context: orgCtx } = useOrgContext();

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (search)       params.q      = search;

  const { data: res, loading, refetch }  = useApi(() => financeApi.invoices(params), [statusFilter, search]);
  const { data: statsRes }               = useApi(() => financeApi.invoiceStats(), []);
  const { data: paymentsRes, refetch: refetchPayments } = useApi(
    () => viewInvoice ? financeApi.invoicePayments(viewInvoice.id) : Promise.resolve({ data: [] }),
    [viewInvoice?.id]
  );
  const { mutate: updateStatus } = useMutation(({ id, s }: any) => financeApi.updateInvoiceStatus(id, s));

  const invoiceList: any[] = res?.data || [];
  const stats = statsRes?.data;
  const pmts: any[] = paymentsRes?.data || [];

  const markPaid = async (id: string) => {
    try {
      await updateStatus({ id, s: "paid" });
      toast.success("تم تأكيد الدفع");
      refetch();
      if (viewInvoice?.id === id) setViewInvoice((v: any) => ({ ...v, status: "paid" }));
    } catch { toast.error("فشل التحديث"); }
  };

  const markCancelled = async (id: string) => {
    setCancelInvoiceId(id);
  };

  const doCancelInvoice = async () => {
    if (!cancelInvoiceId) return;
    try {
      await updateStatus({ id: cancelInvoiceId, s: "cancelled" });
      toast.success("تم إلغاء الفاتورة");
      refetch();
      setViewInvoice(null);
    } catch { toast.error("فشل التحديث"); }
    finally { setCancelInvoiceId(null); }
  };

  const [sendingId, setSendingId] = useState<string | null>(null);
  const sendInvoice = async (id: string) => {
    setSendConfirmId(id);
  };

  const doSendInvoice = async () => {
    if (!sendConfirmId) return;
    setSendingId(sendConfirmId);
    try {
      await financeApi.sendInvoice(sendConfirmId);
      toast.success("تم إرسال الفاتورة للعميل بنجاح");
      refetch();
    } catch { toast.error("فشل إرسال الفاتورة"); }
    finally { setSendingId(null); setSendConfirmId(null); }
  };

  const handleAddPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) { toast.error("أدخل المبلغ"); return; }
    setSavingPayment(true);
    try {
      await financeApi.addInvoicePayment(viewInvoice.id, paymentForm);
      toast.success("تم تسجيل الدفعة");
      setShowPayment(false);
      setPaymentForm({ amount: "", paymentMethod: "cash", reference: "", notes: "" });
      refetch();
      refetchPayments();
      // Re-fetch invoice to update status
      const updated = await financeApi.getInvoice(viewInvoice.id);
      setViewInvoice((updated as any).data);
    } catch { toast.error("فشل تسجيل الدفعة"); }
    finally { setSavingPayment(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-500" /> الفواتير
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">فواتير رسمية معتمدة ومتوافقة مع هيئة الزكاة والدخل</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refetch} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button icon={Plus} onClick={() => setShowModal(true)}>فاتورة جديدة</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الفواتير",  value: stats ? `${stats.total} فاتورة` : `${invoiceList.length} فاتورة`, color: "text-brand-600",   bg: "bg-brand-50" },
          { label: "إجمالي المبالغ",   value: `${fmt(stats?.totalAmount)} ر.س`,                                  color: "text-gray-700",    bg: "bg-gray-100" },
          { label: "مدفوعة",           value: `${fmt(stats?.paidAmount)} ر.س`,                                   color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "بانتظار الدفع من العملاء", value: `${fmt(stats?.unpaidAmount)} ر.س`,                                 color: "text-red-500",     bg: "bg-red-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.bg)}>
              <FileText className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-lg font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-sm text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-brand-400 bg-white"
            placeholder="بحث باسم العميل أو رقم الفاتورة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand-400 bg-white"
        >
          <option value="">كل الفواتير</option>
          <option value="issued">بانتظار الدفع</option>
          <option value="paid">مدفوعة</option>
          <option value="partially_paid">مدفوعة جزئياً</option>
          <option value="overdue">متأخرة</option>
          <option value="draft">مسودة</option>
          <option value="cancelled">ملغاة</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">قائمة الفواتير</h2>
          <span className="text-xs text-gray-400">{invoiceList.length} فاتورة</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5"><div className="h-3.5 w-40 bg-gray-100 rounded" /><div className="h-3 w-24 bg-gray-100 rounded" /></div>
                <div className="h-6 w-20 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : invoiceList.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 mb-1">لا توجد فواتير</p>
            <p className="text-xs text-gray-400 mb-4">أنشئ فاتورتك الأولى الآن</p>
            <Button icon={Plus} onClick={() => setShowModal(true)} size="sm">فاتورة جديدة</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {[
                    "رقم الطلب", "العميل", "رقم الجوال",
                    "تاريخ الإصدار", "الإجمالي",
                    "حالة الدفع", "تاريخ الدفع", ""
                  ].map(h => (
                    <th key={h} className="text-right py-3 px-4 text-xs text-gray-400 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoiceList.map((inv: any) => {
                  const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.issued;
                  const StatusIcon = sc.icon;
                  const canMarkPaid = ["issued", "sent", "overdue", "partially_paid"].includes(inv.status);
                  const canCancel   = ["draft", "issued", "sent"].includes(inv.status);
                  const canSend     = ["issued","sent","overdue","partially_paid"].includes(inv.status);
                  return (
                    <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link to={`/invoices/${inv.id}`} className="font-mono text-sm font-semibold text-brand-600 hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                        <p className="text-[10px] text-gray-400 mt-0.5">{inv.invoiceType === "simplified" ? "مبسطة B2C" : "ضريبية B2B"}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-sm font-medium text-gray-900">{inv.buyerName}</p>
                        {inv.buyerCompanyName && <p className="text-xs text-violet-600">{inv.buyerCompanyName}</p>}
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-500 tabular-nums" dir="ltr">{inv.buyerPhone || "—"}</td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {inv.issueDate ? fmtDate(inv.issueDate) : fmtDate(inv.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-sm font-bold text-gray-900 tabular-nums">{fmt(inv.totalAmount)} ر.س</p>
                        {inv.status === "partially_paid" && (
                          <p className="text-[10px] text-teal-600 tabular-nums">مدفوع: {fmt(inv.paidAmount)} ر.س</p>
                        )}
                        {inv.vatAmount && Number(inv.vatAmount) > 0 && (
                          <p className="text-[10px] text-gray-400 tabular-nums">ضريبة: {fmt(inv.vatAmount)} ر.س</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border", sc.color)}>
                          <StatusIcon className="w-3 h-3" /> {sc.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                        {inv.paidAt ? fmtDate(inv.paidAt) : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex gap-1 justify-end items-center">
                          <Link to={`/invoices/${inv.id}`}
                            className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors inline-flex" title="عرض التفاصيل">
                            <Eye className="w-3.5 h-3.5 text-brand-500" />
                          </Link>
                          {canMarkPaid && (
                            <div className="flex flex-col items-end gap-0.5">
                              <button onClick={() => { setViewInvoice(inv); setShowPayment(true); }}
                                className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-medium hover:bg-emerald-100 transition-colors">
                                تسجيل دفعة
                              </button>
                              <button onClick={() => markPaid(inv.id)}
                                className="px-2 py-1 rounded-lg bg-gray-50 text-gray-500 text-[10px] font-medium hover:bg-gray-100 transition-colors border border-gray-100">
                                تأشير كمدفوع
                              </button>
                              <span className="text-[9px] text-gray-400 leading-tight text-right">بدون تسجيل طريقة الدفع</span>
                            </div>
                          )}
                          {canSend && (
                            <button onClick={() => sendInvoice(inv.id)} disabled={sendingId === inv.id}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50" title="إرسال للعميل">
                              <Send className="w-3.5 h-3.5 text-indigo-500" />
                            </button>
                          )}
                          {canCancel && (
                            <button onClick={() => markCancelled(inv.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="إلغاء">
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={refetch}
      />

      {/* View Invoice Modal */}
      {viewInvoice && (
        <Modal
          open={!!viewInvoice}
          onClose={() => { setViewInvoice(null); setShowPayment(false); }}
          title={`فاتورة ${viewInvoice.invoiceNumber}`}
          size="md"
          footer={
            <div className="flex gap-2 w-full">
              {["issued","sent","overdue","partially_paid"].includes(viewInvoice.status) && (
                <Button icon={CreditCard} onClick={() => setShowPayment(true)} size="sm">تسجيل دفعة</Button>
              )}
              {["draft","issued","sent"].includes(viewInvoice.status) && (
                <Button variant="danger" size="sm" onClick={() => markCancelled(viewInvoice.id)}>إلغاء</Button>
              )}
              <Button variant="secondary" className="mr-auto" onClick={() => { setViewInvoice(null); setShowPayment(false); }}>إغلاق</Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Invoice detail rows */}
            <div className="space-y-2 text-sm">
              {[
                { label: "رقم الفاتورة", value: <span className="font-mono font-bold">{viewInvoice.invoiceNumber}</span> },
                { label: "النوع", value: viewInvoice.invoiceType === "simplified" ? "مبسطة B2C" : "ضريبية B2B" },
                { label: "المصدر", value: <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border", (SOURCE_BADGE[viewInvoice.sourceType] || SOURCE_BADGE.manual).color)}>{(SOURCE_BADGE[viewInvoice.sourceType] || SOURCE_BADGE.manual).label}</span> },
                { label: "البائع", value: <div className="text-right"><p className="font-medium">{viewInvoice.sellerName}</p>{viewInvoice.sellerVatNumber && <p className="text-xs font-mono text-gray-400">{viewInvoice.sellerVatNumber}</p>}</div> },
                { label: "المشتري", value: (
                  <div className="text-right">
                    <p className="font-medium">{viewInvoice.buyerName}</p>
                    {viewInvoice.buyerCompanyName && <p className="text-xs text-violet-700 font-medium">{viewInvoice.buyerCompanyName}</p>}
                    {viewInvoice.buyerPhone && <p className="text-xs text-gray-400">{viewInvoice.buyerPhone}</p>}
                  </div>
                )},
                ...(viewInvoice.buyerCrNumber || viewInvoice.buyerVatNumber ? [{
                  label: "بيانات المؤسسة",
                  value: (
                    <div className="text-right space-y-0.5">
                      {viewInvoice.buyerCrNumber && (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-xs text-gray-400">س.ت:</span>
                          <span className="text-xs font-mono font-medium text-gray-700">{viewInvoice.buyerCrNumber}</span>
                        </div>
                      )}
                      {viewInvoice.buyerVatNumber && (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-xs text-gray-400">الرقم الضريبي:</span>
                          <span className="text-xs font-mono font-medium text-gray-700">{viewInvoice.buyerVatNumber}</span>
                        </div>
                      )}
                    </div>
                  ),
                }] : []),
                { label: "تاريخ الإصدار", value: fmtDate(viewInvoice.issueDate || viewInvoice.createdAt) },
                ...(viewInvoice.dueDate ? [{ label: "تاريخ الاستحقاق", value: fmtDate(viewInvoice.dueDate) }] : []),
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Amounts */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>قبل الضريبة</span>
                <span className="tabular-nums">{fmt(viewInvoice.subtotal)} ر.س</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>الضريبة ({viewInvoice.vatRate || 15}%)</span>
                <span className="tabular-nums">{fmt(viewInvoice.vatAmount)} ر.س</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-1.5">
                <span>الإجمالي</span>
                <span className="tabular-nums text-brand-600">{fmt(viewInvoice.totalAmount)} ر.س</span>
              </div>
              {parseFloat(viewInvoice.paidAmount || "0") > 0 && (
                <div className="flex justify-between text-teal-600 text-sm pt-1 border-t border-gray-200">
                  <span>المدفوع</span>
                  <span className="tabular-nums font-medium">{fmt(viewInvoice.paidAmount)} ر.س</span>
                </div>
              )}
            </div>

            {/* Payment history */}
            {pmts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">سجل الدفعات</p>
                <div className="space-y-1.5">
                  {pmts.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between bg-emerald-50/60 rounded-lg px-3 py-2 text-xs">
                      <span className="text-emerald-700 font-medium">{fmt(p.amount)} ر.س</span>
                      <span className="text-gray-500">{p.paymentMethod === "cash" ? "نقد" : p.paymentMethod === "bank_transfer" ? "تحويل" : p.paymentMethod === "card" ? "بطاقة" : "أخرى"}</span>
                      <span className="text-gray-400 tabular-nums">{fmtDate(p.paymentDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add payment inline */}
            {showPayment && (
              <div className="border border-brand-100 rounded-xl p-4 bg-brand-50/30 space-y-3">
                <p className="text-sm font-semibold text-gray-800">تسجيل دفعة جديدة</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input name="amount" label="المبلغ *" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" dir="ltr" />
                  <Select
                    name="paymentMethod"
                    label="طريقة الدفع"
                    value={paymentForm.paymentMethod}
                    onChange={e => setPaymentForm(p => ({ ...p, paymentMethod: e.target.value }))}
                    options={[
                      { value: "cash", label: "نقد" },
                      { value: "bank_transfer", label: "تحويل بنكي" },
                      { value: "card", label: "بطاقة" },
                      { value: "other", label: "أخرى" },
                    ]}
                  />
                </div>
                <Input name="reference" label="مرجع (اختياري)" value={paymentForm.reference} onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))} placeholder="رقم التحويل..." dir="ltr" />
                <div className="flex gap-2">
                  <Button onClick={handleAddPayment} loading={savingPayment} size="sm">تأكيد الدفعة</Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowPayment(false)}>إلغاء</Button>
                </div>
              </div>
            )}

            {/* ترميز OS watermark */}
            <div className="pt-2 flex items-center justify-between border-t border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-xs leading-none">ن</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-700 leading-none">ترميز OS</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5" dir="ltr">tarmizos.com</p>
                </div>
              </div>
              {orgCtx?.orgCode && (
                <span className="font-mono text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg" dir="ltr">
                  {orgCtx.orgCode}
                </span>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
        <div className="space-y-3">
          {[
            { q: "ما الفرق بين «بانتظار الدفع» و«متأخرة»؟", a: "«بانتظار الدفع» تعني الفاتورة أُصدرت ولم يحن موعد الاستحقاق أو لم يُحدَّد. «متأخرة» تعني تجاوزت تاريخ الاستحقاق ولم تُسدَّد." },
            { q: "ما المقصود بـ «مدفوع جزئياً»؟", a: "تم استلام جزء من مبلغ الفاتورة فقط. يمكنك إضافة دفعات متعددة حتى يكتمل المبلغ وتتحول الفاتورة إلى «تم الدفع»." },
            { q: "هل يمكنني إرسال الفاتورة مباشرة للعميل؟", a: "نعم، اضغط على أيقونة الإرسال في قائمة الفواتير أو من داخل تفاصيل الفاتورة وستُرسل عبر واتساب أو بريد إلكتروني." },
            { q: "ما هي «الفاتورة الضريبية» مقابل «الفاتورة المبسّطة»؟", a: "الفاتورة الضريبية تشترط الرقم الضريبي للطرفين وتفاصيل VAT كاملة وهي مطلوبة للمعاملات بين الشركات (B2B). الفاتورة المبسّطة للمبيعات اليومية للأفراد." },
            { q: "ماذا يحدث عند إلغاء فاتورة؟", a: "تُلغى الفاتورة ويُسجَّل قيد عكسي في النظام المحاسبي تلقائياً. لا يمكن التراجع عن الإلغاء." },
          ].map(faq => (
            <details key={faq.q} className="border border-gray-100 rounded-xl">
              <summary className="px-4 py-3 text-sm text-gray-700 cursor-pointer font-medium hover:bg-gray-50 rounded-xl">{faq.q}</summary>
              <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Cancel Invoice Confirmation Modal */}
      {cancelInvoiceId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">إلغاء الفاتورة</h3>
              <p className="text-sm text-gray-500">سيتم إلغاء الفاتورة وتسجيل قيد عكسي تلقائياً. لا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setCancelInvoiceId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">تراجع</button>
              <button onClick={doCancelInvoice} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">نعم، ألغِ الفاتورة</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Invoice Confirmation Modal */}
      {sendConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <Send className="w-6 h-6 text-brand-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">إرسال الفاتورة</h3>
              <p className="text-sm text-gray-500">سيتم إرسال الفاتورة للعميل عبر واتساب أو البريد الإلكتروني.</p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setSendConfirmId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">تراجع</button>
              <button onClick={doSendInvoice} disabled={!!sendingId} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">نعم، أرسل الفاتورة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
