/**
 * Booking Route Query Behaviors — Phase 3.A
 *
 * يتحقق من أن الـ query patterns المستخدمة في route handlers تعمل
 * على canonical tables بالشكل الصحيح.
 * لا يختبر HTTP مباشرة — يختبر DB logic التي تُنفّذها الـ routes.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, and, gte, lte, ilike, count, asc, desc, or, sql } from "drizzle-orm";
import {
  bookingRecords, bookingLines, bookingLineAddons,
  bookingTimelineEvents,
} from "@nasaq/db/schema";
import { customers, locations } from "@nasaq/db/schema";
import { openTestDb, skipIfNoDb, type TestDb } from "../helpers/test-db";
import {
  createTestOrg,
  createTestCustomer,
  createTestBookingRecord,
  createTestBookingLine,
  createTimelineEvent,
} from "../helpers/test-factories";

// ════════════════════════════════════════════════════════════════
// GET / — قائمة الحجوزات
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("Route Queries — GET / (list)", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => { ({ db, cleanup } = await openTestDb()); });
  afterEach(async () => { await cleanup(); });

  it("يعيد booking_records بـ startsAt — لا eventDate", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    await createTestBookingRecord(db, org.id, customer.id, {
      startsAt: new Date("2026-09-01T10:00:00Z"),
    });

    const result = await db
      .select({ booking: bookingRecords, customerName: customers.name })
      .from(bookingRecords)
      .leftJoin(customers, eq(bookingRecords.customerId, customers.id))
      .where(eq(bookingRecords.orgId, org.id));

    expect(result).toHaveLength(1);
    expect(result[0].booking.startsAt).toBeInstanceOf(Date);
    expect((result[0].booking as any).eventDate).toBeUndefined();
  });

  it("يفلتر بـ dateFrom/dateTo على startsAt", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    await createTestBookingRecord(db, org.id, customer.id, {
      startsAt: new Date("2026-09-05T10:00:00Z"),
    });
    await createTestBookingRecord(db, org.id, customer.id, {
      startsAt: new Date("2026-10-05T10:00:00Z"),
    });

    const septOnly = await db
      .select({ booking: bookingRecords })
      .from(bookingRecords)
      .where(and(
        eq(bookingRecords.orgId, org.id),
        gte(bookingRecords.startsAt, new Date("2026-09-01")),
        lte(bookingRecords.startsAt, new Date("2026-09-30")),
      ));

    expect(septOnly).toHaveLength(1);
    expect(septOnly[0].booking.startsAt.getMonth()).toBe(8); // September = 8
  });

  it("يفلتر بـ status ويرجع count صحيح", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    await createTestBookingRecord(db, org.id, customer.id, { status: "confirmed" });
    await createTestBookingRecord(db, org.id, customer.id, { status: "pending" });
    await createTestBookingRecord(db, org.id, customer.id, { status: "confirmed" });

    const [{ total }] = await db
      .select({ total: count() })
      .from(bookingRecords)
      .where(and(
        eq(bookingRecords.orgId, org.id),
        eq(bookingRecords.status, "confirmed"),
      ));

    expect(Number(total)).toBe(2);
  });

  it("subquery على booking_lines لـ firstServiceName", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    await createTestBookingLine(db, record.id, { itemName: "قص شعر" });

    // Raw SQL column reference (not bound param) — same pattern as production route
    const result = await db
      .select({
        booking: bookingRecords,
        firstServiceName: sql<string | null>`(
          SELECT bl.item_name
          FROM booking_lines bl
          WHERE bl.booking_record_id = booking_records.id
          LIMIT 1
        )`,
        firstDurationMinutes: sql<number | null>`(
          SELECT bl.duration_minutes
          FROM booking_lines bl
          WHERE bl.booking_record_id = booking_records.id
          LIMIT 1
        )`,
      })
      .from(bookingRecords)
      .where(eq(bookingRecords.orgId, org.id));

    expect(result[0].firstServiceName).toBe("قص شعر");
  });

  it("عزل multi-tenant — orgId يفلتر بدقة", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);
    const c2 = await createTestCustomer(db, org2.id);

    await createTestBookingRecord(db, org1.id, c1.id);
    await createTestBookingRecord(db, org2.id, c2.id);
    await createTestBookingRecord(db, org2.id, c2.id);

    const org1Results = await db
      .select()
      .from(bookingRecords)
      .where(eq(bookingRecords.orgId, org1.id));

    expect(org1Results).toHaveLength(1);
  });
});

// ════════════════════════════════════════════════════════════════
// GET /check-availability
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("Route Queries — GET /check-availability", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => { ({ db, cleanup } = await openTestDb()); });
  afterEach(async () => { await cleanup(); });

  it("يكتشف تعارض زمني على startsAt/endsAt", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    await createTestBookingRecord(db, org.id, customer.id, {
      startsAt: new Date("2026-09-10T09:00:00Z"),
      endsAt:   new Date("2026-09-10T10:00:00Z"),
      status:   "confirmed",
    });

    const dayStart = new Date("2026-09-10T00:00:00Z");
    const dayEnd   = new Date("2026-09-10T23:59:59Z");

    const conflicts = await db
      .select({ bookingNumber: bookingRecords.bookingNumber })
      .from(bookingRecords)
      .where(and(
        eq(bookingRecords.orgId, org.id),
        sql`${bookingRecords.status} NOT IN ('cancelled')`,
        lte(bookingRecords.startsAt, dayEnd),
        gte(sql`COALESCE(${bookingRecords.endsAt}, ${bookingRecords.startsAt})`, dayStart),
      ))
      .limit(5);

    expect(conflicts.length).toBe(1);
  });

  it("لا يكتشف تعارض في يوم مختلف", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    await createTestBookingRecord(db, org.id, customer.id, {
      startsAt: new Date("2026-09-10T09:00:00Z"),
      status:   "confirmed",
    });

    const dayStart = new Date("2026-09-11T00:00:00Z");
    const dayEnd   = new Date("2026-09-11T23:59:59Z");

    const conflicts = await db
      .select()
      .from(bookingRecords)
      .where(and(
        eq(bookingRecords.orgId, org.id),
        sql`${bookingRecords.status} NOT IN ('cancelled')`,
        lte(bookingRecords.startsAt, dayEnd),
        gte(sql`COALESCE(${bookingRecords.endsAt}, ${bookingRecords.startsAt})`, dayStart),
      ));

    expect(conflicts).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// GET /calendar
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("Route Queries — GET /calendar", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => { ({ db, cleanup } = await openTestDb()); });
  afterEach(async () => { await cleanup(); });

  it("يرجع حجوزات في نطاق التاريخ مرتبة بـ startsAt", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    const d1 = new Date("2026-09-10T08:00:00Z");
    const d2 = new Date("2026-09-15T14:00:00Z");
    const d3 = new Date("2026-10-01T10:00:00Z"); // outside range

    await createTestBookingRecord(db, org.id, customer.id, { startsAt: d2 });
    await createTestBookingRecord(db, org.id, customer.id, { startsAt: d1 });
    await createTestBookingRecord(db, org.id, customer.id, { startsAt: d3 });

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
      })
      .from(bookingRecords)
      .leftJoin(customers, eq(bookingRecords.customerId, customers.id))
      .where(and(
        eq(bookingRecords.orgId, org.id),
        gte(bookingRecords.startsAt, new Date("2026-09-01")),
        lte(bookingRecords.startsAt, new Date("2026-09-30")),
        sql`${bookingRecords.status} NOT IN ('cancelled')`,
      ))
      .orderBy(asc(bookingRecords.startsAt));

    expect(result).toHaveLength(2);
    expect(result[0].startsAt.toISOString()).toContain("2026-09-10");
    expect(result[1].startsAt.toISOString()).toContain("2026-09-15");
  });
});

// ════════════════════════════════════════════════════════════════
// GET /:id — Detail
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("Route Queries — GET /:id (detail)", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => { ({ db, cleanup } = await openTestDb()); });
  afterEach(async () => { await cleanup(); });

  it("يحمّل booking_lines بـ itemName بدل serviceName", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    await createTestBookingLine(db, record.id, { itemName: "تدليك", quantity: 1, unitPrice: "200.00", totalPrice: "200.00" });
    await createTestBookingLine(db, record.id, { itemName: "قهوة عربية", quantity: 2, unitPrice: "25.00", totalPrice: "50.00" });

    const lines = await db
      .select()
      .from(bookingLines)
      .where(eq(bookingLines.bookingRecordId, record.id));

    expect(lines).toHaveLength(2);
    expect(lines[0].itemName).toBeDefined();
    expect((lines[0] as any).serviceName).toBeUndefined();
    expect((lines[0] as any).serviceId).toBeUndefined();
  });

  it("يحمّل booking_line_addons عبر bookingLineId", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    const line = await createTestBookingLine(db, record.id);

    await db.insert(bookingLineAddons).values({
      bookingLineId: line.id,
      addonName: "زيت أرغان",
      quantity: 1,
      unitPrice: "30.00",
      totalPrice: "30.00",
    } as any).returning();

    const addons = await db
      .select()
      .from(bookingLineAddons)
      .where(eq(bookingLineAddons.bookingLineId, line.id));

    expect(addons).toHaveLength(1);
    expect(addons[0].addonName).toBe("زيت أرغان");
    expect((addons[0] as any).bookingItemId).toBeUndefined();
  });

  it("response لا يشمل payments — مؤجل لـ Phase 3.C", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    const [found] = await db
      .select()
      .from(bookingRecords)
      .where(and(
        eq(bookingRecords.id, record.id),
        eq(bookingRecords.orgId, org.id),
      ));

    expect(found).toBeDefined();
    expect((found as any).payments).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════
// GET /:id/events
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("Route Queries — GET /:id/events", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => { ({ db, cleanup } = await openTestDb()); });
  afterEach(async () => { await cleanup(); });

  it("يقرأ من booking_timeline_events بـ bookingRecordId", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    await createTimelineEvent(db, org.id, record.id, {
      eventType: "status_changed",
      fromStatus: "pending",
      toStatus: "confirmed",
    });
    await createTimelineEvent(db, org.id, record.id, {
      eventType: "payment_received",
      metadata: { amount: "115.00" },
    });

    const events = await db
      .select()
      .from(bookingTimelineEvents)
      .where(and(
        eq(bookingTimelineEvents.bookingRecordId, record.id),
        eq(bookingTimelineEvents.orgId, org.id),
      ))
      .orderBy(asc(bookingTimelineEvents.createdAt));

    expect(events).toHaveLength(2);
    expect(events[0].bookingRecordId).toBe(record.id);
    expect((events[0] as any).bookingId).toBeUndefined();
  });

  it("عزل multi-tenant في events", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);
    const c2 = await createTestCustomer(db, org2.id);

    const r1 = await createTestBookingRecord(db, org1.id, c1.id);
    const r2 = await createTestBookingRecord(db, org2.id, c2.id);

    await createTimelineEvent(db, org1.id, r1.id);
    await createTimelineEvent(db, org2.id, r2.id);

    const org1Events = await db
      .select()
      .from(bookingTimelineEvents)
      .where(eq(bookingTimelineEvents.orgId, org1.id));

    expect(org1Events).toHaveLength(1);
    expect(org1Events[0].bookingRecordId).toBe(r1.id);
  });
});
