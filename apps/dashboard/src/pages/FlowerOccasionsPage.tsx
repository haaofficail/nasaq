import { useState, useRef } from "react";
import { Calendar, Plus, Edit2, Trash2, AlertTriangle, Info, RefreshCw } from "lucide-react";
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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function colorClasses(color: string) {
  const map: Record<string, { card: string; circle: string }> = {
    rose:   { card: "bg-rose-50 border-rose-200",     circle: "bg-rose-500"   },
    pink:   { card: "bg-pink-50 border-pink-200",     circle: "bg-pink-400"   },
    amber:  { card: "bg-amber-50 border-amber-200",   circle: "bg-amber-500"  },
    green:  { card: "bg-green-50 border-green-200",   circle: "bg-green-500"  },
    violet: { card: "bg-violet-50 border-violet-200", circle: "bg-violet-500" },
    blue:   { card: "bg-blue-50 border-blue-200",     circle: "bg-blue-500"   },
  };
  return map[color] ?? { card: "bg-gray-50 border-gray-200", circle: "bg-gray-400" };
}

function colorDot(color: string) {
  const map: Record<string, string> = {
    rose:   "bg-rose-400",
    pink:   "bg-pink-400",
    amber:  "bg-amber-400",
    green:  "bg-green-500",
    violet: "bg-violet-500",
    blue:   "bg-blue-500",
  };
  return map[color] ?? "bg-gray-400";
}

function formatArabicDate(month: number, day: number) {
  return `${day} ${ARABIC_MONTHS[month - 1]}`;
}

// ─────────────────────────────────────────────
// Empty form state
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
  nameAr: "",
  dateMonth: "",
  dateDay: "",
  leadDays: "14",
  salesMultiplier: "2.0",
  stockIncreasePct: "50",
  color: "rose",
  notes: "",
};

// ─────────────────────────────────────────────
// Skeleton for upcoming list
// ─────────────────────────────────────────────

function UpcomingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
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

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
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

  // ── API calls ──
  const upcomingApi = useApi(() => flowerIntelligenceApi.occasionsUpcoming(60), []);
  const allApi      = useApi(() => flowerIntelligenceApi.occasions(), []);

  const upcomingList: any[] = upcomingApi.data?.data           ?? [];
  const systemList:   any[] = allApi.data?.systemOccasions     ?? [];
  const customList:   any[] = allApi.data?.data                ?? [];

  // ── Urgent occasion (first with days_until <= 7) ──
  const urgentOccasion = upcomingList.find(
    (o: any) => typeof o.days_until === "number" && o.days_until <= 7,
  );

  // ── Modal state ──
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [form, setForm]             = useState<OccasionForm>(EMPTY_FORM);
  const [errors, setErrors]         = useState<Partial<OccasionForm>>({});

  // ── Mutations ──
  const createMutation = useMutation((data: any) => flowerIntelligenceApi.createOccasion(data));
  const updateMutation = useMutation((args: { id: string; data: any }) =>
    flowerIntelligenceApi.updateOccasion(args.id, args.data),
  );
  const deleteMutation = useMutation((id: string) => flowerIntelligenceApi.deleteOccasion(id));

  // ── Handlers ──
  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(occasion: any) {
    setEditTarget(occasion);
    setForm({
      nameAr:          occasion.name_ar           ?? "",
      dateMonth:       String(occasion.date_month  ?? ""),
      dateDay:         String(occasion.date_day    ?? ""),
      leadDays:        String(occasion.lead_days   ?? "14"),
      salesMultiplier: String(occasion.sales_multiplier ?? "2.0"),
      stockIncreasePct: String(occasion.stock_increase_pct ?? "50"),
      color:           occasion.color             ?? "rose",
      notes:           occasion.notes             ?? "",
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleField(name: keyof OccasionForm, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<OccasionForm> = {};
    if (!form.nameAr.trim())   next.nameAr   = "مطلوب";
    if (!form.dateMonth)       next.dateMonth = "مطلوب";
    if (!form.dateDay)         next.dateDay   = "مطلوب";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const payload = {
      name_ar:            form.nameAr.trim(),
      date_month:         Number(form.dateMonth),
      date_day:           Number(form.dateDay),
      lead_days:          Number(form.leadDays)        || 14,
      sales_multiplier:   Number(form.salesMultiplier)  || 2.0,
      stock_increase_pct: Number(form.stockIncreasePct) || 50,
      color:              form.color,
      notes:              form.notes.trim() || undefined,
    };

    let ok = false;
    if (editTarget) {
      const res = await updateMutation.mutate({ id: editTarget.id, data: payload });
      ok = !!res;
    } else {
      const res = await createMutation.mutate(payload);
      ok = !!res;
    }

    if (ok) {
      toast.success(editTarget ? "تم تحديث المناسبة" : "تمت إضافة المناسبة");
      setModalOpen(false);
      allApi.refetch();
      upcomingApi.refetch();
    }
  }

  async function handleDelete(occasion: any) {
    const confirmed = await confirmDialog({
      title: `حذف "${occasion.name_ar}"؟`,
      message: "لن تتمكن من التراجع عن هذا الإجراء.",
      danger: true,
      confirmLabel: "احذف",
    });
    if (!confirmed) return;
    const res = await deleteMutation.mutate(occasion.id);
    if (res !== null) {
      toast.success("تم حذف المناسبة");
      allApi.refetch();
      upcomingApi.refetch();
    }
  }

  const isSaving = createMutation.loading || updateMutation.loading;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div dir="rtl" className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-500" />
            تقويم المناسبات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">استعدّ قبل المناسبة لا بعدها</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>
          إضافة مناسبة خاصة
        </Button>
      </div>

      {/* ── Smart Insight Banner ── */}
      {urgentOccasion && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              تنبيه: {urgentOccasion.name_ar} بعد {urgentOccasion.days_until} أيام — زِد مخزونك {urgentOccasion.stock_increase_pct}% الآن
            </p>
          </div>
          <button
            onClick={() => urgentRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="text-xs text-amber-700 underline underline-offset-2 whitespace-nowrap shrink-0"
          >
            عرض التفاصيل
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────
          SECTION 1 — المناسبات القادمة
      ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-bold text-gray-800">المناسبات القادمة</h2>
          <span className="text-xs text-gray-400">الـ 60 يوم القادمة</span>
          <button
            onClick={upcomingApi.refetch}
            className="mr-auto w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {upcomingApi.loading ? (
          <UpcomingSkeleton />
        ) : upcomingApi.error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {upcomingApi.error}
          </div>
        ) : upcomingList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
            لا مناسبات في الـ 60 يوم القادمة
          </div>
        ) : (
          <div ref={urgentRef} className="space-y-3">
            {upcomingList.map((occ: any, idx: number) => {
              const cls        = colorClasses(occ.color ?? "blue");
              const isUrgent   = occ.is_urgent || (typeof occ.days_until === "number" && occ.days_until <= (occ.lead_days ?? 14));
              const month      = occ.date_month ?? occ.next_date_month;
              const day        = occ.date_day   ?? occ.next_date_day;
              const dateLabel  = occ.next_date
                ? new Date(occ.next_date).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })
                : (month && day ? formatArabicDate(Number(month), Number(day)) : "—");

              return (
                <div
                  key={occ.id ?? idx}
                  className={clsx(
                    "rounded-2xl border-2 p-5 flex gap-4 items-start transition-shadow",
                    isUrgent ? "border-orange-300 bg-orange-50" : cls.card,
                  )}
                >
                  {/* Days circle */}
                  <div className={clsx("w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white", cls.circle)}>
                    <span className="text-2xl font-black leading-none tabular-nums">{occ.days_until}</span>
                    <span className="text-xs font-medium">يوم</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-900 text-sm">{occ.name_ar}</span>
                      {isUrgent && (
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                          استعدّ الآن
                        </span>
                      )}
                      {occ.is_system && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          نظامي
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mb-2">{dateLabel}</p>

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        ×{occ.sales_multiplier} المبيعات
                      </span>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        +{occ.stock_increase_pct}% مخزون
                      </span>
                    </div>

                    <div className="bg-white/70 rounded-xl px-3 py-2 text-xs text-gray-600 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                      <span>
                        نصيحة: اطلب {occ.stock_increase_pct}% أكثر من طلبك المعتاد قبل {occ.lead_days} يوم
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ────────────────────────────────────────
          SECTION 2 — كل المناسبات النظامية
      ──────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-bold text-gray-800 mb-3">كل المناسبات النظامية</h2>

        {allApi.loading ? (
          <GridSkeleton />
        ) : allApi.error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {allApi.error}
          </div>
        ) : systemList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
            لا مناسبات نظامية
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {systemList.map((occ: any, idx: number) => {
              const cls     = colorClasses(occ.color ?? "blue");
              const month   = occ.date_month;
              const day     = occ.date_day;
              const dateStr = month && day ? formatArabicDate(Number(month), Number(day)) : "—";

              return (
                <div
                  key={occ.id ?? idx}
                  className={clsx("rounded-2xl border p-4 flex flex-col gap-2", cls.card)}
                >
                  <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center shrink-0", cls.circle)}>
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-semibold text-sm text-gray-900 leading-snug">{occ.name_ar}</p>
                  <p className="text-xs text-gray-500">{dateStr}</p>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full self-start">
                    ×{occ.sales_multiplier} المبيعات
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ────────────────────────────────────────
          SECTION 3 — مناسباتك الخاصة
      ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-bold text-gray-800">مناسباتك الخاصة</h2>
          <button
            onClick={allApi.refetch}
            className="mr-auto w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {allApi.loading ? (
          <GridSkeleton />
        ) : allApi.error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {allApi.error}
          </div>
        ) : customList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              لم تضف مناسبات خاصة بعد — أضف أعياد ميلاد عملائك أو مناسبات محلية
            </p>
            <button
              onClick={openCreate}
              className="mt-4 text-xs text-brand-500 font-medium hover:underline"
            >
              إضافة مناسبة الآن
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {customList.map((occ: any, idx: number) => {
              const cls     = colorClasses(occ.color ?? "rose");
              const month   = occ.date_month;
              const day     = occ.date_day;
              const dateStr = month && day ? formatArabicDate(Number(month), Number(day)) : "—";

              return (
                <div
                  key={occ.id ?? idx}
                  className={clsx("rounded-2xl border p-4 flex flex-col gap-2 relative group", cls.card)}
                >
                  <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center shrink-0", cls.circle)}>
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-semibold text-sm text-gray-900 leading-snug">{occ.name_ar}</p>
                  <p className="text-xs text-gray-500">{dateStr}</p>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full self-start">
                    ×{occ.sales_multiplier} المبيعات
                  </span>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      onClick={() => openEdit(occ)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-brand-600 bg-white/70 hover:bg-white rounded-lg py-1.5 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDelete(occ)}
                      disabled={deleteMutation.loading}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-red-600 bg-white/70 hover:bg-red-50 rounded-lg py-1.5 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ────────────────────────────────────────
          Create / Edit Modal
      ──────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "تعديل المناسبة" : "إضافة مناسبة خاصة"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} loading={isSaving}>
              {editTarget ? "حفظ التغييرات" : "إضافة المناسبة"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Name */}
          <Input
            label="اسم المناسبة"
            name="nameAr"
            value={form.nameAr}
            onChange={(e) => handleField("nameAr", e.target.value)}
            placeholder="مثال: عيد ميلاد العميل أحمد"
            required
            error={errors.nameAr}
          />

          {/* Date */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="الشهر"
              name="dateMonth"
              value={form.dateMonth}
              onChange={(e) => handleField("dateMonth", e.target.value)}
              options={MONTH_OPTIONS}
              placeholder="اختر الشهر"
              required
              error={errors.dateMonth}
            />
            <Select
              label="اليوم"
              name="dateDay"
              value={form.dateDay}
              onChange={(e) => handleField("dateDay", e.target.value)}
              options={DAY_OPTIONS}
              placeholder="اليوم"
              required
              error={errors.dateDay}
            />
          </div>

          {/* Lead days + Sales multiplier */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="قبل كم يوم تنبّه"
              name="leadDays"
              type="number"
              value={form.leadDays}
              onChange={(e) => handleField("leadDays", e.target.value)}
              min={1}
              max={90}
            />
            <Input
              label="ضاعف المبيعات المتوقع"
              name="salesMultiplier"
              type="number"
              value={form.salesMultiplier}
              onChange={(e) => handleField("salesMultiplier", e.target.value)}
              min={1}
              step={0.5}
            />
          </div>

          {/* Stock increase */}
          <Input
            label="نسبة زيادة المخزون %"
            name="stockIncreasePct"
            type="number"
            value={form.stockIncreasePct}
            onChange={(e) => handleField("stockIncreasePct", e.target.value)}
            min={0}
            max={500}
            suffix="%"
          />

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">اللون</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleField("color", opt.value)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors",
                    form.color === opt.value
                      ? "border-brand-400 bg-brand-50 text-brand-700 font-medium"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <span className={clsx("w-3 h-3 rounded-full", colorDot(opt.value))} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1.5">
              ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={(e) => handleField("notes", e.target.value)}
              rows={3}
              placeholder="أي تفاصيل إضافية..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none resize-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-colors"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
