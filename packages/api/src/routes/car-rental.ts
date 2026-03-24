import { Hono } from "hono";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import {
  vehicleCategories,
  vehicleUnits,
  carRentalReservations,
  vehicleInspections,
} from "@nasaq/db/schema";
import { eq, and, or, gte, lte, count, desc } from "drizzle-orm";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const carRentalRouter = new Hono();

// ============================================================
// VEHICLE CATEGORIES
// ============================================================

const categorySchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  pricePerDay: z.string(),
  pricePerWeek: z.string().optional(),
  pricePerMonth: z.string().optional(),
  currency: z.string().default("SAR"),
  depositAmount: z.string().optional(),
  minRentalDays: z.number().optional(),
  maxRentalDays: z.number().optional(),
  minDriverAge: z.number().optional(),
  mileageLimit: z.number().optional(),
  extraMileageRate: z.string().optional(),
  insuranceIncluded: z.boolean().optional(),
  fuelPolicy: z.string().optional(),
  features: z.array(z.string()).optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

carRentalRouter.get("/categories", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db
    .select()
    .from(vehicleCategories)
    .where(and(eq(vehicleCategories.orgId, orgId), eq(vehicleCategories.isActive, true)))
    .orderBy(vehicleCategories.sortOrder);
  return c.json({ data: rows });
});

carRentalRouter.post("/categories", async (c) => {
  const orgId = getOrgId(c);
  const body = categorySchema.parse(await c.req.json());
  const [row] = await db.insert(vehicleCategories).values({ ...body, orgId }).returning();
  return c.json({ data: row }, 201);
});

carRentalRouter.put("/categories/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = categorySchema.partial().parse(await c.req.json());
  const [row] = await db
    .update(vehicleCategories)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(vehicleCategories.id, c.req.param("id")), eq(vehicleCategories.orgId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: row });
});

carRentalRouter.delete("/categories/:id", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db
    .update(vehicleCategories)
    .set({ isActive: false })
    .where(and(eq(vehicleCategories.id, c.req.param("id")), eq(vehicleCategories.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "vehicle_category", resourceId: updated.id });
  return c.json({ success: true });
});

// ============================================================
// VEHICLE UNITS (FLEET)
// ============================================================

const vehicleSchema = z.object({
  categoryId: z.string().uuid(),
  locationId: z.string().uuid().optional().nullable(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  color: z.string().optional(),
  plateNumber: z.string().optional(),
  vin: z.string().optional(),
  mileage: z.number().optional(),
  insuranceExpiry: z.string().optional().nullable(),
  registrationExpiry: z.string().optional().nullable(),
  dailyRateOverride: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

carRentalRouter.get("/vehicles", async (c) => {
  const orgId = getOrgId(c);
  const categoryId = c.req.query("categoryId");
  const status = c.req.query("status");
  const conditions: any[] = [eq(vehicleUnits.orgId, orgId), eq(vehicleUnits.isActive, true)];
  if (categoryId) conditions.push(eq(vehicleUnits.categoryId, categoryId));
  if (status) conditions.push(eq(vehicleUnits.status, status as any));
  const rows = await db
    .select()
    .from(vehicleUnits)
    .where(and(...conditions))
    .orderBy(vehicleUnits.createdAt);
  return c.json({ data: rows });
});

carRentalRouter.get("/vehicles/:id", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db
    .select()
    .from(vehicleUnits)
    .where(and(eq(vehicleUnits.id, c.req.param("id")), eq(vehicleUnits.orgId, orgId)));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: row });
});

carRentalRouter.post("/vehicles", async (c) => {
  const orgId = getOrgId(c);
  const body = vehicleSchema.parse(await c.req.json());
  const { insuranceExpiry: ie, registrationExpiry: re, ...vehicleRest } = body;
  const [row] = await db.insert(vehicleUnits).values({
    ...vehicleRest,
    orgId,
    ...(ie !== undefined && { insuranceExpiry: ie ? new Date(ie) : null }),
    ...(re !== undefined && { registrationExpiry: re ? new Date(re) : null }),
  }).returning();
  return c.json({ data: row }, 201);
});

