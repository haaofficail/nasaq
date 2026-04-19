import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:   { label: "مسودة", color: "bg-gray-100 text-gray-600" },
  active:  { label: "نشط", color: "bg-emerald-100 text-emerald-700" },
  rented:  { label: "مؤجر", color: "bg-blue-100 text-blue-700" },
  expired: { label: "منتهي", color: "bg-red-100 text-red-700" },
};

export function PropertyListingsPage() {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    unitId: "",
    title: "",
    description: "",
    price: "",
    imageUrl: "",
    location: "",
  });

  const { data, loading, error, refetch } = useApi(() => propertyApi.listings.list(), []);
  const { data: unitsData } = useApi(() => propertyApi.units.vacant(), []);

  const listings: any[] = (data as any)?.data ?? [];
  const vacantUnits: any[] = (unitsData as any)?.data ?? [];

  async function handleCreate() {
    if (!form.unitId || !form.title || !form.price) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    setSaving(true);
    try {
      await propertyApi.listings.create({ ...form, price: Number(form.price) });
      toast.success("تم إنشاء الإعلان");
      setShowModal(false);
      setForm({ unitId: "", title: "", description: "", price: "", imageUrl: "", location: "" });
      refetch();
    } catch (e: any) {
      toast.error(`فشل إنشاء الإعلان: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(id: string) {
    setPublishingId(id);
    try {
      await propertyApi.listings.publish(id);
      toast.success("تم نشر الإعلان");
      refetch();
    } catch (e: any) {
      toast.error(`فشل النشر: ${e.message}`);
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الإعلانات</h1>
          <p className="text-gray-500 text-sm mt-1">إعلانات الوحدات الشاغرة للتأجير</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 transition-colors"
          style={{ backgroundColor: "#5b9bd5" }}
        >
          نشر إعلان جديد
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-[#f1f5f9] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl">{error}</div>
      ) : listings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#eef2f6]">
          <p className="text-gray-400 text-lg">لا توجد إعلانات</p>
          <p className="text-gray-300 text-sm mt-1">أنشئ أول إعلان لوحداتك الشاغرة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing: any) => {
            const status = STATUS_LABELS[listing.status] ?? STATUS_LABELS.draft;
            return (
              <div key={listing.id} className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden hover:shadow-sm transition-shadow">
                {listing.imageUrl ? (
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-300 text-sm">لا توجد صورة</span>
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">{listing.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  {listing.location && (
                    <p className="text-gray-500 text-xs">{listing.location}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-blue-700">
                      {Number(listing.price).toLocaleString("en-US")} ر.س/شهر
                    </span>
                    {listing.status === "draft" && (
                      <button
                        onClick={() => handlePublish(listing.id)}
                        disabled={publishingId === listing.id}
                        className="text-xs px-3 py-1.5 text-white rounded-lg disabled:opacity-50 transition-colors"
                        style={{ backgroundColor: "#5b9bd5" }}
                      >
                        {publishingId === listing.id ? "..." : "نشر"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">إعلان جديد</h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">الوحدة *</label>
                <select
                  value={form.unitId}
                  onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">اختر الوحدة</option>
                  {vacantUnits.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.unitNumber ?? u.name} - {u.propertyName ?? ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">عنوان الإعلان *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: شقة 3 غرف بحي النزهة"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">الوصف</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="تفاصيل الوحدة..."
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">السعر الشهري (ر.س) *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">الموقع</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="الحي / المدينة"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">رابط الصورة</label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                {saving ? "جاري الإنشاء..." : "إنشاء الإعلان"}
              </button>
              <button
                onClick={() => setShowModal(false)}
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
