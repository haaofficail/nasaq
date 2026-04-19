import { clsx } from "clsx";

// Arabic labels — source of truth for status display text
const STATUS_LABELS: Record<string, string> = {
  active:    "نشط",
  pending:   "معلّق",
  cancelled: "ملغي",
  completed: "مكتمل",
  suspended: "موقوف",
  confirmed: "مؤكد",
  draft:     "مسودة",
  paused:    "متوقف",
  archived:  "مؤرشف",
  accepted:  "مقبول",
  rejected:  "مرفوض",
  paid:      "مدفوع",
  unpaid:    "غير مدفوع",
  partial:   "جزئي",
  overdue:   "متأخر",
  in_progress: "جارٍ",
  scheduled:   "مجدول",
  delivered:   "مُسلَّم",
  failed:      "فشل",
  returned:    "مُرتجع",
  picked_up:   "تم الاستلام",
  in_transit:  "في الطريق",
  no_show:     "لم يحضر",
};

// Tailwind class bundles per status — uses design system semantic tokens
const STATUS_CLASSES: Record<string, { badge: string; dot: string }> = {
  active:      { badge: "bg-success-soft text-success",      dot: "bg-success" },
  confirmed:   { badge: "bg-brand-soft text-brand-700",      dot: "bg-brand" },
  completed:   { badge: "bg-brand-50 text-brand-600",        dot: "bg-brand-400" },
  paid:        { badge: "bg-success-soft text-success",      dot: "bg-success" },
  delivered:   { badge: "bg-success-soft text-success",      dot: "bg-success" },
  accepted:    { badge: "bg-success-soft text-success",      dot: "bg-success" },
  in_transit:  { badge: "bg-sky-soft text-sky",              dot: "bg-sky" },
  picked_up:   { badge: "bg-sky-soft text-sky",              dot: "bg-sky" },
  scheduled:   { badge: "bg-lavender-soft text-lavender",    dot: "bg-lavender" },
  in_progress: { badge: "bg-warning-soft text-warning",      dot: "bg-warning" },
  pending:     { badge: "bg-warning-soft text-warning",      dot: "bg-warning" },
  partial:     { badge: "bg-warning-soft text-warning",      dot: "bg-warning" },
  paused:      { badge: "bg-warning-soft text-warning",      dot: "bg-warning" },
  overdue:     { badge: "bg-danger-soft text-danger",        dot: "bg-danger" },
  cancelled:   { badge: "bg-danger-soft text-danger",        dot: "bg-danger" },
  failed:      { badge: "bg-danger-soft text-danger",        dot: "bg-danger" },
  returned:    { badge: "bg-danger-soft text-danger",        dot: "bg-danger" },
  rejected:    { badge: "bg-danger-soft text-danger",        dot: "bg-danger" },
  no_show:     { badge: "bg-danger-soft text-danger",        dot: "bg-danger" },
  unpaid:      { badge: "bg-danger-soft text-danger",        dot: "bg-danger" },
  draft:       { badge: "bg-[var(--surface-3)] text-[var(--text-2)]", dot: "bg-[var(--text-3)]" },
  suspended:   { badge: "bg-[var(--surface-3)] text-[var(--text-2)]", dot: "bg-[var(--text-3)]" },
  archived:    { badge: "bg-[var(--surface-3)] text-[var(--text-3)]", dot: "bg-[var(--text-3)]" },
};

const FALLBACK = { badge: "bg-[var(--surface-3)] text-[var(--text-2)]", dot: "bg-[var(--text-3)]" };

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  label?: string;
}

export function StatusBadge({ status, size = "md", label }: StatusBadgeProps) {
  const cfg = STATUS_CLASSES[status] ?? FALLBACK;
  const text = label ?? STATUS_LABELS[status] ?? status;

  return (
    <span className={clsx(
      "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
      cfg.badge,
      size === "sm" ? "text-[11px] px-2 py-0.5 gap-1" : "text-xs px-2.5 py-1 gap-1.5",
    )}>
      <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {text}
    </span>
  );
}
