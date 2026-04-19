import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";

const CONTRACT_STATUS_AR: Record<string, string> = {
  draft: "مسودة", active: "نشط", expired: "منتهي", terminated: "ملغي",
  pending_renewal: "قيد التجديد",
};
const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-emerald-100 text-emerald-700",
  expired: "bg-red-100 text-red-600",
  terminated: "bg-red-100 text-red-600",
  pending_renewal: "bg-yellow-100 text-yellow-700",
};

const EJAR_STATUS_AR: Record<string, string> = {
  not_submitted: "غير موثق",
  pending: "قيد التوثيق",
  documented: "موثق",
  rejected: "مرفوض",
  expired: "منتهي",
};
const EJAR_STATUS_COLORS: Record<string, string> = {
  not_submitted: "bg-red-100 text-red-600",
  pending: "bg-yellow-100 text-yellow-700",
  documented: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
  expired: "bg-gray-100 text-gray-600",
};

const PAYMENT_FREQ_AR: Record<string, string> = {
  monthly: "شهري", quarterly: "ربع سنوي", semi_annual: "نصف سنوي", annual: "سنوي",
};

const CONTRACT_TYPE_AR: Record<string, string> = {
  residential: "سكني", commercial: "تجاري",
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

const inputCls = "w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";

export function LeaseContractsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [propFilter, setPropFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showRenew, setShowRenew] = useState<any>(null);
  const [showTerminate, setShowTerminate] = useState<any>(null);
  const [showEjar, setShowEjar] = useState<any>(null);

  const [createForm, setCreateForm] = useState({
    propertyId: "", unitId: "", tenantId: "", startDate: "", endDate: "",
    rentAmount: "", contractType: "residential", paymentFrequency: "monthly",
    depositAmount: "", autoRenew: false,
    includesElectricity: false, includesWater: false, includesAC: false, includesInternet: false,
  });
  const [renewForm, setRenewForm] = useState({ startDate: "", endDate: "", rentAmount: "", increasePercentage: "" });
  const [terminateForm, setTerminateForm] = useState({ terminationReason: "", terminationDate: "" });
  const [ejarForm, setEjarForm] = useState({ ejarContractNumber: "", ejarStatus: "not_submitted", ejarNotes: "" });

  const { data: propsData } = useApi(() => propertyApi.properties.list(), []);
  const { data: tenantsData } = useApi(() => propertyApi.tenants.list(), []);
  const { data: unitsData } = useApi(
    () => createForm.propertyId ? propertyApi.units.list({ propertyId: createForm.propertyId }) : Promise.resolve({ data: [] }),
    [createForm.propertyId]
  );

  const properties: any[] = (propsData as any)?.data ?? [];
  const tenants: any[] = (tenantsData as any)?.data ?? [];
  const filteredUnits: any[] = (unitsData as any)?.data ?? [];

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (propFilter) params.propertyId = propFilter;
  if (search) params.search = search;

  const { data, loading, error, refetch } = useApi(() => propertyApi.contracts.list(params), [statusFilter, propFilter, search]);
  const contracts: any[] = (data as any)?.data ?? [];

  const { mutate: createContract, loading: creating } = useMutation((d: any) => propertyApi.createContract(d));
  const { mutate: renewContract, loading: renewing } = useMutation((d: any) => propertyApi.renewContract(showRenew?.id, d));
  const { mutate: terminateContract, loading: terminating } = useMutation((d: any) => propertyApi.terminateContract(showTerminate?.id, d));
  const { mutate: updateEjar, loading: updatingEjar } = useMutation((d: any) => propertyApi.updateContractEjar(showEjar?.id, d));

  async function handleCreate() {
    const res = await createContract(createForm);
    if (res) { toast.success("تم إنشاء العقد"); setShowCreate(false); refetch(); }
  }
  async function handleRenew() {
    const res = await renewContract(renewForm);
    if (res) { toast.success("تم تجديد العقد"); setShowRenew(null); refetch(); }
  }
  async function handleTerminate() {
    const res = await terminateContract(terminateForm);
    if (res) { toast.success("تم إنهاء العقد"); setShowTerminate(null); refetch(); }
  }
  async function handleEjar() {
    const res = await updateEjar(ejarForm);
    if (res) { toast.success("تم تحديث بيانات إيجار"); setShowEjar(null); refetch(); }
  }

  const STATUS_TABS = [
    { value: "", label: "الكل" },
    { value: "active", label: "نشط" },
    { value: "draft", label: "مسودة" },
    { value: "expired", label: "منتهي" },
    { value: "terminated", label: "ملغي" },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">عقود الإيجار</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة جميع عقود الإيجار</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          إنشاء عقد
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={clsx(
                "px-3 py-1 text-xs rounded-full border transition-colors",
                statusFilter === t.value
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-600 border-[#eef2f6] hover:bg-[#f8fafc]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select value={propFilter} onChange={(e) => setPropFilter(e.target.value)} className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">كل العقارات</option>
          {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#eef2f6] rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-[#f8fafc]">
            <tr>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">رقم العقد</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">الوحدة</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">المستأجر</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">بداية العقد</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">نهاية العقد</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">الإيجار</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">حالة إيجار</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">الحالة</th>
              <th className="px-[10px] py-[6px] text-right font-medium text-gray-500">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={9}><SkeletonRows /></td></tr>
            ) : error ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
            ) : contracts.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">لا توجد عقود</td></tr>
            ) : (
              contracts.map((c: any) => (
                <>
                  {c.riyadhFreezeApplies && (
                    <tr key={`freeze-${c.id}`}>
                      <td colSpan={9} className="px-4 py-2">
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-3 py-2 text-xs font-medium">
                          تثبيت الإيجار مطبق — الزيادة ممنوعة (لائحة الرياض)
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr key={c.id} className="hover:bg-[#f8fafc]">
                    <td className="px-[10px] py-[6px] font-medium text-gray-900">{c.contractNumber}</td>
                    <td className="px-[10px] py-[6px] text-gray-500">{c.unitName ?? "—"}</td>
                    <td className="px-[10px] py-[6px] text-gray-500">{c.tenantName ?? "—"}</td>
                    <td className="px-[10px] py-[6px] text-gray-500">{c.startDate ? new Date(c.startDate).toLocaleDateString("ar-SA") : "—"}</td>
                    <td className="px-[10px] py-[6px] text-gray-500">{c.endDate ? new Date(c.endDate).toLocaleDateString("ar-SA") : "—"}</td>
                    <td className="px-[10px] py-[6px] font-medium text-gray-900">{c.rentAmount ? `${Number(c.rentAmount).toLocaleString("en-US")} ريال` : "—"}</td>
                    <td className="px-[10px] py-[6px]">
                      <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", EJAR_STATUS_COLORS[c.ejarStatus ?? "not_submitted"])}>
                        {EJAR_STATUS_AR[c.ejarStatus ?? "not_submitted"]}
                      </span>
                    </td>
                    <td className="px-[10px] py-[6px]">
                      <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", CONTRACT_STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600")}>
                        {CONTRACT_STATUS_AR[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-[10px] py-[6px]">
                      <div className="flex gap-2">
                        {c.status === "active" && (
                          <button onClick={() => { setShowRenew(c); setRenewForm({ startDate: "", endDate: "", rentAmount: c.rentAmount ?? "", increasePercentage: "" }); }} className="text-xs text-emerald-700 hover:underline">تجديد</button>
                        )}
                        {["active", "draft"].includes(c.status) && (
                          <button onClick={() => { setShowTerminate(c); setTerminateForm({ terminationReason: "", terminationDate: "" }); }} className="text-xs text-red-500 hover:underline">إنهاء</button>
                        )}
                        <button onClick={() => { setShowEjar(c); setEjarForm({ ejarContractNumber: c.ejarContractNumber ?? "", ejarStatus: c.ejarStatus ?? "not_submitted", ejarNotes: c.ejarNotes ?? "" }); }} className="text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg px-2 py-1 transition-colors">وثّق في إيجار</button>
                      </div>
                    </td>
                  </tr>
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="إنشاء عقد إيجار" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="العقار">
                <select className={inputCls} value={createForm.propertyId} onChange={(e) => setCreateForm({ ...createForm, propertyId: e.target.value, unitId: "" })}>
                  <option value="">اختر العقار</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="الوحدة">
                <select className={inputCls} value={createForm.unitId} onChange={(e) => setCreateForm({ ...createForm, unitId: e.target.value })}>
                  <option value="">اختر الوحدة</option>
                  {filteredUnits.map((u: any) => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
                </select>
              </Field>
              <Field label="المستأجر">
                <select className={inputCls} value={createForm.tenantId} onChange={(e) => setCreateForm({ ...createForm, tenantId: e.target.value })}>
                  <option value="">اختر المستأجر</option>
                  {tenants.map((t: any) => <option key={t.id} value={t.id}>{t.name ?? t.fullName}</option>)}
                </select>
              </Field>
              <Field label="نوع العقد">
                <select className={inputCls} value={createForm.contractType} onChange={(e) => setCreateForm({ ...createForm, contractType: e.target.value })}>
                  {Object.entries(CONTRACT_TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="تاريخ البداية">
                <input type="date" className={inputCls} value={createForm.startDate} onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })} />
              </Field>
              <Field label="تاريخ النهاية">
                <input type="date" className={inputCls} value={createForm.endDate} onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })} />
              </Field>
              <Field label="قيمة الإيجار (ريال)">
                <input type="number" className={inputCls} value={createForm.rentAmount} onChange={(e) => setCreateForm({ ...createForm, rentAmount: e.target.value })} />
              </Field>
              <Field label="دورية السداد">
                <select className={inputCls} value={createForm.paymentFrequency} onChange={(e) => setCreateForm({ ...createForm, paymentFrequency: e.target.value })}>
                  {Object.entries(PAYMENT_FREQ_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="مبلغ الوديعة (ريال)">
                <input type="number" className={inputCls} value={createForm.depositAmount} onChange={(e) => setCreateForm({ ...createForm, depositAmount: e.target.value })} />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="autoRenew" checked={createForm.autoRenew} onChange={(e) => setCreateForm({ ...createForm, autoRenew: e.target.checked })} className="rounded" />
              <label htmlFor="autoRenew" className="text-sm text-gray-700">تجديد تلقائي</label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "includesElectricity", label: "يشمل الكهرباء" },
                { key: "includesWater", label: "يشمل الماء" },
                { key: "includesAC", label: "يشمل التكييف" },
                { key: "includesInternet", label: "يشمل الإنترنت" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={key}
                    checked={(createForm as any)[key]}
                    onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor={key} className="text-sm text-gray-700">{label}</label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[#eef2f6] rounded-xl text-gray-600 hover:bg-[#f8fafc]">إلغاء</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {creating ? "جارٍ الإنشاء..." : "إنشاء"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Renew Modal */}
      {showRenew && (
        <Modal title="تجديد العقد" onClose={() => setShowRenew(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="تاريخ البداية الجديد">
                <input type="date" className={inputCls} value={renewForm.startDate} onChange={(e) => setRenewForm({ ...renewForm, startDate: e.target.value })} />
              </Field>
              <Field label="تاريخ النهاية الجديد">
                <input type="date" className={inputCls} value={renewForm.endDate} onChange={(e) => setRenewForm({ ...renewForm, endDate: e.target.value })} />
              </Field>
              <Field label="قيمة الإيجار الجديدة (ريال)">
                <input type="number" className={inputCls} value={renewForm.rentAmount} onChange={(e) => setRenewForm({ ...renewForm, rentAmount: e.target.value })} />
              </Field>
              <Field label="نسبة الزيادة (%)">
                <input type="number" className={inputCls} value={renewForm.increasePercentage} onChange={(e) => setRenewForm({ ...renewForm, increasePercentage: e.target.value })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowRenew(null)} className="px-4 py-2 text-sm border border-[#eef2f6] rounded-xl text-gray-600 hover:bg-[#f8fafc]">إلغاء</button>
              <button onClick={handleRenew} disabled={renewing} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {renewing ? "جارٍ التجديد..." : "تجديد"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Terminate Modal */}
      {showTerminate && (
        <Modal title="إنهاء العقد" onClose={() => setShowTerminate(null)}>
          <div className="space-y-4">
            <Field label="تاريخ الإنهاء">
              <input type="date" className={inputCls} value={terminateForm.terminationDate} onChange={(e) => setTerminateForm({ ...terminateForm, terminationDate: e.target.value })} />
            </Field>
            <Field label="سبب الإنهاء">
              <textarea className={clsx(inputCls, "h-24 resize-none")} value={terminateForm.terminationReason} onChange={(e) => setTerminateForm({ ...terminateForm, terminationReason: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowTerminate(null)} className="px-4 py-2 text-sm border border-[#eef2f6] rounded-xl text-gray-600 hover:bg-[#f8fafc]">إلغاء</button>
              <button onClick={handleTerminate} disabled={terminating} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50">
                {terminating ? "جارٍ الإنهاء..." : "إنهاء العقد"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ejar Modal */}
      {showEjar && (
        <Modal title="تحديث بيانات إيجار" onClose={() => setShowEjar(null)}>
          <div className="space-y-4">
            <Field label="رقم عقد إيجار">
              <input className={inputCls} value={ejarForm.ejarContractNumber} onChange={(e) => setEjarForm({ ...ejarForm, ejarContractNumber: e.target.value })} />
            </Field>
            <Field label="حالة إيجار">
              <select className={inputCls} value={ejarForm.ejarStatus} onChange={(e) => setEjarForm({ ...ejarForm, ejarStatus: e.target.value })}>
                {Object.entries(EJAR_STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="ملاحظات إيجار">
              <textarea className={clsx(inputCls, "h-20 resize-none")} value={ejarForm.ejarNotes} onChange={(e) => setEjarForm({ ...ejarForm, ejarNotes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEjar(null)} className="px-4 py-2 text-sm border border-[#eef2f6] rounded-xl text-gray-600 hover:bg-[#f8fafc]">إلغاء</button>
              <button onClick={handleEjar} disabled={updatingEjar} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {updatingEjar ? "جارٍ التحديث..." : "حفظ"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
