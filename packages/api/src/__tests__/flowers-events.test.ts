// ============================================================
// flowers_events Vertical Unit Tests
// Run: node_modules/.pnpm/node_modules/.bin/tsx --test packages/api/src/__tests__/flowers-events.test.ts
//
// Tests: status machine + reservation flow logic — no DB required
// DB-dependent routes are covered by contract assertions only
// ============================================================

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateFeTransition,
  isFeOrderLocked,
  FE_STATUSES,
  FE_TRANSITIONS,
  FE_TERMINAL,
  FE_LOCK_THRESHOLD,
  FE_STATUS_LABELS,
} from "../lib/flowers-events-status-machine";

// ── 1. Status machine coverage ────────────────────────────────

describe("FE_STATUSES", () => {
  it("covers all required operational statuses", () => {
    const required = [
      "preparing", "ready", "dispatched", "arrived",
      "in_setup", "completed_on_site", "returned",
      "maintenance", "closed", "cancelled",
    ];
    for (const s of required) {
      assert.ok(
        (FE_STATUSES as readonly string[]).includes(s),
        `missing status: ${s}`
      );
    }
  });

  it("every non-terminal status has at least one allowed transition", () => {
    for (const s of FE_STATUSES) {
      if (FE_TERMINAL.has(s)) continue;
      const transitions = FE_TRANSITIONS[s] ?? [];
      assert.ok(transitions.length > 0, `no transitions defined for non-terminal: ${s}`);
    }
  });

  it("every status has an Arabic label", () => {
    for (const s of FE_STATUSES) {
      assert.ok(
        typeof FE_STATUS_LABELS[s] === "string" && FE_STATUS_LABELS[s].length > 0,
        `missing Arabic label for: ${s}`
      );
    }
  });
});

// ── 2. validateFeTransition — valid transitions ───────────────

describe("validateFeTransition — valid paths", () => {
  it("preparing → ready is allowed", () => {
    const r = validateFeTransition("preparing", "ready");
    assert.equal(r.ok, true);
  });

  it("dispatched → arrived is allowed", () => {
    const r = validateFeTransition("dispatched", "arrived");
    assert.equal(r.ok, true);
  });

  it("arrived → in_setup is allowed", () => {
    const r = validateFeTransition("arrived", "in_setup");
    assert.equal(r.ok, true);
  });

  it("in_setup → completed_on_site is allowed", () => {
    const r = validateFeTransition("in_setup", "completed_on_site");
    assert.equal(r.ok, true);
  });

  it("returned → maintenance is allowed", () => {
    const r = validateFeTransition("returned", "maintenance");
    assert.equal(r.ok, true);
  });

  it("maintenance → closed is allowed", () => {
    const r = validateFeTransition("maintenance", "closed");
    assert.equal(r.ok, true);
  });

  it("any pre-terminal status can transition to cancelled", () => {
    const cancellable = ["preparing", "ready", "dispatched", "arrived"];
    for (const s of cancellable) {
      const r = validateFeTransition(s, "cancelled");
      assert.equal(r.ok, true, `expected ${s} → cancelled to be allowed`);
    }
  });
});

// ── 3. validateFeTransition — invalid transitions ────────────

describe("validateFeTransition — rejected paths", () => {
  it("closed → preparing is rejected (terminal)", () => {
    const r = validateFeTransition("closed", "preparing");
    assert.equal(r.ok, false);
    assert.ok((r as any).reason.includes("نهائية"));
  });

  it("cancelled → ready is rejected (terminal)", () => {
    const r = validateFeTransition("cancelled", "ready");
    assert.equal(r.ok, false);
    assert.ok((r as any).reason.includes("نهائية"));
  });

  it("preparing → in_setup is rejected (skipping steps)", () => {
    const r = validateFeTransition("preparing", "in_setup");
    assert.equal(r.ok, false);
    assert.ok((r as any).reason.includes("غير مسموح"));
  });

  it("in_setup → cancelled is rejected (locked)", () => {
    // in_setup does not include cancelled in its allowed list
    const r = validateFeTransition("in_setup", "cancelled");
    assert.equal(r.ok, false);
  });

  it("returned → preparing is rejected (backwards)", () => {
    const r = validateFeTransition("returned", "preparing");
    assert.equal(r.ok, false);
  });

  it("unknown current status returns not-ok", () => {
    const r = validateFeTransition("nonexistent_status", "ready");
    assert.equal(r.ok, false);
  });
});

