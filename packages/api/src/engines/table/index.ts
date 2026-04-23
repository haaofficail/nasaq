/**
 * Table Engine
 *
 * Owns: table_reservations
 * Business types: restaurant, cafe
 *
 * Rules:
 * - No double booking same table at same time
 * - Covers cannot exceed table capacity
 * - Walk-in support (no customer_id required)
 */

import { Hono } from "hono";
import { db } from "@nasaq/db/client";
import { bookingRecords, tableReservations } from "@nasaq/db/schema/canonical-bookings";
import { eq, and, gte, lte, desc, or } from "drizzle-orm";
import type { AuthUser } from "../../middleware/auth";

export const tableEngine = new Hono<{
  Variables: {
    user: AuthUser | null;
    orgId: string;
    requestId: string;
  }
}>();

function mergeTableReservation(row: {
  tableReservation: typeof tableReservations.$inferSelect;
  bookingRecord: typeof bookingRecords.$inferSelect;
}) {
  return {
    ...row.tableReservation,
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

// GET /engines/table/reservations
tableEngine.get("/reservations", async (c) => {
  const orgId = c.get("orgId") as string;
  const { date, status, page = "1" } = c.req.query();
  const limit = 50;
  const offset = (Number(page) - 1) * limit;

  const conditions = [eq(tableReservations.orgId, orgId)];
  if (status) conditions.push(eq(bookingRecords.status, status));
  if (date) {
    const day = new Date(date);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    conditions.push(gte(tableReservations.reservedAt, day));
    conditions.push(lte(tableReservations.reservedAt, next));
  }

  const rows = await db
    .select({
      tableReservation: tableReservations,
      bookingRecord: bookingRecords,
    })
    .from(tableReservations)
    .innerJoin(bookingRecords, and(
      eq(tableReservations.bookingRecordId, bookingRecords.id),
      eq(bookingRecords.orgId, orgId)
    ))
    .where(and(...conditions))
    .orderBy(desc(tableReservations.reservedAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows.map(mergeTableReservation) });
});
