import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { ShoppingBag, Clock, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { flowerBuilderApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

const orderStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: "جديد",        color: "text-blue-600",   bg: "bg-blue-50" },
  confirmed:   { label: "مؤكد",        color: "text-violet-600", bg: "bg-violet-50" },
  in_progress: { label: "قيد التنفيذ", color: "text-amber-600",  bg: "bg-amber-50" },
  ready:       { label: "جاهز",        color: "text-teal-600",   bg: "bg-teal-50" },
  delivered:   { label: "تم التسليم",  color: "text-emerald-600",bg: "bg-emerald-50" },
  cancelled:   { label: "ملغي",        color: "text-red-500",    bg: "bg-red-50" },
};

export function FlowerOrdersWidget() {
  const { data: statsRes } = useApi(() => flowerBuilderApi.orderStats(), []);
  const { data: ordersRes, loading } = useApi(
    () => flowerBuilderApi.orders({ status: "pending", limit: "5" }),
    []
  );

  const stats = statsRes?.data ?? {};
  const pendingOrders: any[] = ordersRes?.data ?? [];

  const total    = stats.total    ?? 0;
  const pending  = stats.pending  ?? pendingOrders.length ?? 0;
  const today    = stats.today    ?? stats.todayTotal ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">طلبات الباقات</h2>
            <p className="text-xs text-gray-400 mt-0.5">Flower Builder</p>
          </div>
        </div>
        <Link
          to="/dashboard/flower-orders"
          className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium"
        >
          عرض الكل
          <ArrowLeft className="w-3 h-3 rotate-180" />
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-0 border-b border-gray-50">
        <div className="flex flex-col items-center py-3 border-l border-gray-50">
          <p className="text-xl font-bold text-gray-900 tabular-nums">{total}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">إجمالي</p>
        </div>
        <div className="flex flex-col items-center py-3 border-l border-gray-50">
          <p className={clsx("text-xl font-bold tabular-nums", pending > 0 ? "text-blue-600" : "text-gray-400")}>
            {pending}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">معلقة</p>
        </div>
        <div className="flex flex-col items-center py-3">
          <p className="text-xl font-bold text-emerald-600 tabular-nums">{today}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">اليوم</p>
        </div>
      </div>

      {/* Pending orders list */}
      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-5 text-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-300 mb-1.5" />
            <p className="text-xs text-gray-400">لا توجد طلبات معلقة</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {pendingOrders.slice(0, 4).map((order: any, i: number) => {
              const sc = orderStatusConfig[order.status] ?? orderStatusConfig.pending;
              const name = order.customerName ?? order.customer?.name ?? order.name ?? "عميل";
              const total = Number(order.totalAmount ?? order.total ?? 0);

              return (
                <Link
                  key={order.id ?? i}
                  to="/dashboard/flower-orders"
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", sc.bg)}>
                    <Clock className={clsx("w-3 h-3", sc.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{name}</p>
                  </div>
                  <span className="text-xs tabular-nums text-gray-600 shrink-0">
                    {total.toLocaleString("en-US")} ر.س
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
