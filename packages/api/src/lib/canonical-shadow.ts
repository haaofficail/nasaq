/**
 * canonical-shadow.ts
 *
 * دوال الكتابة الظلية (shadow write) على الجداول canonical.
 * مشتركة بين route handlers والـ jobs.
 *
 * الدوال:
 *   shadowWriteBookingOnCreate  — يرحّل حجز legacy إلى canonical بعد إنشائه
 *   shadowWriteBookingStatus    — يحدّث حالة booking_records + يُدرج timeline event
 */

import { eq, and, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  bookings, bookingItems, bookingItemAddons, bookingEvents,
  bookingAssignments, bookingCommissions, bookingConsumptions, payments,
  bookingRecords, bookingLines, bookingLineAddons, bookingTimelineEvents,
  bookingRecordAssignments, bookingRecordCommissions,
  bookingRecordConsumptions, bookingPaymentLinks,
} from "@nasaq/db/schema";
import { mapLegacyBookingAggregateToCanonical } from "./bookings-mapping";
import { log } from "./logger";

const CANONICAL_STATUS_MAP: Record<string, string> = {
  pending:          "pending",
  confirmed:        "confirmed",
  deposit_paid:     "confirmed",
  fully_confirmed:  "confirmed",
  preparing:        "in_progress",
  in_progress:      "in_progress",
  completed:        "completed",
  reviewed:         "completed",
  cancelled:        "cancelled",
  no_show:          "no_show",
};

// ─── shadowWriteBookingOnCreate ───────────────────────────────────────────────

