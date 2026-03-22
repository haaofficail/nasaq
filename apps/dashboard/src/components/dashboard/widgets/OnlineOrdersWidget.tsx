import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { ShoppingBag, Clock, CheckCircle2 } from "lucide-react";
import { onlineOrdersApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

export function OnlineOrdersWidget() {
  const { data, loading } = useApi(() => onlineOrdersApi.stats(), []);
  const stats = data?.data || {};

  const total     = stats.total     ?? stats.todayTotal  ?? 0;
  const pending   = stats.pending   ?? 0;
  const completed = stats.completed ?? 0;
  const revenue   = Number(stats.revenue ?? stats.todayRevenue ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">الطلبات الإلكترونية</h2>
            <p className="text-xs text-gray-400">اليوم</p>
          </div>
        </div>
        <Link to="/dashboard/online-orders" className="text-xs text-brand-500 hover:text-brand-600 font-medium">
          عرض الكل
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-orange-50 rounded-xl p-3 text-center">
          <p className={clsx("text-2xl font-bold text-orange-600 tabular-nums", loading && "opacity-30")}>
            {loading ? "—" : total}
          </p>
          <p className="text-xs text-orange-400 mt-0.5">إجمالي الطلبات</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className={clsx("text-2xl font-bold text-emerald-600 tabular-nums", loading && "opacity-30")}>
            {loading ? "—" : revenue.toLocaleString("ar-SA")}
          </p>
          <p className="text-xs text-emerald-400 mt-0.5">إيرادات · ر.س</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-gray-600">بانتظار التنفيذ</span>
          </div>
          <span className="font-medium text-gray-700">{loading ? "—" : pending}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-gray-600">مكتملة</span>
          </div>
          <span className="font-medium text-gray-700">{loading ? "—" : completed}</span>
        </div>
      </div>
    </div>
  );
}
