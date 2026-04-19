import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle, AlertTriangle, Loader2, RefreshCw, Activity } from "lucide-react";
import { salonApi } from "@/lib/api";
import { clsx } from "clsx";
import { SALON_MONITORING_EVENT_LABELS as EVENT_LABELS } from "@/lib/constants";

// ============================================================
// SALON MONITORING PAGE — صفحة المراقبة التشغيلية
// تعرض مؤشرات اليوم: حجوزات، تعارضات، مخزون، أخطاء
// ============================================================

function StatCard({ label, value, variant = "default" }: {
  label: string;
  value: number | string;
  variant?: "default" | "warn" | "danger" | "success";
}) {
  const colors = {
    default: "bg-white border-[#eef2f6] text-gray-900",
    success: "bg-green-50 border-green-100 text-green-800",
    warn:    "bg-yellow-50 border-yellow-100 text-yellow-800",
    danger:  "bg-red-50 border-red-100 text-red-800",
  };
  return (
    <div className={clsx("rounded-2xl border p-5 flex flex-col gap-1", colors[variant])}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function HealthBadge({ status }: { status: string }) {
  if (status === "healthy") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" /> سليم
    </span>
  );
  if (status === "degraded") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" /> متدهور
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <AlertCircle className="w-3 h-3" /> معطل
    </span>
  );
}


export function SalonMonitoringPage() {
  const [summary, setSummary] = useState<any>(null);
  const [health, setHealth]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, h] = await Promise.all([
        salonApi.monitoringSummary(),
        salonApi.salonHealth(),
      ]);
      if ((s as any)?.error) throw new Error((s as any).error);
      setSummary((s as any)?.data ?? s);
      setHealth(h);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e?.message ?? "تعذّر تحميل بيانات المراقبة");
      // auto-retry after 10s on error so monitoring stays live
      retryRef.current = setTimeout(load, 10_000);
    } finally {
      setLoading(false);
    }
  };

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (retryRef.current)    clearTimeout(retryRef.current);
    };
  }, []);

  if (loading) return (
    <div className="min-h-[300px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
    </div>
  );

  if (error) return (
    <div className="p-6 flex flex-col items-center gap-3 text-center">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-gray-500">{error}</p>
      <button onClick={load} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  const d = summary ?? {};
  const healthChecks = health?.checks ?? {};
  const overallStatus = health?.status === "healthy" || health?.status === "ok" ? "healthy"
    : health?.status === "degraded" ? "degraded"
    : "unhealthy";

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-500" />
          <h1 className="text-lg font-bold text-gray-900">مراقبة التشغيل — الصالون</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>آخر تحديث: {lastRefresh.toLocaleTimeString("ar-SA")}</span>
          <button
            onClick={load}
            className="flex items-center gap-1 text-brand-500 hover:text-brand-600 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </button>
        </div>
      </div>

      {/* Health Checks */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
        <p className="text-xs font-semibold text-gray-500 mb-3">حالة النظام</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { key: "api",           label: "API" },
            { key: "db",            label: "قاعدة البيانات" },
            { key: "bookingFlow",   label: "تدفق الحجوزات" },
            { key: "inventoryFlow", label: "تدفق المخزون" },
          ].map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">{label}</span>
              <HealthBadge status={healthChecks[key] ?? overallStatus} />
            </div>
          ))}
        </div>
      </div>

      {/* Today's Stats */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-3">مؤشرات اليوم</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="حجوزات اليوم"     value={d.bookingsToday ?? 0} />
          <StatCard label="مكتملة"            value={d.completedToday ?? 0} variant="success" />
          <StatCard label="بانتظار التأكيد"   value={d.pendingBookings ?? 0} variant="warn" />
          <StatCard label="ملغاة / غياب"     value={d.cancelledToday ?? 0} />
        </div>
      </div>

      {/* Alerts */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-3">تنبيهات تشغيلية</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="رفض بسبب التعارض اليوم"
            value={d.conflictRejectionsToday ?? 0}
            variant={(d.conflictRejectionsToday ?? 0) > 0 ? "warn" : "default"}
          />
          <StatCard
            label="تحذيرات مخزون اليوم"
            value={d.lowStockWarningsToday ?? 0}
            variant={(d.lowStockWarningsToday ?? 0) > 0 ? "warn" : "default"}
          />
          <StatCard
            label="أخطاء مخزون اليوم"
            value={d.inventoryFailuresToday ?? 0}
            variant={(d.inventoryFailuresToday ?? 0) > 0 ? "danger" : "default"}
          />
        </div>
      </div>

      {/* Last Critical Errors */}
      {(d.lastCriticalErrors ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
          <p className="text-xs font-semibold text-gray-500 mb-3">آخر الأحداث الحرجة</p>
          <div className="space-y-2">
            {(d.lastCriticalErrors as any[]).map((e: any) => (
              <div key={e.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-red-700">
                    {EVENT_LABELS[e.eventType] ?? e.eventType}
                  </span>
                  {e.bookingId && (
                    <span className="text-xs text-gray-400 font-mono">
                      حجز: {e.bookingId.slice(0, 8)}
                    </span>
                  )}
                  {e.metadata?.message && (
                    <span className="text-xs text-gray-400">{e.metadata.message}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleTimeString("ar-SA")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(d.lastCriticalErrors ?? []).length === 0 && (
        <div className="bg-green-50 rounded-2xl border border-green-100 p-5 text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-700">لا أحداث حرجة مسجّلة</p>
          <p className="text-xs text-green-500 mt-0.5">النظام يعمل بشكل سليم</p>
        </div>
      )}

      <p className="text-xs text-gray-300 text-left">
        generated: {d.generatedAt ? new Date(d.generatedAt).toLocaleString("ar-SA") : "-"}
      </p>
    </div>
  );
}
