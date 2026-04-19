import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight, Phone, MessageCircle, ShoppingBag, TrendingUp,
  Clock, Star, Package, AlertCircle, ChevronLeft, Calendar,
  Repeat, Heart, Receipt, BarChart3, Tag, Edit2, Check, X as XIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { flowerIntelligenceApi, customersApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { fmtMoney, fmtDate } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/Skeleton";

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
  items?: { name: string; qty: number; price: number }[];
}

// ── Constants ─────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { label: string; bg: string; badge: string }> = {
  vip:       { label: "VIP",   bg: "bg-violet-100 text-violet-700", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  regular:   { label: "منتظم", bg: "bg-blue-100 text-blue-700",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  returning: { label: "عائد",  bg: "bg-emerald-100 text-emerald-700", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  new:       { label: "جديد",  bg: "bg-gray-100 text-gray-600",    badge: "bg-gray-100 text-gray-600 border-[#eef2f6]" },
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  delivery: "توصيل", gift: "هدية", regular: "عادي", pickup: "استلام من المحل",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:          { label: "جديد",        cls: "bg-blue-50 text-blue-700" },
  confirmed:        { label: "مؤكد",        cls: "bg-sky-50 text-sky-700" },
  preparing:        { label: "قيد التجهيز", cls: "bg-amber-50 text-amber-700" },
  ready:            { label: "جاهز",        cls: "bg-purple-50 text-purple-700" },
  out_for_delivery: { label: "في الطريق",   cls: "bg-orange-50 text-orange-700" },
  delivered:        { label: "مُسلَّم",     cls: "bg-green-50 text-green-700" },
  cancelled:        { label: "ملغي",        cls: "bg-red-50 text-red-500" },
};

const PAID_STATUSES = ["delivered", "confirmed", "ready", "out_for_delivery"];

const TABS = [
  { key: "overview",  label: "نظرة عامة",  icon: TrendingUp },
  { key: "orders",    label: "الطلبات",    icon: Package },
  { key: "invoices",  label: "الفواتير",   icon: Receipt },
  { key: "purchases", label: "المشتريات",  icon: BarChart3 },
];

// ── Component ─────────────────────────────────────────────────

export function FlowerCustomerDetailPage() {
  const { phone } = useParams<{ phone: string }>();
  const decodedPhone = decodeURIComponent(phone ?? "");
  const [tab, setTab] = useState("overview");
  const [editingTag, setEditingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [localTags, setLocalTags] = useState<string[] | null>(null);

  const { data: listRes, loading: listLoading, error: listError } = useApi(
    () => flowerIntelligenceApi.customersIntelligence(500),
    []
  );
  const { data: ordersRes, loading: ordersLoading } = useApi(
    () => flowerIntelligenceApi.customerOrders(decodedPhone),
    [decodedPhone]
  );
  // Load regular customer record to get ID, tier, tags
  const { data: regularRes } = useApi(
    () => customersApi.list(),
    []
  );

  const customers: Customer[] = listRes?.data ?? [];
  const customer = customers.find(c => c.customer_phone === decodedPhone);
  const orders: CustomerOrder[] = ordersRes?.data ?? [];

  // Find matching regular customer record by phone
  const regularCustomers: any[] = regularRes?.data ?? [];
  const regularCustomer = regularCustomers.find((c: any) => c.phone === decodedPhone);
  const displayTags: string[] = localTags ?? regularCustomer?.tags ?? [];

  const whatsappLink = `https://wa.me/966${decodedPhone.replace(/^0/, "")}`;

  if (listLoading) return <PageSkeleton />;

  if (listError || !customer) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-10 h-10 text-red-300" />
      <p className="text-sm text-red-500">لم يتم العثور على العميل</p>
      <Link to="/dashboard/flower-customers" className="text-sm text-brand-500 hover:underline">
        العودة لقائمة العملاء
      </Link>
    </div>
  );

  const tier = TIER_CONFIG[customer.customer_tier] ?? TIER_CONFIG.new;

  const monthsSince = Math.max(1,
    (new Date().getTime() - new Date(customer.first_order_at).getTime()) / (30 * 86400000)
  );
  const monthlyValue = customer.total_spent / monthsSince;

  // Compute items frequency for مشتريات tab
  const itemsMap: Record<string, { qty: number; revenue: number }> = {};
  orders.forEach(o => {
    (o.items ?? []).forEach(it => {
      if (!itemsMap[it.name]) itemsMap[it.name] = { qty: 0, revenue: 0 };
      itemsMap[it.name].qty += it.qty;
      itemsMap[it.name].revenue += it.price * it.qty;
    });
  });
  const topItems = Object.entries(itemsMap)
    .sort((a, b) => b[1].revenue - a[1].revenue);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !displayTags.includes(tag)) {
      const next = [...displayTags, tag];
      setLocalTags(next);
      if (regularCustomer?.id) {
        customersApi.update(regularCustomer.id, { tags: next }).catch(() => {});
      }
    }
    setTagInput("");
    setEditingTag(false);
  };

  const handleRemoveTag = (t: string) => {
    const next = displayTags.filter(x => x !== t);
    setLocalTags(next);
    if (regularCustomer?.id) {
      customersApi.update(regularCustomer.id, { tags: next }).catch(() => {});
    }
  };

  return (
    <div className="space-y-5" dir="rtl">

      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/dashboard/flower-customers" className="hover:text-brand-500 transition-colors flex items-center gap-1">
          <ArrowRight className="w-4 h-4" /> عملاء الورود
        </Link>
        <ChevronLeft className="w-3 h-3" />
        <span className="text-gray-700 font-medium">{customer.customer_name || decodedPhone}</span>
      </div>

      {/* ── Hero Card ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#eef2f6]">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5 p-6 pb-5">
          {/* Avatar */}
          <div className={clsx("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0", tier.bg)}>
            {customer.customer_name?.charAt(0) || "؟"}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + tier badges */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-xl font-bold text-gray-900">{customer.customer_name || "—"}</h1>
              <span className={clsx("text-xs px-2 py-0.5 rounded-full font-semibold border", tier.badge)}>
                {tier.label}
              </span>
              {customer.is_due_return && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  مرشح للعودة
                </span>
              )}
            </div>

            {/* Phone */}
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
              <Phone className="w-3.5 h-3.5 text-gray-300" />
              <span dir="ltr">{decodedPhone}</span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {displayTags.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">
                  <Tag className="w-3 h-3" />
                  {t}
                  <button onClick={() => handleRemoveTag(t)} className="hover:text-red-400 transition-colors">
                    <XIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {editingTag ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddTag(); if (e.key === "Escape") setEditingTag(false); }}
                    autoFocus
                    placeholder="اسم التاق..."
                    className="text-xs border border-brand-200 rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-brand-200 w-28"
                  />
                  <button onClick={handleAddTag} className="text-emerald-500 hover:text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditingTag(false)} className="text-gray-400 hover:text-gray-600"><XIcon className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingTag(true)}
                  className="text-xs px-2 py-0.5 rounded-full border border-dashed border-[#eef2f6] text-gray-400 hover:border-brand-200 hover:text-brand-500 transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> إضافة تاق
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <a
              href={`tel:${decodedPhone}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#eef2f6] text-sm font-medium text-gray-700 hover:bg-[#f8fafc] transition-colors"
            >
              <Phone className="w-4 h-4" /> اتصال
            </a>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> واتساب
            </a>
          </div>
        </div>

        {/* KPI bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-gray-100 border-t border-[#eef2f6]">
          {[
            { label: "إجمالي الطلبات",   value: customer.order_count,               color: "text-brand-600" },
            { label: "إجمالي الإنفاق",   value: fmtMoney(customer.total_spent),     color: "text-emerald-600" },
            { label: "متوسط الطلب",      value: fmtMoney(customer.avg_order_value),  color: "text-violet-600" },
            { label: "آخر طلب",          value: `${customer.days_since_last_order} يوم`, color: customer.days_since_last_order > 60 ? "text-red-500" : "text-gray-700" },
          ].map(k => (
            <div key={k.label} className="px-5 py-4 text-center">
              <p className={clsx("text-2xl font-bold tabular-nums", k.color)}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────── */}
      <div className="flex overflow-x-auto border-b border-[#eef2f6] bg-white rounded-2xl px-2 gap-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "flex items-center gap-1.5 px-5 py-[6px] text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === t.key ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB: نظرة عامة ─────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Activity details */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">نشاط العميل</h3>
            <div className="space-y-3.5">
              {[
                { icon: Calendar,   label: "أول طلب",          value: fmtDate(customer.first_order_at) },
                { icon: Clock,      label: "آخر طلب",           value: `${fmtDate(customer.last_order_at)} (${customer.days_since_last_order} يوم)` },
                { icon: Repeat,     label: "متوسط التكرار",      value: customer.avg_days_between_orders && customer.avg_days_between_orders > 0.001
                    ? `كل ${Math.round(customer.avg_days_between_orders)} يوم`
                    : "—" },
                { icon: Heart,      label: "نوع الطلب المفضل",  value: ORDER_TYPE_LABEL[customer.favorite_order_type] ?? customer.favorite_order_type },
                { icon: TrendingUp, label: "القيمة الشهرية",     value: fmtMoney(monthlyValue) },
              ].map(row => {
                const Icon = row.icon;
                return (
                  <div key={row.label} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-xl bg-[#f8fafc] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-gray-400 text-xs w-28 shrink-0">{row.label}</span>
                    <span className="text-gray-800 font-medium">{row.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">تحليل العميل</h3>
            <div className="space-y-3">
              {customer.is_due_return && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <TrendingUp className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">مرشح للعودة</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      لم يطلب منذ {customer.days_since_last_order} يوم — تواصل معه الآن
                    </p>
                  </div>
                </div>
              )}
              {customer.customer_tier === "vip" && (
                <div className="flex items-start gap-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
                  <Star className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-violet-800">عميل VIP</p>
                    <p className="text-xs text-violet-600 mt-0.5">
                      أنفق أكثر من غيره — خصص له عروضاً مميزة
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 bg-[#f8fafc] rounded-xl">
                <ShoppingBag className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">{customer.order_count} طلب منذ البداية</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    متوسط {fmtMoney(customer.avg_order_value)} لكل طلب
                  </p>
                </div>
              </div>

              {/* Type breakdown */}
              {orders.length > 0 && (() => {
                const typeCount: Record<string, number> = {};
                orders.forEach(o => {
                  const t = o.delivery_type || "regular";
                  typeCount[t] = (typeCount[t] || 0) + 1;
                });
                return (
                  <div className="p-3 bg-[#f8fafc] rounded-xl">
                    <p className="text-xs font-semibold text-gray-500 mb-2">توزيع نوع الطلبات</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(typeCount).map(([type, count]) => (
                        <span key={type} className="text-xs px-2 py-0.5 rounded-full bg-white border border-[#eef2f6] text-gray-600">
                          {ORDER_TYPE_LABEL[type] ?? type} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: الطلبات ────────────────────────────────────── */}
      {tab === "orders" && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          {ordersLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-[#f1f5f9] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">لا توجد طلبات</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#eef2f6] bg-gray-50/50">
                  {["رقم الطلب", "التاريخ", "القيمة", "النوع", "الحالة", "ملاحظة"].map(h => (
                    <th key={h} className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const st = STATUS_CONFIG[o.status] ?? { label: o.status, cls: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/50 transition-colors">
                      <td className="py-[6px] px-[10px] font-mono text-xs text-brand-500 font-semibold">{o.order_number}</td>
                      <td className="py-[6px] px-[10px] text-gray-500 text-xs">{fmtDate(o.created_at)}</td>
                      <td className="py-[6px] px-[10px] font-bold text-gray-900 tabular-nums">{Number(o.total).toLocaleString("en-US")} ر.س</td>
                      <td className="py-[6px] px-[10px] text-gray-500 text-xs">{ORDER_TYPE_LABEL[o.delivery_type] ?? o.delivery_type ?? "—"}</td>
                      <td className="py-[6px] px-[10px]">
                        <span className={clsx("text-[11px] px-2 py-0.5 rounded-full font-medium", st.cls)}>{st.label}</span>
                      </td>
                      <td className="py-[6px] px-[10px] text-gray-400 text-xs italic max-w-[160px] truncate">
                        {o.gift_message || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── TAB: الفواتير ───────────────────────────────────── */}
      {tab === "invoices" && (
        <div className="space-y-3">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "إجمالي الفواتير", value: orders.length, color: "text-brand-600" },
              { label: "المدفوعة",         value: orders.filter(o => PAID_STATUSES.includes(o.status)).length, color: "text-emerald-600" },
              { label: "الإجمالي المدفوع", value: fmtMoney(orders.filter(o => PAID_STATUSES.includes(o.status)).reduce((s, o) => s + Number(o.total), 0)), color: "text-gray-900" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-[#eef2f6] p-4 text-center">
                <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {ordersLoading ? (
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-5 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[#f1f5f9] rounded-xl animate-pulse" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#eef2f6] text-center py-16">
              <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">لا توجد فواتير</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((o, idx) => {
                const st = STATUS_CONFIG[o.status] ?? { label: o.status, cls: "bg-gray-100 text-gray-600" };
                const isPaid = PAID_STATUSES.includes(o.status);
                return (
                  <div key={o.id} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                          isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                          #{orders.length - idx}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 font-mono">{o.order_number}</p>
                          <p className="text-xs text-gray-400">{fmtDate(o.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-gray-900 tabular-nums">{Number(o.total).toLocaleString("en-US")} ر.س</p>
                        <span className={clsx("text-[11px] px-2 py-0.5 rounded-full font-medium", st.cls)}>{st.label}</span>
                      </div>
                    </div>
                    {o.items && o.items.length > 0 && (
                      <div className="border-t border-gray-50 pt-3 space-y-1.5">
                        {o.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-500">
                            <span>{it.name} × {it.qty}</span>
                            <span className="tabular-nums font-medium">{(it.price * it.qty).toLocaleString("en-US")} ر.س</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: المشتريات ──────────────────────────────────── */}
      {tab === "purchases" && (
        <div className="space-y-4">
          {/* Type breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(
              orders.reduce((acc: Record<string, { count: number; total: number }>, o) => {
                const t = o.delivery_type || "regular";
                if (!acc[t]) acc[t] = { count: 0, total: 0 };
                acc[t].count++;
                acc[t].total += Number(o.total);
                return acc;
              }, {})
            ).map(([type, data]) => (
              <div key={type} className="bg-white rounded-2xl border border-[#eef2f6] p-4">
                <p className="text-lg font-bold text-gray-900 tabular-nums">{data.count}</p>
                <p className="text-xs text-gray-500">{ORDER_TYPE_LABEL[type] ?? type}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1 tabular-nums">{fmtMoney(data.total)}</p>
              </div>
            ))}
          </div>

          {/* Product breakdown */}
          {topItems.length > 0 ? (
            <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">المنتجات المشتراة</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50">
                    {["المنتج", "الكمية", "الإيراد"].map(h => (
                      <th key={h} className="text-right py-3 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topItems.map(([name, data]) => (
                    <tr key={name} className="border-t border-gray-50 hover:bg-[#f8fafc]/50 transition-colors">
                      <td className="py-3 px-5 font-medium text-gray-900">{name}</td>
                      <td className="py-3 px-5 text-gray-500 tabular-nums">{data.qty}</td>
                      <td className="py-3 px-5 font-semibold text-gray-900 tabular-nums">{fmtMoney(data.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#eef2f6] text-center py-16">
              <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">لا تتوفر تفاصيل المنتجات بعد</p>
              <p className="text-gray-300 text-xs mt-1">ستظهر هنا عند تفعيل تفاصيل البنود في الطلبات</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default FlowerCustomerDetailPage;
