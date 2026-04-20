/**
 * GalleryGrid Block — Page Builder v2 (Day 14)
 *
 * Design: "Minimal Gallery"
 * Clean white grid of images with caption overlay on hover.
 * Click → conditionally-rendered full-screen lightbox with close button.
 * Layouts: grid-3, grid-4, masonry (CSS columns).
 * Aspect ratio enforced via paddingBottom trick.
 *
 * RTL: dir=rtl, ps-/pe-, text-start
 */
import React, { useState } from "react";
import type { ComponentConfig } from "@measured/puck";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

export interface GalleryItem {
  imageUrl: string;
  alt:      string;
  caption:  string;
}

export interface GalleryGridProps {
  heading:     string;
  subheading:  string;
  items:       GalleryItem[];
  layout:      "grid-3" | "grid-4" | "masonry";
  aspectRatio: "square" | "portrait" | "landscape" | "auto";
}

// ── Aspect ratio map ──────────────────────────────────────────

const ASPECT_PADDING: Record<string, string> = {
  square:    "100%",
  portrait:  "133%",
  landscape: "60%",
  auto:      "0",
};

// ── Layout grid classes ───────────────────────────────────────

const GRID_CLASSES: Record<string, string> = {
  "grid-3": "grid grid-cols-2 sm:grid-cols-3 gap-3",
  "grid-4": "grid grid-cols-2 sm:grid-cols-4 gap-3",
  "masonry": "columns-2 sm:columns-3 gap-3",
};

// ── Lightbox ──────────────────────────────────────────────────

function Lightbox({
  items,
  startIndex,
  onClose,
}: {
  items:      GalleryItem[];
  startIndex: number;
  onClose:    () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const item = items[idx];

  function next() { setIdx((i) => (i + 1) % items.length); }
  function prev() { setIdx((i) => (i - 1 + items.length) % items.length); }

  return (
    <div
      data-lightbox=""
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        data-lightbox-close=""
        onClick={onClose}
        aria-label="إغلاق"
        className="absolute top-4 end-4 w-10 h-10 rounded-full flex items-center justify-center z-10"
        style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "#fff" }}
      >
        <X size={20} aria-hidden="true" />
      </button>

      {/* Prev */}
      {items.length > 1 && (
        <button
          data-lightbox-prev=""
          onClick={(e) => { e.stopPropagation(); prev(); }}
          aria-label="السابق"
          className="absolute start-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "#fff" }}
        >
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-w-4xl w-full mx-6"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={item.imageUrl}
          alt={item.alt}
          className="w-full rounded-xl object-contain"
          style={{ maxHeight: "80vh" }}
        />
        {item.caption && (
          <p
            className="mt-3 text-center"
            style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}
          >
            {item.caption}
          </p>
        )}
      </div>

      {/* Next */}
      {items.length > 1 && (
        <button
          data-lightbox-next=""
          onClick={(e) => { e.stopPropagation(); next(); }}
          aria-label="التالي"
          className="absolute end-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "#fff" }}
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ── Grid Item ─────────────────────────────────────────────────

function GridItem({
  item,
  aspectRatio,
  onClick,
}: {
  item:        GalleryItem;
  aspectRatio: string;
  onClick:     () => void;
}) {
  const paddingBottom = ASPECT_PADDING[aspectRatio] ?? "100%";
  const isAuto = aspectRatio === "auto";

  return (
    <div
      data-gallery-item=""
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group overflow-hidden rounded-xl cursor-pointer"
      style={{ position: "relative" }}
    >
      {isAuto ? (
        <img
          src={item.imageUrl}
          alt={item.alt}
          loading="lazy"
          className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div style={{ position: "relative", paddingBottom, overflow: "hidden" }}>
          <img
            src={item.imageUrl}
            alt={item.alt}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      {/* Caption overlay */}
      {item.caption && (
        <div
          className="absolute bottom-0 start-0 end-0 px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
          }}
        >
          <p
            className="text-start font-medium"
            style={{ color: "#ffffff", fontSize: "0.78rem" }}
          >
            {item.caption}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function GalleryGridBlock({ heading, subheading, items, layout, aspectRatio }: GalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <section
      dir="rtl"
      data-block="gallery-grid"
      className="w-full py-16 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#ffffff",
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        {(heading || subheading) && (
          <div className="mb-8 text-start">
            {heading && (
              <h2
                className="font-bold text-start"
                style={{
                  fontSize:      "clamp(1.6rem, 3vw, 2.2rem)",
                  color:         "#0D2138",
                  letterSpacing: "-0.03em",
                }}
              >
                {heading}
              </h2>
            )}
            {subheading && (
              <p
                className="mt-2 text-start"
                style={{ color: "#5289BE", fontSize: "0.9rem", lineHeight: "1.7" }}
              >
                {subheading}
              </p>
            )}
            <div
              className="mt-4 w-10 h-0.5 rounded-full"
              style={{ background: "#5b9bd5" }}
            />
          </div>
        )}

        {/* Grid */}
        {items.length > 0 && (
          <div
            data-layout={layout}
            className={GRID_CLASSES[layout] ?? GRID_CLASSES["grid-3"]}
          >
            {items.map((item, i) => (
              <GridItem
                key={i}
                item={item}
                aspectRatio={aspectRatio}
                onClick={() => setLightboxIndex(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox — conditionally rendered */}
      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const GalleryGridConfig: ComponentConfig<GalleryGridProps> = {
  label: "معرض صور — شبكة",
  fields: {
    heading:    { type: "text",     label: "العنوان" },
    subheading: { type: "textarea", label: "النص التوضيحي" },
    layout: {
      type:    "radio",
      label:   "التخطيط",
      options: [
        { label: "3 أعمدة",  value: "grid-3"  },
        { label: "4 أعمدة",  value: "grid-4"  },
        { label: "ماسونري", value: "masonry" },
      ],
    },
    aspectRatio: {
      type:    "radio",
      label:   "نسبة الصورة",
      options: [
        { label: "مربع",      value: "square"    },
        { label: "عمودي",     value: "portrait"  },
        { label: "أفقي",      value: "landscape" },
        { label: "تلقائي",    value: "auto"      },
      ],
    },
    items: {
      type:  "array",
      label: "الصور",
      arrayFields: {
        imageUrl: { type: "text", label: "رابط الصورة" },
        alt:      { type: "text", label: "النص البديل (accessibility)" },
        caption:  { type: "text", label: "التعليق (اختياري)" },
      },
      defaultItemProps: { imageUrl: "", alt: "صورة", caption: "" },
    },
  },
  defaultProps: {
    heading:     "معرض الصور",
    subheading:  "لحظات من رحلتنا",
    layout:      "grid-3",
    aspectRatio: "square",
    items: [
      { imageUrl: "", alt: "متجر الرياض",          caption: "افتتاح متجر الرياض الجديد" },
      { imageUrl: "", alt: "فعالية إطلاق المنتج", caption: "حفل إطلاق منتجنا الجديد" },
      { imageUrl: "", alt: "فريق العمل",           caption: "فريقنا في ورشة التدريب" },
      { imageUrl: "", alt: "العملاء",              caption: "لقاء مع شركاء النجاح" },
      { imageUrl: "", alt: "المعرض السنوي",        caption: "مشاركتنا في المعرض السنوي" },
      { imageUrl: "", alt: "مكتبنا",               caption: "مقر الشركة في الرياض" },
    ],
  },
  render: (props) => <GalleryGridBlock {...props} />,
};
