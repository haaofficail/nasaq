/**
 * autosave-utils — Pure utility functions for Auto-save + Publish Flow
 *
 * All functions are pure (no side effects) — fully testable.
 * Used by: useAutoSave hook + EditorView (PagesV2Page)
 */

// ── Types ──────────────────────────────────────────────────────────────────

/** Visual status badge computed from page state — 4 states */
export type PageBadgeStatus = "draft" | "published" | "modified" | "archived";

/** Auto-save indicator state */
export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error" | "conflict";

interface PageBadgeInput {
  status: string;
  draftData: unknown;
  publishedData: unknown;
}

// ── computePageStatusBadge ─────────────────────────────────────────────────

/**
 * Derives the 4-state visual badge for a page:
 *   archived  → always "archived"
 *   draft     → "draft" (never been published — publishedData is null)
 *   published, data matches → "published"
 *   published, data differs → "modified" (unpublished draft changes)
 */
export function computePageStatusBadge(page: PageBadgeInput): PageBadgeStatus {
  if (page.status === "archived") return "archived";
  if (page.status !== "published") return "draft";
  // status = "published"
  if (isContentEqual(page.draftData, page.publishedData)) return "published";
  return "modified";
}

// ── isContentEqual ─────────────────────────────────────────────────────────

/**
 * Deep equality for Puck data objects.
 * Uses JSON serialization — sufficient for plain JSON (Puck format).
 */
export function isContentEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── getRetryDelay ──────────────────────────────────────────────────────────

/**
 * Exponential backoff delay for auto-save retries.
 * attempt 0 → 2000ms, 1 → 4000ms, 2 → 8000ms
 */
export function getRetryDelay(attempt: number): number {
  return 2000 * Math.pow(2, attempt);
}

// ── shouldAutoSave ─────────────────────────────────────────────────────────

/**
 * Returns true when an auto-save should fire.
 * Conditions:
 *   1. isDirty === true (changes exist)
 *   2. elapsed time since last change >= intervalMs (debounce)
 */
export function shouldAutoSave(
  isDirty: boolean,
  lastChangedAt: number,
  now: number,
  intervalMs: number,
): boolean {
  if (!isDirty) return false;
  return now - lastChangedAt >= intervalMs;
}

// ── formatSaveStatus ───────────────────────────────────────────────────────

/**
 * Returns the Arabic UI string for a given save status.
 * Empty string for "idle" (no indicator shown).
 */
export function formatSaveStatus(status: SaveStatus): string {
  switch (status) {
    case "idle":    return "";
    case "unsaved": return "تغييرات غير محفوظة";
    case "saving":  return "جاري الحفظ...";
    case "saved":   return "محفوظ";
    case "error":   return "فشل الحفظ — جاري إعادة المحاولة";
    case "conflict": return "تعديل متزامن — اختر النسخة";
    default:        return "";
  }
}
