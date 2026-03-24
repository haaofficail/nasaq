import { useState, useEffect } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { restaurantApi } from "@/lib/api";
import {
  Settings2, Users, Clock, CalendarCog, MapPin, Plus, X, Check,
  ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Pencil, Trash2,
  AlertCircle, BookOpen, Armchair,
} from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

// ─── shared primitives ────────────────────────────────────────────────────────

const inputCls =
  "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 transition-colors";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({
  value,
  onChange,
  label,
  hint,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={clsx(
          "w-12 h-6 rounded-full relative shrink-0 transition-colors",
          value ? "bg-brand-500" : "bg-gray-200"
        )}
      >
        <span
          className={clsx(
            "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all",
            value ? "right-1" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
        className="w-16 border border-gray-200 rounded-xl text-center text-sm font-semibold py-1.5 outline-none focus:border-brand-400"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── types ────────────────────────────────────────────────────────────────────

interface Config {
  minGuests: number;
  maxGuests: number;
  slotDurationMin: number;
  advanceBookingDays: number;
  minNoticeHours: number;
  maxConcurrentPerSlot: number;
  turnoverTimeMin: number;
  waitlistEnabled: boolean;
  autoConfirm: boolean;
  specialRequestsEnabled: boolean;
  depositRequired: boolean;
  depositAmount: number;
  cancellationHours: number;
  notes: string;
}

const DEFAULT_CONFIG: Config = {
  minGuests: 1,
  maxGuests: 12,
  slotDurationMin: 60,
  advanceBookingDays: 30,
  minNoticeHours: 2,
  maxConcurrentPerSlot: 5,
  turnoverTimeMin: 15,
  waitlistEnabled: false,
  autoConfirm: false,
  specialRequestsEnabled: true,
  depositRequired: false,
  depositAmount: 0,
  cancellationHours: 24,
  notes: "",
};

const SLOT_OPTIONS = [30, 45, 60, 90, 120];
const SECTION_COLORS = [
  "bg-brand-50 text-brand-600 border-brand-200",
  "bg-emerald-50 text-emerald-600 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-purple-50 text-purple-600 border-purple-200",
  "bg-blue-50 text-blue-600 border-blue-200",
  "bg-rose-50 text-rose-600 border-rose-200",
];

// ─── component ────────────────────────────────────────────────────────────────

export function RestaurantBookingSettingsPage() {
  const [tab, setTab] = useState<"general" | "sections" | "timing">("general");
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Section form
  const [sectionModal, setSectionModal] = useState<null | { id?: string; name: string; nameEn: string; capacity: number; notes: string }>(null);

  const { data, loading, refetch } = useApi(
    () => restaurantApi.bookingSettings(),
    []
  );

  useEffect(() => {
    if (!configLoaded && data?.data?.config) {
      const c = data.data.config;
      setConfig({
        minGuests: c.min_guests,
        maxGuests: c.max_guests,
        slotDurationMin: c.slot_duration_min,
        advanceBookingDays: c.advance_booking_days,
        minNoticeHours: c.min_notice_hours,
        maxConcurrentPerSlot: c.max_concurrent_per_slot,
        turnoverTimeMin: c.turnover_time_min,
        waitlistEnabled: c.waitlist_enabled,
        autoConfirm: c.auto_confirm,
        specialRequestsEnabled: c.special_requests_enabled,
        depositRequired: c.deposit_required,
        depositAmount: parseFloat(c.deposit_amount || "0"),
        cancellationHours: c.cancellation_hours,
        notes: c.notes || "",
      });
      setConfigLoaded(true);
    }
  }, [data, configLoaded]);

  const sections: any[] = data?.data?.sections || [];

  const saveMut   = useMutation((d: any) => restaurantApi.updateBookingSettings(d));
  const createSec = useMutation((d: any) => restaurantApi.createSection(d));
  const updateSec = useMutation(({ id, ...d }: any) => restaurantApi.updateSection(id, d));
  const toggleSec = useMutation((id: string) => restaurantApi.toggleSection(id));
  const deleteSec = useMutation((id: string) => restaurantApi.deleteSection(id));

  const handleSaveConfig = async () => {
    await saveMut.mutate(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveSection = async () => {
    if (!sectionModal?.name.trim()) return;
    if (sectionModal.id) {
      await updateSec.mutate({ id: sectionModal.id, name: sectionModal.name, nameEn: sectionModal.nameEn, capacity: sectionModal.capacity, notes: sectionModal.notes });
    } else {
      await createSec.mutate({ name: sectionModal.name, nameEn: sectionModal.nameEn, capacity: sectionModal.capacity, notes: sectionModal.notes });
    }
    setSectionModal(null);
    refetch();
  };

  const handleToggle = async (id: string) => {
    await toggleSec.mutate(id);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteSec.mutate(id);
    refetch();
  };

  const set = <K extends keyof Config>(key: K, value: Config[K]) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const tabs = [
    { id: "general",  label: "الإعدادات العامة",    icon: Settings2 },
    { id: "sections", label: "الأقسام والمناطق",     icon: MapPin },
    { id: "timing",   label: "التوقيت والحجز",       icon: Clock },
  ] as const;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCog className="w-5 h-5 text-brand-500" /> إعدادات الحجز
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">تحكم كامل في طاقة الاستيعاب والأقسام وتفاصيل الحجز</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              tab === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonRows />
      ) : (
        <>
          {/* ── GENERAL TAB ─────────────────────────────────────── */}
          {tab === "general" && (
            <div className="space-y-4">
              {/* Capacity card */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-500" />
                  <p className="font-semibold text-gray-800 text-sm">طاقة الاستيعاب</p>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="أقل عدد ضيوف للحجز" hint="الحد الأدنى لعدد الأشخاص في حجز واحد">
                    <Stepper value={config.minGuests} onChange={v => set("minGuests", v)} min={1} max={config.maxGuests} />
                  </Field>
                  <Field label="أقصى عدد ضيوف للحجز" hint="الحد الأقصى لعدد الأشخاص في حجز واحد">
                    <Stepper value={config.maxGuests} onChange={v => set("maxGuests", v)} min={config.minGuests} max={100} />
                  </Field>
                  <Field label="أقصى حجوزات في نفس الوقت" hint="كم حجزاً يمكن تأكيده لنفس الفترة الزمنية">
                    <Stepper value={config.maxConcurrentPerSlot} onChange={v => set("maxConcurrentPerSlot", v)} min={1} max={50} />
                  </Field>
                  <Field label="وقت التحضير بين الجلسات (دقيقة)" hint="وقت التنظيف والإعداد بين حجزين">
                    <Stepper value={config.turnoverTimeMin} onChange={v => set("turnoverTimeMin", v)} min={0} max={60} step={5} />
                  </Field>
                </div>
              </div>

              {/* Booking behaviour */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                  <Armchair className="w-4 h-4 text-brand-500" />
                  <p className="font-semibold text-gray-800 text-sm">سلوك الحجز</p>
                </div>
                <div className="px-5 py-1">
                  <Toggle
                    value={config.autoConfirm}
                    onChange={v => set("autoConfirm", v)}
                    label="تأكيد تلقائي"
                    hint="تأكيد الحجوزات الواردة فور استلامها دون مراجعة يدوية"
                  />
                  <Toggle
                    value={config.waitlistEnabled}
                    onChange={v => set("waitlistEnabled", v)}
                    label="قائمة الانتظار"
                    hint="إتاحة الانضمام لقائمة الانتظار عند اكتمال الحجوزات"
                  />
                  <Toggle
                    value={config.specialRequestsEnabled}
                    onChange={v => set("specialRequestsEnabled", v)}
                    label="الطلبات الخاصة"
                    hint="السماح للضيف بإضافة ملاحظة أو طلب خاص عند الحجز"
                  />
                  <Toggle
                    value={config.depositRequired}
                    onChange={v => set("depositRequired", v)}
                    label="مبلغ تأمين مسبق"
                    hint="طلب دفع مقدم لتأكيد الحجز"
                  />
                  {config.depositRequired && (
                    <div className="pb-4 pt-1">
                      <Field label="قيمة التأمين (ر.س)">
                        <input
                          type="number"
                          value={config.depositAmount}
                          min={0}
                          onChange={e => set("depositAmount", parseFloat(e.target.value) || 0)}
                          className={clsx(inputCls, "max-w-[160px]")}
                          placeholder="0"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-brand-500" />
                  <p className="font-semibold text-gray-800 text-sm">ملاحظات تظهر للضيف</p>
                </div>
                <div className="p-5">
                  <textarea
                    value={config.notes}
                    onChange={e => set("notes", e.target.value)}
                    rows={3}
                    placeholder="مثال: الحجز يتضمن خدمة متكاملة، يُرجى الإفادة بأي حساسية غذائية..."
                    className={clsx(inputCls, "resize-none")}
                  />
                </div>
              </div>

              <SaveBar onSave={handleSaveConfig} loading={saveMut.loading} saved={saved} />
            </div>
          )}

          {/* ── SECTIONS TAB ─────────────────────────────────────── */}
          {tab === "sections" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-500" />
                    <p className="font-semibold text-gray-800 text-sm">أقسام المطعم</p>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{sections.length}</span>
                  </div>
                  <button
                    onClick={() => setSectionModal({ name: "", nameEn: "", capacity: 20, notes: "" })}
                    className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-brand-600"
                  >
                    <Plus className="w-3.5 h-3.5" /> قسم جديد
                  </button>
                </div>

                {sections.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">لا توجد أقسام — أضف قسماً لتوزيع الطاولات</p>
                    <p className="text-xs text-gray-300 mt-1">مثال: الصالة الرئيسية، التراس، VIP، الحديقة</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {sections.map((sec, idx) => (
                      <div key={sec.id} className="flex items-center gap-3 px-5 py-4">
                        <div
                          className={clsx(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border shrink-0",
                            SECTION_COLORS[idx % SECTION_COLORS.length]
                          )}
                        >
                          {sec.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">{sec.name}</p>
                            {sec.name_en && <p className="text-xs text-gray-400">{sec.name_en}</p>}
                            {!sec.is_active && (
                              <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">معطل</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">سعة {sec.capacity} ضيف</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleToggle(sec.id)}
                            className={clsx(
                              "p-2 rounded-xl transition-colors",
                              sec.is_active ? "text-brand-500 hover:bg-brand-50" : "text-gray-400 hover:bg-gray-50"
                            )}
                            title={sec.is_active ? "تعطيل القسم" : "تفعيل القسم"}
                          >
                            {sec.is_active
                              ? <ToggleRight className="w-4 h-4" />
                              : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setSectionModal({ id: sec.id, name: sec.name, nameEn: sec.name_en || "", capacity: sec.capacity, notes: sec.notes || "" })}
                            className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(sec.id)}
                            className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Capacity summary */}
              {sections.length > 0 && (
                <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-brand-500 shrink-0" />
                  <p className="text-sm text-brand-700">
                    إجمالي الطاقة الاستيعابية:{" "}
                    <strong>{sections.filter(s => s.is_active).reduce((sum: number, s: any) => sum + (s.capacity || 0), 0)}</strong> ضيف
                    {" "}في <strong>{sections.filter(s => s.is_active).length}</strong> قسم نشط
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── TIMING TAB ─────────────────────────────────────── */}
          {tab === "timing" && (
            <div className="space-y-4">
              {/* Slot duration */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-500" />
                  <p className="font-semibold text-gray-800 text-sm">مدة كل جلسة</p>
                </div>
                <div className="p-5">
                  <p className="text-xs text-gray-400 mb-3">المدة الافتراضية للحجز — يمكن تعديلها لكل قسم لاحقاً</p>
                  <div className="flex flex-wrap gap-2">
                    {SLOT_OPTIONS.map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => set("slotDurationMin", mins)}
                        className={clsx(
                          "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                          config.slotDurationMin === mins
                            ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                            : "border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600"
                        )}
                      >
                        {mins >= 60 ? `${mins / 60} ساعة` : `${mins} دقيقة`}
                      </button>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">أو اكتب:</span>
                      <input
                        type="number"
                        value={config.slotDurationMin}
                        onChange={e => set("slotDurationMin", parseInt(e.target.value) || 30)}
                        min={15}
                        max={480}
                        className="w-20 border border-gray-200 rounded-xl text-center text-sm py-2 outline-none focus:border-brand-400"
                      />
                      <span className="text-xs text-gray-400">دقيقة</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking window */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                  <CalendarCog className="w-4 h-4 text-brand-500" />
                  <p className="font-semibold text-gray-800 text-sm">نافذة الحجز</p>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="أقصى تقدم للحجز (أيام)" hint="كم يوماً مسبقاً يمكن للضيف الحجز">
                    <Stepper
                      value={config.advanceBookingDays}
                      onChange={v => set("advanceBookingDays", v)}
                      min={1}
                      max={365}
                      step={7}
                    />
                  </Field>
                  <Field label="أقل إشعار مسبق (ساعات)" hint="لا يُقبل حجز أقل من هذه المدة قبل الموعد">
                    <Stepper
                      value={config.minNoticeHours}
                      onChange={v => set("minNoticeHours", v)}
                      min={0}
                      max={72}
                    />
                  </Field>
                  <Field label="إلغاء مجاني حتى قبل (ساعات)" hint="الإلغاء قبل هذه المدة بدون رسوم">
                    <Stepper
                      value={config.cancellationHours}
                      onChange={v => set("cancellationHours", v)}
                      min={0}
                      max={168}
                      step={12}
                    />
                  </Field>
                </div>
              </div>

              {/* Summary pill */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">ملخص الإعدادات الحالية</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "مدة الجلسة", value: `${config.slotDurationMin} دقيقة` },
                    { label: "أقصى تقدم", value: `${config.advanceBookingDays} يوم` },
                    { label: "أقل إشعار", value: `${config.minNoticeHours} ساعة` },
                    { label: "الإلغاء المجاني", value: `${config.cancellationHours} ساعة` },
                    { label: "وقت التحضير", value: `${config.turnoverTimeMin} دقيقة` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white border border-gray-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-xs font-semibold text-gray-700">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <SaveBar onSave={handleSaveConfig} loading={saveMut.loading} saved={saved} />
            </div>
          )}
        </>
      )}

      {/* Section modal */}
      {sectionModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                {sectionModal.id ? "تعديل القسم" : "قسم جديد"}
              </h3>
              <button onClick={() => setSectionModal(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="اسم القسم (عربي) *">
                <input
                  value={sectionModal.name}
                  onChange={e => setSectionModal(p => p && ({ ...p, name: e.target.value }))}
                  className={inputCls}
                  placeholder="مثال: الصالة الرئيسية، VIP، التراس"
                  autoFocus
                />
              </Field>
              <Field label="الاسم بالإنجليزي (اختياري)">
                <input
                  value={sectionModal.nameEn}
                  onChange={e => setSectionModal(p => p && ({ ...p, nameEn: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. Main Hall, VIP, Terrace"
                />
              </Field>
              <Field label="الطاقة الاستيعابية (عدد الضيوف)" hint="إجمالي الضيوف الذين يمكن استيعابهم في هذا القسم">
                <Stepper
                  value={sectionModal.capacity}
                  onChange={v => setSectionModal(p => p && ({ ...p, capacity: v }))}
                  min={1}
                  max={500}
                  step={5}
                />
              </Field>
              <Field label="ملاحظات (اختياري)">
                <input
                  value={sectionModal.notes}
                  onChange={e => setSectionModal(p => p && ({ ...p, notes: e.target.value }))}
                  className={inputCls}
                  placeholder="مثال: مخصص للعائلات، منطقة خارجية مكيفة"
                />
              </Field>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSection}
                  disabled={createSec.loading || updateSec.loading || !sectionModal.name.trim()}
                  className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60"
                >
                  حفظ
                </button>
                <button
                  onClick={() => setSectionModal(null)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveBar({ onSave, loading, saved }: { onSave: () => void; loading: boolean; saved: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3">
      {saved && (
        <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
          <Check className="w-4 h-4" /> تم الحفظ
        </div>
      )}
      <button
        onClick={onSave}
        disabled={loading}
        className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60 shadow-sm"
      >
        {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </button>
    </div>
  );
}
