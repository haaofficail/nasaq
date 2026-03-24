import { useState, useEffect, useRef } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { ChefHat, Clock, CheckCircle2, Truck, RefreshCw, Package, AlarmClock } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";

const kitchenApi = {
  orders: (params?: { status?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.date) q.set("date", params.date);
    return api.get<{ data: any[] }>(`/kitchen/orders?${q}`);
  },
  updateStatus: (id: string, status: string) => api.patch<{ data: any }>(`/kitchen/orders/${id}/status`, { status }),
  stats: (date?: string) => api.get<{ data: any }>(`/kitchen/stats${date ? `?date=${date}` : ""}`),
};

const STATUS_COLORS: Record<string, string> = {
  pending: "border-r-yellow-400 bg-yellow-50",
  preparing: "border-r-purple-400 bg-purple-50",
  ready: "border-r-green-400 bg-green-50",
  delivered: "border-r-gray-300 bg-gray-50",
  cancelled: "border-r-red-300 bg-red-50 opacity-60",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "جديد", preparing: "قيد التحضير", ready: "جاهز", delivered: "مُسلَّم", cancelled: "ملغي",
};

const NEXT_STATUS: Record<string, string> = { pending: "preparing", preparing: "ready", ready: "delivered" };
const NEXT_LABELS: Record<string, string> = { pending: "ابدأ التحضير", preparing: "جاهز للتسليم", ready: "تم التسليم" };

// Returns elapsed minutes since a timestamp
function elapsedMin(ts: string): number {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

function ElapsedBadge({ createdAt }: { createdAt: string }) {
  const [mins, setMins] = useState(() => elapsedMin(createdAt));
  useEffect(() => {
    const t = setInterval(() => setMins(elapsedMin(createdAt)), 30000);
    return () => clearInterval(t);
  }, [createdAt]);
  const color = mins >= 20 ? "bg-red-100 text-red-600" : mins >= 10 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600";
  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg", color)}>
      <AlarmClock className="w-3 h-3" /> {mins} د
    </span>
  );
}

export function KitchenPage() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, loading, refetch } = useApi(() => kitchenApi.orders({ date }), [date]);
  const { data: statsData } = useApi(() => kitchenApi.stats(date), [date]);
  const updateStatus = useMutation(({ id, status }: any) => kitchenApi.updateStatus(id, status));

  // Auto-refresh every 30 seconds for live kitchen view
  useEffect(() => {
    autoRefreshRef.current = setInterval(() => refetch(), 30000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [refetch]);

  const allOrders: any[] = data?.data || [];
  const stats = statsData?.data;

  const orders = statusFilter === "all" ? allOrders : allOrders.filter(o => o.status === statusFilter);

  const handleNext = async (order: any) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await updateStatus.mutate({ id: order.id, status: next });
    refetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-brand-500" /> المطبخ
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{allOrders.length} طلب</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300" />
          <button onClick={refetch} title="تحديث (تلقائي كل 30 ثانية)" className="w-9 h-9 flex items-center justify-center rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "جديدة", value: stats?.pending || allOrders.filter(o => o.status === "pending").length, icon: Package, color: "text-yellow-600 bg-yellow-50" },
          { label: "قيد التحضير", value: stats?.preparing || allOrders.filter(o => o.status === "preparing").length, icon: ChefHat, color: "text-purple-600 bg-purple-50" },
          { label: "جاهزة", value: stats?.ready || allOrders.filter(o => o.status === "ready").length, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "مُسلَّمة", value: stats?.delivered || allOrders.filter(o => o.status === "delivered").length, icon: Truck, color: "text-brand-500 bg-brand-50" },
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

      {/* Status filter */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {([["all","الكل"],["pending","جديد"],["preparing","تحضير"],["ready","جاهز"],["delivered","مُسلَّم"]] as [string,string][]).map(([v,l]) => (
          <button key={v} onClick={() => setStatusFilter(v)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors", statusFilter === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {l}
          </button>
        ))}
      </div>

      {/* Orders */}
      {loading ? (
        <SkeletonRows />
      ) : (
        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
              <ChefHat className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا توجد طلبات</p>
            </div>
          ) : (
            orders.map((o: any) => (
              <div key={o.id} className={clsx("bg-white rounded-2xl border border-r-4 px-5 py-4", STATUS_COLORS[o.status] || "border-r-gray-300 bg-white border-gray-100")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">طلب #{o.order_number}</p>
                      <span className="text-xs text-gray-400">{new Date(o.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
                      {(o.status === "pending" || o.status === "preparing") && <ElapsedBadge createdAt={o.created_at} />}
                    </div>
                    {o.customer_name && <p className="text-sm text-gray-500 mt-0.5">{o.customer_name}</p>}
                    {o.items && o.items.filter((i: any) => i.name).length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{o.items.filter((i: any) => i.name).map((i: any) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join("، ")}</p>
                    )}
                    {o.notes && <p className="text-xs text-orange-500 mt-1">ملاحظة: {o.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-gray-900 tabular-nums">{parseFloat(o.total_amount || 0).toFixed(0)} ر.س</span>
                    {NEXT_STATUS[o.status] && (
                      <button onClick={() => handleNext(o)} disabled={updateStatus.loading} className="bg-brand-500 text-white rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors whitespace-nowrap">
                        {NEXT_LABELS[o.status]}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
