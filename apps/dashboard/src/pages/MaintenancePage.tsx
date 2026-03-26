import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import { maintenanceApi, servicesApi, membersApi } from "@/lib/api";
import {
  ClipboardCheck, Plus, X, Loader2, AlertCircle, CheckCircle2,
  Clock, Wrench, Trash2, Filter, RefreshCw, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { MAINTENANCE_TYPES, MAINTENANCE_PRIORITIES, MAINTENANCE_STATUSES } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

const iCls = "w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white";
const taCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white resize-none";
const selCls = iCls + " appearance-none";

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium", color)}>
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

const TYPE_MAP = Object.fromEntries(MAINTENANCE_TYPES.map(t => [t.key, t]));
const PRIORITY_MAP = Object.fromEntries(MAINTENANCE_PRIORITIES.map(p => [p.key, p]));
const STATUS_MAP = Object.fromEntries(MAINTENANCE_STATUSES.map(s => [s.key, s]));

// ── Component ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "",
  description: "",
  type: "cleaning",
  priority: "normal",
  status: "pending",
  serviceId: "",
  assignedToId: "",
  scheduledAt: "",
  notes: "",
  costAmount: "",
};

export function MaintenancePage() {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formErr, setFormErr] = useState("");

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (filterStatus) p.status = filterStatus;
    if (filterType) p.type = filterType;
    return p;
  }, [filterStatus, filterType]);

  const { data: listRes, loading, error, refetch } = useApi(() => maintenanceApi.list(params as any), [filterStatus, filterType]);
  const { data: statsRes } = useApi(() => maintenanceApi.stats(), []);
  const { data: servicesRes } = useApi(() => servicesApi.list({ limit: "100" }), []);
  const { data: membersRes } = useApi(() => membersApi.list({ limit: "100" }), []);

  const tasks = listRes?.data ?? [];
  const stats = statsRes?.data;
  const services = servicesRes?.data ?? [];
  const members = membersRes?.data ?? [];

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setFormErr("");
    setEditId(null);
    setModal("create");
  };

  const openEdit = (task: any) => {
    setForm({
      title:        task.title        || "",
      description:  task.description  || "",
      type:         task.type         || "cleaning",
      priority:     task.priority     || "normal",
      status:       task.status       || "pending",
      serviceId:    task.serviceId    || "",
      assignedToId: task.assignedToId || "",
      scheduledAt:  task.scheduledAt  ? task.scheduledAt.slice(0, 16) : "",
      notes:        task.notes        || "",
      costAmount:   task.costAmount   || "",
    });
    setFormErr("");
    setEditId(task.id);
    setModal("edit");
  };

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const closeModal = () => { setModal(null); setEditId(null); };

  const save = async () => {
    if (!form.title.trim()) { setFormErr("العنوان مطلوب"); return; }
    setSaving(true);
    setFormErr("");
    try {
      const payload = {
        title:        form.title.trim(),
        description:  form.description || undefined,
        type:         form.type,
        priority:     form.priority,
        status:       form.status,
        serviceId:    form.serviceId || undefined,
        assignedToId: form.assignedToId || undefined,
        scheduledAt:  form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        notes:        form.notes || undefined,
        costAmount:   form.costAmount || undefined,
      };
      if (modal === "edit" && editId) {
        await maintenanceApi.update(editId, payload);
      } else {
        await maintenanceApi.create(payload);
      }
      closeModal();
      refetch();
    } catch (e: any) {
      setFormErr(e.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setDeleting(id);
    try {
      await maintenanceApi.delete(id);
      refetch();
    } finally {
      setDeleting(null);
    }
  };

  const changeStatus = async (task: any, newStatus: string) => {
    await maintenanceApi.update(task.id, { status: newStatus }).catch(() => {});
    refetch();
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">الصيانة والنظافة</h1>
          <p className="text-sm text-gray-400 mt-0.5">إدارة مهام الصيانة والتنظيف والفحص</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          مهمة جديدة
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MAINTENANCE_STATUSES.map(s => (
            <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? "" : s.key)}
              className={clsx(
                "bg-white rounded-2xl border p-4 text-right transition-all",
                filterStatus === s.key ? "border-brand-300 shadow-sm" : "border-gray-100"
              )}>
              <p className="text-2xl font-bold text-gray-900">{stats.byStatus[s.key] ?? 0}</p>
              <p className={clsx("text-xs font-medium mt-1 px-2 py-0.5 rounded-lg w-fit", s.color)}>{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 h-9 text-sm outline-none focus:border-brand-300 bg-white appearance-none pl-8 pr-3">
            <option value="">كل الأنواع</option>
            {MAINTENANCE_TYPES.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        {(filterStatus || filterType) && (
          <button onClick={() => { setFilterStatus(""); setFilterType(""); }}
            className="flex items-center gap-1 px-3 h-9 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            <X className="w-3.5 h-3.5" />
            إزالة الفلتر
          </button>
        )}
        <button onClick={() => refetch()}
          className="flex items-center gap-1 px-3 h-9 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors mr-auto">
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonRows rows={5} /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-red-300" />
            <p className="text-sm text-red-400">فشل تحميل المهام</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardCheck className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">لا توجد مهام</p>
            <button onClick={openCreate}
              className="text-sm text-brand-500 hover:underline">أضف أول مهمة</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">المهمة</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">النوع</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">الأولوية</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">الحالة</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">المسؤول</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">الموعد</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((task: any) => {
                const typeInfo = TYPE_MAP[task.type];
                const priInfo = PRIORITY_MAP[task.priority];
                const statusInfo = STATUS_MAP[task.status];
                return (
                  <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      {task.service && (
                        <p className="text-xs text-gray-400 mt-0.5">{task.service.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {typeInfo && <Badge label={typeInfo.label} color={typeInfo.color} />}
                    </td>
                    <td className="px-4 py-3">
                      {priInfo && <Badge label={priInfo.label} color={priInfo.color} />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative group">
                        <button className={clsx(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium cursor-pointer",
                          statusInfo?.color ?? "bg-gray-100 text-gray-500"
                        )}>
                          {statusInfo?.label ?? task.status}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="absolute top-full right-0 mt-1 z-10 bg-white rounded-xl border border-gray-100 shadow-lg py-1 hidden group-hover:block w-40">
                          {MAINTENANCE_STATUSES.map(s => (
                            <button key={s.key} onClick={() => changeStatus(task, s.key)}
                              className={clsx(
                                "w-full text-right px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
                                task.status === s.key ? "font-semibold text-brand-600" : "text-gray-700"
                              )}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {task.assignee?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {task.scheduledAt ? fmtDate(task.scheduledAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(task)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <Wrench className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(task.id)} disabled={deleting === task.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
                          {deleting === task.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {modal === "edit" ? "تعديل المهمة" : "مهمة جديدة"}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              <Field label="العنوان *">
                <input value={form.title} onChange={upd("title")} placeholder="عنوان المهمة"
                  className={iCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="النوع">
                  <select value={form.type} onChange={upd("type")} className={selCls}>
                    {MAINTENANCE_TYPES.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="الأولوية">
                  <select value={form.priority} onChange={upd("priority")} className={selCls}>
                    {MAINTENANCE_PRIORITIES.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="الحالة">
                  <select value={form.status} onChange={upd("status")} className={selCls}>
                    {MAINTENANCE_STATUSES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="الموعد المجدول">
                  <input type="datetime-local" value={form.scheduledAt} onChange={upd("scheduledAt")}
                    className={iCls} />
                </Field>
              </div>

              <Field label="الخدمة / الأصل المرتبط">
                <select value={form.serviceId} onChange={upd("serviceId")} className={selCls}>
                  <option value="">بدون ربط</option>
                  {services.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="المسؤول عن التنفيذ">
                <select value={form.assignedToId} onChange={upd("assignedToId")} className={selCls}>
                  <option value="">بدون تعيين</option>
                  {members.map((m: any) => (
                    <option key={m.userId ?? m.id} value={m.userId ?? m.id}>{m.name ?? m.user?.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="الوصف">
                <textarea value={form.description} onChange={upd("description")} rows={2}
                  placeholder="وصف المهمة" className={taCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="ملاحظات">
                  <textarea value={form.notes} onChange={upd("notes")} rows={2}
                    placeholder="ملاحظات إضافية" className={taCls} />
                </Field>
                <Field label="التكلفة (ر.س)">
                  <input type="number" value={form.costAmount} onChange={upd("costAmount")}
                    placeholder="0" className={iCls} />
                </Field>
              </div>

              {formErr && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{formErr}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-50">
              <button onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                إلغاء
              </button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {modal === "edit" ? "حفظ التعديلات" : "إنشاء المهمة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