carRentalRouter.put("/vehicles/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = vehicleSchema.partial().parse(await c.req.json());
  const { insuranceExpiry, registrationExpiry, ...rest } = body;
  const [row] = await db
    .update(vehicleUnits)
    .set({
      ...rest,
      ...(insuranceExpiry !== undefined && { insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null }),
      ...(registrationExpiry !== undefined && { registrationExpiry: registrationExpiry ? new Date(registrationExpiry) : null }),
      updatedAt: new Date(),
    })
    .where(and(eq(vehicleUnits.id, c.req.param("id")), eq(vehicleUnits.orgId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: row });
});

carRentalRouter.patch("/vehicles/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const { status } = z
    .object({ status: z.enum(["available", "reserved", "rented", "maintenance", "inspection", "out_of_service"]) })
    .parse(await c.req.json());
  const [row] = await db
    .update(vehicleUnits)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(vehicleUnits.id, c.req.param("id")), eq(vehicleUnits.orgId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: row });
});

carRentalRouter.delete("/vehicles/:id", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db
    .update(vehicleUnits)
    .set({ isActive: false })
    .where(and(eq(vehicleUnits.id, c.req.param("id")), eq(vehicleUnits.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "vehicle", resourceId: updated.id });
  return c.json({ success: true });
});

// ============================================================
// AVAILABILITY CHECK
// ============================================================

carRentalRouter.get("/availability", async (c) => {
  const orgId = getOrgId(c);
  const pickupDate = c.req.query("pickupDate");
  const returnDate = c.req.query("returnDate");
  const categoryId = c.req.query("categoryId");
  if (!pickupDate || !returnDate) return c.json({ error: "pickupDate and returnDate required" }, 400);

  const pickup = new Date(pickupDate);
  const returnD = new Date(returnDate);

  const conflicting = await db
    .select({ vehicleUnitId: carRentalReservations.vehicleUnitId })
    .from(carRentalReservations)
    .where(
      and(
        eq(carRentalReservations.orgId, orgId),
        or(eq(carRentalReservations.status, "confirmed"), eq(carRentalReservations.status, "picked_up")),
        lte(carRentalReservations.pickupDate, returnD),
        gte(carRentalReservations.returnDate, pickup)
      )
    );

  const bookedIds = conflicting.map((r) => r.vehicleUnitId).filter(Boolean) as string[];
  const conditions: any[] = [eq(vehicleUnits.orgId, orgId), eq(vehicleUnits.isActive, true)];
  if (categoryId) conditions.push(eq(vehicleUnits.categoryId, categoryId));

  const all = await db.select().from(vehicleUnits).where(and(...conditions));
  const vehicles = all.map((v) => ({ ...v, available: !bookedIds.includes(v.id) && v.status === "available" }));
  return c.json({ data: vehicles });
});

// ============================================================
// RESERVATIONS
// ============================================================

const reservationSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  vehicleUnitId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  driverName: z.string().min(1),
  driverPhone: z.string().optional().nullable(),
  driverEmail: z.string().email().optional().nullable(),
  driverIdNumber: z.string().optional().nullable(),
  driverLicense: z.string().optional().nullable(),
  driverAge: z.number().optional().nullable(),
  pickupDate: z.string(),
  returnDate: z.string(),
  rentalDays: z.number(),
  pickupLocationId: z.string().uuid().optional().nullable(),
  returnLocationId: z.string().uuid().optional().nullable(),
  pickupLocationNote: z.string().optional().nullable(),
  returnLocationNote: z.string().optional().nullable(),
  dailyRate: z.string(),
  totalRentalCost: z.string(),
  depositAmount: z.string().optional(),
  extraCharges: z.string().optional(),
  discountAmount: z.string().optional(),
  taxAmount: z.string().optional(),
  totalAmount: z.string(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional().nullable(),
  addOns: z.array(z.any()).optional(),
  source: z.string().optional(),
  specialRequests: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});

