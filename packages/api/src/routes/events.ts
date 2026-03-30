import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, gte, lte, count, sql, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import {
  events, ticketTypes, seatSections, seats, ticketIssuances,
  customers, bookings, users,
  eventQuotations, eventQuotationItems, eventExecutionTasks,
} from "@nasaq/db/schema";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { apiErr } from "../lib/errors";
import { DEFAULT_VAT_RATE } from "../lib/constants";

// ============================================================
// SCHEMAS
// ============================================================

const createEventSchema = z.object({
  name: z.string().min(1).max(300),
  nameEn: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  doorsOpenAt: z.string().datetime().optional().nullable(),
  venueName: z.string().optional().nullable(),
  venueAddress: z.string().optional().nullable(),
  venueCity: z.string().optional().nullable(),
  venueMapUrl: z.string().optional().nullable(),
  totalCapacity: z.number().int().positive().optional().nullable(),
  hasSeating: z.boolean().optional(),
  allowTransfer: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  locationId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  ageRestriction: z.number().int().optional().nullable(),
});

const createTicketTypeSchema = z.object({
  name: z.string().min(1).max(200),
  nameEn: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  totalQuantity: z.number().int().positive(),
  maxPerOrder: z.number().int().positive().optional(),
  minPerOrder: z.number().int().positive().optional(),
  saleStartsAt: z.string().datetime().optional().nullable(),
  saleEndsAt: z.string().datetime().optional().nullable(),
  seatSectionId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const eventsRouter = new Hono();

// ============================================================
// EVENTS CRUD
// ============================================================

// GET /events
eventsRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const upcoming = c.req.query("upcoming") === "true";

  const conditions = [eq(events.orgId, orgId), eq(events.isActive, true)];
  if (status) conditions.push(eq(events.status, status as any));
  if (upcoming) conditions.push(gte(events.startsAt, new Date()));

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(events).where(and(...conditions))
      .orderBy(asc(events.startsAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(events).where(and(...conditions)),
  ]);

  return c.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

// GET /events/:id
eventsRouter.get("/:id", async (c) => {
  const orgId   = getOrgId(c);
  const eventId = c.req.param("id");

  const [[event], ticketTypeRows, sectionRows] = await Promise.all([
    db.select().from(events).where(and(eq(events.id, eventId), eq(events.orgId, orgId))),
    db.select().from(ticketTypes).where(and(eq(ticketTypes.eventId, eventId), eq(ticketTypes.orgId, orgId))).orderBy(asc(ticketTypes.sortOrder)),
    db.select().from(seatSections).where(and(eq(seatSections.eventId, eventId), eq(seatSections.orgId, orgId))).orderBy(asc(seatSections.sortOrder)),
  ]);

  if (!event) return apiErr(c, "SVC_NOT_FOUND", 404);

  // Availability per ticket type
  const availability = ticketTypeRows.map(tt => ({
    ...tt,
    available: tt.totalQuantity - tt.soldQuantity - tt.reservedQuantity,
  }));

  return c.json({ data: { ...event, ticketTypes: availability, sections: sectionRows } });
});

// POST /events
eventsRouter.post("/", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const parsed = createEventSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const body = parsed.data;

  const [event] = await db.insert(events).values({
    orgId,
    ...body,
    startsAt: new Date(body.startsAt),
    endsAt: new Date(body.endsAt),
    doorsOpenAt: body.doorsOpenAt ? new Date(body.doorsOpenAt) : null,
    createdBy: userId,
  }).returning();

  insertAuditLog({ orgId, userId, action: "created", resource: "event", resourceId: event.id });
  return c.json({ data: event }, 201);
});

// PUT /events/:id
eventsRouter.put("/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const parsedPut = createEventSchema.partial().safeParse(await c.req.json());
  if (!parsedPut.success) return c.json({ error: parsedPut.error.flatten() }, 400);
  const body = parsedPut.data;

  const updates: any = { ...body, updatedAt: new Date() };
  if (body.startsAt) updates.startsAt = new Date(body.startsAt);
  if (body.endsAt)   updates.endsAt   = new Date(body.endsAt);
  if (body.doorsOpenAt) updates.doorsOpenAt = new Date(body.doorsOpenAt);

  const [updated] = await db.update(events).set(updates)
    .where(and(eq(events.id, c.req.param("id")), eq(events.orgId, orgId)))
    .returning();

  if (!updated) return apiErr(c, "SVC_NOT_FOUND", 404);
  insertAuditLog({ orgId, userId, action: "updated", resource: "event", resourceId: updated.id });
  return c.json({ data: updated });
});

