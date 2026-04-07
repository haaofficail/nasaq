/**
 * FlowerOrdersPage — Unified Orders Hub
 * الطلبات: بيع مباشر + طلبات خدمات تحت كيان Order واحد
 * نوع الطلب: sale | service
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi, useMutation } from "@/hooks/useApi";
import { flowerBuilderApi, serviceOrdersApi } from "@/lib/api";
import {
  Package, Phone, ChevronDown, ChevronRight, RefreshCw, AlertTriangle,
  MapPin, MessageSquare, Clock, Loader2, Calendar, Briefcase,
  ArrowLeft, ShoppingBag, Search, ClipboardList,
} from "lucide-react";
import { clsx } from "clsx";
import { fmtDate } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

// ─── Types ─────────────────────────────────────────────────────────────────────
type OrderCat = "all" | "sale" | "service";

interface SaleOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  items: any[];
  subtotal: string | number;
  total: string | number;
  status: string;
  delivery_address?: any;
  delivery_date?: string;
  gift_message?: string;
  packaging?: string;
  created_at: string;
}

// ─── Sale Order Constants ────────────────────────────────────────────────────
const SALE_STATUS_TABS = [
  { value: "",                 label: "الكل" },
  { value: "pending",          label: "جديد" },
  { value: "confirmed",        label: "مؤكد" },
  { value: "preparing",        label: "قيد التجهيز" },
  { value: "ready",            label: "جاهز" },
  { value: "out_for_delivery", label: "في الطريق" },
  { value: "delivered",        label: "مُسلَّم" },
  { value: "cancelled",        label: "ملغي" },
];

const SALE_STATUS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending:          { label: "جديد",          bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  confirmed:        { label: "مؤكد",          bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-200" },
  preparing:        { label: "قيد التجهيز",   bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  ready:            { label: "جاهز للتسليم", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  out_for_delivery: { label: "في الطريق",     bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  delivered:        { label: "مُسلَّم",       bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  cancelled:        { label: "ملغي",          bg: "bg-red-50",    text: "text-red-500",    border: "border-red-200" },
};

const SALE_STATUS_NEXT: Record<string, string> = {
  pending:   "confirmed",
  confirmed: "preparing",
  preparing: "ready",
};

const SALE_STATUS_ACTION: Record<string, string> = {
  pending:   "تأكيد الطلب",
  confirmed: "ابدأ التجهيز",
  preparing: "جاهز للتسليم",
};

// ─── Service Order Constants ─────────────────────────────────────────────────
const SERVICE_TYPE_LABELS: Record<string, string> = {
  kiosk:               "كوشة",
  newborn_reception:   "استقبال مولود",
  custom_arrangement:  "تنسيق مخصص",
  field_execution:     "تنفيذ ميداني",
  custom_decor:        "ديكور مناسبة",
};

const SERVICE_STATUS: Record<string, { label: string; cls: string }> = {
  draft:             { label: "مسودة",           cls: "bg-gray-100 text-gray-600" },
  deposit_pending:   { label: "بانتظار العربون",  cls: "bg-amber-100 text-amber-700" },
  confirmed:         { label: "مؤكد",             cls: "bg-blue-100 text-blue-700" },
  scheduled:         { label: "مجدول",            cls: "bg-violet-100 text-violet-700" },
  preparing:         { label: "تحت التجهيز",      cls: "bg-orange-100 text-orange-700" },
  ready:             { label: "جاهز",             cls: "bg-teal-100 text-teal-700" },
  dispatched:        { label: "خرج للموقع",       cls: "bg-blue-100 text-blue-600" },
  in_setup:          { label: "قيد التركيب",      cls: "bg-indigo-100 text-indigo-700" },
  completed_on_site: { label: "اكتمل",            cls: "bg-green-100 text-green-700" },
  returned:          { label: "عاد من الموقع",    cls: "bg-amber-100 text-amber-700" },
  inspected:         { label: "تم الفحص",         cls: "bg-teal-100 text-teal-700" },
  closed:            { label: "مغلق",             cls: "bg-gray-100 text-gray-500" },
  cancelled:         { label: "ملغي",             cls: "bg-red-100 text-red-500" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SaleBadge({ status }: { status: string }) {
  const c = SALE_STATUS[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border", c.bg, c.text, c.border)}>
      {c.label}
    </span>
  );
}

function ServiceBadge({ status }: { status: string }) {
  const c = SERVICE_STATUS[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold", c.cls)}>
      {c.label}
    </span>
  );
}

function TypeBadge({ kind }: { kind: "sale" | "service" }) {
  if (kind === "sale") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
      <ShoppingBag className="w-2.5 h-2.5" /> بيع
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
      <Briefcase className="w-2.5 h-2.5" /> خدمة
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-50">
      <div className="w-10 h-10 bg-gray-100 rounded-xl animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/4" />
      </div>
      <div className="h-6 w-16 bg-gray-100 rounded-lg animate-pulse" />
    </div>
  );
}

// ─── Sale Order Row (existing behaviour) ─────────────────────────────────────
function SaleOrderRow({ order, onStatusUpdate }: { order: SaleOrder; onStatusUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const updateMut = useMutation((status: string) => flowerBuilderApi.updateOrderStatus(order.id, status));

  const handleAdvance = async () => {
    const next = SALE_STATUS_NEXT[order.status];
    if (!next) return;
    const res = await updateMut.mutate(next);
    if (res) {
      toast.success(`تم تحديث الحالة إلى: ${SALE_STATUS[next]?.label ?? next}`);
      onStatusUpdate();
    }
  };

  const total = Number(order.total ?? order.subtotal ?? 0);
  const items: any[] = Array.isArray(order.items)
    ? order.items
    : (typeof order.items === "string" ? JSON.parse(order.items || "[]") : []);
  const deliveryAddress = order.delivery_address
    ? (typeof order.delivery_address === "string" ? JSON.parse(order.delivery_address) : order.delivery_address)
    : null;

  return (
    <div className="border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
        <button onClick={() => setExpanded(!expanded)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="shrink-0 w-28">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs font-bold text-gray-800">{order.order_number}</p>
            <TypeBadge kind="sale" />
          </div>
          <p className="text-[11px] text-gray-400">{fmtDate(order.created_at)}</p>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{order.customer_name}</p>
          <a href={`tel:${order.customer_phone}`} className="text-xs text-brand-500 hover:underline flex items-center gap-1 mt-0.5 w-fit" onClick={e => e.stopPropagation()}>
            <Phone className="w-3 h-3" /> {order.customer_phone}
          </a>
        </div>

        <div className="hidden sm:block w-32 shrink-0">
          <p className="text-xs text-gray-500 truncate">{items.length > 0 ? `${items.length} عنصر` : "—"}</p>
        </div>

        <div className="shrink-0 w-24 text-left">
          <p className="text-sm font-bold text-gray-900 tabular-nums">{total.toLocaleString("en-US")} <span className="text-xs font-normal text-gray-400">ر.س</span></p>
        </div>

        <div className="shrink-0"><SaleBadge status={order.status} /></div>

        {SALE_STATUS_NEXT[order.status] && (
          <button onClick={handleAdvance} disabled={updateMut.loading} className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors">
            {updateMut.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : SALE_STATUS_ACTION[order.status]}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mx-4 mb-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
          {items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">العناصر</p>
              <div className="space-y-1.5">
                {items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">{item.name ?? item.nameAr ?? `عنصر ${i + 1}`}</span>
                    <span className="text-gray-500 tabular-nums">{item.qty ?? item.quantity ?? 1} × {Number(item.price ?? 0).toLocaleString("en-US")} ر.س</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {deliveryAddress && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
              <span>{[deliveryAddress.street, deliveryAddress.district, deliveryAddress.city].filter(Boolean).join("، ") || JSON.stringify(deliveryAddress)}</span>
            </div>
          )}
          {order.delivery_date && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>موعد التسليم: {fmtDate(order.delivery_date)}</span>
            </div>
          )}
          {order.gift_message && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
              <span className="italic">{order.gift_message}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">التغليف: {order.packaging ?? "—"}</span>
            <span className="text-xs font-bold text-gray-800">الإجمالي: {total.toLocaleString("en-US")} ر.س</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Service Order Compact Row ───────────────────────────────────────────────
function ServiceOrderRow({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);
  const total = Number(order.total_amount ?? order.total ?? 0);
  const typeLabel = SERVICE_TYPE_LABELS[order.type] ?? order.type ?? "خدمة";

  return (
    <div className="border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
        <button onClick={() => setExpanded(!expanded)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="shrink-0 w-28">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs font-bold text-gray-800">{order.order_number}</p>
            <TypeBadge kind="service" />
          </div>
          <p className="text-[11px] text-gray-400">{fmtDate(order.created_at)}</p>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{order.customer_name}</p>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="text-xs text-brand-500 hover:underline flex items-center gap-1 mt-0.5 w-fit" onClick={e => e.stopPropagation()}>
              <Phone className="w-3 h-3" /> {order.customer_phone}
            </a>
          )}
        </div>

        <div className="hidden sm:block w-32 shrink-0">
          <p className="text-xs text-gray-600 font-medium">{typeLabel}</p>
          {order.event_date && <p className="text-[11px] text-gray-400">{fmtDate(order.event_date)}</p>}
        </div>

        <div className="shrink-0 w-24 text-left">
          <p className="text-sm font-bold text-gray-900 tabular-nums">{total.toLocaleString("en-US")} <span className="text-xs font-normal text-gray-400">ر.س</span></p>
        </div>

        <div className="shrink-0"><ServiceBadge status={order.status} /></div>

        <Link
          to="/dashboard/flower-service-orders"
          className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors flex items-center gap-1"
          onClick={e => e.stopPropagation()}
        >
          التنفيذ <ArrowLeft className="w-3 h-3" />
        </Link>
      </div>

      {expanded && (
        <div className="mx-4 mb-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-2">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-400">النوع: </span>
              <span className="text-gray-700 font-medium">{typeLabel}</span>
            </div>
            {order.event_location && (
              <div className="flex items-center gap-1 text-gray-600">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span>{order.event_location}</span>
              </div>
            )}
            {order.event_date && (
              <div className="flex items-center gap-1 text-gray-600">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>تاريخ المناسبة: {fmtDate(order.event_date)}</span>
              </div>
            )}
            {order.deposit && (
              <div>
                <span className="text-gray-400">العربون: </span>
                <span className="text-emerald-600 font-medium">{Number(order.deposit).toLocaleString("en-US")} ر.س</span>
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-gray-100">
            <Link
              to="/dashboard/flower-service-orders"
              className="text-xs text-brand-500 hover:underline flex items-center gap-1 w-fit"
            >
              فتح صفحة التنفيذ الكاملة <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export function FlowerOrdersPage() {
  const [orderCat, setOrderCat] = useState<OrderCat>("all");
  const [saleStatus, setSaleStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Always load both in parallel — combined view merges client-side
  const { data: saleStatsRes } = useApi(() => flowerBuilderApi.orderStats(), []);
  const { data: serviceStatsRes } = useApi(() => serviceOrdersApi.stats(), []);

  const { data: saleRes, loading: saleLoading, error: saleError, refetch: refetchSale } = useApi(
    () => flowerBuilderApi.orders(saleStatus ? { status: saleStatus } : undefined),
    [saleStatus]
  );
  const { data: serviceRes, loading: serviceLoading, refetch: refetchService } = useApi(
    () => serviceOrdersApi.list({}),
    []
  );

  const allSaleOrders: SaleOrder[] = saleRes?.data ?? [];
  const allServiceOrders: any[] = serviceRes?.data ?? [];
  const saleStats = saleStatsRes?.data ?? {};
  const serviceStats = serviceStatsRes?.data ?? {};

  // Client-side search filter
  const matchesSearch = (o: { customer_name?: string; customer_phone?: string; order_number?: string }) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (o.customer_name ?? "").toLowerCase().includes(q) ||
      (o.customer_phone ?? "").toLowerCase().includes(q) ||
      (o.order_number ?? "").toLowerCase().includes(q)
    );
  };

  const saleOrders = useMemo(
    () => allSaleOrders.filter(matchesSearch),
    [allSaleOrders, searchQuery],
  );
  const serviceOrders = useMemo(
    () => allServiceOrders.filter(matchesSearch),
    [allServiceOrders, searchQuery],
  );

  const totalRevenue =
    Number(saleStats.total_revenue ?? 0) +
    allServiceOrders.reduce((s: number, o: any) => s + Number(o.total_amount ?? o.total ?? 0), 0);

  const loading = saleLoading || serviceLoading;

  const refetchAll = () => { refetchSale(); refetchService(); };

  // Orders to display based on category
  const showSale    = orderCat === "all" || orderCat === "sale";
  const showService = orderCat === "all" || orderCat === "service";

  // Count badges for sale status tabs (computed from unfiltered sale orders)
  const saleStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of allSaleOrders) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    }
    return counts;
  }, [allSaleOrders]);

  const CAT_TABS: { value: OrderCat; label: string; count: number }[] = [
    { value: "all",     label: "كل الطلبات", count: allSaleOrders.length + allServiceOrders.length },
    { value: "sale",    label: "بيع مباشر",  count: allSaleOrders.length },
    { value: "service", label: "طلبات خدمات", count: allServiceOrders.length },
  ];

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">الطلبات</h1>
            <p className="text-xs text-gray-400">إدارة طلبات البيع والخدمات</p>
          </div>
        </div>
        <button onClick={refetchAll} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:bg-gray-50 text-gray-400 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "بيع مباشر",    value: String(saleStats.total ?? allSaleOrders.length ?? 0),     color: "text-brand-600" },
          { label: "طلبات خدمات",  value: String(serviceStats.active ?? allServiceOrders.length ?? 0), color: "text-violet-600" },
          { label: "تحت التنفيذ",  value: String(serviceStats.in_progress ?? 0),                  color: "text-amber-600" },
          { label: "الإيرادات",    value: `${totalRevenue.toLocaleString("en-US")} ر.س`,           color: "text-emerald-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-100">

        {/* Order category tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 pb-0 border-b border-gray-100 overflow-x-auto">
          {CAT_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => { setOrderCat(t.value); setSaleStatus(""); }}
              className={clsx(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap",
                orderCat === t.value ? "border-brand-500 text-brand-600 bg-brand-50/30" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  orderCat === t.value ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-500"
                )}>{t.count}</span>
              )}
            </button>
          ))}

          {/* Status filter — only for sale view */}
          {orderCat === "sale" && (
            <div className="mr-auto pr-2 flex items-center gap-1">
              {SALE_STATUS_TABS.map(t => {
                const cnt = t.value === "" ? allSaleOrders.length : (saleStatusCounts[t.value] ?? 0);
                return (
                  <button
                    key={t.value}
                    onClick={() => setSaleStatus(t.value)}
                    className={clsx(
                      "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap flex items-center gap-1",
                      saleStatus === t.value ? "bg-brand-500 text-white border-brand-500" : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    )}
                  >
                    {t.label}
                    {cnt > 0 && (
                      <span className={clsx(
                        "text-[10px] px-1 py-px rounded-full font-bold min-w-[18px] text-center",
                        saleStatus === t.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"
                      )}>{cnt}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث باسم العميل، رقم الهاتف، أو رقم الطلب..."
              className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300/30 focus:border-brand-500"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div>{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : saleError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="w-10 h-10 text-red-300 mb-3" />
            <p className="text-sm font-semibold text-gray-700">حدث خطأ في تحميل البيانات</p>
            <button onClick={refetchAll} className="mt-3 px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 transition-colors">إعادة المحاولة</button>
          </div>
        ) : (
          <>
            {/* Sale orders */}
            {showSale && (
              <>
                {orderCat === "all" && saleOrders.length > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag className="w-3 h-3" /> بيع مباشر ({saleOrders.length})
                    </p>
                  </div>
                )}
                {saleOrders.length === 0 && orderCat === "sale" ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Package className="w-12 h-12 text-gray-200 mb-3" />
                    <p className="text-sm font-semibold text-gray-700">لا توجد طلبات بيع</p>
                    <p className="text-xs text-gray-400 mt-1">{saleStatus ? `لا توجد طلبات بحالة "${SALE_STATUS[saleStatus]?.label ?? saleStatus}"` : "لم يتم استلام أي طلبات بعد"}</p>
                  </div>
                ) : (
                  saleOrders.map(o => <SaleOrderRow key={o.id} order={o} onStatusUpdate={refetchSale} />)
                )}
              </>
            )}

            {/* Service orders */}
            {showService && (
              <>
                {orderCat === "all" && serviceOrders.length > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3" /> طلبات الخدمات ({serviceOrders.length})
                    </p>
                  </div>
                )}
                {serviceOrders.length === 0 && orderCat === "service" ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Briefcase className="w-12 h-12 text-gray-200 mb-3" />
                    <p className="text-sm font-semibold text-gray-700">لا توجد طلبات خدمات</p>
                    <p className="text-xs text-gray-400 mt-1">أنشئ كوشة أو طلب استقبال مولود أو تنسيق مخصص من صفحة التنفيذ</p>
                    <Link to="/dashboard/flower-service-orders" className="mt-3 text-sm text-brand-500 hover:underline">فتح صفحة التنفيذ</Link>
                  </div>
                ) : (
                  serviceOrders.map((o: any) => <ServiceOrderRow key={o.id} order={o} />)
                )}
              </>
            )}

            {/* Search empty state */}
            {searchQuery.trim() && saleOrders.length === 0 && serviceOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm font-semibold text-gray-700">لا توجد نتائج</p>
                <p className="text-xs text-gray-400 mt-1">لم يتم العثور على طلبات تطابق &quot;{searchQuery}&quot;</p>
              </div>
            )}

            {/* Combined empty state */}
            {!searchQuery.trim() && orderCat === "all" && saleOrders.length === 0 && serviceOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-sm font-semibold text-gray-700">لا توجد طلبات بعد</p>
                <p className="text-xs text-gray-400 mt-1">ستظهر هنا جميع طلبات البيع وطلبات الخدمات</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FlowerOrdersPage;
