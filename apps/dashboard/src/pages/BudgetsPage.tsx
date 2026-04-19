import { useState } from "react";
import {
  Plus, AlertCircle, ChevronDown, ChevronUp, Edit2, CheckCircle2,
  Clock, Archive, Loader2, Trash2, TrendingUp, TrendingDown,
} from "lucide-react";
import { clsx } from "clsx";
import { accountingApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { SkeletonRows } from "@/components/ui/Skeleton";

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  draft:  { label: "مسودة", cls: "bg-gray-100 text-gray-600",   icon: Clock },
  active: { label: "نشطة",  cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
  closed: { label: "مغلقة", cls: "bg-blue-100 text-blue-700",   icon: Archive },
};

function fmt(n: any, currency = true) {
  const num = parseFloat(n);
  if (isNaN(num)) return "—";
  const str = num.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${str} ر.س` : str;
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function variance(budget: number, actual: number) {
  if (budget === 0) return null;
  const pct = ((actual - budget) / budget) * 100;
  return pct;
}

export function BudgetsPage() {
  const { data, loading, error, refetch } = useApi(() => accountingApi.budgets.list(), []);
  const budgets: any[] = (data as any)?.data ?? [];

  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<any | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", periodStart: "", periodEnd: "", notes: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { mutate: create, loading: creating } = useMutation(async (_: void) => {
    if (!form.name.trim() || !form.periodStart || !form.periodEnd) {
      setFormError("الاسم وتواريخ الفترة مطلوبة");
      return;
    }
    await accountingApi.budgets.create({ name: form.name, periodStart: form.periodStart, periodEnd: form.periodEnd, notes: form.notes || null });
    setShowModal(false);
    setForm({ name: "", periodStart: "", periodEnd: "", notes: "" });
    refetch();
  });

  const { mutate: activate, loading: activating } = useMutation(async (id: string) => {
    await accountingApi.budgets.activate(id);
    refetch();
  });

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); setExpandedData(null); return; }
    setExpanded(id);
    setExpandLoading(true);
    try {
      const res = await accountingApi.budgets.get(id);
      setExpandedData((res as any).data);
    } catch {
      setExpandedData(null);
    } finally {
      setExpandLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الموازنات التقديرية</h1>
          <p className="text-sm text-gray-500 mt-1">تتبع الإنفاق الفعلي مقابل المخطط</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
          <Plus size={16} />
          موازنة جديدة
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4"><SkeletonRows rows={3} /></div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6 flex items-center gap-3 text-red-700">
          <AlertCircle size={20} /><span>{error}</span>
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-12 text-center">
          <Archive className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-gray-500 font-medium">لا توجد موازنات بعد</p>
          <p className="text-gray-400 text-sm mt-1">أنشئ موازنة لتتبع الإنفاق مقابل الخطة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b: any) => {
            const st = STATUS[b.status] ?? STATUS.draft;
            const Icon = st.icon;
            const isOpen = expanded === b.id;
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{b.name}</h3>
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", st.cls)}>
                        <Icon size={11} />{st.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{fmtDate(b.period_start ?? b.periodStart)} — {fmtDate(b.period_end ?? b.periodEnd)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.status === "draft" && (
                      <button onClick={() => activate(b.id)} disabled={activating}
                        className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center gap-1">
                        {activating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        تفعيل
                      </button>
                    )}
                    <button onClick={() => toggleExpand(b.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-[#f8fafc] transition-colors">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded lines */}
                {isOpen && (
                  <div className="border-t border-[#eef2f6] p-4">
                    {expandLoading ? (
                      <SkeletonRows rows={3} />
                    ) : !expandedData?.lines?.length ? (
                      <p className="text-sm text-gray-400 text-center py-4">لا توجد سطور موازنة بعد</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="text-gray-500 border-b border-[#eef2f6]">
                          <tr>
                            <th className="pb-2 text-right font-medium">الشهر</th>
                            <th className="pb-2 text-right font-medium">الحساب</th>
                            <th className="pb-2 text-left font-medium">المخطط</th>
                            <th className="pb-2 text-left font-medium">الفعلي</th>
                            <th className="pb-2 text-left font-medium">الفرق</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {expandedData.lines.map((line: any) => {
                            const budget = parseFloat(line.budget_amount ?? line.budgetAmount ?? 0);
                            const actual = parseFloat(line.actual_amount ?? line.actualAmount ?? 0);
                            const pct = variance(budget, actual);
                            const over = pct !== null && pct > 0;
                            return (
                              <tr key={line.id}>
                                <td className="py-2 text-gray-600">{line.month?.slice(0, 7)}</td>
                                <td className="py-2 text-gray-600">{line.account_name ?? "—"}</td>
                                <td className="py-2 text-left font-mono text-gray-700">{fmt(budget)}</td>
                                <td className="py-2 text-left font-mono text-gray-700">{fmt(actual)}</td>
                                <td className="py-2 text-left">
                                  {pct !== null ? (
                                    <span className={clsx("flex items-center justify-end gap-1 text-xs font-medium", over ? "text-red-600" : "text-green-600")}>
                                      {over ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                      {Math.abs(pct).toFixed(1)}%
                                    </span>
                                  ) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" dir="rtl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">موازنة جديدة</h2>
            {formError && <p className="text-sm text-red-600 mb-3 bg-red-50 p-3 rounded-xl">{formError}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الموازنة</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: موازنة 2026"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">بداية الفترة</label>
                  <input type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))}
                    className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نهاية الفترة</label>
                  <input type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))}
                    className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => create(undefined as unknown as void)} disabled={creating}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {creating && <Loader2 size={14} className="animate-spin" />}
                إنشاء الموازنة
              </button>
              <button onClick={() => { setShowModal(false); setFormError(null); }}
                className="flex-1 py-2.5 border border-[#eef2f6] text-gray-700 rounded-xl text-sm font-medium hover:bg-[#f8fafc] transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetsPage;
