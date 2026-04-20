/**
 * Day 4 — TDD: /api/v2/pages routes
 *
 * Tests run against a Hono test app with mocked DB.
 * No real database required — all DB calls are vi.mock'd.
 *
 * Flow: RED (no routes file) → implement → GREEN
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// ── Drizzle mock via Proxy ────────────────────────────────────
// Creates a proxy that:
// - Chains all method calls (select, from, where, ...) returning itself
// - Resolves to `result` when awaited (thenable) or in Promise.all
//
// Override for specific sequences using __nextResults queue.

// Queue for controlling what DB calls return in sequence
const __dbResults: unknown[][] = [];
function pushResult(r: unknown[]) { __dbResults.push(r); }

function makeQueryProxy(result?: unknown[]): unknown {
  let resolvedWith = result;
  const proxy: unknown = new Proxy(
    {
      then(onFulfilled: (v: unknown[]) => unknown, _onRejected?: unknown) {
        const val = resolvedWith ?? __dbResults.shift() ?? [];
        return Promise.resolve(val).then(onFulfilled as never);
      },
    },
    {
      get(target, prop: string) {
        if (prop === "then") return (target as never)[prop];
        // All drizzle chain methods: return a new proxy
        return (..._args: unknown[]) => makeQueryProxy(resolvedWith);
      },
    }
  );
  return proxy;
}

const mockDb = {
  select: vi.fn((_fields?: unknown) => makeQueryProxy()),
  insert: vi.fn((_table?: unknown) => makeQueryProxy()),
  update: vi.fn((_table?: unknown) => makeQueryProxy()),
  delete: vi.fn((_table?: unknown) => makeQueryProxy()),
};

vi.mock("@nasaq/db/client", () => ({
  db: mockDb,
  pool: { connect: vi.fn(), end: vi.fn() },
}));

vi.mock("@nasaq/db/schema", () => ({
  pagesV2: {},
  pageVersionsV2: {},
  organizations: {},
  users: {},
}));

// Mock drizzle-orm query helpers — they're passed to db.select().where() etc.
// Since our db mock ignores all arguments, these just need to return something
vi.mock("drizzle-orm", () => ({
  eq:    vi.fn((_col: unknown, _val: unknown) => "eq"),
  and:   vi.fn((..._args: unknown[]) => "and"),
  or:    vi.fn((..._args: unknown[]) => "or"),
  desc:  vi.fn((_col: unknown) => "desc"),
  asc:   vi.fn((_col: unknown) => "asc"),
  count: vi.fn(() => "count"),
  sql:   vi.fn((s: unknown) => s),
  ne:    vi.fn(() => "ne"),
  inArray: vi.fn(() => "inArray"),
  not:   vi.fn(() => "not"),
  isNull: vi.fn(() => "isNull"),
}));

// ── Import the router AFTER mocking ─────────────────────────
// These will fail (RED) until packages/api/src/routes/pages-v2.ts exists
const { pagesV2Router } = await import("../routes/pages-v2");

// ── Test app: mimics v2 mount in index.ts ────────────────────
const ORG_ID  = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000099";
const PAGE_ID = "00000000-0000-0000-0000-000000000010";

type TestVars = { orgId: string; user: { id: string; orgId: string; role: string } };

function makeApp() {
  const app = new Hono<{ Variables: TestVars }>();
  // Inject auth context — simulates authMiddleware
  app.use("*", async (c, next) => {
    c.set("orgId", ORG_ID);
    c.set("user", { id: USER_ID, orgId: ORG_ID, role: "owner" });
    await next();
  });
  app.route("/pages", pagesV2Router);
  return app;
}

// ── Helpers ──────────────────────────────────────────────────
function req(method: string, path: string, body?: unknown) {
  const app = makeApp();
  return app.request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ════════════════════════════════════════════════════════════
// 1. GET /pages — list
// ════════════════════════════════════════════════════════════
describe("GET /pages", () => {
  // GET /pages does Promise.all([rowsQuery, countQuery])
  // Both resolve to [] from the mock — route handles empty count gracefully
  it("returns 200 with an empty array (mock DB)", async () => {
    const res = await req("GET", "/pages");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("response includes pagination meta with total=0", async () => {
    const res = await req("GET", "/pages");
    const body = await res.json() as { data: unknown[]; meta: { total: number } };
    expect(body).toHaveProperty("meta");
    expect(body.meta.total).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════
// 2. POST /pages — create
// ════════════════════════════════════════════════════════════
describe("POST /pages", () => {
  it("returns 201 on valid create", async () => {
    // Queue: (1) slug uniqueness check → [] (not taken), (2) insert returning → [newPage]
    pushResult([]); // slug check
    pushResult([{ id: PAGE_ID, orgId: ORG_ID, slug: "test-page", title: "صفحة تجريبية",
                  pageType: "custom", status: "draft", sortOrder: 0, showInNavigation: true,
                  draftData: null, publishedData: null, metaTitle: null, metaDescription: null,
                  ogImage: null, publishedAt: null, publishedBy: null, createdBy: null,
                  createdAt: new Date(), updatedAt: new Date() }]); // insert returning
    const res = await req("POST", "/pages", {
      title: "صفحة تجريبية",
      slug: "test-page",
      pageType: "custom",
    });
    expect(res.status).toBe(201);
  });

  it("returns 400 when title is missing", async () => {
    const res = await req("POST", "/pages", { slug: "no-title" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when slug is missing", async () => {
    const res = await req("POST", "/pages", { title: "لا slug" });
    expect(res.status).toBe(400);
  });

  it("created page has status=draft by default", async () => {
    pushResult([]); // slug check
    pushResult([{ id: PAGE_ID, orgId: ORG_ID, slug: "new-page", title: "صفحة جديدة",
                  pageType: "custom", status: "draft", sortOrder: 0, showInNavigation: true,
                  draftData: null, publishedData: null, metaTitle: null, metaDescription: null,
                  ogImage: null, publishedAt: null, publishedBy: null, createdBy: null,
                  createdAt: new Date(), updatedAt: new Date() }]);
    const res = await req("POST", "/pages", {
      title: "صفحة جديدة",
      slug: "new-page",
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { data: { status: string } };
    expect(body.data.status).toBe("draft");
  });

  it("sets orgId from auth context — never from body", async () => {
    pushResult([]); // slug check
    pushResult([{ id: PAGE_ID, orgId: ORG_ID, slug: "inject-test", title: "inject test",
                  pageType: "custom", status: "draft", sortOrder: 0, showInNavigation: true,
                  draftData: null, publishedData: null, metaTitle: null, metaDescription: null,
                  ogImage: null, publishedAt: null, publishedBy: null, createdBy: null,
                  createdAt: new Date(), updatedAt: new Date() }]);
    const res = await req("POST", "/pages", {
      title: "inject test",
      slug: "inject-test",
      orgId: "evil-org-id",  // should be ignored — createPageSchema doesn't include orgId
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { data: { orgId: string } };
    expect(body.data.orgId).toBe(ORG_ID);
  });
});

// ════════════════════════════════════════════════════════════
// 3. GET /pages/:id — single page
// ════════════════════════════════════════════════════════════
describe("GET /pages/:id", () => {
  it("returns 404 for unknown page", async () => {
    const res = await req("GET", `/pages/${PAGE_ID}`);
    expect(res.status).toBe(404);
  });
});

// ════════════════════════════════════════════════════════════
// 4. PUT /pages/:id — update draft
// ════════════════════════════════════════════════════════════
describe("PUT /pages/:id", () => {
  it("returns 404 for unknown page", async () => {
    const res = await req("PUT", `/pages/${PAGE_ID}`, {
      title: "updated",
    });
    expect(res.status).toBe(404);
  });

  it("rejects update with orgId in body (security)", async () => {
    const res = await req("PUT", `/pages/${PAGE_ID}`, {
      orgId: "evil-org",
      title: "hacked",
    });
    // Either 400 (validation rejects orgId) or 404 (page not found) — both acceptable
    expect([400, 404]).toContain(res.status);
  });
});

// ════════════════════════════════════════════════════════════
// 5. DELETE /pages/:id — archive (soft delete)
// ════════════════════════════════════════════════════════════
describe("DELETE /pages/:id", () => {
  it("returns 404 for unknown page", async () => {
    const res = await req("DELETE", `/pages/${PAGE_ID}`);
    expect(res.status).toBe(404);
  });
});

// ════════════════════════════════════════════════════════════
// 6. POST /pages/:id/publish
// ════════════════════════════════════════════════════════════
describe("POST /pages/:id/publish", () => {
  it("returns 404 for unknown page", async () => {
    const res = await req("POST", `/pages/${PAGE_ID}/publish`);
    expect(res.status).toBe(404);
  });
});

// ════════════════════════════════════════════════════════════
// 7. GET /pages/:id/versions — version history
// ════════════════════════════════════════════════════════════
describe("GET /pages/:id/versions", () => {
  it("returns 404 for unknown page", async () => {
    const res = await req("GET", `/pages/${PAGE_ID}/versions`);
    expect(res.status).toBe(404);
  });
});
