import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const EXPENSE_CATEGORY_AR: Record<string, string> = {
  maintenance: "صيانة", utilities: "خدمات عامة", insurance: "تأمين",
  taxes: "ضرائب ورسوم", management: "إدارة", cleaning: "تنظيف",
  security: "أمن وحراسة", landscaping: "تشجير", elevator: "مصاعد",
  marketing: "تسويق", other: "أخرى",
};

const CATEGORY_COLORS = [
  "#059669", "#0d9488", "#0891b2", "#7c3aed", "#db2777",
  "#ea580c", "#ca8a04", "#16a34a", "#dc2626", "#2563eb", "#9ca3af",
];

const PAYMENT_METHODS_AR: Record<string, string> = {
  cash: "نقد", bank_transfer: "تحويل بنكي", cheque: "شيك",
  mada: "مدى", visa: "فيزا",
};

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-[#eef2f6]">
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

const inputCls = "w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function PropertyExpensesPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    propertyId: "", unitId: "", category: "maintenance", description: "",
    amount: "", paidTo: "", paidAt: "", paymentMethod: "bank_transfer",
    chargeToOwner: false, chargeToTenant: false, notes: "",
  });

  const { data: propsData } = useApi(() => propertyApi.properties.list(), []);
  const properties: any[] = (propsData as any)?.data ?? [];

  const { data: unitsData } = useApi(
    () => form.propertyId ? propertyApi.units.list({ propertyId: form.propertyId }) : Promise.resolve({ data: [] }),
    [form.propertyId]
  );
  const filteredUnits: any[] = (unitsData as any)?.data ?? [];

  const { data, loading, error, refetch } = useApi(() => propertyApi.expenses.list(), []);
  const expenses: any[] = (data as any)?.data ?? [];

  const { data: summaryData } = useApi(() => propertyApi.expensesSummary(), []);
  const summary: any = summaryData ?? {};
  const summaryByCategory: any[] = summary.byCategory ?? [];
  const topCategories: any[] = summaryByCategory.slice(0, 3);

  const { mutate: createExpense, loading: creating } = useMutation((d: any) => propertyApi.createExpense(d));

  async function handleSave() {
    const res = await createExpense(form);
    if (res) {
      toast.success("تم إضافة المصروف");
      setShowModal(false);
      setForm({ propertyId: "", unitId: "", category: "maintenance", description: "", amount: "", paidTo: "", paidAt: "", paymentMethod: "bank_transfer", chargeToOwner: false, chargeToTenant: false, notes: "" });
      refetch();
    }
  }

  // Pie chart data
  const pieData = summaryByCategory.map((item: any, i: number) => ({
    name: EXPENSE_CATEGORY_AR[item.category] ?? item.category,
    value: Number(item.total ?? 0),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المصروفات</h1>
          <p className="text-sm text-gray-500 mt-0.5">تتبع مصروفات العقارات</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          إضافة مصروف
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#eef2f6] rounded-2xl p-4 shadow-sm md:col-span-1">
          <p className="text-xs text-gray-400">إجمالي هذا الشهر</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Number(summary.thisMonth ?? 0).toLocaleString("en-US")} ريال
          </p>
        </div>
        {topCategories.map((cat: any, i: number) => (
          <div key={i} className="bg-white border border-[#eef2f6] rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400">{EXPENSE_CATEGORY_AR[cat.category] ?? cat.category}</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{Number(cat.total ?? 0).toLocaleString("en-US")} ريال</p>
          </div>
        ))}
      </div>

      {/* Pie chart + table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pie */}
        <div className="bg-white border border-[#eef2f6] rounded-2xl p-4 shadow-sm md:col-span-1">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">المصروفات حسب التصنيف</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${Number(v).toLocaleString("en-US")} ريال`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">لا توجد بيانات</div>
          )}
        </div>

        {/* Table */}
        <div className="md:col-span-2 bg-white border border-[#eef2f6] rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f8fafc]">
              <tr>
                <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">رقم المصروف</th>
                <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">العقار</th>
                <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">التصنيف</th>
                <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">الوصف</th>
                <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">المبلغ</th>
                <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">التاريخ</th>
                <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">المدفوع لـ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7}><SkeletonRows /></td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">لا توجد مصروفات</td></tr>
              ) : (
                expenses.map((e: any) => (
                  <tr key={e.id} className="hover:bg-[#f8fafc]">
                    <td className="px-[10px] py-[6px] font-medium text-gray-900 text-xs">{e.expenseNumber ?? e.id?.slice(0, 8)}</td>
                    <td className="px-[10px] py-[6px] text-gray-500">{e.propertyName ?? "—"}</td>
                    <td className="px-[10px] py-[6px]">
                      <span className="bg-teal-50 text-teal-700 rounded-full px-2 py-0.5 text-xs">
                        {EXPENSE_CATEGORY_AR[e.category] ?? e.category}
                      </span>
                    </td>
                    <td className="px-[10px] py-[6px] text-gray-500 truncate max-w-32">{e.description}</td>
                    <td className="px-[10px] py-[6px] font-medium text-gray-900">{Number(e.amount ?? 0).toLocaleString("en-US")} ريال</td>
                    <td className="px-[10px] py-[6px] text-gray-500">{e.paidAt ? new Date(e.paidAt).toLocaleDateString("ar-SA") : "—"}</td>
                    <td className="px-[10px] py-[6px] text-gray-500">{e.paidTo ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title="إضافة مصروف" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="العقار">
                <select className={inputCls} value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value, unitId: "" })}>
                  <option value="">اختر العقار</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="الوحدة (اختياري)">
                <select className={inputCls} value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
                  <option value="">اختر الوحدة</option>
                  {filteredUnits.map((u: any) => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
                </select>
              </Field>
              <Field label="التصنيف">
                <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {Object.entries(EXPENSE_CATEGORY_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="المبلغ (ريال)">
                <input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label="مدفوع لـ">
                <input className={inputCls} value={form.paidTo} onChange={(e) => setForm({ ...form, paidTo: e.target.value })} placeholder="اسم المورد..." />
              </Field>
              <Field label="تاريخ الدفع">
                <input type="date" className={inputCls} value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
              </Field>
              <Field label="طريقة الدفع">
                <select className={inputCls} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {Object.entries(PAYMENT_METHODS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            <Field label="الوصف">
              <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="chargeOwner" checked={form.chargeToOwner} onChange={(e) => setForm({ ...form, chargeToOwner: e.target.checked })} className="rounded" />
                <label htmlFor="chargeOwner" className="text-sm text-gray-700">على المالك</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="chargeTenant" checked={form.chargeToTenant} onChange={(e) => setForm({ ...form, chargeToTenant: e.target.checked })} className="rounded" />
                <label htmlFor="chargeTenant" className="text-sm text-gray-700">على المستأجر</label>
              </div>
            </div>
            <Field label="ملاحظات">
              <textarea className={clsx(inputCls, "h-20 resize-none")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[#eef2f6] rounded-xl text-gray-600 hover:bg-[#f8fafc]">إلغاء</button>
              <button onClick={handleSave} disabled={creating} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {creating ? "جارٍ الإضافة..." : "إضافة"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
