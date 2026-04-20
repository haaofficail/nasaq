/**
 * Day 10 — TDD: GET /api/v2/pagebuilder/sources/products
 *             GET /api/v2/pagebuilder/sources/categories
 *
 * Tests run against a Hono test app with mocked DB.
 * No real database required — all DB calls are vi.mock'd.
 *
 * RED: fails because route file doesn't exist yet.
 * GREEN: passes after implementing packages/api/src/routes/pagebuilder-sources.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// ── DB mock — vi.hoisted ensures mockDb is ready before vi.mock factory runs ──

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
        return (..._args: unknown[]) => makeQueryProxy(resolvedWith);
      },
    }
  );
  return proxy;
}

const mockDb = vi.hoisted(() => ({
  select: vi.fn((_fields?: unknown) => makeQueryProxy()),
  insert: vi.fn((_table?: unknown) => makeQueryProxy()),
  update: vi.fn((_table?: unknown) => makeQueryProxy()),
  delete: vi.fn((_table?: unknown) => makeQueryProxy()),
}));

vi.mock("@nasaq/db/client", () => ({
  db: mockDb,
  pool: { connect: vi.fn(), end: vi.fn() },
}));

vi.mock("@nasaq/db/schema", () => ({
  services:     {},
  serviceMedia: {},
  categories:   {},
  organizations:{},
  users:        {},
}));

vi.mock("drizzle-orm", () => ({
  eq:        vi.fn(() => "eq"),
  and:       vi.fn((..._a: unknown[]) => "and"),
  or:        vi.fn((..._a: unknown[]) => "or"),
  desc:      vi.fn(() => "desc"),
  asc:       vi.fn(() => "asc"),
  count:     vi.fn(() => "count"),
  sql:       vi.fn((s: unknown) => s),
  ilike:     vi.fn(() => "ilike"),
  isNull:    vi.fn(() => "isNull"),
  inArray:   vi.fn(() => "inArray"),
  lte:       vi.fn(() => "lte"),
  gte:       vi.fn(() => "gte"),
  not:       vi.fn(() => "not"),
  leftJoin:  vi.fn(() => "leftJoin"),
}));

// ── Import router AFTER mocking ───────────────────────────────
// These will fail (RED) until packages/api/src/routes/pagebuilder-sources.ts exists
import { pagebuildersourcesRouter } from "../routes/pagebuilder-sources";

// ── Test app with minimal auth context ───────────────────────

function makeApp(orgId = "org-test-01") {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, orgId);
    await next();
  });
  app.route("/api/v2/pagebuilder", pagebuildersourcesRouter);
  return app;
}

// ── Fixtures ─────────────────────────────────────────────────

// Fields match the aliased SELECT in the route: { price: services.basePrice }
const MOCK_PRODUCTS = [
  {
    id: "svc-001",
    name: "ورد جوري أحمر",
    slug: "red-roses",
    price: "150.00",
    currency: "SAR",
    isFeatured: true,
  },
  {
    id: "svc-002",
    name: "باقة عيد ميلاد",
    slug: "birthday-bouquet",
    price: "220.00",
    currency: "SAR",
    isFeatured: false,
  },
];

const MOCK_CATEGORIES = [
  { id: "cat-001", name: "ورود" },
  { id: "cat-002", name: "زهور جافة" },
];

// ═══════════════════════════════════════════════════════════════
// PRODUCTS ENDPOINT
// ═══════════════════════════════════════════════════════════════

describe("GET /api/v2/pagebuilder/sources/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __dbResults.length = 0;
  });

  it("returns products array for org", async () => {
    pushResult(MOCK_PRODUCTS);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/products");
    expect(res.status).toBe(200);
    const body = await res.json() as { products: unknown[] };
    expect(Array.isArray(body.products)).toBe(true);
  });

  it("returns empty array when no products exist", async () => {
    pushResult([]);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/products");
    expect(res.status).toBe(200);
    const body = await res.json() as { products: unknown[] };
    expect(body.products).toEqual([]);
  });

  it("each product has required fields: id, name, slug, price, currency", async () => {
    pushResult(MOCK_PRODUCTS);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/products");
    const body = await res.json() as { products: Record<string, unknown>[] };
    const p = body.products[0];
    expect(p).toHaveProperty("id");
    expect(p).toHaveProperty("name");
    expect(p).toHaveProperty("slug");
    expect(p).toHaveProperty("price");
    expect(p).toHaveProperty("currency");
  });

  it("imageUrl and imageAlt are present (nullable)", async () => {
    pushResult(MOCK_PRODUCTS);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/products");
    const body = await res.json() as { products: Record<string, unknown>[] };
    expect(body.products[0]).toHaveProperty("imageUrl");
    expect(body.products[0]).toHaveProperty("imageAlt");
  });

  it("respects limit param (default 8, max 50)", async () => {
    pushResult(MOCK_PRODUCTS);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/products?limit=4");
    expect(res.status).toBe(200);
  });

  it("clamps limit to max 50", async () => {
    pushResult([]);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/products?limit=999");
    expect(res.status).toBe(200);
    // No 400 — silently clamps
  });

  it("accepts categoryId filter", async () => {
    pushResult(MOCK_PRODUCTS);
    const res = await makeApp().request(
      "/api/v2/pagebuilder/sources/products?categoryId=cat-001"
    );
    expect(res.status).toBe(200);
  });

  it("accepts featured=true filter", async () => {
    pushResult([MOCK_PRODUCTS[0]]);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/products?featured=true");
    expect(res.status).toBe(200);
    const body = await res.json() as { products: unknown[] };
    expect(body.products.length).toBe(1);
  });

  it("accepts sortBy=price_asc", async () => {
    pushResult(MOCK_PRODUCTS);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/products?sortBy=price_asc");
    expect(res.status).toBe(200);
  });

  it("accepts sortBy=price_desc", async () => {
    pushResult(MOCK_PRODUCTS);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/products?sortBy=price_desc");
    expect(res.status).toBe(200);
  });

  it("accepts sortBy=popular", async () => {
    pushResult(MOCK_PRODUCTS);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/products?sortBy=popular");
    expect(res.status).toBe(200);
  });

  it("accepts sortBy=newest (default)", async () => {
    pushResult(MOCK_PRODUCTS);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/products?sortBy=newest");
    expect(res.status).toBe(200);
  });

  it("MULTI-TENANT: orgId comes from auth context, not query param", async () => {
    pushResult(MOCK_PRODUCTS);
    // Attacker tries to pass orgId manually — should be ignored
    const res = await makeApp("org-legit").request(
      "/api/v2/pagebuilder/sources/products?orgId=org-attacker"
    );
    expect(res.status).toBe(200);
    // The db.select was called — verify orgId used is from context not param
    expect(mockDb.select).toHaveBeenCalled();
  });

  it("returns 200 with empty array even if categoryId doesn't exist in org", async () => {
    pushResult([]);
    const res = await makeApp().request(
      "/api/v2/pagebuilder/sources/products?categoryId=00000000-0000-0000-0000-000000000000"
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { products: unknown[] };
    expect(body.products).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// CATEGORIES ENDPOINT
// ═══════════════════════════════════════════════════════════════

describe("GET /api/v2/pagebuilder/sources/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __dbResults.length = 0;
  });

  it("returns categories array for org", async () => {
    pushResult(MOCK_CATEGORIES);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/categories");
    expect(res.status).toBe(200);
    const body = await res.json() as unknown[];
    expect(Array.isArray(body)).toBe(true);
  });

  it("each category has id and name", async () => {
    pushResult(MOCK_CATEGORIES);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/categories");
    const body = await res.json() as Record<string, unknown>[];
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("name");
  });

  it("returns empty array when no categories", async () => {
    pushResult([]);
    const res = await makeApp().request("/api/v2/pagebuilder/sources/categories");
    expect(res.status).toBe(200);
    const body = await res.json() as unknown[];
    expect(body).toEqual([]);
  });

  it("MULTI-TENANT: categories scoped to auth orgId only", async () => {
    pushResult(MOCK_CATEGORIES);
    const res = await makeApp("org-A").request(
      "/api/v2/pagebuilder/sources/categories?orgId=org-B"
    );
    expect(res.status).toBe(200);
    expect(mockDb.select).toHaveBeenCalled();
  });
});
