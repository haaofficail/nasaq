/**
 * POST /payments/webhook — Route integration tests (Phase 3.C Step 2.3)
 *
 * يُثبت:
 * 1. disabled mode → يمر بدون تحقق من signature
 * 2. log mode + signature صالح → 200 + isValid: true في الـ log
 * 3. log mode + signature خاطئ → 200 + isValid: false في الـ log (لا يرفض)
 * 4. strict mode + signature صالح → 200
 * 5. strict mode + signature خاطئ → 401
 * 6. MOYASAR_WEBHOOK_SECRET غير مضبوط → 503
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { createHmac } from "crypto";

// ── mocks ─────────────────────────────────────────────────────

function makeChainable(result: unknown[] = []): unknown {
  const proxy: unknown = new Proxy(
    {
      then(onFulfilled: (v: unknown[]) => unknown) {
        return Promise.resolve(result).then(onFulfilled as never);
      },
    },
    {
      get(target, prop: string) {
        if (prop === "then") return (target as never)[prop];
        return (..._args: unknown[]) => makeChainable(result);
      },
    },
  );
  return proxy;
}

const mockDb = {
  select: vi.fn(() => makeChainable([])),
  insert: vi.fn(() => makeChainable([])),
  update: vi.fn(() => makeChainable([])),
  delete: vi.fn(() => makeChainable([])),
};

vi.mock("@nasaq/db/client", () => ({
  db: mockDb,
  pool: { connect: vi.fn(), end: vi.fn() },
}));

vi.mock("@nasaq/db/schema", () => ({
  paymentTransactions: {}, merchantSettlements: {}, paymentSettings: {},
  organizations: {}, invoices: {}, payments: {},
  bookings: {}, customers: {}, bookingRecords: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "eq"), and: vi.fn(() => "and"), desc: vi.fn(() => "desc"),
  gte: vi.fn(() => "gte"), lte: vi.fn(() => "lte"), sql: vi.fn((s: unknown) => s),
  count: vi.fn(() => "count"), sum: vi.fn(() => "sum"), inArray: vi.fn(() => "inArray"),
}));

vi.mock("../../lib/moyasar", () => ({
  buildMoyasarPaymentUrl: vi.fn(),
  fetchPayment:           vi.fn(),
  refundPayment:          vi.fn(),
  sarToHalala:            vi.fn(),
  halalaToSar:            vi.fn(),
}));

const mockLog = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
vi.mock("../../lib/logger", () => ({ log: mockLog }));

vi.mock("../../middleware/auth", () => ({
  requirePermission:    vi.fn(() => async (_c: unknown, next: () => Promise<void>) => next()),
  superAdminMiddleware: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => next()),
}));

vi.mock("../../lib/helpers", () => ({
  getOrgId:    vi.fn(() => "org-test"),
  getUserId:   vi.fn(() => "user-test"),
  getPagination: vi.fn(() => ({ limit: 20, offset: 0 })),
}));

vi.mock("../../lib/messaging-engine", () => ({
  fireBookingEvent: vi.fn(),
}));

// ── import router بعد الـ mocks ────────────────────────────────

const { paymentsRouter } = await import("../../routes/payments");
const moyasarLib         = await import("../../lib/moyasar");

// ── helpers ───────────────────────────────────────────────────

const SECRET = "test-webhook-secret-32characters!";

const VALID_PAYLOAD = JSON.stringify({ id: "pay_abc123", status: "paid", metadata: {} });

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function makeApp() {
  const app = new Hono();
  app.route("/payments", paymentsRouter);
  return app;
}

function postWebhook(body: string, headers: Record<string, string> = {}) {
  return makeApp().request("/payments/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(moyasarLib.fetchPayment).mockResolvedValue({ id: "pay_abc123", status: "paid" } as never);
});

afterEach(() => {
  process.env.MOYASAR_WEBHOOK_SECRET       = originalEnv.MOYASAR_WEBHOOK_SECRET;
  process.env.MOYASAR_WEBHOOK_VERIFICATION = originalEnv.MOYASAR_WEBHOOK_VERIFICATION;
});

// ════════════════════════════════════════════════════════════════
// Scenario 1 — secret غير مضبوط → 503
// ════════════════════════════════════════════════════════════════

describe("POST /payments/webhook — secret missing", () => {
  it("يرجع 503 إذا MOYASAR_WEBHOOK_SECRET غير مضبوط", async () => {
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    process.env.MOYASAR_WEBHOOK_VERIFICATION = "log";

    const res = await postWebhook(VALID_PAYLOAD);
    expect(res.status).toBe(503);
  });
});

// ════════════════════════════════════════════════════════════════
// Scenario 2 — disabled mode → يمر بدون تحقق
// ════════════════════════════════════════════════════════════════

describe("POST /payments/webhook — disabled mode", () => {
  it("يقبل webhook بدون signature في disabled mode", async () => {
    process.env.MOYASAR_WEBHOOK_SECRET       = SECRET;
    process.env.MOYASAR_WEBHOOK_VERIFICATION = "disabled";

    const res = await postWebhook(VALID_PAYLOAD);
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// Scenario 3 — log mode + signature صالح → 200 + isValid: true
// ════════════════════════════════════════════════════════════════

describe("POST /payments/webhook — log mode, valid signature", () => {
  it("يقبل ويسجل isValid: true", async () => {
    process.env.MOYASAR_WEBHOOK_SECRET       = SECRET;
    process.env.MOYASAR_WEBHOOK_VERIFICATION = "log";

    const sig = sign(VALID_PAYLOAD, SECRET);
    const res = await postWebhook(VALID_PAYLOAD, { "x-moyasar-signature": sig });

    expect(res.status).toBe(200);
    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ isValid: true, mode: "log" }),
      "moyasar_webhook_received",
    );
  });
});

// ════════════════════════════════════════════════════════════════
// Scenario 4 — log mode + signature خاطئ → 200 + isValid: false
// ════════════════════════════════════════════════════════════════

describe("POST /payments/webhook — log mode, invalid signature", () => {
  it("يقبل ويسجل isValid: false (لا يرفض في log mode)", async () => {
    process.env.MOYASAR_WEBHOOK_SECRET       = SECRET;
    process.env.MOYASAR_WEBHOOK_VERIFICATION = "log";

    const res = await postWebhook(VALID_PAYLOAD, { "x-moyasar-signature": "wrongsignature" });

    expect(res.status).toBe(200);
    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ isValid: false, mode: "log" }),
      "moyasar_webhook_received",
    );
  });
});

// ════════════════════════════════════════════════════════════════
// Scenario 5 — strict mode + signature صالح → 200
// ════════════════════════════════════════════════════════════════

describe("POST /payments/webhook — strict mode, valid signature", () => {
  it("يقبل webhook بـ signature صالح في strict mode", async () => {
    process.env.MOYASAR_WEBHOOK_SECRET       = SECRET;
    process.env.MOYASAR_WEBHOOK_VERIFICATION = "strict";

    const sig = sign(VALID_PAYLOAD, SECRET);
    const res = await postWebhook(VALID_PAYLOAD, { "x-moyasar-signature": sig });

    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// Scenario 6 — strict mode + signature خاطئ → 401
// ════════════════════════════════════════════════════════════════

describe("POST /payments/webhook — strict mode, invalid signature", () => {
  it("يرفض webhook بـ signature خاطئ في strict mode", async () => {
    process.env.MOYASAR_WEBHOOK_SECRET       = SECRET;
    process.env.MOYASAR_WEBHOOK_VERIFICATION = "strict";

    const res = await postWebhook(VALID_PAYLOAD, { "x-moyasar-signature": "invalidsignature" });

    expect(res.status).toBe(401);
  });
});
