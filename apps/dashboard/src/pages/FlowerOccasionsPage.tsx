import { useState, useRef } from "react";
import {
  Calendar, Plus, Edit2, Trash2, AlertTriangle, Info, RefreshCw,
  Globe, Flag, Leaf, Sparkles, Clock, TrendingUp, ArrowUpLeft,
} from "lucide-react";
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
  const map: Record<string, {
    bg: string; border: string; circle: string; badge: string;
    text: string; gradient: string; ring: string; soft: string;
  }> = {
    rose:   { bg: "bg-rose-50/80",   border: "border-rose-100",   circle: "bg-gradient-to-br from-rose-400 to-rose-600",     badge: "bg-rose-100 text-rose-700",     text: "text-rose-700",     gradient: "from-rose-500 to-rose-600",     ring: "ring-rose-200",     soft: "bg-rose-50" },
    pink:   { bg: "bg-pink-50/80",   border: "border-pink-100",   circle: "bg-gradient-to-br from-pink-300 to-pink-500",     badge: "bg-pink-100 text-pink-700",     text: "text-pink-700",     gradient: "from-pink-400 to-pink-500",     ring: "ring-pink-200",     soft: "bg-pink-50" },
    amber:  { bg: "bg-amber-50/80",  border: "border-amber-100",  circle: "bg-gradient-to-br from-amber-400 to-amber-600",   badge: "bg-amber-100 text-amber-700",   text: "text-amber-700",    gradient: "from-amber-500 to-amber-600",   ring: "ring-amber-200",    soft: "bg-amber-50" },
    green:  { bg: "bg-emerald-50/80",border: "border-emerald-100",circle: "bg-gradient-to-br from-emerald-400 to-emerald-600",badge: "bg-emerald-100 text-emerald-700",text: "text-emerald-700", gradient: "from-emerald-500 to-emerald-600",ring: "ring-emerald-200", soft: "bg-emerald-50" },
    violet: { bg: "bg-violet-50/80", border: "border-violet-100", circle: "bg-gradient-to-br from-violet-400 to-violet-600",  badge: "bg-violet-100 text-violet-700", text: "text-violet-700",   gradient: "from-violet-500 to-violet-600",  ring: "ring-violet-200",   soft: "bg-violet-50" },
    blue:   { bg: "bg-blue-50/80",   border: "border-blue-100",   circle: "bg-gradient-to-br from-blue-400 to-blue-600",     badge: "bg-blue-100 text-blue-700",     text: "text-blue-700",     gradient: "from-blue-500 to-blue-600",     ring: "ring-blue-200",     soft: "bg-blue-50" },
  };
  return map[color] ?? map.blue;
}

function formatArabicDate(month: number, day: number) {
  return `${day} ${ARABIC_MONTHS[month - 1]}`;
}

function multiplierLabel(m: number) {
  if (m >= 4) return { label: `${m}x`, cls: "bg-red-100 text-red-700 border border-red-200/50" };
  if (m >= 2.5) return { label: `${m}x`, cls: "bg-orange-100 text-orange-700 border border-orange-200/50" };
  return { label: `${m}x`, cls: "bg-amber-100 text-amber-700 border border-amber-200/50" };
}

function daysLabel(d: number) {
  if (d === 0) return "اليوم";
  if (d === 1) return "غدا";
  if (d <= 10) return `${d} ايام`;
  return `${d} يوم`;
}

