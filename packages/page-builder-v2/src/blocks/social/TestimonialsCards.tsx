/**
 * TestimonialsCards Block — Page Builder v2 (Day 13)
 *
 * Design: "Trust Grid"
 * 3 testimonial cards in a row. Soft brand-blue tones.
 * Each card: avatar initials circle, name, role, star rating, quote, verified badge.
 *
 * RTL: dir=rtl, ps-/pe-, text-start
 */
import React from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ─────────────────────────────────────────────────────

export interface TestimonialsCardsItem {
  name:      string;
  role:      string;
  quote:     string;
  avatarUrl: string;
  rating:    number;
  verified:  boolean;
}

export interface TestimonialsCardsProps {
  heading:    string;
  subheading: string;
  items:      TestimonialsCardsItem[];
}

// ── Star Rating ───────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div data-stars="" className="flex gap-0.5" aria-label={`تقييم ${rating} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 16 16"
          fill={n <= rating ? "#F5A623" : "none"}
          stroke={n <= rating ? "#F5A623" : "#C9DDEF"}
          strokeWidth="1.2"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.4l-3.6 1.9.7-4L2.2 5.7l4-.6z" />
        </svg>
      ))}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-11 h-11 rounded-full object-cover"
        style={{ border: "2px solid #C9DDEF" }}
      />
    );
  }
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
      style={{
        background: "linear-gradient(135deg, #5b9bd5 0%, #3d84c8 100%)",
        color:      "#ffffff",
        fontSize:   "0.85rem",
      }}
    >
      {initials}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────

function TestimonialCard({ item }: { item: TestimonialsCardsItem }) {
  return (
    <div
      data-testimonial-card=""
      className="flex flex-col gap-4 rounded-2xl p-6"
      style={{
        background:   "#ffffff",
        border:       "1px solid #E3EFF9",
        boxShadow:    "0 2px 16px rgba(91,155,213,0.08)",
        position:     "relative",
        overflow:     "hidden",
      }}
    >
      {/* Decorative top accent */}
      <div
        className="absolute top-0 start-0 end-0 h-1 rounded-t-2xl"
        style={{ background: "linear-gradient(90deg, #5b9bd5, #3d84c8)" }}
      />

      {/* Quote mark decoration */}
      <div
        className="absolute top-4 end-5 font-bold select-none pointer-events-none"
        style={{ fontSize: "4rem", lineHeight: 1, color: "#E3EFF9", fontFamily: "serif" }}
        aria-hidden="true"
      >
        "
      </div>

      {/* Stars */}
      <StarRating rating={item.rating} />

      {/* Quote */}
      <p
        className="text-start leading-relaxed flex-1"
        style={{ color: "#2F6190", fontSize: "0.9rem", lineHeight: "1.85" }}
      >
        {item.quote}
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid #E3EFF9" }}>
        <Avatar name={item.name} avatarUrl={item.avatarUrl} />
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-bold text-start truncate"
              style={{ color: "#0D2138", fontSize: "0.875rem" }}
            >
              {item.name}
            </span>
            {item.verified && (
              <span
                data-verified=""
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium flex-shrink-0"
                style={{
                  background: "rgba(91,155,213,0.12)",
                  color:      "#3d84c8",
                  fontSize:   "0.7rem",
                }}
              >
                <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5" aria-hidden="true">
                  <path d="M6 0L7.8 2.2 10.5 1.6 10.4 4.4 13 5.5 11.5 7.8 13 10.1 10.4 11.2 10.5 14 7.8 13.4 6 15.6 4.2 13.4 1.5 14 1.6 11.2-1 10.1.5 7.8-1 5.5 1.6 4.4 1.5 1.6 4.2 2.2z" />
                </svg>
                موثّق
              </span>
            )}
          </div>
          <span
            className="text-start truncate"
            style={{ color: "#5289BE", fontSize: "0.78rem" }}
          >
            {item.role}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function TestimonialsCardsBlock({ heading, subheading, items }: TestimonialsCardsProps) {
  return (
    <section
      dir="rtl"
      data-block="testimonials-cards"
      className="w-full py-16 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#F0F6FC",
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        {(heading || subheading) && (
          <div className="mb-10 text-start">
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
                style={{ color: "#5289BE", fontSize: "0.95rem", lineHeight: "1.7" }}
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

        {/* Cards grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {items.map((item, i) => (
              <TestimonialCard key={i} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const TestimonialsCardsConfig: ComponentConfig<TestimonialsCardsProps> = {
  label: "شهادات — بطاقات",
  fields: {
    heading:    { type: "text",     label: "العنوان" },
    subheading: { type: "textarea", label: "النص التوضيحي" },
    items: {
      type:  "array",
      label: "الشهادات",
      arrayFields: {
        name:      { type: "text",     label: "الاسم" },
        role:      { type: "text",     label: "المسمى الوظيفي" },
        quote:     { type: "textarea", label: "الشهادة" },
        avatarUrl: { type: "text",     label: "رابط الصورة (اختياري)" },
        rating:    { type: "number",   label: "التقييم (1-5)" } as never,
        verified:  { type: "radio",    label: "موثّق؟", options: [{ label: "نعم", value: true as never }, { label: "لا", value: false as never }] } as never,
      },
      defaultItemProps: { name: "عميل جديد", role: "صاحب نشاط", quote: "تجربة رائعة", avatarUrl: "", rating: 5, verified: true },
    },
  },
  defaultProps: {
    heading:    "ماذا يقول عملاؤنا",
    subheading: "آراء حقيقية من أصحاب نشاط سعوديون",
    items: [
      { name: "سارة الأحمدي",  role: "صاحبة متجر عبايات",  quote: "النظام غيّر طريقة عملي بالكامل، الآن أدير متجري بضغطة زر",     avatarUrl: "", rating: 5, verified: true  },
      { name: "محمد الشهراني", role: "مدير مطعم الأصالة",   quote: "الدعم الفني يرد في دقائق وهذا ما يميزهم عن غيرهم",            avatarUrl: "", rating: 5, verified: true  },
      { name: "نورة القحطاني", role: "مدربة لياقة بدنية",   quote: "أنصح كل صاحبة نشاط بتجربة المنصة، سهولة الاستخدام لا مثيل لها", avatarUrl: "", rating: 4, verified: false },
    ],
  },
  render: (props) => <TestimonialsCardsBlock {...props} />,
};
