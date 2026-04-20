/**
 * GalleryGrid Block — TDD tests (Day 14)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { GalleryGridBlock } from "../blocks/media/GalleryGrid";
import { puckConfig } from "../config/puck-config";

const DEFAULT_ITEMS = [
  { imageUrl: "https://example.com/img1.jpg", alt: "متجر الرياض",          caption: "افتتاح متجر الرياض الجديد" },
  { imageUrl: "https://example.com/img2.jpg", alt: "فعالية إطلاق المنتج", caption: "حفل إطلاق منتجنا الجديد" },
  { imageUrl: "https://example.com/img3.jpg", alt: "فريق العمل",           caption: "فريقنا في ورشة التدريب" },
  { imageUrl: "https://example.com/img4.jpg", alt: "العملاء",              caption: "لقاء مع شركاء النجاح" },
  { imageUrl: "https://example.com/img5.jpg", alt: "المعرض السنوي",        caption: "مشاركتنا في المعرض السنوي" },
  { imageUrl: "https://example.com/img6.jpg", alt: "مكتبنا",               caption: "مقر الشركة في الرياض" },
];

const defaults = {
  heading:     "معرض الصور",
  subheading:  "لحظات من رحلتنا",
  items:       DEFAULT_ITEMS,
  layout:      "grid-3" as const,
  aspectRatio: "square" as const,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("GalleryGridBlock — rendering", () => {
  it("renders heading", () => {
    render(<GalleryGridBlock {...defaults} />);
    expect(screen.getByText("معرض الصور")).toBeTruthy();
  });

  it("renders exactly 6 gallery items", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    expect(container.querySelectorAll("[data-gallery-item]").length).toBe(6);
  });

  it("renders alt text on all images", () => {
    render(<GalleryGridBlock {...defaults} />);
    expect(screen.getByAltText("متجر الرياض")).toBeTruthy();
    expect(screen.getByAltText("فعالية إطلاق المنتج")).toBeTruthy();
  });

  it("renders captions", () => {
    render(<GalleryGridBlock {...defaults} />);
    expect(screen.getByText("افتتاح متجر الرياض الجديد")).toBeTruthy();
  });

  it("images have lazy loading attribute", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    const images = container.querySelectorAll("img[loading='lazy']");
    expect(images.length).toBe(6);
  });

  it("handles empty items without crashing", () => {
    render(<GalleryGridBlock {...defaults} items={[]} />);
    expect(screen.getByText("معرض الصور")).toBeTruthy();
  });

  it("layout prop is reflected on grid container", () => {
    const { container } = render(<GalleryGridBlock {...defaults} layout="grid-4" />);
    expect(container.querySelector("[data-layout='grid-4']")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════════════════════════

describe("GalleryGridBlock — lightbox", () => {
  it("lightbox is not rendered initially", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    expect(container.querySelector("[data-lightbox]")).toBeNull();
  });

  it("clicking gallery item opens lightbox", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    const firstItem = container.querySelector("[data-gallery-item]")!;
    fireEvent.click(firstItem);
    expect(container.querySelector("[data-lightbox]")).toBeTruthy();
  });

  it("lightbox shows clicked image alt", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    const firstItem = container.querySelector("[data-gallery-item]")!;
    fireEvent.click(firstItem);
    const lightbox = container.querySelector("[data-lightbox]")!;
    expect(within(lightbox).getByAltText("متجر الرياض")).toBeTruthy();
  });

  it("lightbox has a close button", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    const firstItem = container.querySelector("[data-gallery-item]")!;
    fireEvent.click(firstItem);
    expect(container.querySelector("[data-lightbox-close]")).toBeTruthy();
  });

  it("closing lightbox removes it from DOM", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    const firstItem = container.querySelector("[data-gallery-item]")!;
    fireEvent.click(firstItem);
    const closeBtn = container.querySelector("[data-lightbox-close]")!;
    fireEvent.click(closeBtn);
    expect(container.querySelector("[data-lightbox]")).toBeNull();
  });

  it("lightbox shows caption of clicked image", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    const firstItem = container.querySelector("[data-gallery-item]")!;
    fireEvent.click(firstItem);
    const lightbox = container.querySelector("[data-lightbox]")!;
    expect(within(lightbox).getByText("افتتاح متجر الرياض الجديد")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL
// ═══════════════════════════════════════════════════════════════

describe("GalleryGridBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=gallery-grid", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    expect(container.querySelector("[data-block='gallery-grid']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<GalleryGridBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const cls = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "").join(" ");
    expect(cls).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("GalleryGrid Puck config", () => {
  it("GalleryGrid is registered", () => {
    expect(puckConfig.components).toHaveProperty("GalleryGrid");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.GalleryGrid;
    ["heading", "subheading", "items", "layout", "aspectRatio"].forEach((f) =>
      expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("items field is type array", () => {
    expect((puckConfig.components.GalleryGrid.fields?.items as { type?: string })?.type).toBe("array");
  });

  it("defaultProps have 6 Arabic items", () => {
    const items = puckConfig.components.GalleryGrid.defaultProps?.items as unknown[];
    expect(items?.length).toBe(6);
  });
});
