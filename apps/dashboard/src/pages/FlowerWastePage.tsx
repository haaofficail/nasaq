import { useState } from "react";
import { AlertTriangle, Plus, AlertCircle, Trash2, TrendingDown } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/hooks/useToast";
import { useApi, useMutation } from "@/hooks/useApi";
import { flowerWasteApi, flowerMasterApi } from "@/lib/api";
import { Modal, Input, Select, Button } from "@/components/ui";

// ─── Skeletons ────────────────────────────────────────────────────────────────
function SummarySkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
      <div className="h-4 bg-gray-100 rounded w-32 mb-4 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 animate-pulse space-y-2">
            <div className="h-6 bg-gray-100 rounded w-16" />
            <div className="h-3 bg-gray-100 rounded w-20" />
            <div className="h-3 bg-gray-100 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
      <div className="bg-gray-50 border-b border-[#eef2f6] px-4 py-3 flex gap-16">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 rounded w-16 animate-pulse" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-4 border-t border-gray-50 flex items-center gap-16 animate-pulse">
          <div className="space-y-1.5 flex-1">
            <div className="h-4 bg-gray-100 rounded w-28" />
            <div className="h-3 bg-gray-100 rounded w-16" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-14" />
          <div className="h-4 bg-gray-100 rounded w-20" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

const REASONS = [
  { value: "natural_expiry",  label: "انتهاء الصلاحية الطبيعي" },
  { value: "damage",          label: "تلف" },
  { value: "cutting_waste",   label: "هدر عند التقطيع" },
  { value: "transfer",        label: "تحويل" },
  { value: "other",           label: "أخرى" },
];

