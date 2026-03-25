import { useState } from "react";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { bookingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

const DAY_NAMES = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const statusColors: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-blue-400",
  in_progress: "bg-violet-400",
  completed: "bg-emerald-400",
  cancelled: "bg-red-400",
};

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const from = new Date(year, month, 1).toISOString();
  const to = new Date(year, month + 1, 0).toISOString();

  const { data: calRes, loading } = useApi(() => bookingsApi.calendar(from, to), [from, to]);
  const events: any[] = calRes?.data || [];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const today = new Date();

  const prev = () => setCurrentDate(new Date(year, month - 1));
  const next = () => setCurrentDate(new Date(year, month + 1));

  const getEventsForDay = (day: number) =>
    events.filter((e: any) => {
      const d = new Date(e.eventDate || e.date);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">التقويم</h1>
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-100 px-2 py-1.5">
          <button onClick={prev} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
            {currentDate.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { month: "long", year: "numeric" })}
          </span>
          <button onClick={next} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { label: "معلق", color: "bg-amber-400" },
          { label: "مؤكد", color: "bg-blue-400" },
          { label: "جاري", color: "bg-violet-400" },
          { label: "مكتمل", color: "bg-emerald-400" },
          { label: "ملغي", color: "bg-red-400" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={clsx("w-2 h-2 rounded-full", s.color)} />
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={"e" + i} className="h-24 border-b border-l border-gray-50" />
            ))}

            {/* Day cells */}
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();

              return (
                <div
                  key={day}
                  className={clsx(
                    "h-24 border-b border-l border-gray-50 p-1.5",
                    isToday && "bg-brand-50/40"
                  )}
                >
                  <span className={clsx(
                    "text-xs font-semibold inline-flex w-6 h-6 rounded-full items-center justify-center",
                    isToday
                      ? "bg-brand-500 text-white"
                      : "text-gray-500"
                  )}>
                    {day}
                  </span>
                  <div className="space-y-0.5 mt-0.5">
                    {dayEvents.slice(0, 2).map((ev: any, i: number) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", statusColors[ev.status] || "bg-gray-400")} />
                        <span className="text-[10px] text-gray-600 truncate leading-tight">
                          {ev.customerName || ev.title || "حجز"}
                        </span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        +{dayEvents.length - 2} أكثر
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
