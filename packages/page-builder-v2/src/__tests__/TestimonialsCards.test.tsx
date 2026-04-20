/**
 * TestimonialsCards Block — TDD tests (Day 13)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestimonialsCardsBlock } from "../blocks/social/TestimonialsCards";
import { puckConfig } from "../config/puck-config";

const DEFAULT_ITEMS = [
  { name: "سارة الأحمدي",  role: "صاحبة متجر عبايات",  quote: "النظام غيّر طريقة عملي بالكامل، الآن أدير متجري بضغطة زر",     avatarUrl: "", rating: 5, verified: true  },
  { name: "محمد الشهراني", role: "مدير مطعم الأصالة",   quote: "الدعم الفني يرد في دقائق وهذا ما يميزهم عن غيرهم",            avatarUrl: "", rating: 5, verified: true  },
  { name: "نورة القحطاني", role: "مدربة لياقة بدنية",   quote: "أنصح كل صاحبة نشاط بتجربة المنصة، سهولة الاستخدام لا مثيل لها", avatarUrl: "", rating: 4, verified: false },
];

const defaults = {
  heading:    "ماذا يقول عملاؤنا",
  subheading: "آراء حقيقية من أصحاب نشاط سعوديون",
  items:      DEFAULT_ITEMS,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("TestimonialsCardsBlock — rendering", () => {
  it("renders heading", () => {
    render(<TestimonialsCardsBlock {...defaults} />);
    expect(screen.getByText("ماذا يقول عملاؤنا")).toBeTruthy();
  });

  it("renders all 3 customer names", () => {
    render(<TestimonialsCardsBlock {...defaults} />);
    expect(screen.getByText("سارة الأحمدي")).toBeTruthy();
    expect(screen.getByText("محمد الشهراني")).toBeTruthy();
    expect(screen.getByText("نورة القحطاني")).toBeTruthy();
  });

  it("renders all 3 roles", () => {
    render(<TestimonialsCardsBlock {...defaults} />);
    expect(screen.getByText("صاحبة متجر عبايات")).toBeTruthy();
    expect(screen.getByText("مدير مطعم الأصالة")).toBeTruthy();
    expect(screen.getByText("مدربة لياقة بدنية")).toBeTruthy();
  });

  it("renders quote text", () => {
    render(<TestimonialsCardsBlock {...defaults} />);
    expect(screen.getByText(/النظام غيّر طريقة/)).toBeTruthy();
  });

  it("renders exactly 3 cards", () => {
    const { container } = render(<TestimonialsCardsBlock {...defaults} />);
    expect(container.querySelectorAll("[data-testimonial-card]").length).toBe(3);
  });

  it("renders verified badge for verified items", () => {
    render(<TestimonialsCardsBlock {...defaults} />);
    const badges = screen.getAllByText(/موثّق|عميل موثّق/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("does not render verified badge for non-verified item", () => {
    const { container } = render(<TestimonialsCardsBlock {...defaults} />);
    const cards = container.querySelectorAll("[data-testimonial-card]");
    // last card (نورة) is not verified
    expect(cards[2].querySelector("[data-verified]")).toBeNull();
  });

  it("handles empty items array without crashing", () => {
    render(<TestimonialsCardsBlock {...defaults} items={[]} />);
    expect(screen.getByText("ماذا يقول عملاؤنا")).toBeTruthy();
  });

  it("renders star rating elements", () => {
    const { container } = render(<TestimonialsCardsBlock {...defaults} />);
    expect(container.querySelectorAll("[data-stars]").length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("TestimonialsCardsBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<TestimonialsCardsBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<TestimonialsCardsBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=testimonials-cards", () => {
    const { container } = render(<TestimonialsCardsBlock {...defaults} />);
    expect(container.querySelector("[data-block='testimonials-cards']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<TestimonialsCardsBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const cls = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "").join(" ");
    expect(cls).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("TestimonialsCards Puck config", () => {
  it("TestimonialsCards is registered", () => {
    expect(puckConfig.components).toHaveProperty("TestimonialsCards");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.TestimonialsCards;
    ["heading", "subheading", "items"].forEach((f) =>
      expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("items field is type array", () => {
    expect((puckConfig.components.TestimonialsCards.fields?.items as { type?: string })?.type).toBe("array");
  });

  it("defaultProps have 3 Arabic items", () => {
    const items = puckConfig.components.TestimonialsCards.defaultProps?.items as unknown[];
    expect(items?.length).toBe(3);
  });

  it("defaultProps heading is Arabic", () => {
    const h = puckConfig.components.TestimonialsCards.defaultProps?.heading as string;
    expect(/[\u0600-\u06FF]/.test(h)).toBe(true);
  });
});
