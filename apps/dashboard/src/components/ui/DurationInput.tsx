import { useState } from "react";
import { clsx } from "clsx";
import { normalizeNumeric } from "@/lib/normalize-input";

type DurationUnit = "minute" | "hour" | "day";

const UNIT_MINS: Record<DurationUnit, number> = { minute: 1, hour: 60, day: 1440 };
const UNIT_LABELS: Record<DurationUnit, string> = { minute: "دقيقة", hour: "ساعة", day: "يوم" };

function bestUnit(minutes: number, allowed: DurationUnit[]): DurationUnit {
  const order: DurationUnit[] = ["day", "hour", "minute"];
  for (const u of order) {
    if (!allowed.includes(u)) continue;
    if (minutes > 0 && minutes % UNIT_MINS[u] === 0) return u;
  }
  return allowed[allowed.length - 1] ?? "minute";
}

interface DurationInputProps {
  /** Value stored in minutes */
  valueMinutes: number;
  /** Returns new value in minutes */
  onChange: (minutes: number) => void;
  units?: DurationUnit[];
  placeholder?: string;
  inputClassName?: string;
  className?: string;
  disabled?: boolean;
}

const inputCls =
  "border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50/60 transition-all bg-white placeholder:text-gray-300";

export function DurationInput({
  valueMinutes,
  onChange,
  units = ["minute", "hour", "day"],
  placeholder = "0",
  className,
  disabled,
}: DurationInputProps) {
  const [unit, setUnit] = useState<DurationUnit>(() => bestUnit(valueMinutes, units));

  const displayValue = valueMinutes > 0 ? valueMinutes / UNIT_MINS[unit] : "";

  const handleValue = (raw: string) => {
    const n = parseFloat(raw) || 0;
    onChange(Math.round(n * UNIT_MINS[unit]));
  };

  const handleUnit = (u: DurationUnit) => {
    setUnit(u);
    // minutes stay the same — just the display changes
  };

  return (
    <div className={clsx("flex gap-2 items-center", className)}>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        placeholder={placeholder}
        dir="ltr"
        disabled={disabled}
        onChange={e => handleValue(normalizeNumeric(e.target.value))}
        className={clsx(inputCls, "w-20")}
      />
      {units.length > 1 ? (
        <select
          value={unit}
          disabled={disabled}
          onChange={e => handleUnit(e.target.value as DurationUnit)}
          className={clsx(inputCls, "w-24")}
        >
          {units.map(u => (
            <option key={u} value={u}>{UNIT_LABELS[u]}</option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-gray-400 w-12">{UNIT_LABELS[units[0] ?? "minute"]}</span>
      )}
    </div>
  );
}
