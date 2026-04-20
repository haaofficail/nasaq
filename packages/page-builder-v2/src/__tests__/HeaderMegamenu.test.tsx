/**
 * HeaderMegamenu Block — TDD tests (Day 16)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HeaderMegamenuBlock } from "../blocks/header/HeaderMegamenu";
import { puckConfig } from "../config/puck-config";

const DEFAULT_MENU_ITEMS = [
  {
    label: "الرئيسية",
    url:   "/",
    hasMegamenu: false,
    columns: [],
  },
  {
    label: "المنتجات",
    url:   "",
    hasMegamenu: true,
    columns: [
      {
        title:         "الأكثر مبيعاً",
        links:         [
          { label: "منتج أول",  url: "/p1" },
          { label: "منتج ثاني", url: "/p2" },
          { label: "منتج ثالث", url: "/p3" },
        ],
        featuredImage: "https://example.com/featured.jpg",
        featuredLink:  "/collection",
      },
      {
        title:         "الإصدارات الجديدة",
        links:         [
          { label: "منتج رابع",  url: "/p4" },
          { label: "منتج خامس", url: "/p5" },
        ],
        featuredImage: "",
        featuredLink:  "",
      },
    ],
  },
  {
    label: "التصنيفات",
    url:   "/categories",
    hasMegamenu: false,
    columns: [],
  },
  {
    label: "العروض",
    url:   "/deals",
    hasMegamenu: false,
    columns: [],
  },
  {
    label: "تواصل",
    url:   "/contact",
    hasMegamenu: false,
    columns: [],
  },
];

const defaults = {
  logoText:    "ترميز",
  logoUrl:     "/",
  menuItems:   DEFAULT_MENU_ITEMS,
  showSearch:  true,
  showAccount: true,
  showCart:    true,
  cartCount:   3,
  sticky:      false,
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("HeaderMegamenuBlock — rendering", () => {
  it("renders logoText", () => {
    render(<HeaderMegamenuBlock {...defaults} />);
    expect(screen.getByText("ترميز")).toBeTruthy();
  });

  it("renders all 5 menu items", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    expect(container.querySelectorAll("[data-menu-item]").length).toBe(5);
  });

  it("renders menu item labels", () => {
    render(<HeaderMegamenuBlock {...defaults} />);
    expect(screen.getByText("الرئيسية")).toBeTruthy();
    expect(screen.getByText("المنتجات")).toBeTruthy();
    expect(screen.getByText("التصنيفات")).toBeTruthy();
  });

  it("renders search button when showSearch is true", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} showSearch={true} />);
    expect(container.querySelector("[data-search-btn]")).toBeTruthy();
  });

  it("does NOT render search button when showSearch is false", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} showSearch={false} />);
    expect(container.querySelector("[data-search-btn]")).toBeNull();
  });

  it("renders account button when showAccount is true", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} showAccount={true} />);
    expect(container.querySelector("[data-account-btn]")).toBeTruthy();
  });

  it("does NOT render account button when showAccount is false", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} showAccount={false} />);
    expect(container.querySelector("[data-account-btn]")).toBeNull();
  });

  it("renders cart button when showCart is true", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} showCart={true} />);
    expect(container.querySelector("[data-cart-btn]")).toBeTruthy();
  });

  it("renders cart badge when cartCount is greater than 0", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} cartCount={3} />);
    expect(container.querySelector("[data-cart-badge]")).toBeTruthy();
  });

  it("cart badge shows correct count", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} cartCount={7} />);
    const badge = container.querySelector("[data-cart-badge]");
    expect(badge?.textContent).toBe("7");
  });

  it("does NOT render cart badge when cartCount is 0", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} cartCount={0} />);
    expect(container.querySelector("[data-cart-badge]")).toBeNull();
  });

  it("has data-block=header-megamenu", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    expect(container.querySelector("[data-block='header-megamenu']")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// MEGAMENU DROPDOWN
// ═══════════════════════════════════════════════════════════════

describe("HeaderMegamenuBlock — dropdown", () => {
  it("dropdown is not rendered initially", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    expect(container.querySelector("[data-dropdown]")).toBeNull();
  });

  it("dropdown trigger exists for item with hasMegamenu", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    expect(container.querySelector("[data-dropdown-trigger]")).toBeTruthy();
  });

  it("aria-expanded is false before clicking trigger", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    const trigger = container.querySelector("[data-dropdown-trigger]");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
  });

  it("clicking dropdown trigger opens megamenu", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    fireEvent.click(container.querySelector("[data-dropdown-trigger]")!);
    expect(container.querySelector("[data-dropdown]")).toBeTruthy();
  });

  it("aria-expanded is true after clicking trigger", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    fireEvent.click(container.querySelector("[data-dropdown-trigger]")!);
    expect(
      container.querySelector("[data-dropdown-trigger]")?.getAttribute("aria-expanded")
    ).toBe("true");
  });

  it("dropdown has multiple mega-columns", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    fireEvent.click(container.querySelector("[data-dropdown-trigger]")!);
    const dropdown = container.querySelector("[data-dropdown]")!;
    expect(dropdown.querySelectorAll("[data-mega-column]").length).toBeGreaterThanOrEqual(2);
  });

  it("dropdown shows column titles", () => {
    render(<HeaderMegamenuBlock {...defaults} />);
    fireEvent.click(document.querySelector("[data-dropdown-trigger]")!);
    expect(screen.getByText("الأكثر مبيعاً")).toBeTruthy();
    expect(screen.getByText("الإصدارات الجديدة")).toBeTruthy();
  });

  it("featured image is rendered when provided", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    fireEvent.click(container.querySelector("[data-dropdown-trigger]")!);
    expect(container.querySelector("[data-featured-image]")).toBeTruthy();
  });

  it("clicking trigger again closes dropdown", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    const trigger = container.querySelector("[data-dropdown-trigger]")!;
    fireEvent.click(trigger);
    expect(container.querySelector("[data-dropdown]")).toBeTruthy();
    fireEvent.click(container.querySelector("[data-dropdown-trigger]")!);
    expect(container.querySelector("[data-dropdown]")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe("HeaderMegamenuBlock — RTL compliance", () => {
  it("root header has dir=rtl", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    expect(container.querySelector("header")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    expect(container.querySelector("header")?.getAttribute("style")).toContain(
      "IBM Plex Sans Arabic"
    );
  });

  it("has data-sticky attribute", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} sticky={true} />);
    expect(
      container.querySelector("[data-block='header-megamenu']")?.getAttribute("data-sticky")
    ).toBe("true");
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<HeaderMegamenuBlock {...defaults} />);
    const forbidden = /\b(pl|pr|ml|mr)-\d+\b|text-(left|right)/;
    const cls = Array.from(container.querySelectorAll("[class]"))
      .map((el) => el.getAttribute("class") || "")
      .join(" ");
    expect(cls).not.toMatch(forbidden);
  });
});

// ═══════════════════════════════════════════════════════════════
// PUCK CONFIG
// ═══════════════════════════════════════════════════════════════

describe("HeaderMegamenu Puck config", () => {
  it("HeaderMegamenu is registered", () => {
    expect(puckConfig.components).toHaveProperty("HeaderMegamenu");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.HeaderMegamenu;
    ["logoText", "menuItems", "showSearch", "showAccount", "showCart", "cartCount", "sticky"].forEach(
      (f) => expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("menuItems field is type array", () => {
    expect(
      (puckConfig.components.HeaderMegamenu.fields?.menuItems as { type?: string })?.type
    ).toBe("array");
  });

  it("defaultProps have Arabic logoText", () => {
    const dp = puckConfig.components.HeaderMegamenu.defaultProps;
    expect(typeof dp?.logoText).toBe("string");
    expect((dp?.logoText as string).length).toBeGreaterThan(0);
  });

  it("defaultProps have menu items with Arabic labels", () => {
    const items = puckConfig.components.HeaderMegamenu.defaultProps?.menuItems as unknown[];
    expect(items?.length).toBeGreaterThanOrEqual(3);
  });
});
