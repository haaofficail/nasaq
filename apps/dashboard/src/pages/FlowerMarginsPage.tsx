import { useState } from "react";
import { flowerIntelligenceApi, flowerMasterApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Modal, Button, Input } from "@/components/ui";
import { toast } from "@/hooks/useToast";
import {
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  AlertTriangle,
  Info,
  ArrowLeft,
} from "lucide-react";
import { clsx } from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type BreakdownItem = {
  variantId: string;
  variantName: string;
  qty: number;
  unitCost: number;
};

type MarginRow = {
  id: string;
  name: string;
  price: number;
  category: string;
  is_active: boolean;
  items_breakdown: BreakdownItem[];
  real_cost: number;
  margin_pct: number | null;
  margin_amount: number;
  cost_status: "unknown" | "loss" | "low" | "fair" | "healthy";
};

type MarginsResponse = {
  data: MarginRow[];
  summary: {
    avgMargin: number | null;
    lossCount: number;
    lowMarginCount: number;
    healthyCount: number;
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  loss:    "bg-red-100 text-red-700 border-red-200",
  low:     "bg-amber-100 text-amber-700 border-amber-200",
  fair:    "bg-blue-100 text-blue-700 border-blue-200",
  healthy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  unknown: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  loss:    "خسارة",
  low:     "منخفض",
  fair:    "مقبول",
  healthy: "صحي",
  unknown: "غير محسوب",
};

const FILTER_TABS = [
  { key: "all",     label: "الكل" },
  { key: "loss",    label: "بخسارة" },
  { key: "low",     label: "منخفض" },
  { key: "fair",    label: "مقبول" },
  { key: "healthy", label: "صحي" },
  { key: "unknown", label: "غير محسوب" },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]["key"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function barColor(status: MarginRow["cost_status"]) {
  if (status === "healthy") return "bg-emerald-500";
  if (status === "fair")    return "bg-amber-400";
  return "bg-red-500";
}

function fmtSAR(val: number) {
  return `${Number(val).toFixed(2)} ر.س`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-5 bg-gray-100 rounded w-16" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-8 bg-gray-100 rounded-xl" />
        <div className="h-8 bg-gray-100 rounded-xl" />
        <div className="h-8 bg-gray-100 rounded-xl" />
      </div>
      <div className="h-3 bg-gray-100 rounded-full" />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string | number;
  colorClass: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-1">
      <p className={clsx("text-2xl font-bold tabular-nums", colorClass)}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

// ─── Edit Breakdown Modal ─────────────────────────────────────────────────────

type EditRow = {
  variantId: string;
  variantName: string;
  qty: number;
  unitCost: number;
};

function EditBreakdownModal({
  arrangement,
  open,
  onClose,
  onSaved,
}: {
  arrangement: MarginRow;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: variantsData, loading: variantsLoading } = useApi(
    () => flowerMasterApi.variants(),
    []
  );
  const variants: any[] = variantsData?.data || [];

  const [rows, setRows] = useState<EditRow[]>(() =>
    arrangement.items_breakdown.map((b) => ({
      variantId: b.variantId,
      variantName: b.variantName,
      qty: b.qty,
      unitCost: b.unitCost,
    }))
  );

  const { mutate, loading } = useMutation((breakdown: EditRow[]) =>
    flowerIntelligenceApi.updatePackageBreakdown(arrangement.id, breakdown)
  );

  function addRow() {
    setRows((prev) => [
      ...prev,
      { variantId: "", variantName: "", qty: 1, unitCost: 0 },
    ]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: keyof EditRow, value: string | number) {
    setRows((prev) => {
      const next = [...prev];
      if (field === "variantId") {
        const v = variants.find((x) => x.id === value);
        next[idx] = {
          ...next[idx],
          variantId: String(value),
          variantName: v?.display_name || v?.name || String(value),
          unitCost: v?.avg_unit_cost ?? next[idx].unitCost,
        };
      } else if (field === "qty" || field === "unitCost") {
        next[idx] = { ...next[idx], [field]: Number(value) };
      } else {
        next[idx] = { ...next[idx], [field]: String(value) };
      }
      return next;
    });
  }

  async function handleSave() {
    const result = await mutate(rows);
    if (result) {
      toast.success("تم تحديث مكوّنات التكلفة");
      onSaved();
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`تحديث مكوّنات ${arrangement.name}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} loading={loading}>
            حفظ
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            لا توجد مكوّنات — أضف عناصر التكلفة
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-end"
              >
                {/* Variant select */}
                <div>
                  {idx === 0 && (
                    <label className="block text-xs text-gray-500 mb-1">
                      الصنف
                    </label>
                  )}
                  {variantsLoading ? (
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  ) : (
                    <select
                      value={row.variantId}
                      onChange={(e) =>
                        updateRow(idx, "variantId", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 appearance-none bg-white"
                    >
                      <option value="">اختر صنف</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.display_name || v.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Qty */}
                <div>
                  {idx === 0 && (
                    <label className="block text-xs text-gray-500 mb-1">
                      الكمية
                    </label>
                  )}
                  <Input
                    name={`qty-${idx}`}
                    type="number"
                    value={row.qty}
                    onChange={(e) => updateRow(idx, "qty", e.target.value)}
                    min={1}
                    step={1}
                  />
                </div>
                {/* Unit cost */}
                <div>
                  {idx === 0 && (
                    <label className="block text-xs text-gray-500 mb-1">
                      سعر الوحدة
                    </label>
                  )}
                  <Input
                    name={`cost-${idx}`}
                    type="number"
                    value={row.unitCost}
                    onChange={(e) =>
                      updateRow(idx, "unitCost", e.target.value)
                    }
                    min={0}
                    step={0.01}
                    suffix="ر.س"
                  />
                </div>
                {/* Remove */}
                <div>
                  {idx === 0 && <div className="mb-1 h-4" />}
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="w-9 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          إضافة صنف
        </button>
      </div>
    </Modal>
  );
}

// ─── Arrangement Card ─────────────────────────────────────────────────────────

function ArrangementCard({
  row,
  onRefetch,
}: {
  row: MarginRow;
  onRefetch: () => void;
}) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const barWidth =
    row.margin_pct !== null ? Math.min(Math.max(row.margin_pct, 0), 100) : 0;

  const hasBreakdown = row.items_breakdown.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-snug">
            {row.name}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {row.category && (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500">
                {row.category}
              </span>
            )}
            <span
              className={clsx(
                "text-xs px-2 py-0.5 rounded-lg border",
                row.is_active
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-gray-100 text-gray-400 border-gray-200"
              )}
            >
              {row.is_active ? "نشط" : "غير نشط"}
            </span>
          </div>
        </div>
        <span
          className={clsx(
            "text-xs font-semibold px-2.5 py-1 rounded-xl border shrink-0",
            STATUS_COLORS[row.cost_status]
          )}
        >
          {STATUS_LABELS[row.cost_status]}
        </span>
      </div>

      {/* Price / Cost / Margin Row */}
      <div className="px-5 pb-3 grid grid-cols-3 gap-2 text-center">
        <div className="bg-emerald-50 rounded-xl px-2 py-2.5">
          <p className="text-xs text-gray-400 mb-0.5">سعر البيع</p>
          <p className="text-sm font-bold text-emerald-600 tabular-nums">
            {fmtSAR(row.price)}
          </p>
        </div>
        <div className="bg-red-50 rounded-xl px-2 py-2.5">
          <p className="text-xs text-gray-400 mb-0.5">التكلفة الفعلية</p>
          <p
            className={clsx(
              "text-sm font-bold tabular-nums",
              row.cost_status === "unknown" ? "text-gray-400" : "text-red-600"
            )}
          >
            {row.cost_status === "unknown" ? "—" : fmtSAR(row.real_cost)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl px-2 py-2.5">
          <p className="text-xs text-gray-400 mb-0.5">الهامش</p>
          <p
            className={clsx(
              "text-sm font-bold tabular-nums",
              row.cost_status === "healthy"
                ? "text-emerald-600"
                : row.cost_status === "fair"
                ? "text-amber-600"
                : row.cost_status === "loss"
                ? "text-red-600"
                : "text-gray-400"
            )}
          >
            {row.margin_pct !== null
              ? `${Number(row.margin_amount).toFixed(2)} (${Number(row.margin_pct).toFixed(0)}%)`
              : "—"}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {row.cost_status !== "unknown" && (
        <div className="px-5 pb-3">
          <div className="relative bg-gray-100 rounded-full h-5 overflow-hidden">
            <div
              className={clsx("h-5 rounded-full transition-all", barColor(row.cost_status))}
              style={{ width: `${barWidth}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white drop-shadow-sm">
              {row.margin_pct !== null ? `${Number(row.margin_pct).toFixed(0)}%` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Breakdown Toggle */}
      <div className="border-t border-gray-50">
        <button
          type="button"
          onClick={() => setBreakdownOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-600"
        >
          <span className="font-medium">عناصر التكلفة</span>
          {breakdownOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {breakdownOpen && (
          <div className="px-5 pb-4">
            {hasBreakdown ? (
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="text-gray-400">
                    <th className="pb-2 font-medium text-right">الصنف</th>
                    <th className="pb-2 font-medium text-center">الكمية</th>
                    <th className="pb-2 font-medium text-center">سعر الوحدة</th>
                    <th className="pb-2 font-medium text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {row.items_breakdown.map((item, i) => (
                    <tr key={i}>
                      <td className="py-1.5 text-gray-700">{item.variantName}</td>
                      <td className="py-1.5 text-center text-gray-500">
                        {item.qty} ساق
                      </td>
                      <td className="py-1.5 text-center text-gray-500 tabular-nums">
                        {Number(item.unitCost).toFixed(2)}
                      </td>
                      <td className="py-1.5 text-left font-semibold text-gray-700 tabular-nums">
                        {(Number(item.qty) * Number(item.unitCost)).toFixed(2)} ر.س
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-4 text-center space-y-2">
                <p className="text-xs text-gray-400">
                  لم تُحدَّد مكوّنات التكلفة بعد
                </p>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 mx-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة مكوّنات
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Button */}
      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="w-full text-center text-xs font-medium text-brand-600 hover:text-brand-700 py-2 rounded-xl border border-brand-100 hover:bg-brand-50 transition-colors"
        >
          تحديث مكوّنات التكلفة
        </button>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <EditBreakdownModal
          arrangement={row}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={onRefetch}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FlowerMarginsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const { data, loading, error, refetch } = useApi(
    () => flowerIntelligenceApi.margins() as Promise<MarginsResponse>,
    []
  );

  const rows: MarginRow[] = data?.data || [];
  const summary = data?.summary;

  const filtered =
    activeFilter === "all"
      ? rows
      : rows.filter((r) => r.cost_status === activeFilter);

  // KPI color helpers
  const avgColor =
    summary?.avgMargin === null || summary?.avgMargin === undefined
      ? "text-gray-400"
      : summary.avgMargin > 35
      ? "text-emerald-600"
      : summary.avgMargin > 20
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-500" />
            هوامش الربح الحقيقية
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            هامشك الفعلي بعد حساب تكلفة الدفعات الحالية
          </p>
        </div>
        <Button
          variant="secondary"
          icon={RefreshCw}
          onClick={refetch}
          size="sm"
        >
          تحديث التكاليف
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading: KPI skeletons */}
      {loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-4 h-20 animate-pulse"
              >
                <div className="h-6 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </>
      )}

      {!loading && !error && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="متوسط الهامش"
              value={
                summary?.avgMargin !== null && summary?.avgMargin !== undefined
                  ? `${Number(summary.avgMargin).toFixed(0)}%`
                  : "—"
              }
              colorClass={avgColor}
            />
            <KpiCard
              label="تنسيقات بخسارة"
              value={summary?.lossCount ?? 0}
              colorClass="text-red-600"
            />
            <KpiCard
              label="هامش منخفض (أقل من 20%)"
              value={summary?.lowMarginCount ?? 0}
              colorClass="text-amber-600"
            />
            <KpiCard
              label="هامش صحي (أكثر من 40%)"
              value={summary?.healthyCount ?? 0}
              colorClass="text-emerald-600"
            />
          </div>

          {/* Setup Guide — يظهر عندما كل الباقات غير محسوبة */}
          {rows.length > 0 && rows.every(r => r.cost_status === "unknown") && (
            <div className="bg-brand-50 border border-brand-200 rounded-2xl overflow-hidden">
              <div className="flex items-start gap-3 p-5">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-brand-800 mb-1">لم تُحدَّد مكوّنات التكلفة بعد</p>
                  <p className="text-xs text-brand-600 leading-relaxed mb-3">
                    لحساب هامشك الحقيقي، يحتاج النظام أن تحدد لكل باقة أنواع الورود التي تدخل فيها وكمياتها.
                    التكلفة تُحسب تلقائياً من أسعار دفعاتك الحالية في المخزون.
                  </p>
                  <div className="space-y-2">
                    {[
                      "افتح أي بطاقة باقة أدناه",
                      "اضغط «تحديث مكوّنات التكلفة»",
                      "اختر أنواع الورود من مخزونك وحدد الكمية لكل نوع",
                      "سيحسب النظام هامشك فوراً بناءً على أسعار دفعاتك",
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-brand-700">
                        <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">
                          {i + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-brand-200 bg-brand-100/50 px-5 py-3 flex items-center gap-2 text-xs text-brand-600">
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                ابدأ بأكثر باقاتك مبيعاً لتحصل على صورة فورية عن ربحيتك
              </div>
            </div>
          )}

          {/* بانر جزئي — بعض الباقات محسوبة وبعضها لا */}
          {rows.length > 0 && !rows.every(r => r.cost_status === "unknown") && rows.some(r => r.cost_status === "unknown") && (
            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">
                  {rows.filter(r => r.cost_status === "unknown").length} باقة
                </span>{" "}
                لم تُحدَّد مكوّناتها بعد — افتحها وأضف عناصر التكلفة لتكتمل الصورة
              </p>
            </div>
          )}

          {/* Insight Banners */}
          {(summary?.lossCount ?? 0) > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">
                تنبيه: {summary!.lossCount} تنسيقات تُباع بخسارة — راجع أسعارها فوراً
              </p>
            </div>
          )}
          {(summary?.lossCount ?? 0) === 0 &&
            summary?.avgMargin !== null &&
            summary?.avgMargin !== undefined &&
            summary.avgMargin < 20 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 font-medium">
                  هوامشك منخفضة — فكر في رفع الأسعار أو تقليل المكوّنات
                </p>
              </div>
            )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={clsx(
                  "px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-colors",
                  activeFilter === tab.key
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Empty State */}
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {rows.length === 0
                  ? "لا توجد تنسيقات — أضف باقات من صفحة التنسيقات"
                  : "لا توجد تنسيقات بهذا التصنيف"}
              </p>
            </div>
          )}

          {/* Grid */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((row) => (
                <ArrangementCard key={row.id} row={row} onRefetch={refetch} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
