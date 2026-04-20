/**
 * StatsDetailed Block — TDD tests (Day 14)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsDetailedBlock } from "../blocks/stats/StatsDetailed";
import { puckConfig } from "../config/puck-config";

const DEFAULT_STATS = [
  { label: "المبيعات الشهرية",    value: "1.2M ريال", icon: "trending-up",  description: "إجمالي المبيعات هذا الشهر",    trend: "up"      as const, trendValue: "+15%" },
  { label: "العملاء النشطون",     value: "8,432",      icon: "users",        description: "عملاء نشطون خلال آخر 30 يوم",  trend: "up"      as const, trendValue: "+8%"  },
  { label: "معدل التحويل",        value: "3.8%",       icon: "bar-chart-2",  description: "نسبة الزوار الذين أتموا شراء",  trend: "up"      as const, trendValue: "+0.5%" },
  { label: "متوسط قيمة الطلب",   value: "245 ريال",   icon: "shopping-bag", description: "متوسط قيمة كل طلب مكتمل",     trend: "neutral" as const, trendValue: "0%"   },
  { label: "الطلبات المكتملة",    value: "15,234",     icon: "check-circle", description: "طلبات مكتملة هذا الشهر",        trend: "up"      as const, trendValue: "+12%" },
  { label: "معدل الإرجاع",        value: "1.2%",       icon: "refresh-cw",   description: "نسبة الطلبات المُعادة",         trend: "down"    as const, trendValue: "-0.3%" },
];

const defaults = {
  heading:    "لوحة الأداء",
  subheading: "مؤشرات الأداء الرئيسية لهذا الشهر",
  stats:      DEFAULT_STATS,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("StatsDetailedBlock — rendering", () => {
  it("renders heading", () => {
    render(<StatsDetailedBlock {...defaults} />);
    expect(screen.getByText("لوحة الأداء")).toBeTruthy();
  });

  it("renders all 6 stat values", () => {
    render(<StatsDetailedBlock {...defaults} />);
    expect(screen.getByText("1.2M ريال")).toBeTruthy();
    expect(screen.getByText("8,432")).toBeTruthy();
    expect(screen.getByText("3.8%")).toBeTruthy();
    expect(screen.getByText("245 ريال")).toBeTruthy();
    expect(screen.getByText("15,234")).toBeTruthy();
    expect(screen.getByText("1.2%")).toBeTruthy();
  });

  it("renders all 6 stat labels", () => {
    render(<StatsDetailedBlock {...defaults} />);
    expect(screen.getByText("المبيعات الشهرية")).toBeTruthy();
    expect(screen.getByText("العملاء النشطون")).toBeTruthy();
    expect(screen.getByText("معدل التحويل")).toBeTruthy();
    expect(screen.getByText("متوسط قيمة الطلب")).toBeTruthy();
  });

  it("renders exactly 6 stat cards", () => {
    const { container } = render(<StatsDetailedBlock {...defaults} />);
    expect(container.querySelectorAll("[data-stat-card]").length).toBe(6);
  });

  it("renders description text", () => {
    render(<StatsDetailedBlock {...defaults} />);
    expect(screen.getByText("إجمالي المبيعات هذا الشهر")).toBeTruthy();
  });

  it("renders trendValue for each stat", () => {
    render(<StatsDetailedBlock {...defaults} />);
    expect(screen.getByText("+15%")).toBeTruthy();
    expect(screen.getByText("-0.3%")).toBeTruthy();
  });

  it("renders trend indicators on each card", () => {
    const { container } = render(<StatsDetailedBlock {...defaults} />);
    expect(container.querySelectorAll("[data-trend]").length).toBe(6);
  });

  it("trend up cards have data-trend=up", () => {
    const { container } = render(<StatsDetailedBlock {...defaults} />);
    const upTrends = container.querySelectorAll("[data-trend='up']");
    expect(upTrends.length).toBeGreaterThan(0);
  });

  it("trend down cards have data-trend=down", () => {
    const { container } = render(<StatsDetailedBlock {...defaults} />);
    const downTrends = container.querySelectorAll("[data-trend='down']");
    expect(downTrends.length).toBe(1);
  });

  it("trend neutral cards have data-trend=neutral", () => {
    const { container } = render(<StatsDetailedBlock {...defaults} />);
    const neutral = container.querySelectorAll("[data-trend='neutral']");
    expect(neutral.length).toBe(1);
  });

  it("renders icon placeholder for each stat", () => {
    const { container } = render(<StatsDetailedBlock {...defaults} />);
    expect(container.querySelectorAll("[data-stat-icon]").length).toBe(6);
  });

  it("handles empty stats without crashing", () => {
    render(<StatsDetailedBlock {...defaults} stats={[]} />);
    expect(screen.getByText("لوحة الأداء")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("StatsDetailedBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<StatsDetailedBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<StatsDetailedBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=stats-detailed", () => {
    const { container } = render(<StatsDetailedBlock {...defaults} />);
    expect(container.querySelector("[data-block='stats-detailed']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<StatsDetailedBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const cls = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "").join(" ");
    expect(cls).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("StatsDetailed Puck config", () => {
  it("StatsDetailed is registered", () => {
    expect(puckConfig.components).toHaveProperty("StatsDetailed");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.StatsDetailed;
    ["heading", "subheading", "stats"].forEach((f) =>
      expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("stats field is type array", () => {
    expect((puckConfig.components.StatsDetailed.fields?.stats as { type?: string })?.type).toBe("array");
  });

  it("defaultProps have 6 Arabic stats", () => {
    const stats = puckConfig.components.StatsDetailed.defaultProps?.stats as unknown[];
    expect(stats?.length).toBe(6);
  });

  it("defaultProps heading is Arabic", () => {
    const h = puckConfig.components.StatsDetailed.defaultProps?.heading as string;
    expect(/[\u0600-\u06FF]/.test(h)).toBe(true);
  });
});
