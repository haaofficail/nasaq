import { useState } from "react";
import { Package, Plus, Pencil, Trash2, RefreshCw, Tag, Star, ToggleLeft, ToggleRight, X, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { bundlesApi, servicesApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select, Toast } from "@/components/ui";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:    { label: "نشطة",   color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  draft:     { label: "مسودة",  color: "bg-gray-100 text-gray-500 border-gray-200" },
  archived:  { label: "مؤرشفة", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

const EMPTY = {
  name: "", nameEn: "", description: "", status: "active",
  discountMode: "percentage", discountValue: "0", finalPrice: "",
};

function fmt(n: any) {
  if (!n || Number(n) === 0) return "—";
  return Number(n).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " ر.س";
}

export function PackagesPage() {
  const [showModal, setShowModal]         = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [editing, setEditing]             = useState<any>(null);
  const [manageBundle, setManageBundle]   = useState<any>(null);
  const [form, setForm]                   = useState({ ...EMPTY });
  const [saving, setSaving]               = useState(false);
  const [toast, setToast]                 = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { data: res, loading, refetch }   = useApi(() => bundlesApi.list(), []);
  const { data: servicesRes }             = useApi(() => servicesApi.list(), []);
  const { data: bundleDetail, refetch: refetchDetail } = useApi(
    () => manageBundle ? bundlesApi.get(manageBundle.id) : Promise.resolve(null),
    [manageBundle?.id]
  );

  const { mutate: createBundle } = useMutation((d: any) => bundlesApi.create(d));
  const { mutate: updateBundle } = useMutation(({ id, d }: any) => bundlesApi.update(id, d));
  const { mutate: deleteBundle } = useMutation((id: string) => bundlesApi.delete(id));
  const { mutate: addItem }      = useMutation(({ id, d }: any) => bundlesApi.addItem(id, d));
  const { mutate: removeItem }   = useMutation(({ bundleId, itemId }: any) => bundlesApi.removeItem(bundleId, itemId));

  const bundles: any[]  = res?.data || [];
  const services: any[] = servicesRes?.data || [];
  const bundleItems: any[] = bundleDetail?.data?.items || [];
  const addedServiceIds = new Set(bundleItems.map((i: any) => i.serviceId));

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setShowModal(true); };
  const openEdit = (b: any) => {
    setEditing(b);
    setForm({
      name: b.name || "", nameEn: b.nameEn || "", description: b.description || "",
      status: b.status || "active", discountMode: b.discountMode || "percentage",
      discountValue: String(b.discountValue || "0"), finalPrice: String(b.finalPrice || ""),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateBundle({ id: editing.id, d: form });
        setToast({ msg: "تم تحديث الباقة", type: "success" });
      } else {
        await createBundle(form);
        setToast({ msg: "تم إنشاء الباقة", type: "success" });
      }
      setShowModal(false);
      refetch();
    } catch { setToast({ msg: "فشل الحفظ", type: "error" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه الباقة نهائياً؟")) return;
    try {
      await deleteBundle(id);
      setToast({ msg: "تم الحذف", type: "success" });
      refetch();
    } catch { setToast({ msg: "فشل الحذف", type: "error" }); }
  };

  const toggleStatus = async (b: any) => {
    const next = b.status === "active" ? "draft" : "active";
    try {
      await updateBundle({ id: b.id, d: { status: next } });
      refetch();
    } catch { setToast({ msg: "فشل التحديث", type: "error" }); }
  };

  const handleAddService = async (serviceId: string) => {
    if (!manageBundle) return;
    try {
      await addItem({ id: manageBundle.id, d: { serviceId, quantity: 1 } });
      refetchDetail();
    } catch { setToast({ msg: "فشل إضافة الخدمة", type: "error" }); }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!manageBundle) return;
    try {
      await removeItem({ bundleId: manageBundle.id, itemId });
      refetchDetail();
    } catch { setToast({ msg: "فشل الحذف", type: "error" }); }
  };

  const activeCount  = bundles.filter(b => b.status === "active").length;
  const draftCount   = bundles.filter(b => b.status === "draft").length;
  const avgPrice     = bundles.filter(b => b.finalPrice).length
    ? bundles.filter(b => b.finalPrice).reduce((s: number, b: any) => s + Number(b.finalPrice), 0) / bundles.filter(b => b.finalPrice).length
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-500" /> الباقات والحزم
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">اجمع عدة خدمات في باقة واحدة بسعر مميز</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refetch} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button icon={Plus} onClick={openCreate}>باقة جديدة</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الباقات",    value: `${bundles.length} باقة`,   color: "text-brand-600",   bg: "bg-brand-50" },
          { label: "نشطة",              value: `${activeCount} باقة`,       color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "مسودة",             value: `${draftCount} باقة`,        color: "text-amber-600",   bg: "bg-amber-50" },
          { label: "متوسط سعر الباقة",  value: avgPrice ? fmt(avgPrice) : "—", color: "text-violet-600", bg: "bg-violet-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.bg)}>
              <Package className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-lg font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bundles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-gray-100 rounded" />
              <div className="h-3 w-full bg-gray-100 rounded" />
              <div className="h-8 w-24 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : bundles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد باقات بعد</h3>
          <p className="text-sm text-gray-400 mb-5">أنشئ باقة تجمع خدماتك بسعر مميز يجذب العملاء</p>
          <Button icon={Plus} onClick={openCreate}>إنشاء أول باقة</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map((b: any) => {
            const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.draft;
            const isActive = b.status === "active";
            return (
              <div key={b.id} className={clsx(
                "bg-white rounded-2xl border p-5 flex flex-col gap-4 transition-shadow hover:shadow-sm",
                isActive ? "border-gray-100" : "border-gray-100 opacity-75"
              )}>
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{b.name}</h3>
                      {b.isFeatured && <Star className="w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500" />}
                    </div>
                    {b.nameEn && <p className="text-xs text-gray-400">{b.nameEn}</p>}
                  </div>
                  <span className={clsx("shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium border", sc.color)}>
                    {sc.label}
                  </span>
                </div>

                {/* Description */}
                {b.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{b.description}</p>
                )}

                {/* Price */}
                <div className="flex items-center gap-2">
                  {b.finalPrice ? (
                    <span className="text-lg font-bold text-brand-600 tabular-nums">{fmt(b.finalPrice)}</span>
                  ) : b.totalBasePrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-brand-600 tabular-nums">{fmt(b.totalBasePrice)}</span>
                      {Number(b.discountValue) > 0 && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          خصم {b.discountValue}{b.discountMode === "percentage" ? "%" : " ر.س"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">السعر غير محدد</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                  <button onClick={() => { setManageBundle(b); setShowServicesModal(true); }}
                    className="flex-1 py-1.5 rounded-xl border border-brand-200 text-brand-600 text-xs font-medium hover:bg-brand-50 transition-colors">
                    إدارة الخدمات
                  </button>
                  <button onClick={() => openEdit(b)}
                    className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-brand-500" />
                  </button>
                  <button onClick={() => toggleStatus(b)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title={isActive ? "إيقاف" : "تفعيل"}>
                    {isActive
                      ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                      : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button onClick={() => handleDelete(b.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editing ? "تعديل الباقة" : "باقة جديدة"}
        footer={<>
          <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? "حفظ التعديلات" : "إنشاء الباقة"}</Button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="اسم الباقة *" name="name" value={form.name}
              onChange={e => f("name", e.target.value)} placeholder="باقة الأفراح الذهبية" required />
            <Input label="الاسم بالإنجليزية" name="nameEn" value={form.nameEn}
              onChange={e => f("nameEn", e.target.value)} placeholder="Gold Wedding Package" dir="ltr" />
          </div>
          <Input label="الوصف" name="description" value={form.description}
            onChange={e => f("description", e.target.value)} placeholder="وصف مختصر للباقة وما تشمله..." />
          <div className="grid grid-cols-2 gap-3">
            <Select label="نمط الخصم" name="discountMode" value={form.discountMode}
              onChange={e => f("discountMode", e.target.value)}
              options={[{ value: "percentage", label: "نسبة مئوية %" }, { value: "fixed", label: "مبلغ ثابت ر.س" }]} />
            <Input label={form.discountMode === "percentage" ? "نسبة الخصم %" : "مبلغ الخصم (ر.س)"}
              name="discountValue" value={form.discountValue}
              onChange={e => f("discountValue", e.target.value)} placeholder="0" dir="ltr" />
          </div>
          <Input label="السعر النهائي (ر.س)" name="finalPrice" value={form.finalPrice}
            onChange={e => f("finalPrice", e.target.value)} placeholder="اتركه فارغاً لحساب آلياً" dir="ltr" />
          <Select label="الحالة" name="status" value={form.status}
            onChange={e => f("status", e.target.value)}
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
        </div>
      </Modal>

      {/* Manage Services Modal */}
      <Modal open={showServicesModal} onClose={() => { setShowServicesModal(false); setManageBundle(null); refetch(); }}
        title={`خدمات باقة: ${manageBundle?.name || ""}`}
        footer={<Button onClick={() => { setShowServicesModal(false); setManageBundle(null); refetch(); }}>تم</Button>}>
        <div className="space-y-4">
          {/* Current items */}
          {bundleItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">الخدمات المضافة ({bundleItems.length})</p>
              <div className="space-y-2">
                {bundleItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-brand-50 rounded-xl border border-brand-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.service?.name || "خدمة"}</p>
                      {item.service?.basePrice && (
                        <p className="text-xs text-gray-500">{Number(item.service.basePrice).toLocaleString("ar-SA")} ر.س</p>
                      )}
                    </div>
                    <button onClick={() => handleRemoveItem(item.id)}
                      className="p-1 rounded-lg hover:bg-red-50 transition-colors">
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add services */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">إضافة خدمة</p>
            <div className="max-h-52 overflow-y-auto space-y-1.5 border border-gray-100 rounded-xl p-2">
              {services.filter((s: any) => !addedServiceIds.has(s.id)).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">تم إضافة جميع الخدمات المتاحة</p>
              ) : (
                services.filter((s: any) => !addedServiceIds.has(s.id)).map((s: any) => (
                  <button key={s.id} onClick={() => handleAddService(s.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-right">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.name}</p>
                      {s.basePrice && <p className="text-xs text-gray-400">{Number(s.basePrice).toLocaleString("ar-SA")} ر.س</p>}
                    </div>
                    <Plus className="w-4 h-4 text-brand-500 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
