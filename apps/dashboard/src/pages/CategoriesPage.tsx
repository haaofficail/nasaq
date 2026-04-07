import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronLeft, Tag, Loader2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/hooks/useToast";
import { confirmDialog } from "@/components/ui";
import { categoriesApi, servicesApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Modal, Input, Select, Button } from "@/components/ui";

export function CategoriesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ name: "", parentId: "", icon: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: res, loading, error, refetch } = useApi(() => categoriesApi.list(true), []);
  const { data: servicesRes } = useApi(() => servicesApi.list(), []);
  const servicesByCategoryId = ((servicesRes?.data ?? []) as any[]).reduce((acc: Record<string, number>, s: any) => {
    if (s.categoryId) acc[s.categoryId] = (acc[s.categoryId] ?? 0) + 1;
    return acc;
  }, {});
  const { mutate: createCat, loading: creating } = useMutation((data: any) => categoriesApi.create(data));
  const { mutate: updateCat, loading: updating } = useMutation(({ id, data }: any) => categoriesApi.update(id, data));
  const { mutate: deleteCat } = useMutation((id: string) => categoriesApi.delete(id));

  const categories: any[] = res?.data || [];
  const parents = categories.filter((c) => !c.parentId);
  const parentOptions = [
    { value: "", label: "بدون تصنيف رئيسي" },
    ...parents.map((p: any) => ({ value: p.id, label: p.name })),
  ];

  const openCreate = () => {
    setForm({ name: "", parentId: "", icon: "" });
    setFormErrors({});
    setEditingItem(null);
    setShowCreate(true);
  };

  const openEdit = (cat: any) => {
    setForm({ name: cat.name, parentId: cat.parentId || "", icon: cat.icon || "" });
    setFormErrors({});
    setEditingItem(cat);
    setShowCreate(true);
  };

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "اسم التصنيف مطلوب";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    const payload = {
      name: form.name.trim(),
      parentId: form.parentId || null,
      icon: form.icon || undefined,
    };

    if (editingItem) {
      await updateCat({ id: editingItem.id, data: payload });
    } else {
      await createCat(payload);
    }
    setShowCreate(false);
    refetch();
  };

  const handleDelete = async (cat: any) => {
    const ok = await confirmDialog({ title: `حذف تصنيف "${cat.name}"؟`, danger: true, confirmLabel: "حذف" });
    if (!ok) return;
    await deleteCat(cat.id);
    toast.success("تم حذف التصنيف");
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
          <h1 className="text-xl font-bold text-gray-900">التصنيفات</h1>
          <p className="text-sm text-gray-400 mt-0.5">{categories.length} تصنيف</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>إضافة تصنيف</Button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Tag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد تصنيفات بعد</h3>
          <p className="text-sm text-gray-400 mb-4">أنشئ تصنيفات لتنظيم خدماتك</p>
          <Button icon={Plus} onClick={openCreate}>إضافة تصنيف</Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {parents.map((parent: any) => {
            const children = categories.filter((c) => c.parentId === parent.id);
            return (
              <div key={parent.id} className="border-b border-gray-100 last:border-b-0">
                {/* Parent row */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50/60 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {parent.icon && <span className="text-xl">{parent.icon}</span>}
                    <Tag className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="text-sm font-semibold text-gray-900">{parent.name}</span>
                    {children.length > 0 && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {children.length} فرعي
                      </span>
                    )}
                    {servicesByCategoryId[parent.id] != null && (
                      <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                        {servicesByCategoryId[parent.id]} خدمة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(parent)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(parent)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Children rows */}
                {children.map((child: any) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between px-5 py-2.5 border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 pr-6">
                      <ChevronLeft className="w-3 h-3 text-gray-300" />
                      {child.icon && <span className="text-base">{child.icon}</span>}
                      <span className="text-sm text-gray-700">{child.name}</span>
                      {servicesByCategoryId[child.id] != null && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {servicesByCategoryId[child.id]} خدمة
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(child)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(child)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Orphan categories */}
          {categories
            .filter((c) => !c.parentId && !parents.find((p: any) => p.id === c.id))
            .map((cat: any) => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-5 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {cat.icon && <span className="text-xl">{cat.icon}</span>}
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{cat.name}</span>
                  {servicesByCategoryId[cat.id] != null && (
                    <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                      {servicesByCategoryId[cat.id]} خدمة
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={editingItem ? "تعديل التصنيف" : "تصنيف جديد"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} loading={creating || updating}>
              {editingItem ? "حفظ التعديلات" : "إضافة التصنيف"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="اسم التصنيف"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="مثال: خيام وقاعات"
            required
            error={formErrors.name}
          />
          <Select
            label="التصنيف الرئيسي"
            name="parentId"
            value={form.parentId}
            onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
            options={editingItem
              ? parentOptions.filter((o) => o.value !== editingItem.id)
              : parentOptions}
          />
          <Input
            label="الأيقونة (اموجي — اختياري)"
            name="icon"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            placeholder="مثال: 🏕️"
          />
        </div>
      </Modal>
    </div>
  );
}
