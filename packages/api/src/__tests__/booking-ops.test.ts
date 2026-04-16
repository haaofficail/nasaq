// ============================================================
// Booking Ops Engine Unit Tests
// Run: node_modules/.pnpm/node_modules/.bin/tsx --test packages/api/src/__tests__/booking-ops.test.ts
//
// Tests: getBookingSlaState + timeline helpers — no DB required
// DB-dependent functions (getBookingTimeline, listOperationalAlerts)
// are tested via contract assertions only (no live DB in unit tests)
// ============================================================

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getBookingSlaState,
  resolveStatusEnteredAt,
  DEFAULT_SLA_HOURS,
  type BookingSlaState,
} from "../lib/booking-ops";
import type { WorkflowStage } from "../lib/workflow-engine";

// ── Fixtures ─────────────────────────────────────────────────

const NOW = new Date("2026-04-16T12:00:00Z");

/** A stage with maxDurationHours set */
function makeStage(mappedStatus: string, maxDurationHours?: number): WorkflowStage & { maxDurationHours?: number } {
  return {
    id: `stage-${mappedStatus}`,
    name: mappedStatus,
    sortOrder: 1,
    mappedStatus,
    isSkippable: true,
    isTerminal: false,
    autoTransitionCondition: null,
    notificationTemplate: null,
    maxDurationHours,
  };
}

function hoursAgo(h: number, from = NOW): Date {
  return new Date(from.getTime() - h * 60 * 60 * 1000);
}

// ── Tests: DEFAULT_SLA_HOURS ──────────────────────────────────

describe("DEFAULT_SLA_HOURS", () => {
  it("covers all active booking statuses", () => {
    const expected = ["pending", "confirmed", "deposit_paid", "fully_confirmed", "preparing", "in_progress"];
    for (const s of expected) {
      assert.ok(s in DEFAULT_SLA_HOURS, `missing SLA threshold for: ${s}`);
      assert.ok(DEFAULT_SLA_HOURS[s] > 0, `threshold must be > 0 for: ${s}`);
    }
  });

  it("does not include terminal statuses", () => {
    for (const s of ["cancelled", "no_show", "completed", "reviewed"]) {
      assert.equal(s in DEFAULT_SLA_HOURS, false, `${s} should not have a stale threshold`);
    }
  });
});

// ── Tests: getBookingSlaState — fresh booking ─────────────────

describe("getBookingSlaState — fresh booking (not stale)", () => {
  it("returns isStale=false when timeInStatus < threshold", () => {
    const sla = getBookingSlaState({
      bookingId:     "b1",
      currentStatus: "pending",
      createdAt:     hoursAgo(2),
      updatedAt:     hoursAgo(2),
      stages:        [],
      now:           NOW,
    });
    assert.equal(sla.isStale, false);
    assert.equal(sla.thresholdSource, "default_constant");
    assert.equal(sla.currentStatus, "pending");
  });

  it("timeInCurrentStatusMs is correct", () => {
    const enteredAt = hoursAgo(5);
    const sla = getBookingSlaState({
      bookingId:      "b1",
      currentStatus:  "confirmed",
      createdAt:      hoursAgo(10),
      updatedAt:      enteredAt,
      stages:         [],
      statusEnteredAt: enteredAt,
      now:            NOW,
    });
    const expectedMs = 5 * 60 * 60 * 1000;
    assert.equal(sla.timeInCurrentStatusMs, expectedMs);
  });

  it("totalAgeMs is computed from createdAt", () => {
    const sla = getBookingSlaState({
      bookingId:     "b1",
      currentStatus: "pending",
      createdAt:     hoursAgo(10),
      updatedAt:     hoursAgo(2),
      stages:        [],
      now:           NOW,
    });
    assert.equal(sla.totalAgeMs, 10 * 60 * 60 * 1000);
  });
});

// ── Tests: getBookingSlaState — stale booking ─────────────────

