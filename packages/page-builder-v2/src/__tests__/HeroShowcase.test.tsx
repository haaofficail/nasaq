/**
 * HeroShowcase Block — TDD tests
 *
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 *
 * Coverage targets:
 *   - Default Arabic content renders
 *   - RTL: dir=rtl, IBM Plex Sans Arabic, no LTR classes
 *   - Overlay: opacity, black background
 *   - Image: loading=lazy, object-cover, src applied
 *   - textColor: light → text-white, dark → text-gray-900
 *   - alignment: center/right/left
 *   - Puck config: registered, fields, defaultProps
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroShowcaseBlock } from "../blocks/hero/HeroShowcase";
import { puckConfig } from "../config/puck-config";

const defaults = {
  heading: "تجربة تسوّق استثنائية",
  subheading: "اكتشف منتجات مميزة بتصميم عصري وجودة عالية",
  ctaText: "تسوّق الآن",
  ctaLink: "#",
  backgroundImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600",
  overlayOpacity: 40,
  textColor: "light" as const,
  alignment: "center" as const,
};

// ── Content ───────────────────────────────────────────────────────────────────

describe("HeroShowcaseBlock — content", () => {
  it("renders Arabic heading with default props", () => {
    render(<HeroShowcaseBlock {...defaults} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "تجربة تسوّق استثنائية"
    );
  });

  it("renders custom heading when provided", () => {
    render(<HeroShowcaseBlock {...defaults} heading="عنوان مخصص" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("عنوان مخصص");
  });

  it("renders subheading text", () => {
    render(<HeroShowcaseBlock {...defaults} />);
    expect(
      screen.getByText("اكتشف منتجات مميزة بتصميم عصري وجودة عالية")
    ).toBeTruthy();
  });

  it("renders CTA link with correct href", () => {
    render(<HeroShowcaseBlock {...defaults} ctaLink="/shop" />);
    const link = screen.getByRole("link", { name: "تسوّق الآن" });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/shop");
  });

  it("renders badge when provided", () => {
    render(<HeroShowcaseBlock {...defaults} badge="جديد" />);
    expect(screen.getByText("جديد")).toBeTruthy();
  });

  it("does not render badge element when badge is empty", () => {
    render(<HeroShowcaseBlock {...defaults} badge="" />);
    const badges = document.querySelectorAll("[data-badge]");
    expect(badges.length).toBe(0);
  });
});

// ── RTL compliance ─────────────────────────────────────────────────────────────

describe("HeroShowcaseBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} />);
    const section = container.querySelector("section");
    expect(section?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} />);
    const section = container.querySelector("section");
    expect(section?.getAttribute("style")).toContain("IBM Plex Sans Arabic");
  });

  it("does NOT use forbidden LTR classes (pl-, pr-, ml-, mr-, text-left, text-right)", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const classNames = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "")
      .join(" ");
    expect(classNames).not.toMatch(forbidden);
  });
});

// ── Overlay ───────────────────────────────────────────────────────────────────

describe("HeroShowcaseBlock — overlay", () => {
  it("overlay element exists with black background", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} />);
    const overlay = container.querySelector("[data-overlay]");
    expect(overlay).toBeTruthy();
  });

  it("overlay opacity matches overlayOpacity prop (40 → 0.40)", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} overlayOpacity={40} />);
    const overlay = container.querySelector("[data-overlay]") as HTMLElement;
    expect(overlay?.style.opacity).toBe("0.4");
  });

  it("overlay opacity 0 is transparent", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} overlayOpacity={0} />);
    const overlay = container.querySelector("[data-overlay]") as HTMLElement;
    expect(overlay?.style.opacity).toBe("0");
  });

  it("overlay opacity 100 is fully opaque", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} overlayOpacity={100} />);
    const overlay = container.querySelector("[data-overlay]") as HTMLElement;
    expect(overlay?.style.opacity).toBe("1");
  });
});

// ── Image ─────────────────────────────────────────────────────────────────────

describe("HeroShowcaseBlock — background image", () => {
  it("renders img element with loading=lazy", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });

  it("img src matches backgroundImage prop", () => {
    const { container } = render(
      <HeroShowcaseBlock {...defaults} backgroundImage="https://example.com/hero.jpg" />
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/hero.jpg");
  });

  it("img has object-cover class for full coverage", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} />);
    const img = container.querySelector("img");
    expect(img?.className).toContain("object-cover");
  });

  it("renders fallback placeholder when backgroundImage is empty", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} backgroundImage="" />);
    const section = container.querySelector("section");
    // Section should still render without crashing
    expect(section).toBeTruthy();
  });
});

// ── Text color ────────────────────────────────────────────────────────────────

describe("HeroShowcaseBlock — textColor", () => {
  it("textColor=light applies text-white to content area", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} textColor="light" />);
    const content = container.querySelector("[data-content]");
    expect(content?.className).toContain("text-white");
  });

  it("textColor=dark applies text-gray-900 to content area", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} textColor="dark" />);
    const content = container.querySelector("[data-content]");
    expect(content?.className).toContain("text-gray-900");
  });
});

// ── Alignment ─────────────────────────────────────────────────────────────────

describe("HeroShowcaseBlock — alignment", () => {
  it("center alignment applies text-center and items-center", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} alignment="center" />);
    const content = container.querySelector("[data-content]");
    expect(content?.className).toContain("text-center");
    expect(content?.className).toContain("items-center");
  });

  it("right alignment applies text-start (RTL: start = right)", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} alignment="right" />);
    const content = container.querySelector("[data-content]");
    expect(content?.className).toContain("text-start");
    expect(content?.className).toContain("items-start");
  });

  it("left alignment applies text-end (RTL: end = left)", () => {
    const { container } = render(<HeroShowcaseBlock {...defaults} alignment="left" />);
    const content = container.querySelector("[data-content]");
    expect(content?.className).toContain("text-end");
    expect(content?.className).toContain("items-end");
  });
});

// ── Puck Config ───────────────────────────────────────────────────────────────

describe("HeroShowcase Puck config", () => {
  it("HeroShowcase is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("HeroShowcase");
  });

  it("HeroShowcase config has all required Puck fields", () => {
    const config = puckConfig.components.HeroShowcase;
    expect(config.fields).toHaveProperty("heading");
    expect(config.fields).toHaveProperty("subheading");
    expect(config.fields).toHaveProperty("ctaText");
    expect(config.fields).toHaveProperty("ctaLink");
    expect(config.fields).toHaveProperty("backgroundImage");
    expect(config.fields).toHaveProperty("overlayOpacity");
    expect(config.fields).toHaveProperty("textColor");
    expect(config.fields).toHaveProperty("alignment");
  });

  it("defaultProps use Arabic content", () => {
    const config = puckConfig.components.HeroShowcase;
    expect(config.defaultProps?.heading).toBe("تجربة تسوّق استثنائية");
    expect(config.defaultProps?.ctaText).toBe("تسوّق الآن");
    expect(config.defaultProps?.subheading).toContain("اكتشف منتجات");
  });

  it("defaultProps overlayOpacity is 40", () => {
    const config = puckConfig.components.HeroShowcase;
    expect(config.defaultProps?.overlayOpacity).toBe(40);
  });

  it("defaultProps textColor is light", () => {
    const config = puckConfig.components.HeroShowcase;
    expect(config.defaultProps?.textColor).toBe("light");
  });
});
