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
import { db } from "../../db";
import { stayBookings, rentalUnitDefinitions } from "@nasaq/db/schema/canonical-bookings";
import { eq, and, gte, lte, desc, or } from "drizzle-orm";
import { calcVat } from "../shared/vat";
import { generateBookingNumber } from "../shared/booking-number";

export const stayEngine = new Hono();

// GET /engines/stay/bookings
stayEngine.get("/bookings", async (c) => {
  const { orgId } = c.get("session");
  const { from, to, status, stayType, page = "1" } = c.req.query();
  const limit = 20;
  const offset = (Number(page) - 1) * limit;

  const conditions = [eq(stayBookings.orgId, orgId)];
  if (status)   conditions.push(eq(stayBookings.status, status));
  if (stayType) conditions.push(eq(stayBookings.stayType, stayType));
  if (from)     conditions.push(gte(stayBookings.checkIn, new Date(from)));
  if (to)       conditions.push(lte(stayBookings.checkIn, new Date(to)));

  const rows = await db
    .select()
    .from(stayBookings)
    .where(and(...conditions))
    .orderBy(desc(stayBookings.checkIn))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows });
});

// POST /engines/stay/bookings
stayEngine.post("/bookings", async (c) => {
  const { orgId } = c.get("session");
  const body = await c.req.json();

  const checkIn  = new Date(body.checkIn);
  const checkOut = new Date(body.checkOut);

  if (checkOut <= checkIn) {
    return c.json({ error: "check_out must be after check_in" }, 400);
  }

  // Availability check — prevent double booking same unit
  if (body.unitId) {
    const conflict = await db
      .select({ id: stayBookings.id })
      .from(stayBookings)
      .where(and(
        eq(stayBookings.orgId, orgId),
        eq(stayBookings.unitId, body.unitId),
        or(
          and(
            lte(stayBookings.checkIn,  checkOut),
            gte(stayBookings.checkOut, checkIn)
          )
        )
      ))
      .limit(1);

    if (conflict.length > 0) {
      return c.json({ error: "Unit is not available for selected dates" }, 409);
    }
  }

  const { base, vat, total } = calcVat(Number(body.subtotal ?? 0), body.vatInclusive ?? true);

  const [[{ count }]] = await db.execute<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM stay_bookings
     WHERE org_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
    [orgId, new Date().getFullYear()]
  );
  const bookingNumber = generateBookingNumber("stay", Number(count) + 1);

  const [booking] = await db
    .insert(stayBookings)
    .values({
      orgId,
      customerId:     body.customerId,
      bookingNumber,
      stayType:       body.stayType ?? "hotel",
      unitId:         body.unitId,
      unitType:       body.unitType,
      unitSnapshot:   body.unitSnapshot,
      checkIn,
      checkOut,
      guestCount:     body.guestCount ?? 1,
      driverName:     body.driverName,
      driverLicense:  body.driverLicense,
      pickupLocation: body.pickupLocation,
      dropoffLocation: body.dropoffLocation,
      subtotal:       String(base),
      vatAmount:      String(vat),
      totalAmount:    String(total),
      depositAmount:  String(body.depositAmount ?? 0),
      paidAmount:     "0",
      source:         body.source ?? "dashboard",
      customerNotes:  body.customerNotes,
      internalNotes:  body.internalNotes,
    })
    .returning();

  return c.json({ data: booking }, 201);
});

// PATCH /engines/stay/bookings/:id/checkin
stayEngine.patch("/bookings/:id/checkin", async (c) => {
  const { orgId } = c.get("session");
  const { id } = c.req.param();

  const [updated] = await db
    .update(stayBookings)
    .set({ actualCheckIn: new Date(), status: "in_progress", updatedAt: new Date() })
    .where(and(eq(stayBookings.id, id), eq(stayBookings.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// PATCH /engines/stay/bookings/:id/checkout
stayEngine.patch("/bookings/:id/checkout", async (c) => {
  const { orgId } = c.get("session");
  const { id } = c.req.param();

  const [updated] = await db
    .update(stayBookings)
    .set({ actualCheckOut: new Date(), status: "completed", updatedAt: new Date() })
    .where(and(eq(stayBookings.id, id), eq(stayBookings.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// GET /engines/stay/units/availability
stayEngine.get("/units/availability", async (c) => {
  const { orgId } = c.get("session");
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
