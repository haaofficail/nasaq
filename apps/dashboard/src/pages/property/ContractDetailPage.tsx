import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  not_submitted: "غير موثق", pending: "قيد التوثيق",
  documented: "موثق", rejected: "مرفوض", expired: "منتهي",
};

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [showRenew, setShowRenew] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);
  const [showEjar, setShowEjar] = useState(false);
  const [renewForm, setRenewForm] = useState({ startDate: "", endDate: "", rentAmount: "", increasePercentage: "" });
  const [terminateForm, setTerminateForm] = useState({ terminationReason: "", terminationDate: "" });
  const [ejarForm, setEjarForm] = useState({ ejarContractNumber: "", ejarStatus: "not_submitted", ejarNotes: "" });

  const { data, loading, error, refetch } = useApi(
    () => (id ? propertyApi.getContract(id) : Promise.resolve(null)),
    [id]
  );
  const { data: stmtData, loading: stmtLoading } = useApi(
    () => (id ? propertyApi.getContractStatement(id) : Promise.resolve(null)),
    [id]
  );

  const { mutate: renewContract, loading: renewing } = useMutation((d: any) =>
    propertyApi.renewContract(id!, d)
  );
  const { mutate: terminateContract, loading: terminating } = useMutation((d: any) =>
    propertyApi.terminateContract(id!, d)
  );
  const { mutate: updateEjar, loading: updatingEjar } = useMutation((d: any) =>
    propertyApi.updateContractEjar(id!, d)
  );

  const contract: any = (data as any)?.data ?? null;
  const statement: any = (stmtData as any)?.data ?? null;
  const invoices: any[] = statement?.invoices ?? [];
  const payments: any[] = statement?.payments ?? [];
  const balance: number = statement?.balance ?? 0;

  async function handleRenew() {
    const res = await renewContract(renewForm);
    if (res) { toast.success("تم تجديد العقد"); setShowRenew(false); refetch(); }
  }
  async function handleTerminate() {
    const res = await terminateContract(terminateForm);
    if (res) { toast.success("تم إنهاء العقد"); setShowTerminate(false); refetch(); navigate("/property/contracts"); }
  }
  async function handleEjar() {
    const res = await updateEjar(ejarForm);
    if (res) { toast.success("تم تحديث بيانات إيجار"); setShowEjar(false); refetch(); }
  }

  if (loading) {
    return (
      <div className="p-6" dir="rtl">
        <SkeletonRows rows={8} />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-6" dir="rtl">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error ? `حدث خطأ: ${error}` : "لم يتم العثور على العقد"}
        </div>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-brand-600 hover:underline">
          رجوع
        </button>
      </div>
    );
  }

  const contractAge = contract.startDate
    ? Math.floor((Date.now() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => navigate(-1)} className="text-xs text-gray-400 hover:text-gray-600 mb-2 block">
            &lt; رجوع إلى العقود
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{contract.contractNumber}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", CONTRACT_STATUS_COLORS[contract.status] ?? "bg-gray-100 text-gray-600")}>
              {CONTRACT_STATUS_AR[contract.status] ?? contract.status}
            </span>
            <span className="text-xs text-gray-400">
              {EJAR_STATUS_AR[contract.ejarStatus ?? "not_submitted"]}
            </span>
            {contractAge !== null && (
              <span className="text-xs text-gray-400">{contractAge} يوم منذ البداية</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {contract.status === "active" && (
            <button
              onClick={() => { setShowRenew(true); setRenewForm({ startDate: "", endDate: "", rentAmount: String(contract.rentAmount ?? ""), increasePercentage: "" }); }}
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              تجديد
            </button>
          )}
          {["active", "draft"].includes(contract.status) && (
            <button
              onClick={() => { setShowTerminate(true); setTerminateForm({ terminationReason: "", terminationDate: "" }); }}
              className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              إنهاء
            </button>
          )}
          <button
            onClick={() => { setShowEjar(true); setEjarForm({ ejarContractNumber: contract.ejarContractNumber ?? "", ejarStatus: contract.ejarStatus ?? "not_submitted", ejarNotes: contract.ejarNotes ?? "" }); }}
            className="border border-blue-200 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            وثّق في إيجار
          </button>
        </div>
      </div>

      {/* Contract info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">معلومات العقد</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "المستأجر", value: contract.tenantName },
              { label: "الوحدة", value: contract.unitName },
              { label: "العقار", value: contract.propertyName },
              { label: "نوع العقد", value: contract.contractType === "commercial" ? "تجاري" : "سكني" },
              { label: "تاريخ البداية", value: contract.startDate ? new Date(contract.startDate).toLocaleDateString("ar-SA") : "—" },
              { label: "تاريخ النهاية", value: contract.endDate ? new Date(contract.endDate).toLocaleDateString("ar-SA") : "—" },
              { label: "قيمة الإيجار", value: contract.rentAmount ? `${Number(contract.rentAmount).toLocaleString("en-US")} ريال` : "—" },
              { label: "دورية السداد", value: contract.paymentFrequency ?? "—" },
              { label: "مبلغ الوديعة", value: contract.depositAmount ? `${Number(contract.depositAmount).toLocaleString("en-US")} ريال` : "—" },
              { label: "رقم عقد إيجار", value: contract.ejarContractNumber || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-medium text-gray-800 mt-0.5 text-sm">{value ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Statement */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">كشف الحساب</h2>
          {stmtLoading ? (
            <SkeletonRows rows={4} />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">إجمالي الفواتير</p>
                  <p className="font-bold text-gray-800 mt-1">{Number(statement?.totalInvoiced ?? 0).toLocaleString("en-US")} ريال</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">المدفوع</p>
                  <p className="font-bold text-emerald-700 mt-1">{Number(statement?.totalPaid ?? 0).toLocaleString("en-US")} ريال</p>
                </div>
                <div className={clsx("rounded-xl p-3 text-center", balance > 0 ? "bg-red-50" : "bg-gray-50")}>
                  <p className="text-xs text-gray-400">الرصيد المتبقي</p>
                  <p className={clsx("font-bold mt-1", balance > 0 ? "text-red-600" : "text-gray-600")}>
                    {Number(balance).toLocaleString("en-US")} ريال
                  </p>
                </div>
              </div>

              {/* Invoices */}
              {invoices.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">الفواتير</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {invoices.map((inv: any) => (
                      <div key={inv.id} className="flex justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-500">{inv.invoiceNumber}</span>
                        <span className="text-gray-600">{inv.periodLabel ?? "—"}</span>
                        <span className="font-medium text-gray-800">{Number(inv.amount ?? 0).toLocaleString("en-US")} ريال</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments */}
              {payments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">المدفوعات</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {payments.map((p: any) => (
                      <div key={p.id} className="flex justify-between text-xs bg-emerald-50 rounded-lg px-3 py-2">
                        <span className="text-gray-500">{p.receiptNumber ?? p.id?.slice(0, 8)}</span>
                        <span className="text-gray-400">{p.paidAt ? new Date(p.paidAt).toLocaleDateString("ar-SA") : "—"}</span>
                        <span className="font-medium text-emerald-700">{Number(p.amount ?? 0).toLocaleString("en-US")} ريال</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invoices.length === 0 && payments.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">لا توجد بيانات في كشف الحساب</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">تاريخ العقد</h2>
        {(statement?.timeline ?? []).length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">لا توجد أحداث مسجّلة</p>
        ) : (
          <div className="space-y-3">
            {(statement?.timeline as any[] ?? []).map((event: any, i: number) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="mt-1 w-2 h-2 rounded-full bg-brand-400 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">{event.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {event.date ? new Date(event.date).toLocaleDateString("ar-SA") : "—"}
                    {event.note && ` — ${event.note}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Renew Modal */}
      {showRenew && (
        <Modal title="تجديد العقد" onClose={() => setShowRenew(false)}>
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
              <button onClick={() => setShowRenew(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleRenew} disabled={renewing} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {renewing ? "جارٍ التجديد..." : "تجديد"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Terminate Modal */}
      {showTerminate && (
        <Modal title="إنهاء العقد" onClose={() => setShowTerminate(false)}>
          <div className="space-y-4">
            <Field label="تاريخ الإنهاء">
              <input type="date" className={inputCls} value={terminateForm.terminationDate} onChange={(e) => setTerminateForm({ ...terminateForm, terminationDate: e.target.value })} />
            </Field>
            <Field label="سبب الإنهاء">
              <textarea className={clsx(inputCls, "h-24 resize-none")} value={terminateForm.terminationReason} onChange={(e) => setTerminateForm({ ...terminateForm, terminationReason: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowTerminate(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleTerminate} disabled={terminating} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50">
                {terminating ? "جارٍ الإنهاء..." : "إنهاء العقد"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ejar Modal */}
      {showEjar && (
        <Modal title="تحديث بيانات إيجار" onClose={() => setShowEjar(false)}>
          <div className="space-y-4">
            <Field label="رقم عقد إيجار">
              <input className={inputCls} value={ejarForm.ejarContractNumber} onChange={(e) => setEjarForm({ ...ejarForm, ejarContractNumber: e.target.value })} />
            </Field>
            <Field label="حالة إيجار">
              <select className={inputCls} value={ejarForm.ejarStatus} onChange={(e) => setEjarForm({ ...ejarForm, ejarStatus: e.target.value })}>
                {Object.entries(EJAR_STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="ملاحظات">
              <textarea className={clsx(inputCls, "h-20 resize-none")} value={ejarForm.ejarNotes} onChange={(e) => setEjarForm({ ...ejarForm, ejarNotes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEjar(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleEjar} disabled={updatingEjar} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50">
                {updatingEjar ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
