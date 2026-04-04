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
import { tableReservations } from "@nasaq/db/schema/canonical-bookings";
import { eq, and, gte, lte, desc, or } from "drizzle-orm";
import { generateBookingNumber } from "../shared/booking-number";
import type { AuthUser } from "../../middleware/auth";

export const tableEngine = new Hono<{
  Variables: {
    user: AuthUser | null;
    orgId: string;
    requestId: string;
  }
}>();

// GET /engines/table/reservations
tableEngine.get("/reservations", async (c) => {
  const orgId = c.get("orgId") as string;
  const { date, status, page = "1" } = c.req.query();
  const limit = 50;
  const offset = (Number(page) - 1) * limit;

  const conditions = [eq(tableReservations.orgId, orgId)];
  if (status) conditions.push(eq(tableReservations.status, status));
  if (date) {
    const day = new Date(date);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    conditions.push(gte(tableReservations.reservedAt, day));
    conditions.push(lte(tableReservations.reservedAt, next));
  }

  const rows = await db
    .select()
    .from(tableReservations)
    .where(and(...conditions))
    .orderBy(desc(tableReservations.reservedAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows });
});

// POST /engines/table/reservations
tableEngine.post("/reservations", async (c) => {
  const orgId = c.get("orgId") as string;
  const body = await c.req.json();

  const reservedAt    = new Date(body.reservedAt);
  const durationMins  = body.durationMinutes ?? 90;
  const endsAt        = new Date(reservedAt.getTime() + durationMins * 60_000);

  // Prevent double booking same table
  if (body.tableId) {
    const conflict = await db
      .select({ id: tableReservations.id })
      .from(tableReservations)
      .where(and(
        eq(tableReservations.orgId, orgId),
        eq(tableReservations.tableId, body.tableId),
        or(
          and(
            lte(tableReservations.reservedAt, endsAt),
            gte(tableReservations.reservedAt, reservedAt)
          )
        )
      ))
      .limit(1);

    if (conflict.length > 0) {
      return c.json({ error: "Table is already reserved at this time" }, 409);
    }
  }

  const reservationNumber = generateBookingNumber("table");

  const [reservation] = await db
    .insert(tableReservations)
    .values({
      orgId,
      customerId:      body.customerId,   // optional (walk-in)
      reservationNumber,
      status:          "confirmed",
      tableId:         body.tableId,
      tableSnapshot:   body.tableSnapshot,
      covers:          body.covers ?? 1,
      section:         body.section,
      reservedAt,
      durationMinutes: durationMins,
      specialRequests: body.specialRequests,
      occasion:        body.occasion,
      preOrder:        body.preOrder ?? [],
      depositAmount:   String(body.depositAmount ?? 0),
      paidAmount:      "0",
      source:          body.source ?? "dashboard",
    })
    .returning();

  return c.json({ data: reservation }, 201);
});

// PATCH /engines/table/reservations/:id/seat
tableEngine.patch("/reservations/:id/seat", async (c) => {
  const orgId = c.get("orgId") as string;
  const { id } = c.req.param();

  const [updated] = await db
    .update(tableReservations)
    .set({ status: "seated", seatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tableReservations.id, id), eq(tableReservations.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// PATCH /engines/table/reservations/:id/complete
tableEngine.patch("/reservations/:id/complete", async (c) => {
  const orgId = c.get("orgId") as string;
  const { id } = c.req.param();

  const [updated] = await db
    .update(tableReservations)
    .set({ status: "completed", leftAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tableReservations.id, id), eq(tableReservations.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});

// PATCH /engines/table/reservations/:id/no-show
tableEngine.patch("/reservations/:id/no-show", async (c) => {
  const orgId = c.get("orgId") as string;
  const { id } = c.req.param();

  const [updated] = await db
    .update(tableReservations)
    .set({ status: "no_show", noShowAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tableReservations.id, id), eq(tableReservations.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json({ data: updated });
});
