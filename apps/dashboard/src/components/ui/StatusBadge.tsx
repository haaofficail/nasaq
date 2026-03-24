import { STATUS_MAP, TYPOGRAPHY } from "@/lib/design-tokens";

type StatusKey = keyof typeof STATUS_MAP;

interface StatusBadgeProps {
  status: StatusKey | string;
  size?: "sm" | "md";
  label?: string;
}

export function StatusBadge({ status, size = "md", label }: StatusBadgeProps) {
  const cfg = (STATUS_MAP as any)[status] ?? {
    label: status,
    bg: "#f1f5f9",
    color: "#64748b",
    dot: "#94a3b8",
  };

  const text = label ?? cfg.label;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: size === "sm" ? 4 : 5,
      padding: size === "sm" ? "2px 8px" : "3px 10px",
      borderRadius: 20,
      background: cfg.bg,
      color: cfg.color,
      fontFamily: TYPOGRAPHY.family,
      fontSize: size === "sm" ? 11 : 12,
      fontWeight: 500,
      lineHeight: 1.5,
      whiteSpace: "nowrap" as const,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {text}
    </span>
  );
}
