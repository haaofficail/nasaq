import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Loader2, AlertCircle, ImageIcon, X } from "lucide-react";
import { Modal, Button, Toggle } from "../ui";
import { servicesApi, categoriesApi } from "@/lib/api";

const cls = "w-full border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white";

type DurationUnit = "minute" | "hour" | "day" | "month" | "year";

const UNIT_MULTIPLIERS: Record<DurationUnit, number> = {
  minute: 1, hour: 60, day: 1440, month: 43200, year: 525600,
};

function parseDuration(mins: number): { value: string; unit: DurationUnit } {
  if (mins >= 525600 && mins % 525600 === 0) return { value: String(mins / 525600), unit: "year" };
  if (mins >= 43200  && mins % 43200  === 0) return { value: String(mins / 43200),  unit: "month" };
  if (mins >= 1440   && mins % 1440   === 0) return { value: String(mins / 1440),   unit: "day" };
  if (mins >= 60     && mins % 60     === 0) return { value: String(mins / 60),      unit: "hour" };
  return { value: String(mins), unit: "minute" };
}

function Field({ label, children, error, hint }: { label: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0" />{error}</p>}
    </div>
  );
}

const DELIVERY_TYPES = new Set(["product","product_shipping","food_order","event_rental","field_service","rental"]);

const TABS = [
  { id: "basic",     label: "الأساسيات" },
  { id: "pricing",   label: "السعر والمدة" },
  { id: "operation", label: "التشغيل" },
];

type Props = { open: boolean; onClose: () => void; serviceId: string | null; onSuccess?: () => void };

