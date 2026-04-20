/**
 * Features4cards Block — Page Builder v2 (Day 12)
 *
 * Design: "Glass Tiles"
 * Warm ivory backdrop. Four cards with a razor 3px brand-blue top border,
 * crisp white body, icon above title. Cards hover-lift with a delicate
 * directional shadow. Feels like a luxury service menu.
 *
 * Mobile:  1 column
 * Tablet:  2×2
 * Desktop: 4 columns
 *
 * RTL: dir=rtl, ps-/pe-, text-start
 */
import React from "react";
import type { ComponentConfig } from "@measured/puck";
import { FeatureIcon, ICON_OPTIONS } from "./_icons";

// ── Types ─────────────────────────────────────────────────────

export interface Features4cardsItem {
  icon:        string;
  title:       string;
  description: string;
  link:        string;
  imageUrl:    string;
}

export interface Features4cardsProps {
  heading:    string;
  subheading: string;
  items:      Features4cardsItem[];
  showLinks:  boolean;
}

// ── Card ──────────────────────────────────────────────────────

function FeatureCard({
  item,
  showLinks,
}: {
  item:      Features4cardsItem;
  showLinks: boolean;
}) {
  return (
    <article
      data-feature-card=""
      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1"
      style={{
        background:   "#ffffff",
        border:       "1px solid #E8EEF4",
        borderTop:    "3px solid var(--color-primary, #5b9bd5)",
        boxShadow:    "0 2px 8px rgba(91,155,213,0.06)",
      }}
    >
      {/* Image if provided */}
      {item.imageUrl && (
        <div className="overflow-hidden" style={{ height: "160px" }}>
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6 flex flex-col gap-3 flex-1">
        {/* Icon */}
        {!item.imageUrl && (
          <div
            className="inline-flex items-center justify-center rounded-xl"
            style={{
              width:      "44px",
              height:     "44px",
              background: "var(--color-primary-10, #EAF3FB)",
              color:      "var(--color-primary, #5b9bd5)",
              flexShrink: 0,
            }}
          >
            <FeatureIcon name={item.icon} size={22} />
          </div>
        )}

        <h3
          className="font-bold text-start leading-snug"
          style={{ fontSize: "1rem", color: "#0D2138", letterSpacing: "-0.01em" }}
        >
          {item.title}
        </h3>

        <p
          className="text-start leading-relaxed flex-1"
          style={{ fontSize: "0.875rem", color: "#5289BE", lineHeight: "1.7" }}
        >
          {item.description}
        </p>

        {showLinks && item.link && (
          <a
            href={item.link}
            className="mt-2 inline-flex items-center gap-1 font-semibold text-start"
            style={{ color: "var(--color-primary, #5b9bd5)", fontSize: "0.825rem" }}
          >
            اعرف المزيد
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3" aria-hidden="true">
              <path d="M2 6h8M7 3l3 3-3 3" />
            </svg>
          </a>
        )}

        {/* Fallback link when link is empty but showLinks=true */}
        {showLinks && !item.link && (
          <span
            className="mt-2 inline-flex items-center gap-1 font-semibold text-start"
            style={{ color: "var(--color-primary, #5b9bd5)", fontSize: "0.825rem", opacity: 0.6 }}
          >
            اعرف المزيد
          </span>
        )}
      </div>
    </article>
  );
}

// ── Main component ─────────────────────────────────────────────

export function Features4cardsBlock({ heading, subheading, items, showLinks }: Features4cardsProps) {
  return (
    <section
      dir="rtl"
      data-block="features-4cards"
      className="w-full py-14 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#FFFEF9",
      }}
    >
      {/* Header */}
      {(heading || subheading) && (
        <div className="mb-10 text-start">
          {heading && (
            <h2
              className="font-bold text-start"
              style={{
                fontSize:      "clamp(1.5rem, 3vw, 2.2rem)",
                color:         "#0D2138",
                letterSpacing: "-0.02em",
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
            className="mt-3 w-10 h-0.5 rounded-full"
            style={{ background: "var(--color-primary, #5b9bd5)" }}
          />
        </div>
      )}

      {/* 4-card grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item, i) => (
            <FeatureCard key={i} item={item} showLinks={showLinks} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const Features4cardsConfig: ComponentConfig<Features4cardsProps> = {
  label: "ميزات 4 بطاقات",
  fields: {
    heading:    { type: "text",     label: "عنوان القسم" },
    subheading: { type: "textarea", label: "النص التوضيحي" },
    showLinks: {
      type:    "radio",
      label:   "روابط 'اعرف المزيد'",
      options: [
        { value: true,  label: "إظهار" },
        { value: false, label: "إخفاء" },
      ],
    } as never,
    items: {
      type:  "array",
      label: "البطاقات",
      arrayFields: {
        icon:        { type: "select",   label: "أيقونة",         options: ICON_OPTIONS },
        title:       { type: "text",     label: "العنوان" },
        description: { type: "textarea", label: "الوصف" },
        link:        { type: "text",     label: "الرابط" },
        imageUrl:    { type: "text",     label: "رابط الصورة (اختياري)" },
      },
      defaultItemProps: { icon: "star", title: "ميزة جديدة", description: "وصف الميزة هنا", link: "", imageUrl: "" },
    },
  },
  defaultProps: {
    heading:    "خدماتنا المتميزة",
    subheading: "نوفر لك كل ما تحتاجه لإدارة متجرك",
    showLinks:  true,
    items: [
      { icon: "shield",     title: "دفع آمن وسريع",       description: "بوابات دفع متعددة تتناسب مع عملائك السعوديين", link: "/payments",  imageUrl: "" },
      { icon: "truck",      title: "شحن إلى كل مكان",     description: "تكامل مع شركات الشحن الرائدة في المملكة",      link: "/shipping",  imageUrl: "" },
      { icon: "headphones", title: "دعم على مدار الساعة", description: "فريق دعم سعودي يتحدث لغتك ويفهم احتياجاتك",   link: "/support",   imageUrl: "" },
      { icon: "bar-chart-2",title: "تقارير ذكية",          description: "تحليلات تساعدك على اتخاذ قرارات أفضل لمتجرك", link: "/analytics", imageUrl: "" },
    ],
  },
  render: (props) => <Features4cardsBlock {...props} />,
};
