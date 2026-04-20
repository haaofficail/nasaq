/**
 * CategoriesCarousel Block — TDD tests (Day 11)
 *
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CategoriesCarouselBlock } from "../blocks/categories/CategoriesCarousel";
import { puckConfig } from "../config/puck-config";

// ── Fetch mock helpers ────────────────────────────────────────

const MOCK_CATEGORIES = [
  { id: "c1", name: "ورود",       slug: "roses",         imageUrl: "https://r2.example.com/roses.jpg", productCount: 5 },
  { id: "c2", name: "زهور جافة", slug: "dried-flowers", imageUrl: null,                               productCount: 2 },
  { id: "c3", name: "نباتات",    slug: "plants",        imageUrl: null,                               productCount: 8 },
];

function stubFetchSuccess(categories = MOCK_CATEGORIES) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ categories }),
  } as Response));
}

function stubFetchError() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
}

afterEach(() => vi.unstubAllGlobals());

// ── Fixtures ────────────────────────────────────────────────

const defaults = {
  heading:          "تصفح التصنيفات",
  subheading:       "اختر ما يناسبك",
  categoryIds:      [] as Array<{ category: { id: string; name: string } | null }>,
  showProductCount: true,
  showImage:        true,
};

// ═══════════════════════════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════════════════════════

describe("CategoriesCarouselBlock — loading state", () => {
  it("renders loading skeleton while fetching", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const { container } = render(<CategoriesCarouselBlock {...defaults} />);
    expect(container.querySelector("[data-loading]")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════════════════

describe("CategoriesCarouselBlock — error state", () => {
  it("renders Arabic error message when fetch fails", async () => {
    stubFetchError();
    render(<CategoriesCarouselBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText(/تعذّر تحميل/)).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════

describe("CategoriesCarouselBlock — empty state", () => {
  it("renders Arabic empty message when categories=[]", async () => {
    stubFetchSuccess([]);
    render(<CategoriesCarouselBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText(/لا توجد تصنيفات/)).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// CATEGORY ITEMS
// ═══════════════════════════════════════════════════════════════

describe("CategoriesCarouselBlock — category items", () => {
  it("renders heading synchronously", () => {
    stubFetchSuccess();
    render(<CategoriesCarouselBlock {...defaults} />);
    expect(screen.getByText("تصفح التصنيفات")).toBeTruthy();
  });

  it("renders category names after fetch", async () => {
    stubFetchSuccess();
    render(<CategoriesCarouselBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText("ورود")).toBeTruthy();
      expect(screen.getByText("زهور جافة")).toBeTruthy();
    });
  });

  it("shows product count when showProductCount=true", async () => {
    stubFetchSuccess();
    render(<CategoriesCarouselBlock {...defaults} showProductCount={true} />);
    await waitFor(() => {
      expect(screen.getAllByText(/منتج/).length).toBeGreaterThan(0);
    });
  });

  it("hides product count when showProductCount=false", async () => {
    stubFetchSuccess();
    render(<CategoriesCarouselBlock {...defaults} showProductCount={false} />);
    await screen.findByText("ورود");
    expect(screen.queryAllByText(/منتج/)).toHaveLength(0);
  });

  it("filters to selected categoryIds when non-empty", async () => {
    stubFetchSuccess();
    render(
      <CategoriesCarouselBlock
        {...defaults}
        categoryIds={[{ category: { id: "c1", name: "ورود" } }]}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("ورود")).toBeTruthy();
    });
    expect(screen.queryByText("زهور جافة")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL & SCROLL COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe("CategoriesCarouselBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesCarouselBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesCarouselBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=categories-carousel", () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesCarouselBlock {...defaults} />);
    expect(container.querySelector("[data-block='categories-carousel']")).toBeTruthy();
  });

  it("has a horizontal scroll container after categories load", async () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesCarouselBlock {...defaults} />);
    await screen.findByText("ورود");
    expect(container.querySelector("[data-carousel-track]")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", async () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesCarouselBlock {...defaults} />);
    await screen.findByText("تصفح التصنيفات");
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const classNames = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "")
      .join(" ");
    expect(classNames).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("CategoriesCarousel Puck config", () => {
  it("CategoriesCarousel is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("CategoriesCarousel");
  });

  it("config has all required fields", () => {
    const config = puckConfig.components.CategoriesCarousel;
    const required = ["heading", "subheading", "categoryIds", "showProductCount", "showImage"];
    required.forEach((f) => expect(config.fields).toHaveProperty(f));
  });

  it("categoryIds field is type array", () => {
    const config = puckConfig.components.CategoriesCarousel;
    expect((config.fields?.categoryIds as { type?: string })?.type).toBe("array");
  });

  it("defaultProps showProductCount is true", () => {
    expect(puckConfig.components.CategoriesCarousel.defaultProps?.showProductCount).toBe(true);
  });

  it("defaultProps heading is Arabic", () => {
    const h = puckConfig.components.CategoriesCarousel.defaultProps?.heading as string;
    expect(/[\u0600-\u06FF]/.test(h)).toBe(true);
  });
});
