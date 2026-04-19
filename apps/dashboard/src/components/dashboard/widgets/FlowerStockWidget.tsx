import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { Flower2, ArrowLeft, Package } from "lucide-react";
import { flowerMasterApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

// Colour the stock bar based on how full it is relative to the max variant
function StockBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const color =
    pct < 15 ? "bg-red-400" :
    pct < 35 ? "bg-amber-400" :
    "bg-emerald-400";

  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={clsx("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function FlowerStockWidget() {
  const { data: stockRes, loading } = useApi(() => flowerMasterApi.stockReport(), []);
  const { data: expiringRes } = useApi(() => flowerMasterApi.batchesExpiring(3), []);

  const rawStock: any[] = stockRes?.data ?? [];
  const expiring: any[] = expiringRes?.data ?? [];

  // Sort: lowest stock first (most critical at top)
  const stock = [...rawStock].sort(
    (a, b) => parseInt(a.total_remaining || 0) - parseInt(b.total_remaining || 0)
  );

  const totalStems = stock.reduce((s: number, r: any) => s + parseInt(r.total_remaining || 0), 0);
  const variantCount = stock.length;
  const expiringCount = expiring.length;
  const maxStems = stock.length > 0 ? parseInt(stock[stock.length - 1]?.total_remaining || 0) : 1;
  const lowStockCount = stock.filter((r) => parseInt(r.total_remaining || 0) < 50).length;

  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
            <Flower2 className="w-4 h-4 text-pink-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">مخزون الورد</h2>
            <p className="text-xs text-gray-400">حالة المخزون الآن · مرتب حسب الأدنى</p>
          </div>
        </div>
        <Link
          to="/dashboard/flower-master"
          className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium"
        >
          إدارة البيانات
          <ArrowLeft className="w-3 h-3 rotate-180" />
        </Link>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-pink-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-pink-600 tabular-nums">{totalStems.toLocaleString("en-US")}</p>
          <p className="text-[11px] text-pink-400 mt-0.5">إجمالي السيقان</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-600 tabular-nums">{variantCount}</p>
          <p className="text-[11px] text-emerald-400 mt-0.5">نوع متاح</p>
        </div>
        <div className={clsx("rounded-xl p-3 text-center", lowStockCount > 0 ? "bg-red-50" : "bg-[#f8fafc]")}>
          <p className={clsx("text-xl font-bold tabular-nums", lowStockCount > 0 ? "text-red-600" : "text-gray-400")}>
            {lowStockCount}
          </p>
          <p className={clsx("text-[11px] mt-0.5", lowStockCount > 0 ? "text-red-400" : "text-gray-400")}>
            مخزون منخفض
          </p>
        </div>
        <div className={clsx("rounded-xl p-3 text-center", expiringCount > 0 ? "bg-amber-50" : "bg-[#f8fafc]")}>
          <p className={clsx("text-xl font-bold tabular-nums", expiringCount > 0 ? "text-amber-600" : "text-gray-400")}>
            {expiringCount}
          </p>
          <p className={clsx("text-[11px] mt-0.5", expiringCount > 0 ? "text-amber-400" : "text-gray-400")}>
            تنتهي 3 أيام
          </p>
        </div>
      </div>

      {/* Stock list with visual bars */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="animate-pulse bg-gray-100 rounded h-3.5 w-32" />
              <div className="animate-pulse bg-gray-100 rounded-full h-1.5 w-full" />
            </div>
          ))}
        </div>
      ) : stock.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Package className="w-8 h-8 text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">لا يوجد مخزون مسجّل</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stock.slice(0, 8).map((r: any, i: number) => {
            const stems = parseInt(r.total_remaining || 0);
            const isLow = stems < 50;
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className={clsx("text-xs font-medium truncate flex-1", isLow ? "text-red-600" : "text-gray-700")}>
                    {r.display_name_ar || r.flower_type}
                    {isLow && (
                      <span className="mr-1.5 text-[10px] font-normal text-red-400">(منخفض)</span>
                    )}
                  </span>
                  <span className={clsx("text-xs tabular-nums font-semibold shrink-0 mr-3", isLow ? "text-red-600" : "text-gray-900")}>
                    {stems.toLocaleString("en-US")} ساق
                  </span>
                </div>
                <StockBar value={stems} max={maxStems} />
              </div>
            );
          })}
          {stock.length > 8 && (
            <Link
              to="/dashboard/flower-master"
              className="block text-center text-xs text-brand-500 hover:text-brand-600 font-medium pt-1"
            >
              +{stock.length - 8} أنواع أخرى
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
