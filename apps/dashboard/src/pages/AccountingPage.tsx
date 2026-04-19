import { useState } from "react";
import { toast } from "@/hooks/useToast";
import { clsx } from "clsx";
import {
  BookOpen, ChevronRight, ChevronDown, Plus, Pencil,
  Trash2, AlertCircle, Loader2, Search,
  TrendingUp, TrendingDown, DollarSign, BarChart2,
} from "lucide-react";
import { accountingApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";

// ============================================================
// HELPERS
// ============================================================

const ACCOUNT_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  asset:     { label: "أصول",          color: "text-emerald-700", bg: "bg-emerald-50" },
  liability: { label: "خصوم",          color: "text-red-700",     bg: "bg-red-50" },
  equity:    { label: "حقوق الملكية",  color: "text-violet-700",  bg: "bg-violet-50" },
  revenue:   { label: "إيرادات",       color: "text-blue-700",    bg: "bg-blue-50" },
  expense:   { label: "مصروفات",       color: "text-orange-700",  bg: "bg-orange-50" },
};

// ============================================================
// ACCOUNT FORM MODAL
// ============================================================

function AccountModal({
  editing,
  flat,
  onClose,
  onSuccess,
}: {
  editing?: any;
  flat: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    code: editing?.code ?? "",
    name: editing?.name ?? "",
    nameEn: editing?.name_en ?? "",
    type: editing?.type ?? "asset",
    normalBalance: editing?.normal_balance ?? "debit",
    parentId: editing?.parent_id ?? "",
    isPostingAllowed: editing?.is_posting_allowed ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        parentId: form.parentId || null,
        nameEn: form.nameEn || null,
      };
      if (editing) {
        await accountingApi.updateAccount(editing.id, payload);
      } else {
        await accountingApi.createAccount(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  // تحديد normalBalance تلقائياً حسب النوع
  function handleTypeChange(type: string) {
    const defaultBalance = ["asset", "expense"].includes(type) ? "debit" : "credit";
    setForm((f) => ({ ...f, type, normalBalance: defaultBalance }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center gap-3 p-5 border-b border-[#eef2f6]">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-violet-600" />
          </div>
          <h2 className="font-bold text-gray-900">{editing ? "تعديل حساب" : "حساب جديد"}</h2>
          <button onClick={onClose} className="mr-auto text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الكود <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="1111"
                className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
                disabled={!!editing?.is_system_account}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
              <select
                value={form.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="اسم الحساب"
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية</label>
            <input
              type="text"
              value={form.nameEn}
              onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              placeholder="Account Name"
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-left"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحساب الأب</label>
              <select
                value={form.parentId}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— بدون أب (رئيسي) —</option>
                {flat
                  .filter((a) => !a.is_posting_allowed || a.level < 3)
                  .map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الرصيد الطبيعي</label>
              <select
                value={form.normalBalance}
                onChange={(e) => setForm((f) => ({ ...f, normalBalance: e.target.value }))}
                className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="debit">مدين</option>
                <option value="credit">دائن</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPostingAllowed}
              onChange={(e) => setForm((f) => ({ ...f, isPostingAllowed: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700">يقبل الترحيل المباشر (حساب تفصيلي)</span>
          </label>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-[#eef2f6] rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-[#f8fafc]">إلغاء</button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-brand-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand-700 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? "حفظ" : "إضافة")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// TREE ROW
// ============================================================

function AccountRow({
  node,
  onEdit,
  onDelete,
}: {
  node: any;
  onEdit: (a: any) => void;
  onDelete: (a: any) => void;
}) {
  const [open, setOpen] = useState(node.level <= 2);
  const cfg = ACCOUNT_TYPE_LABELS[node.type] ?? ACCOUNT_TYPE_LABELS.asset;
  const hasChildren = node.children?.length > 0;
  const indent = (node.level - 1) * 20;

  return (
    <>
      <tr className="hover:bg-[#f8fafc]/50 group">
        <td className="px-[10px] py-[6px]">
          <div className="flex items-center gap-2" style={{ paddingRight: indent }}>
            {hasChildren ? (
              <button onClick={() => setOpen(!open)} className="text-gray-400 hover:text-gray-600 shrink-0">
                {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <span className="text-sm font-mono text-gray-500 shrink-0 w-12">{node.code}</span>
            <span className={clsx("text-sm font-medium", hasChildren ? "text-gray-900" : "text-gray-700")}>
              {node.name}
            </span>
            {node.is_system_account && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">نظام</span>
            )}
          </div>
        </td>
        <td className="px-[10px] py-[6px]">
          <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.color)}>{cfg.label}</span>
        </td>
        <td className="px-[10px] py-[6px] text-xs text-gray-500">
          {node.normal_balance === "debit" ? "مدين" : "دائن"}
        </td>
        <td className="px-[10px] py-[6px]">
          <span className={clsx("text-xs px-2 py-0.5 rounded-full", node.is_posting_allowed ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
            {node.is_posting_allowed ? "تفصيلي" : "إجمالي"}
          </span>
        </td>
        <td className="px-[10px] py-[6px]">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(node)}
              disabled={node.is_system_account}
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(node)}
              disabled={node.is_system_account}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {open && hasChildren && node.children.map((child: any) => (
        <AccountRow key={child.id} node={child} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
}

// ============================================================
// KPI CARD
// ============================================================

function KpiCard({
  label,
  value,
  loading,
  color,
  bg,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  loading: boolean;
  color: string;
  bg: string;
  icon: React.ElementType;
}) {
  return (
    <div className={clsx("rounded-2xl p-5 flex items-start gap-4", bg)}>
      <div className={clsx("w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0", color.replace("text-", "bg-").replace("700", "100").replace("600", "50"))}>
        <Icon className={clsx("w-5 h-5", color)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
        {loading ? (
          <div className="h-6 w-24 bg-white/60 rounded animate-pulse" />
        ) : (
          <p className={clsx("text-xl font-bold", color)}>{value ?? "—"}</p>
        )}
      </div>
    </div>
  );
}

function fmtAmount(n: any): string {
  const num = parseFloat(n);
  if (isNaN(num)) return "—";
  return num.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================================
// MAIN PAGE
// ============================================================

export function AccountingPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: treeRes, loading, refetch } = useApi(() => accountingApi.coa(), []);
  const { data: flatRes } = useApi(() => accountingApi.coa({ flat: "true" }), []);
  const { mutate: deleteAccount } = useMutation((id: string) => accountingApi.deleteAccount(id));

  // KPI data
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: incomeRes, loading: incomeLoading } = useApi(
    () => accountingApi.incomeStatement({ from: firstDay }),
    []
  );
  const { data: balanceRes, loading: balanceLoading } = useApi(
    () => accountingApi.balanceSheet(),
    []
  );

  const income = (incomeRes as any)?.data;
  const balance = (balanceRes as any)?.data;

  const monthRevenue = income?.totalRevenue ?? null;
  const monthExpenses = income?.totalExpense ?? null;
  const netProfit = income?.netIncome ?? null;
  const totalAssets = balance?.totalAssets ?? null;

  const tree: any[] = treeRes?.data ?? [];
  const flat: any[] = flatRes?.data ?? [];

  const filteredTree = tree
    .filter((n) => typeFilter === "all" || n.type === typeFilter)
    .filter((n) => !search || n.name.includes(search) || n.code.includes(search) || n.name_en?.toLowerCase().includes(search.toLowerCase()));

  function showToast(msg: string, type: "success" | "error" = "success") {
    type === "error" ? toast.error(msg) : toast.success(msg);
  }

  async function handleDelete(account: any) {
    if (!confirm(`حذف الحساب "${account.name}"؟`)) return;
    try {
      await deleteAccount(account.id);
      showToast("تم حذف الحساب");
      refetch();
    } catch (err: any) {
      showToast(err.message || "فشل الحذف", "error");
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">دليل الحسابات</h1>
          <p className="text-sm text-gray-500 mt-0.5">هيكل الحسابات المحاسبية للمنشأة</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-brand-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" />
          حساب جديد
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="إيراد الشهر"
          value={monthRevenue !== null ? fmtAmount(monthRevenue) : null}
          loading={incomeLoading}
          color="text-emerald-700"
          bg="bg-emerald-50"
          icon={TrendingUp}
        />
        <KpiCard
          label="المصروفات"
          value={monthExpenses !== null ? fmtAmount(monthExpenses) : null}
          loading={incomeLoading}
          color="text-orange-700"
          bg="bg-orange-50"
          icon={TrendingDown}
        />
        <KpiCard
          label="صافي الربح"
          value={netProfit !== null ? fmtAmount(netProfit) : null}
          loading={incomeLoading}
          color={netProfit !== null && parseFloat(netProfit) < 0 ? "text-red-700" : "text-blue-700"}
          bg={netProfit !== null && parseFloat(netProfit) < 0 ? "bg-red-50" : "bg-blue-50"}
          icon={DollarSign}
        />
        <KpiCard
          label="إجمالي الأصول"
          value={totalAssets !== null ? fmtAmount(totalAssets) : null}
          loading={balanceLoading}
          color="text-violet-700"
          bg="bg-violet-50"
          icon={BarChart2}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="border border-[#eef2f6] rounded-xl pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-[#f1f5f9] rounded-xl p-1">
          <button onClick={() => setTypeFilter("all")} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", typeFilter === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>الكل</button>
          {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => setTypeFilter(k)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", typeFilter === k ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-10 h-10 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">لا يوجد حسابات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#eef2f6] bg-gray-50/50">
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">الحساب</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">النوع</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">الرصيد الطبيعي</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">المستوى</th>
                  <th className="px-[10px] py-[6px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTree.map((node) => (
                  <AccountRow
                    key={node.id}
                    node={node}
                    onEdit={(a) => { setEditing(a); setShowModal(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AccountModal
          editing={editing}
          flat={flat}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSuccess={() => { refetch(); showToast(editing ? "تم التحديث" : "تمت الإضافة"); }}
        />
      )}

    </div>
  );
}
