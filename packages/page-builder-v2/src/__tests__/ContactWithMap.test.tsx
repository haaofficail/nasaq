/**
 * ContactWithMap Block — TDD tests (Day 15)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactWithMapBlock } from "../blocks/contact/ContactWithMap";
import { puckConfig } from "../config/puck-config";

const defaults = {
  heading:      "موقعنا وتواصل معنا",
  subheading:   "زورونا أو تواصلوا معنا عبر القنوات التالية",
  address:      "طريق الملك فهد، حي العليا، الرياض 12211",
  phone:        "0114567890",
  email:        "info@example.com",
  workingHours: "الأحد – الخميس: 9 صباحاً – 6 مساءً",
  mapEmbedUrl:  "",
  nameLabel:    "الاسم الكامل",
  emailLabel:   "البريد الإلكتروني",
  messageLabel: "رسالتك",
  submitLabel:  "أرسل",
  submitEndpoint: "",
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("ContactWithMapBlock — rendering", () => {
  it("renders heading", () => {
    render(<ContactWithMapBlock {...defaults} />);
    expect(screen.getByText("موقعنا وتواصل معنا")).toBeTruthy();
  });

  it("renders address", () => {
    render(<ContactWithMapBlock {...defaults} />);
    expect(
      screen.getByText("طريق الملك فهد، حي العليا، الرياض 12211")
    ).toBeTruthy();
  });

  it("renders phone number", () => {
    render(<ContactWithMapBlock {...defaults} />);
    expect(screen.getByText("0114567890")).toBeTruthy();
  });

  it("renders email address", () => {
    render(<ContactWithMapBlock {...defaults} />);
    expect(screen.getByText("info@example.com")).toBeTruthy();
  });

  it("renders working hours", () => {
    render(<ContactWithMapBlock {...defaults} />);
    expect(
      screen.getByText("الأحد – الخميس: 9 صباحاً – 6 مساءً")
    ).toBeTruthy();
  });

  it("renders contact form", () => {
    const { container } = render(<ContactWithMapBlock {...defaults} />);
    expect(container.querySelector("[data-contact-form]")).toBeTruthy();
  });

  it("renders contact info section", () => {
    const { container } = render(<ContactWithMapBlock {...defaults} />);
    expect(container.querySelector("[data-contact-info]")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// MAP EMBED
// ═══════════════════════════════════════════════════════════════

describe("ContactWithMapBlock — map embed", () => {
  it("shows map placeholder when mapEmbedUrl is empty", () => {
    const { container } = render(<ContactWithMapBlock {...defaults} mapEmbedUrl="" />);
    expect(container.querySelector("[data-map-placeholder]")).toBeTruthy();
  });

  it("does NOT show iframe when mapEmbedUrl is empty", () => {
    const { container } = render(<ContactWithMapBlock {...defaults} mapEmbedUrl="" />);
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("shows iframe when mapEmbedUrl is provided", () => {
    const { container } = render(
      <ContactWithMapBlock
        {...defaults}
        mapEmbedUrl="https://maps.google.com/maps?q=riyadh&output=embed"
      />
    );
    expect(container.querySelector("iframe")).toBeTruthy();
  });

  it("does NOT show placeholder when mapEmbedUrl is provided", () => {
    const { container } = render(
      <ContactWithMapBlock
        {...defaults}
        mapEmbedUrl="https://maps.google.com/maps?q=riyadh&output=embed"
      />
    );
    expect(container.querySelector("[data-map-placeholder]")).toBeNull();
  });

  it("iframe src matches mapEmbedUrl", () => {
    const url = "https://maps.google.com/maps?q=riyadh&output=embed";
    const { container } = render(
      <ContactWithMapBlock {...defaults} mapEmbedUrl={url} />
    );
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe(url);
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe("ContactWithMapBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<ContactWithMapBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<ContactWithMapBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style")).toContain(
      "IBM Plex Sans Arabic"
    );
  });

  it("has data-block=contact-with-map", () => {
    const { container } = render(<ContactWithMapBlock {...defaults} />);
    expect(container.querySelector("[data-block='contact-with-map']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<ContactWithMapBlock {...defaults} />);
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

describe("ContactWithMap Puck config", () => {
  it("ContactWithMap is registered", () => {
    expect(puckConfig.components).toHaveProperty("ContactWithMap");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.ContactWithMap;
    ["heading", "address", "phone", "email", "mapEmbedUrl"].forEach((f) =>
      expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("defaultProps have Arabic heading", () => {
    const dp = puckConfig.components.ContactWithMap.defaultProps;
    expect(typeof dp?.heading).toBe("string");
    expect((dp?.heading as string).length).toBeGreaterThan(0);
  });
});
