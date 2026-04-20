/**
 * HeroVideo Block — TDD tests
 *
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 *
 * Coverage targets:
 *   - Default Arabic content renders
 *   - Video: autoplay, muted, loop, playsInline, preload=metadata, poster
 *   - RTL: dir=rtl, IBM Plex Sans Arabic, no LTR classes
 *   - Overlay: opacity math, overlayColor variants
 *   - Alignment: right/center/left (RTL-aware)
 *   - muteToggle: button shows/hides
 *   - prefers-reduced-motion: video marked with data attribute
 *   - Puck config: registered, all fields, defaultProps
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroVideoBlock } from "../blocks/hero/HeroVideo";
import { puckConfig } from "../config/puck-config";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const defaults = {
  heading:        "قصة منتجاتنا في حركة",
  subheading:     "اكتشف جودة المنتجات عبر تجربة بصرية",
  ctaText:        "شاهد المزيد",
  ctaLink:        "#",
  videoUrl:       "https://example.com/hero.mp4",
  posterUrl:      "https://example.com/poster.jpg",
  overlayOpacity: 40,
  overlayColor:   "black" as const,
  alignment:      "center" as const,
  muteToggle:     false,
};

// ── Content ───────────────────────────────────────────────────────────────────

describe("HeroVideoBlock — content", () => {
  it("renders Arabic heading with default props", () => {
    render(<HeroVideoBlock {...defaults} />);
    expect(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("قصة منتجاتنا في حركة");
  });

  it("renders custom heading when provided", () => {
    render(<HeroVideoBlock {...defaults} heading="فيديو مخصص" />);
    expect(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("فيديو مخصص");
  });

  it("renders subheading text", () => {
    render(<HeroVideoBlock {...defaults} />);
    expect(
      screen.getByText("اكتشف جودة المنتجات عبر تجربة بصرية")
    ).toBeTruthy();
  });

  it("renders CTA link with correct href", () => {
    render(<HeroVideoBlock {...defaults} ctaLink="/watch" />);
    const link = screen.getByRole("link", { name: "شاهد المزيد" });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/watch");
  });

  it("does not render CTA when ctaText is empty", () => {
    render(<HeroVideoBlock {...defaults} ctaText="" />);
    expect(screen.queryAllByRole("link").length).toBe(0);
  });
});

// ── Video element ─────────────────────────────────────────────────────────────

describe("HeroVideoBlock — video element", () => {
  it("renders a video element when videoUrl is provided", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    const video = container.querySelector("[data-video]");
    expect(video?.tagName.toLowerCase()).toBe("video");
  });

  it("video has autoPlay attribute", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    const video = container.querySelector("[data-video]") as HTMLVideoElement;
    // React sets autoPlay as a boolean property
    expect(video?.autoplay ?? video?.hasAttribute("autoplay")).toBeTruthy();
  });

  it("video has loop attribute", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    const video = container.querySelector("[data-video]") as HTMLVideoElement;
    expect(video?.loop ?? video?.hasAttribute("loop")).toBeTruthy();
  });

  it("video has playsInline attribute (required for iOS autoplay)", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    const video = container.querySelector("[data-video]") as HTMLVideoElement;
    // playsInline is a boolean attribute
    expect(
      video?.playsInline ??
      video?.hasAttribute("playsinline") ??
      video?.hasAttribute("playsInline")
    ).toBeTruthy();
  });

  it("video has preload=metadata for performance", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    const video = container.querySelector("[data-video]") as HTMLVideoElement;
    expect(video?.getAttribute("preload")).toBe("metadata");
  });

  it("video src matches videoUrl prop", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    const video = container.querySelector("[data-video]") as HTMLVideoElement;
    expect(video?.getAttribute("src")).toBe("https://example.com/hero.mp4");
  });

  it("video poster attribute matches posterUrl prop", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    const video = container.querySelector("[data-video]") as HTMLVideoElement;
    expect(video?.getAttribute("poster")).toBe("https://example.com/poster.jpg");
  });

  it("video has aria-label for accessibility", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    const video = container.querySelector("[data-video]");
    expect(video?.getAttribute("aria-label")).toBeTruthy();
  });

  it("renders fallback placeholder when videoUrl is empty", () => {
    const { container } = render(<HeroVideoBlock {...defaults} videoUrl="" />);
    const section = container.querySelector("section");
    expect(section).toBeTruthy();
    // Should not render a video element when URL is empty
    const video = container.querySelector("[data-video]");
    expect(video).toBeNull();
  });
});

// ── Overlay ───────────────────────────────────────────────────────────────────

describe("HeroVideoBlock — overlay", () => {
  it("overlay element exists with data-overlay attribute", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    expect(container.querySelector("[data-overlay]")).toBeTruthy();
  });

  it("overlay opacity 40 → 0.40", () => {
    const { container } = render(<HeroVideoBlock {...defaults} overlayOpacity={40} />);
    const overlay = container.querySelector("[data-overlay]") as HTMLElement;
    expect(overlay?.style.opacity).toBe("0.4");
  });

  it("overlay opacity 0 is transparent", () => {
    const { container } = render(<HeroVideoBlock {...defaults} overlayOpacity={0} />);
    const overlay = container.querySelector("[data-overlay]") as HTMLElement;
    expect(overlay?.style.opacity).toBe("0");
  });

  it("overlay opacity 100 is fully opaque", () => {
    const { container } = render(<HeroVideoBlock {...defaults} overlayOpacity={100} />);
    const overlay = container.querySelector("[data-overlay]") as HTMLElement;
    expect(overlay?.style.opacity).toBe("1");
  });

  it("overlayColor=black sets data-overlay-color=black", () => {
    const { container } = render(<HeroVideoBlock {...defaults} overlayColor="black" />);
    const overlay = container.querySelector("[data-overlay]");
    expect(overlay?.getAttribute("data-overlay-color")).toBe("black");
  });

  it("overlayColor=brand sets data-overlay-color=brand", () => {
    const { container } = render(<HeroVideoBlock {...defaults} overlayColor="brand" />);
    const overlay = container.querySelector("[data-overlay]");
    expect(overlay?.getAttribute("data-overlay-color")).toBe("brand");
  });

  it("overlayColor=none sets data-overlay-color=none", () => {
    const { container } = render(<HeroVideoBlock {...defaults} overlayColor="none" />);
    const overlay = container.querySelector("[data-overlay]");
    expect(overlay?.getAttribute("data-overlay-color")).toBe("none");
  });
});

// ── Alignment ─────────────────────────────────────────────────────────────────

describe("HeroVideoBlock — alignment", () => {
  it("center alignment applies text-center and items-center", () => {
    const { container } = render(<HeroVideoBlock {...defaults} alignment="center" />);
    const content = container.querySelector("[data-content]");
    expect(content?.className).toContain("text-center");
    expect(content?.className).toContain("items-center");
  });

  it("right alignment applies text-start (RTL: start = right)", () => {
    const { container } = render(<HeroVideoBlock {...defaults} alignment="right" />);
    const content = container.querySelector("[data-content]");
    expect(content?.className).toContain("text-start");
    expect(content?.className).toContain("items-start");
  });

  it("left alignment applies text-end (RTL: end = left)", () => {
    const { container } = render(<HeroVideoBlock {...defaults} alignment="left" />);
    const content = container.querySelector("[data-content]");
    expect(content?.className).toContain("text-end");
    expect(content?.className).toContain("items-end");
  });
});

// ── RTL compliance ─────────────────────────────────────────────────────────────

describe("HeroVideoBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    const section = container.querySelector("section");
    expect(section?.getAttribute("style")).toContain("IBM Plex Sans Arabic");
  });

  it("does NOT use forbidden LTR classes (pl-, pr-, ml-, mr-, text-left, text-right)", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const classNames = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "")
      .join(" ");
    expect(classNames).not.toMatch(forbidden);
  });
});

// ── Mute toggle ───────────────────────────────────────────────────────────────

describe("HeroVideoBlock — muteToggle", () => {
  it("muteToggle=true renders mute button", () => {
    const { container } = render(<HeroVideoBlock {...defaults} muteToggle={true} />);
    const btn = container.querySelector("[data-mute-toggle]");
    expect(btn).toBeTruthy();
  });

  it("muteToggle=false hides mute button", () => {
    const { container } = render(<HeroVideoBlock {...defaults} muteToggle={false} />);
    const btn = container.querySelector("[data-mute-toggle]");
    expect(btn).toBeNull();
  });

  it("mute button has aria-label", () => {
    const { container } = render(<HeroVideoBlock {...defaults} muteToggle={true} />);
    const btn = container.querySelector("[data-mute-toggle]");
    expect(btn?.getAttribute("aria-label")).toBeTruthy();
  });
});

// ── prefers-reduced-motion ─────────────────────────────────────────────────────

describe("HeroVideoBlock — prefers-reduced-motion", () => {
  beforeEach(() => {
    // Mock matchMedia to simulate prefers-reduced-motion: reduce
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("section has data-reduced-motion=true when prefers-reduced-motion is active", () => {
    const { container } = render(<HeroVideoBlock {...defaults} />);
    const section = container.querySelector("section");
    expect(section?.getAttribute("data-reduced-motion")).toBe("true");
  });
});

// ── Puck Config ───────────────────────────────────────────────────────────────

describe("HeroVideo Puck config", () => {
  it("HeroVideo is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("HeroVideo");
  });

  it("HeroVideo config has all required fields", () => {
    const config = puckConfig.components.HeroVideo;
    expect(config.fields).toHaveProperty("heading");
    expect(config.fields).toHaveProperty("subheading");
    expect(config.fields).toHaveProperty("ctaText");
    expect(config.fields).toHaveProperty("ctaLink");
    expect(config.fields).toHaveProperty("videoUrl");
    expect(config.fields).toHaveProperty("posterUrl");
    expect(config.fields).toHaveProperty("overlayOpacity");
    expect(config.fields).toHaveProperty("overlayColor");
    expect(config.fields).toHaveProperty("alignment");
    expect(config.fields).toHaveProperty("muteToggle");
  });

  it("overlayColor field has black/brand/none options", () => {
    const config = puckConfig.components.HeroVideo;
    const field = config.fields?.overlayColor as { options?: { value: string }[] };
    const values = field?.options?.map((o) => o.value) ?? [];
    expect(values).toContain("black");
    expect(values).toContain("brand");
    expect(values).toContain("none");
  });

  it("alignment field has right/center/left options", () => {
    const config = puckConfig.components.HeroVideo;
    const field = config.fields?.alignment as { options?: { value: string }[] };
    const values = field?.options?.map((o) => o.value) ?? [];
    expect(values).toContain("right");
    expect(values).toContain("center");
    expect(values).toContain("left");
  });

  it("defaultProps use Arabic content", () => {
    const config = puckConfig.components.HeroVideo;
    expect(config.defaultProps?.heading).toBe("قصة منتجاتنا في حركة");
    expect(config.defaultProps?.ctaText).toBe("شاهد المزيد");
    expect(config.defaultProps?.subheading).toContain("اكتشف جودة");
  });

  it("defaultProps overlayOpacity is 40", () => {
    const config = puckConfig.components.HeroVideo;
    expect(config.defaultProps?.overlayOpacity).toBe(40);
  });

  it("defaultProps overlayColor is black", () => {
    const config = puckConfig.components.HeroVideo;
    expect(config.defaultProps?.overlayColor).toBe("black");
  });

  it("defaultProps alignment is center", () => {
    const config = puckConfig.components.HeroVideo;
    expect(config.defaultProps?.alignment).toBe("center");
  });

  it("defaultProps muteToggle is false", () => {
    const config = puckConfig.components.HeroVideo;
    expect(config.defaultProps?.muteToggle).toBe(false);
  });
});
