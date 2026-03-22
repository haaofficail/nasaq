import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, desc, gte, lte, or, ilike, count, sql, between, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  bookings, bookingItems, bookingItemAddons, payments,
  services, addons, customers, locations, pricingRules, organizations,
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination, generateBookingNumber } from "../lib/helpers";
import { postCashSale, postDepositReceived, postRefund, isAccountingEnabled } from "../lib/posting-engine";
import { DEFAULT_VAT_RATE, DEFAULT_DEPOSIT_PERCENT, BOOKING_TRACKING_TOKEN_LENGTH } from "../lib/constants";
import { insertAuditLog } from "../lib/audit";

export const bookingsRouter = new Hono();

// ============================================================
// SCHEMAS
// ============================================================

const createBookingSchema = z.object({
  customerId: z.string().uuid(),
  eventDate: z.string().datetime(),
  eventEndDate: z.string().datetime().optional(),
  locationId: z.string().uuid().optional(),
  customLocation: z.string().optional(),
  locationNotes: z.string().optional(),
  customerNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  source: z.string().default("dashboard"),

  // Items (الخدمات المحجوزة)
  items: z.array(z.object({
    serviceId: z.string().uuid(),
    quantity: z.number().int().min(1).default(1),
    addons: z.array(z.object({
      addonId: z.string().uuid(),
      quantity: z.number().int().min(1).default(1),
    })).default([]),
  })).min(1),

  // Coupon
  couponCode: z.string().optional(),

  // UTM tracking
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

// ============================================================
// GET /bookings — List with filtering + pagination
// ============================================================

bookingsRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);

  // Filters
  const status = c.req.query("status");
  const paymentStatus = c.req.query("paymentStatus");
  const customerId = c.req.query("customerId");
  const locationId = c.req.query("locationId");
  const dateFrom = c.req.query("dateFrom");
  const dateTo = c.req.query("dateTo");
  const search = c.req.query("search");
  const sortBy = c.req.query("sortBy") || "createdAt";
  const sortDir = c.req.query("sortDir") || "desc";

  const conditions = [eq(bookings.orgId, orgId)];

  if (status) conditions.push(eq(bookings.status, status as any));
  if (paymentStatus) conditions.push(eq(bookings.paymentStatus, paymentStatus as any));
  if (customerId) conditions.push(eq(bookings.customerId, customerId));
  if (locationId) conditions.push(eq(bookings.locationId, locationId));
  if (dateFrom) conditions.push(gte(bookings.eventDate, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(bookings.eventDate, new Date(dateTo)));
  if (search) conditions.push(
    or(
      ilike(bookings.bookingNumber, `%${search}%`),
      ilike(bookings.customerNotes, `%${search}%`)
    )!
  );

  // Location-level RBAC
  const locationFilter = c.get("locationFilter");
  if (locationFilter) {
    conditions.push(sql`${bookings.locationId} = ANY(${locationFilter})`);
  }

  const [result, [{ total }]] = await Promise.all([
    db
      .select({
        booking: bookings,
        customerName: customers.name,
        customerPhone: customers.phone,
        locationName: locations.name,
      })
      .from(bookings)
      .leftJoin(customers, eq(bookings.customerId, customers.id))
      .leftJoin(locations, eq(bookings.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(sortDir === "asc" ? asc(bookings.createdAt) : desc(bookings.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(bookings).where(and(...conditions)),
  ]);

  return c.json({
    data: result.map((r) => ({
      ...r.booking,
      customer: { name: r.customerName, phone: r.customerPhone },
      location: r.locationName ? { name: r.locationName } : null,
    })),
    pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
  });
});

// GET /bookings/calendar — alias for /calendar/events (accepts month=YYYY-MM or from/to)
// MUST be registered before /:id to avoid route collision
bookingsRouter.get("/calendar", async (c) => {
  const orgId = getOrgId(c);
  let from = c.req.query("from");
  let to = c.req.query("to");
  const month = c.req.query("month"); // e.g. "2026-04"

  if (month) {
    const [year, mon] = month.split("-").map(Number);
    from = new Date(year, mon - 1, 1).toISOString();
    to = new Date(year, mon, 0, 23, 59, 59).toISOString();
  }

  if (!from || !to) return c.json({ error: "from و to مطلوبان أو استخدم month=YYYY-MM" }, 400);

  const result = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
      eventDate: bookings.eventDate,
      eventEndDate: bookings.eventEndDate,
      totalAmount: bookings.totalAmount,
      paymentStatus: bookings.paymentStatus,
      customerName: customers.name,
      locationName: locations.name,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(locations, eq(bookings.locationId, locations.id))
    .where(and(
      eq(bookings.orgId, orgId),
      gte(bookings.eventDate, new Date(from)),
      lte(bookings.eventDate, new Date(to)),
      sql`${bookings.status} NOT IN ('cancelled')`
    ))
    .orderBy(asc(bookings.eventDate));

  return c.json({ data: result });
});

// ============================================================
// GET /bookings/:id — Full booking with items, addons, payments
// ============================================================

bookingsRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [booking] = await db.select().from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.orgId, orgId)));

  if (!booking) return c.json({ error: "الحجز غير موجود" }, 404);

  // Load related data in parallel
  const [customer, location, items, bookingPayments] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, booking.customerId)).then(r => r[0]),
    booking.locationId
      ? db.select().from(locations).where(eq(locations.id, booking.locationId)).then(r => r[0])
      : null,
    db.select().from(bookingItems).where(eq(bookingItems.bookingId, id)),
    db.select().from(payments).where(eq(payments.bookingId, id)).orderBy(desc(payments.createdAt)),
  ]);

  // Fetch all addons in a single query instead of N per-item queries (Q1)
  const allAddons = items.length > 0
    ? await db.select().from(bookingItemAddons)
        .where(inArray(bookingItemAddons.bookingItemId, items.map((i) => i.id)))
    : [];

  const addonsByItemId = allAddons.reduce<Record<string, typeof allAddons>>((acc, addon) => {
    if (!acc[addon.bookingItemId]) acc[addon.bookingItemId] = [];
    acc[addon.bookingItemId].push(addon);
    return acc;
  }, {});

  const itemsWithAddons = items.map((item) => ({
    ...item,
    addons: addonsByItemId[item.id] ?? [],
  }));

  return c.json({
    data: {
      ...booking,
      customer,
      location,
      items: itemsWithAddons,
      payments: bookingPayments,
    },
  });
});

