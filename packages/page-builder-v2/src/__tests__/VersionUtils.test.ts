/**
 * VersionUtils — TDD tests (RED phase)
 * Imports from non-existent module — guaranteed failure before implementation.
 *
 * Coverage:
 *   diffVersions          — 7 cases (added/removed/modified/unchanged/empty/null/ordering)
 *   summarizeVersionDiff  — 2 cases
 *   formatRelativeTime    — 5 cases
 *   getChangeTypeLabel    — 4 cases
 */

import { describe, test, expect } from "vitest";
import {
  diffVersions,
  summarizeVersionDiff,
  formatRelativeTime,
  getChangeTypeLabel,
} from "../utils/version-utils";

// ── Helper: build a minimal Puck block ────────────────────────────────────
function block(id: string, type = "HeroMinimal", props: Record<string, unknown> = {}) {
  return { type, props: { id, ...props } };
}

// ── diffVersions ───────────────────────────────────────────────────────────

describe("diffVersions", () => {
  test("detects added blocks (present in new, absent in old)", () => {
    const old_ = { content: [block("a")] };
    const new_ = { content: [block("a"), block("b")] };
    const diffs = diffVersions(old_, new_);
    const added = diffs.filter((d) => d.status === "added");
    expect(added).toHaveLength(1);
    expect(added[0].blockId).toBe("b");
  });

  test("detects removed blocks (present in old, absent in new)", () => {
    const old_ = { content: [block("a"), block("b")] };
    const new_ = { content: [block("a")] };
    const diffs = diffVersions(old_, new_);
    const removed = diffs.filter((d) => d.status === "removed");
    expect(removed).toHaveLength(1);
    expect(removed[0].blockId).toBe("b");
  });

  test("detects modified blocks (same id, different props)", () => {
    const old_ = { content: [block("a", "HeroMinimal", { title: "قديم" })] };
    const new_ = { content: [block("a", "HeroMinimal", { title: "جديد" })] };
    const diffs = diffVersions(old_, new_);
    const modified = diffs.filter((d) => d.status === "modified");
    expect(modified).toHaveLength(1);
    expect(modified[0].blockId).toBe("a");
    expect(modified[0].oldProps?.title).toBe("قديم");
    expect(modified[0].newProps?.title).toBe("جديد");
  });

  test("detects unchanged blocks (same id, same props)", () => {
    const b = block("a", "HeroMinimal", { title: "ثابت" });
    const old_ = { content: [b] };
    const new_ = { content: [b] };
    const diffs = diffVersions(old_, new_);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe("unchanged");
  });

  test("returns empty array for two empty content arrays", () => {
    const diffs = diffVersions({ content: [] }, { content: [] });
    expect(diffs).toEqual([]);
  });

  test("handles null old data (all new blocks = added)", () => {
    const new_ = { content: [block("a"), block("b")] };
    const diffs = diffVersions(null, new_);
    expect(diffs.every((d) => d.status === "added")).toBe(true);
    expect(diffs).toHaveLength(2);
  });

  test("handles null new data (all old blocks = removed)", () => {
    const old_ = { content: [block("a"), block("b")] };
    const diffs = diffVersions(old_, null);
    expect(diffs.every((d) => d.status === "removed")).toBe(true);
    expect(diffs).toHaveLength(2);
  });
});

// ── summarizeVersionDiff ───────────────────────────────────────────────────

describe("summarizeVersionDiff", () => {
  test("counts each status correctly", () => {
    const diffs = [
      { blockId: "a", blockType: "Hero", status: "added" as const },
      { blockId: "b", blockType: "Hero", status: "added" as const },
      { blockId: "c", blockType: "Hero", status: "removed" as const },
      { blockId: "d", blockType: "Hero", status: "modified" as const },
      { blockId: "e", blockType: "Hero", status: "unchanged" as const },
    ];
    const summary = summarizeVersionDiff(diffs);
    expect(summary.added).toBe(2);
    expect(summary.removed).toBe(1);
    expect(summary.modified).toBe(1);
    expect(summary.unchanged).toBe(1);
  });

  test("returns all zeros for empty diff array", () => {
    const summary = summarizeVersionDiff([]);
    expect(summary.added).toBe(0);
    expect(summary.removed).toBe(0);
    expect(summary.modified).toBe(0);
    expect(summary.unchanged).toBe(0);
  });
});

// ── formatRelativeTime ─────────────────────────────────────────────────────

describe("formatRelativeTime", () => {
  test("returns 'الآن' for time within last 60 seconds", () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelativeTime(recent)).toBe("الآن");
  });

  test("returns Arabic minutes format for 1-59 minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const result = formatRelativeTime(fiveMinAgo);
    expect(result).toContain("دقيق");
    expect(result).toContain("5");
  });

  test("returns Arabic hours format for 1-23 hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    const result = formatRelativeTime(twoHoursAgo);
    expect(result).toContain("ساع");
    expect(result).toContain("2");
  });

  test("returns Arabic days format for 1-6 days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString();
    const result = formatRelativeTime(threeDaysAgo);
    expect(result).toContain("يوم");
  });

  test("returns Arabic weeks format for 7+ days ago", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60_000).toISOString();
    const result = formatRelativeTime(twoWeeksAgo);
    expect(result).toContain("أسبوع");
  });
});

// ── getChangeTypeLabel ─────────────────────────────────────────────────────

describe("getChangeTypeLabel", () => {
  test("labels auto_save correctly", () => {
    expect(getChangeTypeLabel("auto_save")).toBe("حفظ تلقائي");
  });

  test("labels manual_save correctly", () => {
    expect(getChangeTypeLabel("manual_save")).toBe("حفظ يدوي");
  });

  test("labels publish correctly", () => {
    expect(getChangeTypeLabel("publish")).toBe("نشر");
  });

  test("labels restored correctly", () => {
    expect(getChangeTypeLabel("restored")).toBe("استعادة");
  });
});
