import { useState } from "react";
import {
  TrendingUp, TrendingDown, Scale, Activity, Download,
  CheckCircle2, AlertCircle, RefreshCw, Loader2, ChevronDown, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { accountingApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TABS = [
  { id: "income",   label: "قائمة الدخل",     icon: TrendingUp },
  { id: "balance",  label: "الميزانية العمومية", icon: Scale },
  { id: "trial",    label: "ميزان المراجعة",  icon: Activity },
  { id: "aging_ar", label: "تقادم العملاء",   icon: TrendingUp },
  { id: "aging_ap", label: "تقادم الموردين",  icon: TrendingDown },
  { id: "cashflow", label: "التدفقات النقدية", icon: RefreshCw },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function SectionRow({ label, amount, bold, indent, positive }: {
  label: string; amount: number; bold?: boolean; indent?: boolean; positive?: boolean;
}) {
  const color = positive === undefined ? "text-gray-900"
    : positive ? "text-emerald-600" : "text-red-500";
  return (
    <div className={clsx("flex items-center justify-between py-2.5 border-b border-gray-50",
      indent ? "pr-5" : "")}>
      <span className={clsx("text-sm", bold ? "font-bold text-gray-900" : "text-gray-600")}>{label}</span>
      <span className={clsx("text-sm tabular-nums", bold ? "font-bold" : "font-medium", color)}>
        {fmt(amount)} ر.س
      </span>
    </div>
  );
}

function BalancedBadge({ isBalanced }: { isBalanced: boolean }) {
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
      isBalanced
        ? "bg-emerald-50 text-emerald-700"
        : "bg-red-50 text-red-600"
    )}>
      {isBalanced
        ? <><CheckCircle2 className="w-3.5 h-3.5" /> متوازن</>
        : <><AlertCircle className="w-3.5 h-3.5" /> غير متوازن</>}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Date range helper
// ────────────────────────────────────────────────────────────

function getDefaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
  const to   = now.toISOString().split("T")[0];
  return { from, to };
}

// ────────────────────────────────────────────────────────────
// INCOME STATEMENT
// ────────────────────────────────────────────────────────────

function IncomeStatement({ from, to }: { from: string; to: string }) {
  const { data, loading, error } = useApi(
    () => accountingApi.incomeStatement({ from, to }),
    [from, to]
  );
  const d = data?.data;

  if (loading) return <Skeleton />;
  if (error || !d) return <Empty message="تعذر تحميل قائمة الدخل" />;

  const margin = d.profitMargin ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-gray-900">قائمة الدخل</h2>
          <p className="text-xs text-gray-400 mt-0.5">{from} — {to}</p>
        </div>
        <span className={clsx(
          "text-sm font-bold px-3 py-1 rounded-full",
          d.netIncome >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
        )}>
          هامش {margin}%
        </span>
      </div>

      {/* Revenues */}
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">الإيرادات</p>
      {d.revenues.items.map((r: any) => (
        <SectionRow key={r.code} label={r.name} amount={parseFloat(r.net_credit)} indent />
      ))}
      <SectionRow label="إجمالي الإيرادات" amount={d.revenues.total} bold positive />

      <div className="my-4" />

      {/* Expenses */}
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">المصروفات</p>
      {d.expenses.items.map((r: any) => (
        <SectionRow key={r.code} label={r.name} amount={parseFloat(r.net_debit)} indent />
      ))}
      <SectionRow label="إجمالي المصروفات" amount={d.expenses.total} bold positive={false} />

      <div className="my-4 border-t border-dashed border-[#eef2f6]" />
      <SectionRow label="صافي الدخل / (الخسارة)" amount={d.netIncome} bold positive={d.netIncome >= 0} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// BALANCE SHEET
// ────────────────────────────────────────────────────────────

function BalanceSheet({ asOf }: { asOf: string }) {
  const { data, loading, error } = useApi(
    () => accountingApi.balanceSheet({ asOf }),
    [asOf]
  );
  const d = data?.data;

  if (loading) return <Skeleton />;
  if (error || !d) return <Empty message="تعذر تحميل الميزانية" />;

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-gray-900">الميزانية العمومية</h2>
          <p className="text-xs text-gray-400 mt-0.5">بتاريخ {asOf}</p>
        </div>
        <BalancedBadge isBalanced={d.isBalanced} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">الأصول</p>
          {d.assets.items.map((r: any) => (
            <SectionRow key={r.code} label={r.name} amount={parseFloat(r.balance)} indent />
          ))}
          <SectionRow label="إجمالي الأصول" amount={d.assets.total} bold />
        </div>

        {/* Liabilities + Equity */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">الخصوم</p>
          {d.liabilities.items.map((r: any) => (
            <SectionRow key={r.code} label={r.name} amount={parseFloat(r.balance)} indent />
          ))}
          <SectionRow label="إجمالي الخصوم" amount={d.liabilities.total} bold />

          <div className="my-4" />
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">حقوق الملكية</p>
          {d.equity.items.map((r: any) => (
            <SectionRow key={r.code} label={r.name} amount={parseFloat(r.balance)} indent />
          ))}
          <SectionRow label="إجمالي حقوق الملكية" amount={d.equity.total} bold />

          <div className="my-4 border-t border-dashed border-[#eef2f6]" />
          <SectionRow label="الخصوم + حقوق الملكية" amount={d.liabilities.total + d.equity.total} bold />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TRIAL BALANCE
// ────────────────────────────────────────────────────────────

function TrialBalance({ from, to }: { from: string; to: string }) {
  const { data, loading, error } = useApi(
    () => accountingApi.trialBalance({ from, to }),
    [from, to]
  );
  const d = data?.data;

  if (loading) return <Skeleton />;
  if (error || !d) return <Empty message="تعذر تحميل ميزان المراجعة" />;

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-[#eef2f6]">
        <div>
          <h2 className="font-bold text-gray-900">ميزان المراجعة</h2>
          <p className="text-xs text-gray-400 mt-0.5">{from} — {to}</p>
        </div>
        <BalancedBadge isBalanced={d.totals.isBalanced} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-[#eef2f6]">
              <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الكود</th>
              <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">اسم الحساب</th>
              <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">مدين</th>
              <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">دائن</th>
              <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {d.accounts.map((a: any) => (
              <tr key={a.id} className="border-b border-gray-50 hover:bg-[#f8fafc]/40 transition-colors">
                <td className="py-[6px] px-[10px] font-mono text-xs text-gray-500">{a.code}</td>
                <td className="py-[6px] px-[10px] text-gray-800">{a.name}</td>
                <td className="py-[6px] px-[10px] tabular-nums text-gray-700">{fmt(parseFloat(a.total_debit))}</td>
                <td className="py-[6px] px-[10px] tabular-nums text-gray-700">{fmt(parseFloat(a.total_credit))}</td>
                <td className={clsx("py-3 px-4 tabular-nums font-medium",
                  parseFloat(a.balance) >= 0 ? "text-gray-900" : "text-red-500")}>
                  {fmt(Math.abs(parseFloat(a.balance)))}
                  {parseFloat(a.balance) < 0 && " (د)"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold border-t-2 border-[#eef2f6]">
              <td className="py-[6px] px-[10px]" colSpan={2}>الإجمالي</td>
              <td className="py-[6px] px-[10px] tabular-nums">{fmt(d.totals.totalDebit)}</td>
              <td className="py-[6px] px-[10px] tabular-nums">{fmt(d.totals.totalCredit)}</td>
              <td className="py-[6px] px-[10px]" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// AGING REPORT (AR or AP)
// ────────────────────────────────────────────────────────────

const AGING_LABELS: Record<string, string> = {
  current: "جاري (0-30 يوم)",
  days30:  "31-60 يوم",
  days60:  "61-90 يوم",
  days90:  "91-120 يوم",
  over90:  "أكثر من 120 يوم",
};

const AGING_COLORS: Record<string, string> = {
  current: "bg-emerald-100 text-emerald-700",
  days30:  "bg-yellow-100 text-yellow-700",
  days60:  "bg-orange-100 text-orange-700",
  days90:  "bg-red-100 text-red-600",
  over90:  "bg-red-200 text-red-700",
};

function AgingReport({ type, asOf }: { type: "ar" | "ap"; asOf: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const fetcher = type === "ar"
    ? () => accountingApi.arAging({ asOf })
    : () => accountingApi.apAging({ asOf });
  const { data, loading, error } = useApi(fetcher, [asOf, type]);
  const d = data?.data;

  const totalKey = type === "ar" ? "totalAR" : "totalAP";
  const title    = type === "ar" ? "تقادم ذمم العملاء" : "تقادم ذمم الموردين";

  if (loading) return <Skeleton />;
  if (error || !d) return <Empty message={`تعذر تحميل ${title}`} />;

  const total = d[totalKey] ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
      <div className="p-5 border-b border-[#eef2f6]">
        <h2 className="font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">بتاريخ {asOf}</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 border-b border-[#eef2f6]">
        {Object.entries(AGING_LABELS).map(([key, label]) => {
          const amount = parseFloat(d.buckets?.[key] ?? "0");
          const pct    = total > 0 ? Math.round((amount / total) * 100) : 0;
          return (
            <div key={key}
              className="p-4 border-l border-[#eef2f6] last:border-0 cursor-pointer hover:bg-[#f8fafc]/50 transition-colors"
              onClick={() => setExpanded(expanded === key ? null : key)}>
              <p className="text-[11px] text-gray-400 mb-1">{label}</p>
              <p className="text-base font-bold tabular-nums text-gray-900">{fmt(amount)}</p>
              <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-full font-medium", AGING_COLORS[key])}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="px-5 py-3 border-b border-[#eef2f6] flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">الإجمالي</span>
        <span className="text-lg font-bold tabular-nums text-gray-900">{fmt(total)} ر.س</span>
      </div>

      {/* Expanded bucket details */}
      {expanded && d.bucketItems?.[expanded]?.length > 0 && (
        <div className="p-4 bg-gray-50/50">
          <p className="text-xs font-semibold text-gray-500 mb-3">{AGING_LABELS[expanded]}</p>
          <div className="space-y-2">
            {d.bucketItems[expanded].map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-[#eef2f6]">
                <div>
                  <p className="text-sm text-gray-800 font-medium">{item.description}</p>
                  <p className="text-xs text-gray-400">{item.entryNumber} · {fmtDate(item.date)} · {item.ageDays} يوم</p>
                </div>
                <span className="text-sm font-bold tabular-nums text-gray-900">{fmt(item.balance)} ر.س</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// CASH FLOW
// ────────────────────────────────────────────────────────────

function CashFlow({ from, to }: { from: string; to: string }) {
  const { data, loading, error } = useApi(
    () => accountingApi.cashFlow({ from, to }),
    [from, to]
  );
  const d = data?.data;

  if (loading) return <Skeleton />;
  if (error || !d) return <Empty message="تعذر تحميل قائمة التدفقات" />;

  const wc = d.operatingActivities.workingCapitalChanges ?? {};
  const wcLabels: Record<string, string> = {
    AR:               "(زيادة) نقص في ذمم العملاء",
    AP:               "زيادة (نقص) في ذمم الموردين",
    INVENTORY:        "(زيادة) نقص في المخزون",
    DEFERRED_REVENUE: "زيادة (نقص) في الإيراد المؤجل",
    ACCRUED_EXPENSES: "زيادة (نقص) في المصروفات المستحقة",
  };

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-gray-900">قائمة التدفقات النقدية</h2>
          <p className="text-xs text-gray-400 mt-0.5">{from} — {to} · الطريقة غير المباشرة</p>
        </div>
      </div>

      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">أنشطة التشغيل</p>
      <SectionRow label="صافي الدخل" amount={d.operatingActivities.netIncome} indent positive={d.operatingActivities.netIncome >= 0} />
      <SectionRow label="الإهلاك (غير نقدي)" amount={d.operatingActivities.addBack.depreciation} indent />

      {Object.entries(wc).map(([key, val]) => (
        <SectionRow key={key} label={wcLabels[key] ?? key} amount={val as number} indent positive={(val as number) >= 0} />
      ))}

      <div className="my-3 border-t border-dashed border-[#eef2f6]" />
      <SectionRow
        label="صافي التدفق النقدي من أنشطة التشغيل"
        amount={d.operatingActivities.netOperatingCashFlow}
        bold
        positive={d.operatingActivities.netOperatingCashFlow >= 0}
      />

      <p className="text-xs text-gray-400 mt-4 italic">{d.note}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Utility components
// ────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-6 space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-8 bg-[#f1f5f9] rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-12 text-center">
      <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────

export function FinancialStatementsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("income");
  const defaults = getDefaultRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo]     = useState(defaults.to);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">القوائم المالية</h1>
          <p className="text-sm text-gray-400 mt-0.5">مبنية من دفتر الأستاذ العام</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:border-brand-300 focus:outline-none" dir="ltr" />
          <span className="text-gray-400 text-sm">—</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:border-brand-300 focus:outline-none" dir="ltr" />
          <Button variant="secondary" icon={Download} className="shrink-0">تصدير</Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white rounded-2xl border border-[#eef2f6] p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0",
              activeTab === tab.id
                ? "bg-brand-500 text-white shadow-sm"
                : "text-gray-500 hover:bg-[#f8fafc]"
            )}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "income"   && <IncomeStatement from={from} to={to} />}
      {activeTab === "balance"  && <BalanceSheet asOf={to} />}
      {activeTab === "trial"    && <TrialBalance from={from} to={to} />}
      {activeTab === "aging_ar" && <AgingReport type="ar" asOf={to} />}
      {activeTab === "aging_ap" && <AgingReport type="ap" asOf={to} />}
      {activeTab === "cashflow" && <CashFlow from={from} to={to} />}
    </div>
  );
}