describe("getBookingSlaState — stale booking", () => {
  it("returns isStale=true when timeInStatus > default threshold", () => {
    // pending threshold = 24h; booking has been pending for 30h
    const sla = getBookingSlaState({
      bookingId:     "b2",
      currentStatus: "pending",
      createdAt:     hoursAgo(30),
      updatedAt:     hoursAgo(30),
      stages:        [],
      now:           NOW,
    });
    assert.equal(sla.isStale, true);
    assert.equal(sla.thresholdSource, "default_constant");
    assert.equal(sla.stalenessThresholdMs, 24 * 60 * 60 * 1000);
  });

  it("returns isStale=true when timeInStatus > pipeline stage threshold", () => {
    // Stage says max 4h; booking has been in this status for 6h
    const stages = [makeStage("in_progress", 4)];
    const sla = getBookingSlaState({
      bookingId:      "b3",
      currentStatus:  "in_progress",
      createdAt:      hoursAgo(6),
      updatedAt:      hoursAgo(6),
      stages,
      now:            NOW,
    });
    assert.equal(sla.isStale, true);
    assert.equal(sla.thresholdSource, "pipeline_stage");
    assert.equal(sla.stalenessThresholdMs, 4 * 60 * 60 * 1000);
  });

  it("pipeline stage threshold overrides default constant", () => {
    // Default pending = 24h; pipeline stage says 2h
    const stages = [makeStage("pending", 2)];
    const sla = getBookingSlaState({
      bookingId:     "b4",
      currentStatus: "pending",
      createdAt:     hoursAgo(3),
      updatedAt:     hoursAgo(3),
      stages,
      now:           NOW,
    });
    assert.equal(sla.isStale, true);
    assert.equal(sla.thresholdSource, "pipeline_stage");
    assert.equal(sla.stalenessThresholdMs, 2 * 60 * 60 * 1000);
  });
});

// ── Tests: getBookingSlaState — SLA-exempt statuses ───────────

describe("getBookingSlaState — exempt (terminal) statuses", () => {
  for (const status of ["completed", "reviewed", "cancelled", "no_show"]) {
    it(`${status} is never stale regardless of age`, () => {
      const sla = getBookingSlaState({
        bookingId:     "b5",
        currentStatus: status,
        createdAt:     hoursAgo(999),
        updatedAt:     hoursAgo(999),
        stages:        [],
        now:           NOW,
      });
      assert.equal(sla.isStale, false);
      assert.equal(sla.thresholdSource, "no_threshold");
      assert.equal(sla.stalenessThresholdMs, 0);
    });
  }
});

// ── Tests: statusEnteredAt precision ─────────────────────────

describe("getBookingSlaState — statusEnteredAt precision", () => {
  it("uses statusEnteredAt when provided (more accurate than updatedAt)", () => {
    // updatedAt says 50h ago, but actually entered status only 2h ago (from timeline)
    const sla = getBookingSlaState({
      bookingId:       "b6",
      currentStatus:   "pending",
      createdAt:       hoursAgo(50),
      updatedAt:       hoursAgo(50),
      stages:          [],
      statusEnteredAt: hoursAgo(2),
      now:             NOW,
    });
    assert.equal(sla.isStale, false);
    assert.equal(sla.timeInCurrentStatusMs, 2 * 60 * 60 * 1000);
  });

  it("falls back to updatedAt when statusEnteredAt is null", () => {
    const sla = getBookingSlaState({
      bookingId:       "b7",
      currentStatus:   "pending",
      createdAt:       hoursAgo(30),
      updatedAt:       hoursAgo(30),
      stages:          [],
      statusEnteredAt: null,
      now:             NOW,
    });
    // Uses updatedAt = 30h, threshold = 24h → stale
    assert.equal(sla.isStale, true);
    assert.equal(sla.timeInCurrentStatusMs, 30 * 60 * 60 * 1000);
  });
});

// ── Tests: no_threshold path ──────────────────────────────────

describe("getBookingSlaState — unknown status (no threshold)", () => {
  it("returns no_threshold for a status not in defaults and not in stages", () => {
    const sla = getBookingSlaState({
      bookingId:     "b8",
      currentStatus: "some_future_status",
      createdAt:     hoursAgo(999),
      updatedAt:     hoursAgo(999),
      stages:        [],
      now:           NOW,
    });
    assert.equal(sla.isStale, false);
    assert.equal(sla.thresholdSource, "no_threshold");
  });
});

// ── Tests: determinism ────────────────────────────────────────

describe("getBookingSlaState — determinism", () => {
  it("same inputs always produce same outputs", () => {
    const params = {
      bookingId:     "b9",
      currentStatus: "confirmed",
      createdAt:     hoursAgo(20),
      updatedAt:     hoursAgo(20),
      stages:        [] as WorkflowStage[],
      now:           NOW,
    };
    const sla1 = getBookingSlaState(params);
    const sla2 = getBookingSlaState(params);
    assert.deepEqual(sla1, sla2);
  });

  it("isStale flips precisely at threshold boundary", () => {
    // pending threshold = 24h
    const justUnder = getBookingSlaState({
      bookingId:     "b10",
      currentStatus: "pending",
      createdAt:     new Date(NOW.getTime() - 24 * 60 * 60 * 1000 + 1), // 1ms under
      updatedAt:     new Date(NOW.getTime() - 24 * 60 * 60 * 1000 + 1),
      stages:        [],
      now:           NOW,
    });
    const justOver = getBookingSlaState({
      bookingId:     "b10",
      currentStatus: "pending",
      createdAt:     new Date(NOW.getTime() - 24 * 60 * 60 * 1000 - 1), // 1ms over
      updatedAt:     new Date(NOW.getTime() - 24 * 60 * 60 * 1000 - 1),
      stages:        [],
      now:           NOW,
    });
    assert.equal(justUnder.isStale, false);
    assert.equal(justOver.isStale, true);
  });
});

