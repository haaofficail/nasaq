// ============================================================
// Workflow Engine Unit Tests
// Run: node --experimental-vm-modules --test packages/api/src/__tests__/workflow-engine.test.ts
//
// Tests: canTransition pure logic — no DB required
// ============================================================

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canTransition, resolveCurrentStage, FALLBACK_STATUS_ORDER, TERMINAL_STATUSES } from "../lib/workflow-engine";
import type { WorkflowStage } from "../lib/workflow-engine";

// ── Fixtures ─────────────────────────────────────────────────

/** Default 6-stage pipeline (mirrors auth.ts seed with mappedStatus) */
const DEFAULT_STAGES: WorkflowStage[] = [
  { id: "s1", name: "طلب جديد",    sortOrder: 1, mappedStatus: "pending",          isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s2", name: "تأكيد أولي",  sortOrder: 2, mappedStatus: "confirmed",        isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s3", name: "عربون مدفوع", sortOrder: 3, mappedStatus: "deposit_paid",     isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s4", name: "تأكيد نهائي", sortOrder: 4, mappedStatus: "fully_confirmed",  isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s5", name: "مكتمل",       sortOrder: 5, mappedStatus: "completed",        isSkippable: false, isTerminal: true,  autoTransitionCondition: null, notificationTemplate: null },
  { id: "s6", name: "ملغي",        sortOrder: 6, mappedStatus: "cancelled",        isSkippable: false, isTerminal: true,  autoTransitionCondition: null, notificationTemplate: null },
];

/** Pipeline with one mandatory (non-skippable) intermediate stage */
const STRICT_STAGES: WorkflowStage[] = [
  { id: "s1", name: "طلب جديد",    sortOrder: 1, mappedStatus: "pending",    isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s2", name: "تأكيد أولي",  sortOrder: 2, mappedStatus: "confirmed",  isSkippable: false, isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s3", name: "مكتمل",       sortOrder: 3, mappedStatus: "completed",  isSkippable: false, isTerminal: true,  autoTransitionCondition: null, notificationTemplate: null },
  { id: "s4", name: "ملغي",        sortOrder: 4, mappedStatus: "cancelled",  isSkippable: false, isTerminal: true,  autoTransitionCondition: null, notificationTemplate: null },
];

/** Empty pipeline — simulates org with no configured stages */
const NO_STAGES: WorkflowStage[] = [];

