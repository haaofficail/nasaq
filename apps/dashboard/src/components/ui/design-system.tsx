import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, forwardRef, useEffect, useRef } from "react";
import { X } from "lucide-react";

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
    "bg-[#5b9bd5] text-white hover:bg-[#4a8ac4] active:bg-[#3979B3] shadow-sm hover:shadow-md",
  secondary:
    "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100 shadow-sm",
  ghost: "text-gray-500 hover:bg-gray-100 active:bg-gray-200",
  danger: "bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 border border-red-100",
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
  default: "bg-white border border-gray-100 shadow-sm",
  glass: "backdrop-blur-xl bg-white/80 border border-white/20 shadow-sm",
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
  ({ label, hint, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-gray-700">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`
              w-full h-11 rounded-xl border px-4 text-sm bg-white
              transition-all duration-200 outline-none
              placeholder:text-gray-400 text-gray-900
              ${icon ? "pr-10" : ""}
              ${
                error
                  ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-gray-200 focus:border-[#5b9bd5] focus:ring-2 focus:ring-[#5b9bd5]/20"
              }
              disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
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
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  yellow: "bg-amber-50 text-amber-700 border-amber-100",
  red: "bg-red-50 text-red-700 border-red-100",
  gray: "bg-gray-50 text-gray-600 border-gray-200",
  purple: "bg-purple-50 text-purple-700 border-purple-100",
};

const badgeDotColors: Record<BadgeColor, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  gray: "bg-gray-400",
  purple: "bg-purple-500",
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
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
          bg-white rounded-2xl shadow-2xl w-full flex flex-col
          modal-content-enter
          ${modalMaxWidths[maxWidth]}
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 flex-1 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
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
      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-5 max-w-xs leading-relaxed">{description}</p>}
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
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              <span className={item.href ? "hover:text-gray-600 cursor-pointer" : "text-gray-500"}>
                {item.label}
              </span>
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{title}</h1>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
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
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-gray-400";
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "–";

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
          <p className="text-2xl font-bold text-gray-900 leading-none">
            {value}
            {suffix && <span className="text-sm font-medium text-gray-400 mr-1">{suffix}</span>}
          </p>
          {change !== undefined && (
            <p className={`text-xs mt-1.5 font-medium ${trendColor}`}>
              {trendIcon} {Math.abs(change)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-[#5b9bd5]/10 flex items-center justify-center text-[#5b9bd5] shrink-0">
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
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-${col.align || "right"}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? (
                  <div className="text-center py-12 text-sm text-gray-400">لا توجد بيانات</div>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors ${onRowClick ? "hover:bg-gray-50 cursor-pointer" : ""}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 text-${col.align || "right"} text-gray-700`}
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
      <div className={`rounded-2xl bg-gray-100 animate-pulse ${className}`} style={{ minHeight: 120 }} />
    );
  }
  if (variant === "circle") {
    return <div className={`rounded-full bg-gray-100 animate-pulse ${className}`} />;
  }
  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-4 rounded-xl bg-gray-100 animate-pulse ${i === lines - 1 ? "w-2/3" : "w-full"} ${className}`}
          />
        ))}
      </div>
    );
  }
  return <div className={`h-4 rounded-xl bg-gray-100 animate-pulse ${className}`} />;
}
