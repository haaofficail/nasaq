/**
 * seo-utils — Pure SEO utility functions for Page Builder v2 (Day 18)
 *
 * All functions are pure (no side effects), making them fully testable.
 * Used by: SeoDrawer component + unit tests.
 */

// ── Arabic → Latin transliteration table ─────────────────────────────────

const ARABIC_MAP: Record<string, string> = {
  // Hamza variants
  "\u0621": "",    // ء
  "\u0622": "aa",  // آ
  "\u0623": "a",   // أ
  "\u0624": "w",   // ؤ
  "\u0625": "i",   // إ
  "\u0626": "y",   // ئ
  "\u0627": "a",   // ا
  "\u0628": "b",   // ب
  "\u0629": "h",   // ة
  "\u062A": "t",   // ت
  "\u062B": "th",  // ث
  "\u062C": "j",   // ج
  "\u062D": "h",   // ح
  "\u062E": "kh",  // خ
  "\u062F": "d",   // د
  "\u0630": "dh",  // ذ
  "\u0631": "r",   // ر
  "\u0632": "z",   // ز
  "\u0633": "s",   // س
  "\u0634": "sh",  // ش
  "\u0635": "s",   // ص
  "\u0636": "d",   // ض
  "\u0637": "t",   // ط
  "\u0638": "z",   // ظ
  "\u0639": "a",   // ع
  "\u063A": "gh",  // غ
  "\u0641": "f",   // ف
  "\u0642": "q",   // ق
  "\u0643": "k",   // ك
  "\u0644": "l",   // ل
  "\u0645": "m",   // م
  "\u0646": "n",   // ن
  "\u0647": "h",   // ه
  "\u0648": "w",   // و
  "\u0649": "a",   // ى
  "\u064A": "y",   // ي
};

// Tashkeel (diacritics) range U+064B–U+065F + tatweel U+0640
const TASHKEEL_REGEX = /[\u064B-\u065F\u0640]/g;

// Arabic character block U+0600–U+06FF
const ARABIC_BLOCK_REGEX = /[\u0600-\u06FF]/g;

/**
 * Converts Arabic text to a URL-safe Latin slug.
 *
 * Steps:
 *  1. Strip tashkeel (diacritics) and tatweel
 *  2. Transliterate each Arabic character to Latin
 *  3. Lowercase
 *  4. Replace non-alphanumeric (except hyphens) with hyphens
 *  5. Collapse multiple hyphens
 *  6. Trim leading/trailing hyphens
 */
export function arabicToSlug(text: string): string {
  if (!text) return "";

  // Step 1: Strip tashkeel + tatweel
  let s = text.replace(TASHKEEL_REGEX, "");

  // Step 2: Transliterate Arabic characters
  s = s.replace(ARABIC_BLOCK_REGEX, (char) => ARABIC_MAP[char] ?? "");

  // Step 3: Lowercase
  s = s.toLowerCase();

  // Step 4: Replace non-alphanumeric with hyphens (keep a-z, 0-9)
  s = s.replace(/[^a-z0-9]+/g, "-");

  // Step 5: Collapse consecutive hyphens
  s = s.replace(/-{2,}/g, "-");

  // Step 6: Trim
  s = s.replace(/^-+|-+$/g, "");

  return s;
}

// ── validateSlug ──────────────────────────────────────────────────────────

/**
 * Validates a slug string against URL-safe rules.
 * Returns an array of error messages (empty = valid).
 */
export function validateSlug(slug: string): string[] {
  const errors: string[] = [];

  if (!slug) {
    errors.push("الرابط مطلوب");
    return errors;
  }

  // Must be lowercase only
  if (slug !== slug.toLowerCase()) {
    errors.push("يجب أن يحتوي على أحرف صغيرة فقط");
  }

  // Only a-z, 0-9, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.push("يُسمح فقط بالأحرف الإنجليزية الصغيرة والأرقام والشرطة");
  }

  // No leading hyphen
  if (slug.startsWith("-")) {
    errors.push("لا يمكن أن يبدأ الرابط بشرطة");
  }

  // No trailing hyphen
  if (slug.endsWith("-")) {
    errors.push("لا يمكن أن ينتهي الرابط بشرطة");
  }

  // No consecutive hyphens
  if (slug.includes("--")) {
    errors.push("لا يُسمح بشرطتين متتاليتين");
  }

  return errors;
}

// ── SEO Warnings ──────────────────────────────────────────────────────────

export type SeoWarningType = "error" | "warning" | "info";

export interface SeoWarning {
  field: "title" | "description" | "ogImage" | "slug";
  type: SeoWarningType;
  message: string;
}

interface SeoFields {
  title?: string;
  description?: string;
  ogImage?: string;
}

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN  = 120;
const DESC_MAX  = 160;

/**
 * Returns an array of SEO warnings for the provided fields.
 * Empty array means everything is optimal.
 */
export function getSeoWarnings(fields: SeoFields): SeoWarning[] {
  const warnings: SeoWarning[] = [];
  const { title = "", description = "", ogImage = "" } = fields;

  // ── Title warnings ──────────────────────────────────────
  if (!title.trim()) {
    warnings.push({
      field: "title",
      type: "error",
      message: "عنوان الصفحة مطلوب للـ SEO",
    });
  } else if (title.length < TITLE_MIN) {
    warnings.push({
      field: "title",
      type: "warning",
      message: `العنوان قصير جداً (${title.length}/${TITLE_MIN} حرف كحد أدنى)`,
    });
  } else if (title.length > TITLE_MAX) {
    warnings.push({
      field: "title",
      type: "warning",
      message: `العنوان طويل جداً، سيتم اقتطاعه في نتائج البحث (${title.length}/${TITLE_MAX})`,
    });
  }

  // ── Description warnings ────────────────────────────────
  if (!description.trim()) {
    warnings.push({
      field: "description",
      type: "warning",
      message: "أضف وصفاً للصفحة — يظهر في نتائج البحث",
    });
  } else if (description.length < DESC_MIN) {
    warnings.push({
      field: "description",
      type: "info",
      message: `الوصف قصير جداً (${description.length}/${DESC_MIN} حرف كحد أدنى)`,
    });
  } else if (description.length > DESC_MAX) {
    warnings.push({
      field: "description",
      type: "warning",
      message: `الوصف طويل، سيتم اقتطاعه في نتائج البحث (${description.length}/${DESC_MAX})`,
    });
  }

  // ── OG Image warnings ───────────────────────────────────
  if (!ogImage.trim()) {
    warnings.push({
      field: "ogImage",
      type: "info",
      message: "أضف صورة للمشاركة على وسائل التواصل الاجتماعي",
    });
  }

  return warnings;
}

// ── truncateForSerp ───────────────────────────────────────────────────────

/**
 * Truncates text to `max` characters, appending "..." if truncated.
 * The ellipsis counts toward the limit.
 */
export function truncateForSerp(text: string, max: number): string {
  if (!text || text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

// ── buildRobotsContent ────────────────────────────────────────────────────

/**
 * Builds the robots meta content string from index/follow booleans.
 * Example: buildRobotsContent(true, false) → "index,nofollow"
 */
export function buildRobotsContent(index: boolean, follow: boolean): string {
  return `${index ? "index" : "noindex"},${follow ? "follow" : "nofollow"}`;
}
