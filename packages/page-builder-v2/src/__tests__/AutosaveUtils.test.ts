/**
 * AutosaveUtils — TDD tests (RED phase)
 * Imports from non-existent module — guaranteed failure before implementation.
 *
 * Coverage:
 *   computePageStatusBadge   — 5 cases
 *   isContentEqual           — 5 cases
 *   getRetryDelay            — 3 cases
 *   shouldAutoSave           — 4 cases
 *   formatSaveStatus         — 4 cases
 */

import { describe, test, expect } from "vitest";
import {
  computePageStatusBadge,
  isContentEqual,
  getRetryDelay,
  shouldAutoSave,
  formatSaveStatus,
} from "../utils/autosave-utils";

// ── computePageStatusBadge ─────────────────────────────────────────────────

describe("computePageStatusBadge", () => {
  test("returns archived for archived pages regardless of data", () => {
    expect(
      computePageStatusBadge({ status: "archived", draftData: null, publishedData: null })
    ).toBe("archived");
  });

  test("returns draft when status is draft and no publishedData", () => {
    expect(
      computePageStatusBadge({ status: "draft", draftData: { content: [] }, publishedData: null })
    ).toBe("draft");
  });

  test("returns draft when status is draft even with identical data", () => {
    const data = { content: [{ type: "HeroMinimal" }] };
    expect(
      computePageStatusBadge({ status: "draft", draftData: data, publishedData: data })
    ).toBe("draft");
  });

  test("returns published when status is published and data matches", () => {
    const data = { content: [{ type: "HeroMinimal" }], root: { props: {} } };
    expect(
      computePageStatusBadge({ status: "published", draftData: data, publishedData: data })
    ).toBe("published");
  });

  test("returns modified when status is published but draft differs from published", () => {
    const published = { content: [{ type: "HeroMinimal" }] };
    const draft = { content: [{ type: "HeroMinimal" }, { type: "Features3col" }] };
    expect(
      computePageStatusBadge({ status: "published", draftData: draft, publishedData: published })
    ).toBe("modified");
  });
});

// ── isContentEqual ─────────────────────────────────────────────────────────

describe("isContentEqual", () => {
  test("returns true for identical objects by reference", () => {
    const a = { content: [{ type: "Hero" }] };
    expect(isContentEqual(a, a)).toBe(true);
  });

  test("returns true for deeply equal objects with same structure", () => {
    const a = { content: [{ type: "Hero" }], root: { props: { title: "test" } } };
    const b = { content: [{ type: "Hero" }], root: { props: { title: "test" } } };
    expect(isContentEqual(a, b)).toBe(true);
  });

  test("returns false for objects with different content", () => {
    const a = { content: [{ type: "Hero" }] };
    const b = { content: [{ type: "Hero" }, { type: "Footer" }] };
    expect(isContentEqual(a, b)).toBe(false);
  });

  test("returns true for two nulls", () => {
    expect(isContentEqual(null, null)).toBe(true);
  });

  test("returns false when one side is null", () => {
    expect(isContentEqual({ content: [] }, null)).toBe(false);
    expect(isContentEqual(null, { content: [] })).toBe(false);
  });
});

// ── getRetryDelay ──────────────────────────────────────────────────────────

describe("getRetryDelay", () => {
  test("returns 2000ms for first retry attempt (index 0)", () => {
    expect(getRetryDelay(0)).toBe(2000);
  });

  test("returns 4000ms for second retry attempt (index 1)", () => {
    expect(getRetryDelay(1)).toBe(4000);
  });

  test("returns 8000ms for third retry attempt (index 2)", () => {
    expect(getRetryDelay(2)).toBe(8000);
  });
});

// ── shouldAutoSave ─────────────────────────────────────────────────────────

describe("shouldAutoSave", () => {
  test("returns true when dirty and 30s interval has elapsed", () => {
    const now = Date.now();
    expect(shouldAutoSave(true, now - 31_000, now, 30_000)).toBe(true);
  });

  test("returns false when not dirty even if interval elapsed", () => {
    const now = Date.now();
    expect(shouldAutoSave(false, now - 31_000, now, 30_000)).toBe(false);
  });

  test("returns false when dirty but interval has not elapsed", () => {
    const now = Date.now();
    expect(shouldAutoSave(true, now - 10_000, now, 30_000)).toBe(false);
  });

  test("returns true at exactly the interval boundary", () => {
    const now = Date.now();
    expect(shouldAutoSave(true, now - 30_000, now, 30_000)).toBe(true);
  });
});

// ── formatSaveStatus ───────────────────────────────────────────────────────

describe("formatSaveStatus", () => {
  test("formats idle status as empty string", () => {
    expect(formatSaveStatus("idle")).toBe("");
  });

  test("formats unsaved status correctly", () => {
    expect(formatSaveStatus("unsaved")).toBe("تغييرات غير محفوظة");
  });

  test("formats saving status correctly", () => {
    expect(formatSaveStatus("saving")).toBe("جاري الحفظ...");
  });

  test("formats error status correctly", () => {
    expect(formatSaveStatus("error")).toBe("فشل الحفظ — جاري إعادة المحاولة");
  });
});
