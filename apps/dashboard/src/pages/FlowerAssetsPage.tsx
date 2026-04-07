import { useState } from "react";
import { Package, Plus, Pencil, Trash2, RotateCcw, Wrench,
         AlertCircle, Loader2, CheckCircle2, Clock, Archive,
         ChevronDown, History, Search, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/hooks/useToast";
import { confirmDialog } from "@/components/ui";
import { useApi, useMutation } from "@/hooks/useApi";
import { decorAssetsApi } from "@/lib/api";
import { Modal, Input, Select, Button } from "@/components/ui";

const CATEGORIES = [
  { value: "artificial_flowers", label: "ورد صناعي" },
  { value: "stands",             label: "ستاندات وحوامل" },
  { value: "backdrops",          label: "خلفيات" },
  { value: "vases",              label: "فازات تشغيلية" },
  { value: "holders",            label: "قواعد وأطواق" },
  { value: "decor",              label: "قطع ديكور" },
  { value: "kiosk_equipment",    label: "تجهيزات كوش" },
  { value: "other",              label: "أخرى" },
];

const LOCATION_TYPES = [
  { value: "warehouse",           label: "المستودع" },
  { value: "client_site",         label: "موقع العميل" },
  { value: "with_driver",         label: "مع السائق" },
  { value: "maintenance_center",  label: "مركز الصيانة" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  available:           { label: "متاح",              color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  reserved:            { label: "محجوز",             color: "bg-amber-100 text-amber-700",   icon: Clock },
  in_use:              { label: "قيد الاستخدام",     color: "bg-blue-100 text-blue-700",     icon: Package },
  returned:            { label: "راجع",              color: "bg-gray-100 text-gray-700",     icon: RotateCcw },
  maintenance:         { label: "صيانة",             color: "bg-orange-100 text-orange-700", icon: Wrench },
  damaged:             { label: "تالف",              color: "bg-red-100 text-red-700",       icon: Archive },
  pending_inspection:  { label: "بانتظار الفحص",    color: "bg-purple-100 text-purple-700", icon: Search },
};

export function FlowerAssetsPage() {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showMovements, setShowMovements] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", category: "other", code: "", location: "",
    location_type: "warehouse",
    purchase_date: "", purchase_cost: "", notes: "",
  });

  const { data: res, loading, error, refetch } = useApi(
    () => decorAssetsApi.list({ status: filterStatus, category: filterCategory }),
    [filterStatus, filterCategory]
  );
  const { data: statsRes } = useApi(() => decorAssetsApi.stats(), []);
  const { mutate: createAsset, loading: creating } = useMutation((d: any) => decorAssetsApi.create(d));
  const { mutate: updateAsset, loading: updating } = useMutation(({ id, ...d }: any) => decorAssetsApi.update(id, d));
  const { mutate: deleteAsset } = useMutation((id: string) => decorAssetsApi.delete(id));
  const { mutate: changeStatus } = useMutation(({ id, status, notes }: any) =>
    decorAssetsApi.changeStatus(id, { status, notes }));

  const assets: any[] = res?.data ?? [];
  const stats: any = statsRes?.data ?? {};

  const openCreate = () => {
    setForm({ name: "", category: "other", code: "", location: "",
              location_type: "warehouse", purchase_date: "", purchase_cost: "", notes: "" });
    setEditingItem(null);
    setShowForm(true);
  };
  const openEdit = (a: any) => {
    setForm({
      name: a.name, category: a.category, code: a.code ?? "",
      location: a.location ?? "", location_type: a.location_type ?? "warehouse",
      purchase_date: a.purchase_date ?? "",
      purchase_cost: a.purchase_cost ?? "", notes: a.notes ?? "",
    });
    setEditingItem(a);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("اسم الأصل مطلوب"); return; }
    const payload = {
      name: form.name.trim(), category: form.category,
      code: form.code || undefined, location: form.location || undefined,
      location_type: form.location_type,
      purchase_date: form.purchase_date || undefined,
      purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : undefined,
      notes: form.notes || undefined,
    };
    if (editingItem) {
      await updateAsset({ id: editingItem.id, ...payload });
    } else {
      await createAsset(payload);
    }
    toast.success(editingItem ? "تم التعديل" : "تم إضافة الأصل");
    setShowForm(false);
    refetch();
  };

  const handleDelete = async (a: any) => {
    const ok = await confirmDialog({ title: `حذف "${a.name}"؟`, danger: true, confirmLabel: "حذف" });
    if (!ok) return;
    await deleteAsset(a.id);
    toast.success("تم الحذف");
    refetch();
  };

  const handleStatus = async (a: any, status: string) => {
    await changeStatus({ id: a.id, status });
    toast.success(`تم تغيير الحالة إلى: ${STATUS_CONFIG[status]?.label ?? status}`);
    refetch();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-9 h-9 text-red-400" />
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">الأصول الصناعية</h1>
          <p className="text-sm text-gray-400 mt-0.5">ستاندات، خلفيات، ورد صناعي — قابلة لإعادة الاستخدام</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>إضافة أصل</Button>
      </div>

      {/* Stats */}
      {statsRes && (
        <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
          {[
            { key: "total",              label: "الإجمالي",          color: "text-gray-700" },
            { key: "available",          label: "متاح",              color: "text-green-600" },
            { key: "reserved",           label: "محجوز",             color: "text-amber-600" },
            { key: "in_use",             label: "قيد الاستخدام",     color: "text-blue-600" },
            { key: "maintenance",        label: "صيانة",             color: "text-orange-600" },
            { key: "pending_inspection", label: "بانتظار الفحص",    color: "text-purple-600" },
            { key: "damaged",            label: "تالف",              color: "text-red-600" },
          ].map(s => (
            <div key={s.key} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{stats[s.key] ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:border-brand-400"
        >
          <option value="">جميع الحالات</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:border-brand-400"
        >
          <option value="">جميع التصنيفات</option>
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {assets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد أصول بعد</h3>
          <p className="text-sm text-gray-400 mb-4">أضف ستاندات، خلفيات، وقطع ديكور قابلة لإعادة الاستخدام</p>
          <Button icon={Plus} onClick={openCreate}>إضافة أصل</Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-right font-semibold text-gray-500">الأصل</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-500">التصنيف</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-500">الموقع</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-500">مرتبط بـ</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a: any) => {
                const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.available;
                const Icon = sc.icon;
                return (
                  <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{a.name}</p>
                      {a.code && <p className="text-xs text-gray-400">{a.code}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {CATEGORIES.find(c => c.value === a.category)?.label ?? a.category}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <div>
                        <p>{a.location ?? "—"}</p>
                        <p className="text-xs text-gray-400">
                          {LOCATION_TYPES.find(l => l.value === a.location_type)?.label ?? "المستودع"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", sc.color)}>
                        <Icon className="w-3 h-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.linked_order_number ? (
                        <a
                          href={`/dashboard/flower-service-orders`}
                          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {a.linked_order_number}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(a.status === "maintenance" || a.status === "pending_inspection") && (
                          <button
                            onClick={() => handleStatus(a, "available")}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                            title="أعد للمخزون"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {a.status === "returned" && (
                          <button
                            onClick={() => handleStatus(a, "pending_inspection")}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
                            title="ابدأ الفحص"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {a.status === "available" && (
                          <button
                            onClick={() => handleStatus(a, "maintenance")}
                            className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors"
                            title="أرسل للصيانة"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setShowMovements(a.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="سجل الحركات"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(a)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingItem ? "تعديل الأصل" : "إضافة أصل صناعي"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} loading={creating || updating}>
              {editingItem ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input name="name" label="اسم الأصل" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="مثال: ستاند أبيض كبير" required />
          <Select name="category" label="التصنيف" value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            options={CATEGORIES} />
          <div className="grid grid-cols-2 gap-3">
            <Input name="code" label="الكود" value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="يُولَّد تلقائياً (AF-0001، ST-0002...)" />
            <Input name="location" label="الموقع (وصف)" value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="مستودع 1 / رف 3" />
          </div>
          <Select name="location_type" label="نوع الموقع" value={form.location_type}
            onChange={e => setForm(f => ({ ...f, location_type: e.target.value }))}
            options={LOCATION_TYPES} />
          <div className="grid grid-cols-2 gap-3">
            <Input name="purchase_date" label="تاريخ الشراء" type="date" value={form.purchase_date}
              onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            <Input name="purchase_cost" label="تكلفة الشراء (ر.س)" type="number" value={form.purchase_cost}
              onChange={e => setForm(f => ({ ...f, purchase_cost: e.target.value }))} />
          </div>
          <Input name="notes" label="ملاحظات" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="وصف أو ملاحظات" />
        </div>
      </Modal>

      {/* Movements Modal */}
      {showMovements && (
        <MovementsModal assetId={showMovements} onClose={() => setShowMovements(null)} />
      )}
    </div>
  );
}

function MovementsModal({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const { data: res, loading } = useApi(() => decorAssetsApi.movements(assetId), [assetId]);
  const movements: any[] = res?.data ?? [];

  const MOVE_LABELS: Record<string, string> = {
    reserved: "حُجِز", dispatched: "خرج للموقع", returned: "رجع",
    damaged: "تلف", maintenance: "دخل صيانة", repaired: "اكتملت الصيانة", available: "أُعيد للمخزون",
  };

  return (
    <Modal open onClose={onClose} title="سجل الحركات" size="sm">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : movements.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">لا توجد حركات مسجلة بعد</p>
      ) : (
        <div className="space-y-2">
          {movements.map((m: any) => (
            <div key={m.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {MOVE_LABELS[m.movement_type] ?? m.movement_type}
                </p>
                {m.reference_label && (
                  <p className="text-xs text-gray-400">{m.reference_label}</p>
                )}
                {m.notes && <p className="text-xs text-gray-400">{m.notes}</p>}
              </div>
              <p className="text-xs text-gray-400 shrink-0">
                {new Date(m.created_at).toLocaleDateString("ar-SA")}
              </p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
