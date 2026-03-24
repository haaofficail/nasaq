import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { COLORS, TYPOGRAPHY, SHADOWS } from "@/lib/design-tokens";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  change?: number;
  changeType?: "up" | "down";
  unit?: string;
}

const FONT = TYPOGRAPHY.family;

export function StatCard({ icon, label, value, change, changeType, unit }: StatCardProps) {
  const isUp = changeType === "up" || (change !== undefined && change > 0);

  return (
    <div style={{
      background: COLORS.surface,
      borderRadius: 14,
      border: `1px solid ${COLORS.border}`,
      boxShadow: SHADOWS.card,
      padding: "18px 20px",
      fontFamily: FONT,
      direction: "rtl",
      display: "flex", flexDirection: "column", gap: 12,
      transition: "box-shadow 0.15s",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = SHADOWS.cardHover; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = SHADOWS.card; }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${COLORS.primary}10`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: COLORS.primary, flexShrink: 0,
        }}>
          {icon}
        </div>
        {change !== undefined && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: isUp ? COLORS.successBg : COLORS.dangerBg,
            color: isUp ? COLORS.successText : COLORS.dangerText,
          }}>
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>

      {/* Value + label */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{
            fontSize: 24, fontWeight: 700, color: COLORS.dark,
            fontVariantNumeric: "tabular-nums", letterSpacing: -0.5,
            lineHeight: 1,
          }}>
            {typeof value === "number" ? value.toLocaleString("ar-SA") : value}
          </span>
          {unit && <span style={{ fontSize: 12, color: COLORS.muted }}>{unit}</span>}
        </div>
        <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, marginBottom: 0 }}>{label}</p>
      </div>
    </div>
  );
}
