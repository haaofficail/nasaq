import { useState } from "react";
import {
  Package, Plus, Pencil, Trash2, Loader2, AlertCircle, ChevronLeft,
  Flower2, Boxes, Wrench, DollarSign, Users, Eye, X, Check, ClipboardList,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/hooks/useToast";
import { confirmDialog } from "@/components/ui";
import { useApi, useMutation } from "@/hooks/useApi";
import { eventPackagesApi } from "@/lib/api";
import { Modal, Input, Select, Button } from "@/components/ui";

// ── Constants ─────────────────────────────────────────────────────────────────

const PACKAGE_TYPES = [
  { value: "kiosk",           label: "كوش" },
  { value: "reception_table", label: "طاولة استقبال" },
  { value: "entrance",        label: "مدخل ترحيبي" },
  { value: "wedding",         label: "حفل زواج" },
  { value: "newborn",         label: "استقبال مولود" },
  { value: "custom",          label: "مخصص" },
];

const TYPE_COLORS: Record<string, string> = {
  kiosk:           "bg-pink-100 text-pink-700",
  reception_table: "bg-blue-100 text-blue-700",
  entrance:        "bg-purple-100 text-purple-700",
  wedding:         "bg-rose-100 text-rose-700",
  newborn:         "bg-amber-100 text-amber-700",
  custom:          "bg-gray-100 text-gray-700",
};

const ITEM_TYPES = [
  { value: "asset",               label: "أصل صناعي",        icon: Boxes },
  { value: "consumable_natural",  label: "ورد طبيعي",        icon: Flower2 },
  { value: "consumable_product",  label: "مستلزم / تغليف",   icon: Package },
  { value: "service_fee",         label: "رسوم خدمة",        icon: DollarSign },
  { value: "task",                label: "مهمة / عمالة",     icon: ClipboardList },
];

const ASSET_CATEGORIES = [
  { value: "artificial_flowers", label: "ورد صناعي" },
  { value: "stands",             label: "ستاندات وحوامل" },
  { value: "backdrops",          label: "خلفيات" },
  { value: "vases",              label: "فازات تشغيلية" },
  { value: "holders",            label: "قواعد وأطواق" },
  { value: "decor",              label: "قطع ديكور" },
  { value: "kiosk_equipment",    label: "تجهيزات كوش" },
  { value: "other",              label: "أخرى" },
];

// ── Main Page ──────────────────────────────────────────────────────────────────

export function EventPackagesPage({ embedded }: { embedded?: boolean } = {}) {
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", type: "kiosk", description: "", worker_count: "2", setup_notes: "",
  });

  const { data: res, loading, error, refetch } = useApi(() => eventPackagesApi.list(), []);
  const { mutate: createPkg, loading: creating } = useMutation((d: any) => eventPackagesApi.create(d));
  const { mutate: updatePkg, loading: updating } = useMutation(({ id, ...d }: any) => eventPackagesApi.update(id, d));
  const { mutate: deletePkg } = useMutation((id: string) => eventPackagesApi.delete(id));

  const packages: any[] = res?.data ?? [];

  const openCreate = () => {
    setForm({ name: "", type: "kiosk", description: "", worker_count: "2", setup_notes: "" });
    setEditingPkg(null);
    setShowForm(true);
  };
  const openEdit = (pkg: any) => {
    setForm({
      name: pkg.name, type: pkg.type, description: pkg.description ?? "",
      worker_count: String(pkg.worker_count ?? 2), setup_notes: pkg.setup_notes ?? "",
    });
    setEditingPkg(pkg);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("اسم الخطة مطلوب"); return; }
    const payload = {
      name: form.name.trim(), type: form.type,
      description: form.description || undefined,
      worker_count: Number(form.worker_count) || 2,
      setup_notes: form.setup_notes || undefined,
    };
    if (editingPkg) {
      await updatePkg({ id: editingPkg.id, ...payload });
      toast.success("تم تحديث الخطة");
      if (selected?.id === editingPkg.id) setSelected((s: any) => ({ ...s, ...payload }));
    } else {
      await createPkg(payload);
      toast.success("تم إنشاء الخطة");
    }
    setShowForm(false);
    refetch();
  };

  const handleDelete = async (pkg: any) => {
    const ok = await confirmDialog({ title: `حذف "${pkg.name}"؟`, danger: true, confirmLabel: "حذف" });
    if (!ok) return;
    await deletePkg(pkg.id);
    toast.success("تم حذف الخطة");
    if (selected?.id === pkg.id) setSelected(null);
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

  // ── Detail View ────────────────────────────────────────────────
  if (selected) {
    return (
      <PackageDetail
        pkg={selected}
        onBack={() => setSelected(null)}
        onEdit={() => openEdit(selected)}
        onDelete={() => handleDelete(selected)}
        onRefresh={refetch}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header — hidden when embedded inside FlowerCatalogPage */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">خطط التجهيز</h1>
            <p className="text-sm text-gray-400 mt-0.5">خطة داخلية تُحدِّد عناصر التجهيز والكميات والعمال لكل حدث — تُطبَّق تلقائياً عند إنشاء المشروع</p>
          </div>
          <Button icon={Plus} onClick={openCreate}>خطة جديدة</Button>
        </div>
      )}
      {embedded && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">خطة داخلية تُحدِّد عناصر التجهيز والكميات والعمال لكل حدث — تُطبَّق تلقائياً عند إنشاء المشروع</p>
          <Button icon={Plus} onClick={openCreate} size="sm">خطة جديدة</Button>
        </div>
      )}

      {/* Empty */}
      {packages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد خطط تجهيز بعد</h3>
          <p className="text-sm text-gray-400 mb-5">أنشئ خطة تجهيز لكوش زواج أو استقبال مولود — تُطبَّق تلقائياً على المشاريع</p>
          <Button icon={Plus} onClick={openCreate}>إنشاء أول خطة تجهيز</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg: any) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onSelect={() => setSelected(pkg)}
              onEdit={() => openEdit(pkg)}
              onDelete={() => handleDelete(pkg)}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingPkg ? "تعديل خطة التجهيز" : "خطة تجهيز جديدة"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} loading={creating || updating}>
              {editingPkg ? "حفظ التعديلات" : "إنشاء"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input name="name" label="اسم الخطة" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="مثال: كوش زواج كلاسيك" required />
          <Select name="type" label="نوع الحدث" value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            options={PACKAGE_TYPES} />
          <Input name="description" label="الوصف (اختياري)" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="وصف مختصر للخطة" />
          <div className="grid grid-cols-2 gap-3">
            <Input name="worker_count" label="عدد العمال" type="number" value={form.worker_count}
              onChange={e => setForm(f => ({ ...f, worker_count: e.target.value }))} />
            <div />
          </div>
          <Input name="setup_notes" label="ملاحظات التجهيز" value={form.setup_notes}
            onChange={e => setForm(f => ({ ...f, setup_notes: e.target.value }))}
            placeholder="تعليمات التنفيذ الداخلية" />
        </div>
      </Modal>
    </div>
  );
}

