/**
 * HeaderSimple Block — TDD tests (Day 16)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HeaderSimpleBlock } from "../blocks/header/HeaderSimple";
import { puckConfig } from "../config/puck-config";

const defaults = {
  logoText:        "ترميز",
  logoUrl:         "/",
  links: [
    { label: "الرئيسية",  url: "/",       isActive: true  },
    { label: "المتجر",    url: "/store",   isActive: false },
    { label: "من نحن",    url: "/about",   isActive: false },
    { label: "تواصل معنا", url: "/contact", isActive: false },
  ],
  ctaText:         "ابدأ الآن",
  ctaLink:         "/signup",
  sticky:          false,
  backgroundColor: "white" as const,
  showSearch:      false,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("HeaderSimpleBlock — rendering", () => {
  it("renders logoText", () => {
    render(<HeaderSimpleBlock {...defaults} />);
    expect(screen.getByText("ترميز")).toBeTruthy();
  });

  it("renders exactly 4 nav links", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    const navLinks = container.querySelector("[data-nav-links]");
    expect(navLinks?.querySelectorAll("a").length).toBe(4);
  });

  it("renders correct link labels", () => {
    render(<HeaderSimpleBlock {...defaults} />);
    expect(screen.getAllByText("الرئيسية").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("المتجر").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("تواصل معنا").length).toBeGreaterThanOrEqual(1);
  });

  it("renders CTA button when ctaText is provided", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    expect(container.querySelector("[data-cta]")).toBeTruthy();
  });

  it("CTA has correct href", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    const cta = container.querySelector("[data-cta]") as HTMLAnchorElement;
    expect(cta.href).toContain("/signup");
  });

  it("does NOT render CTA when ctaText is empty", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} ctaText="" />);
    expect(container.querySelector("[data-cta]")).toBeNull();
  });

  it("renders search button when showSearch is true", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} showSearch={true} />);
    expect(container.querySelector("[data-search-btn]")).toBeTruthy();
  });

  it("does NOT render search button when showSearch is false", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} showSearch={false} />);
    expect(container.querySelector("[data-search-btn]")).toBeNull();
  });

  it("has data-block=header-simple", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    expect(container.querySelector("[data-block='header-simple']")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// MOBILE MENU
// ═══════════════════════════════════════════════════════════════

describe("HeaderSimpleBlock — mobile menu", () => {
  it("mobile menu is not rendered initially", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    expect(container.querySelector("[data-mobile-menu]")).toBeNull();
  });

  it("hamburger button is always present", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    expect(container.querySelector("[data-hamburger]")).toBeTruthy();
  });

  it("clicking hamburger opens mobile menu", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    fireEvent.click(container.querySelector("[data-hamburger]")!);
    expect(container.querySelector("[data-mobile-menu]")).toBeTruthy();
  });

  it("mobile menu has a close button", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    fireEvent.click(container.querySelector("[data-hamburger]")!);
    expect(container.querySelector("[data-mobile-close]")).toBeTruthy();
  });

  it("clicking close button hides mobile menu", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    fireEvent.click(container.querySelector("[data-hamburger]")!);
    fireEvent.click(container.querySelector("[data-mobile-close]")!);
    expect(container.querySelector("[data-mobile-menu]")).toBeNull();
  });

  it("escape key closes mobile menu", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    fireEvent.click(container.querySelector("[data-hamburger]")!);
    expect(container.querySelector("[data-mobile-menu]")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector("[data-mobile-menu]")).toBeNull();
  });

  it("mobile menu contains nav links", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    fireEvent.click(container.querySelector("[data-hamburger]")!);
    const menu = container.querySelector("[data-mobile-menu]")!;
    expect(menu.querySelectorAll("a").length).toBeGreaterThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════
// STICKY
// ═══════════════════════════════════════════════════════════════

describe("HeaderSimpleBlock — sticky", () => {
  it("data-sticky=true when sticky is true", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} sticky={true} />);
    expect(
      container.querySelector("[data-block='header-simple']")?.getAttribute("data-sticky")
    ).toBe("true");
  });

  it("data-sticky=false when sticky is false", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} sticky={false} />);
    expect(
      container.querySelector("[data-block='header-simple']")?.getAttribute("data-sticky")
    ).toBe("false");
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe("HeaderSimpleBlock — RTL compliance", () => {
  it("root header has dir=rtl", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    expect(container.querySelector("header")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
    expect(container.querySelector("header")?.getAttribute("style")).toContain(
      "IBM Plex Sans Arabic"
    );
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<HeaderSimpleBlock {...defaults} />);
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

describe("HeaderSimple Puck config", () => {
  it("HeaderSimple is registered", () => {
    expect(puckConfig.components).toHaveProperty("HeaderSimple");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.HeaderSimple;
    ["logoText", "links", "ctaText", "ctaLink", "sticky", "backgroundColor"].forEach((f) =>
      expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("links field is type array", () => {
    expect(
      (puckConfig.components.HeaderSimple.fields?.links as { type?: string })?.type
    ).toBe("array");
  });

  it("defaultProps have Arabic logoText", () => {
    const dp = puckConfig.components.HeaderSimple.defaultProps;
    expect(typeof dp?.logoText).toBe("string");
    expect((dp?.logoText as string).length).toBeGreaterThan(0);
  });
});
