/**
 * StatsSimple Block — Page Builder v2 (Day 13)
 *
 * Design: "Numbers Hall"
 * 4 big statistics in a 4-col row (desktop), 2×2 (tablet), stacked (mobile).
 * Each stat: oversized value in brand blue, label below.
 * Two theme variants: light (white/brand-light bg) and dark (navy #0D2138 bg).
 *
 * RTL: dir=rtl, text-center for stats
 */
import React from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ─────────────────────────────────────────────────────

export interface StatItem {
  value: string;
  label: string;
}

export interface StatsSimpleProps {
  heading:    string;
  subheading: string;
  stats:      StatItem[];
  theme:      "light" | "dark";
}

// ── Theme tokens ──────────────────────────────────────────────

const THEMES = {
  light: {
    bg:           "#F0F6FC",
    sectionBg:    "#ffffff",
    headingColor: "#0D2138",
    subColor:     "#5289BE",
    valueColor:   "#5b9bd5",
    labelColor:   "#2F6190",
    itemBg:       "#ffffff",
    itemBorder:   "#E3EFF9",
    divider:      "#C9DDEF",
  },
  dark: {
    bg:           "#0D2138",
    sectionBg:    "#0D2138",
    headingColor: "#ffffff",
    subColor:     "#7AADD4",
    valueColor:   "#5b9bd5",
    labelColor:   "#A0BFDA",
    itemBg:       "rgba(91,155,213,0.08)",
    itemBorder:   "rgba(91,155,213,0.2)",
    divider:      "rgba(91,155,213,0.2)",
  },
} as const;

// ── Main component ─────────────────────────────────────────────

export function StatsSimpleBlock({ heading, subheading, stats, theme }: StatsSimpleProps) {
  const t = THEMES[theme] ?? THEMES.light;

  return (
    <section
      dir="rtl"
      data-block="stats-simple"
      data-theme={theme}
      className="w-full py-16 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: t.sectionBg,
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        {(heading || subheading) && (
          <div className="mb-12 text-center">
            {heading && (
              <h2
                className="font-bold"
                style={{
                  fontSize:      "clamp(1.6rem, 3vw, 2.2rem)",
                  color:         t.headingColor,
                  letterSpacing: "-0.03em",
                }}
              >
                {heading}
              </h2>
            )}
            {subheading && (
              <p
                className="mt-2"
                style={{ color: t.subColor, fontSize: "0.95rem", lineHeight: "1.7" }}
              >
                {subheading}
              </p>
            )}
          </div>
        )}

        {/* Stats grid */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div
                key={i}
                data-stat-item=""
                data-value={stat.value}
                className="flex flex-col items-center text-center gap-2 rounded-2xl py-8 px-4"
                style={{
                  background: t.itemBg,
                  border:     `1px solid ${t.itemBorder}`,
                }}
              >
                {/* Value */}
                <span
                  className="font-bold tabular-nums"
                  style={{
                    fontSize:      "clamp(2rem, 4vw, 3rem)",
                    color:         t.valueColor,
                    letterSpacing: "-0.04em",
                    lineHeight:    1,
                  }}
                >
                  {stat.value}
                </span>

                {/* Divider */}
                <div
                  className="w-8 h-0.5 rounded-full"
                  style={{ background: t.divider }}
                />

                {/* Label */}
                <span
                  className="font-medium leading-snug"
                  style={{ color: t.labelColor, fontSize: "0.875rem" }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const StatsSimpleConfig: ComponentConfig<StatsSimpleProps> = {
  label: "إحصائيات بسيطة",
  fields: {
    heading:    { type: "text",     label: "العنوان" },
    subheading: { type: "textarea", label: "النص التوضيحي" },
    theme: {
      type:    "radio",
      label:   "السمة",
      options: [
        { label: "فاتح", value: "light" },
        { label: "داكن", value: "dark"  },
      ],
    },
    stats: {
      type:  "array",
      label: "الإحصائيات",
      arrayFields: {
        value: { type: "text", label: "القيمة" },
        label: { type: "text", label: "التسمية" },
      },
      defaultItemProps: { value: "+100", label: "وصف الرقم" },
    },
  },
  defaultProps: {
    heading:    "أرقام تتحدث عن نفسها",
    subheading: "نتائج حقيقية من منشآت سعودية",
    theme:      "light",
    stats: [
      { value: "+5,000",  label: "عميل نشط" },
      { value: "98%",     label: "نسبة الرضا" },
      { value: "+200",    label: "منشأة موثوقة" },
      { value: "24/7",    label: "دعم فني متواصل" },
    ],
  },
  render: (props) => <StatsSimpleBlock {...props} />,
};
