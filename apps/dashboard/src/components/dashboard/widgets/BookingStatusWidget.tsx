import { clsx } from "clsx";
import { CalendarCheck } from "lucide-react";
import { bookingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useBusiness } from "@/hooks/useBusiness";

const statusConfig: Record<string, { label: string; dot: string; bar: string }> = {
  pending:     { label: "بانتظار",     dot: "bg-amber-400",  bar: "bg-amber-400" },
  confirmed:   { label: "مؤكد",        dot: "bg-blue-400",   bar: "bg-blue-400" },
  in_progress: { label: "قيد التنفيذ", dot: "bg-purple-400", bar: "bg-purple-400" },
  completed:   { label: "مكتمل",       dot: "bg-green-400",  bar: "bg-green-400" },
  cancelled:   { label: "ملغي",        dot: "bg-red-400",    bar: "bg-red-400" },
};

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={clsx("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BookingStatusWidget() {
  const biz = useBusiness();
  const { data, loading } = useApi(() => bookingsApi.list({ limit: "50" }), []);
  const bookings: any[] = data?.data || [];

  const counts = bookings.reduce((acc: any, b: any) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});
  const total = bookings.length || 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 text-sm">{"حالة " + biz.terminology.bookings}</h2>
        <p className="text-xs text-gray-400">التوزيع الحالي</p>
      </div>
      {loading ? (
        <div className="space-y-2.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-6 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-4 text-center">
          <CalendarCheck className="w-6 h-6 text-gray-200 mx-auto mb-1.5" />
          <p className="text-xs text-gray-400">{biz.terminology.bookingEmpty}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const count = counts[key] || 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={clsx("w-2 h-2 rounded-full", cfg.dot)} />
                    <span className="text-xs text-gray-600">{cfg.label}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-700">{count}</span>
                </div>
                <MiniBar value={count} max={total} color={cfg.bar} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
