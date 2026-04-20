/**
 * FeaturesAlternating Block — TDD tests (Day 12)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturesAlternatingBlock } from "../blocks/features/FeaturesAlternating";
import { puckConfig } from "../config/puck-config";

const DEFAULT_ITEMS = [
  { title: "دفع آمن وسريع",       description: "بوابات دفع متعددة تتناسب مع عملائك السعوديين", imageUrl: "https://r2.example.com/pay.jpg",  link: "" },
  { title: "شحن إلى كل مكان",     description: "تكامل مع شركات الشحن الرائدة في المملكة",      imageUrl: "https://r2.example.com/ship.jpg", link: "" },
  { title: "دعم على مدار الساعة", description: "فريق دعم سعودي يتحدث لغتك ويفهم احتياجاتك",   imageUrl: "",                                link: "" },
];

const defaults = {
  heading:    "طريقة عملنا",
  subheading: "كل خطوة مصممة لراحتك",
  items:      DEFAULT_ITEMS,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("FeaturesAlternatingBlock — rendering", () => {
  it("renders heading text", () => {
    render(<FeaturesAlternatingBlock {...defaults} />);
    expect(screen.getByText("طريقة عملنا")).toBeTruthy();
  });

  it("renders all item titles", () => {
    render(<FeaturesAlternatingBlock {...defaults} />);
    expect(screen.getByText("دفع آمن وسريع")).toBeTruthy();
    expect(screen.getByText("شحن إلى كل مكان")).toBeTruthy();
    expect(screen.getByText("دعم على مدار الساعة")).toBeTruthy();
  });

  it("renders all item descriptions", () => {
    render(<FeaturesAlternatingBlock {...defaults} />);
    expect(screen.getByText(/بوابات دفع/)).toBeTruthy();
    expect(screen.getByText(/شركات الشحن/)).toBeTruthy();
    expect(screen.getByText(/فريق دعم/)).toBeTruthy();
  });

  it("renders correct number of alternating rows", () => {
    const { container } = render(<FeaturesAlternatingBlock {...defaults} />);
    const rows = container.querySelectorAll("[data-alt-row]");
    expect(rows.length).toBe(3);
  });

  it("first row image has data-position=start (right in RTL)", () => {
    const { container } = render(<FeaturesAlternatingBlock {...defaults} />);
    const rows = container.querySelectorAll("[data-alt-row]");
    expect(rows[0].getAttribute("data-image-position")).toBe("start");
  });

  it("second row image has data-position=end (alternated)", () => {
    const { container } = render(<FeaturesAlternatingBlock {...defaults} />);
    const rows = container.querySelectorAll("[data-alt-row]");
    expect(rows[1].getAttribute("data-image-position")).toBe("end");
  });

  it("third row alternates back to start", () => {
    const { container } = render(<FeaturesAlternatingBlock {...defaults} />);
    const rows = container.querySelectorAll("[data-alt-row]");
    expect(rows[2].getAttribute("data-image-position")).toBe("start");
  });

  it("renders image when imageUrl provided", () => {
    render(<FeaturesAlternatingBlock {...defaults} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs.length).toBeGreaterThan(0);
  });

  it("handles empty items array without crashing", () => {
    render(<FeaturesAlternatingBlock {...defaults} items={[]} />);
    expect(screen.getByText("طريقة عملنا")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("FeaturesAlternatingBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<FeaturesAlternatingBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    const { container } = render(<FeaturesAlternatingBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=features-alternating", () => {
    const { container } = render(<FeaturesAlternatingBlock {...defaults} />);
    expect(container.querySelector("[data-block='features-alternating']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<FeaturesAlternatingBlock {...defaults} />);
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

describe("FeaturesAlternating Puck config", () => {
  it("FeaturesAlternating is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("FeaturesAlternating");
  });

  it("config has required fields", () => {
    const config = puckConfig.components.FeaturesAlternating;
    ["heading", "subheading", "items"].forEach((f) =>
      expect(config.fields).toHaveProperty(f)
    );
  });

  it("items field is type array", () => {
    expect((puckConfig.components.FeaturesAlternating.fields?.items as { type?: string })?.type).toBe("array");
  });

  it("defaultProps have 3 Arabic items", () => {
    const items = puckConfig.components.FeaturesAlternating.defaultProps?.items as unknown[];
    expect(items?.length).toBe(3);
  });

  it("defaultProps heading is Arabic", () => {
    const h = puckConfig.components.FeaturesAlternating.defaultProps?.heading as string;
    expect(/[\u0600-\u06FF]/.test(h)).toBe(true);
  });
});
