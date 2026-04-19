import { useState } from "react";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";

export function TenantPortalPage() {
  const [query, setQuery] = useState("");
  const [queryType, setQueryType] = useState<"contract" | "phone">("contract");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    description: "",
    unitId: "",
    priority: "normal",
  });

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params: Record<string, string> = queryType === "contract"
        ? { contractNumber: query }
        : { phone: query };
      const res = await propertyApi.tenants.list(params) as any;
      if (res?.data?.length > 0) {
        setResult(res.data[0]);
      } else {
        setError("لم يتم العثور على مستأجر بهذه البيانات");
      }
    } catch (e: any) {
      setError(e.message ?? "حدث خطأ أثناء البحث");
    } finally {
      setLoading(false);
    }
  }

  async function handleMaintenanceSubmit() {
    if (!maintenanceForm.description) {
      toast.error("يرجى كتابة وصف للطلب");
      return;
    }
    setMaintenanceSaving(true);
    try {
      await propertyApi.maintenance.create({
        ...maintenanceForm,
        tenantId: result?.id,
        source: "portal",
      });
      toast.success("تم إرسال طلب الصيانة بنجاح");
      setShowMaintenanceModal(false);
      setMaintenanceForm({ description: "", unitId: "", priority: "normal" });
    } catch (e: any) {
      toast.error(`فشل إرسال الطلب: ${e.message}`);
    } finally {
      setMaintenanceSaving(false);
    }
  }

  const invoices: any[] = result?.invoices ?? result?.pendingInvoices ?? [];
  const statement: any[] = result?.statement ?? result?.transactions ?? [];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">بوابة المستأجر</h1>
        <p className="text-gray-500 text-sm mt-1">عرض بيانات المستأجر عبر رقم العقد أو الجوال</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-6 space-y-4">
        <div className="flex gap-3">
          <select
            value={queryType}
            onChange={(e) => setQueryType(e.target.value as any)}
            className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="contract">رقم العقد</option>
            <option value="phone">رقم الجوال</option>
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={queryType === "contract" ? "مثال: CONT-001" : "05xxxxxxxx"}
            className="flex-1 border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-5 py-2 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "#5b9bd5" }}
          >
            {loading ? "جاري البحث..." : "بحث"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
        )}
      </div>

      {loading && <SkeletonRows rows={5} />}

      {result && (
        <div className="space-y-5">
          {/* Tenant Info */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{result.name}</h2>
                <p className="text-gray-500 text-sm">{result.phone}</p>
                <p className="text-gray-500 text-sm">{result.unitName ?? result.unitId ?? ""}</p>
              </div>
              <button
                onClick={() => setShowMaintenanceModal(true)}
                className="px-4 py-2 text-white rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: "#5b9bd5" }}
              >
                رفع طلب صيانة
              </button>
            </div>
          </div>

          {/* Pending Invoices */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
            <div className="px-[10px] py-[6px] border-b border-[#eef2f6]">
              <h3 className="font-semibold text-gray-800">الفواتير المعلقة</h3>
            </div>
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">لا توجد فواتير معلقة</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">رقم الفاتورة</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">الفترة</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">المبلغ</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">تاريخ الاستحقاق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-2 font-medium text-gray-900">{inv.invoiceNumber ?? `#${inv.id?.slice(-4)}`}</td>
                      <td className="px-4 py-2 text-gray-600">{inv.period ?? inv.month ?? "—"}</td>
                      <td className="px-4 py-2 font-semibold text-red-600">
                        {Number(inv.amount).toLocaleString("en-US")} ر.س
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("ar-SA") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Statement */}
          {statement.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
              <div className="px-[10px] py-[6px] border-b border-[#eef2f6]">
                <h3 className="font-semibold text-gray-800">كشف الحساب</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">التاريخ</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">البيان</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">مدين</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">دائن</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statement.map((tx: any, i: number) => (
                    <tr key={i} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-2 text-gray-600">
                        {tx.date ? new Date(tx.date).toLocaleDateString("ar-SA") : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-900">{tx.description ?? "—"}</td>
                      <td className="px-4 py-2 text-red-600">
                        {tx.debit ? Number(tx.debit).toLocaleString("en-US") : "—"}
                      </td>
                      <td className="px-4 py-2 text-emerald-600">
                        {tx.credit ? Number(tx.credit).toLocaleString("en-US") : "—"}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {tx.balance !== undefined ? Number(tx.balance).toLocaleString("en-US") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">رفع طلب صيانة</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">وصف المشكلة *</label>
                <textarea
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  rows={3}
                  placeholder="صف المشكلة بالتفصيل..."
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">الأولوية</label>
                <select
                  value={maintenanceForm.priority}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value })}
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="low">منخفضة</option>
                  <option value="normal">عادية</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleMaintenanceSubmit}
                disabled={maintenanceSaving}
                className="flex-1 py-2 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "#5b9bd5" }}
              >
                {maintenanceSaving ? "جاري الإرسال..." : "إرسال الطلب"}
              </button>
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="flex-1 py-2 border border-[#eef2f6] text-gray-700 rounded-xl text-sm hover:bg-[#f8fafc]"
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
