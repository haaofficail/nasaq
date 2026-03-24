import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import {
  Plus, Trash2, Check, Loader2, AlertCircle, ImageIcon, Users, X,
} from "lucide-react";
import { Modal, Button } from "../ui";
import { servicesApi, staffApi, inventoryApi, categoriesApi } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────

type DurationUnit = "minute" | "hour" | "day" | "month" | "year";

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
  description: string;
  status: string;
  servicePricingMode: string;
  basePrice: string;
  vatInclusive: boolean;
  depositEnabled: boolean;
  depositPercent: string;
  durationValue: string;
  durationUnit: DurationUnit;
  bufferBeforeValue: string;
  bufferBeforeUnit: DurationUnit;
  bufferAfterValue: string;
  bufferAfterUnit: DurationUnit;
  assignmentMode: string;
  selectedStaffIds: string[];
  inventoryEnabled: boolean;
  components: ComponentItem[];
  commissionMode: string;
  commissionValue: string;
  isBookable: boolean;
  isVisibleInPOS: boolean;
  isVisibleOnline: boolean;
  isFeatured: boolean;
  hasDelivery: boolean;
  allowsPickup: boolean;
  allowsInVenue: boolean;
  deliveryCost: string;
};

const INITIAL_FORM: Form = {
  serviceType: "",
  name: "", displayName: "", categoryId: "", shortDescription: "", description: "", status: "active",
  servicePricingMode: "fixed", basePrice: "", vatInclusive: true,
  depositEnabled: false, depositPercent: "30",
  durationValue: "60", durationUnit: "minute",
  bufferBeforeValue: "0", bufferBeforeUnit: "minute",
  bufferAfterValue: "0", bufferAfterUnit: "minute",
  assignmentMode: "open", selectedStaffIds: [],
  inventoryEnabled: false, components: [],
  commissionMode: "none", commissionValue: "0",
  isBookable: true, isVisibleInPOS: true, isVisibleOnline: true, isFeatured: false,
  hasDelivery: false, allowsPickup: false, allowsInVenue: false, deliveryCost: "0",
};

// ─── Catalogues ─────────────────────────────────────────────────────────────

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
  { value: "add_on",           label: "إضافة",         desc: "إضافة تكميلية على خدمة أخرى",  examples: "تغليف · ترقية · ضمان",        icon: "➕" },
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

// ─── UI helpers ──────────────────────────────────────────────────────────────

const cls = "w-full border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white";

function F({ label, children, hint, error }: {
  label: string; children: React.ReactNode; hint?: string; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0" />{error}</p>}
    </div>
  );
}

function Sw({ value, onChange, label, desc }: {
  value: boolean; onChange: (v: boolean) => void; label: string; desc?: string;
}) {
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

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
  { id: "service",   label: "الخدمة",       errorFields: ["serviceType", "name"] },
  { id: "pricing",   label: "السعر والوقت",  errorFields: ["basePrice", "durationValue", "depositPercent"] },
  { id: "operation", label: "التشغيل",      errorFields: ["staff", "components", "commissionValue"] },
];

// ─── Component ───────────────────────────────────────────────────────────────

export interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  serviceId?: string;
}

