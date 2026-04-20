/**
 * ContactSimple Block — TDD tests (Day 15)
 * Run: pnpm --filter @nasaq/page-builder-v2 test
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactSimpleBlock } from "../blocks/contact/ContactSimple";
import { puckConfig } from "../config/puck-config";

const defaults = {
  heading:        "تواصل معنا",
  subheading:     "نحن هنا للإجابة على استفساراتك",
  nameLabel:      "الاسم الكامل",
  emailLabel:     "البريد الإلكتروني",
  messageLabel:   "رسالتك",
  submitLabel:    "أرسل الرسالة",
  submitEndpoint: "",
};

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

describe("ContactSimpleBlock — rendering", () => {
  it("renders heading", () => {
    render(<ContactSimpleBlock {...defaults} />);
    expect(screen.getByText("تواصل معنا")).toBeTruthy();
  });

  it("renders subheading", () => {
    render(<ContactSimpleBlock {...defaults} />);
    expect(screen.getByText("نحن هنا للإجابة على استفساراتك")).toBeTruthy();
  });

  it("renders name input", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} />);
    expect(container.querySelector("input[name='name']")).toBeTruthy();
  });

  it("renders email input", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} />);
    expect(container.querySelector("input[name='email']")).toBeTruthy();
  });

  it("renders message textarea", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} />);
    expect(container.querySelector("textarea[name='message']")).toBeTruthy();
  });

  it("renders submit button with label", () => {
    render(<ContactSimpleBlock {...defaults} />);
    expect(screen.getByText("أرسل الرسالة")).toBeTruthy();
  });

  it("renders field labels", () => {
    render(<ContactSimpleBlock {...defaults} />);
    expect(screen.getByText("الاسم الكامل")).toBeTruthy();
    expect(screen.getByText("البريد الإلكتروني")).toBeTruthy();
    expect(screen.getByText("رسالتك")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

describe("ContactSimpleBlock — validation", () => {
  it("shows error state when submitted with empty fields", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} />);
    const btn = container.querySelector("[data-submit-btn]")!;
    fireEvent.click(btn);
    expect(
      container.querySelector("[data-contact-form]")?.getAttribute("data-error")
    ).toBe("true");
  });

  it("does not show error state initially", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} />);
    expect(
      container.querySelector("[data-contact-form]")?.getAttribute("data-error")
    ).not.toBe("true");
  });

  it("shows error when only name is filled", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} />);
    fireEvent.change(container.querySelector("input[name='name']")!, {
      target: { value: "أحمد" },
    });
    fireEvent.click(container.querySelector("[data-submit-btn]")!);
    expect(
      container.querySelector("[data-contact-form]")?.getAttribute("data-error")
    ).toBe("true");
  });
});

// ═══════════════════════════════════════════════════════════════
// DEMO SUBMISSION
// ═══════════════════════════════════════════════════════════════

describe("ContactSimpleBlock — demo submission", () => {
  it("shows success state after filling and submitting (demo mode)", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} submitEndpoint="" />);
    fireEvent.change(container.querySelector("input[name='name']")!, {
      target: { value: "أحمد محمد" },
    });
    fireEvent.change(container.querySelector("input[name='email']")!, {
      target: { value: "ahmed@test.com" },
    });
    fireEvent.change(container.querySelector("textarea[name='message']")!, {
      target: { value: "مرحباً، أريد الاستفسار عن خدماتكم" },
    });
    fireEvent.click(container.querySelector("[data-submit-btn]")!);
    expect(container.querySelector("[data-success-state]")).toBeTruthy();
  });

  it("hides form after successful demo submission", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} submitEndpoint="" />);
    fireEvent.change(container.querySelector("input[name='name']")!, {
      target: { value: "أحمد" },
    });
    fireEvent.change(container.querySelector("input[name='email']")!, {
      target: { value: "a@b.com" },
    });
    fireEvent.change(container.querySelector("textarea[name='message']")!, {
      target: { value: "رسالة" },
    });
    fireEvent.click(container.querySelector("[data-submit-btn]")!);
    expect(container.querySelector("[data-contact-form]")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// RTL COMPLIANCE
// ═══════════════════════════════════════════════════════════════

describe("ContactSimpleBlock — RTL compliance", () => {
  it("root section has dir=rtl", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("dir")).toBe("rtl");
  });

  it("uses IBM Plex Sans Arabic font", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} />);
    expect(container.querySelector("section")?.getAttribute("style")).toContain(
      "IBM Plex Sans Arabic"
    );
  });

  it("has data-block=contact-simple", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} />);
    expect(container.querySelector("[data-block='contact-simple']")).toBeTruthy();
  });

  it("does NOT use forbidden LTR classes", () => {
    const { container } = render(<ContactSimpleBlock {...defaults} />);
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

describe("ContactSimple Puck config", () => {
  it("ContactSimple is registered", () => {
    expect(puckConfig.components).toHaveProperty("ContactSimple");
  });

  it("config has required fields", () => {
    const cfg = puckConfig.components.ContactSimple;
    ["heading", "subheading", "nameLabel", "emailLabel", "messageLabel", "submitLabel"].forEach(
      (f) => expect(cfg.fields).toHaveProperty(f)
    );
  });

  it("defaultProps have Arabic heading", () => {
    const dp = puckConfig.components.ContactSimple.defaultProps;
    expect(typeof dp?.heading).toBe("string");
    expect((dp?.heading as string).length).toBeGreaterThan(0);
  });
});
