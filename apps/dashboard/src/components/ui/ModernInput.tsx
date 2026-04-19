import { useState, ReactNode } from "react";
import { clsx } from "clsx";
import { normalizeNumeric, normalizePhone } from "@/lib/normalize-input";

interface ModernInputProps {
  label?: string;
  placeholder?: string;
  icon?: ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  dir?: string;
  min?: string | number;
  max?: string | number;
  suffix?: string;
}

export function ModernInput({
  label, placeholder, icon, type = "text", value, onChange,
  name, required, disabled, error, hint, dir, min, max, suffix,
}: ModernInputProps) {
  const [focused, setFocused] = useState(false);

  const isNumeric = type === "number";
  const isTel     = type === "tel";
  const actualType = isNumeric ? "text" : type;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (isNumeric) val = normalizeNumeric(val);
    else if (isTel) val = normalizePhone(val);
    onChange(val);
  };

  return (
    <div>
      {label && (
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          {label}{required && <span className="text-red-500 mr-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className={clsx(
            "absolute right-3 top-1/2 -translate-y-1/2 flex pointer-events-none transition-colors",
            focused ? "text-brand-400" : "text-gray-400",
          )}>
            {icon}
          </span>
        )}
        <input
          name={name}
          type={actualType}
          inputMode={isNumeric ? "decimal" : isTel ? "tel" : undefined}
          value={value}
          dir={dir}
          min={isNumeric ? undefined : (min as any)}
          max={isNumeric ? undefined : (max as any)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={clsx(
            "w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400",
            icon ? "pr-10" : "pr-3.5",
            suffix ? "pl-10" : "pl-3.5",
            disabled ? "bg-gray-50 cursor-not-allowed text-gray-400" : "bg-white",
            error
              ? "border border-red-400 ring-[3px] ring-red-400/10"
              : focused
                ? "border border-brand-400 ring-[3px] ring-brand-400/10"
                : "border border-[#eef2f6] hover:border-[#eef2f6]",
          )}
        />
        {suffix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
