import { useToastStore } from "@/hooks/useToast";
import { clsx } from "clsx";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-2 min-w-72 max-w-sm" dir="rtl">
      {toasts.map(t => (
        <div key={t.id} className={clsx(
          "flex items-start gap-3 rounded-2xl px-4 py-3 shadow-lg border text-sm font-medium",
          t.type === "success" && "bg-green-50 border-green-100 text-green-800",
          t.type === "error"   && "bg-red-50   border-red-100   text-red-800",
          t.type === "info"    && "bg-blue-50  border-blue-100  text-blue-800",
        )}>
          {t.type === "success" && <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />}
          {t.type === "error"   && <AlertCircle  className="w-4 h-4 mt-0.5 shrink-0 text-red-500"   />}
          {t.type === "info"    && <Info          className="w-4 h-4 mt-0.5 shrink-0 text-blue-500"  />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
