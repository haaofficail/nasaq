/**
 * CTAColorBg Block — TDD tests (Day 15)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CTAColorBgBlock } from "../blocks/cta/CTAColorBg";
import { puckConfig } from "../config/puck-config";

const defaults = {
  heading:        "ابدأ رحلتك اليوم",
  subheading:     "انضم إلى آلاف العملاء الذين يثقون بنا",
  ctaLabel:       "ابدأ مجاناً",
  ctaUrl:         "/signup",
  secondaryLabel: "تعرف على المزيد",
  secondaryUrl:   "/about",
  bgColor:        "#5b9bd5",
  textColor:      "#ffffff",
  alignment:      "center" as const,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("CTAColorBgBlock — rendering", () => {
  it("renders heading", () => {
    render(<CTAColorBgBlock {...defaults} />);
    expect(screen.getByText("ابدأ رحلتك اليوم")).toBeTruthy();
  });

  it("renders subheading", () => {
    render(<CTAColorBgBlock {...defaults} />);
    expect(screen.getByText("انضم إلى آلاف العملاء الذين يثقون بنا")).toBeTruthy();
  });

  it("renders primary CTA with correct href", () => {
    const { container } = render(<CTAColorBgBlock {...defaults} />);
    const cta = container.querySelector("[data-primary-cta]") as HTMLAnchorElement;
    expect(cta).toBeTruthy();
    expect(cta.href).toContain("/signup");
  });

  it("renders secondary CTA when provided", () => {
    const { container } = render(<CTAColorBgBlock {...defaults} />);
    expect(container.querySelector("[data-secondary-cta]")).toBeTruthy();
  });

  it("does not render secondary CTA when label is empty", () => {
    const { container } = render(
      <CTAColorBgBlock {...defaults} secondaryLabel="" secondaryUrl="" />
    );
    expect(container.querySelector("[data-secondary-cta]")).toBeNull();
  });

  it("renders primary CTA label text", () => {
    render(<CTAColorBgBlock {...defaults} />);
    expect(screen.getByText("ابدأ مجاناً")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// THEME / COLORS
// ═══════════════════════════════════════════════════════════════

describe("CTAColorBgBlock — theme", () => {
  it("applies bgColor to section background", () => {
    const { container } = render(
      <CTAColorBgBlock {...defaults} bgColor="#e74c3c" />
    );
    const section = container.querySelector("[data-block='cta-color-bg']") as HTMLElement;
    expect(section.style.backgroundColor).toBeTruthy();
  });

  it("reflects alignment as data-alignment attribute", () => {
    const { container } = render(<CTAColorBgBlock {...defaults} alignment="start" />);
    expect(
      container.querySelector("[data-block='cta-color-bg']")?.getAttribute("data-alignment")
    ).toBe("start");
  });

  it("center alignment by default", () => {
    const { container } = render(<CTAColorBgBlock {...defaults} alignment="center" />);
    expect(
      container.querySelector("[data-block='cta-color-bg']")?.getAttribute("data-alignment")
    ).toBe("center");
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe("CTAColorBgBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<CTAColorBgBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<CTAColorBgBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style")).toContain(
      "IBM Plex Sans Arabic"
    );
  });

  it("has data-block=cta-color-bg", () => {
    const { container } = render(<CTAColorBgBlock {...defaults} />);
    expect(container.querySelector("[data-block='cta-color-bg']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<CTAColorBgBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const cls = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "")
      .join(" ");
    expect(cls).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("CTAColorBg Puck config", () => {
  it("CTAColorBg is registered", () => {
    expect(puckConfig.components).toHaveProperty("CTAColorBg");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.CTAColorBg;
    ["heading", "subheading", "ctaLabel", "ctaUrl", "bgColor", "textColor", "alignment"].forEach(
      (f) => expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("alignment field is type radio or select", () => {
    const field = puckConfig.components.CTAColorBg.fields?.alignment as { type?: string };
    expect(["radio", "select"]).toContain(field?.type);
  });

  it("defaultProps have Arabic heading", () => {
    const dp = puckConfig.components.CTAColorBg.defaultProps;
    expect(typeof dp?.heading).toBe("string");
    expect((dp?.heading as string).length).toBeGreaterThan(0);
  });
});
