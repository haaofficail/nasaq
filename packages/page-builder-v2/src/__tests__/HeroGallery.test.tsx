/**
 * HeroGallery Block — TDD tests
 *
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 *
 * Coverage targets:
 *   - Default Arabic content renders
 *   - Image grid: 3-6 images, lazy loading, alt text
 *   - RTL: dir=rtl, IBM Plex Sans Arabic, no LTR classes
 *   - Layout variants: grid-3, grid-masonry, grid-asymmetric
 *   - imagePosition: right / left
 *   - Empty images handled gracefully
 *   - Puck config: registered, fields (incl. array), defaultProps
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroGalleryBlock } from "../blocks/hero/HeroGallery";
import { puckConfig } from "../config/puck-config";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const SAMPLE_IMAGES = [
  { url: "https://images.unsplash.com/photo-1600585154340?w=800", alt: "منتج أول" },
  { url: "https://images.unsplash.com/photo-1523275335684?w=800", alt: "منتج ثانٍ" },
  { url: "https://images.unsplash.com/photo-1542291026?w=800",    alt: "منتج ثالث" },
];

const defaults = {
  heading:       "مجموعة تناسب أسلوبك",
  subheading:    "تشكيلة واسعة من المنتجات المختارة بعناية",
  ctaText:       "استكشف المجموعة",
  ctaLink:       "#",
  images:        SAMPLE_IMAGES,
  layout:        "grid-3" as const,
  imagePosition: "right" as const,
};

// ── Content ───────────────────────────────────────────────────────────────────

describe("HeroGalleryBlock — content", () => {
  it("renders Arabic heading with default props", () => {
    render(<HeroGalleryBlock {...defaults} />);
    expect(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("مجموعة تناسب أسلوبك");
  });

  it("renders custom heading when provided", () => {
    render(<HeroGalleryBlock {...defaults} heading="عنوان مخصص" />);
    expect(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("عنوان مخصص");
  });

  it("renders subheading text", () => {
    render(<HeroGalleryBlock {...defaults} />);
    expect(
      screen.getByText("تشكيلة واسعة من المنتجات المختارة بعناية")
    ).toBeTruthy();
  });

  it("renders CTA link with correct href", () => {
    render(<HeroGalleryBlock {...defaults} ctaLink="/collection" />);
    const link = screen.getByRole("link", { name: "استكشف المجموعة" });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/collection");
  });

  it("does not render CTA when ctaText is empty", () => {
    render(<HeroGalleryBlock {...defaults} ctaText="" />);
    const links = screen.queryAllByRole("link");
    expect(links.length).toBe(0);
  });

  it("renders correct number of images", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} />);
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBe(3);
  });

  it("renders 6 images when 6 provided", () => {
    const sixImages = [
      ...SAMPLE_IMAGES,
      { url: "https://example.com/4.jpg", alt: "منتج رابع" },
      { url: "https://example.com/5.jpg", alt: "منتج خامس" },
      { url: "https://example.com/6.jpg", alt: "منتج سادس" },
    ];
    const { container } = render(<HeroGalleryBlock {...defaults} images={sixImages} />);
    expect(container.querySelectorAll("img").length).toBe(6);
  });

  it("renders alt text on each image", () => {
    render(<HeroGalleryBlock {...defaults} />);
    expect(screen.getByAltText("منتج أول")).toBeTruthy();
    expect(screen.getByAltText("منتج ثانٍ")).toBeTruthy();
    expect(screen.getByAltText("منتج ثالث")).toBeTruthy();
  });

  it("handles empty images array without crashing", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} images={[]} />);
    const section = container.querySelector("section");
    expect(section).toBeTruthy();
    expect(container.querySelectorAll("img").length).toBe(0);
  });
});

// ── RTL compliance ─────────────────────────────────────────────────────────────

describe("HeroGalleryBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} />);
    const section = container.querySelector("section");
    expect(section?.getAttribute("style")).toContain("IBM Plex Sans Arabic");
  });

  it("does NOT use forbidden LTR classes (pl-, pr-, ml-, mr-, text-left, text-right)", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const classNames = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "")
      .join(" ");
    expect(classNames).not.toMatch(forbidden);
  });
});

// ── Image loading ──────────────────────────────────────────────────────────────

describe("HeroGalleryBlock — image loading", () => {
  it("all images have loading=lazy", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} />);
    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs.length).toBeGreaterThan(0);
    imgs.forEach((img) => {
      expect(img.getAttribute("loading")).toBe("lazy");
    });
  });

  it("images have object-cover class", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} />);
    const imgs = Array.from(container.querySelectorAll("img"));
    imgs.forEach((img) => {
      expect(img.className).toContain("object-cover");
    });
  });

  it("image src matches the url prop", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} />);
    const imgs = container.querySelectorAll("img");
    expect(imgs[0].getAttribute("src")).toBe(SAMPLE_IMAGES[0].url);
    expect(imgs[1].getAttribute("src")).toBe(SAMPLE_IMAGES[1].url);
  });
});

// ── Layout ─────────────────────────────────────────────────────────────────────

describe("HeroGalleryBlock — layout", () => {
  it("grid-3 layout renders data-grid-layout=grid-3", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} layout="grid-3" />);
    const grid = container.querySelector("[data-grid-layout]");
    expect(grid?.getAttribute("data-grid-layout")).toBe("grid-3");
  });

  it("grid-masonry layout renders data-grid-layout=grid-masonry", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} layout="grid-masonry" />);
    const grid = container.querySelector("[data-grid-layout]");
    expect(grid?.getAttribute("data-grid-layout")).toBe("grid-masonry");
  });

  it("grid-asymmetric layout renders data-grid-layout=grid-asymmetric", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} layout="grid-asymmetric" />);
    const grid = container.querySelector("[data-grid-layout]");
    expect(grid?.getAttribute("data-grid-layout")).toBe("grid-asymmetric");
  });

  it("imagePosition=right marks images side with data-images-position=right", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} imagePosition="right" />);
    const grid = container.querySelector("[data-images-position]");
    expect(grid?.getAttribute("data-images-position")).toBe("right");
  });

  it("imagePosition=left marks images side with data-images-position=left", () => {
    const { container } = render(<HeroGalleryBlock {...defaults} imagePosition="left" />);
    const grid = container.querySelector("[data-images-position]");
    expect(grid?.getAttribute("data-images-position")).toBe("left");
  });
});

// ── Puck Config ───────────────────────────────────────────────────────────────

describe("HeroGallery Puck config", () => {
  it("HeroGallery is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("HeroGallery");
  });

  it("HeroGallery config has all required fields", () => {
    const config = puckConfig.components.HeroGallery;
    expect(config.fields).toHaveProperty("heading");
    expect(config.fields).toHaveProperty("subheading");
    expect(config.fields).toHaveProperty("ctaText");
    expect(config.fields).toHaveProperty("ctaLink");
    expect(config.fields).toHaveProperty("images");
    expect(config.fields).toHaveProperty("layout");
    expect(config.fields).toHaveProperty("imagePosition");
  });

  it("images field is type array", () => {
    const config = puckConfig.components.HeroGallery;
    expect(config.fields?.images).toHaveProperty("type", "array");
  });

  it("images arrayFields has url and alt", () => {
    const config = puckConfig.components.HeroGallery;
    const imagesField = config.fields?.images as { arrayFields?: Record<string, unknown> };
    expect(imagesField?.arrayFields).toHaveProperty("url");
    expect(imagesField?.arrayFields).toHaveProperty("alt");
  });

  it("defaultProps use Arabic content", () => {
    const config = puckConfig.components.HeroGallery;
    expect(config.defaultProps?.heading).toBe("مجموعة تناسب أسلوبك");
    expect(config.defaultProps?.ctaText).toBe("استكشف المجموعة");
    expect(config.defaultProps?.subheading).toContain("تشكيلة واسعة");
  });

  it("defaultProps includes sample images", () => {
    const config = puckConfig.components.HeroGallery;
    const images = config.defaultProps?.images as unknown[];
    expect(Array.isArray(images)).toBe(true);
    expect((images as unknown[]).length).toBeGreaterThanOrEqual(3);
  });

  it("defaultProps imagePosition is right", () => {
    const config = puckConfig.components.HeroGallery;
    expect(config.defaultProps?.imagePosition).toBe("right");
  });

  it("defaultProps layout is grid-3", () => {
    const config = puckConfig.components.HeroGallery;
    expect(config.defaultProps?.layout).toBe("grid-3");
  });
});
