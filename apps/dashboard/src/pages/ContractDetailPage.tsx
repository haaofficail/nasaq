import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowRight, FileSignature, CheckCircle2, Clock, XCircle, RotateCcw, Archive,
  Plus, Loader2, AlertCircle, FileText, Trash2, RotateCw, Edit2, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import { contractsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { SkeletonRows } from "@/components/ui/Skeleton";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  draft:      { label: "مسودة",   cls: "bg-gray-100 text-gray-600",     icon: Clock },
  active:     { label: "نشط",     cls: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  expired:    { label: "منتهي",   cls: "bg-orange-100 text-orange-700", icon: Archive },
  terminated: { label: "ملغي",    cls: "bg-red-100 text-red-700",       icon: XCircle },
  renewed:    { label: "مجدَّد",  cls: "bg-blue-100 text-blue-700",     icon: RotateCcw },
};

const PAY_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "معلقة",  cls: "bg-yellow-100 text-yellow-700" },
  paid:      { label: "مدفوعة", cls: "bg-green-100 text-green-700" },
  overdue:   { label: "متأخرة", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "ملغية",  cls: "bg-gray-100 text-gray-500" },
};

const CONTRACT_TYPES: Record<string, string> = {
  lease: "إيجار", service: "خدمة", vendor: "مورد", employment: "توظيف", other: "آخر",
};
const PAYMENT_TERMS: Record<string, string> = {
  monthly: "شهري", quarterly: "ربع سنوي", annual: "سنوي", one_time: "دفعة واحدة",
};

// ─── Utils ───────────────────────────────────────────────────────────────────