// PATCH /events/:id/status
eventsRouter.patch("/:id/status", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { status } = await c.req.json();

  const validStatuses = ["draft", "published", "cancelled", "completed", "postponed"];
  if (!validStatuses.includes(status)) {
    return c.json({ error: "حالة غير صالحة" }, 400);
  }

  const [updated] = await db.update(events)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(events.id, c.req.param("id")), eq(events.orgId, orgId)))
    .returning();

  if (!updated) return apiErr(c, "SVC_NOT_FOUND", 404);
  insertAuditLog({ orgId, userId, action: "updated", resource: "event", resourceId: updated.id });
  return c.json({ data: updated });
});

// DELETE /events/:id (soft)
eventsRouter.delete("/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);

  const [updated] = await db.update(events)
    .set({ isActive: false, status: "cancelled", updatedAt: new Date() })
    .where(and(eq(events.id, c.req.param("id")), eq(events.orgId, orgId)))
    .returning();

  if (!updated) return apiErr(c, "SVC_NOT_FOUND", 404);
  insertAuditLog({ orgId, userId, action: "deleted", resource: "event", resourceId: updated.id });
  return c.json({ data: { success: true } });
});

// ============================================================
// TICKET TYPES
// ============================================================

// GET /events/:id/ticket-types
eventsRouter.get("/:id/ticket-types", async (c) => {
  const orgId   = getOrgId(c);
  const eventId = c.req.param("id");

  const rows = await db.select().from(ticketTypes)
    .where(and(eq(ticketTypes.eventId, eventId), eq(ticketTypes.orgId, orgId)))
    .orderBy(asc(ticketTypes.sortOrder));

  return c.json({ data: rows.map(tt => ({ ...tt, available: tt.totalQuantity - tt.soldQuantity - tt.reservedQuantity })) });
});

// POST /events/:id/ticket-types
eventsRouter.post("/:id/ticket-types", async (c) => {
  const orgId   = getOrgId(c);
  const eventId = c.req.param("id");
  const parsedTT = createTicketTypeSchema.safeParse(await c.req.json());
  if (!parsedTT.success) return c.json({ error: parsedTT.error.flatten() }, 400);
  const body = parsedTT.data;

  const [event] = await db.select({ id: events.id }).from(events)
    .where(and(eq(events.id, eventId), eq(events.orgId, orgId)));
  if (!event) return apiErr(c, "SVC_NOT_FOUND", 404);

  const [tt] = await db.insert(ticketTypes).values({
    orgId, eventId,
    ...body,
    price: String(body.price),
    saleStartsAt: body.saleStartsAt ? new Date(body.saleStartsAt) : null,
    saleEndsAt:   body.saleEndsAt   ? new Date(body.saleEndsAt)   : null,
  }).returning();

  // Update event min/max price
  await db.execute(sql`
    UPDATE events SET
      min_price = (SELECT MIN(price) FROM ticket_types WHERE event_id_new = ${eventId}),
      max_price = (SELECT MAX(price) FROM ticket_types WHERE event_id_new = ${eventId}),
      updated_at = NOW()
    WHERE id = ${eventId}
  `);

  return c.json({ data: tt }, 201);
});

// PUT /events/:id/ticket-types/:ttId
eventsRouter.put("/:id/ticket-types/:ttId", async (c) => {
  const orgId = getOrgId(c);
  const body  = createTicketTypeSchema.partial().parse(await c.req.json());

  const updates: any = { ...body, updatedAt: new Date() };
  if (body.price !== undefined) updates.price = String(body.price);

  const [updated] = await db.update(ticketTypes)
    .set(updates)
    .where(and(eq(ticketTypes.id, c.req.param("ttId")), eq(ticketTypes.orgId, orgId)))
    .returning();

  if (!updated) return apiErr(c, "SVC_NOT_FOUND", 404);
  return c.json({ data: updated });
});

