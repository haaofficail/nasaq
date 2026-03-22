import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { inventoryApi } from "@/lib/api";
import { Flower2, Plus, Edit2, Trash2, AlertTriangle, X, Package } from "lucide-react";
import { clsx } from "clsx";

interface AssetType { id: string; name: string; unit?: string; description?: string; }
interface Asset { id: string; name: string; typeId?: string; quantity?: number; minQuantity?: number; unitCost?: number; notes?: string; }

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

export function FlowerInventoryPage() {
  const { data: typesData, loading: typesLoading, refetch: refetchTypes } = useApi(() => inventoryApi.assetTypes());
  const { data: assetsData, loading: assetsLoading, refetch: refetchAssets } = useApi(() => inventoryApi.assets());
  const [typeModal, setTypeModal] = useState<{ open: boolean; item?: AssetType }>({ open: false });
  const [assetModal, setAssetModal] = useState<{ open: boolean; item?: Asset }>({ open: false });
  const [typeForm, setTypeForm] = useState({ name: "", unit: "وردة", description: "" });
  const [assetForm, setAssetForm] = useState({ name: "", typeId: "", quantity: "", minQuantity: "", unitCost: "", notes: "" });
  const [filterType, setFilterType] = useState("all");

  const createType = useMutation((d: any) => inventoryApi.createAssetType(d));
  const createAsset = useMutation((d: any) => inventoryApi.createAsset(d));

  const types: AssetType[] = typesData?.data || [];
  const assets: Asset[] = assetsData?.data || [];

  const filteredAssets = filterType === "all" ? assets : assets.filter(a => a.typeId === filterType);
  const lowStock = assets.filter(a => (a.quantity || 0) <= (a.minQuantity || 5));

  const openTypeModal = (item?: AssetType) => {
    setTypeForm({ name: item?.name || "", unit: item?.unit || "وردة", description: item?.description || "" });
    setTypeModal({ open: true, item });
  };

  const openAssetModal = (item?: Asset) => {
    setAssetForm({ name: item?.name || "", typeId: item?.typeId || (types[0]?.id || ""), quantity: String(item?.quantity || ""), minQuantity: String(item?.minQuantity || "5"), unitCost: String(item?.unitCost || ""), notes: item?.notes || "" });
    setAssetModal({ open: true, item });
  };

  const saveType = async () => {
    if (!typeForm.name.trim()) return;
    await createType.mutate(typeForm);
    setTypeModal({ open: false });
    refetchTypes();
  };

  const saveAsset = async () => {
    if (!assetForm.name.trim()) return;
    await createAsset.mutate({ ...assetForm, quantity: parseInt(assetForm.quantity) || 0, minQuantity: parseInt(assetForm.minQuantity) || 5, unitCost: parseFloat(assetForm.unitCost) || 0 });
    setAssetModal({ open: false });
    refetchAssets();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Flower2 className="w-5 h-5 text-brand-500" /> مخزون الورد
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{assets.length} صنف · {lowStock.length > 0 && <span className="text-red-500">{lowStock.length} قارب على النفاد</span>}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openTypeModal()} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-xl px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Plus className="w-4 h-4" /> نوع جديد
          </button>
          <button onClick={() => openAssetModal()} className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
            <Plus className="w-4 h-4" /> إضافة مخزون
          </button>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">تنبيه: مخزون منخفض</p>
            <p className="text-xs text-red-500 mt-0.5">{lowStock.map(a => a.name).join("، ")}</p>
          </div>
        </div>
      )}

      {/* Type filter tabs */}
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

      {/* Inventory grid */}
      {(typesLoading || assetsLoading) ? (
        <div className="text-center py-12 text-gray-400 text-sm">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAssets.map(asset => {
            const type = types.find(t => t.id === asset.typeId);
            const qty = asset.quantity || 0;
            const min = asset.minQuantity || 5;
            const isLow = qty <= min;
            return (
              <div key={asset.id} className={clsx("bg-white rounded-2xl border p-4 space-y-3 transition-all", isLow ? "border-red-200" : "border-gray-100")}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{asset.name}</p>
                    {type && <p className="text-xs text-gray-400">{type.name}</p>}
                  </div>
                  <button onClick={() => openAssetModal(asset)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-500 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className={clsx("text-3xl font-bold tabular-nums", isLow ? "text-red-500" : "text-gray-900")}>{qty}</p>
                    <p className="text-xs text-gray-400">{type?.unit || "وحدة"} · حد أدنى: {min}</p>
                  </div>
                  {asset.unitCost ? (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">تكلفة الوحدة</p>
                      <p className="text-sm font-semibold text-gray-700 tabular-nums">{asset.unitCost} ر.س</p>
                    </div>
                  ) : null}
                </div>
                {/* Stock bar */}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={clsx("h-full rounded-full transition-all", isLow ? "bg-red-400" : "bg-brand-400")} style={{ width: `${Math.min(100, (qty / Math.max(min * 3, qty)) * 100)}%` }} />
                </div>
                {isLow && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> مخزون منخفض</p>}
              </div>
            );
          })}

          {filteredAssets.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-gray-100 text-center py-16">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا يوجد مخزون بعد</p>
              <button onClick={() => openAssetModal()} className="mt-3 text-sm text-brand-500 hover:underline">أضف أول صنف</button>
            </div>
          )}
        </div>
      )}

      {typeModal.open && (
        <Modal title="نوع ورد جديد" onClose={() => setTypeModal({ open: false })}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم النوع</label>
              <input value={typeForm.name} onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="مثال: ورد أحمر، زنبق" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">وحدة القياس</label>
              <input value={typeForm.unit} onChange={e => setTypeForm(p => ({ ...p, unit: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="وردة / باقة / صندوق" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveType} disabled={createType.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">حفظ</button>
              <button onClick={() => setTypeModal({ open: false })} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {assetModal.open && (
        <Modal title={assetModal.item ? "تعديل المخزون" : "إضافة مخزون"} onClose={() => setAssetModal({ open: false })}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">الاسم</label>
              <input value={assetForm.name} onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="مثال: ورد أحمر مستورد" />
            </div>
            {types.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">النوع</label>
                <select value={assetForm.typeId} onChange={e => setAssetForm(p => ({ ...p, typeId: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300">
                  <option value="">اختر النوع</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">الكمية</label>
                <input type="number" value={assetForm.quantity} onChange={e => setAssetForm(p => ({ ...p, quantity: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">الحد الأدنى</label>
                <input type="number" value={assetForm.minQuantity} onChange={e => setAssetForm(p => ({ ...p, minQuantity: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="5" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">التكلفة (ر.س)</label>
                <input type="number" value={assetForm.unitCost} onChange={e => setAssetForm(p => ({ ...p, unitCost: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="0" />
              </div>
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
