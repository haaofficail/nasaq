import { useState } from "react";
import { toast } from "@/hooks/useToast";
import { useSearchParams } from "react-router-dom";
import { Boxes, Plus, Wrench, CheckCircle2, Package, AlertTriangle, Pencil, Trash2, RefreshCw, ChevronDown, ArrowDown, ArrowUp, BarChart3, TrendingDown } from "lucide-react";
import { clsx } from "clsx";
import { confirmDialog } from "@/components/ui";
import { inventoryApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select, PageHeader } from "@/components/ui";
import { SuppliersPage } from "./SuppliersPage";

const statusConfig: Record<string, { label: string; color: string }> = {
  available:   { label: "متاح",    color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  reserved:    { label: "محجوز",   color: "bg-blue-50 text-blue-700 border-blue-100" },
  maintenance: { label: "صيانة",   color: "bg-amber-50 text-amber-700 border-amber-100" },
  damaged:     { label: "تالف",    color: "bg-red-50 text-red-700 border-red-100" },
};

const EMPTY_FORM = { name: "", assetTypeId: "", serialNumber: "", condition: "good", notes: "", purchasePrice: "" };

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-lg", className)} />;
}

const EMPTY_TYPE_FORM = { name: "", category: "", alertThreshold: "2" };

function AssetsTab() {
  const [showModal, setShowModal]         = useState(false);
  const [editing, setEditing]             = useState<any>(null);
  const [form, setForm]                   = useState({ ...EMPTY_FORM });
  const [saving, setSaving]               = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType]     = useState<any>(null);
  const [typeForm, setTypeForm]           = useState({ ...EMPTY_TYPE_FORM });
  const [savingType, setSavingType]       = useState(false);
  const [statusMenuId, setStatusMenuId]   = useState<string | null>(null);

  const { data: typesRes,  loading: tLoading, refetch: refetchTypes } = useApi(() => inventoryApi.assetTypes(), []);
  const { data: assetsRes, loading: aLoading, refetch }               = useApi(() => inventoryApi.assets(), []);
  const { data: reportRes, refetch: refetchReport }                   = useApi(() => inventoryApi.report(), []);
  const { mutate: createAsset }      = useMutation((data: any) => inventoryApi.createAsset(data));
  const { mutate: updateAsset }      = useMutation(({ id, data }: any) => inventoryApi.updateAsset(id, data));
  const { mutate: deleteAsset }      = useMutation((id: string) => inventoryApi.deleteAsset(id));
  const { mutate: updateStatus }     = useMutation(({ id, status }: any) => inventoryApi.updateStatus(id, status));
  const { mutate: createAssetType }  = useMutation((data: any) => inventoryApi.createAssetType(data));
  const { mutate: updateAssetType }  = useMutation(({ id, data }: any) => inventoryApi.updateAssetType(id, data));
  const { mutate: deleteAssetType }  = useMutation((id: string) => inventoryApi.deleteAssetType(id));

  const types: any[]  = typesRes?.data  || [];
  const assets: any[] = assetsRes?.data || [];
  const report        = reportRes?.data  || {};
  const loading       = tLoading || aLoading;

  const lowStockTypes = types.filter((t: any) => {
    const threshold = Number(t.alertThreshold ?? 2);
    return Number(t.availableAssets ?? 0) <= threshold;
  });

  const refresh = () => { refetch(); refetchReport(); refetchTypes(); };

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
  const openEdit   = (a: any) => {
    setEditing(a);
    setForm({
      name: a.name || "",
      assetTypeId: a.assetTypeId || "",
      serialNumber: a.serialNumber || "",
      condition: a.condition || "good",
      notes: a.notes || "",
      purchasePrice: a.purchasePrice || "",
    });
    setShowModal(true);
  };

  const openCreateType = () => { setEditingType(null); setTypeForm({ ...EMPTY_TYPE_FORM }); setShowTypeModal(true); };
  const openEditType   = (t: any) => { setEditingType(t); setTypeForm({ name: t.name || "", category: t.category || "", alertThreshold: String(t.alertThreshold ?? 2) }); setShowTypeModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateAsset({ id: editing.id, data: form });
        toast.success("تم تحديث الأصل");
      } else {
        await createAsset(form);
        toast.success("تمت إضافة الأصل");
      }
      setShowModal(false);
      refresh();
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveType = async () => {
    if (!typeForm.name.trim()) return;
    setSavingType(true);
    try {
      if (editingType) {
        await updateAssetType({ id: editingType.id, data: typeForm });
        toast.success("تم تحديث النوع");
      } else {
        await createAssetType(typeForm);
        toast.success("تمت إضافة النوع");
      }
      setShowTypeModal(false);
      refetchTypes();
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSavingType(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: "حذف الأصل؟", danger: true, confirmLabel: "حذف" }))) return;
    try {
      await deleteAsset(id);
      toast.success("تم الحذف");
      refresh();
    } catch {
      toast.error("فشل الحذف");
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!(await confirmDialog({ title: "حذف النوع؟", danger: true, confirmLabel: "حذف" }))) return;
    try {
      await deleteAssetType(id);
      toast.success("تم حذف النوع");
      refetchTypes();
    } catch (err: any) {
      toast.error(err?.message || "فشل الحذف");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setStatusMenuId(null);
    try {
      await updateStatus({ id, status });
      toast.success("تم تحديث الحالة");
      refresh();
    } catch {
      toast.error("فشل تحديث الحالة");
    }
  };

  const f  = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));
  const ft = (field: string, val: string) => setTypeForm(p => ({ ...p, [field]: val }));

  return (
    <div className="space-y-5" onClick={() => setStatusMenuId(null)}>
      {/* Actions row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{assets.length} أصل</p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button variant="secondary" icon={Plus} onClick={openCreateType}>نوع جديد</Button>
          <Button icon={Plus} onClick={openCreate}>أصل جديد</Button>
        </div>
      </div>

      {/* Low-stock alert banner */}
      {lowStockTypes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">تنبيه: مخزون منخفض</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {lowStockTypes.map((t: any) => t.name).join("، ")} — وحدات متاحة أقل من الحد المطلوب
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الأصول", value: report.totalAssets  ?? assets.length, color: "text-brand-600",   bg: "bg-brand-50",   icon: Boxes },
          { label: "متاح",          value: report.available    ?? assets.filter((a: any) => a.status === "available").length,   color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
          { label: "بالصيانة",      value: report.maintenance  ?? assets.filter((a: any) => a.status === "maintenance").length, color: "text-amber-600",   bg: "bg-amber-50",   icon: Wrench },
          { label: "تالف",          value: report.damaged      ?? assets.filter((a: any) => a.status === "damaged").length,     color: "text-red-500",     bg: "bg-red-50",     icon: AlertTriangle },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.bg)}>
              <s.icon className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Asset type cards */}
          {types.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {types.map((type: any) => {
                const available  = Number(type.availableAssets ?? 0);
                const threshold  = Number(type.alertThreshold ?? 2);
                const isOut      = available === 0;
                const isLowStock = !isOut && available <= threshold;
                return (
                <div key={type.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                      <Boxes className="w-4 h-4 text-brand-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900 flex-1">{type.name}</h3>
                    <div className="flex items-center gap-1">
                      {isOut && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">نفد المخزون</span>
                      )}
                      {isLowStock && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">مخزون منخفض</span>
                      )}
                      <button onClick={() => openEditType(type)} className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-brand-400" />
                      </button>
                      <button onClick={() => handleDeleteType(type.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{type.totalAssets || 0} وحدة</span>
                    <span className="text-emerald-600 font-medium">{available} متاح</span>
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{
                        width: type.totalAssets > 0
                          ? `${Math.round((available / type.totalAssets) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* Assets table */}
          {assets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Boxes className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد أصول</h3>
              <p className="text-sm text-gray-400 mb-4">أضف أصولك ومعداتك</p>
              <Button icon={Plus} onClick={openCreate}>أصل جديد</Button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">الأصل</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden sm:table-cell">النوع</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden md:table-cell">الرقم التسلسلي</th>
                    <th className="py-3 px-4 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a: any) => {
                    const sc = statusConfig[a.status] || statusConfig.available;
                    return (
                      <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                              <Package className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <span className="font-medium text-gray-900">{a.name || a.assetTypeName || "—"}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 text-xs hidden sm:table-cell">{a.assetTypeName || "—"}</td>
                        <td className="py-3.5 px-4">
                          {/* Inline status dropdown */}
                          <div className="relative" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setStatusMenuId(statusMenuId === a.id ? null : a.id)}
                              className={clsx("flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer hover:opacity-80 transition-opacity", sc.color)}
                            >
                              {sc.label}
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {statusMenuId === a.id && (
                              <div className="absolute top-full mt-1 right-0 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-1 min-w-[110px]">
                                {Object.entries(statusConfig).map(([key, cfg]) => (
                                  <button
                                    key={key}
                                    onClick={() => handleStatusChange(a.id, key)}
                                    className={clsx(
                                      "w-full text-right px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
                                      a.status === key ? "font-semibold text-brand-600" : "text-gray-700"
                                    )}
                                  >
                                    {cfg.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-gray-400 hidden md:table-cell">
                          {a.serialNumber || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                              <Pencil className="w-3.5 h-3.5 text-brand-500" />
                            </button>
                            <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "تعديل الأصل" : "أصل جديد"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? "حفظ التعديلات" : "إضافة"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="اسم الأصل" name="name" value={form.name}
            onChange={e => f("name", e.target.value)} placeholder="مثال: طاولة خشبية كبيرة" required />
          <div>
            <Select label="نوع الأصل" name="type" value={form.assetTypeId}
              onChange={e => f("assetTypeId", e.target.value)}
              options={[{ value: "", label: "— اختر النوع —" }, ...types.map((t: any) => ({ value: t.id, label: t.name }))]} />
            {types.length === 0 && (
              <button type="button" onClick={() => { setShowModal(false); openCreateType(); }}
                className="mt-1.5 text-xs text-brand-600 hover:underline">
                + إضافة نوع أصل أولاً
              </button>
            )}
          </div>
          <Input label="الرقم التسلسلي" name="serial" value={form.serialNumber}
            onChange={e => f("serialNumber", e.target.value)} dir="ltr" placeholder="SN-XXXXXXXX" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="الحالة" name="condition" value={form.condition}
              onChange={e => f("condition", e.target.value)}
              options={[{ value:"good",label:"جيدة" }, { value:"fair",label:"مقبولة" }, { value:"poor",label:"ضعيفة" }]} />
            <Input label="سعر الشراء (ر.س)" name="price" value={form.purchasePrice}
              onChange={e => f("purchasePrice", e.target.value)} dir="ltr" placeholder="0" />
          </div>
          <Input label="ملاحظات" name="notes" value={form.notes}
            onChange={e => f("notes", e.target.value)} placeholder="أي ملاحظات..." />
        </div>
      </Modal>

      {/* Add / Edit Type Modal */}
      <Modal
        open={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title={editingType ? "تعديل نوع الأصل" : "إضافة نوع أصل"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTypeModal(false)}>إلغاء</Button>
            <Button onClick={handleSaveType} loading={savingType}>{editingType ? "حفظ التعديلات" : "إضافة"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="اسم النوع" name="typeName" value={typeForm.name}
            onChange={e => ft("name", e.target.value)} placeholder="مثال: طاولة، كرسي، خيمة" required />
          <Input label="التصنيف" name="typeCategory" value={typeForm.category}
            onChange={e => ft("category", e.target.value)} placeholder="مثال: أثاث، معدات، إضاءة" />
          <Input
            label="حد التنبيه (وحدات متاحة)"
            name="alertThreshold"
            type="number"
            value={typeForm.alertThreshold}
            onChange={e => ft("alertThreshold", e.target.value)}
            dir="ltr"
            placeholder="2"
          />
          <p className="text-xs text-gray-400 -mt-2">نبّهني عند وصول عدد الوحدات المتاحة إلى أقل من هذا الرقم</p>
        </div>
      </Modal>    </div>
  );
}

// ============================================================
// CONSUMABLES TAB — inventory_products + stock_movements
// ============================================================

const EMPTY_PRODUCT = { name: "", nameEn: "", sku: "", category: "", unit: "قطعة", unitCost: "", sellingPrice: "", currentStock: "", minStock: "", notes: "" };
const ADJUST_TYPES = [
  { value: "in",         label: "إضافة مخزون" },
  { value: "out",        label: "استخدام / صرف" },
  { value: "waste",      label: "هالك / تالف" },
  { value: "return",     label: "إرجاع للمخزون" },
  { value: "adjustment", label: "تسوية يدوية" },
];

function ConsumablesTab() {
  const [showModal,    setShowModal]    = useState(false);
  const [editing,      setEditing]      = useState<any>(null);
  const [form,         setForm]         = useState({ ...EMPTY_PRODUCT });
  const [saving,       setSaving]       = useState(false);
  const [adjustItem,   setAdjustItem]   = useState<any>(null);
  const [adjustForm,   setAdjustForm]   = useState({ type: "in", quantity: "", notes: "" });
  const [adjusting,    setAdjusting]    = useState(false);
  const [filterLow,    setFilterLow]    = useState(false);
  const [filterCat,    setFilterCat]    = useState("");

  const params: Record<string, string> = {};
  if (filterLow) params.low_stock = "1";
  if (filterCat) params.category  = filterCat;

  const { data, loading, refetch } = useApi(() => inventoryApi.products(Object.keys(params).length ? params : undefined), [filterLow, filterCat]);
  const products: any[] = data?.data || [];

  const categories = [...new Set(products.map((p: any) => p.category).filter(Boolean))];
  const lowCount   = products.filter((p: any) => p.is_low_stock).length;
  const totalValue = products.reduce((s: number, p: any) => s + parseFloat(p.current_stock || 0) * parseFloat(p.unit_cost || 0), 0);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_PRODUCT }); setShowModal(true); };
  const openEdit   = (p: any) => {
    setEditing(p);
    setForm({ name: p.name||"", nameEn: p.name_en||"", sku: p.sku||"", category: p.category||"", unit: p.unit||"قطعة", unitCost: p.unit_cost||"", sellingPrice: p.selling_price||"", currentStock: p.current_stock||"", minStock: p.min_stock||"", notes: p.notes||"" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await inventoryApi.updateProduct(editing.id, form);
        toast.success("تم التحديث");
      } else {
        await inventoryApi.createProduct(form);
        toast.success("تمت الإضافة");
      }
      setShowModal(false);
      refetch();
    } catch { toast.error("فشل الحفظ"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: "حذف المنتج؟", danger: true, confirmLabel: "حذف" }))) return;
    await inventoryApi.deleteProduct(id);
    toast.success("تم الحذف");
    refetch();
  };

  const handleAdjust = async () => {
    if (!adjustForm.quantity || !adjustItem) return;
    setAdjusting(true);
    try {
      await inventoryApi.adjustStock(adjustItem.id, { type: adjustForm.type, quantity: parseFloat(adjustForm.quantity), notes: adjustForm.notes });
      toast.success("تم تعديل المخزون");
      setAdjustItem(null);
      refetch();
    } catch (err: any) { toast.error(err?.message || "فشل التعديل"); } finally { setAdjusting(false); }
  };

  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  return (
    <div className="space-y-5">
      {/* Top actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterLow(v => !v)}
            className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors", filterLow ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50")}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            مخزون منخفض {lowCount > 0 && <span className="bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">{lowCount}</span>}
          </button>
          {categories.length > 0 && (
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 outline-none">
              <option value="">كل التصنيفات</option>
              {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button onClick={refetch} className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <Button icon={Plus} onClick={openCreate}>مادة جديدة</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المواد",    value: products.length,                        color: "text-brand-600",   bg: "bg-brand-50",   icon: Boxes },
          { label: "مخزون منخفض",     value: lowCount,                               color: "text-red-500",     bg: "bg-red-50",     icon: AlertTriangle },
          { label: "قيمة المخزون",     value: `${totalValue.toLocaleString("en-US")} ر.س`, color: "text-emerald-600", bg: "bg-emerald-50", icon: BarChart3 },
          { label: "تصنيفات",         value: categories.length,                      color: "text-purple-600",  bg: "bg-purple-50",  icon: Package },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.bg)}>
              <s.icon className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد مواد</h3>
          <p className="text-sm text-gray-400 mb-4">أضف المواد والمستهلكات المستخدمة في خدماتك</p>
          <Button icon={Plus} onClick={openCreate}>مادة جديدة</Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">المادة</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden sm:table-cell">التصنيف</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">المخزون</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden md:table-cell">الحد الأدنى</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden lg:table-cell">تكلفة الوحدة</th>
                <th className="py-3 px-4 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className={clsx("border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors", p.is_low_stock && "bg-red-50/30")}>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", p.is_low_stock ? "bg-red-50" : "bg-gray-100")}>
                        <Package className={clsx("w-3.5 h-3.5", p.is_low_stock ? "text-red-400" : "text-gray-400")} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {p.sku && <p className="text-xs text-gray-400 font-mono">{p.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-500 hidden sm:table-cell">{p.category || "—"}</td>
                  <td className="py-3.5 px-4">
                    <span className={clsx("font-semibold tabular-nums", p.is_low_stock ? "text-red-600" : "text-gray-900")}>
                      {parseFloat(p.current_stock).toLocaleString("en-US")}
                    </span>
                    <span className="text-xs text-gray-400 mr-1">{p.unit}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-500 hidden md:table-cell">{parseFloat(p.min_stock).toLocaleString("en-US")} {p.unit}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-500 hidden lg:table-cell">{parseFloat(p.unit_cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ر.س</td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => { setAdjustItem(p); setAdjustForm({ type: "in", quantity: "", notes: "" }); }} className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors" title="تعديل المخزون">
                        <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                      </button>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-brand-400" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "تعديل المادة" : "مادة جديدة"} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button><Button onClick={handleSave} loading={saving}>{editing ? "حفظ" : "إضافة"}</Button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="الاسم" name="name" value={form.name} onChange={e => f("name", e.target.value)} placeholder="مثال: أكياس بلاستيك" required />
            <Input label="SKU / الكود" name="sku" value={form.sku} onChange={e => f("sku", e.target.value)} dir="ltr" placeholder="PKG-001" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="التصنيف" name="cat" value={form.category} onChange={e => f("category", e.target.value)} placeholder="مثال: تغليف، تنظيف" />
            <Input label="الوحدة" name="unit" value={form.unit} onChange={e => f("unit", e.target.value)} placeholder="قطعة، كيلو، لتر" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="المخزون الحالي" name="stock" value={form.currentStock} onChange={e => f("currentStock", e.target.value)} dir="ltr" placeholder="0" />
            <Input label="الحد الأدنى" name="min" value={form.minStock} onChange={e => f("minStock", e.target.value)} dir="ltr" placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="تكلفة الوحدة (ر.س)" name="cost" value={form.unitCost} onChange={e => f("unitCost", e.target.value)} dir="ltr" placeholder="0.00" />
            <Input label="سعر البيع (ر.س)" name="price" value={form.sellingPrice} onChange={e => f("sellingPrice", e.target.value)} dir="ltr" placeholder="0.00" />
          </div>
          <Input label="ملاحظات" name="notes" value={form.notes} onChange={e => f("notes", e.target.value)} placeholder="أي ملاحظات..." />
        </div>
      </Modal>

      {/* Stock Adjustment Modal */}
      {adjustItem && (
        <Modal open={!!adjustItem} onClose={() => setAdjustItem(null)} title={`تعديل مخزون: ${adjustItem.name}`} size="sm"
          footer={<><Button variant="secondary" onClick={() => setAdjustItem(null)}>إلغاء</Button><Button onClick={handleAdjust} loading={adjusting}>تأكيد</Button></>}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
              <span className="text-gray-500">المخزون الحالي: </span>
              <span className="font-bold text-gray-900">{parseFloat(adjustItem.current_stock).toLocaleString("en-US")} {adjustItem.unit}</span>
            </div>
            <Select label="نوع الحركة" name="adjType" value={adjustForm.type}
              onChange={e => setAdjustForm(p => ({ ...p, type: e.target.value }))}
              options={ADJUST_TYPES} />
            <Input label="الكمية" name="qty" value={adjustForm.quantity}
              onChange={e => setAdjustForm(p => ({ ...p, quantity: e.target.value }))} dir="ltr" placeholder="0" required />
            <Input label="ملاحظات (اختياري)" name="adjNotes" value={adjustForm.notes}
              onChange={e => setAdjustForm(p => ({ ...p, notes: e.target.value }))} placeholder="سبب التعديل..." />
          </div>
        </Modal>
      )}
    </div>
  );
}

const INVENTORY_TABS = [
  { id: "assets",       label: "الأصول الثابتة" },
  { id: "consumables",  label: "المواد والمستهلكات" },
  { id: "suppliers",    label: "الموردون" },
];

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "assets";
  return (
    <div dir="rtl">
      <PageHeader
        title="المخزون"
        description="الأصول والمواد وإدارة الموردين"
        tabs={INVENTORY_TABS}
        activeTab={tab}
        onTabChange={(id) => setSearchParams({ tab: id })}
      />
      {tab === "assets"      && <AssetsTab />}
      {tab === "consumables" && <ConsumablesTab />}
      {tab === "suppliers"   && <SuppliersPage />}

      {/* Guide + FAQ */}
      <div className="mt-5 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">دليل المخزون — الفرق بين الأقسام</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: "الأصول الثابتة", desc: "معدات ومقتنيات ذات قيمة تستمر لفترة طويلة مثل أجهزة، أثاث، سيارات. لها رقم مسلسل وتتبع حالة (متاح، محجوز، صيانة).", examples: "كاميرا، طاولة، لاب توب، سيارة." },
              { title: "المواد والمستهلكات", desc: "بنود تُستهلك بالاستخدام وتحتاج إعادة تعبئة دورية. يمكن تتبع كميتها وتنبيهك عند نقصها.", examples: "ورق، حبر، بودر، منظفات، مواد خام." },
              { title: "الموردون", desc: "الجهات التي تشتري منها الأصول أو المواد. ربط المورد بالمنتج يسهّل تتبع المشتريات والتواصل.", examples: "مورد أثاث، شركة طباعة، مستودع مواد." },
            ].map(s => (
              <div key={s.title} className="border border-gray-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-800 mb-1">{s.title}</p>
                <p className="text-xs text-gray-500 mb-2">{s.desc}</p>
                <p className="text-xs text-gray-400">أمثلة: {s.examples}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
          <div className="space-y-3">
            {[
              { q: "متى يظهر تحذير «مخزون منخفض»؟", a: "عندما تصل كمية المادة إلى أقل من الحد الأدنى الذي حددته عند إضافة المنتج (حقل «الحد الأدنى للمخزون»)." },
              { q: "ما «تسوية المخزون» وكيف تستخدمها؟", a: "هي تعديل يدوي للكمية عند وجود فرق بين الواقع والسجلات (مثل اكتشاف تالف أو خطأ في العد). استخدمها بحذر لأنها تُثبّت الكمية فعلياً." },
              { q: "كيف أسجّل أن أصلاً في الصيانة؟", a: "افتح الأصل واضغط على حالته ثم اختر «صيانة». سيُخفيه من قائمة المتاح تلقائياً حتى تعيده لحالة «متاح»." },
              { q: "هل يمكنني ربط الأصل بحجز معين؟", a: "نعم، عند إنشاء حجز يمكن تحديد الأصل المطلوب. سيتحول تلقائياً إلى حالة «محجوز» طوال مدة الحجز." },
            ].map(faq => (
              <details key={faq.q} className="border border-gray-100 rounded-xl">
                <summary className="px-4 py-3 text-sm text-gray-700 cursor-pointer font-medium hover:bg-gray-50 rounded-xl">{faq.q}</summary>
                <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
