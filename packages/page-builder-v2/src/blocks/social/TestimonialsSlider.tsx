/**
 * TestimonialsSlider Block — Page Builder v2 (Day 13)
 *
 * Design: "Stage Spotlight"
 * One big centered slide at a time. Large quote, avatar, name below.
 * Dots navigation + prev/next arrow buttons. Optional autoplay.
 *
 * RTL: dir=rtl, arrows semantically labeled for RTL direction
 */
import React, { useState, useEffect, useCallback } from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ─────────────────────────────────────────────────────

export interface TestimonialsSliderItem {
  name:      string;
  role:      string;
  quote:     string;
  avatarUrl: string;
  rating:    number;
}

export interface TestimonialsSliderProps {
  heading:    string;
  subheading: string;
  items:      TestimonialsSliderItem[];
  autoplay:   boolean;
}

// ── Star Rating ───────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div data-stars="" className="flex gap-1 justify-center" aria-label={`تقييم ${rating} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 16 16"
          fill={n <= rating ? "#F5A623" : "none"}
          stroke={n <= rating ? "#F5A623" : "#C9DDEF"}
          strokeWidth="1.2"
          className="w-5 h-5"
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
        className="w-16 h-16 rounded-full object-cover mx-auto"
        style={{ border: "3px solid #C9DDEF" }}
      />
    );
  }
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("");
  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center font-bold mx-auto"
      style={{
        background: "linear-gradient(135deg, #5b9bd5 0%, #3d84c8 100%)",
        color:      "#ffffff",
        fontSize:   "1.1rem",
      }}
    >
      {initials}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function TestimonialsSliderBlock({ heading, subheading, items, autoplay }: TestimonialsSliderProps) {
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
      data-block="testimonials-slider"
      className="w-full py-16 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#ffffff",
      }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        {(heading || subheading) && (
          <div className="mb-10 text-center">
            {heading && (
              <h2
                className="font-bold"
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
                className="mt-2"
                style={{ color: "#5289BE", fontSize: "0.95rem", lineHeight: "1.7" }}
              >
                {subheading}
              </p>
            )}
          </div>
        )}

        {/* Slide */}
        {slide && (
          <div
            key={current}
            className="text-center px-4"
          >
            {/* Large quote mark */}
            <div
              className="font-bold select-none mb-4"
              style={{ fontSize: "5rem", lineHeight: 1, color: "#C9DDEF", fontFamily: "serif" }}
              aria-hidden="true"
            >
              "
            </div>

            {/* Stars */}
            <StarRating rating={slide.rating} />

            {/* Quote */}
            <blockquote
              className="mt-6 mb-8 leading-relaxed"
              style={{
                color:      "#2F6190",
                fontSize:   "clamp(1rem, 2vw, 1.2rem)",
                lineHeight: "1.9",
                fontStyle:  "normal",
              }}
            >
              {slide.quote}
            </blockquote>

            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-3">
              <Avatar name={slide.name} avatarUrl={slide.avatarUrl} />
              <div>
                <p className="font-bold" style={{ color: "#0D2138", fontSize: "0.95rem" }}>
                  {slide.name}
                </p>
                <p style={{ color: "#5289BE", fontSize: "0.82rem" }}>{slide.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        {items.length > 1 && (
          <div className="mt-10 flex flex-col items-center gap-5">
            {/* Dots */}
            <div className="flex gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  data-dot=""
                  data-active={String(i === current)}
                  onClick={() => setCurrent(i)}
                  aria-label={`الشريحة ${i + 1}`}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width:      i === current ? "28px" : "10px",
                    height:     "10px",
                    background: i === current ? "#5b9bd5" : "#C9DDEF",
                    border:     "none",
                    cursor:     "pointer",
                    padding:    0,
                  }}
                />
              ))}
            </div>

            {/* Arrows */}
            <div className="flex gap-3">
              <button
                data-prev=""
                onClick={prev}
                aria-label="السابق"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: "#F0F6FC",
                  border:     "1px solid #C9DDEF",
                  cursor:     "pointer",
                  color:      "#5b9bd5",
                }}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
                  <path d="M10 4l-4 4 4 4" />
                </svg>
              </button>
              <button
                data-next=""
                onClick={next}
                aria-label="التالي"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: "#5b9bd5",
                  border:     "none",
                  cursor:     "pointer",
                  color:      "#ffffff",
                }}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const TestimonialsSliderConfig: ComponentConfig<TestimonialsSliderProps> = {
  label: "شهادات — شرائح",
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
      label: "الشهادات",
      arrayFields: {
        name:      { type: "text",     label: "الاسم" },
        role:      { type: "text",     label: "المسمى الوظيفي" },
        quote:     { type: "textarea", label: "الشهادة" },
        avatarUrl: { type: "text",     label: "رابط الصورة (اختياري)" },
        rating:    { type: "number",   label: "التقييم (1-5)" } as never,
      },
      defaultItemProps: { name: "عميل جديد", role: "صاحب نشاط", quote: "تجربة رائعة", avatarUrl: "", rating: 5 },
    },
  },
  defaultProps: {
    heading:    "ماذا يقول عملاؤنا",
    subheading: "آراء حقيقية من أصحاب نشاط سعوديون",
    autoplay:   false,
    items: [
      { name: "سارة الأحمدي",  role: "صاحبة متجر عبايات",  quote: "النظام غيّر طريقة عملي بالكامل، الآن أدير متجري بضغطة زر",     avatarUrl: "", rating: 5 },
      { name: "محمد الشهراني", role: "مدير مطعم الأصالة",   quote: "الدعم الفني يرد في دقائق وهذا ما يميزهم عن غيرهم",            avatarUrl: "", rating: 5 },
      { name: "نورة القحطاني", role: "مدربة لياقة بدنية",   quote: "أنصح كل صاحبة نشاط بتجربة المنصة، سهولة الاستخدام لا مثيل لها", avatarUrl: "", rating: 4 },
    ],
  },
  render: (props) => <TestimonialsSliderBlock {...props} />,
};
