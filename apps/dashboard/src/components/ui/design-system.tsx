import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, forwardRef, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-lock";
import { normalizeNumeric, normalizePhone } from "@/lib/normalize-input";

// ─── Button ─────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "start" | "end";
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-hover active:bg-brand-dark shadow-token-sm hover:shadow-token-md",
  secondary:
    "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] shadow-token-sm",
  ghost: "text-[var(--text-2)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)]",
  danger: "bg-danger-soft text-danger hover:bg-danger/10 active:bg-danger/20 border border-danger-soft",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "start",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-xl
        transition-all duration-200 cursor-pointer select-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${buttonVariants[variant]}
        ${buttonSizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === "start" && <span className="shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === "end" && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

type CardVariant = "default" | "glass";

interface CardProps {
  variant?: CardVariant;
  padding?: "sm" | "md" | "lg" | "none";
  hover?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

const cardVariants: Record<CardVariant, string> = {
  default: "bg-[var(--surface)] border border-[var(--border)] shadow-token-sm",
  glass: "backdrop-blur-xl bg-[var(--surface)]/80 border border-[var(--border)] shadow-token-sm",
};

const cardPaddings = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  variant = "default",
  padding = "md",
  hover = false,
  className = "",
  children,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl transition-all duration-200
        ${cardVariants[variant]}
        ${cardPaddings[padding]}
        ${hover ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, icon, className = "", type = "text", onChange, ...props }, ref) => {
    const isNumeric = type === "number";
    const isTel     = type === "tel";
    const actualType = isNumeric ? "text" : type;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isNumeric) e.target.value = normalizeNumeric(e.target.value);
      else if (isTel) e.target.value = normalizePhone(e.target.value);
      onChange?.(e);
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-[var(--text-2)]">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            type={actualType}
            inputMode={isNumeric ? "decimal" : isTel ? "tel" : props.inputMode}
            onChange={handleChange}
            className={`
              w-full h-11 rounded-xl border px-4 text-sm bg-[var(--surface)]
              transition-all duration-200 outline-none
              placeholder:text-[var(--text-3)] text-[var(--text-1)]
              ${icon ? "pr-10" : ""}
              ${
                error
                  ? "border-danger/50 focus:border-danger focus:ring-2 focus:ring-danger-soft"
                  : "border-[var(--border)] focus:border-brand focus:ring-2 focus:ring-[var(--brand-focus)]"
              }
              disabled:opacity-50 disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-3)]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeColor = "blue" | "green" | "yellow" | "red" | "gray" | "purple";

interface BadgeProps {
  color?: BadgeColor;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const badgeColors: Record<BadgeColor, string> = {
  blue:   "bg-brand-soft text-brand-700 border-brand-200",
  green:  "bg-success-soft text-success border-success-soft",
  yellow: "bg-warning-soft text-warning border-warning-soft",
  red:    "bg-danger-soft text-danger border-danger-soft",
  gray:   "bg-[var(--surface-3)] text-[var(--text-2)] border-[var(--border)]",
  purple: "bg-lavender-soft text-lavender border-lavender-soft",
};

const badgeDotColors: Record<BadgeColor, string> = {
  blue:   "bg-brand",
  green:  "bg-success",
  yellow: "bg-warning",
  red:    "bg-danger",
  gray:   "bg-[var(--text-3)]",
  purple: "bg-lavender",
};

export function Badge({ color = "gray", children, className = "", dot = false }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${badgeColors[color]}
        ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${badgeDotColors[color]}`} />}
      {children}
    </span>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const modalMaxWidths = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function Modal({ open, onClose, title, children, footer, maxWidth = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Body scroll lock — ref-counted
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => { unlockBodyScroll(); };
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => { document.removeEventListener("keydown", handler); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-enter"
      style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(4px)" }}
    >
      <div
        className={`
          bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-xl)] w-full flex flex-col
          modal-content-enter
          ${modalMaxWidths[maxWidth]}
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <h3 className="text-base font-semibold text-[var(--text-1)]">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-2)] transition-all"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 flex-1 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-3)] mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-1)] mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--text-3)] mb-5 max-w-xs leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}

// ─── PageHeader ──────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text-3)] mb-1">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              <span className={item.href ? "hover:text-[var(--text-1)] cursor-pointer" : "text-[var(--text-2)]"}>
                {item.label}
              </span>
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)] leading-tight">{title}</h1>
          {description && <p className="text-sm text-[var(--text-2)] mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

type StatTrend = "up" | "down" | "neutral";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  change?: number;
  trend?: StatTrend;
  suffix?: string;
  className?: string;
}

export function StatCard({ label, value, icon, change, trend, suffix, className = "" }: StatCardProps) {
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-[var(--text-3)]";
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "–";

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--text-2)] mb-2">{label}</p>
          <p className="text-2xl font-bold text-[var(--text-1)] leading-none">
            {value}
            {suffix && <span className="text-sm font-medium text-[var(--text-3)] mr-1">{suffix}</span>}
          </p>
          {change !== undefined && (
            <p className={`text-xs mt-1.5 font-medium ${trendColor}`}>
              {trendIcon} {Math.abs(change)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-[10px] bg-brand-soft flex items-center justify-center text-brand shrink-0">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
  align?: "right" | "left" | "center";
}

interface TableProps<T extends { id?: string | number }> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  loading?: boolean;
}

export function Table<T extends { id?: string | number }>({
  columns,
  data,
  onRowClick,
  emptyState,
  loading = false,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="line" className="h-12" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface-2)] border-b border-[var(--border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`px-4 py-3 text-xs font-medium text-[var(--text-3)] uppercase tracking-wide text-${col.align || "right"}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? (
                  <div className="text-center py-12 text-sm text-[var(--text-3)]">لا توجد بيانات</div>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors ${onRowClick ? "hover:bg-[var(--surface-2)] cursor-pointer" : ""}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-[10px] py-[6px] text-${col.align || "right"} text-[var(--text-1)]`}
                  >
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

interface SkeletonProps {
  variant?: "line" | "card" | "circle";
  className?: string;
  lines?: number;
}

export function Skeleton({ variant = "line", className = "", lines = 1 }: SkeletonProps) {
  if (variant === "card") {
    return (
      <div className={`rounded-2xl bg-[var(--surface-3)] animate-pulse ${className}`} style={{ minHeight: 120 }} />
    );
  }
  if (variant === "circle") {
    return <div className={`rounded-full bg-[var(--surface-3)] animate-pulse ${className}`} />;
  }
  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-4 rounded-xl bg-[var(--surface-3)] animate-pulse ${i === lines - 1 ? "w-2/3" : "w-full"} ${className}`}
          />
        ))}
      </div>
    );
  }
  return <div className={`h-4 rounded-xl bg-[var(--surface-3)] animate-pulse ${className}`} />;
}
