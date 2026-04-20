/**
 * FeaturesList Block — TDD tests (Day 12)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturesListBlock } from "../blocks/features/FeaturesList";
import { puckConfig } from "../config/puck-config";

const DEFAULT_ITEMS = [
  { title: "دفع آمن وسريع",       description: "بوابات دفع متعددة تتناسب مع عملائك السعوديين" },
  { title: "شحن إلى كل مكان",     description: "تكامل مع شركات الشحن الرائدة في المملكة" },
  { title: "دعم على مدار الساعة", description: "فريق دعم سعودي يتحدث لغتك ويفهم احتياجاتك" },
];

const defaults = {
  heading:         "كيف نساعدك",
  subheading:      "خطوات واضحة نحو النجاح",
  items:           DEFAULT_ITEMS,
  showNumbers:     true,
  numberStyle:     "padded" as const,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("FeaturesListBlock — rendering", () => {
  it("renders heading text", () => {
    render(<FeaturesListBlock {...defaults} />);
    expect(screen.getByText("كيف نساعدك")).toBeTruthy();
  });

  it("renders all item titles", () => {
    render(<FeaturesListBlock {...defaults} />);
    expect(screen.getByText("دفع آمن وسريع")).toBeTruthy();
    expect(screen.getByText("شحن إلى كل مكان")).toBeTruthy();
    expect(screen.getByText("دعم على مدار الساعة")).toBeTruthy();
  });

  it("renders all item descriptions", () => {
    render(<FeaturesListBlock {...defaults} />);
    expect(screen.getByText(/بوابات دفع/)).toBeTruthy();
    expect(screen.getByText(/شركات الشحن/)).toBeTruthy();
    expect(screen.getByText(/فريق دعم/)).toBeTruthy();
  });

  it("renders padded numbers (01, 02, 03) when showNumbers=true and numberStyle=padded", () => {
    render(<FeaturesListBlock {...defaults} showNumbers={true} numberStyle="padded" />);
    expect(screen.getByText("01")).toBeTruthy();
    expect(screen.getByText("02")).toBeTruthy();
    expect(screen.getByText("03")).toBeTruthy();
  });

  it("renders plain numbers (1, 2, 3) when numberStyle=plain", () => {
    render(<FeaturesListBlock {...defaults} showNumbers={true} numberStyle="plain" />);
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("hides numbers when showNumbers=false", () => {
    render(<FeaturesListBlock {...defaults} showNumbers={false} />);
    expect(screen.queryByText("01")).toBeNull();
  });

  it("renders correct number of list rows", () => {
    const { container } = render(<FeaturesListBlock {...defaults} />);
    const rows = container.querySelectorAll("[data-feature-row]");
    expect(rows.length).toBe(3);
  });

  it("handles empty items array without crashing", () => {
    render(<FeaturesListBlock {...defaults} items={[]} />);
    expect(screen.getByText("كيف نساعدك")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("FeaturesListBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<FeaturesListBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    const { container } = render(<FeaturesListBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=features-list", () => {
    const { container } = render(<FeaturesListBlock {...defaults} />);
    expect(container.querySelector("[data-block='features-list']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<FeaturesListBlock {...defaults} />);
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

describe("FeaturesList Puck config", () => {
  it("FeaturesList is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("FeaturesList");
  });

  it("config has required fields", () => {
    const config = puckConfig.components.FeaturesList;
    ["heading", "subheading", "items", "showNumbers", "numberStyle"].forEach((f) =>
      expect(config.fields).toHaveProperty(f)
    );
  });

  it("items field is type array", () => {
    expect((puckConfig.components.FeaturesList.fields?.items as { type?: string })?.type).toBe("array");
  });

  it("numberStyle options contain padded and plain", () => {
    const opts = (puckConfig.components.FeaturesList.fields?.numberStyle as { options?: { value: string }[] })
      ?.options?.map((o) => o.value) ?? [];
    expect(opts).toContain("padded");
    expect(opts).toContain("plain");
  });

  it("defaultProps have 3 Arabic items", () => {
    const items = puckConfig.components.FeaturesList.defaultProps?.items as unknown[];
    expect(items?.length).toBe(3);
  });

  it("defaultProps showNumbers is true", () => {
    expect(puckConfig.components.FeaturesList.defaultProps?.showNumbers).toBe(true);
  });
});
