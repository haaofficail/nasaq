import { useState, useEffect } from "react";
import { Modal, Input, TextArea, Select, Button, Toggle } from "../ui";
import { servicesApi, categoriesApi, addonsApi, settingsApi } from "@/lib/api";

type ServiceForm = {
  name: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  basePrice: string;
  vatInclusive: boolean;
  minCapacity: string;
  maxCapacity: string;
  capacityLabel: string;
  durationMinutes: string;
  setupMinutes: string;
  teardownMinutes: string;
  bufferMinutes: string;
  depositPercent: string;
  minAdvanceHours: string;
  status: string;
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
};

const initial: ServiceForm = {
  name: "", categoryId: "", shortDescription: "", description: "",
  basePrice: "", vatInclusive: true, minCapacity: "", maxCapacity: "",
  capacityLabel: "ضيف", durationMinutes: "1440", setupMinutes: "120",
  teardownMinutes: "60", bufferMinutes: "0", depositPercent: "30",
  minAdvanceHours: "24", status: "draft", isFeatured: false,
  metaTitle: "", metaDescription: "",
};

const steps = [
  { id: "basic", label: "المعلومات الأساسية" },
  { id: "pricing", label: "التسعير والسعة" },
  { id: "timing", label: "المدة وقواعد الحجز" },
  { id: "seo", label: "SEO والنشر" },
];

