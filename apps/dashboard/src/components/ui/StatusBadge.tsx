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

// Tailwind class bundles per status
const STATUS_CLASSES: Record<string, { badge: string; dot: string }> = {
  active:      { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  confirmed:   { badge: "bg-blue-50   text-blue-700",     dot: "bg-blue-500" },
  completed:   { badge: "bg-brand-50  text-brand-600",    dot: "bg-brand-400" },
  paid:        { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  delivered:   { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  accepted:    { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  in_transit:  { badge: "bg-blue-50   text-blue-700",     dot: "bg-blue-500" },
  picked_up:   { badge: "bg-blue-50   text-blue-700",     dot: "bg-blue-400" },
  scheduled:   { badge: "bg-violet-50 text-violet-700",   dot: "bg-violet-400" },
  in_progress: { badge: "bg-amber-50  text-amber-700",    dot: "bg-amber-500" },
  pending:     { badge: "bg-amber-50  text-amber-700",    dot: "bg-amber-500" },
  partial:     { badge: "bg-amber-50  text-amber-700",    dot: "bg-amber-400" },
  paused:      { badge: "bg-amber-50  text-amber-600",    dot: "bg-amber-400" },
  overdue:     { badge: "bg-red-50    text-red-700",      dot: "bg-red-500" },
  cancelled:   { badge: "bg-red-50    text-red-700",      dot: "bg-red-500" },
  failed:      { badge: "bg-red-50    text-red-600",      dot: "bg-red-500" },
  returned:    { badge: "bg-red-50    text-red-600",      dot: "bg-red-400" },
  rejected:    { badge: "bg-red-50    text-red-700",      dot: "bg-red-500" },
  no_show:     { badge: "bg-red-50    text-red-600",      dot: "bg-red-400" },
  unpaid:      { badge: "bg-red-50    text-red-600",      dot: "bg-red-400" },
  draft:       { badge: "bg-gray-100  text-gray-500",     dot: "bg-gray-400" },
  suspended:   { badge: "bg-gray-100  text-gray-500",     dot: "bg-gray-400" },
  archived:    { badge: "bg-gray-100  text-gray-400",     dot: "bg-gray-300" },
};

const FALLBACK = { badge: "bg-gray-100 text-gray-500", dot: "bg-gray-400" };

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
