import { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { COLORS, TYPOGRAPHY, MONTHS_AR, DAYS_AR } from "@/lib/design-tokens";

interface CalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  events?: Record<string, number>; // "2026-03-15" -> count
  onDateSelect?: (date: Date) => void;
}

const FONT = TYPOGRAPHY.family;

const EVENT_COLORS = [COLORS.primary, COLORS.warning, COLORS.success];

function pad2(n: number) { return String(n).padStart(2, "0"); }
function toKey(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

export function Calendar({ value, onChange, events = {}, onDateSelect }: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [selected, setSelected]   = useState<Date>(value);

  const firstDay  = new Date(viewYear, viewMonth, 1);
  const lastDay   = new Date(viewYear, viewMonth + 1, 0);
  const startDow  = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();

  // Build grid: 6×7
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

  const isToday     = (d: Date) => toKey(d) === toKey(today);
  const isSelected  = (d: Date) => toKey(d) === toKey(selected);
  const eventCount  = (d: Date) => events[toKey(d)] || 0;

  // Events on selected day
  const selectedKey    = toKey(selected);
  const selectedEvents = events[selectedKey] || 0;

  return (
    <div style={{ fontFamily: FONT, direction: "rtl", width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ ...btnStyle }}><ChevronRight size={16} /></button>
        <span style={{ fontWeight: 600, fontSize: 14, color: COLORS.dark }}>
          {MONTHS_AR[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} style={{ ...btnStyle }}><ChevronLeft size={16} /></button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {DAYS_AR.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: COLORS.muted, padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {cells.map((cell, i) => {
          const on  = isSelected(cell.date);
          const tod = isToday(cell.date);
          const cnt = eventCount(cell.date);
          const dots = Math.min(cnt, 3);

          return (
            <div
              key={i}
              onClick={() => selectDay(cell)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "6px 2px",
                cursor: "pointer",
                borderRadius: 8,
                transition: "background 0.15s",
                background: on
                  ? COLORS.primary
                  : tod
                    ? `${COLORS.primary}10`
                    : "transparent",
              }}
              onMouseEnter={e => {
                if (!on) (e.currentTarget as HTMLElement).style.background = `${COLORS.primary}0d`;
              }}
              onMouseLeave={e => {
                if (!on && !tod) (e.currentTarget as HTMLElement).style.background = "transparent";
                if (tod && !on) (e.currentTarget as HTMLElement).style.background = `${COLORS.primary}10`;
              }}
            >
              <span style={{
                fontSize: 13,
                fontVariantNumeric: "tabular-nums",
                fontWeight: on || tod ? 700 : 400,
                color: on ? "#fff" : tod ? COLORS.primary : cell.thisMonth ? COLORS.dark : "#d1d5db",
                lineHeight: 1,
              }}>
                {cell.date.getDate()}
              </span>
              {/* Event dots */}
              {dots > 0 && (
                <div style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: dots }).map((_, di) => (
                    <span key={di} style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: on ? "#ffffff99" : EVENT_COLORS[di % EVENT_COLORS.length],
                    }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Event list for selected day */}
      {selectedEvents > 0 && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: `${COLORS.primary}08`, borderRadius: 10, borderRight: `3px solid ${COLORS.primary}` }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.primary, margin: 0 }}>
            {selectedEvents} {selectedEvents === 1 ? "موعد" : "مواعيد"} في هذا اليوم
          </p>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 8, border: "none", background: "transparent", cursor: "pointer",
  color: "#64748b", transition: "background 0.15s",
};