function urgencyLevel(days: number, lead: number): "critical" | "warning" | "normal" {
  if (days <= 7) return "critical";
  if (days <= lead) return "warning";
  return "normal";
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

function PageSkeleton() {
  return (
    <div dir="rtl" className="space-y-8 pb-10">
      {/* Header skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
      {/* Cards skeleton */}
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
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Countdown Ring (SVG)
// ─────────────────────────────────────────────

function CountdownRing({ days, size = 64, urgency }: { days: number; size?: number; urgency: "critical" | "warning" | "normal" }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const maxDays = 60;
  const progress = Math.min(days / maxDays, 1);
  const offset = circumference * progress;

  const colors = {
    critical: { stroke: "#ef4444", bg: "#fef2f2", text: "text-red-600" },
    warning:  { stroke: "#f59e0b", bg: "#fffbeb", text: "text-amber-600" },
    normal:   { stroke: "#5b9bd5", bg: "#f0f7ff", text: "text-brand-600" },
  };
  const c = colors[urgency];

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill={c.bg}
          stroke="#e5e7eb" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={c.stroke} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx("text-lg font-black leading-none tabular-nums", c.text)}>{days}</span>
        <span className="text-[9px] font-medium text-gray-400 mt-0.5">يوم</span>
      </div>
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

  const isLoading = upcomingApi.loading || allApi.loading;
  const totalOccasions = systemList.length + customList.length;
  const nearestOcc = upcomingList[0];

  if (isLoading) return <PageSkeleton />;

  return (
    <div dir="rtl" className="space-y-8 pb-10">

      {/* ════════════════════════════════════════
          Hero Header
         ════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-bl from-brand-50 via-white to-blue-50/50 rounded-2xl border border-gray-100 shadow-sm">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-brand-100/30 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-violet-100/20 rounded-full translate-x-1/3 translate-y-1/3 blur-2xl" />

        <div className="relative p-6 lg:p-8">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm shadow-brand-200">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">تقويم المناسبات</h1>
                  <p className="text-sm text-gray-400">استعدّ قبل المناسبة لا بعدها</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { upcomingApi.refetch(); allApi.refetch(); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-400 hover:text-gray-600 transition-all shadow-sm">
                <RefreshCw className="w-4 h-4" />
              </button>
              <Button icon={Plus} onClick={openCreate}>اضافة مناسبة</Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-brand-500" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 tabular-nums">{totalOccasions}</p>
              <p className="text-xs text-gray-400 mt-0.5">اجمالي المناسبات</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 tabular-nums">{upcomingList.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">قادمة خلال 60 يوم</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 tabular-nums">{customList.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">مناسباتك الخاصة</p>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          Urgent Alert Banner
         ════════════════════════════════════════ */}
      {urgentOccasion && (
        <div className="relative overflow-hidden bg-gradient-to-l from-red-50 via-orange-50 to-amber-50 border border-orange-200/80 rounded-2xl p-5 shadow-sm">
          <div className="absolute top-0 left-0 w-24 h-24 bg-orange-200/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shrink-0 shadow-sm shadow-orange-200">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-orange-900 flex items-center gap-2">
                {urgentOccasion.icon && <span>{urgentOccasion.icon}</span>}
                {urgentOccasion.name_ar}
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                  بعد {urgentOccasion.days_until} {urgentOccasion.days_until <= 10 ? "ايام" : "يوم"}
                </span>
              </p>
              <p className="text-xs text-orange-700/80 mt-1 leading-relaxed">
                زِد مخزونك <span className="font-bold">{urgentOccasion.stock_increase_pct}%</span> الان لتجنّب النفاد في ذروة الطلب
              </p>
            </div>
            <button onClick={() => urgentRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-white/80 backdrop-blur-sm hover:bg-white border border-orange-200 px-4 py-2 rounded-xl transition-all shadow-sm shrink-0">
              <ArrowUpLeft className="w-3.5 h-3.5" />
              عرض التفاصيل
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          Section 1: القادمة (Timeline style)
         ════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900">المناسبات القادمة</h2>
            <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100">
              خلال 60 يوم
            </span>
          </div>
          {upcomingList.length > 0 && (
            <span className="text-xs text-gray-400">{upcomingList.length} مناسبة</span>
          )}
        </div>

        {upcomingApi.loading ? (
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
        ) : upcomingApi.error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />{upcomingApi.error}
          </div>
        ) : upcomingList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500 mb-1">لا مناسبات قريبة</p>
            <p className="text-xs text-gray-400">لا توجد مناسبات في الـ 60 يوم القادمة</p>
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
              const urg = urgencyLevel(occ.days_until, occ.lead_days ?? 14);
              const nearestLabel = daysLabel(occ.days_until);

              return (
                <div key={occ.id ?? idx}
                  className={clsx(
                    "group bg-white rounded-2xl border p-5 flex gap-5 items-center transition-all duration-200 hover:shadow-md",
                    urg === "critical" ? "border-red-200 shadow-sm shadow-red-100/50" :
                    urg === "warning" ? "border-amber-200 shadow-sm shadow-amber-100/50" :
                    "border-gray-100 shadow-sm hover:border-gray-200",
                  )}>
                  {/* Countdown ring */}
                  <CountdownRing days={occ.days_until} urgency={urg} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {occ.icon && <span className="text-lg">{occ.icon}</span>}
                      <span className="font-bold text-gray-900">{occ.name_ar}</span>
                      {urg === "critical" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                          استعدّ الان
                        </span>
                      )}
                      {occ.is_system && (
                        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {occ.category ?? "نظامي"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {dateLabel}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className={clsx(
                        "font-semibold",
                        urg === "critical" ? "text-red-600" : urg === "warning" ? "text-amber-600" : "text-brand-600",
                      )}>
                        {nearestLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx("inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg", ml.cls)}>
                        <TrendingUp className="w-3 h-3" />
                        {ml.label} مبيعات
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/50 px-2.5 py-1 rounded-lg">
                        +{occ.stock_increase_pct}% مخزون
                      </span>
                    </div>
                  </div>

                  {/* Tip card */}
                  <div className="hidden sm:flex items-start gap-2 bg-gray-50 rounded-xl px-4 py-3 max-w-[220px] border border-gray-100">
                    <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-gray-500 leading-relaxed">
                      اطلب {occ.stock_increase_pct}% اكثر من المعتاد قبل {occ.lead_days} يوم
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════
          Section 2: المناسبات النظامية
         ════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-base font-bold text-gray-900">المناسبات النظامية</h2>
          {/* Category filter pills */}
          <div className="flex gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
            {CATEGORY_TABS.map(t => {
              const count = t.id === "all" ? systemList.length : systemList.filter((o: any) => o.category === t.id).length;
              return (
                <button key={t.id} onClick={() => setCatFilter(t.id)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                    catFilter === t.id
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200/50 font-semibold"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                  )}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                  <span className={clsx(
                    "text-[10px] font-bold min-w-[18px] text-center rounded-full px-1 py-0.5",
                    catFilter === t.id ? "bg-brand-50 text-brand-600" : "bg-gray-100 text-gray-400",
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {allApi.loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : filteredSystem.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500 mb-1">لا توجد مناسبات</p>
            <p className="text-xs text-gray-400">لا مناسبات في هذا التصنيف</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSystem.map((occ: any, idx: number) => {
              const cc = colorConfig(occ.color ?? "blue");
              const month = occ.date_month;
              const day = occ.date_day;
              const dateStr = month && day ? formatArabicDate(Number(month), Number(day)) : "—";
              const ml = multiplierLabel(occ.sales_multiplier);

              const today = new Date();
              const thisYear = new Date(today.getFullYear(), occ.date_month - 1, occ.date_day);
              const nextYear = new Date(today.getFullYear() + 1, occ.date_month - 1, occ.date_day);
              const target = thisYear >= today ? thisYear : nextYear;
              const daysUntil = Math.ceil((target.getTime() - today.getTime()) / 86400000);
              const isSoon = daysUntil <= 30;

              return (
                <div key={occ.id ?? idx}
                  className={clsx(
                    "group relative bg-white rounded-2xl border p-5 flex flex-col gap-3 overflow-hidden transition-all duration-200 hover:shadow-md",
                    isSoon ? "border-amber-200 shadow-sm" : "border-gray-100 hover:border-gray-200",
                  )}>
                  {/* Subtle gradient overlay at top */}
                  <div className={clsx("absolute inset-x-0 top-0 h-1 bg-gradient-to-l", cc.gradient)} />

                  {isSoon && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {daysLabel(daysUntil)}
                    </div>
                  )}
                  <div className={clsx(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm mt-1",
                    cc.circle,
                  )}>
                    {occ.icon || <Calendar className="w-5 h-5 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-900 leading-snug mb-0.5">{occ.name_ar}</p>
                    <p className="text-xs text-gray-400">{dateStr}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-gray-100/80">
                    <span className={clsx("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg", ml.cls)}>
                      <TrendingUp className="w-2.5 h-2.5" />
                      {ml.label}
                    </span>
                    {occ.category && (
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-lg border border-gray-100">
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

      {/* ════════════════════════════════════════
          Section 3: مناسباتك الخاصة
         ════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900">مناسباتك الخاصة</h2>
            <span className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100">
              {customList.length}
            </span>
          </div>
          {customList.length > 0 && (
            <button onClick={openCreate}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              اضافة
            </button>
          )}
        </div>

        {allApi.loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : customList.length === 0 ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-50/50 via-white to-pink-50/30 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center hover:border-brand-300 transition-all duration-300 cursor-pointer group" onClick={openCreate}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100/20 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl" />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Plus className="w-7 h-7 text-brand-500" />
              </div>
              <p className="text-sm font-bold text-gray-700 mb-1.5">اضف مناسباتك الخاصة</p>
              <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                اعياد ميلاد عملائك، مناسبات محلية، تواريخ مهمة — النظام ينبّهك قبلها تلقائيا
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {customList.map((occ: any, idx: number) => {
              const cc = colorConfig(occ.color ?? "rose");
              const month = occ.date_month;
              const day = occ.date_day;
              const dateStr = month && day ? formatArabicDate(Number(month), Number(day)) : "—";
              const ml = multiplierLabel(occ.sales_multiplier);

              return (
                <div key={occ.id ?? idx}
                  className="group relative bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-200">
                  {/* Color accent */}
                  <div className={clsx("absolute inset-x-0 top-0 h-1 bg-gradient-to-l", cc.gradient)} />

                  {/* Action buttons (visible on hover) */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button onClick={() => openEdit(occ)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-colors shadow-sm">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDelete(occ)} disabled={deleteMutation.loading}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm disabled:opacity-50">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-sm", cc.circle)}>
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-900 leading-snug mb-0.5">{occ.name_ar}</p>
                    <p className="text-xs text-gray-400">{dateStr}</p>
                  </div>
                  <div className="pt-2 border-t border-gray-100/80">
                    <span className={clsx("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg", ml.cls)}>
                      <TrendingUp className="w-2.5 h-2.5" />
                      {ml.label} مبيعات
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Add card */}
            <button onClick={openCreate}
              className="group/add rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/20 transition-all duration-200 min-h-[180px]">
              <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover/add:bg-brand-50 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">اضافة مناسبة</span>
            </button>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════
          Modal
         ════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "تعديل المناسبة" : "اضافة مناسبة خاصة"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>الغاء</Button>
            <Button onClick={handleSave} loading={isSaving}>
              {editTarget ? "حفظ التغييرات" : "اضافة المناسبة"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input label="اسم المناسبة" name="nameAr" value={form.nameAr}
            onChange={e => handleField("nameAr", e.target.value)}
            placeholder="مثال: عيد ميلاد العميل احمد" required error={errors.nameAr} />

          <div className="grid grid-cols-2 gap-3">
            <Select label="الشهر" name="dateMonth" value={form.dateMonth}
              onChange={e => handleField("dateMonth", e.target.value)}
              options={MONTH_OPTIONS} placeholder="اختر الشهر" required error={errors.dateMonth} />
            <Select label="اليوم" name="dateDay" value={form.dateDay}
              onChange={e => handleField("dateDay", e.target.value)}
              options={DAY_OPTIONS} placeholder="اليوم" required error={errors.dateDay} />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-600 mb-2">اعدادات التنبيه والمخزون</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="قبل كم يوم تنبّه" name="leadDays" type="number"
                value={form.leadDays} onChange={e => handleField("leadDays", e.target.value)} min={1} max={90} />
              <Input label="مضاعف المبيعات" name="salesMultiplier" type="number"
                value={form.salesMultiplier} onChange={e => handleField("salesMultiplier", e.target.value)} min={1} step={0.5} />
            </div>
            <Input label="نسبة زيادة المخزون %" name="stockIncreasePct" type="number"
              value={form.stockIncreasePct} onChange={e => handleField("stockIncreasePct", e.target.value)}
              min={0} max={500} suffix="%" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">اللون</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map(opt => {
                const cc = colorConfig(opt.value);
                return (
                  <button key={opt.value} type="button" onClick={() => handleField("color", opt.value)}
                    className={clsx(
                      "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs transition-all duration-200",
                      form.color === opt.value
                        ? "border-brand-400 bg-brand-50 text-brand-700 font-semibold shadow-sm"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300",
                    )}>
                    <span className={clsx("w-3.5 h-3.5 rounded-full shadow-sm", cc.circle)} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span>
            </label>
            <textarea value={form.notes} onChange={e => handleField("notes", e.target.value)} rows={3}
              placeholder="اي تفاصيل اضافية..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none resize-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
