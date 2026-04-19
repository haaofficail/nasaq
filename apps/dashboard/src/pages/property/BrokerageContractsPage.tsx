import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";
import { printBrokerageContract } from "@/lib/contractPrintUtils";
import { Handshake, TrendingUp, Clock, CheckCircle } from "lucide-react";

const BROKER_TYPE_AR: Record<string, string> = {
  brokerage_only: "وساطة عقارية", property_management: "إدارة عقارية",
  marketing: "تسويق", full_service: "خدمات متكاملة",
};
const CLIENT_TYPE_AR: Record<string, string> = {
  landlord: "مؤجر", buyer: "مشترٍ", seller: "بائع", tenant: "مستأجر",
};
const STATUS_AR: Record<string, string> = {
  draft: "مسودة", active: "نشط", completed: "مكتمل", expired: "منتهي", cancelled: "ملغي",
};
const STATUS_CLS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700", expired: "bg-red-100 text-red-600",
  cancelled: "bg-gray-100 text-gray-500",
};

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-[#eef2f6]">
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

const inputCls = "w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white";

const EMPTY_FORM = {
  clientType: "landlord", clientName: "", clientNationalId: "", clientPhone: "",
  brokerType: "brokerage_only", scope: "", commissionType: "percentage",
  commissionPercent: "", commissionAmount: "", commissionPaidBy: "landlord",
  exclusivity: false, startDate: "", endDate: "", status: "draft",
  falLicenseNumber: "", propertyId: "", propertyDescription: "", notes: "",
};

export function BrokerageContractsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showCommModal, setShowCommModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [commForm, setCommForm] = useState({ amount: "", description: "", status: "pending", notes: "" });

  const { data, loading, error, refetch } = useApi(
    () => propertyApi.brokerage.list(statusFilter ? { status: statusFilter } : undefined),
    [statusFilter]
  );
  const { data: statsData } = useApi(() => propertyApi.brokerage.stats(), []);
  const { data: propsData } = useApi(() => propertyApi.properties.list(), []);
  const { data: commissionsData, refetch: refetchComm } = useApi(() => propertyApi.brokerage.commissions(), []);

  const stats: any = (statsData as any)?.data ?? {};
  const contracts: any[] = (data as any)?.data ?? [];
  const properties: any[] = (propsData as any)?.data ?? [];
  const commissions: any[] = (commissionsData as any)?.data ?? [];

  const { mutate: saveContract, loading: saving } = useMutation((d: any) =>
    editingId ? propertyApi.brokerage.update(editingId, d) : propertyApi.brokerage.create(d)
  );
  const { mutate: deleteContract } = useMutation((id: string) => propertyApi.brokerage.delete(id));
  const { mutate: addCommission, loading: addingComm } = useMutation((d: any) =>
    propertyApi.brokerage.addCommission(showCommModal!, d)
  );
  const { mutate: payCommission } = useMutation((id: string) => propertyApi.brokerage.payCommission(id));

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(c: any) {
    setEditingId(c.id);
    setForm({
      clientType: c.client_type ?? "landlord", clientName: c.client_name ?? "",
      clientNationalId: c.client_national_id ?? "", clientPhone: c.client_phone ?? "",
      brokerType: c.broker_type ?? "brokerage_only", scope: c.scope ?? "",
      commissionType: c.commission_type ?? "percentage",
      commissionPercent: c.commission_percent ?? "", commissionAmount: c.commission_amount ?? "",
      commissionPaidBy: c.commission_paid_by ?? "landlord", exclusivity: c.exclusivity ?? false,
      startDate: c.start_date ?? "", endDate: c.end_date ?? "", status: c.status ?? "draft",
      falLicenseNumber: c.fal_license_number ?? "", propertyId: c.property_id ?? "",
      propertyDescription: c.property_description ?? "", notes: c.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    const res = await saveContract(form);
    if (res) {
      toast.success(editingId ? "تم تحديث العقد" : "تم إنشاء عقد الوساطة");
      setShowModal(false); refetch();
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteContract(id);
    if (res !== null) { toast.success("تم الحذف"); refetch(); }
  }

  async function handleAddCommission() {
    const res = await addCommission(commForm);
    if (res) {
      toast.success("تمت إضافة العمولة"); setShowCommModal(null); setCommForm({ amount: "", description: "", status: "pending", notes: "" }); refetchComm();
    }
  }

  async function handlePrint(c: any) {
    printBrokerageContract(c);
  }

  async function handlePayComm(id: string) {
    const res = await payCommission(id);
    if (res !== null) { toast.success("تم تسجيل الدفع"); refetchComm(); }
  }

  const pendingComm = commissions.filter((c: any) => c.status === "pending");
  const pendingTotal = pendingComm.reduce((sum: number, c: any) => sum + Number(c.amount ?? 0), 0);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">عقود الوساطة العقارية</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة عقود الوساطة وتتبع العمولات</p>
        </div>
        <button onClick={openAdd} className="bg-brand-500 text-white hover:bg-brand-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          عقد وساطة جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي العقود", value: stats.total ?? 0, icon: Handshake, color: "bg-brand-50 text-brand-600" },
          { label: "العقود النشطة", value: stats.active ?? 0, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
          { label: "العمولات المعلقة", value: `${pendingTotal.toLocaleString("en-US")} ريال`, icon: Clock, color: "bg-yellow-50 text-yellow-600" },
          { label: "إجمالي القيمة", value: `${Number(stats.total_value ?? 0).toLocaleString("en-US")} ريال`, icon: TrendingUp, color: "bg-blue-50 text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#eef2f6] rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className={clsx("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["", "active", "draft", "completed", "expired", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border",
              statusFilter === s ? "bg-brand-50 text-brand-700 border-brand-200" : "bg-white text-gray-600 border-[#eef2f6] hover:bg-[#f8fafc]"
            )}
          >
            {s === "" ? "الكل" : STATUS_AR[s] ?? s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#eef2f6] rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#f8fafc]">
            <tr>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">رقم العقد</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">العميل</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">نوع الوساطة</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">العمولة</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">المدة</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">الحالة</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7}><SkeletonRows /></td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <Handshake className="mx-auto mb-3 w-10 h-10 text-gray-300" />
                  <p className="text-gray-400 text-base">لا توجد عقود وساطة</p>
                </td>
              </tr>
            ) : (
              contracts.map((c: any) => {
                const commissionStr = c.commission_type === "percentage"
                  ? `${c.commission_percent ?? 0}%`
                  : `${Number(c.commission_amount ?? 0).toLocaleString("en-US")} ريال`;
                return (
                  <tr key={c.id} className="hover:bg-[#f8fafc]">
                    <td className="px-[10px] py-[6px] font-mono text-xs text-gray-600">{c.contract_number}</td>
                    <td className="px-[10px] py-[6px]">
                      <div className="font-medium text-gray-900">{c.client_name}</div>
                      <div className="text-xs text-gray-400">{CLIENT_TYPE_AR[c.client_type] ?? c.client_type}</div>
                    </td>
                    <td className="px-[10px] py-[6px] text-gray-600">{BROKER_TYPE_AR[c.broker_type] ?? c.broker_type}</td>
                    <td className="px-[10px] py-[6px]">
                      <div className="font-medium text-gray-900">{commissionStr}</div>
                      {Number(c.total_commission) > 0 && (
                        <div className="text-xs text-gray-400">
                          {Number(c.paid_commission ?? 0).toLocaleString("en-US")} / {Number(c.total_commission ?? 0).toLocaleString("en-US")} ريال
                        </div>
                      )}
                    </td>
                    <td className="px-[10px] py-[6px] text-xs text-gray-500">
                      <div>{c.start_date ? new Date(c.start_date).toLocaleDateString("ar-SA") : "—"}</div>
                      <div>{c.end_date ? new Date(c.end_date).toLocaleDateString("ar-SA") : "—"}</div>
                    </td>
                    <td className="px-[10px] py-[6px]">
                      <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLS[c.status] ?? "bg-gray-100 text-gray-600")}>
                        {STATUS_AR[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-[10px] py-[6px]">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => handlePrint(c)} className="text-xs text-gray-600 hover:underline">طباعة</button>
                        <button onClick={() => openEdit(c)} className="text-xs text-brand-600 hover:underline">تعديل</button>
                        <button onClick={() => setShowCommModal(c.id)} className="text-xs text-emerald-600 hover:underline">عمولة</button>
                        <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:underline">حذف</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Commissions Section */}
      {commissions.length > 0 && (
        <div className="bg-white border border-[#eef2f6] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#eef2f6]">
            <h3 className="text-sm font-semibold text-gray-700">العمولات المستحقة ({pendingComm.length} معلقة — {pendingTotal.toLocaleString("en-US")} ريال)</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {commissions.map((comm: any) => (
              <div key={comm.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <span className="font-medium text-gray-800">{Number(comm.amount ?? 0).toLocaleString("en-US")} ريال</span>
                  <span className="text-gray-400 mx-2">—</span>
                  <span className="text-gray-600">{comm.client_name}</span>
                  {comm.description && <span className="text-xs text-gray-400 block">{comm.description}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium",
                    comm.status === "paid" ? "bg-emerald-100 text-emerald-700"
                    : comm.status === "invoiced" ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
                  )}>
                    {comm.status === "paid" ? "مدفوع" : comm.status === "invoiced" ? "مُفوتر" : "معلق"}
                  </span>
                  {comm.status === "pending" && (
                    <button onClick={() => handlePayComm(comm.id)} className="text-xs text-emerald-700 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-50">
                      سجّل دفع
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal title={editingId ? "تعديل عقد الوساطة" : "إنشاء عقد وساطة جديد"} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="نوع العميل">
                <select className={inputCls} value={form.clientType} onChange={(e) => setForm({ ...form, clientType: e.target.value })}>
                  {Object.entries(CLIENT_TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="اسم العميل *">
                <input className={inputCls} value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="عبدالله المحمد" />
              </Field>
              <Field label="رقم الهوية">
                <input className={inputCls} value={form.clientNationalId} onChange={(e) => setForm({ ...form, clientNationalId: e.target.value })} />
              </Field>
              <Field label="رقم الهاتف">
                <input className={inputCls} value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} placeholder="05xxxxxxxx" />
              </Field>
              <Field label="نوع الوساطة">
                <select className={inputCls} value={form.brokerType} onChange={(e) => setForm({ ...form, brokerType: e.target.value })}>
                  {Object.entries(BROKER_TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="رقم رخصة فال">
                <input className={inputCls} value={form.falLicenseNumber} onChange={(e) => setForm({ ...form, falLicenseNumber: e.target.value })} placeholder="FAL-XXXXXX" />
              </Field>
              <Field label="العقار (اختياري)">
                <select className={inputCls} value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
                  <option value="">— بدون عقار محدد —</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="نوع العمولة">
                <select className={inputCls} value={form.commissionType} onChange={(e) => setForm({ ...form, commissionType: e.target.value })}>
                  <option value="percentage">نسبة مئوية</option>
                  <option value="fixed">مبلغ ثابت</option>
                  <option value="per_unit">لكل وحدة</option>
                </select>
              </Field>
              {form.commissionType === "percentage" ? (
                <Field label="نسبة العمولة (%)">
                  <input type="number" className={inputCls} value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })} placeholder="2.5" step="0.5" />
                </Field>
              ) : (
                <Field label="مبلغ العمولة (ريال)">
                  <input type="number" className={inputCls} value={form.commissionAmount} onChange={(e) => setForm({ ...form, commissionAmount: e.target.value })} />
                </Field>
              )}
              <Field label="يتحمل العمولة">
                <select className={inputCls} value={form.commissionPaidBy} onChange={(e) => setForm({ ...form, commissionPaidBy: e.target.value })}>
                  {Object.entries(CLIENT_TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  <option value="split">مشترك</option>
                </select>
              </Field>
              <Field label="تاريخ البداية *">
                <input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </Field>
              <Field label="تاريخ الانتهاء *">
                <input type="date" className={inputCls} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </Field>
              <Field label="الحالة">
                <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="حصري">
                <div className="flex items-center gap-2 mt-1">
                  <input type="checkbox" id="excl" checked={form.exclusivity} onChange={(e) => setForm({ ...form, exclusivity: e.target.checked })} className="rounded" />
                  <label htmlFor="excl" className="text-sm text-gray-600">عقد حصري</label>
                </div>
              </Field>
            </div>
            <Field label="نطاق الوساطة">
              <textarea className={clsx(inputCls, "h-20 resize-none")} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="تأجير وحدات العقار وإدارة العلاقة مع المستأجرين..." />
            </Field>
            <Field label="ملاحظات">
              <textarea className={clsx(inputCls, "h-16 resize-none")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-[#eef2f6] rounded-xl text-gray-600 hover:bg-[#f8fafc]">إلغاء</button>
              <button onClick={handleSave} disabled={saving || !form.clientName || !form.startDate || !form.endDate} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50">
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Commission Modal */}
      {showCommModal && (
        <Modal title="إضافة عمولة" onClose={() => setShowCommModal(null)}>
          <div className="space-y-4">
            <Field label="المبلغ (ريال) *">
              <input type="number" className={inputCls} value={commForm.amount} onChange={(e) => setCommForm({ ...commForm, amount: e.target.value })} />
            </Field>
            <Field label="البيان">
              <input className={inputCls} value={commForm.description} onChange={(e) => setCommForm({ ...commForm, description: e.target.value })} placeholder="عمولة عقد إيجار..." />
            </Field>
            <Field label="الحالة">
              <select className={inputCls} value={commForm.status} onChange={(e) => setCommForm({ ...commForm, status: e.target.value })}>
                <option value="pending">معلقة</option>
                <option value="invoiced">مُفوترة</option>
                <option value="paid">مدفوعة</option>
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCommModal(null)} className="px-4 py-2 text-sm border border-[#eef2f6] rounded-xl text-gray-600 hover:bg-[#f8fafc]">إلغاء</button>
              <button onClick={handleAddCommission} disabled={addingComm || !commForm.amount} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {addingComm ? "جارٍ الإضافة..." : "إضافة"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
