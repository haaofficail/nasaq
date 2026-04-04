import { useState, useMemo } from "react";
import {
  Users, Phone, TrendingUp, Star, Clock, Search,
  X, ShoppingBag, AlertCircle, RefreshCw, ChevronRight,
  MessageCircle, Award,
} from "lucide-react";
import { clsx } from "clsx";
import { flowerIntelligenceApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { fmtMoney, fmtDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────

interface Customer {
  customer_phone: string;
  customer_name: string;
  order_count: number;
  total_spent: number;
  avg_order_value: number;
  last_order_at: string;
  first_order_at: string;
  favorite_order_type: string;
  avg_days_between_orders: number | null;
  days_since_last_order: number;
  is_due_return: boolean;
  customer_tier: "vip" | "regular" | "returning" | "new";
}

interface CustomerOrder {
  id: string;
  order_number: string;
  total: string | number;
  status: string;
  delivery_type: string;
  gift_message?: string;
  packaging?: string;
  created_at: string;
  items?: any[];
}

type FilterTab = "all" | "due_return" | "vip" | "active" | "dormant";

// ── Constants ─────────────────────────────────────────────────

const FILTER_TABS: { id: FilterTab; label: string; count?: (c: Customer[]) => number }[] = [
  { id: "all",        label: "الكل" },
  { id: "due_return", label: "مرشح للعودة",  count: (cs) => cs.filter(c => c.is_due_return).length },
  { id: "vip",        label: "VIP",           count: (cs) => cs.filter(c => c.customer_tier === "vip").length },
  { id: "active",     label: "نشط",           count: (cs) => cs.filter(c => c.days_since_last_order <= 60).length },
  { id: "dormant",    label: "خامل",          count: (cs) => cs.filter(c => c.days_since_last_order > 60).length },
];

const TIER_CONFIG = {
  vip:       { label: "VIP",    bg: "bg-violet-100 text-violet-700", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  regular:   { label: "منتظم", bg: "bg-blue-100 text-blue-700",     badge: "bg-blue-50 text-blue-700 border-blue-200" },
  returning: { label: "عائد",  bg: "bg-emerald-100 text-emerald-700", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  new:       { label: "جديد",  bg: "bg-gray-100 text-gray-600",     badge: "bg-gray-100 text-gray-600 border-gray-200" },
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  delivery: "توصيل", gift: "هدية", regular: "عادي", pickup: "استلام من المحل",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:          { label: "جديد",          cls: "bg-blue-50 text-blue-700" },
  confirmed:        { label: "مؤكد",          cls: "bg-sky-50 text-sky-700" },
  preparing:        { label: "قيد التجهيز",   cls: "bg-amber-50 text-amber-700" },
  ready:            { label: "جاهز",          cls: "bg-purple-50 text-purple-700" },
  out_for_delivery: { label: "في الطريق",     cls: "bg-orange-50 text-orange-700" },
  delivered:        { label: "مُسلَّم",       cls: "bg-green-50 text-green-700" },
  cancelled:        { label: "ملغي",          cls: "bg-red-50 text-red-500" },
};

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-50 animate-pulse">
      <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
      <div className="h-6 w-14 bg-gray-100 rounded-lg" />
    </div>
  );
}

// ── Customer Profile Drawer ───────────────────────────────────

function CustomerDrawer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const tier = TIER_CONFIG[customer.customer_tier] ?? TIER_CONFIG.new;

  const { data: ordersRes, loading: ordersLoading } = useApi(
    () => flowerIntelligenceApi.customerOrders(customer.customer_phone),
    [customer.customer_phone]
  );
  const orders: CustomerOrder[] = ordersRes?.data ?? [];

  const whatsappLink = `https://wa.me/966${customer.customer_phone.replace(/^0/, "")}`;

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">ملف العميل</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Customer identity */}
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0", tier.bg)}>
                {customer.customer_name.charAt(0) || "؟"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900 text-base">{customer.customer_name || "—"}</h3>
                  <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium border", tier.badge)}>
                    {tier.label}
                  </span>
                  {customer.is_due_return && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      مرشح للعودة
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm text-gray-500 tabular-nums" dir="ltr">{customer.customer_phone}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <a
                href={`tel:${customer.customer_phone}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-4 h-4" />
                اتصال
              </a>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                واتساب
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 px-5 py-4 border-b border-gray-100 gap-3">
            {[
              { label: "عدد الطلبات",    value: customer.order_count },
              { label: "إجمالي الإنفاق", value: fmtMoney(customer.total_spent) },
              { label: "متوسط الطلب",    value: fmtMoney(customer.avg_order_value) },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Activity info */}
          <div className="px-5 py-4 border-b border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">أول طلب</span>
              <span className="text-gray-700 font-medium">{fmtDate(customer.first_order_at)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">آخر طلب</span>
              <span className="text-gray-700 font-medium">
                {fmtDate(customer.last_order_at)}
                <span className="text-gray-400 font-normal mr-1">({customer.days_since_last_order} يوم)</span>
              </span>
            </div>
            {customer.avg_days_between_orders != null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">متوسط الشراء</span>
                <span className="text-gray-700 font-medium">كل {customer.avg_days_between_orders} يوم</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">نوع الطلب المفضل</span>
              <span className="text-gray-700 font-medium">{ORDER_TYPE_LABEL[customer.favorite_order_type] ?? customer.favorite_order_type}</span>
            </div>
          </div>

          {/* Order history */}
          <div className="px-5 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">سجل الطلبات</h4>
            {ordersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد طلبات</p>
            ) : (
              <div className="space-y-2 pb-6">
                {orders.map(o => {
                  const st = STATUS_CONFIG[o.status] ?? { label: o.status, cls: "bg-gray-100 text-gray-600" };
                  return (
                    <div key={o.id} className="bg-gray-50 rounded-xl p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-[#5b9bd5] font-semibold">{o.order_number}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(o.created_at)}</p>
                        {o.gift_message && (
                          <p className="text-xs text-gray-500 mt-1 italic truncate max-w-[200px]">{o.gift_message}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-sm font-bold text-gray-800">{Number(o.total).toLocaleString("en-US")} ر.س</span>
                        <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", st.cls)}>{st.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Customer Row ──────────────────────────────────────────────

function CustomerRow({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  const tier = TIER_CONFIG[customer.customer_tier] ?? TIER_CONFIG.new;
  const isDormant = customer.days_since_last_order > 60;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors text-right"
    >
      {/* Avatar */}
      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0", tier.bg, isDormant && "opacity-50")}>
        {customer.customer_name.charAt(0) || "؟"}
      </div>

      {/* Name + phone */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={clsx("text-sm font-semibold truncate", isDormant ? "text-gray-400" : "text-gray-900")}>
            {customer.customer_name || "—"}
          </p>
          <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium border shrink-0", tier.badge)}>
            {tier.label}
          </span>
          {customer.is_due_return && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium shrink-0">
              مرشح للعودة
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <Phone className="w-3 h-3 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 tabular-nums" dir="ltr">{customer.customer_phone}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-5 shrink-0">
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800 tabular-nums">{customer.order_count}</p>
          <p className="text-xs text-gray-400">طلب</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800 tabular-nums">{fmtMoney(customer.total_spent)}</p>
          <p className="text-xs text-gray-400">إجمالي</p>
        </div>
        <div className="text-center">
          <p className={clsx("text-sm font-bold tabular-nums", isDormant ? "text-red-400" : "text-gray-600")}>
            {customer.days_since_last_order} يوم
          </p>
          <p className="text-xs text-gray-400">آخر طلب</p>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export function FlowerCustomersPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  const { data: res, loading, error, refetch } = useApi(
    () => flowerIntelligenceApi.customersIntelligence(200),
    []
  );

  const customers: Customer[] = res?.data ?? [];
  const summary = res?.summary ?? { totalCustomers: 0, dueReturn: 0, vipCount: 0, dormantCount: 0, avgOrderValue: 0 };

  const filtered = useMemo(() => {
    let list = customers;
    // tab filter
    switch (activeTab) {
      case "due_return": list = list.filter(c => c.is_due_return); break;
      case "vip":        list = list.filter(c => c.customer_tier === "vip"); break;
      case "active":     list = list.filter(c => c.days_since_last_order <= 60); break;
      case "dormant":    list = list.filter(c => c.days_since_last_order > 60); break;
    }
    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.customer_name.toLowerCase().includes(q) ||
        c.customer_phone.includes(q)
      );
    }
    return list;
  }, [customers, activeTab, search]);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">عملاء الورود</h1>
          <p className="text-sm text-gray-400 mt-0.5">سجل كامل لكل عميل وتاريخ طلباته</p>
        </div>
        <button
          onClick={refetch}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:bg-gray-50 text-gray-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي العملاء",  value: loading ? "—" : summary.totalCustomers,  color: "text-gray-800",   icon: Users,     iconBg: "bg-blue-50 text-blue-500" },
          { label: "مرشح للعودة",     value: loading ? "—" : summary.dueReturn,       color: "text-amber-600",  icon: TrendingUp, iconBg: "bg-amber-50 text-amber-500" },
          { label: "عملاء VIP",       value: loading ? "—" : summary.vipCount,        color: "text-violet-600", icon: Award,     iconBg: "bg-violet-50 text-violet-500" },
          { label: "متوسط الطلب",     value: loading ? "—" : fmtMoney(summary.avgOrderValue), color: "text-[#5b9bd5]", icon: ShoppingBag, iconBg: "bg-blue-50 text-[#5b9bd5]" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-3", s.iconBg)}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Due-return alert */}
      {summary.dueReturn > 0 && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => setActiveTab("due_return")}
        >
          <TrendingUp className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">{summary.dueReturn} عميل مرشح للعودة اليوم</p>
            <p className="text-xs text-amber-600">تواصل معهم الآن لزيادة مبيعاتك</p>
          </div>
        </div>
      )}

      {/* Search + Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100">
        {/* Search */}
        <div className="px-4 pt-4 pb-0">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الجوال..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#5b9bd5] transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-gray-100 overflow-x-auto">
          {FILTER_TABS.map(tab => {
            const cnt = tab.count ? tab.count(customers) : null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5",
                  activeTab === tab.id
                    ? "border-[#5b9bd5] text-[#5b9bd5] bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                {tab.label}
                {cnt != null && cnt > 0 && (
                  <span className={clsx(
                    "text-xs rounded-full px-1.5 py-0.5 font-semibold",
                    activeTab === tab.id ? "bg-[#5b9bd5] text-white" : "bg-gray-100 text-gray-500"
                  )}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div>
          {loading ? (
            <div>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="w-10 h-10 text-red-300 mb-3" />
              <p className="text-sm font-semibold text-gray-700">حدث خطأ في تحميل البيانات</p>
              <p className="text-xs text-gray-400 mt-1">{error}</p>
              <button
                onClick={refetch}
                className="mt-3 px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700">لا يوجد عملاء بعد</p>
              <p className="text-xs text-gray-400 mt-1">ستظهر بيانات العملاء بعد أول طلب</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-gray-200 mb-3" />
              <p className="text-sm text-gray-500">لا توجد نتائج مطابقة</p>
              {search && (
                <button onClick={() => setSearch("")} className="mt-2 text-xs text-[#5b9bd5] hover:underline">
                  مسح البحث
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Column headers */}
              <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-b border-gray-50 bg-gray-50/40">
                <div className="w-10 shrink-0" />
                <div className="flex-1 text-xs font-medium text-gray-400">العميل</div>
                <div className="flex items-center gap-5 shrink-0 text-xs font-medium text-gray-400">
                  <span className="w-14 text-center">الطلبات</span>
                  <span className="w-20 text-center">إجمالي</span>
                  <span className="w-20 text-center">آخر طلب</span>
                </div>
                <div className="w-4 shrink-0" />
              </div>
              {filtered.map(c => (
                <CustomerRow key={c.customer_phone} customer={c} onClick={() => setSelected(c)} />
              ))}
              <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/40">
                <p className="text-xs text-gray-400 text-center">
                  {filtered.length} عميل
                  {filtered.length !== customers.length && ` من ${customers.length}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer drawer */}
      {selected && (
        <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

export default FlowerCustomersPage;
