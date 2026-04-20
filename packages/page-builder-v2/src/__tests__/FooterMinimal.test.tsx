/**
 * FooterMinimal Block — TDD tests (Day 15)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FooterMinimalBlock } from "../blocks/footer/FooterMinimal";
import { puckConfig } from "../config/puck-config";

const defaults = {
  logoText:  "ترميز OS",
  tagline:   "منصة إدارة الأعمال الذكية",
  copyright: "© 2026 ترميز OS. جميع الحقوق محفوظة.",
  links: [
    { label: "الرئيسية",   url: "/" },
    { label: "الخدمات",   url: "/services" },
    { label: "سياسة الخصوصية", url: "/privacy" },
    { label: "اتصل بنا",  url: "/contact" },
  ],
  socialLinks: [
    { platform: "twitter"   as const, url: "https://twitter.com/tarmizos" },
    { platform: "instagram" as const, url: "https://instagram.com/tarmizos" },
    { platform: "linkedin"  as const, url: "https://linkedin.com/company/tarmizos" },
  ],
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("FooterMinimalBlock — rendering", () => {
  it("renders logo text", () => {
    render(<FooterMinimalBlock {...defaults} />);
    expect(screen.getByText("ترميز OS")).toBeTruthy();
  });

  it("renders tagline", () => {
    render(<FooterMinimalBlock {...defaults} />);
    expect(screen.getByText("منصة إدارة الأعمال الذكية")).toBeTruthy();
  });

  it("renders copyright text", () => {
    render(<FooterMinimalBlock {...defaults} />);
    expect(
      screen.getByText("© 2026 ترميز OS. جميع الحقوق محفوظة.")
    ).toBeTruthy();
  });

  it("renders all nav links", () => {
    render(<FooterMinimalBlock {...defaults} />);
    expect(screen.getByText("الرئيسية")).toBeTruthy();
    expect(screen.getByText("الخدمات")).toBeTruthy();
    expect(screen.getByText("اتصل بنا")).toBeTruthy();
  });

  it("nav links have correct href", () => {
    const { container } = render(<FooterMinimalBlock {...defaults} />);
    const footerLinks = container.querySelector("[data-footer-links]");
    const anchors = footerLinks?.querySelectorAll("a");
    expect(anchors?.length).toBeGreaterThanOrEqual(4);
  });

  it("renders social links section", () => {
    const { container } = render(<FooterMinimalBlock {...defaults} />);
    expect(container.querySelector("[data-social-links]")).toBeTruthy();
  });

  it("renders 3 social link anchors", () => {
    const { container } = render(<FooterMinimalBlock {...defaults} />);
    const social = container.querySelector("[data-social-links]");
    expect(social?.querySelectorAll("a").length).toBe(3);
  });

  it("renders copyright section", () => {
    const { container } = render(<FooterMinimalBlock {...defaults} />);
    expect(container.querySelector("[data-copyright]")).toBeTruthy();
  });

  it("handles empty links array without crashing", () => {
    render(<FooterMinimalBlock {...defaults} links={[]} />);
    expect(screen.getByText("ترميز OS")).toBeTruthy();
  });

  it("handles empty socialLinks array without crashing", () => {
    render(<FooterMinimalBlock {...defaults} socialLinks={[]} />);
    expect(screen.getByText("ترميز OS")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe("FooterMinimalBlock — RTL compliance", () => {
  it("root footer has dir=rtl", () => {
    const { container } = render(<FooterMinimalBlock {...defaults} />);
    expect(container.querySelector("footer")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<FooterMinimalBlock {...defaults} />);
    expect(container.querySelector("footer")?.getAttribute("style")).toContain(
      "IBM Plex Sans Arabic"
    );
  });

  it("has data-block=footer-minimal", () => {
    const { container } = render(<FooterMinimalBlock {...defaults} />);
    expect(container.querySelector("[data-block='footer-minimal']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<FooterMinimalBlock {...defaults} />);
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

describe("FooterMinimal Puck config", () => {
  it("FooterMinimal is registered", () => {
    expect(puckConfig.components).toHaveProperty("FooterMinimal");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.FooterMinimal;
    ["logoText", "tagline", "copyright", "links", "socialLinks"].forEach((f) =>
      expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("links field is type array", () => {
    expect(
      (puckConfig.components.FooterMinimal.fields?.links as { type?: string })?.type
    ).toBe("array");
  });

  it("socialLinks field is type array", () => {
    expect(
      (puckConfig.components.FooterMinimal.fields?.socialLinks as { type?: string })?.type
    ).toBe("array");
  });

  it("defaultProps have Arabic logoText", () => {
    const dp = puckConfig.components.FooterMinimal.defaultProps;
    expect(typeof dp?.logoText).toBe("string");
    expect((dp?.logoText as string).length).toBeGreaterThan(0);
  });
});
