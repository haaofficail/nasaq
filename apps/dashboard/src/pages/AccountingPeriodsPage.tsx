import { useState } from "react";
import { Plus, Lock, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { accountingApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { SkeletonRows } from "@/components/ui/Skeleton";

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  open:   { label: "مفتوحة",  cls: "bg-green-50 text-green-700",  icon: Clock },
  closed: { label: "مغلقة",  cls: "bg-yellow-50 text-yellow-700", icon: CheckCircle2 },
  locked: { label: "مقفلة",  cls: "bg-red-50 text-red-600",       icon: Lock },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

export function AccountingPeriodsPage() {
  const { data, loading, error, refetch } = useApi(() => accountingApi.periods(), []);
  const periods: any[] = (data as any)?.data ?? [];

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { mutate: create, loading: creating } = useMutation(async (_: void) => {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      setFormError("جميع الحقول مطلوبة");
      return;
    }
    await accountingApi.createPeriod({ name: form.name, startDate: form.startDate, endDate: form.endDate });
    setShowModal(false);
    setForm({ name: "", startDate: "", endDate: "" });
    refetch();
  });

  const { mutate: closePeriod, loading: closing } = useMutation(async (id: string) => {
    await accountingApi.closePeriod(id);
    refetch();
  });

  const { mutate: lockPeriod, loading: locking } = useMutation(async (id: string) => {
    if (!confirm("هل أنت متأكد من قفل هذه الفترة؟ لا يمكن التراجع عن القفل.")) return;
    await accountingApi.lockPeriod(id);
    refetch();
  });

  const { mutate: generateClosing, loading: generating } = useMutation(async (id: string) => {
    await accountingApi.generateClosingEntries(id);
    refetch();
  });

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الفترات المحاسبية</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة الفترات المحاسبية وقفلها</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#5b9bd5] text-white rounded-xl text-sm font-medium hover:bg-[#4a8ac4] transition-colors">
          <Plus size={16} />
          فترة جديدة
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-4"><SkeletonRows rows={4} /></div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6 flex items-center gap-3 text-red-700">
          <AlertCircle size={20} /><span>{error}</span>
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Clock className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-gray-500 font-medium">لا توجد فترات محاسبية</p>
          <p className="text-gray-400 text-sm mt-1">أنشئ فترة محاسبية للبدء في تسجيل القيود</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">الاسم</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">من</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">إلى</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">الحالة</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {periods.map((p: any) => {
                const st = STATUS[p.status] ?? STATUS.open;
                const Icon = st.icon;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{fmt(p.start_date ?? p.startDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmt(p.end_date ?? p.endDate)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", st.cls)}>
                        <Icon size={12} />{st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.status === "open" && (
                          <>
                            <button onClick={() => generateClosing(p.id)} disabled={generating}
                              className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50">
                              {generating ? <Loader2 size={12} className="animate-spin" /> : "قيود الإقفال"}
                            </button>
                            <button onClick={() => closePeriod(p.id)} disabled={closing}
                              className="px-3 py-1.5 text-xs bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-50">
                              {closing ? <Loader2 size={12} className="animate-spin" /> : "إغلاق"}
                            </button>
                          </>
                        )}
                        {p.status === "closed" && (
                          <button onClick={() => lockPeriod(p.id)} disabled={locking}
                            className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                            {locking ? <Loader2 size={12} className="animate-spin" /> : "قفل نهائي"}
                          </button>
                        )}
                        {p.status === "locked" && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Lock size={12} />مقفلة
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" dir="rtl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">فترة محاسبية جديدة</h2>
            {formError && <p className="text-sm text-red-600 mb-3 bg-red-50 p-3 rounded-xl">{formError}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفترة</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: الربع الأول 2026"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/20 focus:border-[#5b9bd5]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/20 focus:border-[#5b9bd5]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5]/20 focus:border-[#5b9bd5]" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { create(undefined as unknown as void); }} disabled={creating}
                className="flex-1 py-2.5 bg-[#5b9bd5] text-white rounded-xl text-sm font-medium hover:bg-[#4a8ac4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {creating && <Loader2 size={14} className="animate-spin" />}
                إنشاء الفترة
              </button>
              <button onClick={() => { setShowModal(false); setFormError(null); }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountingPeriodsPage;