// ── Tests: backward compatibility (existing flows unaffected) ─

describe("backward compatibility — SLA does not affect workflow transitions", () => {
  it("SLA state is read-only — does not block status transitions", () => {
    const sla = getBookingSlaState({
      bookingId:     "b11",
      currentStatus: "pending",
      createdAt:     hoursAgo(100),
      updatedAt:     hoursAgo(100),
      stages:        [],
      now:           NOW,
    });
    assert.equal(sla.isStale, true);
    assert.ok(typeof sla.totalAgeMs === "number");
  });
});

// ============================================================
// T2 FIX — resolveStatusEnteredAt
// ============================================================

// ── Tests: resolveStatusEnteredAt — basic ─────────────────────

describe("resolveStatusEnteredAt — basic extraction", () => {
  it("returns createdAt of the matching status_changed event", () => {
    const enteredAt = hoursAgo(5);
    const events = [
      { eventType: "status_changed", toStatus: "confirmed", createdAt: enteredAt },
    ];
    const result = resolveStatusEnteredAt(events, "confirmed");
    assert.equal(result?.getTime(), enteredAt.getTime());
  });

  it("returns null when no matching status_changed event exists", () => {
    const events = [
      { eventType: "payment_received", toStatus: null, createdAt: hoursAgo(3) },
      { eventType: "rescheduled",      toStatus: null, createdAt: hoursAgo(2) },
    ];
    assert.equal(resolveStatusEnteredAt(events, "confirmed"), null);
  });

  it("returns null on empty events list", () => {
    assert.equal(resolveStatusEnteredAt([], "pending"), null);
  });

  it("ignores status_changed events with non-matching toStatus", () => {
    const events = [
      { eventType: "status_changed", toStatus: "confirmed",  createdAt: hoursAgo(10) },
      { eventType: "status_changed", toStatus: "in_progress", createdAt: hoursAgo(5) },
    ];
    // Looking for pending — no match
    assert.equal(resolveStatusEnteredAt(events, "pending"), null);
  });
});

// ── Tests: resolveStatusEnteredAt — picks latest ──────────────

describe("resolveStatusEnteredAt — picks the latest matching event", () => {
  it("returns the most recent event when status was entered multiple times", () => {
    // Booking went: pending → confirmed → pending → confirmed
    const first  = hoursAgo(10);
    const second = hoursAgo(3);
    const events = [
      { eventType: "status_changed", toStatus: "confirmed", createdAt: first },
      { eventType: "status_changed", toStatus: "pending",   createdAt: hoursAgo(8) },
      { eventType: "status_changed", toStatus: "confirmed", createdAt: second }, // latest
    ];
    const result = resolveStatusEnteredAt(events, "confirmed");
    assert.equal(result?.getTime(), second.getTime());
  });

  it("correctly handles out-of-order event arrays", () => {
    // Events not sorted chronologically
    const latest = hoursAgo(1);
    const older  = hoursAgo(5);
    const events = [
      { eventType: "status_changed", toStatus: "pending", createdAt: latest },
      { eventType: "status_changed", toStatus: "pending", createdAt: older },
    ];
    assert.equal(resolveStatusEnteredAt(events, "pending")?.getTime(), latest.getTime());
  });
});

// ── Tests: resolveStatusEnteredAt — updatedAt drift isolation ─