// DELETE /events/:id/ticket-types/:ttId
eventsRouter.delete("/:id/ticket-types/:ttId", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(ticketTypes)
    .where(and(eq(ticketTypes.id, c.req.param("ttId")), eq(ticketTypes.orgId, orgId)))
    .returning({ id: ticketTypes.id });

  if (!deleted) return apiErr(c, "SVC_NOT_FOUND", 404);
  return c.json({ data: { success: true } });
});

// ============================================================
// SEAT SECTIONS & SEATS
// ============================================================

// GET /events/:id/sections
eventsRouter.get("/:id/sections", async (c) => {
  const orgId   = getOrgId(c);
  const eventId = c.req.param("id");

  const sections = await db.select().from(seatSections)
    .where(and(eq(seatSections.eventId, eventId), eq(seatSections.orgId, orgId)))
    .orderBy(asc(seatSections.sortOrder));

  // Load seat counts per section
  const sectionIds = sections.map(s => s.id);
  const seatCounts = sectionIds.length
    ? await db.select({ sectionId: seats.sectionId, status: seats.status, cnt: count() })
        .from(seats)
        .where(inArray(seats.sectionId, sectionIds))
        .groupBy(seats.sectionId, seats.status)
    : [];

  const countMap = new Map<string, Record<string, number>>();
  for (const row of seatCounts) {
    const key = row.sectionId!;
    if (!countMap.has(key)) countMap.set(key, {});
    countMap.get(key)![row.status!] = Number(row.cnt);
  }

  return c.json({
    data: sections.map(s => ({ ...s, seatCounts: countMap.get(s.id) ?? {} })),
  });
});

// POST /events/:id/sections
eventsRouter.post("/:id/sections", async (c) => {
  const orgId   = getOrgId(c);
  const eventId = c.req.param("id");
  const bodyRaw = await c.req.json();

  const sectionSchema = z.object({
    name:          z.string().min(1).max(200),
    nameEn:        z.string().optional().nullable(),
    capacity:      z.number().int().positive().optional().nullable(),
    priceModifier: z.number().optional().nullable(),
    color:         z.string().max(20).optional().nullable(),
    sortOrder:     z.number().int().optional(),
  });
  const parsed = sectionSchema.safeParse(bodyRaw);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const [event] = await db.select({ id: events.id }).from(events)
    .where(and(eq(events.id, eventId), eq(events.orgId, orgId)));
  if (!event) return apiErr(c, "SVC_NOT_FOUND", 404);

  const [section] = await db.insert(seatSections).values({ orgId, eventId, ...parsed.data }).returning();
  return c.json({ data: section }, 201);
});

// ============================================================
// TICKET ISSUANCES — إصدار وإدارة التذاكر
// ============================================================

