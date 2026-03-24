import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { flowerMasterApi } from "@/lib/api";
import { Flower2, AlertTriangle, TrendingUp, BarChart3, Clock, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { clsx } from "clsx";

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <p className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4 text-brand-500" /> {title}
        </p>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export function FlowerAnalyticsPage() {
  const { data, loading, refetch } = useApi(() => flowerMasterApi.intelligence(), []);

  const waste:    any[] = data?.data?.waste    || [];
  const velocity: any[] = data?.data?.velocity || [];
  const margin:   any[] = data?.data?.margin   || [];
  const expiring: any[] = data?.data?.expiring || [];

  const totalWasteCost  = waste.reduce((s, v) => s + parseFloat(v.waste_cost || 0), 0);
  const totalWasteUnits = waste.reduce((s, v) => s + parseFloat(v.waste_units || 0), 0);
  const highWaste       = waste.filter(v => parseFloat(v.waste_rate_pct || 0) >= 20);
  const reorderNeeded   = velocity.filter(v =>
    parseFloat(v.weekly_demand || 0) > 0 &&
    parseFloat(v.current_stock || 0) < parseFloat(v.weekly_demand || 0) * 1.5
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Flower2 className="w-5 h-5 text-brand-500" /> تحليلات الورد الذكية
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">هدر الورد، الهامش، الطلب، التنبؤ بإعادة الطلب</p>
        </div>
        <button onClick={refetch} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">جاري التحليل...</div>
      ) : (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "تكلفة الهدر",     value: `${totalWasteCost.toFixed(0)} ر.س`, color: "text-red-500 bg-red-50",      icon: AlertTriangle },
              { label: "وحدات هدر",       value: `${totalWasteUnits.toFixed(0)} ساق`, color: "text-orange-500 bg-orange-50", icon: Flower2 },
              { label: "تنتهي خلال 7 أيام", value: expiring.length,                    color: "text-amber-600 bg-amber-50",   icon: Clock },
              { label: "تحتاج إعادة طلب", value: reorderNeeded.length,                color: "text-purple-600 bg-purple-50", icon: RefreshCw },
            ].map(({ label, value, color, icon: Icon }) => (
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

          {/* Expiry alert */}
          {expiring.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-semibold text-amber-800 flex items-center gap-2 text-sm mb-3">
                <Clock className="w-4 h-4" /> ورد ينتهي خلال 7 أيام — يجب استخدامه أولاً
              </p>
              <div className="space-y-2">
                {expiring.map(b => (
                  <div key={b.batch_id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{b.display_name}</p>
                      <p className="text-xs text-gray-400">دفعة: {b.batch_number}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-500 tabular-nums">{b.quantity_remaining} ساق</span>
                      <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-lg",
                        b.days_left <= 1 ? "bg-red-100 text-red-600" :
                        b.days_left <= 3 ? "bg-orange-100 text-orange-600" : "bg-amber-100 text-amber-600"
                      )}>
                        {b.days_left <= 0 ? "اليوم!" : `${b.days_left} يوم`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reorder recommendations */}
          {reorderNeeded.length > 0 && (
            <Section title="توصيات إعادة الطلب" icon={RefreshCw} defaultOpen={true}>
              <div className="space-y-2">
                {reorderNeeded.map(v => {
                  const weeksLeft = parseFloat(v.weekly_demand) > 0
                    ? (parseFloat(v.current_stock) / parseFloat(v.weekly_demand)).toFixed(1)
                    : "—";
                  const suggestedOrder = Math.ceil(parseFloat(v.weekly_demand) * 2);
                  return (
                    <div key={v.variant_id} className="flex items-center justify-between bg-purple-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{v.display_name}</p>
                        <p className="text-xs text-gray-500">طلب أسبوعي: {v.weekly_demand} ساق</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">المخزون يكفي</p>
                        <p className="font-bold text-purple-700 text-sm tabular-nums">{weeksLeft} أسبوع</p>
                        <p className="text-xs text-purple-500">طلب مقترح: {suggestedOrder} ساق</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Margin analysis */}
          <Section title="تحليل الهامش لكل صنف" icon={TrendingUp}>
            {margin.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">أضف أسعار البيع من بيانات الورد لحساب الهامش</p>
            ) : (
              <div className="space-y-2">
                {margin.filter(v => parseFloat(v.min_price) > 0).map(v => {
                  const pct = parseFloat(v.margin_pct || 0);
                  const color = pct >= 50 ? "bg-emerald-400" : pct >= 30 ? "bg-amber-400" : "bg-red-400";
                  const textColor = pct >= 50 ? "text-emerald-600" : pct >= 30 ? "text-amber-600" : "text-red-500";
                  return (
                    <div key={v.variant_id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{v.display_name}</p>
                          <div className="flex items-center gap-3 shrink-0 mr-2">
                            <span className="text-xs text-gray-400">تكلفة: {parseFloat(v.avg_cost).toFixed(2)} ر.س</span>
                            <span className="text-xs text-gray-400">سعر: {parseFloat(v.min_price).toFixed(2)} ر.س</span>
                            <span className={clsx("text-xs font-bold tabular-nums", textColor)}>{pct}%</span>
                          </div>
                        </div>
                        <div className="bg-gray-100 rounded-full h-2">
                          <div className={clsx("h-2 rounded-full", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Waste analysis */}
          <Section title="تحليل الهدر" icon={AlertTriangle} defaultOpen={false}>
            {highWaste.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">لا يوجد هدر مرتفع — ممتاز!</p>
            ) : (
              <div className="space-y-2">
                {waste.filter(v => parseFloat(v.waste_units || 0) > 0).map(v => {
                  const pct = parseFloat(v.waste_rate_pct || 0);
                  return (
                    <div key={v.variant_id} className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{v.display_name}</p>
                        <p className="text-xs text-gray-400">{v.origin} · {v.grade}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={clsx("font-bold text-sm tabular-nums", pct >= 30 ? "text-red-600" : pct >= 15 ? "text-orange-500" : "text-amber-500")}>
                          {pct}% هدر
                        </p>
                        <p className="text-xs text-gray-500">{parseFloat(v.waste_units).toFixed(0)} ساق / {parseFloat(v.waste_cost).toFixed(0)} ر.س</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Demand velocity */}
          <Section title="سرعة الطلب الأسبوعي" icon={BarChart3} defaultOpen={false}>
            {velocity.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">لا توجد بيانات استهلاك</p>
            ) : (
              <div className="space-y-3">
                {velocity.slice(0, 10).map((v, i) => {
                  const maxD = parseFloat(velocity[0]?.weekly_demand || 1);
                  const pct  = maxD > 0 ? (parseFloat(v.weekly_demand) / maxD) * 100 : 0;
                  return (
                    <div key={v.variant_id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 tabular-nums">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-800 truncate">{v.display_name}</p>
                          <p className="text-xs text-gray-500 tabular-nums shrink-0 mr-2">{v.weekly_demand} ساق/أسبوع</p>
                        </div>
                        <div className="bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className={clsx("text-xs tabular-nums shrink-0 w-16 text-left",
                        parseFloat(v.current_stock) < parseFloat(v.weekly_demand) ? "text-red-500 font-bold" : "text-gray-500"
                      )}>
                        {v.current_stock} في المخزن
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
