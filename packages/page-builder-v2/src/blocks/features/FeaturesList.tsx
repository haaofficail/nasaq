/**
 * FeaturesList Block — Page Builder v2 (Day 12)
 *
 * Design: "Numbered Manuscript"
 * Pure white canvas. Oversized brand-blue numbers (01, 02…) anchor each row
 * on the right side (RTL). Title bold charcoal. Description muted blue.
 * Full-width razor-thin rules separate each item. Feels scholarly, precise —
 * like a table of contents from a premium report.
 *
 * RTL: dir=rtl, ps-/pe-, text-start
 */
import React from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ─────────────────────────────────────────────────────

export interface FeaturesListItem {
  title:       string;
  description: string;
}

export interface FeaturesListProps {
  heading:     string;
  subheading:  string;
  items:       FeaturesListItem[];
  showNumbers: boolean;
  numberStyle: "padded" | "plain";
}

// ── Format number ──────────────────────────────────────────────

function formatNum(i: number, style: "padded" | "plain"): string {
  const n = i + 1;
  return style === "padded" ? String(n).padStart(2, "0") : String(n);
}

// ── Row ───────────────────────────────────────────────────────

function ListRow({
  item,
  index,
  isLast,
  showNumbers,
  numberStyle,
}: {
  item:        FeaturesListItem;
  index:       number;
  isLast:      boolean;
  showNumbers: boolean;
  numberStyle: "padded" | "plain";
}) {
  return (
    <>
      <div
        data-feature-row=""
        className="flex gap-8 py-8 items-start"
      >
        {/* Number anchor */}
        {showNumbers && (
          <div
            className="flex-shrink-0 font-bold tabular-nums select-none"
            style={{
              fontSize:      "clamp(2rem, 5vw, 3.5rem)",
              color:         "var(--color-primary, #5b9bd5)",
              lineHeight:    1,
              letterSpacing: "-0.04em",
              opacity:       0.85,
              minWidth:      "3.5rem",
              textAlign:     "center",
            }}
            aria-hidden="true"
          >
            {formatNum(index, numberStyle)}
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col gap-2 flex-1">
          <h3
            className="font-bold text-start"
            style={{ fontSize: "1.1rem", color: "#0D2138", letterSpacing: "-0.02em" }}
          >
            {item.title}
          </h3>
          <p
            className="text-start leading-relaxed"
            style={{ fontSize: "0.9rem", color: "#5289BE", lineHeight: "1.75" }}
          >
            {item.description}
          </p>
        </div>
      </div>

      {/* Divider (not after last item) */}
      {!isLast && (
        <div
          className="w-full"
          style={{ height: "1px", background: "#E8EEF4" }}
          aria-hidden="true"
        />
      )}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────

export function FeaturesListBlock({ heading, subheading, items, showNumbers, numberStyle }: FeaturesListProps) {
  return (
    <section
      dir="rtl"
      data-block="features-list"
      className="w-full py-14 ps-8 pe-8"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#ffffff",
      }}
    >
      {/* Header */}
      {(heading || subheading) && (
        <div className="mb-2 text-start">
          {heading && (
            <h2
              className="font-bold text-start"
              style={{
                fontSize:      "clamp(1.5rem, 3vw, 2.2rem)",
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
        </div>
      )}

      {/* Separator below header */}
      {items.length > 0 && (
        <div
          className="w-full mt-6"
          style={{ height: "1px", background: "#E8EEF4" }}
          aria-hidden="true"
        />
      )}

      {/* List */}
      {items.map((item, i) => (
        <ListRow
          key={i}
          item={item}
          index={i}
          isLast={i === items.length - 1}
          showNumbers={showNumbers}
          numberStyle={numberStyle}
        />
      ))}
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const FeaturesListConfig: ComponentConfig<FeaturesListProps> = {
  label: "ميزات قائمة مرقّمة",
  fields: {
    heading:    { type: "text",     label: "عنوان القسم" },
    subheading: { type: "textarea", label: "النص التوضيحي" },
    showNumbers: {
      type:    "radio",
      label:   "الأرقام التسلسلية",
      options: [
        { value: true,  label: "إظهار" },
        { value: false, label: "إخفاء" },
      ],
    } as never,
    numberStyle: {
      type:  "select",
      label: "شكل الرقم",
      options: [
        { value: "padded", label: "مُبطَّن (01، 02)" },
        { value: "plain",  label: "بسيط (1، 2)" },
      ],
    },
    items: {
      type:  "array",
      label: "العناصر",
      arrayFields: {
        title:       { type: "text",     label: "العنوان" },
        description: { type: "textarea", label: "الوصف" },
      },
      defaultItemProps: { title: "ميزة جديدة", description: "وصف الميزة هنا" },
    },
  },
  defaultProps: {
    heading:     "كيف نساعدك",
    subheading:  "خطوات واضحة نحو النجاح",
    showNumbers: true,
    numberStyle: "padded",
    items: [
      { title: "دفع آمن وسريع",       description: "بوابات دفع متعددة تتناسب مع عملائك السعوديين" },
      { title: "شحن إلى كل مكان",     description: "تكامل مع شركات الشحن الرائدة في المملكة" },
      { title: "دعم على مدار الساعة", description: "فريق دعم سعودي يتحدث لغتك ويفهم احتياجاتك" },
    ],
  },
  render: (props) => <FeaturesListBlock {...props} />,
};
