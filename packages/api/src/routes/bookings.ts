import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, desc, gte, lte, lt, or, ilike, count, sql, between, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  bookings, bookingItems, bookingItemAddons, payments,
  services, addons, customers, locations, pricingRules, organizations,
  serviceSupplyRecipes, salonSupplies, salonSupplyAdjustments,
  bookingAssignments, bookingCommissions, serviceCosts, serviceStaff,
  bookingEvents, bookingConsumptions, paymentGatewayConfigs, users,
  bookingRecords, bookingLines, bookingLineAddons, bookingTimelineEvents,
  bookingRecordAssignments, bookingRecordCommissions, bookingRecordConsumptions, bookingPaymentLinks,
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination, generateBookingNumber } from "../lib/helpers";
import { postCashSale, postDepositReceived, postRefund, isAccountingEnabled } from "../lib/posting-engine";
import { autoJournal } from "../lib/autoJournal";
import { DEFAULT_VAT_RATE, DEFAULT_DEPOSIT_PERCENT, BOOKING_TRACKING_TOKEN_LENGTH, FREE_BOOKING_LIMIT } from "../lib/constants";
import { insertAuditLog } from "../lib/audit";
import { awardLoyaltyPoints } from "../lib/segments-engine";
import { fireBookingEvent } from "../lib/messaging-engine";
import { decryptString } from "../lib/encryption";
import { log } from "../lib/logger";
import { mapLegacyBookingAggregateToCanonical } from "../lib/bookings-mapping";
import type { AuthUser } from "../middleware/auth";

export const bookingsRouter = new Hono<{ Variables: { user: AuthUser | null; orgId: string; locationFilter: string[] | null; requestId: string } }>();

// ============================================================
// PHASE 0 GUARDRAILS — Feature Flags (no behavior changes)
// ============================================================
const ENABLE_CANONICAL_SHADOW_WRITE = process.env.ENABLE_CANONICAL_SHADOW_WRITE === "true";
const ENABLE_CANONICAL_READ_DETAIL = process.env.ENABLE_CANONICAL_READ_DETAIL === "true";
const ENABLE_CANONICAL_READ_LIST = process.env.ENABLE_CANONICAL_READ_LIST === "true";

async function shadowWriteCanonicalBookingOnCreate(params: {
  orgId: string;
  bookingId: string;
  requestId: string;
}) {
  const startedAt = Date.now();
  const { orgId, bookingId, requestId } = params;

  const [existingCanonical] = await db
    .select({ id: bookingRecords.id })
    .from(bookingRecords)
    .where(and(eq(bookingRecords.orgId, orgId), eq(bookingRecords.bookingRef, bookingId)))
    .limit(1);

  if (existingCanonical) {
    log.info({
      orgId,
      bookingId,
      requestId,
      canonicalBookingRecordId: existingCanonical.id,
      elapsedMs: Date.now() - startedAt,
    }, "[canonical-shadow] bookings.create skipped (already mirrored)");
    return;
  }

  const [booking, items, eventsRows, assignmentsRows, commissionsRows, consumptionsRows, paymentsRows] = await Promise.all([
    db.select().from(bookings).where(and(eq(bookings.id, bookingId), eq(bookings.orgId, orgId))).then((rows) => rows[0] ?? null),
    db.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId)),
    db.select().from(bookingEvents).where(eq(bookingEvents.bookingId, bookingId)),
    db.select().from(bookingAssignments).where(eq(bookingAssignments.bookingId, bookingId)),
    db.select().from(bookingCommissions).where(eq(bookingCommissions.bookingId, bookingId)),
    db.select().from(bookingConsumptions).where(eq(bookingConsumptions.bookingId, bookingId)),
    db.select().from(payments).where(eq(payments.bookingId, bookingId)),
  ]);

  const addonsRows = items.length > 0
    ? await db.select().from(bookingItemAddons).where(inArray(bookingItemAddons.bookingItemId, items.map((item) => item.id)))
    : [];

  if (!booking) {
    log.warn({ orgId, bookingId, requestId }, "[canonical-shadow] bookings.create skipped (legacy booking not found)");
    return;
  }

  const canonicalPayload = mapLegacyBookingAggregateToCanonical({
    booking,
    items,
    addons: addonsRows,
    events: eventsRows,
    assignments: assignmentsRows,
    commissions: commissionsRows,
    consumptions: consumptionsRows,
    payments: paymentsRows,
  });

  await db.transaction(async (tx) => {
    const [bookingRecord] = await tx.insert(bookingRecords)
      .values(canonicalPayload.booking_records as any)
      .returning({ id: bookingRecords.id });

    const lineByLegacyItemId = new Map<string, string>();
    for (const line of canonicalPayload.booking_lines) {
      const [insertedLine] = await tx.insert(bookingLines).values({
        ...line.row,
        bookingRecordId: bookingRecord.id,
      } as any).returning({ id: bookingLines.id });
      lineByLegacyItemId.set(line.legacyBookingItemId, insertedLine.id);
    }

    if (canonicalPayload.booking_line_addons.length > 0) {
      const addonRows = canonicalPayload.booking_line_addons
        .map((addon) => {
          const bookingLineId = lineByLegacyItemId.get(addon.legacyBookingItemId);
          if (!bookingLineId) return null;
          return {
            ...addon.row,
            bookingLineId,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));

      if (addonRows.length > 0) {
        await tx.insert(bookingLineAddons).values(addonRows as any);
      }
    }

    if (canonicalPayload.booking_timeline_events.length > 0) {
      await tx.insert(bookingTimelineEvents).values(
        canonicalPayload.booking_timeline_events.map((eventRow) => ({
          ...eventRow,
          bookingRecordId: bookingRecord.id,
        })) as any,
      );
    }

    if (canonicalPayload.booking_record_assignments.length > 0) {
      await tx.insert(bookingRecordAssignments).values(
        canonicalPayload.booking_record_assignments.map((assignmentRow) => ({
          ...assignmentRow,
          bookingRecordId: bookingRecord.id,
        })) as any,
      );
    }

    if (canonicalPayload.booking_record_commissions.length > 0) {
      await tx.insert(bookingRecordCommissions).values(
        canonicalPayload.booking_record_commissions.map((commissionRow) => ({
          ...commissionRow.row,
          bookingRecordId: bookingRecord.id,
          bookingLineId: commissionRow.legacyBookingItemId ? (lineByLegacyItemId.get(commissionRow.legacyBookingItemId) ?? null) : null,
        })) as any,
      );
    }

    if (canonicalPayload.booking_consumptions_canonical.length > 0) {
      await tx.insert(bookingRecordConsumptions).values(
        canonicalPayload.booking_consumptions_canonical.map((consumptionRow) => ({
          ...consumptionRow.row,
          bookingRecordId: bookingRecord.id,
          bookingLineId: consumptionRow.legacyBookingItemId ? (lineByLegacyItemId.get(consumptionRow.legacyBookingItemId) ?? null) : null,
        })) as any,
      );
    }

    if (canonicalPayload.booking_payment_links.length > 0) {
      await tx.insert(bookingPaymentLinks).values(
        canonicalPayload.booking_payment_links.map((paymentLinkRow) => ({
          ...paymentLinkRow,
          bookingRecordId: bookingRecord.id,
        })) as any,
      );
    }
  });

  log.info({
    orgId,
    bookingId,
    requestId,
    elapsedMs: Date.now() - startedAt,
  }, "[canonical-shadow] bookings.create mirrored");
}

