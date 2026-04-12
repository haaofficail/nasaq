import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { salonApi, staffApi } from "@/lib/api";
import { TrendingUp, Users, BarChart3, RepeatIcon, Star } from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

function getDefaultRange() {
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().slice(0, 10);
  return { firstOfMonth, today };
}

export function StaffPerformancePage() {
  const { firstOfMonth, today } = getDefaultRange();
  const [from, setFrom] = useState(firstOfMonth);
  const [to,   setTo]   = useState(today);

  const { data: perfData, loading } = useApi(
    () => salonApi.staffPerformance(from, to),
    [from, to]
  );
  const { data: staffData } = useApi(() => staffApi.list(), []);

  const perf: any[]  = perfData?.data || [];
  const staff: any[] = staffData?.data || [];

  // Merge staff names
  const staffMap: Record<string, string> = {};
  for (const s of staff) staffMap[s.id] = s.name;

  const totalRevenue = perf.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-500" /> أداء الفريق
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">تحليل الإيرادات، العودة، الاحتفاظ</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm" />
          <span className="text-gray-400 text-xs">—</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm" />
        </div>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : perf.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">لا توجد حجوزات مكتملة في هذه الفترة</p>
          <p className="text-xs text-gray-300 mt-1">{from} — {to}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {perf.map((p, i) => {
            const name = staffMap[p.staffId] || p.staffId?.slice(0, 8) || "موظف";
            const revenueShare = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
            const completionRate = p.totalBookings > 0 ? Math.round((p.completed / p.totalBookings) * 100) : 0;

            return (
              <div key={p.staffId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-3 px-5 py-4">
                  {/* Rank */}
                  <div className={clsx(
                    "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                    i === 0 ? "bg-amber-100 text-amber-600" : i === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-400"
                  )}>
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{name}</p>
                    <p className="text-xs text-gray-400">{p.completed} خدمة مكتملة · {p.totalBookings} إجمالي</p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-900 tabular-nums">{p.revenue.toFixed(0)} ر.س</p>
                    <p className="text-xs text-gray-400">{revenueShare.toFixed(0)}% من الإجمالي</p>
                  </div>
                </div>

                {/* Revenue bar */}
                <div className="px-5 pb-1">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-400 rounded-full transition-all"
                      style={{ width: `${revenueShare}%` }}
                    />
                  </div>
                </div>

                {/* KPI chips */}
                <div className="flex flex-wrap gap-2 px-5 py-3">
                  {/* Avg ticket */}
                  <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    <div>
                      <p className="text-xs font-bold text-blue-700">{p.avgTicket.toFixed(0)} ر.س</p>
                      <p className="text-xs text-blue-400">متوسط الفاتورة</p>
                    </div>
                  </div>

                  {/* Rebooking rate */}
                  <div className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-xl",
                    p.rebookingRate >= 50 ? "bg-green-50" : p.rebookingRate >= 30 ? "bg-amber-50" : "bg-red-50")}>
                    <RepeatIcon className={clsx("w-3.5 h-3.5",
                      p.rebookingRate >= 50 ? "text-green-500" : p.rebookingRate >= 30 ? "text-amber-500" : "text-red-400")} />
                    <div>
                      <p className={clsx("text-xs font-bold",
                        p.rebookingRate >= 50 ? "text-green-700" : p.rebookingRate >= 30 ? "text-amber-700" : "text-red-600")}
                      >{p.rebookingRate}%</p>
                      <p className={clsx("text-xs",
                        p.rebookingRate >= 50 ? "text-green-400" : p.rebookingRate >= 30 ? "text-amber-400" : "text-red-400")}
                      >معدل العودة</p>
                    </div>
                  </div>

                  {/* Completion rate */}
                  <div className="flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-xl">
                    <Star className="w-3.5 h-3.5 text-purple-500" />
                    <div>
                      <p className="text-xs font-bold text-purple-700">{completionRate}%</p>
                      <p className="text-xs text-purple-400">معدل الإتمام</p>
                    </div>
                  </div>

                  {/* No-show */}
                  {p.noShow > 0 && (
                    <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-xl">
                      <p className="text-xs font-bold text-red-600">{p.noShow} غياب</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Insight footer */}
      {perf.length > 1 && (() => {
        const top = perf[0];
        const topName = staffMap[top.staffId] || "الموظف الأول";
        return (
          <div className="bg-brand-50 rounded-2xl border border-brand-100 px-5 py-4">
            <p className="text-sm font-semibold text-brand-700">
              {topName} يقود الفريق هذا الشهر بـ {top.revenue.toFixed(0)} ر.س
              {top.rebookingRate > 0 && ` ومعدل عودة عملاء ${top.rebookingRate}%`}
            </p>
            {perf.some(p => p.rebookingRate < 25) && (
              <p className="text-xs text-brand-500 mt-1">
                {perf.filter(p => p.rebookingRate < 25).length} موظف معدل عودة عملائهم أقل من 25% — يحتاج متابعة
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
