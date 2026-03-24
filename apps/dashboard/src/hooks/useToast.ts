import { useEffect, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

// Module-level event emitter — no React context needed
type Listener = (toast: Toast) => void;
const listeners: Listener[] = [];

function emit(toast: Toast) {
  listeners.forEach(l => l(toast));
}

let counter = 0;

export const toast = {
  success: (message: string) => emit({ id: String(++counter), type: "success", message }),
  error:   (message: string) => emit({ id: String(++counter), type: "error",   message }),
  info:    (message: string) => emit({ id: String(++counter), type: "info",    message }),
};

export function useToastStore() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, 4000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  return { toasts, dismiss };
}
