/**
 * Features3col Block — TDD tests (Day 12)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Features3colBlock } from "../blocks/features/Features3col";
import { puckConfig } from "../config/puck-config";

const DEFAULT_ITEMS = [
  { icon: "shield", title: "دفع آمن وسريع",      description: "بوابات دفع متعددة تتناسب مع عملائك السعوديين", link: "" },
  { icon: "truck",  title: "شحن إلى كل مكان",    description: "تكامل مع شركات الشحن الرائدة في المملكة",      link: "" },
  { icon: "headphones", title: "دعم على مدار الساعة", description: "فريق دعم سعودي يتحدث لغتك ويفهم احتياجاتك", link: "" },
];

const defaults = {
  heading:    "لماذا تختارنا",
  subheading: "ميزات تجعل تجربتك استثنائية",
  items:      DEFAULT_ITEMS,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("Features3colBlock — rendering", () => {
  it("renders heading text", () => {
    render(<Features3colBlock {...defaults} />);
    expect(screen.getByText("لماذا تختارنا")).toBeTruthy();
  });

  it("renders all 3 item titles", () => {
    render(<Features3colBlock {...defaults} />);
    expect(screen.getByText("دفع آمن وسريع")).toBeTruthy();
    expect(screen.getByText("شحن إلى كل مكان")).toBeTruthy();
    expect(screen.getByText("دعم على مدار الساعة")).toBeTruthy();
  });

  it("renders all 3 item descriptions", () => {
    render(<Features3colBlock {...defaults} />);
    expect(screen.getByText(/بوابات دفع/)).toBeTruthy();
    expect(screen.getByText(/شركات الشحن/)).toBeTruthy();
    expect(screen.getByText(/فريق دعم/)).toBeTruthy();
  });

  it("renders exactly 3 feature columns", () => {
    const { container } = render(<Features3colBlock {...defaults} />);
    const cols = container.querySelectorAll("[data-feature-col]");
    expect(cols.length).toBe(3);
  });

  it("handles empty items array without crashing", () => {
    render(<Features3colBlock {...defaults} items={[]} />);
    expect(screen.getByText("لماذا تختارنا")).toBeTruthy();
  });

  it("renders correct count with 1 item", () => {
    const { container } = render(<Features3colBlock {...defaults} items={[DEFAULT_ITEMS[0]]} />);
    const cols = container.querySelectorAll("[data-feature-col]");
    expect(cols.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("Features3colBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<Features3colBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    const { container } = render(<Features3colBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=features-3col", () => {
    const { container } = render(<Features3colBlock {...defaults} />);
    expect(container.querySelector("[data-block='features-3col']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<Features3colBlock {...defaults} />);
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

describe("Features3col Puck config", () => {
  it("Features3col is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("Features3col");
  });

  it("config has required fields: heading, subheading, items", () => {
    const config = puckConfig.components.Features3col;
    expect(config.fields).toHaveProperty("heading");
    expect(config.fields).toHaveProperty("subheading");
    expect(config.fields).toHaveProperty("items");
  });

  it("items field is type array", () => {
    expect((puckConfig.components.Features3col.fields?.items as { type?: string })?.type).toBe("array");
  });

  it("defaultProps have 3 Arabic items", () => {
    const props = puckConfig.components.Features3col.defaultProps;
    const items = props?.items as unknown[];
    expect(items?.length).toBe(3);
  });

  it("defaultProps heading is Arabic", () => {
    const h = puckConfig.components.Features3col.defaultProps?.heading as string;
    expect(/[\u0600-\u06FF]/.test(h)).toBe(true);
  });
});
