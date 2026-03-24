import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import {
  Plus, Trash2, Check, Loader2, AlertCircle,
  ImageIcon, Users,
} from "lucide-react";
import { Modal } from "../ui";
import { servicesApi, staffApi, inventoryApi, categoriesApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type ComponentItem = {
  _key: string;
  sourceType: "manual" | "inventory" | "asset";
  name: string;
  inventoryItemId?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  isOptional: boolean;
};

type StaffRow = { id: string; name: string; jobTitle?: string };

type Form = {
  serviceType: string;
  name: string;
  displayName: string;
  categoryId: string;
  shortDescription: string;
  status: string;
  servicePricingMode: string;
  basePrice: string;
  vatInclusive: boolean;
  depositEnabled: boolean;
  depositPercent: string;
  durationValue: string;
  durationUnit: "minute" | "hour" | "day" | "month" | "year";
  bufferBeforeMinutes: string;
  bufferAfterMinutes: string;
  assignmentMode: string;
  selectedStaffIds: string[];
  inventoryEnabled: boolean;
  components: ComponentItem[];
  commissionMode: string;
  commissionValue: string;
  isBookable: boolean;
  isVisibleInPOS: boolean;
  isVisibleOnline: boolean;
  hasDelivery: boolean;
  allowsPickup: boolean;
  allowsInVenue: boolean;
  deliveryCost: string;
};

const initial: Form = {
  serviceType: "",
  name: "", displayName: "", categoryId: "", shortDescription: "", status: "active",
  servicePricingMode: "fixed", basePrice: "", vatInclusive: true,
  depositEnabled: false, depositPercent: "30",
  durationValue: "60", durationUnit: "minute", bufferBeforeMinutes: "0", bufferAfterMinutes: "0",
  assignmentMode: "open", selectedStaffIds: [],
  inventoryEnabled: false, components: [],
  commissionMode: "none", commissionValue: "0",
  isBookable: true, isVisibleInPOS: true, isVisibleOnline: true,
  hasDelivery: false, allowsPickup: false, allowsInVenue: false, deliveryCost: "0",
};

// ─── Catalogues ───────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  { value: "appointment",      label: "خدمة بموعد",    desc: "وقت محدد + موظف",              examples: "صالون · مساج · عيادة",        icon: "🗓️" },
  { value: "execution",        label: "خدمة تنفيذ",    desc: "تنفيذ داخل المحل",              examples: "صيانة · تصليح · تفصيل",       icon: "🔧" },
  { value: "field_service",    label: "خدمة ميدانية",  desc: "تنتقل لموقع العميل",            examples: "تركيب · تنظيف منازل",         icon: "📍" },
  { value: "rental",           label: "تأجير",         desc: "حجز أصل بفترة زمنية",          examples: "شاليه · سيارة · غرفة",        icon: "🏠" },
  { value: "event_rental",     label: "تأجير ميداني",  desc: "تأجير + نقل + تركيب",          examples: "خيمة · كوشة · مسرح",         icon: "⛺" },
  { value: "product",          label: "منتج",          desc: "بيع عنصر مادي جاهز",           examples: "ملابس · عطور · إكسسوارات",    icon: "📦" },
  { value: "product_shipping", label: "منتج مع شحن",   desc: "منتج يُشحن أو يُوصَّل",        examples: "متجر إلكتروني · توصيل",       icon: "🚚" },
  { value: "food_order",       label: "طلبات طعام",    desc: "طلب + تجهيز + توصيل",          examples: "مطعم · كافيه · مخبز",         icon: "🍽️" },
  { value: "package",          label: "باقة",          desc: "خدمات مجمعة بسعر واحد",        examples: "باقة عروس · عروض",           icon: "🎁" },
  { value: "add_on",           label: "إضافة",         desc: "إضافة تكميلية على خدمة أخرى", examples: "تغليف · ترقية · ضمان",        icon: "➕" },
  { value: "project",          label: "مشروع",         desc: "تنفيذ متعدد المراحل",          examples: "فعاليات · تصميم · إنشاء",     icon: "📋" },
];

