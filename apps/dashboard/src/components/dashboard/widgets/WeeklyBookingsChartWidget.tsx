import { CalendarCheck, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";
import { bookingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

export function WeeklyBookingsChartWidget() {
  const { data: weekData, loading: loadingWeek } = useApi(() => bookingsApi.stats("week"), []);
  const { data: growthData, loading: loadingGrowth } = useApi(() => bookingsApi.growth("week"), []);

  const loading = loadingWeek || loadingGrowth;
  const weekTotal: number = weekData?.data?.totalBookings ?? 0;
  const growthPct: number = growthData?.data?.growthPercent ?? 0;

  const TrendIcon = growthPct > 0 ? TrendingUp : growthPct < 0 ? TrendingDown : Minus;
  const trendColor = growthPct > 0 ? "text-emerald-600" : growthPct < 0 ? "text-red-500" : "text-gray-400";

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-5 h-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">الحجوزات الأسبوعية</h2>
          <p className="text-xs text-gray-400 mt-0.5">هذا الأسبوع مقارنة بالأسبوع الماضي</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
          <CalendarCheck className="w-4 h-4 text-brand-500" />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col justify-center gap-3">
          <div className="h-12 w-24 bg-[#f1f5f9] rounded-xl animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-4xl font-bold text-gray-900 tabular-nums leading-none">
            {weekTotal.toLocaleString("en-US")}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">حجز هذا الأسبوع</p>
          {growthData?.data && (
            <div className={clsx("flex items-center gap-1.5 mt-3 text-xs font-medium", trendColor)}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span>
                {growthPct > 0 ? "+" : ""}{Math.round(growthPct)}% مقارنة بالأسبوع الماضي
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
