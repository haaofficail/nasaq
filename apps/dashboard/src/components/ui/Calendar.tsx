import { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { clsx } from "clsx";
import { MONTHS_AR, DAYS_AR } from "@/lib/design-tokens";

interface CalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  events?: Record<string, number>; // "2026-03-15" -> count
  onDateSelect?: (date: Date) => void;
}

// dot colors: brand / amber / emerald (index 0-2)
const DOT_CLASSES = ["bg-brand-400", "bg-amber-400", "bg-emerald-400"];

function pad2(n: number) { return String(n).padStart(2, "0"); }
function toKey(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

export function Calendar({ value, onChange, events = {}, onDateSelect }: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [selected, setSelected]   = useState<Date>(value);

  const firstDay  = new Date(viewYear, viewMonth, 1);
  const lastDay   = new Date(viewYear, viewMonth + 1, 0);
  const startDow  = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: Array<{ date: Date; thisMonth: boolean }> = [];
  for (let i = 0; i < startDow; i++) {
    cells.push({ date: new Date(viewYear, viewMonth, -startDow + i + 1), thisMonth: false });
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), thisMonth: true });
  }
  while (cells.length < 42) {
    const d = cells.length - startDow - totalDays + 1;
    cells.push({ date: new Date(viewYear, viewMonth + 1, d), thisMonth: false });
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (cell: { date: Date; thisMonth: boolean }) => {
    if (!cell.thisMonth) {
      setViewYear(cell.date.getFullYear());
      setViewMonth(cell.date.getMonth());
    }
    setSelected(cell.date);
    onChange(cell.date);
    onDateSelect?.(cell.date);
  };

  const isToday    = (d: Date) => toKey(d) === toKey(today);
  const isSelected = (d: Date) => toKey(d) === toKey(selected);
  const eventCount = (d: Date) => events[toKey(d)] || 0;

  const selectedEvents = events[toKey(selected)] || 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {MONTHS_AR[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_AR.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((cell, i) => {
          const on   = isSelected(cell.date);
          const tod  = isToday(cell.date);
          const dots = Math.min(eventCount(cell.date), 3);

          return (
            <div
              key={i}
              onClick={() => selectDay(cell)}
              className={clsx(
                "flex flex-col items-center gap-0.5 py-1.5 px-0.5 rounded-lg cursor-pointer transition-colors",
                on  ? "bg-brand-400"
                    : tod ? "bg-brand-50 hover:bg-brand-100"
                           : "hover:bg-brand-50/60",
              )}
            >
              <span className={clsx(
                "text-[13px] tabular-nums leading-none",
                on  ? "font-bold text-white"
                    : tod ? "font-bold text-brand-500"
                           : cell.thisMonth ? "text-gray-800" : "text-gray-300",
              )}>
                {cell.date.getDate()}
              </span>
              {dots > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: dots }).map((_, di) => (
                    <span
                      key={di}
                      className={clsx(
                        "w-1 h-1 rounded-full",
                        on ? "bg-white/70" : DOT_CLASSES[di % DOT_CLASSES.length],
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Event summary for selected day */}
      {selectedEvents > 0 && (
        <div className="mt-3 px-3 py-2.5 bg-brand-50 rounded-xl border-r-[3px] border-brand-400">
          <p className="text-xs font-semibold text-brand-600">
            {selectedEvents} {selectedEvents === 1 ? "موعد" : "مواعيد"} في هذا اليوم
          </p>
        </div>
      )}
    </div>
  );
}
