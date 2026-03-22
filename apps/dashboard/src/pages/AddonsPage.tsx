import { useState } from "react";
import { Plus, Pencil, Trash2, Puzzle, Loader2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { addonsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Modal, Input, Select, TextArea, Button, Toggle } from "@/components/ui";

type AddonForm = {
  name: string;
  description: string;
  price: string;
  priceMode: string;
  isActive: boolean;
};

const initialForm: AddonForm = {
  name: "",
  description: "",
  price: "",
  priceMode: "fixed",
  isActive: true,
};

export function AddonsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState<AddonForm>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: res, loading, error, refetch } = useApi(() => addonsApi.list(), []);
  const { mutate: createAddon, loading: creating } = useMutation((data: any) => addonsApi.create(data));
  const { mutate: updateAddon, loading: updating } = useMutation(({ id, data }: any) => addonsApi.update(id, data));
  const { mutate: deleteAddon } = useMutation((id: string) => addonsApi.delete(id));

  const addons: any[] = res?.data || [];

  const openCreate = () => {
    setForm(initialForm);
    setFormErrors({});
    setEditingItem(null);
    setShowForm(true);
  };

  const openEdit = (addon: any) => {
    setForm({
      name: addon.name || "",
      description: addon.description || "",
      price: addon.price != null ? String(addon.price) : "",
      priceMode: addon.priceMode || "fixed",
      isActive: addon.isActive !== false,
    });
    setFormErrors({});
    setEditingItem(addon);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "اسم الإضافة مطلوب";
    if (!form.price || parseFloat(form.price) < 0) errs.price = "السعر مطلوب";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    const payload = {
      name: form.name.trim(),
      description: form.description || undefined,
      price: form.price,
      priceMode: form.priceMode,
      isActive: form.isActive,
    };

    if (editingItem) {
      await updateAddon({ id: editingItem.id, data: payload });
    } else {
      await createAddon(payload);
    }
    setShowForm(false);
    refetch();
  };

  const handleDelete = async (addon: any) => {
    if (!confirm(`حذف إضافة "${addon.name}"؟`)) return;
    await deleteAddon(addon.id);
    refetch();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-9 h-9 text-red-400" />
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">الإضافات</h1>
          <p className="text-sm text-gray-400 mt-0.5">{addons.length} إضافة</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>إضافة جديدة</Button>
      </div>

      {addons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Puzzle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد إضافات بعد</h3>
          <p className="text-sm text-gray-400 mb-4">أنشئ إضافات يمكن إرفاقها بالخدمات</p>
          <Button icon={Plus} onClick={openCreate}>إضافة جديدة</Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold uppercase tracking-wide">الإضافة</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">السعر</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">النوع</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الحالة</th>
                <th className="py-3 px-4 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {addons.map((addon: any) => (
                <tr key={addon.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div>
                      <p className="font-medium text-gray-900">{addon.name}</p>
                      {addon.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{addon.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold tabular-nums text-gray-900">
                    {Number(addon.price || 0).toLocaleString("ar-SA")}
                    {addon.priceMode === "percentage" ? "%" : " ر.س"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      addon.priceMode === "percentage"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-blue-50 text-blue-600"
                    )}>
                      {addon.priceMode === "percentage" ? "نسبة مئوية" : "سعر ثابت"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      addon.isActive !== false
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-gray-100 text-gray-500"
                    )}>
                      {addon.isActive !== false ? "نشطة" : "غير نشطة"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(addon)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(addon)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingItem ? "تعديل الإضافة" : "إضافة جديدة"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} loading={creating || updating}>
              {editingItem ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="اسم الإضافة"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="مثال: كرسي إضافي، تصوير، باقة زهور"
            required
            error={formErrors.name}
          />
          <TextArea
            label="وصف الإضافة (اختياري)"
            name="description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="وصف مختصر يظهر للعميل"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="السعر"
              name="price"
              type="number"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="0"
              dir="ltr"
              required
              error={formErrors.price}
            />
            <Select
              label="نوع السعر"
              name="priceMode"
              value={form.priceMode}
              onChange={(e) => setForm((f) => ({ ...f, priceMode: e.target.value }))}
              options={[
                { value: "fixed", label: "سعر ثابت (ر.س)" },
                { value: "percentage", label: "نسبة مئوية (%)" },
              ]}
            />
          </div>
          <Toggle
            checked={form.isActive}
            onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            label="الإضافة نشطة ومتاحة"
          />
        </div>
      </Modal>
    </div>
  );
}
