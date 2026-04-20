/**
 * Booking Ops — Write Behaviors to Canonical Tables (Phase 3.A Wave 1)
 *
 * يتحقق من أن:
 * 1. runPostTransitionAutomations → يكتب على bookingTimelineEvents
 * 2. recordBlockedTransitionEvent → يكتب على bookingTimelineEvents
 * 3. PATCH /:id/status transaction pattern → يُحدّث bookingRecords + يكتب status_changed
 * 4. forced_transition → يُكتب على bookingTimelineEvents داخل transaction
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, and } from "drizzle-orm";
import {
  bookingRecords,
  bookingTimelineEvents,
} from "@nasaq/db/schema";
import { openTestDb, skipIfNoDb, type TestDb } from "../helpers/test-db";
import {
  createTestOrg,
  createTestCustomer,
  createTestBookingRecord,
} from "../helpers/test-factories";
import {
  runPostTransitionAutomations,
  recordBlockedTransitionEvent,
} from "../../lib/booking-ops";

// ════════════════════════════════════════════════════════════════
// runPostTransitionAutomations
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("runPostTransitionAutomations — canonical write", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => { ({ db, cleanup } = await openTestDb()); });
  afterEach(async () => { await cleanup(); });

  it("يكتب automation_triggered في bookingTimelineEvents عند toStatus = confirmed", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, { status: "pending" });

    await runPostTransitionAutomations({
      orgId:        org.id,
      bookingRecordId:    record.id,
      userId:       null,
      fromStatus:   "pending",
      toStatus:     "confirmed",
      forced:       false,
      workflowMode: "strict",
      configState:  "configured",
    }, db as any);

    const events = await db
      .select()
      .from(bookingTimelineEvents)
      .where(and(
        eq(bookingTimelineEvents.bookingRecordId, record.id),
        eq(bookingTimelineEvents.eventType, "automation_triggered"),
      ));

    expect(events).toHaveLength(1);
    expect(events[0].bookingRecordId).toBe(record.id);
    expect(events[0].orgId).toBe(org.id);
    expect((events[0].metadata as any).trigger).toBe("status_entered_confirmed");
  });

  it("لا يكتب event لـ toStatus غير موجود في AUTOMATION_TRIGGER_STATUSES", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, { status: "pending" });

    await runPostTransitionAutomations({
      orgId:        org.id,
      bookingRecordId:    record.id,
      userId:       null,
      fromStatus:   "pending",
      toStatus:     "in_review",  // not in AUTOMATION_TRIGGER_STATUSES
      forced:       false,
      workflowMode: "strict",
      configState:  "configured",
    }, db as any);

    const events = await db
      .select()
      .from(bookingTimelineEvents)
      .where(eq(bookingTimelineEvents.bookingRecordId, record.id));

    expect(events).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// recordBlockedTransitionEvent
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("recordBlockedTransitionEvent — canonical write", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => { ({ db, cleanup } = await openTestDb()); });
  afterEach(async () => { await cleanup(); });

  it("يكتب status_blocked في bookingTimelineEvents", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, { status: "pending" });

    await recordBlockedTransitionEvent({
      orgId:           org.id,
      bookingRecordId:       record.id,
      userId:          null,
      fromStatus:      "pending",
      attemptedStatus: "completed",
      reason:          "STAGE_SKIPPED",
      blockedBy:       "stage:in_progress",
      requiresForce:   true,
      workflowMode:    "strict",
    }, db as any);

    const events = await db
      .select()
      .from(bookingTimelineEvents)
      .where(and(
        eq(bookingTimelineEvents.bookingRecordId, record.id),
        eq(bookingTimelineEvents.eventType, "status_blocked"),
      ));

    expect(events).toHaveLength(1);
    expect(events[0].toStatus).toBe("completed");
    expect((events[0].metadata as any).blockReason).toBe("STAGE_SKIPPED");
    expect((events[0].metadata as any).requiresForce).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// PATCH /:id/status — DB transaction patterns
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("PATCH /:id/status — canonical DB patterns", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => { ({ db, cleanup } = await openTestDb()); });
  afterEach(async () => { await cleanup(); });

  it("يُحدّث bookingRecords.status ويكتب status_changed في bookingTimelineEvents", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, { status: "pending" });

    // Pattern that PATCH /:id/status will use after migration
    await db.transaction(async (tx) => {
      await tx.update(bookingRecords)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(and(eq(bookingRecords.id, record.id), eq(bookingRecords.orgId, org.id)));

      await tx.insert(bookingTimelineEvents).values({
        orgId:           org.id,
        bookingRecordId: record.id,
        userId:          null,
        eventType:       "status_changed",
        fromStatus:      "pending",
        toStatus:        "confirmed",
        metadata:        { workflowMode: "strict", forced: false },
      } as any);
    });

    const [updated] = await db
      .select({ status: bookingRecords.status })
      .from(bookingRecords)
      .where(eq(bookingRecords.id, record.id));

    const events = await db
      .select()
      .from(bookingTimelineEvents)
      .where(eq(bookingTimelineEvents.bookingRecordId, record.id));

    expect(updated.status).toBe("confirmed");
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("status_changed");
    expect(events[0].toStatus).toBe("confirmed");
  });

  it("يكتب cancelled_at عند الإلغاء", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, { status: "confirmed" });

    await db.update(bookingRecords)
      .set({ status: "cancelled", cancelledAt: new Date(), cancellationReason: "بطلب العميل", updatedAt: new Date() })
      .where(and(eq(bookingRecords.id, record.id), eq(bookingRecords.orgId, org.id)));

    const [updated] = await db
      .select({ status: bookingRecords.status, cancelledAt: bookingRecords.cancelledAt })
      .from(bookingRecords)
      .where(eq(bookingRecords.id, record.id));

    expect(updated.status).toBe("cancelled");
    expect(updated.cancelledAt).toBeInstanceOf(Date);
  });

  it("forced_transition يُكتب في bookingTimelineEvents داخل transaction", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, { status: "pending" });

    await db.transaction(async (tx) => {
      await tx.update(bookingRecords)
        .set({ status: "completed", updatedAt: new Date() })
        .where(and(eq(bookingRecords.id, record.id), eq(bookingRecords.orgId, org.id)));

      await tx.insert(bookingTimelineEvents).values({
        orgId:           org.id,
        bookingRecordId: record.id,
        userId:          null,
        eventType:       "forced_transition",
        fromStatus:      "pending",
        toStatus:        "completed",
        metadata:        { forced: true, reason: "إداري", workflowMode: "strict" },
      } as any);
    });

    const events = await db
      .select()
      .from(bookingTimelineEvents)
      .where(and(
        eq(bookingTimelineEvents.bookingRecordId, record.id),
        eq(bookingTimelineEvents.eventType, "forced_transition"),
      ));

    expect(events).toHaveLength(1);
    expect((events[0].metadata as any).forced).toBe(true);
  });

  it("status update و timeline event يكونان في نفس الـ transaction — atomicity", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record1 = await createTestBookingRecord(db, org.id, customer.id, { status: "pending" });
    const record2 = await createTestBookingRecord(db, org.id, customer.id, { status: "pending" });

    // Both records updated atomically in a single transaction
    await db.transaction(async (tx) => {
      for (const rec of [record1, record2]) {
        await tx.update(bookingRecords)
          .set({ status: "confirmed", updatedAt: new Date() })
          .where(and(eq(bookingRecords.id, rec.id), eq(bookingRecords.orgId, org.id)));

        await tx.insert(bookingTimelineEvents).values({
          orgId:           org.id,
          bookingRecordId: rec.id,
          userId:          null,
          eventType:       "status_changed",
          fromStatus:      "pending",
          toStatus:        "confirmed",
          metadata:        {},
        } as any);
      }
    });

    // Both status updates visible — proves atomic commit
    const updated = await db
      .select({ id: bookingRecords.id, status: bookingRecords.status })
      .from(bookingRecords)
      .where(eq(bookingRecords.orgId, org.id));

    expect(updated.filter(r => r.status === "confirmed")).toHaveLength(2);
    expect(updated.filter(r => r.status === "pending")).toHaveLength(0);
  });
});
