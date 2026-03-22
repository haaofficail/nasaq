import { ReactNode, useEffect, useRef } from "react";
import { X, Loader2, AlertCircle, Inbox } from "lucide-react";
import { clsx } from "clsx";

// ============================================================
// MODAL
// ============================================================

export function Modal({
  open, onClose, title, children, size = "md", footer,
}: {
  open: boolean; onClose: () => void; title: string;
  children: ReactNode; size?: "sm" | "md" | "lg" | "xl"; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} className={clsx("relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh]", sizes[size])}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {/* Footer */}
        {footer && <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

// ============================================================
// INPUT
// ============================================================

export function Input({
  label, name, type = "text", value, onChange, placeholder, required, error, hint,
  prefix, suffix, disabled, dir, min, max, step,
}: {
  label?: string; name: string; type?: string; value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean; error?: string; hint?: string;
  prefix?: string; suffix?: string; disabled?: boolean; dir?: string;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        {prefix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{prefix}</span>}
        <input
          id={name} name={name} type={type} value={value} onChange={onChange}
          placeholder={placeholder} disabled={disabled} dir={dir} min={min} max={max} step={step}
          className={clsx(
            "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors",
            error ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-200" : "border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-100",
            disabled && "bg-gray-50 text-gray-400 cursor-not-allowed",
            prefix && "pr-10", suffix && "pl-16",
          )}
        />
        {suffix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{suffix}</span>}
      </div>
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ============================================================
// TEXTAREA
// ============================================================

export function TextArea({
  label, name, value, onChange, placeholder, rows = 3, required, error,
}: {
  label?: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number; required?: boolean; error?: string;
}) {
  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <textarea
        id={name} name={name} value={value} onChange={onChange}
        placeholder={placeholder} rows={rows}
        className={clsx(
          "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors resize-none",
          error ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-100",
        )}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ============================================================
// SELECT
// ============================================================

export function Select({
  label, name, value, onChange, options, placeholder, required, error,
}: {
  label?: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder?: string; required?: boolean; error?: string;
}) {
  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <select
        id={name} name={name} value={value} onChange={onChange}
        className={clsx(
          "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors appearance-none bg-white",
          error ? "border-red-300" : "border-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-100",
          !value && "text-gray-400",
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ============================================================
// BUTTON
// ============================================================

export function Button({
  children, onClick, type = "button", variant = "primary", size = "md",
  loading, disabled, icon: Icon, className, fullWidth,
}: {
  children: ReactNode; onClick?: () => void; type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg"; loading?: boolean; disabled?: boolean;
  icon?: any; className?: string; fullWidth?: boolean;
}) {
  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-600 hover:bg-gray-100",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };

  return (
    <button
      type={type} onClick={onClick} disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        variants[variant], sizes[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        fullWidth && "w-full",
        className,
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

// ============================================================
// TOGGLE
// ============================================================

export function Toggle({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative w-10 h-6 rounded-full transition-colors",
          checked ? "bg-brand-500" : "bg-gray-200"
        )}
      >
        <span className={clsx(
          "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
          checked ? "right-0.5" : "right-[18px]"
        )} />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

export function EmptyState({ title, description, action, icon: Icon = Inbox }: {
  title: string; description?: string; action?: ReactNode; icon?: any;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-12 h-12 text-gray-300 mb-4" />
      <h3 className="text-base font-medium text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

// ============================================================
// LOADING SKELETON
// ============================================================

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse bg-gray-200 rounded", className)} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={clsx("h-4", j === 0 ? "w-32" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// TOAST / NOTIFICATION
// ============================================================

export function Toast({ message, type = "success", onClose }: {
  message: string; type?: "success" | "error" | "info"; onClose: () => void;
}) {
  const colors = {
    success: "bg-green-50 border-green-200 text-green-700",
    error: "bg-red-50 border-red-200 text-red-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={clsx("fixed bottom-4 left-4 z-50 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium animate-slide-up", colors[type])}>
      {message}
    </div>
  );
}
