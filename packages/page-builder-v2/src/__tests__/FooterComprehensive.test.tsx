/**
 * FooterComprehensive Block — TDD tests (Day 15)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FooterComprehensiveBlock } from "../blocks/footer/FooterComprehensive";
import { puckConfig } from "../config/puck-config";

const DEFAULT_COLUMNS = [
  {
    title: "عن الشركة",
    links: [
      { label: "من نحن",   url: "/about" },
      { label: "رؤيتنا",  url: "/vision" },
      { label: "فريقنا",  url: "/team" },
    ],
  },
  {
    title: "خدماتنا",
    links: [
      { label: "إدارة المواعيد", url: "/services/bookings" },
      { label: "إدارة المخزون",  url: "/services/inventory" },
      { label: "التقارير",       url: "/services/reports" },
    ],
  },
  {
    title: "الدعم",
    links: [
      { label: "الأسئلة الشائعة", url: "/faq" },
      { label: "اتصل بنا",        url: "/contact" },
      { label: "المدونة",          url: "/blog" },
    ],
  },
  {
    title: "قانوني",
    links: [
      { label: "سياسة الخصوصية", url: "/privacy" },
      { label: "شروط الخدمة",    url: "/terms" },
    ],
  },
];

const defaults = {
  logoText:    "ترميز OS",
  tagline:     "منصة إدارة الأعمال الذكية للمنشآت السعودية",
  description: "نمكّن المنشآت الصغيرة والمتوسطة من إدارة أعمالها بكفاءة عالية",
  columns:     DEFAULT_COLUMNS,
  socialLinks: [
    { platform: "twitter"   as const, url: "https://twitter.com/tarmizos"          },
    { platform: "instagram" as const, url: "https://instagram.com/tarmizos"        },
    { platform: "linkedin"  as const, url: "https://linkedin.com/company/tarmizos" },
    { platform: "youtube"   as const, url: "https://youtube.com/@tarmizos"         },
  ],
  bottomLinks: [
    { label: "سياسة الخصوصية", url: "/privacy" },
    { label: "شروط الخدمة",    url: "/terms"   },
  ],
  copyright: "© 2026 ترميز OS. جميع الحقوق محفوظة.",
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("FooterComprehensiveBlock — rendering", () => {
  it("renders logo text", () => {
    render(<FooterComprehensiveBlock {...defaults} />);
    expect(screen.getByText("ترميز OS")).toBeTruthy();
  });

  it("renders tagline", () => {
    render(<FooterComprehensiveBlock {...defaults} />);
    expect(
      screen.getByText("منصة إدارة الأعمال الذكية للمنشآت السعودية")
    ).toBeTruthy();
  });

  it("renders description", () => {
    render(<FooterComprehensiveBlock {...defaults} />);
    expect(
      screen.getByText("نمكّن المنشآت الصغيرة والمتوسطة من إدارة أعمالها بكفاءة عالية")
    ).toBeTruthy();
  });

  it("renders all 4 column titles", () => {
    render(<FooterComprehensiveBlock {...defaults} />);
    expect(screen.getByText("عن الشركة")).toBeTruthy();
    expect(screen.getByText("خدماتنا")).toBeTruthy();
    expect(screen.getByText("الدعم")).toBeTruthy();
    expect(screen.getByText("قانوني")).toBeTruthy();
  });

  it("renders exactly 4 footer columns", () => {
    const { container } = render(<FooterComprehensiveBlock {...defaults} />);
    expect(
      container.querySelectorAll("[data-footer-column]").length
    ).toBe(4);
  });

  it("renders links within columns", () => {
    render(<FooterComprehensiveBlock {...defaults} />);
    expect(screen.getByText("من نحن")).toBeTruthy();
    expect(screen.getByText("إدارة المواعيد")).toBeTruthy();
    expect(screen.getByText("الأسئلة الشائعة")).toBeTruthy();
  });

  it("renders social links section", () => {
    const { container } = render(<FooterComprehensiveBlock {...defaults} />);
    expect(container.querySelector("[data-social-links]")).toBeTruthy();
  });

  it("renders 4 social link anchors", () => {
    const { container } = render(<FooterComprehensiveBlock {...defaults} />);
    const social = container.querySelector("[data-social-links]");
    expect(social?.querySelectorAll("a").length).toBe(4);
  });

  it("renders copyright text", () => {
    render(<FooterComprehensiveBlock {...defaults} />);
    expect(
      screen.getByText("© 2026 ترميز OS. جميع الحقوق محفوظة.")
    ).toBeTruthy();
  });

  it("renders bottom links", () => {
    render(<FooterComprehensiveBlock {...defaults} />);
    expect(screen.getAllByText("سياسة الخصوصية").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("شروط الخدمة").length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty columns array without crashing", () => {
    render(<FooterComprehensiveBlock {...defaults} columns={[]} />);
    expect(screen.getByText("ترميز OS")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe("FooterComprehensiveBlock — RTL compliance", () => {
  it("root footer has dir=rtl", () => {
    const { container } = render(<FooterComprehensiveBlock {...defaults} />);
    expect(container.querySelector("footer")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<FooterComprehensiveBlock {...defaults} />);
    expect(container.querySelector("footer")?.getAttribute("style")).toContain(
      "IBM Plex Sans Arabic"
    );
  });

  it("has data-block=footer-comprehensive", () => {
    const { container } = render(<FooterComprehensiveBlock {...defaults} />);
    expect(container.querySelector("[data-block='footer-comprehensive']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<FooterComprehensiveBlock {...defaults} />);
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

describe("FooterComprehensive Puck config", () => {
  it("FooterComprehensive is registered", () => {
    expect(puckConfig.components).toHaveProperty("FooterComprehensive");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.FooterComprehensive;
    ["logoText", "tagline", "description", "columns", "socialLinks", "copyright"].forEach(
      (f) => expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("columns field is type array", () => {
    expect(
      (puckConfig.components.FooterComprehensive.fields?.columns as { type?: string })?.type
    ).toBe("array");
  });

  it("defaultProps have 4 columns", () => {
    const cols = puckConfig.components.FooterComprehensive.defaultProps
      ?.columns as unknown[];
    expect(cols?.length).toBe(4);
  });

  it("defaultProps have Arabic logoText", () => {
    const dp = puckConfig.components.FooterComprehensive.defaultProps;
    expect(typeof dp?.logoText).toBe("string");
    expect((dp?.logoText as string).length).toBeGreaterThan(0);
  });
});
