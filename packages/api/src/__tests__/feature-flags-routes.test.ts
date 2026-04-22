/**
 * Day 21 — TDD: /admin/feature-flags routes
 *
 * Tests run against a Hono test app with mocked DB.
 * No real database required — all DB calls are vi.mock'd.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// ── DB mock ───────────────────────────────────────────────────

const __dbResults: unknown[][] = [];
function pushResult(r: unknown[]) { __dbResults.push(r); }
function resetResults() { __dbResults.length = 0; }

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
  organizations: {},
  users: {},
  capabilityRegistry: {},
  capabilityAuditLog: {},
  organizationCapabilityOverrides: {},
  platformAuditLog: {},
  // required by other admin imports
  sessions: {}, locations: {}, orgDocuments: {}, supportTickets: {},
  platformAnnouncements: {}, systemHealthLog: {}, platformPlans: {}, platformConfig: {},
  reminderCategories: {}, reminderTemplates: {}, orgReminders: {},
  otpCodes: {}, roles: {}, bookingPipelineStages: {},
  subscriptionAddons: {}, subscriptionOrders: {}, subscriptions: {},
  workOrders: {}, accessLogs: {}, mediaGalleries: {}, quotaUsage: {},
  adminWaTemplates: {}, adminWaMessages: {},
  invoices: {}, customers: {}, bookings: {}, payments: {},
  journalEntries: {}, expenses: {}, campaigns: {},
  planCapabilities: {},
}));

vi.mock("drizzle-orm", () => ({
  eq:      vi.fn(() => "eq"),
  and:     vi.fn(() => "and"),
  or:      vi.fn(() => "or"),
  desc:    vi.fn(() => "desc"),
  asc:     vi.fn(() => "asc"),
  count:   vi.fn(() => "count"),
  sql:     vi.fn((s: unknown) => s),
  ne:      vi.fn(() => "ne"),
  inArray: vi.fn(() => "inArray"),
  not:     vi.fn(() => "not"),
  isNull:  vi.fn(() => "isNull"),
  ilike:   vi.fn(() => "ilike"),
  gte:     vi.fn(() => "gte"),
  lte:     vi.fn(() => "lte"),
  gt:      vi.fn(() => "gt"),
}));

vi.mock("../lib/whatsappBaileys", () => ({
  initBaileys:     vi.fn(),
  getBaileysState: vi.fn(),
  logoutBaileys:   vi.fn(),
  hasSavedSession: vi.fn(() => false),
}));

vi.mock("../lib/entitlements-sync", () => ({
  syncOrgEntitlements:  vi.fn(),
  syncPlanEntitlements: vi.fn(),
}));

vi.mock("../lib/org-context", () => ({
  invalidateOrgContext: vi.fn(),
}));

vi.mock("../lib/diagnostics", () => ({ runDiagnostics: vi.fn() }));
vi.mock("../lib/logger",      () => ({ log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock("./alerts",           () => ({ createAlert: vi.fn() }));

// ── Import router AFTER mocks ─────────────────────────────────

const { adminRouter } = await import("../routes/admin");

const ADMIN_ID = "aaaaaaaa-0000-0000-0000-000000000001";

type AdminVars = { adminId: string; adminName: string; adminRole: string; requestId: string };

function makeApp() {
  const app = new Hono<{ Variables: AdminVars }>();
  app.use("*", async (c, next) => {
    const cv = c as any;
    cv.set("adminId", ADMIN_ID);
    cv.set("adminName", "Test Admin");
    cv.set("adminRole", "super_admin");
    cv.set("requestId", "req-test-001");
    await next();
  });
  app.route("/admin", adminRouter);
  return app;
}

// Inject session + user results FIRST so nasaqStaffMiddleware passes.
// Must be called before pushing any test-specific results.
function injectAuth() {
  pushResult([{ userId: ADMIN_ID }]);
  pushResult([{ id: ADMIN_ID, name: "Test Admin", isSuperAdmin: true, nasaqRole: null }]);
}

// req() always puts auth results at the start of the queue.
// Any test-specific results pushed AFTER calling req() won't be in the right order,
// so tests must push results AFTER calling injectAuth() but BEFORE calling req().
// Signature: call injectAuth() + pushResult() first, then req().
function req(method: string, path: string, body?: unknown) {
  const app = makeApp();
  return app.request(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-token-super-admin",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  resetResults();
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════
// GET /admin/feature-flags — list all capabilities
// ════════════════════════════════════════════════════════════

describe("GET /admin/feature-flags", () => {
  it("returns 200 with data array", async () => {
    injectAuth();
    pushResult([]); // features query
    pushResult([]); // overrideCounts query
    const res = await req("GET", "/admin/feature-flags");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("includes orgsWithAccessCount in each feature", async () => {
    const feature = {
      id: "cap-001",
      key: "page_builder_v2",
      labelAr: "صانع الصفحات",
      labelEn: "Page Builder",
      description: null,
      category: "core",
      killSwitch: false,
      defaultForNewOrgs: false,
      rolloutPercentage: 50,
      updatedAt: new Date().toISOString(),
    };
    injectAuth();
    pushResult([feature]); // features query
    pushResult([{ capabilityKey: "page_builder_v2", enabledCount: 3 }]); // overrideCounts
    const res = await req("GET", "/admin/feature-flags");
    const body = await res.json() as { data: any[] };
    expect(body.data[0].orgsWithAccessCount).toBe(3);
  });
});

// ════════════════════════════════════════════════════════════
// GET /admin/feature-flags/:key — single feature
// ════════════════════════════════════════════════════════════

describe("GET /admin/feature-flags/:key", () => {
  it("returns 404 when feature not found", async () => {
    injectAuth();
    pushResult([]); // no feature found
    const res = await req("GET", "/admin/feature-flags/nonexistent");
    expect(res.status).toBe(404);
  });

  it("returns 200 with feature data when found", async () => {
    const feature = {
      id: "cap-001",
      key: "page_builder_v2",
      labelAr: "صانع الصفحات",
      killSwitch: false,
      rolloutPercentage: 100,
    };
    injectAuth();
    pushResult([feature]); // feature query
    pushResult([{ total: 5 }]); // overrideCount
    const res = await req("GET", "/admin/feature-flags/page_builder_v2");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: any };
    expect(body.data.key).toBe("page_builder_v2");
    expect(body.data.orgsWithAccessCount).toBe(5);
  });
});

// ════════════════════════════════════════════════════════════
// PATCH /admin/feature-flags/:key — update settings
// ════════════════════════════════════════════════════════════

describe("PATCH /admin/feature-flags/:key", () => {
  it("returns 400 with empty body then 404 with no feature", async () => {
    injectAuth();
    pushResult([]); // no existing feature
    const res = await req("PATCH", "/admin/feature-flags/page_builder_v2", {});
    expect([400, 404]).toContain(res.status);
  });

  it("returns 400 when rolloutPercentage is out of range", async () => {
    injectAuth();
    const res = await req("PATCH", "/admin/feature-flags/page_builder_v2", {
      rolloutPercentage: 150,
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 when valid update is provided", async () => {
    const existing = { key: "page_builder_v2", killSwitch: false, rolloutPercentage: 0, defaultForNewOrgs: false };
    const updated = { ...existing, rolloutPercentage: 50, updatedAt: new Date().toISOString() };
    injectAuth();
    pushResult([existing]); // existing feature
    pushResult([updated]);  // updated result
    pushResult([]);         // audit log insert

    const res = await req("PATCH", "/admin/feature-flags/page_builder_v2", {
      rolloutPercentage: 50,
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: any };
    expect(body.data.rolloutPercentage).toBe(50);
  });
});

// ════════════════════════════════════════════════════════════
// GET /admin/feature-flags/:key/overrides
// ════════════════════════════════════════════════════════════

describe("GET /admin/feature-flags/:key/overrides", () => {
  it("returns 200 with empty array when no overrides", async () => {
    injectAuth();
    pushResult([]); // overrides query
    const res = await req("GET", "/admin/feature-flags/page_builder_v2/overrides");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it("passes enabled=true filter through query string", async () => {
    injectAuth();
    pushResult([]); // overrides query
    const res = await req("GET", "/admin/feature-flags/page_builder_v2/overrides?enabled=true");
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════
// POST /admin/feature-flags/:key/overrides
// ════════════════════════════════════════════════════════════

describe("POST /admin/feature-flags/:key/overrides", () => {
  const validBody = {
    orgId: "bbbbbbbb-0000-0000-0000-000000000002",
    enabled: true,
    reason: "تجربة مبكرة",
  };

  it("returns 400 when orgId is not a valid UUID", async () => {
    injectAuth();
    const res = await req("POST", "/admin/feature-flags/page_builder_v2/overrides", {
      ...validBody,
      orgId: "not-a-uuid",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when reason is missing", async () => {
    injectAuth();
    const res = await req("POST", "/admin/feature-flags/page_builder_v2/overrides", {
      orgId: validBody.orgId,
      enabled: true,
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when org does not exist", async () => {
    injectAuth();
    pushResult([]); // org not found
    const res = await req("POST", "/admin/feature-flags/page_builder_v2/overrides", validBody);
    expect(res.status).toBe(404);
  });
});

// ════════════════════════════════════════════════════════════
// DELETE /admin/feature-flags/:key/overrides/:orgId
// ════════════════════════════════════════════════════════════

describe("DELETE /admin/feature-flags/:key/overrides/:orgId", () => {
  it("returns 404 when override does not exist", async () => {
    injectAuth();
    pushResult([]); // no existing override
    const res = await req(
      "DELETE",
      "/admin/feature-flags/page_builder_v2/overrides/bbbbbbbb-0000-0000-0000-000000000002",
    );
    expect(res.status).toBe(404);
  });
});

// ════════════════════════════════════════════════════════════
// GET /admin/feature-flags/:key/audit
// ════════════════════════════════════════════════════════════

describe("GET /admin/feature-flags/:key/audit", () => {
  it("returns 200 with empty array initially", async () => {
    injectAuth();
    pushResult([]); // audit log
    const res = await req("GET", "/admin/feature-flags/page_builder_v2/audit");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("respects limit query param (max 200)", async () => {
    injectAuth();
    pushResult([]); // audit log
    const res = await req("GET", "/admin/feature-flags/page_builder_v2/audit?limit=10");
    expect(res.status).toBe(200);
  });
});
