import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { procurementApi, flowerMasterApi } from "@/lib/api";
import {
  Plus, X, Phone, Mail, Globe, Star, Package,
  AlertTriangle, Loader2, RefreshCw, TrendingUp, Clock,
  ChevronRight, Award,
} from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/hooks/useToast";

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Supplier {
  id: string;
  name: string;
  country?: string;
  specialty?: string;
  phone?: string;
  email?: string;
  notes?: string;
  total_purchases?: number;
  last_delivery?: string;
  quality_score?: number;
}

interface SupplierFormData {
  name: string;
  phone: string;
  email: string;
  country: string;
  specialty: string;
  notes: string;
}

interface BatchItemSelection {
  quantity: string;
  unitCost: string;
}

interface BatchFormData {
  selected: Record<string, BatchItemSelection>;
  date: string;
  arrivalQuality: string;
  notes: string;
}

// ─── Mock Data (fallback if API returns empty) ──────────────────────────────────
const MOCK_SUPPLIERS: Supplier[] = [
  { id: "1", name: "مزرعة الورود الهولندية", country: "هولندا", specialty: "ورود، تولب، ليلية", phone: "+31612345678", total_purchases: 45200, last_delivery: "3 أيام", quality_score: 9.1 },
  { id: "2", name: "مورد كينيا للورد", country: "كينيا", specialty: "ورود حمراء، وردية", phone: "+254712345678", total_purchases: 28600, last_delivery: "7 أيام", quality_score: 7.8 },
  { id: "3", name: "شركة الزهور المحلية", country: "السعودية", specialty: "الياسمين، النرجس", phone: "+966501234567", total_purchases: 12400, last_delivery: "يوم", quality_score: 8.5 },
];

// ─── Constants ──────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { value: "السعودية",  label: "السعودية" },
  { value: "هولندا",    label: "هولندا" },
  { value: "كينيا",     label: "كينيا" },
  { value: "إكوادور",   label: "إكوادور" },
  { value: "كولومبيا",  label: "كولومبيا" },
  { value: "اليابان",   label: "اليابان" },
  { value: "أخرى",      label: "أخرى" },
];

const SPECIALTIES = [
  { value: "ورود",   label: "ورود" },
  { value: "تولب",   label: "تولب" },
  { value: "ليلية",  label: "ليلية" },
  { value: "أوركيد", label: "أوركيد" },
  { value: "شامل",   label: "شامل" },
];

const ARRIVAL_QUALITIES = [
  { value: "excellent", label: "ممتاز" },
  { value: "good",      label: "جيد" },
  { value: "fair",      label: "مقبول" },
  { value: "poor",      label: "رديء" },
];

const EMPTY_SUPPLIER_FORM: SupplierFormData = {
  name: "", phone: "", email: "", country: "", specialty: "", notes: "",
};

const EMPTY_BATCH_FORM: BatchFormData = {
  selected: {},
  date: new Date().toISOString().split("T")[0],
  arrivalQuality: "good",
  notes: "",
};

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/30 focus:border-[#5b9bd5]";
const selectCls = `${inputCls} bg-white appearance-none`;

// ─── Quality Score Bar ───────────────────────────────────────────────────────────
function QualityBar({ score }: { score: number }) {
  const pct = Math.min(100, (score / 10) * 100);
  const color = score > 7 ? "bg-green-500" : score > 5 ? "bg-yellow-500" : "bg-red-500";
  const textColor = score > 7 ? "text-green-700" : score > 5 ? "text-yellow-700" : "text-red-600";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">جودة الورد</span>
        <span className={clsx("text-xs font-bold tabular-nums", textColor)}>{score.toFixed(1)}/10</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Score Badge ─────────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const bg = score > 7 ? "bg-green-100 text-green-700" : score > 5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600";
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold", bg)}>
      <Star className="w-3 h-3" />
      {score.toFixed(1)}
    </span>
  );
}

