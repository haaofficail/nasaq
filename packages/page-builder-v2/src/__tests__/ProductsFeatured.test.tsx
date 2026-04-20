/**
 * ProductsFeatured Block — TDD tests (Day 11)
 *
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProductsFeaturedBlock } from "../blocks/products/ProductsFeatured";
import { puckConfig } from "../config/puck-config";

// ── Fetch mock helpers ────────────────────────────────────────

const MOCK_PRODUCTS = [
  {
    id:       "p1",
    name:     "ورد جوري أحمر",
    slug:     "red-roses",
    price:    "150.00",
    currency: "SAR",
    imageUrl: "https://r2.example.com/rose.jpg",
    imageAlt: "ورد جوري",
  },
  {
    id:       "p2",
    name:     "باقة عيد ميلاد",
    slug:     "birthday-bouquet",
    price:    "220.00",
    currency: "SAR",
    imageUrl: null,
    imageAlt: null,
  },
];

function stubFetchSuccess(products = MOCK_PRODUCTS) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ products }),
  } as Response));
}

function stubFetchError() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
}

afterEach(() => vi.unstubAllGlobals());

// ── Fixtures ────────────────────────────────────────────────

const defaults = {
  heading:         "منتجاتنا المميزة",
  subheading:      "إصدار خاص مختار بعناية",
  productIds:      [
    { product: { id: "p1", name: "ورد جوري أحمر" } },
    { product: { id: "p2", name: "باقة عيد ميلاد" } },
  ],
  layout:          "two" as const,
  showPrice:       true,
  showBadge:       true,
  showDescription: false,
  badgeText:       "الأكثر مبيعاً",
};

// ═══════════════════════════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════════════════════════

describe("ProductsFeaturedBlock — loading state", () => {
  it("renders loading skeleton while fetching", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const { container } = render(<ProductsFeaturedBlock {...defaults} />);
    expect(container.querySelector("[data-loading]")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════

describe("ProductsFeaturedBlock — empty state", () => {
  it("renders empty message when productIds is empty array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [] }),
    } as Response));
    render(<ProductsFeaturedBlock {...defaults} productIds={[]} />);
    await waitFor(() => {
      expect(screen.getByText(/لم يتم اختيار منتجات/)).toBeTruthy();
    });
  });

  it("renders empty message when all productIds are null", async () => {
    // No fetch is made when IDs are empty — component shows empty directly
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [] }),
    } as Response));
    render(<ProductsFeaturedBlock {...defaults} productIds={[{ product: null }]} />);
    await waitFor(() => {
      expect(screen.getByText(/لم يتم اختيار منتجات/)).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════════════════

describe("ProductsFeaturedBlock — error state", () => {
  it("renders Arabic error message when fetch fails", async () => {
    stubFetchError();
    render(<ProductsFeaturedBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText(/تعذّر تحميل/)).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// PRODUCT CARDS
// ═══════════════════════════════════════════════════════════════

describe("ProductsFeaturedBlock — product cards", () => {
  it("renders heading synchronously", () => {
    stubFetchSuccess();
    render(<ProductsFeaturedBlock {...defaults} />);
    expect(screen.getByText("منتجاتنا المميزة")).toBeTruthy();
  });

  it("renders product names after fetch", async () => {
    stubFetchSuccess();
    render(<ProductsFeaturedBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText("ورد جوري أحمر")).toBeTruthy();
      expect(screen.getByText("باقة عيد ميلاد")).toBeTruthy();
    });
  });

  it("shows price when showPrice=true", async () => {
    stubFetchSuccess();
    render(<ProductsFeaturedBlock {...defaults} showPrice={true} />);
    await waitFor(() => {
      expect(screen.getAllByText(/ر\.س/).length).toBeGreaterThan(0);
    });
  });

  it("hides price when showPrice=false", async () => {
    stubFetchSuccess();
    render(<ProductsFeaturedBlock {...defaults} showPrice={false} />);
    await screen.findByText("ورد جوري أحمر");
    expect(screen.queryAllByText(/ر\.س/)).toHaveLength(0);
  });

  it("shows badge text when showBadge=true", async () => {
    stubFetchSuccess();
    render(<ProductsFeaturedBlock {...defaults} showBadge={true} badgeText="الأكثر مبيعاً" />);
    await waitFor(() => {
      expect(screen.getAllByText(/الأكثر مبيعاً/).length).toBeGreaterThan(0);
    });
  });

  it("hides badge when showBadge=false", async () => {
    stubFetchSuccess();
    render(<ProductsFeaturedBlock {...defaults} showBadge={false} />);
    await screen.findByText("ورد جوري أحمر");
    expect(screen.queryAllByText(/الأكثر مبيعاً/)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// LAYOUT VARIANTS
// ═══════════════════════════════════════════════════════════════

describe("ProductsFeaturedBlock — layout variants", () => {
  it("single: sets data-layout=single", async () => {
    stubFetchSuccess([MOCK_PRODUCTS[0]]);
    const { container } = render(<ProductsFeaturedBlock {...defaults} layout="single" />);
    await screen.findByText("ورد جوري أحمر");
    expect(container.querySelector("[data-layout='single']")).toBeTruthy();
  });

  it("two: sets data-layout=two", async () => {
    stubFetchSuccess();
    const { container } = render(<ProductsFeaturedBlock {...defaults} layout="two" />);
    await screen.findByText("ورد جوري أحمر");
    expect(container.querySelector("[data-layout='two']")).toBeTruthy();
  });

  it("three: sets data-layout=three", async () => {
    stubFetchSuccess();
    const { container } = render(<ProductsFeaturedBlock {...defaults} layout="three" />);
    await screen.findByText("ورد جوري أحمر");
    expect(container.querySelector("[data-layout='three']")).toBeTruthy();
  });

  it("four: sets data-layout=four", async () => {
    stubFetchSuccess();
    const { container } = render(<ProductsFeaturedBlock {...defaults} layout="four" />);
    await screen.findByText("ورد جوري أحمر");
    expect(container.querySelector("[data-layout='four']")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe("ProductsFeaturedBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    stubFetchSuccess();
    const { container } = render(<ProductsFeaturedBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    stubFetchSuccess();
    const { container } = render(<ProductsFeaturedBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("has data-block=products-featured", () => {
    stubFetchSuccess();
    const { container } = render(<ProductsFeaturedBlock {...defaults} />);
    expect(container.querySelector("[data-block='products-featured']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes (pl-, pr-, ml-, mr-, text-left, text-right)", async () => {
    stubFetchSuccess();
    const { container } = render(<ProductsFeaturedBlock {...defaults} />);
    await screen.findByText("منتجاتنا المميزة");
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

describe("ProductsFeatured Puck config", () => {
  it("ProductsFeatured is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("ProductsFeatured");
  });

  it("config has all required fields", () => {
    const config = puckConfig.components.ProductsFeatured;
    const required = ["heading", "subheading", "productIds", "layout", "showPrice", "showBadge", "showDescription", "badgeText"];
    required.forEach((f) => expect(config.fields).toHaveProperty(f));
  });

  it("productIds field is type array", () => {
    const config = puckConfig.components.ProductsFeatured;
    expect((config.fields?.productIds as { type?: string })?.type).toBe("array");
  });

  it("layout options contain single, two, three, four", () => {
    const config = puckConfig.components.ProductsFeatured;
    const opts = (config.fields?.layout as { options?: { value: string }[] })
      ?.options?.map((o) => o.value) ?? [];
    expect(opts).toContain("single");
    expect(opts).toContain("two");
    expect(opts).toContain("three");
    expect(opts).toContain("four");
  });

  it("defaultProps layout is two", () => {
    expect(puckConfig.components.ProductsFeatured.defaultProps?.layout).toBe("two");
  });

  it("defaultProps heading is Arabic", () => {
    const h = puckConfig.components.ProductsFeatured.defaultProps?.heading as string;
    expect(/[\u0600-\u06FF]/.test(h)).toBe(true);
  });
});