// GET /events/:id/issuances
eventsRouter.get("/:id/issuances", async (c) => {
  const orgId   = getOrgId(c);
  const eventId = c.req.param("id");
  const { page, limit, offset } = getPagination(c);
  const status  = c.req.query("status");
  const search  = c.req.query("search");

  const conditions = [eq(ticketIssuances.eventId, eventId), eq(ticketIssuances.orgId, orgId)];
  if (status) conditions.push(eq(ticketIssuances.status, status as any));

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(ticketIssuances).where(and(...conditions))
      .orderBy(desc(ticketIssuances.issuedAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(ticketIssuances).where(and(...conditions)),
  ]);

  return c.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

// POST /events/:id/issue — إصدار تذاكر جديدة
eventsRouter.post("/:id/issue", async (c) => {
  const orgId   = getOrgId(c);
  const userId  = getUserId(c);
  const eventId = c.req.param("id");

  const body = z.object({
    ticketTypeId:  z.string().uuid(),
    quantity:      z.number().int().positive().max(50),
    bookingId:     z.string().uuid().optional().nullable(),
    customerId:    z.string().uuid().optional().nullable(),
    attendeeName:  z.string().optional().nullable(),
    attendeePhone: z.string().optional().nullable(),
    attendeeEmail: z.string().optional().nullable(),
    seatIds:       z.array(z.string().uuid()).optional(),  // للفعاليات ذات المقاعد
  }).parse(await c.req.json());

  // Validate event & ticket type in one batch
  const [[event], [tt]] = await Promise.all([
    db.select().from(events).where(and(eq(events.id, eventId), eq(events.orgId, orgId))),
    db.select().from(ticketTypes).where(and(eq(ticketTypes.id, body.ticketTypeId), eq(ticketTypes.orgId, orgId))),
  ]);

  if (!event) return apiErr(c, "SVC_NOT_FOUND", 404);
  if (!tt)    return apiErr(c, "SVC_NOT_FOUND", 404);

  const available = tt.totalQuantity - tt.soldQuantity - tt.reservedQuantity;
  if (body.quantity > available) {
    return c.json({ error: `الكمية المطلوبة (${body.quantity}) تتجاوز المتاح (${available})` }, 400);
  }

  const vatRate = DEFAULT_VAT_RATE;
  const unitPrice = parseFloat(String(tt.price));
  const vatAmount = unitPrice * (vatRate / 100);

  // Issue tickets in a transaction
  const issuances = await db.transaction(async (tx) => {
    const issued: any[] = [];
    const seatIds = body.seatIds ?? [];

    for (let i = 0; i < body.quantity; i++) {
      // Generate sequential ticket number
      const [{ maxNum }] = await tx.select({ maxNum: sql<number>`COALESCE(MAX(CAST(SPLIT_PART(ticket_number, '-', 3) AS INTEGER)), 0)` })
        .from(ticketIssuances).where(eq(ticketIssuances.orgId, orgId));

      const ticketNum = `TKT-${new Date().getFullYear()}-${String(Number(maxNum) + 1 + i).padStart(5, "0")}`;
      const qrCode    = `${orgId}-${eventId}-${ticketNum}-${Date.now()}-${i}`;

      const [issuance] = await tx.insert(ticketIssuances).values({
        orgId,
        eventId,
        ticketTypeId: body.ticketTypeId,
        bookingId:    body.bookingId    ?? null,
        customerId:   body.customerId   ?? null,
        seatId:       seatIds[i]        ?? null,
        ticketNumber: ticketNum,
        qrCode,
        attendeeName:  body.attendeeName  ?? null,
        attendeePhone: body.attendeePhone ?? null,
        attendeeEmail: body.attendeeEmail ?? null,
        paidPrice:  String(unitPrice),
        vatAmount:  String(vatAmount),
        status: "issued",
      }).returning();

      issued.push(issuance);
    }

    // Increment sold_quantity on ticket type
    await tx.update(ticketTypes)
      .set({ soldQuantity: sql`${ticketTypes.soldQuantity} + ${body.quantity}` })
      .where(eq(ticketTypes.id, body.ticketTypeId));

    // Increment sold_tickets on event
    await tx.update(events)
      .set({ soldTickets: sql`${events.soldTickets} + ${body.quantity}` })
      .where(eq(events.id, eventId));

    return issued;
  });

  insertAuditLog({ orgId, userId, action: "created", resource: "ticket_issuance", resourceId: eventId });
  return c.json({ data: issuances }, 201);
});

// POST /events/:id/issuances/:ticketId/check-in — تسجيل الدخول
eventsRouter.post("/:id/issuances/:ticketId/check-in", async (c) => {
  const orgId    = getOrgId(c);
  const userId   = getUserId(c);
  const ticketId = c.req.param("ticketId");

  const [updated] = await db.update(ticketIssuances)
    .set({
      status: "checked_in",
      checkedInAt: new Date(),
      checkedInBy: userId,
      updatedAt: new Date(),
    })
    .where(and(
      eq(ticketIssuances.id, ticketId),
      eq(ticketIssuances.orgId, orgId),
      eq(ticketIssuances.status, "issued"),
    ))
    .returning();

  if (!updated) return c.json({ error: "التذكرة غير موجودة أو تم تسجيل الدخول مسبقاً" }, 404);
  return c.json({ data: updated });
});

// GET /events/:id/issuances/scan/:qrCode — مسح QR (للدخول)
eventsRouter.get("/:id/issuances/scan/:qrCode", async (c) => {
  const orgId  = getOrgId(c);
  const qrCode = c.req.param("qrCode");

  const [ticket] = await db.select().from(ticketIssuances)
    .where(and(eq(ticketIssuances.qrCode, qrCode), eq(ticketIssuances.orgId, orgId)));

  if (!ticket) return c.json({ valid: false, error: "QR غير صالح" }, 404);

  return c.json({
    valid: ticket.status === "issued",
    status: ticket.status,
    data: ticket,
  });
});

// ============================================================
// STATS
// ============================================================

// GET /events/:id/stats
eventsRouter.get("/:id/stats", async (c) => {
  const orgId   = getOrgId(c);
  const eventId = c.req.param("id");

  const [[event], statusCounts, typeCounts] = await Promise.all([
    db.select({ id: events.id, totalCapacity: events.totalCapacity, soldTickets: events.soldTickets })
      .from(events).where(and(eq(events.id, eventId), eq(events.orgId, orgId))),
    db.select({ status: ticketIssuances.status, cnt: count() })
      .from(ticketIssuances)
      .where(and(eq(ticketIssuances.eventId, eventId), eq(ticketIssuances.orgId, orgId)))
      .groupBy(ticketIssuances.status),
    db.select({ ticketTypeId: ticketIssuances.ticketTypeId, cnt: count(), revenue: sql<number>`SUM(CAST(paid_price AS NUMERIC))` })
      .from(ticketIssuances)
      .where(and(eq(ticketIssuances.eventId, eventId), eq(ticketIssuances.orgId, orgId)))
      .groupBy(ticketIssuances.ticketTypeId),
  ]);

  if (!event) return apiErr(c, "SVC_NOT_FOUND", 404);

  const byStatus = Object.fromEntries(statusCounts.map(r => [r.status, Number(r.cnt)]));
  const totalRevenue = typeCounts.reduce((s, r) => s + Number(r.revenue || 0), 0);

  return c.json({
    data: {
      totalCapacity:   event.totalCapacity,
      soldTickets:     event.soldTickets,
      checkedIn:       byStatus.checked_in ?? 0,
      issued:          byStatus.issued     ?? 0,
      cancelled:       byStatus.cancelled  ?? 0,
      occupancyRate:   event.totalCapacity
        ? ((event.soldTickets / event.totalCapacity) * 100).toFixed(1)
        : null,
      totalRevenue:    totalRevenue.toFixed(2),
      byTicketType:    typeCounts,
    },
  });
});

// ============================================================
// EVENT QUOTATIONS — عروض الأسعار
// ============================================================

const quotationItemSchema = z.object({
  description: z.string().min(1).max(500),
  category:    z.string().optional().nullable(),
  qty:         z.number().positive().default(1),
  unitPrice:   z.number().min(0),
  notes:       z.string().optional().nullable(),
  sortOrder:   z.number().int().optional().default(0),
});

const createQuotationSchema = z.object({
  eventId:        z.string().uuid().optional().nullable(),
  clientName:     z.string().min(1).max(200),
  clientPhone:    z.string().optional().nullable(),
  clientEmail:    z.string().email().optional().nullable(),
  title:          z.string().min(1).max(300),
  eventDate:      z.string().optional().nullable(),
  eventVenue:     z.string().optional().nullable(),
  guestCount:     z.number().int().positive().optional().nullable(),
  notes:          z.string().optional().nullable(),
  discountAmount: z.number().min(0).default(0),
  vatRate:        z.number().min(0).max(100).default(15),
  depositRequired:z.number().min(0).default(0),
  validUntil:     z.string().optional().nullable(),
  paymentTerms:   z.string().optional().nullable(),
  items:          z.array(quotationItemSchema).optional().default([]),
});

// GET /events/quotations
eventsRouter.get("/quotations", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status");
  const conditions: any[] = [eq(eventQuotations.orgId, orgId)];
  if (status) conditions.push(eq(eventQuotations.status, status as any));
  const rows = await db.select().from(eventQuotations)
    .where(and(...conditions))
    .orderBy(desc(eventQuotations.createdAt));
  return c.json({ data: rows });
});

// POST /events/quotations
eventsRouter.post("/quotations", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createQuotationSchema.parse(await c.req.json());

  const seqRes = await pool.query("SELECT nextval('event_quotation_seq') AS n");
  const quotationNumber = `EQ-${String(seqRes.rows[0].n).padStart(4, "0")}`;

  const { items, ...qData } = body;

  // Calc totals from items
  const subtotal = (items || []).reduce((s, it) => s + it.qty * it.unitPrice, 0) - (body.discountAmount || 0);
  const vatAmount = subtotal * (body.vatRate / 100);
  const total = subtotal + vatAmount;

  const [q] = await db.insert(eventQuotations).values({
    orgId,
    quotationNumber,
    clientName:      qData.clientName,
    clientPhone:     qData.clientPhone ?? null,
    clientEmail:     qData.clientEmail ?? null,
    title:           qData.title,
    eventDate:       qData.eventDate ?? null,
    eventVenue:      qData.eventVenue ?? null,
    guestCount:      qData.guestCount ?? null,
    notes:           qData.notes ?? null,
    subtotal:        String(subtotal),
    discountAmount:  String(qData.discountAmount || 0),
    vatRate:         String(qData.vatRate),
    vatAmount:       String(vatAmount),
    total:           String(total),
    depositRequired: String(qData.depositRequired || 0),
    validUntil:      qData.validUntil ?? null,
    paymentTerms:    qData.paymentTerms ?? null,
    eventId:         qData.eventId ?? null,
    createdBy:       userId,
  }).returning();

  if (items && items.length > 0) {
    await db.insert(eventQuotationItems).values(
      items.map((it, idx) => ({
        orgId,
        quotationId: q.id,
        description: it.description,
        category:    it.category ?? null,
        qty:         String(it.qty),
        unitPrice:   String(it.unitPrice),
        totalPrice:  String(it.qty * it.unitPrice),
        notes:       it.notes ?? null,
        sortOrder:   it.sortOrder ?? idx,
      }))
    );
  }

  insertAuditLog({ orgId, userId, action: "created", resource: "event_quotation", resourceId: q.id });
  return c.json({ data: q }, 201);
});