// ============================================================
// POST /bookings — Create new booking
// هنا السحر: يحسب السعر، يفحص التعارضات، ينشئ الفاتورة
// ============================================================

bookingsRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createBookingSchema.parse(await c.req.json());

  // 1. Verify customer exists
  const [customer] = await db.select().from(customers)
    .where(and(eq(customers.id, body.customerId), eq(customers.orgId, orgId)));
  if (!customer) return c.json({ error: "العميل غير موجود" }, 404);

  // 2. Batch-load all services, pricing rules, and addons — avoids N+1 (QE1)
  const serviceIds = body.items.map((i) => i.serviceId);
  const addonIds = body.items.flatMap((i) => i.addons.map((a) => a.addonId));

  const [allServices, allPricingRules, allAddons] = await Promise.all([
    db.select().from(services)
      .where(and(inArray(services.id, serviceIds), eq(services.orgId, orgId))),
    db.select().from(pricingRules)
      .where(and(eq(pricingRules.orgId, orgId), eq(pricingRules.isActive, true)))
      .orderBy(desc(pricingRules.priority)),
    addonIds.length > 0
      ? db.select().from(addons)
          .where(and(inArray(addons.id, addonIds), eq(addons.orgId, orgId)))
      : Promise.resolve([] as (typeof addons.$inferSelect)[]),
  ]);

  const serviceMap = new Map(allServices.map((s) => [s.id, s]));
  const addonMap = new Map(allAddons.map((a) => [a.id, a]));

  let subtotal = 0;
  const itemsToInsert: any[] = [];
  const addonsToInsert: any[] = [];

  for (const item of body.items) {
    const service = serviceMap.get(item.serviceId);
    if (!service) {
      return c.json({ error: `الخدمة غير موجودة: ${item.serviceId}` }, 400);
    }

    if (service.status !== "active") {
      return c.json({ error: `الخدمة غير متاحة: ${service.name}` }, 400);
    }

    // Calculate price with applicable pricing rules
    let unitPrice = parseFloat(service.basePrice);
    const pricingBreakdown: any[] = [{ rule: "base", label: "السعر الأساسي", amount: unitPrice }];

    const rules = allPricingRules.filter(
      (r) => r.serviceId === service.id || r.serviceId === null
    );

    for (const rule of rules) {
      const adjustment = applyPricingRule(rule, unitPrice, body.eventDate, body.locationId);
      if (adjustment !== 0) {
        unitPrice += adjustment;
        pricingBreakdown.push({
          rule: rule.type,
          label: rule.name,
          adjustment: adjustment,
          amount: unitPrice,
        });
      }
    }

    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    const itemId = crypto.randomUUID();
    itemsToInsert.push({
      id: itemId,
      serviceId: service.id,
      serviceName: service.name,
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      pricingBreakdown,
    });

    // Calculate addon prices
    for (const addonReq of item.addons) {
      const addon = addonMap.get(addonReq.addonId);
      if (!addon) continue;

      let addonPrice: number;
      if (addon.priceMode === "percentage") {
        addonPrice = unitPrice * (parseFloat(addon.price) / 100);
      } else {
        addonPrice = parseFloat(addon.price);
      }

      const addonTotal = addonPrice * addonReq.quantity;
      subtotal += addonTotal;

      addonsToInsert.push({
        bookingItemId: itemId,
        addonId: addon.id,
        addonName: addon.name,
        quantity: addonReq.quantity,
        unitPrice: addonPrice.toFixed(2),
        totalPrice: addonTotal.toFixed(2),
      });
    }
  }

  // 3. Calculate totals using named constants (Q6)
  const vatRate = DEFAULT_VAT_RATE; // from org settings — TODO: read from org.settings.vatRate
  const vatAmount = subtotal * (vatRate / 100);
  const totalAmount = subtotal + vatAmount;
  const depositPercent = DEFAULT_DEPOSIT_PERCENT; // TODO: read from service settings
  const depositAmount = totalAmount * (depositPercent / 100);

  // 4. Generate identifiers outside transaction (idempotent)
  const bookingNumber = generateBookingNumber("NSQ");
  const trackingToken = crypto.randomUUID().replace(/-/g, "").substring(0, BOOKING_TRACKING_TOKEN_LENGTH);

  // 5–9. Conflict check + all writes wrapped in a single transaction (P1)
  class LocationConflictError extends Error {
    constructor(public conflicts: string[]) { super("LOCATION_CONFLICT"); }
  }

  let booking: typeof bookings.$inferSelect;
  try {
    booking = await db.transaction(async (tx) => {
      // Conflict check with row lock and range overlap — prevents TOCTOU (C1/C4/C6)
      if (body.locationId) {
        const eventStart = new Date(body.eventDate);
        const eventEnd = body.eventEndDate
          ? new Date(body.eventEndDate)
          : new Date(eventStart.getTime() + 24 * 60 * 60 * 1000);

        const { rows: conflictRows } = await tx.execute(sql`
          SELECT id, booking_number FROM bookings
          WHERE org_id = ${orgId}
            AND location_id = ${body.locationId}
            AND status NOT IN ('cancelled', 'no_show')
            AND event_date <= ${eventEnd}
            AND COALESCE(event_end_date, event_date + interval '24 hours') >= ${eventStart}
          FOR UPDATE
        `);

        if (conflictRows.length > 0) {
          throw new LocationConflictError((conflictRows as any[]).map((r) => r.booking_number));
        }
      }

      // Insert booking
      const [newBooking] = await tx.insert(bookings).values({
        orgId,
        customerId: body.customerId,
        bookingNumber,
        status: "pending",
        paymentStatus: "pending",
        eventDate: new Date(body.eventDate),
        eventEndDate: body.eventEndDate ? new Date(body.eventEndDate) : null,
        locationId: body.locationId || null,
        customLocation: body.customLocation,
        locationNotes: body.locationNotes,
        subtotal: subtotal.toFixed(2),
        discountAmount: "0",
        vatAmount: vatAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        depositAmount: depositAmount.toFixed(2),
        paidAmount: "0",
        balanceDue: totalAmount.toFixed(2),
        couponCode: body.couponCode,
        assignedUserId: userId,
        trackingToken,
        source: body.source,
        utmSource: body.utmSource,
        utmMedium: body.utmMedium,
        utmCampaign: body.utmCampaign,
        customerNotes: body.customerNotes,
        internalNotes: body.internalNotes,
      }).returning();

      // Bulk insert items (QE8)
      if (itemsToInsert.length > 0) {
        await tx.insert(bookingItems).values(
          itemsToInsert.map((item) => ({ ...item, bookingId: newBooking.id }))
        );
      }

      // Bulk insert addons (QE8)
      if (addonsToInsert.length > 0) {
        await tx.insert(bookingItemAddons).values(addonsToInsert);
      }

      // Update customer stats
      await tx.update(customers).set({
        totalBookings: sql`${customers.totalBookings} + 1`,
        lastBookingAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(customers.id, body.customerId));

      return newBooking;
    });
  } catch (err) {
    if (err instanceof LocationConflictError) {
      return c.json({
        error: "يوجد تعارض — الموقع محجوز في هذا التاريخ",
        code: "LOCATION_CONFLICT",
        conflicts: err.conflicts,
      }, 409);
    }
    throw err;
  }

  return c.json({
    data: {
      ...booking,
      items: itemsToInsert,
      trackingUrl: `/track/${trackingToken}`,
    },
  }, 201);
});

