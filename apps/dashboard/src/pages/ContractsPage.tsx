import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileSignature, Plus, Search, AlertCircle, CheckCircle2, Clock,
  XCircle, RotateCcw, Eye, Loader2, Archive, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import { contractsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { SkeletonRows } from "@/components/ui/Skeleton";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  draft:      { label: "مسودة",   cls: "bg-gray-100 text-gray-600",   icon: Clock },
  active:     { label: "نشط",     cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
  expired:    { label: "منتهي",   cls: "bg-orange-100 text-orange-700", icon: Archive },
  terminated: { label: "ملغي",    cls: "bg-red-100 text-red-700",     icon: XCircle },
  renewed:    { label: "مجدَّد",  cls: "bg-blue-100 text-blue-700",   icon: RotateCcw },
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

// ─── Create Modal ─────────────────────────────────────────────────────────────

type CreateForm = {
  title: string; contractType: string; partyName: string;
  partyPhone: string; partyEmail: string; partyIdNumber: string;
  startDate: string; endDate: string; value: string;
  paymentTerms: string; notes: string;
};

const INIT_FORM: CreateForm = {
  title: "", contractType: "other", partyName: "",
  partyPhone: "", partyEmail: "", partyIdNumber: "",
  startDate: "", endDate: "", value: "",
  paymentTerms: "monthly", notes: "",
};

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateForm>(INIT_FORM);
  const [error, setError] = useState<string | null>(null);

  const { mutate: doCreate, loading } = useMutation(async (_: void) => {
    setError(null);
    if (!form.title.trim() || !form.partyName.trim() || !form.startDate || !form.endDate) {
      setError("العنوان، الطرف الآخر، وتواريخ العقد مطلوبة");
      return;
    }
    await contractsApi.create({
      title: form.title,
      contractType: form.contractType,
      partyName: form.partyName,
      partyPhone: form.partyPhone || null,
      partyEmail: form.partyEmail || null,
      partyIdNumber: form.partyIdNumber || null,
      startDate: form.startDate,
      endDate: form.endDate,
      value: parseFloat(form.value) || 0,
      paymentTerms: form.paymentTerms,
      notes: form.notes || null,
    });
    onCreated();
    onClose();
  });

  const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/20 focus:border-[#5b9bd5]";
  const set = (k: keyof CreateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">عقد جديد</h2>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عنوان العقد</label>
            <input value={form.title} onChange={set("title")} placeholder="مثال: عقد إيجار مكتب 2026" className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع العقد</label>
              <select value={form.contractType} onChange={set("contractType")} className={inp}>
                {Object.entries(CONTRACT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">شروط الدفع</label>
              <select value={form.paymentTerms} onChange={set("paymentTerms")} className={inp}>
                {Object.entries(PAYMENT_TERMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطرف الآخر</label>
            <input value={form.partyName} onChange={set("partyName")} placeholder="اسم الشخص أو الشركة" className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الجوال</label>
              <input value={form.partyPhone} onChange={set("partyPhone")} placeholder="05xxxxxxxx" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهوية / السجل</label>
              <input value={form.partyIdNumber} onChange={set("partyIdNumber")} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
              <input type="date" value={form.startDate} onChange={set("startDate")} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
              <input type="date" value={form.endDate} onChange={set("endDate")} className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">قيمة العقد (ر.س)</label>
            <input type="number" min="0" step="0.01" value={form.value} onChange={set("value")} placeholder="0.00" className={inp} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/20 focus:border-[#5b9bd5] resize-none" />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={() => doCreate(undefined as unknown as void)} disabled={loading}
            className="flex-1 py-2.5 bg-[#5b9bd5] text-white rounded-xl text-sm font-medium hover:bg-[#4a8ac4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            إنشاء العقد
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, loading, error, refetch } = useApi(
    () => contractsApi.list({ status: statusFilter, search }),
    [statusFilter, search],
  );
  const contracts: any[] = (data as any)?.data ?? [];

  const statsResult = useApi(() => contractsApi.stats(), []);
  const stats: any = (statsResult.data as any)?.data ?? {};

  const { mutate: activate, loading: activating } = useMutation(async (id: string) => {
    await contractsApi.activate(id);
    refetch();
  });

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">العقود</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة عقود المنشأة — إيجار، خدمات، توريد، توظيف</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#5b9bd5] text-white rounded-xl text-sm font-medium hover:bg-[#4a8ac4] transition-colors">
          <Plus size={16} />
          عقد جديد
        </button>
      </div>

      {/* Stats */}
      {!statsResult.loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "نشطة",        value: stats.active_count ?? 0,     cls: "text-green-700",  bg: "bg-green-50" },
            { label: "تنتهي قريباً", value: stats.expiring_soon ?? 0,    cls: "text-orange-700", bg: "bg-orange-50" },
            { label: "مسودة",       value: stats.draft_count ?? 0,      cls: "text-gray-700",   bg: "bg-gray-50" },
            { label: "قيمة العقود", value: fmt(stats.active_value ?? 0), cls: "text-[#5b9bd5]",  bg: "bg-blue-50" },
          ].map(s => (
            <div key={s.label} className={clsx("rounded-2xl p-4 border border-gray-100", s.bg)}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={clsx("text-lg font-bold", s.cls)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالعنوان أو اسم الطرف..."
            className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/20 focus:border-[#5b9bd5]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { v: "all", l: "الكل" }, { v: "active", l: "نشطة" }, { v: "draft", l: "مسودة" },
            { v: "expiring", l: "تنتهي قريباً" }, { v: "expired", l: "منتهية" }, { v: "terminated", l: "ملغية" },
          ].map(f => (
            <button key={f.v}
              onClick={() => setStatusFilter(f.v)}
              className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium transition-colors", statusFilter === f.v
                ? "bg-[#5b9bd5] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-4"><SkeletonRows rows={4} /></div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6 flex items-center gap-3 text-red-700">
          <AlertCircle size={20} /><span>{error}</span>
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileSignature className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-gray-500 font-medium">لا توجد عقود</p>
          <p className="text-gray-400 text-sm mt-1">أنشئ عقدك الأول لبدء إدارة العقود</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c: any) => {
            const st = STATUS[c.status] ?? STATUS.draft;
            const Icon = st.icon;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="text-xs text-gray-400 font-mono">{c.contract_number}</span>
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", st.cls)}>
                        <Icon size={11} />{st.label}
                      </span>
                      {c.contract_type && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {CONTRACT_TYPES[c.contract_type] ?? c.contract_type}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-0.5">{c.title}</h3>
                    <p className="text-sm text-gray-500">{c.party_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                      <span>{fmtDate(c.start_date)} — {fmtDate(c.end_date)}</span>
                      <span className="font-mono text-gray-600">{fmt(c.value)}</span>
                      {c.payment_terms && <span>{PAYMENT_TERMS[c.payment_terms] ?? c.payment_terms}</span>}
                      {c.pending_payments > 0 && (
                        <span className="text-orange-600 font-medium">{c.pending_payments} دفعة معلقة</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.status === "draft" && (
                      <button onClick={() => activate(c.id)} disabled={activating}
                        className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center gap-1">
                        {activating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        تفعيل
                      </button>
                    )}
                    <Link to={`/dashboard/contracts/${c.id}`}
                      className="p-1.5 text-gray-400 hover:text-[#5b9bd5] rounded-lg hover:bg-blue-50 transition-colors">
                      <Eye size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={refetch} />
      )}
    </div>
  );
}

export default ContractsPage;
