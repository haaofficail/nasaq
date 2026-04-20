/**
 * HeroSplit Block — Page Builder v2
 *
 * Source reference: shadcnblocks.com/blocks/hero (Split Hero, 50/50 variant)
 * Adapted for: RTL, IBM Plex Sans Arabic, ترميز OS CSS variables, no emojis
 *
 * Design: Confident Split — deep charcoal text panel (#1A1A2E) flush against
 * a full-bleed image panel, with a large decorative Arabic numeral ghosted
 * behind the heading for depth and editorial character.
 *
 * Layout:
 *   - Mobile:  flex-col (text stacked above image)
 *   - Tablet:  40% text / 60% image (lg: breakpoint)
 *   - Desktop: 50% / 50% (xl: breakpoint)
 *
 * RTL specifics:
 *   - dir="rtl" on root
 *   - imagePosition="left" (default): image visually on LEFT (col-2 in RTL grid)
 *   - imagePosition="right": image visually on RIGHT (col-1 in RTL grid)
 *   - CSS `order` controls visual placement without breaking RTL flow
 *   - no pl-/pr-/ml-/mr-/text-left/text-right
 *
 * Accent styles:
 *   none       → no decoration
 *   line       → thin vertical brand-colored line before heading
 *   dot        → three stacked brand-colored dots (Arabic decorative motif)
 *   gradient   → subtle radial brand glow on text panel background
 */

import React from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HeroSplitProps {
  heading:          string;
  subheading:       string;
  primaryCtaText:   string;
  primaryCtaLink:   string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  imageUrl:         string;
  imageAlt:         string;
  imagePosition:    "right" | "left";
  textAlignment:    "right" | "center";
  mediaType:        "image" | "illustration" | "video-embed";
  accentStyle:      "none" | "line" | "dot" | "gradient";
}

// ── Text alignment map (RTL-aware) ────────────────────────────────────────────

const TEXT_ALIGN_CLASSES: Record<HeroSplitProps["textAlignment"], string> = {
  right:  "text-start items-start",
  center: "text-center items-center",
};

// ── Component ──────────────────────────────────────────────────────────────────

export function HeroSplitBlock({
  heading,
  subheading,
  primaryCtaText,
  primaryCtaLink,
  secondaryCtaText = "",
  secondaryCtaLink = "#",
  imageUrl,
  imageAlt,
  imagePosition,
  textAlignment,
  mediaType,
  accentStyle,
}: HeroSplitProps) {
  const alignClass = TEXT_ALIGN_CLASSES[textAlignment];

  // In RTL grid: col-1 = visual RIGHT, col-2 = visual LEFT
  // imagePosition="left"  → image in col-2 (left), text in col-1 (right)
  // imagePosition="right" → image in col-1 (right), text in col-2 (left)
  const textOrder  = imagePosition === "right" ? "order-2" : "order-1";
  const imageOrder = imagePosition === "right" ? "order-1" : "order-2";

  return (
    <section
      dir="rtl"
      className="relative w-full overflow-hidden bg-[#1A1A2E]"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      {/* Split container */}
      <div
        data-split=""
        data-image-position={imagePosition}
        className="flex flex-col lg:grid lg:grid-cols-2 xl:grid-cols-2 min-h-[560px] lg:min-h-[640px]"
      >

        {/* ── Text panel ─────────────────────────────────────────────────── */}
        <div
          data-text-panel=""
          className={`relative flex flex-col justify-center gap-7 ps-8 pe-8 py-16 lg:ps-14 lg:pe-10 lg:py-20 overflow-hidden ${textOrder} ${alignClass}`}
          style={{ background: "#1A1A2E" }}
        >
          {/* Gradient accent on text panel background */}
          {accentStyle === "gradient" && (
            <div
              data-accent="gradient"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 80% 20%, color-mix(in srgb, var(--color-primary, #5b9bd5) 12%, transparent), transparent 70%)",
              }}
            />
          )}

          {/* Decorative ghost numeral — large Arabic numeral for depth */}
          <span
            className="absolute top-0 end-0 font-bold select-none pointer-events-none"
            aria-hidden="true"
            style={{
              fontSize: "clamp(10rem, 20vw, 18rem)",
              lineHeight: "0.85",
              color: "rgba(255, 255, 255, 0.04)",
              fontFamily: "'IBM Plex Sans Arabic', sans-serif",
              transform: "translateY(-10%)",
            }}
          >
            ١
          </span>

          {/* Accent decorations */}
          {accentStyle === "line" && (
            <div
              data-accent="line"
              className="w-0.5 h-12 rounded-full self-start"
              style={{ background: "var(--color-primary, #5b9bd5)" }}
            />
          )}

          {accentStyle === "dot" && (
            <div
              data-accent="dot"
              className="flex flex-col gap-1.5 self-start"
              aria-hidden="true"
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width:      i === 1 ? "10px" : "6px",
                    height:     i === 1 ? "10px" : "6px",
                    background: "var(--color-primary, #5b9bd5)",
                    opacity:    i === 1 ? 1 : 0.55,
                  }}
                />
              ))}
            </div>
          )}

          {/* Heading */}
          <h1
            className="font-bold relative z-10"
            style={{
              fontSize:      "clamp(2rem, 4.5vw, 3.8rem)",
              lineHeight:    "1.1",
              letterSpacing: "-0.025em",
              color:         "#F5F0E8",
            }}
          >
            {heading}
          </h1>

          {/* Subheading */}
          <p
            className="relative z-10 max-w-md leading-relaxed"
            style={{
              fontSize:   "clamp(0.9rem, 1.8vw, 1.1rem)",
              lineHeight: "1.9",
              color:      "rgba(245, 240, 232, 0.70)",
            }}
          >
            {subheading}
          </p>

          {/* CTA buttons */}
          <div className="relative z-10 flex flex-wrap gap-3 items-center">
            {primaryCtaText && (
              <a
                href={primaryCtaLink || "#"}
                className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "var(--color-primary, #5b9bd5)",
                  color:      "#ffffff",
                  boxShadow:  "0 4px 24px color-mix(in srgb, var(--color-primary, #5b9bd5) 40%, transparent)",
                  width:      "fit-content",
                }}
              >
                {primaryCtaText}
              </a>
            )}

            {secondaryCtaText && (
              <a
                href={secondaryCtaLink || "#"}
                className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-sm font-semibold border transition-all duration-200 hover:bg-white/8 active:scale-[0.98]"
                style={{
                  color:        "rgba(245, 240, 232, 0.85)",
                  borderColor:  "rgba(245, 240, 232, 0.20)",
                  width:        "fit-content",
                }}
              >
                {secondaryCtaText}
              </a>
            )}
          </div>
        </div>

        {/* ── Image / Media panel ─────────────────────────────────────────── */}
        <div
          data-image-panel=""
          className={`relative overflow-hidden min-h-[320px] lg:min-h-0 ${imageOrder}`}
        >
          {imageUrl ? (
            mediaType === "video-embed" ? (
              <div
                data-media-type="video-embed"
                className="absolute inset-0 flex items-center justify-center bg-[#0D2138]"
                style={{ color: "rgba(245, 240, 232, 0.4)" }}
              >
                {/* Video embed placeholder — actual src would be an iframe */}
                <div className="text-center">
                  <svg
                    viewBox="0 0 48 48"
                    fill="currentColor"
                    className="w-16 h-16 mx-auto"
                    aria-hidden="true"
                  >
                    <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" fill="none" />
                    <polygon points="19,15 37,24 19,33" />
                  </svg>
                </div>
              </div>
            ) : (
              <img
                src={imageUrl}
                alt={imageAlt}
                loading="lazy"
                data-media-type={mediaType}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )
          ) : (
            /* Fallback when no image */
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, #0D2138 0%, #2F6190 50%, #5b9bd5 100%)",
              }}
            />
          )}
        </div>

      </div>
    </section>
  );
}

