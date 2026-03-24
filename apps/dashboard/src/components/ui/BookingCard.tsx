import { COLORS, TYPOGRAPHY, SHADOWS } from "@/lib/design-tokens";
import { StatusBadge } from "./StatusBadge";

interface BookingCardProps {
  name: string;
  service: string;
  time: string;
  status: string;
  avatar?: string;
  onClick?: () => void;
}

const FONT = TYPOGRAPHY.family;

export function BookingCard({ name, service, time, status, avatar, onClick }: BookingCardProps) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("");

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
        background: COLORS.surface,
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        boxShadow: SHADOWS.card,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s, box-shadow 0.15s",
        fontFamily: FONT, direction: "rtl",
      }}
      onMouseEnter={e => {
        if (onClick) {
          (e.currentTarget as HTMLElement).style.borderColor = COLORS.primary;
          (e.currentTarget as HTMLElement).style.boxShadow = SHADOWS.cardHover;
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = COLORS.border;
        (e.currentTarget as HTMLElement).style.boxShadow = SHADOWS.card;
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: avatar ? undefined : `linear-gradient(135deg, ${COLORS.primary}33, ${COLORS.primary}66)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {avatar
          ? <img src={avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, fontFamily: FONT }}>{initials}</span>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </p>
        <p style={{ fontSize: 12, color: COLORS.muted, margin: 0, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {service}
        </p>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: COLORS.muted, fontVariantNumeric: "tabular-nums" }}>{time}</span>
        <StatusBadge status={status} size="sm" />
      </div>
    </div>
  );
}