// ============================================================
// SCHEMAS
// ============================================================

// Immediate-sale types: no time slot required — booking = sale at current moment
const IMMEDIATE_TYPES = new Set(["product", "product_shipping", "food_order", "package", "add_on"]);

const createBookingSchema = z.object({
  customerId: z.string().uuid(),
  eventDate: z.string().datetime().optional(),   // optional for immediate-sale types
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

  // Custom question answers (rental metadata: guests, days, fulfillment mode)
  questionAnswers: z.array(z.object({
    key: z.string(),
    label: z.string().optional(),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })).default([]),

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
  const sortDir = c.req.query("sortDir") || "desc";

  // ── Phase 5: Canonical read path for list ─────────────────────────────────
  if (ENABLE_CANONICAL_READ_LIST) {
    const canonicalConditions = [eq(bookingRecords.orgId, orgId)];

    if (status)        canonicalConditions.push(eq(bookingRecords.status, status));
    if (paymentStatus) canonicalConditions.push(eq(bookingRecords.paymentStatus, paymentStatus));
    if (customerId)    canonicalConditions.push(eq(bookingRecords.customerId, customerId));
    if (locationId)    canonicalConditions.push(eq(bookingRecords.locationId, locationId));
    if (dateFrom)      canonicalConditions.push(gte(bookingRecords.startsAt, new Date(dateFrom)));
    if (dateTo)        canonicalConditions.push(lte(bookingRecords.startsAt, new Date(dateTo)));
    if (search)        canonicalConditions.push(
      or(
        ilike(bookingRecords.bookingNumber, `%${search}%`),
        ilike(bookingRecords.customerNotes,  `%${search}%`),
      )!,
    );

    const locationFilter = c.get("locationFilter");
    if (locationFilter) {
      canonicalConditions.push(sql`${bookingRecords.locationId} = ANY(${locationFilter})`);
    }

    const [canonicalResult, [{ canonicalTotal }]] = await Promise.all([
      db
        .select({
          record:       bookingRecords,
          customerName: customers.name,
          customerPhone: customers.phone,
          locationName: locations.name,
        })
        .from(bookingRecords)
        .leftJoin(customers, eq(bookingRecords.customerId, customers.id))
        .leftJoin(locations, eq(bookingRecords.locationId, locations.id))
        .where(and(...canonicalConditions))
        .orderBy(sortDir === "asc" ? asc(bookingRecords.createdAt) : desc(bookingRecords.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ canonicalTotal: count() }).from(bookingRecords).where(and(...canonicalConditions)),
    ]);

    const total = Number(canonicalTotal);

    log.info({ orgId, total, page }, "[canonical-read] bookings.list from canonical");

    return c.json({
      data: canonicalResult.map(r => ({
        id:                 r.record.bookingRef ?? r.record.id,
        orgId:              r.record.orgId,
        customerId:         r.record.customerId,
        bookingNumber:      r.record.bookingNumber,
        status:             r.record.status,
        paymentStatus:      r.record.paymentStatus,
        eventDate:          r.record.startsAt,
        eventEndDate:       r.record.endsAt ?? null,
        locationId:         r.record.locationId ?? null,
        totalAmount:        r.record.totalAmount,
        depositAmount:      r.record.depositAmount,
        paidAmount:         r.record.paidAmount,
        balanceDue:         r.record.balanceDue,
        source:             r.record.source ?? null,
        assignedUserId:     r.record.assignedUserId ?? null,
        cancelledAt:        r.record.cancelledAt ?? null,
        createdAt:          r.record.createdAt,
        updatedAt:          r.record.updatedAt,
        customer: { name: r.customerName, phone: r.customerPhone },
        location: r.locationName ? { name: r.locationName } : null,
        _source: "canonical",
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

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
  const requestId = c.get("requestId");

  log.info({
    orgId,
    bookingId: id,
    requestId,
    guardrails: {
      ENABLE_CANONICAL_SHADOW_WRITE,
      ENABLE_CANONICAL_READ_DETAIL,
      ENABLE_CANONICAL_READ_LIST,
    },
  }, "[guardrails] bookings.detail.read (legacy source)");

  // ── Phase 4: Canonical read path (when flag + canonical row exists) ────────
  if (ENABLE_CANONICAL_READ_DETAIL) {
    const [canonicalRecord] = await db.select().from(bookingRecords)
      .where(and(eq(bookingRecords.bookingRef, id), eq(bookingRecords.orgId, orgId)));

    if (canonicalRecord) {
      const [lines, timelineEvents, canonicalCustomer, canonicalLocation, paymentLinks] = await Promise.all([
        db.select().from(bookingLines).where(eq(bookingLines.bookingRecordId, canonicalRecord.id)),
        db.select().from(bookingTimelineEvents)
          .where(eq(bookingTimelineEvents.bookingRecordId, canonicalRecord.id))
          .orderBy(asc(bookingTimelineEvents.createdAt)),
        db.select().from(customers).where(eq(customers.id, canonicalRecord.customerId)).then(r => r[0] ?? null),
        canonicalRecord.locationId
          ? db.select().from(locations).where(eq(locations.id, canonicalRecord.locationId)).then(r => r[0] ?? null)
          : Promise.resolve(null),
        db.select({ paymentId: bookingPaymentLinks.paymentId })
          .from(bookingPaymentLinks)
          .where(eq(bookingPaymentLinks.bookingRecordId, canonicalRecord.id)),
      ]);

      const canonicalAddons = lines.length > 0
        ? await db.select().from(bookingLineAddons)
            .where(inArray(bookingLineAddons.bookingLineId, lines.map(l => l.id)))
        : [];

      const addonsByLineId = canonicalAddons.reduce<Record<string, typeof canonicalAddons>>((acc, addon) => {
        if (!acc[addon.bookingLineId]) acc[addon.bookingLineId] = [];
        acc[addon.bookingLineId].push(addon);
        return acc;
      }, {});

      const canonicalPayments = paymentLinks.length > 0
        ? await db.select().from(payments)
            .where(inArray(payments.id, paymentLinks.map(pl => pl.paymentId)))
            .orderBy(desc(payments.createdAt))
        : [];

      // Map canonical → legacy-compatible response shape
      const linesWithAddons = lines.map(line => ({
        id: line.id,
        bookingId: canonicalRecord.bookingRef ?? id,
        serviceId: line.serviceRefId ?? null,
        serviceName: line.itemName,
        serviceType: line.itemType ?? null,
        durationMinutes: line.durationMinutes ?? null,
        vatInclusive: line.vatInclusive,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
        pricingBreakdown: line.pricingBreakdown ?? [],
        notes: line.notes ?? null,
        createdAt: line.createdAt,
        addons: addonsByLineId[line.id] ?? [],
      }));

      log.info({ orgId, bookingId: id, requestId, canonicalId: canonicalRecord.id }, "[canonical-read] bookings.detail from canonical");

      return c.json({
        data: {
          id:                 canonicalRecord.bookingRef ?? canonicalRecord.id,
          orgId:              canonicalRecord.orgId,
          customerId:         canonicalRecord.customerId,
          bookingNumber:      canonicalRecord.bookingNumber,
          status:             canonicalRecord.status,
          paymentStatus:      canonicalRecord.paymentStatus,
          eventDate:          canonicalRecord.startsAt,
          eventEndDate:       canonicalRecord.endsAt ?? null,
          setupDate:          canonicalRecord.setupAt ?? null,
          teardownDate:       canonicalRecord.teardownAt ?? null,
          locationId:         canonicalRecord.locationId ?? null,
          customLocation:     canonicalRecord.customLocation ?? null,
          locationNotes:      canonicalRecord.locationNotes ?? null,
          subtotal:           canonicalRecord.subtotal,
          discountAmount:     canonicalRecord.discountAmount,
          vatAmount:          canonicalRecord.vatAmount,
          totalAmount:        canonicalRecord.totalAmount,
          depositAmount:      canonicalRecord.depositAmount,
          paidAmount:         canonicalRecord.paidAmount,
          balanceDue:         canonicalRecord.balanceDue,
          source:             canonicalRecord.source ?? null,
          trackingToken:      canonicalRecord.trackingToken ?? null,
          customerNotes:      canonicalRecord.customerNotes ?? null,
          internalNotes:      canonicalRecord.internalNotes ?? null,
          questionAnswers:    canonicalRecord.questionAnswers ?? [],
          assignedUserId:     canonicalRecord.assignedUserId ?? null,
          vendorId:           canonicalRecord.vendorId ?? null,
          cancelledAt:        canonicalRecord.cancelledAt ?? null,
          cancellationReason: canonicalRecord.cancellationReason ?? null,
          reviewedAt:         canonicalRecord.reviewedAt ?? null,
          rating:             canonicalRecord.rating ?? null,
          reviewText:         canonicalRecord.reviewText ?? null,
          createdAt:          canonicalRecord.createdAt,
          updatedAt:          canonicalRecord.updatedAt,
          // Relations
          customer:  canonicalCustomer,
          location:  canonicalLocation,
          items:     linesWithAddons,
          payments:  canonicalPayments,
          timeline:  timelineEvents,
          _source:   "canonical",
        },
      });
    }
    // Fall through to legacy if no canonical row (booking pre-dates shadow write)
  }

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
  const requestId = c.get("requestId");
  const body = createBookingSchema.parse(await c.req.json());

  log.info({
    orgId,
    userId,
    requestId,
    customerId: body.customerId,
    itemsCount: body.items.length,
    source: body.source,
    guardrails: {
      ENABLE_CANONICAL_SHADOW_WRITE,
      ENABLE_CANONICAL_READ_DETAIL,
      ENABLE_CANONICAL_READ_LIST,
    },
  }, "[guardrails] bookings.create (legacy write path)");

  // 1. Verify customer exists
  const [customer] = await db.select().from(customers)
    .where(and(eq(customers.id, body.customerId), eq(customers.orgId, orgId)));
  if (!customer) return c.json({ error: "العميل غير موجود" }, 404);

  // 2. Batch-load all services, pricing rules, and addons — avoids N+1 (QE1)
  const serviceIds = body.items.map((i) => i.serviceId);
  const addonIds = body.items.flatMap((i) => i.addons.map((a) => a.addonId));

  const [allServices, allPricingRules, allAddons, allServiceCosts, allServiceStaffRows, orgRow] = await Promise.all([
    db.select().from(services)
      .where(and(inArray(services.id, serviceIds), eq(services.orgId, orgId))),
    db.select().from(pricingRules)
      .where(and(eq(pricingRules.orgId, orgId), eq(pricingRules.isActive, true)))
      .orderBy(desc(pricingRules.priority)),
    addonIds.length > 0
      ? db.select().from(addons)
          .where(and(inArray(addons.id, addonIds), eq(addons.orgId, orgId)))
      : Promise.resolve([] as (typeof addons.$inferSelect)[]),
    db.select().from(serviceCosts)
      .where(and(inArray(serviceCosts.serviceId, serviceIds), eq(serviceCosts.orgId, orgId))),
    userId
      ? db.select().from(serviceStaff)
          .where(and(inArray(serviceStaff.serviceId, serviceIds), eq(serviceStaff.userId, userId)))
      : Promise.resolve([] as (typeof serviceStaff.$inferSelect)[]),
    db.select({ settings: organizations.settings, plan: organizations.plan, bookingUsed: organizations.bookingUsed }).from(organizations).where(eq(organizations.id, orgId)),
  ]);

  // Free plan limit check — fail fast before any pricing logic
  const org = orgRow[0];
  if (org?.plan === "free" && (org.bookingUsed ?? 0) >= FREE_BOOKING_LIMIT) {
    return c.json({
      error: `لقد استخدمت جميع الحجوزات المجانية (${FREE_BOOKING_LIMIT} حجز). للمتابعة واستقبال حجوزات جديدة، قم بالترقية إلى إحدى الباقات.`,
      code: "FREE_LIMIT_REACHED",
    }, 403);
  }

  const serviceMap = new Map(allServices.map((s) => [s.id, s]));
  const addonMap = new Map(allAddons.map((a) => [a.id, a]));
  const serviceCostMap = new Map(allServiceCosts.map((c) => [c.serviceId, c]));
  const serviceStaffMap = new Map(allServiceStaffRows.map((s) => [s.serviceId, s]));

  // Rental days multiplier — applies to rental/event_rental service types
  const RENTAL_SVC_TYPES = new Set(["rental", "event_rental"]);
  const rentalDays = (body.eventDate && body.eventEndDate)
    ? Math.max(1, Math.ceil((new Date(body.eventEndDate).getTime() - new Date(body.eventDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  let subtotal = 0;
  const itemsToInsert: any[] = [];
  const addonsToInsert: any[] = [];

  for (const item of body.items) {
    const service = serviceMap.get(item.serviceId);
    if (!service) {
      return c.json({ error: `الخدمة غير موجودة: ${item.serviceId}` }, 400);
    }

    if (service.status !== "active" || (service as any).isBookable === false) {
      return c.json({ error: `الخدمة غير متاحة للحجز: ${service.name}` }, 400);
    }

    // Immediate-sale types don't require a scheduled time
    const sType = (service as any).serviceType as string | undefined;
    if (!IMMEDIATE_TYPES.has(sType ?? "") && !body.eventDate) {
      return c.json({ error: `الخدمة "${service.name}" تتطلب تاريخ ووقت الحجز` }, 400);
    }
    // field_service: requires customer location
    if (sType === "field_service" && !body.customLocation && !body.locationId) {
      return c.json({ error: `الخدمة الميدانية "${service.name}" تتطلب تحديد موقع العميل` }, 400);
    }
    // rental: requires end date for duration
    if (sType === "rental" && !body.eventEndDate) {
      return c.json({ error: `خدمة التأجير "${service.name}" تتطلب تحديد تاريخ الانتهاء` }, 400);
    }

    // Calculate price with applicable pricing rules
    let unitPrice = parseFloat(service.basePrice);
    const pricingBreakdown: any[] = [{ rule: "base", label: "السعر الأساسي", amount: unitPrice }];

    const rules = allPricingRules.filter(
      (r) => r.serviceId === service.id || r.serviceId === null
    );

    for (const rule of rules) {
      const adjustment = applyPricingRule(rule, unitPrice, body.eventDate ?? "", body.locationId);
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

    const daysMultiplier = RENTAL_SVC_TYPES.has(sType ?? "") ? rentalDays : 1;
    const totalPrice = unitPrice * item.quantity * daysMultiplier;
    subtotal += totalPrice;

    const itemId = crypto.randomUUID();
    itemsToInsert.push({
      id: itemId,
      serviceId: service.id,
      serviceName: service.name,
      serviceType: (service as any).serviceType || null,
      durationMinutes: (service as any).durationMinutes || null,
      vatInclusive: (service as any).vatInclusive ?? true,
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

  // 3. Calculate totals — vatRate from org settings, depositPercent from services
  const orgSettings = (orgRow[0]?.settings ?? {}) as Record<string, unknown>;
  const vatRate = typeof orgSettings.vatRate === "number" ? orgSettings.vatRate : DEFAULT_VAT_RATE;
  const vatAmount = subtotal * (vatRate / 100);
  const totalAmount = subtotal + vatAmount;
  const depositPercent = Math.max(
    DEFAULT_DEPOSIT_PERCENT,
    ...Array.from(serviceMap.values()).map(s => parseFloat(String((s as any).depositPercent ?? DEFAULT_DEPOSIT_PERCENT))),
  );
  const depositAmount = totalAmount * (depositPercent / 100);

  // 4. Generate identifiers outside transaction (idempotent)
  const bookingNumber = generateBookingNumber("NSQ");
  const trackingToken = crypto.randomUUID().replace(/-/g, "").substring(0, BOOKING_TRACKING_TOKEN_LENGTH);

  // 5–9. Conflict check + all writes wrapped in a single transaction (P1)
  class LocationConflictError extends Error {
    constructor(public conflicts: string[]) { super("LOCATION_CONFLICT"); }
  }

  // Determine if ALL items are immediate-sale types (no scheduling needed)
  const allImmediate = Array.from(serviceMap.values())
    .every(s => IMMEDIATE_TYPES.has((s as any).serviceType ?? ""));
  const resolvedEventDate = body.eventDate ? new Date(body.eventDate) : new Date();

  // Compute max buffer (before/after) across all services in this booking
  const maxBufferBefore = allImmediate ? 0 : Math.max(0, ...Array.from(serviceMap.values()).map(s => (s as any).bufferBeforeMinutes || 0));
  const maxBufferAfter  = allImmediate ? 0 : Math.max(0, ...Array.from(serviceMap.values()).map(s => (s as any).bufferAfterMinutes  || 0));

  let booking: typeof bookings.$inferSelect;
  try {
    booking = await db.transaction(async (tx) => {
      // Conflict check with row lock and range overlap — prevents TOCTOU (C1/C4/C6)
      // Expand window by service buffer to prevent back-to-back bookings without cleanup time
      if (body.locationId && !allImmediate) {
        const eventStart = new Date(resolvedEventDate.getTime() - maxBufferBefore * 60_000);
        const eventEnd = body.eventEndDate
          ? new Date(new Date(body.eventEndDate).getTime() + maxBufferAfter * 60_000)
          : new Date(resolvedEventDate.getTime() + 24 * 60 * 60 * 1000 + maxBufferAfter * 60_000);

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
        eventDate: resolvedEventDate,
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
        questionAnswers: body.questionAnswers,
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

      // Immutable audit event — booking created
      await tx.insert(bookingEvents).values({
        orgId,
        bookingId: newBooking.id,
        userId,
        eventType: "created",
        toStatus: "pending",
        metadata: { bookingNumber, source: body.source || "dashboard" },
      });

      // Auto-create assignment for the creator/assignee
      if (userId) {
        await tx.insert(bookingAssignments).values({
          orgId,
          bookingId: newBooking.id,
          userId,
          role: "staff",
          assignedAt: new Date(),
        });

        // Compute commissions per booking item
        const commissionsToInsert: any[] = [];
        for (const item of itemsToInsert) {
          const cost = serviceCostMap.get(item.serviceId);
          const staffRow = serviceStaffMap.get(item.serviceId);

          let commissionMode: string = "percentage";
          let rate: number = 0;

          if (staffRow && staffRow.commissionMode === "none") {
            continue; // no commission for this user+service
          } else if (staffRow && staffRow.commissionMode === "fixed") {
            commissionMode = "fixed";
            rate = parseFloat(staffRow.commissionValue as string) || 0;
          } else if (staffRow && staffRow.commissionMode === "percentage") {
            commissionMode = "percentage";
            rate = parseFloat(staffRow.commissionValue as string) || 0;
          } else {
            // inherit or no staff row: use service-level commissionPercent
            commissionMode = "percentage";
            rate = cost ? (parseFloat(cost.commissionPercent as string) || 0) : 10;
          }

          if (rate === 0) continue;

          const baseAmount = parseFloat(item.totalPrice);
          const commissionAmount = commissionMode === "fixed"
            ? rate
            : baseAmount * (rate / 100);

          commissionsToInsert.push({
            orgId,
            bookingId: newBooking.id,
            bookingItemId: item.id,
            userId,
            serviceId: item.serviceId,
            commissionMode,
            rate: rate.toFixed(2),
            baseAmount: baseAmount.toFixed(2),
            commissionAmount: commissionAmount.toFixed(2),
            status: "pending",
          });
        }

        if (commissionsToInsert.length > 0) {
          await tx.insert(bookingCommissions).values(commissionsToInsert);
        }
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

  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "booking", resourceId: booking.id });

  // Free plan: increment counter after successful booking
  if (org?.plan === "free") {
    await db.update(organizations)
      .set({ bookingUsed: sql`${organizations.bookingUsed} + 1` })
      .where(eq(organizations.id, orgId));
  }

  // إرسال إشعار تأكيد الحجز للعميل + إشعار المالك (fire-and-forget)
  fireBookingEvent("booking_confirmed",  { orgId, bookingId: booking.id });
  fireBookingEvent("owner_new_booking",  { orgId, bookingId: booking.id });

  if (ENABLE_CANONICAL_SHADOW_WRITE) {
    try {
      await shadowWriteCanonicalBookingOnCreate({ orgId, bookingId: booking.id, requestId });
    } catch (error) {
      log.error({
        orgId,
        bookingId: booking.id,
        requestId,
        error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
      }, "[canonical-shadow] bookings.create mirror failed");
    }
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
  const actingUserId = getUserId(c);
  const requestId = c.get("requestId");
  const id = c.req.param("id");
  const { status: newStatus, reason } = updateStatusSchema.parse(await c.req.json());

  log.info({
    orgId,
    bookingId: id,
    actingUserId,
    requestId,
    newStatus,
    hasReason: Boolean(reason),
    guardrails: {
      ENABLE_CANONICAL_SHADOW_WRITE,
      ENABLE_CANONICAL_READ_DETAIL,
      ENABLE_CANONICAL_READ_LIST,
    },
  }, "[guardrails] bookings.status.update (legacy write path)");

  // Read current status for audit trail
  const [existing] = await db.select({ status: bookings.status })
    .from(bookings).where(and(eq(bookings.id, id), eq(bookings.orgId, orgId)));
  if (!existing) return c.json({ error: "الحجز غير موجود" }, 404);
  const fromStatus = existing.status;

  const updates: Partial<typeof bookings.$inferInsert> = { status: newStatus, updatedAt: new Date() };
  if (newStatus === "cancelled") {
    updates.cancelledAt = new Date();
    updates.cancellationReason = reason ?? null;
  }

  const [updated] = await db.update(bookings)
    .set(updates)
    .where(and(eq(bookings.id, id), eq(bookings.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "الحجز غير موجود" }, 404);

  // Booking event — status change
  db.insert(bookingEvents).values({
    orgId,
    bookingId: id,
    userId: actingUserId,
    eventType: "status_changed",
    fromStatus: fromStatus as string,
    toStatus: newStatus,
    metadata: reason ? { reason } : {},
  }).catch(() => {});

  insertAuditLog({ orgId, userId: actingUserId, action: "updated", resource: "booking", resourceId: id, metadata: { status: newStatus } });

  // ── Phase 3: Canonical shadow status sync (fire-and-forget, never throws) ─
  if (ENABLE_CANONICAL_SHADOW_WRITE) {
    (async () => {
      try {
        const statusMap: Record<string, string> = {
          pending: "pending", confirmed: "confirmed",
          deposit_paid: "confirmed", fully_confirmed: "confirmed",
          preparing: "in_progress", in_progress: "in_progress",
          completed: "completed", reviewed: "completed",
          cancelled: "cancelled", no_show: "no_show",
        };
        const canonicalStatus = statusMap[newStatus] ?? newStatus;

        const statusUpdates: Record<string, unknown> = {
          status:    canonicalStatus,
          updatedAt: new Date(),
        };
        if (newStatus === "cancelled") {
          statusUpdates.cancelledAt        = updated.cancelledAt ?? new Date();
          statusUpdates.cancellationReason = updated.cancellationReason ?? null;
        }

        const [canonicalRow] = await db.update(bookingRecords)
          .set(statusUpdates as any)
          .where(eq(bookingRecords.bookingRef, id))
          .returning({ id: bookingRecords.id });

        if (canonicalRow?.id) {
          await db.insert(bookingTimelineEvents).values({
            orgId,
            bookingRecordId: canonicalRow.id,
            userId:          actingUserId ?? null,
            eventType:       "status_changed",
            fromStatus:      fromStatus as string,
            toStatus:        canonicalStatus,
            metadata:        (reason ? { reason } : {}) as any,
          });
        }
      } catch { /* shadow write failure is non-critical */ }
    })();
  }

  // قيد محاسبي تلقائي (fire-and-forget)
  if (newStatus === "confirmed") {
    try {
      await autoJournal.bookingConfirmed({
        orgId,
        bookingId: id,
        bookingNumber: updated.bookingNumber,
        amount: parseFloat(updated.totalAmount),
      });
    } catch {}
  } else if (newStatus === "cancelled") {
    try {
      await autoJournal.bookingCancelled({
        orgId,
        bookingId: id,
        bookingNumber: updated.bookingNumber,
        amount: parseFloat(updated.totalAmount),
      });
    } catch {}
  }

  // إرسال إشعار للعميل بحسب الحالة الجديدة (fire-and-forget)
  if (newStatus === "cancelled") {
    fireBookingEvent("booking_cancelled",  { orgId, bookingId: id });
    fireBookingEvent("owner_booking_cancelled", { orgId, bookingId: id });
  } else if (newStatus === "completed") {
    fireBookingEvent("booking_completed", { orgId, bookingId: id });
  }

  // On completion: deduct supplies + record consumptions (non-blocking)
  if (newStatus === "completed") {
    (async () => {
      try {
        const items = await db.select({
          id: bookingItems.id,
          serviceId: bookingItems.serviceId,
          quantity: bookingItems.quantity,
        }).from(bookingItems).where(eq(bookingItems.bookingId, id));

        for (const item of items) {
          if (!item.serviceId) continue;
          const recipes = await db.select().from(serviceSupplyRecipes)
            .where(and(
              eq(serviceSupplyRecipes.serviceId, item.serviceId),
              eq(serviceSupplyRecipes.orgId, orgId),
            ));

          for (const recipe of recipes) {
            const totalQty = parseFloat(recipe.quantity as string) * (item.quantity || 1);
            const [supply] = await db.select({ quantity: salonSupplies.quantity })
              .from(salonSupplies).where(eq(salonSupplies.id, recipe.supplyId));
            if (!supply) continue;

            const newQty = Math.max(0, parseFloat(supply.quantity as string) - totalQty);
            await db.update(salonSupplies)
              .set({ quantity: String(newQty), updatedAt: new Date() })
              .where(eq(salonSupplies.id, recipe.supplyId));

            await db.insert(salonSupplyAdjustments).values({
              orgId,
              supplyId:  recipe.supplyId,
              delta:     String(-totalQty),
              reason:    "consumed",
              notes:     `خصم تلقائي — حجز ${id.slice(0, 8)}`,
              createdBy: actingUserId,
            });

            // Record consumption in booking_consumptions
            await db.insert(bookingConsumptions).values({
              orgId,
              bookingId: id,
              bookingItemId: item.id,
              supplyId: recipe.supplyId,
              quantity: String(totalQty),
              unit: (recipe as any).unit || null,
              consumedAt: new Date(),
              createdBy: actingUserId,
              notes: `خصم تلقائي من وصفة الخدمة`,
            });
          }
        }
      } catch (_) { /* non-critical */ }
    })();
  }

  return c.json({ data: updated });
});

// ============================================================
// PATCH /bookings/:id/reschedule — Reschedule / reassign booking
// تأجيل أو تحويل الحجز مع حفظ السبب
// ============================================================

const rescheduleSchema = z.object({
  eventDate:    z.string().datetime(),
  eventEndDate: z.string().datetime().optional(),
  assignedUserId: z.string().uuid().optional().nullable(),
  reason: z.enum([
    "customer_request",   // بطلب العميل
    "staff_unavailable",  // الموظف غير متاح
    "emergency",          // طارئ
    "double_booking",     // تعارض مواعيد
    "other",              // أخرى
  ]).default("customer_request"),
  notes: z.string().optional(),
});

bookingsRouter.patch("/:id/reschedule", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const id = c.req.param("id");
  const body = rescheduleSchema.parse(await c.req.json());

  const [existing] = await db.select().from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.orgId, orgId)));
  if (!existing) return c.json({ error: "الحجز غير موجود" }, 404);
  if (existing.status === "cancelled") return c.json({ error: "لا يمكن تعديل حجز ملغي" }, 422);
  if (existing.status === "completed") return c.json({ error: "لا يمكن تعديل حجز مكتمل" }, 422);

  // Build note with reschedule log (append to existing internalNotes)
  const REASONS: Record<string, string> = {
    customer_request:  "بطلب العميل",
    staff_unavailable: "الموظف غير متاح",
    emergency:         "طارئ",
    double_booking:    "تعارض مواعيد",
    other:             "أخرى",
  };
  const reasonLabel = REASONS[body.reason] ?? body.reason;
  const prevDate = existing.eventDate ? new Date(existing.eventDate).toISOString() : "—";
  const logLine = `[تأجيل ${new Date().toISOString().slice(0, 10)}] من: ${prevDate} → إلى: ${body.eventDate} — السبب: ${reasonLabel}${body.notes ? ` — ${body.notes}` : ""}`;
  const updatedNotes = existing.internalNotes
    ? `${existing.internalNotes}\n${logLine}`
    : logLine;

  const updates: Partial<typeof bookings.$inferInsert> = {
    eventDate:    new Date(body.eventDate),
    internalNotes: updatedNotes,
    updatedAt:    new Date(),
  };
  if (body.eventEndDate !== undefined) updates.eventEndDate = new Date(body.eventEndDate);
  if (body.assignedUserId !== undefined) updates.assignedUserId = body.assignedUserId;

  const [updated] = await db.update(bookings)
    .set(updates)
    .where(and(eq(bookings.id, id), eq(bookings.orgId, orgId)))
    .returning();

  // Booking event — rescheduled
  db.insert(bookingEvents).values({
    orgId,
    bookingId: id,
    userId,
    eventType: "rescheduled",
    metadata: { from: prevDate, to: body.eventDate, reason: body.reason, notes: body.notes },
  }).catch(() => {});

  insertAuditLog({
    orgId, userId,
    action: "rescheduled",
    resource: "booking",
    resourceId: updated.id,
    metadata: { from: prevDate, to: body.eventDate, reason: body.reason },
  });

  return c.json({ data: updated });
});

// ============================================================
// GET /bookings/:id/events — Booking audit trail
// ============================================================

bookingsRouter.get("/:id/events", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const events = await db
    .select({
      id: bookingEvents.id,
      eventType: bookingEvents.eventType,
      fromStatus: bookingEvents.fromStatus,
      toStatus: bookingEvents.toStatus,
      metadata: bookingEvents.metadata,
      createdAt: bookingEvents.createdAt,
      performedByName: users.name,
    })
    .from(bookingEvents)
    .leftJoin(users, eq(bookingEvents.userId, users.id))
    .where(and(eq(bookingEvents.bookingId, id), eq(bookingEvents.orgId, orgId)))
    .orderBy(asc(bookingEvents.createdAt));

  return c.json({ data: events });
});

// ============================================================
// POST /bookings/:id/payments — Record a payment
// ============================================================

const recordPaymentSchema = z.object({
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "amount must be a positive number" }),
  method: z.enum(["cash", "bank_transfer", "mada", "visa_master", "apple_pay", "tamara", "tabby", "wallet", "payment_link"]),
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

  // Booking event — payment received
  if (payment.status === "completed") {
    db.insert(bookingEvents).values({
      orgId,
      bookingId,
      userId,
      eventType: "payment_received",
      metadata: { amount: body.amount, method: body.method, type: body.type, paymentId: payment.id },
    }).catch(() => {});

    // Award loyalty points — fire-and-forget, non-critical
    if (payment.customerId) {
      awardLoyaltyPoints({
        orgId,
        customerId: payment.customerId,
        bookingId,
        bookingAmount: parseFloat(body.amount),
      }).catch(() => {});
    }
  }

  // إرسال إشعار استلام الدفعة للعميل (fire-and-forget)
  if (payment.status === "completed") {
    fireBookingEvent("payment_received", { orgId, bookingId, amount: parseFloat(body.amount) });
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
// POST /bookings/track/:token/payment — Public: create Moyasar payment link
// ============================================================

bookingsRouter.post("/track/:token/payment", async (c) => {
  const token = c.req.param("token");

  const [booking] = await db
    .select({
      id:             bookings.id,
      orgId:          bookings.orgId,
      bookingNumber:  bookings.bookingNumber,
      balanceDue:     bookings.balanceDue,
      trackingToken:  bookings.trackingToken,
    })
    .from(bookings)
    .where(eq(bookings.trackingToken, token));

  if (!booking) return c.json({ error: "الحجز غير موجود" }, 404);

  const balanceDue = Number(booking.balanceDue ?? 0);
  if (balanceDue <= 0) return c.json({ error: "لا يوجد رصيد مستحق لهذا الحجز" }, 400);

  const [gw] = await db
    .select({ apiKey: paymentGatewayConfigs.apiKey })
    .from(paymentGatewayConfigs)
    .where(and(
      eq(paymentGatewayConfigs.orgId, booking.orgId),
      eq(paymentGatewayConfigs.provider, "moyasar"),
      eq(paymentGatewayConfigs.isActive, true),
    ));

  if (!gw?.apiKey) return c.json({ error: "لم تُفعَّل خدمة الدفع الإلكتروني لهذه المنشأة" }, 503);

  const apiKey = decryptString(gw.apiKey);
  if (!apiKey) return c.json({ error: "خطأ في إعداد بوابة الدفع" }, 503);

  const amountHalala = Math.round(balanceDue * 100);
  const callbackUrl = `${process.env.PUBLIC_URL || "https://app.nasaq.com"}/track/${token}?payment=done`;

  const moyasarRes = await fetch("https://api.moyasar.com/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
    },
    body: JSON.stringify({
      amount:       amountHalala,
      currency:     "SAR",
      description:  `دفع حجز #${booking.bookingNumber}`,
      callback_url: callbackUrl,
      metadata: {
        orgId:    booking.orgId,
        bookingId: booking.id,
        source:   "booking_payment",
      },
      source: { type: "creditcard" },
    }),
  });

  if (!moyasarRes.ok) {
    return c.json({ error: "تعذر إنشاء رابط الدفع" }, 502);
  }

  const payment = await moyasarRes.json() as { id: string; source: { transaction_url?: string } };
  return c.json({ data: { transactionUrl: payment.source?.transaction_url ?? null, paymentId: payment.id } });
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
// GET /bookings/stats/trend — monthly revenue + bookings (last N months)
// ============================================================

bookingsRouter.get("/stats/trend", async (c) => {
  const orgId = getOrgId(c);
  const months = Math.min(parseInt(c.req.query("months") || "6"), 24);
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const rows = await db.select({
    month: sql<string>`to_char(date_trunc('month', ${bookings.createdAt}), 'YYYY-MM')`,
    revenue: sql<string>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`,
    bookingCount: count(),
  }).from(bookings).where(and(
    eq(bookings.orgId, orgId),
    gte(bookings.createdAt, startDate),
    sql`${bookings.status} != 'cancelled'`,
  )).groupBy(sql`date_trunc('month', ${bookings.createdAt})`);

  const map = new Map(rows.map((r) => [r.month, r]));
  const data = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = map.get(month);
    data.push({ month, revenue: parseFloat(row?.revenue ?? "0"), bookings: Number(row?.bookingCount ?? 0) });
  }

  return c.json({ data });
});

// ============================================================
// GET /bookings/stats/growth — current period vs previous period
// ============================================================

bookingsRouter.get("/stats/growth", async (c) => {
  const orgId = getOrgId(c);
  const period = c.req.query("period") || "month";
  const now = new Date();

  let currentStart: Date, previousStart: Date, previousEnd: Date;
  switch (period) {
    case "week":
      currentStart  = new Date(now.getTime() - 7 * 86400000);
      previousStart = new Date(now.getTime() - 14 * 86400000);
      previousEnd   = currentStart;
      break;
    case "quarter":
      currentStart  = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      previousStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 3, 1);
      previousEnd   = currentStart;
      break;
    case "year":
      currentStart  = new Date(now.getFullYear(), 0, 1);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd   = currentStart;
      break;
    default: // month
      currentStart  = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd   = currentStart;
  }

  const baseWhere = (start: Date, end?: Date) => and(
    eq(bookings.orgId, orgId),
    gte(bookings.createdAt, start),
    ...(end ? [lt(bookings.createdAt, end)] : []),
    sql`${bookings.status} != 'cancelled'`,
  );

  const [cur, prev] = await Promise.all([
    db.select({ revenue: sql<string>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`, cnt: count() })
      .from(bookings).where(baseWhere(currentStart)),
    db.select({ revenue: sql<string>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL)), 0)`, cnt: count() })
      .from(bookings).where(baseWhere(previousStart, previousEnd)),
  ]);

  const growth = (prev: number, cur: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0);

  const curRev = parseFloat(cur[0].revenue), prevRev = parseFloat(prev[0].revenue);
  const curCnt = Number(cur[0].cnt), prevCnt = Number(prev[0].cnt);

  return c.json({
    data: {
      period,
      revenue:  { current: curRev, previous: prevRev, growth: growth(prevRev, curRev) },
      bookings: { current: curCnt, previous: prevCnt, growth: growth(prevCnt, curCnt) },
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