// ── Puck Component Config ──────────────────────────────────────────────────────

export const HeroSplitConfig: ComponentConfig<HeroSplitProps> = {
  label: "Hero — تقسيم",
  fields: {
    heading: {
      type: "text",
      label: "العنوان الرئيسي",
    },
    subheading: {
      type: "textarea",
      label: "النص الوصفي",
    },
    primaryCtaText: {
      type: "text",
      label: "نص الزر الأساسي",
    },
    primaryCtaLink: {
      type: "text",
      label: "رابط الزر الأساسي",
    },
    secondaryCtaText: {
      type: "text",
      label: "نص الزر الثانوي (اختياري)",
    },
    secondaryCtaLink: {
      type: "text",
      label: "رابط الزر الثانوي",
    },
    imageUrl: {
      type: "text",
      label: "رابط الصورة",
    },
    imageAlt: {
      type: "text",
      label: "النص البديل للصورة",
    },
    imagePosition: {
      type: "select",
      label: "موضع الصورة",
      options: [
        { value: "left",  label: "يسار" },
        { value: "right", label: "يمين" },
      ],
    },
    textAlignment: {
      type: "select",
      label: "محاذاة النص",
      options: [
        { value: "right",  label: "يمين" },
        { value: "center", label: "وسط" },
      ],
    },
    mediaType: {
      type: "select",
      label: "نوع المحتوى البصري",
      options: [
        { value: "image",       label: "صورة" },
        { value: "illustration", label: "رسمة توضيحية" },
        { value: "video-embed",  label: "فيديو مضمّن" },
      ],
    },
    accentStyle: {
      type: "select",
      label: "عنصر التأكيد",
      options: [
        { value: "none",     label: "بدون" },
        { value: "line",     label: "خط عمودي" },
        { value: "dot",      label: "نقاط زخرفية" },
        { value: "gradient", label: "توهج خلفي" },
      ],
    },
  },
  defaultProps: {
    heading:          "نصنع التجارب الفريدة",
    subheading:       "حلول تجارية ذكية تناسب طموحاتك وتسرّع نموك في السوق",
    primaryCtaText:   "ابدأ رحلتك",
    primaryCtaLink:   "#",
    secondaryCtaText: "تعرّف علينا",
    secondaryCtaLink: "/about",
    imageUrl:         "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    imageAlt:         "فريق عمل ترميز OS",
    imagePosition:    "left",
    textAlignment:    "right",
    mediaType:        "image",
    accentStyle:      "line",
  },
  render: (props) => <HeroSplitBlock {...props} />,
};