export async function shadowWriteBookingOnCreate(params: {
  orgId:     string;
  bookingId: string;
  requestId: string;
}): Promise<void> {
  const startedAt = Date.now();
  const { orgId, bookingId, requestId } = params;

  // idempotency: skip if already mirrored
  const [existing] = await db
    .select({ id: bookingRecords.id })
    .from(bookingRecords)
    .where(and(eq(bookingRecords.orgId, orgId), eq(bookingRecords.bookingRef, bookingId)))
    .limit(1);

  if (existing) {
    log.info({ orgId, bookingId, requestId, canonicalId: existing.id },
      "[canonical-shadow] create skipped (already mirrored)");
    return;
  }

  const [booking, items, eventsRows, assignmentsRows, commissionsRows, consumptionsRows, paymentsRows] =
    await Promise.all([
      db.select().from(bookings)
        .where(and(eq(bookings.id, bookingId), eq(bookings.orgId, orgId)))
        .then(rows => rows[0] ?? null),
      db.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId)),
      db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, bookingId)),
      db.select().from(bookingAssignments).where(eq(bookingAssignments.bookingId, bookingId)),
      db.select().from(bookingCommissions).where(eq(bookingCommissions.bookingId, bookingId)),
      db.select().from(bookingConsumptions).where(eq(bookingConsumptions.bookingId, bookingId)),
      db.select().from(payments).where(eq(payments.bookingId, bookingId)),
    ]);

  if (!booking) {
    log.warn({ orgId, bookingId, requestId }, "[canonical-shadow] create skipped (legacy not found)");
    return;
  }

  if (!booking.customerId) {
    log.warn({ orgId, bookingId, requestId }, "[canonical-shadow] create skipped (no customerId)");
    return;
  }

  const addonsRows = items.length > 0
    ? await db.select().from(bookingItemAddons)
        .where(inArray(bookingItemAddons.bookingItemId, items.map(i => i.id)))
    : [];

  const payload = mapLegacyBookingAggregateToCanonical({
    booking, items, addons: addonsRows, events: eventsRows,
    assignments: assignmentsRows, commissions: commissionsRows,
    consumptions: consumptionsRows, payments: paymentsRows,
  });

  await db.transaction(async (tx) => {
    const [record] = await tx.insert(bookingRecords)
      .values(payload.booking_records as any)
      .returning({ id: bookingRecords.id });

    const lineMap = new Map<string, string>();
    for (const line of payload.booking_lines) {
      const [inserted] = await tx.insert(bookingLines)
        .values({ ...line.row, bookingRecordId: record.id } as any)
        .returning({ id: bookingLines.id });
      lineMap.set(line.legacyBookingItemId, inserted.id);
    }

    if (payload.booking_line_addons.length > 0) {
      const rows = payload.booking_line_addons
        .map(a => {
          const bookingLineId = lineMap.get(a.legacyBookingItemId);
          return bookingLineId ? { ...a.row, bookingLineId } : null;
        })
        .filter((r): r is NonNullable<typeof r> => Boolean(r));
      if (rows.length > 0) await tx.insert(bookingLineAddons).values(rows as any);
    }

    if (payload.booking_timeline_events.length > 0) {
      await tx.insert(bookingTimelineEvents).values(
        payload.booking_timeline_events.map(e => ({ ...e, bookingRecordId: record.id })) as any,
      );
    }

    if (payload.booking_record_assignments.length > 0) {
      await tx.insert(bookingRecordAssignments).values(
        payload.booking_record_assignments.map(a => ({ ...a, bookingRecordId: record.id })) as any,
      );
    }

    if (payload.booking_record_commissions.length > 0) {
      await tx.insert(bookingRecordCommissions).values(
        payload.booking_record_commissions.map(c => ({
          ...c.row, bookingRecordId: record.id,
          bookingLineId: c.legacyBookingItemId ? (lineMap.get(c.legacyBookingItemId) ?? null) : null,
        })) as any,
      );
    }

    if (payload.booking_consumptions_canonical.length > 0) {
      await tx.insert(bookingRecordConsumptions).values(
        payload.booking_consumptions_canonical.map(c => ({
          ...c.row, bookingRecordId: record.id,
          bookingLineId: c.legacyBookingItemId ? (lineMap.get(c.legacyBookingItemId) ?? null) : null,
        })) as any,
      );
    }

    if (payload.booking_payment_links.length > 0) {
      await tx.insert(bookingPaymentLinks).values(
        payload.booking_payment_links.map(p => ({ ...p, bookingRecordId: record.id })) as any,
      );
    }
  });

  log.info({ orgId, bookingId, requestId, elapsedMs: Date.now() - startedAt },
    "[canonical-shadow] booking mirrored");
}

// ─── shadowWriteBookingStatus ─────────────────────────────────────────────────

export async function shadowWriteBookingStatus(params: {
  orgId:       string;
  bookingId:   string;
  userId:      string | null;
  fromStatus:  string;
  newStatus:   string;
  reason?:     string;
}): Promise<void> {
  const { orgId, bookingId, userId, fromStatus, newStatus, reason } = params;

  const canonicalStatus = CANONICAL_STATUS_MAP[newStatus] ?? newStatus;

  const statusUpdates: Record<string, unknown> = {
    status:    canonicalStatus,
    updatedAt: new Date(),
  };
  if (newStatus === "cancelled") {
    statusUpdates.cancelledAt        = new Date();
    statusUpdates.cancellationReason = reason ?? null;
  }

  const [canonicalRow] = await db.update(bookingRecords)
    .set(statusUpdates as any)
    .where(eq(bookingRecords.bookingRef, bookingId))
    .returning({ id: bookingRecords.id });

  if (!canonicalRow?.id) return; // booking pre-dates shadow write

  await db.insert(bookingTimelineEvents).values({
    orgId,
    bookingRecordId: canonicalRow.id,
    userId:          userId ?? null,
    eventType:       "status_changed",
    fromStatus,
    toStatus:        canonicalStatus,
    metadata:        (reason ? { reason } : {}) as any,
  });

  log.info({ orgId, bookingId, fromStatus, newStatus: canonicalStatus },
    "[canonical-shadow] status synced");
}
