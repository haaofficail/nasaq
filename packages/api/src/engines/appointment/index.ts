/**
 * Appointment Engine
 *
 * Owns: appointment_bookings, service_definitions
 * Business types: salon, barber, spa, fitness, photography, maintenance, workshop
 *
 * Rules:
 * - All writes go to appointment_bookings (NOT bookings legacy table)
 * - Uses shared/vat.ts for all price calculations
 * - Uses shared/booking-number.ts for number generation
 * - Fires booking events via shared/notifications
 */

import { Hono } from "hono";
import { db } from "@nasaq/db/client";
import { appointmentBookings, bookingRecords } from "@nasaq/db/schema/canonical-bookings";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import type { AuthUser } from "../../middleware/auth";

export const appointmentEngine = new Hono<{
  Variables: {
    user: AuthUser | null;
    orgId: string;
    requestId: string;
  }
}>();

function mergeAppointmentBooking(row: {
  appointmentBooking: typeof appointmentBookings.$inferSelect;
  bookingRecord: typeof bookingRecords.$inferSelect;
}) {
  return {
    ...row.appointmentBooking,
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

// GET /engines/appointment/bookings
appointmentEngine.get("/bookings", async (c) => {
  const orgId = c.get("orgId") as string;
  const { from, to, status, page = "1" } = c.req.query();
  const limit = 20;
  const offset = (Number(page) - 1) * limit;

  const conditions = [eq(appointmentBookings.orgId, orgId)];
  if (status) conditions.push(eq(bookingRecords.status, status));
  if (from)   conditions.push(gte(appointmentBookings.startAt, new Date(from)));
  if (to)     conditions.push(lte(appointmentBookings.startAt, new Date(to)));

  const rows = await db
    .select({
      appointmentBooking: appointmentBookings,
      bookingRecord: bookingRecords,
    })
    .from(appointmentBookings)
    .innerJoin(bookingRecords, and(
      eq(appointmentBookings.bookingRecordId, bookingRecords.id),
      eq(bookingRecords.orgId, orgId)
    ))
    .where(and(...conditions))
    .orderBy(desc(appointmentBookings.startAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows.map(mergeAppointmentBooking) });
});

// GET /engines/appointment/bookings/:id
appointmentEngine.get("/bookings/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const { id } = c.req.param();

  const [booking] = await db
    .select({
      appointmentBooking: appointmentBookings,
      bookingRecord: bookingRecords,
    })
    .from(appointmentBookings)
    .innerJoin(bookingRecords, and(
      eq(appointmentBookings.bookingRecordId, bookingRecords.id),
      eq(bookingRecords.orgId, orgId)
    ))
    .where(and(
      eq(appointmentBookings.id, id),
      eq(appointmentBookings.orgId, orgId)
    ));

  if (!booking) return c.json({ error: "Not found" }, 404);
  return c.json({ data: mergeAppointmentBooking(booking) });
});