/** Stages with no mappedStatus — simulates partially migrated org */
const UNMAPPED_STAGES: WorkflowStage[] = [
  { id: "s1", name: "مرحلة 1", sortOrder: 1, mappedStatus: null, isSkippable: true, isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s2", name: "مرحلة 2", sortOrder: 2, mappedStatus: null, isSkippable: true, isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
];

// ── Tests: resolveCurrentStage ────────────────────────────────

describe("resolveCurrentStage", () => {
  it("returns matching stage when found", () => {
    const stage = resolveCurrentStage(DEFAULT_STAGES, "confirmed");
    assert.equal(stage?.name, "تأكيد أولي");
  });

  it("returns null when status not mapped", () => {
    const stage = resolveCurrentStage(DEFAULT_STAGES, "in_progress");
    assert.equal(stage, null);
  });

  it("returns null on empty stages", () => {
    assert.equal(resolveCurrentStage(NO_STAGES, "pending"), null);
  });
});

// ── Tests: canTransition — terminal always allowed ────────────

describe("canTransition — terminal statuses", () => {
  it("cancelled is always allowed from any status (soft)", () => {
    const r = canTransition("pending", "cancelled", DEFAULT_STAGES, "soft");
    assert.equal(r.allowed, true);
  });

  it("no_show is always allowed from any status (strict)", () => {
    const r = canTransition("completed", "no_show", DEFAULT_STAGES, "strict");
    assert.equal(r.allowed, true);
  });

  it("cancelled is allowed even with no stages configured", () => {
    const r = canTransition("pending", "cancelled", NO_STAGES, "strict");
    assert.equal(r.allowed, true);
  });
});

// ── Tests: canTransition — legacy fallback ───────────────────

describe("canTransition — legacy mode (no mapped stages)", () => {
  it("allows any transition when no stages present", () => {
    const r = canTransition("pending", "completed", NO_STAGES, "legacy");
    assert.equal(r.allowed, true);
    assert.equal(r.mode, "legacy");
  });

  it("allows any transition when stages have no mappedStatus", () => {
    const r = canTransition("pending", "completed", UNMAPPED_STAGES, "soft");
    assert.equal(r.allowed, true);
    assert.equal(r.mode, "legacy");
  });
});

// ── Tests: canTransition — forward transitions (soft) ────────

describe("canTransition — soft mode", () => {
  it("allows valid forward transition", () => {
    const r = canTransition("pending", "confirmed", DEFAULT_STAGES, "soft");
    assert.equal(r.allowed, true);
    assert.equal(r.warning, undefined);
  });

  it("allows skipping skippable stages with a warning", () => {
    // pending → completed skips confirmed, deposit_paid, fully_confirmed (all skippable)
    const r = canTransition("pending", "completed", DEFAULT_STAGES, "soft");
    assert.equal(r.allowed, true);
    // No mandatory stage skipped — no warning expected
    assert.equal(r.warning, undefined);
  });

  it("allows skipping mandatory stage but emits warning", () => {
    // pending → completed skips "تأكيد أولي" which is isSkippable:false
    const r = canTransition("pending", "completed", STRICT_STAGES, "soft");
    assert.equal(r.allowed, true);
    assert.ok(r.warning, "expected a warning for skipping mandatory stage");
    assert.ok(r.warning?.includes("تأكيد أولي"));
  });
});

// ── Tests: canTransition — strict mode blocking ───────────────

describe("canTransition — strict mode", () => {
  it("blocks skip of mandatory stage", () => {
    // pending → completed skips "تأكيد أولي" (isSkippable: false)
    const r = canTransition("pending", "completed", STRICT_STAGES, "strict");
    assert.equal(r.allowed, false);
    assert.ok(r.error);
    assert.equal(r.blockedBy, "تأكيد أولي");
    assert.equal(r.mode, "strict");
  });

  it("allows transition through stages in correct order (strict)", () => {
    const r = canTransition("pending", "confirmed", STRICT_STAGES, "strict");
    assert.equal(r.allowed, true);
  });

  it("allows completing after confirming (no mandatory skips)", () => {
    const r = canTransition("confirmed", "completed", STRICT_STAGES, "strict");
    assert.equal(r.allowed, true);
  });
});

// ── Tests: backwards transitions always allowed ───────────────

describe("canTransition — backwards transitions (corrections)", () => {
  it("allows backwards transition in soft mode", () => {
    const r = canTransition("completed", "pending", DEFAULT_STAGES, "soft");
    assert.equal(r.allowed, true);
  });

  it("allows backwards transition even in strict mode", () => {
    // Corrections should always be possible for operators
    const r = canTransition("completed", "confirmed", STRICT_STAGES, "strict");
    assert.equal(r.allowed, true);
  });

  it("allows same-status (no-op) transition", () => {
    const r = canTransition("pending", "pending", DEFAULT_STAGES, "strict");
    assert.equal(r.allowed, true);
  });
});

// ── Tests: FALLBACK_STATUS_ORDER consistency ──────────────────

describe("FALLBACK_STATUS_ORDER", () => {
  it("contains all 10 booking statuses", () => {
    const expected = ["pending","confirmed","deposit_paid","fully_confirmed","preparing","in_progress","completed","reviewed","cancelled","no_show"];
    for (const s of expected) {
      assert.ok(s in FALLBACK_STATUS_ORDER, `missing status: ${s}`);
    }
  });

  it("terminal statuses have order 99", () => {
    assert.equal(FALLBACK_STATUS_ORDER["cancelled"], 99);
    assert.equal(FALLBACK_STATUS_ORDER["no_show"], 99);
  });
});

// ── Tests: TERMINAL_STATUSES ──────────────────────────────────

describe("TERMINAL_STATUSES", () => {
  it("contains cancelled and no_show", () => {
    assert.ok(TERMINAL_STATUSES.has("cancelled"));
    assert.ok(TERMINAL_STATUSES.has("no_show"));
  });

  it("does not contain completed (completed is reversible)", () => {
    assert.equal(TERMINAL_STATUSES.has("completed"), false);
  });
});
