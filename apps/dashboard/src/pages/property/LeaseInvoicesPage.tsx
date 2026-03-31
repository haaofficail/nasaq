import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";

const INVOICE_STATUS_AR: Record<string, string> = {
  paid: "مدفوع", overdue: "متأخر", pending: "معلق", sent: "مُرسل",
  cancelled: "ملغي", partial: "جزئي",
};
const INVOICE_STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-600",
  pending: "bg-yellow-100 text-yellow-700",
  sent: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-gray-100 text-gray-500",
  partial: "bg-blue-100 text-blue-700",
};

const PAYMENT_METHODS_AR: Record<string, string> = {
  cash: "نقد", bank_transfer: "تحويل بنكي", cheque: "شيك",
  mada: "مدى", visa: "فيزا", stc_pay: "STC Pay",
};

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function LeaseInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showPay, setShowPay] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "bank_transfer", notes: "" });

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, loading, error, refetch } = useApi(() => propertyApi.invoices.list(params), [statusFilter, search]);
  const invoices: any[] = (data as any)?.data ?? [];

  const { mutate: generateInvoices, loading: generating } = useMutation(() => propertyApi.generateInvoices());
  const { mutate: payInvoice, loading: paying } = useMutation((d: any) => propertyApi.payInvoice(showPay?.id, d));
  const { mutate: sendInvoice } = useMutation((id: string) => propertyApi.sendInvoice(id));
  const { mutate: cancelInvoice } = useMutation((id: string) => propertyApi.cancelInvoice(id));
  const { mutate: sendReminders, loading: reminding } = useMutation(() =>
    Promise.all(
      invoices
        .filter((inv: any) => ["pending", "overdue", "sent"].includes(inv.status))
        .map((inv: any) => propertyApi.sendInvoice(inv.id))
    )
  );

  async function handleGenerate() {
    const res = await generateInvoices(undefined);
    if (res) {
      toast.success(`تم إنشاء ${(res as any).count ?? (res as any).data?.count ?? 0} فاتورة`);
      refetch();
    }
  }

  async function handleSendReminders() {
    await sendReminders(undefined);
    toast.success("تم إرسال التذكيرات للفواتير المعلقة");
    refetch();
  }

  async function handlePay() {
    const res = await payInvoice(payForm);
    if (res) { toast.success("تم تسجيل السداد"); setShowPay(null); refetch(); }
  }

  async function handleSend(invoice: any) {
    const res = await sendInvoice(invoice.id);
    if (res) { toast.success("تم إرسال الفاتورة"); refetch(); }
  }

  async function handleCancel(invoice: any) {
    if (!confirm("هل أنت متأكد من إلغاء الفاتورة؟")) return;
    const res = await cancelInvoice(invoice.id);
    if (res) { toast.success("تم إلغاء الفاتورة"); refetch(); }
  }

  const STATUS_TABS = [
    { value: "", label: "الكل" },
    { value: "paid", label: "مدفوع" },
    { value: "overdue", label: "متأخر" },
    { value: "pending", label: "معلق" },
    { value: "cancelled", label: "ملغي" },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">فواتير الإيجار</h1>
          <p className="text-sm text-gray-500 mt-0.5">متابعة الفواتير والمدفوعات</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSendReminders}
            disabled={reminding}
            className="border border-yellow-300 text-yellow-700 hover:bg-yellow-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {reminding ? "جارٍ الإرسال..." : "أرسل تذكيرات"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {generating ? "جارٍ الإنشاء..." : "أصدر فواتير الشهر"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={clsx(
                "px-3 py-1 text-xs rounded-full border transition-colors",
                statusFilter === t.value
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالعقد..." className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-500">رقم الفاتورة</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">العقد</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الفترة</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">المبلغ</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">تاريخ الاستحقاق</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">المدفوع</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الرصيد</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الحالة</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={9}><SkeletonRows /></td></tr>
            ) : error ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">لا توجد فواتير</td></tr>
            ) : (
              invoices.map((inv: any) => {
                const balance = Number(inv.amount ?? 0) - Number(inv.paidAmount ?? 0);
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.contractNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{inv.periodLabel ?? `${inv.periodStart ?? ""} — ${inv.periodEnd ?? ""}`}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{Number(inv.amount ?? 0).toLocaleString("en-US")} ريال</td>
                    <td className="px-4 py-3 text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("ar-SA") : "—"}</td>
                    <td className="px-4 py-3 text-emerald-700">{Number(inv.paidAmount ?? 0).toLocaleString("en-US")} ريال</td>
                    <td className={clsx("px-4 py-3 font-medium", balance > 0 ? "text-red-600" : "text-gray-400")}>
                      {balance.toLocaleString("en-US")} ريال
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", INVOICE_STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-600")}>
                          {INVOICE_STATUS_AR[inv.status] ?? inv.status}
                        </span>
                        {inv.isCommercial && (
                          <span className="bg-teal-100 text-teal-700 rounded-full px-2 py-0.5 text-xs font-medium">
                            ZATCA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {["pending", "overdue", "sent", "partial"].includes(inv.status) && (
                          <button
                            onClick={() => { setShowPay(inv); setPayForm({ amount: String(balance), method: "bank_transfer", notes: "" }); }}
                            className="text-xs text-emerald-700 hover:underline"
                          >
                            سداد
                          </button>
                        )}
                        {inv.status === "pending" && (
                          <button onClick={() => handleSend(inv)} className="text-xs text-blue-600 hover:underline">إرسال</button>
                        )}
                        {!["paid", "cancelled"].includes(inv.status) && (
                          <button onClick={() => handleCancel(inv)} className="text-xs text-red-500 hover:underline">إلغاء</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pay Modal */}
      {showPay && (
        <Modal title="تسجيل سداد" onClose={() => setShowPay(null)}>
          <div className="space-y-4">
            <Field label="المبلغ (ريال)">
              <input type="number" className={inputCls} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
            </Field>
            <Field label="طريقة الدفع">
              <select className={inputCls} value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                {Object.entries(PAYMENT_METHODS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="ملاحظات">
              <textarea className={clsx(inputCls, "h-20 resize-none")} value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowPay(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handlePay} disabled={paying} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {paying ? "جارٍ التسجيل..." : "تسجيل السداد"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
