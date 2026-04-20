/**
 * SeoUtils — Day 18 unit tests
 *
 * Tests for SEO utility functions:
 *   - arabicToSlug (Arabic→Latin transliteration + URL-safe slug)
 *   - validateSlug (validation rules)
 *   - getSeoWarnings (title/description/og warnings)
 *   - truncateForSerp (character truncation with ellipsis)
 *   - buildRobotsContent (index/follow string builder)
 *
 * TDD RED — all tests fail until seo-utils.ts is created.
 * Run: pnpm test --filter=@nasaq/page-builder-v2 SeoUtils
 */

import { describe, it, expect } from "vitest";
import {
  arabicToSlug,
  validateSlug,
  getSeoWarnings,
  truncateForSerp,
  buildRobotsContent,
} from "../utils/seo-utils";

// ── arabicToSlug ──────────────────────────────────────────────────────────

describe("arabicToSlug — basic ASCII passthrough", () => {
  it("lowercases English text", () => {
    expect(arabicToSlug("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(arabicToSlug("hello world")).toBe("hello-world");
  });

  it("preserves numbers", () => {
    expect(arabicToSlug("section 404")).toBe("section-404");
  });

  it("strips special ASCII chars", () => {
    expect(arabicToSlug("hello! world@")).toBe("hello-world");
  });

  it("collapses multiple hyphens to one", () => {
    expect(arabicToSlug("hello -- world")).toBe("hello-world");
  });

  it("strips leading/trailing hyphens", () => {
    expect(arabicToSlug("-hello-")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(arabicToSlug("")).toBe("");
  });

  it("returns empty string for only-special-chars input", () => {
    expect(arabicToSlug("!@#$%^")).toBe("");
  });

  it("handles numeric-only input", () => {
    expect(arabicToSlug("2024")).toBe("2024");
  });
});

describe("arabicToSlug — Arabic transliteration", () => {
  it("transliterates ب correctly", () => {
    expect(arabicToSlug("باب")).toContain("b");
  });

  it("transliterates ت correctly", () => {
    expect(arabicToSlug("تمر")).toContain("t");
  });

  it("transliterates ج correctly", () => {
    expect(arabicToSlug("جمل")).toContain("j");
  });

  it("transliterates ش as sh", () => {
    expect(arabicToSlug("شمس")).toContain("sh");
  });

  it("transliterates خ as kh", () => {
    expect(arabicToSlug("خبز")).toContain("kh");
  });

  it("transliterates the brand name ترميز", () => {
    const slug = arabicToSlug("ترميز");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug.length).toBeGreaterThan(0);
    expect(slug).toContain("t"); // ت
    expect(slug).toContain("r"); // ر
    expect(slug).toContain("m"); // م
  });

  it("transliterates multi-word Arabic phrase", () => {
    const slug = arabicToSlug("من نحن");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain("-"); // space → hyphen
  });

  it("transliterates Arabic with Arabic numerals removed", () => {
    const slug = arabicToSlug("صفحة 2024");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain("2024");
  });

  it("strips tashkeel (diacritics U+064B–U+065F)", () => {
    // مَرْحَبًا  with tashkeel vs مرحبا without — should produce same slug
    const withTashkeel = arabicToSlug("مَرْحَبًا");
    const without = arabicToSlug("مرحبا");
    expect(withTashkeel).toBe(without);
  });

  it("strips tatweel (U+0640)", () => {
    // مـرحبا (with tatweel between م and ر)
    const withTatweel = arabicToSlug("مـرحبا");
    const without = arabicToSlug("مرحبا");
    expect(withTatweel).toBe(without);
  });

  it("handles ة (taa marbuta) at end of word", () => {
    const slug = arabicToSlug("صفحة");
    expect(slug).toMatch(/^[a-z]+$/);
    expect(slug.length).toBeGreaterThan(0);
  });

  it("handles ال (definite article)", () => {
    const slug = arabicToSlug("المتجر");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain("al"); // ال → al
  });

  it("handles mixed Arabic and English", () => {
    const slug = arabicToSlug("section المنتجات");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain("section");
    expect(slug).toContain("-");
  });

  it("produces URL-safe output for any Arabic input", () => {
    const inputs = [
      "الرئيسية",
      "من نحن",
      "تواصل معنا",
      "خدماتنا",
      "المدونة",
      "صفحات المنتجات",
    ];
    for (const input of inputs) {
      const slug = arabicToSlug(input);
      expect(slug).toMatch(/^[a-z0-9-]*$/);
    }
  });

  it("produces consistent output (deterministic)", () => {
    const a = arabicToSlug("الرئيسية");
    const b = arabicToSlug("الرئيسية");
    expect(a).toBe(b);
  });
});

// ── validateSlug ──────────────────────────────────────────────────────────

describe("validateSlug", () => {
  it("returns empty array for valid slug", () => {
    const errors = validateSlug("my-page");
    expect(errors).toHaveLength(0);
  });

  it("returns error for empty slug", () => {
    const errors = validateSlug("");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("مطلوب");
  });

  it("returns error for slug with uppercase letters", () => {
    const errors = validateSlug("MyPage");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("صغيرة");
  });

  it("returns error for slug with spaces", () => {
    const errors = validateSlug("my page");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error for slug with underscore", () => {
    const errors = validateSlug("my_page");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error for slug with slash", () => {
    const errors = validateSlug("my/page");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error for slug with Arabic characters", () => {
    const errors = validateSlug("صفحة");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("accepts slug with hyphens", () => {
    const errors = validateSlug("my-page-slug");
    expect(errors).toHaveLength(0);
  });

  it("accepts slug with numbers", () => {
    const errors = validateSlug("page-404");
    expect(errors).toHaveLength(0);
  });

  it("returns error for slug starting with hyphen", () => {
    const errors = validateSlug("-page");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error for slug ending with hyphen", () => {
    const errors = validateSlug("page-");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error for slug with consecutive hyphens", () => {
    const errors = validateSlug("my--page");
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ── getSeoWarnings ────────────────────────────────────────────────────────

describe("getSeoWarnings", () => {
  it("returns no warnings when all fields are optimal", () => {
    // title: 33 chars (between 30–60), description: 130 chars (between 120–160), ogImage set
    const title = "عنوان صفحة جيد بطول مناسب جداً للـ SEO"; // ≥ 30 chars
    const description =
      "هذا الوصف يحتوي على معلومات كافية ومفيدة للمستخدمين ومحركات البحث وهو مناسب لأن طوله بين مائة وعشرين ومائة وستين حرفاً بالضبط";
    // description.length must be >= 120 and <= 160
    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(description.length).toBeGreaterThanOrEqual(120);
    const warnings = getSeoWarnings({
      title,
      description,
      ogImage: "https://example.com/og.jpg",
    });
    expect(warnings).toHaveLength(0);
  });

  it("warns when title is empty", () => {
    const warnings = getSeoWarnings({ title: "" });
    expect(warnings.some(w => w.field === "title")).toBe(true);
    expect(warnings.some(w => w.type === "error")).toBe(true);
  });

  it("warns when title is too short (< 30 chars)", () => {
    const warnings = getSeoWarnings({ title: "قصير" });
    const titleWarning = warnings.find(w => w.field === "title");
    expect(titleWarning).toBeDefined();
    expect(titleWarning?.message).toContain("قصير");
  });

  it("warns when title is too long (> 60 chars)", () => {
    const longTitle = "أ".repeat(61);
    const warnings = getSeoWarnings({ title: longTitle });
    const titleWarning = warnings.find(w => w.field === "title");
    expect(titleWarning).toBeDefined();
    expect(titleWarning?.message).toContain("طويل");
  });

  it("does NOT warn when title is 30-60 chars", () => {
    const goodTitle = "عنوان صفحة بطول مناسب جيد للـ SEO ترميز"; // >= 30 chars
    expect(goodTitle.length).toBeGreaterThanOrEqual(30);
    expect(goodTitle.length).toBeLessThanOrEqual(60);
    const warnings = getSeoWarnings({ title: goodTitle });
    expect(warnings.filter(w => w.field === "title")).toHaveLength(0);
  });

  it("warns when description is empty", () => {
    const warnings = getSeoWarnings({ title: "جيد", description: "" });
    expect(warnings.some(w => w.field === "description")).toBe(true);
  });

  it("warns when description is too short (< 120 chars)", () => {
    const warnings = getSeoWarnings({ description: "وصف قصير" });
    const descWarning = warnings.find(w => w.field === "description");
    expect(descWarning).toBeDefined();
    expect(descWarning?.message).toContain("قصير");
  });

  it("warns when description is too long (> 160 chars)", () => {
    const longDesc = "و".repeat(161);
    const warnings = getSeoWarnings({ description: longDesc });
    const descWarning = warnings.find(w => w.field === "description");
    expect(descWarning).toBeDefined();
    expect(descWarning?.message).toContain("طويل");
  });

  it("warns when OG image is missing", () => {
    const warnings = getSeoWarnings({ ogImage: "" });
    expect(warnings.some(w => w.field === "ogImage")).toBe(true);
  });

  it("does NOT warn about OG image when it is set", () => {
    const warnings = getSeoWarnings({ ogImage: "https://example.com/img.jpg" });
    expect(warnings.filter(w => w.field === "ogImage")).toHaveLength(0);
  });

  it("each warning has field, type, and message properties", () => {
    const warnings = getSeoWarnings({ title: "" });
    for (const w of warnings) {
      expect(w).toHaveProperty("field");
      expect(w).toHaveProperty("type");
      expect(w).toHaveProperty("message");
      expect(["error", "warning", "info"]).toContain(w.type);
    }
  });
});

// ── truncateForSerp ───────────────────────────────────────────────────────

describe("truncateForSerp", () => {
  it("returns text unchanged if shorter than max", () => {
    expect(truncateForSerp("hello", 60)).toBe("hello");
  });

  it("returns text unchanged if equal to max", () => {
    const text = "a".repeat(60);
    expect(truncateForSerp(text, 60)).toBe(text);
  });

  it("truncates and appends ellipsis when longer than max", () => {
    const text = "a".repeat(70);
    const result = truncateForSerp(text, 60);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(60);
  });

  it("truncation fits within max including ellipsis", () => {
    const text = "a".repeat(100);
    const result = truncateForSerp(text, 60);
    // "aaa...aaa..." — result length <= 60
    expect(result.length).toBeLessThanOrEqual(60);
  });

  it("handles Arabic text correctly", () => {
    const text = "أ".repeat(70);
    const result = truncateForSerp(text, 60);
    expect(result.endsWith("...")).toBe(true);
  });

  it("handles empty string", () => {
    expect(truncateForSerp("", 60)).toBe("");
  });
});

// ── buildRobotsContent ────────────────────────────────────────────────────

describe("buildRobotsContent", () => {
  it("returns 'index,follow' when both true", () => {
    expect(buildRobotsContent(true, true)).toBe("index,follow");
  });

  it("returns 'noindex,follow' when index=false, follow=true", () => {
    expect(buildRobotsContent(false, true)).toBe("noindex,follow");
  });

  it("returns 'index,nofollow' when index=true, follow=false", () => {
    expect(buildRobotsContent(true, false)).toBe("index,nofollow");
  });

  it("returns 'noindex,nofollow' when both false", () => {
    expect(buildRobotsContent(false, false)).toBe("noindex,nofollow");
  });
});
