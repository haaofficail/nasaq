import { useState, useMemo } from "react";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useNavigate } from "react-router-dom";
import { bookingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { CreateBookingForm } from "@/components/bookings/CreateBookingForm";
import { AIYieldPanel } from "@/components/dashboard/AIYieldPanel";
import { toast } from "@/hooks/useToast";

const DAY_NAMES = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const ARABIC_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const STATUS_COLORS: Record<string, string> = {
  pending:     "bg-amber-100 text-amber-700",
  confirmed:   "bg-blue-100 text-blue-700",
  in_progress: "bg-violet-100 text-violet-700",
  completed:   "bg-emerald-100 text-emerald-700",
  cancelled:   "bg-red-100 text-red-500 line-through",
};

const statusColors: Record<string, string> = {
  pending:     "bg-amber-400",
  confirmed:   "bg-blue-400",
  in_progress: "bg-violet-400",
  completed:   "bg-emerald-400",
  cancelled:   "bg-red-400",
};

// Hours for week view (7–21) and day view (7–23, 30-min slots)
const WEEK_HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7–21
const DAY_SLOTS  = Array.from({ length: 33 }, (_, i) => {       // 7:00–23:00 in 30-min steps
  const totalMinutes = 7 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return { h, m, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
});

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayKey(d: Date) {
  return toISODate(d);
}

function getHour(dateStr: string) {
  return new Date(dateStr).getHours();
}

function getSlotKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getHours()}-${d.getMinutes() < 30 ? 0 : 30}`;
}

function isToday(d: Date) {
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function getWeekDays(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - baseDate.getDay()); // Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [viewMode, setViewMode]         = useState<"month" | "week" | "day">("month");
  const [selectedDay, setSelectedDay]   = useState<Date>(new Date());
  const [createDate, setCreateDate]     = useState<string | null>(null);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ── Month range ────────────────────────────────────────────
  const monthFrom = new Date(year, month, 1).toISOString();
  const monthTo   = new Date(year, month + 1, 0).toISOString();

  // ── Week range ─────────────────────────────────────────────
  const weekDays  = getWeekDays(currentDate);
  const weekFrom  = weekDays[0].toISOString();
  const weekTo    = weekDays[6].toISOString();

  // ── Day range ──────────────────────────────────────────────
  const dayFrom = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate()).toISOString();
  const dayTo   = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate() + 1).toISOString();

  // Month fetch (for month view)
  const { data: calRes, loading: loadingMonth, refetch: refetchMonth } =
    useApi(() => bookingsApi.calendar(monthFrom, monthTo), [monthFrom, monthTo]);

  // Week fetch
  const { data: weekRes, loading: loadingWeek, refetch: refetchWeek } =
    useApi(() => bookingsApi.calendar(weekFrom, weekTo), [weekFrom, weekTo]);

  // Day fetch
  const { data: dayRes, loading: loadingDay, refetch: refetchDay } =
    useApi(() => bookingsApi.calendar(dayFrom, dayTo), [dayFrom, dayTo]);

  const refetch = () => { refetchMonth(); refetchWeek(); refetchDay(); };

  const monthEvents: any[] = calRes?.data  || [];
  const weekEvents:  any[] = weekRes?.data  || [];
  const dayEvents:   any[] = dayRes?.data   || [];

  // Group week events by day key
  const bookingsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    weekEvents.forEach((b: any) => {
      const k = dayKey(new Date(b.eventDate || b.date));
      if (!map[k]) map[k] = [];
      map[k].push(b);
    });
    return map;
  }, [weekEvents]);

  // Group day events by slot key (hour-minute)
  const dayBookingsBySlot = useMemo(() => {
    const map: Record<string, any[]> = {};
    dayEvents.forEach((b: any) => {
      const k = getSlotKey(b.eventDate || b.date);
      if (!map[k]) map[k] = [];
      map[k].push(b);
    });
    return map;
  }, [dayEvents]);

  // ── Month helpers ──────────────────────────────────────────
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay    = new Date(year, month, 1).getDay();
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today       = new Date();

  const getEventsForDay = (day: number) =>
    monthEvents.filter((e: any) => {
      const d = new Date(e.eventDate || e.date);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });

  // ── Navigation ─────────────────────────────────────────────
  const prev = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month - 1));
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() - 1);
      setSelectedDay(d);
      setCurrentDate(d);
    }
  };

  const next = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month + 1));
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() + 1);
      setSelectedDay(d);
      setCurrentDate(d);
    }
  };

  // ── Header label ───────────────────────────────────────────
  const headerLabel = () => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
    }
    if (viewMode === "week") {
      const s = weekDays[0];
      const e = weekDays[6];
      return `${s.getDate()} – ${e.getDate()} ${e.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { month: "long", year: "numeric" })}`;
    }
    return selectedDay.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const loading = viewMode === "month" ? loadingMonth : viewMode === "week" ? loadingWeek : loadingDay;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">التقويم</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-xl border border-[#eef2f6] overflow-hidden text-xs">
            {(["month", "week", "day"] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={clsx("px-3 py-1.5 transition-colors", viewMode === v ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-[#f8fafc]")}>
                {v === "month" ? "شهر" : v === "week" ? "أسبوع" : "يوم"}
              </button>
            ))}
          </div>
          {/* Prev / Next */}
          <div className="flex items-center gap-2 bg-white rounded-2xl border border-[#eef2f6] px-2 py-1.5">
            <button onClick={prev} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-gray-800 min-w-[160px] text-center">
              {headerLabel()}
            </span>
            <button onClick={next} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { label: "معلق",        color: "bg-amber-400" },
          { label: "مؤكد",        color: "bg-blue-400" },
          { label: "جاري",        color: "bg-violet-400" },
          { label: "مكتمل",       color: "bg-emerald-400" },
          { label: "ملغي",        color: "bg-red-400" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={clsx("w-2 h-2 rounded-full", s.color)} />
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {viewMode === "day" && !loading && dayEvents.length > 0 && (
        <AIYieldPanel 
          bookings={dayEvents} 
          date={selectedDay}
          onApply={async (bookingId, newIsoDate) => {
            try {
              await bookingsApi.reschedule(bookingId, { eventDate: newIsoDate });
              toast.success("تم إغلاق الفراغ المهدر بنجاح! وقت جديد متاح الآن.");
              refetch();
            } catch(e: any) {
              toast.error(e.message || "حدث خطأ");
            }
          }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
        </div>
      ) : (
        <>
          {/* ── MONTH VIEW ─────────────────────────────────────── */}
          {viewMode === "month" && (
            <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
              <div className="grid grid-cols-7 border-b border-[#eef2f6]">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={"e" + i} className="h-24 border-b border-l border-gray-50" />
                ))}
                {days.map((day) => {
                  const dayEvents2 = getEventsForDay(day);
                  const isTodayCell =
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear();
                  const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  return (
                    <div key={day}
                      onClick={() => setCreateDate(dayStr)}
                      className={clsx(
                        "h-24 border-b border-l border-gray-50 p-1.5 cursor-pointer hover:bg-blue-50 transition-colors",
                        isTodayCell && "bg-brand-50/40"
                      )}>
                      <span className={clsx(
                        "text-xs font-semibold inline-flex w-6 h-6 rounded-full items-center justify-center",
                        isTodayCell ? "bg-brand-500 text-white" : "text-gray-500"
                      )}>
                        {day}
                      </span>
                      <div className="space-y-0.5 mt-0.5">
                        {dayEvents2.slice(0, 2).map((ev: any, i: number) => (
                          <div key={i} className="flex items-center gap-1"
                            onClick={e => { e.stopPropagation(); navigate(`/dashboard/bookings/${ev.id}`); }}>
                            <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", statusColors[ev.status] || "bg-gray-400")} />
                            <span className="text-[10px] text-gray-600 truncate leading-tight">
                              {ev.customerName || ev.title || "حجز"}
                            </span>
                          </div>
                        ))}
                        {dayEvents2.length > 2 && (
                          <span className="text-[10px] text-gray-400 font-medium"
                            onClick={e => { e.stopPropagation(); setSelectedDay(new Date(year, month, day)); setViewMode("day"); }}>
                            +{dayEvents2.length - 2} أكثر
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── WEEK VIEW ──────────────────────────────────────── */}
          {viewMode === "week" && (
            <div className="overflow-auto max-h-[600px] rounded-2xl border border-[#eef2f6]">
              {/* Header row */}
              <div className="grid grid-cols-8 border-b border-[#eef2f6] sticky top-0 bg-white z-10">
                <div className="p-2" />
                {weekDays.map(day => (
                  <div key={day.toISOString()}
                    className={clsx("p-2 text-center text-xs cursor-pointer hover:bg-blue-50 transition-colors",
                      isToday(day) && "text-brand-600 font-bold")}
                    onClick={() => { setSelectedDay(day); setCurrentDate(day); setViewMode("day"); }}>
                    <div>{ARABIC_DAYS[day.getDay()]}</div>
                    <div className={clsx(
                      "w-7 h-7 rounded-full flex items-center justify-center mx-auto mt-1 text-sm",
                      isToday(day) && "bg-brand-500 text-white"
                    )}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>
              {/* Time rows */}
              {WEEK_HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-8 border-b border-gray-50 min-h-[48px]">
                  <div className="p-2 text-xs text-gray-400 text-left border-l border-[#eef2f6] sticky right-0 bg-white">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {weekDays.map(day => {
                    const k = dayKey(day);
                    const cellBookings = (bookingsByDay[k] || []).filter(b => getHour(b.eventDate || b.date) === hour);
                    return (
                      <div key={day.toISOString()}
                        className="border-l border-gray-50 p-0.5 cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => {
                          setCreateDate(toISODate(day) + "T" + String(hour).padStart(2, "0") + ":00");
                        }}>
                        {cellBookings.map(b => (
                          <div key={b.id}
                            onClick={e => { e.stopPropagation(); navigate(`/dashboard/bookings/${b.id}`); }}
                            className={clsx(
                              "text-[10px] rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer",
                              STATUS_COLORS[b.status] || "bg-gray-100 text-gray-600"
                            )}>
                            {b.customerName || "حجز"}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ── DAY VIEW ───────────────────────────────────────── */}
          {viewMode === "day" && (
            <div className="overflow-auto max-h-[600px] rounded-2xl border border-[#eef2f6]">
              {/* Header */}
              <div className="grid grid-cols-2 border-b border-[#eef2f6] sticky top-0 bg-white z-10">
                <div className="p-2 text-xs text-gray-400" />
                <div className={clsx("p-2 text-center text-xs font-semibold",
                  isToday(selectedDay) ? "text-brand-600" : "text-gray-700")}>
                  <div>{ARABIC_DAYS[selectedDay.getDay()]}</div>
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1 text-sm font-bold",
                    isToday(selectedDay) && "bg-brand-500 text-white"
                  )}>
                    {selectedDay.getDate()}
                  </div>
                </div>
              </div>
              {/* 30-min slots */}
              {DAY_SLOTS.map(({ h, m, label }) => {
                const k = `${h}-${m}`;
                const slotBookings = dayBookingsBySlot[k] || [];
                return (
                  <div key={label} className="grid grid-cols-2 border-b border-gray-50 min-h-[36px]">
                    <div className="p-2 text-xs text-gray-400 border-l border-[#eef2f6] sticky right-0 bg-white">
                      {label}
                    </div>
                    <div className="p-0.5 cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => {
                        setCreateDate(toISODate(selectedDay) + "T" + label + ":00");
                      }}>
                      {slotBookings.map(b => (
                        <div key={b.id}
                          onClick={e => { e.stopPropagation(); navigate(`/dashboard/bookings/${b.id}`); }}
                          className={clsx(
                            "text-[10px] rounded px-1.5 py-0.5 mb-0.5 truncate cursor-pointer",
                            STATUS_COLORS[b.status] || "bg-gray-100 text-gray-600"
                          )}>
                          {b.customerName || "حجز"}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {createDate && (
        <CreateBookingForm
          open
          initialDate={createDate}
          onClose={() => setCreateDate(null)}
          onSuccess={() => { setCreateDate(null); refetch(); }}
        />
      )}

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
        <div className="space-y-3">
          {[
            { q: "لماذا لا تظهر بعض الحجوزات في التقويم؟", a: "التقويم يعرض الحجوزات حسب «تاريخ الحدث» وليس تاريخ الإنشاء. الحجوزات التي لا تحمل تاريخ حدث محدد لن تظهر هنا." },
            { q: "كيف أضيف حجزاً من التقويم مباشرة؟", a: "اضغط على أي خلية زمنية في عرض الأسبوع أو اليوم لفتح نموذج حجز جديد بتاريخ ووقت محددَين مسبقاً." },
            { q: "ما الفرق بين ألوان الحجوزات؟", a: "كل لون يعبّر عن حالة الحجز: أصفر = معلق، أزرق = مؤكد، بنفسجي = قيد التنفيذ، أخضر = مكتمل، أحمر = ملغي." },
            { q: "كيف أمنع التعارض في المواعيد؟", a: "النظام يمنع تلقائياً حجز نفس الموظف أو الأصل في وقتين متداخلين إذا كانت مدة الخدمة محددة بدقة." },
          ].map(faq => (
            <details key={faq.q} className="border border-[#eef2f6] rounded-xl">
              <summary className="px-[10px] py-[6px] text-sm text-gray-700 cursor-pointer font-medium hover:bg-[#f8fafc] rounded-xl">{faq.q}</summary>
              <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