carRentalRouter.get("/reservations", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status");
  const vehicleUnitId = c.req.query("vehicleUnitId");
  const page = parseInt(c.req.query("page") ?? "1");
  const limit = parseInt(c.req.query("limit") ?? "20");
  const offset = (page - 1) * limit;

  const conditions: any[] = [eq(carRentalReservations.orgId, orgId)];
  if (status) conditions.push(eq(carRentalReservations.status, status as any));
  if (vehicleUnitId) conditions.push(eq(carRentalReservations.vehicleUnitId, vehicleUnitId));

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(carRentalReservations)
      .where(and(...conditions))
      .orderBy(desc(carRentalReservations.pickupDate))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(carRentalReservations).where(and(...conditions)),
  ]);
  return c.json({ data: rows, total, page, limit });
});

carRentalRouter.get("/reservations/:id", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db
    .select()
    .from(carRentalReservations)
    .where(and(eq(carRentalReservations.id, c.req.param("id")), eq(carRentalReservations.orgId, orgId)));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: row });
});

carRentalRouter.post("/reservations", async (c) => {
  const orgId = getOrgId(c);
  const body = reservationSchema.parse(await c.req.json());
  const pickup = new Date(body.pickupDate);
  const returnD = new Date(body.returnDate);

  if (body.vehicleUnitId) {
    const conflict = await db
      .select({ id: carRentalReservations.id })
      .from(carRentalReservations)
      .where(
        and(
          eq(carRentalReservations.orgId, orgId),
          eq(carRentalReservations.vehicleUnitId, body.vehicleUnitId),
          or(eq(carRentalReservations.status, "confirmed"), eq(carRentalReservations.status, "picked_up")),
          lte(carRentalReservations.pickupDate, returnD),
          gte(carRentalReservations.returnDate, pickup)
        )
      )
      .limit(1);
    if (conflict.length > 0) return c.json({ error: "Vehicle already reserved for this period" }, 409);
  }

  const [row] = await db
    .insert(carRentalReservations)
    .values({ ...body, orgId, pickupDate: pickup, returnDate: returnD })
    .returning();

  if (body.vehicleUnitId) {
    await db
      .update(vehicleUnits)
      .set({ status: "reserved", updatedAt: new Date() })
      .where(eq(vehicleUnits.id, body.vehicleUnitId));
  }
  return c.json({ data: row }, 201);
});

carRentalRouter.put("/reservations/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = reservationSchema.partial().parse(await c.req.json());
  const { pickupDate, returnDate, ...rest } = body;
  const [row] = await db
    .update(carRentalReservations)
    .set({
      ...rest,
      ...(pickupDate !== undefined && { pickupDate: new Date(pickupDate) }),
      ...(returnDate !== undefined && { returnDate: new Date(returnDate) }),
      updatedAt: new Date(),
    })
    .where(and(eq(carRentalReservations.id, c.req.param("id")), eq(carRentalReservations.orgId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: row });
});

carRentalRouter.patch("/reservations/:id/pickup", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const [reservation] = await db
    .select()
    .from(carRentalReservations)
    .where(and(eq(carRentalReservations.id, id), eq(carRentalReservations.orgId, orgId)));
  if (!reservation) return c.json({ error: "Not found" }, 404);
  if (reservation.status !== "confirmed") return c.json({ error: "Must be confirmed before pickup" }, 400);

  const [updated] = await db
    .update(carRentalReservations)
    .set({ status: "picked_up", actualPickup: new Date(), updatedAt: new Date() })
    .where(eq(carRentalReservations.id, id))
    .returning();

  if (reservation.vehicleUnitId) {
    await db
      .update(vehicleUnits)
      .set({ status: "rented", updatedAt: new Date() })
      .where(eq(vehicleUnits.id, reservation.vehicleUnitId));
  }
  return c.json({ data: updated });
});

