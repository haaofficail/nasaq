import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { flowerMasterApi } from "@/lib/api";
import {
  Flower2, Plus, X, Search, AlertTriangle,
  RefreshCw, ChevronDown, Leaf, Tag, BarChart3, Database,
} from "lucide-react";
import { clsx } from "clsx";

// ─── Types
interface Variant {
  id: string; flowerType: string; color: string; origin: string;
  grade: string; size: string; bloomStage: string;
  displayNameAr?: string; basePricePerStem?: string;
  shelfLifeDays?: number; isActive: boolean;
  originPriceMultiplier?: string; gradePriceMultiplier?: string;
}
interface Batch {
  id: string; variantId: string; batchNumber: string; quantityReceived: number;
  quantityRemaining: number; unitCost?: string; expiryEstimated: string;
  currentBloomStage: string; qualityStatus: string; notes?: string;
  daysUntilExpiry?: number; variant?: { displayNameAr?: string; flowerType?: string };
}
interface Pricing {
  id: string; variantId: string; pricePerStem: string;
  costPerStem?: string; markupPercent?: string; notes?: string;
}
interface Substitution {
  id: string; primaryVariantId: string; substituteVariantId: string;
  gradeDirection: string; compatibilityScore: number;
  priceAdjustmentPercent?: string; isAutoAllowed: boolean; notes?: string;
}

// ─── Helpers
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
const GRADE_DIRECTION_AR: Record<string, string> = { up: "ترقية", same: "مماثل", down: "تخفيض" };

function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={clsx("bg-white rounded-2xl shadow-2xl w-full", wide ? "max-w-2xl" : "max-w-lg")}>
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