// GET /events/quotations/:id
eventsRouter.get("/quotations/:id", async (c) => {
  const orgId = getOrgId(c);
  const [q] = await db.select().from(eventQuotations)
    .where(and(eq(eventQuotations.id, c.req.param("id")), eq(eventQuotations.orgId, orgId)));
  if (!q) return c.json({ error: "عرض السعر غير موجود" }, 404);
  const items = await db.select().from(eventQuotationItems)
    .where(eq(eventQuotationItems.quotationId, q.id))
    .orderBy(asc(eventQuotationItems.sortOrder));
  return c.json({ data: { ...q, items } });
});

// PUT /events/quotations/:id
eventsRouter.put("/quotations/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = createQuotationSchema.parse(await c.req.json());
  const { items, ...qData } = body;

  const subtotal = (items || []).reduce((s, it) => s + it.qty * it.unitPrice, 0) - (body.discountAmount || 0);
  const vatAmount = subtotal * (body.vatRate / 100);
  const total = subtotal + vatAmount;

  const [updated] = await db.update(eventQuotations).set({
    clientName:      qData.clientName,
    clientPhone:     qData.clientPhone ?? null,
    clientEmail:     qData.clientEmail ?? null,
    title:           qData.title,
    eventDate:       qData.eventDate ?? null,
    eventVenue:      qData.eventVenue ?? null,
    guestCount:      qData.guestCount ?? null,
    notes:           qData.notes ?? null,
    subtotal:        String(subtotal),
    discountAmount:  String(qData.discountAmount || 0),
    vatRate:         String(qData.vatRate),
    vatAmount:       String(vatAmount),
    total:           String(total),
    depositRequired: String(qData.depositRequired || 0),
    validUntil:      qData.validUntil ?? null,
    paymentTerms:    qData.paymentTerms ?? null,
    eventId:         qData.eventId ?? null,
    updatedAt:       new Date(),
  }).where(and(eq(eventQuotations.id, c.req.param("id")), eq(eventQuotations.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "عرض السعر غير موجود" }, 404);

  // Rebuild items
  await db.delete(eventQuotationItems).where(eq(eventQuotationItems.quotationId, updated.id));
  if (items && items.length > 0) {
    await db.insert(eventQuotationItems).values(
      items.map((it, idx) => ({
        orgId,
        quotationId: updated.id,
        description: it.description,
        category:    it.category ?? null,
        qty:         String(it.qty),
        unitPrice:   String(it.unitPrice),
        totalPrice:  String(it.qty * it.unitPrice),
        notes:       it.notes ?? null,
        sortOrder:   it.sortOrder ?? idx,
      }))
    );
  }
  return c.json({ data: updated });
});

