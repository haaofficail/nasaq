import { clsx } from "clsx";
import { bookingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

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
  const { data } = useApi(() => bookingsApi.list({ limit: "50" }), []);
  const bookings: any[] = data?.data || [];

  const counts = bookings.reduce((acc: any, b: any) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});
  const total = bookings.length || 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900 text-sm">حالة الحجوزات</h2>
        <p className="text-xs text-gray-400 mt-0.5">التوزيع الحالي</p>
      </div>
      <div className="space-y-3">
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
    </div>
  );
}