type TypeCfg = { needsTiming: boolean; needsStaff: boolean; needsMaterials: boolean };
const TYPE_CONFIG: Record<string, TypeCfg> = {
  appointment:      { needsTiming: true,  needsStaff: true,  needsMaterials: true  },
  execution:        { needsTiming: true,  needsStaff: true,  needsMaterials: true  },
  field_service:    { needsTiming: true,  needsStaff: true,  needsMaterials: false },
  rental:           { needsTiming: true,  needsStaff: false, needsMaterials: false },
  event_rental:     { needsTiming: true,  needsStaff: true,  needsMaterials: false },
  product:          { needsTiming: false, needsStaff: false, needsMaterials: true  },
  product_shipping: { needsTiming: false, needsStaff: false, needsMaterials: true  },
  food_order:       { needsTiming: false, needsStaff: false, needsMaterials: true  },
  package:          { needsTiming: false, needsStaff: false, needsMaterials: false },
  add_on:           { needsTiming: false, needsStaff: false, needsMaterials: false },
  project:          { needsTiming: true,  needsStaff: true,  needsMaterials: false },
};
const defaultCfg: TypeCfg = { needsTiming: true, needsStaff: true, needsMaterials: true };

const DELIVERY_TYPES = new Set(["product", "product_shipping", "food_order", "event_rental", "field_service", "rental"]);

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const cls = "w-full border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white";

function F({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0" />{error}</p>}
    </div>
  );
}

