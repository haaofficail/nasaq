// ============================================================
// Workflow Engine Unit Tests
// Run: node_modules/.pnpm/node_modules/.bin/tsx --test packages/api/src/__tests__/workflow-engine.test.ts
//
// Tests: canTransition pure logic — no DB required
// ============================================================

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  resolveCurrentStage,
  getOrgWorkflowConfigState,
  resolveWorkflowExecutionMode,
  FALLBACK_STATUS_ORDER,
  TERMINAL_STATUSES,
  TRUE_TERMINAL_STATUSES,
  GUARDED_TERMINAL_STATUSES,
} from "../lib/workflow-engine";
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

/** Full 10-status pipeline including reviewed, no_show, etc. */
const FULL_STAGES: WorkflowStage[] = [
  { id: "s1",  name: "طلب جديد",    sortOrder: 1,  mappedStatus: "pending",         isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s2",  name: "تأكيد أولي",  sortOrder: 2,  mappedStatus: "confirmed",       isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s3",  name: "عربون مدفوع", sortOrder: 3,  mappedStatus: "deposit_paid",    isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s4",  name: "تأكيد نهائي", sortOrder: 4,  mappedStatus: "fully_confirmed", isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s5",  name: "قيد التجهيز", sortOrder: 5,  mappedStatus: "preparing",       isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s6",  name: "قيد التنفيذ", sortOrder: 6,  mappedStatus: "in_progress",     isSkippable: false, isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s7",  name: "مكتمل",       sortOrder: 7,  mappedStatus: "completed",       isSkippable: false, isTerminal: true,  autoTransitionCondition: null, notificationTemplate: null },
  { id: "s8",  name: "مراجع",       sortOrder: 8,  mappedStatus: "reviewed",        isSkippable: true,  isTerminal: true,  autoTransitionCondition: null, notificationTemplate: null },
  { id: "s9",  name: "ملغي",        sortOrder: 9,  mappedStatus: "cancelled",       isSkippable: false, isTerminal: true,  autoTransitionCondition: null, notificationTemplate: null },
  { id: "s10", name: "لم يحضر",     sortOrder: 10, mappedStatus: "no_show",         isSkippable: false, isTerminal: true,  autoTransitionCondition: null, notificationTemplate: null },
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

/** Stages with duplicate mappedStatus — invalid org config */
const DUPLICATE_STAGES: WorkflowStage[] = [
  { id: "s1", name: "مرحلة أ", sortOrder: 1, mappedStatus: "pending",   isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s2", name: "مرحلة ب", sortOrder: 2, mappedStatus: "pending",   isSkippable: true,  isTerminal: false, autoTransitionCondition: null, notificationTemplate: null },
  { id: "s3", name: "مكتمل",   sortOrder: 3, mappedStatus: "completed", isSkippable: false, isTerminal: true,  autoTransitionCondition: null, notificationTemplate: null },
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

  it("allows skipping skippable stages with no warning", () => {
    // pending → completed skips confirmed, deposit_paid, fully_confirmed (all skippable)
    const r = canTransition("pending", "completed", DEFAULT_STAGES, "soft");
    assert.equal(r.allowed, true);
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

  it("strict block does NOT set requiresForce (non-skippable cannot be overridden)", () => {
    const r = canTransition("pending", "completed", STRICT_STAGES, "strict");
    assert.equal(r.allowed, false);
    assert.equal(r.requiresForce, false);
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

// ── Tests: TRUE_TERMINAL blocking (Rule 1) ────────────────────

describe("canTransition — TRUE_TERMINAL source blocking", () => {
  it("blocks any transition FROM cancelled (returns requiresForce=true)", () => {
    const r = canTransition("cancelled", "pending", FULL_STAGES, "soft");
    assert.equal(r.allowed, false);
    assert.equal(r.requiresForce, true);
    assert.ok(r.error);
  });

  it("blocks any transition FROM no_show (returns requiresForce=true)", () => {
    const r = canTransition("no_show", "confirmed", FULL_STAGES, "soft");
    assert.equal(r.allowed, false);
    assert.equal(r.requiresForce, true);
  });

  it("blocks FROM cancelled even in legacy mode", () => {
    const r = canTransition("cancelled", "pending", NO_STAGES, "legacy");
    assert.equal(r.allowed, false);
    assert.equal(r.requiresForce, true);
  });

  it("blocks FROM cancelled even when target is a terminal status (cancelled→no_show unusual but blocked)", () => {
    // Rule 1 fires before Rule 2 — source is TRUE_TERMINAL, must use force
    const r = canTransition("cancelled", "no_show", FULL_STAGES, "soft");
    assert.equal(r.allowed, false);
    assert.equal(r.requiresForce, true);
  });
});

// ── Tests: GUARDED_TERMINAL backwards (Rule 4) ───────────────

describe("canTransition — GUARDED_TERMINAL backwards (completed/reviewed)", () => {
  it("blocks backwards FROM completed → requires force", () => {
    const r = canTransition("completed", "confirmed", FULL_STAGES, "soft");
    assert.equal(r.allowed, false);
    assert.equal(r.requiresForce, true);
    assert.ok(r.error);
  });

  it("blocks backwards FROM reviewed → requires force", () => {
    const r = canTransition("reviewed", "in_progress", FULL_STAGES, "soft");
    assert.equal(r.allowed, false);
    assert.equal(r.requiresForce, true);
  });

  it("does NOT block forward FROM completed (e.g., completed→reviewed forward)", () => {
    // completed=sortOrder 7, reviewed=sortOrder 8 — forward, not backwards
    const r = canTransition("completed", "reviewed", FULL_STAGES, "soft");
    assert.equal(r.allowed, true);
  });

  it("does NOT block same-status from completed", () => {
    const r = canTransition("completed", "completed", FULL_STAGES, "soft");
    assert.equal(r.allowed, true);
  });

  it("blocks backwards from completed even in strict mode", () => {
    const r = canTransition("completed", "pending", DEFAULT_STAGES, "strict");
    assert.equal(r.allowed, false);
    assert.equal(r.requiresForce, true);
  });
});

// ── Tests: backwards transitions always allowed ───────────────

describe("canTransition — backwards transitions (corrections)", () => {
  it("allows backwards transition in soft mode", () => {
    // confirmed → pending is backwards and allowed (not from GUARDED)
    const r = canTransition("confirmed", "pending", DEFAULT_STAGES, "soft");
    assert.equal(r.allowed, true);
  });

  it("allows backwards transition even in strict mode", () => {
    // Corrections for non-guarded states
    const r = canTransition("confirmed", "pending", STRICT_STAGES, "strict");
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

  it("statuses increase in logical order", () => {
    const order = ["pending","confirmed","deposit_paid","fully_confirmed","preparing","in_progress","completed","reviewed"];
    for (let i = 0; i < order.length - 1; i++) {
      assert.ok(
        FALLBACK_STATUS_ORDER[order[i]] < FALLBACK_STATUS_ORDER[order[i + 1]],
        `expected ${order[i]} < ${order[i+1]}`,
      );
    }
  });
});

// ── Tests: TERMINAL_STATUSES / TRUE_TERMINAL_STATUSES ─────────

describe("TERMINAL_STATUSES", () => {
  it("contains cancelled and no_show", () => {
    assert.ok(TERMINAL_STATUSES.has("cancelled"));
    assert.ok(TERMINAL_STATUSES.has("no_show"));
  });

  it("does not contain completed (completed is reversible)", () => {
    assert.equal(TERMINAL_STATUSES.has("completed"), false);
  });
});

describe("TRUE_TERMINAL_STATUSES", () => {
  it("contains exactly cancelled and no_show", () => {
    assert.ok(TRUE_TERMINAL_STATUSES.has("cancelled"));
    assert.ok(TRUE_TERMINAL_STATUSES.has("no_show"));
    assert.equal(TRUE_TERMINAL_STATUSES.size, 2);
  });
});

describe("GUARDED_TERMINAL_STATUSES", () => {
  it("contains completed and reviewed", () => {
    assert.ok(GUARDED_TERMINAL_STATUSES.has("completed"));
    assert.ok(GUARDED_TERMINAL_STATUSES.has("reviewed"));
    assert.equal(GUARDED_TERMINAL_STATUSES.size, 2);
  });

  it("does not overlap with TRUE_TERMINAL_STATUSES", () => {
    for (const s of GUARDED_TERMINAL_STATUSES) {
      assert.equal(TRUE_TERMINAL_STATUSES.has(s), false, `${s} should not be in TRUE_TERMINAL`);
    }
  });
});

// ── Tests: getOrgWorkflowConfigState ─────────────────────────

describe("getOrgWorkflowConfigState", () => {
  it("returns 'legacy-compatible' for empty stages", () => {
    assert.equal(getOrgWorkflowConfigState(NO_STAGES), "legacy-compatible");
  });

  it("returns 'legacy-compatible' when all stages have null mappedStatus", () => {
    assert.equal(getOrgWorkflowConfigState(UNMAPPED_STAGES), "legacy-compatible");
  });

  it("returns 'workflow-ready' for properly configured stages", () => {
    assert.equal(getOrgWorkflowConfigState(DEFAULT_STAGES), "workflow-ready");
  });

  it("returns 'workflow-ready' for FULL_STAGES with all 10 statuses", () => {
    assert.equal(getOrgWorkflowConfigState(FULL_STAGES), "workflow-ready");
  });

  it("returns 'invalid-config' when duplicate mappedStatus detected", () => {
    assert.equal(getOrgWorkflowConfigState(DUPLICATE_STAGES), "invalid-config");
  });
});

// ── Tests: resolveWorkflowExecutionMode ──────────────────────

describe("resolveWorkflowExecutionMode", () => {
  const originalEnv = process.env.WORKFLOW_STRICT_MODE;

  it("returns 'legacy' for empty stages regardless of env", () => {
    process.env.WORKFLOW_STRICT_MODE = "true";
    const result = resolveWorkflowExecutionMode(NO_STAGES);
    assert.equal(result.mode, "legacy");
    assert.equal(result.configState, "legacy-compatible");
    process.env.WORKFLOW_STRICT_MODE = originalEnv;
  });

  it("returns 'legacy' for unmapped stages regardless of env", () => {
    process.env.WORKFLOW_STRICT_MODE = "true";
    const result = resolveWorkflowExecutionMode(UNMAPPED_STAGES);
    assert.equal(result.mode, "legacy");
    assert.equal(result.configState, "legacy-compatible");
    process.env.WORKFLOW_STRICT_MODE = originalEnv;
  });

  it("returns 'soft' for invalid-config regardless of env", () => {
    process.env.WORKFLOW_STRICT_MODE = "true";
    const result = resolveWorkflowExecutionMode(DUPLICATE_STAGES);
    assert.equal(result.mode, "soft");
    assert.equal(result.configState, "invalid-config");
    process.env.WORKFLOW_STRICT_MODE = originalEnv;
  });

  it("returns 'soft' for workflow-ready when WORKFLOW_STRICT_MODE is not set", () => {
    delete process.env.WORKFLOW_STRICT_MODE;
    const result = resolveWorkflowExecutionMode(DEFAULT_STAGES);
    assert.equal(result.mode, "soft");
    assert.equal(result.configState, "workflow-ready");
    process.env.WORKFLOW_STRICT_MODE = originalEnv;
  });

  it("returns 'strict' for workflow-ready when WORKFLOW_STRICT_MODE=true", () => {
    process.env.WORKFLOW_STRICT_MODE = "true";
    const result = resolveWorkflowExecutionMode(DEFAULT_STAGES);
    assert.equal(result.mode, "strict");
    assert.equal(result.configState, "workflow-ready");
    process.env.WORKFLOW_STRICT_MODE = originalEnv;
  });

  it("never returns strict for invalid-config (safety guarantee)", () => {
    process.env.WORKFLOW_STRICT_MODE = "true";
    const result = resolveWorkflowExecutionMode(DUPLICATE_STAGES);
    assert.notEqual(result.mode, "strict");
    process.env.WORKFLOW_STRICT_MODE = originalEnv;
  });

  it("includes human-readable reason in all cases", () => {
    const cases = [NO_STAGES, UNMAPPED_STAGES, DUPLICATE_STAGES, DEFAULT_STAGES];
    for (const stages of cases) {
      const result = resolveWorkflowExecutionMode(stages);
      assert.ok(result.reason && result.reason.length > 0, "reason should be non-empty");
    }
  });
});

// ── Tests: resolvedCurrentStage / resolvedTargetStage in result ─

describe("canTransition — resolvedStages in result", () => {
  it("populates resolvedCurrentStage and resolvedTargetStage on allowed transition", () => {
    const r = canTransition("pending", "confirmed", DEFAULT_STAGES, "soft");
    assert.equal(r.resolvedCurrentStage?.mappedStatus, "pending");
    assert.equal(r.resolvedTargetStage?.mappedStatus, "confirmed");
  });

  it("resolvedCurrentStage is null when fromStatus not in stages", () => {
    const r = canTransition("in_progress", "completed", DEFAULT_STAGES, "soft");
    assert.equal(r.resolvedCurrentStage, null);
  });

  it("returns resolvedCurrentStage and resolvedTargetStage on blocked TRUE_TERMINAL", () => {
    const r = canTransition("cancelled", "pending", DEFAULT_STAGES, "soft");
    assert.equal(r.allowed, false);
    // cancelled IS in DEFAULT_STAGES
    assert.equal(r.resolvedCurrentStage?.mappedStatus, "cancelled");
  });
});
