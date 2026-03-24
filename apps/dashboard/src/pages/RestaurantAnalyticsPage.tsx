import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { restaurantApi } from "@/lib/api";
import { BarChart3, TrendingUp, DollarSign, Users, UtensilsCrossed, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";

function HourBar({ hours }: { hours: any[] }) {
  if (!hours.length) return null;
  const maxRevenue = Math.max(...hours.map(h => parseFloat(h.revenue || 0)), 1);

  return (
    <div className="space-y-1">
      {Array.from({ length: 24 }, (_, i) => {
        const h = hours.find(x => x.hour === i);
        const pct = h ? (parseFloat(h.revenue || 0) / maxRevenue) * 100 : 0;
        const isPeak = pct >= 70;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-8 text-left tabular-nums">{String(i).padStart(2, "0")}:00</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className={clsx("h-full rounded-full transition-all", isPeak ? "bg-brand-500" : "bg-brand-200")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 tabular-nums w-10 text-left">{h?.orders || 0}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RestaurantAnalyticsPage() {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 8) + "01";
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo]     = useState(today);
  const [costExpanded, setCostExpanded] = useState(false);

  const { data, loading } = useApi(() => restaurantApi.analytics(from, to), [from, to]);

  const analytics = data?.data;
  const summary = analytics?.summary;
  const topItems: any[] = analytics?.topItems || [];
  const byHour:   any[] = analytics?.byHour   || [];
  const costCards: any[] = analytics?.costCards || [];
  const daily:    any[] = analytics?.daily     || [];

  const peakHour = byHour.length
    ? byHour.reduce((best, h) => parseFloat(h.revenue || 0) > parseFloat(best.revenue || 0) ? h : best, byHour[0])
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-500" /> تحليلات المطعم
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">أداء المبيعات، الأصناف، وتكلفة الطعام</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300" />
          <span className="text-gray-400 text-sm">—</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">جاري التحميل...</div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "الإيرادات", value: `${parseFloat(summary?.total_revenue || 0).toFixed(0)} ر.س`, icon: DollarSign, color: "text-brand-500 bg-brand-50" },
              { label: "الطلبات",   value: summary?.total_orders || 0,                                   icon: UtensilsCrossed, color: "text-purple-600 bg-purple-50" },
              { label: "متوسط الفاتورة", value: `${parseFloat(summary?.avg_ticket || 0).toFixed(1)} ر.س`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
              { label: "عملاء فريدون", value: summary?.unique_customers || 0,                             icon: Users,     color: "text-amber-600 bg-amber-50" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color.split(" ")[1])}>
                  <Icon className={clsx("w-5 h-5", color.split(" ")[0])} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Order type breakdown */}
          {summary && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">توزيع الطلبات حسب النوع</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "داخل المطعم", value: summary.dine_in || 0, color: "bg-brand-500" },
                  { label: "استلام",      value: summary.takeaway || 0, color: "bg-amber-400" },
                  { label: "توصيل",      value: summary.delivery || 0, color: "bg-purple-400" },
                ].map(({ label, value, color }) => {
                  const total = (summary.dine_in || 0) + (summary.takeaway || 0) + (summary.delivery || 0);
                  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                  return (
                    <div key={label} className="text-center">
                      <div className="relative w-full bg-gray-100 rounded-full h-2 mb-2">
                        <div className={clsx("h-2 rounded-full", color)} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="font-bold text-gray-900 text-lg tabular-nums">{value}</p>
                      <p className="text-xs text-gray-400">{label} ({pct}%)</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top items */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">أكثر الأصناف مبيعاً</p>
              {topItems.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">لا توجد بيانات</p>
              ) : (
                <div className="space-y-3">
                  {topItems.map((item, i) => {
                    const maxOrders = topItems[0]?.order_count || 1;
                    const pct = Math.round((item.order_count / maxOrders) * 100);
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <span className="w-5 text-xs font-bold text-gray-400 tabular-nums">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                            <p className="text-xs text-gray-500 tabular-nums shrink-0 mr-2">{item.order_count} طلب</p>
                          </div>
                          <div className="bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-emerald-600 tabular-nums shrink-0">
                          {parseFloat(item.total_revenue || 0).toFixed(0)} ر.س
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Peak hours */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700">الإيرادات حسب الساعة</p>
                {peakHour && (
                  <span className="text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded-lg font-medium">
                    ذروة: {String(peakHour.hour).padStart(2, "0")}:00
                  </span>
                )}
              </div>
              {byHour.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">لا توجد بيانات</p>
              ) : (
                <HourBar hours={byHour} />
              )}
            </div>
          </div>

          {/* Food cost cards */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              onClick={() => setCostExpanded(e => !e)}
            >
              <p className="text-sm font-semibold text-gray-700">تكلفة الطعام لكل صنف (Food Cost %)</p>
              {costExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {costExpanded && (
              <div className="px-5 pb-5">
                {costCards.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">لا توجد بيانات المكونات — أضف وصفات الأصناف من إدارة القائمة</p>
                ) : (
                  <div className="space-y-2">
                    {costCards.map(item => {
                      const pct = parseFloat(item.food_cost_pct || 0);
                      const color = pct > 40 ? "text-red-500" : pct > 30 ? "text-amber-500" : "text-emerald-600";
                      const barColor = pct > 40 ? "bg-red-400" : pct > 30 ? "bg-amber-400" : "bg-emerald-400";
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm text-gray-800 truncate">{item.name}</p>
                              <div className="flex items-center gap-3 shrink-0 mr-2">
                                <span className="text-xs text-gray-400 tabular-nums">تكلفة: {parseFloat(item.ingredient_cost || 0).toFixed(2)} ر.س</span>
                                <span className={clsx("text-xs font-bold tabular-nums", color)}>{pct}%</span>
                              </div>
                            </div>
                            <div className="bg-gray-100 rounded-full h-1.5">
                              <div className={clsx("h-1.5 rounded-full", barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