// ─── Tab: الأصناف (Variants)
function VariantsTab() {
  const { data: enumsData } = useApi(() => flowerMasterApi.enums());
  const { data, loading, refetch } = useApi(() => flowerMasterApi.variants());
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [modal, setModal] = useState<{ open: boolean; item?: Variant }>({ open: false });
  const [form, setForm] = useState({
    flowerType: "rose", color: "red", origin: "netherlands", grade: "premium",
    size: "large", bloomStage: "bud", displayNameAr: "", basePricePerStem: "",
    shelfLifeDays: 7, notesAr: "", isActive: true,
  });

  const createMut  = useMutation((d: any) => flowerMasterApi.createVariant(d));
  const updateMut  = useMutation((d: any) => flowerMasterApi.updateVariant(modal.item!.id, d));
  const toggleMut  = useMutation((id: string) => flowerMasterApi.toggleVariant(id));

  const enums = enumsData?.data;
  const variants: Variant[] = data?.data ?? [];

  const filtered = variants.filter((v) => {
    const nameMatch = !search || (v.displayNameAr ?? "").includes(search) || v.flowerType.includes(search);
    const typeMatch = filterType === "all" || v.flowerType === filterType;
    const gradeMatch = filterGrade === "all" || v.grade === filterGrade;
    return nameMatch && typeMatch && gradeMatch;
  });

  const openCreate = () => {
    setForm({ flowerType: "rose", color: "red", origin: "netherlands", grade: "premium",
              size: "large", bloomStage: "bud", displayNameAr: "", basePricePerStem: "",
              shelfLifeDays: 7, notesAr: "", isActive: true });
    setModal({ open: true });
  };
  const openEdit = (v: Variant) => {
    setForm({ flowerType: v.flowerType, color: v.color, origin: v.origin, grade: v.grade,
              size: v.size, bloomStage: v.bloomStage, displayNameAr: v.displayNameAr ?? "",
              basePricePerStem: v.basePricePerStem ?? "", shelfLifeDays: v.shelfLifeDays ?? 7,
              notesAr: "", isActive: v.isActive });
    setModal({ open: true, item: v });
  };

  const save = async () => {
    const payload = { ...form, basePricePerStem: form.basePricePerStem || "0" };
    if (modal.item) { await updateMut.mutate(payload); }
    else             { await createMut.mutate(payload); }
    setModal({ open: false });
    refetch();
  };

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..."
            className="input pr-9 text-sm" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input text-sm w-40">
          <option value="all">كل الأنواع</option>
          {enums?.flowerTypes?.map((t: any) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="input text-sm w-36">
          <option value="all">كل الدرجات</option>
          {enums?.grades?.map((g: any) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">
          <Plus className="w-4 h-4" /> صنف جديد
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">جارٍ التحميل...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["الصنف","اللون","المنشأ","الدرجة","المرحلة","السعر الأساسي","الصلاحية","الحالة",""].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">لا توجد أصناف</td></tr>
              ) : filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div>{v.displayNameAr ?? v.flowerType}</div>
                    <div className="text-xs text-gray-400">{v.size}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.color}</td>
                  <td className="px-4 py-3 text-gray-600">{v.origin}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium",
                      v.grade === "premium_plus" ? "bg-purple-100 text-purple-700" :
                      v.grade === "premium" ? "bg-blue-100 text-blue-700" :
                      v.grade === "grade_a" ? "bg-green-100 text-green-700" :
                      v.grade === "grade_b" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
                    )}>{v.grade}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{BLOOM_AR[v.bloomStage] ?? v.bloomStage}</td>
                  <td className="px-4 py-3 font-medium">{v.basePricePerStem ? `${v.basePricePerStem} ر.س` : "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{v.shelfLifeDays} يوم</td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs",
                      v.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>{v.isActive ? "نشط" : "غير نشط"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(v)}
                        className="text-xs text-blue-600 hover:underline px-2 py-1">تعديل</button>
                      <button onClick={async () => { await toggleMut.mutate(v.id); refetch(); }}
                        className="text-xs text-gray-500 hover:underline px-2 py-1">
                        {v.isActive ? "تعطيل" : "تفعيل"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <Modal title={modal.item ? "تعديل صنف" : "صنف جديد"} onClose={() => setModal({ open: false })} wide>
          <div className="grid grid-cols-2 gap-4">
            <Field label="نوع الوردة">
              <select value={form.flowerType} onChange={set("flowerType")} className="input text-sm">
                {enums?.flowerTypes?.map((t: any) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="اللون">
              <select value={form.color} onChange={set("color")} className="input text-sm">
                {enums?.colors?.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="المنشأ">
              <select value={form.origin} onChange={set("origin")} className="input text-sm">
                {enums?.origins?.map((o: any) => (
                  <option key={o.value} value={o.value}>{o.label} (×{o.multiplier})</option>
                ))}
              </select>
            </Field>
            <Field label="الدرجة">
              <select value={form.grade} onChange={set("grade")} className="input text-sm">
                {enums?.grades?.map((g: any) => (
                  <option key={g.value} value={g.value}>{g.label} (×{g.multiplier})</option>
                ))}
              </select>
            </Field>
            <Field label="الحجم">
              <select value={form.size} onChange={set("size")} className="input text-sm">
                {enums?.sizes?.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="مرحلة التفتح">
              <select value={form.bloomStage} onChange={set("bloomStage")} className="input text-sm">
                {enums?.bloomStages?.map((b: any) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </Field>
            <Field label="السعر الأساسي / ساق (ر.س)">
              <input type="number" step="0.01" value={form.basePricePerStem} onChange={set("basePricePerStem")}
                className="input text-sm" placeholder="0.00" />
            </Field>
            <Field label="مدة الصلاحية (أيام)">
              <input type="number" value={form.shelfLifeDays}
                onChange={(e) => setForm((p) => ({ ...p, shelfLifeDays: parseInt(e.target.value) || 7 }))}
                className="input text-sm" />
            </Field>
            <div className="col-span-2">
              <Field label="الاسم المعروض (اختياري — يُحسب تلقائياً)">
                <input value={form.displayNameAr} onChange={set("displayNameAr")} className="input text-sm"
                  placeholder="مثال: وردة حمراء هولندية ممتازة" />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="ملاحظات">
                <input value={form.notesAr} onChange={set("notesAr")} className="input text-sm" />
              </Field>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={save}
              className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand-600">
              {modal.item ? "حفظ التعديلات" : "إنشاء الصنف"}
            </button>
            <button onClick={() => setModal({ open: false })}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
              إلغاء
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab: الدُفعات (Batches — FEFO)
function BatchesTab() {
  const { data: variantsData } = useApi(() => flowerMasterApi.variants());
  const { data, loading, refetch } = useApi(() => flowerMasterApi.batches());
  const { data: expiringData, refetch: refetchExpiring } = useApi(() => flowerMasterApi.batchesExpiring(3));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    variantId: "", quantityReceived: "", unitCost: "",
    expiryEstimated: "", currentBloomStage: "bud", notes: "",
  });

  const createMut  = useMutation((d: any) => flowerMasterApi.receiveBatch(d));
  const updateMut  = useMutation(({ id, ...d }: any) => flowerMasterApi.updateBatch(id, d));

  const batches: Batch[]   = data?.data ?? [];
  const expiring: Batch[]  = expiringData?.data ?? [];
  const variants: Variant[] = variantsData?.data ?? [];

  const save = async () => {
    if (!form.variantId || !form.quantityReceived || !form.expiryEstimated) return;
    await createMut.mutate({ ...form, quantityReceived: parseInt(form.quantityReceived) });
    setModal(false);
    refetch();
    refetchExpiring();
  };

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  return (
    <div>
      {/* Expiring alert */}
      {expiring.length > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">{expiring.length} دفعات تنتهي خلال 3 أيام</p>
            <p className="text-xs text-orange-600 mt-0.5">
              {expiring.slice(0, 3).map((b) =>
                `${b.variant?.displayNameAr ?? b.variantId} (${b.quantityRemaining} ساق)`)
              .join(" • ")}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button onClick={() => setModal(true)}
          className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">
          <Plus className="w-4 h-4" /> استلام دُفعة
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">جارٍ التحميل...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-500 font-medium">مرتبة حسب FEFO — الأقدم أولاً</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["رقم الدُفعة","الصنف","المستلم","المتبقي","التكلفة","انتهاء الصلاحية","مرحلة التفتح","الجودة",""].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">لا توجد دُفعات</td></tr>
              ) : batches.map((b) => (
                <tr key={b.id} className={clsx("hover:bg-gray-50", b.daysUntilExpiry !== undefined && b.daysUntilExpiry <= 3 && "bg-orange-50")}>
                  <td className="px-4 py-3 font-mono text-xs">{b.batchNumber}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {b.variant?.displayNameAr ?? b.variantId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.quantityReceived} ساق</td>
                  <td className="px-4 py-3 font-semibold">{b.quantityRemaining} ساق</td>
                  <td className="px-4 py-3 text-gray-600">{b.unitCost ? `${b.unitCost} ر.س` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className={clsx("text-sm", b.daysUntilExpiry !== undefined && b.daysUntilExpiry <= 1 ? "text-red-600 font-bold" : b.daysUntilExpiry !== undefined && b.daysUntilExpiry <= 3 ? "text-orange-600 font-medium" : "text-gray-600")}>
                      {new Date(b.expiryEstimated).toLocaleDateString("ar-SA")}
                    </div>
                    {b.daysUntilExpiry !== undefined && (
                      <div className="text-xs text-gray-400">
                        {b.daysUntilExpiry > 0 ? `${b.daysUntilExpiry} يوم` : "منتهي"}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{BLOOM_AR[b.currentBloomStage] ?? b.currentBloomStage}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", QUALITY_COLORS[b.qualityStatus] ?? "bg-gray-100 text-gray-600")}>
                      {QUALITY_AR[b.qualityStatus] ?? b.qualityStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={b.qualityStatus}
                      onChange={async (e) => {
                        await updateMut.mutate({ id: b.id, qualityStatus: e.target.value });
                        refetch();
                      }}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                    >
                      {["fresh","good","acceptable","expiring","expired","damaged"].map((q) => (
                        <option key={q} value={q}>{QUALITY_AR[q]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title="استلام دُفعة جديدة" onClose={() => setModal(false)}>
          <div className="space-y-3">
            <Field label="الصنف">
              <select value={form.variantId} onChange={set("variantId")} className="input text-sm">
                <option value="">اختر الصنف</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.displayNameAr ?? v.flowerType}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الكمية المستلمة (ساق)">
                <input type="number" value={form.quantityReceived} onChange={set("quantityReceived")}
                  className="input text-sm" placeholder="100" />
              </Field>
              <Field label="تكلفة الساق (ر.س)">
                <input type="number" step="0.01" value={form.unitCost} onChange={set("unitCost")}
                  className="input text-sm" placeholder="0.00" />
              </Field>
            </div>
            <Field label="تاريخ انتهاء الصلاحية المتوقع">
              <input type="datetime-local" value={form.expiryEstimated} onChange={set("expiryEstimated")}
                className="input text-sm" />
            </Field>
            <Field label="مرحلة التفتح عند الاستلام">
              <select value={form.currentBloomStage} onChange={set("currentBloomStage")} className="input text-sm">
                {Object.entries(BLOOM_AR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="ملاحظات">
              <textarea value={form.notes} onChange={set("notes")} rows={2} className="input text-sm" />
            </Field>
            <div className="flex gap-3 mt-4">
              <button onClick={save}
                className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand-600">
                تسجيل الاستلام
              </button>
              <button onClick={() => setModal(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab: التسعير (Pricing)
function PricingTab() {
  const { data: variantsData } = useApi(() => flowerMasterApi.variants());
  const { data, loading, refetch } = useApi(() => flowerMasterApi.pricing());
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ variantId: "", pricePerStem: "", costPerStem: "", notes: "" });

  const createMut = useMutation((d: any) => flowerMasterApi.setPrice(d));
  const deleteMut = useMutation((id: string) => flowerMasterApi.deletePrice(id));

  const pricingRows: Pricing[] = data?.data ?? [];
  const variants: Variant[] = variantsData?.data ?? [];
  const pricedIds = new Set(pricingRows.map((p) => p.variantId));
  const unpricedVariants = variants.filter((v) => !pricedIds.has(v.id));

  const save = async () => {
    if (!form.variantId || !form.pricePerStem) return;
    await createMut.mutate(form);
    setModal(false);
    refetch();
  };

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const getVariantName = (id: string) =>
    variants.find((v) => v.id === id)?.displayNameAr ?? id.slice(0, 8);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm({ variantId: "", pricePerStem: "", costPerStem: "", notes: "" }); setModal(true); }}
          className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">
          <Plus className="w-4 h-4" /> تسعير صنف
        </button>
      </div>

      {unpricedVariants.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-700">{unpricedVariants.length} صنف لم يُسعَّر بعد</p>
        </div>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">جارٍ التحميل...</div> : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["الصنف","سعر البيع / ساق","التكلفة / ساق","هامش الربح","ملاحظات",""].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pricingRows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">لا يوجد تسعير مضاف</td></tr>
              ) : pricingRows.map((p) => {
                const margin = p.costPerStem && p.pricePerStem
                  ? (((parseFloat(p.pricePerStem) - parseFloat(p.costPerStem)) / parseFloat(p.pricePerStem)) * 100).toFixed(1)
                  : null;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{getVariantName(p.variantId)}</td>
                    <td className="px-4 py-3 font-bold text-brand-600">{p.pricePerStem} ر.س</td>
                    <td className="px-4 py-3 text-gray-600">{p.costPerStem ? `${p.costPerStem} ر.س` : "—"}</td>
                    <td className="px-4 py-3">
                      {margin ? (
                        <span className={clsx("text-xs font-medium", parseFloat(margin) >= 30 ? "text-green-600" : parseFloat(margin) >= 15 ? "text-yellow-600" : "text-red-600")}>
                          {margin}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={async () => { await deleteMut.mutate(p.id); refetch(); }}
                        className="text-xs text-red-500 hover:underline">حذف</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title="تسعير صنف" onClose={() => setModal(false)}>
          <div className="space-y-3">
            <Field label="الصنف">
              <select value={form.variantId} onChange={set("variantId")} className="input text-sm">
                <option value="">اختر الصنف</option>
                {variants.map((v) => <option key={v.id} value={v.id}>{v.displayNameAr ?? v.flowerType}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="سعر البيع / ساق (ر.س)">
                <input type="number" step="0.01" value={form.pricePerStem} onChange={set("pricePerStem")}
                  className="input text-sm" placeholder="0.00" />
              </Field>
              <Field label="التكلفة / ساق (ر.س) — اختياري">
                <input type="number" step="0.01" value={form.costPerStem} onChange={set("costPerStem")}
                  className="input text-sm" placeholder="0.00" />
              </Field>
            </div>
            <Field label="ملاحظات">
              <input value={form.notes} onChange={set("notes")} className="input text-sm" />
            </Field>
            <div className="flex gap-3 mt-4">
              <button onClick={save}
                className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand-600">
                حفظ السعر
              </button>
              <button onClick={() => setModal(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab: البدائل (Substitutions)
function SubstitutionsTab() {
  const { data: variantsData } = useApi(() => flowerMasterApi.variants());
  const { data, loading, refetch } = useApi(() => flowerMasterApi.substitutions());
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    primaryVariantId: "", substituteVariantId: "",
    gradeDirection: "same", compatibilityScore: 7,
    isAutoAllowed: false, notes: "",
  });

  const createMut = useMutation((d: any) => flowerMasterApi.createSubstitution(d));
  const deleteMut = useMutation((id: string) => flowerMasterApi.deleteSubstitution(id));

  const subs: Substitution[] = data?.data ?? [];
  const variants: Variant[] = variantsData?.data ?? [];
  const getVariantName = (id: string) => variants.find((v) => v.id === id)?.displayNameAr ?? id.slice(0, 8);

  const save = async () => {
    if (!form.primaryVariantId || !form.substituteVariantId) return;
    await createMut.mutate(form);
    setModal(false);
    refetch();
  };

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm({ primaryVariantId: "", substituteVariantId: "", gradeDirection: "same", compatibilityScore: 7, isAutoAllowed: false, notes: "" }); setModal(true); }}
          className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">
          <Plus className="w-4 h-4" /> بديل جديد
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">جارٍ التحميل...</div> : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["الصنف الأصلي","البديل","اتجاه الدرجة","درجة التوافق","آلية",""].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">لا توجد بدائل مضافة</td></tr>
              ) : subs.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{getVariantName(s.primaryVariantId)}</td>
                  <td className="px-4 py-3 text-blue-700 font-medium">{getVariantName(s.substituteVariantId)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs",
                      s.gradeDirection === "up" ? "bg-green-100 text-green-700" :
                      s.gradeDirection === "down" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                    )}>{GRADE_DIRECTION_AR[s.gradeDirection] ?? s.gradeDirection}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${s.compatibilityScore * 10}%` }} />
                      </div>
                      <span className="text-xs text-gray-600">{s.compatibilityScore}/10</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-xs", s.isAutoAllowed ? "text-green-600" : "text-gray-400")}>
                      {s.isAutoAllowed ? "تلقائي" : "يدوي"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={async () => { await deleteMut.mutate(s.id); refetch(); }}
                      className="text-xs text-red-500 hover:underline">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title="إضافة بديل" onClose={() => setModal(false)}>
          <div className="space-y-3">
            <Field label="الصنف الأصلي">
              <select value={form.primaryVariantId} onChange={set("primaryVariantId")} className="input text-sm">
                <option value="">اختر</option>
                {variants.map((v) => <option key={v.id} value={v.id}>{v.displayNameAr ?? v.flowerType}</option>)}
              </select>
            </Field>
            <Field label="البديل">
              <select value={form.substituteVariantId} onChange={set("substituteVariantId")} className="input text-sm">
                <option value="">اختر</option>
                {variants.filter((v) => v.id !== form.primaryVariantId).map((v) => (
                  <option key={v.id} value={v.id}>{v.displayNameAr ?? v.flowerType}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="اتجاه الدرجة">
                <select value={form.gradeDirection} onChange={set("gradeDirection")} className="input text-sm">
                  <option value="up">ترقية (أفضل)</option>
                  <option value="same">مماثل</option>
                  <option value="down">تخفيض (أدنى)</option>
                </select>
              </Field>
              <Field label="درجة التوافق (1-10)">
                <input type="number" min="1" max="10" value={form.compatibilityScore}
                  onChange={(e) => setForm((p) => ({ ...p, compatibilityScore: parseInt(e.target.value) || 7 }))}
                  className="input text-sm" />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isAutoAllowed}
                onChange={(e) => setForm((p) => ({ ...p, isAutoAllowed: e.target.checked }))}
                id="autoAllowed" className="rounded" />
              <label htmlFor="autoAllowed" className="text-sm text-gray-700">السماح بالاستبدال التلقائي</label>
            </div>
            <Field label="ملاحظات">
              <input value={form.notes} onChange={set("notes")} className="input text-sm" />
            </Field>
            <div className="flex gap-3 mt-4">
              <button onClick={save}
                className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand-600">
                إضافة البديل
              </button>
              <button onClick={() => setModal(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab: التقارير (Reports)
function ReportsTab() {
  const { data: stockData, loading: stockLoading }       = useApi(() => flowerMasterApi.reportStock());
  const { data: originsData, loading: originsLoading }   = useApi(() => flowerMasterApi.reportOrigins());
  const { data: gradesData, loading: gradesLoading }     = useApi(() => flowerMasterApi.reportGrades());

  const stockRows = stockData?.data ?? [];
  const originRows = originsData?.data ?? [];
  const gradeRows = gradesData?.data ?? [];
  const totalStock = stockRows.reduce((s: number, r: any) => s + parseInt(r.total_remaining || 0), 0);
  const totalExpiring = stockRows.reduce((s: number, r: any) => s + parseInt(r.expiring_stock || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">إجمالي المخزون</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalStock.toLocaleString("ar")} ساق</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">أصناف نشطة</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stockRows.length}</p>
        </div>
        <div className={clsx("rounded-2xl border p-4", totalExpiring > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200")}>
          <p className="text-xs text-gray-500">تنتهي صلاحيتها قريباً</p>
          <p className={clsx("text-2xl font-bold mt-1", totalExpiring > 0 ? "text-orange-600" : "text-gray-900")}>{totalExpiring.toLocaleString("ar")} ساق</p>
        </div>
      </div>

      {/* Stock by variant */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">المخزون حسب الصنف</h3>
        </div>
        {stockLoading ? <div className="p-6 text-center text-gray-400">جارٍ التحميل...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["الصنف","المتبقي","جيد","قارب الانتهاء","دفعات نشطة","أقرب انتهاء"].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stockRows.slice(0, 15).map((r: any) => (
                <tr key={r.variant_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.display_name}</td>
                  <td className="px-4 py-3 font-bold">{r.total_remaining}</td>
                  <td className="px-4 py-3 text-green-600">{r.good_stock}</td>
                  <td className="px-4 py-3 text-orange-500">{r.expiring_stock}</td>
                  <td className="px-4 py-3 text-gray-500">{r.active_batches}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {r.next_expiry ? new Date(r.next_expiry).toLocaleDateString("ar-SA") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Origin + Grade side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">تحليل المنشأ</h3>
          </div>
          {originsLoading ? <div className="p-6 text-center text-gray-400">...</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["المنشأ","المخزون","متوسط التكلفة","القيمة"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {originRows.map((r: any) => (
                  <tr key={r.origin} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.origin}</td>
                    <td className="px-4 py-3">{r.total_stock} ساق</td>
                    <td className="px-4 py-3 text-gray-600">{parseFloat(r.avg_unit_cost || 0).toFixed(2)} ر.س</td>
                    <td className="px-4 py-3 text-brand-600 font-medium">{parseFloat(r.total_stock_value || 0).toFixed(0)} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">تحليل الدرجة</h3>
          </div>
          {gradesLoading ? <div className="p-6 text-center text-gray-400">...</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["الدرجة","المخزون","سعر البيع","التكلفة"].map((h) => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gradeRows.map((r: any) => (
                  <tr key={r.grade} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.grade}</td>
                    <td className="px-4 py-3">{r.total_stock} ساق</td>
                    <td className="px-4 py-3 text-brand-600">{parseFloat(r.avg_selling_price || 0).toFixed(2)} ر.س</td>
                    <td className="px-4 py-3 text-gray-600">{parseFloat(r.avg_cost || 0).toFixed(2)} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page
const TABS = [
  { id: "variants",       label: "الأصناف",    icon: Flower2 },
  { id: "batches",        label: "الدُفعات",   icon: Database },
  { id: "pricing",        label: "التسعير",    icon: Tag },
  { id: "substitutions",  label: "البدائل",    icon: RefreshCw },
  { id: "reports",        label: "التقارير",   icon: BarChart3 },
];

export function FlowerMasterPage() {
  const [tab, setTab] = useState("variants");

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-pink-100 rounded-xl flex items-center justify-center">
            <Flower2 className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">بيانات الورد</h1>
            <p className="text-sm text-gray-500">Flower Master Data — أصناف، دُفعات، FEFO، تسعير، بدائل</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "variants"      && <VariantsTab />}
      {tab === "batches"       && <BatchesTab />}
      {tab === "pricing"       && <PricingTab />}
      {tab === "substitutions" && <SubstitutionsTab />}
      {tab === "reports"       && <ReportsTab />}
    </div>
  );
}
