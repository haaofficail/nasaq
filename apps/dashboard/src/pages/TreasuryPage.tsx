import { useState } from "react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import {
  Wallet, Building2, CreditCard, Banknote, ArrowLeftRight,
  Plus, TrendingUp, TrendingDown, RefreshCw, ArrowLeft,
  ChevronDown, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";
import { treasuryApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";

// ============================================================
// HELPERS
// ============================================================

function fmt(n: any) {
  return Number(n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; icon: any; bg: string; color: string }> = {
  main_cash:        { label: "الصندوق الرئيسي",  icon: Wallet,      bg: "bg-emerald-50", color: "text-emerald-600" },
  branch_cash:      { label: "صندوق فرع",         icon: Wallet,      bg: "bg-teal-50",    color: "text-teal-600" },
  cashier_drawer:   { label: "درج كاشير",          icon: CreditCard,  bg: "bg-blue-50",    color: "text-blue-600" },
  petty_cash:       { label: "عهدة / صغرى",        icon: Banknote,    bg: "bg-amber-50",   color: "text-amber-600" },
  bank_account:     { label: "حساب بنكي",          icon: Building2,   bg: "bg-violet-50",  color: "text-violet-600" },
  employee_custody: { label: "عهدة موظف",          icon: Banknote,    bg: "bg-rose-50",    color: "text-rose-600" },
};

const TX_TYPE_CONFIG: Record<string, { label: string; sign: string; color: string }> = {
  receipt:      { label: "قبض",          sign: "+", color: "text-emerald-600" },
  payment:      { label: "صرف",          sign: "−", color: "text-red-600" },
  transfer_in:  { label: "تحويل وارد",   sign: "+", color: "text-blue-600" },
  transfer_out: { label: "تحويل صادر",   sign: "−", color: "text-orange-600" },
  opening:      { label: "رصيد افتتاحي", sign: "+", color: "text-gray-500" },
  closing:      { label: "رصيد ختامي",   sign: "−", color: "text-gray-500" },
  adjustment:   { label: "تسوية",        sign: "±", color: "text-purple-600" },
};

// ============================================================
// VOUCHER MODAL — سند القبض / الصرف
// ============================================================

function VoucherModal({
  type,
  accounts,
  onClose,
  onSuccess,
}: {
  type: "receipt" | "payment" | "transfer";
  accounts: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    treasuryAccountId: accounts[0]?.id ?? "",
    fromAccountId: accounts[0]?.id ?? "",
    toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? "",
    amount: "",
    description: "",
    paymentMethod: "cash",
    counterpartyName: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const title = type === "receipt" ? "سند قبض" : type === "payment" ? "سند صرف" : "تحويل بين صناديق";
  const Icon = type === "receipt" ? TrendingUp : type === "payment" ? TrendingDown : ArrowLeftRight;
  const color = type === "receipt" ? "text-emerald-600" : type === "payment" ? "text-red-600" : "text-blue-600";
  const bg = type === "receipt" ? "bg-emerald-50" : type === "payment" ? "bg-red-50" : "bg-blue-50";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (type === "transfer") {
        await treasuryApi.transfer({
          fromAccountId: form.fromAccountId,
          toAccountId: form.toAccountId,
          amount: form.amount,
          description: form.description || undefined,
        });
      } else if (type === "receipt") {
        await treasuryApi.receipt({
          treasuryAccountId: form.treasuryAccountId,
          amount: form.amount,
          description: form.description,
          paymentMethod: form.paymentMethod,
          counterpartyName: form.counterpartyName || undefined,
          sourceType: "manual",
        });
      } else {
        await treasuryApi.payment({
          treasuryAccountId: form.treasuryAccountId,
          amount: form.amount,
          description: form.description,
          paymentMethod: form.paymentMethod,
          counterpartyName: form.counterpartyName || undefined,
          sourceType: "manual",
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center gap-3 p-5 border-b border-gray-100">
          <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", bg)}>
            <Icon className={clsx("w-5 h-5", color)} />
          </div>
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="mr-auto text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {type === "transfer" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">من الصندوق</label>
                <select
                  value={form.fromAccountId}
                  onChange={(e) => setForm((f) => ({ ...f, fromAccountId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({fmt(a.current_balance)} ر.س)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">إلى الصندوق</label>
                <select
                  value={form.toAccountId}
                  onChange={(e) => setForm((f) => ({ ...f, toAccountId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                >
                  {accounts.filter((a) => a.id !== form.fromAccountId).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الصندوق</label>
              <select
                value={form.treasuryAccountId}
                onChange={(e) => setForm((f) => ({ ...f, treasuryAccountId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({fmt(a.current_balance)} ر.س)</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ر.س)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البيان</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="وصف العملية"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required={type !== "transfer"}
            />
          </div>

          {type !== "transfer" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="cash">نقدي</option>
                  <option value="mada">مدى</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="visa_master">فيزا / ماستر</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الطرف الآخر (اختياري)</label>
                <input
                  type="text"
                  value={form.counterpartyName}
                  onChange={(e) => setForm((f) => ({ ...f, counterpartyName: e.target.value }))}
                  placeholder="اسم العميل أو المورد"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">إلغاء</button>
            <button
              type="submit"
              disabled={saving}
              className={clsx("flex-1 rounded-xl py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2", type === "receipt" ? "bg-emerald-600 hover:bg-emerald-700" : type === "payment" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700")}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ACCOUNT CARD
// ============================================================

function AccountCard({ account, onSelect, selected }: { account: any; onSelect: () => void; selected: boolean }) {
  const cfg = ACCOUNT_TYPE_CONFIG[account.type] ?? ACCOUNT_TYPE_CONFIG.main_cash;
  const Icon = cfg.icon;
  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full text-right p-4 rounded-2xl border-2 transition-all",
        selected ? "border-brand-400 bg-brand-50/30" : "border-gray-100 bg-white hover:border-gray-200"
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
          <Icon className={clsx("w-4 h-4", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{account.name}</p>
          <p className="text-xs text-gray-400">{cfg.label}</p>
        </div>
      </div>
      <p className={clsx("text-xl font-bold tabular-nums", parseFloat(account.current_balance) < 0 ? "text-red-600" : "text-gray-900")}>
        {fmt(account.current_balance)} <span className="text-xs font-normal text-gray-400">ر.س</span>
      </p>
    </button>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export function TreasuryPage() {
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [voucherModal, setVoucherModal] = useState<"receipt" | "payment" | "transfer" | null>(null);

  const { data: accountsRes, loading: loadingAccounts, refetch: refetchAccounts } = useApi(() => treasuryApi.accounts(), []);
  const { data: summaryRes } = useApi(() => treasuryApi.summary(), []);
  const { data: txRes, loading: loadingTx, refetch: refetchTx } = useApi(
    () => selectedAccount ? treasuryApi.transactions(selectedAccount.id, { limit: "20" }) : Promise.resolve(null),
    [selectedAccount?.id]
  );
  const { data: dailyRes } = useApi(() => treasuryApi.dailyReport(), []);

  const accounts: any[] = accountsRes?.data ?? [];
  const summary = summaryRes?.data ?? {};
  const transactions: any[] = txRes?.data ?? [];
  const daily = dailyRes?.data ?? {};

  function handleVoucherSuccess() {
    refetchAccounts();
    if (selectedAccount) refetchTx();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الخزينة</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة الصناديق والسندات والتحويلات</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoucherModal("transfer")}
            className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeftRight className="w-4 h-4" />
            تحويل
          </button>
          <button
            onClick={() => setVoucherModal("payment")}
            className="flex items-center gap-2 border border-red-200 bg-red-50 rounded-xl px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <TrendingDown className="w-4 h-4" />
            سند صرف
          </button>
          <button
            onClick={() => setVoucherModal("receipt")}
            className="flex items-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-emerald-700"
          >
            <TrendingUp className="w-4 h-4" />
            سند قبض
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">إجمالي الأرصدة</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmt(summary.totalBalance)}</p>
          <p className="text-xs text-gray-400 mt-0.5">ر.س</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">قبض اليوم</p>
          <p className="text-2xl font-bold text-emerald-600 tabular-nums">{fmt(daily.totalReceipts)}</p>
          <p className="text-xs text-gray-400 mt-0.5">ر.س</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">صرف اليوم</p>
          <p className="text-2xl font-bold text-red-600 tabular-nums">{fmt(daily.totalPayments)}</p>
          <p className="text-xs text-gray-400 mt-0.5">ر.س</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">صافي اليوم</p>
          <p className={clsx("text-2xl font-bold tabular-nums", (daily.netFlow ?? 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
            {fmt(daily.netFlow)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">ر.س</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">الصناديق والخزائن</h2>
            <Link to="/dashboard/treasury/accounts/new" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
              <Plus className="w-3 h-3" />
              جديد
            </Link>
          </div>
          {loadingAccounts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : accounts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <Wallet className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا يوجد صناديق بعد</p>
              <Link to="/dashboard/treasury/accounts/new" className="text-xs text-brand-500 mt-1 inline-block">
                أنشئ الصندوق الأول
              </Link>
            </div>
          ) : (
            accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                selected={selectedAccount?.id === acc.id}
                onSelect={() => setSelectedAccount(acc)}
              />
            ))
          )}
        </div>

        {/* Transactions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">
              {selectedAccount ? `حركات: ${selectedAccount.name}` : "حركات الصندوق"}
            </h2>
            {selectedAccount && (
              <button onClick={() => refetchTx()} className="text-gray-400 hover:text-gray-600">
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {!selectedAccount ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wallet className="w-10 h-10 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">اختر صندوقاً لعرض حركاته</p>
              </div>
            ) : loadingTx ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">لا توجد حركات</p>
              </div>
            ) : (
              transactions.map((tx: any) => {
                const cfg = TX_TYPE_CONFIG[tx.transaction_type] ?? { label: tx.transaction_type, sign: "", color: "text-gray-600" };
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{cfg.label}</span>
                        {tx.voucher_number && (
                          <span className="text-xs text-gray-300">· {tx.voucher_number}</span>
                        )}
                        {tx.counterparty_name && (
                          <span className="text-xs text-gray-400">· {tx.counterparty_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <p className={clsx("text-sm font-semibold tabular-nums", cfg.color)}>
                        {cfg.sign}{fmt(tx.amount)}
                      </p>
                      <p className="text-xs text-gray-400 tabular-nums">
                        {fmt(tx.balance_after)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-300 shrink-0 w-16 text-left">
                      {new Date(tx.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Voucher Modal */}
      {voucherModal && accounts.length > 0 && (
        <VoucherModal
          type={voucherModal}
          accounts={accounts}
          onClose={() => setVoucherModal(null)}
          onSuccess={handleVoucherSuccess}
        />
      )}
      {voucherModal && accounts.length === 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 mb-1">لا يوجد صناديق</p>
            <p className="text-sm text-gray-500 mb-4">أنشئ صندوقاً أولاً قبل تسجيل العمليات.</p>
            <button onClick={() => setVoucherModal(null)} className="w-full border border-gray-200 rounded-xl py-2.5 text-sm font-medium">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}
