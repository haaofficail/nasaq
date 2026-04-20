/**
 * FeaturesAlternating Block — Page Builder v2 (Day 12)
 *
 * Design: "Editorial Spread"
 * Full-width alternating rows like a magazine double-spread. Image fills
 * one half, copy fills the other. Rows alternate white ↔ F0F6FC background.
 * In RTL: even rows (0,2…) → image on START side (right), odd rows → image on END.
 * Mobile: always stacked, image above text.
 *
 * RTL: dir=rtl, grid order controlled via data-image-position
 */
import React from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ─────────────────────────────────────────────────────

export interface FeaturesAlternatingItem {
  title:       string;
  description: string;
  imageUrl:    string;
  link:        string;
}

export interface FeaturesAlternatingProps {
  heading:    string;
  subheading: string;
  items:      FeaturesAlternatingItem[];
}

// ── Row ───────────────────────────────────────────────────────

const ROW_BACKGROUNDS = ["#ffffff", "#F0F6FC"];

function AltRow({
  item,
  index,
}: {
  item:  FeaturesAlternatingItem;
  index: number;
}) {
  // In RTL: even → image on start (right), text on end (left)
  //         odd  → text on start (right), image on end (left)
  const imagePosition: "start" | "end" = index % 2 === 0 ? "start" : "end";
  const bg = ROW_BACKGROUNDS[index % 2];

  // Tailwind grid order: in RTL, "start" = right side = order-last in LTR grid
  // We use CSS order to flip sides
  const imageOrder = imagePosition === "start" ? "order-first sm:order-last" : "order-first sm:order-first";
  const textOrder  = imagePosition === "start" ? "order-last sm:order-first" : "order-last sm:order-last";

  return (
    <div
      data-alt-row=""
      data-image-position={imagePosition}
      className="grid grid-cols-1 sm:grid-cols-2"
      style={{ background: bg, minHeight: "400px" }}
    >
      {/* Image side */}
      <div
        className={`${imageOrder} overflow-hidden`}
        style={{ minHeight: "260px" }}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover"
            style={{ minHeight: "260px" }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, #EAF3FB 0%, #C9DDEF 100%)`,
              minHeight:  "260px",
              color:      "#A0BFDA",
            }}
          >
            <svg
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-20 h-20 opacity-40"
              aria-hidden="true"
            >
              <rect x="8" y="8" width="48" height="48" rx="6" />
              <circle cx="24" cy="24" r="6" />
              <path d="M8 44 l16-16 10 10 8-8 14 14" />
            </svg>
          </div>
        )}
      </div>

      {/* Text side */}
      <div
        className={`${textOrder} flex flex-col justify-center ps-10 pe-10 py-12 gap-5`}
      >
        {/* Index decoration */}
        <span
          className="font-bold tabular-nums"
          style={{
            fontSize:   "0.75rem",
            color:      "var(--color-primary, #5b9bd5)",
            letterSpacing: "0.12em",
            opacity:    0.7,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <h3
          className="font-bold text-start leading-tight"
          style={{
            fontSize:      "clamp(1.3rem, 2.5vw, 1.9rem)",
            color:         "#0D2138",
            letterSpacing: "-0.025em",
          }}
        >
          {item.title}
        </h3>

        <p
          className="text-start leading-relaxed"
          style={{ fontSize: "0.95rem", color: "#5289BE", lineHeight: "1.8", maxWidth: "38ch" }}
        >
          {item.description}
        </p>

        {item.link && (
          <a
            href={item.link}
            className="inline-flex items-center gap-2 font-semibold text-start"
            style={{ color: "var(--color-primary, #5b9bd5)", fontSize: "0.875rem" }}
          >
            اعرف المزيد
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true">
              <path d="M3 7h8M8 4l3 3-3 3" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function FeaturesAlternatingBlock({ heading, subheading, items }: FeaturesAlternatingProps) {
  return (
    <section
      dir="rtl"
      data-block="features-alternating"
      className="w-full overflow-hidden"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      {/* Header */}
      {(heading || subheading) && (
        <div
          className="py-12 ps-8 pe-8 text-start"
          style={{ background: "#FAFBFC" }}
        >
          {heading && (
            <h2
              className="font-bold text-start"
              style={{
                fontSize:      "clamp(1.6rem, 3vw, 2.4rem)",
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
              style={{ color: "#5289BE", fontSize: "0.95rem", lineHeight: "1.7" }}
            >
              {subheading}
            </p>
          )}
          <div
            className="mt-4 w-10 h-0.5 rounded-full"
            style={{ background: "var(--color-primary, #5b9bd5)" }}
          />
        </div>
      )}

      {/* Alternating rows */}
      {items.map((item, i) => (
        <AltRow key={i} item={item} index={i} />
      ))}
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const FeaturesAlternatingConfig: ComponentConfig<FeaturesAlternatingProps> = {
  label: "ميزات متناوبة",
  fields: {
    heading:    { type: "text",     label: "عنوان القسم" },
    subheading: { type: "textarea", label: "النص التوضيحي" },
    items: {
      type:  "array",
      label: "العناصر",
      arrayFields: {
        title:       { type: "text",     label: "العنوان" },
        description: { type: "textarea", label: "الوصف" },
        imageUrl:    { type: "text",     label: "رابط الصورة" },
        link:        { type: "text",     label: "الرابط (اختياري)" },
      },
      defaultItemProps: { title: "ميزة جديدة", description: "وصف الميزة هنا", imageUrl: "", link: "" },
    },
  },
  defaultProps: {
    heading:    "طريقة عملنا",
    subheading: "كل خطوة مصممة لراحتك",
    items: [
      { title: "دفع آمن وسريع",       description: "بوابات دفع متعددة تتناسب مع عملائك السعوديين", imageUrl: "", link: "" },
      { title: "شحن إلى كل مكان",     description: "تكامل مع شركات الشحن الرائدة في المملكة",      imageUrl: "", link: "" },
      { title: "دعم على مدار الساعة", description: "فريق دعم سعودي يتحدث لغتك ويفهم احتياجاتك",   imageUrl: "", link: "" },
    ],
  },
  render: (props) => <FeaturesAlternatingBlock {...props} />,
};
