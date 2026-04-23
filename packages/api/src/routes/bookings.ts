import { Hono } from "hono";
import { z } from "zod";
import { Decimal } from "decimal.js";
import { nanoid } from "nanoid";
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
  bookingPipelineStages, invoices, invoiceItems,
  auditLogs,
  treasuryAccounts, treasuryTransactions,
  appointmentBookings, stayBookings, tableReservations, eventBookings,
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
import { salonLog } from "../lib/salon-logger";
import {
  getWorkflowStagesForOrg, canTransition,
  resolveWorkflowExecutionMode,
  TRUE_TERMINAL_STATUSES, GUARDED_TERMINAL_STATUSES,
} from "../lib/workflow-engine";
import {
  getBookingTimeline,
  getBookingSlaState,
  runPostTransitionAutomations,
  recordBlockedTransitionEvent,
  listOperationalAlerts,
} from "../lib/booking-ops";
import type { AuthUser } from "../middleware/auth";

export const bookingsRouter = new Hono<{ Variables: { user: AuthUser | null; orgId: string; locationFilter: string[] | null; requestId: string } }>();
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ============================================================
// SCHEMAS
// ============================================================

// Immediate-sale types: no time slot required — booking = sale at current moment
const IMMEDIATE_TYPES = new Set(["product", "product_shipping", "food_order", "package", "add_on"]);

// Engine types: require a dedicated engine table row (appointment_bookings etc.)
const ENGINE_BOOKING_TYPES = new Set(["appointment", "stay", "table_reservation", "event"]);

// Default conflict window per engine type — used when endsAt is absent
const ENGINE_DEFAULT_DURATION_MINS: Record<string, number> = {
  appointment:       60,
  stay:              1440,
  table_reservation: 120,
  event:             240,
};

// ── insertEngineRow ─────────────────────────────────────────────────────────
// Inserts a single row into the type-specific engine table.
// bookingRecordId links back to booking_records (migration 147 FK).
// bookingRef intentionally NOT set for canonical bookings — it references bookings.id (legacy only).
async function insertEngineRow(
  tx: DbTx,
  bookingType: string,
  engineRowId: string,
  record: typeof bookingRecords.$inferSelect,
  assignedUserId: string | null,
  source: string,
): Promise<void> {
  const engineBookingNumber = record.bookingNumber + "-E";

  if (bookingType === "appointment") {
    await tx.insert(appointmentBookings).values({
      id:              engineRowId,
      orgId:           record.orgId,
      customerId:      record.customerId,
      bookingRecordId: record.id,
      bookingNumber:   engineBookingNumber,
      startAt:         record.startsAt,
      endAt:           record.endsAt ?? null,
      assignedUserId:  assignedUserId ?? null,
      source,
    } as any);
    return;
  }

  if (bookingType === "stay") {
    const checkOut = record.endsAt
      ?? new Date(record.startsAt.getTime() + 24 * 60 * 60 * 1000);
    await tx.insert(stayBookings).values({
      id:              engineRowId,
      orgId:           record.orgId,
      customerId:      record.customerId,
      bookingRecordId: record.id,
      bookingNumber:   engineBookingNumber,
      checkIn:         record.startsAt,
      checkOut,
      source,
    } as any);
    return;
  }

  if (bookingType === "table_reservation") {
    await tx.insert(tableReservations).values({
      id:              engineRowId,
      orgId:           record.orgId,
      customerId:      record.customerId,
      bookingRecordId: record.id,
      bookingNumber:   engineBookingNumber,
      reservationDate: record.startsAt,
      startTime:       record.startsAt,
      endTime:         record.endsAt ?? new Date(record.startsAt.getTime() + 2 * 60 * 60 * 1000),
      locationId:      record.locationId ?? null,
      source,
    } as any);
    return;
  }

  if (bookingType === "event") {
    // eventDate is a date-only column (not timestamp) — extract date part
    const eventDateOnly = record.startsAt.toISOString().slice(0, 10);
    await tx.insert(eventBookings).values({
      id:              engineRowId,
      orgId:           record.orgId,
      customerId:      record.customerId,
      bookingRecordId: record.id,
      bookingNumber:   engineBookingNumber,
      eventDate:       eventDateOnly,
      eventStart:      record.startsAt,
      eventEnd:        record.endsAt ?? new Date(record.startsAt.getTime() + 4 * 60 * 60 * 1000),
      locationId:      record.locationId ?? null,
      source,
    } as any);
    return;
  }

  throw new Error(`insertEngineRow: unsupported bookingType "${bookingType}"`);
}