// ============================================================
// PATCH /bookings/:id/status — Update booking status
// ============================================================

const updateStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "no_show", "completed"]),
  reason: z.string().optional(),
});

bookingsRouter.patch("/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { status: newStatus, reason } = updateStatusSchema.parse(await c.req.json());

  const updates: Partial<typeof bookings.$inferInsert> = { status: newStatus, updatedAt: new Date() };

  // Handle special statuses
  if (newStatus === "cancelled") {
    updates.cancelledAt = new Date();
    updates.cancellationReason = reason ?? null;
  }

  const [updated] = await db.update(bookings)
    .set(updates)
    .where(and(eq(bookings.id, id), eq(bookings.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "الحجز غير موجود" }, 404);
  return c.json({ data: updated });
});

// ============================================================
// POST /bookings/:id/payments — Record a payment
// ============================================================

const recordPaymentSchema = z.object({
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "amount must be a positive number" }),
  method: z.string(),
  status: z.enum(["completed", "pending", "failed"]).default("completed"),
  type: z.enum(["payment", "deposit", "refund"]).default("payment"),
  gatewayProvider: z.string().optional().nullable(),
  gatewayTransactionId: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

bookingsRouter.post("/:id/payments", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const bookingId = c.req.param("id");
  const body = recordPaymentSchema.parse(await c.req.json());

  // All 4 operations inside a single transaction — eliminates TOCTOU race (C1)
  let payment: typeof payments.$inferSelect;
  try {
    payment = await db.transaction(async (tx) => {
      const [booking] = await tx.select().from(bookings)
        .where(and(eq(bookings.id, bookingId), eq(bookings.orgId, orgId)));
      if (!booking) throw Object.assign(new Error("NOT_FOUND"), { status: 404 });

      const [p] = await tx.insert(payments).values({
        orgId,
        bookingId,
        customerId: booking.customerId,
        amount: body.amount,
        method: body.method,
        status: body.status,
        type: body.type,
        gatewayProvider: body.gatewayProvider,
        gatewayTransactionId: body.gatewayTransactionId,
        receiptNumber: body.receiptNumber,
        notes: body.notes,
        paidAt: body.status === "completed" ? new Date() : null,
      }).returning();

      if (p.status === "completed") {
        const amount = parseFloat(body.amount);
        await tx.execute(sql`
          UPDATE bookings SET
            paid_amount   = CAST(paid_amount AS DECIMAL) + ${amount},
            balance_due   = GREATEST(0, CAST(total_amount AS DECIMAL) - CAST(paid_amount AS DECIMAL) - ${amount}),
            payment_status = CASE
              WHEN CAST(total_amount AS DECIMAL) - CAST(paid_amount AS DECIMAL) - ${amount} <= 0 THEN 'paid'
              ELSE 'partially_paid'
            END,
            updated_at = NOW()
          WHERE id = ${bookingId}
        `);
        await tx.update(customers).set({
          totalSpent: sql`COALESCE(${customers.totalSpent}, 0) + ${amount}`,
          updatedAt: new Date(),
        }).where(eq(customers.id, booking.customerId));
      }

      return p;
    });
  } catch (err: unknown) {
    if (err instanceof Error && (err as any).status === 404) {
      return c.json({ error: "الحجز غير موجود" }, 404);
    }
    throw err;
  }

  insertAuditLog({
    orgId, userId,
    action: "payment_recorded",
    resource: "payment",
    resourceId: payment.id,
    newValue: { bookingId, amount: body.amount, method: body.method, status: body.status },
  });

  // ترحيل محاسبي (غير متزامن — لا يُوقِف الرد)
  if (payment.status === "completed") {
    (async () => {
      try {
        const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, orgId));
        if (!isAccountingEnabled((org?.settings as any) ?? {})) return;

        const amount = parseFloat(body.amount);
        const vatAmount = 0; // الضريبة محسوبة مسبقاً في totalAmount

        if (body.type === "deposit") {
          await postDepositReceived({ orgId, date: new Date(), amount, description: `عربون حجز ${bookingId}`, sourceId: payment.id, createdBy: userId ?? undefined });
        } else if (body.type === "refund") {
          await postRefund({ orgId, date: new Date(), amount, vatAmount, description: `استرداد حجز ${bookingId}`, sourceId: payment.id, createdBy: userId ?? undefined });
        } else {
          await postCashSale({ orgId, date: new Date(), amount, vatAmount, description: `تحصيل دفعة حجز ${bookingId}`, sourceType: "booking", sourceId: payment.id, createdBy: userId ?? undefined });
        }
      } catch { /* فشل الترحيل لا يُوقف العملية */ }
    })();
  }

  return c.json({ data: payment }, 201);
});

