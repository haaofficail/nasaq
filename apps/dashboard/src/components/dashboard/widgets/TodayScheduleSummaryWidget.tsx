import { Link } from "react-router-dom";
import { CalendarCheck, Clock, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { bookingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { clsx } from "clsx";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: "معلق",  color: "text-amber-600",   bg: "bg-amber-50" },
  confirmed:   { label: "مؤكد",  color: "text-blue-600",    bg: "bg-blue-50" },
  in_progress: { label: "جارٍ",  color: "text-violet-600",  bg: "bg-violet-50" },
  completed:   { label: "مكتمل", color: "text-emerald-600", bg: "bg-emerald-50" },
  cancelled:   { label: "ملغي",  color: "text-red-500",     bg: "bg-red-50" },
};

export function TodayScheduleSummaryWidget() {
  const today = new Date().toISOString().split("T")[0];
  const { data, loading } = useApi(() => bookingsApi.list({ date: today, limit: "50" }), []);

  const bookings: any[] = data?.data || [];

  const total     = bookings.length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const upcoming  = bookings.filter((b) => ["confirmed", "pending"].includes(b.status));

  // Sort upcoming by scheduledAt
  const sorted = [...upcoming]
    .filter((b) => b.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const todayLabel = new Date().toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">مواعيد اليوم</h2>
            <p className="text-xs text-gray-400 mt-0.5">{todayLabel}</p>
          </div>
        </div>
        <Link
          to="/dashboard/schedule"
          className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium"
        >
          الجدول الكامل
          <ArrowLeft className="w-3 h-3 rotate-180" />
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-0 border-b border-gray-50">
        <div className="flex flex-col items-center py-2.5 border-l border-gray-50">
          <p className="text-lg font-bold text-gray-900 tabular-nums">{loading ? "—" : total}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">إجمالي</p>
        </div>
        <div className="flex flex-col items-center py-2.5 border-l border-gray-50">
          <p className={clsx("text-lg font-bold tabular-nums", upcoming.length > 0 ? "text-blue-600" : "text-gray-400")}>
            {loading ? "—" : upcoming.length}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">قادمة</p>
        </div>
        <div className="flex flex-col items-center py-2.5">
          <p className="text-lg font-bold text-emerald-600 tabular-nums">{loading ? "—" : completed}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">مكتملة</p>
        </div>
      </div>

      {/* Upcoming list */}
      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-5 text-center">
            <CheckCircle2 className="w-7 h-7 text-gray-200 mb-1.5" />
            <p className="text-xs text-gray-400">لا توجد مواعيد اليوم</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {(sorted.length > 0 ? sorted : bookings).slice(0, 4).map((b: any, i: number) => {
              const sc = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
              const time = b.scheduledAt
                ? new Date(b.scheduledAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
                : "—";
              const name = b.customerName ?? b.customer?.name ?? "عميل";
              return (
                <Link
                  key={b.id ?? i}
                  to="/dashboard/schedule"
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", sc.bg)}>
                    <Clock className={clsx("w-3 h-3", sc.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{name}</p>
                    {b.serviceName && (
                      <p className="text-[11px] text-gray-400 truncate">{b.serviceName}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-gray-600 tabular-nums">{time}</p>
                    <p className={clsx("text-[10px]", sc.color)}>{sc.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
