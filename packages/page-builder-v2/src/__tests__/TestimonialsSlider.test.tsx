/**
 * TestimonialsSlider Block — TDD tests (Day 13)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TestimonialsSliderBlock } from "../blocks/social/TestimonialsSlider";
import { puckConfig } from "../config/puck-config";

const DEFAULT_ITEMS = [
  { name: "سارة الأحمدي",  role: "صاحبة متجر عبايات",  quote: "النظام غيّر طريقة عملي بالكامل، الآن أدير متجري بضغطة زر",     avatarUrl: "", rating: 5 },
  { name: "محمد الشهراني", role: "مدير مطعم الأصالة",   quote: "الدعم الفني يرد في دقائق وهذا ما يميزهم عن غيرهم",            avatarUrl: "", rating: 5 },
  { name: "نورة القحطاني", role: "مدربة لياقة بدنية",   quote: "أنصح كل صاحبة نشاط بتجربة المنصة، سهولة الاستخدام لا مثيل لها", avatarUrl: "", rating: 4 },
];

const defaults = {
  heading:    "ماذا يقول عملاؤنا",
  subheading: "آراء حقيقية من أصحاب نشاط سعوديون",
  items:      DEFAULT_ITEMS,
  autoplay:   false,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("TestimonialsSliderBlock — rendering", () => {
  it("renders heading", () => {
    render(<TestimonialsSliderBlock {...defaults} />);
    expect(screen.getByText("ماذا يقول عملاؤنا")).toBeTruthy();
  });

  it("renders first slide name by default", () => {
    render(<TestimonialsSliderBlock {...defaults} />);
    expect(screen.getByText("سارة الأحمدي")).toBeTruthy();
  });

  it("renders first slide quote by default", () => {
    render(<TestimonialsSliderBlock {...defaults} />);
    expect(screen.getByText(/النظام غيّر طريقة/)).toBeTruthy();
  });

  it("renders navigation dots equal to item count", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    expect(container.querySelectorAll("[data-dot]").length).toBe(3);
  });

  it("renders prev and next buttons", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    expect(container.querySelector("[data-prev]")).toBeTruthy();
    expect(container.querySelector("[data-next]")).toBeTruthy();
  });

  it("handles empty items without crashing", () => {
    render(<TestimonialsSliderBlock {...defaults} items={[]} />);
    expect(screen.getByText("ماذا يقول عملاؤنا")).toBeTruthy();
  });

  it("renders star rating elements", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    expect(container.querySelectorAll("[data-stars]").length).toBeGreaterThan(0);
  });

  it("first dot is active", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    const dots = container.querySelectorAll("[data-dot]");
    expect(dots[0].getAttribute("data-active")).toBe("true");
  });
});

// ═══════════════════════════════════════════════════════════════
// INTERACTION
// ═══════════════════════════════════════════════════════════════

describe("TestimonialsSliderBlock — interaction", () => {
  it("clicking next dot shows second slide", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    const dots = container.querySelectorAll("[data-dot]");
    fireEvent.click(dots[1]);
    expect(screen.getByText("محمد الشهراني")).toBeTruthy();
  });

  it("clicking next button advances slide", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    const nextBtn = container.querySelector("[data-next]")!;
    fireEvent.click(nextBtn);
    expect(screen.getByText("محمد الشهراني")).toBeTruthy();
  });

  it("clicking prev button from slide 2 goes back to slide 1", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    const nextBtn = container.querySelector("[data-next]")!;
    const prevBtn = container.querySelector("[data-prev]")!;
    fireEvent.click(nextBtn);
    fireEvent.click(prevBtn);
    expect(screen.getByText("سارة الأحمدي")).toBeTruthy();
  });

  it("active dot updates on navigation", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    const dots = container.querySelectorAll("[data-dot]");
    fireEvent.click(dots[2]);
    expect(dots[2].getAttribute("data-active")).toBe("true");
    expect(dots[0].getAttribute("data-active")).toBe("false");
  });

  it("wraps around from last to first on next", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    const nextBtn = container.querySelector("[data-next]")!;
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    // Should wrap back to first
    expect(screen.getByText("سارة الأحمدي")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("TestimonialsSliderBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=testimonials-slider", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    expect(container.querySelector("[data-block='testimonials-slider']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<TestimonialsSliderBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const cls = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "").join(" ");
    expect(cls).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("TestimonialsSlider Puck config", () => {
  it("TestimonialsSlider is registered", () => {
    expect(puckConfig.components).toHaveProperty("TestimonialsSlider");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.TestimonialsSlider;
    ["heading", "subheading", "items", "autoplay"].forEach((f) =>
      expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("items field is type array", () => {
    expect((puckConfig.components.TestimonialsSlider.fields?.items as { type?: string })?.type).toBe("array");
  });

  it("defaultProps have 3 Arabic items", () => {
    const items = puckConfig.components.TestimonialsSlider.defaultProps?.items as unknown[];
    expect(items?.length).toBe(3);
  });
});
