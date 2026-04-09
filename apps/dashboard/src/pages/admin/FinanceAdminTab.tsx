import { useState } from "react";
import { Wallet, BookOpen, ArrowDownCircle, Megaphone, X } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { SectionHeader, Spinner, Empty } from "./shared";
import { clsx } from "clsx";

/* ── Subtab definitions ─────────────────────────────────── */
const SUBTABS = [
  { id: "payments",        label: "المدفوعات",      icon: Wallet },
  { id: "journal-entries", label: "القيود اليومية",  icon: BookOpen },
  { id: "expenses",        label: "المصروفات",      icon: ArrowDownCircle },
  { id: "campaigns",       label: "الحملات",         icon: Megaphone },
] as const;

type SubTab = (typeof SUBTABS)[number]["id"];

/* ── Payments ───────────────────────────────────────────── */
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
};
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "معلق",
  completed: "مكتمل",
  failed: "فشل",
  refunded: "مسترد",
};
const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"] as const;

const METHOD_LABELS: Record<string, string> = {
  cash: "نقدي",
  bank_transfer: "تحويل بنكي",
  credit_card: "بطاقة ائتمان",
  online: "إلكتروني",
};
const METHODS = ["cash", "bank_transfer", "credit_card", "online"] as const;

/* ── Journal Entries ────────────────────────────────────── */
const JE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  posted: "bg-green-100 text-green-700",
  reversed: "bg-red-100 text-red-700",
};
const JE_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  posted: "مرحّل",
  reversed: "معكوس",
};
const JE_STATUSES = ["draft", "posted", "reversed"] as const;

const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: "يدوي",
  booking: "حجز",
  invoice: "فاتورة",
  expense: "مصروف",
  payroll: "رواتب",
};
const SOURCE_TYPES = ["manual", "booking", "invoice", "expense", "payroll"] as const;

/* ── Expenses ───────────────────────────────────────────── */
const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  rent: "إيجار",
  utilities: "خدمات",
  salaries: "رواتب",
  marketing: "تسويق",
  supplies: "مستلزمات",
  equipment: "معدات",
  software: "برمجيات",
  travel: "سفر",
  insurance: "تأمين",
  maintenance: "صيانة",
  taxes: "ضرائب",
  miscellaneous: "أخرى",
};
const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  rent: "bg-blue-100 text-blue-700",
  utilities: "bg-cyan-100 text-cyan-700",
  salaries: "bg-green-100 text-green-700",
  marketing: "bg-purple-100 text-purple-700",
  supplies: "bg-yellow-100 text-yellow-700",
  equipment: "bg-indigo-100 text-indigo-700",
  software: "bg-teal-100 text-teal-700",
  travel: "bg-orange-100 text-orange-700",
  insurance: "bg-slate-100 text-slate-700",
  maintenance: "bg-amber-100 text-amber-700",
  taxes: "bg-red-100 text-red-700",
  miscellaneous: "bg-gray-100 text-gray-600",
};
const EXPENSE_CATEGORIES = [
  "rent", "utilities", "salaries", "marketing", "supplies", "equipment",
  "software", "travel", "insurance", "maintenance", "taxes", "miscellaneous",
] as const;

/* ── Campaigns ──────────────────────────────────────────── */
const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  scheduled: "مجدولة",
  sending: "جاري الإرسال",
  completed: "مكتملة",
  cancelled: "ملغاة",
};
const CAMPAIGN_STATUSES = ["draft", "scheduled", "sending", "completed", "cancelled"] as const;

/* ── Pagination helper ──────────────────────────────────── */
function Pagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">السابق</button>
      <span className="text-sm text-gray-500">{page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">التالي</button>
    </div>
  );
}

/* ================================================================
   Payments Section
   ================================================================ */
