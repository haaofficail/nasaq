/**
 * ServiceFormModal — Full rebuild
 * - Two-panel layout: left sidebar (sections) + right content
 * - Real image upload via mediaApi.upload (not base64)
 * - Smart conditional fields based on service type
 * - Progressive disclosure: type → basics → pricing → timing → media → settings
 */

import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import {
  Loader2, AlertCircle, Upload, X, Star, Check,
  ChevronRight, ChevronLeft,
} from "lucide-react";
import { Modal, Button } from "../ui";
import { servicesApi, staffApi, inventoryApi, categoriesApi, mediaApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  serviceType: "", name: "", displayName: "", categoryId: "",
  shortDescription: "", description: "", status: "active",
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

// ─── Service types ────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  { value: "appointment",      label: "بموعد",        desc: "حجز وقت + موظف",           icon: "📅" },
  { value: "execution",        label: "تنفيذ",         desc: "تنفيذ داخل المحل",          icon: "🔧" },
  { value: "field_service",    label: "ميداني",        desc: "تنتقل لموقع العميل",        icon: "📍" },
  { value: "rental",           label: "تأجير",         desc: "أصل بفترة زمنية",          icon: "🏠" },
  { value: "event_rental",     label: "تأجير ميداني",  desc: "تأجير + نقل + تركيب",      icon: "⛺" },
  { value: "product",          label: "منتج",          desc: "بيع عنصر مادي",            icon: "📦" },
  { value: "product_shipping", label: "شحن",           desc: "منتج مع توصيل",            icon: "🚚" },
  { value: "food_order",       label: "طعام",          desc: "طلب + تجهيز + توصيل",      icon: "🍽️" },
  { value: "package",          label: "باقة",          desc: "خدمات مجمعة بسعر واحد",   icon: "🎁" },
  { value: "add_on",           label: "إضافة",         desc: "تكميلية على خدمة أخرى",    icon: "➕" },
  { value: "project",          label: "مشروع",         desc: "تنفيذ متعدد المراحل",      icon: "📋" },
];

type TypeCfg = { needsTiming: boolean; needsStaff: boolean; needsMaterials: boolean; needsDelivery: boolean };
const TYPE_CONFIG: Record<string, TypeCfg> = {
  appointment:      { needsTiming: true,  needsStaff: true,  needsMaterials: true,  needsDelivery: false },
  execution:        { needsTiming: true,  needsStaff: true,  needsMaterials: true,  needsDelivery: false },
  field_service:    { needsTiming: true,  needsStaff: true,  needsMaterials: false, needsDelivery: true  },
  rental:           { needsTiming: true,  needsStaff: false, needsMaterials: false, needsDelivery: true  },
  event_rental:     { needsTiming: true,  needsStaff: true,  needsMaterials: false, needsDelivery: true  },
  product:          { needsTiming: false, needsStaff: false, needsMaterials: true,  needsDelivery: true  },
  product_shipping: { needsTiming: false, needsStaff: false, needsMaterials: true,  needsDelivery: true  },
  food_order:       { needsTiming: false, needsStaff: false, needsMaterials: true,  needsDelivery: true  },
  package:          { needsTiming: false, needsStaff: false, needsMaterials: false, needsDelivery: false },
  add_on:           { needsTiming: false, needsStaff: false, needsMaterials: false, needsDelivery: false },
  project:          { needsTiming: true,  needsStaff: true,  needsMaterials: false, needsDelivery: false },
};
const defaultCfg: TypeCfg = { needsTiming: true, needsStaff: true, needsMaterials: true, needsDelivery: false };

const UNIT_MULTIPLIERS: Record<DurationUnit, number> = {
  minute: 1, hour: 60, day: 1440, month: 43200, year: 525600,
};
const UNIT_LABELS: Record<DurationUnit, string> = {
  minute: "دقيقة", hour: "ساعة", day: "يوم", month: "شهر", year: "سنة",
};

function parseDuration(mins: number): { value: string; unit: DurationUnit } {
  if (mins >= 525600 && mins % 525600 === 0) return { value: String(mins / 525600), unit: "year" };
  if (mins >= 43200  && mins % 43200  === 0) return { value: String(mins / 43200),  unit: "month" };
  if (mins >= 1440   && mins % 1440   === 0) return { value: String(mins / 1440),   unit: "day" };
  if (mins >= 60     && mins % 60     === 0) return { value: String(mins / 60),      unit: "hour" };
  return { value: String(mins || 60), unit: "minute" };
}

