/**
 * HeroMinimal Block — TDD tests
 *
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 *
 * Coverage targets:
 *   - Renders with default Arabic content
 *   - RTL: no forbidden LTR classes
 *   - Props: heading/subheading/ctaText render
 *   - backgroundStyle variants
 *   - Optional fields absent when empty
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroMinimalBlock } from "../blocks/hero/HeroMinimal";

const defaults = {
  heading: "ابدأ متجرك اليوم",
  subheading: "منصة متكاملة لإدارة أعمالك التجارية",
  ctaText: "ابدأ الآن",
  ctaUrl: "#",
  secondaryCtaText: "تعرّف أكثر",
  secondaryCtaUrl: "#",
  badge: "",
  backgroundStyle: "white" as const,
  alignment: "center" as const,
};

describe("HeroMinimalBlock — content", () => {
  it("renders Arabic heading", () => {
    render(<HeroMinimalBlock {...defaults} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ابدأ متجرك اليوم");
  });

  it("renders subheading text", () => {
    render(<HeroMinimalBlock {...defaults} />);
    expect(screen.getByText("منصة متكاملة لإدارة أعمالك التجارية")).toBeTruthy();
  });

  it("renders primary CTA link with correct href", () => {
    render(<HeroMinimalBlock {...defaults} ctaUrl="/start" />);
    const link = screen.getByRole("link", { name: "ابدأ الآن" });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/start");
  });

  it("renders secondary CTA when provided", () => {
    render(<HeroMinimalBlock {...defaults} secondaryCtaText="معرفة المزيد" secondaryCtaUrl="/about" />);
    expect(screen.getByRole("link", { name: "معرفة المزيد" })).toBeTruthy();
  });

  it("renders badge when provided", () => {
    render(<HeroMinimalBlock {...defaults} badge="جديد" />);
    expect(screen.getByText("جديد")).toBeTruthy();
  });

  it("hides badge span when badge is empty", () => {
    render(<HeroMinimalBlock {...defaults} badge="" />);
    const badges = document.querySelectorAll("span");
    const badgeEl = Array.from(badges).find(s => s.textContent === "");
    expect(badgeEl).toBeUndefined();
  });
});

describe("HeroMinimalBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<HeroMinimalBlock {...defaults} />);
    const section = container.querySelector("section");
    expect(section?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    const { container } = render(<HeroMinimalBlock {...defaults} />);
    const section = container.querySelector("section");
    expect(section?.getAttribute("style")).toContain("IBM Plex Sans Arabic");
  });

  it("does NOT use forbidden LTR classes (pl-, pr-, ml-, mr-, text-left, text-right)", () => {
    const { container } = render(<HeroMinimalBlock {...defaults} />);
    const html = container.innerHTML;
    // Check className strings don't contain forbidden patterns
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const classNames = Array.from(container.querySelectorAll("[class]"))
      .map(el => el.getAttribute("class") || "")
      .join(" ");
    expect(classNames).not.toMatch(forbidden);
  });
});

describe("HeroMinimalBlock — background styles", () => {
  it("dark bg applies dark class", () => {
    const { container } = render(<HeroMinimalBlock {...defaults} backgroundStyle="dark" />);
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-gray-950");
  });

  it("light bg applies light class", () => {
    const { container } = render(<HeroMinimalBlock {...defaults} backgroundStyle="light" />);
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-gray-50");
  });

  it("white bg is default class", () => {
    const { container } = render(<HeroMinimalBlock {...defaults} backgroundStyle="white" />);
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-white");
  });
});

describe("HeroMinimalBlock — alignment", () => {
  it("center alignment applies text-center class", () => {
    const { container } = render(<HeroMinimalBlock {...defaults} alignment="center" />);
    const inner = container.querySelector("div");
    expect(inner?.className).toContain("text-center");
  });

  it("start alignment applies text-start class", () => {
    const { container } = render(<HeroMinimalBlock {...defaults} alignment="start" />);
    const inner = container.querySelector("div");
    expect(inner?.className).toContain("text-start");
  });
});
