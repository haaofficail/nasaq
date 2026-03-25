import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, AlertCircle, Upload, X, Plus, Trash2, Save } from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, categoriesApi, mediaApi, addonsApi, questionsApi } from "@/lib/api";
import { toast } from "@/hooks/useToast";

// ─── Constants ────────────────────────────────────────────────────────────────

type DurationUnit = "minute" | "hour" | "day";
const UNIT_MINS: Record<DurationUnit, number> = { minute: 1, hour: 60, day: 1440 };
const UNIT_LABELS: Record<DurationUnit, string> = { minute: "دقيقة", hour: "ساعة", day: "يوم" };

function parseDur(mins: number): { v: string; u: DurationUnit } {
  if (mins >= 1440 && mins % 1440 === 0) return { v: String(mins / 1440), u: "day" };
  if (mins >= 60   && mins % 60   === 0) return { v: String(mins / 60),   u: "hour" };
  return { v: String(mins || 60), u: "minute" };
}

const SERVICE_TYPES = [
  { value: "appointment",      label: "بموعد",         icon: "🗓" },
  { value: "execution",        label: "تنفيذ",          icon: "🔧" },
  { value: "field_service",    label: "ميداني",         icon: "📍" },
  { value: "rental",           label: "تأجير",          icon: "🏠" },
  { value: "event_rental",     label: "تأجير فعالية",   icon: "⛺" },
  { value: "product",          label: "منتج",           icon: "📦" },
  { value: "product_shipping", label: "شحن",            icon: "🚚" },
  { value: "food_order",       label: "طعام",           icon: "🍽" },
  { value: "package",          label: "باقة",           icon: "🎁" },
  { value: "add_on",           label: "إضافة",          icon: "➕" },
  { value: "project",          label: "مشروع",          icon: "📋" },
];

const NEEDS_TIMING   = new Set(["appointment","execution","field_service","rental","event_rental","project"]);
const NEEDS_CAPACITY = new Set(["event_rental","package","food_order","rental"]);

// ─── Types ────────────────────────────────────────────────────────────────────

type Form = {
  serviceType: string; name: string; categoryId: string; description: string;
  basePrice: string; durationValue: string; durationUnit: DurationUnit; status: string;
  vatInclusive: boolean; maxCapacity: string;
  depositPercent: string; minAdvanceHours: string; maxAdvanceDays: string;
  bufferBeforeMinutes: string; bufferAfterMinutes: string; cancellationFreeHours: string;
  isBookable: boolean; isVisibleInPOS: boolean; isVisibleOnline: boolean;
};

const INIT: Form = {
  serviceType: "", name: "", categoryId: "", description: "",
  basePrice: "", durationValue: "60", durationUnit: "minute", status: "active",
  vatInclusive: true, maxCapacity: "",
  depositPercent: "30", minAdvanceHours: "", maxAdvanceDays: "",
  bufferBeforeMinutes: "0", bufferAfterMinutes: "0", cancellationFreeHours: "24",
  isBookable: true, isVisibleInPOS: true, isVisibleOnline: true,
};

type AddonDraft    = { name: string; price: string; type: "optional" | "required" };
type QuestionDraft = { question: string; type: "text" | "select" | "checkbox" | "number"; isRequired: boolean; isPaid: boolean; price: string; options: string };

