import { useState } from "react";
import { toast } from "@/hooks/useToast";
import { TrendingDown, Plus, Pencil, Trash2, RefreshCw, Receipt } from "lucide-react";
import { clsx } from "clsx";
import { confirmDialog } from "@/components/ui";
import { financeApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select } from "@/components/ui";

const CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  rent:        { label: "إيجار",     color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  salaries:    { label: "رواتب",     color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  equipment:   { label: "معدات",     color: "text-cyan-700",   bg: "bg-cyan-50 border-cyan-200" },
  transport:   { label: "نقل",       color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  maintenance: { label: "صيانة",     color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  marketing:   { label: "تسويق",     color: "text-pink-700",   bg: "bg-pink-50 border-pink-200" },
  utilities:   { label: "خدمات",     color: "text-teal-700",   bg: "bg-teal-50 border-teal-200" },
  supplies:    { label: "مستلزمات",  color: "text-lime-700",   bg: "bg-lime-50 border-lime-200" },
  other:       { label: "أخرى",      color: "text-gray-600",   bg: "bg-gray-100 border-[#eef2f6]" },
};

const EMPTY = {
  category: "other", subcategory: "", description: "", amount: "",
  expenseDate: new Date().toISOString().split("T")[0], receiptNumber: "", notes: "",
};

function fmt(n: any) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "2-digit", month: "short", year: "numeric" });
}

