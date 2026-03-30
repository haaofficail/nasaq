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
import { appointmentBookings } from "@nasaq/db/schema/canonical-bookings";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { calcVat } from "../shared/vat";
import { generateBookingNumber } from "../shared/booking-number";
import type { AuthUser } from "../../middleware/auth";

export const appointmentEngine = new Hono<{
  Variables: {
    user: AuthUser | null;
    orgId: string;
    requestId: string;
  }
}>();

// GET /engines/appointment/bookings
appointmentEngine.get("/bookings", async (c) => {
  const orgId = c.get("orgId") as string;
  const { from, to, status, page = "1" } = c.req.query();
  const limit = 20;
  const offset = (Number(page) - 1) * limit;

  const conditions = [eq(appointmentBookings.orgId, orgId)];
  if (status) conditions.push(eq(appointmentBookings.status, status));
  if (from)   conditions.push(gte(appointmentBookings.startAt, new Date(from)));
  if (to)     conditions.push(lte(appointmentBookings.startAt, new Date(to)));

  const rows = await db
    .select()
    .from(appointmentBookings)
    .where(and(...conditions))
    .orderBy(desc(appointmentBookings.startAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows });
});

// POST /engines/appointment/bookings
appointmentEngine.post("/bookings", async (c) => {
  const orgId = c.get("orgId") as string;
  const userId = c.get("user")?.id ?? null;
  const body = await c.req.json();

  const { base, vat, total } = calcVat(
    Number(body.subtotal ?? 0),
    body.vatInclusive ?? true
  );

  // Sequence: count existing bookings this year for this org
  const year = new Date().getFullYear();
  const countResult = await db.execute(
    sql`SELECT COUNT(*)::text AS count FROM appointment_bookings WHERE org_id = ${orgId} AND EXTRACT(YEAR FROM created_at) = ${year}`
  );
  const count = (countResult.rows[0] as { count: string })?.count ?? "0";
  const bookingNumber = generateBookingNumber("appointment", Number(count) + 1);

  const [booking] = await db
    .insert(appointmentBookings)
    .values({
      orgId,
      customerId:      body.customerId,
      bookingNumber,
      status:          "pending",
      paymentStatus:   "pending",
      startAt:         new Date(body.startAt),
      endAt:           body.endAt ? new Date(body.endAt) : undefined,
      durationMinutes: body.durationMinutes,
      locationId:      body.locationId,
      assignedUserId:  body.assignedUserId ?? userId,
      subtotal:        String(base),
      vatAmount:       String(vat),
      totalAmount:     String(total),
      paidAmount:      "0",
      source:          body.source ?? "dashboard",
      customerNotes:   body.customerNotes,
      internalNotes:   body.internalNotes,
      questionAnswers: body.questionAnswers ?? [],
    })
    .returning();

  return c.json({ data: booking }, 201);
});

// PATCH /engines/appointment/bookings/:id/status
appointmentEngine.patch("/bookings/:id/status", async (c) => {
  const orgId = c.get("orgId") as string;
  const { id } = c.req.param();
  const { status, reason } = await c.req.json();

  const VALID_STATUSES = [
    "confirmed", "in_progress", "completed",
    "cancelled", "no_show", "reviewed"
  ];
  if (!VALID_STATUSES.includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const [updated] = await db
    .update(appointmentBookings)
    .set({
      status,
      ...(status === "cancelled" ? {
        cancelledAt: new Date(),
        cancellationReason: reason,
      } : {}),
      updatedAt: new Date(),
    })
    .where(and(
      eq(appointmentBookings.id, id),
      eq(appointmentBookings.orgId, orgId)
    ))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// GET /engines/appointment/bookings/:id
appointmentEngine.get("/bookings/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const { id } = c.req.param();

  const [booking] = await db
    .select()
    .from(appointmentBookings)
    .where(and(
      eq(appointmentBookings.id, id),
      eq(appointmentBookings.orgId, orgId)
    ));

  if (!booking) return c.json({ error: "Not found" }, 404);
  return c.json({ data: booking });
});
