/**
 * CTAImageBg Block — Page Builder v2 (Day 14)
 *
 * Design: "Cinematic CTA"
 * Full-width section with user-provided background image.
 * Configurable dark overlay (opacity). White text. Badge above heading.
 * Primary (solid brand) + optional secondary (outline white) CTA buttons.
 * Alignment: right (RTL default), center, or left.
 *
 * RTL: dir=rtl — text alignment is controlled by the alignment prop + data-alignment
 */
import React from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ─────────────────────────────────────────────────────

export type CTAAlignment = "right" | "center" | "left";

export interface CTAImageBgProps {
  heading:             string;
  subheading:          string;
  backgroundImageUrl:  string;
  overlayOpacity:      number;
  primaryCtaText:      string;
  primaryCtaLink:      string;
  secondaryCtaText:    string;
  secondaryCtaLink:    string;
  badge:               string;
  alignment:           CTAAlignment;
}

// ── Alignment CSS ─────────────────────────────────────────────

const ALIGN_CLASSES: Record<CTAAlignment, string> = {
  right:  "items-end text-end",
  center: "items-center text-center",
  left:   "items-start text-start",
};

// ── Main component ─────────────────────────────────────────────

export function CTAImageBgBlock({
  heading,
  subheading,
  backgroundImageUrl,
  overlayOpacity,
  primaryCtaText,
  primaryCtaLink,
  secondaryCtaText,
  secondaryCtaLink,
  badge,
  alignment,
}: CTAImageBgProps) {
  const alignClass = ALIGN_CLASSES[alignment] ?? ALIGN_CLASSES.right;
  const clampedOpacity = Math.max(0, Math.min(1, overlayOpacity ?? 0.6));

  return (
    <section
      dir="rtl"
      data-block="cta-image-bg"
      data-alignment={alignment}
      className="w-full relative overflow-hidden"
      style={{
        fontFamily:      "'IBM Plex Sans Arabic', sans-serif",
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
        backgroundSize:  "cover",
        backgroundPosition: "center",
        minHeight:       "480px",
      }}
    >
      {/* Overlay */}
      <div
        data-overlay=""
        data-opacity={String(clampedOpacity)}
        className="absolute inset-0"
        style={{ background: `rgba(13,33,56,${clampedOpacity})` }}
        aria-hidden="true"
      />

      {/* Fallback bg when no image */}
      {!backgroundImageUrl && (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #0D2138 0%, #1a3a5c 60%, #0D2138 100%)" }}
          aria-hidden="true"
        />
      )}

      {/* Content */}
      <div
        className={`relative z-10 w-full min-h-[480px] flex flex-col justify-center py-20 ps-8 pe-8 ${alignClass}`}
      >
        <div
          className="max-w-2xl flex flex-col gap-5"
          style={{
            marginInlineStart: alignment === "center" ? "auto" : undefined,
            marginInlineEnd:   alignment === "center" ? "auto" : undefined,
          }}
        >
          {/* Badge */}
          {badge && (
            <span
              className="inline-flex self-start rounded-full px-4 py-1.5 font-semibold uppercase tracking-wider"
              style={{
                background:    "rgba(91,155,213,0.25)",
                color:         "#93C4E8",
                fontSize:      "0.7rem",
                letterSpacing: "0.12em",
                border:        "1px solid rgba(91,155,213,0.35)",
                alignSelf:     alignment === "center" ? "center" : alignment === "left" ? "flex-start" : "flex-end",
              }}
            >
              {badge}
            </span>
          )}

          {/* Heading */}
          {heading && (
            <h2
              className="font-bold leading-tight"
              style={{
                fontSize:      "clamp(2rem, 5vw, 3.2rem)",
                color:         "#ffffff",
                letterSpacing: "-0.04em",
                lineHeight:    "1.1",
                textShadow:    "0 2px 20px rgba(0,0,0,0.4)",
              }}
            >
              {heading}
            </h2>
          )}

          {/* Subheading */}
          {subheading && (
            <p
              style={{
                color:      "rgba(255,255,255,0.75)",
                fontSize:   "clamp(0.95rem, 2vw, 1.1rem)",
                lineHeight: "1.7",
                maxWidth:   "44ch",
              }}
            >
              {subheading}
            </p>
          )}

          {/* CTA buttons */}
          <div
            className={`flex flex-wrap gap-3 ${alignment === "center" ? "justify-center" : alignment === "left" ? "justify-start" : "justify-end"}`}
          >
            {primaryCtaText && (
              <a
                data-primary-cta=""
                href={primaryCtaLink || "#"}
                className="inline-flex items-center justify-center rounded-xl font-semibold transition-all"
                style={{
                  background:    "linear-gradient(135deg, #5b9bd5 0%, #3d84c8 100%)",
                  color:         "#ffffff",
                  fontSize:      "0.95rem",
                  padding:       "0.75rem 2rem",
                  boxShadow:     "0 4px 20px rgba(91,155,213,0.4)",
                  textDecoration: "none",
                  border:        "none",
                }}
              >
                {primaryCtaText}
              </a>
            )}

            {secondaryCtaText && (
              <a
                data-secondary-cta=""
                href={secondaryCtaLink || "#"}
                className="inline-flex items-center justify-center rounded-xl font-semibold transition-all"
                style={{
                  background:    "transparent",
                  color:         "#ffffff",
                  fontSize:      "0.95rem",
                  padding:       "0.75rem 2rem",
                  border:        "1.5px solid rgba(255,255,255,0.5)",
                  textDecoration: "none",
                }}
              >
                {secondaryCtaText}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const CTAImageBgConfig: ComponentConfig<CTAImageBgProps> = {
  label: "CTA — خلفية صورة",
  fields: {
    heading:            { type: "text",     label: "العنوان الرئيسي" },
    subheading:         { type: "textarea", label: "النص التوضيحي" },
    backgroundImageUrl: { type: "text",     label: "رابط صورة الخلفية" },
    overlayOpacity:     { type: "number",   label: "شفافية التعتيم (0-1)" } as never,
    badge:              { type: "text",     label: "الشارة (اختيارية)" },
    primaryCtaText:     { type: "text",     label: "نص الزر الأساسي" },
    primaryCtaLink:     { type: "text",     label: "رابط الزر الأساسي" },
    secondaryCtaText:   { type: "text",     label: "نص الزر الثانوي (اختياري)" },
    secondaryCtaLink:   { type: "text",     label: "رابط الزر الثانوي" },
    alignment: {
      type:    "radio",
      label:   "محاذاة المحتوى",
      options: [
        { label: "يمين", value: "right"  },
        { label: "وسط",  value: "center" },
        { label: "يسار", value: "left"   },
      ],
    },
  },
  defaultProps: {
    heading:             "ابدأ متجرك خلال دقائق",
    subheading:          "انضم إلى آلاف التجار الذين اختاروا منصتنا",
    backgroundImageUrl:  "",
    overlayOpacity:      0.6,
    badge:               "عرض محدود",
    primaryCtaText:      "ابدأ مجاناً",
    primaryCtaLink:      "/register",
    secondaryCtaText:    "شاهد العرض",
    secondaryCtaLink:    "/demo",
    alignment:           "right",
  },
  render: (props) => <CTAImageBgBlock {...props} />,
};
