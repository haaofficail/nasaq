import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { onlineOrdersApi } from "@/lib/api";
import { ShoppingCart, Clock, CheckCircle2, XCircle, Search, ChevronDown, ChevronRight, Package } from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

const STATUS_LABELS: Record<string, string> = { pending: "جديد", confirmed: "مؤكد", in_progress: "قيد التحضير", ready: "جاهز", delivered: "تم التسليم", completed: "مكتمل", cancelled: "ملغي" };
const STATUS_COLORS: Record<string, string> = { pending: "bg-yellow-50 text-yellow-700 border-yellow-200", confirmed: "bg-blue-50 text-blue-700 border-blue-200", in_progress: "bg-purple-50 text-purple-700 border-purple-200", ready: "bg-green-50 text-green-700 border-green-200", delivered: "bg-teal-50 text-teal-700 border-teal-200", completed: "bg-gray-100 text-gray-500 border-gray-200", cancelled: "bg-red-50 text-red-600 border-red-200" };

const NEXT_STATUS: Record<string, string> = { pending: "confirmed", confirmed: "in_progress", in_progress: "ready", ready: "delivered", delivered: "completed" };
const NEXT_STATUS_LABELS: Record<string, string> = { pending: "تأكيد", confirmed: "بدء التحضير", in_progress: "جاهز", ready: "تم التسليم", delivered: "مكتمل" };

export function OnlineOrdersPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data, loading, refetch } = useApi(
    () => onlineOrdersApi.list({ limit: "100" }),
    []
  );
  const updateStatus = useMutation(({ id, status }: any) => onlineOrdersApi.updateStatus(id, status));

  const allOrders: any[] = data?.data || [];

  const orders = allOrders.filter(o => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchSearch = !search || o.customerName?.includes(search) || o.id?.includes(search);
    return matchStatus && matchSearch;
  });

  const stats = {
    new: allOrders.filter(o => o.status === "pending").length,
    inProgress: allOrders.filter(o => ["confirmed", "in_progress"].includes(o.status)).length,
    ready: allOrders.filter(o => o.status === "ready").length,
    revenue: allOrders.filter(o => o.status === "completed").reduce((s: number, o: any) => s + parseFloat(o.totalAmount || o.price || 0), 0),
  };

  const handleNext = async (order: any) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await updateStatus.mutate({ id: order.id, status: next });
    refetch();
  };

  const handleCancel = async (id: string) => {
    if (!confirm("إلغاء هذا الطلب؟")) return;
    await onlineOrdersApi.cancel(id);
    refetch();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-brand-500" /> الطلبات الأونلاين
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{allOrders.length} طلب إجمالي</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "طلبات جديدة", value: stats.new, icon: ShoppingCart, color: "text-yellow-600 bg-yellow-50" },
          { label: "قيد التحضير", value: stats.inProgress, icon: Clock, color: "text-purple-600 bg-purple-50" },
          { label: "جاهزة للتسليم", value: stats.ready, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "إيرادات اليوم", value: `${stats.revenue.toFixed(0)} ر.س`, icon: ShoppingCart, color: "text-brand-500 bg-brand-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color.split(" ")[1])}>
              <Icon className={clsx("w-4 h-4", color.split(" ")[0])} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو رقم الطلب..." className="bg-transparent outline-none text-sm text-gray-700 w-40" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {[["all", "الكل"], ["pending", "جديد"], ["confirmed", "مؤكد"], ["in_progress", "تحضير"], ["ready", "جاهز"], ["completed", "مكتمل"], ["cancelled", "ملغي"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors", statusFilter === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              {l} {v !== "all" && <span className="opacity-60">({allOrders.filter(o => o.status === v).length})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <SkeletonRows />
      ) : (
        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">لا توجد طلبات</p>
              <p className="text-xs text-gray-300 mt-1">ستظهر هنا الطلبات الواردة من الموقع</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{expandedOrder === order.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{order.customerName || order.customer?.name || "عميل"}</p>
                        <span className="text-xs text-gray-400 tabular-nums">#{order.id?.slice(-6)}</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {order.scheduledAt ? new Date(order.scheduledAt).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                        {order.customerPhone && ` · ${order.customerPhone}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900 tabular-nums">{parseFloat(order.totalAmount || order.price || 0).toFixed(0)} ر.س</span>
                    <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-medium border", STATUS_COLORS[order.status] || "bg-gray-100 text-gray-500 border-gray-200")}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>
                </div>

                {expandedOrder === order.id && (
                  <div className="border-t border-gray-50 px-5 py-4 space-y-3">
                    {order.notes && (
                      <div className="bg-gray-50 rounded-xl px-4 py-3">
                        <p className="text-xs font-semibold text-gray-400 mb-1">ملاحظات الطلب</p>
                        <p className="text-sm text-gray-700">{order.notes}</p>
                      </div>
                    )}
                    {order.items && order.items.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-400">عناصر الطلب</p>
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{item.name} × {item.quantity}</span>
                            <span className="text-gray-600 tabular-nums">{(item.price * item.quantity).toFixed(0)} ر.س</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      {NEXT_STATUS[order.status] && (
                        <button onClick={() => handleNext(order)} disabled={updateStatus.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors">
                          {NEXT_STATUS_LABELS[order.status]}
                        </button>
                      )}
                      {!["cancelled", "completed"].includes(order.status) && (
                        <button onClick={() => handleCancel(order.id)} className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
