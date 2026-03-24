import { useApi, useMutation } from "@/hooks/useApi";
import { rentalApi } from "@/lib/api";
import { BarChart3, AlertTriangle, DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

export function RentalAnalyticsPage() {
  const { data, loading } = useApi(() => rentalApi.analytics(), []);
  const recoverMut = useMutation((id: string) => rentalApi.recoverDamage(id));

  const analytics = data?.data;
  const revenueByType: any[] = analytics?.revenueByType || [];
  const utilization:   any[] = analytics?.utilization   || [];
  const overdue:       any[] = analytics?.overdue        || [];
  const damage        = analytics?.damage;
  const maintenance:  any[]  = analytics?.maintenance   || [];

  const maxRevenue = Math.max(...revenueByType.map(r => parseFloat(r.total_revenue || 0)), 1);
  const maxDaysRented = Math.max(...utilization.map(u => parseFloat(u.days_rented || 0)), 1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-500" /> تحليلات التأجير
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">الإيرادات، الاستخدام، العقود المتأخرة، الأضرار</p>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : (
        <>
          {/* Overdue alert */}
          {overdue.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <p className="font-semibold text-red-700 flex items-center gap-2 mb-3 text-sm">
                <AlertTriangle className="w-4 h-4" /> {overdue.length} عقد متأخر عن موعد الإرجاع
              </p>
              <div className="space-y-2">
                {overdue.map(c => (
                  <div key={c.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{c.title}</p>
                      <p className="text-xs text-gray-400">{c.contract_number} · {c.customer_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-red-600 tabular-nums">{c.days_overdue} يوم تأخير</p>
                      <p className="text-xs text-gray-400">كان المقرر: {c.end_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Damage summary */}
          {damage && parseFloat(damage.with_damage || 0) > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "إجمالي الأضرار",  value: `${parseFloat(damage.total_damage_cost || 0).toFixed(0)} ر.س`, color: "text-red-500 bg-red-50" },
                { label: "تم استرداده",      value: `${parseFloat(damage.recovered || 0).toFixed(0)} ر.س`,       color: "text-emerald-600 bg-emerald-50" },
                { label: "غير مسترد",       value: `${parseFloat(damage.unrecovered || 0).toFixed(0)} ر.س`,     color: "text-orange-600 bg-orange-50" },
              ].map(({ label, value, color }) => (
                <div key={label} className={clsx("rounded-2xl border border-transparent p-4 text-center", color.split(" ")[1])}>
                  <p className={clsx("text-xl font-bold tabular-nums", color.split(" ")[0])}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Revenue by asset type */}
          {revenueByType.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-brand-500" /> الإيرادات حسب نوع الأصل
              </p>
              <div className="space-y-3">
                {revenueByType.map(r => {
                  const pct = (parseFloat(r.total_revenue) / maxRevenue) * 100;
                  return (
                    <div key={r.asset_type} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{r.asset_type}</p>
                          <div className="flex items-center gap-3 shrink-0 mr-2">
                            <span className="text-xs text-gray-400">{r.contracts} عقد</span>
                            <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                              {parseFloat(r.total_revenue).toFixed(0)} ر.س
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Asset utilization */}
          {utilization.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-500" /> معدل استخدام الأصول (أيام الإيجار)
              </p>
              <div className="space-y-3">
                {utilization.map(u => {
                  const days = parseFloat(u.days_rented || 0);
                  const pct  = (days / maxDaysRented) * 100;
                  const isInUse = u.status === "in_use";
                  return (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm text-gray-800 truncate">{u.name || u.serial_number}</p>
                            <span className="text-xs text-gray-400 shrink-0">{u.asset_type}</span>
                            {isInUse && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">مستخدم</span>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0 mr-2">
                            <span className="text-xs text-gray-400 tabular-nums">{days} يوم</span>
                            <span className="text-xs font-semibold text-emerald-600 tabular-nums">
                              {parseFloat(u.total_revenue || 0).toFixed(0)} ر.س
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-100 rounded-full h-2">
                          <div className={clsx("h-2 rounded-full", pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-gray-300")}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Maintenance costs */}
          {maintenance.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-500" /> تكلفة الصيانة حسب نوع الأصل
              </p>
              <div className="space-y-2">
                {maintenance.map(m => (
                  <div key={m.asset_type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.asset_type}</p>
                      <p className="text-xs text-gray-400">{m.maintenance_count} عملية صيانة</p>
                    </div>
                    <p className="font-semibold text-gray-700 tabular-nums text-sm">
                      {parseFloat(m.total_cost || 0).toFixed(0)} ر.س
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!revenueByType.length && !overdue.length && (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
              <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا توجد بيانات بعد — أضف عقوداً وأصولاً لرؤية التحليلات</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
