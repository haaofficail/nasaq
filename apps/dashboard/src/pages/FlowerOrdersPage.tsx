import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { flowerBuilderApi } from "@/lib/api";
import {
  Package, Phone, ChevronDown, ChevronRight,
  RefreshCw, AlertTriangle, MapPin, MessageSquare,
  ShoppingBag, Clock, CheckCircle2, Loader2, X,
} from "lucide-react";
import { clsx } from "clsx";
import { fmtDate } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface FlowerOrder {
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

interface Stats {
  total: string | number;
  pending: string | number;
  confirmed: string | number;
  delivered: string | number;
  total_revenue: string | number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { value: "",                 label: "الكل" },
  { value: "pending",          label: "جديد" },
  { value: "confirmed",        label: "مؤكد" },
  { value: "preparing",        label: "قيد التجهيز" },
  { value: "ready",            label: "جاهز" },
  { value: "out_for_delivery", label: "في الطريق" },
  { value: "delivered",        label: "مُسلَّم" },
  { value: "cancelled",        label: "ملغي" },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending:          { label: "جديد",          bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  confirmed:        { label: "مؤكد",          bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-200" },
  preparing:        { label: "قيد التجهيز",   bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  ready:            { label: "جاهز للتسليم", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  out_for_delivery: { label: "في الطريق",     bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  delivered:        { label: "مُسلَّم",       bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  cancelled:        { label: "ملغي",          bg: "bg-red-50",    text: "text-red-500",    border: "border-red-200" },
};

// تدفق الحالات: جديد → مؤكد → قيد التجهيز → جاهز
// (الخطوات بعد "جاهز" تُدار من صفحة تشغيل الطلبات عبر المندوبين)
const STATUS_NEXT: Record<string, string> = {
  pending:   "confirmed",
  confirmed: "preparing",
  preparing: "ready",
};

const STATUS_ACTION_LABEL: Record<string, string> = {
  pending:   "تأكيد الطلب",
  confirmed: "ابدأ التجهيز",
  preparing: "جاهز للتسليم",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border", cfg.bg, cfg.text, cfg.border)}>
      {cfg.label}
    </span>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
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

// ─── Order Row ─────────────────────────────────────────────────────────────────
function OrderRow({ order, onStatusUpdate }: { order: FlowerOrder; onStatusUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const updateMut = useMutation((status: string) => flowerBuilderApi.updateOrderStatus(order.id, status));

  const handleAdvance = async () => {
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    const res = await updateMut.mutate(next);
    if (res) {
      toast.success(`تم تحديث الحالة إلى: ${STATUS_CONFIG[next]?.label ?? next}`);
      onStatusUpdate();
    }
  };

  const total = Number(order.total ?? order.subtotal ?? 0);
  const items: any[] = Array.isArray(order.items) ? order.items : (typeof order.items === "string" ? JSON.parse(order.items || "[]") : []);
  const deliveryAddress = order.delivery_address
    ? (typeof order.delivery_address === "string" ? JSON.parse(order.delivery_address) : order.delivery_address)
    : null;

  const hasNext = !!STATUS_NEXT[order.status];

  return (
    <div className="border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/60 transition-colors">
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Order number */}
        <div className="shrink-0 w-32">
          <p className="text-xs font-bold text-gray-800">{order.order_number}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(order.created_at)}</p>
        </div>

        {/* Customer */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{order.customer_name}</p>
          <a
            href={`tel:${order.customer_phone}`}
            className="text-xs text-[#5b9bd5] hover:underline flex items-center gap-1 mt-0.5 w-fit"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-3 h-3" />
            {order.customer_phone}
          </a>
        </div>

        {/* Items summary */}
        <div className="hidden sm:block w-40 shrink-0">
          <p className="text-xs text-gray-500 truncate">
            {items.length > 0 ? `${items.length} عنصر` : "—"}
          </p>
        </div>

        {/* Total */}
        <div className="shrink-0 w-24 text-left">
          <p className="text-sm font-bold text-gray-900 tabular-nums">
            {total.toLocaleString("en-US")} <span className="text-xs font-normal text-gray-400">ر.س</span>
          </p>
        </div>

        {/* Status */}
        <div className="shrink-0">
          <StatusBadge status={order.status} />
        </div>

        {/* Action */}
        {hasNext && (
          <button
            onClick={handleAdvance}
            disabled={updateMut.loading}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#5b9bd5] text-white text-xs font-semibold hover:bg-[#4a8ac4] disabled:opacity-50 transition-colors"
          >
            {updateMut.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : STATUS_ACTION_LABEL[order.status]}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mx-4 mb-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
          {items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">العناصر</p>
              <div className="space-y-1.5">
                {items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">{item.name ?? item.nameAr ?? `عنصر ${i + 1}`}</span>
                    <span className="text-gray-500 tabular-nums">
                      {item.qty ?? item.quantity ?? 1} × {Number(item.price ?? 0).toLocaleString("en-US")} ر.س
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deliveryAddress && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
              <span>
                {[deliveryAddress.street, deliveryAddress.district, deliveryAddress.city]
                  .filter(Boolean).join("، ") || JSON.stringify(deliveryAddress)}
              </span>
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

// ─── Main Page ──────────────────────────────────────────────────────────────────
export function FlowerOrdersPage() {
  const [activeStatus, setActiveStatus] = useState("");

  const { data: statsRes, loading: statsLoading } = useApi(() => flowerBuilderApi.orderStats(), []);
  const { data: ordersRes, loading: ordersLoading, error, refetch } = useApi(
    () => flowerBuilderApi.orders(activeStatus ? { status: activeStatus } : undefined),
    [activeStatus]
  );

  const stats: Stats = statsRes?.data ?? {};
  const orders: FlowerOrder[] = ordersRes?.data ?? [];

  const totalRevenue = Number(stats.total_revenue ?? 0);

  return (
    <div className="space-y-5 p-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">طلبات الورود</h1>
          <p className="text-sm text-gray-400 mt-0.5">إدارة ومتابعة طلبات العملاء</p>
        </div>
        <button
          onClick={refetch}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:bg-gray-50 text-gray-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "إجمالي الطلبات", value: statsLoading ? "—" : String(stats.total ?? 0), color: "text-gray-800" },
          { label: "معلقة",           value: statsLoading ? "—" : String(stats.pending ?? 0),   color: "text-amber-600" },
          { label: "مؤكدة",           value: statsLoading ? "—" : String(stats.confirmed ?? 0), color: "text-blue-600" },
          { label: "مُسلَّمة",        value: statsLoading ? "—" : String(stats.delivered ?? 0), color: "text-green-600" },
          { label: "الإيرادات",       value: statsLoading ? "—" : `${totalRevenue.toLocaleString("en-US")} ر.س`, color: "text-[#5b9bd5]" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-gray-100">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 pb-0 border-b border-gray-100 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={clsx(
                "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap",
                activeStatus === tab.value
                  ? "border-[#5b9bd5] text-[#5b9bd5] bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div>
          {ordersLoading ? (
            <div>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="w-10 h-10 text-red-300 mb-3" />
              <p className="text-sm font-semibold text-gray-700">حدث خطأ في تحميل البيانات</p>
              <p className="text-xs text-gray-400 mt-1">{error}</p>
              <button
                onClick={refetch}
                className="mt-3 px-4 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <Package className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700">لا توجد طلبات</p>
              <p className="text-xs text-gray-400 mt-1">
                {activeStatus ? `لا توجد طلبات بحالة "${STATUS_CONFIG[activeStatus]?.label ?? activeStatus}"` : "لم يتم استلام أي طلبات بعد"}
              </p>
            </div>
          ) : (
            <div>
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} onStatusUpdate={refetch} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FlowerOrdersPage;
