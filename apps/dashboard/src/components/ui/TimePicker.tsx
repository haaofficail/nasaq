import { useState, useCallback } from "react";
import { clsx } from "clsx";

// Brand color hex — used only for SVG attributes (fill/stroke) which don't accept Tailwind classes
const BRAND = "#5b9bd5";
const BORDER_COLOR = "#e2e8f0";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  format?: "12" | "24";
}

const SIZE   = 220;
const CX     = SIZE / 2;
const CY     = SIZE / 2;
const HAND_R = 75;
const NUM_R  = 85;

export function TimePicker({ value, onChange, format = "12" }: TimePickerProps) {
  const parseTime = (v: string) => {
    const [h, m] = (v || "09:00").split(":").map(Number);
    return { hours: isNaN(h) ? 9 : h, minutes: isNaN(m) ? 0 : m };
  };

  const { hours: initH, minutes: initM } = parseTime(value);
  const [mode, setMode]       = useState<"hours" | "minutes">("hours");
  const [period, setPeriod]   = useState<"AM" | "PM">(initH >= 12 ? "PM" : "AM");
  const [hours, setHours]     = useState(format === "12" ? (initH % 12 || 12) : initH);
  const [minutes, setMinutes] = useState(initM);

  const emitChange = useCallback((h: number, m: number, p: "AM" | "PM") => {
    let h24 = h;
    if (format === "12") {
      if (p === "AM" && h === 12) h24 = 0;
      else if (p === "PM" && h !== 12) h24 = h + 12;
    }
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }, [format, onChange]);

  const handleClockClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - CX;
    const y = e.clientY - rect.top - CY;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (mode === "hours") {
      const total = format === "12" ? 12 : 24;
      const raw   = Math.round(angle / (360 / total));
      const h     = raw === 0 ? total : raw;
      setHours(h);
      emitChange(h, minutes, period);
      setTimeout(() => setMode("minutes"), 150);
    } else {
      const raw     = Math.round(angle / 6) % 60;
      const snapped = Math.round(raw / 5) * 5 % 60;
      setMinutes(snapped);
      emitChange(hours, snapped, period);
    }
  };

  const handlePeriod = (p: "AM" | "PM") => {
    setPeriod(p);
    emitChange(hours, minutes, p);
  };

  const displayH = String(hours).padStart(2, "0");
  const displayM = String(minutes).padStart(2, "0");

  const items: number[] = mode === "hours"
    ? (format === "12" ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 12 }, (_, i) => i * 2))
    : Array.from({ length: 12 }, (_, i) => i * 5);

  const activeVal   = mode === "hours" ? hours : minutes;
  const activeAngle = mode === "hours"
    ? (hours / (format === "12" ? 12 : 24)) * 360 - 90
    : (minutes / 60) * 360 - 90;

  const handX = CX + HAND_R * Math.cos((activeAngle * Math.PI) / 180);
  const handY = CY + HAND_R * Math.sin((activeAngle * Math.PI) / 180);

  return (
    <div className="inline-flex flex-col items-center gap-3">
      {/* Time display */}
      <div className="flex items-center gap-1 text-[38px] font-semibold tabular-nums tracking-tight">
        <span
          onClick={() => setMode("hours")}
          className={clsx("cursor-pointer transition-colors", mode === "hours" ? "text-brand-400" : "text-gray-900")}
        >
          {displayH}
        </span>
        <span className="text-gray-400">:</span>
        <span
          onClick={() => setMode("minutes")}
          className={clsx("cursor-pointer transition-colors", mode === "minutes" ? "text-brand-400" : "text-gray-900")}
        >
          {displayM}
        </span>
        {format === "12" && (
          <div className="flex flex-col gap-0.5 mr-2">
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriod(p)}
                className={clsx(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-lg transition-all border-0",
                  period === p ? "bg-brand-400 text-white" : "bg-gray-200 text-gray-500",
                )}
              >
                {p === "AM" ? "ص" : "م"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clock face SVG — fill/stroke are SVG attrs, must use hex */}
      <svg width={SIZE} height={SIZE} onClick={handleClockClick} className="cursor-pointer">
        <circle cx={CX} cy={CY} r={CX - 2} fill="#f8fafc" stroke={BORDER_COLOR} strokeWidth={1} />
        <line x1={CX} y1={CY} x2={handX} y2={handY} stroke={BRAND} strokeWidth={2} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={4} fill={BRAND} />
        {items.map((num, i) => {
          const angle = (i / items.length) * 360 - 90;
          const rad   = (angle * Math.PI) / 180;
          const nx    = CX + NUM_R * Math.cos(rad);
          const ny    = CY + NUM_R * Math.sin(rad);
          const on    = num === activeVal;
          return (
            <g key={num}>
              {on && <circle cx={nx} cy={ny} r={16} fill={BRAND} />}
              <text
                x={nx} y={ny} textAnchor="middle" dominantBaseline="central"
                fontSize={13} fontWeight={on ? 600 : 400}
                fill={on ? "#fff" : "#1a1a2e"}
                style={{ userSelect: "none" }}
              >
                {String(num).padStart(2, "0")}
              </text>
            </g>
          );
        })}
        <circle cx={handX} cy={handY} r={4} fill="#fff" stroke={BRAND} strokeWidth={2} />
      </svg>

      {/* Mode switcher */}
      <div className="flex gap-1.5">
        {(["hours", "minutes"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              "text-xs font-medium px-3.5 py-1 rounded-full transition-all border-0",
              mode === m ? "bg-brand-400 text-white" : "bg-gray-200 text-gray-500",
            )}
          >
            {m === "hours" ? "الساعة" : "الدقائق"}
          </button>
        ))}
      </div>
    </div>
  );
}
