import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { clsx } from "clsx";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchInputProps {
  /** Current search value (controlled) */
  value?: string;
  /** Called with the debounced value */
  onSearch: (q: string) => void;
  /** Debounce delay in ms (default: 300) */
  delay?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Search input with built-in debounce + clear button.
 *
 * Usage:
 *   <SearchInput onSearch={setSearch} placeholder="ابحث بالاسم أو الجوال..." />
 */
export function SearchInput({
  value: controlledValue,
  onSearch,
  delay = 300,
  placeholder = "بحث...",
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(controlledValue ?? "");
  const [focused, setFocused] = useState(false);
  const debouncedValue = useDebounce(localValue, delay);

  // Sync controlled value
  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== localValue) {
      setLocalValue(controlledValue);
    }
  }, [controlledValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Emit debounced value
  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const clear = useCallback(() => {
    setLocalValue("");
    onSearch("");
  }, [onSearch]);

  return (
    <div className={clsx("relative", className)}>
      <Search
        size={14}
        className={clsx(
          "absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none",
          focused ? "text-brand-400" : "text-gray-400",
        )}
      />
      <input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={clsx(
          "pr-8 pl-8 py-1.5 rounded-xl text-[13px] text-gray-900 bg-gray-50 outline-none transition-all w-48 placeholder:text-gray-400",
          focused
            ? "border border-brand-400 ring-[3px] ring-brand-400/10"
            : "border border-gray-200 hover:border-gray-300",
        )}
      />
      {localValue && (
        <button
          onClick={clear}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          type="button"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
