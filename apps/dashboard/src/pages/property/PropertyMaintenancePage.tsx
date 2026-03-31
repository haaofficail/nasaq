import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";

const TICKET_STATUS_AR: Record<string, string> = {
  reported: "مبلّغ", reviewing: "مراجعة", assigned: "مكلّف",
  in_progress: "جاري", completed: "مكتمل",
};
const TICKET_STATUS_COLORS: Record<string, string> = {
  reported: "bg-gray-100 text-gray-600",
  reviewing: "bg-yellow-100 text-yellow-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
};

const PRIORITY_AR: Record<string, string> = {
  urgent: "عاجل", high: "عالي", normal: "عادي", low: "منخفض",
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-500",
};

const CATEGORY_AR: Record<string, string> = {
  plumbing: "سباكة", electrical: "كهرباء", ac: "تكييف",
  painting: "دهانات", carpentry: "نجارة", cleaning: "تنظيف",
  other: "أخرى",
};

const KANBAN_COLUMNS = [
  { key: "reported", label: "مبلّغ" },
  { key: "reviewing", label: "مراجعة" },
  { key: "assigned", label: "مكلّف" },
  { key: "in_progress", label: "جاري" },
  { key: "completed", label: "مكتمل" },
];

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function PropertyMaintenancePage() {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [showCreate, setShowCreate] = useState(false);
  const [showComplete, setShowComplete] = useState<any>(null);
  const [showAssign, setShowAssign] = useState<any>(null);
  const [showApprove, setShowApprove] = useState<any>(null);
  const [completeForm, setCompleteForm] = useState({ actualCost: "", notes: "" });
  const [assignForm, setAssignForm] = useState({ assignedToName: "", assignedToPhone: "", estimatedCost: "" });
  const [approveForm, setApproveForm] = useState({ approvedBudget: "", notes: "" });

  const [form, setForm] = useState({
    propertyId: "", unitId: "", category: "plumbing", title: "", description: "",
    priority: "normal", reporterName: "", reporterPhone: "",
  });

  const { data: propsData } = useApi(() => propertyApi.properties.list(), []);
  const properties: any[] = (propsData as any)?.data ?? [];

  const { data: unitsData } = useApi(
    () => form.propertyId ? propertyApi.units.list({ propertyId: form.propertyId }) : Promise.resolve({ data: [] }),
    [form.propertyId]
  );
  const filteredUnits: any[] = (unitsData as any)?.data ?? [];

  const { data, loading, error, refetch } = useApi(() => propertyApi.maintenance.list(), []);
  const tickets: any[] = (data as any)?.data ?? [];

  const { mutate: createTicket, loading: creating } = useMutation((d: any) => propertyApi.createMaintenance(d));
  const { mutate: updateStatus } = useMutation((d: any) => propertyApi.updateMaintenance(d.id, { status: d.status }));
  const { mutate: completeTicket, loading: completing } = useMutation((d: any) => propertyApi.completeMaintenance(showComplete?.id, d));
  const { mutate: assignTicket, loading: assigning } = useMutation((d: any) => propertyApi.assignMaintenance(showAssign?.id, d));
  const { mutate: approveTicket, loading: approving } = useMutation((d: any) => propertyApi.approveMaintenance(showApprove?.id, d));

  async function handleCreate() {
    const res = await createTicket(form);
    if (res) {
      toast.success("تم إنشاء طلب الصيانة");
      setShowCreate(false);
      setForm({ propertyId: "", unitId: "", category: "plumbing", title: "", description: "", priority: "normal", reporterName: "", reporterPhone: "" });
      refetch();
    }
  }

  async function handleStatusChange(ticket: any, newStatus: string) {
    const res = await updateStatus({ id: ticket.id, status: newStatus });
    if (res) { toast.success("تم تحديث الحالة"); refetch(); }
  }

  async function handleComplete() {
    const res = await completeTicket(completeForm);
    if (res) { toast.success("تم إغلاق طلب الصيانة"); setShowComplete(null); refetch(); }
  }

  async function handleAssign() {
    const res = await assignTicket(assignForm);
    if (res) { toast.success("تم تعيين المسؤول"); setShowAssign(null); refetch(); }
  }

  async function handleApprove() {
    const res = await approveTicket(approveForm);
    if (res) { toast.success("تمت الموافقة على الطلب"); setShowApprove(null); refetch(); }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">طلبات الصيانة</h1>
          <p className="text-sm text-gray-500 mt-0.5">متابعة طلبات الصيانة والإصلاح</p>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("kanban")}
              className={clsx("px-3 py-2 text-xs transition-colors", viewMode === "kanban" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}
            >
              كانبان
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={clsx("px-3 py-2 text-xs transition-colors", viewMode === "table" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}
            >
              جدول
            </button>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            طلب صيانة جديد
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>
      ) : viewMode === "kanban" ? (
        /* Kanban view */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colTickets = tickets.filter((t: any) => t.status === col.key);
            return (
              <div key={col.key} className="bg-gray-50 rounded-2xl p-3 min-h-64">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-600">{col.label}</h3>
                  <span className="bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 text-xs">{colTickets.length}</span>
                </div>
                <div className="space-y-2">
                  {colTickets.map((t: any) => (
                    <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                      <div className="flex items-center gap-1 mb-1 flex-wrap">
                        <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_COLORS[t.priority] ?? "bg-gray-100 text-gray-600")}>
                          {PRIORITY_AR[t.priority] ?? t.priority}
                        </span>
                        <span className="text-xs text-gray-400">{CATEGORY_AR[t.category] ?? t.category}</span>
                      </div>
                      <p className="text-xs font-medium text-gray-800 line-clamp-2">{t.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{t.unitName ?? t.propertyName ?? "—"}</p>
                      {t.assignedToName && <p className="text-xs text-teal-600 mt-1">{t.assignedToName}</p>}
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {t.status === "reported" && (
                          <button onClick={() => handleStatusChange(t, "reviewing")} className="text-xs text-yellow-700 border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 rounded-lg px-2 py-0.5">مراجعة</button>
                        )}
                        {t.status === "reviewing" && (
                          <>
                            <button
                              onClick={() => { setShowAssign(t); setAssignForm({ assignedToName: t.assignedToName ?? "", assignedToPhone: "", estimatedCost: "" }); }}
                              className="text-xs text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg px-2 py-0.5"
                            >
                              عيّن
                            </button>
                            <button
                              onClick={() => { setShowApprove(t); setApproveForm({ approvedBudget: "", notes: "" }); }}
                              className="text-xs text-purple-700 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-lg px-2 py-0.5"
                            >
                              اعتمد
                            </button>
                          </>
                        )}
                        {t.status === "assigned" && (
                          <button onClick={() => handleStatusChange(t, "in_progress")} className="text-xs text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2 py-0.5">بدء</button>
                        )}
                        {t.status === "in_progress" && (
                          <button onClick={() => { setShowComplete(t); setCompleteForm({ actualCost: "", notes: "" }); }} className="text-xs text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2 py-0.5">أنجز</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {colTickets.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-4">لا يوجد</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table view */
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-500">رقم الطلب</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">العنوان</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">التصنيف</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">الأولوية</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">الوحدة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">المكلّف</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tickets.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">لا توجد طلبات صيانة</td></tr>
              ) : tickets.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 text-xs">{t.ticketNumber ?? t.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-700">{t.title}</td>
                  <td className="px-4 py-3 text-gray-500">{CATEGORY_AR[t.category] ?? t.category}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_COLORS[t.priority] ?? "bg-gray-100 text-gray-600")}>
                      {PRIORITY_AR[t.priority] ?? t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.unitName ?? t.propertyName ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{t.assignedToName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", TICKET_STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600")}>
                      {TICKET_STATUS_AR[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.status === "in_progress" && (
                      <button onClick={() => { setShowComplete(t); setCompleteForm({ actualCost: "", notes: "" }); }} className="text-xs text-emerald-700 hover:underline">إتمام</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="طلب صيانة جديد" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="العقار">
                <select className={inputCls} value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value, unitId: "" })}>
                  <option value="">اختر العقار</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="الوحدة (اختياري)">
                <select className={inputCls} value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
                  <option value="">اختر الوحدة</option>
                  {filteredUnits.map((u: any) => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
                </select>
              </Field>
              <Field label="التصنيف">
                <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {Object.entries(CATEGORY_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="الأولوية">
                <select className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {Object.entries(PRIORITY_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="اسم المبلّغ">
                <input className={inputCls} value={form.reporterName} onChange={(e) => setForm({ ...form, reporterName: e.target.value })} />
              </Field>
              <Field label="جوال المبلّغ">
                <input className={inputCls} value={form.reporterPhone} onChange={(e) => setForm({ ...form, reporterPhone: e.target.value })} />
              </Field>
            </div>
            <Field label="عنوان الطلب">
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="تسرب مياه في الحمام..." />
            </Field>
            <Field label="وصف المشكلة">
              <textarea className={clsx(inputCls, "h-24 resize-none")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {creating ? "جارٍ الإنشاء..." : "إنشاء"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Complete Modal */}
      {showComplete && (
        <Modal title="إتمام طلب الصيانة" onClose={() => setShowComplete(null)}>
          <div className="space-y-4">
            <Field label="التكلفة الفعلية (ريال)">
              <input type="number" className={inputCls} value={completeForm.actualCost} onChange={(e) => setCompleteForm({ ...completeForm, actualCost: e.target.value })} />
            </Field>
            <Field label="ملاحظات الإتمام">
              <textarea className={clsx(inputCls, "h-24 resize-none")} value={completeForm.notes} onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowComplete(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleComplete} disabled={completing} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {completing ? "جارٍ الإغلاق..." : "إغلاق الطلب"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <Modal title="تعيين مسؤول الصيانة" onClose={() => setShowAssign(null)}>
          <div className="space-y-4">
            <Field label="اسم المسؤول">
              <input className={inputCls} value={assignForm.assignedToName} onChange={(e) => setAssignForm({ ...assignForm, assignedToName: e.target.value })} placeholder="اسم الفني أو الشركة..." />
            </Field>
            <Field label="جوال المسؤول">
              <input className={inputCls} value={assignForm.assignedToPhone} onChange={(e) => setAssignForm({ ...assignForm, assignedToPhone: e.target.value })} />
            </Field>
            <Field label="التكلفة التقديرية (ريال)">
              <input type="number" className={inputCls} value={assignForm.estimatedCost} onChange={(e) => setAssignForm({ ...assignForm, estimatedCost: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAssign(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleAssign} disabled={assigning} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {assigning ? "جارٍ التعيين..." : "تعيين"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Approve Modal */}
      {showApprove && (
        <Modal title="اعتماد طلب الصيانة" onClose={() => setShowApprove(null)}>
          <div className="space-y-4">
            <Field label="الميزانية المعتمدة (ريال)">
              <input type="number" className={inputCls} value={approveForm.approvedBudget} onChange={(e) => setApproveForm({ ...approveForm, approvedBudget: e.target.value })} />
            </Field>
            <Field label="ملاحظات">
              <textarea className={clsx(inputCls, "h-20 resize-none")} value={approveForm.notes} onChange={(e) => setApproveForm({ ...approveForm, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowApprove(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleApprove} disabled={approving} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50">
                {approving ? "جارٍ الاعتماد..." : "اعتماد"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
