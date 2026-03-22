import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { inventoryApi } from "@/lib/api";
import { Key, Plus, Edit2, AlertTriangle, X, CheckCircle2, Clock, Package } from "lucide-react";
import { clsx } from "clsx";

const CONDITION_LABELS: Record<string, string> = { excellent: "ممتاز", good: "جيد", fair: "مقبول", poor: "سيئ", under_maintenance: "تحت الصيانة" };
const CONDITION_COLORS: Record<string, string> = { excellent: "bg-green-50 text-green-700", good: "bg-blue-50 text-blue-700", fair: "bg-yellow-50 text-yellow-700", poor: "bg-red-50 text-red-600", under_maintenance: "bg-orange-50 text-orange-700" };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function AssetsPage() {
  const { data: typesData, loading: typesLoading, refetch: refetchTypes } = useApi(() => inventoryApi.assetTypes());
  const { data: assetsData, loading: assetsLoading, refetch: refetchAssets } = useApi(() => inventoryApi.assets());
  const [typeModal, setTypeModal] = useState(false);
  const [assetModal, setAssetModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const [typeForm, setTypeForm] = useState({ name: "", description: "" });
  const [assetForm, setAssetForm] = useState({ name: "", typeId: "", serialNumber: "", condition: "good", dailyRate: "", notes: "" });
  const [filterType, setFilterType] = useState("all");

  const createType = useMutation((d: any) => inventoryApi.createAssetType(d));
  const createAsset = useMutation((d: any) => inventoryApi.createAsset(d));

  const types: any[] = typesData?.data || [];
  const assets: any[] = assetsData?.data || [];

  const filteredAssets = filterType === "all" ? assets : assets.filter(a => a.typeId === filterType);
  const available = assets.filter(a => a.status === "available" || !a.status).length;
  const rented = assets.filter(a => a.status === "rented").length;
  const maintenance = assets.filter(a => a.status === "maintenance" || a.condition === "under_maintenance").length;

  const saveType = async () => {
    if (!typeForm.name.trim()) return;
    await createType.mutate(typeForm);
    setTypeModal(false);
    refetchTypes();
  };

  const saveAsset = async () => {
    if (!assetForm.name.trim()) return;
    await createAsset.mutate({ ...assetForm, dailyRate: parseFloat(assetForm.dailyRate) || 0 });
    setAssetModal({ open: false });
    refetchAssets();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-brand-500" /> الأصول
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{assets.length} أصل · {available} متاح</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTypeModal(true)} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-xl px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Plus className="w-4 h-4" /> فئة
          </button>
          <button onClick={() => { setAssetForm({ name: "", typeId: types[0]?.id || "", serialNumber: "", condition: "good", dailyRate: "", notes: "" }); setAssetModal({ open: true }); }} className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
            <Plus className="w-4 h-4" /> أصل جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "متاح", value: available, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "مؤجر", value: rented, icon: Key, color: "text-brand-500 bg-brand-50" },
          { label: "صيانة", value: maintenance, icon: Clock, color: "text-orange-600 bg-orange-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color.split(" ")[1])}>
              <Icon className={clsx("w-4 h-4", color.split(" ")[0])} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Type filter */}
      {types.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setFilterType("all")} className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors", filterType === "all" ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
            الكل ({assets.length})
          </button>
          {types.map(t => (
            <button key={t.id} onClick={() => setFilterType(t.id)} className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors", filterType === t.id ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
              {t.name} ({assets.filter(a => a.typeId === t.id).length})
            </button>
          ))}
        </div>
      )}

      {/* Assets grid */}
      {(typesLoading || assetsLoading) ? (
        <div className="text-center py-12 text-gray-400 text-sm">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAssets.map(asset => {
            const type = types.find(t => t.id === asset.typeId);
            const isAvailable = asset.status === "available" || !asset.status;
            return (
              <div key={asset.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{asset.name}</p>
                    {type && <p className="text-xs text-gray-400">{type.name}</p>}
                    {asset.serialNumber && <p className="text-xs text-gray-400 font-mono"># {asset.serialNumber}</p>}
                  </div>
                  <button onClick={() => { setAssetForm({ name: asset.name, typeId: asset.typeId || "", serialNumber: asset.serialNumber || "", condition: asset.condition || "good", dailyRate: String(asset.dailyRate || ""), notes: asset.notes || "" }); setAssetModal({ open: true, item: asset }); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-500 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className={clsx("px-2 py-1 rounded-lg text-xs font-medium", CONDITION_COLORS[asset.condition] || "bg-gray-100 text-gray-500")}>
                    {CONDITION_LABELS[asset.condition] || asset.condition || "جيد"}
                  </span>
                  <span className={clsx("w-2 h-2 rounded-full", isAvailable ? "bg-green-400" : asset.status === "rented" ? "bg-brand-400" : "bg-orange-400")} />
                </div>
                {asset.dailyRate ? (
                  <p className="text-sm font-semibold text-brand-600 tabular-nums">{asset.dailyRate} ر.س / يوم</p>
                ) : null}
                {asset.notes && <p className="text-xs text-gray-400 truncate">{asset.notes}</p>}
              </div>
            );
          })}

          {filteredAssets.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-gray-100 text-center py-16">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا توجد أصول بعد</p>
              <button onClick={() => setAssetModal({ open: true })} className="mt-3 text-sm text-brand-500 hover:underline">أضف أول أصل</button>
            </div>
          )}
        </div>
      )}

      {typeModal && (
        <Modal title="فئة جديدة" onClose={() => setTypeModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم الفئة</label>
              <input value={typeForm.name} onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="مثال: سيارات، معدات، أجهزة" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">الوصف</label>
              <input value={typeForm.description} onChange={e => setTypeForm(p => ({ ...p, description: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="وصف اختياري" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveType} disabled={createType.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">حفظ</button>
              <button onClick={() => setTypeModal(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {assetModal.open && (
        <Modal title={assetModal.item ? "تعديل الأصل" : "أصل جديد"} onClose={() => setAssetModal({ open: false })}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم الأصل</label>
              <input value={assetForm.name} onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="مثال: سيارة تويوتا 2023" />
            </div>
            {types.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">الفئة</label>
                <select value={assetForm.typeId} onChange={e => setAssetForm(p => ({ ...p, typeId: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300">
                  <option value="">اختر الفئة</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">الرقم التسلسلي</label>
                <input value={assetForm.serialNumber} onChange={e => setAssetForm(p => ({ ...p, serialNumber: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="SN-001" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">إيجار يومي (ر.س)</label>
                <input type="number" value={assetForm.dailyRate} onChange={e => setAssetForm(p => ({ ...p, dailyRate: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">الحالة</label>
              <select value={assetForm.condition} onChange={e => setAssetForm(p => ({ ...p, condition: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300">
                {Object.entries(CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={saveAsset} disabled={createAsset.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">حفظ</button>
              <button onClick={() => setAssetModal({ open: false })} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
