import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { CalendarCheck, TrendingUp, AlertTriangle, ArrowLeft } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { flowersEventsApi } from "@/lib/api";
import { FE_STATUS_LABELS, FE_STATUS_COLORS } from "@/lib/flowersEventsConfig";

// ── UpcomingEventsCard ─────────────────────────────────────────────────────────
// Shows service_orders with event_date in next 7 days
export function UpcomingEventsCard() {
  const { data, loading } = useApi(() => flowersEventsApi.dashboardMetrics(), []);
  const events = (data?.data?.upcoming_events?.events ?? []) as any[];
  const count  = data?.data?.upcoming_events?.count ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#eef2f6] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-blue-50 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">المناسبات القادمة</p>
            <p className="text-xs text-gray-400">خلال 7 أيام</p>
          </div>
        </div>
        <span className="text-lg font-bold tabular-nums text-blue-600">{loading ? "—" : count}</span>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[0, 1, 2].map(i => <div key={i} className="h-10 bg-[#f1f5f9] rounded-xl animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="py-10 text-center text-xs text-gray-400">لا توجد مناسبات قادمة</div>
      ) : (
        <div className="divide-y divide-[#eef2f6]">
          {events.slice(0, 5).map((ev: any) => {
            const label = FE_STATUS_LABELS[ev.status] ?? ev.status;
            const color = FE_STATUS_COLORS[ev.status] ?? "bg-[#f1f5f9] text-gray-500 border-[#eef2f6]";
            const date  = ev.event_date
              ? new Date(ev.event_date).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "2-digit", month: "short" })
              : "—";
            return (
              <Link
                key={ev.id}
                to={`/dashboard/flower-service-orders/${ev.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-[#f8fafc] transition-colors"
              >
                <div className="text-xs tabular-nums text-gray-400 w-14 shrink-0">{date}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {ev.title || ev.customer_name || "مناسبة"}
                  </p>
                </div>
                <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full border", color)}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="px-5 py-3 border-t border-[#eef2f6]">
        <Link
          to="/dashboard/flower-service-orders"
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          عرض كل المناسبات <ArrowLeft className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ── DailySalesCard ─────────────────────────────────────────────────────────────
// Today's completed POS transactions
export function DailySalesCard() {
  const { data, loading } = useApi(() => flowersEventsApi.dashboardMetrics(), []);
  const sales = data?.data?.daily_sales ?? {};
  const txCount = sales?.transaction_count ?? 0;
  const revenue = Number(sales?.total_revenue ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
      <div className="w-11 h-11 rounded-[12px] bg-emerald-50 flex items-center justify-center shrink-0">
        <TrendingUp className="w-5 h-5 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">مبيعات اليوم</p>
        {loading ? (
          <div className="h-6 w-28 bg-[#f1f5f9] rounded-lg animate-pulse mt-1" />
        ) : (
          <p className="text-xl font-bold tabular-nums text-emerald-600">
            {revenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            <span className="text-sm font-medium text-gray-400 mr-1">ر.س</span>
          </p>
        )}
        {!loading && txCount > 0 && (
          <p className="text-[11px] text-gray-400 mt-0.5">{txCount} معاملة</p>
        )}
      </div>
      <Link
        to="/dashboard/pos"
        className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#f8fafc] border border-[#eef2f6] text-gray-400 hover:text-brand-600 hover:border-brand-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ── FlowerAlertsCard ──────────────────────────────────────────────────────────
// Batches expiring within 2 days
export function FlowerAlertsCard() {
  const { data, loading } = useApi(() => flowersEventsApi.dashboardMetrics(), []);
  const alerts = data?.data?.flower_alerts ?? {};
  const expiringCount = alerts?.expiring_count ?? 0;
  const totalStems    = alerts?.total_stems    ?? 0;

  const urgent = expiringCount > 0;

  return (
    <div className={clsx(
      "rounded-2xl border p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all",
      urgent ? "bg-amber-50 border-amber-200" : "bg-white border-[#eef2f6]"
    )}>
      <div className={clsx(
        "w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0",
        urgent ? "bg-amber-100" : "bg-[#f8fafc]"
      )}>
        <AlertTriangle className={clsx("w-5 h-5", urgent ? "text-amber-600" : "text-gray-400")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx("text-xs font-medium", urgent ? "text-amber-700" : "text-gray-400")}>
          تنبيهات الورد
        </p>
        {loading ? (
          <div className="h-6 w-24 bg-[#f1f5f9] rounded-lg animate-pulse mt-1" />
        ) : urgent ? (
          <>
            <p className="text-xl font-bold tabular-nums text-amber-700">{expiringCount} دفعة</p>
            {totalStems > 0 && (
              <p className="text-[11px] text-amber-600 mt-0.5">{totalStems} ساق قاربت على الانتهاء</p>
            )}
          </>
        ) : (
          <p className="text-xl font-bold text-gray-400">لا تنبيهات</p>
        )}
      </div>
      <Link
        to="/dashboard/flower-master?tab=batches"
        className={clsx(
          "flex items-center justify-center w-8 h-8 rounded-xl border transition-colors",
          urgent
            ? "bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200"
            : "bg-[#f8fafc] border-[#eef2f6] text-gray-400 hover:text-brand-600 hover:border-brand-200"
        )}
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ── FlowersEventsDashboardSection ─────────────────────────────────────────────
// Composite: all 3 cards in one section
export function FlowersEventsDashboardSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-0.5">
        لوحة الزهور والمناسبات
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DailySalesCard />
        <FlowerAlertsCard />
      </div>
      <UpcomingEventsCard />
    </div>
  );
}
