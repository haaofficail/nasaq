import { useApi } from "@/hooks/useApi";
import type { KPIConfig } from "@/lib/dashboardProfiles";
import { COLORS, SHADOWS, TYPOGRAPHY } from "@/lib/design-tokens";

const FONT = TYPOGRAPHY.family;

interface KPICardProps {
  config: KPIConfig;
}

export function KPICard({ config }: KPICardProps) {
  const { data, loading } = useApi(config.fetcher, []);
  const value = data != null ? config.transform(data) : null;

  return (
    <div
      style={{
        background: COLORS.surface,
        borderRadius: 14,
        border: `1px solid ${COLORS.border}`,
        boxShadow: SHADOWS.card,
        padding: "16px 18px",
        fontFamily: FONT,
        direction: "rtl",
        transition: "box-shadow 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = SHADOWS.cardHover; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = SHADOWS.card; }}
    >
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${COLORS.primary}12`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: COLORS.primary, flexShrink: 0,
      }}>
        <config.icon size={18} />
      </div>

      {/* Value */}
      {loading ? (
        <div style={{ height: 28, width: 80, borderRadius: 6, background: "#f1f5f9", animation: "pulse 1.5s infinite" }} />
      ) : (
        <p style={{
          fontSize: 24, fontWeight: 700, color: COLORS.dark,
          fontVariantNumeric: "tabular-nums", letterSpacing: -0.5,
          margin: 0, lineHeight: 1,
        }}>
          {value}
        </p>
      )}

      {/* Label */}
      <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>
        {config.label}
        {config.unit && <span style={{ marginRight: 3 }}>· {config.unit}</span>}
      </p>
    </div>
  );
}
