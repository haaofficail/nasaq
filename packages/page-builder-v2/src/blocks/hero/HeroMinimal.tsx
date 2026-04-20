/**
 * HeroMinimal Block — Page Builder v2
 *
 * Source reference: shadcnblocks.com/group/hero (Hero Minimal / variant #1)
 * Adapted for: RTL, IBM Plex Sans Arabic, ترميز OS CSS variables, no emojis
 *
 * RTL compliance:
 *   - dir="rtl" on root
 *   - ps-/pe- (logical) not pl-/pr-
 *   - text-start not text-left
 *   - Tailwind logical border/margin utilities
 */

import React from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ─────────────────────────────────────────────────────
export interface HeroMinimalProps {
  heading: string;
  subheading: string;
  ctaText: string;
  ctaUrl: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  badge?: string;
  backgroundStyle: "white" | "light" | "dark";
  alignment: "center" | "start";
}

// ── Component ─────────────────────────────────────────────────
export function HeroMinimalBlock({
  heading,
  subheading,
  ctaText,
  ctaUrl,
  secondaryCtaText,
  secondaryCtaUrl,
  badge,
  backgroundStyle,
  alignment,
}: HeroMinimalProps) {
  const bgClass =
    backgroundStyle === "dark"
      ? "bg-gray-950 text-white"
      : backgroundStyle === "light"
      ? "bg-gray-50 text-gray-900"
      : "bg-white text-gray-900";

  const alignClass = alignment === "center" ? "text-center items-center" : "text-start items-start";

  return (
    <section
      dir="rtl"
      className={`w-full ${bgClass}`}
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      <div className={`mx-auto max-w-5xl px-6 py-24 flex flex-col gap-8 ${alignClass}`}>

        {/* Badge */}
        {badge && (
          <span
            className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium border"
            style={{
              background: "color-mix(in srgb, var(--color-primary, #5b9bd5) 10%, transparent)",
              borderColor: "color-mix(in srgb, var(--color-primary, #5b9bd5) 30%, transparent)",
              color: "var(--color-primary, #5b9bd5)",
            }}
          >
            {badge}
          </span>
        )}

        {/* Heading */}
        <h1
          className="font-bold tracking-tight"
          style={{
            fontSize: "clamp(2rem, 5vw, 3.75rem)",
            lineHeight: "1.15",
            color: backgroundStyle === "dark" ? "#fff" : "#0D2138",
          }}
        >
          {heading}
        </h1>

        {/* Subheading */}
        <p
          className="max-w-2xl leading-relaxed"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            lineHeight: "1.75",
            color: backgroundStyle === "dark" ? "#94a3b8" : "#4a5568",
          }}
        >
          {subheading}
        </p>

        {/* CTAs */}
        <div className={`flex flex-wrap gap-3 ${alignment === "center" ? "justify-center" : "justify-start"}`}>
          {ctaText && (
            <a
              href={ctaUrl || "#"}
              className="inline-flex items-center justify-center rounded-xl px-7 py-3 text-base font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ background: "var(--color-primary, #5b9bd5)" }}
            >
              {ctaText}
            </a>
          )}
          {secondaryCtaText && (
            <a
              href={secondaryCtaUrl || "#"}
              className="inline-flex items-center justify-center rounded-xl border px-7 py-3 text-base font-semibold transition-all duration-200 hover:bg-gray-50 active:scale-[0.98]"
              style={{
                borderColor: "var(--color-primary, #5b9bd5)",
                color: "var(--color-primary, #5b9bd5)",
              }}
            >
              {secondaryCtaText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Puck Component Config ──────────────────────────────────────
export const HeroMinimalConfig: ComponentConfig<HeroMinimalProps> = {
  label: "Hero — بسيط",
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
      label: "نص الزر الرئيسي",
    },
    ctaUrl: {
      type: "text",
      label: "رابط الزر الرئيسي",
    },
    secondaryCtaText: {
      type: "text",
      label: "نص الزر الثانوي (اختياري)",
    },
    secondaryCtaUrl: {
      type: "text",
      label: "رابط الزر الثانوي (اختياري)",
    },
    badge: {
      type: "text",
      label: "شارة (اختياري)",
    },
    backgroundStyle: {
      type: "select",
      label: "لون الخلفية",
      options: [
        { value: "white", label: "أبيض" },
        { value: "light", label: "رمادي فاتح" },
        { value: "dark", label: "داكن" },
      ],
    },
    alignment: {
      type: "select",
      label: "محاذاة النص",
      options: [
        { value: "center", label: "توسيط" },
        { value: "start", label: "يمين (بداية)" },
      ],
    },
  },
  defaultProps: {
    heading: "ابدأ متجرك اليوم",
    subheading: "منصة متكاملة لإدارة أعمالك التجارية — من الحجوزات إلى المدفوعات في مكان واحد",
    ctaText: "ابدأ الآن",
    ctaUrl: "#",
    secondaryCtaText: "تعرّف أكثر",
    secondaryCtaUrl: "#",
    badge: "",
    backgroundStyle: "white",
    alignment: "center",
  },
  render: (props) => <HeroMinimalBlock {...props} />,
};
