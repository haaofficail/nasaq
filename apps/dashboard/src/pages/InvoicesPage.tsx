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
  draft:          { label: "مسودة",         color: "bg-[var(--surface-3)] text-[var(--text-2)] border-[var(--border)]", icon: Clock },
  issued:         { label: "صادرة",          color: "bg-brand-soft text-brand-700 border-brand-200",                    icon: FileText },
  sent:           { label: "مُرسلة",         color: "bg-lavender-soft text-lavender border-lavender-soft",              icon: FileText },
  paid:           { label: "مدفوعة",         color: "bg-success-soft text-success border-success-soft",                 icon: CheckCircle2 },
  partially_paid: { label: "مدفوعة جزئياً", color: "bg-sky-soft text-sky border-sky-soft",                             icon: Clock },
  overdue:        { label: "متأخرة",         color: "bg-danger-soft text-danger border-danger-soft",                    icon: AlertTriangle },
  cancelled:      { label: "ملغاة",          color: "bg-[var(--surface-3)] text-[var(--text-3)] border-[var(--border)]", icon: XCircle },
};

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  booking:  { label: "حجز",     color: "bg-brand-soft text-brand-700 border-brand-200" },
  order:    { label: "طلب",     color: "bg-lavender-soft text-lavender border-lavender-soft" },
  services: { label: "خدمات",   color: "bg-warning-soft text-warning border-warning-soft" },
  manual:   { label: "يدوي",    color: "bg-[var(--surface-3)] text-[var(--text-2)] border-[var(--border)]" },
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
          <h1 className="text-xl font-bold text-[var(--text-1)] flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-500" /> الفواتير
          </h1>
          <p className="text-sm text-[var(--text-3)] mt-0.5">فواتير رسمية معتمدة ومتوافقة مع هيئة الزكاة والدخل</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refetch} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-2)] transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button icon={Plus} onClick={() => setShowModal(true)}>فاتورة جديدة</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الفواتير",  value: stats ? `${stats.total} فاتورة` : `${invoiceList.length} فاتورة`, color: "text-brand-600",          bg: "bg-brand-soft" },
          { label: "إجمالي المبالغ",   value: `${fmt(stats?.totalAmount)} ر.س`,                                  color: "text-[var(--text-1)]",    bg: "bg-[var(--surface-3)]" },
          { label: "مدفوعة",           value: `${fmt(stats?.paidAmount)} ر.س`,                                   color: "text-success",            bg: "bg-success-soft" },
          { label: "بانتظار الدفع من العملاء", value: `${fmt(stats?.unpaidAmount)} ر.س`,                         color: "text-danger",             bg: "bg-danger-soft" },
        ].map(s => (
          <div key={s.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
            <div className={clsx("w-9 h-9 rounded-[10px] flex items-center justify-center mb-2", s.bg)}>
              <FileText className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-lg font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-sm text-[var(--text-3)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
          <input
            className="w-full pr-9 pl-4 py-2 text-sm rounded-xl border border-[var(--border)] focus:outline-none focus:border-brand-400 bg-[var(--surface)] text-[var(--text-1)] placeholder:text-[var(--text-3)]"
            placeholder="بحث باسم العميل أو رقم الفاتورة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-brand-400 bg-[var(--surface)]"
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
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-[10px] py-[6px] border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-1)] text-sm">قائمة الفواتير</h2>
          <span className="text-[11px] text-[var(--text-3)]">{invoiceList.length} فاتورة</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-[var(--surface-3)] shrink-0" />
                <div className="flex-1 space-y-1.5"><div className="h-3.5 w-40 bg-[var(--surface-3)] rounded" /><div className="h-3 w-24 bg-[var(--surface-3)] rounded" /></div>
                <div className="h-6 w-20 bg-[var(--surface-3)] rounded-full" />
              </div>
            ))}
          </div>
        ) : invoiceList.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-[var(--text-3)] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[var(--text-1)] mb-1">لا توجد فواتير</p>
            <p className="text-xs text-[var(--text-3)] mb-4">أنشئ فاتورتك الأولى الآن</p>
            <Button icon={Plus} onClick={() => setShowModal(true)} size="sm">فاتورة جديدة</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  {[
                    "رقم الطلب", "العميل", "رقم الجوال",
                    "تاريخ الإصدار", "الإجمالي",
                    "حالة الدفع", "تاريخ الدفع", ""
                  ].map(h => (
                    <th key={h} className="text-right py-[6px] px-[10px] text-[10px] text-[var(--text-3)] font-bold uppercase tracking-wider whitespace-nowrap">{h}</th>
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
                    <tr key={inv.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                      <td className="py-[6px] px-[10px]">
                        <Link to={`/invoices/${inv.id}`} className="font-mono text-sm font-semibold text-brand-600 hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                        <p className="text-[10px] text-[var(--text-3)] mt-0.5">{inv.invoiceType === "simplified" ? "مبسطة B2C" : "ضريبية B2B"}</p>
                      </td>
                      <td className="py-[6px] px-[10px]">
                        <p className="text-sm font-medium text-[var(--text-1)]">{inv.buyerName}</p>
                        {inv.buyerCompanyName && <p className="text-xs text-lavender">{inv.buyerCompanyName}</p>}
                      </td>
                      <td className="py-[6px] px-[10px] text-sm text-[var(--text-2)] tabular-nums" dir="ltr">{inv.buyerPhone || "—"}</td>
                      <td className="py-[6px] px-[10px] text-xs text-[var(--text-2)] whitespace-nowrap">
                        {inv.issueDate ? fmtDate(inv.issueDate) : fmtDate(inv.createdAt)}
                      </td>
                      <td className="py-[6px] px-[10px]">
                        <p className="text-sm font-bold text-[var(--text-1)] tabular-nums">{fmt(inv.totalAmount)} ر.س</p>
                        {inv.status === "partially_paid" && (
                          <p className="text-[10px] text-sky tabular-nums">مدفوع: {fmt(inv.paidAmount)} ر.س</p>
                        )}
                        {inv.vatAmount && Number(inv.vatAmount) > 0 && (
                          <p className="text-[10px] text-[var(--text-3)] tabular-nums">ضريبة: {fmt(inv.vatAmount)} ر.س</p>
                        )}
                      </td>
                      <td className="py-[6px] px-[10px]">
                        <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border", sc.color)}>
                          <StatusIcon className="w-3 h-3" /> {sc.label}
                        </span>
                      </td>
                      <td className="py-[6px] px-[10px] text-xs text-[var(--text-3)] whitespace-nowrap">
                        {inv.paidAt ? fmtDate(inv.paidAt) : "—"}
                      </td>
                      <td className="py-[6px] px-[10px]">
                        <div className="flex gap-1 justify-end items-center">
                          <Link to={`/invoices/${inv.id}`}
                            className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors inline-flex" title="عرض التفاصيل">
                            <Eye className="w-3.5 h-3.5 text-brand-500" />
                          </Link>
                          {canMarkPaid && (
                            <div className="flex flex-col items-end gap-0.5">
                              <button onClick={() => { setViewInvoice(inv); setShowPayment(true); }}
                                className="px-2 py-1 rounded-lg bg-success-soft text-success text-[11px] font-medium hover:opacity-80 transition-colors">
                                تسجيل دفعة
                              </button>
                              <button onClick={() => markPaid(inv.id)}
                                className="px-2 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--text-2)] text-[10px] font-medium hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]">
                                تأشير كمدفوع
                              </button>
                              <span className="text-[9px] text-[var(--text-3)] leading-tight text-right">بدون تسجيل طريقة الدفع</span>
                            </div>
                          )}
                          {canSend && (
                            <button onClick={() => sendInvoice(inv.id)} disabled={sendingId === inv.id}
                              className="p-1.5 rounded-lg hover:bg-lavender-soft transition-colors disabled:opacity-50" title="إرسال للعميل">
                              <Send className="w-3.5 h-3.5 text-lavender" />
                            </button>
                          )}
                          {canCancel && (
                            <button onClick={() => markCancelled(inv.id)}
                              className="p-1.5 rounded-lg hover:bg-danger-soft transition-colors" title="إلغاء">
                              <XCircle className="w-3.5 h-3.5 text-danger" />
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
                { label: "البائع", value: <div className="text-right"><p className="font-medium">{viewInvoice.sellerName}</p>{viewInvoice.sellerVatNumber && <p className="text-xs font-mono text-[var(--text-3)]">{viewInvoice.sellerVatNumber}</p>}</div> },
                { label: "المشتري", value: (
                  <div className="text-right">
                    <p className="font-medium">{viewInvoice.buyerName}</p>
                    {viewInvoice.buyerCompanyName && <p className="text-xs text-lavender font-medium">{viewInvoice.buyerCompanyName}</p>}
                    {viewInvoice.buyerPhone && <p className="text-xs text-[var(--text-3)]">{viewInvoice.buyerPhone}</p>}
                  </div>
                )},
                ...(viewInvoice.buyerCrNumber || viewInvoice.buyerVatNumber ? [{
                  label: "بيانات المؤسسة",
                  value: (
                    <div className="text-right space-y-0.5">
                      {viewInvoice.buyerCrNumber && (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-xs text-[var(--text-3)]">س.ت:</span>
                          <span className="text-xs font-mono font-medium text-[var(--text-1)]">{viewInvoice.buyerCrNumber}</span>
                        </div>
                      )}
                      {viewInvoice.buyerVatNumber && (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-xs text-[var(--text-3)]">الرقم الضريبي:</span>
                          <span className="text-xs font-mono font-medium text-[var(--text-1)]">{viewInvoice.buyerVatNumber}</span>
                        </div>
                      )}
                    </div>
                  ),
                }] : []),
                { label: "تاريخ الإصدار", value: fmtDate(viewInvoice.issueDate || viewInvoice.createdAt) },
                ...(viewInvoice.dueDate ? [{ label: "تاريخ الاستحقاق", value: fmtDate(viewInvoice.dueDate) }] : []),
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1.5 border-b border-[var(--border)]">
                  <span className="text-[var(--text-2)]">{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Amounts */}
            <div className="bg-[var(--surface-2)] rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-[var(--text-2)]">
                <span>قبل الضريبة</span>
                <span className="tabular-nums">{fmt(viewInvoice.subtotal)} ر.س</span>
              </div>
              <div className="flex justify-between text-[var(--text-2)]">
                <span>الضريبة ({viewInvoice.vatRate || 15}%)</span>
                <span className="tabular-nums">{fmt(viewInvoice.vatAmount)} ر.س</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-[var(--border)] pt-1.5">
                <span>الإجمالي</span>
                <span className="tabular-nums text-brand-600">{fmt(viewInvoice.totalAmount)} ر.س</span>
              </div>
              {parseFloat(viewInvoice.paidAmount || "0") > 0 && (
                <div className="flex justify-between text-sky text-sm pt-1 border-t border-[var(--border)]">
                  <span>المدفوع</span>
                  <span className="tabular-nums font-medium">{fmt(viewInvoice.paidAmount)} ر.س</span>
                </div>
              )}
            </div>

            {/* Payment history */}
            {pmts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-1)] mb-2">سجل الدفعات</p>
                <div className="space-y-1.5">
                  {pmts.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between bg-success-soft rounded-lg px-3 py-2 text-xs">
                      <span className="text-success font-medium">{fmt(p.amount)} ر.س</span>
                      <span className="text-[var(--text-2)]">{p.paymentMethod === "cash" ? "نقد" : p.paymentMethod === "bank_transfer" ? "تحويل" : p.paymentMethod === "card" ? "بطاقة" : "أخرى"}</span>
                      <span className="text-[var(--text-3)] tabular-nums">{fmtDate(p.paymentDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add payment inline */}
            {showPayment && (
              <div className="border border-brand-200 rounded-xl p-4 bg-brand-soft space-y-3">
                <p className="text-sm font-semibold text-[var(--text-1)]">تسجيل دفعة جديدة</p>
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
            <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-xs leading-none">ن</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-700 leading-none">ترميز OS</p>
                  <p className="text-[10px] text-[var(--text-3)] leading-none mt-0.5" dir="ltr">tarmizos.com</p>
                </div>
              </div>
              {orgCtx?.orgCode && (
                <span className="font-mono text-xs text-[var(--text-3)] bg-[var(--surface-2)] border border-[var(--border)] px-2 py-1 rounded-lg" dir="ltr">
                  {orgCtx.orgCode}
                </span>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* FAQ */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
        <h3 className="font-semibold text-[var(--text-1)] mb-4 text-sm">الأسئلة الشائعة</h3>
        <div className="space-y-3">
          {[
            { q: "ما الفرق بين «بانتظار الدفع» و«متأخرة»؟", a: "«بانتظار الدفع» تعني الفاتورة أُصدرت ولم يحن موعد الاستحقاق أو لم يُحدَّد. «متأخرة» تعني تجاوزت تاريخ الاستحقاق ولم تُسدَّد." },
            { q: "ما المقصود بـ «مدفوع جزئياً»؟", a: "تم استلام جزء من مبلغ الفاتورة فقط. يمكنك إضافة دفعات متعددة حتى يكتمل المبلغ وتتحول الفاتورة إلى «تم الدفع»." },
            { q: "هل يمكنني إرسال الفاتورة مباشرة للعميل؟", a: "نعم، اضغط على أيقونة الإرسال في قائمة الفواتير أو من داخل تفاصيل الفاتورة وستُرسل عبر واتساب أو بريد إلكتروني." },
            { q: "ما هي «الفاتورة الضريبية» مقابل «الفاتورة المبسّطة»؟", a: "الفاتورة الضريبية تشترط الرقم الضريبي للطرفين وتفاصيل VAT كاملة وهي مطلوبة للمعاملات بين الشركات (B2B). الفاتورة المبسّطة للمبيعات اليومية للأفراد." },
            { q: "ماذا يحدث عند إلغاء فاتورة؟", a: "تُلغى الفاتورة ويُسجَّل قيد عكسي في النظام المحاسبي تلقائياً. لا يمكن التراجع عن الإلغاء." },
          ].map(faq => (
            <details key={faq.q} className="border border-[var(--border)] rounded-xl">
              <summary className="px-[10px] py-[6px] text-sm text-[var(--text-1)] cursor-pointer font-medium hover:bg-[var(--surface-2)] rounded-xl">{faq.q}</summary>
              <p className="px-4 pb-3 text-sm text-[var(--text-2)]">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Cancel Invoice Confirmation Modal */}
      {cancelInvoiceId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-[var(--surface)] rounded-2xl shadow-token-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-danger-soft flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-6 h-6 text-danger" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-1)] mb-1">إلغاء الفاتورة</h3>
              <p className="text-sm text-[var(--text-2)]">سيتم إلغاء الفاتورة وتسجيل قيد عكسي تلقائياً. لا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setCancelInvoiceId(null)} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors">تراجع</button>
              <button onClick={doCancelInvoice} className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold hover:opacity-90 transition-colors">نعم، ألغِ الفاتورة</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Invoice Confirmation Modal */}
      {sendConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-[var(--surface)] rounded-2xl shadow-token-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-4">
                <Send className="w-6 h-6 text-brand-500" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-1)] mb-1">إرسال الفاتورة</h3>
              <p className="text-sm text-[var(--text-2)]">سيتم إرسال الفاتورة للعميل عبر واتساب أو البريد الإلكتروني.</p>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setSendConfirmId(null)} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors">تراجع</button>
              <button onClick={doSendInvoice} disabled={!!sendingId} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">نعم، أرسل الفاتورة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
