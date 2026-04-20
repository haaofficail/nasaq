/**
 * pages-v2-utils — Pure utility functions for the Pages V2 management UI
 *
 * All functions are pure (no side effects), making them fully testable.
 * Used by: PagesV2Page.tsx (dashboard) + unit tests.
 */

export type PageStatus = "draft" | "published" | "archived";

export type SortOption =
  | "updated_desc"
  | "updated_asc"
  | "title_asc"
  | "sort_order";

export type PageAction =
  | "edit"
  | "rename"
  | "duplicate"
  | "delete"
  | "restore"
  | "permanent_delete";

// ── buildPagesListUrl ──────────────────────────────────────────────────────

interface ListUrlParams {
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Builds the relative URL for the pages list API endpoint with query params.
 */
export function buildPagesListUrl(params: ListUrlParams): string {
  const qs = new URLSearchParams();
  if (params.status !== undefined) qs.set("status", params.status);
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  const str = qs.toString();
  return str ? `/pages?${str}` : "/pages";
}

// ── filterPagesBySearch ───────────────────────────────────────────────────

interface MinimalPage {
  title: string;
  slug: string;
}

/**
 * Client-side text search: filters pages whose title OR slug contains the query.
 * Case-insensitive.
 */
export function filterPagesBySearch<T extends MinimalPage>(
  pages: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return pages;
  return pages.filter(
    (p) =>
      p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
  );
}

// ── paginatePages ─────────────────────────────────────────────────────────

/**
 * Returns a slice of the pages array for the given 1-based page and limit.
 */
export function paginatePages<T>(pages: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  return pages.slice(start, start + limit);
}

// ── getPageStatusActions ──────────────────────────────────────────────────

const STATUS_ACTIONS: Record<PageStatus, PageAction[]> = {
  draft:     ["edit", "rename", "duplicate", "delete"],
  published: ["edit", "rename", "duplicate", "delete"],
  archived:  ["restore", "permanent_delete"],
};

/**
 * Returns the list of available row actions for a given page status.
 */
export function getPageStatusActions(status: PageStatus): PageAction[] {
  return STATUS_ACTIONS[status] ?? [];
}

// ── makeDuplicateTitle ────────────────────────────────────────────────────

/**
 * Produces a duplicated page title by appending " (نسخة)".
 */
export function makeDuplicateTitle(title: string): string {
  return `${title} (نسخة)`;
}

// ── makeDuplicateSlug ─────────────────────────────────────────────────────

/**
 * Produces a unique slug for a duplicated page.
 * Tries "<slug>-copy", then "<slug>-copy-2", "<slug>-copy-3", etc.
 * @param slug      Original slug
 * @param existing  Array of slugs already in use
 */
export function makeDuplicateSlug(slug: string, existing: string[]): string {
  const base = `${slug}-copy`;
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// ── sortPages ─────────────────────────────────────────────────────────────

interface SortablePage {
  title: string;
  sortOrder: number;
  updatedAt: string;
}

/**
 * Returns a sorted copy of the pages array (does not mutate input).
 */
export function sortPages<T extends SortablePage>(
  pages: T[],
  sort: SortOption,
): T[] {
  const copy = [...pages];
  switch (sort) {
    case "updated_desc":
      return copy.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    case "updated_asc":
      return copy.sort(
        (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      );
    case "title_asc":
      return copy.sort((a, b) =>
        a.title.localeCompare(b.title, "ar", { sensitivity: "base" }),
      );
    case "sort_order":
      return copy.sort((a, b) => a.sortOrder - b.sortOrder);
    default:
      return copy;
  }
}
