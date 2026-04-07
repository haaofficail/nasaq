import { useState, useRef } from "react";
import { Calendar, Plus, Edit2, Trash2, AlertTriangle, Info, RefreshCw, Globe, Flag, Leaf } from "lucide-react";
import { clsx } from "clsx";
import { flowerIntelligenceApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Modal, Button, Input, Select, Skeleton, confirmDialog } from "@/components/ui";
import { toast } from "@/hooks/useToast";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const COLOR_OPTIONS = [
  { value: "rose",   label: "وردي غامق" },
  { value: "pink",   label: "وردي فاتح" },
  { value: "amber",  label: "عنبري"     },
  { value: "green",  label: "أخضر"      },
  { value: "violet", label: "بنفسجي"    },
  { value: "blue",   label: "أزرق"      },
];

const MONTH_OPTIONS = ARABIC_MONTHS.map((label, i) => ({
  value: String(i + 1),
  label,
}));

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const CATEGORY_TABS = [
  { id: "all",    label: "الكل",       icon: Calendar },
  { id: "سعودية", label: "سعودية",     icon: Flag },
  { id: "عالمية", label: "عالمية",     icon: Globe },
  { id: "موسمي",  label: "مواسم",      icon: Leaf },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function colorConfig(color: string) {
  const map: Record<string, { bg: string; border: string; circle: string; badge: string; text: string }> = {
    rose:   { bg: "bg-rose-50",   border: "border-rose-200",   circle: "bg-rose-500",   badge: "bg-rose-100 text-rose-700",   text: "text-rose-700"   },
    pink:   { bg: "bg-pink-50",   border: "border-pink-200",   circle: "bg-pink-400",   badge: "bg-pink-100 text-pink-700",   text: "text-pink-700"   },
    amber:  { bg: "bg-amber-50",  border: "border-amber-200",  circle: "bg-amber-500",  badge: "bg-amber-100 text-amber-700", text: "text-amber-700"  },
    green:  { bg: "bg-emerald-50",border: "border-emerald-200",circle: "bg-emerald-500",badge: "bg-emerald-100 text-emerald-700",text: "text-emerald-700"},
    violet: { bg: "bg-violet-50", border: "border-violet-200", circle: "bg-violet-500", badge: "bg-violet-100 text-violet-700",text: "text-violet-700" },
    blue:   { bg: "bg-blue-50",   border: "border-blue-200",   circle: "bg-blue-500",   badge: "bg-blue-100 text-blue-700",   text: "text-blue-700"   },
  };
  return map[color] ?? map.blue;
}

function formatArabicDate(month: number, day: number) {
  return `${day} ${ARABIC_MONTHS[month - 1]}`;
}

function multiplierLabel(m: number) {
  if (m >= 4) return { label: `×${m} المبيعات`, cls: "bg-red-100 text-red-700" };
  if (m >= 2.5) return { label: `×${m} المبيعات`, cls: "bg-orange-100 text-orange-700" };
  return { label: `×${m} المبيعات`, cls: "bg-amber-100 text-amber-700" };
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type OccasionForm = {
  nameAr: string;
  dateMonth: string;
  dateDay: string;
  leadDays: string;
  salesMultiplier: string;
  stockIncreasePct: string;
  color: string;
  notes: string;
};

const EMPTY_FORM: OccasionForm = {
  nameAr: "", dateMonth: "", dateDay: "",
  leadDays: "14", salesMultiplier: "2.0", stockIncreasePct: "50",
  color: "rose", notes: "",
};

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────

function UpcomingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex gap-4">
          <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export function FlowerOccasionsPage() {
  const urgentRef = useRef<HTMLDivElement>(null);

  const upcomingApi = useApi(() => flowerIntelligenceApi.occasionsUpcoming(60), []);
  const allApi      = useApi(() => flowerIntelligenceApi.occasions(), []);

  const upcomingList: any[] = upcomingApi.data?.data       ?? [];
  const systemList:   any[] = allApi.data?.systemOccasions ?? [];
  const customList:   any[] = allApi.data?.data            ?? [];

  const urgentOccasion = upcomingList.find(
    (o: any) => typeof o.days_until === "number" && o.days_until <= 7,
  );

  const [catFilter, setCatFilter] = useState("all");
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<any | null>(null);
  const [form, setForm]               = useState<OccasionForm>(EMPTY_FORM);
  const [errors, setErrors]           = useState<Partial<OccasionForm>>({});

  const createMutation = useMutation((data: any)  => flowerIntelligenceApi.createOccasion(data));
  const updateMutation = useMutation((args: any)  => flowerIntelligenceApi.updateOccasion(args.id, args.data));
  const deleteMutation = useMutation((id: string) => flowerIntelligenceApi.deleteOccasion(id));

  function openCreate() { setEditTarget(null); setForm(EMPTY_FORM); setErrors({}); setModalOpen(true); }

  function openEdit(occ: any) {
    setEditTarget(occ);
    setForm({
      nameAr: occ.name_ar ?? "", dateMonth: String(occ.date_month ?? ""), dateDay: String(occ.date_day ?? ""),
      leadDays: String(occ.lead_days ?? "14"), salesMultiplier: String(occ.sales_multiplier ?? "2.0"),
      stockIncreasePct: String(occ.stock_increase_pct ?? "50"), color: occ.color ?? "rose", notes: occ.notes ?? "",
    });
    setErrors({}); setModalOpen(true);
  }

  function handleField(k: keyof OccasionForm, v: string) {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<OccasionForm> = {};
    if (!form.nameAr.trim()) next.nameAr = "مطلوب";
    if (!form.dateMonth)     next.dateMonth = "مطلوب";
    if (!form.dateDay)       next.dateDay = "مطلوب";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const payload = {
      name_ar: form.nameAr.trim(), date_month: Number(form.dateMonth), date_day: Number(form.dateDay),
      lead_days: Number(form.leadDays) || 14, sales_multiplier: Number(form.salesMultiplier) || 2.0,
      stock_increase_pct: Number(form.stockIncreasePct) || 50, color: form.color,
      notes: form.notes.trim() || undefined,
    };
    const ok = editTarget
      ? await updateMutation.mutate({ id: editTarget.id, data: payload })
      : await createMutation.mutate(payload);
    if (ok) {
      toast.success(editTarget ? "تم تحديث المناسبة" : "تمت إضافة المناسبة");
      setModalOpen(false);
      allApi.refetch(); upcomingApi.refetch();
    }
  }

  async function handleDelete(occ: any) {
    const confirmed = await confirmDialog({
      title: `حذف "${occ.name_ar}"؟`,
      message: "لن تتمكن من التراجع عن هذا الإجراء.",
      danger: true, confirmLabel: "احذف",
    });
    if (!confirmed) return;
    const res = await deleteMutation.mutate(occ.id);
    if (res !== null) { toast.success("تم حذف المناسبة"); allApi.refetch(); upcomingApi.refetch(); }
  }

  const isSaving = createMutation.loading || updateMutation.loading;

  const filteredSystem = catFilter === "all"
    ? systemList
    : systemList.filter((o: any) => o.category === catFilter);

  return (
    <div dir="rtl" className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-500" />
            تقويم المناسبات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">استعدّ قبل المناسبة لا بعدها — {systemList.length + customList.length} مناسبة</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { upcomingApi.refetch(); allApi.refetch(); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button icon={Plus} onClick={openCreate}>إضافة مناسبة خاصة</Button>
        </div>
      </div>

      {/* ── Urgent Alert Banner ── */}
      {urgentOccasion && (
        <div className="bg-gradient-to-l from-red-50 to-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-orange-900">
              {urgentOccasion.icon} {urgentOccasion.name_ar} — بعد {urgentOccasion.days_until} أيام فقط
            </p>
            <p className="text-xs text-orange-700 mt-0.5">
              زِد مخزونك {urgentOccasion.stock_increase_pct}% الآن لتجنّب النفاد في ذروة الطلب
            </p>
          </div>
          <button onClick={() => urgentRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="text-xs font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors shrink-0">
            عرض التفاصيل
          </button>
        </div>
      )}

      {/* ── Section 1: القادمة ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-bold text-gray-800">المناسبات القادمة</h2>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">الـ 60 يوم</span>
        </div>

        {upcomingApi.loading ? <UpcomingSkeleton /> : upcomingApi.error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />{upcomingApi.error}
          </div>
        ) : upcomingList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
            لا مناسبات في الـ 60 يوم القادمة
          </div>
        ) : (
          <div ref={urgentRef} className="space-y-3">
            {upcomingList.map((occ: any, idx: number) => {
              const cc = colorConfig(occ.color ?? "blue");
              const isUrgent = occ.is_urgent || (typeof occ.days_until === "number" && occ.days_until <= (occ.lead_days ?? 14));
              const month = occ.date_month ?? occ.next_date_month;
              const day   = occ.date_day   ?? occ.next_date_day;
              const dateLabel = occ.next_date
                ? new Date(occ.next_date).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })
                : (month && day ? formatArabicDate(Number(month), Number(day)) : "—");
              const ml = multiplierLabel(occ.sales_multiplier);

              return (
                <div key={occ.id ?? idx}
                  className={clsx(
                    "rounded-2xl border-2 p-4 flex gap-4 items-start transition-all",
                    isUrgent ? "border-orange-300 bg-orange-50" : `${cc.bg} ${cc.border}`,
                  )}>
                  {/* Days counter */}
                  <div className={clsx(
                    "w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white shadow-sm",
                    isUrgent ? "bg-orange-500" : cc.circle,
                  )}>
                    <span className="text-2xl font-black leading-none tabular-nums">{occ.days_until}</span>
                    <span className="text-[10px] font-medium opacity-90">يوم</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {occ.icon && <span className="text-base">{occ.icon}</span>}
                      <span className="font-bold text-gray-900 text-sm">{occ.name_ar}</span>
                      {isUrgent && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                          استعدّ الآن
                        </span>
                      )}
                      {occ.is_system && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {occ.category ?? "نظامي"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{dateLabel}</p>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full", ml.cls)}>
                        {ml.label}
                      </span>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        +{occ.stock_increase_pct}% مخزون
                      </span>
                    </div>
                    <div className="bg-white/70 rounded-xl px-3 py-2 text-xs text-gray-600 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                      <span>
                        اطلب {occ.stock_increase_pct}% أكثر من المعتاد قبل {occ.lead_days} يوم على الأقل
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 2: المناسبات النظامية ── */}
      <section>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h2 className="text-base font-bold text-gray-800">المناسبات النظامية</h2>
          {/* Category filter tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {CATEGORY_TABS.map(t => (
              <button key={t.id} onClick={() => setCatFilter(t.id)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  catFilter === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}>
                <t.icon className="w-3 h-3" />
                {t.label}
                {t.id !== "all" && (
                  <span className="text-[10px] font-bold text-gray-400">
                    {systemList.filter((o: any) => o.category === t.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {allApi.loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : filteredSystem.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
            لا مناسبات في هذا التصنيف
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredSystem.map((occ: any, idx: number) => {
              const cc = colorConfig(occ.color ?? "blue");
              const month = occ.date_month;
              const day = occ.date_day;
              const dateStr = month && day ? formatArabicDate(Number(month), Number(day)) : "—";
              const ml = multiplierLabel(occ.sales_multiplier);

              // Check if coming up in next 30 days
              const today = new Date();
              const thisYear = new Date(today.getFullYear(), occ.date_month - 1, occ.date_day);
              const nextYear = new Date(today.getFullYear() + 1, occ.date_month - 1, occ.date_day);
              const target = thisYear >= today ? thisYear : nextYear;
              const daysUntil = Math.ceil((target.getTime() - today.getTime()) / 86400000);
              const isSoon = daysUntil <= 30;

              return (
                <div key={occ.id ?? idx}
                  className={clsx(
                    "rounded-2xl border p-4 flex flex-col gap-2.5 relative overflow-hidden transition-all hover:shadow-sm",
                    cc.bg, cc.border,
                    isSoon && "ring-2 ring-offset-1 ring-orange-300",
                  )}>
                  {isSoon && (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      {daysUntil} يوم
                    </div>
                  )}
                  <div className={clsx(
                    "w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm",
                    cc.circle,
                  )}>
                    {occ.icon || <Calendar className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 leading-snug">{occ.name_ar}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{dateStr}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", ml.cls)}>
                      {ml.label}
                    </span>
                    {occ.category && (
                      <span className="text-[10px] font-medium text-gray-500 bg-white/70 px-1.5 py-0.5 rounded-full border border-gray-200">
                        {occ.category}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 3: مناسباتك الخاصة ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-bold text-gray-800">مناسباتك الخاصة</h2>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {customList.length}
          </span>
        </div>

        {allApi.loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : customList.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center hover:border-brand-300 transition-colors cursor-pointer" onClick={openCreate}>
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-brand-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">أضف مناسباتك الخاصة</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              أعياد ميلاد عملائك، مناسبات محلية، تواريخ مهمة — النظام ينبّهك قبلها تلقائياً
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {customList.map((occ: any, idx: number) => {
              const cc = colorConfig(occ.color ?? "rose");
              const month = occ.date_month;
              const day = occ.date_day;
              const dateStr = month && day ? formatArabicDate(Number(month), Number(day)) : "—";
              const ml = multiplierLabel(occ.sales_multiplier);

              return (
                <div key={occ.id ?? idx}
                  className={clsx("rounded-2xl border p-4 flex flex-col gap-2.5 relative group transition-all hover:shadow-sm", cc.bg, cc.border)}>
                  <div className={clsx("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl", cc.circle)}>
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-900 leading-snug">{occ.name_ar}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{dateStr}</p>
                  </div>
                  <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full self-start", ml.cls)}>
                    {ml.label}
                  </span>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/50">
                    <button onClick={() => openEdit(occ)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-brand-600 bg-white/60 hover:bg-white rounded-lg py-1.5 transition-colors">
                      <Edit2 className="w-3 h-3" /> تعديل
                    </button>
                    <button onClick={() => handleDelete(occ)} disabled={deleteMutation.loading}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-red-600 bg-white/60 hover:bg-red-50 rounded-lg py-1.5 transition-colors disabled:opacity-50">
                      <Trash2 className="w-3 h-3" /> حذف
                    </button>
                  </div>
                </div>
              );
            })}
            {/* Add more card */}
            <button onClick={openCreate}
              className="rounded-2xl border-2 border-dashed border-gray-200 p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/30 transition-all min-h-[140px]">
              <Plus className="w-6 h-6" />
              <span className="text-xs font-medium">إضافة مناسبة</span>
            </button>
          </div>
        )}
      </section>

      {/* ── Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "تعديل المناسبة" : "إضافة مناسبة خاصة"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={isSaving}>
              {editTarget ? "حفظ التغييرات" : "إضافة المناسبة"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="اسم المناسبة" name="nameAr" value={form.nameAr}
            onChange={e => handleField("nameAr", e.target.value)}
            placeholder="مثال: عيد ميلاد العميل أحمد" required error={errors.nameAr} />

          <div className="grid grid-cols-2 gap-3">
            <Select label="الشهر" name="dateMonth" value={form.dateMonth}
              onChange={e => handleField("dateMonth", e.target.value)}
              options={MONTH_OPTIONS} placeholder="اختر الشهر" required error={errors.dateMonth} />
            <Select label="اليوم" name="dateDay" value={form.dateDay}
              onChange={e => handleField("dateDay", e.target.value)}
              options={DAY_OPTIONS} placeholder="اليوم" required error={errors.dateDay} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="قبل كم يوم تنبّه" name="leadDays" type="number"
              value={form.leadDays} onChange={e => handleField("leadDays", e.target.value)} min={1} max={90} />
            <Input label="ضاعف المبيعات" name="salesMultiplier" type="number"
              value={form.salesMultiplier} onChange={e => handleField("salesMultiplier", e.target.value)} min={1} step={0.5} />
          </div>

          <Input label="نسبة زيادة المخزون %" name="stockIncreasePct" type="number"
            value={form.stockIncreasePct} onChange={e => handleField("stockIncreasePct", e.target.value)}
            min={0} max={500} suffix="%" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">اللون</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map(opt => {
                const cc = colorConfig(opt.value);
                return (
                  <button key={opt.value} type="button" onClick={() => handleField("color", opt.value)}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors",
                      form.color === opt.value ? "border-brand-400 bg-brand-50 text-brand-700 font-medium" : "border-gray-200 text-gray-600 hover:bg-gray-50",
                    )}>
                    <span className={clsx("w-3 h-3 rounded-full", cc.circle)} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span>
            </label>
            <textarea value={form.notes} onChange={e => handleField("notes", e.target.value)} rows={3}
              placeholder="أي تفاصيل إضافية..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none resize-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-colors" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