carRentalRouter.patch("/reservations/:id/return", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = z
    .object({
      returnMileage: z.number().optional().nullable(),
      extraCharges: z.string().optional().nullable(),
      extraChargesNotes: z.string().optional().nullable(),
      depositReturned: z.boolean().optional(),
      internalNotes: z.string().optional().nullable(),
    })
    .parse(await c.req.json());

  const [reservation] = await db
    .select()
    .from(carRentalReservations)
    .where(and(eq(carRentalReservations.id, id), eq(carRentalReservations.orgId, orgId)));
  if (!reservation) return c.json({ error: "Not found" }, 404);
  if (reservation.status !== "picked_up") return c.json({ error: "Must be in picked_up state" }, 400);

  const [updated] = await db
    .update(carRentalReservations)
    .set({
      status: "returned",
      actualReturn: new Date(),
      returnMileage: body.returnMileage ?? null,
      extraCharges: body.extraCharges ?? reservation.extraCharges,
      extraChargesNotes: body.extraChargesNotes ?? reservation.extraChargesNotes,
      depositReturned: body.depositReturned ?? reservation.depositReturned,
      internalNotes: body.internalNotes ?? reservation.internalNotes,
      updatedAt: new Date(),
    })
    .where(eq(carRentalReservations.id, id))
    .returning();

  if (reservation.vehicleUnitId) {
    await db.insert(vehicleInspections).values({
      orgId,
      vehicleUnitId: reservation.vehicleUnitId,
      reservationId: id,
      inspectionType: "post_rental",
    });
    await db
      .update(vehicleUnits)
      .set({ status: "inspection", updatedAt: new Date() })
      .where(eq(vehicleUnits.id, reservation.vehicleUnitId));
  }
  return c.json({ data: updated });
});

carRentalRouter.patch("/reservations/:id/cancel", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { reason } = z.object({ reason: z.string().optional() }).parse(await c.req.json());

  const [reservation] = await db
    .select()
    .from(carRentalReservations)
    .where(and(eq(carRentalReservations.id, id), eq(carRentalReservations.orgId, orgId)));
  if (!reservation) return c.json({ error: "Not found" }, 404);
  if (["returned", "completed", "cancelled"].includes(reservation.status)) {
    return c.json({ error: "Cannot cancel in current status" }, 400);
  }

  const [updated] = await db
    .update(carRentalReservations)
    .set({
      status: "cancelled",
      internalNotes: reason
        ? `${reservation.internalNotes ?? ""}\nCancelled: ${reason}`.trim()
        : reservation.internalNotes,
      updatedAt: new Date(),
    })
    .where(eq(carRentalReservations.id, id))
    .returning();

  if (reservation.vehicleUnitId) {
    await db
      .update(vehicleUnits)
      .set({ status: "available", updatedAt: new Date() })
      .where(eq(vehicleUnits.id, reservation.vehicleUnitId));
  }
  return c.json({ data: updated });
});

// ============================================================
// VEHICLE INSPECTIONS
// ============================================================

const inspectionSchema = z.object({
  vehicleUnitId: z.string().uuid(),
  reservationId: z.string().uuid().optional().nullable(),
  inspectionType: z.enum(["pre_rental", "post_rental", "routine", "damage"]),
  inspectedBy: z.string().uuid().optional().nullable(),
  mileageAtInspection: z.number().optional().nullable(),
  fuelLevel: z.string().optional().nullable(),
  exteriorCondition: z.string().optional(),
  interiorCondition: z.string().optional(),
  tiresCondition: z.string().optional(),
  hasDamage: z.boolean().optional(),
  damageDescription: z.string().optional().nullable(),
  damagePhotos: z.array(z.string()).optional(),
  damageChargeAmount: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  signature: z.string().optional().nullable(),
});

