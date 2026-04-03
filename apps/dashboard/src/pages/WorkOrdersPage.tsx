import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import { workOrdersApi, customersApi, membersApi } from "@/lib/api";
import {
  Wrench, Plus, X, Loader2, AlertCircle, CheckCircle2,
  Clock, Package, RefreshCw, Search, ChevronRight,
  ClipboardList, Banknote, User, BarChart3,
} from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { WORK_ORDER_STATUSES, WORK_ORDER_CATEGORIES } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const iCls = "w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white";
const taCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white resize-none";
const selCls = iCls + " appearance-none";

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium", color)}>
      {label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const STATUS_MAP    = Object.fromEntries(WORK_ORDER_STATUSES.map(s => [s.key, s]));
const CATEGORY_MAP  = Object.fromEntries(WORK_ORDER_CATEGORIES.map(c => [c.key, c]));

const EMPTY_FORM = {
  customerName:       "",
  customerPhone:      "",
  customerId:         "",
  category:           "repair",
  itemName:           "",
  itemModel:          "",
  itemSerial:         "",
  itemCondition:      "",
  problemDescription: "",
  diagnosis:          "",
  resolution:         "",
  estimatedCost:      "",
  finalCost:          "",
  depositAmount:      "",
  depositPaid:        false,
  isPaid:             false,
  warrantyDays:       0,
  estimatedReadyAt:   "",
  assignedToId:       "",
  internalNotes:      "",
};

// ── Status steps bar ──────────────────────────────────────────────────────────

const STATUS_STEPS = ["received", "diagnosing", "waiting_parts", "in_progress", "ready", "delivered"] as const;

function StatusBar({ current }: { current: string }) {
  const idx = STATUS_STEPS.indexOf(current as any);
  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((s, i) => {
        const st = STATUS_MAP[s];
        const active = i <= idx;
        return (
          <div key={s} className="flex items-center gap-1">
            <div className={clsx(
              "w-2 h-2 rounded-full transition-colors",
              active ? "bg-brand-400" : "bg-gray-200",
            )} />
            {i < STATUS_STEPS.length - 1 && (
              <div className={clsx("h-0.5 w-4", active ? "bg-brand-300" : "bg-gray-100")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WorkOrdersPage() {
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [search,         setSearch]         = useState("");
  const [modal,  setModal]  = useState<"create" | "edit" | "detail" | "status" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form,   setForm]   = useState({ ...EMPTY_FORM });
  const [statusNext, setStatusNext] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formErr,  setFormErr]  = useState("");

  const params = useMemo(() => ({
    ...(filterStatus   ? { status:   filterStatus }   : {}),
    ...(filterCategory ? { category: filterCategory } : {}),
    ...(search         ? { search }                   : {}),
  }), [filterStatus, filterCategory, search]);

  const { data: listRes, loading, error, refetch } = useApi(
    () => workOrdersApi.list(params), [filterStatus, filterCategory, search],
  );
  const { data: statsRes, refetch: refetchStats } = useApi(() => workOrdersApi.stats(), []);
  const { data: customersRes } = useApi(() => customersApi.list({ limit: "200" }), []);
  const { data: membersRes }   = useApi(() => membersApi.list({ limit: "100" }), []);

  const orders    = listRes?.data    ?? [];
  const stats     = statsRes?.data;
  const customers = customersRes?.data ?? [];
  const members   = membersRes?.data   ?? [];

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setFormErr("");
    setEditId(null);
    setModal("create");
  };

  const openEdit = (order: any) => {
    setForm({
      customerName:       order.customerName       || "",
      customerPhone:      order.customerPhone       || "",
      customerId:         order.customerId          || "",
      category:           order.category            || "repair",
      itemName:           order.itemName            || "",
      itemModel:          order.itemModel           || "",
      itemSerial:         order.itemSerial          || "",
      itemCondition:      order.itemCondition       || "",
      problemDescription: order.problemDescription  || "",
      diagnosis:          order.diagnosis           || "",
      resolution:         order.resolution          || "",
      estimatedCost:      order.estimatedCost       || "",
      finalCost:          order.finalCost           || "",
      depositAmount:      order.depositAmount       || "",
      depositPaid:        order.depositPaid         ?? false,
      isPaid:             order.isPaid              ?? false,
      warrantyDays:       order.warrantyDays        ?? 0,
      estimatedReadyAt:   order.estimatedReadyAt ? order.estimatedReadyAt.slice(0, 16) : "",
      assignedToId:       order.assignedToId        || "",
      internalNotes:      order.internalNotes       || "",
    });
    setFormErr("");
    setEditId(order.id);
    setModal("edit");
  };

  const openStatus = (order: any) => {
    setEditId(order.id);
    setStatusNext(order.status);
    setModal("status");
  };

  const f = (k: keyof typeof EMPTY_FORM, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.customerName.trim()) return setFormErr("اسم العميل مطلوب");
    if (!form.itemName.trim())     return setFormErr("اسم الجهاز/الغرض مطلوب");
    if (!form.problemDescription.trim()) return setFormErr("وصف المشكلة مطلوب");
    setSaving(true);
    setFormErr("");
    try {
      const payload = {
        ...form,
        customerId:       form.customerId       || undefined,
        assignedToId:     form.assignedToId     || undefined,
        estimatedReadyAt: form.estimatedReadyAt ? new Date(form.estimatedReadyAt).toISOString() : undefined,
        warrantyDays:     Number(form.warrantyDays) || 0,
      };
      if (modal === "create") await workOrdersApi.create(payload);
      else                    await workOrdersApi.update(editId!, payload);
      refetch();
      refetchStats();
      setModal(null);
    } catch { setFormErr("فشل الحفظ، تأكد من البيانات"); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async () => {
    if (!editId || !statusNext) return;
    setSaving(true);
    try {
      await workOrdersApi.updateStatus(editId, statusNext);
      refetch();
      refetchStats();
      setModal(null);
    } catch { setFormErr("فشل تغيير الحالة"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الأمر؟")) return;
    setDeleting(id);
    try { await workOrdersApi.delete(id); refetch(); refetchStats(); }
    catch {}
    finally { setDeleting(null); }
  };

  // ── Stat cards ───────────────────────────────────────────────────────────────

  const statCards = [
    { label: "نشطة",        value: stats?.totalActive  ?? 0,                   icon: ClipboardList,  color: "text-brand-500",   bg: "bg-brand-50" },
    { label: "جاهزة للاستلام", value: stats?.byStatus?.ready ?? 0,             icon: CheckCircle2,   color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "انتظار قطع",  value: stats?.byStatus?.waiting_parts ?? 0,        icon: Package,        color: "text-amber-600",   bg: "bg-amber-50" },
    { label: "إيرادات أوامر العمل", value: `${(stats?.totalRevenue ?? 0).toLocaleString("ar-SA")} ر.س`, icon: Banknote, color: "text-teal-600", bg: "bg-teal-50" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  const isFormModal = modal === "create" || modal === "edit";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">أوامر العمل</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة طلبات الإصلاح والخدمة والصيانة</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-brand-500 text-white text-sm font-medium px-4 h-9 rounded-xl hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          أمر عمل جديد
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
              <s.icon className={clsx("w-5 h-5", s.color)} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث برقم الأمر / اسم العميل / الجهاز..."
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 h-9 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 bg-white"
          />
        </div>
        <select value={filterStatus}   onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 h-9 text-sm bg-white appearance-none min-w-36">
          <option value="">كل الحالات</option>
          {WORK_ORDER_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 h-9 text-sm bg-white appearance-none min-w-36">
          <option value="">كل الفئات</option>
          {WORK_ORDER_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <button onClick={refetch} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><SkeletonRows rows={6} /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-400">فشل تحميل البيانات</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
              <Wrench className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">لا توجد أوامر عمل</p>
            <p className="text-xs text-gray-400">أضف أول أمر عمل لتبدأ</p>
            <button onClick={openCreate} className="mt-1 text-sm text-brand-500 hover:underline">إنشاء أمر عمل</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 bg-gray-50/50">
                  <th className="text-right font-medium px-4 py-3">رقم الأمر</th>
                  <th className="text-right font-medium px-4 py-3">العميل</th>
                  <th className="text-right font-medium px-4 py-3">الجهاز / الغرض</th>
                  <th className="text-right font-medium px-4 py-3">الفئة</th>
                  <th className="text-right font-medium px-4 py-3">الحالة</th>
                  <th className="text-right font-medium px-4 py-3">التكلفة</th>
                  <th className="text-right font-medium px-4 py-3">تاريخ الإنشاء</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o: any) => {
                  const st  = STATUS_MAP[o.status]    ?? { label: o.status,   color: "bg-gray-100 text-gray-600" };
                  const cat = CATEGORY_MAP[o.category] ?? { label: o.category };
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.orderNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{o.customerName}</div>
                        {o.customerPhone && <div className="text-xs text-gray-400">{o.customerPhone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{o.itemName}</div>
                        {o.itemModel && <div className="text-xs text-gray-400">{o.itemModel}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{cat.label}</td>
                      <td className="px-4 py-3">
                        <Badge label={st.label} color={st.color} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-gray-700">
                        {o.finalCost ? `${Number(o.finalCost).toLocaleString("ar-SA")} ر.س` :
                         o.estimatedCost ? <span className="text-gray-400">{`~${Number(o.estimatedCost).toLocaleString("ar-SA")}`}</span> : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(o.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openStatus(o)}
                            className="p-1.5 text-brand-500 hover:bg-brand-50 rounded-lg transition-colors text-xs font-medium"
                            title="تغيير الحالة"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(o)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(o.id)}
                            disabled={deleting === o.id}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            {deleting === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
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
      </div>

      {/* Status Change Modal */}
      {modal === "status" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">تغيير حالة الأمر</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {WORK_ORDER_STATUSES.map(s => (
                <button
                  key={s.key}
                  onClick={() => setStatusNext(s.key)}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                    statusNext === s.key
                      ? "border-brand-300 bg-brand-50 text-brand-700"
                      : "border-gray-100 hover:bg-gray-50 text-gray-700",
                  )}
                >
                  <span>{s.label}</span>
                  <Badge label={s.label} color={s.color} />
                </button>
              ))}
            </div>
            {formErr && <p className="text-xs text-red-500">{formErr}</p>}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleStatusChange}
                disabled={saving}
                className="flex-1 bg-brand-500 text-white text-sm font-medium h-10 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ الحالة
              </button>
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-sm text-gray-600 h-10 rounded-xl hover:bg-gray-50 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isFormModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{modal === "create" ? "أمر عمل جديد" : "تعديل أمر العمل"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5 max-h-[75vh]">
              {/* Section: Customer */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">بيانات العميل</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="اسم العميل *">
                    <input value={form.customerName} onChange={e => f("customerName", e.target.value)} className={iCls} placeholder="محمد عبدالله" />
                  </Field>
                  <Field label="رقم الجوال">
                    <input value={form.customerPhone} onChange={e => f("customerPhone", e.target.value)} className={iCls} placeholder="05xxxxxxxx" dir="ltr" />
                  </Field>
                </div>
                {customers.length > 0 && (
                  <Field label="ربط بعميل مسجل (اختياري)">
                    <select value={form.customerId} onChange={e => {
                      const cid = e.target.value;
                      const cust = customers.find((c: any) => c.id === cid);
                      f("customerId", cid);
                      if (cust) { f("customerName", (cust as any).name); f("customerPhone", (cust as any).phone || ""); }
                    }} className={selCls}>
                      <option value="">— عميل جديد —</option>
                      {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                )}
              </div>

              {/* Section: Item */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">الجهاز / الغرض</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="اسم الجهاز *">
                    <input value={form.itemName} onChange={e => f("itemName", e.target.value)} className={iCls} placeholder="جوال، لابتوب، ثوب..." />
                  </Field>
                  <Field label="الموديل">
                    <input value={form.itemModel} onChange={e => f("itemModel", e.target.value)} className={iCls} placeholder="iPhone 14 Pro" />
                  </Field>
                  <Field label="الرقم التسلسلي">
                    <input value={form.itemSerial} onChange={e => f("itemSerial", e.target.value)} className={iCls} dir="ltr" />
                  </Field>
                  <Field label="حالة الجهاز عند الاستلام">
                    <input value={form.itemCondition} onChange={e => f("itemCondition", e.target.value)} className={iCls} placeholder="خدوش خفيفة، شاشة مكسورة..." />
                  </Field>
                </div>
              </div>

              {/* Section: Problem */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">المشكلة والتشخيص</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="الفئة">
                    <select value={form.category} onChange={e => f("category", e.target.value)} className={selCls}>
                      {WORK_ORDER_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </Field>
                  <Field label="الفني المسؤول">
                    <select value={form.assignedToId} onChange={e => f("assignedToId", e.target.value)} className={selCls}>
                      <option value="">— غير محدد —</option>
                      {members.map((m: any) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="وصف المشكلة *">
                  <textarea value={form.problemDescription} onChange={e => f("problemDescription", e.target.value)} rows={3} className={taCls} placeholder="صف المشكلة بالتفصيل..." />
                </Field>
                <Field label="التشخيص">
                  <textarea value={form.diagnosis} onChange={e => f("diagnosis", e.target.value)} rows={2} className={taCls} />
                </Field>
                <Field label="الحل">
                  <textarea value={form.resolution} onChange={e => f("resolution", e.target.value)} rows={2} className={taCls} />
                </Field>
              </div>

              {/* Section: Financials */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">المالية</p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="التكلفة التقديرية">
                    <input type="number" min="0" value={form.estimatedCost} onChange={e => f("estimatedCost", e.target.value)} className={iCls} placeholder="0" />
                  </Field>
                  <Field label="التكلفة الفعلية">
                    <input type="number" min="0" value={form.finalCost} onChange={e => f("finalCost", e.target.value)} className={iCls} placeholder="0" />
                  </Field>
                  <Field label="مبلغ العربون">
                    <input type="number" min="0" value={form.depositAmount} onChange={e => f("depositAmount", e.target.value)} className={iCls} placeholder="0" />
                  </Field>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.depositPaid} onChange={e => f("depositPaid", e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
                    العربون مدفوع
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.isPaid} onChange={e => f("isPaid", e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
                    تم الدفع الكامل
                  </label>
                </div>
              </div>

              {/* Section: Dates & Warranty */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="الموعد المتوقع للإنجاز">
                  <input type="datetime-local" value={form.estimatedReadyAt} onChange={e => f("estimatedReadyAt", e.target.value)} className={iCls} dir="ltr" />
                </Field>
                <Field label="ضمان (أيام)">
                  <input type="number" min="0" value={form.warrantyDays} onChange={e => f("warrantyDays", Number(e.target.value))} className={iCls} placeholder="0" />
                </Field>
              </div>

              {/* Section: Notes */}
              <Field label="ملاحظات داخلية">
                <textarea value={form.internalNotes} onChange={e => f("internalNotes", e.target.value)} rows={2} className={taCls} placeholder="ملاحظات للفريق فقط..." />
              </Field>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 space-y-3">
              {formErr && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />{formErr}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-brand-500 text-white text-sm font-medium h-10 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modal === "create" ? "إنشاء الأمر" : "حفظ التعديلات"}
                </button>
                <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-sm text-gray-600 h-10 rounded-xl hover:bg-gray-50 transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
