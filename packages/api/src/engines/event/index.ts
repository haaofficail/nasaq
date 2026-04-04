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
import { eventBookings } from "@nasaq/db/schema/canonical-bookings";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { calcVat } from "../shared/vat";
import { generateBookingNumber } from "../shared/booking-number";
import type { AuthUser } from "../../middleware/auth";

export const eventEngine = new Hono<{
  Variables: {
    user: AuthUser | null;
    orgId: string;
    requestId: string;
  }
}>();

// GET /engines/event/bookings
eventEngine.get("/bookings", async (c) => {
  const orgId = c.get("orgId") as string;
  const { from, to, status, eventType, page = "1" } = c.req.query();
  const limit = 20;
  const offset = (Number(page) - 1) * limit;

  const conditions = [eq(eventBookings.orgId, orgId)];
  if (status)    conditions.push(eq(eventBookings.status, status));
  if (eventType) conditions.push(eq(eventBookings.eventType, eventType));
  if (from)      conditions.push(gte(eventBookings.eventDate, from));
  if (to)        conditions.push(lte(eventBookings.eventDate, to));

  const rows = await db
    .select()
    .from(eventBookings)
    .where(and(...conditions))
    .orderBy(desc(eventBookings.eventDate))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows });
});

// POST /engines/event/bookings
eventEngine.post("/bookings", async (c) => {
  const orgId = c.get("orgId") as string;
  const userId = c.get("user")?.id ?? null;
  const body = await c.req.json();

  const { base, vat, total } = calcVat(Number(body.subtotal ?? 0), body.vatInclusive ?? true);
  const depositAmount = body.depositAmount ?? total * 0.3; // 30% default deposit
  const balanceDue    = total - Number(body.paidAmount ?? 0);

  const bookingNumber = generateBookingNumber("event");

  const [booking] = await db
    .insert(eventBookings)
    .values({
      orgId,
      customerId:      body.customerId,
      bookingNumber,
      status:          "pending",
      paymentStatus:   "pending",
      eventType:       body.eventType,
      eventName:       body.eventName,
      eventDate:       body.eventDate,
      eventStart:      body.eventStart ? new Date(body.eventStart) : undefined,
      eventEnd:        body.eventEnd   ? new Date(body.eventEnd)   : undefined,
      setupAt:         body.setupAt    ? new Date(body.setupAt)    : undefined,
      teardownAt:      body.teardownAt ? new Date(body.teardownAt) : undefined,
      locationId:      body.locationId,
      customLocation:  body.customLocation,
      locationNotes:   body.locationNotes,
      guestCount:      body.guestCount,
      packageId:       body.packageId,
      packageSnapshot: body.packageSnapshot,
      subtotal:        String(base),
      vatAmount:       String(vat),
      totalAmount:     String(total),
      depositAmount:   String(depositAmount),
      paidAmount:      "0",
      balanceDue:      String(balanceDue),
      assignedUserId:  body.assignedUserId ?? userId,
      source:          body.source ?? "dashboard",
      customerNotes:   body.customerNotes,
      internalNotes:   body.internalNotes,
      questionAnswers: body.questionAnswers ?? [],
    })
    .returning();

  return c.json({ data: booking }, 201);
});

// PATCH /engines/event/bookings/:id/status
eventEngine.patch("/bookings/:id/status", async (c) => {
  const orgId = c.get("orgId") as string;
  const { id } = c.req.param();
  const { status, reason } = await c.req.json();

  const VALID = ["confirmed", "deposit_paid", "in_progress", "completed", "cancelled"];
  if (!VALID.includes(status)) return c.json({ error: "Invalid status" }, 400);

  const [updated] = await db
    .update(eventBookings)
    .set({
      status,
      ...(status === "cancelled" ? {
        cancelledAt: new Date(),
        cancellationReason: reason,
      } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(eventBookings.id, id), eq(eventBookings.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});
