import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { flowerMasterApi } from "@/lib/api";
import {
  Flower2, Plus, X, AlertTriangle, RefreshCw,
  Package, TrendingDown, Clock, ChevronDown, Leaf,
} from "lucide-react";
import { clsx } from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Variant {
  id: string; flowerType: string; color: string; origin: string;
  grade: string; size: string; bloomStage: string;
  displayNameAr?: string; isActive: boolean;
}
interface Batch {
  id: string; variantId: string; batchNumber: string;
  quantityReceived: number; quantityRemaining: number;
  unitCost?: string; expiryEstimated: string;
  currentBloomStage: string; qualityStatus: string;
  notes?: string; daysUntilExpiry?: number;
  variant?: { displayNameAr?: string; flowerType?: string };
}
interface StockRow {
  variant_id: string; display_name_ar?: string; flower_type: string;
  total_remaining: string; batch_count: string; expiring_stock: string;
  avg_unit_cost?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const QUALITY_COLORS: Record<string, string> = {
  fresh: "bg-green-100 text-green-700",
  good: "bg-blue-100 text-blue-700",
  acceptable: "bg-yellow-100 text-yellow-700",
  expiring: "bg-orange-100 text-orange-700",
  expired: "bg-red-100 text-red-700",
  damaged: "bg-gray-100 text-gray-600",
};
const QUALITY_AR: Record<string, string> = {
  fresh: "طازج", good: "جيد", acceptable: "مقبول",
  expiring: "قارب الانتهاء", expired: "منتهي", damaged: "تالف",
};
const BLOOM_AR: Record<string, string> = {
  bud: "برعم", semi_open: "نصف مفتوح", open: "مفتوح", full_bloom: "مفتوح كلياً",
};

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function FlowerInventoryPage() {
  const [tab, setTab] = useState<"stock" | "batches" | "expiring">("stock");

  const { data: stockRes, loading: stockLoading, refetch: refetchStock } =
    useApi(() => flowerMasterApi.stockReport());
  const { data: batchesRes, loading: batchesLoading, refetch: refetchBatches } =
    useApi(() => flowerMasterApi.batches());
  const { data: expiringRes, loading: expiringLoading, refetch: refetchExpiring } =
    useApi(() => flowerMasterApi.batchesExpiring(7));
  const { data: variantsRes } = useApi(() => flowerMasterApi.variants());

  const stock: StockRow[] = stockRes?.data ?? [];
  const batches: Batch[] = batchesRes?.data ?? [];
  const expiring: Batch[] = expiringRes?.data ?? [];
  const variants: Variant[] = variantsRes?.data ?? [];

  const totalStems = stock.reduce((s, r) => s + parseInt(r.total_remaining || "0"), 0);
  const expiringCount = expiring.length;
  const lowStock = stock.filter(r => parseInt(r.total_remaining || "0") < 20);

  const refetchAll = () => { refetchStock(); refetchBatches(); refetchExpiring(); };

  // ─── Receive Batch Modal ───────────────────────────────────────────────────
  const [receiveModal, setReceiveModal] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    variantId: "", batchNumber: "", quantityReceived: "",
    unitCost: "", expiryEstimated: "", currentBloomStage: "bud", notes: "",
  });
  const receiveMut = useMutation((d: any) => flowerMasterApi.receiveBatch(d));
  const setR = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setReceiveForm(p => ({ ...p, [f]: e.target.value }));

  const saveReceive = async () => {
    if (!receiveForm.variantId || !receiveForm.quantityReceived || !receiveForm.expiryEstimated) return;
    await receiveMut.mutate({
      ...receiveForm,
      quantityReceived: parseInt(receiveForm.quantityReceived),
    });
    setReceiveModal(false);
    setReceiveForm({ variantId: "", batchNumber: "", quantityReceived: "", unitCost: "", expiryEstimated: "", currentBloomStage: "bud", notes: "" });
    refetchAll();
  };

  // ─── Consume Modal ─────────────────────────────────────────────────────────
  const [consumeModal, setConsumeModal] = useState(false);
  const [consumeForm, setConsumeForm] = useState({ variantId: "", quantity: "", reason: "" });
  const consumeMut = useMutation((d: any) => flowerMasterApi.consumeBatch(d));
  const setC = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setConsumeForm(p => ({ ...p, [f]: e.target.value }));

  const saveConsume = async () => {
    if (!consumeForm.variantId || !consumeForm.quantity) return;
    await consumeMut.mutate({ ...consumeForm, quantity: parseInt(consumeForm.quantity) });
    setConsumeModal(false);
    setConsumeForm({ variantId: "", quantity: "", reason: "" });
    refetchAll();
  };

  // ─── Update Batch Quality ──────────────────────────────────────────────────
  const updateQualityMut = useMutation(({ id, ...d }: any) => flowerMasterApi.updateBatch(id, d));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center">
            <Flower2 className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">مخزون الورد</h1>
            <p className="text-xs text-gray-400">إدارة الدفعات والمخزون الفعلي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetchAll}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setConsumeModal(true)}
            className="flex items-center gap-2 border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          >
            <TrendingDown className="w-4 h-4" />
            سحب مخزون
          </button>
          <button
            onClick={() => setReceiveModal(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            استلام دفعة
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center mb-3">
            <Flower2 className="w-4 h-4 text-pink-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{totalStems.toLocaleString("en-US")}</p>
          <p className="text-xs text-gray-400 mt-0.5">إجمالي السيقان</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{stock.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">نوع في المخزون</p>
        </div>
        <div className={clsx("bg-white rounded-2xl border p-4", expiringCount > 0 ? "border-amber-200" : "border-gray-100")}>
          <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", expiringCount > 0 ? "bg-amber-50" : "bg-gray-50")}>
            <Clock className={clsx("w-4 h-4", expiringCount > 0 ? "text-amber-500" : "text-gray-400")} />
          </div>
          <p className={clsx("text-2xl font-bold tabular-nums", expiringCount > 0 ? "text-amber-600" : "text-gray-900")}>{expiringCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">دفعة تنتهي خلال 7 أيام</p>
        </div>
        <div className={clsx("bg-white rounded-2xl border p-4", lowStock.length > 0 ? "border-red-200" : "border-gray-100")}>
          <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", lowStock.length > 0 ? "bg-red-50" : "bg-gray-50")}>
            <AlertTriangle className={clsx("w-4 h-4", lowStock.length > 0 ? "text-red-500" : "text-gray-400")} />
          </div>
          <p className={clsx("text-2xl font-bold tabular-nums", lowStock.length > 0 ? "text-red-600" : "text-gray-900")}>{lowStock.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">نوع مخزونه منخفض</p>
        </div>
      </div>

      {/* Expiry Alert */}
      {expiringCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {expiringCount} دفعة تنتهي خلال 7 أيام — تحقق من تبويب "قاربت الانتهاء" لمعالجتها بأولوية FEFO
          </p>
          <button
            onClick={() => setTab("expiring")}
            className="mr-auto text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1 rounded-lg font-medium transition-colors shrink-0"
          >
            عرض الدفعات
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {([
            { key: "stock",    label: "المخزون الحالي", icon: Package },
            { key: "batches",  label: "كل الدفعات",    icon: Leaf },
            { key: "expiring", label: "قاربت الانتهاء", icon: Clock },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                "flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                tab === key
                  ? "border-brand-500 text-brand-600 bg-brand-50/40"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === "expiring" && expiringCount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {expiringCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stock Tab */}
        {tab === "stock" && (
          <div>
            {stockLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">جارٍ التحميل...</div>
            ) : stock.length === 0 ? (
              <div className="p-12 text-center">
                <Flower2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">لا يوجد مخزون حالياً</p>
                <p className="text-xs text-gray-300 mt-1">استلم دفعة جديدة للبدء</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {stock.map((r) => {
                  const remaining = parseInt(r.total_remaining || "0");
                  const expiringQty = parseInt(r.expiring_stock || "0");
                  const batches = parseInt(r.batch_count || "0");
                  const isLow = remaining < 20;
                  return (
                    <div key={r.variant_id} className={clsx("px-5 py-4 flex items-center gap-4", isLow && "bg-red-50/30")}>
                      <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
                        <Flower2 className="w-5 h-5 text-pink-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {r.display_name_ar || r.flower_type}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {batches} دفعة
                          {expiringQty > 0 && (
                            <span className="text-amber-500 mr-2">· {expiringQty} ساق تنتهي قريباً</span>
                          )}
                        </p>
                      </div>
                      <div className="text-left shrink-0">
                        <p className={clsx("text-base font-bold tabular-nums", isLow ? "text-red-600" : "text-gray-900")}>
                          {remaining.toLocaleString("en-US")}
                          <span className="text-xs font-normal text-gray-400 mr-1">ساق</span>
                        </p>
                        {isLow && (
                          <span className="text-[10px] text-red-500 font-medium">مخزون منخفض</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* All Batches Tab */}
        {tab === "batches" && (
          <div>
            {batchesLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">جارٍ التحميل...</div>
            ) : batches.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">لا توجد دفعات</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {batches.map((b) => {
                  const days = b.daysUntilExpiry ?? 999;
                  const urgent = days <= 3;
                  const warning = days <= 7 && days > 3;
                  return (
                    <div key={b.id} className={clsx(
                      "px-5 py-4",
                      urgent ? "bg-red-50/30" : warning ? "bg-amber-50/30" : ""
                    )}>
                      <div className="flex items-start gap-3">
                        <div className={clsx(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                          urgent ? "bg-red-100" : warning ? "bg-amber-100" : "bg-pink-50"
                        )}>
                          <Flower2 className={clsx("w-4 h-4", urgent ? "text-red-500" : warning ? "text-amber-500" : "text-pink-400")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900">
                              {b.variant?.displayNameAr || b.variant?.flowerType || "—"}
                            </p>
                            <span className={clsx("text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0",
                              QUALITY_COLORS[b.qualityStatus] || "bg-gray-100 text-gray-600"
                            )}>
                              {QUALITY_AR[b.qualityStatus] || b.qualityStatus}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500">دفعة #{b.batchNumber}</span>
                            <span className="text-xs text-gray-400">مرحلة: {BLOOM_AR[b.currentBloomStage] || b.currentBloomStage}</span>
                            <span className={clsx("text-xs font-medium", urgent ? "text-red-600" : warning ? "text-amber-600" : "text-gray-500")}>
                              <Clock className="w-3 h-3 inline mr-0.5" />
                              {urgent ? `${days} أيام فقط` : warning ? `${days} أيام` : fmtDate(b.expiryEstimated)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <div>
                              <span className="text-xs text-gray-400">متبقي: </span>
                              <span className="text-xs font-bold text-gray-800 tabular-nums">{b.quantityRemaining.toLocaleString("en-US")} ساق</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">مستلم: </span>
                              <span className="text-xs text-gray-600 tabular-nums">{b.quantityReceived.toLocaleString("en-US")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <select
                            value={b.qualityStatus}
                            onChange={async (e) => {
                              await updateQualityMut.mutate({ id: b.id, qualityStatus: e.target.value });
                              refetchBatches();
                            }}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300"
                          >
                            {Object.entries(QUALITY_AR).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Expiring Tab */}
        {tab === "expiring" && (
          <div>
            {expiringLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">جارٍ التحميل...</div>
            ) : expiring.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">لا توجد دفعات تنتهي خلال 7 أيام</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {expiring.map((b) => {
                  const days = b.daysUntilExpiry ?? 0;
                  return (
                    <div key={b.id} className={clsx("px-5 py-4", days <= 1 ? "bg-red-50/40" : days <= 3 ? "bg-orange-50/30" : "bg-amber-50/20")}>
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold",
                          days <= 1 ? "bg-red-100 text-red-600" : days <= 3 ? "bg-orange-100 text-orange-600" : "bg-amber-100 text-amber-600"
                        )}>
                          {days}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {b.variant?.displayNameAr || b.variant?.flowerType || "—"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            دفعة #{b.batchNumber} · {b.quantityRemaining.toLocaleString("en-US")} ساق متبقية
                          </p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className={clsx("text-xs font-semibold",
                            days <= 1 ? "text-red-600" : days <= 3 ? "text-orange-600" : "text-amber-600"
                          )}>
                            {days === 0 ? "اليوم!" : `${days} ${days === 1 ? "يوم" : "أيام"}`}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {fmtDate(b.expiryEstimated)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Receive Batch Modal */}
      {receiveModal && (
        <Modal title="استلام دفعة جديدة" onClose={() => setReceiveModal(false)}>
          <div className="space-y-4">
            <Field label="نوع الوردة *">
              <select value={receiveForm.variantId} onChange={setR("variantId")} className={selectCls}>
                <option value="">اختر النوع</option>
                {variants.map(v => (
                  <option key={v.id} value={v.id}>{v.displayNameAr || v.flowerType}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="رقم الدفعة">
                <input value={receiveForm.batchNumber} onChange={setR("batchNumber")} placeholder="مثال: B-001" className={inputCls} />
              </Field>
              <Field label="الكمية المستلمة (سيقان) *">
                <input type="number" value={receiveForm.quantityReceived} onChange={setR("quantityReceived")} placeholder="مثال: 200" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="تكلفة الساق (ر.س)">
                <input type="number" step="0.01" value={receiveForm.unitCost} onChange={setR("unitCost")} placeholder="0.00" className={inputCls} />
              </Field>
              <Field label="مرحلة التفتح">
                <select value={receiveForm.currentBloomStage} onChange={setR("currentBloomStage")} className={selectCls}>
                  <option value="bud">برعم</option>
                  <option value="semi_open">نصف مفتوح</option>
                  <option value="open">مفتوح</option>
                  <option value="full_bloom">مفتوح كلياً</option>
                </select>
              </Field>
            </div>
            <Field label="تاريخ انتهاء الصلاحية المقدر *">
              <input type="datetime-local" value={receiveForm.expiryEstimated} onChange={setR("expiryEstimated")} className={inputCls} />
            </Field>
            <Field label="ملاحظات">
              <textarea value={receiveForm.notes} onChange={setR("notes")} rows={2} placeholder="أي ملاحظات إضافية..." className={inputCls} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setReceiveModal(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
                إلغاء
              </button>
              <button
                onClick={saveReceive}
                disabled={receiveMut.loading}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {receiveMut.loading ? "جارٍ الحفظ..." : "تأكيد الاستلام"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Consume Modal */}
      {consumeModal && (
        <Modal title="سحب من المخزون (FEFO)" onClose={() => setConsumeModal(false)}>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
              سيتم الخصم تلقائياً من أقدم الدفعات أولاً (FEFO)
            </div>
            <Field label="نوع الوردة *">
              <select value={consumeForm.variantId} onChange={setC("variantId")} className={selectCls}>
                <option value="">اختر النوع</option>
                {stock.map(r => (
                  <option key={r.variant_id} value={r.variant_id}>
                    {r.display_name_ar || r.flower_type} — {parseInt(r.total_remaining).toLocaleString("en-US")} ساق متاحة
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الكمية المسحوبة (سيقان) *">
              <input type="number" value={consumeForm.quantity} onChange={setC("quantity")} placeholder="مثال: 50" className={inputCls} />
            </Field>
            <Field label="سبب السحب">
              <input value={consumeForm.reason} onChange={setC("reason")} placeholder="مثال: تنسيق طلب رقم 123" className={inputCls} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConsumeModal(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
                إلغاء
              </button>
              <button
                onClick={saveConsume}
                disabled={consumeMut.loading}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {consumeMut.loading ? "جارٍ السحب..." : "تأكيد السحب"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const selectCls = `${inputCls} bg-white appearance-none`;
