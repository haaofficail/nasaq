import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";

const PAYMENT_METHODS = [
  { value: "cash", label: "كاش", color: "bg-emerald-100 text-emerald-700" },
  { value: "mortgage", label: "رهن", color: "bg-blue-100 text-blue-700" },
  { value: "installment", label: "تقسيط", color: "bg-violet-100 text-violet-700" },
];

const SALE_STATUSES: Record<string, { label: string; color: string }> = {
  pending:   { label: "معلق", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "جاري", color: "bg-blue-100 text-blue-700" },
  completed: { label: "مكتمل", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-700" },
};

export function PropertySalesPage() {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    propertyId: "",
    buyerName: "",
    buyerPhone: "",
    buyerNationalId: "",
    salePrice: "",
    paymentMethod: "cash",
    commissionRate: "2",
    notes: "",
  });

  const { data, loading, error, refetch } = useApi(() => propertyApi.sales.list(), []);
  const { data: propertiesData } = useApi(() => propertyApi.properties.list(), []);

  const sales: any[] = (data as any)?.data ?? [];
  const properties: any[] = (propertiesData as any)?.data ?? [];

  async function handleCreate() {
    if (!form.propertyId || !form.buyerName || !form.salePrice) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    setSaving(true);
    try {
      await propertyApi.sales.create({
        ...form,
        salePrice: Number(form.salePrice),
        commissionRate: Number(form.commissionRate),
      });
      toast.success("تم تسجيل عملية البيع");
      setShowModal(false);
      setForm({ propertyId: "", buyerName: "", buyerPhone: "", buyerNationalId: "", salePrice: "", paymentMethod: "cash", commissionRate: "2", notes: "" });
      refetch();
    } catch (e: any) {
      toast.error(`فشل التسجيل: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(id: string) {
    setCompletingId(id);
    try {
      await propertyApi.sales.complete(id);
      toast.success("تم إتمام عملية البيع");
      refetch();
    } catch (e: any) {
      toast.error(`فشل الإتمام: ${e.message}`);
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">عمليات البيع</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة صفقات بيع العقارات</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors"
          style={{ backgroundColor: "#5b9bd5" }}
        >
          تسجيل بيع جديد
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonRows rows={6} /></div>
        ) : error ? (
          <div className="p-6 text-red-600 bg-red-50">{error}</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg">لا توجد عمليات بيع</p>
            <p className="text-gray-300 text-sm mt-1">سجّل أول عملية بيع عبر الزر أعلاه</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">المشتري</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">العقار</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">السعر</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">طريقة الدفع</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map((sale: any) => {
                const method = PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod);
                const status = SALE_STATUSES[sale.status] ?? { label: sale.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{sale.buyerName ?? "—"}</div>
                      {sale.buyerPhone && <div className="text-xs text-gray-500">{sale.buyerPhone}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{sale.propertyName ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">
                      {Number(sale.salePrice).toLocaleString("en-US")} ر.س
                    </td>
                    <td className="px-4 py-3">
                      {method && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${method.color}`}>
                          {method.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sale.status !== "completed" && sale.status !== "cancelled" && (
                        <button
                          onClick={() => handleComplete(sale.id)}
                          disabled={completingId === sale.id}
                          className="text-xs px-3 py-1 text-white rounded-lg disabled:opacity-50"
                          style={{ backgroundColor: "#5b9bd5" }}
                        >
                          {completingId === sale.id ? "..." : "إتمام البيع"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">تسجيل بيع جديد</h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">العقار *</label>
                <select
                  value={form.propertyId}
                  onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">اختر العقار</option>
                  {properties.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">اسم المشتري *</label>
                <input
                  value={form.buyerName}
                  onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
                  placeholder="الاسم الكامل"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">رقم الجوال</label>
                <input
                  value={form.buyerPhone}
                  onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">رقم الهوية الوطنية</label>
                <input
                  value={form.buyerNationalId}
                  onChange={(e) => setForm({ ...form, buyerNationalId: e.target.value })}
                  placeholder="1xxxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">سعر البيع (ر.س) *</label>
                <input
                  type="number"
                  value={form.salePrice}
                  onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">طريقة الدفع</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">نسبة العمولة %</label>
                <input
                  type="number"
                  value={form.commissionRate}
                  onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                  placeholder="2"
                  min="0"
                  max="100"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "#5b9bd5" }}
              >
                {saving ? "جاري الحفظ..." : "تسجيل"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
