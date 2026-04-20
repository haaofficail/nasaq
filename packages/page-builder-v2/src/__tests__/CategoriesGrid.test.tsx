/**
 * CategoriesGrid Block — TDD tests (Day 11)
 *
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CategoriesGridBlock } from "../blocks/categories/CategoriesGrid";
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
  heading:          "تصنيفاتنا",
  subheading:       "تصفح حسب التصنيف",
  categoryIds:      [] as Array<{ category: { id: string; name: string } | null }>,
  layout:           "grid-3" as const,
  showProductCount: true,
  showImage:        true,
};

// ═══════════════════════════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════════════════════════

describe("CategoriesGridBlock — loading state", () => {
  it("renders loading skeleton while fetching", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const { container } = render(<CategoriesGridBlock {...defaults} />);
    expect(container.querySelector("[data-loading]")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════════════════

describe("CategoriesGridBlock — error state", () => {
  it("renders Arabic error message when fetch fails", async () => {
    stubFetchError();
    render(<CategoriesGridBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText(/تعذّر تحميل/)).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════

describe("CategoriesGridBlock — empty state", () => {
  it("renders Arabic empty message when categories=[]", async () => {
    stubFetchSuccess([]);
    render(<CategoriesGridBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText(/لا توجد تصنيفات/)).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// CATEGORY CARDS
// ═══════════════════════════════════════════════════════════════

describe("CategoriesGridBlock — category cards", () => {
  it("renders heading synchronously", () => {
    stubFetchSuccess();
    render(<CategoriesGridBlock {...defaults} />);
    expect(screen.getByText("تصنيفاتنا")).toBeTruthy();
  });

  it("renders category names after fetch", async () => {
    stubFetchSuccess();
    render(<CategoriesGridBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText("ورود")).toBeTruthy();
      expect(screen.getByText("زهور جافة")).toBeTruthy();
    });
  });

  it("shows product count when showProductCount=true", async () => {
    stubFetchSuccess();
    render(<CategoriesGridBlock {...defaults} showProductCount={true} />);
    await waitFor(() => {
      expect(screen.getAllByText(/منتج/).length).toBeGreaterThan(0);
    });
  });

  it("hides product count when showProductCount=false", async () => {
    stubFetchSuccess();
    render(<CategoriesGridBlock {...defaults} showProductCount={false} />);
    await screen.findByText("ورود");
    expect(screen.queryAllByText(/منتج/)).toHaveLength(0);
  });

  it("renders image when showImage=true and imageUrl present", async () => {
    stubFetchSuccess();
    render(<CategoriesGridBlock {...defaults} showImage={true} />);
    const imgs = await screen.findAllByRole("img");
    expect(imgs.length).toBeGreaterThan(0);
  });

  it("hides images when showImage=false", async () => {
    stubFetchSuccess();
    render(<CategoriesGridBlock {...defaults} showImage={false} />);
    await screen.findByText("ورود");
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("filters to selected categoryIds when non-empty", async () => {
    stubFetchSuccess();
    render(
      <CategoriesGridBlock
        {...defaults}
        categoryIds={[{ category: { id: "c1", name: "ورود" } }]}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("ورود")).toBeTruthy();
    });
    // زهور جافة should not appear
    expect(screen.queryByText("زهور جافة")).toBeNull();
  });

  it("shows all categories when categoryIds is empty", async () => {
    stubFetchSuccess();
    render(<CategoriesGridBlock {...defaults} categoryIds={[]} />);
    await waitFor(() => {
      expect(screen.getByText("ورود")).toBeTruthy();
      expect(screen.getByText("زهور جافة")).toBeTruthy();
      expect(screen.getByText("نباتات")).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// LAYOUT VARIANTS
// ═══════════════════════════════════════════════════════════════

describe("CategoriesGridBlock — layout variants", () => {
  it("grid-3: sets data-layout=grid-3", async () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesGridBlock {...defaults} layout="grid-3" />);
    await screen.findByText("ورود");
    expect(container.querySelector("[data-layout='grid-3']")).toBeTruthy();
  });

  it("grid-4: sets data-layout=grid-4", async () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesGridBlock {...defaults} layout="grid-4" />);
    await screen.findByText("ورود");
    expect(container.querySelector("[data-layout='grid-4']")).toBeTruthy();
  });

  it("grid-6: sets data-layout=grid-6", async () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesGridBlock {...defaults} layout="grid-6" />);
    await screen.findByText("ورود");
    expect(container.querySelector("[data-layout='grid-6']")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe("CategoriesGridBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesGridBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesGridBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=categories-grid", () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesGridBlock {...defaults} />);
    expect(container.querySelector("[data-block='categories-grid']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", async () => {
    stubFetchSuccess();
    const { container } = render(<CategoriesGridBlock {...defaults} />);
    await screen.findByText("تصنيفاتنا");
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

describe("CategoriesGrid Puck config", () => {
  it("CategoriesGrid is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("CategoriesGrid");
  });

  it("config has all required fields", () => {
    const config = puckConfig.components.CategoriesGrid;
    const required = ["heading", "subheading", "categoryIds", "layout", "showProductCount", "showImage"];
    required.forEach((f) => expect(config.fields).toHaveProperty(f));
  });

  it("categoryIds field is type array", () => {
    const config = puckConfig.components.CategoriesGrid;
    expect((config.fields?.categoryIds as { type?: string })?.type).toBe("array");
  });

  it("layout options contain grid-3, grid-4, grid-6", () => {
    const config = puckConfig.components.CategoriesGrid;
    const opts = (config.fields?.layout as { options?: { value: string }[] })
      ?.options?.map((o) => o.value) ?? [];
    expect(opts).toContain("grid-3");
    expect(opts).toContain("grid-4");
    expect(opts).toContain("grid-6");
  });

  it("defaultProps layout is grid-3", () => {
    expect(puckConfig.components.CategoriesGrid.defaultProps?.layout).toBe("grid-3");
  });

  it("defaultProps showProductCount is true", () => {
    expect(puckConfig.components.CategoriesGrid.defaultProps?.showProductCount).toBe(true);
  });
});
