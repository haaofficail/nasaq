/**
 * HeroSplit Block — TDD tests
 *
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 *
 * Coverage targets:
 *   - Default Arabic content (heading, subheading, dual CTAs)
 *   - Primary + Secondary CTAs independently
 *   - Image: src, alt, lazy loading
 *   - RTL: dir=rtl, IBM Plex Sans Arabic, no LTR classes
 *   - imagePosition: left (default) / right — reflected as data attribute
 *   - textAlignment: right / center
 *   - accentStyle: none / line / dot / gradient
 *   - mediaType: image / illustration / video-embed
 *   - Puck config: registered, all 12 fields, defaultProps
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroSplitBlock } from "../blocks/hero/HeroSplit";
import { puckConfig } from "../config/puck-config";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const defaults = {
  heading:           "نصنع التجارب الفريدة",
  subheading:        "حلول تجارية ذكية تناسب طموحاتك وتسرّع نموك",
  primaryCtaText:    "ابدأ رحلتك",
  primaryCtaLink:    "#",
  secondaryCtaText:  "تعرّف علينا",
  secondaryCtaLink:  "/about",
  imageUrl:          "https://images.unsplash.com/photo-1600585154340?w=1200",
  imageAlt:          "فريق عمل ترميز OS",
  imagePosition:     "left"  as const,
  textAlignment:     "right" as const,
  mediaType:         "image" as const,
  accentStyle:       "none"  as const,
};

// ── Content ───────────────────────────────────────────────────────────────────

describe("HeroSplitBlock — content", () => {
  it("renders Arabic heading with default props", () => {
    render(<HeroSplitBlock {...defaults} />);
    expect(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("نصنع التجارب الفريدة");
  });

  it("renders custom heading when provided", () => {
    render(<HeroSplitBlock {...defaults} heading="عنوان مخصص" />);
    expect(screen.getByRole("heading", { level: 1 }))
      .toHaveTextContent("عنوان مخصص");
  });

  it("renders subheading text", () => {
    render(<HeroSplitBlock {...defaults} />);
    expect(
      screen.getByText("حلول تجارية ذكية تناسب طموحاتك وتسرّع نموك")
    ).toBeTruthy();
  });
});

// ── CTAs ──────────────────────────────────────────────────────────────────────

describe("HeroSplitBlock — CTAs", () => {
  it("renders primary CTA link with correct text and href", () => {
    render(<HeroSplitBlock {...defaults} primaryCtaLink="/start" />);
    const link = screen.getByRole("link", { name: "ابدأ رحلتك" });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/start");
  });

  it("renders secondary CTA link with correct text and href", () => {
    render(<HeroSplitBlock {...defaults} />);
    const link = screen.getByRole("link", { name: "تعرّف علينا" });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/about");
  });

  it("secondary CTA is hidden when secondaryCtaText is empty", () => {
    render(<HeroSplitBlock {...defaults} secondaryCtaText="" />);
    const links = screen.queryAllByRole("link");
    // Only primary CTA link should exist
    expect(links.length).toBe(1);
  });

  it("both CTAs render when both provided", () => {
    render(<HeroSplitBlock {...defaults} />);
    const links = screen.queryAllByRole("link");
    expect(links.length).toBe(2);
  });

  it("primary CTA not rendered when primaryCtaText is empty", () => {
    render(<HeroSplitBlock {...defaults} primaryCtaText="" secondaryCtaText="" />);
    expect(screen.queryAllByRole("link").length).toBe(0);
  });
});

// ── Image ─────────────────────────────────────────────────────────────────────

describe("HeroSplitBlock — image", () => {
  it("renders image with correct src", () => {
    const { container } = render(<HeroSplitBlock {...defaults} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(defaults.imageUrl);
  });

  it("renders image with correct alt text", () => {
    render(<HeroSplitBlock {...defaults} />);
    expect(screen.getByAltText("فريق عمل ترميز OS")).toBeTruthy();
  });

  it("image has loading=lazy", () => {
    const { container } = render(<HeroSplitBlock {...defaults} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });

  it("renders placeholder when imageUrl is empty", () => {
    const { container } = render(<HeroSplitBlock {...defaults} imageUrl="" />);
    // Section still renders without crash; no img element
    expect(container.querySelector("section")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });
});

// ── RTL compliance ─────────────────────────────────────────────────────────────

describe("HeroSplitBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<HeroSplitBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    const { container } = render(<HeroSplitBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("does NOT use forbidden LTR classes (pl-, pr-, ml-, mr-, text-left, text-right)", () => {
    const { container } = render(<HeroSplitBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const classNames = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "")
      .join(" ");
    expect(classNames).not.toMatch(forbidden);
  });
});

// ── imagePosition ─────────────────────────────────────────────────────────────

describe("HeroSplitBlock — imagePosition", () => {
  it("imagePosition=left sets data-image-position=left on split container", () => {
    const { container } = render(
      <HeroSplitBlock {...defaults} imagePosition="left" />
    );
    const split = container.querySelector("[data-split]");
    expect(split?.getAttribute("data-image-position")).toBe("left");
  });

  it("imagePosition=right sets data-image-position=right on split container", () => {
    const { container } = render(
      <HeroSplitBlock {...defaults} imagePosition="right" />
    );
    const split = container.querySelector("[data-split]");
    expect(split?.getAttribute("data-image-position")).toBe("right");
  });
});

// ── textAlignment ─────────────────────────────────────────────────────────────

describe("HeroSplitBlock — textAlignment", () => {
  it("textAlignment=right applies text-start to text panel (RTL: start = right)", () => {
    const { container } = render(
      <HeroSplitBlock {...defaults} textAlignment="right" />
    );
    const textPanel = container.querySelector("[data-text-panel]");
    expect(textPanel?.className).toContain("text-start");
  });

  it("textAlignment=center applies text-center to text panel", () => {
    const { container } = render(
      <HeroSplitBlock {...defaults} textAlignment="center" />
    );
    const textPanel = container.querySelector("[data-text-panel]");
    expect(textPanel?.className).toContain("text-center");
  });
});

// ── accentStyle ───────────────────────────────────────────────────────────────

describe("HeroSplitBlock — accentStyle", () => {
  it("accentStyle=none renders no data-accent element", () => {
    const { container } = render(
      <HeroSplitBlock {...defaults} accentStyle="none" />
    );
    expect(container.querySelector("[data-accent]")).toBeNull();
  });

  it("accentStyle=line renders data-accent=line element", () => {
    const { container } = render(
      <HeroSplitBlock {...defaults} accentStyle="line" />
    );
    expect(container.querySelector("[data-accent='line']")).toBeTruthy();
  });

  it("accentStyle=dot renders data-accent=dot element", () => {
    const { container } = render(
      <HeroSplitBlock {...defaults} accentStyle="dot" />
    );
    expect(container.querySelector("[data-accent='dot']")).toBeTruthy();
  });

  it("accentStyle=gradient renders data-accent=gradient element", () => {
    const { container } = render(
      <HeroSplitBlock {...defaults} accentStyle="gradient" />
    );
    expect(container.querySelector("[data-accent='gradient']")).toBeTruthy();
  });
});

// ── mediaType ─────────────────────────────────────────────────────────────────

describe("HeroSplitBlock — mediaType", () => {
  it("mediaType=image renders img element with data-media-type=image", () => {
    const { container } = render(
      <HeroSplitBlock {...defaults} mediaType="image" />
    );
    const media = container.querySelector("[data-media-type='image']");
    expect(media?.tagName.toLowerCase()).toBe("img");
  });

  it("mediaType=illustration renders img with data-media-type=illustration", () => {
    const { container } = render(
      <HeroSplitBlock {...defaults} mediaType="illustration" />
    );
    const media = container.querySelector("[data-media-type='illustration']");
    expect(media?.tagName.toLowerCase()).toBe("img");
  });

  it("mediaType=video-embed renders div with data-media-type=video-embed", () => {
    const { container } = render(
      <HeroSplitBlock {...defaults} mediaType="video-embed" />
    );
    const media = container.querySelector("[data-media-type='video-embed']");
    expect(media).toBeTruthy();
  });
});

// ── Puck Config ───────────────────────────────────────────────────────────────

describe("HeroSplit Puck config", () => {
  it("HeroSplit is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("HeroSplit");
  });

  it("config has all 12 required fields", () => {
    const config = puckConfig.components.HeroSplit;
    const required = [
      "heading", "subheading",
      "primaryCtaText", "primaryCtaLink",
      "secondaryCtaText", "secondaryCtaLink",
      "imageUrl", "imageAlt",
      "imagePosition", "textAlignment",
      "mediaType", "accentStyle",
    ];
    required.forEach((field) => {
      expect(config.fields).toHaveProperty(field);
    });
  });

  it("imagePosition options contain right and left", () => {
    const config = puckConfig.components.HeroSplit;
    const opts = (config.fields?.imagePosition as { options?: { value: string }[] })
      ?.options?.map((o) => o.value) ?? [];
    expect(opts).toContain("right");
    expect(opts).toContain("left");
  });

  it("textAlignment options contain right and center", () => {
    const config = puckConfig.components.HeroSplit;
    const opts = (config.fields?.textAlignment as { options?: { value: string }[] })
      ?.options?.map((o) => o.value) ?? [];
    expect(opts).toContain("right");
    expect(opts).toContain("center");
  });

  it("accentStyle options contain none/line/dot/gradient", () => {
    const config = puckConfig.components.HeroSplit;
    const opts = (config.fields?.accentStyle as { options?: { value: string }[] })
      ?.options?.map((o) => o.value) ?? [];
    expect(opts).toContain("none");
    expect(opts).toContain("line");
    expect(opts).toContain("dot");
    expect(opts).toContain("gradient");
  });

  it("mediaType options contain image/illustration/video-embed", () => {
    const config = puckConfig.components.HeroSplit;
    const opts = (config.fields?.mediaType as { options?: { value: string }[] })
      ?.options?.map((o) => o.value) ?? [];
    expect(opts).toContain("image");
    expect(opts).toContain("illustration");
    expect(opts).toContain("video-embed");
  });

  it("defaultProps use Arabic content", () => {
    const config = puckConfig.components.HeroSplit;
    expect(config.defaultProps?.heading).toBe("نصنع التجارب الفريدة");
    expect(config.defaultProps?.primaryCtaText).toBe("ابدأ رحلتك");
    expect(config.defaultProps?.subheading).toContain("حلول تجارية");
  });

  it("defaultProps primaryCtaText is 'ابدأ رحلتك'", () => {
    expect(puckConfig.components.HeroSplit.defaultProps?.primaryCtaText)
      .toBe("ابدأ رحلتك");
  });

  it("defaultProps secondaryCtaText is 'تعرّف علينا'", () => {
    expect(puckConfig.components.HeroSplit.defaultProps?.secondaryCtaText)
      .toBe("تعرّف علينا");
  });

  it("defaultProps imagePosition is left", () => {
    expect(puckConfig.components.HeroSplit.defaultProps?.imagePosition)
      .toBe("left");
  });

  it("defaultProps accentStyle is line", () => {
    expect(puckConfig.components.HeroSplit.defaultProps?.accentStyle)
      .toBe("line");
  });
});
