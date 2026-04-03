import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";
import { printLeaseContract, printContractNotice } from "@/lib/contractPrintUtils";

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

  const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "amendments" | "notices">("overview");
  const [showRenew, setShowRenew] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);
  const [showEjar, setShowEjar] = useState(false);
  const [showAmendment, setShowAmendment] = useState(false);
  const [editingAmendmentId, setEditingAmendmentId] = useState<string | null>(null);
  const [amendmentForm, setAmendmentForm] = useState({ type: "other", description: "", previousValue: "", newValue: "", effectiveDate: "", status: "draft" });
  const [renewForm, setRenewForm] = useState({ startDate: "", endDate: "", rentAmount: "", increasePercentage: "" });
  const [terminateForm, setTerminateForm] = useState({ terminationReason: "", terminationDate: "" });
  const [ejarForm, setEjarForm] = useState({ ejarContractNumber: "", ejarStatus: "not_submitted", ejarNotes: "" });
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingNotice, setGeneratingNotice] = useState<string | null>(null);

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
  const { mutate: saveAmendment, loading: savingAmd } = useMutation((d: any) =>
    editingAmendmentId
      ? propertyApi.amendments.update(id!, editingAmendmentId, d)
      : propertyApi.amendments.create(id!, d)
  );
  const { mutate: deleteAmendment } = useMutation((amdId: string) =>
    propertyApi.amendments.delete(id!, amdId)
  );
  const { data: amendmentsData, refetch: refetchAmendments } = useApi(
    () => (id ? propertyApi.amendments.list(id) : Promise.resolve(null)),
    [id]
  );

  const contract: any = (data as any)?.data ?? null;
  const statement: any = (stmtData as any)?.data ?? null;
  const invoices: any[] = statement?.invoices ?? [];
  const payments: any[] = statement?.payments ?? [];
  const balance: number = statement?.balance ?? 0;
  const amendments: any[] = (amendmentsData as any)?.data ?? [];

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

  async function handleSaveAmendment() {
    const res = await saveAmendment(amendmentForm);
    if (res) {
      toast.success(editingAmendmentId ? "تم تحديث الملحق" : "تم إضافة الملحق");
      setShowAmendment(false); setEditingAmendmentId(null); refetchAmendments();
    }
  }

  async function handleDeleteAmendment(amdId: string) {
    const res = await deleteAmendment(amdId);
    if (res !== null) { toast.success("تم حذف الملحق"); refetchAmendments(); }
  }

  async function handleGeneratePdf() {
    if (!id) return;
    setGeneratingPdf(true);
    try {
      const res = await propertyApi.contractPdfData(id);
      if ((res as any)?.data) printLeaseContract((res as any).data);
    } finally { setGeneratingPdf(false); }
  }

  async function handleNotice(type: string) {
    if (!id) return;
    setGeneratingNotice(type);
    try {
      const res = await propertyApi.contractNotice(id, type);
      if ((res as any)?.data) printContractNotice((res as any).data, type);
    } finally { setGeneratingNotice(null); }
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
          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {generatingPdf ? "جارٍ التوليد..." : "طباعة العقد PDF"}
          </button>
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: "overview" as const, label: "نظرة عامة" },
          { id: "schedule" as const, label: `جدول الدفعات${invoices.length ? ` (${invoices.length})` : ""}` },
          { id: "amendments" as const, label: `الملحقات${amendments.length ? ` (${amendments.length})` : ""}` },
          { id: "notices" as const, label: "الإخطارات" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={clsx(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeTab === t.id
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contract info */}
      {activeTab === "overview" && (<>
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
      </>)}

      {/* ── PAYMENT SCHEDULE TAB ── */}
      {activeTab === "schedule" && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">جدول الدفعات</h2>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>المجموع: <strong>{Number(statement?.totalInvoiced ?? 0).toLocaleString("en-US")} ريال</strong></span>
              <span>المدفوع: <strong className="text-emerald-600">{Number(statement?.totalPaid ?? 0).toLocaleString("en-US")} ريال</strong></span>
              {balance > 0 && <span>المتبقي: <strong className="text-red-600">{Number(balance).toLocaleString("en-US")} ريال</strong></span>}
            </div>
          </div>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">لا توجد فواتير مجدولة</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">#</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">رقم الفاتورة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">الفترة</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">تاريخ الاستحقاق</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">المبلغ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">المدفوع</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv: any, i: number) => {
                  const statusCls = inv.status === "paid" ? "bg-emerald-100 text-emerald-700"
                    : inv.status === "overdue" ? "bg-red-100 text-red-600"
                    : inv.status === "partial" ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600";
                  const statusAr = inv.status === "paid" ? "مدفوع" : inv.status === "overdue" ? "متأخر" : inv.status === "partial" ? "جزئي" : "قادم";
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.periodLabel ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("ar-SA") : "—"}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{Number(inv.totalAmount ?? inv.amount ?? 0).toLocaleString("en-US")} ريال</td>
                      <td className="px-4 py-3 text-emerald-600">{Number(inv.paidAmount ?? 0).toLocaleString("en-US")} ريال</td>
                      <td className="px-4 py-3"><span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", statusCls)}>{statusAr}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── AMENDMENTS TAB ── */}
      {activeTab === "amendments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">ملحقات العقد</h2>
            <button
              onClick={() => { setEditingAmendmentId(null); setAmendmentForm({ type: "other", description: "", previousValue: "", newValue: "", effectiveDate: "", status: "draft" }); setShowAmendment(true); }}
              className="bg-brand-500 text-white hover:bg-brand-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              إضافة ملحق
            </button>
          </div>
          {amendments.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400 text-sm">لا توجد ملحقات</div>
          ) : (
            <div className="space-y-3">
              {amendments.map((amd: any) => {
                const amdStatusCls = amd.status === "active" ? "bg-emerald-100 text-emerald-700" : amd.status === "rejected" ? "bg-red-100 text-red-600" : amd.status === "pending_approval" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600";
                const amdStatusAr = { draft: "مسودة", pending_approval: "قيد الموافقة", active: "نشط", rejected: "مرفوض" }[amd.status as string] ?? amd.status;
                const typeAr = { rent_change: "تغيير الإيجار", duration_change: "تغيير المدة", terms_change: "تغيير الشروط", service_change: "تغيير الخدمات", other: "أخرى" }[amd.type as string] ?? amd.type;
                return (
                  <div key={amd.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-gray-500">{amd.amendment_number}</span>
                          <span className="text-xs font-medium text-gray-700">{typeAr}</span>
                          <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", amdStatusCls)}>{amdStatusAr}</span>
                        </div>
                        {amd.description && <p className="text-sm text-gray-700">{amd.description}</p>}
                        {(amd.previous_value || amd.new_value) && (
                          <div className="flex gap-4 mt-2 text-xs">
                            {amd.previous_value && <span className="text-red-500">قبل: {amd.previous_value}</span>}
                            {amd.new_value && <span className="text-emerald-600">بعد: {amd.new_value}</span>}
                          </div>
                        )}
                        {amd.effective_date && <p className="text-xs text-gray-400 mt-1">نافذ من: {new Date(amd.effective_date).toLocaleDateString("ar-SA")}</p>}
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          <span>{amd.agreed_by_landlord ? "المؤجر: موافق" : "المؤجر: لم يوافق"}</span>
                          <span>{amd.agreed_by_tenant ? "المستأجر: موافق" : "المستأجر: لم يوافق"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => { setEditingAmendmentId(amd.id); setAmendmentForm({ type: amd.type, description: amd.description ?? "", previousValue: amd.previous_value ?? "", newValue: amd.new_value ?? "", effectiveDate: amd.effective_date ?? "", status: amd.status }); setShowAmendment(true); }}
                          className="text-xs text-brand-600 hover:underline"
                        >تعديل</button>
                        <button onClick={() => handleDeleteAmendment(amd.id)} className="text-xs text-red-500 hover:underline">حذف</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── NOTICES TAB ── */}
      {activeTab === "notices" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">انقر على أي إخطار لتوليده وطباعته — يفتح في نافذة جديدة جاهز للطباعة كـ PDF</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { type: "payment_reminder", title: "إخطار بالسداد", desc: "للمستأجر المتأخر عن السداد — مع تحذير باتخاذ الإجراءات النظامية", color: "border-yellow-200 bg-yellow-50", btn: "border-yellow-300 text-yellow-700 hover:bg-yellow-100" },
              { type: "non_renewal", title: "إخطار بعدم التجديد", desc: "إشعار المستأجر قبل 60 يوم من انتهاء العقد بعدم رغبة المؤجر في التجديد", color: "border-blue-200 bg-blue-50", btn: "border-blue-300 text-blue-700 hover:bg-blue-100" },
              { type: "eviction", title: "إخطار بالإخلاء", desc: "فسخ العقد وطلب إخلاء الوحدة — يُستخدم عند التخلف المتكرر عن السداد", color: "border-red-200 bg-red-50", btn: "border-red-300 text-red-700 hover:bg-red-100" },
            ].map((n) => (
              <div key={n.type} className={clsx("border rounded-2xl p-5 space-y-3", n.color)}>
                <h3 className="font-semibold text-gray-800 text-sm">{n.title}</h3>
                <p className="text-xs text-gray-500">{n.desc}</p>
                <button
                  onClick={() => handleNotice(n.type)}
                  disabled={generatingNotice === n.type}
                  className={clsx("border rounded-xl px-4 py-2 text-xs font-medium transition-colors", n.btn)}
                >
                  {generatingNotice === n.type ? "جارٍ التوليد..." : "توليد وطباعة"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amendment Modal */}
      {showAmendment && (
        <Modal title={editingAmendmentId ? "تعديل الملحق" : "إضافة ملحق جديد"} onClose={() => setShowAmendment(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="نوع الملحق">
                <select className={inputCls} value={amendmentForm.type} onChange={(e) => setAmendmentForm({ ...amendmentForm, type: e.target.value })}>
                  <option value="rent_change">تغيير الإيجار</option>
                  <option value="duration_change">تغيير المدة</option>
                  <option value="terms_change">تغيير الشروط</option>
                  <option value="service_change">تغيير الخدمات</option>
                  <option value="other">أخرى</option>
                </select>
              </Field>
              <Field label="تاريخ النفاذ">
                <input type="date" className={inputCls} value={amendmentForm.effectiveDate} onChange={(e) => setAmendmentForm({ ...amendmentForm, effectiveDate: e.target.value })} />
              </Field>
              <Field label="القيمة السابقة">
                <input className={inputCls} value={amendmentForm.previousValue} onChange={(e) => setAmendmentForm({ ...amendmentForm, previousValue: e.target.value })} placeholder="مثال: 2500 ريال" />
              </Field>
              <Field label="القيمة الجديدة">
                <input className={inputCls} value={amendmentForm.newValue} onChange={(e) => setAmendmentForm({ ...amendmentForm, newValue: e.target.value })} placeholder="مثال: 2800 ريال" />
              </Field>
              <Field label="الحالة">
                <select className={inputCls} value={amendmentForm.status} onChange={(e) => setAmendmentForm({ ...amendmentForm, status: e.target.value })}>
                  <option value="draft">مسودة</option>
                  <option value="pending_approval">قيد الموافقة</option>
                  <option value="active">نشط</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </Field>
            </div>
            <Field label="الوصف">
              <textarea className={clsx(inputCls, "h-20 resize-none")} value={amendmentForm.description} onChange={(e) => setAmendmentForm({ ...amendmentForm, description: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAmendment(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleSaveAmendment} disabled={savingAmd} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50">
                {savingAmd ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </Modal>
      )}

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
