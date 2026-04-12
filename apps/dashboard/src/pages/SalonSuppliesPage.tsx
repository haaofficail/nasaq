import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { salonApi } from "@/lib/api";
import {
  Package, AlertTriangle, Plus, ChevronUp,
  ArrowUp, ArrowDown, History, X, Check, Pencil,
} from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";
import {
  SALON_SUPPLY_CATEGORIES as CATEGORIES,
  SALON_SUPPLY_UNITS as UNITS,
  SALON_SUPPLY_REASONS as REASONS,
} from "@/lib/constants";

// ============================================================
// Add / Edit Modal
// ============================================================
function SupplyFormModal({
  initial, onClose, onSave,
}: {
  initial?: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name:        initial?.name || "",
    category:    initial?.category || "general",
    unit:        initial?.unit || "piece",
    quantity:    initial?.quantity || "0",
    minQuantity: initial?.minQuantity || "0",
    costPerUnit: initial?.costPerUnit || "",
    notes:       initial?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const isValid = form.name.trim().length > 0
    && parseFloat(form.quantity) >= 0
    && parseFloat(form.minQuantity) >= 0;

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{initial ? "تعديل مستلزم" : "إضافة مستلزم"}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">الاسم</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="مثال: صبغة لوريال"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">الفئة</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                value={form.category}
                onChange={e => set("category", e.target.value)}
              >
                {Object.entries(CATEGORIES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">الوحدة</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                value={form.unit}
                onChange={e => set("unit", e.target.value)}
              >
                {Object.entries(UNITS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">الكمية الحالية</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                value={form.quantity}
                onChange={e => set("quantity", e.target.value)}
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">الحد الأدنى</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                value={form.minQuantity}
                onChange={e => set("minQuantity", e.target.value)}
                min="0"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">التكلفة للوحدة (ر.س) — اختياري</label>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={form.costPerUnit}
              onChange={e => set("costPerUnit", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">ملاحظات</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
            />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium disabled:opacity-40"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Adjust Modal
// ============================================================
function AdjustModal({
  supply, onClose, onSave,
}: {
  supply: any;
  onClose: () => void;
  onSave: (delta: string, reason: string, notes?: string) => Promise<void>;
}) {
  const [type, setType] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("restock");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return;
    const delta = type === "add" ? amount : `-${amount}`;
    onSave(delta, reason, notes || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">تعديل المخزون</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">
            {supply.name} — الحالي: <strong>{parseFloat(supply.quantity).toFixed(1)} {UNITS[supply.unit] || supply.unit}</strong>
          </p>
          {/* Add / Remove toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            <button
              className={clsx("flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1",
                type === "add" ? "bg-green-500 text-white" : "text-gray-500 hover:bg-gray-50")}
              onClick={() => { setType("add"); setReason("restock"); }}
            >
              <ArrowUp className="w-4 h-4" /> إضافة
            </button>
            <button
              className={clsx("flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1",
                type === "remove" ? "bg-red-500 text-white" : "text-gray-500 hover:bg-gray-50")}
              onClick={() => { setType("remove"); setReason("consumed"); }}
            >
              <ArrowDown className="w-4 h-4" /> استهلاك
            </button>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">الكمية</label>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              min="0.01"
              step="0.01"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">السبب</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
              value={reason}
              onChange={e => setReason(e.target.value)}
            >
              {REASONS.filter(r => type === "add" ? ["restock", "return", "manual"].includes(r.value) : ["consumed", "waste", "manual"].includes(r.value))
                .map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">ملاحظات</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="اختياري"
            />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={!amount}
            className={clsx("px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-40",
              type === "add" ? "bg-green-500" : "bg-red-500")}
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Supply History — يُجلب عند التوسع فقط
// ============================================================
const REASON_LABELS: Record<string, string> = Object.fromEntries(
  REASONS.map(r => [r.value, r.label])
);

function SupplyHistoryPanel({ supplyId }: { supplyId: string }) {
  const { data, loading } = useApi(() => salonApi.getSupply(supplyId), [supplyId]);
  const history: any[] = data?.data?.history ?? [];

  if (loading) return <p className="text-xs text-gray-300 py-2 text-center">جارٍ التحميل...</p>;
  if (history.length === 0) return <p className="text-xs text-gray-300 py-2 text-center">لا يوجد سجل تعديلات</p>;

  return (
    <div className="divide-y divide-gray-50">
      {history.map((h: any) => {
        const delta = parseFloat(h.delta);
        const isPos = delta > 0;
        return (
          <div key={h.id} className="flex items-center justify-between py-2 px-4 gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600">{REASON_LABELS[h.reason] ?? h.reason}</p>
              {h.notes && <p className="text-xs text-gray-400 truncate">{h.notes}</p>}
            </div>
            <span className={clsx("text-xs font-bold tabular-nums shrink-0", isPos ? "text-green-600" : "text-red-500")}>
              {isPos ? "+" : ""}{delta.toFixed(1)}
            </span>
            <span className="text-xs text-gray-300 shrink-0 w-16 text-left">
              {new Date(h.createdAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
export function SalonSuppliesPage() {
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [adjustItem, setAdjustItem] = useState<any | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, loading, refetch } = useApi(
    () => salonApi.supplies({ category: filterCategory || undefined, lowStock: showLowOnly || undefined }),
    [filterCategory, showLowOnly]
  );
  const { data: lowData, refetch: refetchLow } = useApi(() => salonApi.lowStock(), []);

  const supplies: any[] = data?.data || [];
  const lowCount: number = lowData?.count || 0;

  const refresh = () => { refetch(); refetchLow(); };

  const { mutate: createSupply, loading: creating } = useMutation(
    (body: any) => salonApi.createSupply(body)
  );
  const { mutate: updateSupply } = useMutation(
    ({ id, body }: { id: string; body: any }) => salonApi.updateSupply(id, body)
  );
  const { mutate: adjustSupply } = useMutation(
    ({ id, delta, reason, notes }: { id: string; delta: string; reason: string; notes?: string }) =>
      salonApi.adjust(id, delta, reason, notes)
  );
  const { mutate: deleteSupply } = useMutation(
    (id: string) => salonApi.deleteSupply(id)
  );

  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const s of supplies) {
    const cat = s.category || "general";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-500" /> المستلزمات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">المواد الاستهلاكية للصالون</p>
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600"
        >
          <Plus className="w-4 h-4" /> إضافة
        </button>
      </div>

      {/* Low stock alert */}
      {lowCount > 0 && (
        <button
          onClick={() => setShowLowOnly(!showLowOnly)}
          className={clsx(
            "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium transition-colors",
            showLowOnly
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          )}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{lowCount} مستلزم وصل للحد الأدنى</span>
          <span className="mr-auto text-xs">{showLowOnly ? "عرض الكل" : "عرض المنخفضة فقط"}</span>
        </button>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory("")}
          className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium border",
            !filterCategory ? "bg-brand-500 text-white border-brand-500" : "border-gray-200 text-gray-600 hover:bg-gray-50")}
        >
          الكل
        </button>
        {Object.entries(CATEGORIES).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilterCategory(v === filterCategory ? "" : v)}
            className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium border",
              filterCategory === v ? "bg-brand-500 text-white border-brand-500" : "border-gray-200 text-gray-600 hover:bg-gray-50")}
          >
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <SkeletonRows />
      ) : supplies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">لا توجد مستلزمات</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {CATEGORIES[cat] || cat}
              </p>
              <div className="space-y-2">
                {items.map(supply => {
                  const qty = parseFloat(supply.quantity);
                  const min = parseFloat(supply.minQuantity);
                  const isLow = qty <= min;
                  const isExpanded = expandedId === supply.id;

                  return (
                    <div key={supply.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Quantity indicator */}
                        <div className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                          isLow ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"
                        )}>
                          {qty.toFixed(0)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{supply.name}</p>
                          <p className="text-xs text-gray-400">
                            {UNITS[supply.unit] || supply.unit} · حد أدنى: {min.toFixed(0)}
                            {supply.costPerUnit ? ` · ${parseFloat(supply.costPerUnit).toFixed(2)} ر.س/وحدة` : ""}
                          </p>
                        </div>

                        {/* Status badge */}
                        {isLow && (
                          <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium shrink-0">
                            منخفض
                          </span>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setAdjustItem(supply)}
                            className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-100 text-xs font-bold"
                            title="تعديل الكمية"
                          >
                            ±
                          </button>
                          <button
                            onClick={() => setEditItem(supply)}
                            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50"
                            title="تعديل"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : supply.id)}
                            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 flex items-center justify-center hover:bg-gray-50"
                            title="السجل"
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <History className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Stock bar */}
                      {min > 0 && (
                        <div className="px-4 pb-3">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={clsx("h-full rounded-full transition-all", isLow ? "bg-red-400" : "bg-green-400")}
                              style={{ width: `${Math.min(100, (qty / (min * 2)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Adjustment history */}
                      {isExpanded && (
                        <div className="border-t border-gray-50 bg-gray-50/40">
                          <p className="text-xs font-semibold text-gray-400 px-4 pt-3 pb-1">سجل التعديلات</p>
                          <SupplyHistoryPanel supplyId={supply.id} />
                          <div className="h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {addModal && (
        <SupplyFormModal
          onClose={() => setAddModal(false)}
          onSave={async body => { await createSupply(body); setAddModal(false); refresh(); }}
        />
      )}

      {/* Edit Modal */}
      {editItem && (
        <SupplyFormModal
          initial={editItem}
          onClose={() => setEditItem(null)}
          onSave={async body => { await updateSupply({ id: editItem.id, body }); setEditItem(null); refresh(); }}
        />
      )}

      {/* Adjust Modal */}
      {adjustItem && (
        <AdjustModal
          supply={adjustItem}
          onClose={() => setAdjustItem(null)}
          onSave={async (delta, reason, notes) => { await adjustSupply({ id: adjustItem.id, delta, reason, notes }); setAdjustItem(null); refresh(); }}
        />
      )}
    </div>
  );
}