function PaymentsSection() {
  const [page, setPage]       = useState(1);
  const [orgId, setOrgId]     = useState("");
  const [status, setStatus]   = useState("");
  const [method, setMethod]   = useState("");

  const { data, loading } = useApi(
    () => adminApi.payments({ orgId: orgId || undefined, status: status || undefined, method: method || undefined, page, limit: 25 }),
    [orgId, status, method, page]
  );

  const rows: any[]  = data?.data ?? [];
  const pagination   = data?.pagination;
  const totalPages   = pagination?.totalPages ?? 1;

  const handleReset = () => { setOrgId(""); setStatus(""); setMethod(""); setPage(1); };
  const hasFilters = orgId || status || method;

  return (
    <div className="space-y-5">
      <SectionHeader title="المدفوعات" sub={`${pagination?.total ?? 0} عملية عبر كل المنشآت`} />

      <div className="flex flex-wrap gap-2">
        <input value={orgId} onChange={e => { setOrgId(e.target.value); setPage(1); }}
          placeholder="معرّف المنشأة..."
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none w-48 font-mono" dir="ltr" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الحالات</option>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>)}
        </select>
        <select value={method} onChange={e => { setMethod(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الطرق</option>
          {METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
        </select>
        {hasFilters && (
          <button onClick={handleReset} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={Wallet} text="لا توجد مدفوعات" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold">المبلغ</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">الطريقة</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">النوع</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">بوابة الدفع</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">رقم الإيصال</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">تاريخ الدفع</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{r.orgName ?? r.orgId?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 tabular-nums">
                    {r.amount ? `${Number(r.amount).toLocaleString("en-US")} ر.س` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{METHOD_LABELS[r.method] ?? r.method}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-lg", PAYMENT_STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600")}>
                      {PAYMENT_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{r.type ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{r.gatewayProvider ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell font-mono" dir="ltr">{r.receiptNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                    {r.paidAt ? new Date(r.paidAt).toLocaleDateString("ar") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

/* ================================================================
   Journal Entries Section
   ================================================================ */
function JournalEntriesSection() {
  const [page, setPage]               = useState(1);
  const [orgId, setOrgId]             = useState("");
  const [status, setStatus]           = useState("");
  const [sourceType, setSourceType]   = useState("");

  const { data, loading } = useApi(
    () => adminApi.journalEntries({ orgId: orgId || undefined, status: status || undefined, sourceType: sourceType || undefined, page, limit: 25 }),
    [orgId, status, sourceType, page]
  );

  const rows: any[]  = data?.data ?? [];
  const pagination   = data?.pagination;
  const totalPages   = pagination?.totalPages ?? 1;

  const handleReset = () => { setOrgId(""); setStatus(""); setSourceType(""); setPage(1); };
  const hasFilters = orgId || status || sourceType;

  return (
    <div className="space-y-5">
      <SectionHeader title="القيود اليومية" sub={`${pagination?.total ?? 0} قيد عبر كل المنشآت`} />

      <div className="flex flex-wrap gap-2">
        <input value={orgId} onChange={e => { setOrgId(e.target.value); setPage(1); }}
          placeholder="معرّف المنشأة..."
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none w-48 font-mono" dir="ltr" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الحالات</option>
          {JE_STATUSES.map(s => <option key={s} value={s}>{JE_STATUS_LABELS[s]}</option>)}
        </select>
        <select value={sourceType} onChange={e => { setSourceType(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل المصادر</option>
          {SOURCE_TYPES.map(s => <option key={s} value={s}>{SOURCE_TYPE_LABELS[s]}</option>)}
        </select>
        {hasFilters && (
          <button onClick={handleReset} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={BookOpen} text="لا توجد قيود يومية" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold">رقم القيد</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">الوصف</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">المصدر</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{r.orgName ?? r.orgId?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono" dir="ltr">{r.entryNumber}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{r.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-lg", JE_STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600")}>
                      {JE_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{SOURCE_TYPE_LABELS[r.sourceType] ?? r.sourceType ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                    {r.date ? new Date(r.date).toLocaleDateString("ar") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

/* ================================================================
   Expenses Section
   ================================================================ */
function ExpensesSection() {
  const [page, setPage]         = useState(1);
  const [orgId, setOrgId]       = useState("");
  const [category, setCategory] = useState("");

  const { data, loading } = useApi(
    () => adminApi.expenses({ orgId: orgId || undefined, category: category || undefined, page, limit: 25 }),
    [orgId, category, page]
  );

  const rows: any[]  = data?.data ?? [];
  const pagination   = data?.pagination;
  const totalPages   = pagination?.totalPages ?? 1;

  const handleReset = () => { setOrgId(""); setCategory(""); setPage(1); };
  const hasFilters = orgId || category;

  return (
    <div className="space-y-5">
      <SectionHeader title="المصروفات" sub={`${pagination?.total ?? 0} مصروف عبر كل المنشآت`} />

      <div className="flex flex-wrap gap-2">
        <input value={orgId} onChange={e => { setOrgId(e.target.value); setPage(1); }}
          placeholder="معرّف المنشأة..."
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none w-48 font-mono" dir="ltr" />
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل التصنيفات</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
        </select>
        {hasFilters && (
          <button onClick={handleReset} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={ArrowDownCircle} text="لا توجد مصروفات" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold">التصنيف</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">الوصف</th>
                <th className="text-right px-4 py-3 font-semibold">المبلغ</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">رقم الإيصال</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{r.orgName ?? r.orgId?.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-lg", EXPENSE_CATEGORY_COLORS[r.category] ?? "bg-gray-100 text-gray-600")}>
                      {EXPENSE_CATEGORY_LABELS[r.category] ?? r.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{r.description ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 tabular-nums">
                    {r.amount ? `${Number(r.amount).toLocaleString("en-US")} ر.س` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell font-mono" dir="ltr">{r.receiptNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                    {r.expenseDate ? new Date(r.expenseDate).toLocaleDateString("ar") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

/* ================================================================
   Campaigns Section
   ================================================================ */
function CampaignsSection() {
  const [page, setPage]     = useState(1);
  const [orgId, setOrgId]   = useState("");
  const [status, setStatus] = useState("");

  const { data, loading } = useApi(
    () => adminApi.campaigns({ orgId: orgId || undefined, status: status || undefined, page, limit: 25 }),
    [orgId, status, page]
  );

  const rows: any[]  = data?.data ?? [];
  const pagination   = data?.pagination;
  const totalPages   = pagination?.totalPages ?? 1;

  const handleReset = () => { setOrgId(""); setStatus(""); setPage(1); };
  const hasFilters = orgId || status;

  return (
    <div className="space-y-5">
      <SectionHeader title="الحملات التسويقية" sub={`${pagination?.total ?? 0} حملة عبر كل المنشآت`} />

      <div className="flex flex-wrap gap-2">
        <input value={orgId} onChange={e => { setOrgId(e.target.value); setPage(1); }}
          placeholder="معرّف المنشأة..."
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none w-48 font-mono" dir="ltr" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الحالات</option>
          {CAMPAIGN_STATUSES.map(s => <option key={s} value={s}>{CAMPAIGN_STATUS_LABELS[s]}</option>)}
        </select>
        {hasFilters && (
          <button onClick={handleReset} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={Megaphone} text="لا توجد حملات" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold">اسم الحملة</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">القناة</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">المرسل</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">التحويلات</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">التكلفة</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">الموعد</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{r.orgName ?? r.orgId?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{r.channel ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-lg", CAMPAIGN_STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600")}>
                      {CAMPAIGN_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell tabular-nums">{r.totalSent ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell tabular-nums">{r.totalConverted ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell tabular-nums">
                    {r.cost ? `${Number(r.cost).toLocaleString("en-US")} ر.س` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                    {r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("ar") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

/* ================================================================
   Main Finance Admin Tab
   ================================================================ */
function FinanceAdminTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("payments");

  return (
    <div className="space-y-5">
      {/* Subtab pills */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {SUBTABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
              className={clsx(
                "flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                activeSubTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active section */}
      {activeSubTab === "payments" && <PaymentsSection />}
      {activeSubTab === "journal-entries" && <JournalEntriesSection />}
      {activeSubTab === "expenses" && <ExpensesSection />}
      {activeSubTab === "campaigns" && <CampaignsSection />}
    </div>
  );
}

export default FinanceAdminTab;
