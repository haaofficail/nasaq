import { useState } from "react";
import { toast } from "@/hooks/useToast";
import { clsx } from "clsx";
import {
  FileText, Plus, Eye, RotateCcw, CheckCircle2,
  AlertCircle, Loader2, Search, Filter,
} from "lucide-react";
import { accountingApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Pagination } from "@/components/ui/Pagination";

// ============================================================
// HELPERS
// ============================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: "مسودة",   color: "text-amber-700",   bg: "bg-amber-50" },
  posted:   { label: "مُرحَّل", color: "text-emerald-700", bg: "bg-emerald-50" },
  reversed: { label: "معكوس",   color: "text-gray-500",    bg: "bg-gray-100" },
};

const SOURCE_LABELS: Record<string, string> = {
  booking: "حجز", invoice: "فاتورة", expense: "مصروف",
  payment: "دفعة", pos: "POS", treasury: "خزينة",
  transfer: "تحويل", manual: "يدوي", closing: "إقفال", opening: "افتتاح",
};

function fmt(n: any) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "2-digit", month: "short", year: "numeric" });
}

// ============================================================
// ENTRY DETAIL DRAWER
// ============================================================

function EntryDrawer({ entryId, onClose, onPost, onReverse }: {
  entryId: string;
  onClose: () => void;
  onPost: (id: string) => void;
  onReverse: (id: string) => void;
}) {
  const { data: res, loading } = useApi(() => accountingApi.getEntry(entryId), [entryId]);
  const entry = res?.data;

  if (loading) return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <Loader2 className="w-6 h-6 animate-spin text-white" />
    </div>
  );
  if (!entry) return null;

  const sc = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.draft;
  const totalDebit = entry.lines?.reduce((s: number, l: any) => s + parseFloat(l.debit || 0), 0) ?? 0;
  const totalCredit = entry.lines?.reduce((s: number, l: any) => s + parseFloat(l.credit || 0), 0) ?? 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-end z-50" dir="rtl">
      <div className="bg-white h-full w-full max-w-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#eef2f6]">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{entry.entry_number}</p>
            <p className="text-xs text-gray-400">{fmtDate(entry.date)}</p>
          </div>
          <span className={clsx("mr-auto text-xs px-2.5 py-1 rounded-full font-medium", sc.bg, sc.color)}>{sc.label}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none mr-2">×</button>
        </div>

        {/* Meta */}
        <div className="px-5 py-4 border-b border-gray-50 space-y-1">
          <p className="text-sm font-medium text-gray-900">{entry.description}</p>
          {entry.reference && <p className="text-xs text-gray-400">المرجع: {entry.reference}</p>}
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            <span>{SOURCE_LABELS[entry.source_type] ?? entry.source_type}</span>
          </div>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#eef2f6] bg-gray-50/50">
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الحساب</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-emerald-600">مدين</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-red-600">دائن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entry.lines?.map((line: any) => (
                <tr key={line.id}>
                  <td className="px-5 py-3">
                    <p className="text-sm text-gray-800">{line.account_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{line.account_code}</p>
                    {line.description && <p className="text-xs text-gray-400 mt-0.5">{line.description}</p>}
                  </td>
                  <td className="px-[10px] py-[6px] text-left tabular-nums text-sm font-medium text-emerald-700">
                    {parseFloat(line.debit) > 0 ? fmt(line.debit) : "—"}
                  </td>
                  <td className="px-[10px] py-[6px] text-left tabular-nums text-sm font-medium text-red-700">
                    {parseFloat(line.credit) > 0 ? fmt(line.credit) : "—"}
                  </td>
                </tr>
              ))}
              {/* Totals */}
              <tr className="bg-gray-50/50 font-semibold border-t-2 border-[#eef2f6]">
                <td className="px-5 py-3 text-sm text-gray-700">الإجمالي</td>
                <td className="px-[10px] py-[6px] text-left tabular-nums text-sm text-emerald-700">{fmt(totalDebit)}</td>
                <td className="px-[10px] py-[6px] text-left tabular-nums text-sm text-red-700">{fmt(totalCredit)}</td>
              </tr>
            </tbody>
          </table>

          {Math.abs(totalDebit - totalCredit) > 0.01 && (
            <div className="mx-5 my-3 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700">القيد غير متوازن! الفارق: {fmt(Math.abs(totalDebit - totalCredit))}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#eef2f6] flex gap-3">
          {entry.status === "draft" && (
            <button
              onClick={() => onPost(entry.id)}
              className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              ترحيل القيد
            </button>
          )}
          {entry.status === "posted" && (
            <button
              onClick={() => onReverse(entry.id)}
              className="flex-1 border border-[#eef2f6] text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-[#f8fafc] flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              عكس القيد
            </button>
          )}
          <button onClick={onClose} className="border border-[#eef2f6] rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-[#f8fafc]">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

const PAGE_SIZE = 25;

export function JournalEntriesPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) };
  if (statusFilter !== "all") params.status = statusFilter;
  if (sourceFilter !== "all") params.sourceType = sourceFilter;

  const handleFilter = (setter: (v: string) => void) => (v: string) => { setter(v); setPage(1); };

  const { data: res, loading, refetch } = useApi(
    () => accountingApi.entries(params),
    [statusFilter, sourceFilter, page]
  );

  const { mutate: postEntry } = useMutation((id: string) => accountingApi.postEntry(id));
  const { mutate: reverseEntry } = useMutation((id: string) => accountingApi.reverseEntry(id));

  const entries: any[] = res?.data ?? [];
  const pagination = res?.pagination;

  function showToast(msg: string, type: "success" | "error" = "success") {
    type === "error" ? toast.error(msg) : toast.success(msg);
  }

  async function handlePost(id: string) {
    try {
      await postEntry(id);
      showToast("تم ترحيل القيد");
      setSelectedEntry(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || "فشل الترحيل", "error");
    }
  }

  async function handleReverse(id: string) {
    if (!confirm("عكس هذا القيد؟ سيُنشئ قيداً عكسياً جديداً.")) return;
    try {
      await reverseEntry(id);
      showToast("تم إنشاء القيد العكسي");
      setSelectedEntry(null);
      refetch();
    } catch (err: any) {
      showToast(err.message || "فشل العكس", "error");
    }
  }

  const filtered = entries.filter((e) =>
    !search || e.entry_number?.includes(search) || e.description?.includes(search)
  );

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">القيود المحاسبية</h1>
          <p className="text-sm text-gray-500 mt-0.5">سجل القيود اليومية والترحيل</p>
        </div>
        <div className="flex items-center gap-2">
          {pagination && <span className="text-sm text-gray-400">{pagination.total} قيد</span>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="رقم القيد أو البيان..."
            className="border border-[#eef2f6] rounded-xl pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-52"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-[#f1f5f9] rounded-xl p-1">
          {["all", "draft", "posted", "reversed"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", statusFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
              {s === "all" ? "الكل" : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">كل المصادر</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-10 h-10 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">لا توجد قيود</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#eef2f6] bg-gray-50/50">
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">رقم القيد</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">البيان</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">المصدر</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">التاريخ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">المدين</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">الحالة</th>
                  <th className="px-[10px] py-[6px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((entry: any) => {
                  const sc = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.draft;
                  return (
                    <tr key={entry.id} className="hover:bg-[#f8fafc]/50">
                      <td className="px-[10px] py-[6px]">
                        <span className="text-sm font-mono font-medium text-gray-900">{entry.entry_number}</span>
                      </td>
                      <td className="px-[10px] py-[6px]">
                        <p className="text-sm text-gray-700 max-w-xs truncate">{entry.description}</p>
                        {entry.reference && <p className="text-xs text-gray-400 mt-0.5">{entry.reference}</p>}
                      </td>
                      <td className="px-[10px] py-[6px]">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {SOURCE_LABELS[entry.source_type] ?? entry.source_type}
                        </span>
                      </td>
                      <td className="px-[10px] py-[6px] text-xs text-gray-500 whitespace-nowrap">{fmtDate(entry.date)}</td>
                      <td className="px-[10px] py-[6px] text-left tabular-nums text-sm font-medium text-gray-900">
                        —
                      </td>
                      <td className="px-[10px] py-[6px]">
                        <span className={clsx("text-xs px-2.5 py-1 rounded-full font-medium", sc.bg, sc.color)}>{sc.label}</span>
                      </td>
                      <td className="px-[10px] py-[6px]">
                        <button
                          onClick={() => setSelectedEntry(entry.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && pagination && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={pagination.total ?? 0} onPage={setPage} label="قيد" />
        )}
      </div>

      {selectedEntry && (
        <EntryDrawer
          entryId={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onPost={handlePost}
          onReverse={handleReverse}
        />
      )}

    </div>
  );
}
