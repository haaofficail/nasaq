import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { Wrench, ArrowLeft, Clock } from "lucide-react";
import { workOrdersApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { WORK_ORDER_STATUSES } from "@/lib/constants";

const STATUS_MAP = Object.fromEntries(WORK_ORDER_STATUSES.map(s => [s.key, s]));

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-lg", className)} />;
}

export function WorkOrdersWidget() {
  const { data: statsData, loading: loadingStats } = useApi(() => workOrdersApi.stats(), []);
  const { data: listData,  loading: loadingList  } = useApi(() => workOrdersApi.list({ limit: 5 }), []);

  const stats  = statsData?.data;
  const orders: any[] = listData?.data ?? [];
  const loading = loadingStats || loadingList;

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <h2 className="font-semibold text-gray-900 text-sm">أوامر العمل</h2>
        <Link
          to="/dashboard/work-orders"
          className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium"
        >
          عرض الكل
          <ArrowLeft className="w-3 h-3 rotate-180" />
        </Link>
      </div>

      {/* Mini stats */}
      {!loading && stats && (
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-gray-50 border-b border-gray-50">
          {[
            { label: "نشطة",          value: stats.totalActive          ?? 0 },
            { label: "جاهزة",         value: stats.byStatus?.ready      ?? 0 },
            { label: "انتظار قطع",   value: stats.byStatus?.waiting_parts ?? 0 },
          ].map(s => (
            <div key={s.label} className="py-2 px-3 text-center">
              <p className="text-base font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-6 text-center">
            <Wrench className="w-7 h-7 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">لا توجد أوامر عمل بعد</p>
            <Link to="/dashboard/work-orders" className="text-xs text-brand-500 hover:underline mt-1 inline-block">
              أضف أول أمر عمل
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 5).map((o: any) => {
              const st = STATUS_MAP[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-600" };
              return (
                <Link
                  key={o.id}
                  to="/dashboard/work-orders"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Wrench className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{o.customerName}</p>
                    <p className="text-xs text-gray-400 truncate">{o.itemName} {o.itemModel ? `· ${o.itemModel}` : ""}</p>
                  </div>
                  <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-lg shrink-0", st.color)}>
                    {st.label}
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