// ─── Modal Shell ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-400 mr-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Supplier Card ───────────────────────────────────────────────────────────────
interface SupplierCardProps {
  supplier: Supplier;
  isBest: boolean;
  onEdit: () => void;
  onReceive: () => void;
  onHistory: () => void;
}

function SupplierCard({ supplier, isBest, onEdit, onReceive, onHistory }: SupplierCardProps) {
  const score = supplier.quality_score ?? 0;
  const purchases = Number(supplier.total_purchases ?? 0);

  return (
    <div className={clsx("bg-white rounded-2xl border overflow-hidden", isBest ? "border-[#5b9bd5]/40 ring-1 ring-[#5b9bd5]/20" : "border-gray-100")}>
      {/* Card Header */}
      <div className="px-4 py-3 border-b border-gray-50 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900 truncate">{supplier.name}</span>
            {isBest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#5b9bd5]/10 text-[#5b9bd5] text-[10px] font-bold shrink-0">
                <Award className="w-3 h-3" />
                الأفضل
              </span>
            )}
          </div>
          {supplier.country && (
            <span className="text-xs text-gray-400 mt-0.5 block">{supplier.country}</span>
          )}
        </div>
        <ScoreBadge score={score} />
      </div>

      {/* Card Body */}
      <div className="px-4 py-3 space-y-2.5">
        {supplier.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <a href={`tel:${supplier.phone}`} className="text-[#5b9bd5] hover:underline" dir="ltr">{supplier.phone}</a>
          </div>
        )}
        {supplier.email && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <a href={`mailto:${supplier.email}`} className="text-[#5b9bd5] hover:underline truncate">{supplier.email}</a>
          </div>
        )}
        {supplier.specialty && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{supplier.specialty}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <TrendingUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>
            <span className="text-gray-500">إجمالي المشتريات: </span>
            <span className="font-semibold text-gray-800 tabular-nums">{purchases.toLocaleString("en-US")} ر.س</span>
          </span>
        </div>
        {supplier.last_delivery && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>
              <span className="text-gray-500">آخر توريد: </span>
              <span className="text-gray-700">{supplier.last_delivery} مضت</span>
            </span>
          </div>
        )}

        {/* Quality Score Bar */}
        {score > 0 && (
          <div className="pt-1">
            <QualityBar score={score} />
            <p className="text-[10px] text-gray-400 mt-1">محسوب من متوسط عمر الدفعات المستلمة مقارنة بالمتوقع</p>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-4 py-3 border-t border-gray-50 flex items-center gap-2">
        <button
          onClick={onHistory}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          عرض السجل
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          تعديل
        </button>
        <button
          onClick={onReceive}
          className="flex-1 py-2 rounded-xl bg-[#5b9bd5] hover:bg-[#4a8ac4] text-white text-xs font-semibold transition-colors"
        >
          استلام دفعة
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="h-4 bg-gray-100 rounded w-32" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
        <div className="h-6 w-14 bg-gray-100 rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-24" />
        <div className="h-3 bg-gray-100 rounded w-40" />
        <div className="h-3 bg-gray-100 rounded w-28" />
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full" />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────────
export function FlowerSuppliersPage() {
  const [supplierModal, setSupplierModal] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [batchModal, setBatchModal] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierFormData>(EMPTY_SUPPLIER_FORM);
  const [batchForm, setBatchForm] = useState<BatchFormData>(EMPTY_BATCH_FORM);

  const { data: suppliersRes, loading: suppliersLoading, error, refetch } = useApi(
    () => procurementApi.suppliers(),
    []
  );

  const createMut = useMutation((data: any) => procurementApi.createSupplier(data));
  const updateMut = useMutation((payload: any) => procurementApi.updateSupplier(payload.id, payload.data));
  const batchMut  = useMutation((data: any) => flowerMasterApi.receiveBatch(data));

  const { data: variantsRes } = useApi(() => flowerMasterApi.variants(), []);
  const variants: { id: string; displayNameAr?: string; flowerType?: string }[] =
    variantsRes?.data ?? [];

  const rawSuppliers: Supplier[] = suppliersRes?.suppliers ?? [];
  const suppliers: Supplier[] = rawSuppliers.length > 0 ? rawSuppliers : MOCK_SUPPLIERS;
  const usingMock = rawSuppliers.length === 0 && !suppliersLoading;

  // ─── Computed Stats ────────────────────────────────────────────────────────────
  const totalPurchases = suppliers.reduce((s, sup) => s + Number(sup.total_purchases ?? 0), 0);
  const avgQuality = suppliers.length > 0
    ? suppliers.reduce((s, sup) => s + (sup.quality_score ?? 0), 0) / suppliers.filter(s => s.quality_score).length
    : 0;
  const bestSupplier = suppliers.reduce((best, sup) =>
    (sup.quality_score ?? 0) > (best?.quality_score ?? 0) ? sup : best, suppliers[0]);

  // ─── Form helpers ──────────────────────────────────────────────────────────────
  const setSF = (f: keyof SupplierFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setSupplierForm(p => ({ ...p, [f]: e.target.value }));
  const setBF = (f: "date" | "arrivalQuality" | "notes") => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setBatchForm(p => ({ ...p, [f]: e.target.value }));

  const toggleVariant = (id: string) =>
    setBatchForm(p => {
      const next = { ...p.selected };
      if (next[id]) { delete next[id]; } else { next[id] = { quantity: "", unitCost: "" }; }
      return { ...p, selected: next };
    });

  const setVariantField = (id: string, f: keyof BatchItemSelection, val: string) =>
    setBatchForm(p => ({ ...p, selected: { ...p.selected, [id]: { ...p.selected[id], [f]: val } } }));

  const selectAll = () =>
    setBatchForm(p => ({
      ...p,
      selected: Object.fromEntries(variants.map(v => [v.id, p.selected[v.id] ?? { quantity: "", unitCost: "" }])),
    }));

  const clearAll = () => setBatchForm(p => ({ ...p, selected: {} }));

  const openCreate = () => {
    setSupplierForm(EMPTY_SUPPLIER_FORM);
    setEditTarget(null);
    setSupplierModal("create");
  };

  const openEdit = (supplier: Supplier) => {
    setSupplierForm({
      name:      supplier.name,
      phone:     supplier.phone ?? "",
      email:     supplier.email ?? "",
      country:   supplier.country ?? "",
      specialty: supplier.specialty ?? "",
      notes:     supplier.notes ?? "",
    });
    setEditTarget(supplier);
    setSupplierModal("edit");
  };

  const openReceive = (supplier: Supplier) => {
    setBatchForm(EMPTY_BATCH_FORM);
    setBatchModal(supplier);
  };

  const openHistory = (supplier: Supplier) => {
    toast.success(`عرض سجل "${supplier.name}" — قريباً`);
  };

  const saveSupplier = async () => {
    if (!supplierForm.name) return;
    let res;
    if (supplierModal === "edit" && editTarget) {
      res = await updateMut.mutate({ id: editTarget.id, data: supplierForm });
    } else {
      res = await createMut.mutate(supplierForm);
    }
    if (res) {
      toast.success(supplierModal === "edit" ? "تم تحديث المورد" : "تمت إضافة المورد");
      setSupplierModal(null);
      refetch();
    }
  };

  const saveBatch = async () => {
    const entries = Object.entries(batchForm.selected).filter(([, v]) => v.quantity);
    if (entries.length === 0) return;
    let successCount = 0;
    for (const [variantId, sel] of entries) {
      const res = await batchMut.mutate({
        variantId,
        quantityReceived: parseInt(sel.quantity),
        unitCost:         sel.unitCost ? parseFloat(sel.unitCost) : undefined,
        expiryEstimated:  batchForm.date || undefined,
        currentBloomStage: "bud",
        arrivalQuality:   batchForm.arrivalQuality,
        notes:            batchForm.notes,
        supplierId:       batchModal?.id,
      });
      if (res) successCount++;
    }
    if (successCount > 0) {
      toast.success(`تم تسجيل ${successCount} ${successCount === 1 ? "نوع" : "أنواع"} بنجاح`);
      setBatchModal(null);
    }
  };

  const isSaving = createMut.loading || updateMut.loading;

  return (
    <div className="space-y-5 p-5" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">الموردون</h1>
          <p className="text-sm text-gray-400 mt-0.5">إدارة موردي الورود والدفعات الواردة</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:bg-gray-50 text-gray-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#5b9bd5] hover:bg-[#4a8ac4] text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors shadow-sm shadow-[#5b9bd5]/20"
          >
            <Plus className="w-4 h-4" />
            مورد جديد
          </button>
        </div>
      </div>

      {/* Mock Data Notice */}
      {usingMock && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">يتم عرض بيانات توضيحية — أضف موردين لبدء العمل</p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">
            {suppliersLoading ? <span className="inline-block h-7 w-6 bg-gray-100 rounded animate-pulse" /> : suppliers.length}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">عدد الموردين</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="w-9 h-9 rounded-xl bg-[#5b9bd5]/10 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-[#5b9bd5]" />
          </div>
          <p className="text-2xl font-bold text-[#5b9bd5] tabular-nums">
            {suppliersLoading ? <span className="inline-block h-7 w-16 bg-gray-100 rounded animate-pulse" /> : `${totalPurchases.toLocaleString("en-US")}`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">مشتريات هذا الشهر (ر.س)</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center mb-3">
            <Star className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600 tabular-nums">
            {suppliersLoading ? <span className="inline-block h-7 w-10 bg-gray-100 rounded animate-pulse" /> : avgQuality > 0 ? avgQuality.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">متوسط جودة الورد / 10</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-base font-bold text-gray-800 truncate mt-1">
            {suppliersLoading ? <span className="inline-block h-5 w-24 bg-gray-100 rounded animate-pulse" /> : (bestSupplier?.name ?? "—")}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">أفضل مورد</p>
        </div>
      </div>

      {/* Suppliers Grid */}
      {suppliersLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
          <AlertTriangle className="w-10 h-10 text-red-300 mb-3" />
          <p className="text-sm font-semibold text-gray-700">حدث خطأ في تحميل الموردين</p>
          <p className="text-xs text-gray-400 mt-1">{error}</p>
          <button
            onClick={refetch}
            className="mt-3 px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700">لا يوجد موردون</p>
          <p className="text-xs text-gray-400 mt-1">أضف أول مورد للبدء</p>
          <button
            onClick={openCreate}
            className="mt-4 flex items-center gap-2 bg-[#5b9bd5] hover:bg-[#4a8ac4] text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            مورد جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              isBest={bestSupplier?.id === supplier.id}
              onEdit={() => openEdit(supplier)}
              onReceive={() => openReceive(supplier)}
              onHistory={() => openHistory(supplier)}
            />
          ))}
        </div>
      )}

      {/* Supplier Create / Edit Modal */}
      {supplierModal && (
        <Modal
          title={supplierModal === "edit" ? "تعديل المورد" : "مورد جديد"}
          onClose={() => setSupplierModal(null)}
        >
          <Field label="الاسم" required>
            <input value={supplierForm.name} onChange={setSF("name")} placeholder="اسم المورد" className={inputCls} />
          </Field>
          <Field label="جوال التواصل">
            <input type="tel" value={supplierForm.phone} onChange={setSF("phone")} placeholder="+966501234567" className={inputCls} dir="ltr" />
          </Field>
          <Field label="البريد الإلكتروني">
            <input type="email" value={supplierForm.email} onChange={setSF("email")} placeholder="supplier@example.com" className={inputCls} dir="ltr" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="البلد / المنشأ">
              <select value={supplierForm.country} onChange={setSF("country")} className={selectCls}>
                <option value="">اختر الدولة</option>
                {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="التخصص">
              <select value={supplierForm.specialty} onChange={setSF("specialty")} className={selectCls}>
                <option value="">اختر التخصص</option>
                {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="ملاحظات">
            <textarea value={supplierForm.notes} onChange={setSF("notes")} rows={2} placeholder="أي معلومات إضافية..." className={inputCls} />
          </Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setSupplierModal(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
              إلغاء
            </button>
            <button
              onClick={saveSupplier}
              disabled={isSaving || !supplierForm.name}
              className="flex-1 bg-[#5b9bd5] hover:bg-[#4a8ac4] text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (supplierModal === "edit" ? "حفظ التعديلات" : "إضافة المورد")}
            </button>
          </div>
        </Modal>
      )}

      {/* Receive Batch Modal */}
      {batchModal && (() => {
        const allSelected = variants.length > 0 && variants.every(v => !!batchForm.selected[v.id]);
        const someSelected = variants.some(v => !!batchForm.selected[v.id]);
        const hasValidEntries = Object.values(batchForm.selected).some(v => v.quantity);

        // Group variants by flowerType / category
        const grouped: Record<string, typeof variants> = {};
        for (const v of variants) {
          const key = v.flowerType ?? "أخرى";
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(v);
        }

        return (
          <Modal
            title={`استلام دفعة — ${batchModal.name}`}
            onClose={() => setBatchModal(null)}
          >
            {/* Select All Row */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => allSelected ? clearAll() : selectAll()}
                  className="w-4 h-4 accent-[#5b9bd5] cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-700">تحديد الكل</span>
              </label>
              {someSelected && (
                <span className="text-xs text-[#5b9bd5] font-medium">
                  {Object.keys(batchForm.selected).length} محدد
                </span>
              )}
            </div>

            {/* Variants by Group */}
            {variants.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">لا توجد أصناف — أضف أصنافاً من إدارة المخزون</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(grouped).map(([groupName, groupVariants]) => (
                  <div key={groupName}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 px-1">{groupName}</p>
                    <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                      {groupVariants.map(v => {
                        const sel = batchForm.selected[v.id];
                        return (
                          <div key={v.id} className={clsx("transition-colors", sel ? "bg-[#5b9bd5]/5" : "bg-white")}>
                            {/* Variant Header Row */}
                            <label className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={!!sel}
                                onChange={() => toggleVariant(v.id)}
                                className="w-4 h-4 accent-[#5b9bd5] cursor-pointer shrink-0"
                              />
                              <span className="text-sm text-gray-800 font-medium flex-1 truncate">
                                {v.displayNameAr ?? v.flowerType ?? v.id}
                              </span>
                            </label>
                            {/* Quantity + Cost inputs — shown only when checked */}
                            {sel && (
                              <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                                <div>
                                  <label className="text-[10px] text-gray-400 mb-1 block">العدد المستلم <span className="text-red-400">*</span></label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={sel.quantity}
                                    onChange={e => setVariantField(v.id, "quantity", e.target.value)}
                                    placeholder="200"
                                    className={inputCls}
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-gray-400 mb-1 block">سعر الوحدة (ر.س)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={sel.unitCost}
                                    onChange={e => setVariantField(v.id, "unitCost", e.target.value)}
                                    placeholder="0.00"
                                    className={inputCls}
                                  />
                                </div>
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

            {/* Shared Batch Fields */}
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <Field label="التاريخ">
                <input type="date" value={batchForm.date} onChange={setBF("date")} className={inputCls} />
              </Field>
              <Field label="جودة الوصول">
                <select value={batchForm.arrivalQuality} onChange={setBF("arrivalQuality")} className={selectCls}>
                  {ARRIVAL_QUALITIES.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                </select>
              </Field>
              <Field label="ملاحظات الدفعة">
                <textarea value={batchForm.notes} onChange={setBF("notes")} rows={2} placeholder="أي ملاحظات عن هذه الدفعة..." className={inputCls} />
              </Field>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setBatchModal(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
                إلغاء
              </button>
              <button
                onClick={saveBatch}
                disabled={batchMut.loading || !hasValidEntries}
                className="flex-1 bg-[#5b9bd5] hover:bg-[#4a8ac4] text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {batchMut.loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "حفظ الفاتورة"}
              </button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

export default FlowerSuppliersPage;
