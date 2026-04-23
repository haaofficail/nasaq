/**
 * Stay Engine
 *
 * Owns: stay_bookings, rental_unit_definitions
 * Business types: hotel, car_rental, daily_rental
 *
 * Rules:
 * - Manages unit availability (no double booking)
 * - Writes to stay_bookings only
 * - Unit blocking: check_in to check_out must not overlap for same unit_id
 */

import { Hono } from "hono";
import { db } from "@nasaq/db/client";
import { bookingRecords, stayBookings } from "@nasaq/db/schema/canonical-bookings";
import { rentalUnitDefinitions } from "@nasaq/db/schema/canonical-catalog";
import { eq, and, gte, lte, desc, or, sql } from "drizzle-orm";
import type { AuthUser } from "../../middleware/auth";

export const stayEngine = new Hono<{
  Variables: {
    user: AuthUser | null;
    orgId: string;
    requestId: string;
  }
}>();

function mergeStayBooking(row: {
  stayBooking: typeof stayBookings.$inferSelect;
  bookingRecord: typeof bookingRecords.$inferSelect;
}) {
  return {
    ...row.stayBooking,
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

// GET /engines/stay/bookings
stayEngine.get("/bookings", async (c) => {
  const orgId = c.get("orgId") as string;
  const { from, to, status, stayType, page = "1" } = c.req.query();
  const limit = 20;
  const offset = (Number(page) - 1) * limit;

  const conditions = [eq(stayBookings.orgId, orgId)];
  if (status)   conditions.push(eq(bookingRecords.status, status));
  if (stayType) conditions.push(eq(stayBookings.stayType, stayType));
  if (from)     conditions.push(gte(stayBookings.checkIn, new Date(from)));
  if (to)       conditions.push(lte(stayBookings.checkIn, new Date(to)));

  const rows = await db
    .select({
      stayBooking: stayBookings,
      bookingRecord: bookingRecords,
    })
    .from(stayBookings)
    .innerJoin(bookingRecords, and(
      eq(stayBookings.bookingRecordId, bookingRecords.id),
      eq(bookingRecords.orgId, orgId)
    ))
    .where(and(...conditions))
    .orderBy(desc(stayBookings.checkIn))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows.map(mergeStayBooking) });
});

// GET /engines/stay/units/availability
stayEngine.get("/units/availability", async (c) => {
  const orgId = c.get("orgId") as string;
  const { from, to, unitType } = c.req.query();

  if (!from || !to) return c.json({ error: "from and to required" }, 400);

  // Get all occupied units in this period
  const occupied = await db
    .select({ unitId: stayBookings.unitId })
    .from(stayBookings)
    .where(and(
      eq(stayBookings.orgId, orgId),
      or(
        and(
          lte(stayBookings.checkIn,  new Date(to)),
          gte(stayBookings.checkOut, new Date(from))
        )
      )
    ));

  const occupiedIds = occupied.map(r => r.unitId).filter(Boolean);

  return c.json({
    occupiedUnitIds: occupiedIds,
    period: { from, to },
  });
});
