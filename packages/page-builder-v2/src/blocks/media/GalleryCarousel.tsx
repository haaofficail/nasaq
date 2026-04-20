/**
 * GalleryCarousel Block — Page Builder v2 (Day 14)
 *
 * Design: "Cinema Carousel"
 * Deep charcoal/navy background. Full-width main stage image.
 * Thumbnail strip below (4 visible). Dots + prev/next arrows. Optional autoplay.
 * Caption displayed below current image.
 *
 * RTL: dir=rtl, ps-/pe-
 */
import React, { useState, useEffect, useCallback } from "react";
import type { ComponentConfig } from "@measured/puck";
import { ChevronRight, ChevronLeft } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

export interface GalleryCarouselItem {
  imageUrl: string;
  alt:      string;
  caption:  string;
}

export interface GalleryCarouselProps {
  heading:    string;
  subheading: string;
  items:      GalleryCarouselItem[];
  autoplay:   boolean;
}

// ── Main component ─────────────────────────────────────────────

export function GalleryCarouselBlock({ heading, subheading, items, autoplay }: GalleryCarouselProps) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    if (items.length === 0) return;
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    if (items.length === 0) return;
    setCurrent((c) => (c - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (!autoplay || items.length === 0) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [autoplay, next, items.length]);

  const slide = items[current];

  return (
    <section
      dir="rtl"
      data-block="gallery-carousel"
      className="w-full py-16 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "linear-gradient(180deg, #0D2138 0%, #0a1a2e 100%)",
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        {(heading || subheading) && (
          <div className="mb-8 text-center">
            {heading && (
              <h2
                className="font-bold"
                style={{
                  fontSize:      "clamp(1.6rem, 3vw, 2.2rem)",
                  color:         "#ffffff",
                  letterSpacing: "-0.03em",
                }}
              >
                {heading}
              </h2>
            )}
            {subheading && (
              <p
                className="mt-2"
                style={{ color: "#7AADD4", fontSize: "0.9rem", lineHeight: "1.7" }}
              >
                {subheading}
              </p>
            )}
          </div>
        )}

        {/* Main stage */}
        {slide && (
          <div className="relative rounded-2xl overflow-hidden" style={{ background: "#0a1a2e" }}>
            {/* Image */}
            <div
              className="w-full"
              style={{ aspectRatio: "16/9", background: "#111d2e" }}
            >
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt={slide.alt}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #0D2138 0%, #1a3a5c 100%)" }}
                >
                  <svg
                    viewBox="0 0 64 64"
                    fill="none"
                    stroke="rgba(91,155,213,0.4)"
                    strokeWidth="1.5"
                    className="w-16 h-16"
                    aria-hidden="true"
                  >
                    <rect x="8" y="8" width="48" height="48" rx="6" />
                    <circle cx="24" cy="24" r="6" />
                    <path d="M8 44 l16-16 10 10 8-8 14 14" />
                  </svg>
                </div>
              )}
            </div>

            {/* Prev/Next overlay buttons */}
            {items.length > 1 && (
              <>
                <button
                  data-prev=""
                  onClick={prev}
                  aria-label="السابق"
                  className="absolute start-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity"
                  style={{
                    background: "rgba(13,33,56,0.7)",
                    border:     "1px solid rgba(91,155,213,0.3)",
                    cursor:     "pointer",
                    color:      "#ffffff",
                  }}
                >
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
                <button
                  data-next=""
                  onClick={next}
                  aria-label="التالي"
                  className="absolute end-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity"
                  style={{
                    background: "rgba(91,155,213,0.85)",
                    border:     "none",
                    cursor:     "pointer",
                    color:      "#ffffff",
                  }}
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Caption */}
        {slide?.caption && (
          <p
            className="mt-3 text-center"
            style={{ color: "#7AADD4", fontSize: "0.875rem", lineHeight: "1.6" }}
          >
            {slide.caption}
          </p>
        )}

        {/* Controls */}
        {items.length > 1 && (
          <div className="mt-5 flex flex-col items-center gap-4">
            {/* Dots */}
            <div className="flex gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  data-dot=""
                  data-active={String(i === current)}
                  onClick={() => setCurrent(i)}
                  aria-label={`الصورة ${i + 1}`}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width:      i === current ? "28px" : "8px",
                    height:     "8px",
                    background: i === current ? "#5b9bd5" : "rgba(91,155,213,0.3)",
                    border:     "none",
                    cursor:     "pointer",
                    padding:    0,
                  }}
                />
              ))}
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto py-1" style={{ maxWidth: "100%" }}>
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`الصورة ${i + 1}: ${item.alt}`}
                  className="flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200"
                  style={{
                    width:   "60px",
                    height:  "42px",
                    border:  i === current ? "2px solid #5b9bd5" : "2px solid transparent",
                    opacity: i === current ? 1 : 0.55,
                    cursor:  "pointer",
                    padding: 0,
                    background: "#111d2e",
                  }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      aria-hidden="true"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: "#1a3a5c" }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const GalleryCarouselConfig: ComponentConfig<GalleryCarouselProps> = {
  label: "معرض صور — شرائح",
  fields: {
    heading:    { type: "text",     label: "العنوان" },
    subheading: { type: "textarea", label: "النص التوضيحي" },
    autoplay: {
      type:    "radio",
      label:   "تشغيل تلقائي",
      options: [
        { label: "نعم", value: true  as never },
        { label: "لا",  value: false as never },
      ],
    },
    items: {
      type:  "array",
      label: "الصور",
      arrayFields: {
        imageUrl: { type: "text", label: "رابط الصورة" },
        alt:      { type: "text", label: "النص البديل" },
        caption:  { type: "text", label: "التعليق (اختياري)" },
      },
      defaultItemProps: { imageUrl: "", alt: "صورة", caption: "" },
    },
  },
  defaultProps: {
    heading:    "معرض الصور",
    subheading: "لحظات من رحلتنا",
    autoplay:   false,
    items: [
      { imageUrl: "", alt: "متجر الرياض",          caption: "افتتاح متجر الرياض الجديد" },
      { imageUrl: "", alt: "فعالية إطلاق المنتج", caption: "حفل إطلاق منتجنا الجديد" },
      { imageUrl: "", alt: "فريق العمل",           caption: "فريقنا في ورشة التدريب" },
      { imageUrl: "", alt: "العملاء",              caption: "لقاء مع شركاء النجاح" },
    ],
  },
  render: (props) => <GalleryCarouselBlock {...props} />,
};