export function EditServiceForm({ open, onClose, serviceId, onSuccess }: Props) {
  const [form, setForm]       = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [tab,     setTab]     = useState("basic");
  const [categories, setCategories] = useState<any[]>([]);

  // Duration unit state
  const [durValue, setDurValue] = useState("60");
  const [durUnit,  setDurUnit]  = useState<DurationUnit>("minute");

  // Cover image state
  const fileRef                         = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile]       = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [existingMediaId, setExistingMediaId] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting]   = useState(false);

  useEffect(() => {
    if (!open || !serviceId) return;
    setLoading(true);
    setTab("basic");
    setCoverFile(null);
    setCoverPreview(null);
    setExistingMediaId(null);
    setRemoveExisting(false);

    Promise.all([
      servicesApi.get(serviceId),
      categoriesApi.list(true),
    ]).then(([svcRes, catRes]) => {
      const s = svcRes.data;

      // Parse duration into value + unit
      const rawMins = parseInt(s.durationMinutes) || 60;
      const parsed  = parseDuration(rawMins);
      setDurValue(parsed.value);
      setDurUnit(parsed.unit);

      // Existing cover image
      const media = s.media || [];
      const cover = media[0];
      if (cover) {
        setCoverPreview(cover.url);
        setExistingMediaId(cover.id);
      }

      setForm({
        name:                s.name || "",
        displayName:         s.displayName || "",
        categoryId:          s.categoryId || "",
        shortDescription:    s.shortDescription || "",
        description:         s.description || "",
        serviceType:         s.serviceType || "appointment",
        status:              s.status || "draft",
        servicePricingMode:  s.servicePricingMode || "fixed",
        basePrice:           s.basePrice || "",
        vatInclusive:        s.vatInclusive ?? true,
        depositPercent:      s.depositPercent || "30",
        bufferBeforeMinutes: s.bufferBeforeMinutes ? String(s.bufferBeforeMinutes) : "0",
        bufferAfterMinutes:  s.bufferAfterMinutes  ? String(s.bufferAfterMinutes)  : "0",
        assignmentMode:      s.assignmentMode || "open",
        isBookable:          s.isBookable ?? true,
        isVisibleInPOS:      s.isVisibleInPOS ?? true,
        isVisibleOnline:     s.isVisibleOnline ?? true,
        isFeatured:          s.isFeatured || false,
        hasDelivery:         s.hasDelivery ?? false,
        allowsPickup:        s.allowsPickup ?? false,
        allowsInVenue:       s.allowsInVenue ?? false,
        deliveryCost:        s.deliveryCost ? String(s.deliveryCost) : "0",
      });
      setCategories(catRes.data || []);
      setLoading(false);
    }).catch(() => { setLoading(false); setErrors({ load: "فشل تحميل بيانات الخدمة" }); });
  }, [open, serviceId]);

  const set = (field: string) => (e: any) => {
    const val = e?.target ? e.target.value : e;
    setForm(f => ({ ...f, [field]: val }));
    setErrors(p => ({ ...p, [field]: "" }));
  };

  const pickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setRemoveExisting(false);
    const reader = new FileReader();
    reader.onload = ev => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveExisting(!!existingMediaId);
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    if (!form.name?.trim()) { setErrors({ name: "الاسم مطلوب" }); setTab("basic"); return; }
    if (form.servicePricingMode !== "variable" && (!form.basePrice || parseFloat(form.basePrice) <= 0)) {
      setErrors({ basePrice: "السعر مطلوب" }); setTab("pricing"); return;
    }
    setSaving(true);
    const durationMinutes = Math.round(parseFloat(durValue || "1") * UNIT_MULTIPLIERS[durUnit]);
    try {
      await servicesApi.update(serviceId!, {
        name:                form.name,
        displayName:         form.displayName || undefined,
        categoryId:          form.categoryId || undefined,
        shortDescription:    form.shortDescription || undefined,
        description:         form.description || undefined,
        serviceType:         form.serviceType,
        status:              form.status,
        servicePricingMode:  form.servicePricingMode,
        basePrice:           form.basePrice,
        vatInclusive:        form.vatInclusive,
        depositPercent:      form.depositPercent,
        durationMinutes,
        bufferBeforeMinutes: parseInt(form.bufferBeforeMinutes) || 0,
        bufferAfterMinutes:  parseInt(form.bufferAfterMinutes)  || 0,
        assignmentMode:      form.assignmentMode,
        isBookable:          form.isBookable,
        isVisibleInPOS:      form.isVisibleInPOS,
        isVisibleOnline:     form.isVisibleOnline,
        isFeatured:          form.isFeatured,
        hasDelivery:         form.hasDelivery,
        allowsPickup:        form.allowsPickup,
        allowsInVenue:       form.allowsInVenue,
        deliveryCost:        parseFloat(form.deliveryCost || "0") || 0,
      });

      // Handle media — non-blocking
      await Promise.allSettled([
        ...(removeExisting && existingMediaId
          ? [servicesApi.removeMedia(serviceId!, existingMediaId)]
          : []),
        ...(coverFile && coverPreview
          ? [servicesApi.addMedia(serviceId!, { mediaType: "image", url: coverPreview, isPrimary: true })]
          : []),
      ]);

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrors({ save: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <Modal open={open} onClose={onClose} title="تعديل الخدمة" size="lg">
      <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
    </Modal>
  );

  if (errors.load) return (
    <Modal open={open} onClose={onClose} title="تعديل الخدمة" size="lg">
      <div className="flex items-center gap-2 text-red-500 py-8 justify-center"><AlertCircle className="w-5 h-5" />{errors.load}</div>
    </Modal>
  );

  return (
    <Modal open={open} onClose={onClose} title="تعديل الخدمة" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>إلغاء</Button><Button onClick={save} loading={saving}>حفظ التغييرات</Button></>}>

      {errors.save && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errors.save}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-50 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx("flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── الأساسيات ── */}
      {tab === "basic" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم الخدمة *" error={errors.name}>
              <input className={cls} value={form.name || ""} onChange={set("name")} autoFocus />
            </Field>
            <Field label="اسم العرض للعميل" hint="اتركه فارغاً لاستخدام الاسم الداخلي">
              <input className={cls} value={form.displayName || ""} onChange={set("displayName")} placeholder="اختياري" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="نوع الخدمة">
              <select className={cls} value={form.serviceType || "appointment"} onChange={set("serviceType")}>
                <option value="appointment">🗓️ خدمة بموعد</option>
                <option value="execution">🔧 خدمة تنفيذ</option>
                <option value="field_service">📍 خدمة ميدانية</option>
                <option value="rental">🏠 تأجير</option>
                <option value="event_rental">⛺ تأجير ميداني</option>
                <option value="product">📦 منتج</option>
                <option value="product_shipping">🚚 منتج مع شحن</option>
                <option value="food_order">🍽️ طلبات طعام</option>
                <option value="package">🎁 باقة</option>
                <option value="add_on">➕ إضافة</option>
                <option value="project">📋 مشروع</option>
              </select>
            </Field>
            <Field label="التصنيف">
              <select className={cls} value={form.categoryId || ""} onChange={set("categoryId")}>
                <option value="">— بدون تصنيف —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="الحالة">
              <select className={cls} value={form.status || "draft"} onChange={set("status")}>
                <option value="active">نشطة — متاحة</option>
                <option value="draft">مسودة — غير منشورة</option>
                <option value="paused">معلقة — مؤقتاً</option>
                <option value="archived">مؤرشفة</option>
              </select>
            </Field>
          </div>

          <Field label="وصف مختصر">
            <textarea rows={2} className={cls + " resize-none"} value={form.shortDescription || ""} onChange={set("shortDescription")} dir="rtl" />
          </Field>

          <Field label="وصف تفصيلي">
            <textarea rows={3} className={cls + " resize-none"} value={form.description || ""} onChange={set("description")} dir="rtl" />
          </Field>

          {/* صورة الغلاف */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">صورة الغلاف</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickCover} />
            {coverPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-100 h-32">
                <img src={coverPreview} alt="غلاف" className="w-full h-full object-cover" />
                <button type="button" onClick={clearCover}
                  className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
                {!coverFile && <span className="absolute bottom-2 right-2 text-[10px] bg-black/40 text-white px-2 py-0.5 rounded-full">الصورة الحالية</span>}
                {coverFile  && <span className="absolute bottom-2 right-2 text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-full">صورة جديدة</span>}
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full h-24 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50 transition-all">
                <ImageIcon className="w-5 h-5" />
                <span className="text-xs">اضغط لرفع صورة</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── السعر والمدة ── */}
      {tab === "pricing" && (
        <div className="space-y-4">
          <Field label="طريقة التسعير">
            <select className={cls} value={form.servicePricingMode || "fixed"} onChange={set("servicePricingMode")}>
              <option value="fixed">سعر ثابت</option>
              <option value="from_price">يبدأ من...</option>
              <option value="variable">سعر متغير (يُحدَّد عند الحجز)</option>
            </select>
          </Field>

          {form.servicePricingMode !== "variable" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="السعر (ر.س) *" error={errors.basePrice}>
                <input type="number" className={cls} value={form.basePrice || ""} onChange={set("basePrice")} dir="ltr" />
              </Field>
              <Field label="نسبة العربون (%)">
                <input type="number" className={cls} value={form.depositPercent || ""} onChange={set("depositPercent")} dir="ltr" />
              </Field>
            </div>
          )}

          <Toggle checked={form.vatInclusive ?? true} onChange={v => setForm(f => ({ ...f, vatInclusive: v }))}
            label="السعر شامل ضريبة القيمة المضافة (15%)" />

          {/* المدة بوحدة مرنة */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="مدة الخدمة">
              <div className="flex gap-2">
                <input type="number" className={cls} value={durValue}
                  onChange={e => setDurValue(e.target.value)} placeholder="1" dir="ltr" min="1" />
                <select className={clsx(cls, "w-28 shrink-0")} value={durUnit}
                  onChange={e => setDurUnit(e.target.value as DurationUnit)}>
                  <option value="minute">دقيقة</option>
                  <option value="hour">ساعة</option>
                  <option value="day">يوم</option>
                  <option value="month">شهر</option>
                  <option value="year">سنة</option>
                </select>
              </div>
            </Field>
          </div>

          {!["rental","event_rental"].includes(form.serviceType) && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="تجهيز قبل (دقيقة)" hint="وقت الإعداد">
                <input type="number" className={cls} value={form.bufferBeforeMinutes || "0"} onChange={set("bufferBeforeMinutes")} dir="ltr" />
              </Field>
              <Field label="تنظيف بعد (دقيقة)" hint="وقت التنظيف">
                <input type="number" className={cls} value={form.bufferAfterMinutes || "0"} onChange={set("bufferAfterMinutes")} dir="ltr" />
              </Field>
            </div>
          )}

          {!["rental","event_rental"].includes(form.serviceType) && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              المدة الكاملة في الجدول = {(parseInt(form.bufferBeforeMinutes)||0) + (Math.round(parseFloat(durValue||"0") * UNIT_MULTIPLIERS[durUnit])) + (parseInt(form.bufferAfterMinutes)||0)} دقيقة
            </div>
          )}
        </div>
      )}

      {/* ── التشغيل ── */}
      {tab === "operation" && (
        <div className="space-y-1 divide-y divide-gray-50">
          <div className="py-1">
            <Toggle checked={form.isBookable ?? true}    onChange={v => setForm(f => ({ ...f, isBookable: v }))}    label="قابلة للحجز" />
            <Toggle checked={form.isVisibleInPOS ?? true} onChange={v => setForm(f => ({ ...f, isVisibleInPOS: v }))} label="تظهر في نقطة البيع (POS)" />
            <Toggle checked={form.isVisibleOnline ?? true} onChange={v => setForm(f => ({ ...f, isVisibleOnline: v }))} label="تظهر في الحجز الأونلاين" />
            <Toggle checked={form.isFeatured || false}   onChange={v => setForm(f => ({ ...f, isFeatured: v }))}    label="خدمة مميزة (تظهر أولاً)" />
          </div>

          <div className="py-3">
            <Field label="وضع تعيين الموظفين">
              <select className={cls} value={form.assignmentMode || "open"} onChange={set("assignmentMode")}>
                <option value="open">مفتوح — أي موظف يمكنه التقديم</option>
                <option value="restricted">مقيّد — موظفون محددون فقط</option>
              </select>
            </Field>
            {form.assignmentMode === "restricted" && (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                لإدارة الموظفين المؤهلين، اذهب لصفحة الخدمة ← تبويب "الموظفون"
              </p>
            )}
          </div>

          {DELIVERY_TYPES.has(form.serviceType) && (
            <div className="py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">طرق الاستلام</p>
              <Toggle checked={form.hasDelivery ?? false}   onChange={v => setForm(f => ({ ...f, hasDelivery: v }))}   label="توصيل / شحن" />
              <Toggle checked={form.allowsPickup ?? false}  onChange={v => setForm(f => ({ ...f, allowsPickup: v }))}  label="استلام من الفرع" />
              <Toggle checked={form.allowsInVenue ?? false} onChange={v => setForm(f => ({ ...f, allowsInVenue: v }))} label="داخل المحل / في الموقع" />
              {form.hasDelivery && (
                <div className="mt-2">
                  <Field label="تكلفة التوصيل (ر.س)">
                    <input type="number" className={cls} value={form.deliveryCost || "0"} onChange={set("deliveryCost")} dir="ltr" />
                  </Field>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
