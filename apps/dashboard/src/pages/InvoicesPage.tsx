import { useState } from "react";
import { toast } from "@/hooks/useToast";
import { FileText, Plus, RefreshCw, CheckCircle2, Clock, XCircle, AlertTriangle, Eye } from "lucide-react";
import { clsx } from "clsx";
import { financeApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button, Modal, Input, Select } from "@/components/ui";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft:           { label: "مسودة",      color: "bg-gray-100 text-gray-600 border-gray-200",      icon: Clock },
  issued:          { label: "صادرة",      color: "bg-blue-50 text-blue-700 border-blue-200",        icon: FileText },
  sent:            { label: "مُرسلة",     color: "bg-indigo-50 text-indigo-700 border-indigo-200",  icon: FileText },
  paid:            { label: "مدفوعة",     color: "bg-emerald-50 text-emerald-700 border-emerald-200",icon: CheckCircle2 },
  partially_paid:  { label: "مدفوعة جزئياً", color: "bg-teal-50 text-teal-700 border-teal-200",   icon: Clock },
  overdue:         { label: "متأخرة",     color: "bg-red-50 text-red-700 border-red-200",           icon: AlertTriangle },
  cancelled:       { label: "ملغاة",      color: "bg-gray-100 text-gray-500 border-gray-200",       icon: XCircle },
};

const TABS = [
  { key: "all",     label: "الكل" },
  { key: "issued",  label: "صادرة" },
  { key: "paid",    label: "مدفوعة" },
  { key: "overdue", label: "متأخرة" },
  { key: "cancelled", label: "ملغاة" },
];

function fmt(n: any) {
  return Number(n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

export function InvoicesPage() {
  const [tab, setTab]           = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<any>(null);

  const { context: orgCtx }               = useOrgContext();

  const params: Record<string, string> = {};
  if (tab !== "all") params.status = tab;

  const { data: res, loading, refetch } = useApi(() => financeApi.invoices(params), [tab]);
  const { mutate: updateStatus }        = useMutation(({ id, s }: any) => financeApi.updateInvoiceStatus(id, s));

  const invoices: any[] = res?.data || [];
  const totalIssued = invoices.filter(i => i.status !== "cancelled").reduce((s: number, i: any) => s + Number(i.totalAmount || 0), 0);
  const totalPaid   = invoices.filter(i => i.status === "paid").reduce((s: number, i: any) => s + Number(i.totalAmount || 0), 0);
  const totalUnpaid = invoices.filter(i => ["issued","sent","overdue"].includes(i.status)).reduce((s: number, i: any) => s + Number(i.totalAmount || 0), 0);

  const markPaid = async (id: string) => {
    try {
      await updateStatus({ id, s: "paid" });
      toast.success("تم تأكيد الدفع");
      refetch();
    } catch { toast.error("فشل التحديث"); }
  };

  const markCancelled = async (id: string) => {
    if (!confirm("إلغاء هذه الفاتورة؟")) return;
    try {
      await updateStatus({ id, s: "cancelled" });
      toast.success("تم الإلغاء");
      refetch();
    } catch { toast.error("فشل التحديث"); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-500" /> الفواتير
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">فواتير ضريبية متوافقة مع متطلبات زاتكا</p>
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
          { label: "إجمالي الفواتير",  value: `${invoices.length} فاتورة`,       color: "text-brand-600",   bg: "bg-brand-50" },
          { label: "إجمالي المبالغ",   value: `${fmt(totalIssued)} ر.س`,          color: "text-gray-700",    bg: "bg-gray-100" },
          { label: "مدفوعة",           value: `${fmt(totalPaid)} ر.س`,            color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "مستحقة",           value: `${fmt(totalUnpaid)} ر.س`,          color: "text-red-500",     bg: "bg-red-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.bg)}>
              <FileText className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-lg font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx("px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">قائمة الفواتير</h2>
          <span className="text-xs text-gray-400">{invoices.length} فاتورة</span>
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
        ) : invoices.length === 0 ? (
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
                <tr className="border-b border-gray-50 bg-gray-50/40">
                  <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">رقم الفاتورة</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">العميل</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden sm:table-cell">التاريخ</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden md:table-cell">الضريبة</th>
                  <th className="text-left  py-3 px-4 text-xs text-gray-400 font-semibold">الإجمالي</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
                  <th className="py-3 px-4 w-32" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => {
                  const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.issued;
                  const StatusIcon = sc.icon;
                  const canMarkPaid = ["issued", "sent", "overdue", "partially_paid"].includes(inv.status);
                  const canCancel   = ["draft", "issued", "sent"].includes(inv.status);
                  return (
                    <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <span className="text-sm font-mono font-semibold text-gray-900">{inv.invoiceNumber}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{inv.invoiceType === "simplified" ? "مبسطة" : "ضريبية"}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-sm font-medium text-gray-900">{inv.buyerName}</p>
                        {inv.buyerPhone && <p className="text-xs text-gray-400">{inv.buyerPhone}</p>}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 hidden sm:table-cell whitespace-nowrap">{fmtDate(inv.createdAt)}</td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 tabular-nums hidden md:table-cell">{fmt(inv.vatAmount)} ر.س</td>
                      <td className="py-3.5 px-4 text-left">
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{fmt(inv.totalAmount)}</span>
                        <span className="text-xs text-gray-400 mr-1">ر.س</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border", sc.color)}>
                          <StatusIcon className="w-3 h-3" /> {sc.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setViewInvoice(inv)}
                            className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors" title="عرض">
                            <Eye className="w-3.5 h-3.5 text-brand-500" />
                          </button>
                          {canMarkPaid && (
                            <button onClick={() => markPaid(inv.id)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-medium hover:bg-emerald-100 transition-colors">
                              تأكيد الدفع
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
        <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title="تفاصيل الفاتورة" size="sm"
          footer={<Button variant="secondary" onClick={() => setViewInvoice(null)}>إغلاق</Button>}>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">رقم الفاتورة</span>
              <span className="font-mono font-bold">{viewInvoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">البائع</span>
              <div className="text-right">
                <p className="font-medium">{viewInvoice.sellerName}</p>
                {orgCtx?.orgCode && (
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5" dir="ltr">{orgCtx.orgCode}</p>
                )}
              </div>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">المشتري</span>
              <span className="font-medium">{viewInvoice.buyerName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">المبلغ قبل الضريبة</span>
              <span className="tabular-nums">{fmt(viewInvoice.subtotal)} ر.س</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">الضريبة ({viewInvoice.vatRate || 15}%)</span>
              <span className="tabular-nums">{fmt(viewInvoice.vatAmount)} ر.س</span>
            </div>
            <div className="flex justify-between py-2 font-bold text-base border-b border-gray-100">
              <span>الإجمالي</span>
              <span className="tabular-nums text-brand-600">{fmt(viewInvoice.totalAmount)} ر.س</span>
            </div>

            {/* ── بصمة نسق ───────────────────────────────────── */}
            <div className="mt-2 pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* شعار نسق */}
                <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-xs leading-none">ن</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-700 leading-none">نسق</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5" dir="ltr">nasaqpro.tech</p>
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
      )}    </div>
  );
}
