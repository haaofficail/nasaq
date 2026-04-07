import { useState, useEffect } from "react";
import { accountingApi } from "../lib/api";

const TYPE_LABELS: Record<string, string> = {
  branch: "فرع",
  department: "قسم",
  project: "مشروع",
  property: "عقار",
  vehicle: "مركبة",
  employee: "موظف",
};

const TYPE_COLORS: Record<string, string> = {
  branch: "bg-blue-100 text-blue-700",
  department: "bg-purple-100 text-purple-700",
  project: "bg-green-100 text-green-700",
  property: "bg-orange-100 text-orange-700",
  vehicle: "bg-cyan-100 text-cyan-700",
  employee: "bg-pink-100 text-pink-700",
};

const EMPTY_FORM = {
  code: "",
  name: "",
  nameEn: "",
  type: "department",
  parentId: "",
  notes: "",
  isActive: true,
};

export function CostCentersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await accountingApi.costCenters.list();
      setItems(res.data ?? []);
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      code: item.code,
      name: item.name,
      nameEn: item.name_en || "",
      type: item.type,
      parentId: item.parent_id || "",
      notes: item.notes || "",
      isActive: item.is_active,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setFormError("الكود والاسم حقلان مطلوبان");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || undefined,
        type: form.type,
        parentId: form.parentId || undefined,
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
      };
      if (editing) {
        await accountingApi.costCenters.update(editing.id, payload);
      } else {
        await accountingApi.costCenters.create(payload);
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setFormError(e.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await accountingApi.costCenters.delete(id);
      setDeleteConfirm(null);
      load();
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء الحذف");
    }
  };

  const activeItems = items.filter((i) => i.is_active);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مراكز التكلفة</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة مراكز التكلفة والتصنيف المالي</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-brand-500 hover:bg-[#4a87c0] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          إضافة مركز تكلفة
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
          <button onClick={load} className="mr-3 underline text-red-600">إعادة المحاولة</button>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 animate-pulse">
              <div className="w-20 h-4 bg-gray-200 rounded" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
              <div className="w-16 h-6 bg-gray-200 rounded-full" />
              <div className="w-24 h-4 bg-gray-200 rounded" />
              <div className="w-16 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="text-4xl text-gray-300 mb-4 select-none">&#9776;</div>
          <p className="text-gray-500 text-lg font-medium">لا توجد مراكز تكلفة</p>
          <p className="text-gray-400 text-sm mt-2">ابدأ بإضافة أول مركز تكلفة لمنشأتك</p>
          <button onClick={openAdd} className="mt-6 bg-brand-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-[#4a87c0] transition-colors">
            إضافة مركز تكلفة
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && items.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3">الكود</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">الاسم</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">النوع</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">المركز الأب</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">الحالة</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-brand-500">{item.code}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.name_en && <div className="text-xs text-gray-400">{item.name_en}</div>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[item.type] || "bg-gray-100 text-gray-600"}`}>
                        {TYPE_LABELS[item.type] || item.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {item.parent_name || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {item.is_active ? "نشط" : "موقوف"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-xs text-brand-500 hover:text-[#4a87c0] font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          إيقاف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            {activeItems.length} مركز نشط من أصل {items.length}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? "تعديل مركز التكلفة" : "إضافة مركز تكلفة"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الكود <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="مثال: CC-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">النوع <span className="text-red-500">*</span></label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (عربي) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="اسم مركز التكلفة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (إنجليزي)</label>
                <input
                  type="text"
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Cost center name in English"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المركز الأب</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="">بدون مركز أب</option>
                  {items
                    .filter((i) => !editing || i.id !== editing.id)
                    .map((i) => (
                      <option key={i.id} value={i.id}>{i.code} — {i.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                  placeholder="ملاحظات إضافية..."
                />
              </div>
              {editing && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">الحالة:</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? "bg-brand-500" : "bg-gray-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? "translate-x-1" : "translate-x-6"}`} />
                  </button>
                  <span className="text-sm text-gray-600">{form.isActive ? "نشط" : "موقوف"}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-brand-500 hover:bg-[#4a87c0] disabled:opacity-60 text-white py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {saving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">تأكيد الإيقاف</h3>
            <p className="text-sm text-gray-600">هل تريد إيقاف هذا المركز؟ سيتم وضعه كغير نشط.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-sm font-medium transition-colors"
              >
                إيقاف
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
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
