import { useState, useEffect } from "react";
import { Modal, Input, TextArea, Select, Button, Toggle } from "../ui";
import { servicesApi } from "@/lib/api";

const categories = [
  { value: "", label: "اختر التصنيف" },
  { value: "cat-1", label: "خيام مغربية" },
  { value: "cat-2", label: "بيوت الشعر" },
  { value: "cat-3", label: "جلسات" },
  { value: "cat-4", label: "طاولات الطعام" },
  { value: "cat-5", label: "إكسسوارات" },
];

type Props = { open: boolean; onClose: () => void; serviceId: string | null; onSuccess?: () => void };

export function EditServiceForm({ open, onClose, serviceId, onSuccess }: Props) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("basic");

  // Load service data
  useEffect(() => {
    if (!open || !serviceId) return;
    setLoading(true);
    servicesApi.get(serviceId).then((res: any) => {
      const s = res.data;
      setForm({
        name: s.name || "", categoryId: s.categoryId || "",
        shortDescription: s.shortDescription || "", description: s.description || "",
        basePrice: s.basePrice || "", vatInclusive: s.vatInclusive ?? true,
        minCapacity: s.minCapacity ? String(s.minCapacity) : "",
        maxCapacity: s.maxCapacity ? String(s.maxCapacity) : "",
        capacityLabel: s.capacityLabel || "ضيف",
        durationMinutes: s.durationMinutes ? String(s.durationMinutes) : "1440",
        setupMinutes: s.setupMinutes ? String(s.setupMinutes) : "120",
        teardownMinutes: s.teardownMinutes ? String(s.teardownMinutes) : "60",
        bufferMinutes: s.bufferMinutes ? String(s.bufferMinutes) : "0",
        depositPercent: s.depositPercent || "30",
        minAdvanceHours: s.minAdvanceHours ? String(s.minAdvanceHours) : "24",
        status: s.status || "draft", isFeatured: s.isFeatured || false,
        metaTitle: s.metaTitle || "", metaDescription: s.metaDescription || "",
      });
      setLoading(false);
    }).catch(() => { setLoading(false); setErrors({ load: "فشل تحميل بيانات الخدمة" }); });
  }, [open, serviceId]);

  const set = (field: string) => (e: any) => {
    const val = e.target ? e.target.value : e;
    setForm(f => ({ ...f, [field]: val }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const save = async () => {
    if (!form.name?.trim()) { setErrors({ name: "الاسم مطلوب" }); setTab("basic"); return; }
    if (!form.basePrice || parseFloat(form.basePrice) <= 0) { setErrors({ basePrice: "السعر مطلوب" }); setTab("pricing"); return; }
    setSaving(true);
    try {
      await servicesApi.update(serviceId!, {
        name: form.name, categoryId: form.categoryId || undefined,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        basePrice: form.basePrice, vatInclusive: form.vatInclusive,
        minCapacity: form.minCapacity ? parseInt(form.minCapacity) : undefined,
        maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity) : undefined,
        capacityLabel: form.capacityLabel,
        durationMinutes: parseInt(form.durationMinutes),
        setupMinutes: parseInt(form.setupMinutes),
        teardownMinutes: parseInt(form.teardownMinutes),
        bufferMinutes: parseInt(form.bufferMinutes),
        depositPercent: form.depositPercent,
        minAdvanceHours: parseInt(form.minAdvanceHours),
        status: form.status, isFeatured: form.isFeatured,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
      });
      onSuccess?.(); onClose();
    } catch (err: any) { setErrors({ save: err.message }); }
    finally { setSaving(false); }
  };

  const tabs = [
    { id: "basic", label: "الأساسية" }, { id: "pricing", label: "التسعير" },
    { id: "timing", label: "المدة" }, { id: "seo", label: "SEO" },
  ];

  if (loading) return (
    <Modal open={open} onClose={onClose} title="تعديل الخدمة" size="lg">
      <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" /></div>
    </Modal>
  );

  return (
    <Modal open={open} onClose={onClose} title="تعديل الخدمة" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>إلغاء</Button><Button onClick={save} loading={saving}>حفظ التغييرات</Button></>}>
      
      {errors.save && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{errors.save}</div>}

      <div className="flex gap-1 mb-5 bg-gray-50 rounded-lg p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >{t.label}</button>
        ))}
      </div>

      {tab === "basic" && (
        <div className="space-y-4">
          <Input label="اسم الخدمة" name="name" value={form.name || ""} onChange={set("name")} required error={errors.name} />
          <Select label="التصنيف" name="categoryId" value={form.categoryId || ""} onChange={set("categoryId")} options={categories} />
          <TextArea label="وصف مختصر" name="shortDescription" value={form.shortDescription || ""} onChange={set("shortDescription")} rows={2} />
          <TextArea label="وصف تفصيلي" name="description" value={form.description || ""} onChange={set("description")} rows={4} />
        </div>
      )}
      {tab === "pricing" && (
        <div className="space-y-4">
          <Input label="السعر الأساسي" name="basePrice" type="number" value={form.basePrice || ""} onChange={set("basePrice")} suffix="ر.س" dir="ltr" required error={errors.basePrice} />
          <Toggle checked={form.vatInclusive ?? true} onChange={v => setForm(f => ({ ...f, vatInclusive: v }))} label="شامل الضريبة (15%)" />
          <Input label="نسبة العربون" name="depositPercent" type="number" value={form.depositPercent || ""} onChange={set("depositPercent")} suffix="%" dir="ltr" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="أقل سعة" name="minCapacity" type="number" value={form.minCapacity || ""} onChange={set("minCapacity")} dir="ltr" />
            <Input label="أقصى سعة" name="maxCapacity" type="number" value={form.maxCapacity || ""} onChange={set("maxCapacity")} dir="ltr" />
          </div>
        </div>
      )}
      {tab === "timing" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="المدة (ساعات)" name="dur" type="number" value={String(parseInt(form.durationMinutes || "1440") / 60)} onChange={e => setForm(f => ({ ...f, durationMinutes: String(parseInt(e.target.value || "0") * 60) }))} dir="ltr" />
            <Input label="الفترة الفاصلة (دقائق)" name="bufferMinutes" type="number" value={form.bufferMinutes || ""} onChange={set("bufferMinutes")} dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="وقت التجهيز (دقائق)" name="setupMinutes" type="number" value={form.setupMinutes || ""} onChange={set("setupMinutes")} dir="ltr" />
            <Input label="وقت التفكيك (دقائق)" name="teardownMinutes" type="number" value={form.teardownMinutes || ""} onChange={set("teardownMinutes")} dir="ltr" />
          </div>
          <Input label="حد أدنى حجز مسبق (ساعات)" name="minAdvanceHours" type="number" value={form.minAdvanceHours || ""} onChange={set("minAdvanceHours")} dir="ltr" />
        </div>
      )}
      {tab === "seo" && (
        <div className="space-y-4">
          <Select label="حالة النشر" name="status" value={form.status || "draft"} onChange={set("status")} options={[
            { value: "draft", label: "مسودة" }, { value: "active", label: "نشطة" }, { value: "paused", label: "معلقة" }, { value: "archived", label: "مؤرشفة" },
          ]} />
          <Toggle checked={form.isFeatured || false} onChange={v => setForm(f => ({ ...f, isFeatured: v }))} label="خدمة مميزة" />
          <Input label="Meta Title" name="metaTitle" value={form.metaTitle || ""} onChange={set("metaTitle")} />
          <TextArea label="Meta Description" name="metaDescription" value={form.metaDescription || ""} onChange={set("metaDescription")} rows={2} />
        </div>
      )}
    </Modal>
  );
}
