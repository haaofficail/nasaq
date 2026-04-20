/**
 * Features3col Block — Page Builder v2 (Day 12)
 *
 * Design: "Utility Triptych"
 * Deep navy canvas. Three luminous pillars, each with a glowing brand-blue
 * icon circle, bold ivory heading, and slate-blue description. Feels like
 * an architectural blueprint — structural, serious, authoritative.
 *
 * Mobile:  1 column (stacked)
 * Tablet:  3 columns
 * Desktop: 3 columns
 *
 * RTL: dir=rtl, ps-/pe-, text-start
 */
import React from "react";
import type { ComponentConfig } from "@measured/puck";
import { FeatureIcon, ICON_OPTIONS } from "./_icons";

// ── Types ─────────────────────────────────────────────────────

export interface Features3colItem {
  icon:        string;
  title:       string;
  description: string;
  link:        string;
}

export interface Features3colProps {
  heading:    string;
  subheading: string;
  items:      Features3colItem[];
}

// ── Column ─────────────────────────────────────────────────────

function FeatureCol({ item, index }: { item: Features3colItem; index: number }) {
  return (
    <div
      data-feature-col=""
      className="flex flex-col gap-5"
      style={{
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Icon circle */}
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{
          width:      "56px",
          height:     "56px",
          background: "rgba(91,155,213,0.18)",
          border:     "1px solid rgba(91,155,213,0.35)",
          flexShrink: 0,
        }}
      >
        <FeatureIcon name={item.icon} size={26} className="" />
      </div>

      {/* Accent line */}
      <div
        className="w-8 h-0.5 rounded-full"
        style={{ background: "var(--color-primary, #5b9bd5)", opacity: 0.8 }}
      />

      {/* Text */}
      <div className="flex flex-col gap-2">
        <h3
          className="font-bold text-start leading-snug"
          style={{ fontSize: "1.05rem", color: "#F5F9FD", letterSpacing: "-0.01em" }}
        >
          {item.title}
        </h3>
        <p
          className="text-start leading-relaxed"
          style={{ fontSize: "0.875rem", color: "#7EB0D5", lineHeight: "1.7" }}
        >
          {item.description}
        </p>
      </div>

      {/* Optional link */}
      {item.link && (
        <a
          href={item.link}
          className="text-start font-semibold inline-flex items-center gap-1"
          style={{ color: "var(--color-primary, #5b9bd5)", fontSize: "0.825rem" }}
        >
          اعرف المزيد
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3" aria-hidden="true">
            <path d="M2 6h8M7 3l3 3-3 3" />
          </svg>
        </a>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function Features3colBlock({ heading, subheading, items }: Features3colProps) {
  return (
    <section
      dir="rtl"
      data-block="features-3col"
      className="w-full py-16 ps-8 pe-8"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#0D2138",
      }}
    >
      {/* Header */}
      {(heading || subheading) && (
        <div className="mb-12 text-start">
          {heading && (
            <h2
              className="font-bold text-start"
              style={{
                fontSize:      "clamp(1.6rem, 3vw, 2.4rem)",
                color:         "#F5F9FD",
                letterSpacing: "-0.03em",
              }}
            >
              {heading}
            </h2>
          )}
          {subheading && (
            <p
              className="mt-3 text-start"
              style={{ color: "#5289BE", fontSize: "0.95rem", lineHeight: "1.7" }}
            >
              {subheading}
            </p>
          )}
          <div
            className="mt-4 w-12 h-px"
            style={{ background: "rgba(91,155,213,0.4)" }}
          />
        </div>
      )}

      {/* 3-col grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {items.map((item, i) => (
            <FeatureCol key={i} item={item} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const Features3colConfig: ComponentConfig<Features3colProps> = {
  label: "ميزات 3 أعمدة",
  fields: {
    heading: { type: "text", label: "عنوان القسم" },
    subheading: { type: "textarea", label: "النص التوضيحي" },
    items: {
      type: "array",
      label: "الميزات",
      arrayFields: {
        icon:        { type: "select",   label: "الأيقونة", options: ICON_OPTIONS },
        title:       { type: "text",     label: "العنوان" },
        description: { type: "textarea", label: "الوصف" },
        link:        { type: "text",     label: "الرابط (اختياري)" },
      },
      defaultItemProps: { icon: "shield", title: "ميزة جديدة", description: "وصف الميزة هنا", link: "" },
    },
  },
  defaultProps: {
    heading:    "لماذا تختارنا",
    subheading: "ميزات تجعل تجربتك استثنائية",
    items: [
      { icon: "shield",    title: "دفع آمن وسريع",       description: "بوابات دفع متعددة تتناسب مع عملائك السعوديين", link: "" },
      { icon: "truck",     title: "شحن إلى كل مكان",     description: "تكامل مع شركات الشحن الرائدة في المملكة",      link: "" },
      { icon: "headphones",title: "دعم على مدار الساعة", description: "فريق دعم سعودي يتحدث لغتك ويفهم احتياجاتك",   link: "" },
    ],
  },
  render: (props) => <Features3colBlock {...props} />,
};
