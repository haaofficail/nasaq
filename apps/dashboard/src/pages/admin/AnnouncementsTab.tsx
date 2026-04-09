import React, { useState } from "react";
import { Plus, Megaphone, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { adminApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { SectionHeader, Spinner, Empty } from "./shared";

function AnnouncementsTab() {
  const { data, loading, refetch } = useApi(() => adminApi.announcements(), []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", type: "info" });
  const { mutate: create, loading: creating } = useMutation((d: any) => adminApi.createAnnouncement(d));
  const { mutate: del } = useMutation((id: string) => adminApi.deleteAnnouncement(id));
  const rows: any[] = data?.data || [];

  const TYPE_COLORS: Record<string, string> = {
    info: "bg-blue-50 text-blue-600", warning: "bg-amber-50 text-amber-700",
    maintenance: "bg-orange-50 text-orange-700", feature: "bg-emerald-50 text-emerald-700",
  };
  const TYPE_LABELS: Record<string, string> = { info: "معلومات", warning: "تحذير", maintenance: "صيانة", feature: "ميزة جديدة" };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    const result = await create(form);
    if (result) {
      toast.success("تم نشر الإعلان بنجاح");
      setForm({ title: "", body: "", type: "info" });
      setShowForm(false);
      refetch();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا الإعلان؟")) return;
    const result = await del(id);
    if (result) {
      toast.success("تم حذف الإعلان");
      refetch();
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="الإعلانات" sub="إشعارات وتحديثات المنصة"
        action={
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600">
            <Plus className="w-4 h-4" /> إعلان جديد
          </button>
        }
      />
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="عنوان الإعلان" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="نص الإعلان..." rows={3}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none resize-none focus:border-brand-400" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none">
              <option value="info">معلومات</option>
              <option value="warning">تحذير</option>
              <option value="maintenance">صيانة</option>
              <option value="feature">ميزة جديدة</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">إلغاء</button>
            <button disabled={creating || !form.title.trim()} onClick={handleCreate}
              className="flex-1 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "نشر الإعلان"}
            </button>
          </div>
        </div>
      )}
      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={Megaphone} text="لا توجد إعلانات" /> : (
        <div className="space-y-2">
          {rows.map((a: any) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4">
              <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 mt-0.5", TYPE_COLORS[a.type])}>
                {TYPE_LABELS[a.type] || a.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{a.body}</p>
                <p className="text-[10px] text-gray-300 mt-1">{a.createdAt ? new Date(a.createdAt).toLocaleDateString("ar") : ""}</p>
              </div>
              <button onClick={() => handleDelete(a.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AnnouncementsTab;
