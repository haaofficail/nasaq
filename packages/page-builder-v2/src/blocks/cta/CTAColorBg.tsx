/**
 * CTAColorBg Block — Page Builder v2 (Day 15)
 *
 * Design: "Bold Statement"
 * Solid brand-colored background. Centered heading + subheading. One or two CTA buttons.
 * Fully configurable bg/text color and alignment.
 *
 * RTL: dir=rtl, ps-/pe-
 */
import React from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ─────────────────────────────────────────────────────

export type CTAAlignment = "center" | "start" | "end";

export interface CTAColorBgProps {
  heading:        string;
  subheading:     string;
  ctaLabel:       string;
  ctaUrl:         string;
  secondaryLabel: string;
  secondaryUrl:   string;
  bgColor:        string;
  textColor:      string;
  alignment:      CTAAlignment;
}

// ── Main component ─────────────────────────────────────────────

export function CTAColorBgBlock({
  heading,
  subheading,
  ctaLabel,
  ctaUrl,
  secondaryLabel,
  secondaryUrl,
  bgColor,
  textColor,
  alignment,
}: CTAColorBgProps) {
  const alignClass =
    alignment === "center" ? "text-center items-center" :
    alignment === "end"    ? "text-end items-end" :
                             "text-start items-start";

  return (
    <section
      dir="rtl"
      data-block="cta-color-bg"
      data-alignment={alignment}
      className="w-full py-20 ps-6 pe-6"
      style={{
        fontFamily:      "'IBM Plex Sans Arabic', sans-serif",
        backgroundColor: bgColor,
        color:           textColor,
      }}
    >
      <div className={`max-w-3xl mx-auto flex flex-col gap-6 ${alignClass}`}>
        {/* Heading */}
        {heading && (
          <h2
            className="font-bold"
            style={{
              fontSize:      "clamp(1.8rem, 4vw, 2.8rem)",
              letterSpacing: "-0.03em",
              lineHeight:    "1.2",
            }}
          >
            {heading}
          </h2>
        )}

        {/* Subheading */}
        {subheading && (
          <p
            style={{
              fontSize:   "1rem",
              lineHeight: "1.8",
              opacity:    0.85,
              maxWidth:   "560px",
            }}
          >
            {subheading}
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 mt-2" style={{ justifyContent: alignment === "center" ? "center" : alignment === "end" ? "flex-end" : "flex-start" }}>
          {ctaLabel && (
            <a
              href={ctaUrl || "#"}
              data-primary-cta=""
              className="inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{
                background:  "rgba(255,255,255,0.95)",
                color:       bgColor,
                padding:     "0.75rem 2rem",
                fontSize:    "1rem",
                boxShadow:   "0 2px 12px rgba(0,0,0,0.12)",
                textDecoration: "none",
              }}
            >
              {ctaLabel}
            </a>
          )}

          {secondaryLabel && (
            <a
              href={secondaryUrl || "#"}
              data-secondary-cta=""
              className="inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 hover:opacity-80"
              style={{
                background:     "transparent",
                color:          textColor,
                padding:        "0.75rem 2rem",
                fontSize:       "1rem",
                border:         `1.5px solid ${textColor}`,
                opacity:        0.9,
                textDecoration: "none",
              }}
            >
              {secondaryLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const CTAColorBgConfig: ComponentConfig<CTAColorBgProps> = {
  label: "CTA — لون خلفية",
  fields: {
    heading:        { type: "text",     label: "العنوان" },
    subheading:     { type: "textarea", label: "النص التوضيحي" },
    ctaLabel:       { type: "text",     label: "نص الزر الرئيسي" },
    ctaUrl:         { type: "text",     label: "رابط الزر الرئيسي" },
    secondaryLabel: { type: "text",     label: "نص الزر الثانوي (اختياري)" },
    secondaryUrl:   { type: "text",     label: "رابط الزر الثانوي" },
    bgColor: {
      type:  "text",
      label: "لون الخلفية (Hex)",
    },
    textColor: {
      type:  "text",
      label: "لون النص (Hex)",
    },
    alignment: {
      type:    "radio",
      label:   "المحاذاة",
      options: [
        { label: "وسط",   value: "center" as never },
        { label: "يمين",  value: "start"  as never },
        { label: "يسار",  value: "end"    as never },
      ],
    },
  },
  defaultProps: {
    heading:        "ابدأ رحلتك اليوم",
    subheading:     "انضم إلى آلاف العملاء الذين يثقون بنا في إدارة أعمالهم",
    ctaLabel:       "ابدأ مجاناً",
    ctaUrl:         "/signup",
    secondaryLabel: "تعرف على المزيد",
    secondaryUrl:   "/about",
    bgColor:        "#5b9bd5",
    textColor:      "#ffffff",
    alignment:      "center",
  },
  render: (props) => <CTAColorBgBlock {...props} />,
};
