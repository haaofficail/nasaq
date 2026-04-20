/**
 * Features4cards Block — TDD tests (Day 12)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Features4cardsBlock } from "../blocks/features/Features4cards";
import { puckConfig } from "../config/puck-config";

const DEFAULT_ITEMS = [
  { icon: "shield",      title: "دفع آمن وسريع",       description: "بوابات دفع متعددة تتناسب مع عملائك السعوديين", link: "/payments",  imageUrl: "" },
  { icon: "truck",       title: "شحن إلى كل مكان",     description: "تكامل مع شركات الشحن الرائدة في المملكة",      link: "/shipping",  imageUrl: "" },
  { icon: "headphones",  title: "دعم على مدار الساعة",  description: "فريق دعم سعودي يتحدث لغتك ويفهم احتياجاتك",   link: "/support",   imageUrl: "" },
  { icon: "bar-chart-2", title: "تقارير ذكية",          description: "تحليلات تساعدك على اتخاذ قرارات أفضل لمتجرك", link: "/analytics", imageUrl: "" },
];

const defaults = {
  heading:    "خدماتنا المتميزة",
  subheading: "نوفر لك كل ما تحتاجه لإدارة متجرك",
  items:      DEFAULT_ITEMS,
  showLinks:  true,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("Features4cardsBlock — rendering", () => {
  it("renders heading text", () => {
    render(<Features4cardsBlock {...defaults} />);
    expect(screen.getByText("خدماتنا المتميزة")).toBeTruthy();
  });

  it("renders all 4 card titles", () => {
    render(<Features4cardsBlock {...defaults} />);
    expect(screen.getByText("دفع آمن وسريع")).toBeTruthy();
    expect(screen.getByText("شحن إلى كل مكان")).toBeTruthy();
    expect(screen.getByText("دعم على مدار الساعة")).toBeTruthy();
    expect(screen.getByText("تقارير ذكية")).toBeTruthy();
  });

  it("renders all 4 card descriptions", () => {
    render(<Features4cardsBlock {...defaults} />);
    expect(screen.getByText(/بوابات دفع/)).toBeTruthy();
    expect(screen.getByText(/شركات الشحن/)).toBeTruthy();
    expect(screen.getByText(/فريق دعم/)).toBeTruthy();
    expect(screen.getByText(/تحليلات/)).toBeTruthy();
  });

  it("renders exactly 4 cards", () => {
    const { container } = render(<Features4cardsBlock {...defaults} />);
    const cards = container.querySelectorAll("[data-feature-card]");
    expect(cards.length).toBe(4);
  });

  it("renders 'اعرف المزيد' links when showLinks=true", () => {
    render(<Features4cardsBlock {...defaults} showLinks={true} />);
    const links = screen.getAllByText(/اعرف المزيد/);
    expect(links.length).toBeGreaterThan(0);
  });

  it("hides links when showLinks=false", () => {
    render(<Features4cardsBlock {...defaults} showLinks={false} />);
    expect(screen.queryAllByText(/اعرف المزيد/)).toHaveLength(0);
  });

  it("handles empty items array without crashing", () => {
    render(<Features4cardsBlock {...defaults} items={[]} />);
    expect(screen.getByText("خدماتنا المتميزة")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("Features4cardsBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<Features4cardsBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    const { container } = render(<Features4cardsBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=features-4cards", () => {
    const { container } = render(<Features4cardsBlock {...defaults} />);
    expect(container.querySelector("[data-block='features-4cards']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<Features4cardsBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const classNames = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "")
      .join(" ");
    expect(classNames).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("Features4cards Puck config", () => {
  it("Features4cards is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("Features4cards");
  });

  it("config has required fields: heading, subheading, items, showLinks", () => {
    const config = puckConfig.components.Features4cards;
    ["heading", "subheading", "items", "showLinks"].forEach((f) =>
      expect(config.fields).toHaveProperty(f)
    );
  });

  it("items field is type array", () => {
    expect((puckConfig.components.Features4cards.fields?.items as { type?: string })?.type).toBe("array");
  });

  it("defaultProps have 4 Arabic items", () => {
    const items = puckConfig.components.Features4cards.defaultProps?.items as unknown[];
    expect(items?.length).toBe(4);
  });

  it("defaultProps heading is Arabic", () => {
    const h = puckConfig.components.Features4cards.defaultProps?.heading as string;
    expect(/[\u0600-\u06FF]/.test(h)).toBe(true);
  });
});