const INIT_ADDON: AddonDraft    = { name: "", price: "", type: "optional" };
const INIT_Q: QuestionDraft     = { question: "", type: "text", isRequired: false, isPaid: false, price: "", options: "" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const iCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all bg-white";

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
      <AlertCircle className="w-3 h-3 shrink-0" />{msg}
    </p>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ServiceFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== "new";

  const [form, setForm]       = useState<Form>(INIT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [serviceName, setServiceName] = useState("");
  const [categories, setCategories]   = useState<any[]>([]);

  const [addonDrafts,    setAddonDrafts]    = useState<AddonDraft[]>([]);
  const [questionDrafts, setQuestionDrafts] = useState<QuestionDraft[]>([]);
  const [loadedAddons,   setLoadedAddons]   = useState<any[]>([]);
  const [loadedQuestions,setLoadedQuestions]= useState<any[]>([]);

  const fileRef                             = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview]     = useState<string | null>(null);
  const [coverUrl,     setCoverUrl]         = useState<string | null>(null);
  const [existingMediaId, setExistingMediaId] = useState<string | null>(null);
  const [uploading,    setUploading]        = useState(false);
  const [uploadPct,    setUploadPct]        = useState(0);
  const [uploadErr,    setUploadErr]        = useState<string | null>(null);

  const needsTiming = NEEDS_TIMING.has(form.serviceType);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    categoriesApi.list(true).then(r => setCategories(r.data || [])).catch(() => {});

    if (isEdit) {
      setLoading(true);
      Promise.all([
        servicesApi.get(id!),
        questionsApi.list(id!).catch(() => ({ data: [] })),
      ]).then(([res, qRes]) => {
        const s = res.data;
        const dur = parseDur(parseInt(s.durationMinutes) || 60);
        const cover = (s.media || []).find((m: any) => m.isCover) || (s.media || [])[0];
        if (cover) { setCoverPreview(cover.url); setCoverUrl(cover.url); setExistingMediaId(cover.id); }
        setServiceName(s.name || "");
        setForm({
          serviceType:           s.serviceType || "appointment",
          name:                  s.name || "",
          categoryId:            s.categoryId || "",
          description:           s.description || "",
          basePrice:             s.basePrice ? String(s.basePrice) : "",
          durationValue:         dur.v,
          durationUnit:          dur.u,
          status:                s.status || "active",
          vatInclusive:          s.vatInclusive ?? true,
          maxCapacity:           s.maxCapacity ? String(s.maxCapacity) : "",
          depositPercent:        s.depositPercent ? String(s.depositPercent) : "30",
          minAdvanceHours:       s.minAdvanceHours ? String(s.minAdvanceHours) : "",
          maxAdvanceDays:        s.maxAdvanceDays  ? String(s.maxAdvanceDays)  : "",
          bufferBeforeMinutes:   s.bufferBeforeMinutes ? String(s.bufferBeforeMinutes) : "0",
          bufferAfterMinutes:    s.bufferAfterMinutes  ? String(s.bufferAfterMinutes)  : "0",
          cancellationFreeHours: s.cancellationPolicy?.freeHours != null ? String(s.cancellationPolicy.freeHours) : "24",
          isBookable:            s.isBookable       ?? true,
          isVisibleInPOS:        s.isVisibleInPOS   ?? true,
          isVisibleOnline:       s.isVisibleOnline  ?? true,
        });
        setLoadedAddons(s.addons || []);
        setLoadedQuestions(qRes.data || []);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
        setErrors({ _load: "فشل تحميل بيانات الخدمة" });
      });
    }
  }, [id, isEdit]);

  const upd = (f: keyof Form) => (e: any) => {
    setForm(p => ({ ...p, [f]: e?.target !== undefined ? e.target.value : e }));
    setErrors(p => ({ ...p, [f]: "" }));
  };

  // ── Image upload ──────────────────────────────────────────────────────────
  const pickFile = async (file: File) => {
    setCoverPreview(URL.createObjectURL(file));
    setCoverUrl(null);
    setUploadErr(null);
    setUploading(true);
    setUploadPct(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "services");
      const res = await mediaApi.upload(fd, pct => setUploadPct(pct));
      const url = res.data?.fileUrl || res.data?.url || res.data?.publicUrl;
      if (!url) throw new Error("لم يُرجع السيرفر رابط الصورة");
      setCoverPreview(url);
      setCoverUrl(url);
    } catch (e: any) {
      setUploadErr(e.message || "فشل رفع الصورة");
      setCoverPreview(null);
    } finally {
      setUploading(false);
    }
  };

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.serviceType) e.serviceType = "اختر نوع الخدمة";
    if (!form.name.trim()) e.name = "اسم الخدمة مطلوب";
    if (!form.basePrice || parseFloat(form.basePrice) <= 0) e.basePrice = "أدخل السعر";
    if (needsTiming && (!form.durationValue || parseFloat(form.durationValue) <= 0))
      e.durationValue = "المدة مطلوبة";
    return e;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setErrors({});
    try {
      const durationMinutes = needsTiming
        ? Math.round((parseFloat(form.durationValue) || 60) * UNIT_MINS[form.durationUnit])
        : undefined;

      const bookingPayload = {
        vatInclusive:        form.vatInclusive,
        maxCapacity:         form.maxCapacity ? parseInt(form.maxCapacity) : undefined,
        depositPercent:      form.depositPercent || "0",
        minAdvanceHours:     form.minAdvanceHours ? parseInt(form.minAdvanceHours) : undefined,
        maxAdvanceDays:      form.maxAdvanceDays  ? parseInt(form.maxAdvanceDays)  : undefined,
        bufferBeforeMinutes: parseInt(form.bufferBeforeMinutes) || 0,
        bufferAfterMinutes:  parseInt(form.bufferAfterMinutes)  || 0,
        isBookable:          form.isBookable,
        isVisibleInPOS:      form.isVisibleInPOS,
        isVisibleOnline:     form.isVisibleOnline,
        cancellationPolicy:  { freeHours: parseInt(form.cancellationFreeHours) || 24, refundPercentBefore: 50, refundDaysBefore: 3, noRefundDaysBefore: 1 },
      };

      if (isEdit) {
        await servicesApi.update(id!, {
          name: form.name, categoryId: form.categoryId || undefined,
          description: form.description || undefined,
          basePrice: form.basePrice, status: form.status,
          ...(durationMinutes ? { durationMinutes } : {}),
          ...bookingPayload,
        });
        if (coverUrl && existingMediaId) {
          await servicesApi.removeMedia(id!, existingMediaId).catch(() => {});
          await servicesApi.addMedia(id!, { url: coverUrl, type: "image", isCover: true }).catch(() => {});
        } else if (coverUrl && !existingMediaId) {
          await servicesApi.addMedia(id!, { url: coverUrl, type: "image", isCover: true }).catch(() => {});
        }
        const validAddonDrafts = addonDrafts.filter(a => a.name.trim() && a.price);
        for (const a of validAddonDrafts) {
          const addon = await addonsApi.create({ name: a.name.trim(), price: a.price, type: a.type });
          await servicesApi.linkAddon(id!, { addonId: addon.data.id }).catch(() => {});
        }
        const validQDrafts = questionDrafts.filter(q => q.question.trim());
        for (let i = 0; i < validQDrafts.length; i++) {
          const q = validQDrafts[i];
          await questionsApi.create(id!, {
            question: q.question.trim(), type: q.type,
            isRequired: q.isRequired, isPaid: q.isPaid,
            price: q.isPaid ? q.price || "0" : "0",
            options: q.type === "select" ? q.options.split("\n").filter(Boolean) : [],
            sortOrder: loadedQuestions.length + i,
          }).catch(() => {});
        }
        toast.success("تم حفظ التعديلات");
        navigate(`/dashboard/services/${id}`);
      } else {
        const res = await servicesApi.create({
          name: form.name, serviceType: form.serviceType,
          categoryId: form.categoryId || undefined,
          description: form.description || undefined,
          basePrice: form.basePrice, status: form.status,
          ...(durationMinutes ? { durationMinutes } : {}),
          ...bookingPayload,
        });
        const svcId = res.data.id;
        if (coverUrl) {
          await servicesApi.addMedia(svcId, { url: coverUrl, type: "image", isCover: true }).catch(() => {});
        }
        const validAddons = addonDrafts.filter(a => a.name.trim() && a.price);
        for (const a of validAddons) {
          const addon = await addonsApi.create({ name: a.name.trim(), price: a.price, type: a.type });
          await servicesApi.linkAddon(svcId, { addonId: addon.data.id }).catch(() => {});
        }
        const validQs = questionDrafts.filter(q => q.question.trim());
        for (let i = 0; i < validQs.length; i++) {
          const q = validQs[i];
          await questionsApi.create(svcId, {
            question: q.question.trim(), type: q.type,
            isRequired: q.isRequired, isPaid: q.isPaid,
            price: q.isPaid ? q.price || "0" : "0",
            options: q.type === "select" ? q.options.split("\n").filter(Boolean) : [],
            sortOrder: i,
          }).catch(() => {});
        }
        toast.success("تم إنشاء الخدمة");
        navigate(`/dashboard/services/${svcId}`);
      }
    } catch (e: any) {
      setErrors({ _submit: e.message || "حدث خطأ أثناء الحفظ" });
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (isEdit) navigate(`/dashboard/services/${id}`);
    else navigate("/dashboard/catalog");
  };

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
    </div>
  );

  if (errors._load) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-red-500">{errors._load}</p>
      <button onClick={() => navigate(-1)} className="text-sm text-brand-500 hover:underline">رجوع</button>
    </div>
  );

  const selType = SERVICE_TYPES.find(t => t.value === form.serviceType);
  const showForm = isEdit || !!form.serviceType;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-24">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={cancel} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isEdit ? `تعديل: ${serviceName || form.name}` : "خدمة جديدة"}
            </h1>
            <p className="text-sm text-gray-400">
              {isEdit ? "عدّل بيانات الخدمة واحفظ" : "أنشئ خدمة جديدة لمنشأتك"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cancel}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
          <button onClick={save} disabled={saving || (!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? "حفظ التعديلات" : "إنشاء الخدمة"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Type selection (create only) ── */}
        {!isEdit && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">نوع الخدمة <span className="text-red-400">*</span></h2>
            <p className="text-xs text-gray-400 mb-4">اختر نوع الخدمة التي تقدمها — يؤثر على حقول الحجز والتسعير</p>
            {errors.serviceType && (
              <p className="flex items-center gap-1 text-xs text-red-500 mb-3">
                <AlertCircle className="w-3 h-3" />{errors.serviceType}
              </p>
            )}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {SERVICE_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => { setForm(f => ({ ...f, serviceType: t.value })); setErrors(p => ({ ...p, serviceType: "" })); }}
                  className={clsx(
                    "flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border text-center transition-all hover:border-brand-300 hover:bg-brand-50/40",
                    form.serviceType === t.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-100 bg-white"
                  )}
                >
                  <span className="text-xl leading-none">{t.icon}</span>
                  <span className={clsx("text-[11px] font-medium leading-tight",
                    form.serviceType === t.value ? "text-brand-700" : "text-gray-600"
                  )}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Form cards ── */}
        {showForm && (
          <>
            {/* Card: Service info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">معلومات الخدمة</h2>
              <div className="space-y-3">
                {isEdit && selType && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">نوع الخدمة</label>
                    <span className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-lg">
                      <span>{selType.icon}</span>{selType.label}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">اسم الخدمة <span className="text-red-400">*</span></label>
                    <input autoFocus={!isEdit} value={form.name} onChange={upd("name")}
                      placeholder="مثال: حجز جلسة تصوير"
                      className={clsx(iCls, errors.name && "border-red-300")} />
                    <Err msg={errors.name} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">التصنيف</label>
                    <select value={form.categoryId} onChange={upd("categoryId")} className={iCls}>
                      <option value="">بدون تصنيف</option>
                      {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    الوصف <span className="text-gray-400 font-normal">(اختياري)</span>
                  </label>
                  <textarea value={form.description} onChange={upd("description")} rows={3}
                    placeholder="وصف مختصر للخدمة يراه العملاء..."
                    className={clsx(iCls, "resize-none")} />
                </div>
              </div>
            </div>

            {/* Card: Price and time */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">السعر والوقت</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">السعر (ر.س) <span className="text-red-400">*</span></label>
                    <input type="number" min={0} value={form.basePrice} onChange={upd("basePrice")}
                      placeholder="0.00" dir="ltr"
                      className={clsx(iCls, errors.basePrice && "border-red-300")} />
                    <Err msg={errors.basePrice} />
                  </div>
                  {needsTiming && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">المدة <span className="text-red-400">*</span></label>
                      <div className="flex gap-2">
                        <input type="number" min={1} value={form.durationValue} onChange={upd("durationValue")}
                          className={clsx(iCls, "w-24", errors.durationValue && "border-red-300")} dir="ltr" />
                        <select value={form.durationUnit} onChange={upd("durationUnit")} className={clsx(iCls, "flex-1")}>
                          {(["minute","hour","day"] as DurationUnit[]).map(u =>
                            <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                          )}
                        </select>
                      </div>
                      <Err msg={errors.durationValue} />
                    </div>
                  )}
                </div>
                {NEEDS_CAPACITY.has(form.serviceType) && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      الطاقة الاستيعابية <span className="text-gray-400 font-normal">(أشخاص)</span>
                    </label>
                    <input type="number" min={1} value={form.maxCapacity} onChange={upd("maxCapacity")}
                      placeholder="غير محدودة" dir="ltr" className={clsx(iCls, "w-40")} />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none pt-1">
                  <input type="checkbox" checked={form.vatInclusive}
                    onChange={e => setForm(f => ({ ...f, vatInclusive: e.target.checked }))}
                    className="rounded border-gray-300 text-brand-500 w-4 h-4" />
                  السعر شامل ضريبة القيمة المضافة
                </label>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    العربون <span className="text-gray-400 font-normal">(% من السعر)</span>
                  </label>
                  <input type="number" min={0} max={100} value={form.depositPercent} onChange={upd("depositPercent")}
                    placeholder="30" dir="ltr" className={clsx(iCls, "w-40")} />
                </div>
              </div>
            </div>

            {/* Card: Booking rules */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">إعدادات الحجز</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      إلغاء مجاني <span className="text-gray-400 font-normal">(ساعات قبل)</span>
                    </label>
                    <input type="number" min={0} value={form.cancellationFreeHours} onChange={upd("cancellationFreeHours")}
                      placeholder="24" dir="ltr" className={iCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      أقل حجز مسبق <span className="text-gray-400 font-normal">(ساعات)</span>
                    </label>
                    <input type="number" min={0} value={form.minAdvanceHours} onChange={upd("minAdvanceHours")}
                      placeholder="0" dir="ltr" className={iCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      أقصى حجز مسبق <span className="text-gray-400 font-normal">(أيام)</span>
                    </label>
                    <input type="number" min={0} value={form.maxAdvanceDays} onChange={upd("maxAdvanceDays")}
                      placeholder="∞" dir="ltr" className={iCls} />
                  </div>
                  {needsTiming && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          راحة قبل الموعد <span className="text-gray-400 font-normal">(دقيقة)</span>
                        </label>
                        <input type="number" min={0} value={form.bufferBeforeMinutes} onChange={upd("bufferBeforeMinutes")}
                          dir="ltr" className={iCls} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          راحة بعد الموعد <span className="text-gray-400 font-normal">(دقيقة)</span>
                        </label>
                        <input type="number" min={0} value={form.bufferAfterMinutes} onChange={upd("bufferAfterMinutes")}
                          dir="ltr" className={iCls} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Card: Image and status */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">الصورة والحالة</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    صورة الغلاف <span className="text-gray-400 font-normal">(اختياري)</span>
                  </label>
                  {coverPreview ? (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-gray-200">
                      <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-1">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                          <span className="text-white text-xs">{uploadPct}%</span>
                        </div>
                      )}
                      {!uploading && (
                        <button onClick={() => { setCoverPreview(null); setCoverUrl(null); }}
                          className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-md flex items-center justify-center transition-colors">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="flex flex-col items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-300 hover:bg-brand-50/20 transition-all cursor-pointer">
                      <Upload className="w-6 h-6 text-gray-300 mb-1" />
                      <span className="text-xs text-gray-400">رفع صورة</span>
                    </button>
                  )}
                  {uploadErr && <p className="text-xs text-red-500 mt-1">{uploadErr}</p>}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">الحالة</label>
                  <div className="flex gap-0.5 bg-gray-100 rounded-xl p-0.5 w-fit">
                    {[
                      { v: "active", l: "نشطة" },
                      { v: "draft",  l: "مسودة" },
                      ...(isEdit ? [{ v: "paused", l: "معلقة" }] : []),
                    ].map(s => (
                      <button key={s.v} type="button" onClick={() => setForm(f => ({ ...f, status: s.v }))}
                        className={clsx("px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                          form.status === s.v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}>{s.l}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Visibility */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">منافذ الظهور</h2>
              <div className="space-y-2">
                {[
                  { key: "isBookable",      label: "الموقع",             desc: "يظهر في صفحة الحجز الإلكتروني" },
                  { key: "isVisibleInPOS",  label: "نقطة البيع",         desc: "يظهر في الكاشير" },
                  { key: "isVisibleOnline", label: "المتجر الإلكتروني",  desc: "يظهر في المتجر" },
                ].map(({ key, label, desc }) => (
                  <label key={key}
                    className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl cursor-pointer select-none hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <input type="checkbox" checked={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                      className="rounded border-gray-300 text-brand-500 w-4 h-4" />
                  </label>
                ))}
              </div>
            </div>

            {/* Card: Add-ons */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">الإضافات المدفوعة</h2>
                  <p className="text-xs text-gray-400 mt-0.5">خيارات إضافية يختارها العميل عند الحجز</p>
                </div>
                <button onClick={() => setAddonDrafts(d => [...d, { ...INIT_ADDON }])}
                  className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
                  <Plus className="w-3.5 h-3.5" /> إضافة
                </button>
              </div>
              {isEdit && loadedAddons.length > 0 && (
                <div className="space-y-2 mb-3">
                  {loadedAddons.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                      <span className="text-gray-700">{a.name}</span>
                      <span className="text-brand-600 font-semibold tabular-nums">{Number(a.price || 0).toLocaleString()} ر.س</span>
                    </div>
                  ))}
                </div>
              )}
              {addonDrafts.length === 0 && loadedAddons.length === 0 && (
                <p className="text-xs text-gray-400 py-1">لا توجد إضافات بعد — اضغط "إضافة" لإنشاء واحدة</p>
              )}
              {addonDrafts.length > 0 && (
                <div className="space-y-2">
                  {addonDrafts.map((a, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={a.name} placeholder="اسم الإضافة"
                        onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        className={clsx(iCls, "flex-1")} />
                      <input type="number" min={0} value={a.price} placeholder="السعر" dir="ltr"
                        onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                        className={clsx(iCls, "w-24")} />
                      <select value={a.type}
                        onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, type: e.target.value as any } : x))}
                        className={clsx(iCls, "w-28")}>
                        <option value="optional">اختياري</option>
                        <option value="required">إلزامي</option>
                      </select>
                      <button onClick={() => setAddonDrafts(d => d.filter((_, j) => j !== i))}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card: Custom questions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">أسئلة مخصصة</h2>
                  <p className="text-xs text-gray-400 mt-0.5">أسئلة تُطرح على العميل عند إتمام الحجز</p>
                </div>
                <button onClick={() => setQuestionDrafts(d => [...d, { ...INIT_Q }])}
                  className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
                  <Plus className="w-3.5 h-3.5" /> سؤال
                </button>
              </div>
              {isEdit && loadedQuestions.length > 0 && (
                <div className="space-y-2 mb-3">
                  {loadedQuestions.map((q: any) => (
                    <div key={q.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                      <p className="flex-1 text-gray-700">{q.question}</p>
                      {q.is_required && <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full">مطلوب</span>}
                      {q.price > 0 && <span className="text-xs text-green-600">+ {Number(q.price).toLocaleString()} ر.س</span>}
                    </div>
                  ))}
                </div>
              )}
              {questionDrafts.length === 0 && loadedQuestions.length === 0 && (
                <p className="text-xs text-gray-400 py-1">لا توجد أسئلة بعد — اضغط "سؤال" لإضافة واحد</p>
              )}
              {questionDrafts.length > 0 && (
                <div className="space-y-2">
                  {questionDrafts.map((q, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2">
                      <div className="flex gap-2 items-center">
                        <input value={q.question} placeholder="نص السؤال"
                          onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, question: e.target.value } : x))}
                          className={clsx(iCls, "flex-1")} />
                        <select value={q.type}
                          onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, type: e.target.value as any } : x))}
                          className={clsx(iCls, "w-28")}>
                          <option value="text">نص</option>
                          <option value="select">قائمة</option>
                          <option value="checkbox">موافقة</option>
                          <option value="number">رقم</option>
                        </select>
                        <button onClick={() => setQuestionDrafts(d => d.filter((_, j) => j !== i))}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                          <input type="checkbox" checked={q.isRequired}
                            onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, isRequired: e.target.checked } : x))}
                            className="rounded border-gray-300 text-brand-500 w-3.5 h-3.5" />
                          إلزامي
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                          <input type="checkbox" checked={q.isPaid}
                            onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, isPaid: e.target.checked } : x))}
                            className="rounded border-gray-300 text-brand-500 w-3.5 h-3.5" />
                          بمقابل مالي
                        </label>
                        {q.isPaid && (
                          <input type="number" min={0} value={q.price} placeholder="ر.س" dir="ltr"
                            onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                            className={clsx(iCls, "w-24 text-xs")} />
                        )}
                      </div>
                      {q.type === "select" && (
                        <textarea value={q.options} rows={2} placeholder={"خيار 1\nخيار 2\nخيار 3"}
                          onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, options: e.target.value } : x))}
                          className={clsx(iCls, "resize-none text-xs")} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Global error */}
            {errors._submit && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />{errors._submit}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-3 px-6 flex items-center justify-end gap-3 z-10">
        <button onClick={cancel}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          إلغاء
        </button>
        <button onClick={save} disabled={saving || !showForm}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? "حفظ التعديلات" : "إنشاء الخدمة"}
        </button>
      </div>
    </div>
  );
}
