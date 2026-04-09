import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Sync a key/value pair with URL search params — filters survive page refresh.
 * Usage: const [status, setStatus] = useUrlState("status", "all");
 */
export function useUrlState(key: string, defaultValue = ""): [string, (v: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (v: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === defaultValue || v === "") {
            next.delete(key);
          } else {
            next.set(key, v);
          }
          return next;
        },
        { replace: true },
      );
    },
    [key, defaultValue, setSearchParams],
  );

  return [value, setValue];
}
