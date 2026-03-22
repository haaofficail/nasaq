import { Hono } from "hono";
import { eq, and, desc, asc, gte, lte, or, count, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  roomTypes, roomUnits, hotelReservations, housekeepingLogs, hotelSeasonalPricing
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { z } from "zod";

const createRoomTypeSchema = z.object({
  name: z.string(),
  nameEn: z.string().optional(),
  description: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  maxOccupancy: z.number().int().default(2),
  maxAdults: z.number().int().optional(),
  maxChildren: z.number().int().optional(),
  bedConfiguration: z.string().optional().nullable(),
  areaSqm: z.string().optional().nullable(),
  pricePerNight: z.string(),
  weekendPricePerNight: z.string().optional().nullable(),
  amenities: z.array(z.string()).optional(),
  smokingAllowed: z.boolean().optional(),
  petsAllowed: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const createRoomUnitSchema = z.object({
  roomTypeId: z.string().uuid(),
  locationId: z.string().uuid().optional().nullable(),
  roomNumber: z.string(),
  floor: z.number().int().optional().nullable(),
  building: z.string().optional().nullable(),
  status: z.string().optional(),
  priceOverride: z.string().optional().nullable(),
  notesForStaff: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const createReservationSchema = z.object({
  roomTypeId: z.string().uuid().optional().nullable(),
  roomUnitId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  guestName: z.string(),
  guestPhone: z.string().optional().nullable(),
  guestEmail: z.string().optional().nullable(),
  guestIdNumber: z.string().optional().nullable(),
  guestNationality: z.string().optional().nullable(),
  adultCount: z.number().int().default(1),
  childrenCount: z.number().int().default(0),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  nights: z.number().int(),
  pricePerNight: z.string(),
  totalRoomCost: z.string(),
  extraCharges: z.string().optional(),
  discountAmount: z.string().optional(),
  taxAmount: z.string().optional(),
  totalAmount: z.string(),
  depositAmount: z.string().optional(),
  depositPaid: z.boolean().optional(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional().nullable(),
  source: z.string().optional(),
  extraServices: z.array(z.unknown()).optional(),
  specialRequests: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});

export const hotelRouter = new Hono();

// ── Room Types ────────────────────────────────────────────────

hotelRouter.get("/room-types", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(roomTypes)
    .where(eq(roomTypes.orgId, orgId))
    .orderBy(asc(roomTypes.sortOrder), asc(roomTypes.name));
  return c.json({ data: result });
});

hotelRouter.post("/room-types", async (c) => {
  const orgId = getOrgId(c);
  const body = createRoomTypeSchema.parse(await c.req.json());
  const [rt] = await db.insert(roomTypes).values({ orgId, ...body }).returning();
  return c.json({ data: rt }, 201);
});

hotelRouter.put("/room-types/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = createRoomTypeSchema.partial().parse(await c.req.json());
  const [updated] = await db.update(roomTypes)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(roomTypes.id, c.req.param("id")), eq(roomTypes.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "نوع الغرفة غير موجود" }, 404);
  return c.json({ data: updated });
});

hotelRouter.delete("/room-types/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(roomTypes)
    .where(and(eq(roomTypes.id, c.req.param("id")), eq(roomTypes.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "نوع الغرفة غير موجود" }, 404);
  return c.json({ data: deleted });
});

// ── Room Units ───────────────────────────────────────────────

hotelRouter.get("/rooms", async (c) => {
  const orgId = getOrgId(c);
  const roomTypeId = c.req.query("roomTypeId");
  const status = c.req.query("status");
  const conditions: any[] = [eq(roomUnits.orgId, orgId)];
  if (roomTypeId) conditions.push(eq(roomUnits.roomTypeId, roomTypeId));
  if (status) conditions.push(eq(roomUnits.status, status as any));
  const result = await db.select().from(roomUnits)
    .where(and(...conditions))
    .orderBy(asc(roomUnits.roomNumber));
  return c.json({ data: result });
});

hotelRouter.post("/rooms", async (c) => {
  const orgId = getOrgId(c);
  const body = createRoomUnitSchema.parse(await c.req.json());
  const [room] = await db.insert(roomUnits).values({ orgId, ...body }).returning();
  return c.json({ data: room }, 201);
});

hotelRouter.put("/rooms/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = createRoomUnitSchema.partial().parse(await c.req.json());
  const [updated] = await db.update(roomUnits)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(roomUnits.id, c.req.param("id")), eq(roomUnits.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "الغرفة غير موجودة" }, 404);
  return c.json({ data: updated });
});

hotelRouter.patch("/rooms/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const { status } = await c.req.json();
  const [updated] = await db.update(roomUnits)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(roomUnits.id, c.req.param("id")), eq(roomUnits.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "الغرفة غير موجودة" }, 404);
  return c.json({ data: updated });
});

