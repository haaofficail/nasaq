/**
 * GalleryCarousel Block — TDD tests (Day 14)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GalleryCarouselBlock } from "../blocks/media/GalleryCarousel";
import { puckConfig } from "../config/puck-config";

const DEFAULT_ITEMS = [
  { imageUrl: "https://example.com/img1.jpg", alt: "متجر الرياض",          caption: "افتتاح متجر الرياض الجديد" },
  { imageUrl: "https://example.com/img2.jpg", alt: "فعالية إطلاق المنتج", caption: "حفل إطلاق منتجنا الجديد" },
  { imageUrl: "https://example.com/img3.jpg", alt: "فريق العمل",           caption: "فريقنا في ورشة التدريب" },
  { imageUrl: "https://example.com/img4.jpg", alt: "العملاء",              caption: "لقاء مع شركاء النجاح" },
];

const defaults = {
  heading:    "معرض الصور",
  subheading: "لحظات من رحلتنا",
  items:      DEFAULT_ITEMS,
  autoplay:   false,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("GalleryCarouselBlock — rendering", () => {
  it("renders heading", () => {
    render(<GalleryCarouselBlock {...defaults} />);
    expect(screen.getByText("معرض الصور")).toBeTruthy();
  });

  it("renders first image by default", () => {
    render(<GalleryCarouselBlock {...defaults} />);
    expect(screen.getByAltText("متجر الرياض")).toBeTruthy();
  });

  it("renders caption of first image", () => {
    render(<GalleryCarouselBlock {...defaults} />);
    expect(screen.getByText("افتتاح متجر الرياض الجديد")).toBeTruthy();
  });

  it("renders prev and next buttons", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    expect(container.querySelector("[data-prev]")).toBeTruthy();
    expect(container.querySelector("[data-next]")).toBeTruthy();
  });

  it("renders dots equal to item count", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    expect(container.querySelectorAll("[data-dot]").length).toBe(4);
  });

  it("first dot is active initially", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    const dots = container.querySelectorAll("[data-dot]");
    expect(dots[0].getAttribute("data-active")).toBe("true");
  });

  it("handles empty items without crashing", () => {
    render(<GalleryCarouselBlock {...defaults} items={[]} />);
    expect(screen.getByText("معرض الصور")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// INTERACTION
// ═══════════════════════════════════════════════════════════════

describe("GalleryCarouselBlock — interaction", () => {
  it("clicking next shows second image", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    const nextBtn = container.querySelector("[data-next]")!;
    fireEvent.click(nextBtn);
    expect(screen.getByAltText("فعالية إطلاق المنتج")).toBeTruthy();
  });

  it("clicking prev from slide 2 returns to slide 1", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    const nextBtn = container.querySelector("[data-next]")!;
    const prevBtn = container.querySelector("[data-prev]")!;
    fireEvent.click(nextBtn);
    fireEvent.click(prevBtn);
    expect(screen.getByAltText("متجر الرياض")).toBeTruthy();
  });

  it("clicking dot navigates to that slide", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    const dots = container.querySelectorAll("[data-dot]");
    fireEvent.click(dots[2]);
    expect(screen.getByAltText("فريق العمل")).toBeTruthy();
  });

  it("active dot updates on navigation", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    const nextBtn = container.querySelector("[data-next]")!;
    fireEvent.click(nextBtn);
    const dots = container.querySelectorAll("[data-dot]");
    expect(dots[1].getAttribute("data-active")).toBe("true");
    expect(dots[0].getAttribute("data-active")).toBe("false");
  });

  it("wraps from last to first on next", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    const nextBtn = container.querySelector("[data-next]")!;
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    // wraps back to first
    expect(screen.getByAltText("متجر الرياض")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("GalleryCarouselBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=gallery-carousel", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    expect(container.querySelector("[data-block='gallery-carousel']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<GalleryCarouselBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const cls = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "").join(" ");
    expect(cls).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("GalleryCarousel Puck config", () => {
  it("GalleryCarousel is registered", () => {
    expect(puckConfig.components).toHaveProperty("GalleryCarousel");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.GalleryCarousel;
    ["heading", "subheading", "items", "autoplay"].forEach((f) =>
      expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("items field is type array", () => {
    expect((puckConfig.components.GalleryCarousel.fields?.items as { type?: string })?.type).toBe("array");
  });

  it("defaultProps have 4 Arabic items", () => {
    const items = puckConfig.components.GalleryCarousel.defaultProps?.items as unknown[];
    expect(items?.length).toBe(4);
  });
});
