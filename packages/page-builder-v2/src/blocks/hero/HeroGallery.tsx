/**
 * HeroGallery Block — Page Builder v2
 *
 * Source reference: shadcnblocks.com/blocks/hero (Split Hero with Gallery Grid)
 * Adapted for: RTL, IBM Plex Sans Arabic, ترميز OS CSS variables, no emojis
 *
 * Design: Editorial Luxury — refined split composition with bold Arabic typography
 * anchored on the right (RTL start), and a responsive image grid on the left.
 *
 * Grid variants:
 *   grid-3          → 3-column uniform grid (default)
 *   grid-masonry    → staggered heights via CSS columns
 *   grid-asymmetric → first image spans 2 rows, rest uniform
 *
 * RTL compliance:
 *   - dir="rtl" on root
 *   - ps-/pe- logical padding
 *   - imagePosition right: images container is flex-end (visual left in RTL flex)
 *   - imagePosition left:  images container is flex-start (visual right in RTL flex)
 *   - no text-left / text-right / pl- / pr-
 */

import React from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GalleryImage {
  url: string;
  alt: string;
}

export interface HeroGalleryProps {
  heading:       string;
  subheading:    string;
  ctaText:       string;
  ctaLink:       string;
  images:        GalleryImage[];
  layout:        "grid-3" | "grid-masonry" | "grid-asymmetric";
  imagePosition: "right" | "left";
}

// ── Grid layout class map ──────────────────────────────────────────────────────

const GRID_CLASSES: Record<HeroGalleryProps["layout"], string> = {
  "grid-3":          "grid grid-cols-3 gap-3",
  "grid-masonry":    "columns-2 gap-3 [column-fill:balance]",
  "grid-asymmetric": "grid grid-cols-3 gap-3",
};

// ── Component ──────────────────────────────────────────────────────────────────

export function HeroGalleryBlock({
  heading,
  subheading,
  ctaText,
  ctaLink,
  images,
  layout,
  imagePosition,
}: HeroGalleryProps) {
  // In RTL flex-row, "right" in Arabic context = images visually on the right.
  // RTL flex-row: first child → right, second child → left.
  // imagePosition="right": text first (appears right), images second (appears left) — THEN reverse order
  // We use CSS order to control visual placement without breaking RTL semantics.
  const textOrder    = imagePosition === "right" ? "order-2" : "order-1";
  const imagesOrder  = imagePosition === "right" ? "order-1" : "order-2";

  return (
    <section
      dir="rtl"
      className="relative w-full overflow-hidden bg-white"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      {/* Split layout wrapper */}
      <div className="flex flex-col lg:flex-row min-h-[560px]">

        {/* ── Text panel ─────────────────────────────────────────────────── */}
        <div
          data-text-panel=""
          className={`flex flex-col justify-center gap-6 ps-8 pe-8 py-16 lg:ps-16 lg:pe-10 lg:py-24 lg:w-[42%] flex-shrink-0 ${textOrder}`}
        >
          {/* Decorative accent line */}
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "var(--color-primary, #5b9bd5)" }}
          />

          {/* Heading */}
          <h1
            className="font-bold text-gray-900 leading-tight tracking-tight"
            style={{
              fontSize: "clamp(1.8rem, 4vw, 3.2rem)",
              lineHeight: "1.15",
              letterSpacing: "-0.02em",
              color: "#0D2138",
            }}
          >
            {heading}
          </h1>

          {/* Subheading */}
          <p
            className="leading-relaxed max-w-sm"
            style={{
              fontSize: "clamp(0.9rem, 1.8vw, 1.1rem)",
              lineHeight: "1.9",
              color: "#2F6190",
            }}
          >
            {subheading}
          </p>

          {/* CTA */}
          {ctaText && (
            <a
              href={ctaLink || "#"}
              className="inline-flex items-center justify-center self-start rounded-xl px-7 py-3 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "var(--color-primary, #5b9bd5)",
                boxShadow: "0 4px 20px color-mix(in srgb, var(--color-primary, #5b9bd5) 35%, transparent)",
                width: "fit-content",
              }}
            >
              {ctaText}
            </a>
          )}
        </div>

        {/* ── Image grid panel ────────────────────────────────────────────── */}
        <div
          data-images-position={imagePosition}
          className={`lg:flex-1 overflow-hidden ${imagesOrder}`}
        >
          {images.length > 0 && (
            <div
              data-grid-layout={layout}
              className={`h-full p-3 ${layout === "grid-masonry" ? GRID_CLASSES["grid-masonry"] : GRID_CLASSES[layout]}`}
            >
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`
                    relative overflow-hidden rounded-2xl group
                    ${layout === "grid-masonry" ? "mb-3 break-inside-avoid" : ""}
                    ${layout === "grid-asymmetric" && idx === 0 ? "row-span-2" : ""}
                  `}
                  style={{
                    // Staggered heights for visual rhythm
                    aspectRatio: layout === "grid-masonry"
                      ? (idx % 3 === 0 ? "3/4" : idx % 3 === 1 ? "4/3" : "1/1")
                      : layout === "grid-asymmetric" && idx === 0
                        ? undefined
                        : "4/3",
                    height: layout === "grid-asymmetric" && idx === 0 ? "100%" : undefined,
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Hover overlay — subtle brand tint */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(135deg, color-mix(in srgb, var(--color-primary, #5b9bd5) 20%, transparent), transparent 60%)",
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}

// ── Puck Component Config ──────────────────────────────────────────────────────

export const HeroGalleryConfig: ComponentConfig<HeroGalleryProps> = {
  label: "Hero — معرض صور",
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
    images: {
      type: "array",
      label: "الصور",
      arrayFields: {
        url: {
          type: "text",
          label: "رابط الصورة",
        },
        alt: {
          type: "text",
          label: "النص البديل (عربي)",
        },
      },
    },
    layout: {
      type: "select",
      label: "نوع الشبكة",
      options: [
        { value: "grid-3",          label: "شبكة 3 أعمدة" },
        { value: "grid-masonry",    label: "شبكة متدرجة" },
        { value: "grid-asymmetric", label: "شبكة غير متماثلة" },
      ],
    },
    imagePosition: {
      type: "select",
      label: "موضع الصور",
      options: [
        { value: "right", label: "يمين" },
        { value: "left",  label: "يسار" },
      ],
    },
  },
  defaultProps: {
    heading:       "مجموعة تناسب أسلوبك",
    subheading:    "تشكيلة واسعة من المنتجات المختارة بعناية لتعكس ذوقك الرفيع",
    ctaText:       "استكشف المجموعة",
    ctaLink:       "#",
    images: [
      { url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80", alt: "ساعة فاخرة" },
      { url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", alt: "حذاء رياضي" },
      { url: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=80", alt: "حذاء عصري" },
    ],
    layout:        "grid-3",
    imagePosition: "right",
  },
  render: (props) => <HeroGalleryBlock {...props} />,
};
