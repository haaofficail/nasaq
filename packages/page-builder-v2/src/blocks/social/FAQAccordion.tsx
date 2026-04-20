/**
 * FAQAccordion Block — Page Builder v2 (Day 13)
 *
 * Design: "Clean Ledger"
 * Clean white rows with left/right accent on open. Smooth height transition.
 * Single-open or multi-open modes via allowMultiple prop.
 * Chevron rotates 180° when open.
 *
 * RTL: dir=rtl, ps-/pe-, text-start
 */
import React, { useState } from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ─────────────────────────────────────────────────────

export interface FAQAccordionItem {
  question: string;
  answer:   string;
}

export interface FAQAccordionProps {
  heading:       string;
  subheading:    string;
  items:         FAQAccordionItem[];
  allowMultiple: boolean;
}

// ── Single FAQ Item ───────────────────────────────────────────

function FAQItem({
  item,
  isOpen,
  onToggle,
}: {
  item:     FAQAccordionItem;
  isOpen:   boolean;
  onToggle: () => void;
}) {
  return (
    <div
      data-faq-item=""
      data-open={String(isOpen)}
      className="rounded-xl overflow-hidden transition-shadow duration-200"
      style={{
        background:  "#ffffff",
        border:      `1px solid ${isOpen ? "#5b9bd5" : "#E3EFF9"}`,
        boxShadow:   isOpen ? "0 4px 20px rgba(91,155,213,0.12)" : "none",
      }}
    >
      {/* Trigger */}
      <button
        data-faq-trigger=""
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 ps-5 pe-5 py-4 text-start"
        style={{
          background: "transparent",
          border:     "none",
          cursor:     "pointer",
        }}
        aria-expanded={isOpen}
      >
        <span
          className="font-semibold text-start flex-1"
          style={{
            color:    "#0D2138",
            fontSize: "0.95rem",
            lineHeight: "1.5",
          }}
        >
          {item.question}
        </span>

        {/* Chevron */}
        <span
          className="flex-shrink-0 transition-transform duration-300"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            color:     "#5b9bd5",
          }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </button>

      {/* Answer panel — conditionally rendered so queryByText returns null when closed */}
      {isOpen && (
        <div style={{ borderTop: "1px solid #E3EFF9" }}>
          <div className="ps-5 pe-5 pb-5">
            <p
              className="text-start leading-relaxed pt-4"
              style={{
                color:      "#5289BE",
                fontSize:   "0.9rem",
                lineHeight: "1.8",
              }}
            >
              {item.answer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function FAQAccordionBlock({ heading, subheading, items, allowMultiple }: FAQAccordionProps) {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  function toggle(index: number) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (!allowMultiple) next.clear();
        next.add(index);
      }
      return next;
    });
  }

  return (
    <section
      dir="rtl"
      data-block="faq-accordion"
      className="w-full py-16 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#F0F6FC",
      }}
    >
      <div className="max-w-3xl mx-auto">
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

        {/* Accordion items */}
        {items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map((item, i) => (
              <FAQItem
                key={i}
                item={item}
                isOpen={openSet.has(i)}
                onToggle={() => toggle(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const FAQAccordionConfig: ComponentConfig<FAQAccordionProps> = {
  label: "أسئلة شائعة — أكورديون",
  fields: {
    heading:    { type: "text",     label: "العنوان" },
    subheading: { type: "textarea", label: "النص التوضيحي" },
    allowMultiple: {
      type:    "radio",
      label:   "فتح أكثر من سؤال",
      options: [
        { label: "نعم", value: true  as never },
        { label: "لا",  value: false as never },
      ],
    },
    items: {
      type:  "array",
      label: "الأسئلة",
      arrayFields: {
        question: { type: "text",     label: "السؤال" },
        answer:   { type: "textarea", label: "الجواب" },
      },
      defaultItemProps: { question: "سؤال جديد؟", answer: "الجواب هنا" },
    },
  },
  defaultProps: {
    heading:       "الأسئلة الشائعة",
    subheading:    "كل ما تحتاج معرفته",
    allowMultiple: false,
    items: [
      { question: "كيف أبدأ الاستخدام؟",           answer: "سجّل حسابك وأضف منتجاتك وابدأ البيع خلال دقائق" },
      { question: "هل يوجد عقد طويل الأمد؟",        answer: "لا، الاشتراك شهري ويمكنك الإلغاء في أي وقت" },
      { question: "كيف يتم الدفع؟",                  answer: "ندعم مدى وفيزا وماستركارد وآبل باي وSTC Pay" },
      { question: "هل يوجد دعم فني باللغة العربية؟", answer: "نعم، فريق الدعم متاح 24/7 باللغة العربية" },
    ],
  },
  render: (props) => <FAQAccordionBlock {...props} />,
};
