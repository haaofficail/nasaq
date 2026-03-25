/**
 * ServiceFormModal — v4 (compact)
 * Create: 2 steps only (type → essentials)
 * Edit:   3 compact tabs (basics / pricing+timing / image)
 * Advanced settings live in the service detail page.
 */

import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Loader2, AlertCircle, Upload, X } from "lucide-react";
import { Modal, Button } from "../ui";
import { servicesApi, categoriesApi, mediaApi } from "@/lib/api";

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
  const [step, setStep]       = useState<1 | 2>(1);       // create only
  const [editTab, setEditTab] = useState<"basics" | "pricing" | "media">("basics");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const [categories, setCategories] = useState<any[]>([]);

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
    categoriesApi.list(true).then(r => setCategories(r.data || [])).catch(() => {});

    if (isEdit && serviceId) {
      setLoading(true);
      servicesApi.get(serviceId).then(res => {
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
    if (Object.keys(errs).length) { setErrors(errs); return; }
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
      } else {
        const res = await servicesApi.create({
          name: form.name, serviceType: form.serviceType,
          categoryId: form.categoryId || undefined,
          basePrice: form.basePrice, status: form.status,
          isBookable: true, isVisibleInPOS: true, isVisibleOnline: true,
          ...(durationMinutes ? { durationMinutes } : {}),
        });
        if (coverUrl) {
          await servicesApi.addMedia(res.data.id, { url: coverUrl, type: "image", isCover: true }).catch(() => {});
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
  // CREATE MODE
  // ──────────────────────────────────────────────────────────────────────────
  if (!isEdit) {
    return (
      <Modal open={open} onClose={onClose} title={title} size="md"
        footer={
          step === 1 ? (
            <div className="flex justify-between w-full">
              <Button variant="secondary" onClick={onClose}>إلغاء</Button>
              <Button disabled={!form.serviceType} onClick={() => setStep(2)}>التالي</Button>
            </div>
          ) : (
            <div className="flex justify-between w-full">
              <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                ← تغيير النوع
              </button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>إلغاء</Button>
                <Button onClick={save} loading={saving}>إنشاء</Button>
              </div>
            </div>
          )
        }
      >
        {/* Step indicator — minimal */}
        <div className="flex items-center gap-1.5 mb-4">
          <div className={clsx("h-1 flex-1 rounded-full transition-all", step >= 1 ? "bg-brand-500" : "bg-gray-100")} />
          <div className={clsx("h-1 flex-1 rounded-full transition-all", step >= 2 ? "bg-brand-500" : "bg-gray-100")} />
          <span className="text-[11px] text-gray-400 mr-1">{step === 1 ? "اختر النوع" : "الأساسيات"}</span>
        </div>

        {/* ── Step 1: Type grid — 4 cols, compact chips ── */}
        {step === 1 && (
          <div className="grid grid-cols-4 gap-1.5">
            {SERVICE_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setForm(f => ({ ...f, serviceType: t.value })); setStep(2); }}
                className={clsx(
                  "flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border text-center transition-all hover:border-brand-300 hover:bg-brand-50/40",
                  form.serviceType === t.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-100 bg-white"
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
              {/* Selected type pill */}
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

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">اسم الخدمة <span className="text-red-400">*</span></label>
                <input autoFocus value={form.name} onChange={upd("name")}
                  placeholder="مثال: حجز جلسة تصوير"
                  className={clsx(iCls, errors.name && "border-red-300 focus:border-red-400")} />
                <Err msg={errors.name} />
              </div>

              {/* Category + Price */}
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
                  <input type="number" min={0} value={form.basePrice} onChange={upd("basePrice")}
                    placeholder="0.00" dir="ltr"
                    className={clsx(iCls, errors.basePrice && "border-red-300 focus:border-red-400")} />
                  <Err msg={errors.basePrice} />
                </div>
              </div>

              {/* Duration */}
              {needsTiming && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">المدة <span className="text-red-400">*</span></label>
                  <div className="flex gap-2">
                    <input type="number" min={1} value={form.durationValue} onChange={upd("durationValue")}
                      className={clsx(iCls, "w-24", errors.durationValue && "border-red-300")} dir="ltr" />
                    <select value={form.durationUnit} onChange={upd("durationUnit")} className={clsx(iCls, "flex-1")}>
                      {(["minute","hour","day"] as DurationUnit[]).map(u => (
                        <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                      ))}
                    </select>
                  </div>
                  <Err msg={errors.durationValue} />
                </div>
              )}

              {/* Image + Status in one row */}
              <div className="flex items-center gap-3 pt-1">
                {/* Thumbnail */}
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  className={clsx(
                    "relative w-14 h-14 rounded-lg border-2 border-dashed flex items-center justify-center shrink-0 cursor-pointer overflow-hidden transition-all",
                    coverPreview ? "border-transparent" : "border-gray-200 hover:border-brand-300 hover:bg-brand-50/20"
                  )}
                >
                  {coverPreview ? (
                    <>
                      <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                      {!uploading && (
                        <button
                          onClick={e => { e.stopPropagation(); setCoverPreview(null); setCoverUrl(null); }}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 hover:bg-red-500 rounded-sm flex items-center justify-center"
                        >
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      )}
                    </>
                  ) : (
                    <Upload className="w-4 h-4 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">
                    {coverPreview ? (uploading ? `جاري الرفع ${uploadPct}%` : "صورة مرفوعة") : "صورة الخدمة (اختياري)"}
                  </p>
                  {uploadErr && <p className="text-[11px] text-red-500">{uploadErr}</p>}
                </div>
                {/* Status toggle */}
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
      </Modal>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EDIT MODE — 3 compact tabs
  // ──────────────────────────────────────────────────────────────────────────
  const EDIT_TABS = [
    { id: "basics",  label: "الأساسيات" },
    { id: "pricing", label: "السعر والوقت" },
    { id: "media",   label: "الصورة" },
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

      {/* ── Media ── */}
      {editTab === "media" && (
        <div className="space-y-2">
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className={clsx(
              "relative h-36 rounded-xl overflow-hidden border-2 cursor-pointer transition-all",
              coverPreview ? "border-gray-200" : "border-dashed border-gray-200 hover:border-brand-300 hover:bg-brand-50/20 flex flex-col items-center justify-center gap-1.5"
            )}
          >
            {coverPreview ? (
              <>
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <p className="text-white text-xs">{uploadPct}%</p>
                  </div>
                )}
                {!uploading && (
                  <button
                    onClick={e => { e.stopPropagation(); setCoverPreview(null); setCoverUrl(null); }}
                    className="absolute top-2 left-2 w-6 h-6 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-300" />
                <p className="text-xs text-gray-400">اضغط لرفع صورة الغلاف</p>
                <p className="text-[11px] text-gray-300">JPG, PNG, WebP — حتى 10MB</p>
              </>
            )}
          </div>
          {coverPreview && !uploading && (
            <button onClick={() => fileRef.current?.click()} className="text-xs text-brand-500 hover:underline">تغيير الصورة</button>
          )}
          {uploadErr && <Err msg={uploadErr} />}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && pickFile(e.target.files[0])} />
        </div>
      )}
    </Modal>
  );
}