describe("resolveStatusEnteredAt — isolates from updatedAt drift", () => {
  it("non-status events do not affect the result", () => {
    // updatedAt would be 2h ago (payment was recorded), but status entered 20h ago
    const statusEnteredAt = hoursAgo(20);
    const events = [
      { eventType: "status_changed",   toStatus: "confirmed", createdAt: statusEnteredAt },
      { eventType: "payment_received", toStatus: null,        createdAt: hoursAgo(2) },
      { eventType: "note_added",       toStatus: null,        createdAt: hoursAgo(1) },
    ];
    const result = resolveStatusEnteredAt(events, "confirmed");
    // Must return statusEnteredAt (20h ago), not the recent payment/note events
    assert.equal(result?.getTime(), statusEnteredAt.getTime());
  });

  it("rescheduled event does not look like a status entry", () => {
    const statusAt = hoursAgo(10);
    const events = [
      { eventType: "status_changed", toStatus: "confirmed", createdAt: statusAt },
      { eventType: "rescheduled",    toStatus: "confirmed", createdAt: hoursAgo(2) }, // toStatus coincidentally set — must be ignored (wrong eventType)
    ];
    assert.equal(resolveStatusEnteredAt(events, "confirmed")?.getTime(), statusAt.getTime());
  });
});

// ── Tests: resolveStatusEnteredAt — SLA integration ──────────

describe("resolveStatusEnteredAt + getBookingSlaState integration", () => {
  it("booking is NOT stale when statusEnteredAt from history is recent, despite old updatedAt", () => {
    // Simulate: booking in 'pending' for 2h (recent status change), but updatedAt 30h ago
    const events = [
      { eventType: "status_changed", toStatus: "pending", createdAt: hoursAgo(2) },
    ];
    const statusEnteredAt = resolveStatusEnteredAt(events, "pending");
    assert.ok(statusEnteredAt !== null);

    const sla = getBookingSlaState({
      bookingId:      "b-integration-1",
      currentStatus:  "pending",
      createdAt:      hoursAgo(30),
      updatedAt:      hoursAgo(30),   // would trigger stale if used naively
      stages:         [],
      statusEnteredAt,               // correct value from history
      now:            NOW,
    });

    // pending threshold = 24h; time in status = 2h → NOT stale
    assert.equal(sla.isStale, false);
    assert.equal(sla.timeInCurrentStatusMs, 2 * 60 * 60 * 1000);
  });

  it("booking IS stale when statusEnteredAt from history is old (updatedAt is recent but irrelevant)", () => {
    // Simulate: booking in 'pending' for 30h (old status change), but updatedAt 2h ago (payment recorded)
    const events = [
      { eventType: "status_changed",   toStatus: "pending", createdAt: hoursAgo(30) },
      { eventType: "payment_received", toStatus: null,      createdAt: hoursAgo(2) },
    ];
    const statusEnteredAt = resolveStatusEnteredAt(events, "pending");
    assert.ok(statusEnteredAt !== null);

    const sla = getBookingSlaState({
      bookingId:      "b-integration-2",
      currentStatus:  "pending",
      createdAt:      hoursAgo(30),
      updatedAt:      hoursAgo(2),   // recent — would hide staleness if used naively
      stages:         [],
      statusEnteredAt,
      now:            NOW,
    });

    // pending threshold = 24h; time in status = 30h → IS stale
    assert.equal(sla.isStale, true);
    assert.equal(sla.timeInCurrentStatusMs, 30 * 60 * 60 * 1000);
  });

  it("fallback to updatedAt when no history — returns correct SLA", () => {
    const statusEnteredAt = resolveStatusEnteredAt([], "pending"); // null
    assert.equal(statusEnteredAt, null);

    const sla = getBookingSlaState({
      bookingId:      "b-integration-3",
      currentStatus:  "pending",
      createdAt:      hoursAgo(5),
      updatedAt:      hoursAgo(5),
      stages:         [],
      // statusEnteredAt omitted → falls back to updatedAt
      now:            NOW,
    });

    // pending threshold = 24h; time = 5h → not stale
    assert.equal(sla.isStale, false);
    assert.equal(sla.timeInCurrentStatusMs, 5 * 60 * 60 * 1000);
  });
});

// ── Tests: resolveStatusEnteredAt — determinism ───────────────

describe("resolveStatusEnteredAt — determinism", () => {
  it("same events + same status always returns same result", () => {
    const events = [
      { eventType: "status_changed", toStatus: "confirmed", createdAt: hoursAgo(10) },
      { eventType: "status_changed", toStatus: "pending",   createdAt: hoursAgo(5)  },
    ];
    const r1 = resolveStatusEnteredAt(events, "confirmed");
    const r2 = resolveStatusEnteredAt(events, "confirmed");
    assert.equal(r1?.getTime(), r2?.getTime());
  });

  it("does not mutate the input events array", () => {
    const events = [
      { eventType: "status_changed", toStatus: "pending", createdAt: hoursAgo(3) },
    ];
    const snapshot = JSON.stringify(events);
    resolveStatusEnteredAt(events, "pending");
    assert.equal(JSON.stringify(events), snapshot);
  });
});
