/**
 * HeroShowcase Block — Page Builder v2
 *
 * Source reference: shadcnblocks.com/blocks/hero (Hero with Background Image, variant #7)
 * Adapted for: RTL, IBM Plex Sans Arabic, ترميز OS CSS variables, no emojis
 *
 * Design: Editorial Magazine — cinematic full-bleed background image with
 * a gradient overlay and bold Arabic typography anchored at the bottom.
 *
 * RTL compliance:
 *   - dir="rtl" on root
 *   - ps-/pe- (logical padding)
 *   - text-start / text-end (never text-left / text-right)
 *   - alignment prop maps: right → text-start/items-start,
 *                           left  → text-end/items-end,
 *                           center → text-center/items-center
 */

import React from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HeroShowcaseProps {
  heading: string;
  subheading: string;
  ctaText: string;
  ctaLink: string;
  backgroundImage?: string;
  overlayOpacity: number;        // 0–100
  textColor: "light" | "dark";
  alignment: "right" | "center" | "left";
  badge?: string;
}

// ── Alignment map (RTL-aware) ──────────────────────────────────────────────────

const ALIGN_CLASSES: Record<HeroShowcaseProps["alignment"], string> = {
  right:  "text-start items-start",
  center: "text-center items-center",
  left:   "text-end items-end",
};

// ── Text color map ─────────────────────────────────────────────────────────────

const TEXT_COLOR_CLASSES: Record<HeroShowcaseProps["textColor"], string> = {
  light: "text-white",
  dark:  "text-gray-900",
};

// ── Component ──────────────────────────────────────────────────────────────────

export function HeroShowcaseBlock({
  heading,
  subheading,
  ctaText,
  ctaLink,
  backgroundImage = "",
  overlayOpacity,
  textColor,
  alignment,
  badge = "",
}: HeroShowcaseProps) {
  const alignClass     = ALIGN_CLASSES[alignment];
  const textColorClass = TEXT_COLOR_CLASSES[textColor];

  // Clamp opacity to [0, 1]
  const overlayValue = Math.min(100, Math.max(0, overlayOpacity)) / 100;

  // CTA button style varies by textColor for legibility
  const ctaClass =
    textColor === "light"
      ? "bg-white text-gray-900 hover:bg-gray-100"
      : "text-white hover:opacity-90"

  const ctaStyle =
    textColor === "dark"
      ? { background: "var(--color-primary, #5b9bd5)" }
      : undefined;

  return (
    <section
      dir="rtl"
      className="relative w-full overflow-hidden"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        minHeight: "clamp(400px, 60vw, 700px)",
      }}
    >
      {/* Background image — lazy loaded */}
      {backgroundImage ? (
        <img
          src={backgroundImage}
          loading="lazy"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        />
      ) : (
        /* Placeholder gradient when no image set */
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #0D2138 0%, #2F6190 50%, #5b9bd5 100%)",
          }}
        />
      )}

      {/* Overlay */}
      <div
        data-overlay=""
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayValue }}
      />

      {/* Cinematic gradient — darkens bottom for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)",
        }}
      />

      {/* Content */}
      <div
        data-content=""
        className={`relative z-10 flex flex-col gap-6 px-8 py-16 md:px-16 md:py-24 max-w-5xl mx-auto w-full justify-end h-full ${alignClass} ${textColorClass}`}
        style={{ minHeight: "inherit" }}
      >
        {/* Badge */}
        {badge && (
          <span
            data-badge=""
            className="inline-flex self-auto items-center rounded-full px-4 py-1.5 text-sm font-medium border border-white/40 bg-white/15 backdrop-blur-sm"
            style={{ width: "fit-content" }}
          >
            {badge}
          </span>
        )}

        {/* Heading */}
        <h1
          className="font-bold tracking-tight"
          style={{
            fontSize: "clamp(2rem, 5vw, 4rem)",
            lineHeight: "1.1",
            letterSpacing: "-0.02em",
            textShadow: textColor === "light" ? "0 2px 20px rgba(0,0,0,0.4)" : "none",
          }}
        >
          {heading}
        </h1>

        {/* Subheading */}
        <p
          className={`max-w-xl leading-relaxed ${textColor === "light" ? "text-white/85" : "text-gray-700"}`}
          style={{
            fontSize: "clamp(0.95rem, 2vw, 1.2rem)",
            lineHeight: "1.8",
          }}
        >
          {subheading}
        </p>

        {/* CTA */}
        {ctaText && (
          <a
            href={ctaLink || "#"}
            className={`inline-flex items-center justify-center self-auto rounded-xl px-8 py-3.5 text-base font-bold transition-all duration-200 active:scale-[0.98] shadow-lg ${ctaClass}`}
            style={{
              width: "fit-content",
              ...(ctaStyle ?? {}),
              boxShadow: textColor === "light"
                ? "0 4px 24px rgba(0,0,0,0.3)"
                : `0 4px 24px color-mix(in srgb, var(--color-primary, #5b9bd5) 40%, transparent)`,
            }}
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

// ── Puck Component Config ──────────────────────────────────────────────────────

export const HeroShowcaseConfig: ComponentConfig<HeroShowcaseProps> = {
  label: "Hero — عرض بصري",
  fields: {
    heading: {
      type: "text",
      label: "العنوان الرئيسي",
    },
    subheading: {
      type: "textarea",
      label: "النص الوصفي",
    },
    ctaText: {
      type: "text",
      label: "نص الزر",
    },
    ctaLink: {
      type: "text",
      label: "رابط الزر",
    },
    backgroundImage: {
      type: "text",
      label: "رابط صورة الخلفية",
    },
    overlayOpacity: {
      type: "number",
      label: "شفافية الطبقة (0–100)",
      min: 0,
      max: 100,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    textColor: {
      type: "select",
      label: "لون النص",
      options: [
        { value: "light", label: "فاتح (أبيض)" },
        { value: "dark",  label: "داكن (أسود)" },
      ],
    },
    alignment: {
      type: "select",
      label: "محاذاة النص",
      options: [
        { value: "right",  label: "يمين" },
        { value: "center", label: "وسط" },
        { value: "left",   label: "يسار" },
      ],
    },
    badge: {
      type: "text",
      label: "شارة (اختياري)",
    },
  },
  defaultProps: {
    heading:         "تجربة تسوّق استثنائية",
    subheading:      "اكتشف منتجات مميزة بتصميم عصري وجودة عالية",
    ctaText:         "تسوّق الآن",
    ctaLink:         "#",
    backgroundImage: "",
    overlayOpacity:  40,
    textColor:       "light",
    alignment:       "center",
    badge:           "",
  },
  render: (props) => <HeroShowcaseBlock {...props} />,
};