function fmt(n: any) {
  const num = parseFloat(n);
  if (isNaN(num)) return "—";
  return num.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ر.س";
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Mark Paid Modal ─────────────────────────────────────────────────────────

function MarkPaidModal({
  contractId, payment, onClose, onDone,
}: { contractId: string; payment: any; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const { mutate, loading } = useMutation(async (_: void) => {
    await contractsApi.payments.markPaid(contractId, payment.id, {
      paymentMethod: method,
      reference: reference || null,
      notes: notes || null,
    });
    onDone();
    onClose();
  });

  const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/20 focus:border-[#5b9bd5]";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4">تأكيد الدفعة</h3>
        <p className="text-sm text-gray-600 mb-4">
          المبلغ: <span className="font-semibold text-gray-900">{fmt(payment.amount)}</span>
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className={inp}>
              <option value="cash">نقد</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="cheque">شيك</option>
              <option value="online">إلكتروني</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المرجع (اختياري)</label>
            <input value={reference} onChange={e => setReference(e.target.value)} className={inp} placeholder="رقم الحوالة أو الشيك" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className={inp} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => mutate(undefined as unknown as void)} disabled={loading}
            className="flex-1 py-2.5 bg-[#5b9bd5] text-white rounded-xl text-sm font-medium hover:bg-[#4a8ac4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            تأكيد الدفعة
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Renew Modal ──────────────────────────────────────────────────────────────

function RenewModal({
  contractId, contract, onClose, onDone,
}: { contractId: string; contract: any; onClose: () => void; onDone: () => void }) {
  const [newEndDate, setNewEndDate] = useState("");
  const [newValue, setNewValue] = useState("");
  const [notes, setNotes] = useState("");

  const { mutate, loading } = useMutation(async (_: void) => {
    await contractsApi.renew(contractId, {
      newEndDate,
      newValue: newValue ? parseFloat(newValue) : undefined,
      notes: notes || null,
    });
    onDone();
    onClose();
  });

  const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/20 focus:border-[#5b9bd5]";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4">تجديد العقد</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء الجديد</label>
            <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">القيمة الجديدة (اتركها فارغة للإبقاء على نفس القيمة)</label>
            <input type="number" min="0" step="0.01" value={newValue} onChange={e => setNewValue(e.target.value)}
              placeholder={fmt(contract.value)} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className={inp} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => mutate(undefined as unknown as void)} disabled={loading || !newEndDate}
            className="flex-1 py-2.5 bg-[#5b9bd5] text-white rounded-xl text-sm font-medium hover:bg-[#4a8ac4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            تجديد
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useApi(
    () => contractsApi.get(id!),
    [id],
  );
  const contract: any = (data as any)?.data ?? null;

  const [markPaidPayment, setMarkPaidPayment] = useState<any | null>(null);
  const [showRenew, setShowRenew] = useState(false);
  const [showTerminateReason, setShowTerminateReason] = useState(false);
  const [terminateReason, setTerminateReason] = useState("");

  const { mutate: activate, loading: activating } = useMutation(async (_: void) => {
    await contractsApi.activate(id!);
    refetch();
  });

  const { mutate: terminate, loading: terminating } = useMutation(async (_: void) => {
    await contractsApi.terminate(id!, { terminationReason: terminateReason || null });
    setShowTerminateReason(false);
    refetch();
  });

  if (loading) {
    return (
      <div className="p-6" dir="rtl">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <SkeletonRows rows={6} />
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-6" dir="rtl">
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6 flex items-center gap-3 text-red-700">
          <AlertCircle size={20} /><span>{error || "العقد غير موجود"}</span>
        </div>
      </div>
    );
  }

  const st = STATUS[contract.status] ?? STATUS.draft;
  const StatusIcon = st.icon;
  const payments: any[] = contract.payments ?? [];
  const documents: any[] = contract.documents ?? [];

  const paidTotal  = payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + parseFloat(p.amount), 0);
  const pendingTotal = payments.filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + parseFloat(p.amount), 0);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard/contracts" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowRight size={16} />
          العودة للعقود
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-sm text-gray-400 font-mono">{contract.contract_number}</span>
              <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", st.cls)}>
                <StatusIcon size={11} />{st.label}
              </span>
              {contract.contract_type && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {CONTRACT_TYPES[contract.contract_type] ?? contract.contract_type}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{contract.title}</h1>
            <p className="text-gray-500">{contract.party_name}</p>
            {contract.party_phone && <p className="text-sm text-gray-400 mt-0.5">{contract.party_phone}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {contract.status === "draft" && (
              <button onClick={() => activate(undefined as unknown as void)} disabled={activating}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50">
                {activating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                تفعيل العقد
              </button>
            )}
            {contract.status === "active" && (
              <>
                <button onClick={() => setShowRenew(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                  <RotateCw size={14} />
                  تجديد
                </button>
                <button onClick={() => setShowTerminateReason(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                  <XCircle size={14} />
                  إنهاء العقد
                </button>
              </>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">تاريخ البداية</p>
            <p className="text-sm font-medium text-gray-700">{fmtDate(contract.start_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">تاريخ الانتهاء</p>
            <p className="text-sm font-medium text-gray-700">{fmtDate(contract.end_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">قيمة العقد</p>
            <p className="text-sm font-bold text-gray-900">{fmt(contract.value)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">شروط الدفع</p>
            <p className="text-sm font-medium text-gray-700">{PAYMENT_TERMS[contract.payment_terms] ?? contract.payment_terms ?? "—"}</p>
          </div>
        </div>

        {contract.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">ملاحظات</p>
            <p className="text-sm text-gray-600">{contract.notes}</p>
          </div>
        )}
      </div>

      {/* Terminate reason form */}
      {showTerminateReason && (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
          <p className="text-sm font-medium text-red-700 mb-3">سبب الإنهاء (اختياري)</p>
          <input
            value={terminateReason}
            onChange={e => setTerminateReason(e.target.value)}
            placeholder="سبب إنهاء العقد..."
            className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:border-red-400"
          />
          <div className="flex gap-2">
            <button onClick={() => terminate(undefined as unknown as void)} disabled={terminating}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              {terminating && <Loader2 size={14} className="animate-spin" />}
              تأكيد الإنهاء
            </button>
            <button onClick={() => setShowTerminateReason(false)}
              className="px-4 py-2 border border-red-200 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Payments */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">جدول الدفعات</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              مدفوع: {fmt(paidTotal)} | متبقي: {fmt(pendingTotal)}
            </p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">لا توجد دفعات — فعّل العقد لإنشاء جدول الدفعات تلقائياً</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {payments.map((p: any) => {
              const ps = PAY_STATUS[p.status] ?? PAY_STATUS.pending;
              return (
                <div key={p.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">{fmtDate(p.due_date)}</p>
                    {p.paid_at && (
                      <p className="text-xs text-gray-400">دُفعت في {fmtDate(p.paid_at)}</p>
                    )}
                    {p.reference && <p className="text-xs text-gray-400">المرجع: {p.reference}</p>}
                  </div>
                  <span className="font-mono text-sm font-semibold text-gray-800">{fmt(p.amount)}</span>
                  <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", ps.cls)}>{ps.label}</span>
                  {p.status === "pending" && (
                    <button onClick={() => setMarkPaidPayment(p)}
                      className="text-xs px-3 py-1.5 bg-[#5b9bd5] text-white rounded-lg hover:bg-[#4a8ac4] transition-colors">
                      دفع
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Documents */}
      {documents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">المستندات</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-4 p-4">
                <FileText size={18} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">{fmtDate(doc.created_at)}</p>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#5b9bd5] hover:underline">
                  عرض
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {markPaidPayment && (
        <MarkPaidModal
          contractId={id!}
          payment={markPaidPayment}
          onClose={() => setMarkPaidPayment(null)}
          onDone={refetch}
        />
      )}
      {showRenew && (
        <RenewModal
          contractId={id!}
          contract={contract}
          onClose={() => setShowRenew(false)}
          onDone={() => { refetch(); navigate("/dashboard/contracts"); }}
        />
      )}
    </div>
  );
}

export default ContractDetailPage;
