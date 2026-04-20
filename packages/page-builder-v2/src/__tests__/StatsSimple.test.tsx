/**
 * StatsSimple Block — TDD tests (Day 13)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsSimpleBlock } from "../blocks/social/StatsSimple";
import { puckConfig } from "../config/puck-config";

const DEFAULT_STATS = [
  { value: "+5,000",  label: "عميل نشط" },
  { value: "98%",     label: "نسبة الرضا" },
  { value: "+200",    label: "منشأة موثوقة" },
  { value: "24/7",    label: "دعم فني متواصل" },
];

const defaults = {
  heading:    "أرقام تتحدث عن نفسها",
  subheading: "نتائج حقيقية من منشآت سعودية",
  stats:      DEFAULT_STATS,
  theme:      "light" as const,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("StatsSimpleBlock — rendering", () => {
  it("renders heading", () => {
    render(<StatsSimpleBlock {...defaults} />);
    expect(screen.getByText("أرقام تتحدث عن نفسها")).toBeTruthy();
  });

  it("renders all 4 stat values", () => {
    render(<StatsSimpleBlock {...defaults} />);
    expect(screen.getByText("+5,000")).toBeTruthy();
    expect(screen.getByText("98%")).toBeTruthy();
    expect(screen.getByText("+200")).toBeTruthy();
    expect(screen.getByText("24/7")).toBeTruthy();
  });

  it("renders all 4 stat labels", () => {
    render(<StatsSimpleBlock {...defaults} />);
    expect(screen.getByText("عميل نشط")).toBeTruthy();
    expect(screen.getByText("نسبة الرضا")).toBeTruthy();
    expect(screen.getByText("منشأة موثوقة")).toBeTruthy();
    expect(screen.getByText("دعم فني متواصل")).toBeTruthy();
  });

  it("renders exactly 4 stat items", () => {
    const { container } = render(<StatsSimpleBlock {...defaults} />);
    expect(container.querySelectorAll("[data-stat-item]").length).toBe(4);
  });

  it("handles empty stats without crashing", () => {
    render(<StatsSimpleBlock {...defaults} stats={[]} />);
    expect(screen.getByText("أرقام تتحدث عن نفسها")).toBeTruthy();
  });

  it("renders subheading", () => {
    render(<StatsSimpleBlock {...defaults} />);
    expect(screen.getByText("نتائج حقيقية من منشآت سعودية")).toBeTruthy();
  });

  it("each stat-item has data-value attribute", () => {
    const { container } = render(<StatsSimpleBlock {...defaults} />);
    const items = container.querySelectorAll("[data-stat-item]");
    expect(items[0].getAttribute("data-value")).toBe("+5,000");
  });
});

// ═══════════════════════════════════════════════════════════════
// THEME VARIANTS
// ═══════════════════════════════════════════════════════════════

describe("StatsSimpleBlock — themes", () => {
  it("light theme applies light background", () => {
    const { container } = render(<StatsSimpleBlock {...defaults} theme="light" />);
    const section = container.querySelector("[data-block='stats-simple']")!;
    expect(section.getAttribute("data-theme")).toBe("light");
  });

  it("dark theme applies dark background", () => {
    const { container } = render(<StatsSimpleBlock {...defaults} theme="dark" />);
    const section = container.querySelector("[data-block='stats-simple']")!;
    expect(section.getAttribute("data-theme")).toBe("dark");
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("StatsSimpleBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<StatsSimpleBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<StatsSimpleBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=stats-simple", () => {
    const { container } = render(<StatsSimpleBlock {...defaults} />);
    expect(container.querySelector("[data-block='stats-simple']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<StatsSimpleBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const cls = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "").join(" ");
    expect(cls).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("StatsSimple Puck config", () => {
  it("StatsSimple is registered", () => {
    expect(puckConfig.components).toHaveProperty("StatsSimple");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.StatsSimple;
    ["heading", "subheading", "stats", "theme"].forEach((f) =>
      expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("stats field is type array", () => {
    expect((puckConfig.components.StatsSimple.fields?.stats as { type?: string })?.type).toBe("array");
  });

  it("defaultProps have 4 Arabic stats", () => {
    const stats = puckConfig.components.StatsSimple.defaultProps?.stats as unknown[];
    expect(stats?.length).toBe(4);
  });

  it("theme field is type radio or select", () => {
    const type = (puckConfig.components.StatsSimple.fields?.theme as { type?: string })?.type;
    expect(["radio", "select"]).toContain(type);
  });

  it("defaultProps heading is Arabic", () => {
    const h = puckConfig.components.StatsSimple.defaultProps?.heading as string;
    expect(/[\u0600-\u06FF]/.test(h)).toBe(true);
  });
});