export function ServiceFormModal({ open, onClose, onSuccess, serviceId }: ServiceFormModalProps) {
  const isEdit = !!serviceId;

  const [form, setForm]       = useState<Form>(INITIAL_FORM);
  const [tab, setTab]         = useState("service");
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  const [categories,      setCategories]      = useState<any[]>([]);
  const [allStaff,        setAllStaff]        = useState<StaffRow[]>([]);
  const [inventoryItems,  setInventoryItems]  = useState<any[]>([]);

  const fileRef                                   = useRef<HTMLInputElement>(null);
  const [coverFile,       setCoverFile]           = useState<File | null>(null);
  const [coverPreview,    setCoverPreview]         = useState<string | null>(null);
  const [existingMediaId, setExistingMediaId]     = useState<string | null>(null);
  const [removeExisting,  setRemoveExisting]      = useState(false);

  const cfg = TYPE_CONFIG[form.serviceType] ?? defaultCfg;

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setTab("service");
    setErrors({});
    setCoverFile(null);
    setCoverPreview(null);
    setExistingMediaId(null);
    setRemoveExisting(false);

    if (isEdit && serviceId) {
      setLoading(true);
      Promise.all([
        servicesApi.get(serviceId),
        categoriesApi.list(true),
      ]).then(([svcRes, catRes]) => {
        const s = svcRes.data;
        const dur = parseDuration(parseInt(s.durationMinutes) || 60);

        const cover = (s.media || [])[0];
        if (cover) { setCoverPreview(cover.url); setExistingMediaId(cover.id); }

        setCategories(catRes.data || []);
        setForm({
          serviceType:         s.serviceType || "appointment",
          name:                s.name || "",
          displayName:         s.displayName || "",
          categoryId:          s.categoryId || "",
          shortDescription:    s.shortDescription || "",
          description:         s.description || "",
          status:              s.status || "draft",
          servicePricingMode:  s.servicePricingMode || "fixed",
          basePrice:           s.basePrice ? String(s.basePrice) : "",
          vatInclusive:        s.vatInclusive ?? true,
          depositEnabled:      !!(s.depositPercent && parseFloat(s.depositPercent) > 0),
          depositPercent:      s.depositPercent && parseFloat(s.depositPercent) > 0 ? String(s.depositPercent) : "30",
          durationValue:       dur.value,
          durationUnit:        dur.unit,
          ...(() => {
            const before = parseDuration(parseInt(s.bufferBeforeMinutes) || 0);
            const after  = parseDuration(parseInt(s.bufferAfterMinutes)  || 0);
            return {
              bufferBeforeValue: before.value,
              bufferBeforeUnit:  before.unit,
              bufferAfterValue:  after.value,
              bufferAfterUnit:   after.unit,
            };
          })(),
          assignmentMode:      s.assignmentMode || "open",
          selectedStaffIds:    [],
          inventoryEnabled:    false,
          components:          [],
          commissionMode:      "none",
          commissionValue:     "0",
          isBookable:          s.isBookable ?? true,
          isVisibleInPOS:      s.isVisibleInPOS ?? true,
          isVisibleOnline:     s.isVisibleOnline ?? true,
          isFeatured:          s.isFeatured ?? false,
          hasDelivery:         s.hasDelivery ?? false,
          allowsPickup:        s.allowsPickup ?? false,
          allowsInVenue:       s.allowsInVenue ?? false,
          deliveryCost:        s.deliveryCost ? String(s.deliveryCost) : "0",
        });
        setLoading(false);
      }).catch(() => {
        setLoading(false);
        setErrors({ _load: "فشل تحميل بيانات الخدمة" });
      });
    } else {
      setForm(INITIAL_FORM);
      Promise.all([
        categoriesApi.list(true).then(r => setCategories(r.data || [])).catch(() => {}),
        staffApi.list().then(r => setAllStaff((r.data || []).map((u: any) => ({ id: u.id, name: u.name, jobTitle: u.jobTitle })))).catch(() => {}),
        inventoryApi.assetTypes().then(r => setInventoryItems(r.data || [])).catch(() => {}),
      ]);
    }
  }, [open, serviceId, isEdit]);

  // ── Helpers ───────────────────────────────────────────────────────────────
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

  const toMinutes = () =>
    Math.round((parseFloat(form.durationValue) || 0) * UNIT_MULTIPLIERS[form.durationUnit]);

  const tabHasError = (tabId: string) => {
    const t = TABS.find(x => x.id === tabId);
    return t ? t.errorFields.some(f => !!errors[f]) : false;
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!isEdit && !form.serviceType)
      e.serviceType = "اختر نوع الخدمة أولاً";
    if (!form.name.trim())
      e.name = "اسم الخدمة مطلوب";
    if (form.servicePricingMode !== "variable" && (!form.basePrice || parseFloat(form.basePrice) <= 0))
      e.basePrice = "أدخل السعر";
    if (cfg.needsTiming && (!form.durationValue || parseFloat(form.durationValue) <= 0))
      e.durationValue = "المدة مطلوبة";
    if (form.depositEnabled && (!form.depositPercent || parseFloat(form.depositPercent) <= 0))
      e.depositPercent = "أدخل نسبة العربون";
    if (!isEdit && cfg.needsStaff && form.assignmentMode === "restricted" && form.selectedStaffIds.length === 0)
      e.staff = "اختر موظفاً واحداً على الأقل";
    if (!isEdit && cfg.needsMaterials && form.inventoryEnabled && form.components.length === 0)
      e.components = "أضف مادة واحدة على الأقل";
    if (!isEdit && form.commissionMode !== "none" && (!form.commissionValue || parseFloat(form.commissionValue) <= 0))
      e.commissionValue = "أدخل قيمة العمولة";
    return e;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstErrTab = TABS.find(t => t.errorFields.some(f => !!errs[f]));
      if (firstErrTab) setTab(firstErrTab.id);
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const durationMinutes = toMinutes() || 60;
      const durationPayload = cfg.needsTiming
        ? {
            durationMinutes,
            bufferBeforeMinutes: Math.round((parseFloat(form.bufferBeforeValue) || 0) * UNIT_MULTIPLIERS[form.bufferBeforeUnit]),
            bufferAfterMinutes:  Math.round((parseFloat(form.bufferAfterValue)  || 0) * UNIT_MULTIPLIERS[form.bufferAfterUnit]),
          }
        : {};

      if (isEdit) {
        await servicesApi.update(serviceId!, {
          name:               form.name,
          displayName:        form.displayName || undefined,
          categoryId:         form.categoryId  || undefined,
          shortDescription:   form.shortDescription || undefined,
          description:        form.description || undefined,
          serviceType:        form.serviceType,
          status:             form.status,
          servicePricingMode: form.servicePricingMode,
          basePrice:          form.basePrice,
          vatInclusive:       form.vatInclusive,
          depositPercent:     form.depositEnabled ? form.depositPercent : "0",
          ...durationPayload,
          assignmentMode:     form.assignmentMode,
          isBookable:         form.isBookable,
          isVisibleInPOS:     form.isVisibleInPOS,
          isVisibleOnline:    form.isVisibleOnline,
          isFeatured:         form.isFeatured,
          hasDelivery:        form.hasDelivery,
          allowsPickup:       form.allowsPickup,
          allowsInVenue:      form.allowsInVenue,
          deliveryCost:       parseFloat(form.deliveryCost || "0") || 0,
        });
        await Promise.allSettled([
          ...(removeExisting && existingMediaId
            ? [servicesApi.removeMedia(serviceId!, existingMediaId)]
            : []),
          ...(coverFile && coverPreview
            ? [servicesApi.addMedia(serviceId!, { mediaType: "image", url: coverPreview, isPrimary: true })]
            : []),
        ]);

      } else {
        const payload: Record<string, any> = {
          name:               form.name,
          status:             form.status,
          serviceType:        form.serviceType,
          servicePricingMode: form.servicePricingMode,
          vatInclusive:       form.vatInclusive,
          isBookable:         form.isBookable,
          isVisibleInPOS:     form.isVisibleInPOS,
          isVisibleOnline:    form.isVisibleOnline,
          isFeatured:         form.isFeatured,
          ...durationPayload,
        };
        if (form.displayName)       payload.displayName      = form.displayName;
        if (form.categoryId)        payload.categoryId       = form.categoryId;
        if (form.shortDescription)  payload.shortDescription = form.shortDescription;
        if (form.description)       payload.description      = form.description;
        if (form.servicePricingMode !== "variable") payload.basePrice = form.basePrice;
        if (form.depositEnabled)    payload.depositPercent   = form.depositPercent;
        if (cfg.needsStaff)         payload.assignmentMode   = form.assignmentMode;
        if (DELIVERY_TYPES.has(form.serviceType)) {
          payload.hasDelivery   = form.hasDelivery;
          payload.allowsPickup  = form.allowsPickup;
          payload.allowsInVenue = form.allowsInVenue;
          if (form.hasDelivery) payload.deliveryCost = parseFloat(form.deliveryCost) || 0;
        }

        const serviceRes = await servicesApi.create(payload);
        const newId = serviceRes.data.id;

        await Promise.allSettled([
          ...(coverFile && coverPreview
            ? [servicesApi.addMedia(newId, { mediaType: "image", url: coverPreview, isPrimary: true })]
            : []),
          ...(cfg.needsStaff && form.assignmentMode === "restricted" && form.selectedStaffIds.length > 0
            ? form.selectedStaffIds.map(userId => servicesApi.addStaff(newId, { userId, commissionMode: "inherit" }))
            : []),
          ...(cfg.needsMaterials && form.inventoryEnabled && form.components.length > 0
            ? form.components.map(comp => servicesApi.addComponent(newId, {
                sourceType:      comp.sourceType,
                inventoryItemId: comp.sourceType !== "manual" ? comp.inventoryItemId : null,
                name:            comp.name,
                quantity:        comp.quantity,
                unit:            comp.unit,
                unitCost:        comp.unitCost,
                isOptional:      comp.isOptional,
              }))
            : []),
          ...(form.commissionMode !== "none"
            ? [servicesApi.updateCosts(newId, {
                commissionPercent: form.commissionMode === "percentage" ? parseFloat(form.commissionValue) : 0,
                commissionFixed:   form.commissionMode === "fixed"      ? parseFloat(form.commissionValue) : 0,
              })]
            : []),
        ]);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrors({ _submit: err.message || "حدث خطأ، حاول مرة أخرى" });
    } finally {
      setSaving(false);
    }
  };

  // ── Component helpers ─────────────────────────────────────────────────────
  const addComponent = () => {
    const _key = Math.random().toString(36).slice(2);
    setForm(f => ({
      ...f,
      components: [...f.components, { _key, sourceType: "manual", name: "", quantity: 1, unit: "حبة", unitCost: 0, isOptional: false }],
    }));
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

  const bufBeforeMin = Math.round((parseFloat(form.bufferBeforeValue) || 0) * UNIT_MULTIPLIERS[form.bufferBeforeUnit]);
  const bufAfterMin  = Math.round((parseFloat(form.bufferAfterValue)  || 0) * UNIT_MULTIPLIERS[form.bufferAfterUnit]);
  const totalMinutes = toMinutes() + bufBeforeMin + bufAfterMin;
  const title = isEdit ? "تعديل الخدمة" : "خدمة جديدة";

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title={title} size="lg">
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
        </div>
      </Modal>
    );
  }

  if (errors._load) {
    return (
      <Modal open={open} onClose={onClose} title={title} size="lg">
        <div className="flex items-center gap-2 text-red-500 py-8 justify-center">
          <AlertCircle className="w-5 h-5" />{errors._load}
        </div>
      </Modal>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? "حفظ التغييرات" : "إنشاء الخدمة"}
          </Button>
        </>
      }
    >
      {errors._submit && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errors._submit}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-5 bg-gray-50 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-colors relative",
              tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}>
            {t.label}
            {tabHasError(t.id) && (
              <span className="absolute top-1 right-[calc(50%-20px)] w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </div>

      {/* ══════════════ Tab 1: الخدمة ══════════════ */}
      {tab === "service" && (
        <div className="space-y-5">

          {/* نوع الخدمة */}
          {!isEdit ? (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">
                نوع الخدمة <span className="text-red-400">*</span>
              </p>
              {errors.serviceType && (
                <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.serviceType}
                </p>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                {SERVICE_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => {
                      const isRental = t.value === "rental" || t.value === "event_rental";
                      setForm(f => ({
                        ...f,
                        serviceType:   t.value,
                        durationUnit:  isRental ? "day"    : "minute",
                        durationValue: isRental ? "1"      : "60",
                      }));
                      setErrors(p => ({ ...p, serviceType: "", durationValue: "" }));
                    }}
                    className={clsx(
                      "text-right px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2.5",
                      form.serviceType === t.value
                        ? "border-brand-300 bg-brand-50"
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    )}>
                    <span className="text-xl shrink-0">{t.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={clsx("text-sm font-semibold truncate", form.serviceType === t.value ? "text-brand-700" : "text-gray-800")}>
                        {t.label}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{t.examples}</p>
                    </div>
                    {form.serviceType === t.value && <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <F label="نوع الخدمة">
                <select className={cls} value={form.serviceType} onChange={set("serviceType")}>
                  {SERVICE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </F>
              <F label="الحالة">
                <select className={cls} value={form.status} onChange={set("status")}>
                  <option value="active">نشطة — متاحة</option>
                  <option value="draft">مسودة — غير منشورة</option>
                  <option value="paused">معلقة — مؤقتاً</option>
                  <option value="archived">مؤرشفة</option>
                </select>
              </F>
            </div>
          )}

          {/* الاسم + اسم العرض */}
          <div className="grid grid-cols-2 gap-3">
            <F label="اسم الخدمة *" error={errors.name}>
              <input className={cls} value={form.name} onChange={set("name")}
                placeholder="مثال: تلوين شعر كامل" autoFocus />
            </F>
            <F label="اسم العرض للعميل" hint="اتركه فارغاً لاستخدام الاسم الداخلي">
              <input className={cls} value={form.displayName} onChange={set("displayName")} placeholder="اختياري" />
            </F>
          </div>

          {/* التصنيف + الحالة */}
          <div className="grid grid-cols-2 gap-3">
            <F label="التصنيف">
              <select className={cls} value={form.categoryId} onChange={set("categoryId")}>
                <option value="">— بدون تصنيف —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            {!isEdit && (
              <F label="الحالة">
                <select className={cls} value={form.status} onChange={set("status")}>
                  <option value="active">نشطة — متاحة</option>
                  <option value="draft">مسودة — غير منشورة</option>
                  <option value="paused">معلقة — مؤقتاً</option>
                </select>
              </F>
            )}
          </div>

          {/* الوصف */}
          <F label="وصف مختصر">
            <textarea rows={2} className={cls + " resize-none"} value={form.shortDescription}
              onChange={set("shortDescription")} placeholder="وصف يظهر في بطاقة الخدمة..." dir="rtl" />
          </F>
          <F label="وصف تفصيلي">
            <textarea rows={3} className={cls + " resize-none"} value={form.description}
              onChange={set("description")} placeholder="وصف شامل يظهر في صفحة الخدمة..." dir="rtl" />
          </F>

          {/* صورة الغلاف */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">
              صورة الغلاف <span className="text-gray-400 font-normal">(اختياري)</span>
            </p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickCover} />
            {coverPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-100 h-28">
                <img src={coverPreview} alt="غلاف" className="w-full h-full object-cover" />
                <button type="button" onClick={clearCover}
                  className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
                {isEdit && !coverFile && existingMediaId && (
                  <span className="absolute bottom-2 right-2 text-[10px] bg-black/40 text-white px-2 py-0.5 rounded-full">الصورة الحالية</span>
                )}
                {coverFile && (
                  <span className="absolute bottom-2 right-2 text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-full">صورة جديدة</span>
                )}
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

      {/* ══════════════ Tab 2: السعر والوقت ══════════════ */}
      {tab === "pricing" && (
        <div className="space-y-4">

          {/* طريقة التسعير */}
          <F label="طريقة التسعير">
            <select className={cls} value={form.servicePricingMode} onChange={set("servicePricingMode")}>
              <option value="fixed">سعر ثابت</option>
              <option value="from_price">يبدأ من...</option>
              <option value="variable">سعر متغير (يُحدَّد عند الحجز)</option>
            </select>
          </F>

          {/* السعر + ضريبة + عربون — section واحد */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50/60 rounded-2xl border border-gray-100">
            {/* يسار: حقل السعر */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                {form.servicePricingMode === "from_price" ? "السعر الأدنى *" : "السعر *"}
              </label>
              {form.servicePricingMode !== "variable" ? (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white tabular-nums"
                      value={form.basePrice}
                      onChange={set("basePrice")}
                      placeholder="0.00"
                      dir="ltr"
                    />
                    <span className="text-sm text-gray-400 shrink-0">ر.س</span>
                  </div>
                  {errors.basePrice && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />{errors.basePrice}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-400 pt-1">يُحدَّد السعر عند الحجز</p>
              )}
            </div>

            {/* يمين: ضريبة + عربون */}
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white overflow-hidden">
              <Sw value={form.vatInclusive} onChange={sw("vatInclusive")} label="شامل ضريبة 15%" />
              <Sw value={form.depositEnabled} onChange={sw("depositEnabled")} label="عربون مقدم" />
            </div>
          </div>

          {/* نسبة العربون — تظهر عند التفعيل */}
          {form.depositEnabled && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-600 shrink-0">نسبة العربون:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white tabular-nums text-center"
                  value={form.depositPercent}
                  onChange={set("depositPercent")}
                  placeholder="30"
                  dir="ltr"
                  min="1"
                  max="100"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
              {errors.depositPercent && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />{errors.depositPercent}
                </p>
              )}
            </div>
          )}

          {/* توقيت الخدمة */}
          {cfg.needsTiming && (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">توقيت الخدمة</p>

              <div className={clsx(
                "grid gap-3",
                ["rental", "event_rental"].includes(form.serviceType)
                  ? "grid-cols-1 max-w-xs"
                  : "grid-cols-3"
              )}>

                {/* مدة الخدمة: رقم + button group وحدات */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    {["rental", "event_rental"].includes(form.serviceType) ? "مدة الإيجار *" : "مدة الخدمة *"}
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="number"
                      className="w-16 border border-gray-200 rounded-xl px-2.5 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white tabular-nums text-center"
                      value={form.durationValue}
                      onChange={set("durationValue")}
                      dir="ltr"
                      min="1"
                    />
                    <div className="flex items-center gap-0.5">
                      {([
                        { value: "minute", label: "دق" },
                        { value: "hour",   label: "س"  },
                        { value: "day",    label: "ي"  },
                        { value: "month",  label: "ش"  },
                        { value: "year",   label: "سن" },
                      ] as { value: DurationUnit; label: string }[]).map(u => (
                        <button
                          key={u.value}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, durationUnit: u.value }))}
                          className={clsx(
                            "px-1.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                            form.durationUnit === u.value
                              ? "bg-brand-500 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          )}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {errors.durationValue && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />{errors.durationValue}
                    </p>
                  )}
                </div>

                {/* تجهيز قبل + تنظيف بعد — non-rental only */}
                {!["rental", "event_rental"].includes(form.serviceType) && (
                  <>
                    {/* تجهيز قبل */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">تجهيز قبل</label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          type="number"
                          className="w-16 border border-gray-200 rounded-xl px-2.5 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white tabular-nums text-center"
                          value={form.bufferBeforeValue}
                          onChange={set("bufferBeforeValue")}
                          placeholder="0"
                          dir="ltr"
                        />
                        <div className="flex items-center gap-0.5">
                          {([
                            { value: "minute", label: "دق" },
                            { value: "hour",   label: "س"  },
                            { value: "day",    label: "ي"  },
                            { value: "month",  label: "ش"  },
                            { value: "year",   label: "سن" },
                          ] as { value: DurationUnit; label: string }[]).map(u => (
                            <button key={u.value} type="button"
                              onClick={() => setForm(f => ({ ...f, bufferBeforeUnit: u.value }))}
                              className={clsx(
                                "px-1.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                                form.bufferBeforeUnit === u.value
                                  ? "bg-brand-500 text-white"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              )}>
                              {u.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* تنظيف بعد */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">تنظيف بعد</label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          type="number"
                          className="w-16 border border-gray-200 rounded-xl px-2.5 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white tabular-nums text-center"
                          value={form.bufferAfterValue}
                          onChange={set("bufferAfterValue")}
                          placeholder="0"
                          dir="ltr"
                        />
                        <div className="flex items-center gap-0.5">
                          {([
                            { value: "minute", label: "دق" },
                            { value: "hour",   label: "س"  },
                            { value: "day",    label: "ي"  },
                            { value: "month",  label: "ش"  },
                            { value: "year",   label: "سن" },
                          ] as { value: DurationUnit; label: string }[]).map(u => (
                            <button key={u.value} type="button"
                              onClick={() => setForm(f => ({ ...f, bufferAfterUnit: u.value }))}
                              className={clsx(
                                "px-1.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                                form.bufferAfterUnit === u.value
                                  ? "bg-brand-500 text-white"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              )}>
                              {u.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* إجمالي المدة */}
              {!["rental", "event_rental"].includes(form.serviceType) && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
                  <span className="font-semibold">المدة الكاملة في الجدول:</span>
                  <span>{totalMinutes} دقيقة</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ Tab 3: التشغيل ══════════════ */}
      {tab === "operation" && (
        <div className="space-y-1 divide-y divide-gray-50">

          {/* الظهور والتشغيل */}
          <div className="py-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">الظهور والتشغيل</p>
            <Sw value={form.isBookable}      onChange={sw("isBookable")}
              label="قابلة للحجز"               desc="تظهر في قائمة الحجز وتقبل مواعيد جديدة" />
            <Sw value={form.isVisibleInPOS}  onChange={sw("isVisibleInPOS")}
              label="تظهر في نقطة البيع (POS)"  desc="متاحة عند إنشاء فاتورة يدوية" />
            <Sw value={form.isVisibleOnline} onChange={sw("isVisibleOnline")}
              label="تظهر في الحجز الأونلاين"    desc="مرئية للعملاء عند الحجز الذاتي" />
            <Sw value={form.isFeatured}      onChange={sw("isFeatured")}
              label="خدمة مميزة"               desc="تظهر أولاً في القوائم والفلاتر" />
          </div>

          {/* الموظفون */}
          {cfg.needsStaff && (
            <div className="py-3">
              <p className="text-xs font-medium text-gray-600 mb-2">تعيين الموظفين</p>

              {!isEdit ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { value: "open",       label: "جميع الموظفين", desc: "أي موظف يمكنه التقديم" },
                      { value: "restricted", label: "موظفون محددون",  desc: "تحديد من يُسمح له" },
                    ].map(m => (
                      <button key={m.value} type="button"
                        onClick={() => setForm(f => ({ ...f, assignmentMode: m.value }))}
                        className={clsx(
                          "text-right px-3 py-2.5 rounded-xl border transition-all",
                          form.assignmentMode === m.value ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:border-gray-200"
                        )}>
                        <p className={clsx("text-sm font-semibold", form.assignmentMode === m.value ? "text-brand-700" : "text-gray-800")}>{m.label}</p>
                        <p className="text-xs text-gray-400">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                  {form.assignmentMode === "restricted" && (
                    <>
                      {errors.staff && (
                        <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />{errors.staff}
                        </p>
                      )}
                      {allStaff.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                          <Users className="w-6 h-6 mx-auto mb-1 opacity-30" />لا يوجد موظفون بعد
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          {allStaff.map(s => {
                            const sel = form.selectedStaffIds.includes(s.id);
                            return (
                              <button key={s.id} type="button" onClick={() => toggleStaff(s.id)}
                                className={clsx(
                                  "flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-right",
                                  sel ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:border-gray-200"
                                )}>
                                <div className={clsx(
                                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                  sel ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"
                                )}>
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
                </>
              ) : (
                <>
                  <F label="وضع التعيين">
                    <select className={cls} value={form.assignmentMode} onChange={set("assignmentMode")}>
                      <option value="open">مفتوح — أي موظف يمكنه التقديم</option>
                      <option value="restricted">مقيّد — موظفون محددون فقط</option>
                    </select>
                  </F>
                  {form.assignmentMode === "restricted" && (
                    <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      لإدارة الموظفين المؤهلين، اذهب لصفحة الخدمة ← تبويب "الموظفون"
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* التوصيل */}
          {DELIVERY_TYPES.has(form.serviceType) && (
            <div className="py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">طرق الاستلام</p>
              <Sw value={form.hasDelivery}   onChange={sw("hasDelivery")}
                label="توصيل / شحن"          desc="يمكن توصيل هذه الخدمة للعميل" />
              <Sw value={form.allowsPickup}  onChange={sw("allowsPickup")}
                label="استلام من الفرع"      desc="العميل يستلم مباشرةً" />
              <Sw value={form.allowsInVenue} onChange={sw("allowsInVenue")}
                label="داخل المحل / الموقع"  desc="يُقدَّم في موقع الخدمة" />
              {form.hasDelivery && (
                <div className="mt-2">
                  <F label="تكلفة التوصيل (ر.س)">
                    <input type="number" className={cls} value={form.deliveryCost}
                      onChange={set("deliveryCost")} placeholder="0" dir="ltr" />
                  </F>
                </div>
              )}
            </div>
          )}

          {/* المواد / المخزون — create only */}
          {!isEdit && cfg.needsMaterials && (
            <div className="py-2">
              <Sw value={form.inventoryEnabled} onChange={sw("inventoryEnabled")}
                label="ربط بالمخزون (مواد استهلاكية)"
                desc="خصم الكميات تلقائياً عند إكمال الخدمة" />
              {form.inventoryEnabled && (
                <div className="mt-3 space-y-2">
                  {errors.components && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errors.components}
                    </p>
                  )}
                  {form.components.map(comp => (
                    <div key={comp._key} className="border border-gray-100 rounded-xl p-3 space-y-2.5 bg-gray-50/50">
                      <div className="flex gap-1.5">
                        {(["manual", "inventory", "asset"] as const).map(st => (
                          <button key={st} type="button" onClick={() => updComp(comp._key, { sourceType: st })}
                            className={clsx(
                              "flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all",
                              comp.sourceType === st
                                ? "border-brand-300 bg-brand-50 text-brand-700"
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                            )}>
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
                          <input className={cls} value={comp.name}
                            onChange={e => updComp(comp._key, { name: e.target.value })} placeholder="مثال: صبغة شعر" />
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
                          <input type="number" className={cls} value={comp.quantity} dir="ltr"
                            onChange={e => updComp(comp._key, { quantity: parseFloat(e.target.value) || 1 })} />
                        </F>
                        <F label="الوحدة">
                          <input className={cls} value={comp.unit} placeholder="حبة"
                            onChange={e => updComp(comp._key, { unit: e.target.value })} />
                        </F>
                        <F label="التكلفة (ر.س)">
                          <input type="number" className={cls} value={comp.unitCost} dir="ltr"
                            onChange={e => updComp(comp._key, { unitCost: parseFloat(e.target.value) || 0 })} />
                        </F>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={comp.isOptional} className="rounded"
                          onChange={e => updComp(comp._key, { isOptional: e.target.checked })} />
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

          {/* العمولة — create only */}
          {!isEdit && (
            <div className="py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">عمولة الموظف</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "none",       label: "لا عمولة" },
                  { value: "percentage", label: "نسبة %" },
                  { value: "fixed",      label: "مبلغ ثابت" },
                ].map(m => (
                  <button key={m.value} type="button"
                    onClick={() => setForm(f => ({ ...f, commissionMode: m.value }))}
                    className={clsx(
                      "py-2 rounded-xl border text-sm font-medium transition-all",
                      form.commissionMode === m.value
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-gray-100 text-gray-600 hover:border-gray-200"
                    )}>
                    {m.label}
                  </button>
                ))}
              </div>
              {form.commissionMode !== "none" && (
                <div className="mt-2">
                  <F
                    label={form.commissionMode === "percentage" ? "نسبة العمولة (%)" : "مبلغ العمولة (ر.س)"}
                    error={errors.commissionValue}
                  >
                    <input type="number" className={cls} value={form.commissionValue}
                      onChange={set("commissionValue")} dir="ltr"
                      placeholder={form.commissionMode === "percentage" ? "20" : "50"} />
                  </F>
                  <p className="text-xs text-gray-400 mt-1">يمكن تجاوزها لكل موظف لاحقاً</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </Modal>
  );
}