hotelRouter.delete("/rooms/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(roomUnits)
    .where(and(eq(roomUnits.id, c.req.param("id")), eq(roomUnits.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "الغرفة غير موجودة" }, 404);
  return c.json({ data: deleted });
});

// ── Reservations ─────────────────────────────────────────────

hotelRouter.get("/reservations", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const checkIn = c.req.query("checkIn");
  const checkOut = c.req.query("checkOut");
  const conditions: any[] = [eq(hotelReservations.orgId, orgId)];
  if (status) conditions.push(eq(hotelReservations.status, status as any));
  if (checkIn) conditions.push(gte(hotelReservations.checkInDate, new Date(checkIn)));
  if (checkOut) conditions.push(lte(hotelReservations.checkOutDate, new Date(checkOut)));
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(hotelReservations).where(and(...conditions))
      .orderBy(desc(hotelReservations.checkInDate)).limit(limit).offset(offset),
    db.select({ total: count() }).from(hotelReservations).where(and(...conditions)),
  ]);
  return c.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

hotelRouter.get("/reservations/:id", async (c) => {
  const orgId = getOrgId(c);
  const [res] = await db.select().from(hotelReservations)
    .where(and(eq(hotelReservations.id, c.req.param("id")), eq(hotelReservations.orgId, orgId)));
  if (!res) return c.json({ error: "الحجز غير موجود" }, 404);
  return c.json({ data: res });
});

hotelRouter.post("/reservations", async (c) => {
  const orgId = getOrgId(c);
  const body = createReservationSchema.parse(await c.req.json());
  // Conflict check: same room unit on overlapping dates
  if (body.roomUnitId) {
    const conflict = await db.select({ id: hotelReservations.id }).from(hotelReservations)
      .where(and(
        eq(hotelReservations.orgId, orgId),
        eq(hotelReservations.roomUnitId, body.roomUnitId),
        sql`${hotelReservations.status} NOT IN ('cancelled', 'no_show', 'checked_out', 'completed')`,
        lte(hotelReservations.checkInDate, new Date(body.checkOutDate)),
        gte(hotelReservations.checkOutDate, new Date(body.checkInDate)),
      )).limit(1);
    if (conflict.length > 0) return c.json({ error: "الغرفة محجوزة في هذه الفترة" }, 409);
  }
  const [reservation] = await db.insert(hotelReservations).values({
    orgId,
    ...body,
    checkInDate: new Date(body.checkInDate),
    checkOutDate: new Date(body.checkOutDate),
  }).returning();
  // Mark room as reserved
  if (body.roomUnitId) {
    await db.update(roomUnits).set({ status: "reserved", updatedAt: new Date() })
      .where(eq(roomUnits.id, body.roomUnitId));
  }
  return c.json({ data: reservation }, 201);
});

hotelRouter.put("/reservations/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = createReservationSchema.partial().parse(await c.req.json());
  const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
  if (body.checkInDate) updates.checkInDate = new Date(body.checkInDate as string);
  if (body.checkOutDate) updates.checkOutDate = new Date(body.checkOutDate as string);
  const [updated] = await db.update(hotelReservations).set(updates)
    .where(and(eq(hotelReservations.id, c.req.param("id")), eq(hotelReservations.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "الحجز غير موجود" }, 404);
  return c.json({ data: updated });
});

// Check-in
hotelRouter.patch("/reservations/:id/checkin", async (c) => {
  const orgId = getOrgId(c);
  const [res] = await db.select().from(hotelReservations)
    .where(and(eq(hotelReservations.id, c.req.param("id")), eq(hotelReservations.orgId, orgId)));
  if (!res) return c.json({ error: "الحجز غير موجود" }, 404);
  const [updated] = await db.update(hotelReservations)
    .set({ status: "checked_in", actualCheckIn: new Date(), updatedAt: new Date() })
    .where(eq(hotelReservations.id, res.id)).returning();
  if (res.roomUnitId) {
    await db.update(roomUnits).set({ status: "occupied", updatedAt: new Date() })
      .where(eq(roomUnits.id, res.roomUnitId));
  }
  return c.json({ data: updated });
});