const createBookingSchema = z.object({
  customerId: z.string().uuid({ message: "يجب اختيار العميل" }),
  eventDate: z.string().datetime({ message: "تاريخ الموعد غير صحيح" }).optional(),
  eventEndDate: z.string().datetime({ message: "تاريخ انتهاء الموعد غير صحيح" }).optional(),
  locationId: z.string().uuid({ message: "معرّف الموقع غير صحيح" }).optional(),
  customLocation: z.string().optional(),
  locationNotes: z.string().optional(),
  customerNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  assignedUserId: z.string().uuid().optional().nullable(),
  source: z.string().default("dashboard"),

  // Booking type — drives engine table selection (canonical path)
  bookingType: z.string().optional(),

  // Items (الخدمات المحجوزة)
  items: z.array(z.object({
    serviceId: z.string().uuid({ message: "يجب اختيار الخدمة" }),
    quantity: z.number().int().min(1, { message: "الكمية يجب أن تكون 1 على الأقل" }).default(1),
    addons: z.array(z.object({
      addonId: z.string().uuid(),
      quantity: z.number().int().min(1).default(1),
    })).default([]),
  })).min(1, { message: "يجب إضافة خدمة واحدة على الأقل" }),

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

const checkoutPaymentSchema = z.object({
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: "amount must be a positive number" }),
  method: z.enum(["cash", "bank_transfer", "mada", "visa_master", "apple_pay", "tamara", "tabby", "wallet", "payment_link"]),
  status: z.enum(["completed", "pending", "failed"]).default("completed"),
  type: z.enum(["payment", "deposit", "refund"]).default("payment"),
  gatewayProvider: z.string().optional().nullable(),
  gatewayTransactionId: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).optional();

const checkoutInvoiceSchema = z.object({
  invoiceType: z.enum(["simplified", "tax", "credit_note", "debit_note"]).optional(),
  buyerName: z.string().optional(),
  buyerPhone: z.string().optional().nullable(),
  buyerEmail: z.string().email().optional().nullable(),
  buyerVatNumber: z.string().optional().nullable(),
  buyerCompanyName: z.string().optional().nullable(),
  buyerCrNumber: z.string().optional().nullable(),
  buyerAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
}).optional();

const checkoutTreasurySchema = z.object({
  treasuryAccountId: z.string().uuid().optional().nullable(),
  description: z.string().optional(),
  reference: z.string().optional().nullable(),
  shiftId: z.string().uuid().optional().nullable(),
}).optional();

const createBookingCheckoutSchema = z.object({
  booking: createBookingSchema,
  payment: checkoutPaymentSchema,
  invoice: checkoutInvoiceSchema,
  treasuryReceipt: checkoutTreasurySchema,
});

function inferBookingTypeFromServices(serviceMap: Map<string, typeof services.$inferSelect>, body: z.infer<typeof createBookingSchema>) {
  if (body.bookingType) return body.bookingType;
  const selectedTypes = body.items
    .map((item) => (serviceMap.get(item.serviceId) as any)?.serviceType as string | undefined)
    .filter((value): value is string => Boolean(value));

  if (selectedTypes.length === 0) return "appointment";
  if (selectedTypes.every((type) => IMMEDIATE_TYPES.has(type))) return selectedTypes[0];
  if (selectedTypes.some((type) => type === "event_rental" || type === "execution")) return "event";
  if (selectedTypes.some((type) => type === "rental")) return "stay";
  return "appointment";
}

function generateZATCAQR(data: { sellerName: string; vatNumber: string; timestamp: string; totalWithVat: string; vatAmount: string }): string {
  const fields = [
    { tag: 1, value: data.sellerName },
    { tag: 2, value: data.vatNumber },
    { tag: 3, value: data.timestamp },
    { tag: 4, value: data.totalWithVat },
    { tag: 5, value: data.vatAmount },
  ];

  const tlv = fields.map((field) => {
    const valueBytes = new TextEncoder().encode(field.value);
    return new Uint8Array([field.tag, valueBytes.length, ...valueBytes]);
  });

  const combined = new Uint8Array(tlv.reduce((total, row) => total + row.length, 0));
  let offset = 0;
  tlv.forEach((row) => {
    combined.set(row, offset);
    offset += row.length;
  });

  return Buffer.from(combined).toString("base64");
}

async function generateTreasuryVoucherNumberTx(tx: DbTx, orgId: string, prefix: "RV" | "PV") {
  const year = new Date().getFullYear();
  const [{ total }] = await tx
    .select({ total: count() })
    .from(treasuryTransactions)
    .where(and(
      eq(treasuryTransactions.orgId, orgId),
      sql`${treasuryTransactions.voucherNumber} LIKE ${`${prefix}-${year}-%`}`,
    ));
  const seq = (Number(total) + 1).toString().padStart(5, "0");
  return `${prefix}-${year}-${seq}`;
}

async function prepareBookingCreation(params: {
  orgId: string;
  userId: string | null;
  body: z.infer<typeof createBookingSchema>;
  requireExplicitBookingType?: boolean;
}) {
  const { orgId, userId, body, requireExplicitBookingType = false } = params;
  const supportedTypes = [...Array.from(ENGINE_BOOKING_TYPES), ...Array.from(IMMEDIATE_TYPES)];

  if (requireExplicitBookingType && !body.bookingType) {
    throw Object.assign(new Error("bookingType مطلوب لإنشاء حجز"), {
      status: 400,
      response: {
        error: "bookingType مطلوب لإنشاء حجز",
        code: "BOOKING_TYPE_REQUIRED",
        supportedTypes,
        hint: "Client قديم؟ حدّث لإرسال bookingType في الـ request body",
      },
    });
  }

  const [customer] = await db.select().from(customers)
    .where(and(eq(customers.id, body.customerId), eq(customers.orgId, orgId)));
  if (!customer) {
    throw Object.assign(new Error("العميل غير موجود"), { status: 404, response: { error: "العميل غير موجود" } });
  }

  const serviceIds = body.items.map((item) => item.serviceId);
  const addonIds = body.items.flatMap((item) => item.addons.map((addon) => addon.addonId));

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
    db.select({
      name: organizations.name,
      phone: organizations.phone,
      email: organizations.email,
      address: organizations.address,
      commercialRegister: organizations.commercialRegister,
      vatNumber: organizations.vatNumber,
      settings: organizations.settings,
      plan: organizations.plan,
      bookingUsed: organizations.bookingUsed,
    }).from(organizations).where(eq(organizations.id, orgId)),
  ]);

  const org = orgRow[0];
  if (org?.plan === "free" && (org.bookingUsed ?? 0) >= FREE_BOOKING_LIMIT) {
    throw Object.assign(new Error("FREE_LIMIT_REACHED"), {
      status: 403,
      response: {
        error: `لقد استخدمت جميع الحجوزات المجانية (${FREE_BOOKING_LIMIT} حجز). للمتابعة واستقبال حجوزات جديدة، قم بالترقية إلى إحدى الباقات.`,
        code: "FREE_LIMIT_REACHED",
      },
    });
  }

  const serviceMap = new Map(allServices.map((service) => [service.id, service]));
  const addonMap = new Map(allAddons.map((addon) => [addon.id, addon]));
  const serviceCostMap = new Map(allServiceCosts.map((cost) => [cost.serviceId, cost]));
  const serviceStaffMap = new Map(allServiceStaffRows.map((row) => [row.serviceId, row]));

  const canonicalBookingType = inferBookingTypeFromServices(serviceMap, body);
  if (!ENGINE_BOOKING_TYPES.has(canonicalBookingType) && !IMMEDIATE_TYPES.has(canonicalBookingType)) {
    throw Object.assign(new Error(`نوع الحجز غير مدعوم: ${canonicalBookingType}`), {
      status: 400,
      response: {
        error: `نوع الحجز غير مدعوم: ${canonicalBookingType}`,
        code: "UNSUPPORTED_BOOKING_TYPE",
        supportedTypes,
      },
    });
  }

  const RENTAL_SVC_TYPES = new Set(["rental", "event_rental"]);
  const rentalDays = (body.eventDate && body.eventEndDate)
    ? Math.max(1, Math.ceil((new Date(body.eventEndDate).getTime() - new Date(body.eventDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  let subtotal = new Decimal(0);
  const itemsToInsert: any[] = [];
  const addonsToInsert: any[] = [];

  for (const item of body.items) {
    const service = serviceMap.get(item.serviceId);
    if (!service) {
      throw Object.assign(new Error(`الخدمة غير موجودة: ${item.serviceId}`), { status: 400, response: { error: `الخدمة غير موجودة: ${item.serviceId}` } });
    }

    if (service.status !== "active" || (service as any).isBookable === false) {
      throw Object.assign(new Error(`الخدمة غير متاحة للحجز: ${service.name}`), { status: 400, response: { error: `الخدمة غير متاحة للحجز: ${service.name}` } });
    }

    const serviceType = (service as any).serviceType as string | undefined;
    if (!IMMEDIATE_TYPES.has(serviceType ?? "") && !body.eventDate) {
      throw Object.assign(new Error(`الخدمة "${service.name}" تتطلب تاريخ ووقت الحجز`), { status: 400, response: { error: `الخدمة "${service.name}" تتطلب تاريخ ووقت الحجز` } });
    }
    if (serviceType === "field_service" && !body.customLocation && !body.locationId) {
      throw Object.assign(new Error(`الخدمة الميدانية "${service.name}" تتطلب تحديد موقع العميل`), { status: 400, response: { error: `الخدمة الميدانية "${service.name}" تتطلب تحديد موقع العميل` } });
    }
    if (serviceType === "rental" && !body.eventEndDate) {
      throw Object.assign(new Error(`خدمة التأجير "${service.name}" تتطلب تحديد تاريخ الانتهاء`), { status: 400, response: { error: `خدمة التأجير "${service.name}" تتطلب تحديد تاريخ الانتهاء` } });
    }

    let unitPrice = new Decimal(service.basePrice);
    const pricingBreakdown: any[] = [{ rule: "base", label: "السعر الأساسي", amount: unitPrice.toNumber() }];

    const rules = allPricingRules.filter((rule) => rule.serviceId === service.id || rule.serviceId === null);
    for (const rule of rules) {
      const adjustment = applyPricingRule(rule, unitPrice.toNumber(), body.eventDate ?? "", body.locationId);
      if (adjustment !== 0) {
        unitPrice = unitPrice.add(adjustment);
        pricingBreakdown.push({
          rule: rule.type,
          label: rule.name,
          adjustment,
          amount: unitPrice.toNumber(),
        });
      }
    }

    const daysMultiplier = RENTAL_SVC_TYPES.has(serviceType ?? "") ? rentalDays : 1;
    unitPrice = unitPrice.toDecimalPlaces(2);
    const totalPrice = unitPrice.mul(item.quantity).mul(daysMultiplier).toDecimalPlaces(2);
    subtotal = subtotal.add(totalPrice);

    const itemId = crypto.randomUUID();
    itemsToInsert.push({
      id: itemId,
      serviceId: service.id,
      serviceName: service.name,
      serviceType: serviceType || null,
      durationMinutes: (service as any).durationMinutes || null,
      vatInclusive: (service as any).vatInclusive ?? true,
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      pricingBreakdown,
    });

    for (const addonReq of item.addons) {
      const addon = addonMap.get(addonReq.addonId);
      if (!addon) continue;

      const addonPrice = addon.priceMode === "percentage"
        ? unitPrice.mul(new Decimal(addon.price).div(100)).toDecimalPlaces(2)
        : new Decimal(addon.price).toDecimalPlaces(2);
      const addonTotal = addonPrice.mul(addonReq.quantity).toDecimalPlaces(2);
      subtotal = subtotal.add(addonTotal);

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

  const orgSettings = (org?.settings ?? {}) as Record<string, unknown>;
  const vatRate = typeof orgSettings.vatRate === "number" ? orgSettings.vatRate : DEFAULT_VAT_RATE;
  const vatAmount = subtotal.mul(vatRate).div(100).toDecimalPlaces(2);
  const totalAmount = subtotal.add(vatAmount).toDecimalPlaces(2);
  const requireDeposit = orgSettings.requireDeposit === true;
  const depositPercent = requireDeposit
    ? Math.max(
        DEFAULT_DEPOSIT_PERCENT,
        ...Array.from(serviceMap.values()).map((service) => parseFloat(String((service as any).depositPercent ?? DEFAULT_DEPOSIT_PERCENT))),
      )
    : 0;
  const depositAmount = totalAmount.mul(depositPercent).div(100).toDecimalPlaces(2);

  const bookingNumber = generateBookingNumber("NSQ");
  const trackingToken = crypto.randomUUID().replace(/-/g, "").substring(0, BOOKING_TRACKING_TOKEN_LENGTH);
  const allImmediate = Array.from(serviceMap.values()).every((service) => IMMEDIATE_TYPES.has((service as any).serviceType ?? ""));
  const resolvedEventDate = body.eventDate ? new Date(body.eventDate) : new Date();
  const engineRowId = crypto.randomUUID();
  const targetStaffId = body.assignedUserId ?? userId;

  if (body.eventDate && !allImmediate) {
    const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    const DAY_ABBR: Record<string, string> = {
      sunday: "sun", monday: "mon", tuesday: "tue", wednesday: "wed",
      thursday: "thu", friday: "fri", saturday: "sat",
    };
    const dayName = DAY_NAMES[resolvedEventDate.getUTCDay()];
    const eventHHMM = `${String(resolvedEventDate.getUTCHours()).padStart(2, "0")}:${String(resolvedEventDate.getUTCMinutes()).padStart(2, "0")}`;

    if (userId) {
      const { rows: [staffRow] } = await db.execute(sql`SELECT working_hours FROM users WHERE id = ${userId} LIMIT 1`);
      const workingHours = (staffRow as any)?.working_hours?.[dayName];
      if (workingHours?.active === false) {
        throw Object.assign(new Error(`الموظف المعيّن غير متاح يوم ${dayName}`), { status: 422, response: { error: `الموظف المعيّن غير متاح يوم ${dayName}` } });
      }
      if (workingHours?.active === true && workingHours.start && workingHours.end) {
        if (eventHHMM < workingHours.start || eventHHMM >= workingHours.end) {
          throw Object.assign(new Error(`الموظف المعيّن غير متاح في هذا الوقت (دوامه ${workingHours.start} – ${workingHours.end})`), {
            status: 422,
            response: { error: `الموظف المعيّن غير متاح في هذا الوقت (دوامه ${workingHours.start} – ${workingHours.end})` },
          });
        }
      }
    }

    if (body.locationId) {
      const { rows: [locRow] } = await db.execute(sql`SELECT opening_hours FROM locations WHERE id = ${body.locationId} AND org_id = ${orgId} LIMIT 1`);
      const openingHours = (locRow as any)?.opening_hours ?? {};
      const todayHours = openingHours[DAY_ABBR[dayName]] ?? openingHours[dayName];
      if (todayHours?.active === false) {
        throw Object.assign(new Error("الفرع مغلق هذا اليوم"), { status: 422, response: { error: "الفرع مغلق هذا اليوم" } });
      }
      if (todayHours?.active === true) {
        const open = todayHours.open ?? todayHours.start;
        const close = todayHours.close ?? todayHours.end;
        if (open && close && (eventHHMM < open || eventHHMM >= close)) {
          throw Object.assign(new Error(`الفرع مغلق في هذا الوقت (${open} – ${close})`), { status: 422, response: { error: `الفرع مغلق في هذا الوقت (${open} – ${close})` } });
        }
      }
    }
  }

  return {
    orgId,
    userId,
    body,
    customer,
    org,
    orgSettings,
    serviceMap,
    serviceCostMap,
    serviceStaffMap,
    canonicalBookingType,
    subtotal,
    vatRate,
    vatAmount,
    totalAmount,
    depositAmount,
    itemsToInsert,
    addonsToInsert,
    bookingNumber,
    trackingToken,
    allImmediate,
    resolvedEventDate,
    engineRowId,
    targetStaffId,
  };
}

async function createCanonicalBookingTx(tx: DbTx, context: Awaited<ReturnType<typeof prepareBookingCreation>>) {
  const {
    body,
    customer,
    org,
    serviceCostMap,
    serviceStaffMap,
    canonicalBookingType,
    subtotal,
    vatAmount,
    totalAmount,
    depositAmount,
    itemsToInsert,
    bookingNumber,
    trackingToken,
    resolvedEventDate,
    engineRowId,
    targetStaffId,
  } = context;

  await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);

  if (body.locationId && ENGINE_BOOKING_TYPES.has(canonicalBookingType)) {
    const durationMins = ENGINE_DEFAULT_DURATION_MINS[canonicalBookingType] ?? 60;
    const eventStart = resolvedEventDate;
    const eventEnd = body.eventEndDate
      ? new Date(body.eventEndDate)
      : new Date(resolvedEventDate.getTime() + durationMins * 60_000);

    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${context.customer.orgId}), hashtext(${"loc:" + body.locationId}))`);

    const { rows: conflictRows } = await tx.execute(sql`
      SELECT id, booking_number FROM booking_records
      WHERE org_id = ${context.customer.orgId}
        AND location_id = ${body.locationId}
        AND status NOT IN ('cancelled', 'no_show')
        AND starts_at < ${eventEnd.toISOString()}
        AND COALESCE(ends_at, starts_at + ${durationMins} * interval '1 minute') >= ${eventStart.toISOString()}
      FOR UPDATE
    `);

    if ((conflictRows as any[]).length > 0) {
      throw Object.assign(
        new Error("يوجد تعارض — الموقع محجوز في هذا التاريخ"),
        { status: 409, code: "LOCATION_CONFLICT", conflicts: (conflictRows as any[]).map((row) => (row as any).booking_number) },
      );
    }
  }

  if (targetStaffId && ENGINE_BOOKING_TYPES.has(canonicalBookingType)) {
    const totalDurationMins = itemsToInsert.reduce((sum: number, item: any) => sum + (item.durationMinutes ?? 0), 0) || 60;
    const staffStart = resolvedEventDate;
    const staffEnd = body.eventEndDate
      ? new Date(body.eventEndDate)
      : new Date(resolvedEventDate.getTime() + totalDurationMins * 60_000);

    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${context.customer.orgId}), hashtext(${"staff:" + targetStaffId}))`);

    const { rows: staffConflict } = await tx.execute(sql`
      SELECT id, booking_number FROM booking_records
      WHERE org_id = ${context.customer.orgId}
        AND assigned_user_id = ${targetStaffId}
        AND status NOT IN ('cancelled', 'no_show')
        AND starts_at < ${staffEnd.toISOString()}
        AND COALESCE(ends_at, starts_at + COALESCE((
          SELECT SUM(duration_minutes) FROM booking_lines
          WHERE booking_record_id = booking_records.id
        ), 60) * interval '1 minute') > ${staffStart.toISOString()}
      FOR UPDATE
    `);

    if ((staffConflict as any[]).length > 0) {
      throw Object.assign(
        new Error("الموظف لديه حجز آخر في نفس الوقت"),
        { status: 409, code: "STAFF_SLOT_CONFLICT", conflicts: (staffConflict as any[]).map((row) => (row as any).booking_number) },
      );
    }
  }

  const [newRecord] = await tx.insert(bookingRecords).values({
    orgId: context.customer.orgId,
    customerId: body.customerId,
    bookingNumber,
    bookingType: canonicalBookingType,
    status: "pending",
    paymentStatus: "pending",
    startsAt: resolvedEventDate,
    endsAt: body.eventEndDate ? new Date(body.eventEndDate) : null,
    locationId: body.locationId ?? null,
    customLocation: body.customLocation ?? null,
    locationNotes: body.locationNotes ?? null,
    customerNotes: body.customerNotes ?? null,
    internalNotes: body.internalNotes ?? null,
    assignedUserId: targetStaffId ?? null,
    subtotal: subtotal.toFixed(2),
    discountAmount: "0",
    vatAmount: vatAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    depositAmount: depositAmount.toFixed(2),
    paidAmount: "0",
    balanceDue: totalAmount.toFixed(2),
    couponCode: body.couponCode ?? null,
    isRecurring: false,
    trackingToken,
    source: body.source ?? "dashboard",
  } as any).returning();

  const canonicalLines: { id: string; serviceRefId: string | null; itemName: string; durationMinutes: number | null; quantity: number; unitPrice: string; totalPrice: string }[] = [];
  const insertedLineIds: string[] = [];

  if (itemsToInsert.length > 0) {
    const lineValues = itemsToInsert.map((item: any) => ({
      bookingRecordId: newRecord.id,
      serviceRefId: item.serviceId,
      itemName: item.serviceName,
      lineType: "service",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      durationMinutes: item.durationMinutes ?? null,
      vatInclusive: item.vatInclusive ?? true,
    }));
    const insertedLines = await tx.insert(bookingLines).values(lineValues as any).returning();
    for (const [index, line] of insertedLines.entries()) {
      insertedLineIds.push(line.id);
      canonicalLines.push({
        id: line.id,
        serviceRefId: line.serviceRefId ?? null,
        itemName: line.itemName,
        durationMinutes: line.durationMinutes ?? null,
        quantity: line.quantity,
        unitPrice: String(line.unitPrice),
        totalPrice: String(line.totalPrice),
      });
      const addonRows = context.addonsToInsert
        .filter((addon) => addon.bookingItemId === itemsToInsert[index].id)
        .map((addon) => ({
          bookingLineId: line.id,
          addonRefId: addon.addonId,
          addonName: addon.addonName,
          quantity: addon.quantity,
          unitPrice: addon.unitPrice,
          totalPrice: addon.totalPrice,
        }));
      if (addonRows.length > 0) {
        await tx.insert(bookingLineAddons).values(addonRows as any);
      }
    }
  }

  if (ENGINE_BOOKING_TYPES.has(canonicalBookingType)) {
    await insertEngineRow(tx as any, canonicalBookingType, engineRowId, newRecord, targetStaffId ?? null, body.source ?? "dashboard");
  }

  await tx.insert(bookingTimelineEvents).values({
    orgId: context.customer.orgId,
    bookingRecordId: newRecord.id,
    userId: context.userId ?? null,
    eventType: "created",
    fromStatus: null,
    toStatus: "pending",
    metadata: { bookingNumber, source: body.source ?? "dashboard" },
  } as any);

  await tx.insert(auditLogs).values({
    orgId: context.customer.orgId,
    userId: context.userId ?? null,
    action: "created",
    resource: "booking_record",
    resourceId: newRecord.id,
    metadata: { bookingNumber, bookingType: canonicalBookingType },
  } as any);

  if (context.userId) {
    await tx.insert(bookingRecordAssignments).values({
      orgId: context.customer.orgId,
      bookingRecordId: newRecord.id,
      userId: context.userId,
      role: "staff",
      assignedAt: new Date(),
    } as any);

    const canonicalCommissions: any[] = [];
    for (let index = 0; index < itemsToInsert.length; index += 1) {
      const item = itemsToInsert[index] as any;
      const lineId = insertedLineIds[index] ?? null;
      const cost = serviceCostMap.get(item.serviceId);
      const staffRow = serviceStaffMap.get(item.serviceId);

      let commissionMode = "percentage";
      let rate = 0;
      if (staffRow && staffRow.commissionMode === "none") continue;
      if (staffRow && staffRow.commissionMode === "fixed") {
        commissionMode = "fixed";
        rate = parseFloat(staffRow.commissionValue as string) || 0;
      } else if (staffRow && staffRow.commissionMode === "percentage") {
        rate = parseFloat(staffRow.commissionValue as string) || 0;
      } else {
        rate = cost ? (parseFloat(cost.commissionPercent as string) || 0) : 10;
      }

      if (rate === 0) continue;

      const baseAmount = parseFloat(item.totalPrice);
      const commissionAmount = commissionMode === "fixed" ? rate : baseAmount * (rate / 100);
      canonicalCommissions.push({
        orgId: context.customer.orgId,
        bookingRecordId: newRecord.id,
        bookingLineId: lineId,
        userId: context.userId,
        serviceRefId: item.serviceId,
        commissionMode,
        rate: rate.toFixed(2),
        baseAmount: baseAmount.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        status: "pending",
      });
    }

    if (canonicalCommissions.length > 0) {
      await tx.insert(bookingRecordCommissions).values(canonicalCommissions as any);
    }
  }

  await tx.update(customers).set({
    totalBookings: sql`${customers.totalBookings} + 1`,
    lastBookingAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(customers.id, body.customerId));

  return { record: newRecord, lines: canonicalLines, engineRowId };
}

async function recordBookingCheckoutPaymentTx(tx: DbTx, params: {
  orgId: string;
  userId: string | null;
  bookingRecordId: string;
  customerId: string;
  payment: NonNullable<z.infer<typeof checkoutPaymentSchema>>;
}) {
  const { orgId, userId, bookingRecordId, customerId, payment } = params;
  const [createdPayment] = await tx.insert(payments).values({
    orgId,
    bookingId: bookingRecordId,
    customerId,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    type: payment.type,
    gatewayProvider: payment.gatewayProvider,
    gatewayTransactionId: payment.gatewayTransactionId,
    receiptNumber: payment.receiptNumber,
    notes: payment.notes,
    paidAt: payment.status === "completed" ? new Date() : null,
  } as any).returning();

  if (payment.status === "completed") {
    const amount = parseFloat(payment.amount);
    const [updatedRecord] = await tx.select({
      totalAmount: bookingRecords.totalAmount,
      paidAmount: bookingRecords.paidAmount,
    }).from(bookingRecords)
      .where(and(eq(bookingRecords.id, bookingRecordId), eq(bookingRecords.orgId, orgId)))
      .for("update");

    const currentPaid = Number(updatedRecord?.paidAmount ?? 0);
    const totalAmount = Number(updatedRecord?.totalAmount ?? 0);
    const nextPaid = currentPaid + amount;
    const balanceDue = Math.max(0, totalAmount - nextPaid);

    await tx.update(bookingRecords).set({
      paidAmount: nextPaid.toFixed(2),
      balanceDue: balanceDue.toFixed(2),
      paymentStatus: balanceDue <= 0 ? "paid" : "partially_paid",
      updatedAt: new Date(),
    }).where(and(eq(bookingRecords.id, bookingRecordId), eq(bookingRecords.orgId, orgId)));

    await tx.update(customers).set({
      totalSpent: sql`COALESCE(${customers.totalSpent}, 0) + ${amount}`,
      updatedAt: new Date(),
    }).where(eq(customers.id, customerId));
  }

  return createdPayment;
}

async function createBookingInvoiceTx(tx: DbTx, params: {
  orgId: string;
  bookingRecord: typeof bookingRecords.$inferSelect;
  bookingLinesSnapshot: { itemName: string; quantity: number; unitPrice: string; totalPrice: string }[];
  customer: typeof customers.$inferSelect;
  org: Awaited<ReturnType<typeof prepareBookingCreation>>["org"];
  invoiceInput?: z.infer<typeof checkoutInvoiceSchema>;
  payment?: typeof payments.$inferSelect | null;
}) {
  const { orgId, bookingRecord, bookingLinesSnapshot, customer, org, invoiceInput, payment } = params;
  const year = new Date().getFullYear();
  const invoiceNumber = `INV-${year}-${nanoid(4).toUpperCase()}`;
  const invoiceUuid = crypto.randomUUID();
  const vatRate = Number((org?.settings as any)?.vatRate ?? DEFAULT_VAT_RATE);
  const paidAmount = payment?.status === "completed" ? Math.min(parseFloat(String(payment.amount)), parseFloat(String(bookingRecord.totalAmount))) : 0;
  const issueDate = new Date();
  const qrData = generateZATCAQR({
    sellerName: org?.name ?? "ترميز OS",
    vatNumber: org?.vatNumber ?? "",
    timestamp: issueDate.toISOString(),
    totalWithVat: String(bookingRecord.totalAmount),
    vatAmount: String(bookingRecord.vatAmount),
  });

  const [invoice] = await tx.insert(invoices).values({
    orgId,
    bookingId: bookingRecord.id,
    customerId: bookingRecord.customerId,
    invoiceNumber,
    uuid: invoiceUuid,
    invoiceType: invoiceInput?.invoiceType ?? "simplified",
    sourceType: "booking",
    status: paidAmount >= parseFloat(String(bookingRecord.totalAmount)) ? "paid" : "issued",
    sellerName: org?.name ?? "ترميز OS",
    sellerVatNumber: org?.vatNumber ?? null,
    sellerAddress: org?.address ?? null,
    sellerCR: org?.commercialRegister ?? null,
    buyerName: invoiceInput?.buyerName ?? customer.name,
    buyerPhone: invoiceInput?.buyerPhone ?? customer.phone ?? null,
    buyerEmail: invoiceInput?.buyerEmail ?? customer.email ?? null,
    buyerVatNumber: invoiceInput?.buyerVatNumber ?? customer.vatNumber ?? null,
    buyerCompanyName: invoiceInput?.buyerCompanyName ?? customer.companyName ?? null,
    buyerCrNumber: invoiceInput?.buyerCrNumber ?? customer.commercialRegister ?? null,
    buyerAddress: invoiceInput?.buyerAddress ?? customer.address ?? null,
    subtotal: String(bookingRecord.subtotal),
    discountAmount: String(bookingRecord.discountAmount ?? "0"),
    taxableAmount: String(bookingRecord.subtotal),
    vatRate: String(vatRate),
    vatAmount: String(bookingRecord.vatAmount),
    totalAmount: String(bookingRecord.totalAmount),
    paidAmount: paidAmount.toFixed(2),
    qrCode: qrData,
    issueDate,
    dueDate: invoiceInput?.dueDate ? new Date(invoiceInput.dueDate) : null,
    notes: invoiceInput?.notes ?? null,
    termsAndConditions: invoiceInput?.termsAndConditions ?? ((org?.settings as any)?.invoiceTermsTemplate ?? null),
    paidAt: paidAmount > 0 ? issueDate : null,
  } as any).returning();

  if (bookingLinesSnapshot.length > 0) {
    await tx.insert(invoiceItems).values(bookingLinesSnapshot.map((line, index) => {
      const taxableAmount = Number(line.totalPrice);
      const lineVatAmount = new Decimal(taxableAmount).mul(vatRate).div(100).toDecimalPlaces(2);
      return {
        invoiceId: invoice.id,
        description: line.itemName,
        quantity: String(line.quantity),
        unitPrice: line.unitPrice,
        discountAmount: "0",
        taxableAmount: taxableAmount.toFixed(2),
        vatRate: String(vatRate),
        vatAmount: lineVatAmount.toFixed(2),
        totalAmount: new Decimal(taxableAmount).add(lineVatAmount).toFixed(2),
        sortOrder: index,
      };
    }) as any);
  }

  return invoice;
}

async function resolveTreasuryAccountTx(tx: DbTx, params: {
  orgId: string;
  treasuryAccountId?: string | null;
  paymentMethod: string;
}) {
  const { orgId, treasuryAccountId, paymentMethod } = params;
  if (treasuryAccountId) {
    const [account] = await tx.select({
      id: treasuryAccounts.id,
      currentBalance: treasuryAccounts.currentBalance,
    }).from(treasuryAccounts)
      .where(and(eq(treasuryAccounts.id, treasuryAccountId), eq(treasuryAccounts.orgId, orgId), eq(treasuryAccounts.isActive, true)))
      .for("update");
    return account ?? null;
  }

  const preferredTypes = paymentMethod === "cash"
    ? ["main_cash", "branch_cash", "cashier_drawer", "petty_cash", "bank_account"]
    : ["bank_account", "main_cash", "branch_cash", "cashier_drawer", "petty_cash"];
  const [account] = await tx.select({
    id: treasuryAccounts.id,
    currentBalance: treasuryAccounts.currentBalance,
  }).from(treasuryAccounts)
    .where(and(
      eq(treasuryAccounts.orgId, orgId),
      eq(treasuryAccounts.isActive, true),
      inArray(treasuryAccounts.type, preferredTypes as any),
    ))
    .orderBy(desc(treasuryAccounts.isDefault), asc(treasuryAccounts.name))
    .limit(1)
    .for("update");
  return account ?? null;
}

async function createTreasuryReceiptTx(tx: DbTx, params: {
  orgId: string;
  userId: string | null;
  bookingRecordId: string;
  invoiceId: string;
  customer: typeof customers.$inferSelect;
  payment: typeof payments.$inferSelect;
  treasuryReceipt?: z.infer<typeof checkoutTreasurySchema>;
}) {
  const { orgId, userId, bookingRecordId, invoiceId, customer, payment, treasuryReceipt } = params;
  const account = await resolveTreasuryAccountTx(tx, {
    orgId,
    treasuryAccountId: treasuryReceipt?.treasuryAccountId ?? null,
    paymentMethod: payment.method,
  });
  if (!account) {
    throw Object.assign(new Error("الصندوق غير موجود"), { status: 404, response: { error: "الصندوق غير موجود" } });
  }

  const amount = parseFloat(String(payment.amount));
  const newBalance = parseFloat(account.currentBalance ?? "0") + amount;
  const voucherNumber = await generateTreasuryVoucherNumberTx(tx, orgId, "RV");

  await tx.update(treasuryAccounts)
    .set({ currentBalance: String(newBalance), updatedAt: new Date() })
    .where(eq(treasuryAccounts.id, account.id));

  const [transaction] = await tx.insert(treasuryTransactions).values({
    orgId,
    treasuryAccountId: account.id,
    transactionType: "receipt",
    amount: String(payment.amount),
    balanceAfter: String(newBalance),
    description: treasuryReceipt?.description ?? `دفعة حجز — ${customer.name}`,
    reference: treasuryReceipt?.reference ?? null,
    voucherNumber,
    sourceType: "invoice",
    sourceId: invoiceId,
    paymentMethod: payment.method,
    counterpartyType: "customer",
    counterpartyId: customer.id,
    counterpartyName: customer.name,
    shiftId: treasuryReceipt?.shiftId ?? null,
    createdBy: userId ?? null,
  } as any).returning();

  return transaction;
}

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

  const conditions = [eq(bookingRecords.orgId, orgId)];

  if (status) conditions.push(eq(bookingRecords.status, status as any));
  if (paymentStatus) conditions.push(eq(bookingRecords.paymentStatus, paymentStatus as any));
  if (customerId) conditions.push(eq(bookingRecords.customerId, customerId));
  if (locationId) conditions.push(eq(bookingRecords.locationId, locationId));
  if (dateFrom) conditions.push(gte(bookingRecords.startsAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(bookingRecords.startsAt, new Date(dateTo)));
  if (search) conditions.push(
    or(
      ilike(bookingRecords.bookingNumber, `%${search}%`),
      ilike(bookingRecords.customerNotes, `%${search}%`)
    )!
  );

  // Location-level RBAC
  const locationFilter = c.get("locationFilter");
  if (locationFilter) {
    conditions.push(sql`${bookingRecords.locationId} = ANY(${locationFilter})`);
  }

  const [result, [{ total }]] = await Promise.all([
    db
      .select({
        booking: bookingRecords,
        customerName: customers.name,
        customerPhone: customers.phone,
        locationName: locations.name,
        // Correlated subquery via raw SQL — avoids N+1 (booking_records.id = outer row)
        firstServiceName: sql<string | null>`(SELECT bl.item_name FROM booking_lines bl WHERE bl.booking_record_id = booking_records.id LIMIT 1)`,
        firstDurationMinutes: sql<number | null>`(SELECT bl.duration_minutes FROM booking_lines bl WHERE bl.booking_record_id = booking_records.id LIMIT 1)`,
      })
      .from(bookingRecords)
      .leftJoin(customers, eq(bookingRecords.customerId, customers.id))
      .leftJoin(locations, eq(bookingRecords.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(sortDir === "asc" ? asc(bookingRecords.createdAt) : desc(bookingRecords.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(bookingRecords).where(and(...conditions)),
  ]);

  return c.json({
    data: result.map((r) => ({
      ...r.booking,
      customer: { name: r.customerName, phone: r.customerPhone },
      location: r.locationName ? { name: r.locationName } : null,
      serviceName: r.firstServiceName ?? null,
      durationMinutes: r.firstDurationMinutes ?? null,
    })),
    pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
  });
});

// GET /bookings/check-availability — instant conflict check before booking
// MUST be registered before /:id to avoid route collision
bookingsRouter.get("/check-availability", async (c) => {
  const orgId     = getOrgId(c);
  const locationId = c.req.query("locationId");
  const date       = c.req.query("date"); // YYYY-MM-DD
  const endDate    = c.req.query("endDate"); // optional for rentals

  if (!date) return c.json({ available: true });

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd   = endDate ? new Date(`${endDate}T23:59:59`) : new Date(`${date}T23:59:59`);

  const conditions = [
    eq(bookingRecords.orgId, orgId),
    sql`${bookingRecords.status} NOT IN ('cancelled')`,
    // overlapping: starts before dayEnd AND ends after dayStart
    lte(bookingRecords.startsAt, dayEnd),
    gte(sql`COALESCE(${bookingRecords.endsAt}, ${bookingRecords.startsAt})`, dayStart),
  ];

  if (locationId) conditions.push(eq(bookingRecords.locationId, locationId));

  const conflicts = await db
    .select({ bookingNumber: bookingRecords.bookingNumber, startsAt: bookingRecords.startsAt })
    .from(bookingRecords)
    .where(and(...conditions))
    .limit(5);

  return c.json({ available: conflicts.length === 0, conflicts: conflicts.map(r => r.bookingNumber) });
});

// ============================================================
// GET /bookings/alerts — Operational alerts for the org
// MUST be registered before /:id to avoid route collision
// ============================================================
bookingsRouter.get("/alerts", async (c) => {
  const orgId = getOrgId(c);
  const limitParam = c.req.query("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50;

  const alerts = await listOperationalAlerts(orgId, limit);
  return c.json({ data: alerts, count: alerts.length });
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
      id:            bookingRecords.id,
      bookingNumber: bookingRecords.bookingNumber,
      status:        bookingRecords.status,
      startsAt:      bookingRecords.startsAt,
      endsAt:        bookingRecords.endsAt,
      totalAmount:   bookingRecords.totalAmount,
      paymentStatus: bookingRecords.paymentStatus,
      customerName:  customers.name,
      locationName:  locations.name,
    })
    .from(bookingRecords)
    .leftJoin(customers, eq(bookingRecords.customerId, customers.id))
    .leftJoin(locations, eq(bookingRecords.locationId, locations.id))
    .where(and(
      eq(bookingRecords.orgId, orgId),
      gte(bookingRecords.startsAt, new Date(from)),
      lte(bookingRecords.startsAt, new Date(to)),
      sql`${bookingRecords.status} NOT IN ('cancelled')`
    ))
    .orderBy(asc(bookingRecords.startsAt));

  return c.json({ data: result });
});

// ============================================================
// GET /bookings/:id — Full booking with items, addons, payments
// ============================================================

bookingsRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const requestId = c.get("requestId");

  const [booking] = await db.select().from(bookingRecords)
    .where(and(eq(bookingRecords.id, id), eq(bookingRecords.orgId, orgId)));

  if (!booking) return c.json({ error: "الحجز غير موجود" }, 404);

  // Load related data in parallel
  const [customer, location, lines, bookingInvoice] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, booking.customerId)).then(r => r[0]),
    booking.locationId
      ? db.select().from(locations).where(eq(locations.id, booking.locationId)).then(r => r[0])
      : null,
    db.select().from(bookingLines).where(eq(bookingLines.bookingRecordId, id)),
    // Computed invoice state — derived from invoices table, no stored column needed
    db.select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.bookingId, id), eq(invoices.orgId, orgId)))
      .orderBy(desc(invoices.issueDate))
      .limit(1)
      .then(r => r[0] ?? null),
  ]);

  // Fetch all addons in a single query instead of N per-line queries
  const allAddons = lines.length > 0
    ? await db.select().from(bookingLineAddons)
        .where(inArray(bookingLineAddons.bookingLineId, lines.map((l) => l.id)))
    : [];

  const addonsByLineId = allAddons.reduce<Record<string, typeof allAddons>>((acc, addon) => {
    if (!acc[addon.bookingLineId]) acc[addon.bookingLineId] = [];
    acc[addon.bookingLineId].push(addon);
    return acc;
  }, {});

  const linesWithAddons = lines.map((line) => ({
    ...line,
    addons: addonsByLineId[line.id] ?? [],
  }));

  // TODO Phase 3.C: add payments[] once payments schema is migrated to canonical
  return c.json({
    data: {
      ...booking,
      customer,
      location,
      items: linesWithAddons,
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

  log.info({ orgId, userId, requestId, customerId: body.customerId, itemsCount: body.items.length, source: body.source }, "[bookings] create started");
  let prepared: Awaited<ReturnType<typeof prepareBookingCreation>>;
  try {
    prepared = await prepareBookingCreation({ orgId, userId, body, requireExplicitBookingType: true });
  } catch (err: any) {
    if (err?.response) return c.json(err.response, err.status ?? 400);
    throw err;
  }

  try {
    const { record: canonicalRecord, lines: canonicalLines, engineRowId } = await db.transaction((tx) =>
      createCanonicalBookingTx(tx, prepared)
    );

    salonLog.bookingCreated({
      requestId: requestId ?? undefined,
      orgId,
      bookingId: canonicalRecord.id,
      customerId: canonicalRecord.customerId ?? undefined,
      assignedUserId: userId ?? undefined,
      metadata: { bookingNumber: canonicalRecord.bookingNumber },
    });

    if (prepared.org?.plan === "free") {
      await db.update(organizations)
        .set({ bookingUsed: sql`${organizations.bookingUsed} + 1` })
        .where(eq(organizations.id, orgId));
    }

    fireBookingEvent("booking_confirmed", { orgId, bookingId: canonicalRecord.id });
    fireBookingEvent("owner_new_booking", { orgId, bookingId: canonicalRecord.id });

    return c.json({
      data: {
        ...canonicalRecord,
        lines: canonicalLines,
        engineRowId,
        trackingUrl: `/track/${prepared.trackingToken}`,
      },
    }, 201);
  } catch (err: any) {
    if (err.code === "55P03") {
      return c.json({ error: "الموقع مشغول حالياً، حاول بعد قليل", code: "LOCK_TIMEOUT" }, 503);
    }
    if (err?.status === 409) {
      salonLog.bookingConflictRejected({
        requestId: requestId ?? undefined,
        orgId,
        assignedUserId: userId ?? undefined,
        metadata: { conflictType: err.code === "LOCATION_CONFLICT" ? "location" : "staff", conflictBookings: err.conflicts ?? [] },
      });
      return c.json({ error: err.message, code: err.code, conflicts: err.conflicts ?? [] }, 409);
    }
    if (err?.response) return c.json(err.response, err.status ?? 400);
    salonLog.bookingFailed({
      requestId: requestId ?? undefined,
      orgId,
      assignedUserId: userId ?? undefined,
      metadata: { reason: err?.message ?? "unknown" },
    });
    throw err;
  }
});

bookingsRouter.post("/checkout", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const requestId = c.get("requestId");
  const { booking, payment, invoice, treasuryReceipt } = createBookingCheckoutSchema.parse(await c.req.json());

  log.info({ orgId, userId, requestId, customerId: booking.customerId, itemsCount: booking.items.length, source: booking.source }, "[bookings] checkout started");

  let prepared: Awaited<ReturnType<typeof prepareBookingCreation>>;
  try {
    prepared = await prepareBookingCreation({ orgId, userId, body: booking });
  } catch (err: any) {
    if (err?.response) return c.json(err.response, err.status ?? 400);
    throw err;
  }

  try {
    const checkout = await db.transaction(async (tx) => {
      const { record: bookingRecord, lines, engineRowId } = await createCanonicalBookingTx(tx, prepared);
      const createdPayment = payment
        ? await recordBookingCheckoutPaymentTx(tx, {
            orgId,
            userId,
            bookingRecordId: bookingRecord.id,
            customerId: bookingRecord.customerId,
            payment,
          })
        : null;
      const createdInvoice = await createBookingInvoiceTx(tx, {
        orgId,
        bookingRecord,
        bookingLinesSnapshot: lines,
        customer: prepared.customer,
        org: prepared.org,
        invoiceInput: invoice,
        payment: createdPayment,
      });
      const treasuryTransaction = createdPayment?.status === "completed"
        ? await createTreasuryReceiptTx(tx, {
            orgId,
            userId,
            bookingRecordId: bookingRecord.id,
            invoiceId: createdInvoice.id,
            customer: prepared.customer,
            payment: createdPayment,
            treasuryReceipt,
          })
        : null;

      return { bookingRecord, lines, engineRowId, payment: createdPayment, invoice: createdInvoice, treasuryReceipt: treasuryTransaction };
    });

    salonLog.bookingCreated({
      requestId: requestId ?? undefined,
      orgId,
      bookingId: checkout.bookingRecord.id,
      customerId: checkout.bookingRecord.customerId ?? undefined,
      assignedUserId: userId ?? undefined,
      metadata: { bookingNumber: checkout.bookingRecord.bookingNumber, mode: "checkout" },
    });

    if (prepared.org?.plan === "free") {
      await db.update(organizations)
        .set({ bookingUsed: sql`${organizations.bookingUsed} + 1` })
        .where(eq(organizations.id, orgId));
    }

    fireBookingEvent("booking_confirmed", { orgId, bookingId: checkout.bookingRecord.id });
    fireBookingEvent("owner_new_booking", { orgId, bookingId: checkout.bookingRecord.id });
    if (checkout.payment?.status === "completed") {
      fireBookingEvent("payment_received", { orgId, bookingId: checkout.bookingRecord.id, amount: parseFloat(String(checkout.payment.amount)) });
    }
    fireBookingEvent("invoice_issued", {
      orgId,
      customerId: checkout.bookingRecord.customerId,
      invoiceNumber: checkout.invoice.invoiceNumber,
      amount: parseFloat(String(checkout.invoice.totalAmount)),
    });

    insertAuditLog({ orgId, userId, action: "created", resource: "invoice", resourceId: checkout.invoice.id });
    if (checkout.payment) {
      insertAuditLog({
        orgId,
        userId,
        action: "payment_recorded",
        resource: "payment",
        resourceId: checkout.payment.id,
        newValue: {
          bookingId: checkout.bookingRecord.id,
          amount: checkout.payment.amount,
          method: checkout.payment.method,
          status: checkout.payment.status,
        },
      });
    }

    if (checkout.payment?.status === "completed" && checkout.payment.customerId) {
      awardLoyaltyPoints({
        orgId,
        customerId: checkout.payment.customerId,
        bookingId: checkout.bookingRecord.id,
        bookingAmount: parseFloat(String(checkout.payment.amount)),
      }).catch(() => {});
    }

    try {
      if (isAccountingEnabled((prepared.org?.settings as any) ?? {})) {
        await autoJournal.invoiceIssued({
          orgId,
          invoiceId: checkout.invoice.id,
          invoiceNumber: checkout.invoice.invoiceNumber,
          amount: parseFloat(String(checkout.invoice.totalAmount)),
        });

        if (checkout.payment?.status === "completed") {
          const amount = parseFloat(String(checkout.payment.amount));
          const vatAmount = 0;
          if (checkout.payment.type === "deposit") {
            await postDepositReceived({ orgId, date: new Date(), amount, description: `عربون حجز ${checkout.bookingRecord.id}`, sourceId: checkout.payment.id, createdBy: userId ?? undefined });
          } else if (checkout.payment.type === "refund") {
            await postRefund({ orgId, date: new Date(), amount, vatAmount, description: `استرداد حجز ${checkout.bookingRecord.id}`, sourceId: checkout.payment.id, createdBy: userId ?? undefined });
          } else {
            await postCashSale({ orgId, date: new Date(), amount, vatAmount, description: `تحصيل دفعة حجز ${checkout.bookingRecord.id}`, sourceType: "booking", sourceId: checkout.payment.id, createdBy: userId ?? undefined });
          }
        }
      }
    } catch {}

    return c.json({
      data: {
        booking: {
          ...checkout.bookingRecord,
          lines: checkout.lines,
          engineRowId: checkout.engineRowId,
          trackingUrl: `/track/${prepared.trackingToken}`,
        },
        payment: checkout.payment,
        invoice: checkout.invoice,
        treasuryReceipt: checkout.treasuryReceipt,
      },
    }, 201);
  } catch (err: any) {
    if (err.code === "55P03") {
      return c.json({ error: "الموقع مشغول حالياً، حاول بعد قليل", code: "LOCK_TIMEOUT" }, 503);
    }
    if (err?.status === 409) {
      salonLog.bookingConflictRejected({
        requestId: requestId ?? undefined,
        orgId,
        assignedUserId: userId ?? undefined,
        metadata: { conflictType: err.code === "LOCATION_CONFLICT" ? "location" : "staff", conflictBookings: err.conflicts ?? [] },
      });
      return c.json({ error: err.message, code: err.code, conflicts: err.conflicts ?? [] }, 409);
    }
    if (err?.response) return c.json(err.response, err.status ?? 400);
    salonLog.bookingFailed({
      requestId: requestId ?? undefined,
      orgId,
      assignedUserId: userId ?? undefined,
      metadata: { reason: err?.message ?? "unknown", mode: "checkout" },
    });
    throw err;
  }
});

