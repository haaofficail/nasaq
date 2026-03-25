import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, AlertCircle, Upload, X, Plus, Trash2, Save } from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, categoriesApi, mediaApi, addonsApi, questionsApi, membersApi, inventoryApi } from "@/lib/api";
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
  serviceType: string; name: string; categoryId: string;
  shortDescription: string; description: string;
  basePrice: string; durationValue: string; durationUnit: DurationUnit; status: string;
  vatInclusive: boolean; maxCapacity: string;
  depositPercent: string; minAdvanceHours: string; maxAdvanceDays: string;
  bufferBeforeMinutes: string; bufferAfterMinutes: string; cancellationFreeHours: string;
  isBookable: boolean; isVisibleInPOS: boolean; isVisibleOnline: boolean;
};

const INIT: Form = {
  serviceType: "", name: "", categoryId: "", shortDescription: "", description: "",
  basePrice: "", durationValue: "60", durationUnit: "minute", status: "active",
  vatInclusive: true, maxCapacity: "",
  depositPercent: "30", minAdvanceHours: "", maxAdvanceDays: "",
  bufferBeforeMinutes: "0", bufferAfterMinutes: "0", cancellationFreeHours: "24",
  isBookable: true, isVisibleInPOS: true, isVisibleOnline: true,
};

type AddonDraft = {
  name: string; nameEn: string; description: string;
  price: string; type: "optional" | "required";
  imageUrl: string;
};
type QuestionDraft = {
  question: string; type: "text" | "textarea" | "select" | "multi" | "checkbox" | "number" | "date";
  isRequired: boolean; isPaid: boolean; price: string; options: string;
};
type ComponentDraft = {
  sourceType: "manual" | "inventory";
  inventoryItemId: string;
  name: string; quantity: string; unit: string; unitCost: string;
};

