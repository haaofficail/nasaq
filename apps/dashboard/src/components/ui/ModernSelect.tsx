import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { clsx } from "clsx";

interface ModernSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: string;
}

export function ModernSelect({ options, value, onChange, placeholder = "اختر...", label, disabled, error }: ModernSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={clsx(
          "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm text-right outline-none transition-all",
          disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white cursor-pointer",
          error
            ? "border border-red-400 ring-[3px] ring-red-400/10"
            : open
              ? "border border-brand-400 ring-[3px] ring-brand-400/10"
              : "border border-gray-200 hover:border-gray-300",
          selected ? "text-gray-900" : "text-gray-400",
        )}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={16}
          className={clsx("text-gray-400 shrink-0 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 left-0 z-50 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {options.map(opt => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={clsx(
                  "w-full flex items-center justify-between px-3.5 py-2 text-sm text-right transition-colors",
                  active
                    ? "bg-brand-50 text-brand-600"
                    : "text-gray-800 hover:bg-gray-50",
                )}
              >
                <span>{opt.label}</span>
                {active && <Check size={14} className="text-brand-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
