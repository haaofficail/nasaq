import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";

const METHOD_AR: Record<string, string> = {
  cash: "نقد", bank_transfer: "تحويل بنكي", cheque: "شيك",
  mada: "مدى", visa: "فيزا", stc_pay: "STC Pay",
};
const METHOD_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-700",
  bank_transfer: "bg-blue-100 text-blue-700",
  cheque: "bg-yellow-100 text-yellow-700",
  mada: "bg-teal-100 text-teal-700",
  visa: "bg-indigo-100 text-indigo-700",
  stc_pay: "bg-purple-100 text-purple-700",
};

const SOURCE_AR: Record<string, string> = {
  direct: "مباشر", via_ejar: "عبر إيجار", online_portal: "البوابة الإلكترونية",
};
const SOURCE_COLORS: Record<string, string> = {
  direct: "bg-gray-100 text-gray-600",
  via_ejar: "bg-blue-100 text-blue-700",
  online_portal: "bg-emerald-100 text-emerald-700",
};

const METHOD_ICONS: Record<string, string> = {
  cash: "＄",
  bank_transfer: "⇄",
  cheque: "⬜",
  mada: "M",
  visa: "V",
  stc_pay: "S",
};

const SOURCE_ICONS: Record<string, string> = {
  direct: "⊙",
  via_ejar: "⊛",
  online_portal: "⊕",
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

export function LeasePaymentsPage() {
  const [methodFilter, setMethodFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    contractId: "", amount: "", method: "bank_transfer", paymentSource: "direct",
    transferReference: "", notes: "",
  });

  const params: Record<string, string> = {};
  if (methodFilter) params.method = methodFilter;
  if (sourceFilter) params.paymentSource = sourceFilter;
  if (dateFrom) params.from = dateFrom;
  if (dateTo) params.to = dateTo;

  const { data, loading, error, refetch } = useApi(() => propertyApi.payments.list(params), [methodFilter, sourceFilter, dateFrom, dateTo]);
  const payments: any[] = (data as any)?.data ?? [];

  const { mutate: createPayment, loading: creating } = useMutation((d: any) => propertyApi.createPayment(d));

  async function handleSave() {
    const res = await createPayment(form);
    if (res) {
      toast.success("تم تسجيل الدفعة");
      setShowModal(false);
      setForm({ contractId: "", amount: "", method: "bank_transfer", paymentSource: "direct", transferReference: "", notes: "" });
      refetch();
    }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سجل المدفوعات</h1>
          <p className="text-sm text-gray-500 mt-0.5">سجل جميع الدفعات المستلمة</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          تسجيل دفعة
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">كل الطرق</option>
          {Object.entries(METHOD_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">كل المصادر</option>
          {Object.entries(SOURCE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-gray-500">رقم السند</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">العقد</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">المبلغ</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الطريقة</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">المصدر</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">التاريخ</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">المستلم</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8}><SkeletonRows /></td></tr>
            ) : error ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">لا توجد مدفوعات</td></tr>
            ) : (
              payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.receiptNumber ?? p.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-500">{p.contractNumber ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-emerald-700">{Number(p.amount ?? 0).toLocaleString("en-US")} ريال</td>
                  <td className="px-4 py-3">
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium inline-flex items-center gap-1", METHOD_COLORS[p.method] ?? "bg-gray-100 text-gray-600")}>
                      <span className="font-mono text-xs">{METHOD_ICONS[p.method] ?? "—"}</span>
                      {METHOD_AR[p.method] ?? p.method}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium inline-flex items-center gap-1", SOURCE_COLORS[p.paymentSource] ?? "bg-gray-100 text-gray-600")}>
                      <span className="font-mono text-xs">{SOURCE_ICONS[p.paymentSource] ?? "—"}</span>
                      {SOURCE_AR[p.paymentSource] ?? p.paymentSource ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString("ar-SA") : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.receivedBy ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title="تسجيل دفعة جديدة" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <Field label="رقم العقد / البحث">
              <input className={inputCls} value={form.contractId} onChange={(e) => setForm({ ...form, contractId: e.target.value })} placeholder="معرف العقد..." />
            </Field>
            <Field label="المبلغ (ريال)">
              <input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label="طريقة الدفع">
              <select className={inputCls} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {Object.entries(METHOD_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="مصدر الدفعة">
              <select className={inputCls} value={form.paymentSource} onChange={(e) => setForm({ ...form, paymentSource: e.target.value })}>
                {Object.entries(SOURCE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="مرجع التحويل">
              <input className={inputCls} value={form.transferReference} onChange={(e) => setForm({ ...form, transferReference: e.target.value })} />
            </Field>
            <Field label="ملاحظات">
              <textarea className={clsx(inputCls, "h-20 resize-none")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleSave} disabled={creating} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {creating ? "جارٍ التسجيل..." : "تسجيل"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