// PATCH /events/quotations/:id/status
eventsRouter.patch("/quotations/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const { status } = z.object({ status: z.enum(["draft","sent","accepted","rejected","expired"]) }).parse(await c.req.json());
  const extra: any = { updatedAt: new Date() };
  if (status === "sent")     extra.sentAt = new Date();
  if (status === "accepted") extra.acceptedAt = new Date();
  const [updated] = await db.update(eventQuotations)
    .set({ status, ...extra })
    .where(and(eq(eventQuotations.id, c.req.param("id")), eq(eventQuotations.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "عرض السعر غير موجود" }, 404);
  return c.json({ data: updated });
});

// DELETE /events/quotations/:id
eventsRouter.delete("/quotations/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(eventQuotations)
    .where(and(eq(eventQuotations.id, c.req.param("id")), eq(eventQuotations.orgId, orgId)))
    .returning({ id: eventQuotations.id });
  if (!deleted) return c.json({ error: "عرض السعر غير موجود" }, 404);
  return c.json({ success: true });
});

// ============================================================
// EVENT EXECUTION TASKS — مهام تتبع التنفيذ
// ============================================================

const createTaskSchema = z.object({
  eventId:     z.string().uuid().optional().nullable(),
  quotationId: z.string().uuid().optional().nullable(),
  title:       z.string().min(1).max(300),
  description: z.string().optional().nullable(),
  category:    z.string().optional().nullable(),
  assignedTo:  z.string().optional().nullable(),
  dueDate:     z.string().datetime().optional().nullable(),
  eventPhase:  z.enum(["pre_event","day_of","post_event"]).default("pre_event"),
  notes:       z.string().optional().nullable(),
  sortOrder:   z.number().int().optional().default(0),
});

