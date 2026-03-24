import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { AlertTriangle, Package } from "lucide-react";
import { inventoryApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

export function InventoryAlertWidget() {
  const { data, loading } = useApi(() => inventoryApi.report(), []);
  const report = data?.data || {};

  const lowStockItems: any[] = report.lowStock ?? report.lowStockItems ?? [];
  const lowCount = lowStockItems.length || report.lowStockCount || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center", lowCount > 0 ? "bg-amber-50" : "bg-gray-50")}>
            <AlertTriangle className={clsx("w-4 h-4", lowCount > 0 ? "text-amber-500" : "text-gray-400")} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">تنبيهات المخزون</h2>
            <p className="text-xs text-gray-400">أصناف منخفضة المخزون</p>
          </div>
        </div>
        <Link to="/dashboard/inventory" className="text-xs text-brand-500 hover:text-brand-600 font-medium">
          الكل
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-8" />
          ))}
        </div>
      ) : lowCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Package className="w-8 h-8 text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">المخزون في مستواه الطبيعي</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lowStockItems.slice(0, 5).map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700 truncate flex-1">{item.name || item.assetType || "—"}</span>
              <span className="text-xs font-medium text-amber-600 mr-2 shrink-0">
                {item.quantity ?? item.available ?? "—"} متبقي
              </span>
            </div>
          ))}
          {lowCount > 5 && (
            <p className="text-xs text-gray-400 text-center pt-1">+{lowCount - 5} أصناف أخرى</p>
          )}
        </div>
      )}
    </div>
  );
}