// Check-out
hotelRouter.patch("/reservations/:id/checkout", async (c) => {
  const orgId = getOrgId(c);
  const { extraCharges, extraChargesNotes } = await c.req.json().catch(() => ({}));
  const [res] = await db.select().from(hotelReservations)
    .where(and(eq(hotelReservations.id, c.req.param("id")), eq(hotelReservations.orgId, orgId)));
  if (!res) return c.json({ error: "الحجز غير موجود" }, 404);
  const updateData: Record<string, unknown> = {
    status: "checked_out", actualCheckOut: new Date(), updatedAt: new Date(),
  };
  if (extraCharges !== undefined) updateData.extraCharges = extraCharges;
  const [updated] = await db.update(hotelReservations).set(updateData)
    .where(eq(hotelReservations.id, res.id)).returning();
  if (res.roomUnitId) {
    // Mark for cleaning
    await db.update(roomUnits).set({ status: "cleaning", updatedAt: new Date() })
      .where(eq(roomUnits.id, res.roomUnitId));
    // Create housekeeping task
    await db.insert(housekeepingLogs).values({
      orgId, roomUnitId: res.roomUnitId, taskType: "cleaning",
      priority: "high", reservationId: res.id,
    });
  }
  return c.json({ data: updated });
});

// Cancel
hotelRouter.patch("/reservations/:id/cancel", async (c) => {
  const orgId = getOrgId(c);
  const { reason } = await c.req.json().catch(() => ({}));
  const [res] = await db.select().from(hotelReservations)
    .where(and(eq(hotelReservations.id, c.req.param("id")), eq(hotelReservations.orgId, orgId)));
  if (!res) return c.json({ error: "الحجز غير موجود" }, 404);
  const [updated] = await db.update(hotelReservations)
    .set({ status: "cancelled", internalNotes: reason, updatedAt: new Date() })
    .where(eq(hotelReservations.id, res.id)).returning();
  if (res.roomUnitId) {
    await db.update(roomUnits).set({ status: "available", updatedAt: new Date() })
      .where(eq(roomUnits.id, res.roomUnitId));
  }
  return c.json({ data: updated });
});

// ── Housekeeping ─────────────────────────────────────────────

hotelRouter.get("/housekeeping", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status");
  const conditions: any[] = [eq(housekeepingLogs.orgId, orgId)];
  if (status) conditions.push(eq(housekeepingLogs.status, status as any));
  const result = await db.select().from(housekeepingLogs)
    .where(and(...conditions))
    .orderBy(desc(housekeepingLogs.createdAt)).limit(100);
  return c.json({ data: result });
});

hotelRouter.post("/housekeeping", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const [log] = await db.insert(housekeepingLogs).values({ orgId, ...body }).returning();
  return c.json({ data: log }, 201);
});

hotelRouter.patch("/housekeeping/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const { status, notes } = await c.req.json();
  const updates: Record<string, unknown> = { status, updatedAt: new Date() };
  if (notes) updates.notes = notes;
  if (status === "in_progress") updates.startedAt = new Date();
  if (status === "completed" || status === "inspected") updates.completedAt = new Date();
  const [updated] = await db.update(housekeepingLogs).set(updates)
    .where(and(eq(housekeepingLogs.id, c.req.param("id")), eq(housekeepingLogs.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "المهمة غير موجودة" }, 404);
  // If inspected, mark room as available
  if (status === "inspected") {
    await db.update(roomUnits)
      .set({ status: "available", lastCleanedAt: new Date(), updatedAt: new Date() })
      .where(eq(roomUnits.id, updated.roomUnitId));
  }
  return c.json({ data: updated });
});

// ── Availability ──────────────────────────────────────────────