export function ExpensesPage() {
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [form, setForm]           = useState({ ...EMPTY });
  const [saving, setSaving]       = useState(false);

  const { data: res, loading, refetch } = useApi(
    () => financeApi.expenses(catFilter !== "all" ? { category: catFilter } : {}),
    [catFilter]
  );
  const { data: pnlRes } = useApi(() => financeApi.pnl("month"), []);

  const { mutate: createExp } = useMutation((d: any) => financeApi.createExpense(d));
  const { mutate: updateExp } = useMutation(({ id, d }: any) => financeApi.updateExpense(id, d));
  const { mutate: deleteExp } = useMutation((id: string) => financeApi.deleteExpense(id));

  const expenses: any[] = res?.data || [];
  const pnl = pnlRes?.data || {};

  const filtered = expenses.filter((e: any) => {
    if (search && !e.description?.toLowerCase().includes(search.toLowerCase()) &&
        !e.receiptNumber?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalMonth = filtered.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const byCategory = Object.entries(CATEGORIES)
    .map(([key, cfg]) => ({
      key, ...cfg,
      total: expenses.filter((e: any) => e.category === key).reduce((s: number, e: any) => s + Number(e.amount || 0), 0),
      count: expenses.filter((e: any) => e.category === key).length,
    }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.total - a.total);

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setShowModal(true); };
  const openEdit = (e: any) => {
    setEditing(e);
    setForm({
      category: e.category || "other",
      subcategory: e.subcategory || "",
      description: e.description || "",
      amount: String(e.amount || ""),
      expenseDate: e.expenseDate ? new Date(e.expenseDate).toISOString().split("T")[0] : EMPTY.expenseDate,
      receiptNumber: e.receiptNumber || "",
      notes: e.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      const payload = { ...form, expenseDate: new Date(form.expenseDate).toISOString() };
      if (editing) {
        await updateExp({ id: editing.id, d: payload });
        toast.success("تم تحديث المصروف");
      } else {
        await createExp(payload);
        toast.success("تم إضافة المصروف");
      }
      setShowModal(false);
      refetch();
    } catch { toast.error("فشل الحفظ"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: "حذف المصروف؟", message: "لا يمكن التراجع عن هذا الإجراء", danger: true, confirmLabel: "حذف" }))) return;
    try {
      await deleteExp(id);
      toast.success("تم الحذف");
      refetch();
    } catch { toast.error("فشل الحذف"); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" /> المصروفات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">تتبع وإدارة مصاريف المنشأة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refetch} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button icon={Plus} onClick={openCreate}>مصروف جديد</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي المصروفات",  value: `${fmt(totalMonth)} ر.س`,                                    color: "text-red-600",    bg: "bg-red-50" },
          { label: "عدد السجلات",        value: `${expenses.length} سجل`,                                    color: "text-brand-600",  bg: "bg-brand-50" },
          { label: "أعلى فئة إنفاقاً",  value: byCategory[0]?.label || "—",                                 color: "text-amber-700",  bg: "bg-amber-50" },
          { label: "صافي الربح (الشهر)", value: pnl.netProfit ? `${fmt(pnl.netProfit)} ر.س` : "—",          color: "text-emerald-600",bg: "bg-emerald-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.bg)}>
              <TrendingDown className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-lg font-bold tabular-nums truncate", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Category chips */}
      {byCategory.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">التوزيع حسب الفئة</h2>
          <div className="mb-3">
            <input
              type="text"
              placeholder="ابحث في المصروفات..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 text-sm border border-[#eef2f6] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCatFilter("all")}
              className={clsx("px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                catFilter === "all" ? "bg-brand-500 border-brand-500 text-white" : "border-[#eef2f6] text-gray-500 hover:bg-[#f8fafc]")}>
              الكل ({expenses.length})
            </button>
            {byCategory.map(c => (
              <button key={c.key}
                onClick={() => setCatFilter(catFilter === c.key ? "all" : c.key)}
                className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                  c.bg, catFilter === c.key ? "ring-2 ring-brand-400 ring-offset-1" : "hover:opacity-80")}>
                <span className={c.color}>{c.label}</span>
                <span className="text-gray-400">({c.count}) · {fmt(c.total)} ر.س</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        <div className="px-5 py-[6px] border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">سجل المصروفات</h2>
          <span className="text-xs text-gray-400">{filtered.length} سجل</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-48 bg-gray-100 rounded" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
                <div className="h-3.5 w-20 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 mb-1">{search ? "لا توجد نتائج" : "لا توجد مصروفات"}</p>
            <p className="text-xs text-gray-400 mb-4">{search ? "جرب كلمات بحث مختلفة" : "ابدأ بتسجيل مصاريف منشأتك لمتابعة تدفق الأموال"}</p>
            {!search && <Button icon={Plus} onClick={openCreate} size="sm">مصروف جديد</Button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/40">
                  <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">التاريخ</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الفئة</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الوصف</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden md:table-cell">رقم الإيصال</th>
                  <th className="text-left  py-3 px-5 text-xs text-gray-400 font-semibold">المبلغ</th>
                  <th className="py-[6px] px-[10px] w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e: any) => {
                  const cat = CATEGORIES[e.category] || CATEGORIES.other;
                  return (
                    <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/40 transition-colors">
                      <td className="py-[6px] px-5 text-xs text-gray-500 tabular-nums whitespace-nowrap">{fmtDate(e.expenseDate)}</td>
                      <td className="py-[6px] px-[10px]">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[11px] font-medium border", cat.bg, cat.color)}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="py-[6px] px-[10px]">
                        <p className="text-sm text-gray-900 font-medium">{e.description}</p>
                        {e.subcategory && <p className="text-xs text-gray-400 mt-0.5">{e.subcategory}</p>}
                      </td>
                      <td className="py-[6px] px-[10px] text-xs text-gray-400 font-mono hidden md:table-cell">{e.receiptNumber || "—"}</td>
                      <td className="py-[6px] px-5 text-left">
                        <span className="text-sm font-bold text-red-600 tabular-nums">{fmt(e.amount)}</span>
                        <span className="text-xs text-gray-400 mr-1">ر.س</span>
                      </td>
                      <td className="py-[6px] px-[10px]">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                            <Pencil className="w-3.5 h-3.5 text-brand-500" />
                          </button>
                          <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#eef2f6] bg-gray-50/40">
                  <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-gray-500">الإجمالي</td>
                  <td className="px-5 py-3 text-left">
                    <span className="text-sm font-bold text-red-600 tabular-nums">{fmt(totalMonth)}</span>
                    <span className="text-xs text-gray-400 mr-1">ر.س</span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editing ? "تعديل المصروف" : "إضافة مصروف جديد"} size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? "حفظ التعديلات" : "إضافة"}</Button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="الفئة *" name="category" value={form.category}
              onChange={e => f("category", e.target.value)}
              options={Object.entries(CATEGORIES).map(([k, v]) => ({ value: k, label: v.label }))} />
            <Input label="الفئة الفرعية" name="subcategory" value={form.subcategory}
              onChange={e => f("subcategory", e.target.value)} placeholder="اختياري" />
          </div>
          <Input label="الوصف *" name="description" value={form.description}
            onChange={e => f("description", e.target.value)} placeholder="مثال: إيجار قاعة يناير" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="المبلغ (ر.س) *" name="amount" value={form.amount}
              onChange={e => f("amount", e.target.value)} placeholder="0.00" dir="ltr" />
            <Input label="التاريخ *" name="expenseDate" type="date" value={form.expenseDate}
              onChange={e => f("expenseDate", e.target.value)} dir="ltr" />
          </div>
          <Input label="رقم الإيصال" name="receiptNumber" value={form.receiptNumber}
            onChange={e => f("receiptNumber", e.target.value)} placeholder="اختياري" dir="ltr" />
          <Input label="ملاحظات" name="notes" value={form.notes}
            onChange={e => f("notes", e.target.value)} placeholder="أي ملاحظات إضافية..." />
        </div>
      </Modal>    </div>
  );
}
