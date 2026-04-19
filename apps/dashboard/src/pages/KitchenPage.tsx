import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useApi, useMutation } from "@/hooks/useApi";
import { ChefHat, Clock, CheckCircle2, Truck, RefreshCw, Package, AlarmClock, ArrowLeft } from "lucide-react";
import { clsx } from "clsx";
import { kitchenApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";

const STATUS_COLORS: Record<string, string> = {
  pending:   "border-r-yellow-400 bg-[#1c1a0f]",
  preparing: "border-r-purple-400 bg-[#160f1c]",
  ready:     "border-r-green-400  bg-[#0d1c12]",
  delivered: "border-r-[#30363d]  bg-[#161b22] opacity-70",
  cancelled: "border-r-red-800    bg-[#1c0f0f] opacity-50",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "جديد", preparing: "قيد التحضير", ready: "جاهز", delivered: "مُسلَّم", cancelled: "ملغي",
};

const NEXT_STATUS: Record<string, string> = { pending: "preparing", preparing: "ready", ready: "delivered" };
const NEXT_LABELS: Record<string, string> = { pending: "ابدأ التحضير", preparing: "جاهز للتسليم", ready: "تم التسليم" };

function elapsedMin(ts: string): number {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

function ElapsedBadge({ createdAt }: { createdAt: string }) {
  const [mins, setMins] = useState(() => elapsedMin(createdAt));
  useEffect(() => {
    const t = setInterval(() => setMins(elapsedMin(createdAt)), 30000);
    return () => clearInterval(t);
  }, [createdAt]);
  const color = mins >= 20
    ? "bg-red-900/40 text-red-400"
    : mins >= 10
    ? "bg-amber-900/40 text-amber-400"
    : "bg-green-900/40 text-green-400";
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
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] -m-4 md:-m-6 bg-[#0d1117] text-[#e6edf3]">
      <div className="flex-1 space-y-5 p-4 md:p-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#e6edf3] flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-brand-400" /> المطبخ
            </h1>
            <p className="text-sm text-[#6e7681] mt-0.5">{allOrders.length} طلب</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border border-[#30363d] bg-[#161b22] text-[#e6edf3] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 [color-scheme:dark]"
            />
            <button
              onClick={refetch}
              title="تحديث (تلقائي كل 30 ثانية)"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-brand-400 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "جديدة",        value: stats?.pending   || allOrders.filter(o => o.status === "pending").length,   icon: Package,     iconBg: "bg-yellow-900/40",  iconColor: "text-yellow-400" },
            { label: "قيد التحضير", value: stats?.preparing || allOrders.filter(o => o.status === "preparing").length, icon: ChefHat,     iconBg: "bg-purple-900/40",  iconColor: "text-purple-400" },
            { label: "جاهزة",        value: stats?.ready     || allOrders.filter(o => o.status === "ready").length,     icon: CheckCircle2, iconBg: "bg-green-900/40",   iconColor: "text-green-400"  },
            { label: "مُسلَّمة",     value: stats?.delivered || allOrders.filter(o => o.status === "delivered").length, icon: Truck,       iconBg: "bg-brand-900/20",   iconColor: "text-brand-400"  },
          ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div key={label} className="bg-[#161b22] rounded-2xl border border-[#30363d] p-4 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all">
              <div className={clsx("w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0", iconBg)}>
                <Icon className={clsx("w-4 h-4", iconColor)} />
              </div>
              <div>
                <p className="text-lg font-bold text-[#e6edf3] tabular-nums">{value}</p>
                <p className="text-xs text-[#6e7681]">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-[#161b22] border border-[#30363d] rounded-xl p-1 overflow-x-auto">
          {([["all","الكل"],["pending","جديد"],["preparing","تحضير"],["ready","جاهز"],["delivered","مُسلَّم"]] as [string,string][]).map(([v,l]) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                statusFilter === v
                  ? "bg-[#30363d] text-[#e6edf3]"
                  : "text-[#6e7681] hover:text-[#e6edf3]"
              )}
            >
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
              <div className="bg-[#161b22] rounded-2xl border border-[#30363d] text-center py-16">
                <ChefHat className="w-10 h-10 text-[#30363d] mx-auto mb-3" />
                <p className="text-[#6e7681]">لا توجد طلبات</p>
              </div>
            ) : (
              orders.map((o: any) => (
                <div
                  key={o.id}
                  className={clsx(
                    "rounded-2xl border border-r-4 px-5 py-4 hover:shadow-[0_2px_12px_rgba(0,0,0,0.4)] transition-all",
                    STATUS_COLORS[o.status] || "border-r-[#30363d] bg-[#161b22]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#e6edf3]">طلب #{o.order_number}</p>
                        <span className="text-xs text-[#6e7681]">
                          {new Date(o.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {(o.status === "pending" || o.status === "preparing") && (
                          <ElapsedBadge createdAt={o.created_at} />
                        )}
                      </div>
                      {o.customer_name && (
                        <p className="text-sm text-[#8d96a0] mt-0.5">{o.customer_name}</p>
                      )}
                      {o.items && o.items.filter((i: any) => i.name).length > 0 && (
                        <p className="text-xs text-[#6e7681] mt-1">
                          {o.items.filter((i: any) => i.name).map((i: any) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join("، ")}
                        </p>
                      )}
                      {o.notes && (
                        <p className="text-xs text-amber-400 mt-1">ملاحظة: {o.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-[#e6edf3] tabular-nums">
                        {parseFloat(o.total_amount || 0).toFixed(0)} ر.س
                      </span>
                      {NEXT_STATUS[o.status] && (
                        <button
                          onClick={() => handleNext(o)}
                          disabled={updateStatus.loading}
                          className="bg-brand-500 text-white rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors whitespace-nowrap"
                        >
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

        {/* الخطوة التالية */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-400">الخطوة التالية</p>
            <p className="text-xs text-[#6e7681] mt-0.5">الطلبات الجاهزة — عيّن مندوب التوصيل</p>
          </div>
          <Link
            to="/dashboard/delivery"
            className="flex items-center gap-2 bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-600 transition-colors"
          >
            التوصيل <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