// ============================================================
// PATCH /bookings/:id/status — Update booking status
// ============================================================

const updateStatusSchema = z.object({
  status: z.enum([
    "pending", "confirmed", "deposit_paid", "fully_confirmed",
    "preparing", "in_progress", "completed", "reviewed",
    "cancelled", "no_show",
  ]),
  reason: z.string().optional(),
  // force: bypass workflow guards for TRUE_TERMINAL / GUARDED_TERMINAL states
  // Requires bookings.force_transition permission — enforced server-side
  // reason becomes MANDATORY when force=true
  force:  z.boolean().optional().default(false),
});

bookingsRouter.patch("/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const actingUserId = getUserId(c);
  const requestId = c.get("requestId");
  const id = c.req.param("id");
  const { status: newStatus, reason, force } = updateStatusSchema.parse(await c.req.json());
  const actorUser  = c.get("user");
  const actorType  = actorUser?.type ?? "staff";
  // bookings.force_transition is owner-only permission — enforced here, not in client
  const canForce   = actorUser?.dotPermissions?.includes("bookings.force_transition") ?? false;

  log.info({ orgId, bookingId: id, actingUserId, requestId, newStatus, hasReason: Boolean(reason) }, "[bookings] status.update started");

  // ── Workflow mode resolution (centralized, deterministic) ──────────────────
  // Stages loaded once outside transaction — canTransition is pure, no extra DB in tx
  const workflowStages   = await getWorkflowStagesForOrg(orgId);
  const { mode: workflowMode, configState, reason: modeReason } = resolveWorkflowExecutionMode(workflowStages);

  // force + reason validation (server-side, cannot be bypassed by client)
  if (force) {
    if (!canForce) {
      return c.json({ error: "غير مصرح: تجاوز مسار الحجز يتطلب صلاحية bookings.force_transition" }, 403);
    }
    if (!reason || reason.trim().length < 3) {
      return c.json({ error: "السبب إلزامي عند استخدام التجاوز الإداري (force)" }, 400);
    }
  }

  // P0-1 fix: wrap read+write in a transaction with FOR UPDATE to prevent TOCTOU
  // P0-2 fix: supply deduction is INSIDE this transaction — atomic with status change (no silent failures)
  // P0-3 fix: un-completing a booking reverses supply consumptions before re-deducting is possible
  // Workflow errors thrown inside the tx bubble up as 422 (caught below)
  // Captured outside transaction so the blocked-event writer can access it on 422
  let capturedFromStatus: string | null = null;

  let statusTx;
  try {
    statusTx = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ status: bookingRecords.status })
      .from(bookingRecords)
      .where(and(eq(bookingRecords.id, id), eq(bookingRecords.orgId, orgId)))
      .for("update");
    if (!existing) return null;
    capturedFromStatus = existing.status;

    // ── Workflow State Machine Guard (pure check, no extra DB round-trip) ──────
    if (existing.status !== newStatus) {
      const result = canTransition(existing.status, newStatus, workflowStages, workflowMode);

      if (result.warning) {
        log.warn(
          { orgId, bookingId: id, requestId, fromStatus: existing.status, toStatus: newStatus,
            warning: result.warning, mode: result.mode, configState },
          "[workflow] soft transition violation — proceeding",
        );
      }

      if (!result.allowed) {
        // requiresForce=true: can be overridden by force + bookings.force_transition permission
        // requiresForce=false: hard block (non-skippable stage) — force doesn't help
        if (result.requiresForce && force && canForce) {
          // Forced transition — audit trail + timeline event (both mandatory)
          insertAuditLog({
            orgId, userId: actingUserId,
            action:     "force_transition",
            resource:   "booking",
            resourceId: id,
            oldValue:   { status: existing.status },
            newValue:   { status: newStatus },
            metadata: {
              forced:       true,
              triggerType:  "forced",
              actorType,
              configState,
              workflowMode,
              reason:       reason ?? null,
              blockedBy:    result.blockedBy ?? null,
              modeReason,
            },
          });
          // Also write forced_transition to bookingEvents for timeline visibility
          // (this runs inside the tx — if tx rolls back, event rolls back too — intentional)
          await tx.insert(bookingTimelineEvents).values({
            orgId,
            bookingRecordId: id,
            userId: actingUserId,
            eventType: "forced_transition",
            fromStatus: existing.status,
            toStatus: newStatus,
            metadata: {
              forced: true,
              reason: reason ?? null,
              actorType,
              workflowMode,
              configState,
            },
          } as any);
          log.warn(
            { orgId, bookingId: id, requestId, actorType, actorId: actingUserId,
              fromStatus: existing.status, toStatus: newStatus, reason },
            "[workflow] FORCED transition by privileged actor — audit logged",
          );
        } else {
          const httpErr = Object.assign(
            new Error(result.error ?? "WORKFLOW_TRANSITION_BLOCKED"),
            { status: 422, blockedBy: result.blockedBy ?? null, requiresForce: result.requiresForce ?? false },
          );
          throw httpErr;
        }
      }
    }

    const updates: Partial<typeof bookingRecords.$inferInsert> = { status: newStatus, updatedAt: new Date() };
    if (newStatus === "cancelled") {
      updates.cancelledAt = new Date();
      updates.cancellationReason = reason ?? null;
    }

    const [upd] = await tx.update(bookingRecords)
      .set(updates)
      .where(and(eq(bookingRecords.id, id), eq(bookingRecords.orgId, orgId)))
      .returning();

    if (!upd) return null;

    // ── Supply Reversal: restores inventory when un-completing a booking ──
    // Covers: completed → pending, completed → cancelled, completed → no_show
    // Dual-path: canonical (bookingRecordConsumptions) + legacy (bookingConsumptions)
    if (existing.status === "completed" && newStatus !== "completed") {
      // Canonical reversal
      const canonicalConsumptions = await tx.select().from(bookingRecordConsumptions)
        .where(and(eq(bookingRecordConsumptions.bookingRecordId, id), eq(bookingRecordConsumptions.orgId, orgId)));

      for (const consumption of canonicalConsumptions) {
        if (!consumption.supplyId) continue;
        const qty = parseFloat(consumption.quantity as string);
        await tx.execute(sql`
          UPDATE salon_supplies
          SET quantity = (quantity::numeric + ${qty})::text, updated_at = NOW()
          WHERE id = ${consumption.supplyId} AND org_id = ${orgId}
        `);
        await tx.insert(salonSupplyAdjustments).values({
          orgId,
          supplyId:  consumption.supplyId,
          delta:     String(qty),
          reason:    "adjusted",
          notes:     `إعادة مخزون — تراجع حجز ${id.slice(0, 8)} من مكتمل إلى ${newStatus}`,
          createdBy: actingUserId,
        });
      }
      if (canonicalConsumptions.length > 0) {
        await tx.delete(bookingRecordConsumptions)
          .where(and(eq(bookingRecordConsumptions.bookingRecordId, id), eq(bookingRecordConsumptions.orgId, orgId)));
      }

      // Legacy reversal (unchanged)
      const consumptions = await tx.select().from(bookingConsumptions)
        .where(and(eq(bookingConsumptions.bookingId, id), eq(bookingConsumptions.orgId, orgId)));

      for (const consumption of consumptions) {
        if (!consumption.supplyId) continue;
        const qty = parseFloat(consumption.quantity as string);
        await tx.execute(sql`
          UPDATE salon_supplies
          SET quantity = (quantity::numeric + ${qty})::text, updated_at = NOW()
          WHERE id = ${consumption.supplyId} AND org_id = ${orgId}
        `);
        await tx.insert(salonSupplyAdjustments).values({
          orgId,
          supplyId:  consumption.supplyId,
          delta:     String(qty),
          reason:    "adjusted",
          notes:     `إعادة مخزون — تراجع حجز ${id.slice(0, 8)} من مكتمل إلى ${newStatus}`,
          createdBy: actingUserId,
        });
      }
      if (consumptions.length > 0) {
        await tx.delete(bookingConsumptions)
          .where(and(eq(bookingConsumptions.bookingId, id), eq(bookingConsumptions.orgId, orgId)));
      }
    }

    // ── Supply Deduction: deducts recipe quantities on booking completion ──
    // Dual-path: canonical (bookingLines.serviceRefId) + legacy (bookingItems.serviceId)
    if (newStatus === "completed" && existing.status !== "completed") {

      // ── Canonical path: bookingLines.serviceRefId → recipes → bookingRecordConsumptions ──
      const { rows: canonicalConsumed } = await tx.execute(sql`
        SELECT 1 FROM booking_consumptions_canonical
        WHERE booking_record_id = ${id} AND org_id = ${orgId}
        LIMIT 1
      `);

      if (canonicalConsumed.length === 0) {
        const lines = await tx.select({
          id:           bookingLines.id,
          serviceRefId: bookingLines.serviceRefId,
          quantity:     bookingLines.quantity,
        }).from(bookingLines).where(eq(bookingLines.bookingRecordId, id));

        for (const line of lines) {
          // SKIP lines with NULL serviceRefId — same behavior as legacy bookingItems with NULL serviceId
          // These are ad-hoc items without recipe mapping
          if (!line.serviceRefId) {
            log.debug({ bookingRecordId: id, lineId: line.id }, "[supply] skipping line without serviceRefId");
            continue;
          }
          const recipes = await tx.select().from(serviceSupplyRecipes)
            .where(and(
              eq(serviceSupplyRecipes.serviceId, line.serviceRefId),
              eq(serviceSupplyRecipes.orgId, orgId),
            ));

          for (const recipe of recipes) {
            const totalQty = parseFloat(recipe.quantity as string) * (line.quantity || 1);

            const [supply] = await tx
              .select({ id: salonSupplies.id, quantity: salonSupplies.quantity })
              .from(salonSupplies)
              .where(eq(salonSupplies.id, recipe.supplyId))
              .for("update");
            if (!supply) continue;

            const currentQty = new Decimal(supply.quantity as string);
            // P0-4 fix: allow negative stock — real shortage is recorded, not hidden by Math.max(0,…)
            const newQty = currentQty.sub(totalQty);

            if (newQty.isNegative()) {
              salonLog.inventoryLowStock({
                requestId: requestId ?? undefined, orgId, bookingId: id,
                serviceId: line.serviceRefId ?? undefined,
                metadata: { supplyId: recipe.supplyId, needed: totalQty, available: currentQty.toNumber() },
              });
            }

            await tx.update(salonSupplies)
              .set({ quantity: newQty.toFixed(2), updatedAt: new Date() })
              .where(eq(salonSupplies.id, recipe.supplyId));

            salonLog.inventoryDeducted({
              requestId: requestId ?? undefined, orgId, bookingId: id,
              serviceId: line.serviceRefId ?? undefined,
              metadata: { supplyId: recipe.supplyId, qty: totalQty, newQty: newQty.toNumber() },
            });

            await tx.insert(salonSupplyAdjustments).values({
              orgId,
              supplyId:  recipe.supplyId,
              delta:     String(-totalQty),
              reason:    "consumed",
              notes:     `خصم تلقائي — حجز ${id.slice(0, 8)}`,
              createdBy: actingUserId,
            });

            await tx.insert(bookingRecordConsumptions).values({
              orgId,
              bookingRecordId: id,
              bookingLineId:   line.id,
              supplyId:        recipe.supplyId,
              quantity:        String(totalQty),
              consumedAt:      new Date(),
              createdBy:       actingUserId,
              notes:           `خصم تلقائي من وصفة الخدمة`,
            } as any);
          }
        }
      }

      // ── Legacy path: bookingItems.serviceId → recipes → bookingConsumptions ──
      const { rows: alreadyConsumed } = await tx.execute(sql`
        SELECT 1 FROM booking_consumptions
        WHERE booking_id = ${id} AND org_id = ${orgId}
        LIMIT 1
      `);

      if (alreadyConsumed.length === 0) {
        const items = await tx.select({
          id: bookingItems.id,
          serviceId: bookingItems.serviceId,
          quantity: bookingItems.quantity,
        }).from(bookingItems).where(eq(bookingItems.bookingId, id));

        for (const item of items) {
          if (!item.serviceId) continue;
          const recipes = await tx.select().from(serviceSupplyRecipes)
            .where(and(
              eq(serviceSupplyRecipes.serviceId, item.serviceId),
              eq(serviceSupplyRecipes.orgId, orgId),
            ));

          for (const recipe of recipes) {
            const totalQty = parseFloat(recipe.quantity as string) * (item.quantity || 1);

            const [supply] = await tx
              .select({ id: salonSupplies.id, quantity: salonSupplies.quantity })
              .from(salonSupplies)
              .where(eq(salonSupplies.id, recipe.supplyId))
              .for("update");
            if (!supply) continue;

            const currentQty = new Decimal(supply.quantity as string);
            // P0-4 fix: allow negative stock — real shortage is recorded, not hidden by Math.max(0,…)
            const newQty = currentQty.sub(totalQty);

            if (newQty.isNegative()) {
              salonLog.inventoryLowStock({
                requestId: requestId ?? undefined, orgId, bookingId: id,
                serviceId: item.serviceId ?? undefined,
                metadata: { supplyId: recipe.supplyId, needed: totalQty, available: currentQty.toNumber() },
              });
            }

            await tx.update(salonSupplies)
              .set({ quantity: newQty.toFixed(2), updatedAt: new Date() })
              .where(eq(salonSupplies.id, recipe.supplyId));

            salonLog.inventoryDeducted({
              requestId: requestId ?? undefined, orgId, bookingId: id,
              serviceId: item.serviceId ?? undefined,
              metadata: { supplyId: recipe.supplyId, qty: totalQty, newQty: newQty.toNumber() },
            });

            await tx.insert(salonSupplyAdjustments).values({
              orgId,
              supplyId:  recipe.supplyId,
              delta:     String(-totalQty),
              reason:    "consumed",
              notes:     `خصم تلقائي — حجز ${id.slice(0, 8)}`,
              createdBy: actingUserId,
            });

            await tx.insert(bookingConsumptions).values({
              orgId,
              bookingId:     id,
              bookingItemId: item.id,
              supplyId:      recipe.supplyId,
              quantity:      String(totalQty),
              unit:          (recipe as any).unit || null,
              consumedAt:    new Date(),
              createdBy:     actingUserId,
              notes:         `خصم تلقائي من وصفة الخدمة`,
            });
          }
        }
      }
    }

    return { fromStatus: existing.status, updated: upd };
    }); // end db.transaction
  } catch (err: any) {
    if (err?.status === 422) {
      // Record blocked event for timeline visibility (fire-and-forget, outside rolled-back tx)
      if (capturedFromStatus) {
        recordBlockedTransitionEvent({
          orgId,
          bookingRecordId: id,
          userId:          actingUserId,
          fromStatus:      capturedFromStatus,
          attemptedStatus: newStatus,
          reason:          err.message ?? "WORKFLOW_TRANSITION_BLOCKED",
          blockedBy:       err.blockedBy ?? null,
          requiresForce:   err.requiresForce ?? false,
          workflowMode,
        });
      }
      return c.json({
        error:        err.message,
        blockedBy:    err.blockedBy    ?? null,
        requiresForce: err.requiresForce ?? false,
      }, 422);
    }
    throw err;
  }

  if (!statusTx) return c.json({ error: "الحجز غير موجود" }, 404);
  const { fromStatus, updated } = statusTx;

  // Booking event — status change (enriched with workflow context for timeline)
  db.insert(bookingTimelineEvents).values({
    orgId,
    bookingRecordId: id,
    userId: actingUserId,
    eventType: "status_changed",
    fromStatus: fromStatus as string,
    toStatus: newStatus,
    metadata: {
      ...(reason ? { reason } : {}),
      workflowMode,
      configState,
      forced: force && canForce,
    },
  } as any).catch(() => {});

  // Automation hooks — fire-and-forget, never blocks response
  runPostTransitionAutomations({
    orgId,
    bookingRecordId: id,
    userId: actingUserId,
    fromStatus: fromStatus as string,
    toStatus: newStatus,
    forced: force && canForce,
    workflowMode,
    configState,
  });

  insertAuditLog({
    orgId, userId: actingUserId,
    action:     "updated",
    resource:   "booking",
    resourceId: id,
    oldValue:   { status: fromStatus },
    newValue:   { status: newStatus },
    metadata: {
      triggerType:  "manual",
      forced:       false,
      workflowMode,
      configState,
      reason:       reason ?? null,
    },
  });

  // قيد محاسبي تلقائي (fire-and-forget)
  if (newStatus === "confirmed") {
    try {
      await autoJournal.bookingConfirmed({
        orgId,
        bookingId: id,
        bookingNumber: updated.bookingNumber,
        amount: Number(updated.totalAmount),
      });
    } catch {}
  } else if (newStatus === "cancelled") {
    try {
      await autoJournal.bookingCancelled({
        orgId,
        bookingId: id,
        bookingNumber: updated.bookingNumber,
        amount: Number(updated.totalAmount),
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

  // Monitoring: log status transitions
  if (newStatus === "completed") {
    salonLog.bookingCompleted({ requestId: requestId ?? undefined, orgId, bookingId: id, assignedUserId: actingUserId ?? undefined });
  } else if (newStatus === "cancelled" || newStatus === "no_show") {
    salonLog.bookingCancelled({ requestId: requestId ?? undefined, orgId, bookingId: id, assignedUserId: actingUserId ?? undefined, metadata: { reason, status: newStatus } });
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

  const RESCHEDULE_REASONS: Record<string, string> = {
    customer_request:  "بطلب العميل",
    staff_unavailable: "الموظف غير متاح",
    emergency:         "طارئ",
    double_booking:    "تعارض مواعيد",
    other:             "أخرى",
  };

  try {
    // ── Canonical path: booking_records ────────────────────────
    const [canonicalCheck] = await db.select({ id: bookingRecords.id })
      .from(bookingRecords)
      .where(and(eq(bookingRecords.id, id), eq(bookingRecords.orgId, orgId)));

    if (canonicalCheck) {
      const updated = await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(bookingRecords)
          .where(and(eq(bookingRecords.id, id), eq(bookingRecords.orgId, orgId)))
          .for("update");
        if (!existing) throw Object.assign(new Error("الحجز غير موجود"), { status: 404 });
        if (existing.status === "cancelled") throw Object.assign(new Error("لا يمكن تعديل حجز ملغي"), { status: 422 });
        if (existing.status === "completed") throw Object.assign(new Error("لا يمكن تعديل حجز مكتمل"), { status: 422 });

        // Smart Conflict Preventer Guard — queries booking_records
        const targetStaffId = body.assignedUserId !== undefined ? body.assignedUserId : existing.assignedUserId;
        if (targetStaffId) {
          const { rows: durRows } = await tx.execute(sql`
            SELECT COALESCE(SUM(duration_minutes), 60) as duration
            FROM booking_lines
            WHERE booking_record_id = ${id}
          `);
          const durationMins = Number((durRows as any[])[0]?.duration ?? 60);

          const staffStart = new Date(body.eventDate);
          const staffEnd   = body.eventEndDate
            ? new Date(body.eventEndDate)
            : new Date(staffStart.getTime() + durationMins * 60_000);

          await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${orgId}), hashtext(${"staff:" + targetStaffId}))`);

          const { rows: staffConflict } = await tx.execute(sql`
            SELECT id, booking_number FROM booking_records
            WHERE org_id = ${orgId}
              AND assigned_user_id = ${targetStaffId}
              AND id != ${id}
              AND status NOT IN ('cancelled', 'no_show')
              AND starts_at < ${staffEnd.toISOString()}
              AND COALESCE(ends_at, starts_at + COALESCE((
                SELECT SUM(duration_minutes) FROM booking_lines
                WHERE booking_record_id = booking_records.id
              ), 60) * interval '1 minute') > ${staffStart.toISOString()}
            FOR UPDATE
          `);

          if ((staffConflict as any[]).length > 0) {
            throw Object.assign(
              new Error("تعارض في مواعيد الموظف: " + (staffConflict as any[])[0].booking_number),
              { status: 409 },
            );
          }
        }

        const reasonLabel  = RESCHEDULE_REASONS[body.reason] ?? body.reason;
        const prevDate     = existing.startsAt ? new Date(existing.startsAt).toISOString() : "—";
        const logLine      = `[تأجيل ${new Date().toISOString().slice(0, 10)}] من: ${prevDate} → إلى: ${body.eventDate} — السبب: ${reasonLabel}${body.notes ? ` — ${body.notes}` : ""}`;
        const updatedNotes = existing.internalNotes ? `${existing.internalNotes}\n${logLine}` : logLine;

        const updates: Partial<typeof bookingRecords.$inferInsert> = {
          startsAt:      new Date(body.eventDate),
          internalNotes: updatedNotes,
          updatedAt:     new Date(),
        };
        if (body.eventEndDate  !== undefined) updates.endsAt        = new Date(body.eventEndDate);
        if (body.assignedUserId !== undefined) updates.assignedUserId = body.assignedUserId;

        const [upd] = await tx.update(bookingRecords)
          .set(updates)
          .where(and(eq(bookingRecords.id, id), eq(bookingRecords.orgId, orgId)))
          .returning();

        // Timeline event inside transaction (canonical — guaranteed atomicity)
        await tx.insert(bookingTimelineEvents).values({
          orgId,
          bookingRecordId: id,
          userId:    userId ?? null,
          eventType: "rescheduled",
          fromStatus: existing.status,
          toStatus:   existing.status,
          metadata: {
            from:   existing.startsAt ? new Date(existing.startsAt).toISOString() : null,
            to:     body.eventDate,
            reason: body.reason,
            notes:  body.notes ?? null,
          },
        } as any);

        return upd;
      });

      insertAuditLog({
        orgId, userId,
        action: "rescheduled",
        resource: "booking_record",
        resourceId: updated.id,
        metadata: { to: body.eventDate, reason: body.reason },
      });

      return c.json({ data: updated });
    }

    // ── Legacy path (unchanged) ─────────────────────────────────
    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(bookings)
        .where(and(eq(bookings.id, id), eq(bookings.orgId, orgId))).for("update");
      if (!existing) throw Object.assign(new Error("الحجز غير موجود"), { status: 404 });
      if (existing.status === "cancelled") throw Object.assign(new Error("لا يمكن تعديل حجز ملغي"), { status: 422 });
      if (existing.status === "completed") throw Object.assign(new Error("لا يمكن تعديل حجز مكتمل"), { status: 422 });

      // ── Smart Conflict Preventer Guard ──
      const targetStaffId = body.assignedUserId !== undefined ? body.assignedUserId : existing.assignedUserId;
      if (targetStaffId) {
        const { rows: durRows } = await tx.execute(sql`
          SELECT COALESCE(SUM(s.duration_minutes), 60) as duration
          FROM booking_items bi JOIN services s ON s.id = bi.service_id
          WHERE bi.booking_id = ${id}
        `);
        const durationMins = (durRows as any[])[0]?.duration || 60;

        const staffStart = new Date(body.eventDate);
        const staffEnd = body.eventEndDate ? new Date(body.eventEndDate) : new Date(staffStart.getTime() + durationMins * 60_000);

        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${orgId}), hashtext(${'staff:' + targetStaffId}))`);

        const { rows: staffConflict } = await tx.execute(sql`
          SELECT id, booking_number FROM bookings
          WHERE org_id = ${orgId}
            AND assigned_user_id = ${targetStaffId}
            AND id != ${id}
            AND status NOT IN ('cancelled', 'no_show')
            AND event_date < ${staffEnd}
            AND COALESCE(event_end_date, event_date + (
              SELECT COALESCE(SUM(s.duration_minutes), 60) * interval '1 minute'
              FROM booking_items bi JOIN services s ON s.id = bi.service_id
              WHERE bi.booking_id = bookings.id
            )) > ${staffStart}
          FOR UPDATE
        `);

        if (staffConflict.length > 0) {
          throw Object.assign(new Error("تعارض في مواعيد الموظف: " + (staffConflict as any[])[0].booking_number), { status: 409 });
        }
      }

      const reasonLabel = RESCHEDULE_REASONS[body.reason] ?? body.reason;
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

      const [upd] = await tx.update(bookings)
        .set(updates)
        .where(and(eq(bookings.id, id), eq(bookings.orgId, orgId)))
        .returning();

      return upd;
    });

    // Booking event — rescheduled (legacy: fire-and-forget outside transaction)
    db.insert(bookingEvents).values({
      orgId,
      bookingId: id,
      userId,
      eventType: "rescheduled",
      metadata: { to: body.eventDate, reason: body.reason, notes: body.notes },
    }).catch(() => {});

    insertAuditLog({
      orgId, userId,
      action: "rescheduled",
      resource: "booking",
      resourceId: updated.id,
      metadata: { to: body.eventDate, reason: body.reason },
    });

    return c.json({ data: updated });
  } catch (err: any) {
    return c.json({ error: err.message }, err.status || 500);
  }
});

