import { useState, useEffect } from "react";

/**
 * Debounce a value — useful for search inputs to avoid API calls on every keystroke.
 * Usage: const debouncedSearch = useDebounce(search, 300);
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