hotelRouter.get("/availability", async (c) => {
  const orgId = getOrgId(c);
  const checkIn = c.req.query("checkIn");
  const checkOut = c.req.query("checkOut");
  if (!checkIn || !checkOut) return c.json({ error: "checkIn و checkOut مطلوبان" }, 400);

  const allRooms = await db.select().from(roomUnits)
    .where(and(eq(roomUnits.orgId, orgId), eq(roomUnits.isActive, true)));

  const conflictingReservations = await db.select({ roomUnitId: hotelReservations.roomUnitId })
    .from(hotelReservations)
    .where(and(
      eq(hotelReservations.orgId, orgId),
      sql`${hotelReservations.status} NOT IN ('cancelled', 'no_show', 'checked_out', 'completed')`,
      lte(hotelReservations.checkInDate, new Date(checkOut)),
      gte(hotelReservations.checkOutDate, new Date(checkIn)),
    ));

  const bookedIds = new Set(conflictingReservations.map(r => r.roomUnitId).filter(Boolean));
  const available = allRooms.filter(r => !bookedIds.has(r.id) && r.status !== "out_of_service" && r.status !== "maintenance");
  const unavailable = allRooms.filter(r => bookedIds.has(r.id) || r.status === "out_of_service" || r.status === "maintenance");

  return c.json({ data: { available, unavailable, total: allRooms.length } });
});

// ── Dashboard Stats ───────────────────────────────────────────

hotelRouter.get("/dashboard-stats", async (c) => {
  const orgId = getOrgId(c);
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const [roomStats] = await db.select({
    total: count(roomUnits.id),
    available: sql<number>`COUNT(CASE WHEN ${roomUnits.status} = 'available' THEN 1 END)`,
    occupied: sql<number>`COUNT(CASE WHEN ${roomUnits.status} = 'occupied' THEN 1 END)`,
    cleaning: sql<number>`COUNT(CASE WHEN ${roomUnits.status} = 'cleaning' THEN 1 END)`,
    maintenance: sql<number>`COUNT(CASE WHEN ${roomUnits.status} = 'maintenance' THEN 1 END)`,
  }).from(roomUnits).where(and(eq(roomUnits.orgId, orgId), eq(roomUnits.isActive, true)));

  const [reservationStats] = await db.select({
    todayCheckIns: sql<number>`COUNT(CASE WHEN DATE(${hotelReservations.checkInDate}) = CURRENT_DATE THEN 1 END)`,
    todayCheckOuts: sql<number>`COUNT(CASE WHEN DATE(${hotelReservations.checkOutDate}) = CURRENT_DATE AND ${hotelReservations.status} = 'confirmed' THEN 1 END)`,
    pendingCount: sql<number>`COUNT(CASE WHEN ${hotelReservations.status} = 'pending' THEN 1 END)`,
    confirmedCount: sql<number>`COUNT(CASE WHEN ${hotelReservations.status} = 'confirmed' THEN 1 END)`,
    checkedInCount: sql<number>`COUNT(CASE WHEN ${hotelReservations.status} = 'checked_in' THEN 1 END)`,
  }).from(hotelReservations).where(eq(hotelReservations.orgId, orgId));

  const [pendingHousekeeping] = await db.select({ count: count() })
    .from(housekeepingLogs)
    .where(and(
      eq(housekeepingLogs.orgId, orgId),
      sql`${housekeepingLogs.status} IN ('pending', 'in_progress')`,
    ));

  return c.json({
    data: {
      rooms: roomStats,
      reservations: reservationStats,
      pendingHousekeeping: Number(pendingHousekeeping.count),
    },
  });
});

// ── Seasonal Pricing ─────────────────────────────────────────

hotelRouter.get("/seasonal-pricing", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(hotelSeasonalPricing)
    .where(eq(hotelSeasonalPricing.orgId, orgId))
    .orderBy(asc(hotelSeasonalPricing.startDate));
  return c.json({ data: result });
});

hotelRouter.post("/seasonal-pricing", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const [sp] = await db.insert(hotelSeasonalPricing).values({
    orgId, ...body,
    startDate: new Date(body.startDate),
    endDate: new Date(body.endDate),
  }).returning();
  return c.json({ data: sp }, 201);
});

hotelRouter.delete("/seasonal-pricing/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(hotelSeasonalPricing)
    .where(and(eq(hotelSeasonalPricing.id, c.req.param("id")), eq(hotelSeasonalPricing.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "التسعير غير موجود" }, 404);
  return c.json({ data: deleted });
});