export function CreateServiceForm({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess?: () => void;
}) {
  const [form, setForm] = useState<ServiceForm>(initial);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [addonOptions, setAddonOptions] = useState<{ id: string; name: string; price: string; priceMode: string }[]>([]);
  const [capacityLabelOptions, setCapacityLabelOptions] = useState<{ value: string; label: string }[]>([
    { value: "ضيف", label: "ضيف" },
    { value: "شخص", label: "شخص" },
    { value: "طاولة", label: "طاولة" },
    { value: "كرسي", label: "كرسي" },
  ]);

  useEffect(() => {
    if (!open) return;
    categoriesApi.list(true).then(r => {
      setCategoryOptions(r.data.map((c: any) => ({ value: c.id, label: c.name })));
    }).catch(() => {});
    addonsApi.list().then(r => {
      setAddonOptions(r.data);
    }).catch(() => {});
    settingsApi.customLists().then(r => {
      const units: string[] = r.data?.pricingUnits || [];
      if (units.length > 0) {
        setCapacityLabelOptions(units.map((u: string) => ({ value: u, label: u })));
      }
    }).catch(() => {});
  }, [open]);

  const set = (field: keyof ServiceForm) => (e: any) => {
    const val = e.target ? e.target.value : e;
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!form.name.trim()) errs.name = "اسم الخدمة مطلوب";
    }
    if (step === 1) {
      if (!form.basePrice || parseFloat(form.basePrice) <= 0) errs.basePrice = "السعر مطلوب";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validate()) setStep((s) => Math.min(s + 1, steps.length - 1)); };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const safeInt = (val: string, fallback?: number) => {
    const n = parseInt(val);
    return isNaN(n) ? fallback : n;
  };

  const submit = async () => {
    if (!form.name.trim()) { setErrors({ submit: "اسم الخدمة مطلوب" }); return; }
    if (!form.basePrice || parseFloat(form.basePrice) <= 0) { setErrors({ submit: "السعر الأساسي مطلوب" }); return; }
    setLoading(true);
    setErrors({});
    try {
      await servicesApi.create({
        name: form.name,
        categoryId: form.categoryId || undefined,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        basePrice: form.basePrice,
        vatInclusive: form.vatInclusive,
        minCapacity: safeInt(form.minCapacity),
        maxCapacity: safeInt(form.maxCapacity),
        capacityLabel: form.capacityLabel || undefined,
        durationMinutes: safeInt(form.durationMinutes),
        setupMinutes: safeInt(form.setupMinutes),
        teardownMinutes: safeInt(form.teardownMinutes),
        bufferMinutes: safeInt(form.bufferMinutes, 0),
        depositPercent: form.depositPercent || "30",
        minAdvanceHours: safeInt(form.minAdvanceHours),
        status: form.status,
        isFeatured: form.isFeatured,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
      });
      onSuccess?.();
      onClose();
      setForm(initial);
      setStep(0);
    } catch (err: any) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const isLast = step === steps.length - 1;

  return (
    <Modal
      open={open} onClose={onClose} title="خدمة جديدة" size="lg"
      footer={
        <>
          {step > 0 && <Button variant="ghost" onClick={prev}>السابق</Button>}
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          {isLast ? (
            <Button onClick={submit} loading={loading}>إنشاء الخدمة</Button>
          ) : (
            <Button onClick={next}>التالي</Button>
          )}
        </>
      }
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i <= step ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400"
            }`}>{i + 1}</div>
            <span className={`text-xs ${i <= step ? "text-gray-900 font-medium" : "text-gray-400"} hidden sm:inline`}>{s.label}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-brand-500" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {errors.submit && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{errors.submit}</div>
      )}

      {/* Step 1: Basic Info */}
      {step === 0 && (
        <div className="space-y-4">
          <Input label="اسم الخدمة" name="name" value={form.name} onChange={set("name")} placeholder="مثال: خيمة مغربية فاخرة 12×12" required error={errors.name} />
          <Select
            label="التصنيف"
            name="categoryId"
            value={form.categoryId}
            onChange={set("categoryId")}
            options={categoryOptions}
            placeholder={categoryOptions.length === 0 ? "جاري التحميل..." : "اختر التصنيف (اختياري)"}
          />
          <TextArea label="وصف مختصر" name="shortDescription" value={form.shortDescription} onChange={set("shortDescription")} placeholder="وصف قصير يظهر في بطاقة الخدمة" rows={2} />
          <TextArea label="وصف تفصيلي" name="description" value={form.description} onChange={set("description")} placeholder="وصف كامل يظهر في صفحة الخدمة" rows={4} />
        </div>
      )}

      {/* Step 2: Pricing */}
      {step === 1 && (
        <div className="space-y-4">
          <Input label="السعر الأساسي" name="basePrice" type="number" value={form.basePrice} onChange={set("basePrice")} placeholder="0.00" suffix="ر.س" required error={errors.basePrice} dir="ltr" />
          <Toggle checked={form.vatInclusive} onChange={(v) => setForm(f => ({ ...f, vatInclusive: v }))} label="السعر شامل ضريبة القيمة المضافة (15%)" />
          <Input label="نسبة العربون" name="depositPercent" type="number" value={form.depositPercent} onChange={set("depositPercent")} suffix="%" dir="ltr" hint="النسبة المطلوبة كعربون عند الحجز" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="أقل عدد ضيوف" name="minCapacity" type="number" value={form.minCapacity} onChange={set("minCapacity")} dir="ltr" />
            <Input label="أقصى عدد ضيوف" name="maxCapacity" type="number" value={form.maxCapacity} onChange={set("maxCapacity")} dir="ltr" />
          </div>
          <Select label="وحدة السعة" name="capacityLabel" value={form.capacityLabel} onChange={set("capacityLabel")} options={capacityLabelOptions} />
        </div>
      )}

      {/* Step 3: Timing */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="مدة الخدمة (ساعات)" name="durationMinutes" type="number" value={String(parseInt(form.durationMinutes) / 60 || 24)} onChange={(e) => setForm(f => ({ ...f, durationMinutes: String(parseInt(e.target.value || "24") * 60) }))} dir="ltr" hint="مدة الحجز الأساسية" />
            <Input label="الفترة الفاصلة (دقائق)" name="bufferMinutes" type="number" value={form.bufferMinutes} onChange={set("bufferMinutes")} dir="ltr" hint="فترة فاصلة بين الحجوزات" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="وقت التجهيز (دقائق)" name="setupMinutes" type="number" value={form.setupMinutes} onChange={set("setupMinutes")} dir="ltr" />
            <Input label="وقت التفكيك (دقائق)" name="teardownMinutes" type="number" value={form.teardownMinutes} onChange={set("teardownMinutes")} dir="ltr" />
          </div>
          <Input label="الحد الأدنى للحجز المسبق (ساعات)" name="minAdvanceHours" type="number" value={form.minAdvanceHours} onChange={set("minAdvanceHours")} dir="ltr" hint="كم ساعة قبل الحدث يجب الحجز" />
        </div>
      )}

      {/* Step 4: SEO & Publish */}
      {step === 3 && (
        <div className="space-y-4">
          <Select label="حالة النشر" name="status" value={form.status} onChange={set("status")} options={[
            { value: "draft", label: "مسودة — غير منشورة" },
            { value: "active", label: "نشطة — متاحة للحجز" },
            { value: "paused", label: "معلقة — مؤقتاً غير متاحة" },
          ]} />
          <Toggle checked={form.isFeatured} onChange={(v) => setForm(f => ({ ...f, isFeatured: v }))} label="خدمة مميزة (تظهر أولاً)" />
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-3">محركات البحث (SEO)</p>
            <Input label="عنوان الصفحة (Meta Title)" name="metaTitle" value={form.metaTitle} onChange={set("metaTitle")} placeholder="يظهر في نتائج قوقل" hint="اتركه فارغاً لاستخدام اسم الخدمة" />
            <div className="mt-3">
              <TextArea label="وصف الصفحة (Meta Description)" name="metaDescription" value={form.metaDescription} onChange={set("metaDescription")} placeholder="يظهر تحت العنوان في نتائج قوقل" rows={2} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