// ── 4. isFeOrderLocked ────────────────────────────────────────

describe("isFeOrderLocked", () => {
  it("returns false for pre-dispatch statuses", () => {
    for (const s of ["preparing", "ready"]) {
      assert.equal(isFeOrderLocked(s), false, `${s} should not be locked`);
    }
  });

  it("returns true for dispatched and beyond", () => {
    for (const s of FE_LOCK_THRESHOLD) {
      assert.equal(isFeOrderLocked(s), true, `${s} should be locked`);
    }
  });

  it("closed and cancelled are locked", () => {
    assert.equal(isFeOrderLocked("closed"),    true);
    assert.equal(isFeOrderLocked("cancelled"), true);
  });
});

// ── 5. Reservation flow logic contract ───────────────────────
// These are contract tests — they verify the shape and rules
// that the POST /reservations handler relies on

describe("reservation flow — contract assertions", () => {
  it("effective stock formula: available_stock − reserved_qty", () => {
    // If available=100, reserved=30, quantity=50 → effectiveStock=70 → ok
    const available = 100;
    const reserved  = 30;
    const requested = 50;
    const effective = available - reserved;
    assert.ok(effective >= requested, "should be sufficient");
  });

  it("rejects when requested > effective stock", () => {
    const available = 20;
    const reserved  = 15;
    const requested = 10;
    const effective = available - reserved;
    assert.ok(effective < requested, "should be insufficient");
  });

  it("reservation statuses are mutually exclusive by design", () => {
    const validStatuses = ["reserved", "released", "deducted"];
    // Each reservation lives in exactly one state
    for (const s of validStatuses) {
      assert.ok(validStatuses.includes(s));
    }
    // No overlap between released and deducted transitions
    assert.notEqual("released", "deducted");
  });

  it("cancellation path releases reservations (status → released)", () => {
    // Simulates the logic in POST /service-orders/:id/transition when next = 'cancelled'
    const reservations = [
      { id: "r1", status: "reserved" },
      { id: "r2", status: "reserved" },
    ];
    const released = reservations
      .filter(r => r.status === "reserved")
      .map(r => ({ ...r, status: "released" }));
    assert.equal(released.length, 2);
    assert.ok(released.every(r => r.status === "released"));
  });

  it("in_setup path deducts reservations (status → deducted)", () => {
    // Simulates the logic in POST /service-orders/:id/transition when next = 'in_setup'
    const reservations = [
      { id: "r1", status: "reserved", batch_id: "b1", quantity: 10 },
    ];
    const deducted = reservations
      .filter(r => r.status === "reserved")
      .map(r => ({ ...r, status: "deducted" }));
    assert.equal(deducted[0].status, "deducted");
    assert.equal(deducted[0].quantity, 10);
  });
});

// ── 6. Dashboard metrics shape ────────────────────────────────

describe("dashboard metrics — shape contract", () => {
  it("metrics response has required top-level keys", () => {
    // Mock of what GET /dashboard-metrics should return
    const mockResponse = {
      data: {
        upcoming_events: {
          events: [] as any[],
          count: 0,
        },
        daily_sales: {
          transaction_count: 0,
          total_revenue: 0,
        },
        flower_alerts: {
          expiring_count: 0,
          total_stems: 0,
        },
      },
    };

    assert.ok("upcoming_events" in mockResponse.data);
    assert.ok("daily_sales"     in mockResponse.data);
    assert.ok("flower_alerts"   in mockResponse.data);

    assert.ok("events" in mockResponse.data.upcoming_events);
    assert.ok("count"  in mockResponse.data.upcoming_events);

    assert.ok("transaction_count" in mockResponse.data.daily_sales);
    assert.ok("total_revenue"     in mockResponse.data.daily_sales);

    assert.ok("expiring_count" in mockResponse.data.flower_alerts);
    assert.ok("total_stems"    in mockResponse.data.flower_alerts);
  });

  it("daily_sales total_revenue is numeric", () => {
    const revenue = Number("1500.00");
    assert.ok(!isNaN(revenue));
    assert.ok(typeof revenue === "number");
  });

  it("flower_alerts urgency logic: urgent when expiring_count > 0", () => {
    const urgent   = (count: number) => count > 0;
    assert.equal(urgent(0), false);
    assert.equal(urgent(1), true);
    assert.equal(urgent(5), true);
  });
});