// ============================================================
// GET /bookings/calendar — Calendar view (date range)
// ============================================================

bookingsRouter.get("/calendar/events", async (c) => {
  const orgId = getOrgId(c);
  const from = c.req.query("from");
  const to = c.req.query("to");

  if (!from || !to) return c.json({ error: "from و to مطلوبان" }, 400);

  const result = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
      eventDate: bookings.eventDate,
      eventEndDate: bookings.eventEndDate,
      totalAmount: bookings.totalAmount,
      paymentStatus: bookings.paymentStatus,
      customerName: customers.name,
      locationName: locations.name,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(locations, eq(bookings.locationId, locations.id))
    .where(and(
      eq(bookings.orgId, orgId),
      gte(bookings.eventDate, new Date(from)),
      lte(bookings.eventDate, new Date(to)),
      sql`${bookings.status} NOT IN ('cancelled')`
    ))
    .orderBy(asc(bookings.eventDate));

  return c.json({ data: result });
});

// ============================================================
// GET /bookings/track/:token — Public tracking (no auth)
// ============================================================

bookingsRouter.get("/track/:token", async (c) => {
  const token = c.req.param("token");

  const [booking] = await db
    .select({
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
      paymentStatus: bookings.paymentStatus,
      eventDate: bookings.eventDate,
      totalAmount: bookings.totalAmount,
      paidAmount: bookings.paidAmount,
      balanceDue: bookings.balanceDue,
    })
    .from(bookings)
    .where(eq(bookings.trackingToken, token));

  if (!booking) return c.json({ error: "الحجز غير موجود" }, 404);

  return c.json({ data: booking });
});

