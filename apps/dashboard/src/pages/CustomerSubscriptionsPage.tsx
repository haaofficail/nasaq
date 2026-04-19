import { useState } from "react";
import { CreditCard, RefreshCw, XCircle, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { bundlesApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: "نشط",    color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused:    { label: "موقوف",  color: "bg-amber-50 text-amber-700 border-amber-200" },
  cancelled: { label: "ملغى",   color: "bg-red-50 text-red-600 border-red-200" },
  expired:   { label: "منتهي",  color: "bg-gray-100 text-gray-500 border-[#eef2f6]" },
};

const TABS = [
  { key: "", label: "الكل" },
  { key: "active", label: "نشط" },
  { key: "paused", label: "موقوف" },
  { key: "cancelled", label: "ملغى" },
];

export function CustomerSubscriptionsPage() {
  const [tab, setTab] = useState("");

  const { data: res, loading, refetch } = useApi(
    () => bundlesApi.subscriptions(tab ? { status: tab } : undefined),
    [tab]
  );
  const subs: any[] = res?.data || [];

  const { mutate: updateStatus } = useMutation(({ id, status }: any) =>
    bundlesApi.updateSubscriptionStatus(id, status)
  );

  const handleCancel = async (id: string) => {
    if (!confirm("هل تريد إلغاء هذا الاشتراك؟")) return;
    await updateStatus({ id, status: "cancelled" });
    toast.success("تم إلغاء الاشتراك");
    refetch();
  };

  const handleActivate = async (id: string) => {
    await updateStatus({ id, status: "active" });
    toast.success("تم تفعيل الاشتراك");
    refetch();
  };

  const activeSubs = subs.filter(s => s.status === "active");
  const totalRevenue = subs.reduce((acc, s) => acc + Number(s.price || 0), 0);

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand-500" /> اشتراكات العملاء
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">إدارة باقات واشتراكات العملاء المُفعّلة</p>
        </div>
        <button onClick={refetch}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-500 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <p className="text-2xl font-bold text-gray-900">{subs.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">إجمالي الاشتراكات</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <p className="text-2xl font-bold text-emerald-600">{activeSubs.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">اشتراكات نشطة</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <p className="text-2xl font-bold text-brand-600 tabular-nums">
            {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">إجمالي الإيرادات ر.س</p>
        </div>
      </div>

      {/* tabs + table */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        <div className="flex items-center border-b border-gray-50 px-5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={clsx("px-4 py-[6px] text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                tab === t.key ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700")}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8"><PageSkeleton /></div>
        ) : subs.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">لا توجد اشتراكات بعد</p>
            <p className="text-gray-300 text-xs mt-1">بِع باقة لأحد العملاء لتظهر هنا</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50">
                  {["العميل", "الجوال", "الاشتراك / الخدمة", "السعر", "الاستخدام", "تاريخ البدء", "تاريخ الفوترة", "الحالة", "الإجراءات"].map(h => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map((sub: any) => {
                  const st = STATUS_LABELS[sub.status] || STATUS_LABELS.active;
                  const usagePct = sub.max_usage > 0 ? Math.round((sub.current_usage / sub.max_usage) * 100) : 0;
                  return (
                    <tr key={sub.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/40 transition-colors">
                      <td className="px-[10px] py-[6px]">
                        <p className="font-medium text-gray-800">{sub.customer_name || "—"}</p>
                      </td>
                      <td className="px-[10px] py-[6px] text-xs text-gray-400" dir="ltr">{sub.customer_phone || "—"}</td>
                      <td className="px-[10px] py-[6px]">
                        <p className="font-medium text-gray-700 text-sm">{sub.name}</p>
                        {sub.service_name && sub.service_name !== sub.name && (
                          <p className="text-xs text-gray-400">{sub.service_name}</p>
                        )}
                      </td>
                      <td className="px-[10px] py-[6px] tabular-nums text-gray-700">
                        {sub.price ? `${Number(sub.price).toLocaleString()} ر.س` : "—"}
                      </td>
                      <td className="px-[10px] py-[6px]">
                        {sub.max_usage ? (
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs text-gray-600">{sub.current_usage}/{sub.max_usage}</span>
                            </div>
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={clsx("h-full rounded-full", usagePct >= 90 ? "bg-red-400" : usagePct >= 60 ? "bg-amber-400" : "bg-emerald-400")}
                                style={{ width: `${usagePct}%` }} />
                            </div>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-[10px] py-[6px] text-xs text-gray-400 whitespace-nowrap">
                        {sub.start_date ? fmtDate(sub.start_date) : "—"}
                      </td>
                      <td className="px-[10px] py-[6px] text-xs text-gray-400 whitespace-nowrap">
                        {sub.next_billing_date ? fmtDate(sub.next_billing_date) : "—"}
                      </td>
                      <td className="px-[10px] py-[6px]">
                        <span className={clsx("text-[11px] px-2 py-0.5 rounded-full font-medium border", st.color)}>{st.label}</span>
                      </td>
                      <td className="px-[10px] py-[6px]">
                        <div className="flex items-center gap-1">
                          {sub.status === "active" && (
                            <button onClick={() => handleCancel(sub.id)} title="إلغاء"
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          )}
                          {(sub.status === "cancelled" || sub.status === "paused") && (
                            <button onClick={() => handleActivate(sub.id)} title="تفعيل"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            </button>
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
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
        <div className="space-y-3">
          {[
            { q: "ما المقصود بـ «الاستخدام» في الاشتراك؟", a: "يعني عدد المرات التي استفاد فيها العميل من الباقة مقارنةً بالحد الأقصى المتاح. مثلاً: 3/10 يعني استُخدمت 3 جلسات من أصل 10." },
            { q: "ماذا يحدث عند إلغاء الاشتراك؟", a: "يُوقف الاشتراك فوراً ولا يمكن للعميل استكمال الجلسات المتبقية. يمكنك إعادة تفعيله لاحقاً إن أردت." },
            { q: "كيف أضيف اشتراكاً جديداً لعميل؟", a: "ابتع باقة من قسم «الباقات» أو من ملف العميل مباشرة، وستظهر الاشتراكات هنا تلقائياً." },
            { q: "ما «تاريخ الفوترة التالي»؟", a: "هو الموعد المجدول للتجديد التلقائي أو إشعار العميل بانتهاء اشتراكه." },
          ].map(faq => (
            <details key={faq.q} className="border border-[#eef2f6] rounded-xl">
              <summary className="px-[10px] py-[6px] text-sm text-gray-700 cursor-pointer font-medium hover:bg-[#f8fafc] rounded-xl">{faq.q}</summary>
              <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