// ── Package Card ───────────────────────────────────────────────────────────────

function PackageCard({ pkg, onSelect, onEdit, onDelete }: {
  pkg: any; onSelect: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const typeLabel = PACKAGE_TYPES.find(t => t.value === pkg.type)?.label ?? pkg.type;
  const color = TYPE_COLORS[pkg.type] ?? TYPE_COLORS.custom;

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:border-brand-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-full", color)}>
          {typeLabel}
        </span>
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1">{pkg.name}</h3>
      {pkg.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{pkg.description}</p>}

      <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">
        <span className="flex items-center gap-1">
          <Package className="w-3.5 h-3.5" /> {pkg.item_count} بند
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {pkg.worker_count} عامل
        </span>
        {Number(pkg.estimated_cost) > 0 && (
          <span className="flex items-center gap-1 text-brand-600 font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            {Number(pkg.estimated_cost).toLocaleString("ar-SA")} ر.س
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 mt-3 text-brand-500 text-xs font-medium">
        عرض التفاصيل <ChevronLeft className="w-3 h-3 rotate-180" />
      </div>
    </div>
  );
}

// ── Package Detail ─────────────────────────────────────────────────────────────

function PackageDetail({ pkg, onBack, onEdit, onDelete, onRefresh }: {
  pkg: any; onBack: () => void; onEdit: () => void; onDelete: () => void; onRefresh: () => void;
}) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: detailRes, loading, refetch: refetchDetail } = useApi(
    () => eventPackagesApi.get(pkg.id), [pkg.id]
  );
  const { mutate: addItem, loading: addingItem } = useMutation((d: any) =>
    eventPackagesApi.addItem(pkg.id, d));
  const { mutate: deleteItem } = useMutation(({ itemId }: any) =>
    eventPackagesApi.deleteItem(pkg.id, itemId));

  const detail: any = detailRes?.data ?? pkg;
  const items: any[] = detail.items ?? [];

  const [itemForm, setItemForm] = useState({
    item_type: "asset", asset_category: "kiosk_equipment",
    description: "", quantity: "1", unit: "قطعة", unit_cost_estimate: "0",
  });

  const handleAddItem = async () => {
    if (!itemForm.description.trim()) { toast.error("الوصف مطلوب"); return; }
    const payload: any = {
      item_type: itemForm.item_type,
      description: itemForm.description.trim(),
      quantity: Number(itemForm.quantity) || 1,
      unit: itemForm.unit,
      unit_cost_estimate: Number(itemForm.unit_cost_estimate) || 0,
    };
    if (itemForm.item_type === "asset") payload.asset_category = itemForm.asset_category;

    await addItem(payload);
    toast.success("تم إضافة البند");
    setShowAddItem(false);
    refetchDetail();
    onRefresh();
  };

  const handleDeleteItem = async (itemId: string) => {
    const ok = await confirmDialog({ title: "حذف البند؟", danger: true, confirmLabel: "حذف" });
    if (!ok) return;
    await deleteItem({ itemId });
    toast.success("تم حذف البند");
    refetchDetail();
    onRefresh();
  };

  const typeLabel = PACKAGE_TYPES.find(t => t.value === (detail.type ?? pkg.type))?.label;
  const color = TYPE_COLORS[detail.type ?? pkg.type] ?? TYPE_COLORS.custom;

  const groupedItems = {
    asset:              items.filter(i => i.item_type === "asset"),
    consumable_natural: items.filter(i => i.item_type === "consumable_natural"),
    consumable_product: items.filter(i => i.item_type === "consumable_product"),
    service_fee:        items.filter(i => i.item_type === "service_fee"),
  };

  const estimatedCost = items.reduce((sum, i) =>
    sum + Number(i.unit_cost_estimate) * Number(i.quantity), 0);

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-5 h-5 rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{detail.name ?? pkg.name}</h1>
            <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-full", color)}>
              {typeLabel}
            </span>
          </div>
          {detail.description && (
            <p className="text-sm text-gray-400 mt-0.5">{detail.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" icon={Eye} onClick={() => setShowPreview(true)}>فحص الجاهزية</Button>
          <Button variant="secondary" icon={Pencil} onClick={onEdit}>تعديل</Button>
          <Button variant="danger" icon={Trash2} onClick={onDelete}>حذف</Button>
        </div>
      </div>

      {/* Meta */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4 flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-medium text-gray-700">{detail.worker_count ?? pkg.worker_count} عامل</span>
        </div>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-medium text-gray-700">{items.length} بند</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-medium text-gray-700">
            تكلفة مقدرة: {estimatedCost.toLocaleString("ar-SA")} ر.س
          </span>
        </div>
        {detail.setup_notes && (
          <div className="w-full text-xs text-gray-500 border-t border-brand-100 pt-3 mt-1">
            <span className="font-medium">ملاحظات التجهيز: </span>{detail.setup_notes}
          </div>
        )}
      </div>

      {/* Items by group */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-4">
          {(Object.entries(groupedItems) as [string, any[]][]).map(([type, typeItems]) => {
            const typeMeta = ITEM_TYPES.find(t => t.value === type)!;
            const TypeIcon = typeMeta.icon;
            return (
              <div key={type} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <TypeIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">{typeMeta.label}</span>
                  <span className="text-xs text-gray-400 mr-auto">{typeItems.length} بند</span>
                </div>
                {typeItems.length === 0 ? (
                  <p className="text-sm text-gray-400 px-4 py-3">لا توجد بنود من هذا النوع</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {typeItems.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{item.description}</p>
                          <p className="text-xs text-gray-400">
                            {item.quantity} {item.unit}
                            {Number(item.unit_cost_estimate) > 0 &&
                              ` — ${Number(item.unit_cost_estimate).toLocaleString("ar-SA")} ر.س / وحدة`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Item Button */}
      <button
        onClick={() => setShowAddItem(true)}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> إضافة بند لخطة التجهيز
      </button>

      {/* Add Item Modal */}
      <Modal
        open={showAddItem}
        onClose={() => setShowAddItem(false)}
        title="إضافة بند لخطة التجهيز"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddItem(false)}>إلغاء</Button>
            <Button onClick={handleAddItem} loading={addingItem}>إضافة</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select name="item_type" label="نوع البند" value={itemForm.item_type}
            onChange={e => setItemForm(f => ({
              ...f, item_type: e.target.value,
              unit: e.target.value === "consumable_natural" ? "ساق" : e.target.value === "task" ? "عامل" : "قطعة",
            }))}
            options={ITEM_TYPES.map(t => ({ value: t.value, label: t.label }))} />

          {itemForm.item_type === "asset" && (
            <Select name="asset_category" label="تصنيف الأصل" value={itemForm.asset_category}
              onChange={e => setItemForm(f => ({ ...f, asset_category: e.target.value }))}
              options={ASSET_CATEGORIES} />
          )}

          <Input name="description" label="الوصف" value={itemForm.description}
            onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
            placeholder="مثال: ستاند زهور بيضاء — 120 سم" required />

          <div className="grid grid-cols-3 gap-3">
            <Input name="quantity" label="الكمية" type="number" value={itemForm.quantity}
              onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} />
            <Input name="unit" label="الوحدة" value={itemForm.unit}
              onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))} />
            <Input name="unit_cost_estimate" label="التكلفة التقديرية (ر.س)" type="number" value={itemForm.unit_cost_estimate}
              onChange={e => setItemForm(f => ({ ...f, unit_cost_estimate: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Readiness Preview Modal */}
      {showPreview && (
        <ReadinessPreviewModal packageId={pkg.id} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

// ── Readiness Preview Modal ────────────────────────────────────────────────────

function ReadinessPreviewModal({ packageId, onClose }: { packageId: string; onClose: () => void }) {
  const { data: res, loading } = useApi(() => eventPackagesApi.preview(packageId), [packageId]);
  const preview = res?.data ?? { items: [], warnings: [] };

  return (
    <Modal open onClose={onClose} title="فحص الجاهزية للتطبيق" size="sm">
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-4">
          {preview.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700">تنبيهات على المخزون:</p>
              {preview.warnings.map((w: string, i: number) => (
                <p key={i} className="text-xs text-amber-600">{w}</p>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {preview.items?.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                  item.available ? "bg-green-100" : "bg-amber-100")}>
                  {item.available
                    ? <Check className="w-3 h-3 text-green-600" />
                    : <AlertCircle className="w-3 h-3 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{item.description}</p>
                  {item.note && <p className="text-xs text-amber-600">{item.note}</p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{item.quantity} {item.unit}</span>
              </div>
            ))}
          </div>
          <Button onClick={onClose} className="w-full">إغلاق</Button>
        </div>
      )}
    </Modal>
  );
}
