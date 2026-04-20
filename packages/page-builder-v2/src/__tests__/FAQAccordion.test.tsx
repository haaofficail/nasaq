/**
 * FAQAccordion Block — TDD tests (Day 13)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FAQAccordionBlock } from "../blocks/social/FAQAccordion";
import { puckConfig } from "../config/puck-config";

const DEFAULT_ITEMS = [
  { question: "كيف أبدأ الاستخدام؟",           answer: "سجّل حسابك وأضف منتجاتك وابدأ البيع خلال دقائق" },
  { question: "هل يوجد عقد طويل الأمد؟",        answer: "لا، الاشتراك شهري ويمكنك الإلغاء في أي وقت" },
  { question: "كيف يتم الدفع؟",                  answer: "ندعم مدى وفيزا وماستركارد وآبل باي وSTC Pay" },
  { question: "هل يوجد دعم فني باللغة العربية؟", answer: "نعم، فريق الدعم متاح 24/7 باللغة العربية" },
];

const defaults = {
  heading:       "الأسئلة الشائعة",
  subheading:    "كل ما تحتاج معرفته",
  items:         DEFAULT_ITEMS,
  allowMultiple: false,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("FAQAccordionBlock — rendering", () => {
  it("renders heading", () => {
    render(<FAQAccordionBlock {...defaults} />);
    expect(screen.getByText("الأسئلة الشائعة")).toBeTruthy();
  });

  it("renders all 4 questions", () => {
    render(<FAQAccordionBlock {...defaults} />);
    expect(screen.getByText("كيف أبدأ الاستخدام؟")).toBeTruthy();
    expect(screen.getByText("هل يوجد عقد طويل الأمد؟")).toBeTruthy();
    expect(screen.getByText("كيف يتم الدفع؟")).toBeTruthy();
    expect(screen.getByText("هل يوجد دعم فني باللغة العربية؟")).toBeTruthy();
  });

  it("renders exactly 4 accordion items", () => {
    const { container } = render(<FAQAccordionBlock {...defaults} />);
    expect(container.querySelectorAll("[data-faq-item]").length).toBe(4);
  });

  it("all items collapsed by default", () => {
    const { container } = render(<FAQAccordionBlock {...defaults} />);
    const items = container.querySelectorAll("[data-faq-item]");
    items.forEach((item) => {
      expect(item.getAttribute("data-open")).toBe("false");
    });
  });

  it("answers not visible when collapsed", () => {
    render(<FAQAccordionBlock {...defaults} />);
    expect(screen.queryByText(/سجّل حسابك/)).toBeFalsy();
  });

  it("handles empty items without crashing", () => {
    render(<FAQAccordionBlock {...defaults} items={[]} />);
    expect(screen.getByText("الأسئلة الشائعة")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// INTERACTION
// ═══════════════════════════════════════════════════════════════

describe("FAQAccordionBlock — interaction", () => {
  it("clicking question opens it", () => {
    const { container } = render(<FAQAccordionBlock {...defaults} />);
    const firstBtn = container.querySelector("[data-faq-trigger]")!;
    fireEvent.click(firstBtn);
    const firstItem = container.querySelector("[data-faq-item]")!;
    expect(firstItem.getAttribute("data-open")).toBe("true");
  });

  it("clicking open question closes it", () => {
    const { container } = render(<FAQAccordionBlock {...defaults} />);
    const firstBtn = container.querySelector("[data-faq-trigger]")!;
    fireEvent.click(firstBtn);
    fireEvent.click(firstBtn);
    const firstItem = container.querySelector("[data-faq-item]")!;
    expect(firstItem.getAttribute("data-open")).toBe("false");
  });

  it("answer is visible after opening", () => {
    const { container } = render(<FAQAccordionBlock {...defaults} />);
    const firstBtn = container.querySelector("[data-faq-trigger]")!;
    fireEvent.click(firstBtn);
    expect(screen.getByText(/سجّل حسابك/)).toBeTruthy();
  });

  it("single-mode: opening second closes first", () => {
    const { container } = render(<FAQAccordionBlock {...defaults} allowMultiple={false} />);
    const triggers = container.querySelectorAll("[data-faq-trigger]");
    fireEvent.click(triggers[0]);
    fireEvent.click(triggers[1]);
    const items = container.querySelectorAll("[data-faq-item]");
    expect(items[0].getAttribute("data-open")).toBe("false");
    expect(items[1].getAttribute("data-open")).toBe("true");
  });

  it("multiple-mode: both items can be open simultaneously", () => {
    const { container } = render(<FAQAccordionBlock {...defaults} allowMultiple={true} />);
    const triggers = container.querySelectorAll("[data-faq-trigger]");
    fireEvent.click(triggers[0]);
    fireEvent.click(triggers[1]);
    const items = container.querySelectorAll("[data-faq-item]");
    expect(items[0].getAttribute("data-open")).toBe("true");
    expect(items[1].getAttribute("data-open")).toBe("true");
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("FAQAccordionBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<FAQAccordionBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<FAQAccordionBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=faq-accordion", () => {
    const { container } = render(<FAQAccordionBlock {...defaults} />);
    expect(container.querySelector("[data-block='faq-accordion']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<FAQAccordionBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const cls = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "").join(" ");
    expect(cls).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("FAQAccordion Puck config", () => {
  it("FAQAccordion is registered", () => {
    expect(puckConfig.components).toHaveProperty("FAQAccordion");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.FAQAccordion;
    ["heading", "subheading", "items", "allowMultiple"].forEach((f) =>
      expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("items field is type array", () => {
    expect((puckConfig.components.FAQAccordion.fields?.items as { type?: string })?.type).toBe("array");
  });

  it("defaultProps have 4 Arabic items", () => {
    const items = puckConfig.components.FAQAccordion.defaultProps?.items as unknown[];
    expect(items?.length).toBe(4);
  });

  it("defaultProps heading is Arabic", () => {
    const h = puckConfig.components.FAQAccordion.defaultProps?.heading as string;
    expect(/[\u0600-\u06FF]/.test(h)).toBe(true);
  });
});
