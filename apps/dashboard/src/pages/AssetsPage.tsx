import { useState } from "react";
import {
  Package, Plus, Wrench, Search, X, Loader2,
  MapPin, Hash, Edit2, Trash2, Tag, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import { inventoryApi, settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  available:   { label: "متاح",           cls: "bg-green-50 text-green-700",   dot: "bg-green-400" },
  in_use:      { label: "قيد الاستخدام",  cls: "bg-blue-50 text-blue-700",    dot: "bg-blue-400" },
  maintenance: { label: "في الصيانة",     cls: "bg-orange-50 text-orange-700", dot: "bg-orange-400" },
  damaged:     { label: "تالف",           cls: "bg-red-50 text-red-600",      dot: "bg-red-400" },
  lost:        { label: "مفقود",          cls: "bg-gray-100 text-gray-600",   dot: "bg-gray-400" },
  retired:     { label: "مستبعد",         cls: "bg-gray-100 text-gray-500",   dot: "bg-gray-300" },
};

const CONDITION: Record<string, { label: string; cls: string }> = {
  excellent: { label: "ممتاز",         cls: "text-green-600" },
  good:      { label: "جيد",           cls: "text-blue-600" },
  fair:      { label: "مقبول",         cls: "text-yellow-600" },
  poor:      { label: "يحتاج صيانة",   cls: "text-red-500" },
};

const MAINT_TYPE: Record<string, string> = {
  preventive: "صيانة وقائية",
  corrective:  "صيانة تصحيحية",
  cleaning:    "تنظيف",
  inspection:  "فحص",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-SA");
}

// ── UI Primitives ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS[status] ?? STATUS.available;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium", cfg.cls)}>
      <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Modal({
  title, onClose, size = "md", children, footer,
}: {
  title: string; onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const w = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={clsx("bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh]", w)}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Btn({
  onClick, disabled, loading, variant = "primary", children,
}: {
  onClick?: () => void; disabled?: boolean; loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "orange";
  children: React.ReactNode;
}) {
  const base = "px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50";
  const variants = {
    primary:   "bg-brand-500 text-white hover:bg-brand-600",
    secondary: "border border-gray-200 text-gray-600 hover:bg-gray-50",
    danger:    "border border-red-100 text-red-500 hover:bg-red-50",
    orange:    "bg-orange-500 text-white hover:bg-orange-600",
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} className={clsx(base, variants[variant])}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const ASSET_DEFAULT = {
  assetTypeId: "", name: "", serialNumber: "", condition: "good",
  status: "available", currentLocationId: "", purchaseDate: "",
  purchasePrice: "", notes: "",
};

const MAINT_DEFAULT = {
  type: "preventive", description: "", cost: "",
  startDate: new Date().toISOString().slice(0, 10),
  performedBy: "", conditionAfter: "good",
};

export function AssetsPage() {
  // ── data
  const { data: typesRes, loading: typesLoading, refetch: refetchTypes } = useApi(() => inventoryApi.assetTypes());
  const { data: assetsRes, loading: assetsLoading, refetch: refetchAssets } = useApi(
    () => inventoryApi.assets({ limit: "500" }),
  );
  const { data: locRes } = useApi(() => settingsApi.locations());

  const types: any[]     = typesRes?.data  ?? [];
  const allAssets: any[] = assetsRes?.data ?? [];
  const locations: any[] = locRes?.data    ?? [];

  // ── filters
  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search,       setSearch]       = useState("");

  // ── modals
  const [typeModal,    setTypeModal]    = useState<{ open: boolean; item?: any }>({ open: false });
  const [assetModal,   setAssetModal]   = useState<{ open: boolean; item?: any }>({ open: false });
  const [detailId,     setDetailId]     = useState<string | null>(null);
  const [maintModal,   setMaintModal]   = useState<{ assetId: string } | null>(null);
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null);

  // ── detail fetch (re-runs when detailId changes)
  const {
    data: detailRes, loading: detailLoading, refetch: refetchDetail,
  } = useApi(
    () => detailId ? inventoryApi.getAsset(detailId) : Promise.resolve(null) as any,
    [detailId],
  );
  const detail = (detailRes as any)?.data;

  // ── mutations
  const saveType    = useMutation((d: any) => d.id ? inventoryApi.updateAssetType(d.id, d) : inventoryApi.createAssetType(d));
  const saveAsset   = useMutation((d: any) => d.id ? inventoryApi.updateAsset(d.id, d) : inventoryApi.createAsset(d));
  const doStatus    = useMutation(({ id, status }: any) => inventoryApi.updateStatus(id, status));
  const doMaint     = useMutation((d: any) => inventoryApi.addMaintenance(d));
  const doDelete    = useMutation((id: string) => inventoryApi.deleteAsset(id));

  // ── forms
  const [typeForm,  setTypeForm]  = useState({ name: "", category: "", minStock: 0 });
  const [assetForm, setAssetForm] = useState<any>(ASSET_DEFAULT);
  const [maintForm, setMaintForm] = useState<any>(MAINT_DEFAULT);

  // ── derived
  const filtered = allAssets.filter(a => {
    if (filterType !== "all"   && a.assetTypeId !== filterType) return false;
    if (filterStatus !== "all" && a.status !== filterStatus)    return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(a.name?.toLowerCase().includes(q) || a.serialNumber?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const stats = {
    total:       allAssets.length,
    available:   allAssets.filter(a => a.status === "available").length,
    maintenance: allAssets.filter(a => a.status === "maintenance").length,
    damaged:     allAssets.filter(a => a.status === "damaged").length,
  };

  // ── handlers
  const openAddAsset = () => {
    setAssetForm({ ...ASSET_DEFAULT, assetTypeId: types[0]?.id ?? "" });
    setAssetModal({ open: true });
  };

  const openEditAsset = (a: any) => {
    setAssetForm({
      id: a.id,
      assetTypeId: a.assetTypeId ?? "",
      name: a.name ?? "",
      serialNumber: a.serialNumber ?? "",
      condition: a.condition ?? "good",
      status: a.status ?? "available",
      currentLocationId: a.currentLocationId ?? "",
      purchaseDate: a.purchaseDate ? new Date(a.purchaseDate).toISOString().slice(0, 10) : "",
      purchasePrice: a.purchasePrice ?? "",
      notes: a.notes ?? "",
    });
    setAssetModal({ open: true, item: a });
  };

  const handleSaveType = async () => {
    if (!typeForm.name.trim()) return;
    await saveType.mutate({ ...typeModal.item, ...typeForm });
    setTypeModal({ open: false });
    refetchTypes();
  };

  const handleSaveAsset = async () => {
    if (!assetForm.assetTypeId) return;
    const payload: any = { ...assetForm };
    if (!payload.currentLocationId) delete payload.currentLocationId;
    if (!payload.purchaseDate)      delete payload.purchaseDate;
    if (!payload.purchasePrice)     delete payload.purchasePrice;
    if (!payload.serialNumber)      delete payload.serialNumber;
    await saveAsset.mutate(payload);
    setAssetModal({ open: false });
    refetchAssets();
  };

  const handleStatusChange = async (assetId: string, status: string) => {
    await doStatus.mutate({ id: assetId, status });
    refetchAssets();
    if (detailId === assetId) refetchDetail();
  };

  const handleAddMaintenance = async () => {
    if (!maintModal) return;
    await doMaint.mutate({ ...maintForm, assetId: maintModal.assetId });
    setMaintModal(null);
    setMaintForm(MAINT_DEFAULT);
    refetchAssets();
    if (maintModal.assetId === detailId) refetchDetail();
  };

  const handleDelete = async (id: string) => {
    await doDelete.mutate(id);
    setConfirmDel(null);
    if (detailId === id) setDetailId(null);
    refetchAssets();
  };

  const loading = typesLoading || assetsLoading;

  // ── render
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-500" /> الأصول
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{stats.total} أصل مسجل</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setTypeForm({ name: "", category: "", minStock: 0 }); setTypeModal({ open: true }); }}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-xl px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Tag className="w-4 h-4" /> فئة جديدة
          </button>
          <button
            onClick={openAddAsset}
            className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> أصل جديد
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الأصول", value: stats.total,       bg: "bg-gray-50",    text: "text-gray-800",   border: "border-gray-200" },
          { label: "متاح",          value: stats.available,   bg: "bg-green-50",   text: "text-green-700",  border: "border-green-100" },
          { label: "في الصيانة",   value: stats.maintenance, bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-100" },
          { label: "تالف",          value: stats.damaged,     bg: "bg-red-50",     text: "text-red-600",    border: "border-red-100" },
        ].map(s => (
          <div key={s.label} className={clsx("rounded-2xl border p-4", s.bg, s.border)}>
            <p className={clsx("text-2xl font-bold tabular-nums", s.text)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الرقم..."
            className="border border-gray-200 rounded-xl pr-9 pl-3 py-2 text-sm outline-none focus:border-brand-400 w-48 transition-all"
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 bg-white"
        >
          <option value="all">كل الحالات</option>
          {Object.entries(STATUS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
              filterType === "all" ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50",
            )}
          >
            الكل ({allAssets.length})
          </button>
          {types.map(t => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
                filterType === t.id ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50",
              )}
            >
              {t.name} <span className="opacity-60">({t.totalAssets ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> جاري التحميل...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">لا توجد أصول</p>
          <button onClick={openAddAsset} className="mt-3 text-sm text-brand-500 hover:underline">
            أضف أول أصل
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(asset => {
            const type = types.find(t => t.id === asset.assetTypeId);
            const loc  = locations.find(l => l.id === asset.currentLocationId);
            const cond = CONDITION[asset.condition as string];
            return (
              <div
                key={asset.id}
                onClick={() => setDetailId(asset.id)}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-brand-200 hover:shadow-sm transition-all cursor-pointer"
              >
                {/* top */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-gray-900 truncate">{asset.name || type?.name || "أصل"}</p>
                    {type && <p className="text-xs text-gray-400 mt-0.5">{type.name}</p>}
                  </div>
                  <StatusBadge status={asset.status} />
                </div>

                {/* meta */}
                <div className="space-y-1.5 text-xs text-gray-500">
                  {asset.serialNumber && (
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                      <span className="font-mono">{asset.serialNumber}</span>
                    </div>
                  )}
                  {loc && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                      <span>{loc.name}</span>
                    </div>
                  )}
                  {asset.lastMaintenanceAt && (
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                      <span>آخر صيانة: {fmtDate(asset.lastMaintenanceAt)}</span>
                    </div>
                  )}
                </div>

                {/* footer */}
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className={clsx("text-xs font-medium", cond?.cls ?? "text-gray-400")}>
                    {cond?.label ?? "—"}
                  </span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => openEditAsset(asset)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-500 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setMaintForm(MAINT_DEFAULT); setMaintModal({ assetId: asset.id }); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Add/Edit Asset Type
      ══════════════════════════════════════════════════ */}
      {typeModal.open && (
        <Modal
          title={typeModal.item ? "تعديل الفئة" : "فئة جديدة"}
          onClose={() => setTypeModal({ open: false })}
          footer={
            <>
              <Btn variant="secondary" onClick={() => setTypeModal({ open: false })}>إلغاء</Btn>
              <Btn onClick={handleSaveType} loading={saveType.loading}>حفظ</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="اسم الفئة *">
              <input
                autoFocus
                value={typeForm.name}
                onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))}
                className={inputCls}
                placeholder="مثال: طاولات، خيام، كراسي، إضاءة"
                onKeyDown={e => e.key === "Enter" && handleSaveType()}
              />
            </Field>
            <Field label="التصنيف">
              <input
                value={typeForm.category}
                onChange={e => setTypeForm(p => ({ ...p, category: e.target.value }))}
                className={inputCls}
                placeholder="مثال: أثاث، معدات كهربائية"
              />
            </Field>
            <Field label="الحد الأدنى للتنبيه">
              <input
                type="number" min="0"
                value={typeForm.minStock}
                onChange={e => setTypeForm(p => ({ ...p, minStock: parseInt(e.target.value) || 0 }))}
                className={inputCls}
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Add/Edit Asset
      ══════════════════════════════════════════════════ */}
      {assetModal.open && (
        <Modal
          title={assetModal.item ? "تعديل الأصل" : "إضافة أصل جديد"}
          onClose={() => setAssetModal({ open: false })}
          size="lg"
          footer={
            <>
              <Btn variant="secondary" onClick={() => setAssetModal({ open: false })}>إلغاء</Btn>
              <Btn onClick={handleSaveAsset} loading={saveAsset.loading} disabled={!assetForm.assetTypeId}>حفظ</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="الفئة *">
                <select
                  value={assetForm.assetTypeId}
                  onChange={e => setAssetForm((p: any) => ({ ...p, assetTypeId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">اختر الفئة</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="الاسم المميز (اختياري)">
                <input
                  value={assetForm.name}
                  onChange={e => setAssetForm((p: any) => ({ ...p, name: e.target.value }))}
                  className={inputCls}
                  placeholder="مثال: طاولة VIP رقم 3"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="الرقم التسلسلي">
                <input
                  value={assetForm.serialNumber}
                  onChange={e => setAssetForm((p: any) => ({ ...p, serialNumber: e.target.value }))}
                  className={inputCls}
                  placeholder="يُولَّد تلقائياً إن تُرك فارغاً"
                  dir="ltr"
                />
              </Field>
              <Field label="الحالة">
                <select
                  value={assetForm.status}
                  onChange={e => setAssetForm((p: any) => ({ ...p, status: e.target.value }))}
                  className={inputCls}
                >
                  {Object.entries(STATUS).map(([v, { label }]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="الحالة الفيزيائية">
                <select
                  value={assetForm.condition}
                  onChange={e => setAssetForm((p: any) => ({ ...p, condition: e.target.value }))}
                  className={inputCls}
                >
                  {Object.entries(CONDITION).map(([v, { label }]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="الفرع / الموقع">
                <select
                  value={assetForm.currentLocationId}
                  onChange={e => setAssetForm((p: any) => ({ ...p, currentLocationId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">غير محدد</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="تاريخ الشراء">
                <input
                  type="date"
                  value={assetForm.purchaseDate}
                  onChange={e => setAssetForm((p: any) => ({ ...p, purchaseDate: e.target.value }))}
                  className={inputCls}
                  dir="ltr"
                />
              </Field>
              <Field label="سعر الشراء (ر.س)">
                <input
                  type="number" min="0"
                  value={assetForm.purchasePrice}
                  onChange={e => setAssetForm((p: any) => ({ ...p, purchasePrice: e.target.value }))}
                  className={inputCls}
                  placeholder="0"
                />
              </Field>
            </div>

            <Field label="ملاحظات">
              <textarea
                value={assetForm.notes}
                onChange={e => setAssetForm((p: any) => ({ ...p, notes: e.target.value }))}
                className={clsx(inputCls, "h-20 resize-none")}
                placeholder="أي ملاحظات إضافية..."
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Asset Detail
      ══════════════════════════════════════════════════ */}
      {detailId && (
        <Modal title="تفاصيل الأصل" onClose={() => setDetailId(null)} size="xl">
          {detailLoading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> جاري التحميل...
            </div>
          ) : detail ? (
            <div className="space-y-5">

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {detail.name || detail.type?.name || "أصل"}
                  </h2>
                  {detail.type && <p className="text-sm text-gray-400">{detail.type.name}</p>}
                </div>
                <StatusBadge status={detail.status} />
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: "الرقم التسلسلي",         value: detail.serialNumber,   mono: true },
                  { label: "الحالة الفيزيائية",       value: CONDITION[detail.condition]?.label ?? detail.condition },
                  { label: "الفرع",                   value: locations.find(l => l.id === detail.currentLocationId)?.name },
                  { label: "عدد مرات الاستخدام",     value: detail.totalUses ?? 0 },
                  { label: "تاريخ الشراء",            value: fmtDate(detail.purchaseDate) },
                  { label: "سعر الشراء",              value: detail.purchasePrice ? `${Number(detail.purchasePrice).toLocaleString()} ر.س` : null },
                  { label: "آخر صيانة",               value: fmtDate(detail.lastMaintenanceAt) },
                  { label: "الصيانة القادمة",          value: fmtDate(detail.nextMaintenanceAt) },
                ].filter(r => r.value != null && r.value !== "" && r.value !== "—").map(row => (
                  <div key={row.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{row.label}</p>
                    <p className={clsx("font-medium text-gray-900 text-sm", row.mono && "font-mono")}>{String(row.value)}</p>
                  </div>
                ))}
              </div>

              {detail.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                  <p className="text-xs font-semibold text-amber-600 mb-0.5">ملاحظات</p>
                  {detail.notes}
                </div>
              )}

              {/* Status change */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">تغيير الحالة</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS).map(([v, { label, dot }]) => (
                    <button
                      key={v}
                      onClick={() => handleStatusChange(detail.id, v)}
                      disabled={detail.status === v || doStatus.loading}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors disabled:opacity-50",
                        detail.status === v
                          ? "bg-brand-50 border-brand-200 text-brand-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-brand-300 hover:bg-brand-50",
                      )}
                    >
                      <span className={clsx("w-1.5 h-1.5 rounded-full", dot)} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Maintenance history */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900">
                    سجل الصيانة ({detail.maintenanceHistory?.length ?? 0})
                  </p>
                  <button
                    onClick={() => { setMaintForm(MAINT_DEFAULT); setMaintModal({ assetId: detail.id }); }}
                    className="flex items-center gap-1 text-xs text-brand-500 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> تسجيل صيانة
                  </button>
                </div>
                {detail.maintenanceHistory?.length > 0 ? (
                  <div className="space-y-2">
                    {detail.maintenanceHistory.map((m: any) => (
                      <div key={m.id} className="border border-gray-100 rounded-xl p-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">
                            {MAINT_TYPE[m.type] ?? m.type}
                          </span>
                          <span className="text-xs text-gray-400">{fmtDate(m.startDate)}</span>
                        </div>
                        {m.description && <p className="text-gray-500 text-xs mb-1">{m.description}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                          {m.performedBy  && <span>بواسطة: {m.performedBy}</span>}
                          {m.cost && Number(m.cost) > 0 && <span>التكلفة: {Number(m.cost).toLocaleString()} ر.س</span>}
                          {m.conditionAfter && <span>الحالة بعد: {CONDITION[m.conditionAfter]?.label ?? m.conditionAfter}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">
                    لا يوجد سجل صيانة بعد
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Btn variant="secondary" onClick={() => { openEditAsset(detail); setDetailId(null); }}>
                  <Edit2 className="w-4 h-4" /> تعديل
                </Btn>
                <Btn variant="danger" onClick={() => setConfirmDel(detail.id)}>
                  <Trash2 className="w-4 h-4" /> حذف
                </Btn>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-10">الأصل غير موجود</p>
          )}
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Add Maintenance
      ══════════════════════════════════════════════════ */}
      {maintModal && (
        <Modal
          title="تسجيل صيانة"
          onClose={() => setMaintModal(null)}
          footer={
            <>
              <Btn variant="secondary" onClick={() => setMaintModal(null)}>إلغاء</Btn>
              <Btn variant="orange" onClick={handleAddMaintenance} loading={doMaint.loading}>تسجيل</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="نوع الصيانة">
                <select
                  value={maintForm.type}
                  onChange={e => setMaintForm((p: any) => ({ ...p, type: e.target.value }))}
                  className={inputCls}
                >
                  {Object.entries(MAINT_TYPE).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="تاريخ البدء">
                <input
                  type="date"
                  value={maintForm.startDate}
                  onChange={e => setMaintForm((p: any) => ({ ...p, startDate: e.target.value }))}
                  className={inputCls}
                  dir="ltr"
                />
              </Field>
            </div>

            <Field label="وصف العمل المنجز">
              <textarea
                value={maintForm.description}
                onChange={e => setMaintForm((p: any) => ({ ...p, description: e.target.value }))}
                className={clsx(inputCls, "h-20 resize-none")}
                placeholder="ما الذي تم عمله؟"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="نفّذها (الفني / الشركة)">
                <input
                  value={maintForm.performedBy}
                  onChange={e => setMaintForm((p: any) => ({ ...p, performedBy: e.target.value }))}
                  className={inputCls}
                  placeholder="اسم الفني أو الشركة"
                />
              </Field>
              <Field label="التكلفة (ر.س)">
                <input
                  type="number" min="0"
                  value={maintForm.cost}
                  onChange={e => setMaintForm((p: any) => ({ ...p, cost: e.target.value }))}
                  className={inputCls}
                  placeholder="0"
                />
              </Field>
            </div>

            <Field label="حالة الأصل بعد الصيانة">
              <select
                value={maintForm.conditionAfter}
                onChange={e => setMaintForm((p: any) => ({ ...p, conditionAfter: e.target.value }))}
                className={inputCls}
              >
                {Object.entries(CONDITION).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </Field>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Confirm Delete
      ══════════════════════════════════════════════════ */}
      {confirmDel && (
        <Modal
          title="تأكيد الحذف"
          onClose={() => setConfirmDel(null)}
          size="sm"
          footer={
            <>
              <Btn variant="secondary" onClick={() => setConfirmDel(null)}>إلغاء</Btn>
              <Btn variant="danger" onClick={() => handleDelete(confirmDel)} loading={doDelete.loading}>
                حذف نهائياً
              </Btn>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            هل أنت متأكد من حذف هذا الأصل؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
        </Modal>
      )}

    </div>
  );
}
