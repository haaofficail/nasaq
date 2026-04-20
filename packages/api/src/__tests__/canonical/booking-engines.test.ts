/**
 * Booking Engines — Integration Tests
 *
 * يختبر العمليات الأساسية للـ engines الأربعة على canonical tables:
 *   appointment_bookings | stay_bookings | table_reservations | event_bookings
 *
 * لا يختبر HTTP routes مباشرة — يختبر DB operations التي تُنفّذها.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import {
  appointmentBookings,
  stayBookings,
  tableReservations,
  eventBookings,
} from "@nasaq/db/schema";
import { openTestDb, skipIfNoDb, type TestDb } from "../helpers/test-db";
import {
  createTestOrg,
  createTestCustomer,
  createTestAppointmentBooking,
} from "../helpers/test-factories";

// ── Stay Booking Factory ───────────────────────────────────────

async function createStayBooking(db: TestDb, orgId: string, customerId: string, overrides: Record<string, unknown> = {}) {
  const bookingNumber = `STAY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const checkIn  = new Date("2026-08-01T12:00:00Z");
  const checkOut = new Date("2026-08-04T12:00:00Z");

  const [booking] = await db.insert(stayBookings).values({
    orgId, customerId, bookingNumber,
    status: "pending", paymentStatus: "pending",
    stayType: "hotel",
    checkIn, checkOut,
    guestCount: 2,
    subtotal: "600.00", discountAmount: "0",
    vatAmount: "90.00", totalAmount: "690.00",
    depositAmount: "100.00", paidAmount: "0",
    ...overrides,
  } as any).returning();
  return booking;
}

// ── Table Reservation Factory ──────────────────────────────────

async function createTableReservation(db: TestDb, orgId: string, overrides: Record<string, unknown> = {}) {
  const reservationNumber = `RES-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const reservedAt = new Date("2026-07-15T19:00:00Z");

  const [reservation] = await db.insert(tableReservations).values({
    orgId, reservationNumber,
    status: "pending",
    covers: 4,
    reservedAt,
    durationMinutes: 90,
    ...overrides,
  } as any).returning();
  return reservation;
}

// ── Event Booking Factory ──────────────────────────────────────

async function createEventBooking(db: TestDb, orgId: string, customerId: string, overrides: Record<string, unknown> = {}) {
  const bookingNumber = `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const [booking] = await db.insert(eventBookings).values({
    orgId, customerId, bookingNumber,
    status: "pending", paymentStatus: "pending",
    eventDate: "2026-09-15",
    guestCount: 100,
    subtotal: "5000.00", discountAmount: "0",
    vatAmount: "750.00", totalAmount: "5750.00",
    depositAmount: "1000.00", paidAmount: "0",
    balanceDue: "4750.00",
    ...overrides,
  } as any).returning();
  return booking;
}

// ════════════════════════════════════════════════════════════════
// APPOINTMENT ENGINE
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("Appointment Engine — appointment_bookings", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("ينشئ حجز موعد مع الحقول الأساسية", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const booking = await createTestAppointmentBooking(db, org.id, customer.id);

    expect(booking.id).toBeDefined();
    expect(booking.orgId).toBe(org.id);
    expect(booking.status).toBe("pending");
    expect(booking.durationMinutes).toBe(60);
    expect(booking.startAt).toBeInstanceOf(Date);
  });

  it("يفلتر حجوزات المواعيد بـ orgId", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);
    const c2 = await createTestCustomer(db, org2.id);

    await createTestAppointmentBooking(db, org1.id, c1.id);
    await createTestAppointmentBooking(db, org1.id, c1.id);
    await createTestAppointmentBooking(db, org2.id, c2.id);

    const org1Bookings = await db.select()
      .from(appointmentBookings)
      .where(eq(appointmentBookings.orgId, org1.id));

    expect(org1Bookings).toHaveLength(2);
    expect(org1Bookings.every((b) => b.orgId === org1.id)).toBe(true);
  });

  it("يُلغي موعداً مع تسجيل cancelledAt وسبب الإلغاء", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const booking = await createTestAppointmentBooking(db, org.id, customer.id);

    const [cancelled] = await db.update(appointmentBookings)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: "المريض طلب التأجيل",
        updatedAt: new Date(),
      } as any)
      .where(and(
        eq(appointmentBookings.id, booking.id),
        eq(appointmentBookings.orgId, org.id),
      ))
      .returning();

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledAt).toBeInstanceOf(Date);
    expect(cancelled.cancellationReason).toBe("المريض طلب التأجيل");
  });

  it("يفلتر بنطاق تاريخ (from/to)", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    const juneStart = new Date("2026-06-01T08:00:00Z");
    const julyStart = new Date("2026-07-15T10:00:00Z");

    await createTestAppointmentBooking(db, org.id, customer.id, { startAt: juneStart });
    await createTestAppointmentBooking(db, org.id, customer.id, { startAt: julyStart });

    const juneBookings = await db.select()
      .from(appointmentBookings)
      .where(and(
        eq(appointmentBookings.orgId, org.id),
        gte(appointmentBookings.startAt, new Date("2026-06-01")),
        lte(appointmentBookings.startAt, new Date("2026-06-30")),
      ));

    expect(juneBookings).toHaveLength(1);
    expect(juneBookings[0].startAt.toISOString()).toContain("2026-06");
  });

  it("question_answers يُخزّن كـ JSONB", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const answers = [{ question: "هل لديك حساسية؟", answer: "لا" }];
    const booking = await createTestAppointmentBooking(db, org.id, customer.id, { questionAnswers: answers });

    expect(Array.isArray(booking.questionAnswers)).toBe(true);
    expect((booking.questionAnswers as any[])[0]?.question).toBe("هل لديك حساسية؟");
  });
});

// ════════════════════════════════════════════════════════════════
// STAY ENGINE
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("Stay Engine — stay_bookings", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("ينشئ حجز إقامة مع checkIn/checkOut", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const booking = await createStayBooking(db, org.id, customer.id);

    expect(booking.stayType).toBe("hotel");
    expect(booking.checkIn).toBeInstanceOf(Date);
    expect(booking.checkOut).toBeInstanceOf(Date);
    expect(booking.checkOut > booking.checkIn).toBe(true);
  });

  it("يدعم car_rental مع بيانات السائق", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const booking = await createStayBooking(db, org.id, customer.id, {
      stayType: "car_rental",
      driverName: "أحمد محمد",
      driverLicense: "KSA-123456",
      pickupLocation: "مطار الرياض",
      dropoffLocation: "مطار الرياض",
    });

    expect(booking.stayType).toBe("car_rental");
    expect(booking.driverName).toBe("أحمد محمد");
    expect(booking.driverLicense).toBe("KSA-123456");
  });

  it("يفلتر stay bookings بـ orgId", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);

    await createStayBooking(db, org1.id, c1.id);

    const org2Results = await db.select().from(stayBookings)
      .where(eq(stayBookings.orgId, org2.id));

    expect(org2Results).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// TABLE ENGINE
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("Table Engine — table_reservations", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("ينشئ حجز طاولة مع عدد الأغطية", async () => {
    const org = await createTestOrg(db);
    const reservation = await createTableReservation(db, org.id);

    expect(reservation.orgId).toBe(org.id);
    expect(reservation.covers).toBe(4);
    expect(reservation.durationMinutes).toBe(90);
    expect(reservation.status).toBe("pending");
  });

  it("يسجّل مناسبة الحجز (birthday/anniversary/business)", async () => {
    const org = await createTestOrg(db);
    const reservation = await createTableReservation(db, org.id, {
      occasion: "birthday",
      specialRequests: "كيكة مفاجأة",
    });

    expect(reservation.occasion).toBe("birthday");
    expect(reservation.specialRequests).toBe("كيكة مفاجأة");
  });

  it("يسجّل no_show مع timestamp", async () => {
    const org = await createTestOrg(db);
    const reservation = await createTableReservation(db, org.id);
    const noShowAt = new Date();

    const [updated] = await db.update(tableReservations)
      .set({ status: "no_show", noShowAt } as any)
      .where(and(
        eq(tableReservations.id, reservation.id),
        eq(tableReservations.orgId, org.id),
      ))
      .returning();

    expect(updated.status).toBe("no_show");
    expect(updated.noShowAt).toBeInstanceOf(Date);
  });
});

// ════════════════════════════════════════════════════════════════
// EVENT ENGINE
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("Event Engine — event_bookings", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("ينشئ حجز فعالية مع eventDate", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const booking = await createEventBooking(db, org.id, customer.id);

    expect(booking.eventDate).toBe("2026-09-15");
    expect(booking.guestCount).toBe(100);
    expect(parseFloat(booking.totalAmount)).toBe(5750);
  });

  it("يدعم الفعاليات مع setup وteardown", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const setupAt    = new Date("2026-09-15T06:00:00Z");
    const teardownAt = new Date("2026-09-16T01:00:00Z");

    const booking = await createEventBooking(db, org.id, customer.id, {
      eventType: "wedding",
      eventName: "حفل زفاف",
      setupAt,
      teardownAt,
    });

    expect(booking.eventType).toBe("wedding");
    expect(booking.setupAt?.toISOString()).toBe(setupAt.toISOString());
  });

  it("يحفظ packageSnapshot لتجميد بيانات الباقة", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const snapshot = { packageName: "الباقة البلاتينية", includes: ["زهور", "تصوير", "ضيافة"], price: 15000 };

    const booking = await createEventBooking(db, org.id, customer.id, { packageSnapshot: snapshot });
    expect((booking.packageSnapshot as any)?.packageName).toBe("الباقة البلاتينية");
  });

  it("يفلتر event bookings بـ orgId — multi-tenant", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);

    await createEventBooking(db, org1.id, c1.id);
    await createEventBooking(db, org1.id, c1.id);

    const org2Events = await db.select().from(eventBookings)
      .where(eq(eventBookings.orgId, org2.id));

    expect(org2Events).toHaveLength(0);
  });
});