// ============================================================
// GET /bookings/:id/events — Booking audit trail
// ============================================================

bookingsRouter.get("/:id/events", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const events = await db
    .select({
      id:              bookingTimelineEvents.id,
      eventType:       bookingTimelineEvents.eventType,
      fromStatus:      bookingTimelineEvents.fromStatus,
      toStatus:        bookingTimelineEvents.toStatus,
      metadata:        bookingTimelineEvents.metadata,
      createdAt:       bookingTimelineEvents.createdAt,
      performedByName: users.name,
    })
    .from(bookingTimelineEvents)
    .leftJoin(users, eq(bookingTimelineEvents.userId, users.id))
    .where(and(eq(bookingTimelineEvents.bookingRecordId, id), eq(bookingTimelineEvents.orgId, orgId)))
    .orderBy(asc(bookingTimelineEvents.createdAt));

  return c.json({ data: events });
});

// ============================================================
// GET /bookings/:id/timeline — Workflow Operations Timeline
// Read model built on booking_events — org-boundary enforced
// ============================================================
bookingsRouter.get("/:id/timeline", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");

  // Verify the booking belongs to this org before returning timeline
  const [booking] = await db
    .select({
      id:        bookingRecords.id,
      status:    bookingRecords.status,
      createdAt: bookingRecords.createdAt,
      updatedAt: bookingRecords.updatedAt,
    })
    .from(bookingRecords)
    .where(and(eq(bookingRecords.id, id), eq(bookingRecords.orgId, orgId)));

  if (!booking) return c.json({ error: "الحجز غير موجود" }, 404);

  const timeline = await getBookingTimeline(id, orgId);

  // Compute SLA state from workflow stages + timeline
  const workflowStages = await getWorkflowStagesForOrg(orgId);

  // Find when the booking last entered its current status
  const lastStatusEntry = [...timeline]
    .reverse()
    .find((e) => e.eventType === "status_changed" && e.toStatus === booking.status);

  const sla = getBookingSlaState({
    bookingRecordId: booking.id,
    currentStatus:   booking.status,
    createdAt:       booking.createdAt,
    updatedAt:       booking.updatedAt,
    stages:          workflowStages,
    statusEnteredAt: lastStatusEntry?.createdAt ?? null,
  });

  return c.json({ data: timeline, sla });
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

  // ترحيل محاسبي — يُنتظر (لا fire-and-forget) لضمان تسجيل القيد
  if (payment.status === "completed") {
    try {
      const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, orgId));
      if (isAccountingEnabled((org?.settings as any) ?? {})) {
        const amount = Number(body.amount);
        const vatAmount = 0; // الضريبة محسوبة مسبقاً في totalAmount

        if (body.type === "deposit") {
          await postDepositReceived({ orgId, date: new Date(), amount, description: `عربون حجز ${bookingId}`, sourceId: payment.id, createdBy: userId ?? undefined });
        } else if (body.type === "refund") {
          await postRefund({ orgId, date: new Date(), amount, vatAmount, description: `استرداد حجز ${bookingId}`, sourceId: payment.id, createdBy: userId ?? undefined });
        } else {
          await postCashSale({ orgId, date: new Date(), amount, vatAmount, description: `تحصيل دفعة حجز ${bookingId}`, sourceType: "booking", sourceId: payment.id, createdBy: userId ?? undefined });
        }
      }
    } catch {
      // فشل الترحيل لا يُوقف العملية — المحاسبة قد تكون غير مُفعّلة
    }
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
      id:            bookingRecords.id,
      bookingNumber: bookingRecords.bookingNumber,
      status:        bookingRecords.status,
      startsAt:      bookingRecords.startsAt,
      endsAt:        bookingRecords.endsAt,
      totalAmount:   bookingRecords.totalAmount,
      paymentStatus: bookingRecords.paymentStatus,
      customerName:  customers.name,
      locationName:  locations.name,
    })
    .from(bookingRecords)
    .leftJoin(customers, eq(bookingRecords.customerId, customers.id))
    .leftJoin(locations, eq(bookingRecords.locationId, locations.id))
    .where(and(
      eq(bookingRecords.orgId, orgId),
      gte(bookingRecords.startsAt, new Date(from)),
      lte(bookingRecords.startsAt, new Date(to)),
      sql`${bookingRecords.status} NOT IN ('cancelled')`
    ))
    .orderBy(asc(bookingRecords.startsAt));

  return c.json({ data: result });
});