function Sw({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="min-w-0 pr-3">
        <p className="text-sm text-gray-700">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className={clsx("relative w-10 h-5 rounded-full transition-colors shrink-0", value ? "bg-brand-500" : "bg-gray-200")}>
        <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", value ? "right-0.5" : "left-0.5")} />
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CreateServiceForm({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess?: () => void;
}) {
  const [form, setForm]       = useState<Form>(initial);
  const [page, setPage]       = useState<0 | 1>(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const [categories, setCategories]     = useState<any[]>([]);
  const [allStaff, setAllStaff]         = useState<StaffRow[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // Cover image
  const fileRef                         = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile]       = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initial);
    setPage(0);
    setErrors({});
    setCoverFile(null);
    setCoverPreview(null);
    Promise.all([
      categoriesApi.list(true).then(r => setCategories(r.data || [])).catch(() => {}),
      staffApi.list().then(r => setAllStaff((r.data || []).map((u: any) => ({ id: u.id, name: u.name, jobTitle: u.jobTitle })))).catch(() => {}),
      inventoryApi.assetTypes().then(r => setInventoryItems(r.data || [])).catch(() => {}),
    ]);
  }, [open]);

  const cfg = TYPE_CONFIG[form.serviceType] ?? defaultCfg;

  const set = (field: keyof Form) => (e: any) => {
    const val = e?.target !== undefined ? e.target.value : e;
    setForm(f => ({ ...f, [field]: val }));
    setErrors(p => ({ ...p, [field]: "" }));
  };
  const sw = (field: keyof Form) => (v: boolean) => setForm(f => ({ ...f, [field]: v }));

  const pickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = ev => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Validation ──────────────────────────────────────────────────────────
  const validatePage0 = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.serviceType) e.serviceType = "اختر نوع الخدمة أولاً";
    if (!form.name.trim()) e.name = "اسم الخدمة مطلوب";
    if (form.servicePricingMode !== "variable" && (!form.basePrice || parseFloat(form.basePrice) <= 0))
      e.basePrice = "أدخل السعر";
    if (cfg.needsTiming && (!form.durationValue || parseFloat(form.durationValue) <= 0))
      e.durationValue = "المدة مطلوبة";
    return e;
  };

  const validatePage1 = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (form.depositEnabled && (!form.depositPercent || parseFloat(form.depositPercent) <= 0))
      e.depositPercent = "أدخل نسبة العربون";
    if (cfg.needsStaff && form.assignmentMode === "restricted" && form.selectedStaffIds.length === 0)
      e.staff = "اختر موظفاً واحداً على الأقل";
    if (cfg.needsMaterials && form.inventoryEnabled && form.components.length === 0)
      e.components = "أضف مادة واحدة على الأقل";
    if (form.commissionMode !== "none" && (!form.commissionValue || parseFloat(form.commissionValue) <= 0))
      e.commissionValue = "أدخل قيمة العمولة";
    return e;
  };

  const goNext = () => {
    const errs = validatePage0();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setPage(1);
  };

  const toMinutes = (value: string, unit: Form["durationUnit"]) => {
    const v = parseFloat(value) || 0;
    const multiplier = { minute: 1, hour: 60, day: 1440, month: 43200, year: 525600 }[unit];
    return Math.round(v * multiplier);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const submit = async () => {
    const errs = validatePage1();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    setErrors({});
    try {
      const payload: Record<string, any> = {
        name:               form.name,
        status:             form.status,
        serviceType:        form.serviceType,
        servicePricingMode: form.servicePricingMode,
        vatInclusive:       form.vatInclusive,
        isBookable:         form.isBookable,
        isVisibleInPOS:     form.isVisibleInPOS,
        isVisibleOnline:    form.isVisibleOnline,
      };
      if (form.displayName)       payload.displayName      = form.displayName;
      if (form.categoryId)        payload.categoryId       = form.categoryId;
      if (form.shortDescription)  payload.shortDescription = form.shortDescription;
      if (form.servicePricingMode !== "variable") payload.basePrice = form.basePrice;
      if (form.depositEnabled)    payload.depositPercent   = form.depositPercent;
      if (cfg.needsTiming) {
        payload.durationMinutes     = toMinutes(form.durationValue, form.durationUnit) || 60;
        payload.bufferBeforeMinutes = parseInt(form.bufferBeforeMinutes) || 0;
        payload.bufferAfterMinutes  = parseInt(form.bufferAfterMinutes)  || 0;
      }
      if (cfg.needsStaff) payload.assignmentMode = form.assignmentMode;
      if (DELIVERY_TYPES.has(form.serviceType)) {
        payload.hasDelivery   = form.hasDelivery;
        payload.allowsPickup  = form.allowsPickup;
        payload.allowsInVenue = form.allowsInVenue;
        if (form.hasDelivery) payload.deliveryCost = parseFloat(form.deliveryCost) || 0;
      }

      const serviceRes = await servicesApi.create(payload);
      const serviceId  = serviceRes.data.id;

      // Non-blocking parallel calls
      await Promise.allSettled([
        // Cover image (non-blocking)
        ...(coverFile && coverPreview
          ? [servicesApi.addMedia(serviceId, { mediaType: "image", url: coverPreview, isPrimary: true })]
          : []),
        // Staff
        ...(cfg.needsStaff && form.assignmentMode === "restricted" && form.selectedStaffIds.length > 0
          ? form.selectedStaffIds.map(userId => servicesApi.addStaff(serviceId, { userId, commissionMode: "inherit" }))
          : []),
        // Components
        ...(cfg.needsMaterials && form.inventoryEnabled && form.components.length > 0
          ? form.components.map(comp => servicesApi.addComponent(serviceId, {
              sourceType:      comp.sourceType,
              inventoryItemId: comp.sourceType === "inventory" ? comp.inventoryItemId : null,
              name:            comp.name,
              quantity:        comp.quantity,
              unit:            comp.unit,
              unitCost:        comp.unitCost,
              isOptional:      comp.isOptional,
            }))
          : []),
        // Commission
        ...(form.commissionMode !== "none"
          ? [servicesApi.updateCosts(serviceId, {
              commissionPercent: form.commissionMode === "percentage" ? parseFloat(form.commissionValue) : 0,
              commissionFixed:   form.commissionMode === "fixed"      ? parseFloat(form.commissionValue) : 0,
            })]
          : []),
      ]);

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.message || "حدث خطأ أثناء الإنشاء" });
    } finally {
      setLoading(false);
    }
  };

  // ── Component row helpers ────────────────────────────────────────────────
  const addComponent = () => {
    const _key = Math.random().toString(36).slice(2);
    setForm(f => ({ ...f, components: [...f.components, { _key, sourceType: "manual", name: "", quantity: 1, unit: "حبة", unitCost: 0, isOptional: false }] }));
  };
  const updComp = (key: string, patch: Partial<ComponentItem>) =>
    setForm(f => ({ ...f, components: f.components.map(c => c._key === key ? { ...c, ...patch } : c) }));
  const delComp = (key: string) =>
    setForm(f => ({ ...f, components: f.components.filter(c => c._key !== key) }));
  const toggleStaff = (id: string) => {
    setForm(f => ({
      ...f,
      selectedStaffIds: f.selectedStaffIds.includes(id)
        ? f.selectedStaffIds.filter(s => s !== id)
        : [...f.selectedStaffIds, id],
    }));
    setErrors(p => ({ ...p, staff: "" }));
  };

  const typeMeta = SERVICE_TYPES.find(t => t.value === form.serviceType);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={onClose} title="" size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {page === 1 && (
              <button onClick={() => { setPage(0); setErrors({}); }}
                className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                ← السابق
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">إلغاء</button>
            {page === 0 ? (
              <button onClick={goNext}
                className="bg-brand-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-brand-600 transition-colors">
                التالي →
              </button>
            ) : (
              <button onClick={submit} disabled={loading}
                className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {loading ? "جاري الإنشاء..." : "إنشاء الخدمة"}
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 bg-gray-50 rounded-xl p-1">
        {(["الأساسيات", "تشغيل ومتقدم"] as const).map((label, i) => (
          <button key={i} onClick={() => { if (i === 1) goNext(); else { setPage(0); setErrors({}); } }}
            className={clsx("flex-1 py-2 rounded-lg text-sm font-medium transition-all",
              page === i ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
            {label}
          </button>
        ))}
      </div>

      {errors.submit && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errors.submit}
        </div>
      )}

      {/* ═══════════════ PAGE 0: الأساسيات ═══════════════ */}
      {page === 0 && (
        <div className="space-y-5">

          {/* نوع الخدمة */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">نوع الخدمة <span className="text-red-400">*</span></p>
            {errors.serviceType && <p className="text-xs text-red-500 mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.serviceType}</p>}
            <div className="grid grid-cols-2 gap-1.5">
              {SERVICE_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => {
                    const rentalTypes = new Set(["rental", "event_rental"]);
                    const defaultUnit = rentalTypes.has(t.value) ? "day" : "minute";
                    const defaultVal  = rentalTypes.has(t.value) ? "1" : "60";
                    setForm(f => ({ ...f, serviceType: t.value, durationUnit: defaultUnit, durationValue: defaultVal }));
                    setErrors(p => ({ ...p, serviceType: "", durationValue: "" }));
                  }}
                  className={clsx(
                    "text-right px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2.5",
                    form.serviceType === t.value ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  )}>
                  <span className="text-xl shrink-0">{t.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={clsx("text-sm font-semibold truncate", form.serviceType === t.value ? "text-brand-700" : "text-gray-800")}>{t.label}</p>
                    <p className="text-xs text-gray-400 truncate">{t.examples}</p>
                  </div>
                  {form.serviceType === t.value && <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* الاسم + السعر */}
          <div className="grid grid-cols-2 gap-3">
            <F label="اسم الخدمة *" error={errors.name}>
              <input className={cls} value={form.name} onChange={set("name")} placeholder="مثال: تلوين شعر كامل" autoFocus />
            </F>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">طريقة السعر</label>
              <select className={cls} value={form.servicePricingMode} onChange={set("servicePricingMode")}>
                <option value="fixed">سعر ثابت</option>
                <option value="from_price">يبدأ من...</option>
                <option value="variable">متغير (يُحدَّد عند الحجز)</option>
              </select>
            </div>
          </div>

          {form.servicePricingMode !== "variable" && (
            <F label={form.servicePricingMode === "from_price" ? "السعر الأدنى (ر.س) *" : "السعر (ر.س) *"} error={errors.basePrice}>
              <input type="number" className={cls} value={form.basePrice} onChange={set("basePrice")} placeholder="0.00" dir="ltr" />
            </F>
          )}

          {/* المدة (مشروطة) */}
          {cfg.needsTiming && (
            <div className="grid grid-cols-3 gap-3">
              <F label={form.serviceType === "rental" || form.serviceType === "event_rental" ? "مدة الإيجار *" : "مدة الخدمة *"} error={errors.durationValue}>
                <div className="flex gap-2">
                  <input type="number" className={cls} value={form.durationValue} onChange={set("durationValue")}
                    placeholder="1" dir="ltr" min="1" />
                  <select className={clsx(cls, "w-28 shrink-0")} value={form.durationUnit}
                    onChange={e => setForm(f => ({ ...f, durationUnit: e.target.value as Form["durationUnit"] }))}>
                    <option value="minute">دقيقة</option>
                    <option value="hour">ساعة</option>
                    <option value="day">يوم</option>
                    <option value="month">شهر</option>
                    <option value="year">سنة</option>
                  </select>
                </div>
              </F>
              {form.serviceType !== "rental" && form.serviceType !== "event_rental" && (
                <>
                  <F label="تجهيز قبل (دقيقة)" hint="وقت الإعداد">
                    <input type="number" className={cls} value={form.bufferBeforeMinutes} onChange={set("bufferBeforeMinutes")} placeholder="0" dir="ltr" />
                  </F>
                  <F label="تنظيف بعد (دقيقة)" hint="وقت التنظيف">
                    <input type="number" className={cls} value={form.bufferAfterMinutes} onChange={set("bufferAfterMinutes")} placeholder="0" dir="ltr" />
                  </F>
                </>
              )}
            </div>
          )}

          {/* التصنيف + الحالة */}
          <div className="grid grid-cols-2 gap-3">
            <F label="التصنيف">
              <select className={cls} value={form.categoryId} onChange={set("categoryId")}>
                <option value="">— بدون تصنيف —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            <F label="الحالة">
              <select className={cls} value={form.status} onChange={set("status")}>
                <option value="active">نشطة — متاحة</option>
                <option value="draft">مسودة — غير منشورة</option>
                <option value="paused">معلقة — مؤقتاً</option>
              </select>
            </F>
          </div>

          {/* صورة الغلاف */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">صورة الغلاف <span className="text-gray-400 font-normal">(اختياري)</span></p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickCover} />
            {coverPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-100 h-28">
                <img src={coverPreview} alt="غلاف" className="w-full h-full object-cover" />
                <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors text-xs">
                  ✕
                </button>
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

      {/* ═══════════════ PAGE 1: تشغيل ومتقدم ═══════════════ */}
      {page === 1 && (
        <div className="space-y-1 divide-y divide-gray-50">

          {/* نوع محدد badge */}
          {typeMeta && (
            <div className="flex items-center gap-2 pb-4">
              <span className="text-lg">{typeMeta.icon}</span>
              <span className="text-sm font-medium text-gray-700">{typeMeta.label}</span>
              <span className="text-xs text-gray-400">— {typeMeta.desc}</span>
              <button onClick={() => { setPage(0); setErrors({}); }} className="mr-auto text-xs text-brand-500 hover:underline">تغيير</button>
            </div>
          )}

          {/* الوصف */}
          <div className="py-4">
            <F label="وصف مختصر">
              <textarea rows={2} className={cls + " resize-none"} value={form.shortDescription}
                onChange={set("shortDescription")} placeholder="وصف يظهر في بطاقة الخدمة..." dir="rtl" />
            </F>
          </div>

          {/* الضريبة */}
          <div className="py-2">
            <Sw value={form.vatInclusive} onChange={sw("vatInclusive")}
              label="السعر شامل ضريبة القيمة المضافة (15%)" />
          </div>

          {/* العربون */}
          <div className="py-2">
            <Sw value={form.depositEnabled} onChange={sw("depositEnabled")}
              label="تفعيل العربون (مقدم الحجز)"
              desc="يُطلب من العميل دفع نسبة مئوية مقدماً" />
            {form.depositEnabled && (
              <div className="mt-3">
                <F label="نسبة العربون (%)" error={errors.depositPercent}>
                  <input type="number" className={cls} value={form.depositPercent} onChange={set("depositPercent")}
                    placeholder="30" dir="ltr" min="1" max="100" />
                </F>
              </div>
            )}
          </div>

          {/* المواد / المخزون */}
          {cfg.needsMaterials && (
            <div className="py-2">
              <Sw value={form.inventoryEnabled} onChange={sw("inventoryEnabled")}
                label="ربط بالمخزون (مواد استهلاكية)"
                desc="خصم الكميات تلقائياً عند إكمال الخدمة" />
              {form.inventoryEnabled && (
                <div className="mt-3 space-y-2">
                  {errors.components && (
                    <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.components}</p>
                  )}
                  {form.components.map(comp => (
                    <div key={comp._key} className="border border-gray-100 rounded-xl p-3 space-y-2.5 bg-gray-50/50">
                      {/* Source type selector */}
                      <div className="flex gap-1.5">
                        {(["manual", "inventory", "asset"] as const).map(st => (
                          <button key={st} type="button" onClick={() => updComp(comp._key, { sourceType: st })}
                            className={clsx("flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all",
                              comp.sourceType === st ? "border-brand-300 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-500 hover:border-gray-300")}>
                            {st === "manual" ? "يدوي" : st === "inventory" ? "من المخزون" : "أصل ثابت"}
                          </button>
                        ))}
                        <button type="button" onClick={() => delComp(comp._key)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors border border-gray-200">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <F label="الاسم">
                          <input className={cls} value={comp.name} onChange={e => updComp(comp._key, { name: e.target.value })} placeholder="مثال: صبغة شعر" />
                        </F>
                        {comp.sourceType !== "manual" && (
                          <F label="عنصر المخزون">
                            <select className={cls} value={comp.inventoryItemId || ""}
                              onChange={e => updComp(comp._key, { inventoryItemId: e.target.value || undefined })}>
                              <option value="">— اختر —</option>
                              {inventoryItems.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                          </F>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <F label="الكمية">
                          <input type="number" className={cls} value={comp.quantity}
                            onChange={e => updComp(comp._key, { quantity: parseFloat(e.target.value) || 1 })} dir="ltr" />
                        </F>
                        <F label="الوحدة">
                          <input className={cls} value={comp.unit}
                            onChange={e => updComp(comp._key, { unit: e.target.value })} placeholder="حبة" />
                        </F>
                        <F label="التكلفة (ر.س)">
                          <input type="number" className={cls} value={comp.unitCost}
                            onChange={e => updComp(comp._key, { unitCost: parseFloat(e.target.value) || 0 })} dir="ltr" />
                        </F>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={comp.isOptional}
                          onChange={e => updComp(comp._key, { isOptional: e.target.checked })} className="rounded" />
                        مادة اختيارية
                      </label>
                    </div>
                  ))}
                  <button type="button" onClick={addComponent}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50 transition-all">
                    <Plus className="w-4 h-4" /> إضافة مادة
                  </button>
                  {form.components.length > 0 && (
                    <p className="text-xs text-gray-500 text-left" dir="ltr">
                      إجمالي التكلفة: {form.components.reduce((s, c) => s + c.quantity * c.unitCost, 0).toFixed(2)} ر.س
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* الموظفون */}
          {cfg.needsStaff && (
            <div className="py-3">
              <p className="text-xs font-medium text-gray-600 mb-2">تعيين الموظفين</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { value: "open",       label: "جميع الموظفين", desc: "أي موظف يمكنه التقديم" },
                  { value: "restricted", label: "موظفون محددون",  desc: "تحديد من يُسمح له" },
                ].map(m => (
                  <button key={m.value} type="button" onClick={() => setForm(f => ({ ...f, assignmentMode: m.value }))}
                    className={clsx("text-right px-3 py-2.5 rounded-xl border transition-all",
                      form.assignmentMode === m.value ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:border-gray-200")}>
                    <p className={clsx("text-sm font-semibold", form.assignmentMode === m.value ? "text-brand-700" : "text-gray-800")}>{m.label}</p>
                    <p className="text-xs text-gray-400">{m.desc}</p>
                  </button>
                ))}
              </div>
              {form.assignmentMode === "restricted" && (
                <>
                  {errors.staff && <p className="text-xs text-red-500 mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.staff}</p>}
                  {allStaff.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4"><Users className="w-6 h-6 mx-auto mb-1 opacity-30" />لا يوجد موظفون بعد</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {allStaff.map(s => {
                        const sel = form.selectedStaffIds.includes(s.id);
                        return (
                          <button key={s.id} type="button" onClick={() => toggleStaff(s.id)}
                            className={clsx("flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-right",
                              sel ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:border-gray-200")}>
                            <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                              sel ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500")}>
                              {sel ? <Check className="w-3.5 h-3.5" /> : s.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                              {s.jobTitle && <p className="text-xs text-gray-400 truncate">{s.jobTitle}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {form.selectedStaffIds.length > 0 && (
                    <p className="text-xs text-brand-600 mt-2">{form.selectedStaffIds.length} موظف محدد</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* الظهور */}
          <div className="py-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">الظهور والتشغيل</p>
            <Sw value={form.isBookable}      onChange={sw("isBookable")}      label="قابلة للحجز"              desc="تظهر في قائمة الحجز وتقبل مواعيد جديدة" />
            <Sw value={form.isVisibleInPOS}  onChange={sw("isVisibleInPOS")}  label="تظهر في نقطة البيع (POS)" desc="متاحة عند إنشاء فاتورة يدوية" />
            <Sw value={form.isVisibleOnline} onChange={sw("isVisibleOnline")} label="تظهر في الحجز الأونلاين"   desc="مرئية للعملاء عند الحجز الذاتي" />
          </div>

          {/* التوصيل */}
          {DELIVERY_TYPES.has(form.serviceType) && (
            <div className="py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">طرق الاستلام</p>
              <Sw value={form.hasDelivery}   onChange={sw("hasDelivery")}   label="توصيل / شحن"         desc="يمكن توصيل هذه الخدمة للعميل" />
              <Sw value={form.allowsPickup}  onChange={sw("allowsPickup")}  label="استلام من الفرع"     desc="العميل يستلم مباشرةً" />
              <Sw value={form.allowsInVenue} onChange={sw("allowsInVenue")} label="داخل المحل / الموقع" desc="يُقدَّم في موقع الخدمة" />
              {form.hasDelivery && (
                <div className="mt-2">
                  <F label="تكلفة التوصيل (ر.س)">
                    <input type="number" className={cls} value={form.deliveryCost} onChange={set("deliveryCost")} placeholder="0" dir="ltr" />
                  </F>
                </div>
              )}
            </div>
          )}

          {/* العمولة */}
          <div className="py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">عمولة الموظف</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "none",       label: "لا عمولة" },
                { value: "percentage", label: "نسبة %" },
                { value: "fixed",      label: "مبلغ ثابت" },
              ].map(m => (
                <button key={m.value} type="button" onClick={() => setForm(f => ({ ...f, commissionMode: m.value }))}
                  className={clsx("py-2 rounded-xl border text-sm font-medium transition-all",
                    form.commissionMode === m.value ? "border-brand-300 bg-brand-50 text-brand-700" : "border-gray-100 text-gray-600 hover:border-gray-200")}>
                  {m.label}
                </button>
              ))}
            </div>
            {form.commissionMode !== "none" && (
              <div className="mt-2">
                <F label={form.commissionMode === "percentage" ? "نسبة العمولة (%)" : "مبلغ العمولة (ر.س)"} error={errors.commissionValue}>
                  <input type="number" className={cls} value={form.commissionValue} onChange={set("commissionValue")} dir="ltr"
                    placeholder={form.commissionMode === "percentage" ? "20" : "50"} />
                </F>
                <p className="text-xs text-gray-400 mt-1">يمكن تجاوزها لكل موظف لاحقاً</p>
              </div>
            )}
          </div>

        </div>
      )}
    </Modal>
  );
}