export function FlowerWastePage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    variant_id: "", batch_id: "",
    quantity_type: "stems", quantity: "",
    reason: "natural_expiry", notes: "",
  });

  const { data: res, loading, error, refetch } = useApi(
    () => flowerWasteApi.list(), []
  );
  const { data: summaryRes } = useApi(() => flowerWasteApi.summary(), []);
  const { data: variantsRes } = useApi(() => flowerMasterApi.variants(), []);
  const { mutate: logWaste, loading: logging } = useMutation((d: any) => flowerWasteApi.log(d));

  const logs: any[] = res?.data ?? [];
  const summary: any[] = summaryRes?.data ?? [];
  const variants: any[] = variantsRes?.data ?? [];

  const variantOptions = [
    { value: "", label: "اختر نوع الورد" },
    ...variants.filter((v: any) => v.isActive !== false).map((v: any) => ({
      value: v.id,
      label: v.displayNameAr ?? `${v.flowerType} - ${v.color}`,
    })),
  ];

  const handleSubmit = async () => {
    if (!form.variant_id || !form.quantity || Number(form.quantity) <= 0) {
      toast.error("نوع الورد والكمية مطلوبان");
      return;
    }
    await logWaste({
      variant_id: form.variant_id,
      batch_id: form.batch_id || undefined,
      quantity_type: form.quantity_type,
      quantity: Number(form.quantity),
      reason: form.reason,
      notes: form.notes || undefined,
    });
    toast.success("تم تسجيل الهدر");
    setShowForm(false);
    setForm({ variant_id: "", batch_id: "", quantity_type: "stems",
              quantity: "", reason: "natural_expiry", notes: "" });
    refetch();
  };

  if (loading) return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">هدر الورد</h1>
          <p className="text-xs text-gray-400">تتبع وتسجيل الهدر والتالف</p>
        </div>
      </div>
      <SummarySkeleton />
      <TableSkeleton />
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-9 h-9 text-red-400" />
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  const REASON_LABELS: Record<string, string> = {
    natural_expiry: "انتهاء الصلاحية", damage: "تلف",
    cutting_waste: "هدر تقطيع", transfer: "تحويل", other: "أخرى",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">هدر الورد</h1>
            <p className="text-xs text-gray-400">تتبع وتسجيل الهدر والتالف</p>
          </div>
        </div>
        <Button icon={Plus} onClick={() => setShowForm(true)}>تسجيل هدر</Button>
      </div>

      {/* Summary */}
      {summary.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">ملخص آخر 30 يوم</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summary.map((s: any) => (
              <div key={s.reason} className="bg-red-50/50 rounded-xl p-3">
                <p className="text-lg font-bold text-red-600">{s.total_stems_estimate}</p>
                <p className="text-xs text-gray-500">{REASON_LABELS[s.reason] ?? s.reason}</p>
                <p className="text-xs text-gray-400">{s.entries} تسجيل</p>
              </div>
            ))}
            {/* Cost Impact Card */}
            {(() => {
              const totalWasteCost = summary.reduce((sum: number, s: any) => {
                const qty = parseFloat(s.total_stems_estimate || "0");
                const cost = parseFloat(s.avg_unit_cost || "0");
                return sum + (qty * cost);
              }, 0);
              return totalWasteCost > 0 ? (
                <div className="bg-red-100/60 rounded-xl p-3 border border-red-200/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    <p className="text-xs font-medium text-red-600">القيمة المهدرة</p>
                  </div>
                  <p className="text-lg font-bold text-red-700">{totalWasteCost.toLocaleString("en-US", { maximumFractionDigits: 0 })} ر.س</p>
                  <p className="text-xs text-red-400">آخر 30 يوم</p>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Log table */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا يوجد هدر مسجل</h3>
          <p className="text-sm text-gray-400 mb-4">سجّل الهدر لتتبع خسائر المخزون بدقة</p>
          <Button icon={Plus} onClick={() => setShowForm(true)}>تسجيل هدر</Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[#eef2f6]">
              <tr>
                <th className="px-[10px] py-[6px] text-right font-semibold text-gray-500">الورد</th>
                <th className="px-[10px] py-[6px] text-right font-semibold text-gray-500">الكمية</th>
                <th className="px-[10px] py-[6px] text-right font-semibold text-gray-500">السبب</th>
                <th className="px-[10px] py-[6px] text-right font-semibold text-gray-500">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l: any) => (
                <tr key={l.id} className="border-t border-gray-50 hover:bg-[#f8fafc]/50 transition-colors">
                  <td className="px-[10px] py-[6px]">
                    <p className="font-medium text-gray-800">{l.variant_name ?? "—"}</p>
                    {l.batch_number && <p className="text-xs text-gray-400">{l.batch_number}</p>}
                  </td>
                  <td className="px-[10px] py-[6px]">
                    <span className="font-semibold text-red-600">{l.quantity}</span>
                    <span className="text-gray-400 text-xs mr-1">
                      {l.quantity_type === "stems" ? "ساق" : "بنش"}
                    </span>
                  </td>
                  <td className="px-[10px] py-[6px] text-gray-500">
                    {REASON_LABELS[l.reason] ?? l.reason}
                    {l.notes && <p className="text-xs text-gray-400">{l.notes}</p>}
                  </td>
                  <td className="px-[10px] py-[6px] text-gray-400 text-xs">
                    {new Date(l.created_at).toLocaleDateString("ar-SA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Waste Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="تسجيل هدر"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} loading={logging}>تسجيل</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            name="variant_id"
            label="نوع الورد"
            value={form.variant_id}
            onChange={e => setForm(f => ({ ...f, variant_id: e.target.value }))}
            options={variantOptions}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">وحدة الكمية</label>
              <div className="flex gap-2">
                {["stems", "bunches"].map(v => (
                  <button key={v}
                    onClick={() => setForm(f => ({ ...f, quantity_type: v }))}
                    className={clsx(
                      "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors",
                      form.quantity_type === v
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-white text-gray-600 border-[#eef2f6] hover:border-[#eef2f6]"
                    )}
                  >
                    {v === "stems" ? "ساق" : "بنش"}
                  </button>
                ))}
              </div>
            </div>
            <Input
              name="quantity"
              label="الكمية"
              type="number"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              required
            />
          </div>
          <Select
            name="reason"
            label="سبب الهدر"
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            options={REASONS}
          />
          <Input
            name="notes"
            label="ملاحظات (اختياري)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="تفاصيل إضافية..."
          />
        </div>
      </Modal>
    </div>
  );
}
