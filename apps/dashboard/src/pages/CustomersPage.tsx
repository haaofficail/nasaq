import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Users, Building2, Star, Phone, Loader2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { customersApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { CreateCustomerForm } from "@/components/customers/CreateCustomerForm";
import { PageHeader, Button } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";

export function CustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: customersRes, loading, error, refetch } = useApi(() => customersApi.list(), []);
  const { data: statsRes } = useApi(() => customersApi.stats(), []);

  const customers = customersRes?.data || [];
  const stats = statsRes?.data || {};

  const filtered = customers.filter((c: any) => {
    if (search && !c.name?.includes(search) && !c.phone?.includes(search) && !c.companyName?.includes(search)) return false;
    return true;
  });

  const handleCreated = () => { setShowCreate(false); refetch(); };

  if (loading) return <PageSkeleton />;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-9 h-9 text-red-400" />
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="العملاء"
        description={`${customers.length} عميل`}
        actions={<Button icon={Plus} onClick={() => setShowCreate(true)}>عميل جديد</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي العملاء", value: stats.total || customers.length, color: "text-brand-600" },
          { label: "عملاء VIP", value: stats.vip || customers.filter((c: any) => c.isVip).length, color: "text-amber-600" },
          { label: "مؤسسات", value: stats.corporate || customers.filter((c: any) => c.type === "corporate").length, color: "text-violet-600" },
          { label: "جديد هذا الشهر", value: stats.newThisMonth || 0, color: "text-emerald-600" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الجوال..."
          className="w-full bg-white border border-gray-100 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">{search ? "لا توجد نتائج" : "لا يوجد عملاء بعد"}</h3>
          <p className="text-sm text-gray-400 mb-4">{search ? "جرب كلمات بحث مختلفة" : "أضف أول عميل"}</p>
          {!search && (
            <button onClick={() => setShowCreate(true)}
              className="bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4 inline ml-1" /> إضافة عميل
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold uppercase tracking-wide">العميل</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الجوال</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">النوع</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الحجوزات</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الإنفاق</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer: any) => (
                <tr
                  key={customer.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors"
                  onClick={() => navigate("/dashboard/customers/" + customer.id)}
                >
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        customer.isVip ? "bg-amber-100 text-amber-700" :
                        customer.type === "corporate" ? "bg-violet-100 text-violet-700" :
                        "bg-brand-50 text-brand-600"
                      )}>
                        {customer.type === "corporate" ? <Building2 className="w-4 h-4" /> : customer.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        {customer.companyName && <p className="text-xs text-gray-400">{customer.companyName}</p>}
                      </div>
                      {customer.isVip && <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 font-mono text-xs" dir="ltr">{customer.phone}</td>
                  <td className="py-3.5 px-4">
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      customer.type === "corporate" ? "bg-violet-50 text-violet-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {customer.type === "corporate" ? "مؤسسة" : "فرد"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 tabular-nums">{customer.totalBookings || 0}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-900 tabular-nums">
                    {Number(customer.totalSpent || 0).toLocaleString()} ر.س
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateCustomerForm open={true} onClose={() => setShowCreate(false)} onSuccess={handleCreated} />}

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
        <div className="space-y-3">
          {[
            { q: "هل يُضاف العميل تلقائياً؟", a: "نعم. عند أي حجز إلكتروني أو حجز جديد تُدخل فيه رقم الجوال، يُنشأ للعميل ملف تلقائياً ويُربط بكل حجوزاته." },
            { q: "ما الفرق بين عميل «فرد» وعميل «مؤسسة»؟", a: "الفرد حجوزاته شخصية. المؤسسة (Corporate) لها اسم شركة ورقم سجل تجاري وتُفوتر بشكل مختلف." },
            { q: "ما معنى «VIP»؟", a: "تصنيف تضعه يدوياً على عميل مميز للتمييز السريع. لا يمنح امتيازات تلقائية إلا إذا ربطته بقواعد خصم." },
            { q: "كيف أرى تاريخ عميل بالكامل؟", a: "افتح ملف العميل بالضغط على اسمه. ستجد كل حجوزاته ومدفوعاته وتقييماته في مكان واحد." },
            { q: "كيف أرسل رسالة تسويقية لمجموعة عملاء؟", a: "استخدم «الشرائح» من قسم النمو. صنّف عملاءك ثم أرسل لهم عرضاً مخصصاً أو رسالة متابعة." },
          ].map(faq => (
            <details key={faq.q} className="border border-gray-100 rounded-xl">
              <summary className="px-4 py-3 text-sm text-gray-700 cursor-pointer font-medium hover:bg-gray-50 rounded-xl">{faq.q}</summary>
              <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