// GET /events/execution
eventsRouter.get("/execution", async (c) => {
  const orgId = getOrgId(c);
  const eventId = c.req.query("eventId");
  const status  = c.req.query("status");
  const phase   = c.req.query("phase");
  const conditions: any[] = [eq(eventExecutionTasks.orgId, orgId)];
  if (eventId) conditions.push(eq(eventExecutionTasks.eventId, eventId));
  if (status)  conditions.push(eq(eventExecutionTasks.status, status as any));
  if (phase)   conditions.push(eq(eventExecutionTasks.eventPhase, phase));
  const rows = await db.select().from(eventExecutionTasks)
    .where(and(...conditions))
    .orderBy(asc(eventExecutionTasks.sortOrder), asc(eventExecutionTasks.createdAt));
  return c.json({ data: rows });
});

// POST /events/execution
eventsRouter.post("/execution", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createTaskSchema.parse(await c.req.json());
  const [task] = await db.insert(eventExecutionTasks).values({
    orgId,
    eventId:     body.eventId ?? null,
    quotationId: body.quotationId ?? null,
    title:       body.title,
    description: body.description ?? null,
    category:    body.category ?? null,
    assignedTo:  body.assignedTo ?? null,
    dueDate:     body.dueDate ? new Date(body.dueDate) : null,
    eventPhase:  body.eventPhase,
    notes:       body.notes ?? null,
    sortOrder:   body.sortOrder ?? 0,
    createdBy:   userId,
  }).returning();
  return c.json({ data: task }, 201);
});

// PATCH /events/execution/:id
eventsRouter.patch("/execution/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = createTaskSchema.partial().parse(await c.req.json());
  const extra: any = { updatedAt: new Date() };
  if (body.notes !== undefined) extra.notes = body.notes;
  if ((body as any).status === "done") extra.completedAt = new Date();
  const [updated] = await db.update(eventExecutionTasks)
    .set({ ...body, ...extra })
    .where(and(eq(eventExecutionTasks.id, c.req.param("id")), eq(eventExecutionTasks.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "المهمة غير موجودة" }, 404);
  return c.json({ data: updated });
});

// DELETE /events/execution/:id
eventsRouter.delete("/execution/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(eventExecutionTasks)
    .where(and(eq(eventExecutionTasks.id, c.req.param("id")), eq(eventExecutionTasks.orgId, orgId)))
    .returning({ id: eventExecutionTasks.id });
  if (!deleted) return c.json({ error: "المهمة غير موجودة" }, 404);
  return c.json({ success: true });
});