// ============================================================
// GET /bookings/track/:token — Public tracking (no auth)
// ============================================================

bookingsRouter.get("/track/:token", async (c) => {
  const token = c.req.param("token");

  const [booking] = await db
    .select({
      bookingNumber: bookingRecords.bookingNumber,
      status:        bookingRecords.status,
      paymentStatus: bookingRecords.paymentStatus,
      startsAt:      bookingRecords.startsAt,
      totalAmount:   bookingRecords.totalAmount,
      paidAmount:    bookingRecords.paidAmount,
      balanceDue:    bookingRecords.balanceDue,
    })
    .from(bookingRecords)
    .where(eq(bookingRecords.trackingToken, token));

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
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${bookingRecords.totalAmount} AS DECIMAL)), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(CAST(${bookingRecords.paidAmount} AS DECIMAL)), 0)`,
      avgBookingValue: sql<string>`COALESCE(AVG(CAST(${bookingRecords.totalAmount} AS DECIMAL)), 0)`,
    })
    .from(bookingRecords)
    .where(and(
      eq(bookingRecords.orgId, orgId),
      gte(bookingRecords.createdAt, startDate),
      sql`${bookingRecords.status} != 'cancelled'`
    ));

  // Status breakdown
  const statusBreakdown = await db
    .select({
      status: bookingRecords.status,
      count: count(),
    })
    .from(bookingRecords)
    .where(and(
      eq(bookingRecords.orgId, orgId),
      gte(bookingRecords.createdAt, startDate)
    ))
    .groupBy(bookingRecords.status);

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
    month: sql<string>`to_char(date_trunc('month', ${bookingRecords.createdAt}), 'YYYY-MM')`,
    revenue: sql<string>`COALESCE(SUM(CAST(${bookingRecords.totalAmount} AS DECIMAL)), 0)`,
    bookingCount: count(),
  }).from(bookingRecords).where(and(
    eq(bookingRecords.orgId, orgId),
    gte(bookingRecords.createdAt, startDate),
    sql`${bookingRecords.status} != 'cancelled'`,
  )).groupBy(sql`date_trunc('month', ${bookingRecords.createdAt})`);

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
    eq(bookingRecords.orgId, orgId),
    gte(bookingRecords.createdAt, start),
    ...(end ? [lt(bookingRecords.createdAt, end)] : []),
    sql`${bookingRecords.status} != 'cancelled'`,
  );

  const [cur, prev] = await Promise.all([
    db.select({ revenue: sql<string>`COALESCE(SUM(CAST(${bookingRecords.totalAmount} AS DECIMAL)), 0)`, cnt: count() })
      .from(bookingRecords).where(baseWhere(currentStart)),
    db.select({ revenue: sql<string>`COALESCE(SUM(CAST(${bookingRecords.totalAmount} AS DECIMAL)), 0)`, cnt: count() })
      .from(bookingRecords).where(baseWhere(previousStart, previousEnd)),
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
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${bookingRecords.totalAmount} AS DECIMAL)), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(CAST(${bookingRecords.paidAmount} AS DECIMAL)), 0)`,
      avgBookingValue: sql<string>`COALESCE(AVG(CAST(${bookingRecords.totalAmount} AS DECIMAL)), 0)`,
    })
    .from(bookingRecords)
    .where(and(
      eq(bookingRecords.orgId, orgId),
      gte(bookingRecords.createdAt, startDate),
      sql`${bookingRecords.status} != 'cancelled'`
    ));

  const statusBreakdown = await db
    .select({ status: bookingRecords.status, count: count() })
    .from(bookingRecords)
    .where(and(eq(bookingRecords.orgId, orgId), gte(bookingRecords.createdAt, startDate)))
    .groupBy(bookingRecords.status);

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
