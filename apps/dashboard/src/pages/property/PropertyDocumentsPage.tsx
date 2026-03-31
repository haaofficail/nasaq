import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";

const DOC_TYPES = [
  { value: "", label: "كل الأنواع" },
  { value: "deed", label: "صك الملكية" },
  { value: "building_permit", label: "رخصة البناء" },
  { value: "occupancy", label: "شهادة الإشغال" },
  { value: "civil_defense", label: "رخصة الدفاع المدني" },
  { value: "insurance", label: "التأمين" },
  { value: "white_land", label: "رسوم الأراضي البيضاء" },
  { value: "other", label: "أخرى" },
];

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) return <span className="text-gray-400 text-sm">—</span>;
  const days = daysUntil(expiryDate);
  if (days < 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
        منتهية
      </span>
    );
  if (days <= 30)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
        تنتهي خلال {days} يوم
      </span>
    );
  return <span className="text-sm text-gray-600">{new Date(expiryDate).toLocaleDateString("ar-SA")}</span>;
}

export function PropertyDocumentsPage() {
  const [propertyId, setPropertyId] = useState("");
  const [docType, setDocType] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    docType: "deed",
    title: "",
    fileUrl: "",
    expiryDate: "",
  });

  const params: Record<string, string> = {};
  if (propertyId) params.propertyId = propertyId;
  if (docType) params.docType = docType;

  const { data, loading, error, refetch } = useApi(
    () => propertyApi.documents.list(params),
    [propertyId, docType]
  );

  const { data: propertiesData } = useApi(() => propertyApi.properties.list(), []);

  const docs: any[] = (data as any)?.data ?? [];
  const properties: any[] = (propertiesData as any)?.data ?? [];

  async function handleSave() {
    if (!form.propertyId || !form.title || !form.docType) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    setSaving(true);
    try {
      await propertyApi.documents.create(form);
      toast.success("تم رفع الوثيقة بنجاح");
      setShowModal(false);
      setForm({ propertyId: "", docType: "deed", title: "", fileUrl: "", expiryDate: "" });
      refetch();
    } catch (e: any) {
      toast.error(`فشل رفع الوثيقة: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">أرشيف الوثائق</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة وثائق العقارات والمستندات القانونية</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors"
          style={{ backgroundColor: "#5b9bd5" }}
        >
          رفع وثيقة
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">كل العقارات</option>
          {properties.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonRows rows={6} /></div>
        ) : error ? (
          <div className="p-6 text-red-600 bg-red-50">{error}</div>
        ) : docs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg">لا توجد وثائق</p>
            <p className="text-gray-300 text-sm mt-1">ارفع أول وثيقة عبر الزر أعلاه</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">العنوان</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">النوع</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">العقار</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">تاريخ الانتهاء</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {doc.fileUrl ? (
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {doc.title}
                      </a>
                    ) : doc.title}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {DOC_TYPES.find((t) => t.value === doc.docType)?.label ?? doc.docType}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{doc.propertyName ?? "—"}</td>
                  <td className="px-4 py-3"><ExpiryBadge expiryDate={doc.expiryDate} /></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      doc.status === "active" ? "bg-emerald-100 text-emerald-700" :
                      doc.status === "expired" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {doc.status === "active" ? "ساري" : doc.status === "expired" ? "منتهي" : doc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">رفع وثيقة جديدة</h2>

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
                <label className="text-sm font-medium text-gray-700 block mb-1">نوع الوثيقة *</label>
                <select
                  value={form.docType}
                  onChange={(e) => setForm({ ...form, docType: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {DOC_TYPES.filter((t) => t.value).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">العنوان *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: صك ملكية - شقة 1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">رابط الملف</label>
                <input
                  value={form.fileUrl}
                  onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                style={{ backgroundColor: "#5b9bd5" }}
              >
                {saving ? "جاري الرفع..." : "رفع الوثيقة"}
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
