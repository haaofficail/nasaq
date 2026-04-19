import { useState } from "react";
import { SkeletonRows } from "@/components/ui/Skeleton";
import {
  Package, Plus, Wrench, Search, X, Loader2,
  MapPin, Hash, Edit2, Trash2, Tag, ArrowRightLeft,
  Warehouse, Building2, User2, ShoppingCart, History,
  RotateCcw, AlertCircle, Lock, Route, CheckCircle2,
  Clock, FileText, Activity, Phone,
} from "lucide-react";
import { clsx } from "clsx";
import { inventoryApi, settingsApi, teamApi } from "@/lib/api";
import { fmtDate as fmtDateUtil } from "@/lib/utils";
import { MAINTENANCE_TYPES, MAINTENANCE_PRIORITIES, MAINTENANCE_STATUSES } from "@/lib/constants";
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

const LOCATION_TYPE: Record<string, { label: string; icon: any; cls: string }> = {
  warehouse: { label: "المستودع",      icon: Warehouse,    cls: "text-gray-500" },
  branch:    { label: "الفرع",          icon: Building2,    cls: "text-blue-500" },
  rented:    { label: "مؤجَّر",         icon: ShoppingCart, cls: "text-emerald-600" },
  assigned:  { label: "معيَّن لموظف",  icon: User2,        cls: "text-purple-500" },
};