const INIT_ADDON: AddonDraft = { name: "", nameEn: "", description: "", price: "", type: "optional", imageUrl: "" };
const INIT_Q: QuestionDraft  = { question: "", type: "text", isRequired: false, isPaid: false, price: "", options: "" };
const INIT_COMP: ComponentDraft = { sourceType: "manual", inventoryItemId: "", name: "", quantity: "1", unit: "قطعة", unitCost: "0" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const iCls = "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50/60 transition-all bg-white placeholder:text-gray-300";

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
  const [searchParams] = useSearchParams();
  const isEdit = !!id && id !== "new";
  const typeFromUrl = searchParams.get("type") || "";

  const [form, setForm]       = useState<Form>(INIT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [serviceName, setServiceName] = useState("");
  const [categories, setCategories]   = useState<any[]>([]);

  const [addonDrafts,    setAddonDrafts]    = useState<AddonDraft[]>([]);
  const [questionDrafts, setQuestionDrafts] = useState<QuestionDraft[]>([]);
  const [componentDrafts,setComponentDrafts]= useState<ComponentDraft[]>([]);
  const [loadedAddons,   setLoadedAddons]   = useState<any[]>([]);
  const [loadedQuestions,setLoadedQuestions]= useState<any[]>([]);
  const [loadedComponents,setLoadedComponents] = useState<any[]>([]);
  const [staffMembers,   setStaffMembers]   = useState<any[]>([]);  // all members
  const [pendingStaffIds,setPendingStaffIds]= useState<string[]>([]);  // to be added on save (create)
  const [loadedStaff,    setLoadedStaff]    = useState<any[]>([]);    // already assigned (edit)
  const [products,       setProducts]       = useState<any[]>([]);    // inventory products

  const fileRef                             = useRef<HTMLInputElement>(null);
  const addonFileRef                        = useRef<HTMLInputElement>(null);
  const [addonUploadIdx, setAddonUploadIdx] = useState<number | null>(null);
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
    membersApi.list().then(r => setStaffMembers(r.data || [])).catch(() => {});
    inventoryApi.products().then(r => setProducts(r.data || [])).catch(() => {});

    // Pre-select type passed from the type picker
    if (!isEdit && typeFromUrl) {
      setForm(f => ({ ...f, serviceType: typeFromUrl }));
    }

    if (isEdit) {
      setLoading(true);
      Promise.all([
        servicesApi.get(id!),
        questionsApi.list(id!).catch(() => ({ data: [] })),
        servicesApi.getComponents(id!).catch(() => ({ data: [] })),
        servicesApi.listStaff(id!).catch(() => ({ data: [] })),
      ]).then(([res, qRes, compRes, staffRes]) => {
        const s = res.data;
        const dur = parseDur(parseInt(s.durationMinutes) || 60);
        const cover = (s.media || []).find((m: any) => m.isCover) || (s.media || [])[0];
        if (cover) { setCoverPreview(cover.url); setCoverUrl(cover.url); setExistingMediaId(cover.id); }
        setServiceName(s.name || "");
        setForm({
          serviceType:           s.serviceType || "appointment",
          name:                  s.name || "",
          categoryId:            s.categoryId || "",
          shortDescription:      s.shortDescription || "",
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
        setLoadedComponents((compRes as any).data || []);
        setLoadedStaff((staffRes as any).data || []);
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

  // ── Addon image upload ────────────────────────────────────────────────────
  const pickAddonImage = async (file: File, idx: number) => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "addons");
      const res = await mediaApi.upload(fd, () => {});
      const url = res.data?.fileUrl || res.data?.url || res.data?.publicUrl;
      if (url) setAddonDrafts(d => d.map((x, j) => j === idx ? { ...x, imageUrl: url } : x));
    } catch {}
    setAddonUploadIdx(null);
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

      const baseInfo = {
        name: form.name,
        categoryId: form.categoryId || undefined,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        basePrice: form.basePrice,
        status: form.status,
        ...(durationMinutes ? { durationMinutes } : {}),
        ...bookingPayload,
      };

      const saveAddons = async (svcId: string, base: number) => {
        const valid = addonDrafts.filter(a => a.name.trim() && a.price);
        for (const a of valid) {
          const addon = await addonsApi.create({
            name: a.name.trim(),
            nameEn: a.nameEn || undefined,
            description: a.description || undefined,
            image: a.imageUrl || undefined,
            price: a.price,
            type: a.type,
          });
          await servicesApi.linkAddon(svcId, { addonId: addon.data.id }).catch(() => {});
        }
      };

      const saveQuestions = async (svcId: string, base: number) => {
        const valid = questionDrafts.filter(q => q.question.trim());
        for (let i = 0; i < valid.length; i++) {
          const q = valid[i];
          await questionsApi.create(svcId, {
            question: q.question.trim(), type: q.type,
            isRequired: q.isRequired, isPaid: q.isPaid,
            price: q.isPaid ? q.price || "0" : "0",
            options: ["select","multi"].includes(q.type) ? q.options.split("\n").filter(Boolean) : [],
            sortOrder: base + i,
          }).catch(() => {});
        }
      };

      const saveComponents = async (svcId: string) => {
        const valid = componentDrafts.filter(c => c.name.trim() || c.inventoryItemId);
        for (let i = 0; i < valid.length; i++) {
          const c = valid[i];
          await servicesApi.addComponent(svcId, {
            sourceType: c.sourceType,
            inventoryItemId: c.inventoryItemId || undefined,
            name: c.name.trim() || undefined,
            quantity: parseFloat(c.quantity) || 1,
            unit: c.unit || "قطعة",
            unitCost: parseFloat(c.unitCost) || 0,
            sortOrder: i,
          }).catch(() => {});
        }
      };

      const saveStaff = async (svcId: string) => {
        for (const userId of pendingStaffIds) {
          await servicesApi.addStaff(svcId, { userId }).catch(() => {});
        }
      };

      if (isEdit) {
        await servicesApi.update(id!, baseInfo);
        if (coverUrl && existingMediaId) {
          await servicesApi.removeMedia(id!, existingMediaId).catch(() => {});
          await servicesApi.addMedia(id!, { url: coverUrl, type: "image", isCover: true }).catch(() => {});
        } else if (coverUrl && !existingMediaId) {
          await servicesApi.addMedia(id!, { url: coverUrl, type: "image", isCover: true }).catch(() => {});
        }
        await saveAddons(id!, loadedAddons.length);
        await saveQuestions(id!, loadedQuestions.length);
        await saveComponents(id!);
        await saveStaff(id!);
        toast.success("تم حفظ التعديلات");
        navigate(`/dashboard/services/${id}`);
      } else {
        const res = await servicesApi.create({ ...baseInfo, serviceType: form.serviceType });
        const svcId = res.data.id;
        if (coverUrl) {
          await servicesApi.addMedia(svcId, { url: coverUrl, type: "image", isCover: true }).catch(() => {});
        }
        await saveAddons(svcId, 0);
        await saveQuestions(svcId, 0);
        await saveComponents(svcId);
        await saveStaff(svcId);
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
  // If type came from URL (already picked), skip the type picker card
  const typeAlreadyPicked = !isEdit && !!typeFromUrl;
  const showForm = isEdit || !!form.serviceType;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-24">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={cancel} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {isEdit ? (serviceName || form.name || "تعديل الخدمة") : "خدمة جديدة"}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit ? "عدّل البيانات واحفظ" : "أنشئ خدمة جديدة لمنشأتك"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cancel}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
          <button onClick={save} disabled={saving || !showForm}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isEdit ? "حفظ" : "إنشاء"}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">

        {/* ── Type selection (create only, hidden if type came from picker) ── */}
        {!isEdit && !typeAlreadyPicked && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-50">معلومات الخدمة</h2>
              <div className="space-y-3">
                {selType && (isEdit || typeAlreadyPicked) && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">نوع الخدمة</label>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-lg">
                        <span>{selType.icon}</span>{selType.label}
                      </span>
                      {!isEdit && (
                        <button onClick={() => navigate(-1)}
                          className="text-xs text-gray-400 hover:text-brand-500 underline transition-colors">
                          تغيير
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">اسم الخدمة <span className="text-red-400">*</span></label>
                    <input autoFocus={!isEdit} value={form.name} onChange={upd("name")}
                      placeholder="مثال: حجز جلسة تصوير"
                      className={clsx(iCls, errors.name && "border-red-300")} />
                    <Err msg={errors.name} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">التصنيف</label>
                    <select value={form.categoryId} onChange={upd("categoryId")} className={iCls}>
                      <option value="">بدون تصنيف</option>
                      {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    الوصف المختصر <span className="text-gray-400 font-normal">(يظهر في الكروت)</span>
                  </label>
                  <input value={form.shortDescription} onChange={upd("shortDescription")} maxLength={150}
                    placeholder="جملة أو جملتين تصف الخدمة بإيجاز..."
                    className={iCls} />
                  <p className="text-[10px] text-gray-400 mt-0.5 text-left" dir="ltr">{form.shortDescription.length}/150</p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    الوصف التفصيلي <span className="text-gray-400 font-normal">(اختياري)</span>
                  </label>
                  <textarea value={form.description} onChange={upd("description")} rows={4}
                    placeholder="تفاصيل الخدمة، ما تشمل، الشروط والأحكام..."
                    className={clsx(iCls, "resize-none")} />
                </div>
              </div>
            </div>

            {/* Card: Price and time */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-50">السعر والوقت</h2>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4">
                  <div className="w-40">
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">السعر (ر.س) <span className="text-red-400">*</span></label>
                    <input type="number" min={0} value={form.basePrice} onChange={upd("basePrice")}
                      placeholder="0.00" dir="ltr"
                      className={clsx(iCls, errors.basePrice && "border-red-300")} />
                    <Err msg={errors.basePrice} />
                  </div>
                  {needsTiming && (
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">المدة <span className="text-red-400">*</span></label>
                      <div className="flex gap-2 items-center">
                        <input type="number" min={1} value={form.durationValue} onChange={upd("durationValue")}
                          className={clsx(iCls, "w-20", errors.durationValue && "border-red-300")} dir="ltr" />
                        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                          {(["minute","hour","day"] as DurationUnit[]).map(u => (
                            <button key={u} type="button"
                              onClick={() => setForm(f => ({ ...f, durationUnit: u }))}
                              className={clsx(
                                "px-3 py-1 rounded-md text-xs font-medium transition-all",
                                form.durationUnit === u
                                  ? "bg-white text-gray-900 shadow-sm"
                                  : "text-gray-500 hover:text-gray-700"
                              )}>
                              {UNIT_LABELS[u]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Err msg={errors.durationValue} />
                    </div>
                  )}
                  {NEEDS_CAPACITY.has(form.serviceType) && (
                    <div className="w-36">
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                        الطاقة <span className="text-gray-400 font-normal">(أشخاص)</span>
                      </label>
                      <input type="number" min={1} value={form.maxCapacity} onChange={upd("maxCapacity")}
                        placeholder="∞" dir="ltr" className={iCls} />
                    </div>
                  )}
                  <div className="w-32">
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                      العربون <span className="text-gray-400 font-normal">(%)</span>
                    </label>
                    <input type="number" min={0} max={100} value={form.depositPercent} onChange={upd("depositPercent")}
                      placeholder="30" dir="ltr" className={iCls} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none w-fit">
                  <div className={clsx(
                    "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-colors shrink-0",
                    form.vatInclusive ? "bg-brand-500 border-brand-500" : "border-gray-300 bg-white"
                  )}>
                    {form.vatInclusive && <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-none stroke-white stroke-2"><polyline points="1,4 4,7 9,1" /></svg>}
                  </div>
                  <input type="checkbox" checked={form.vatInclusive}
                    onChange={e => setForm(f => ({ ...f, vatInclusive: e.target.checked }))}
                    className="sr-only" />
                  السعر شامل ضريبة القيمة المضافة
                </label>
              </div>
            </div>

            {/* Card: Booking rules */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-50">إعدادات الحجز</h2>
              <div className="flex flex-wrap gap-4">
                <div className="w-32">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    إلغاء مجاني<br /><span className="text-gray-400 font-normal">(ساعات قبل)</span>
                  </label>
                  <input type="number" min={0} value={form.cancellationFreeHours} onChange={upd("cancellationFreeHours")}
                    placeholder="24" dir="ltr" className={iCls} />
                </div>
                <div className="w-32">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    أقل حجز مسبق<br /><span className="text-gray-400 font-normal">(ساعات)</span>
                  </label>
                  <input type="number" min={0} value={form.minAdvanceHours} onChange={upd("minAdvanceHours")}
                    placeholder="0" dir="ltr" className={iCls} />
                </div>
                <div className="w-32">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    أقصى حجز مسبق<br /><span className="text-gray-400 font-normal">(أيام)</span>
                  </label>
                  <input type="number" min={0} value={form.maxAdvanceDays} onChange={upd("maxAdvanceDays")}
                    placeholder="∞" dir="ltr" className={iCls} />
                </div>
                {needsTiming && (
                  <>
                    <div className="w-32">
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                        راحة قبل<br /><span className="text-gray-400 font-normal">(دقيقة)</span>
                      </label>
                      <input type="number" min={0} value={form.bufferBeforeMinutes} onChange={upd("bufferBeforeMinutes")}
                        dir="ltr" className={iCls} />
                    </div>
                    <div className="w-32">
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                        راحة بعد<br /><span className="text-gray-400 font-normal">(دقيقة)</span>
                      </label>
                      <input type="number" min={0} value={form.bufferAfterMinutes} onChange={upd("bufferAfterMinutes")}
                        dir="ltr" className={iCls} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Card: Image and status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-50">الصورة والحالة</h2>
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-50">منافذ الظهور</h2>
              <div className="space-y-2">
                {[
                  { key: "isBookable",      label: "الحجز الإلكتروني",   desc: "يظهر في صفحة الحجز" },
                  { key: "isVisibleInPOS",  label: "نقطة البيع",         desc: "يظهر في الكاشير" },
                  { key: "isVisibleOnline", label: "المتجر الإلكتروني",  desc: "يظهر في المتجر" },
                ].map(({ key, label, desc }) => (
                  <label key={key}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer select-none hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-[11px] text-gray-400">{desc}</p>
                    </div>
                    <div className={clsx(
                      "relative w-9 h-5 rounded-full transition-colors",
                      (form as any)[key] ? "bg-brand-500" : "bg-gray-200"
                    )}>
                      <div className={clsx(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                        (form as any)[key] ? "right-0.5" : "left-0.5"
                      )} />
                      <input type="checkbox" checked={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                        className="sr-only" />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Card: Service provider (staff) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">مقدمو الخدمة</h2>
                  <p className="text-xs text-gray-400 mt-0.5">الموظفون المؤهلون لتقديم هذه الخدمة</p>
                </div>
              </div>
              {/* Assigned staff (edit) */}
              {isEdit && loadedStaff.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {loadedStaff.map((s: any) => (
                    <div key={s.userId || s.id} className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-xl text-sm">
                      <span>{s.name || s.user?.name || "موظف"}</span>
                      <button onClick={async () => {
                        await servicesApi.removeStaff(id!, s.userId || s.id).catch(() => {});
                        setLoadedStaff(p => p.filter((x: any) => (x.userId || x.id) !== (s.userId || s.id)));
                      }} className="text-brand-400 hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Pending staff (create) */}
              {pendingStaffIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {pendingStaffIds.map(uid => {
                    const m = staffMembers.find((x: any) => x.id === uid);
                    return (
                      <div key={uid} className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-xl text-sm">
                        <span>{m?.name || uid}</span>
                        <button onClick={() => setPendingStaffIds(p => p.filter(x => x !== uid))}
                          className="text-brand-400 hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Add staff dropdown */}
              {staffMembers.filter((m: any) => {
                const assigned = isEdit
                  ? loadedStaff.map((s: any) => s.userId || s.id)
                  : pendingStaffIds;
                return !assigned.includes(m.id);
              }).length > 0 && (
                <select
                  value=""
                  onChange={e => {
                    const uid = e.target.value;
                    if (!uid) return;
                    if (isEdit) {
                      servicesApi.addStaff(id!, { userId: uid }).then(() => {
                        const m = staffMembers.find((x: any) => x.id === uid);
                        setLoadedStaff(p => [...p, { userId: uid, name: m?.name }]);
                      }).catch(() => {});
                    } else {
                      setPendingStaffIds(p => [...p, uid]);
                    }
                    e.target.value = "";
                  }}
                  className={clsx(iCls, "w-full max-w-xs")}>
                  <option value="">اختر موظفاً لإضافته...</option>
                  {staffMembers
                    .filter((m: any) => {
                      const assigned = isEdit
                        ? loadedStaff.map((s: any) => s.userId || s.id)
                        : pendingStaffIds;
                      return !assigned.includes(m.id);
                    })
                    .map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
              )}
              {staffMembers.length === 0 && loadedStaff.length === 0 && pendingStaffIds.length === 0 && (
                <p className="text-xs text-gray-400 py-1">لا يوجد موظفون — أضفهم أولاً من صفحة الفريق</p>
              )}
            </div>

            {/* Card: Inventory components */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">مكونات الخدمة</h2>
                  <p className="text-xs text-gray-400 mt-0.5">المواد والمستهلكات المطلوبة لتنفيذ الخدمة</p>
                </div>
                <button onClick={() => setComponentDrafts(d => [...d, { ...INIT_COMP }])}
                  className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
                  <Plus className="w-3.5 h-3.5" /> إضافة
                </button>
              </div>

              {/* Existing components (edit) */}
              {isEdit && loadedComponents.length > 0 && (
                <div className="space-y-2 mb-4">
                  {loadedComponents.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{c.customerLabel || c.name}</p>
                        <p className="text-xs text-gray-400">{c.quantity} {c.unit}</p>
                      </div>
                      <span className="text-gray-500 tabular-nums">{Number(c.unitCost || 0).toLocaleString()} ر.س</span>
                    </div>
                  ))}
                </div>
              )}

              {componentDrafts.length === 0 && loadedComponents.length === 0 && (
                <p className="text-xs text-gray-400 py-1">لا توجد مكونات — اضغط "إضافة" لربط مواد من المخزون</p>
              )}

              {componentDrafts.length > 0 && (
                <div className="space-y-3">
                  {componentDrafts.map((c, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
                      {/* Source type + delete */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                          {(["manual", "inventory"] as const).map(t => (
                            <button key={t} type="button"
                              onClick={() => setComponentDrafts(d => d.map((x, j) => j === i ? { ...x, sourceType: t, inventoryItemId: "", name: "" } : x))}
                              className={clsx("px-3 py-1 rounded-md text-xs font-medium transition-all",
                                c.sourceType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                              )}>
                              {t === "manual" ? "يدوي" : "من المخزون"}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setComponentDrafts(d => d.filter((_, j) => j !== i))}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Name / inventory select */}
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
                          {c.sourceType === "inventory" ? "المنتج من المخزون" : "اسم المكون"} <span className="text-red-400">*</span>
                        </label>
                        {c.sourceType === "inventory" ? (
                          <select value={c.inventoryItemId}
                            onChange={e => {
                              const p = products.find((x: any) => x.id === e.target.value);
                              setComponentDrafts(d => d.map((x, j) => j === i
                                ? { ...x, inventoryItemId: e.target.value, name: p?.name || "", unit: p?.unit || "قطعة", unitCost: p?.unitCost ? String(p.unitCost) : x.unitCost }
                                : x));
                            }}
                            className={iCls}>
                            <option value="">اختر منتجاً...</option>
                            {products.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input value={c.name} placeholder="مثال: ورد أحمر"
                            onChange={e => setComponentDrafts(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                            className={iCls} />
                        )}
                      </div>
                      {/* Quantity + unit + cost */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">الكمية</label>
                          <input type="number" min={0} step="0.1" value={c.quantity} dir="ltr"
                            onChange={e => setComponentDrafts(d => d.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
                            className={iCls} />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">الوحدة</label>
                          <input value={c.unit} placeholder="قطعة"
                            onChange={e => setComponentDrafts(d => d.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                            className={iCls} />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">التكلفة (ر.س)</label>
                          <input type="number" min={0} value={c.unitCost} dir="ltr"
                            onChange={e => setComponentDrafts(d => d.map((x, j) => j === i ? { ...x, unitCost: e.target.value } : x))}
                            className={iCls} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card: Add-ons */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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

              {/* Existing addons (edit mode) */}
              {isEdit && loadedAddons.length > 0 && (
                <div className="space-y-2 mb-4">
                  {loadedAddons.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                      {a.image && <img src={a.image} className="w-9 h-9 rounded-lg object-cover shrink-0" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{a.name}</p>
                        {a.description && <p className="text-xs text-gray-400 truncate">{a.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-brand-600 tabular-nums">{Number(a.price || 0).toLocaleString()} ر.س</p>
                        <p className="text-[10px] text-gray-400">{a.type === "required" ? "إلزامي" : "اختياري"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {addonDrafts.length === 0 && loadedAddons.length === 0 && (
                <p className="text-xs text-gray-400 py-1">لا توجد إضافات — اضغط "إضافة" لإنشاء واحدة</p>
              )}

              {/* New addon drafts */}
              {addonDrafts.length > 0 && (
                <div className="space-y-3">
                  {addonDrafts.map((a, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
                      {/* Header row: image + name + delete */}
                      <div className="flex gap-3 items-start">
                        {/* Image */}
                        <div className="shrink-0">
                          {a.imageUrl ? (
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200">
                              <img src={a.imageUrl} className="w-full h-full object-cover" alt="" />
                              <button onClick={() => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, imageUrl: "" } : x))}
                                className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded flex items-center justify-center">
                                <X className="w-2.5 h-2.5 text-white" />
                              </button>
                            </div>
                          ) : (
                            <button type="button"
                              onClick={() => { setAddonUploadIdx(i); addonFileRef.current?.click(); }}
                              className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-300 flex flex-col items-center justify-center gap-0.5 transition-colors">
                              <Upload className="w-4 h-4 text-gray-300" />
                              <span className="text-[9px] text-gray-400">صورة</span>
                            </button>
                          )}
                        </div>
                        {/* Name + delete */}
                        <div className="flex-1 min-w-0">
                          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">اسم الإضافة <span className="text-red-400">*</span></label>
                          <input value={a.name} placeholder="مثال: دفاية غاز"
                            onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                            className={iCls} />
                        </div>
                        <button onClick={() => setAddonDrafts(d => d.filter((_, j) => j !== i))}
                          className="mt-5 p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Description */}
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">الوصف <span className="text-gray-400 font-normal">(اختياري)</span></label>
                        <input value={a.description} placeholder="وصف مختصر للإضافة..."
                          onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                          className={iCls} />
                      </div>
                      {/* Price + type row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">السعر (ر.س) <span className="text-red-400">*</span></label>
                          <input type="number" min={0} value={a.price} placeholder="0.00" dir="ltr"
                            onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                            className={iCls} />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">النوع</label>
                          <select value={a.type}
                            onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, type: e.target.value as any } : x))}
                            className={iCls}>
                            <option value="optional">اختياري</option>
                            <option value="required">إلزامي</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Hidden file input for addon images */}
              <input ref={addonFileRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f && addonUploadIdx !== null) pickAddonImage(f, addonUploadIdx);
                  e.target.value = "";
                }} />
            </div>

            {/* Card: Custom questions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
                          className={clsx(iCls, "w-32")}>
                          <option value="text">نص قصير</option>
                          <option value="textarea">نص طويل</option>
                          <option value="select">قائمة اختيار</option>
                          <option value="multi">اختيار متعدد</option>
                          <option value="checkbox">موافقة</option>
                          <option value="number">رقم</option>
                          <option value="date">تاريخ</option>
                        </select>
                        <button onClick={() => setQuestionDrafts(d => d.filter((_, j) => j !== i))}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button type="button"
                          onClick={() => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, isRequired: !x.isRequired } : x))}
                          className={clsx("px-3 py-1 rounded-lg text-xs font-medium transition-all border",
                            q.isRequired
                              ? "bg-red-50 text-red-600 border-red-200"
                              : "bg-gray-50 text-gray-400 border-gray-200 hover:text-gray-600"
                          )}>
                          إلزامي
                        </button>
                        <button type="button"
                          onClick={() => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, isPaid: !x.isPaid } : x))}
                          className={clsx("px-3 py-1 rounded-lg text-xs font-medium transition-all border",
                            q.isPaid
                              ? "bg-green-50 text-green-600 border-green-200"
                              : "bg-gray-50 text-gray-400 border-gray-200 hover:text-gray-600"
                          )}>
                          بمقابل مالي
                        </button>
                        {q.isPaid && (
                          <input type="number" min={0} value={q.price} placeholder="0.00 ر.س" dir="ltr"
                            onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                            className={clsx(iCls, "w-28")} />
                        )}
                      </div>
                      {(q.type === "select" || q.type === "multi") && (
                        <div>
                          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">الخيارات (كل خيار في سطر)</label>
                          <textarea value={q.options} rows={3} placeholder={"خيار 1\nخيار 2\nخيار 3"}
                            onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, options: e.target.value } : x))}
                            className={clsx(iCls, "resize-none text-xs")} />
                        </div>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-100 py-3 px-6 flex items-center justify-between z-10">
        <p className="text-xs text-gray-400">{isEdit ? "أي تعديل لن يُحفظ حتى تضغط حفظ" : "ستُنشأ الخدمة فور الضغط"}</p>
        <div className="flex items-center gap-2">
          <button onClick={cancel}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
          <button onClick={save} disabled={saving || !showForm}
            className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isEdit ? "حفظ التعديلات" : "إنشاء الخدمة"}
          </button>
        </div>
      </div>
    </div>
  );
}
