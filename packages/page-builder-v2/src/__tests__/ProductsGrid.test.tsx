/**
 * ProductsGrid Block — TDD tests (Day 10)
 *
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProductsGridBlock } from "../blocks/products/ProductsGrid";
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
    ok:   true,
    json: async () => ({ products }),
  } as Response));
}

function stubFetchError() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
}

function stubFetchNotOk() {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok:   false,
    json: async () => ({ error: "Server error" }),
  } as Response));
}

afterEach(() => vi.unstubAllGlobals());

// ── Default props fixture ─────────────────────────────────────

const defaults = {
  heading:       "منتجاتنا المميزة",
  subheading:    "اختر من أجود المنتجات",
  categoryId:    null as { id: string; name: string } | null,
  featured:      false,
  limit:         8,
  sortBy:        "newest" as const,
  layout:        "grid-3" as const,
  showPrice:     true,
  showAddToCart: false,
};

// ═══════════════════════════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════════════════════════

describe("ProductsGridBlock — loading state", () => {
  it("renders loading skeleton while fetching", () => {
    // fetch never resolves → stays in loading
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const { container } = render(<ProductsGridBlock {...defaults} />);
    expect(container.querySelector("[data-loading]")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════════════════

describe("ProductsGridBlock — error state", () => {
  it("renders Arabic error message when fetch fails", async () => {
    stubFetchError();
    render(<ProductsGridBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText(/تعذّر تحميل/)).toBeTruthy();
    });
  });

  it("renders Arabic error message when response is not ok", async () => {
    stubFetchNotOk();
    render(<ProductsGridBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText(/تعذّر تحميل/)).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════

describe("ProductsGridBlock — empty state", () => {
  it("renders Arabic empty message when products=[]", async () => {
    stubFetchSuccess([]);
    render(<ProductsGridBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText(/لا توجد منتجات متاحة/)).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// PRODUCT CARDS
// ═══════════════════════════════════════════════════════════════

describe("ProductsGridBlock — product cards", () => {
  it("renders heading text", () => {
    stubFetchSuccess();
    render(<ProductsGridBlock {...defaults} />);
    // heading is rendered synchronously (before fetch)
    expect(screen.getByText("منتجاتنا المميزة")).toBeTruthy();
  });

  it("renders product names after fetch resolves", async () => {
    stubFetchSuccess();
    render(<ProductsGridBlock {...defaults} />);
    await waitFor(() => {
      expect(screen.getByText("ورد جوري أحمر")).toBeTruthy();
      expect(screen.getByText("باقة عيد ميلاد")).toBeTruthy();
    });
  });

  it("renders price in SAR format when showPrice=true", async () => {
    stubFetchSuccess();
    render(<ProductsGridBlock {...defaults} showPrice={true} />);
    await waitFor(() => {
      // At least one price element present
      expect(screen.getAllByText(/ر\.س/).length).toBeGreaterThan(0);
    });
  });

  it("does NOT render price when showPrice=false", async () => {
    stubFetchSuccess();
    render(<ProductsGridBlock {...defaults} showPrice={false} />);
    await screen.findByText("ورد جوري أحمر"); // wait for products
    expect(screen.queryAllByText(/ر\.س/)).toHaveLength(0);
  });

  it("renders image with loading=lazy", async () => {
    stubFetchSuccess();
    render(<ProductsGridBlock {...defaults} />);
    const img = await screen.findByRole("img");
    expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("renders image with correct src", async () => {
    stubFetchSuccess();
    render(<ProductsGridBlock {...defaults} />);
    const img = await screen.findByRole("img");
    expect(img.getAttribute("src")).toBe("https://r2.example.com/rose.jpg");
  });

  it("renders add-to-cart button when showAddToCart=true", async () => {
    stubFetchSuccess();
    render(<ProductsGridBlock {...defaults} showAddToCart={true} />);
    await waitFor(() => {
      expect(screen.getAllByText(/تفاصيل المنتج/)[0]).toBeTruthy();
    });
  });

  it("does NOT render cart button when showAddToCart=false", async () => {
    stubFetchSuccess();
    render(<ProductsGridBlock {...defaults} showAddToCart={false} />);
    await screen.findByText("ورد جوري أحمر");
    expect(screen.queryAllByText(/تفاصيل المنتج/)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe("ProductsGridBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    stubFetchSuccess();
    const { container } = render(<ProductsGridBlock {...defaults} />);
    // dir=rtl is present from initial render (not async)
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font family", () => {
    stubFetchSuccess();
    const { container } = render(<ProductsGridBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style"))
      .toContain("IBM Plex Sans Arabic");
  });

  it("does NOT use forbidden LTR classes (pl-, pr-, ml-, mr-, text-left, text-right)", async () => {
    stubFetchSuccess();
    const { container } = render(<ProductsGridBlock {...defaults} />);
    await screen.findByText("منتجاتنا المميزة");
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const classNames = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "")
      .join(" ");
    expect(classNames).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// LAYOUT VARIANTS
// ═══════════════════════════════════════════════════════════════

describe("ProductsGridBlock — layout variants", () => {
  it("grid-3: sets data-layout=grid-3 on product grid container", async () => {
    stubFetchSuccess();
    const { container } = render(<ProductsGridBlock {...defaults} layout="grid-3" />);
    await screen.findByText("ورد جوري أحمر");
    expect(container.querySelector("[data-layout='grid-3']")).toBeTruthy();
  });

  it("grid-4: sets data-layout=grid-4 on product grid container", async () => {
    stubFetchSuccess();
    const { container } = render(<ProductsGridBlock {...defaults} layout="grid-4" />);
    await screen.findByText("ورد جوري أحمر");
    expect(container.querySelector("[data-layout='grid-4']")).toBeTruthy();
  });

  it("carousel: sets data-layout=carousel on product grid container", async () => {
    stubFetchSuccess();
    const { container } = render(<ProductsGridBlock {...defaults} layout="carousel" />);
    await screen.findByText("ورد جوري أحمر");
    expect(container.querySelector("[data-layout='carousel']")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("ProductsGrid Puck config", () => {
  it("ProductsGrid is registered in puckConfig", () => {
    expect(puckConfig.components).toHaveProperty("ProductsGrid");
  });

  it("config has all required fields", () => {
    const config = puckConfig.components.ProductsGrid;
    const required = [
      "heading", "subheading",
      "categoryId", "featured", "limit",
      "sortBy", "layout", "showPrice", "showAddToCart",
    ];
    required.forEach((field) => {
      expect(config.fields).toHaveProperty(field);
    });
  });

  it("categoryId field is type external", () => {
    const config = puckConfig.components.ProductsGrid;
    expect((config.fields?.categoryId as { type?: string })?.type).toBe("external");
  });

  it("layout options contain grid-3, grid-4, carousel", () => {
    const config = puckConfig.components.ProductsGrid;
    const opts = (config.fields?.layout as { options?: { value: string }[] })
      ?.options?.map((o) => o.value) ?? [];
    expect(opts).toContain("grid-3");
    expect(opts).toContain("grid-4");
    expect(opts).toContain("carousel");
  });

  it("sortBy options contain newest/price_asc/price_desc/popular", () => {
    const config = puckConfig.components.ProductsGrid;
    const opts = (config.fields?.sortBy as { options?: { value: string }[] })
      ?.options?.map((o) => o.value) ?? [];
    expect(opts).toContain("newest");
    expect(opts).toContain("price_asc");
    expect(opts).toContain("price_desc");
    expect(opts).toContain("popular");
  });

  it("limit field is type number", () => {
    const config = puckConfig.components.ProductsGrid;
    expect((config.fields?.limit as { type?: string })?.type).toBe("number");
  });

  it("defaultProps heading is Arabic", () => {
    const config = puckConfig.components.ProductsGrid;
    const h = config.defaultProps?.heading as string;
    expect(h).toBeTruthy();
    expect(/[\u0600-\u06FF]/.test(h)).toBe(true);
  });

  it("defaultProps layout is grid-3", () => {
    expect(puckConfig.components.ProductsGrid.defaultProps?.layout).toBe("grid-3");
  });

  it("defaultProps limit is 8", () => {
    expect(puckConfig.components.ProductsGrid.defaultProps?.limit).toBe(8);
  });

  it("defaultProps showPrice is true", () => {
    expect(puckConfig.components.ProductsGrid.defaultProps?.showPrice).toBe(true);
  });
});
