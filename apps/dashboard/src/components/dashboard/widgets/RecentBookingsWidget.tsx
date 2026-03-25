import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { CalendarCheck, Clock, ArrowLeft } from "lucide-react";
import { bookingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:     { label: "بانتظار",     color: "text-amber-600 bg-amber-50" },
  confirmed:   { label: "مؤكد",        color: "text-blue-600 bg-blue-50" },
  in_progress: { label: "قيد التنفيذ", color: "text-purple-600 bg-purple-50" },
  completed:   { label: "مكتمل",       color: "text-green-600 bg-green-50" },
  cancelled:   { label: "ملغي",        color: "text-red-500 bg-red-50" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-100 rounded-lg", className)} />;
}

export function RecentBookingsWidget() {
  const { data, loading } = useApi(() => bookingsApi.list({ limit: "5" }), []);
  const bookings: any[] = data?.data || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h2 className="font-semibold text-gray-900 text-sm">آخر الحجوزات</h2>
        <Link
          to="/dashboard/bookings"
          className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium"
        >
          عرض الكل
          <ArrowLeft className="w-3 h-3 rotate-180" />
        </Link>
      </div>
      <div>
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">لا توجد حجوزات بعد</p>
          </div>
        ) : (
          bookings.slice(0, 5).map((b: any) => {
            const s = statusConfig[b.status] || statusConfig.pending;
            return (
              <Link
                key={b.id}
                to={`/dashboard/bookings/${b.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.color)}>
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {b.customerName || b.customer?.name || "عميل"}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {b.eventDate ? fmtDate(b.eventDate) : "—"}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-sm font-bold text-gray-900 tabular-nums">
                    {Number(b.totalAmount || 0).toLocaleString("en-US")} ر.س
                  </p>
                  <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-medium", s.color)}>
                    {s.label}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
