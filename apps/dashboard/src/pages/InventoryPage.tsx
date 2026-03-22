import { useState } from "react";
import { Boxes, Plus, Wrench, CheckCircle2, Package, AlertTriangle, Pencil, Trash2, RefreshCw, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { inventoryApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select, Toast } from "@/components/ui";

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

const EMPTY_TYPE_FORM = { name: "", category: "" };

export function InventoryPage() {
  const [showModal, setShowModal]         = useState(false);
  const [editing, setEditing]             = useState<any>(null);
  const [form, setForm]                   = useState({ ...EMPTY_FORM });
  const [saving, setSaving]               = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType]     = useState<any>(null);
  const [typeForm, setTypeForm]           = useState({ ...EMPTY_TYPE_FORM });
  const [savingType, setSavingType]       = useState(false);
  const [statusMenuId, setStatusMenuId]   = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

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
  const openEditType   = (t: any) => { setEditingType(t); setTypeForm({ name: t.name || "", category: t.category || "" }); setShowTypeModal(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateAsset({ id: editing.id, data: form });
        setToast({ msg: "تم تحديث الأصل", type: "success" });
      } else {
        await createAsset(form);
        setToast({ msg: "تمت إضافة الأصل", type: "success" });
      }
      setShowModal(false);
      refresh();
    } catch {
      setToast({ msg: "فشل الحفظ", type: "error" });
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
        setToast({ msg: "تم تحديث النوع", type: "success" });
      } else {
        await createAssetType(typeForm);
        setToast({ msg: "تمت إضافة النوع", type: "success" });
      }
      setShowTypeModal(false);
      refetchTypes();
    } catch {
      setToast({ msg: "فشل الحفظ", type: "error" });
    } finally {
      setSavingType(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا الأصل؟")) return;
    try {
      await deleteAsset(id);
      setToast({ msg: "تم الحذف", type: "success" });
      refresh();
    } catch {
      setToast({ msg: "فشل الحذف", type: "error" });
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm("حذف هذا النوع؟")) return;
    try {
      await deleteAssetType(id);
      setToast({ msg: "تم حذف النوع", type: "success" });
      refetchTypes();
    } catch (err: any) {
      setToast({ msg: err?.message || "فشل الحذف", type: "error" });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setStatusMenuId(null);
    try {
      await updateStatus({ id, status });
      setToast({ msg: "تم تحديث الحالة", type: "success" });
      refresh();
    } catch {
      setToast({ msg: "فشل تحديث الحالة", type: "error" });
    }
  };

  const f  = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));
  const ft = (field: string, val: string) => setTypeForm(p => ({ ...p, [field]: val }));

  return (
    <div className="space-y-5" onClick={() => setStatusMenuId(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">المخزون والأصول</h1>
          <p className="text-sm text-gray-400 mt-0.5">{assets.length} أصل</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button variant="secondary" icon={Plus} onClick={openCreateType}>نوع جديد</Button>
          <Button icon={Plus} onClick={openCreate}>أصل جديد</Button>
        </div>
      </div>

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
              {types.map((type: any) => (
                <div key={type.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                      <Boxes className="w-4 h-4 text-brand-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900 flex-1">{type.name}</h3>
                    <div className="flex gap-1">
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
                    <span className="text-emerald-600 font-medium">{type.availableAssets || 0} متاح</span>
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{
                        width: type.totalAssets > 0
                          ? `${Math.round((type.availableAssets / type.totalAssets) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
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
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
