import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { flowerMasterApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

function daysUntil(dateStr: string): number {
  const expiry = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / 86400000);
}

function UrgencyBadge({ days }: { days: number }) {
  if (days <= 0) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
        منتهي
      </span>
    );
  }
  if (days === 1) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
        غداً
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
        {days} أيام
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600">
      {days} أيام
    </span>
  );
}

export function ExpiringBatchesWidget() {
  const { data, loading } = useApi(() => flowerMasterApi.batchesExpiring(7), []);
  const batches: any[] = data?.data ?? [];

  // Sort: soonest expiry first
  const sorted = [...batches].sort((a, b) => {
    const da = a.expiry_date ?? a.expiryDate ?? "";
    const db = b.expiry_date ?? b.expiryDate ?? "";
    return da.localeCompare(db);
  });

  const criticalCount = sorted.filter((b) => {
    const d = b.expiry_date ?? b.expiryDate;
    return d && daysUntil(d) <= 2;
  }).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className={clsx(
            "w-8 h-8 rounded-xl flex items-center justify-center",
            criticalCount > 0 ? "bg-red-50" : batches.length > 0 ? "bg-amber-50" : "bg-gray-50"
          )}>
            <AlertTriangle className={clsx(
              "w-4 h-4",
              criticalCount > 0 ? "text-red-500" : batches.length > 0 ? "text-amber-500" : "text-gray-400"
            )} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">دفعات قاربت الانتهاء</h2>
            <p className="text-xs text-gray-400 mt-0.5">خلال 7 أيام القادمة</p>
          </div>
        </div>
        <Link
          to="/dashboard/flower-master"
          className="text-xs text-brand-500 hover:text-brand-600 font-medium"
        >
          إدارة الدفعات
        </Link>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-2.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-10" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-300 mb-2" />
            <p className="text-sm text-gray-400">لا توجد دفعات ستنتهي قريباً</p>
            <p className="text-xs text-gray-300 mt-0.5">كل المخزون بحالة جيدة</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.slice(0, 6).map((batch: any, i: number) => {
              const name = batch.display_name_ar ?? batch.flower_type ?? "—";
              const qty = parseInt(batch.quantity_remaining ?? batch.remaining ?? batch.quantity ?? 0);
              const dateStr = batch.expiry_date ?? batch.expiryDate;
              const days = dateStr ? daysUntil(dateStr) : null;
              const isUrgent = days !== null && days <= 2;

              return (
                <div
                  key={i}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                    isUrgent ? "bg-red-50" : "bg-gray-50 hover:bg-gray-100"
                  )}
                >
                  <div className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    isUrgent ? "bg-red-100" : "bg-amber-100"
                  )}>
                    <Clock className={clsx("w-3.5 h-3.5", isUrgent ? "text-red-500" : "text-amber-600")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx("text-sm font-medium truncate", isUrgent ? "text-red-700" : "text-gray-800")}>
                      {name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
                      {qty.toLocaleString("ar-SA")} ساق متبقي
                    </p>
                  </div>
                  {days !== null && <UrgencyBadge days={days} />}
                </div>
              );
            })}
            {sorted.length > 6 && (
              <Link
                to="/dashboard/flower-master"
                className="block text-center text-xs text-brand-500 hover:text-brand-600 font-medium pt-1"
              >
                +{sorted.length - 6} دفعة أخرى
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