// ============================================================
// GET /bookings/stats — Dashboard statistics
// ============================================================

bookingsRouter.get("/stats/summary", async (c) => {
  const orgId = getOrgId(c);
  const period = c.req.query("period") || "month"; // today, week, month, year

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default: // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const [stats] = await db
    .select({
      totalBookings: count(),
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(CAST(${bookings.paidAmount} AS DECIMAL)), 0)`,
      avgBookingValue: sql<string>`COALESCE(AVG(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
    })
    .from(bookings)
    .where(and(
      eq(bookings.orgId, orgId),
      gte(bookings.createdAt, startDate),
      sql`${bookings.status} != 'cancelled'`
    ));

  // Status breakdown
  const statusBreakdown = await db
    .select({
      status: bookings.status,
      count: count(),
    })
    .from(bookings)
    .where(and(
      eq(bookings.orgId, orgId),
      gte(bookings.createdAt, startDate)
    ))
    .groupBy(bookings.status);

  return c.json({
    data: {
      period,
      startDate: startDate.toISOString(),
      ...stats,
      statusBreakdown,
    },
  });
});

// ============================================================
// ALIASES
// ============================================================

// GET /bookings/stats/overview — alias for /stats/summary
bookingsRouter.get("/stats/overview", async (c) => {
  const orgId = getOrgId(c);
  const period = c.req.query("period") || "month";

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const [stats] = await db
    .select({
      totalBookings: count(),
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(CAST(${bookings.paidAmount} AS DECIMAL)), 0)`,
      avgBookingValue: sql<string>`COALESCE(AVG(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
    })
    .from(bookings)
    .where(and(
      eq(bookings.orgId, orgId),
      gte(bookings.createdAt, startDate),
      sql`${bookings.status} != 'cancelled'`
    ));

  const statusBreakdown = await db
    .select({ status: bookings.status, count: count() })
    .from(bookings)
    .where(and(eq(bookings.orgId, orgId), gte(bookings.createdAt, startDate)))
    .groupBy(bookings.status);

  return c.json({ data: { period, startDate: startDate.toISOString(), ...stats, statusBreakdown } });
});

// ============================================================
// PRICING HELPERS
// ============================================================

function applyPricingRule(
  rule: any,
  basePrice: number,
  eventDate: string,
  locationId?: string
): number {
  const config = rule.config as any;
  let applies = false;

  switch (rule.type) {
    case "seasonal": {
      const date = new Date(eventDate);
      const start = new Date(config.startDate);
      const end = new Date(config.endDate);
      applies = date >= start && date <= end;
      break;
    }
    case "day_of_week": {
      const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(eventDate).getDay()];
      applies = config.days?.includes(dayName);
      break;
    }
    case "location": {
      applies = locationId ? config.locationIds?.includes(locationId) : false;
      break;
    }
    case "early_bird": {
      const daysUntilEvent = Math.floor((new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      applies = daysUntilEvent >= (config.daysBeforeEvent || 30);
      break;
    }
    default:
      applies = false;
  }

  if (!applies) return 0;

  if (rule.adjustmentMode === "percentage") {
    return basePrice * (parseFloat(rule.adjustmentValue) / 100);
  } else {
    return parseFloat(rule.adjustmentValue);
  }
}