const MOVE_REASONS = [
  "نقل بين الفروع",
  "إعداد للتأجير",
  "إرجاع من إيجار",
  "صيانة دورية",
  "فحص دوري",
  "إعادة تخزين",
  "أخرى",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return fmtDateUtil(d);
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

function LocationTypeBadge({ locationType }: { locationType?: string }) {
  const cfg = LOCATION_TYPE[locationType ?? "warehouse"] ?? LOCATION_TYPE.warehouse;
  const Icon = cfg.icon;
  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs font-medium", cfg.cls)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

const inputCls = "w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all";

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f6] shrink-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-[#eef2f6] flex gap-2 justify-end shrink-0">
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
    secondary: "border border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]",
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
  status: "available", locationType: "warehouse", currentLocationId: "",
  isMovable: true, isRentable: false,
  purchaseDate: "", purchasePrice: "", notes: "",
};

const MAINT_DEFAULT = {
  type: "preventive", description: "", cost: "",
  startDate: new Date().toISOString().slice(0, 10),
  performedBy: "", conditionAfter: "good",
};

const MOVE_DEFAULT = {
  toLocationType: "branch", toLocationId: "", toAssignedUserId: "",
  toCustomerId: "", reason: "نقل بين الفروع", notes: "",
};

export function AssetsPage() {
  // ── data
  const { data: typesRes, loading: typesLoading, refetch: refetchTypes } = useApi(() => inventoryApi.assetTypes());
  const { data: assetsRes, loading: assetsLoading, refetch: refetchAssets } = useApi(
    () => inventoryApi.assets({ limit: "500" }),
  );
  const { data: locRes }  = useApi(() => settingsApi.locations());
  const { data: teamRes } = useApi(() => teamApi.members());

  const types: any[]     = typesRes?.data  ?? [];
  const allAssets: any[] = assetsRes?.data ?? [];
  const locations: any[] = locRes?.data    ?? [];
  const members: any[]   = teamRes?.data   ?? [];

  // ── filters
  const [filterType,     setFilterType]     = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [search,         setSearch]         = useState("");

  // ── modals
  const [typeModal,    setTypeModal]    = useState<{ open: boolean; item?: any }>({ open: false });
  const [assetModal,   setAssetModal]   = useState<{ open: boolean; item?: any }>({ open: false });
  const [detailId,     setDetailId]     = useState<string | null>(null);
  const [maintModal,   setMaintModal]   = useState<{ assetId: string } | null>(null);
  const [moveModal,    setMoveModal]    = useState<{ asset: any } | null>(null);
  const [returnModal,  setReturnModal]  = useState<{ asset: any } | null>(null);
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null);
  const [activeTab,    setActiveTab]    = useState<"info" | "maintenance" | "movements" | "journey">("info");

  // ── detail fetch
  const {
    data: detailRes, loading: detailLoading, refetch: refetchDetail,
  } = useApi(
    () => detailId ? inventoryApi.getAsset(detailId) : Promise.resolve(null) as any,
    [detailId],
  );
  const detail = (detailRes as any)?.data;

  // ── journey fetch
  const {
    data: journeyRes, loading: journeyLoading, refetch: refetchJourney,
  } = useApi(
    () => detailId ? inventoryApi.assetJourney(detailId) : Promise.resolve(null) as any,
    [detailId],
  );
  const journey = (journeyRes as any)?.data;

  // ── mutations
  const saveType    = useMutation((d: any) => d.id ? inventoryApi.updateAssetType(d.id, d) : inventoryApi.createAssetType(d));
  const saveAsset   = useMutation((d: any) => d.id ? inventoryApi.updateAsset(d.id, d) : inventoryApi.createAsset(d));
  const doStatus    = useMutation(({ id, status }: any) => inventoryApi.updateStatus(id, status));
  const doMaint     = useMutation((d: any) => inventoryApi.addMaintenance(d));
  const doMove      = useMutation(({ id, data }: any) => inventoryApi.moveAsset(id, data));
  const doReturn    = useMutation(({ id, data }: any) => inventoryApi.returnAsset(id, data));
  const doDelete    = useMutation((id: string) => inventoryApi.deleteAsset(id));

  // ── forms
  const [typeForm,  setTypeForm]  = useState({ name: "", category: "", minStock: 0 });
  const [assetForm, setAssetForm] = useState<any>(ASSET_DEFAULT);
  const [maintForm, setMaintForm] = useState<any>(MAINT_DEFAULT);
  const [moveForm,  setMoveForm]  = useState<any>(MOVE_DEFAULT);
  const [returnLocationId, setReturnLocationId] = useState("");

  // ── derived
  const filtered = allAssets.filter(a => {
    if (filterType !== "all"     && a.assetTypeId !== filterType)         return false;
    if (filterStatus !== "all"   && a.status !== filterStatus)            return false;
    if (filterLocation !== "all" && a.locationType !== filterLocation)    return false;
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
    rented:      allAssets.filter(a => a.locationType === "rented").length,
    assigned:    allAssets.filter(a => a.locationType === "assigned").length,
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
      locationType: a.locationType ?? "warehouse",
      currentLocationId: a.currentLocationId ?? "",
      isMovable: a.isMovable ?? true,
      isRentable: a.isRentable ?? false,
      purchaseDate: a.purchaseDate ? new Date(a.purchaseDate).toISOString().slice(0, 10) : "",
      purchasePrice: a.purchasePrice ?? "",
      notes: a.notes ?? "",
    });
    setAssetModal({ open: true, item: a });
  };

  const openMoveModal = (asset: any) => {
    setMoveForm({
      ...MOVE_DEFAULT,
      toLocationType: asset.locationType === "warehouse" ? "branch" : "warehouse",
      toLocationId: "",
    });
    setMoveModal({ asset });
  };

  const openReturnModal = (asset: any) => {
    setReturnLocationId("");
    setReturnModal({ asset });
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

  const handleMove = async () => {
    if (!moveModal) return;
    const data: any = { ...moveForm };
    if (!data.toLocationId)     delete data.toLocationId;
    if (!data.toAssignedUserId) delete data.toAssignedUserId;
    if (!data.toCustomerId)     delete data.toCustomerId;
    const result = await doMove.mutate({ id: moveModal.asset.id, data });
    if (result) {
      setMoveModal(null);
      refetchAssets();
      if (detailId === moveModal.asset.id) refetchDetail();
    }
  };

  const handleReturn = async () => {
    if (!returnModal) return;
    const result = await doReturn.mutate({
      id: returnModal.asset.id,
      data: { toLocationId: returnLocationId || undefined },
    });
    if (result) {
      setReturnModal(null);
      refetchAssets();
      if (detailId === returnModal.asset.id) refetchDetail();
    }
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
            className="flex items-center gap-1.5 border border-[#eef2f6] text-gray-600 rounded-xl px-3 py-2 text-sm font-medium hover:bg-[#f8fafc] transition-colors"
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
          { label: "إجمالي الأصول", value: stats.total,       bg: "bg-[#f8fafc]",    text: "text-gray-800",     border: "border-[#eef2f6]" },
          { label: "متاح",          value: stats.available,   bg: "bg-green-50",   text: "text-green-700",    border: "border-green-100" },
          { label: "مؤجَّر",         value: stats.rented,      bg: "bg-emerald-50", text: "text-emerald-700",  border: "border-emerald-100" },
          { label: "معيَّن لموظف",  value: stats.assigned,    bg: "bg-purple-50",  text: "text-purple-700",   border: "border-purple-100" },
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
            className="border border-[#eef2f6] rounded-xl pr-9 pl-3 py-2 text-sm outline-none focus:border-brand-400 w-48 transition-all"
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 bg-white"
        >
          <option value="all">كل الحالات</option>
          {Object.entries(STATUS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>

        <select
          value={filterLocation}
          onChange={e => setFilterLocation(e.target.value)}
          className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 bg-white"
        >
          <option value="all">كل المواقع</option>
          {Object.entries(LOCATION_TYPE).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
              filterType === "all" ? "bg-brand-500 text-white" : "bg-white border border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]",
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
                filterType === t.id ? "bg-brand-500 text-white" : "bg-white border border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]",
              )}
            >
              {t.name} <span className="opacity-60">({t.totalAssets ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <SkeletonRows rows={3} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#eef2f6] text-center py-16">
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
                onClick={() => { setDetailId(asset.id); setActiveTab("journey"); }}
                className="bg-white rounded-2xl border border-[#eef2f6] p-4 hover:border-brand-200 hover:shadow-sm transition-all cursor-pointer"
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
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <LocationTypeBadge locationType={asset.locationType} />
                    {loc && <span className="text-gray-400">— {loc.name}</span>}
                  </div>
                  {asset.lastMaintenanceAt && (
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                      <span>آخر صيانة: {fmtDate(asset.lastMaintenanceAt)}</span>
                    </div>
                  )}
                </div>

                {/* flags */}
                <div className="flex gap-1.5 mt-2">
                  {!asset.isMovable && (
                    <span className="flex items-center gap-0.5 text-[10px] text-gray-400 bg-[#f8fafc] px-1.5 py-0.5 rounded-lg">
                      <Lock className="w-2.5 h-2.5" /> ثابت
                    </span>
                  )}
                  {asset.isRentable && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg">
                      قابل للإيجار
                    </span>
                  )}
                </div>

                {/* footer */}
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className={clsx("text-xs font-medium", cond?.cls ?? "text-gray-400")}>
                    {cond?.label ?? "—"}
                  </span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {asset.isMovable && asset.locationType !== "rented" && asset.status !== "maintenance" && (
                      <button
                        onClick={() => openMoveModal(asset)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                        title="نقل الأصل"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {["rented", "assigned"].includes(asset.locationType) && (
                      <button
                        onClick={() => openReturnModal(asset)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-500 transition-colors"
                        title="إرجاع الأصل"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
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
              <Field label="نوع الموقع الحالي">
                <select
                  value={assetForm.locationType}
                  onChange={e => setAssetForm((p: any) => ({ ...p, locationType: e.target.value }))}
                  className={inputCls}
                >
                  {Object.entries(LOCATION_TYPE).map(([v, { label }]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </Field>
            </div>

            {["branch", "warehouse"].includes(assetForm.locationType) && (
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
            )}

            <div className="flex items-center gap-6 py-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assetForm.isMovable}
                  onChange={e => setAssetForm((p: any) => ({ ...p, isMovable: e.target.checked }))}
                  className="w-4 h-4 rounded text-brand-500"
                />
                <span className="text-sm text-gray-700">أصل متحرك (قابل للنقل)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assetForm.isRentable}
                  onChange={e => setAssetForm((p: any) => ({ ...p, isRentable: e.target.checked }))}
                  className="w-4 h-4 rounded text-brand-500"
                />
                <span className="text-sm text-gray-700">قابل للتأجير</span>
              </label>
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
        <Modal title="تفاصيل الأصل" onClose={() => { setDetailId(null); setActiveTab("journey"); }} size="xl">
          {detailLoading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> جاري التحميل...
            </div>
          ) : detail ? (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {detail.name || detail.type?.name || "أصل"}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    {detail.type && <p className="text-sm text-gray-400">{detail.type.name}</p>}
                    <LocationTypeBadge locationType={detail.locationType} />
                    {!detail.isMovable && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> ثابت
                      </span>
                    )}
                    {detail.isRentable && (
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg">قابل للإيجار</span>
                    )}
                  </div>
                </div>
                <StatusBadge status={detail.status} />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {detail.isMovable && detail.locationType !== "rented" && detail.status !== "maintenance" && (
                  <Btn variant="secondary" onClick={() => { openMoveModal(detail); setDetailId(null); }}>
                    <ArrowRightLeft className="w-4 h-4" /> نقل الأصل
                  </Btn>
                )}
                {["rented", "assigned"].includes(detail.locationType) && (
                  <Btn variant="secondary" onClick={() => { openReturnModal(detail); setDetailId(null); }}>
                    <RotateCcw className="w-4 h-4" /> إرجاع الأصل
                  </Btn>
                )}
                {detail.status === "maintenance" && (
                  <span className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5" /> في الصيانة — لا يمكن النقل
                  </span>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-[#f8fafc] rounded-xl p-1">
                {[
                  { key: "journey",     label: "رحلة الأصل" },
                  { key: "info",        label: "المعلومات" },
                  { key: "maintenance", label: `الصيانة (${detail.maintenanceHistory?.length ?? 0})` },
                  { key: "movements",   label: `الحركات (${detail.movementHistory?.length ?? 0})` },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    className={clsx(
                      "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      activeTab === t.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab: رحلة الأصل */}
              {activeTab === "journey" && (
                <div className="space-y-4">
                  {journeyLoading ? (
                    <div className="flex items-center justify-center h-32 gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
                    </div>
                  ) : journey ? (
                    <>
                      {/* Current Position Card */}
                      <div className={clsx(
                        "rounded-2xl border-2 p-4",
                        journey.currentPosition.status === "available"   && "border-green-200 bg-green-50",
                        journey.currentPosition.status === "in_use"      && "border-blue-200 bg-blue-50",
                        journey.currentPosition.status === "maintenance" && "border-orange-200 bg-orange-50",
                        journey.currentPosition.status === "damaged"     && "border-red-200 bg-red-50",
                        journey.currentPosition.status === "lost"        && "border-[#eef2f6] bg-gray-50",
                        journey.currentPosition.status === "retired"     && "border-[#eef2f6] bg-gray-100",
                      )}>
                        <p className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" /> الموقع الحالي
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {journey.currentPosition.locationType === "warehouse" && (
                            <div className="col-span-2 flex items-center gap-2">
                              <Warehouse className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">في المستودع</span>
                              {journey.currentPosition.locationName && (
                                <span className="text-gray-400">— {journey.currentPosition.locationName}</span>
                              )}
                            </div>
                          )}
                          {journey.currentPosition.locationType === "branch" && (
                            <div className="col-span-2 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-blue-500" />
                              <span className="font-medium text-gray-900">في الفرع</span>
                              {journey.currentPosition.locationName && (
                                <span className="text-gray-400">— {journey.currentPosition.locationName}</span>
                              )}
                            </div>
                          )}
                          {journey.currentPosition.locationType === "assigned" && (
                            <div className="col-span-2 flex items-center gap-2">
                              <User2 className="w-4 h-4 text-purple-500" />
                              <span className="font-medium text-gray-900">معيَّن لموظف</span>
                              {journey.currentPosition.assigneeName && (
                                <span className="text-purple-700 font-semibold">{journey.currentPosition.assigneeName}</span>
                              )}
                            </div>
                          )}
                          {journey.currentPosition.locationType === "rented" && (
                            <>
                              <div className="col-span-2 flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-emerald-500" />
                                <span className="font-medium text-gray-900">مؤجَّر لعميل</span>
                                {journey.currentPosition.customerName && (
                                  <span className="text-emerald-700 font-semibold">{journey.currentPosition.customerName}</span>
                                )}
                              </div>
                              {journey.currentPosition.customerPhone && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Phone className="w-3.5 h-3.5" />
                                  <span dir="ltr">{journey.currentPosition.customerPhone}</span>
                                </div>
                              )}
                            </>
                          )}
                          {journey.currentPosition.condition && (
                            <div className="bg-white/60 rounded-xl p-2">
                              <p className="text-[10px] text-gray-400">الحالة الفيزيائية</p>
                              <p className="font-medium text-gray-800 text-xs">{CONDITION[journey.currentPosition.condition]?.label ?? journey.currentPosition.condition}</p>
                            </div>
                          )}
                          {journey.currentPosition.totalUses != null && (
                            <div className="bg-white/60 rounded-xl p-2">
                              <p className="text-[10px] text-gray-400">مرات الاستخدام</p>
                              <p className="font-medium text-gray-800 text-xs">{journey.currentPosition.totalUses}</p>
                            </div>
                          )}
                          {journey.currentPosition.lastMaintenanceAt && (
                            <div className="bg-white/60 rounded-xl p-2">
                              <p className="text-[10px] text-gray-400">آخر صيانة</p>
                              <p className="font-medium text-gray-800 text-xs">{fmtDate(journey.currentPosition.lastMaintenanceAt)}</p>
                            </div>
                          )}
                          {journey.currentPosition.nextMaintenanceAt && (
                            <div className="bg-white/60 rounded-xl p-2">
                              <p className="text-[10px] text-gray-400">الصيانة القادمة</p>
                              <p className="font-medium text-gray-800 text-xs">{fmtDate(journey.currentPosition.nextMaintenanceAt)}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Active Maintenance Tasks */}
                      {journey.activeTasks?.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                          <p className="text-xs font-semibold text-orange-700 mb-3 flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5" />
                            مهام صيانة نشطة ({journey.activeTasks.length})
                          </p>
                          <div className="space-y-2">
                            {journey.activeTasks.map((task: any) => {
                              const typeInfo = MAINTENANCE_TYPES.find(t => t.key === task.type);
                              const priInfo  = MAINTENANCE_PRIORITIES.find(p => p.key === task.priority);
                              const stInfo   = MAINTENANCE_STATUSES.find(s => s.key === task.status);
                              return (
                                <div key={task.id} className="bg-white rounded-xl p-3 border border-orange-100">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                                      {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
                                    </div>
                                    {stInfo && (
                                      <span className={clsx("px-2 py-0.5 rounded-lg text-[10px] font-medium shrink-0", stInfo.color)}>{stInfo.label}</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {typeInfo && <span className={clsx("px-2 py-0.5 rounded-lg text-[10px] font-medium", typeInfo.color)}>{typeInfo.label}</span>}
                                    {priInfo && <span className={clsx("px-2 py-0.5 rounded-lg text-[10px] font-medium", priInfo.color)}>{priInfo.label}</span>}
                                    {task.assigneeName && (
                                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                        <User2 className="w-3 h-3" />{task.assigneeName}
                                      </span>
                                    )}
                                    {task.scheduledAt && (
                                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                        <Clock className="w-3 h-3" />{fmtDate(task.scheduledAt)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Active Rental Contract */}
                      {journey.activeContract && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                          <p className="text-xs font-semibold text-emerald-700 mb-3 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            عقد الإيجار النشط
                          </p>
                          <div className="bg-white rounded-xl p-3 border border-emerald-100">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-gray-900 text-sm">{journey.activeContract.customer_name}</p>
                              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg dir-ltr">
                                {journey.activeContract.contract_number}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                              <div>
                                <p className="text-[10px] text-gray-400">من</p>
                                <p className="font-medium text-gray-700">{fmtDate(journey.activeContract.start_date)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400">إلى</p>
                                <p className="font-medium text-gray-700">{fmtDate(journey.activeContract.end_date)}</p>
                              </div>
                              {journey.activeContract.daily_rate && Number(journey.activeContract.daily_rate) > 0 && (
                                <div>
                                  <p className="text-[10px] text-gray-400">الإيجار اليومي</p>
                                  <p className="font-medium text-gray-700">{Number(journey.activeContract.daily_rate).toLocaleString()} ر.س</p>
                                </div>
                              )}
                              {journey.activeContract.value && Number(journey.activeContract.value) > 0 && (
                                <div>
                                  <p className="text-[10px] text-gray-400">قيمة العقد</p>
                                  <p className="font-medium text-gray-700">{Number(journey.activeContract.value).toLocaleString()} ر.س</p>
                                </div>
                              )}
                              {journey.activeContract.customer_phone && (
                                <div className="col-span-2 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span dir="ltr">{journey.activeContract.customer_phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" />
                          السجل الزمني الكامل ({journey.timeline?.length ?? 0} حدث)
                        </p>
                        {journey.timeline?.length > 0 ? (
                          <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute right-[11px] top-2 bottom-2 w-0.5 bg-gray-100" />
                            <div className="space-y-3">
                              {journey.timeline.map((item: any, idx: number) => {
                                const isMovement    = item.type === "movement";
                                const isMaintLog    = item.type === "maintenance_log";
                                const isInspection  = item.type === "inspection";
                                const isTask        = item.type === "task";
                                return (
                                  <div key={idx} className="flex gap-3 items-start">
                                    {/* Dot */}
                                    <div className={clsx(
                                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 bg-white z-10",
                                      isMovement   && "border-blue-300",
                                      isMaintLog   && "border-orange-300",
                                      isInspection && "border-purple-300",
                                      isTask       && "border-amber-300",
                                    )}>
                                      {isMovement   && <ArrowRightLeft className="w-2.5 h-2.5 text-blue-400" />}
                                      {isMaintLog   && <Wrench className="w-2.5 h-2.5 text-orange-400" />}
                                      {isInspection && <CheckCircle2 className="w-2.5 h-2.5 text-purple-400" />}
                                      {isTask       && <Clock className="w-2.5 h-2.5 text-amber-400" />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 bg-white border border-[#eef2f6] rounded-xl p-3 text-xs">
                                      {isMovement && (
                                        <>
                                          <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                              <span className={clsx("flex items-center gap-1", LOCATION_TYPE[item.fromType]?.cls ?? "text-gray-500")}>
                                                {item.fromType && (() => { const Ic = LOCATION_TYPE[item.fromType]?.icon; return Ic ? <Ic className="w-3 h-3" /> : null; })()}
                                                {LOCATION_TYPE[item.fromType]?.label ?? item.fromType ?? "—"}
                                              </span>
                                              <ArrowRightLeft className="w-2.5 h-2.5 text-gray-300" />
                                              <span className={clsx("flex items-center gap-1 font-medium", LOCATION_TYPE[item.toType]?.cls ?? "text-gray-700")}>
                                                {item.toType && (() => { const Ic = LOCATION_TYPE[item.toType]?.icon; return Ic ? <Ic className="w-3 h-3" /> : null; })()}
                                                {LOCATION_TYPE[item.toType]?.label ?? item.toType ?? "—"}
                                              </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400">{fmtDate(item.date)}</span>
                                          </div>
                                          {item.reason && <p className="text-gray-500">{item.reason}</p>}
                                          {item.notes  && <p className="text-gray-400 mt-0.5">{item.notes}</p>}
                                        </>
                                      )}
                                      {isMaintLog && (
                                        <>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-orange-700">{MAINT_TYPE[item.maintenanceType] ?? item.maintenanceType}</span>
                                            <span className="text-[10px] text-gray-400">{fmtDate(item.date)}</span>
                                          </div>
                                          {item.description && <p className="text-gray-500">{item.description}</p>}
                                          <div className="flex flex-wrap gap-3 text-gray-400 mt-0.5">
                                            {item.conditionBefore && <span>قبل: {CONDITION[item.conditionBefore]?.label ?? item.conditionBefore}</span>}
                                            {item.conditionAfter  && <span>بعد: {CONDITION[item.conditionAfter]?.label ?? item.conditionAfter}</span>}
                                            {item.cost && Number(item.cost) > 0 && <span>التكلفة: {Number(item.cost).toLocaleString()} ر.س</span>}
                                            {item.performedBy && <span>بواسطة: {item.performedBy}</span>}
                                          </div>
                                        </>
                                      )}
                                      {isInspection && (
                                        <>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-purple-700">
                                              {item.inspType === "pre_rental" ? "فحص قبل التأجير" : item.inspType === "post_rental" ? "فحص بعد الاستلام" : "فحص صيانة"}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{fmtDate(item.date)}</span>
                                          </div>
                                          <div className="flex flex-wrap gap-2 text-gray-500">
                                            {item.condition && <span>الحالة: {CONDITION[item.condition]?.label ?? item.condition}</span>}
                                            {item.damageFound && (
                                              <span className="text-red-500 font-medium">تلف مُبلَّغ عنه</span>
                                            )}
                                            {item.damageCost && Number(item.damageCost) > 0 && (
                                              <span>تكلفة التلف: {Number(item.damageCost).toLocaleString()} ر.س</span>
                                            )}
                                            {item.contractNumber && <span className="font-mono text-gray-400">عقد: {item.contractNumber}</span>}
                                          </div>
                                          {item.damageDescription && <p className="text-red-400 mt-0.5">{item.damageDescription}</p>}
                                        </>
                                      )}
                                      {isTask && (
                                        <>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-amber-700">{item.title}</span>
                                            <span className="text-[10px] text-gray-400">{fmtDate(item.date)}</span>
                                          </div>
                                          <div className="flex flex-wrap gap-2 text-gray-400">
                                            {item.taskType && <span>{MAINTENANCE_TYPES.find(t => t.key === item.taskType)?.label ?? item.taskType}</span>}
                                            {item.status && <span className={clsx("px-1.5 py-0.5 rounded-md text-[10px]", MAINTENANCE_STATUSES.find(s => s.key === item.status)?.color ?? "bg-gray-100 text-gray-500")}>{MAINTENANCE_STATUSES.find(s => s.key === item.status)?.label ?? item.status}</span>}
                                            {item.assigneeName && <span>مُكلَّف: {item.assigneeName}</span>}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-8 bg-[#f8fafc] rounded-xl">
                            لا يوجد سجل بعد
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-gray-400 py-10">فشل تحميل البيانات</p>
                  )}
                </div>
              )}

              {/* Tab: Info */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: "الرقم التسلسلي",     value: detail.serialNumber,   mono: true },
                      { label: "الحالة الفيزيائية",   value: CONDITION[detail.condition]?.label ?? detail.condition },
                      { label: "الموقع الحالي",       value: locations.find(l => l.id === detail.currentLocationId)?.name },
                      { label: "عدد مرات الاستخدام", value: detail.totalUses ?? 0 },
                      { label: "تاريخ الشراء",        value: fmtDate(detail.purchaseDate) },
                      { label: "سعر الشراء",          value: detail.purchasePrice ? `${Number(detail.purchasePrice).toLocaleString()} ر.س` : null },
                      { label: "آخر صيانة",           value: fmtDate(detail.lastMaintenanceAt) },
                      { label: "الصيانة القادمة",      value: fmtDate(detail.nextMaintenanceAt) },
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
                              : "bg-white border-[#eef2f6] text-gray-600 hover:border-brand-300 hover:bg-brand-50",
                          )}
                        >
                          <span className={clsx("w-1.5 h-1.5 rounded-full", dot)} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-[#eef2f6]">
                    <Btn variant="secondary" onClick={() => { openEditAsset(detail); setDetailId(null); }}>
                      <Edit2 className="w-4 h-4" /> تعديل
                    </Btn>
                    <Btn variant="danger" onClick={() => setConfirmDel(detail.id)}>
                      <Trash2 className="w-4 h-4" /> حذف
                    </Btn>
                  </div>
                </div>
              )}

              {/* Tab: Maintenance */}
              {activeTab === "maintenance" && (
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
                        <div key={m.id} className="border border-[#eef2f6] rounded-xl p-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">{MAINT_TYPE[m.type] ?? m.type}</span>
                            <span className="text-xs text-gray-400">{fmtDate(m.startDate)}</span>
                          </div>
                          {m.description && <p className="text-gray-500 text-xs mb-1">{m.description}</p>}
                          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                            {m.performedBy && <span>بواسطة: {m.performedBy}</span>}
                            {m.cost && Number(m.cost) > 0 && <span>التكلفة: {Number(m.cost).toLocaleString()} ر.س</span>}
                            {m.conditionAfter && <span>الحالة بعد: {CONDITION[m.conditionAfter]?.label ?? m.conditionAfter}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8 bg-[#f8fafc] rounded-xl">
                      لا يوجد سجل صيانة بعد
                    </p>
                  )}
                </div>
              )}

              {/* Tab: Movement History */}
              {activeTab === "movements" && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <History className="w-4 h-4 text-gray-400" />
                      سجل الحركات ({detail.movementHistory?.length ?? 0})
                    </p>
                  </div>
                  {detail.movementHistory?.length > 0 ? (
                    <div className="space-y-2">
                      {detail.movementHistory.map((mv: any) => {
                        const fromCfg = LOCATION_TYPE[mv.fromLocationType ?? "warehouse"];
                        const toCfg   = LOCATION_TYPE[mv.toLocationType ?? "warehouse"];
                        const FromIcon = fromCfg?.icon ?? Warehouse;
                        const ToIcon   = toCfg?.icon ?? Warehouse;
                        return (
                          <div key={mv.id} className="border border-[#eef2f6] rounded-xl p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={clsx("flex items-center gap-1 text-xs", fromCfg?.cls)}>
                                <FromIcon className="w-3 h-3" /> {fromCfg?.label ?? "—"}
                              </span>
                              <ArrowRightLeft className="w-3 h-3 text-gray-300" />
                              <span className={clsx("flex items-center gap-1 text-xs font-medium", toCfg?.cls)}>
                                <ToIcon className="w-3 h-3" /> {toCfg?.label ?? "—"}
                              </span>
                              <span className="text-xs text-gray-400 mr-auto">{fmtDate(mv.createdAt)}</span>
                            </div>
                            {mv.reason && <p className="text-xs text-gray-500">{mv.reason}</p>}
                            {mv.notes && <p className="text-xs text-gray-400 mt-0.5">{mv.notes}</p>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8 bg-[#f8fafc] rounded-xl">
                      لا يوجد سجل حركات بعد
                    </p>
                  )}
                </div>
              )}

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
          MODAL: Move Asset
      ══════════════════════════════════════════════════ */}
      {moveModal && (
        <Modal
          title={`نقل الأصل — ${moveModal.asset.name || "أصل"}`}
          onClose={() => setMoveModal(null)}
          size="md"
          footer={
            <>
              <Btn variant="secondary" onClick={() => setMoveModal(null)}>إلغاء</Btn>
              <Btn onClick={handleMove} loading={doMove.loading}>تأكيد النقل</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>الموقع الحالي: <LocationTypeBadge locationType={moveModal.asset.locationType} /></span>
            </div>

            <Field label="نقل إلى *">
              <select
                value={moveForm.toLocationType}
                onChange={e => setMoveForm((p: any) => ({ ...p, toLocationType: e.target.value, toLocationId: "", toAssignedUserId: "" }))}
                className={inputCls}
              >
                {Object.entries(LOCATION_TYPE)
                  .filter(([v]) => v !== moveModal.asset.locationType)
                  .map(([v, { label }]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
              </select>
            </Field>

            {["branch", "warehouse"].includes(moveForm.toLocationType) && locations.length > 0 && (
              <Field label="الفرع / الموقع">
                <select
                  value={moveForm.toLocationId}
                  onChange={e => setMoveForm((p: any) => ({ ...p, toLocationId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">اختر الموقع</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
            )}

            {moveForm.toLocationType === "assigned" && (
              <Field label="الموظف المُعيَّن له *">
                <select
                  value={moveForm.toAssignedUserId}
                  onChange={e => setMoveForm((p: any) => ({ ...p, toAssignedUserId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">اختر الموظف</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
            )}

            {moveForm.toLocationType === "rented" && !moveModal.asset.isRentable && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                هذا الأصل غير محدد كـ "قابل للتأجير"
              </div>
            )}

            <Field label="سبب النقل">
              <select
                value={moveForm.reason}
                onChange={e => setMoveForm((p: any) => ({ ...p, reason: e.target.value }))}
                className={inputCls}
              >
                {MOVE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>

            <Field label="ملاحظات (اختياري)">
              <textarea
                value={moveForm.notes}
                onChange={e => setMoveForm((p: any) => ({ ...p, notes: e.target.value }))}
                className={clsx(inputCls, "h-16 resize-none")}
                placeholder="أي تفاصيل إضافية..."
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Return Asset
      ══════════════════════════════════════════════════ */}
      {returnModal && (
        <Modal
          title={`إرجاع الأصل — ${returnModal.asset.name || "أصل"}`}
          onClose={() => setReturnModal(null)}
          size="sm"
          footer={
            <>
              <Btn variant="secondary" onClick={() => setReturnModal(null)}>إلغاء</Btn>
              <Btn onClick={handleReturn} loading={doReturn.loading}>تأكيد الإرجاع</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              سيتم إرجاع الأصل وتغيير حالته إلى "متاح".
            </p>
            <Field label="إرجاع إلى فرع (اختياري)">
              <select
                value={returnLocationId}
                onChange={e => setReturnLocationId(e.target.value)}
                className={inputCls}
              >
                <option value="">المستودع (افتراضي)</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
