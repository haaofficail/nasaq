import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Users, Building2, Star, Phone, Loader2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { customersApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { CreateCustomerForm } from "@/components/customers/CreateCustomerForm";
import { PageHeader, Button } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useBusiness } from "@/hooks/useBusiness";

const TIER_META: Record<string, { label: string; class: string }> = {
  regular:    { label: "عادي",   class: "bg-gray-100 text-gray-500" },
  vip:        { label: "VIP",    class: "bg-amber-50 text-amber-600" },
  enterprise: { label: "مؤسسة", class: "bg-violet-50 text-violet-600" },
};

// Compute lifecycle segment for a customer based on last_booking_at + total_bookings
function getSegment(c: any): "active" | "due" | "dormant" | "new" {
  const last = c.lastBookingAt ? new Date(c.lastBookingAt) : null;
  const daysSince = last ? (Date.now() - last.getTime()) / 86_400_000 : Infinity;
  if (!last || c.totalBookings === 0) return "new";
  if (daysSince <= 30) return "active";
  if (daysSince <= 90) return "due";
  return "dormant";
}

const SEGMENT_META: Record<string, { label: string; class: string }> = {
  active:  { label: "نشط",              class: "bg-emerald-50 text-emerald-600" },
  due:     { label: "مرشح للعودة",       class: "bg-amber-50 text-amber-600" },
  dormant: { label: "خامل",             class: "bg-red-50 text-red-400" },
  new:     { label: "جديد",             class: "bg-blue-50 text-blue-500" },
};

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
  if (diff < 1)  return "اليوم";
  if (diff < 7)  return `${Math.floor(diff)} يوم`;
  if (diff < 30) return `${Math.floor(diff / 7)} أسبوع`;
  if (diff < 365) return `${Math.floor(diff / 30)} شهر`;
  return `${Math.floor(diff / 365)} سنة`;
}

export function CustomersPage() {
  const navigate = useNavigate();
  const biz = useBusiness();
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const { data: customersRes, loading, error, refetch } = useApi(() => customersApi.list(), []);
  const { data: statsRes } = useApi(() => customersApi.stats(), []);

  const customers = customersRes?.data || [];
  const stats = statsRes?.data || {};

  // Segment counts
  const segmentCounts = {
    due:     customers.filter((c: any) => getSegment(c) === "due").length,
    vip:     customers.filter((c: any) => c.tier === "vip").length,
    active:  customers.filter((c: any) => getSegment(c) === "active").length,
    dormant: customers.filter((c: any) => getSegment(c) === "dormant").length,
  };

  const filtered = customers.filter((c: any) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name?.toLowerCase().includes(q) && !c.phone?.includes(search) && !c.companyName?.toLowerCase().includes(q)) return false;
    }
    if (segmentFilter === "vip")     return c.tier === "vip";
    if (segmentFilter === "due")     return getSegment(c) === "due";
    if (segmentFilter === "active")  return getSegment(c) === "active";
    if (segmentFilter === "dormant") return getSegment(c) === "dormant";
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
        title={biz.terminology.clients}
        description={`${customers.length} ${biz.terminology.client}`}
        actions={<Button icon={Plus} onClick={() => setShowCreate(true)}>{biz.terminology.newClient}</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي " + biz.terminology.clients, value: stats.total || customers.length, color: "text-brand-600" },
          { label: "عملاء VIP", value: stats.vip || customers.filter((c: any) => c.tier === "vip").length, color: "text-amber-600" },
          { label: "مؤسسات", value: stats.enterprise || customers.filter((c: any) => c.type === "business").length, color: "text-violet-600" },
          { label: "جديد هذا الشهر", value: stats.newThisMonth || 0, color: "text-emerald-600" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Segment filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الجوال..."
            className="w-full bg-white border border-gray-100 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([
            { value: "all",     label: "الكل",          count: null },
            { value: "due",     label: "مرشح للعودة",   count: segmentCounts.due },
            { value: "vip",     label: "VIP",            count: segmentCounts.vip },
            { value: "active",  label: "نشط",            count: segmentCounts.active },
            { value: "dormant", label: "خامل",           count: segmentCounts.dormant },
          ] as const).map(f => (
            <button
              key={f.value}
              onClick={() => setSegmentFilter(f.value)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                segmentFilter === f.value
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50"
              )}
            >
              {f.label}
              {f.count !== null && f.count > 0 && (
                <span className={clsx(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  segmentFilter === f.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                )}>{f.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">{search ? "لا توجد نتائج" : biz.terminology.clientEmpty}</h3>
          <p className="text-sm text-gray-400 mb-4">{search ? "جرب كلمات بحث مختلفة" : "أضف " + biz.terminology.client + " جديد"}</p>
          {!search && (
            <button onClick={() => setShowCreate(true)}
              className="bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4 inline ml-1" /> {biz.terminology.newClient}
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
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الطلبات</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">إجمالي</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">آخر طلب</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer: any) => {
                const tier = TIER_META[customer.tier] || TIER_META.regular;
                const isVip = customer.tier === "vip";
                const isBusiness = customer.type === "business";
                const segment = SEGMENT_META[getSegment(customer)];
                const tags: string[] = customer.tags || [];
                return (
                  <tr
                    key={customer.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors"
                    onClick={() => navigate("/dashboard/customers/" + customer.id)}
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                          isVip ? "bg-amber-100 text-amber-700" :
                          isBusiness ? "bg-violet-100 text-violet-700" :
                          "bg-brand-50 text-brand-600"
                        )}>
                          {isBusiness ? <Building2 className="w-4 h-4" /> : customer.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-gray-900 truncate max-w-[140px]">{customer.name}</p>
                            {isVip && <Star className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" />}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-medium", tier.class)}>{tier.label}</span>
                            <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-medium", segment.class)}>{segment.label}</span>
                            {tags.slice(0, 2).map(t => (
                              <span key={t} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 text-[10px]">{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-xs" dir="ltr">
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="hover:text-brand-600 transition-colors" onClick={e => e.stopPropagation()}>{customer.phone}</a>
                      ) : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 tabular-nums font-medium">{customer.totalBookings || 0}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900 tabular-nums">
                      {Number(customer.totalSpent || 0).toLocaleString()} ر.س
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-xs tabular-nums">
                      {relativeTime(customer.lastBookingAt)}
                    </td>
                  </tr>
                );
              })}
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
