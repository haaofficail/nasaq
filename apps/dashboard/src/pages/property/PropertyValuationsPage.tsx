import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export function PropertyValuationsPage() {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    valuationType: "market",
    value: "",
    valuatorName: "",
    valuationDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { data, loading, error, refetch } = useApi(() => propertyApi.valuations.list(), []);
  const { data: propertiesData } = useApi(() => propertyApi.properties.list(), []);

  const valuations: any[] = (data as any)?.data ?? [];
  const properties: any[] = (propertiesData as any)?.data ?? [];

  // Build chart data: group valuations by property
  const chartDataMap: Record<string, any[]> = {};
  valuations.forEach((v: any) => {
    const propName = v.propertyName ?? v.propertyId ?? "عقار";
    if (!chartDataMap[propName]) chartDataMap[propName] = [];
    chartDataMap[propName].push({
      date: v.valuationDate ? new Date(v.valuationDate).toLocaleDateString("ar-SA") : "—",
      value: Number(v.value) || 0,
    });
  });

  const chartLines = Object.keys(chartDataMap);
  const allDates = Array.from(new Set(valuations.map((v: any) =>
    v.valuationDate ? new Date(v.valuationDate).toLocaleDateString("ar-SA") : "—"
  ))).sort();

  const chartData = allDates.map((date) => {
    const entry: Record<string, any> = { date };
    chartLines.forEach((prop) => {
      const point = chartDataMap[prop].find((d) => d.date === date);
      entry[prop] = point?.value ?? null;
    });
    return entry;
  });

  const COLORS = ["#5b9bd5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  async function handleSave() {
    if (!form.propertyId || !form.value) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    setSaving(true);
    try {
      await propertyApi.valuations.create({ ...form, value: Number(form.value) });
      toast.success("تم إضافة التقييم بنجاح");
      setShowModal(false);
      setForm({ propertyId: "", valuationType: "market", value: "", valuatorName: "", valuationDate: new Date().toISOString().split("T")[0], notes: "" });
      refetch();
    } catch (e: any) {
      toast.error(`فشل إضافة التقييم: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تطور القيمة</h1>
          <p className="text-gray-500 text-sm mt-1">تتبع تقييمات العقارات عبر الزمن</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors"
          style={{ backgroundColor: "#5b9bd5" }}
        >
          تقييم جديد
        </button>
      </div>

      {/* Chart */}
      {!loading && chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">تطور قيمة العقارات</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString("en-US")} ر.س`, ""]} />
              <Legend />
              {chartLines.map((prop, i) => (
                <Line
                  key={prop}
                  type="monotone"
                  dataKey={prop}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">سجل التقييمات</h2>
        </div>
        {loading ? (
          <div className="p-4"><SkeletonRows rows={6} /></div>
        ) : error ? (
          <div className="p-6 text-red-600 bg-red-50">{error}</div>
        ) : valuations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg">لا توجد تقييمات</p>
            <p className="text-gray-300 text-sm mt-1">أضف أول تقييم عبر الزر أعلاه</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">العقار</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">التاريخ</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">النوع</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">القيمة (ر.س)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">المقيّم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {valuations.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{v.propertyName ?? v.propertyId}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {v.valuationDate ? new Date(v.valuationDate).toLocaleDateString("ar-SA") : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {v.valuationType === "market" ? "سوقية" :
                     v.valuationType === "income" ? "دخلية" :
                     v.valuationType === "cost" ? "تكلفة" : v.valuationType}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">
                    {Number(v.value).toLocaleString("en-US")}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.valuatorName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">إضافة تقييم جديد</h2>

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
                <label className="text-sm font-medium text-gray-700 block mb-1">نوع التقييم</label>
                <select
                  value={form.valuationType}
                  onChange={(e) => setForm({ ...form, valuationType: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="market">سوقية</option>
                  <option value="income">دخلية</option>
                  <option value="cost">تكلفة</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">القيمة (ر.س) *</label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">اسم المقيّم</label>
                <input
                  value={form.valuatorName}
                  onChange={(e) => setForm({ ...form, valuatorName: e.target.value })}
                  placeholder="اسم المقيّم أو الجهة"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">تاريخ التقييم</label>
                <input
                  type="date"
                  value={form.valuationDate}
                  onChange={(e) => setForm({ ...form, valuationDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
                style={{ backgroundColor: "#5b9bd5" }}
              >
                {saving ? "جاري الحفظ..." : "حفظ التقييم"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
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
