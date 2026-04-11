import { useState } from "react";
import { toast } from "@/hooks/useToast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Banknote, FileText, TrendingUp, TrendingDown, Plus, Download, Loader2, Landmark, BookOpen, BookOpenCheck, BarChart2, GitMerge, ArrowLeft, Building2, Users, CalendarCheck, Layers, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import { financeApi, settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select, TextArea, PageHeader } from "@/components/ui";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { fmtDate } from "@/lib/utils";

export function FinancePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "invoices";
  const tabIndex: Record<string, number> = { invoices: 0, expenses: 1, pnl: 2 };
  const activeTab = tabIndex[tabParam] ?? 0;
  const setActiveTab = (i: number) => {
    const keys = ["invoices", "expenses", "pnl"];
    setSearchParams({ tab: keys[i] || "invoices" });
  };
  const [showExpense, setShowExpense] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "", date: new Date().toISOString().split("T")[0] });

  const { data: invoicesRes, loading: invLoading } = useApi(() => financeApi.invoices(), []);
  const { data: expensesRes, loading: expLoading } = useApi(() => financeApi.expenses(), []);
  const { data: pnlRes } = useApi(() => financeApi.pnl(), []);
  const { data: customListsRes } = useApi(() => settingsApi.customLists(), []);
  const { mutate: createExpense, loading: creating } = useMutation((data: any) => financeApi.createExpense(data));

  const defaultExpenseCategories = ["رواتب", "إيجار", "مشتريات", "مواصلات", "تسويق", "صيانة", "أخرى"];
  const expenseCategoryList: string[] = customListsRes?.data?.expenseCategories || defaultExpenseCategories;
  const expenseCategoryOptions = expenseCategoryList.map((c: string) => ({ value: c, label: c }));

  const invoices = invoicesRes?.data || [];
  const expenses = expensesRes?.data || [];
  const pnl = pnlRes?.data || {};
  const loading = invLoading || expLoading;

  const totalRevenue = invoices.reduce((s: number, i: any) => s + Number(i.totalAmount || 0), 0);
  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const tabs = ["الفواتير", "المصروفات", "الأرباح والخسائر"];

  const handleCreateExpense = async () => {
    await createExpense(expenseForm);
    setShowExpense(false);
    setExpenseForm({ description: "", amount: "", category: "", date: new Date().toISOString().split("T")[0] });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="المالية"
        description="الفواتير والمصروفات والأرباح والخسائر"
        tabs={[
          { id: "invoices", label: "الفواتير",            count: invoices.length },
          { id: "expenses", label: "المصروفات",           count: expenses.length },
          { id: "pnl",      label: "الأرباح والخسائر" },
        ]}
        activeTab={tabParam}
        onTabChange={(id) => setSearchParams({ tab: id })}
        actions={
          <div className="flex gap-2">
            <Button icon={Plus} onClick={() => setShowInvoice(true)}>فاتورة جديدة</Button>
            <Button variant="secondary" icon={Plus} onClick={() => setShowExpense(true)}>مصروف جديد</Button>
            <Button variant="secondary" icon={Download} onClick={() => toast.info?.("التصدير قيد التطوير")}>تصدير</Button>
          </div>
        }
      />

      {/* Finance module quick-links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "الخزينة",        desc: "إيصالات، سندات صرف، ورديات الكاشير",  icon: Landmark,      href: "/dashboard/treasury",              bg: "bg-blue-50",    iconColor: "text-blue-500" },
          { label: "المحاسبة",       desc: "دليل الحسابات وقيود اليومية",          icon: BookOpen,      href: "/dashboard/accounting",            bg: "bg-violet-50",  iconColor: "text-violet-500" },
          { label: "قيود اليومية",   desc: "عرض وترحيل القيود المحاسبية",          icon: BookOpenCheck, href: "/dashboard/accounting/journal-entries", bg: "bg-emerald-50", iconColor: "text-emerald-600" },
          { label: "القوائم المالية", desc: "قائمة الدخل، الميزانية، ميزان المراجعة", icon: BarChart2,   href: "/dashboard/financial-statements",  bg: "bg-amber-50",   iconColor: "text-amber-600" },
          { label: "التسويات",       desc: "تسوية بنكية، نقدية، ذمم عملاء وموردين", icon: GitMerge,    href: "/dashboard/reconciliation",        bg: "bg-rose-50",    iconColor: "text-rose-500" },
          { label: "الأصول الثابتة", desc: "سجل الأصول والاستهلاك الشهري",          icon: Building2,    href: "/dashboard/accounting/fixed-assets",  bg: "bg-orange-50",  iconColor: "text-orange-500" },
          { label: "الموردون",        desc: "سجل الموردين وكشف الحسابات",           icon: Users,        href: "/dashboard/accounting/vendors",      bg: "bg-teal-50",    iconColor: "text-teal-600" },
          { label: "الفترات المحاسبية", desc: "إدارة الفترات وإقفال الحسابات",     icon: CalendarCheck, href: "/dashboard/accounting/periods",     bg: "bg-indigo-50",  iconColor: "text-indigo-500" },
          { label: "مراكز التكلفة",  desc: "توزيع التكاليف على الأقسام والمشاريع", icon: Layers,        href: "/dashboard/accounting/cost-centers", bg: "bg-rose-50",    iconColor: "text-rose-500" },
          { label: "الموازنات",       desc: "الموازنة التقديرية ومقارنتها بالفعلي", icon: BarChart2,     href: "/dashboard/accounting/budgets",      bg: "bg-cyan-50",    iconColor: "text-cyan-600" },
        ].map((m) => (
          <button
            key={m.href}
            onClick={() => navigate(m.href)}
            className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:border-brand-200 hover:shadow-sm transition-all text-right group"
          >
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", m.bg)}>
              <m.icon className={clsx("w-5 h-5", m.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{m.label}</p>
              <p className="text-xs text-gray-400 truncate">{m.desc}</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors shrink-0" />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "الإيرادات", value: `${totalRevenue.toLocaleString()} ر.س`, color: "text-emerald-600" },
          { label: "المصروفات", value: `${totalExpenses.toLocaleString()} ر.س`, color: "text-red-500" },
          { label: "صافي الربح", value: `${(totalRevenue - totalExpenses).toLocaleString()} ر.س`, color: totalRevenue - totalExpenses >= 0 ? "text-brand-600" : "text-red-500" },
          { label: "الفواتير", value: invoices.length, color: "text-gray-900" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* tab switcher removed — PageHeader handles it */}

      {activeTab === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-sm font-semibold text-gray-700">آخر الفواتير</p>
            <Link to="/dashboard/invoices" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
              إدارة الفواتير <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {invoices.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد فواتير</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">رقم الفاتورة</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">العميل</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">المبلغ</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">التاريخ</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => {
                  const isPaid = inv.status === "paid";
                  const isPartial = inv.status === "partially_paid";
                  const statusLabel = isPaid ? "مدفوعة" : isPartial ? "جزئي" : inv.status === "overdue" ? "متأخرة" : inv.status === "cancelled" ? "ملغاة" : "بانتظار الدفع";
                  const statusCls = isPaid ? "bg-emerald-50 text-emerald-600" : isPartial ? "bg-teal-50 text-teal-600" : inv.status === "overdue" ? "bg-red-50 text-red-500" : inv.status === "cancelled" ? "bg-gray-100 text-gray-400" : "bg-amber-50 text-amber-600";
                  return (
                    <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <Link to={`/dashboard/invoices/${inv.id}`} className="font-mono text-xs font-semibold text-brand-600 hover:underline">
                          {inv.invoiceNumber || inv.id?.substring(0, 8)}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-700">{inv.buyerName || inv.customerName || "—"}</td>
                      <td className="py-3.5 px-4 font-bold tabular-nums text-sm">{Number(inv.totalAmount || 0).toLocaleString()} ر.س</td>
                      <td className="py-3.5 px-4">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-medium", statusCls)}>{statusLabel}</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 text-xs whitespace-nowrap">
                        {inv.issueDate ? fmtDate(inv.issueDate) : inv.createdAt ? fmtDate(inv.createdAt) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <Link to={`/dashboard/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline">
                          عرض <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {expenses.length === 0 ? (
            <div className="p-10 text-center">
              <TrendingDown className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد مصروفات</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold uppercase tracking-wide">الوصف</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الفئة</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">المبلغ</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp: any) => (
                  <tr key={exp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-gray-900">{exp.description}</td>
                    <td className="py-3.5 px-4 text-gray-500 text-xs">{exp.category}</td>
                    <td className="py-3.5 px-4 font-bold text-red-500 tabular-nums">{Number(exp.amount || 0).toLocaleString()} ر.س</td>
                    <td className="py-3.5 px-4 text-gray-400 text-xs">
                      {exp.date ? fmtDate(exp.date) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 2 && (() => {
        const revenue   = totalRevenue;
        const expenses  = totalExpenses;
        const netProfit = revenue - expenses;
        const SAR = (v: number) => `${v.toLocaleString()} ر.س`;
        return (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-5">تقرير الأرباح والخسائر</h2>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-sm text-gray-600 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" />إجمالي الإيرادات</span>
                <span className="font-bold text-emerald-600 tabular-nums">{SAR(revenue)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-sm text-gray-600 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" />إجمالي المصروفات</span>
                <span className="font-bold text-red-500 tabular-nums">({SAR(expenses)})</span>
              </div>
            </div>
            <div className="space-y-3 mt-4">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>الإيرادات</span>
                  <span>{SAR(revenue)}</span>
                </div>
                <div className="h-3 bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: revenue > 0 ? "100%" : "0%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>المصروفات</span>
                  <span>{SAR(expenses)}</span>
                </div>
                <div className="h-3 bg-red-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: revenue > 0 ? `${Math.min(100, (expenses / revenue) * 100)}%` : "0%" }} />
                </div>
              </div>
              <div className={clsx("text-center p-3 rounded-xl", netProfit >= 0 ? "bg-emerald-50" : "bg-red-50")}>
                <div className="text-xs text-gray-500">صافي الربح</div>
                <div className={clsx("text-xl font-bold tabular-nums", netProfit >= 0 ? "text-emerald-700" : "text-red-600")}>{SAR(netProfit)}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
        <div className="space-y-3">
          {[
            { q: "ما الفرق بين «الفاتورة» و«المصروف»؟", a: "الفاتورة مبلغ تحصله من عميلك مقابل خدمة أو منتج (إيراد). المصروف مبلغ تدفعه أنت كتكلفة تشغيلية مثل الإيجار والرواتب والمشتريات." },
            { q: "متى تُعتبر الفاتورة «مدفوعة»؟", a: "عندما يُسجّل دفعة كاملة لها في النظام. الفواتير الجزئية تظهر كـ «معلقة» حتى تكتمل الدفعة." },
            { q: "ما «صافي الربح» وكيف يُحسب؟", a: "إجمالي الإيرادات (الفواتير) ناقص إجمالي المصروفات المسجّلة في نفس الفترة. لدقة أكبر استخدم التقارير المالية المفصّلة." },
            { q: "ما الفرق بين «المالية» هنا و«التقارير»؟", a: "هذه الصفحة للإدارة اليومية (إنشاء فواتير، تسجيل مصروفات). صفحة التقارير للتحليل والمقارنة بالفترات والتصدير." },
            { q: "ما «قيود اليومية» وما «التسويات»؟", a: "قيود اليومية هي التسجيل المحاسبي التفصيلي لكل حركة مالية. التسويات لمطابقة أرصدة البنك أو العملاء مع السجلات." },
          ].map(faq => (
            <details key={faq.q} className="border border-gray-100 rounded-xl">
              <summary className="px-4 py-3 text-sm text-gray-700 cursor-pointer font-medium hover:bg-gray-50 rounded-xl">{faq.q}</summary>
              <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      <CreateInvoiceModal
        open={showInvoice}
        onClose={() => setShowInvoice(false)}
        onSuccess={() => setShowInvoice(false)}
      />

      <Modal open={showExpense} onClose={() => setShowExpense(false)} title="مصروف جديد" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowExpense(false)}>إلغاء</Button><Button onClick={handleCreateExpense} loading={creating}>حفظ</Button></>}>
        <div className="space-y-4">
          <Input label="الوصف" name="desc" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} required />
          <Input label="المبلغ" name="amount" type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} suffix="ر.س" dir="ltr" required />
          <Select label="الفئة" name="cat" value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))} options={expenseCategoryOptions} />
          <Input label="التاريخ" name="date" type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} dir="ltr" />
        </div>
      </Modal>
    </div>
  );
}
