import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { rentalApi, customersApi } from "@/lib/api";
import {
  FileSignature, Plus, X, CheckCircle2, Clock, FileX, Package,
  AlertTriangle, Search, ChevronDown, ChevronUp, DollarSign, Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة", active: "نشط", completed: "مكتمل", overdue: "متأخر", cancelled: "ملغي",
};
const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600 border-gray-200",
  active:    "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  overdue:   "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-400 border-gray-200",
};

type Contract = {
  id: string; contract_number: string; title: string; status: string;
  customer_name?: string; customer_phone?: string; customer_id?: string;
  value: string; deposit: string; deposit_returned: string;
  start_date?: string; end_date?: string; actual_return_date?: string;
  signed_by?: string; signed_at?: string; notes?: string;
  asset_count?: number; damage_count?: number; is_overdue?: boolean;
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300";
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
    {children}
  </div>
);

export function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [detailContract, setDetailContract] = useState<Contract | null>(null);
  const [addAssetModal, setAddAssetModal] = useState(false);
  const [inspectionModal, setInspectionModal] = useState<{ type: string } | null>(null);
  const [form, setForm] = useState({
    title: "", customerName: "", customerPhone: "", customerId: "",
    value: "", deposit: "", startDate: "", endDate: "", notes: "",
  });
  const [assetForm, setAssetForm] = useState({ assetName: "", quantity: "1", dailyRate: "", notes: "" });
  const [inspForm, setInspForm] = useState({
    type: "pre_rental", condition: "good", damageFound: false,
    damageDescription: "", damageCost: "", inspectorName: "", notes: "",
  });
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, loading, refetch }    = useApi(() => rentalApi.contracts({ status: statusFilter !== "all" ? statusFilter : undefined, search: search || undefined }), [statusFilter, search]);
  const { data: statsData }           = useApi(() => rentalApi.contractStats(), []);
  const { data: detailData, refetch: refetchDetail } = useApi(
    () => detailContract ? rentalApi.getContract(detailContract.id) : Promise.resolve(null),
    [detailContract?.id]
  );

  const createMut  = useMutation((d: any) => rentalApi.createContract(d));
  const updateMut  = useMutation(({ id, ...d }: any) => rentalApi.updateContract(id, d));
  const addAsset   = useMutation(({ contractId, ...d }: any) => rentalApi.addContractAsset(contractId, d));
  const rmAsset    = useMutation(({ contractId, id }: any) => rentalApi.removeContractAsset(contractId, id));
  const addInsp    = useMutation((d: any) => rentalApi.createInspection(d));

  const contracts: Contract[] = data?.data || [];
  const stats = statsData?.data;
  const fullContract = detailData?.data;

  const overdueContracts = contracts.filter(c => c.is_overdue || c.status === "overdue");

  const save = async () => {
    if (!form.title.trim()) return;
    await createMut.mutate({
      title: form.title, customerName: form.customerName || null, customerPhone: form.customerPhone || null,
      customerId: form.customerId || null,
      value: parseFloat(form.value) || 0, deposit: parseFloat(form.deposit) || 0,
      startDate: form.startDate || null, endDate: form.endDate || null, notes: form.notes || null,
    });
    setCreateModal(false);
    setForm({ title: "", customerName: "", customerPhone: "", customerId: "", value: "", deposit: "", startDate: "", endDate: "", notes: "" });
    refetch();
  };

  const handleSign = async (id: string) => {
    const name = prompt("اسم الموقّع:");
    if (!name) return;
    await updateMut.mutate({ id, status: "active", signedBy: name, signedAt: new Date().toISOString() });
    refetch();
    if (detailContract?.id === id) refetchDetail();
  };

  const handleComplete = async (id: string) => {
    const returnDate = prompt("تاريخ الإرجاع الفعلي (YYYY-MM-DD):", new Date().toISOString().split("T")[0]);
    await updateMut.mutate({ id, status: "completed", actualReturnDate: returnDate || null });
    refetch();
    setDetailContract(null);
  };

  const handleAddAsset = async () => {
    if (!assetForm.assetName.trim() || !detailContract) return;
    await addAsset.mutate({
      contractId: detailContract.id,
      assetName: assetForm.assetName,
      quantity: parseInt(assetForm.quantity) || 1,
      dailyRate: parseFloat(assetForm.dailyRate) || 0,
      notes: assetForm.notes || null,
    });
    setAssetForm({ assetName: "", quantity: "1", dailyRate: "", notes: "" });
    setAddAssetModal(false);
    refetchDetail();
  };

  const handleAddInspection = async () => {
    if (!detailContract) return;
    await addInsp.mutate({
      contractId: detailContract.id,
      type: inspForm.type, condition: inspForm.condition,
      damageFound: inspForm.damageFound,
      damageDescription: inspForm.damageFound ? inspForm.damageDescription : null,
      damageCost: inspForm.damageFound && inspForm.damageCost ? parseFloat(inspForm.damageCost) : null,
      inspectorName: inspForm.inspectorName || null, notes: inspForm.notes || null,
    });
    setInspectionModal(null);
    setInspForm({ type: "pre_rental", condition: "good", damageFound: false, damageDescription: "", damageCost: "", inspectorName: "", notes: "" });
    refetchDetail();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-brand-500" /> العقود
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{contracts.length} عقد</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600">
          <Plus className="w-4 h-4" /> عقد جديد
        </button>
      </div>

      {/* Overdue alert */}
      {overdueContracts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{overdueContracts.length} عقد متأخر عن موعد الإرجاع</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي",    value: stats?.total || contracts.length,                                             icon: FileSignature, color: "text-brand-500 bg-brand-50" },
          { label: "نشطة",     value: stats?.active || contracts.filter(c => c.status === "active").length,         icon: Clock,         color: "text-blue-600 bg-blue-50" },
          { label: "موقّعة",   value: stats?.completed || contracts.filter(c => c.status === "completed").length,   icon: CheckCircle2,  color: "text-green-600 bg-green-50" },
          { label: "متأخرة",   value: stats?.overdue || overdueContracts.length,                                    icon: AlertTriangle,  color: "text-red-500 bg-red-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color.split(" ")[1])}>
              <Icon className={clsx("w-4 h-4", color.split(" ")[0])} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Finance summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "إجمالي قيمة العقود", value: `${parseFloat(stats.total_value || 0).toFixed(0)} ر.س`, color: "text-brand-600" },
            { label: "إجمالي الودائع",      value: `${parseFloat(stats.total_deposit || 0).toFixed(0)} ر.س`, color: "text-blue-600" },
            { label: "ودائع مردودة",        value: `${parseFloat(stats.deposit_returned || 0).toFixed(0)} ر.س`, color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
              <p className={clsx("text-lg font-bold tabular-nums", color)}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full border border-gray-200 rounded-xl pr-9 pl-4 py-2 text-sm outline-none focus:border-brand-300" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["all","draft","active","completed","overdue"] as const).map(v => (
            <button key={v} onClick={() => setStatusFilter(v)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors", statusFilter === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>
              {v === "all" ? "الكل" : STATUS_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts list */}
      {loading ? (
        <SkeletonRows />
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">لا توجد عقود</p>
          <button onClick={() => setCreateModal(true)} className="mt-2 text-sm text-brand-500 hover:underline">أضف أول عقد</button>
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map(c => (
            <div
              key={c.id}
              onClick={() => { setDetailContract(c); setDetailOpen(true); }}
              className={clsx("bg-white rounded-2xl border px-5 py-4 cursor-pointer hover:border-brand-200 transition-all",
                c.is_overdue || c.status === "overdue" ? "border-red-200" : "border-gray-100"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{c.title}</p>
                    {(c.is_overdue || c.status === "overdue") && (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">متأخر!</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.contract_number}
                    {c.customer_name && ` · ${c.customer_name}`}
                    {c.start_date && ` · ${c.start_date}`}
                    {c.end_date && ` ← ${c.end_date}`}
                  </p>
                  {c.damage_count && parseFloat(String(c.damage_count)) > 0 && (
                    <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {c.damage_count} ضرر مسجّل
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-400">القيمة</p>
                    <p className="font-semibold text-gray-900 tabular-nums">{parseFloat(c.value || "0").toFixed(0)} ر.س</p>
                  </div>
                  <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-medium border", STATUS_COLORS[c.status] || "bg-gray-100 text-gray-500 border-gray-200")}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {createModal && (
        <Modal title="عقد جديد" onClose={() => setCreateModal(false)}>
          <div className="space-y-4">
            <Field label="عنوان العقد *">
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="مثال: عقد تأجير معدات تصوير" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="اسم العميل">
                <input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} className={inputCls} placeholder="اسم العميل" />
              </Field>
              <Field label="رقم الجوال">
                <input value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} className={inputCls} placeholder="05xxxxxxxx" dir="ltr" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="قيمة العقد (ر.س)">
                <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} className={inputCls} placeholder="0" />
              </Field>
              <Field label="الوديعة (ر.س)">
                <input type="number" value={form.deposit} onChange={e => setForm(p => ({ ...p, deposit: e.target.value }))} className={inputCls} placeholder="0" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="تاريخ البداية">
                <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="تاريخ الانتهاء">
                <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className={inputCls} />
              </Field>
            </div>
            <Field label="ملاحظات">
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={clsx(inputCls, "resize-none")} rows={3} />
            </Field>
            <div className="flex gap-2">
              <button onClick={save} disabled={createMut.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">حفظ</button>
              <button onClick={() => setCreateModal(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Contract detail modal */}
      {detailContract && detailOpen && (
        <Modal title={`${detailContract.contract_number} — ${detailContract.title}`} onClose={() => setDetailOpen(false)}>
          <div className="space-y-5">
            {/* Status + Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={clsx("px-3 py-1 rounded-xl text-xs font-semibold border", STATUS_COLORS[detailContract.status] || "bg-gray-100")}>
                {STATUS_LABELS[detailContract.status]}
              </span>
              {detailContract.status === "draft" && (
                <button onClick={() => handleSign(detailContract.id)} className="px-3 py-1.5 bg-green-500 text-white rounded-xl text-xs font-medium hover:bg-green-600">توقيع العقد</button>
              )}
              {detailContract.status === "active" && (
                <button onClick={() => handleComplete(detailContract.id)} className="px-3 py-1.5 bg-brand-500 text-white rounded-xl text-xs font-medium hover:bg-brand-600">إغلاق العقد</button>
              )}
            </div>

            {/* Contract info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {detailContract.customer_name && (
                <div><p className="text-xs text-gray-400">العميل</p><p className="font-medium">{detailContract.customer_name}</p></div>
              )}
              {detailContract.start_date && (
                <div><p className="text-xs text-gray-400">من</p><p className="font-medium">{detailContract.start_date}</p></div>
              )}
              {detailContract.end_date && (
                <div><p className="text-xs text-gray-400">إلى</p><p className="font-medium">{detailContract.end_date}</p></div>
              )}
              <div><p className="text-xs text-gray-400">القيمة</p><p className="font-bold text-brand-600">{parseFloat(detailContract.value || "0").toFixed(0)} ر.س</p></div>
              <div><p className="text-xs text-gray-400">الوديعة</p><p className="font-medium">{parseFloat(detailContract.deposit || "0").toFixed(0)} ر.س</p></div>
            </div>

            {/* Assets section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">الأصول المؤجرة</p>
                <button onClick={() => setAddAssetModal(true)} className="text-xs text-brand-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> إضافة</button>
              </div>
              {(fullContract?.assets || []).length === 0 ? (
                <p className="text-xs text-gray-400 py-2">لا توجد أصول مسجّلة</p>
              ) : (
                <div className="space-y-1">
                  {(fullContract?.assets || []).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{a.asset_name}</p>
                        <p className="text-xs text-gray-400">×{a.quantity} · {a.daily_rate} ر.س/يوم</p>
                      </div>
                      <button onClick={() => { rmAsset.mutate({ contractId: detailContract.id, id: a.id }); refetchDetail(); }} className="w-7 h-7 flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inspections section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">التفتيش</p>
                <button onClick={() => setInspectionModal({ type: "pre_rental" })} className="text-xs text-brand-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> تفتيش جديد</button>
              </div>
              {(fullContract?.inspections || []).length === 0 ? (
                <p className="text-xs text-gray-400 py-2">لا توجد سجلات تفتيش</p>
              ) : (
                <div className="space-y-1">
                  {(fullContract?.inspections || []).map((i: any) => (
                    <div key={i.id} className={clsx("flex items-center justify-between rounded-xl px-3 py-2.5 text-sm", i.damage_found ? "bg-red-50" : "bg-green-50")}>
                      <div>
                        <p className="font-medium text-gray-800">{i.type === "pre_rental" ? "قبل التأجير" : "بعد التأجير"} · {i.condition}</p>
                        {i.damage_found && <p className="text-xs text-red-600">{i.damage_description} · {i.damage_cost} ر.س</p>}
                      </div>
                      <span className={clsx("text-xs font-bold", i.damage_found ? "text-red-600" : "text-green-600")}>
                        {i.damage_found ? "ضرر" : "سليم"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add asset modal */}
      {addAssetModal && detailContract && (
        <Modal title="إضافة أصل للعقد" onClose={() => setAddAssetModal(false)}>
          <div className="space-y-4">
            <Field label="اسم الأصل *">
              <input value={assetForm.assetName} onChange={e => setAssetForm(p => ({ ...p, assetName: e.target.value }))} className={inputCls} placeholder="مثال: كاميرا Sony A7" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الكمية">
                <input type="number" min="1" value={assetForm.quantity} onChange={e => setAssetForm(p => ({ ...p, quantity: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="السعر اليومي (ر.س)">
                <input type="number" min="0" value={assetForm.dailyRate} onChange={e => setAssetForm(p => ({ ...p, dailyRate: e.target.value }))} className={inputCls} placeholder="0" />
              </Field>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddAsset} disabled={addAsset.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60">إضافة</button>
              <button onClick={() => setAddAssetModal(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Inspection modal */}
      {inspectionModal && detailContract && (
        <Modal title="تسجيل تفتيش" onClose={() => setInspectionModal(null)}>
          <div className="space-y-4">
            <Field label="نوع التفتيش">
              <select value={inspForm.type} onChange={e => setInspForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                <option value="pre_rental">قبل التأجير</option>
                <option value="post_rental">بعد الاستلام</option>
                <option value="maintenance_check">فحص صيانة</option>
              </select>
            </Field>
            <Field label="الحالة">
              <select value={inspForm.condition} onChange={e => setInspForm(p => ({ ...p, condition: e.target.value }))} className={inputCls}>
                <option value="excellent">ممتاز</option>
                <option value="good">جيد</option>
                <option value="fair">مقبول</option>
                <option value="poor">يحتاج صيانة</option>
              </select>
            </Field>
            <Field label="اسم المفتش">
              <input value={inspForm.inspectorName} onChange={e => setInspForm(p => ({ ...p, inspectorName: e.target.value }))} className={inputCls} />
            </Field>
            <div className="flex items-center gap-2">
              <button onClick={() => setInspForm(p => ({ ...p, damageFound: !p.damageFound }))} className={clsx("w-10 h-6 rounded-full transition-colors relative shrink-0", inspForm.damageFound ? "bg-red-500" : "bg-gray-200")}>
                <span className={clsx("absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all", inspForm.damageFound ? "right-1" : "left-1")} />
              </button>
              <span className="text-sm text-gray-700">يوجد ضرر</span>
            </div>
            {inspForm.damageFound && (
              <>
                <Field label="وصف الضرر">
                  <textarea value={inspForm.damageDescription} onChange={e => setInspForm(p => ({ ...p, damageDescription: e.target.value }))} className={clsx(inputCls, "resize-none")} rows={3} />
                </Field>
                <Field label="تكلفة الإصلاح (ر.س)">
                  <input type="number" value={inspForm.damageCost} onChange={e => setInspForm(p => ({ ...p, damageCost: e.target.value }))} className={inputCls} placeholder="0" />
                </Field>
              </>
            )}
            <Field label="ملاحظات">
              <textarea value={inspForm.notes} onChange={e => setInspForm(p => ({ ...p, notes: e.target.value }))} className={clsx(inputCls, "resize-none")} rows={2} />
            </Field>
            <div className="flex gap-2">
              <button onClick={handleAddInspection} disabled={addInsp.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60">حفظ</button>
              <button onClick={() => setInspectionModal(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