carRentalRouter.get("/inspections", async (c) => {
  const orgId = getOrgId(c);
  const vehicleUnitId = c.req.query("vehicleUnitId");
  const reservationId = c.req.query("reservationId");
  const conditions: any[] = [eq(vehicleInspections.orgId, orgId)];
  if (vehicleUnitId) conditions.push(eq(vehicleInspections.vehicleUnitId, vehicleUnitId));
  if (reservationId) conditions.push(eq(vehicleInspections.reservationId, reservationId));
  const rows = await db
    .select()
    .from(vehicleInspections)
    .where(and(...conditions))
    .orderBy(desc(vehicleInspections.inspectedAt));
  return c.json({ data: rows });
});

carRentalRouter.post("/inspections", async (c) => {
  const orgId = getOrgId(c);
  const body = inspectionSchema.parse(await c.req.json());
  const [row] = await db.insert(vehicleInspections).values({ ...body, orgId }).returning();

  if ((body.inspectionType === "post_rental" || body.inspectionType === "routine") && !body.hasDamage) {
    await db
      .update(vehicleUnits)
      .set({ status: "available", updatedAt: new Date() })
      .where(and(eq(vehicleUnits.id, body.vehicleUnitId), eq(vehicleUnits.orgId, orgId)));
  }
  return c.json({ data: row }, 201);
});

carRentalRouter.put("/inspections/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = inspectionSchema.partial().parse(await c.req.json());
  const [row] = await db
    .update(vehicleInspections)
    .set(body)
    .where(and(eq(vehicleInspections.id, c.req.param("id")), eq(vehicleInspections.orgId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: row });
});

// ============================================================
// DASHBOARD STATS
// ============================================================

carRentalRouter.get("/dashboard-stats", async (c) => {
  const orgId = getOrgId(c);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [vehicleStats, reservationStats, todayPickups, todayReturns] = await Promise.all([
    db
      .select({ status: vehicleUnits.status, total: count() })
      .from(vehicleUnits)
      .where(and(eq(vehicleUnits.orgId, orgId), eq(vehicleUnits.isActive, true)))
      .groupBy(vehicleUnits.status),
    db
      .select({ status: carRentalReservations.status, total: count() })
      .from(carRentalReservations)
      .where(eq(carRentalReservations.orgId, orgId))
      .groupBy(carRentalReservations.status),
    db
      .select({ total: count() })
      .from(carRentalReservations)
      .where(
        and(
          eq(carRentalReservations.orgId, orgId),
          eq(carRentalReservations.status, "confirmed"),
          gte(carRentalReservations.pickupDate, today),
          lte(carRentalReservations.pickupDate, tomorrow)
        )
      ),
    db
      .select({ total: count() })
      .from(carRentalReservations)
      .where(
        and(
          eq(carRentalReservations.orgId, orgId),
          eq(carRentalReservations.status, "picked_up"),
          gte(carRentalReservations.returnDate, today),
          lte(carRentalReservations.returnDate, tomorrow)
        )
      ),
  ]);

  const vm = Object.fromEntries(vehicleStats.map((s) => [s.status, Number(s.total)]));
  const rm = Object.fromEntries(reservationStats.map((s) => [s.status, Number(s.total)]));

  return c.json({
    data: {
      fleet: {
        total: Object.values(vm).reduce((a, b) => a + b, 0),
        available: vm["available"] ?? 0,
        rented: vm["rented"] ?? 0,
        reserved: vm["reserved"] ?? 0,
        maintenance: vm["maintenance"] ?? 0,
        inspection: vm["inspection"] ?? 0,
        out_of_service: vm["out_of_service"] ?? 0,
      },
      reservations: {
        pending: rm["pending"] ?? 0,
        confirmed: rm["confirmed"] ?? 0,
        picked_up: rm["picked_up"] ?? 0,
        returned: rm["returned"] ?? 0,
        completed: rm["completed"] ?? 0,
        cancelled: rm["cancelled"] ?? 0,
      },
      today: {
        pickups: Number(todayPickups[0]?.total ?? 0),
        returns: Number(todayReturns[0]?.total ?? 0),
      },
    },
  });
});
