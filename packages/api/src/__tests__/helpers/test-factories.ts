/**
 * Test Data Factories
 *
 * تُنشئ بيانات اختبار حقيقية مباشرةً في DB عبر Drizzle.
 * كل factory تُرجع الصف المُدرج بالـ id الفعلي.
 * تعمل داخل transaction الاختبار — تُلغى تلقائياً في ROLLBACK.
 */

import { type TestDb } from "./test-db";
import {
  organizations, customers, users,
  bookingRecords, bookingLines, bookingLineAddons,
  bookingTimelineEvents, bookingPaymentLinks,
  appointmentBookings, stayBookings, tableReservations, eventBookings,
} from "@nasaq/db/schema";

// ── Location ───────────────────────────────────────────────────

export async function createTestLocation(db: TestDb, orgId: string, overrides: Record<string, unknown> = {}) {
  const { locations } = await import("@nasaq/db/schema");
  const [loc] = await db.insert(locations).values({
    orgId,
    name: "فرع اختبار",
    type: "branch",
    isMainBranch: false,
    ...overrides,
  } as any).returning();
  return loc;
}

// ── User ───────────────────────────────────────────────────────

export async function createTestUser(db: TestDb, orgId: string, overrides: Record<string, unknown> = {}) {
  const [user] = await db.insert(users).values({
    orgId,
    name:  "موظف اختبار",
    phone: `+9665${Date.now().toString().slice(-8)}`,
    type:  "employee",
    ...overrides,
  } as any).returning();
  return user;
}

// ── Org ────────────────────────────────────────────────────────

export async function createTestOrg(db: TestDb, overrides: Record<string, unknown> = {}) {
  const slug = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [org] = await db.insert(organizations).values({
    name: "منشأة اختبار",
    slug,
    plan: "basic",
    subscriptionStatus: "active",
    bookingUsed: 0,
    ...overrides,
  } as any).returning();
  return org;
}

// ── Customer ───────────────────────────────────────────────────

export async function createTestCustomer(db: TestDb, orgId: string, overrides: Record<string, unknown> = {}) {
  const [customer] = await db.insert(customers).values({
    orgId,
    name: "عميل اختبار",
    phone: `+9665${Date.now().toString().slice(-8)}`,
    type: "individual",
    tier: "regular",
    ...overrides,
  } as any).returning();
  return customer;
}

// ── Booking Record ─────────────────────────────────────────────

export async function createTestBookingRecord(
  db: TestDb,
  orgId: string,
  customerId: string,
  overrides: Record<string, unknown> = {},
) {
  const bookingNumber = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // غداً
  const endsAt   = new Date(startsAt.getTime() + 60 * 60 * 1000); // + ساعة

  const [record] = await db.insert(bookingRecords).values({
    orgId,
    customerId,
    bookingNumber,
    bookingType: "appointment",
    startsAt,
    endsAt,
    subtotal: "100.00",
    discountAmount: "0",
    vatAmount: "15.00",
    totalAmount: "115.00",
    depositAmount: "0",
    paidAmount: "0",
    balanceDue: "115.00",
    status: "pending",
    paymentStatus: "pending",
    ...overrides,
  } as any).returning();
  return record;
}

// ── Booking Line ───────────────────────────────────────────────

export async function createTestBookingLine(db: TestDb, bookingRecordId: string, overrides: Record<string, unknown> = {}) {
  const [line] = await db.insert(bookingLines).values({
    bookingRecordId,
    itemName: "خدمة اختبار",
    lineType: "service",
    quantity: 1,
    unitPrice: "100.00",
    totalPrice: "100.00",
    vatInclusive: true,
    ...overrides,
  } as any).returning();
  return line;
}

// ── Appointment Booking ─────────────────────────────────────────

export async function createTestAppointmentBooking(
  db: TestDb,
  orgId: string,
  customerId: string,
  overrides: Record<string, unknown> = {},
) {
  const bookingNumber = `APT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const startAt  = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const endAt    = new Date(startAt.getTime() + 60 * 60 * 1000);

  const [booking] = await db.insert(appointmentBookings).values({
    orgId,
    customerId,
    bookingNumber,
    status: "pending",
    paymentStatus: "pending",
    startAt,
    endAt,
    durationMinutes: 60,
    subtotal: "100.00",
    discountAmount: "0",
    vatAmount: "15.00",
    totalAmount: "115.00",
    paidAmount: "0",
    ...overrides,
  } as any).returning();
  return booking;
}

// ── Timeline Event ─────────────────────────────────────────────

export async function createTimelineEvent(
  db: TestDb,
  orgId: string,
  bookingRecordId: string,
  overrides: Record<string, unknown> = {},
) {
  const [event] = await db.insert(bookingTimelineEvents).values({
    orgId,
    bookingRecordId,
    eventType: "status_changed",
    fromStatus: "pending",
    toStatus: "confirmed",
    metadata: {},
    ...overrides,
  } as any).returning();
  return event;
}