// ─── Section definitions ──────────────────────────────────────────────────────

const SECTIONS = [
  { id: "type",      label: "النوع",        required: true  },
  { id: "basics",    label: "الأساسيات",    required: true  },
  { id: "pricing",   label: "التسعير",      required: true  },
  { id: "timing",    label: "التوقيت",      required: false },
  { id: "media",     label: "الصورة",       required: false },
  { id: "settings",  label: "الإعدادات",    required: false },
];

// ─── Small UI helpers ─────────────────────────────────────────────────────────

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all bg-white";

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-600">
        {label}{required && <span className="text-red-400 mr-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0" />{error}</p>}
    </div>
  );
}

function Toggle({ value, onChange, label, desc }: {
  value: boolean; onChange: (v: boolean) => void; label: string; desc?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm text-gray-700">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={clsx("relative w-10 h-5 rounded-full transition-colors shrink-0", value ? "bg-brand-500" : "bg-gray-200")}
      >
        <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", value ? "right-0.5" : "left-0.5")} />
      </button>
    </div>
  );
}

function DurationRow({ label, value, unit, onValue, onUnit, hint }: {
  label: string; value: string; unit: DurationUnit;
  onValue: (v: string) => void; onUnit: (u: DurationUnit) => void; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      <div className="flex gap-2">
        <input type="number" min={0} value={value} onChange={e => onValue(e.target.value)}
          className={clsx(inputCls, "w-28")} />
        <select value={unit} onChange={e => onUnit(e.target.value as DurationUnit)} className={clsx(inputCls, "flex-1")}>
          {(Object.keys(UNIT_LABELS) as DurationUnit[]).map(u => (
            <option key={u} value={u}>{UNIT_LABELS[u]}</option>
          ))}
        </select>
      </div>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  serviceId?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ServiceFormModal({ open, onClose, onSuccess, serviceId }: ServiceFormModalProps) {
  const isEdit = !!serviceId;

  const [form, setForm]         = useState<Form>(INITIAL_FORM);
  const [section, setSection]   = useState("type");
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  const [categories, setCategories]         = useState<any[]>([]);
  const [allStaff, setAllStaff]             = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // Image state
  const fileRef                           = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview]   = useState<string | null>(null);
  const [coverUrl, setCoverUrl]           = useState<string | null>(null); // real uploaded URL
  const [existingMediaId, setExistingMediaId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress]   = useState<number>(0);
  const [uploading, setUploading]             = useState(false);
  const [uploadError, setUploadError]         = useState<string | null>(null);

  const cfg = TYPE_CONFIG[form.serviceType] ?? defaultCfg;

  // ── Visible sections based on type ────────────────────────────────────────
  const visibleSections = SECTIONS.filter(s => {
    if (s.id === "type" && isEdit) return false;
    if (s.id === "timing" && !cfg.needsTiming) return false;
    return true;
  });

  // ── Load service data (edit mode) ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setSection(isEdit ? "basics" : "type");
    setErrors({});
    setCoverPreview(null);
    setCoverUrl(null);
    setExistingMediaId(null);
    setUploadProgress(0);
    setUploadError(null);

    const loadBase = () => Promise.all([
      categoriesApi.list(true).then(r => setCategories(r.data || [])).catch(() => {}),
      staffApi.list().then(r => setAllStaff(r.data || [])).catch(() => {}),
      inventoryApi.assetTypes().then(r => setInventoryItems(r.data || [])).catch(() => {}),
    ]);

    if (isEdit && serviceId) {
      setLoading(true);
      Promise.all([servicesApi.get(serviceId), categoriesApi.list(true)]).then(([svcRes, catRes]) => {
        const s = svcRes.data;
        setCategories(catRes.data || []);
        const dur    = parseDuration(parseInt(s.durationMinutes) || 60);
        const before = parseDuration(parseInt(s.bufferBeforeMinutes) || 0);
        const after  = parseDuration(parseInt(s.bufferAfterMinutes) || 0);
        const cover  = (s.media || []).find((m: any) => m.isCover) || (s.media || [])[0];
        if (cover) { setCoverPreview(cover.url); setCoverUrl(cover.url); setExistingMediaId(cover.id); }
        setForm({
          serviceType: s.serviceType || "appointment",
          name: s.name || "", displayName: s.displayName || "",
          categoryId: s.categoryId || "", shortDescription: s.shortDescription || "",
          description: s.description || "", status: s.status || "active",
          servicePricingMode: s.servicePricingMode || "fixed",
          basePrice: s.basePrice ? String(s.basePrice) : "",
          vatInclusive: s.vatInclusive ?? true,
          depositEnabled: !!(s.depositPercent && parseFloat(s.depositPercent) > 0),
          depositPercent: s.depositPercent && parseFloat(s.depositPercent) > 0 ? String(s.depositPercent) : "30",
          durationValue: dur.value, durationUnit: dur.unit,
          bufferBeforeValue: before.value, bufferBeforeUnit: before.unit,
          bufferAfterValue: after.value, bufferAfterUnit: after.unit,
          assignmentMode: s.assignmentMode || "open", selectedStaffIds: [],
          inventoryEnabled: false, components: [],
          commissionMode: "none", commissionValue: "0",
          isBookable: s.isBookable ?? true, isVisibleInPOS: s.isVisibleInPOS ?? true,
          isVisibleOnline: s.isVisibleOnline ?? true, isFeatured: s.isFeatured ?? false,
          hasDelivery: s.hasDelivery ?? false, allowsPickup: s.allowsPickup ?? false,
          allowsInVenue: s.allowsInVenue ?? false,
          deliveryCost: s.deliveryCost ? String(s.deliveryCost) : "0",
        });
        setLoading(false);
      }).catch(() => { setLoading(false); setErrors({ _load: "فشل تحميل بيانات الخدمة" }); });
    } else {
      setForm(INITIAL_FORM);
      loadBase();
    }
  }, [open, serviceId, isEdit]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const upd = (field: keyof Form) => (e: any) => {
    const val = e?.target !== undefined ? e.target.value : e;
    setForm(f => ({ ...f, [field]: val }));
    setErrors(p => ({ ...p, [field]: "" }));
  };

  const toMinutes = () =>
    Math.round((parseFloat(form.durationValue) || 0) * UNIT_MULTIPLIERS[form.durationUnit]);

  // ── Real image upload ─────────────────────────────────────────────────────
  const handleFilePick = async (file: File) => {
    if (!file) return;
    // Immediate local preview
    const objectUrl = URL.createObjectURL(file);
    setCoverPreview(objectUrl);
    setCoverUrl(null);
    setUploadError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "services");
      const res = await mediaApi.upload(fd, (pct) => setUploadProgress(pct));
      const fileUrl = res.data?.fileUrl || res.data?.url || res.data?.publicUrl;
      if (!fileUrl) throw new Error("لم يتم إرجاع رابط الصورة");
      setCoverUrl(fileUrl);
      URL.revokeObjectURL(objectUrl);
      setCoverPreview(fileUrl);
    } catch (err: any) {
      setUploadError(err.message || "فشل رفع الصورة");
      setCoverPreview(null);
      setCoverUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const clearCover = () => {
    setCoverPreview(null);
    setCoverUrl(null);
    setUploadError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!isEdit && !form.serviceType)  e.serviceType = "اختر نوع الخدمة";
    if (!form.name.trim())             e.name = "اسم الخدمة مطلوب";
    if (form.servicePricingMode !== "variable" && (!form.basePrice || parseFloat(form.basePrice) <= 0))
      e.basePrice = "أدخل السعر";
    if (cfg.needsTiming && (!form.durationValue || parseFloat(form.durationValue) <= 0))
      e.durationValue = "المدة مطلوبة";
    if (form.depositEnabled && (!form.depositPercent || parseFloat(form.depositPercent) <= 0))
      e.depositPercent = "أدخل نسبة العربون";
    return e;
  };

  const sectionHasError = (id: string): boolean => {
    const sectionErrors: Record<string, string[]> = {
      type: ["serviceType"], basics: ["name"], pricing: ["basePrice", "depositPercent"],
      timing: ["durationValue"], media: [], settings: [],
    };
    return (sectionErrors[id] || []).some(f => !!errors[f]);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Jump to first section with error
      const errSection = visibleSections.find(s => sectionHasError(s.id));
      if (errSection) setSection(errSection.id);
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const durationPayload = cfg.needsTiming ? {
        durationMinutes: toMinutes() || 60,
        bufferBeforeMinutes: Math.round((parseFloat(form.bufferBeforeValue) || 0) * UNIT_MULTIPLIERS[form.bufferBeforeUnit]),
        bufferAfterMinutes:  Math.round((parseFloat(form.bufferAfterValue)  || 0) * UNIT_MULTIPLIERS[form.bufferAfterUnit]),
      } : {};

      if (isEdit) {
        await servicesApi.update(serviceId!, {
          name: form.name, displayName: form.displayName || undefined,
          categoryId: form.categoryId || undefined,
          shortDescription: form.shortDescription || undefined,
          description: form.description || undefined,
          serviceType: form.serviceType, status: form.status,
          servicePricingMode: form.servicePricingMode, basePrice: form.basePrice,
          vatInclusive: form.vatInclusive,
          depositPercent: form.depositEnabled ? form.depositPercent : "0",
          ...durationPayload,
          assignmentMode: form.assignmentMode,
          isBookable: form.isBookable, isVisibleInPOS: form.isVisibleInPOS,
          isVisibleOnline: form.isVisibleOnline, isFeatured: form.isFeatured,
          hasDelivery: form.hasDelivery, allowsPickup: form.allowsPickup,
          allowsInVenue: form.allowsInVenue,
          deliveryCost: parseFloat(form.deliveryCost || "0") || 0,
        });
        // Handle cover image change
        if (existingMediaId && coverUrl !== (coverPreview === null ? null : coverUrl)) {
          await servicesApi.removeMedia(serviceId!, existingMediaId).catch(() => {});
        }
        if (coverUrl && coverUrl !== (existingMediaId ? coverPreview : null)) {
          await servicesApi.addMedia(serviceId!, { url: coverUrl, type: "image", isCover: true }).catch(() => {});
        }
      } else {
        const payload: Record<string, any> = {
          name: form.name, status: form.status, serviceType: form.serviceType,
          servicePricingMode: form.servicePricingMode, vatInclusive: form.vatInclusive,
          isBookable: form.isBookable, isVisibleInPOS: form.isVisibleInPOS,
          isVisibleOnline: form.isVisibleOnline, isFeatured: form.isFeatured,
          ...durationPayload,
        };
        if (form.displayName)      payload.displayName      = form.displayName;
        if (form.categoryId)       payload.categoryId       = form.categoryId;
        if (form.shortDescription) payload.shortDescription = form.shortDescription;
        if (form.description)      payload.description      = form.description;
        if (form.servicePricingMode !== "variable") payload.basePrice = form.basePrice;
        if (form.depositEnabled)   payload.depositPercent   = form.depositPercent;
        if (cfg.needsStaff)        payload.assignmentMode   = form.assignmentMode;
        if (cfg.needsDelivery) {
          payload.hasDelivery = form.hasDelivery;
          payload.allowsPickup = form.allowsPickup;
          payload.allowsInVenue = form.allowsInVenue;
          if (form.hasDelivery) payload.deliveryCost = parseFloat(form.deliveryCost) || 0;
        }
        const serviceRes = await servicesApi.create(payload);
        const newId = serviceRes.data.id;
        await Promise.allSettled([
          // Attach uploaded cover image
          ...(coverUrl ? [servicesApi.addMedia(newId, { url: coverUrl, type: "image", isCover: true })] : []),
          // Staff
          ...(cfg.needsStaff && form.assignmentMode === "restricted" && form.selectedStaffIds.length > 0
            ? form.selectedStaffIds.map(userId => servicesApi.addStaff(newId, { userId, commissionMode: "inherit" }))
            : []),
          // Materials
          ...(cfg.needsMaterials && form.inventoryEnabled && form.components.length > 0
            ? form.components.map(comp => servicesApi.addComponent(newId, {
                sourceType: comp.sourceType, inventoryItemId: comp.sourceType !== "manual" ? comp.inventoryItemId : null,
                name: comp.name, quantity: comp.quantity, unit: comp.unit, unitCost: comp.unitCost, isOptional: comp.isOptional,
              }))
            : []),
          // Commission
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
    setForm(f => ({ ...f, components: [...f.components, { _key, sourceType: "manual", name: "", quantity: 1, unit: "حبة", unitCost: 0, isOptional: false }] }));
  };
  const updComp = (key: string, patch: Partial<ComponentItem>) =>
    setForm(f => ({ ...f, components: f.components.map(c => c._key === key ? { ...c, ...patch } : c) }));
  const delComp = (key: string) =>
    setForm(f => ({ ...f, components: f.components.filter(c => c._key !== key) }));
  const toggleStaff = (id: string) =>
    setForm(f => ({
      ...f,
      selectedStaffIds: f.selectedStaffIds.includes(id)
        ? f.selectedStaffIds.filter(s => s !== id)
        : [...f.selectedStaffIds, id],
    }));

  const currentIdx = visibleSections.findIndex(s => s.id === section);
  const canNext    = currentIdx < visibleSections.length - 1;
  const canPrev    = currentIdx > 0;

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading) return (
    <Modal open={open} onClose={onClose} title={isEdit ? "تعديل الخدمة" : "خدمة جديدة"} size="xl">
      <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
    </Modal>
  );

  if (errors._load) return (
    <Modal open={open} onClose={onClose} title="تعديل الخدمة" size="xl">
      <div className="flex items-center gap-2 text-red-500 py-12 justify-center">
        <AlertCircle className="w-5 h-5" />{errors._load}
      </div>
    </Modal>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `تعديل: ${form.name || "الخدمة"}` : "خدمة جديدة"}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {canPrev && (
              <Button variant="secondary" icon={ChevronRight} onClick={() => setSection(visibleSections[currentIdx - 1].id)}>
                السابق
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>إلغاء</Button>
            {canNext ? (
              <Button onClick={() => setSection(visibleSections[currentIdx + 1].id)}>
                التالي <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            ) : (
              <Button onClick={submit} loading={saving}>
                {isEdit ? "حفظ التغييرات" : "إنشاء الخدمة"}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {errors._submit && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errors._submit}
        </div>
      )}

      <div className="flex gap-0 min-h-[480px]">

        {/* ── Left sidebar: section nav ── */}
        <div className="w-44 shrink-0 border-l border-gray-100 pl-4 ml-4">
          <div className="space-y-0.5">
            {visibleSections.map((s, i) => {
              const active  = section === s.id;
              const hasErr  = sectionHasError(s.id);
              const done    = !isEdit && i < currentIdx && s.id !== "type";
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={clsx(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-right transition-all",
                    active ? "bg-brand-50 text-brand-700 font-semibold" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  )}
                >
                  <span className={clsx(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all",
                    hasErr ? "bg-red-500 text-white" :
                    done   ? "bg-emerald-500 text-white" :
                    active ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-500"
                  )}>
                    {hasErr ? <AlertCircle className="w-3 h-3" /> : done ? <Check className="w-3 h-3" /> : i + 1}
                  </span>
                  <span className="flex-1 text-right">{s.label}</span>
                  {s.required && !isEdit && (
                    <span className="text-[10px] text-red-400 font-medium">*</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right content ── */}
        <div className="flex-1 min-w-0 space-y-5 overflow-y-auto max-h-[520px] pl-1">

          {/* ────── النوع ────── */}
          {section === "type" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-0.5">ما نوع الخدمة؟</h3>
                <p className="text-sm text-gray-400">اختر النوع المناسب — سيحدد هذا الحقول المطلوبة لاحقاً</p>
              </div>
              {errors.serviceType && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.serviceType}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SERVICE_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, serviceType: t.value })); setErrors(p => ({ ...p, serviceType: "" })); }}
                    className={clsx(
                      "flex flex-col gap-1.5 p-3 rounded-xl border-2 text-right transition-all",
                      form.serviceType === t.value
                        ? "border-brand-500 bg-brand-50 shadow-sm"
                        : "border-gray-100 hover:border-gray-300 bg-white"
                    )}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <p className={clsx("text-sm font-semibold", form.serviceType === t.value ? "text-brand-700" : "text-gray-900")}>{t.label}</p>
                    <p className="text-[11px] text-gray-400 leading-tight">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ────── الأساسيات ────── */}
          {section === "basics" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-0.5">المعلومات الأساسية</h3>
                <p className="text-sm text-gray-400">اسم الخدمة والتصنيف والوصف</p>
              </div>
              <Field label="اسم الخدمة" required error={errors.name}>
                <input value={form.name} onChange={upd("name")} placeholder="مثال: حجز جلسة تصوير" className={inputCls} />
              </Field>
              <Field label="الاسم المعروض (اختياري)" hint="يظهر للعميل بدل الاسم الداخلي">
                <input value={form.displayName} onChange={upd("displayName")} placeholder="مثال: جلسة التصوير الاحترافية" className={inputCls} />
              </Field>
              <Field label="التصنيف">
                <select value={form.categoryId} onChange={upd("categoryId")} className={inputCls}>
                  <option value="">-- بدون تصنيف --</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="وصف مختصر" hint="يظهر في قائمة الخدمات">
                <input value={form.shortDescription} onChange={upd("shortDescription")} placeholder="وصف مختصر بجملة أو جملتين" className={inputCls} />
              </Field>
              <Field label="وصف تفصيلي">
                <textarea value={form.description} onChange={upd("description") as any} rows={3}
                  placeholder="وصف كامل يساعد العميل على الفهم..." className={clsx(inputCls, "resize-none")} />
              </Field>
              <Field label="الحالة">
                <select value={form.status} onChange={upd("status")} className={inputCls}>
                  <option value="active">نشطة — ظاهرة للحجز</option>
                  <option value="draft">مسودة — مخفية</option>
                  <option value="paused">معلقة — مؤقتاً</option>
                </select>
              </Field>
            </div>
          )}

          {/* ────── التسعير ────── */}
          {section === "pricing" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-0.5">التسعير والدفع</h3>
                <p className="text-sm text-gray-400">السعر وطريقة احتسابه والعربون</p>
              </div>
              <Field label="طريقة التسعير">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "fixed",    label: "ثابت",    desc: "سعر واحد محدد" },
                    { value: "from_price", label: "يبدأ من", desc: "الحد الأدنى" },
                    { value: "variable", label: "متغير",   desc: "يحدده الموظف" },
                  ].map(m => (
                    <button key={m.value} type="button" onClick={() => setForm(f => ({ ...f, servicePricingMode: m.value }))}
                      className={clsx("p-2.5 rounded-xl border-2 text-right transition-all",
                        form.servicePricingMode === m.value ? "border-brand-500 bg-brand-50" : "border-gray-100 hover:border-gray-200"
                      )}>
                      <p className={clsx("text-sm font-semibold", form.servicePricingMode === m.value ? "text-brand-700" : "text-gray-800")}>{m.label}</p>
                      <p className="text-[11px] text-gray-400">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </Field>
              {form.servicePricingMode !== "variable" && (
                <Field label={form.servicePricingMode === "from_price" ? "يبدأ من (ر.س)" : "السعر (ر.س)"} required error={errors.basePrice}>
                  <input type="number" min={0} value={form.basePrice} onChange={upd("basePrice")}
                    placeholder="0.00" className={inputCls} dir="ltr" />
                </Field>
              )}
              <div className="p-3 bg-gray-50 rounded-xl space-y-1 divide-y divide-gray-100">
                <Toggle value={form.vatInclusive} onChange={v => setForm(f => ({ ...f, vatInclusive: v }))}
                  label="السعر شامل الضريبة (VAT)"
                  desc={form.vatInclusive ? "السعر المعروض يشمل 15% ضريبة القيمة المضافة" : "ستُضاف الضريبة على السعر"} />
                <Toggle value={form.depositEnabled} onChange={v => setForm(f => ({ ...f, depositEnabled: v }))}
                  label="تفعيل العربون" desc="نسبة مئوية تُدفع عند الحجز" />
              </div>
              {form.depositEnabled && (
                <Field label="نسبة العربون %" error={errors.depositPercent}>
                  <input type="number" min={1} max={100} value={form.depositPercent} onChange={upd("depositPercent")}
                    placeholder="30" className={inputCls} dir="ltr" />
                </Field>
              )}
            </div>
          )}

          {/* ────── التوقيت ────── */}
          {section === "timing" && cfg.needsTiming && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-0.5">التوقيت والمدة</h3>
                <p className="text-sm text-gray-400">المدة الزمنية للخدمة ووقت التجهيز</p>
              </div>
              <DurationRow
                label="مدة الخدمة *"
                value={form.durationValue} unit={form.durationUnit}
                onValue={v => { setForm(f => ({ ...f, durationValue: v })); setErrors(p => ({ ...p, durationValue: "" })); }}
                onUnit={u => setForm(f => ({ ...f, durationUnit: u }))}
                hint={errors.durationValue}
              />
              <DurationRow
                label="وقت التجهيز قبل الخدمة"
                value={form.bufferBeforeValue} unit={form.bufferBeforeUnit}
                onValue={v => setForm(f => ({ ...f, bufferBeforeValue: v }))}
                onUnit={u => setForm(f => ({ ...f, bufferBeforeUnit: u }))}
                hint="وقت إضافي لتجهيز المكان قبل الموعد"
              />
              <DurationRow
                label="وقت التجهيز بعد الخدمة"
                value={form.bufferAfterValue} unit={form.bufferAfterUnit}
                onValue={v => setForm(f => ({ ...f, bufferAfterValue: v }))}
                onUnit={u => setForm(f => ({ ...f, bufferAfterUnit: u }))}
                hint="وقت إضافي للتنظيف أو الإعداد للموعد التالي"
              />
              {form.durationValue && (
                <div className="p-3 bg-brand-50 rounded-xl">
                  <p className="text-xs font-medium text-brand-700">
                    إجمالي الوقت المحجوز:{" "}
                    {(() => {
                      const total = toMinutes()
                        + Math.round((parseFloat(form.bufferBeforeValue) || 0) * UNIT_MULTIPLIERS[form.bufferBeforeUnit])
                        + Math.round((parseFloat(form.bufferAfterValue)  || 0) * UNIT_MULTIPLIERS[form.bufferAfterUnit]);
                      if (total >= 1440) return `${(total / 1440).toFixed(1)} يوم`;
                      if (total >= 60)   return `${(total / 60).toFixed(1)} ساعة`;
                      return `${total} دقيقة`;
                    })()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ────── الصورة ────── */}
          {section === "media" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-0.5">صورة الخدمة</h3>
                <p className="text-sm text-gray-400">صورة واضحة تزيد احتمالية الحجز بشكل كبير</p>
              </div>

              {coverPreview ? (
                <div className="relative group rounded-2xl overflow-hidden border border-gray-200 aspect-video max-w-sm">
                  <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                      <p className="text-white text-xs">{uploadProgress}%</p>
                      <div className="w-32 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {!uploading && coverUrl && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Star className="w-2.5 h-2.5" fill="white" /> غلاف
                    </div>
                  )}
                  {!uploading && (
                    <button
                      onClick={clearCover}
                      className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all group"
                >
                  <Upload className="w-9 h-9 text-gray-300 group-hover:text-brand-400 mx-auto mb-3 transition-colors" />
                  <p className="text-sm font-medium text-gray-600">اسحب صورة هنا أو اضغط للاختيار</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — حتى 10MB</p>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFilePick(e.target.files[0])}
              />

              {uploadError && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
                </div>
              )}

              {uploading && (
                <p className="text-xs text-brand-600 text-center">جاري رفع الصورة... {uploadProgress}%</p>
              )}

              {coverUrl && !uploading && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-brand-500 hover:underline"
                >
                  تغيير الصورة
                </button>
              )}
            </div>
          )}

          {/* ────── الإعدادات ────── */}
          {section === "settings" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-0.5">إعدادات التشغيل</h3>
                <p className="text-sm text-gray-400">الظهور والموظفون والتوصيل</p>
              </div>

              {/* Visibility */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-0 divide-y divide-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2">الظهور</p>
                <Toggle value={form.isBookable}    onChange={v => setForm(f => ({ ...f, isBookable: v }))}    label="قابلة للحجز" desc="يمكن للعملاء حجزها مباشرة" />
                <Toggle value={form.isVisibleInPOS} onChange={v => setForm(f => ({ ...f, isVisibleInPOS: v }))} label="تظهر في نقطة البيع" />
                <Toggle value={form.isVisibleOnline} onChange={v => setForm(f => ({ ...f, isVisibleOnline: v }))} label="تظهر على الموقع والتطبيق" />
                <Toggle value={form.isFeatured}    onChange={v => setForm(f => ({ ...f, isFeatured: v }))}    label="خدمة مميزة" desc="تظهر في الواجهة الرئيسية" />
              </div>

              {/* Staff */}
              {cfg.needsStaff && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">تعيين الموظفين</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "open",       label: "مفتوح",     desc: "أي موظف متاح" },
                      { value: "restricted", label: "محدد",      desc: "موظفون مختارون" },
                    ].map(m => (
                      <button key={m.value} type="button" onClick={() => setForm(f => ({ ...f, assignmentMode: m.value }))}
                        className={clsx("p-3 rounded-xl border-2 text-right transition-all",
                          form.assignmentMode === m.value ? "border-brand-500 bg-brand-50" : "border-gray-100 hover:border-gray-200"
                        )}>
                        <p className={clsx("text-sm font-semibold", form.assignmentMode === m.value ? "text-brand-700" : "text-gray-800")}>{m.label}</p>
                        <p className="text-xs text-gray-400">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                  {form.assignmentMode === "restricted" && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">اختر الموظفين المسموح لهم بتقديم هذه الخدمة:</p>
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                        {allStaff.map((s: any) => {
                          const sel = form.selectedStaffIds.includes(s.id);
                          return (
                            <button key={s.id} type="button" onClick={() => toggleStaff(s.id)}
                              className={clsx("flex items-center gap-2 px-3 py-2 rounded-xl border text-right text-sm transition-all",
                                sel ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-100 text-gray-700 hover:border-gray-200"
                              )}>
                              <span className={clsx("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                                sel ? "border-brand-500 bg-brand-500" : "border-gray-300"
                              )}>
                                {sel && <Check className="w-2.5 h-2.5 text-white" />}
                              </span>
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery */}
              {cfg.needsDelivery && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-0 divide-y divide-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2">خيارات التسليم</p>
                  <Toggle value={form.allowsInVenue} onChange={v => setForm(f => ({ ...f, allowsInVenue: v }))} label="داخل المحل / الموقع" />
                  <Toggle value={form.allowsPickup}  onChange={v => setForm(f => ({ ...f, allowsPickup: v }))}  label="استلام من المحل" />
                  <Toggle value={form.hasDelivery}   onChange={v => setForm(f => ({ ...f, hasDelivery: v }))}   label="توصيل لموقع العميل" />
                  {form.hasDelivery && (
                    <div className="pt-2">
                      <Field label="تكلفة التوصيل (ر.س)">
                        <input type="number" min={0} value={form.deliveryCost} onChange={upd("deliveryCost")}
                          placeholder="0" className={inputCls} dir="ltr" />
                      </Field>
                    </div>
                  )}
                </div>
              )}

              {/* Commission */}
              {!isEdit && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">عمولة الموظف</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "none",       label: "لا توجد" },
                      { value: "percentage", label: "نسبة %" },
                      { value: "fixed",      label: "ثابتة ر.س" },
                    ].map(m => (
                      <button key={m.value} type="button" onClick={() => setForm(f => ({ ...f, commissionMode: m.value }))}
                        className={clsx("py-2 rounded-xl border-2 text-sm font-medium transition-all",
                          form.commissionMode === m.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-100 text-gray-600 hover:border-gray-200"
                        )}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {form.commissionMode !== "none" && (
                    <Field label={form.commissionMode === "percentage" ? "النسبة %" : "المبلغ الثابت ر.س"}>
                      <input type="number" min={0} value={form.commissionValue} onChange={upd("commissionValue")}
                        placeholder="0" className={inputCls} dir="ltr" />
                    </Field>
                  )}
                </div>
              )}

              {/* Materials */}
              {cfg.needsMaterials && !isEdit && (
                <div className="space-y-3">
                  <Toggle value={form.inventoryEnabled} onChange={v => setForm(f => ({ ...f, inventoryEnabled: v }))}
                    label="مواد وعناصر مخزون" desc="حدد المواد المستخدمة في هذه الخدمة" />
                  {form.inventoryEnabled && (
                    <div className="space-y-2">
                      {form.components.map(comp => (
                        <div key={comp._key} className="flex gap-2 items-start p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <input placeholder="اسم المادة" value={comp.name}
                            onChange={e => updComp(comp._key, { name: e.target.value })}
                            className={clsx(inputCls, "flex-1")} />
                          <input type="number" placeholder="كمية" value={comp.quantity}
                            onChange={e => updComp(comp._key, { quantity: parseInt(e.target.value) || 1 })}
                            className={clsx(inputCls, "w-20")} dir="ltr" />
                          <input placeholder="وحدة" value={comp.unit}
                            onChange={e => updComp(comp._key, { unit: e.target.value })}
                            className={clsx(inputCls, "w-20")} />
                          <button onClick={() => delComp(comp._key)} className="p-2 text-red-400 hover:text-red-600 transition-colors mt-0.5">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button onClick={addComponent}
                        className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                        + إضافة مادة
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </Modal>
  );
}
