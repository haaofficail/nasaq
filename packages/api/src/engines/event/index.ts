/**
 * Event Engine
 *
 * Owns: event_bookings
 * Business types: events, event_organizer, photography (for events)
 *
 * Rules:
 * - Full event lifecycle: inquiry → confirmed → deposit → execution → completed
 * - Package snapshots are frozen at booking time
 * - Multi-payment support (deposit + balance)
 */

import { Hono } from "hono";
import { db } from "@nasaq/db/client";
import { bookingRecords, eventBookings } from "@nasaq/db/schema/canonical-bookings";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import type { AuthUser } from "../../middleware/auth";

export const eventEngine = new Hono<{
  Variables: {
    user: AuthUser | null;
    orgId: string;
    requestId: string;
  }
}>();

function mergeEventBooking(row: {
  eventBooking: typeof eventBookings.$inferSelect;
  bookingRecord: typeof bookingRecords.$inferSelect;
}) {
  return {
    ...row.eventBooking,
    status: row.bookingRecord.status,
    paymentStatus: row.bookingRecord.paymentStatus,
    subtotal: row.bookingRecord.subtotal,
    discountAmount: row.bookingRecord.discountAmount,
    vatAmount: row.bookingRecord.vatAmount,
    totalAmount: row.bookingRecord.totalAmount,
    depositAmount: row.bookingRecord.depositAmount,
    paidAmount: row.bookingRecord.paidAmount,
    balanceDue: row.bookingRecord.balanceDue,
    customerNotes: row.bookingRecord.customerNotes,
    internalNotes: row.bookingRecord.internalNotes,
    cancelledAt: row.bookingRecord.cancelledAt,
    cancellationReason: row.bookingRecord.cancellationReason,
  };
}

// GET /engines/event/bookings
eventEngine.get("/bookings", async (c) => {
  const orgId = c.get("orgId") as string;
  const { from, to, status, eventType, page = "1" } = c.req.query();
  const limit = 20;
  const offset = (Number(page) - 1) * limit;

  const conditions = [eq(eventBookings.orgId, orgId)];
  if (status)    conditions.push(eq(bookingRecords.status, status));
  if (eventType) conditions.push(eq(eventBookings.eventType, eventType));
  if (from)      conditions.push(gte(eventBookings.eventDate, from));
  if (to)        conditions.push(lte(eventBookings.eventDate, to));

  const rows = await db
    .select({
      eventBooking: eventBookings,
      bookingRecord: bookingRecords,
    })
    .from(eventBookings)
    .innerJoin(bookingRecords, and(
      eq(eventBookings.bookingRecordId, bookingRecords.id),
      eq(bookingRecords.orgId, orgId)
    ))
    .where(and(...conditions))
    .orderBy(desc(eventBookings.eventDate))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows.map(mergeEventBooking) });
});
