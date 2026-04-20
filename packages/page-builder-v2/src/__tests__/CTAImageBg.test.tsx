/**
 * CTAImageBg Block — TDD tests (Day 14)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CTAImageBgBlock } from "../blocks/cta/CTAImageBg";
import { puckConfig } from "../config/puck-config";

const defaults = {
  heading:             "ابدأ متجرك خلال دقائق",
  subheading:          "انضم إلى آلاف التجار الذين اختاروا منصتنا",
  backgroundImageUrl:  "https://example.com/bg.jpg",
  overlayOpacity:      0.6,
  primaryCtaText:      "ابدأ مجاناً",
  primaryCtaLink:      "/register",
  secondaryCtaText:    "شاهد العرض",
  secondaryCtaLink:    "/demo",
  badge:               "عرض محدود",
  alignment:           "right" as const,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("CTAImageBgBlock — rendering", () => {
  it("renders heading", () => {
    render(<CTAImageBgBlock {...defaults} />);
    expect(screen.getByText("ابدأ متجرك خلال دقائق")).toBeTruthy();
  });

  it("renders subheading", () => {
    render(<CTAImageBgBlock {...defaults} />);
    expect(screen.getByText("انضم إلى آلاف التجار الذين اختاروا منصتنا")).toBeTruthy();
  });

  it("renders primary CTA button", () => {
    render(<CTAImageBgBlock {...defaults} />);
    expect(screen.getByText("ابدأ مجاناً")).toBeTruthy();
  });

  it("primary CTA links to correct href", () => {
    const { container } = render(<CTAImageBgBlock {...defaults} />);
    const link = container.querySelector("[data-primary-cta]") as HTMLAnchorElement;
    expect(link?.getAttribute("href")).toBe("/register");
  });

  it("renders secondary CTA button when provided", () => {
    render(<CTAImageBgBlock {...defaults} />);
    expect(screen.getByText("شاهد العرض")).toBeTruthy();
  });

  it("secondary CTA links to correct href", () => {
    const { container } = render(<CTAImageBgBlock {...defaults} />);
    const link = container.querySelector("[data-secondary-cta]") as HTMLAnchorElement;
    expect(link?.getAttribute("href")).toBe("/demo");
  });

  it("hides secondary CTA when text is empty", () => {
    render(<CTAImageBgBlock {...defaults} secondaryCtaText="" />);
    expect(screen.queryByText("شاهد العرض")).toBeFalsy();
  });

  it("renders badge when provided", () => {
    render(<CTAImageBgBlock {...defaults} />);
    expect(screen.getByText("عرض محدود")).toBeTruthy();
  });

  it("hides badge when empty", () => {
    render(<CTAImageBgBlock {...defaults} badge="" />);
    expect(screen.queryByText("عرض محدود")).toBeFalsy();
  });

  it("has data-overlay with opacity attribute", () => {
    const { container } = render(<CTAImageBgBlock {...defaults} overlayOpacity={0.7} />);
    const overlay = container.querySelector("[data-overlay]");
    expect(overlay).toBeTruthy();
    expect(overlay?.getAttribute("data-opacity")).toBe("0.7");
  });

  it("applies background image in style", () => {
    const { container } = render(<CTAImageBgBlock {...defaults} />);
    const section = container.querySelector("[data-block='cta-image-bg']")!;
    const style = section.getAttribute("style") || "";
    expect(style).toContain("example.com/bg.jpg");
  });
});

// ═══════════════════════════════════════════════════════════════
// ALIGNMENT
// ═══════════════════════════════════════════════════════════════

describe("CTAImageBgBlock — alignment", () => {
  it("right alignment sets data-alignment=right", () => {
    const { container } = render(<CTAImageBgBlock {...defaults} alignment="right" />);
    expect(container.querySelector("[data-alignment='right']")).toBeTruthy();
  });

  it("center alignment sets data-alignment=center", () => {
    const { container } = render(<CTAImageBgBlock {...defaults} alignment="center" />);
    expect(container.querySelector("[data-alignment='center']")).toBeTruthy();
  });

  it("left alignment sets data-alignment=left", () => {
    const { container } = render(<CTAImageBgBlock {...defaults} alignment="left" />);
    expect(container.querySelector("[data-alignment='left']")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("CTAImageBgBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<CTAImageBgBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<CTAImageBgBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=cta-image-bg", () => {
    const { container } = render(<CTAImageBgBlock {...defaults} />);
    expect(container.querySelector("[data-block='cta-image-bg']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<CTAImageBgBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const cls = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "").join(" ");
    expect(cls).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("CTAImageBg Puck config", () => {
  it("CTAImageBg is registered", () => {
    expect(puckConfig.components).toHaveProperty("CTAImageBg");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.CTAImageBg;
    [
      "heading", "subheading", "backgroundImageUrl", "overlayOpacity",
      "primaryCtaText", "primaryCtaLink", "secondaryCtaText", "secondaryCtaLink",
      "badge", "alignment",
    ].forEach((f) => expect(cfg.fields).toHaveProperty(f));
  });

  it("defaultProps heading is Arabic", () => {
    const h = puckConfig.components.CTAImageBg.defaultProps?.heading as string;
    expect(/[\u0600-\u06FF]/.test(h)).toBe(true);
  });

  it("alignment field has right/center/left options", () => {
    const alignField = puckConfig.components.CTAImageBg.fields?.alignment as { options?: { value: string }[] };
    const values = alignField?.options?.map((o) => o.value) ?? [];
    expect(values).toContain("right");
    expect(values).toContain("center");
    expect(values).toContain("left");
  });
});
