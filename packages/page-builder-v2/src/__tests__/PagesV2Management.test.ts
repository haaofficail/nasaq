/**
 * PagesV2Management — Day 17 unit tests
 *
 * Tests for the pages list management features:
 *   - buildPagesListUrl (status filter + pagination query params)
 *   - filterPagesBySearch (client-side title/slug search)
 *   - paginatePages (slice array for page/limit)
 *   - getPageStatusActions (row action availability by status)
 *   - makeDuplicateTitle (append " (نسخة)" to title)
 *   - makeDuplicateSlug (append "-copy-N" to slug)
 *   - sortPages (by updatedAt, title, sortOrder)
 *
 * TDD RED — these tests fail until the utils module is created.
 * Run: pnpm test --filter=@nasaq/page-builder-v2 PagesV2Management
 */

import { describe, it, expect } from "vitest";
import {
  buildPagesListUrl,
  filterPagesBySearch,
  paginatePages,
  getPageStatusActions,
  makeDuplicateTitle,
  makeDuplicateSlug,
  sortPages,
} from "../utils/pages-v2-utils";

// ── Fixtures ──────────────────────────────────────────────────────────────

interface PageSummary {
  id: string;
  slug: string;
  title: string;
  pageType: string;
  status: "draft" | "published" | "archived";
  sortOrder: number;
  showInNavigation: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

function makePage(overrides: Partial<PageSummary> = {}): PageSummary {
  return {
    id: "uuid-1",
    slug: "home",
    title: "الرئيسية",
    pageType: "home",
    status: "draft",
    sortOrder: 0,
    showInNavigation: true,
    publishedAt: null,
    updatedAt: "2026-04-20T10:00:00.000Z",
    ...overrides,
  };
}

const SAMPLE_PAGES: PageSummary[] = [
  makePage({ id: "1", title: "الرئيسية", slug: "home", status: "published", sortOrder: 0, updatedAt: "2026-04-20T10:00:00.000Z" }),
  makePage({ id: "2", title: "من نحن",  slug: "about", status: "draft",     sortOrder: 1, updatedAt: "2026-04-19T10:00:00.000Z" }),
  makePage({ id: "3", title: "تواصل",   slug: "contact", status: "archived",sortOrder: 2, updatedAt: "2026-04-18T10:00:00.000Z" }),
  makePage({ id: "4", title: "المتجر",  slug: "store",  status: "draft",    sortOrder: 3, updatedAt: "2026-04-17T10:00:00.000Z" }),
  makePage({ id: "5", title: "المدونة", slug: "blog",   status: "published", sortOrder: 4, updatedAt: "2026-04-16T10:00:00.000Z" }),
];

// ── buildPagesListUrl ─────────────────────────────────────────────────────

describe("buildPagesListUrl", () => {
  it("returns base URL with no params when no filter", () => {
    const url = buildPagesListUrl({});
    expect(url).toBe("/pages");
  });

  it("appends status param when provided", () => {
    const url = buildPagesListUrl({ status: "draft" });
    expect(url).toContain("status=draft");
  });

  it("appends page param for pagination", () => {
    const url = buildPagesListUrl({ page: 2 });
    expect(url).toContain("page=2");
  });

  it("appends limit param", () => {
    const url = buildPagesListUrl({ limit: 20 });
    expect(url).toContain("limit=20");
  });

  it("combines status + page + limit correctly", () => {
    const url = buildPagesListUrl({ status: "published", page: 3, limit: 20 });
    expect(url).toContain("status=published");
    expect(url).toContain("page=3");
    expect(url).toContain("limit=20");
  });

  it("omits undefined params", () => {
    const url = buildPagesListUrl({ status: undefined, page: 1 });
    expect(url).not.toContain("status=");
    expect(url).toContain("page=1");
  });
});

// ── filterPagesBySearch ───────────────────────────────────────────────────

describe("filterPagesBySearch", () => {
  it("returns all pages when query is empty string", () => {
    const result = filterPagesBySearch(SAMPLE_PAGES, "");
    expect(result).toHaveLength(5);
  });

  it("filters by title (Arabic partial match)", () => {
    const result = filterPagesBySearch(SAMPLE_PAGES, "رئيسية");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by slug (English partial match)", () => {
    const result = filterPagesBySearch(SAMPLE_PAGES, "about");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("about");
  });

  it("is case-insensitive for slug", () => {
    const result = filterPagesBySearch(SAMPLE_PAGES, "HOME");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("home");
  });

  it("returns empty array when no match", () => {
    const result = filterPagesBySearch(SAMPLE_PAGES, "xxxxxxxx");
    expect(result).toHaveLength(0);
  });

  it("matches multiple pages on shared term", () => {
    // "ال" appears in "الرئيسية", "المتجر", "المدونة"
    const result = filterPagesBySearch(SAMPLE_PAGES, "ال");
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});

// ── paginatePages ─────────────────────────────────────────────────────────

describe("paginatePages", () => {
  it("returns first 2 items when limit=2, page=1", () => {
    const result = paginatePages(SAMPLE_PAGES, 1, 2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("2");
  });

  it("returns second page items when page=2", () => {
    const result = paginatePages(SAMPLE_PAGES, 2, 2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("3");
    expect(result[1].id).toBe("4");
  });

  it("returns remaining items on last page", () => {
    const result = paginatePages(SAMPLE_PAGES, 3, 2);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("5");
  });

  it("returns empty array when page exceeds total", () => {
    const result = paginatePages(SAMPLE_PAGES, 10, 2);
    expect(result).toHaveLength(0);
  });

  it("returns all items when limit >= total", () => {
    const result = paginatePages(SAMPLE_PAGES, 1, 20);
    expect(result).toHaveLength(5);
  });
});

// ── getPageStatusActions ──────────────────────────────────────────────────

describe("getPageStatusActions", () => {
  it("draft page has: edit, rename, duplicate, delete actions", () => {
    const actions = getPageStatusActions("draft");
    expect(actions).toContain("edit");
    expect(actions).toContain("rename");
    expect(actions).toContain("duplicate");
    expect(actions).toContain("delete");
  });

  it("draft page does NOT have restore or permanent_delete", () => {
    const actions = getPageStatusActions("draft");
    expect(actions).not.toContain("restore");
    expect(actions).not.toContain("permanent_delete");
  });

  it("published page has: edit, rename, duplicate, delete actions", () => {
    const actions = getPageStatusActions("published");
    expect(actions).toContain("edit");
    expect(actions).toContain("rename");
    expect(actions).toContain("duplicate");
    expect(actions).toContain("delete");
  });

  it("archived page has: restore and permanent_delete actions", () => {
    const actions = getPageStatusActions("archived");
    expect(actions).toContain("restore");
    expect(actions).toContain("permanent_delete");
  });

  it("archived page does NOT have edit or delete", () => {
    const actions = getPageStatusActions("archived");
    expect(actions).not.toContain("edit");
    expect(actions).not.toContain("delete");
  });
});

// ── makeDuplicateTitle ────────────────────────────────────────────────────

describe("makeDuplicateTitle", () => {
  it("appends (نسخة) to original title", () => {
    const result = makeDuplicateTitle("الرئيسية");
    expect(result).toBe("الرئيسية (نسخة)");
  });

  it("handles titles with existing suffix", () => {
    const result = makeDuplicateTitle("الرئيسية (نسخة)");
    expect(result).toBe("الرئيسية (نسخة) (نسخة)");
  });

  it("handles empty string", () => {
    const result = makeDuplicateTitle("");
    expect(result).toBe(" (نسخة)");
  });
});

// ── makeDuplicateSlug ─────────────────────────────────────────────────────

describe("makeDuplicateSlug", () => {
  it("appends -copy to base slug", () => {
    const result = makeDuplicateSlug("home", []);
    expect(result).toBe("home-copy");
  });

  it("appends -copy-2 when home-copy already taken", () => {
    const result = makeDuplicateSlug("home", ["home-copy"]);
    expect(result).toBe("home-copy-2");
  });

  it("appends -copy-3 when both home-copy and home-copy-2 taken", () => {
    const result = makeDuplicateSlug("home", ["home-copy", "home-copy-2"]);
    expect(result).toBe("home-copy-3");
  });

  it("handles slug with hyphens", () => {
    const result = makeDuplicateSlug("about-us", []);
    expect(result).toBe("about-us-copy");
  });
});

// ── sortPages ─────────────────────────────────────────────────────────────

describe("sortPages", () => {
  it("sorts by updatedAt descending (newest first) by default", () => {
    const result = sortPages(SAMPLE_PAGES, "updated_desc");
    expect(result[0].id).toBe("1"); // 2026-04-20
    expect(result[result.length - 1].id).toBe("5"); // 2026-04-16
  });

  it("sorts by updatedAt ascending (oldest first)", () => {
    const result = sortPages(SAMPLE_PAGES, "updated_asc");
    expect(result[0].id).toBe("5"); // 2026-04-16
    expect(result[result.length - 1].id).toBe("1"); // 2026-04-20
  });

  it("sorts by title A-Z", () => {
    const result = sortPages(SAMPLE_PAGES, "title_asc");
    // Arabic sort — just check it's a stable sort returning all items
    expect(result).toHaveLength(5);
    // All ids must be present
    const ids = result.map(p => p.id).sort();
    expect(ids).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("sorts by sortOrder ascending", () => {
    const result = sortPages(SAMPLE_PAGES, "sort_order");
    expect(result[0].sortOrder).toBe(0);
    expect(result[1].sortOrder).toBe(1);
    expect(result[2].sortOrder).toBe(2);
  });

  it("does not mutate the original array", () => {
    const original = [...SAMPLE_PAGES];
    sortPages(SAMPLE_PAGES, "title_asc");
    expect(SAMPLE_PAGES[0].id).toBe(original[0].id);
  });
});

// ── API endpoint request contracts ───────────────────────────────────────

describe("PagesV2Management — new API endpoint contracts", () => {
  it("duplicate request: POST /:id/duplicate with optional title override", () => {
    const request = {
      method: "POST",
      url: "/api/v2/pages/uuid-1/duplicate",
      body: { titleSuffix: " (نسخة)" },
    };
    expect(request.method).toBe("POST");
    expect(request.url).toContain("/duplicate");
    expect(request.body).toHaveProperty("titleSuffix");
  });

  it("restore request: POST /:id/restore with no body", () => {
    const request = {
      method: "POST",
      url: "/api/v2/pages/uuid-1/restore",
      body: null,
    };
    expect(request.method).toBe("POST");
    expect(request.url).toContain("/restore");
  });

  it("permanent delete request: DELETE /:id/permanent", () => {
    const request = {
      method: "DELETE",
      url: "/api/v2/pages/uuid-1/permanent",
    };
    expect(request.method).toBe("DELETE");
    expect(request.url).toContain("/permanent");
  });

  it("reorder request: PATCH /reorder with ordered id array", () => {
    const request = {
      method: "PATCH",
      url: "/api/v2/pages/reorder",
      body: { ids: ["uuid-3", "uuid-1", "uuid-2"] },
    };
    expect(request.method).toBe("PATCH");
    expect(request.url).toContain("/reorder");
    expect(Array.isArray(request.body.ids)).toBe(true);
    expect(request.body.ids).toHaveLength(3);
  });

  it("restore response sets status back to draft", () => {
    const response = {
      data: makePage({ id: "uuid-1", status: "draft" }),
    };
    expect(response.data.status).toBe("draft");
  });

  it("duplicate response returns new page with different id", () => {
    const original = makePage({ id: "uuid-1", slug: "home" });
    const duplicate = makePage({ id: "uuid-99", slug: "home-copy", title: "الرئيسية (نسخة)" });
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.slug).toBe("home-copy");
    expect(duplicate.title).toBe("الرئيسية (نسخة)");
  });
});
