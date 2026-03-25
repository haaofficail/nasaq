/**
 * ServiceFormModal — v5
 * Create: 4 steps (النوع → الأساسيات → الإضافات → الأسئلة)
 * Edit:   4 compact tabs (basics / pricing / addons / questions)
 */

import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Loader2, AlertCircle, Upload, X, Plus, Trash2 } from "lucide-react";
import { Modal, Button } from "../ui";
import { servicesApi, categoriesApi, mediaApi, addonsApi, questionsApi } from "@/lib/api";

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
  { value: "appointment",      label: "بموعد",       icon: "🗓" },
  { value: "execution",        label: "تنفيذ",        icon: "🔧" },
  { value: "field_service",    label: "ميداني",       icon: "📍" },
  { value: "rental",           label: "تأجير",        icon: "🏠" },
  { value: "event_rental",     label: "تأجير فعالية", icon: "⛺" },
  { value: "product",          label: "منتج",         icon: "📦" },
  { value: "product_shipping", label: "شحن",          icon: "🚚" },
  { value: "food_order",       label: "طعام",         icon: "🍽" },
  { value: "package",          label: "باقة",         icon: "🎁" },
  { value: "add_on",           label: "إضافة",        icon: "➕" },
  { value: "project",          label: "مشروع",        icon: "📋" },
];

const NEEDS_TIMING = new Set(["appointment","execution","field_service","rental","event_rental","project"]);

// ─── Types ────────────────────────────────────────────────────────────────────

type Form = {
  serviceType: string;
  name: string;
  categoryId: string;
  basePrice: string;
  durationValue: string;
  durationUnit: DurationUnit;
  status: string;
};

const INIT: Form = {
  serviceType: "", name: "", categoryId: "",
  basePrice: "", durationValue: "60", durationUnit: "minute", status: "active",
};

type AddonDraft = { name: string; price: string; type: "optional" | "required" };
type QuestionDraft = { question: string; type: "text" | "select" | "checkbox" | "number"; isRequired: boolean; isPaid: boolean; price: string; options: string };

const INIT_ADDON: AddonDraft = { name: "", price: "", type: "optional" };
const INIT_Q: QuestionDraft = { question: "", type: "text", isRequired: false, isPaid: false, price: "", options: "" };

// ─── Small helpers ────────────────────────────────────────────────────────────

const iCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all bg-white";

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
      <AlertCircle className="w-3 h-3 shrink-0" />{msg}
    </p>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  serviceId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ServiceFormModal({ open, onClose, onSuccess, serviceId }: ServiceFormModalProps) {
  const isEdit = !!serviceId;

  const [form, setForm]       = useState<Form>(INIT);
  const [step, setStep]       = useState<1 | 2 | 3 | 4>(1);   // create only
  const [editTab, setEditTab] = useState<"basics" | "pricing" | "addons" | "questions">("basics");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const [categories, setCategories] = useState<any[]>([]);

  // add-ons drafts (create mode)
  const [addonDrafts, setAddonDrafts] = useState<AddonDraft[]>([]);
  // questions drafts (create mode)
  const [questionDrafts, setQuestionDrafts] = useState<QuestionDraft[]>([]);

  // loaded addons / questions (edit mode)
  const [loadedAddons,    setLoadedAddons]    = useState<any[]>([]);
  const [loadedQuestions, setLoadedQuestions] = useState<any[]>([]);

  // image
  const fileRef                           = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview]   = useState<string | null>(null);
  const [coverUrl, setCoverUrl]           = useState<string | null>(null);
  const [existingMediaId, setExistingMediaId] = useState<string | null>(null);
  const [uploading, setUploading]             = useState(false);
  const [uploadPct, setUploadPct]             = useState(0);
  const [uploadErr, setUploadErr]             = useState<string | null>(null);

  const needsTiming = NEEDS_TIMING.has(form.serviceType);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setEditTab("basics");
    setErrors({});
    setCoverPreview(null);
    setCoverUrl(null);
    setExistingMediaId(null);
    setUploadErr(null);
    setAddonDrafts([]);
    setQuestionDrafts([]);
    setLoadedAddons([]);
    setLoadedQuestions([]);
    categoriesApi.list(true).then(r => setCategories(r.data || [])).catch(() => {});

    if (isEdit && serviceId) {
      setLoading(true);
      Promise.all([
        servicesApi.get(serviceId),
        questionsApi.list(serviceId).catch(() => ({ data: [] })),
      ]).then(([res, qRes]) => {
        const s = res.data;
        const dur = parseDur(parseInt(s.durationMinutes) || 60);
        const cover = (s.media || []).find((m: any) => m.isCover) || (s.media || [])[0];
        if (cover) { setCoverPreview(cover.url); setCoverUrl(cover.url); setExistingMediaId(cover.id); }
        setForm({
          serviceType: s.serviceType || "appointment",
          name:         s.name || "",
          categoryId:   s.categoryId || "",
          basePrice:    s.basePrice ? String(s.basePrice) : "",
          durationValue: dur.v,
          durationUnit:  dur.u,
          status:        s.status || "active",
        });
        setLoadedAddons(s.addons || []);
        setLoadedQuestions(qRes.data || []);
        setLoading(false);
      }).catch(() => { setLoading(false); setErrors({ _load: "فشل تحميل البيانات" }); });
    } else {
      setForm(INIT);
    }
  }, [open, serviceId, isEdit]);

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
    if (!form.name.trim()) e.name = "اسم الخدمة مطلوب";
    if (!form.basePrice || parseFloat(form.basePrice) <= 0) e.basePrice = "أدخل السعر";
    if (needsTiming && (!form.durationValue || parseFloat(form.durationValue) <= 0))
      e.durationValue = "المدة مطلوبة";
    return e;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); setStep(2); return; }
    setSaving(true);
    setErrors({});
    try {
      const durationMinutes = needsTiming
        ? Math.round((parseFloat(form.durationValue) || 60) * UNIT_MINS[form.durationUnit])
        : undefined;

      if (isEdit) {
        await servicesApi.update(serviceId!, {
          name: form.name, categoryId: form.categoryId || undefined,
          basePrice: form.basePrice, status: form.status,
          ...(durationMinutes ? { durationMinutes } : {}),
        });
        if (coverUrl && coverUrl !== (existingMediaId ? coverPreview : null)) {
          if (existingMediaId) await servicesApi.removeMedia(serviceId!, existingMediaId).catch(() => {});
          await servicesApi.addMedia(serviceId!, { url: coverUrl, type: "image", isCover: true }).catch(() => {});
        }
        // Save new addon drafts
        const validAddonDrafts = addonDrafts.filter(a => a.name.trim() && a.price);
        for (const a of validAddonDrafts) {
          const addon = await addonsApi.create({ name: a.name.trim(), price: a.price, type: a.type });
          await servicesApi.linkAddon(serviceId!, { addonId: addon.data.id }).catch(() => {});
        }
        // Save new question drafts
        const validQDrafts = questionDrafts.filter(q => q.question.trim());
        for (let i = 0; i < validQDrafts.length; i++) {
          const q = validQDrafts[i];
          await questionsApi.create(serviceId!, {
            question: q.question.trim(), type: q.type,
            isRequired: q.isRequired, isPaid: q.isPaid,
            price: q.isPaid ? q.price || "0" : "0",
            options: q.type === "select" ? q.options.split("\n").filter(Boolean) : [],
            sortOrder: loadedQuestions.length + i,
          }).catch(() => {});
        }
      } else {
        const res = await servicesApi.create({
          name: form.name, serviceType: form.serviceType,
          categoryId: form.categoryId || undefined,
          basePrice: form.basePrice, status: form.status,
          isBookable: true, isVisibleInPOS: true, isVisibleOnline: true,
          ...(durationMinutes ? { durationMinutes } : {}),
        });
        const svcId = res.data.id;

        // Upload cover
        if (coverUrl) {
          await servicesApi.addMedia(svcId, { url: coverUrl, type: "image", isCover: true }).catch(() => {});
        }

        // Create add-ons and link them
        const validAddons = addonDrafts.filter(a => a.name.trim() && a.price);
        for (const a of validAddons) {
          const addon = await addonsApi.create({ name: a.name.trim(), price: a.price, type: a.type });
          await servicesApi.linkAddon(svcId, { addonId: addon.data.id }).catch(() => {});
        }

        // Create questions
        const validQs = questionDrafts.filter(q => q.question.trim());
        for (let i = 0; i < validQs.length; i++) {
          const q = validQs[i];
          await questionsApi.create(svcId, {
            question: q.question.trim(),
            type: q.type,
            isRequired: q.isRequired,
            isPaid: q.isPaid,
            price: q.isPaid ? q.price || "0" : "0",
            options: q.type === "select" ? q.options.split("\n").filter(Boolean) : [],
            sortOrder: i,
          }).catch(() => {});
        }
      }
      onSuccess?.();
      onClose();
    } catch (e: any) {
      setErrors({ _submit: e.message || "حدث خطأ" });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const title = isEdit ? "تعديل الخدمة" : "خدمة جديدة";

  if (loading) return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
    </Modal>
  );

  if (errors._load) return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="flex items-center gap-2 text-red-500 py-8 text-sm justify-center">
        <AlertCircle className="w-4 h-4" />{errors._load}
      </div>
    </Modal>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE MODE — 4 steps
  // ──────────────────────────────────────────────────────────────────────────
  const STEP_LABELS = ["النوع", "الأساسيات", "الإضافات", "الأسئلة"];

  if (!isEdit) {
    return (
      <Modal open={open} onClose={onClose} title={title} size="md"
        footer={
          <div className="flex justify-between w-full">
            {step > 1 ? (
              <button onClick={() => setStep(s => (s - 1) as any)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                ← السابق
              </button>
            ) : (
              <Button variant="secondary" onClick={onClose}>إلغاء</Button>
            )}
            <div className="flex gap-2">
              {step < 4 ? (
                <>
                  {step === 1 && (
                    <Button disabled={!form.serviceType} onClick={() => setStep(2)}>التالي</Button>
                  )}
                  {step >= 2 && (
                    <>
                      <button onClick={() => setStep(s => (s + 1) as any)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2">
                        تخطي
                      </button>
                      <Button onClick={() => setStep(s => (s + 1) as any)}>التالي</Button>
                    </>
                  )}
                </>
              ) : (
                <Button onClick={save} loading={saving}>إنشاء الخدمة</Button>
              )}
            </div>
          </div>
        }
      >
        {/* Step progress — 4 bars */}
        <div className="flex items-center gap-1.5 mb-4">
          {STEP_LABELS.map((lbl, i) => (
            <div key={i} className="flex-1 flex flex-col gap-0.5">
              <div className={clsx("h-1 rounded-full transition-all", step > i ? "bg-brand-500" : step === i + 1 ? "bg-brand-300" : "bg-gray-100")} />
              <span className={clsx("text-[9px] text-center truncate", step === i + 1 ? "text-brand-600 font-medium" : "text-gray-300")}>{lbl}</span>
            </div>
          ))}
        </div>

        {/* ── Step 1: Type grid ── */}
        {step === 1 && (
          <div className="grid grid-cols-4 gap-1.5">
            {SERVICE_TYPES.map(t => (
              <button key={t.value} type="button"
                onClick={() => { setForm(f => ({ ...f, serviceType: t.value })); setStep(2); }}
                className={clsx(
                  "flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border text-center transition-all hover:border-brand-300 hover:bg-brand-50/40",
                  form.serviceType === t.value ? "border-brand-500 bg-brand-50" : "border-gray-100 bg-white"
                )}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                <span className={clsx("text-[11px] font-medium leading-tight", form.serviceType === t.value ? "text-brand-700" : "text-gray-700")}>{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Step 2: Essentials ── */}
        {step === 2 && (() => {
          const selType = SERVICE_TYPES.find(x => x.value === form.serviceType);
          return (
            <div className="space-y-3">
              {selType && (
                <div className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  <span>{selType.icon}</span>{selType.label}
                </div>
              )}
              {errors._submit && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors._submit}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">اسم الخدمة <span className="text-red-400">*</span></label>
                <input autoFocus value={form.name} onChange={upd("name")} placeholder="مثال: حجز جلسة تصوير"
                  className={clsx(iCls, errors.name && "border-red-300")} />
                <Err msg={errors.name} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">التصنيف</label>
                  <select value={form.categoryId} onChange={upd("categoryId")} className={iCls}>
                    <option value="">بدون تصنيف</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">السعر (ر.س) <span className="text-red-400">*</span></label>
                  <input type="number" min={0} value={form.basePrice} onChange={upd("basePrice")} placeholder="0.00" dir="ltr"
                    className={clsx(iCls, errors.basePrice && "border-red-300")} />
                  <Err msg={errors.basePrice} />
                </div>
              </div>
              {needsTiming && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">المدة <span className="text-red-400">*</span></label>
                  <div className="flex gap-2">
                    <input type="number" min={1} value={form.durationValue} onChange={upd("durationValue")}
                      className={clsx(iCls, "w-24", errors.durationValue && "border-red-300")} dir="ltr" />
                    <select value={form.durationUnit} onChange={upd("durationUnit")} className={clsx(iCls, "flex-1")}>
                      {(["minute","hour","day"] as DurationUnit[]).map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                    </select>
                  </div>
                  <Err msg={errors.durationValue} />
                </div>
              )}
              {/* Image + Status row */}
              <div className="flex items-center gap-3 pt-1">
                <div onClick={() => !uploading && fileRef.current?.click()}
                  className={clsx("relative w-14 h-14 rounded-lg border-2 border-dashed flex items-center justify-center shrink-0 cursor-pointer overflow-hidden transition-all",
                    coverPreview ? "border-transparent" : "border-gray-200 hover:border-brand-300 hover:bg-brand-50/20"
                  )}>
                  {coverPreview ? (
                    <>
                      <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                      {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
                      {!uploading && (
                        <button onClick={e => { e.stopPropagation(); setCoverPreview(null); setCoverUrl(null); }}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 hover:bg-red-500 rounded-sm flex items-center justify-center">
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      )}
                    </>
                  ) : <Upload className="w-4 h-4 text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{coverPreview ? (uploading ? `رفع ${uploadPct}%` : "صورة مرفوعة") : "صورة (اختياري)"}</p>
                  {uploadErr && <p className="text-[11px] text-red-500">{uploadErr}</p>}
                </div>
                <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 shrink-0">
                  {[{ v: "active", l: "نشطة" }, { v: "draft", l: "مسودة" }].map(s => (
                    <button key={s.v} type="button" onClick={() => setForm(f => ({ ...f, status: s.v }))}
                      className={clsx("px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                        form.status === s.v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                      )}>{s.l}</button>
                  ))}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])} />
            </div>
          );
        })()}

        {/* ── Step 3: Paid Add-ons ── */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">أضف إضافات اختيارية أو إلزامية يمكن للعميل اختيارها عند الحجز.</p>
            {addonDrafts.map((a, i) => (
              <div key={i} className="flex gap-2 items-start p-2.5 bg-gray-50 rounded-lg">
                <div className="flex-1 space-y-2">
                  <input value={a.name} placeholder="اسم الإضافة"
                    onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    className={iCls} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" min={0} value={a.price} placeholder="السعر (ر.س)" dir="ltr"
                      onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                      className={iCls} />
                    <select value={a.type}
                      onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, type: e.target.value as any } : x))}
                      className={iCls}>
                      <option value="optional">اختياري</option>
                      <option value="required">إلزامي</option>
                    </select>
                  </div>
                </div>
                <button onClick={() => setAddonDrafts(d => d.filter((_, j) => j !== i))}
                  className="mt-1 p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button onClick={() => setAddonDrafts(d => [...d, { ...INIT_ADDON }])}
              className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 transition-colors font-medium">
              <Plus className="w-3.5 h-3.5" /> إضافة خيار جديد
            </button>
            {addonDrafts.length === 0 && (
              <p className="text-[11px] text-gray-400 text-center py-4 border-2 border-dashed border-gray-100 rounded-lg">
                لا توجد إضافات — يمكنك تخطي هذه الخطوة
              </p>
            )}
          </div>
        )}

        {/* ── Step 4: Custom Questions ── */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">أسئلة تُطرح على العميل عند إتمام الحجز.</p>
            {questionDrafts.map((q, i) => (
              <div key={i} className="p-2.5 bg-gray-50 rounded-lg space-y-2">
                <div className="flex gap-2 items-start">
                  <input value={q.question} placeholder="نص السؤال"
                    onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, question: e.target.value } : x))}
                    className={clsx(iCls, "flex-1")} />
                  <button onClick={() => setQuestionDrafts(d => d.filter((_, j) => j !== i))}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={q.type}
                    onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, type: e.target.value as any } : x))}
                    className={iCls}>
                    <option value="text">نص حر</option>
                    <option value="select">اختيار من قائمة</option>
                    <option value="checkbox">موافقة</option>
                    <option value="number">رقم</option>
                  </select>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                      <input type="checkbox" checked={q.isRequired}
                        onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, isRequired: e.target.checked } : x))}
                        className="rounded border-gray-300 text-brand-500" />
                      إلزامي
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                      <input type="checkbox" checked={q.isPaid}
                        onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, isPaid: e.target.checked } : x))}
                        className="rounded border-gray-300 text-brand-500" />
                      بمقابل
                    </label>
                  </div>
                </div>
                {q.isPaid && (
                  <input type="number" min={0} value={q.price} placeholder="السعر (ر.س)" dir="ltr"
                    onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                    className={iCls} />
                )}
                {q.type === "select" && (
                  <textarea value={q.options} rows={2}
                    placeholder={"خيار 1\nخيار 2\nخيار 3"}
                    onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, options: e.target.value } : x))}
                    className={clsx(iCls, "resize-none text-[11px]")} />
                )}
              </div>
            ))}
            <button onClick={() => setQuestionDrafts(d => [...d, { ...INIT_Q }])}
              className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 transition-colors font-medium">
              <Plus className="w-3.5 h-3.5" /> إضافة سؤال
            </button>
            {questionDrafts.length === 0 && (
              <p className="text-[11px] text-gray-400 text-center py-4 border-2 border-dashed border-gray-100 rounded-lg">
                لا توجد أسئلة — يمكنك تخطي هذه الخطوة
              </p>
            )}
            {errors._submit && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors._submit}
              </div>
            )}
          </div>
        )}
      </Modal>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EDIT MODE — 4 compact tabs
  // ──────────────────────────────────────────────────────────────────────────
  const EDIT_TABS = [
    { id: "basics",    label: "الأساسيات" },
    { id: "pricing",   label: "السعر" },
    { id: "addons",    label: "الإضافات" },
    { id: "questions", label: "الأسئلة" },
  ] as const;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`تعديل: ${form.name || "الخدمة"}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} loading={saving}>حفظ</Button>
        </>
      }
    >
      {/* Tab bar */}
      <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg mb-4">
        {EDIT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setEditTab(t.id)}
            className={clsx(
              "flex-1 py-1.5 rounded-md text-xs font-medium transition-all",
              editTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {errors._submit && (
        <div className="mb-3 flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors._submit}
        </div>
      )}

      {/* ── Basics ── */}
      {editTab === "basics" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">اسم الخدمة <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={upd("name")} className={clsx(iCls, errors.name && "border-red-300")} />
            <Err msg={errors.name} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">التصنيف</label>
            <select value={form.categoryId} onChange={upd("categoryId")} className={iCls}>
              <option value="">بدون تصنيف</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {/* Cover image inline */}
          <div className="flex items-center gap-3">
            <div onClick={() => !uploading && fileRef.current?.click()}
              className={clsx("relative w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center shrink-0 cursor-pointer overflow-hidden transition-all",
                coverPreview ? "border-transparent" : "border-gray-200 hover:border-brand-300 hover:bg-brand-50/20"
              )}>
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                  {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
                  {!uploading && (
                    <button onClick={e => { e.stopPropagation(); setCoverPreview(null); setCoverUrl(null); }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 hover:bg-red-500 rounded-sm flex items-center justify-center">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  )}
                </>
              ) : <Upload className="w-4 h-4 text-gray-300" />}
            </div>
            <p className="text-xs text-gray-400">{coverPreview ? (uploading ? `رفع ${uploadPct}%` : "صورة الغلاف") : "صورة الغلاف (اختياري)"}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">الحالة</span>
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {[{ v: "active", l: "نشطة" }, { v: "draft", l: "مسودة" }, { v: "paused", l: "معلقة" }].map(s => (
                <button key={s.v} type="button" onClick={() => setForm(f => ({ ...f, status: s.v }))}
                  className={clsx("px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                    form.status === s.v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  )}>{s.l}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Pricing + Timing ── */}
      {editTab === "pricing" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">السعر (ر.س) <span className="text-red-400">*</span></label>
            <input type="number" min={0} value={form.basePrice} onChange={upd("basePrice")}
              placeholder="0.00" dir="ltr" className={clsx(iCls, errors.basePrice && "border-red-300")} />
            <Err msg={errors.basePrice} />
          </div>
          {needsTiming && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">المدة <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                <input type="number" min={1} value={form.durationValue} onChange={upd("durationValue")}
                  className={clsx(iCls, "w-24")} dir="ltr" />
                <select value={form.durationUnit} onChange={upd("durationUnit")} className={clsx(iCls, "flex-1")}>
                  {(["minute","hour","day"] as DurationUnit[]).map(u => (
                    <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                  ))}
                </select>
              </div>
              <Err msg={errors.durationValue} />
            </div>
          )}
          <p className="text-[11px] text-gray-400">الإعدادات المتقدمة في صفحة تفاصيل الخدمة.</p>
        </div>
      )}

      {/* ── Addons (edit) ── */}
      {editTab === "addons" && (
        <div className="space-y-3">
          {/* Existing linked addons */}
          {loadedAddons.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {loadedAddons.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-800">{a.name}</span>
                  <span className="text-xs text-gray-500 font-mono">{Number(a.price || a.priceOverride || 0).toLocaleString()} ر.س</span>
                </div>
              ))}
            </div>
          )}
          {/* New addon drafts */}
          {addonDrafts.map((a, i) => (
            <div key={i} className="flex gap-2 items-start p-2.5 bg-gray-50 rounded-lg">
              <div className="flex-1 space-y-2">
                <input value={a.name} placeholder="اسم الإضافة"
                  onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  className={iCls} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min={0} value={a.price} placeholder="السعر (ر.س)" dir="ltr"
                    onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                    className={iCls} />
                  <select value={a.type}
                    onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, type: e.target.value as any } : x))}
                    className={iCls}>
                    <option value="optional">اختياري</option>
                    <option value="required">إلزامي</option>
                  </select>
                </div>
              </div>
              <button onClick={() => setAddonDrafts(d => d.filter((_, j) => j !== i))}
                className="mt-1 p-1 text-gray-400 hover:text-red-500 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button onClick={() => setAddonDrafts(d => [...d, { ...INIT_ADDON }])}
            className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 font-medium">
            <Plus className="w-3.5 h-3.5" /> إضافة جديدة
          </button>
        </div>
      )}

      {/* ── Questions (edit) ── */}
      {editTab === "questions" && (
        <div className="space-y-3">
          {/* Existing questions */}
          {loadedQuestions.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {loadedQuestions.map((q: any) => (
                <div key={q.id} className="flex items-start justify-between px-3 py-2 bg-gray-50 rounded-lg gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 truncate">{q.question}</p>
                    <p className="text-[11px] text-gray-400">{q.type}{q.isPaid ? ` · ${Number(q.price || 0)} ر.س` : ""}{q.isRequired ? " · إلزامي" : ""}</p>
                  </div>
                  <button onClick={async () => {
                    await questionsApi.delete(q.id).catch(() => {});
                    setLoadedQuestions(l => l.filter((x: any) => x.id !== q.id));
                  }} className="p-1 text-gray-300 hover:text-red-500 shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* New question drafts */}
          {questionDrafts.map((q, i) => (
            <div key={i} className="p-2.5 bg-gray-50 rounded-lg space-y-2">
              <div className="flex gap-2 items-start">
                <input value={q.question} placeholder="نص السؤال"
                  onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, question: e.target.value } : x))}
                  className={clsx(iCls, "flex-1")} />
                <button onClick={() => setQuestionDrafts(d => d.filter((_, j) => j !== i))}
                  className="p-1 text-gray-400 hover:text-red-500 shrink-0 mt-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={q.type}
                  onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, type: e.target.value as any } : x))}
                  className={iCls}>
                  <option value="text">نص حر</option>
                  <option value="select">اختيار من قائمة</option>
                  <option value="checkbox">موافقة</option>
                  <option value="number">رقم</option>
                </select>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                    <input type="checkbox" checked={q.isRequired}
                      onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, isRequired: e.target.checked } : x))}
                      className="rounded border-gray-300 text-brand-500" />
                    إلزامي
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                    <input type="checkbox" checked={q.isPaid}
                      onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, isPaid: e.target.checked } : x))}
                      className="rounded border-gray-300 text-brand-500" />
                    بمقابل
                  </label>
                </div>
              </div>
              {q.isPaid && (
                <input type="number" min={0} value={q.price} placeholder="السعر (ر.س)" dir="ltr"
                  onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                  className={iCls} />
              )}
              {q.type === "select" && (
                <textarea value={q.options} rows={2} placeholder={"خيار 1\nخيار 2"}
                  onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, options: e.target.value } : x))}
                  className={clsx(iCls, "resize-none text-[11px]")} />
              )}
            </div>
          ))}
          <button onClick={() => setQuestionDrafts(d => [...d, { ...INIT_Q }])}
            className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 font-medium">
            <Plus className="w-3.5 h-3.5" /> إضافة سؤال
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])} />
    </Modal>
  );
}
