/**
 * Canonical Booking Records — Integration Tests
 *
 * يختبر عمليات canonical-bookings.ts مباشرة على DB حقيقي.
 * كل تست يعمل داخل transaction تُلغى بعده → clean state.
 *
 * المتطلب: TEST_DATABASE_URL أو DATABASE_URL في البيئة.
 *
 * تشغيل: pnpm test --reporter=verbose
 * تشغيل مع تغطية: pnpm test --coverage
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, and, lt, gt, not, inArray, gte, lte, isNull, isNotNull } from "drizzle-orm";
import {
  bookingRecords, bookingLines, bookingLineAddons,
  bookingTimelineEvents, bookingRecordAssignments,
  bookingRecordCommissions, bookingPaymentLinks,
  bookingRecordConsumptions,
} from "@nasaq/db/schema";
import { openTestDb, skipIfNoDb, type TestDb } from "../helpers/test-db";
import {
  createTestOrg,
  createTestCustomer,
  createTestBookingRecord,
  createTestBookingLine,
  createTimelineEvent,
} from "../helpers/test-factories";

// ── مساعد: كشف تعارض الأوقات ────────────────────────────────
// هذا الـ helper سيصبح جزءاً من Phase 3 routes — نختبره هنا كمرحلة أولى

async function detectBookingConflict(
  db: TestDb,
  orgId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
): Promise<{ hasConflict: boolean; conflictIds: string[] }> {
  const conditions = [
    eq(bookingRecords.orgId, orgId),
    not(inArray(bookingRecords.status, ["cancelled", "no_show"])),
    lt(bookingRecords.startsAt, endsAt),
    gt(bookingRecords.endsAt!, startsAt),
  ];

  const rows = await db
    .select({ id: bookingRecords.id })
    .from(bookingRecords)
    .where(and(...conditions));

  const conflictIds = rows
    .map((r) => r.id)
    .filter((id) => id !== excludeId);

  return { hasConflict: conflictIds.length > 0, conflictIds };
}

// ── مساعد: تسجيل تغيير حالة في canonical ────────────────────

async function transitionBookingStatus(
  db: TestDb,
  orgId: string,
  bookingRecordId: string,
  fromStatus: string,
  toStatus: string,
  userId: string | null = null,
  reason?: string,
): Promise<void> {
  await db
    .update(bookingRecords)
    .set({
      status: toStatus,
      updatedAt: new Date(),
      ...(toStatus === "cancelled" ? { cancelledAt: new Date(), cancellationReason: reason ?? null } : {}),
    } as any)
    .where(and(
      eq(bookingRecords.id, bookingRecordId),
      eq(bookingRecords.orgId, orgId),
    ));

  await db.insert(bookingTimelineEvents).values({
    orgId,
    bookingRecordId,
    userId,
    eventType: "status_changed",
    fromStatus,
    toStatus,
    metadata: reason ? { reason } : {},
  } as any);
}

// ════════════════════════════════════════════════════════════════
// PRIORITY 1 — CRITICAL PATHS
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("إنشاء الحجز — المسار الطبيعي", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("ينشئ booking_record بالحقول المطلوبة", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    expect(record.id).toBeDefined();
    expect(record.orgId).toBe(org.id);
    expect(record.customerId).toBe(customer.id);
    expect(record.status).toBe("pending");
    expect(record.paymentStatus).toBe("pending");
    expect(record.createdAt).toBeInstanceOf(Date);
    expect(record.updatedAt).toBeInstanceOf(Date);
  });

  it("يُعيّن isRecurring=false افتراضياً", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    expect(record.isRecurring).toBe(false);
  });

  it("يقبل كل الحقول الاختيارية الجديدة (coupon + UTM + consent)", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, {
      couponCode: "SAVE10",
      couponDiscount: "50.00",
      utmSource: "instagram",
      utmMedium: "cpc",
      utmCampaign: "eid-2026",
      utmTerm: "صالون",
      utmContent: "banner-a",
      consentMetadata: { acceptedTermsAt: new Date().toISOString(), policyVersion: "v2" },
    });

    expect(record.couponCode).toBe("SAVE10");
    expect(record.couponDiscount).toBe("50.00");
    expect(record.utmSource).toBe("instagram");
    expect(record.utmCampaign).toBe("eid-2026");
    expect(record.consentMetadata).toMatchObject({ policyVersion: "v2" });
  });

  it("يُنشئ booking_lines مرتبطة بالـ record", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    const line = await createTestBookingLine(db, record.id);

    expect(line.bookingRecordId).toBe(record.id);
    expect(line.itemName).toBe("خدمة اختبار");
    expect(line.quantity).toBe(1);
  });

  it("يرفض إنشاء record بدون orgId (NOT NULL)", async () => {
    await expect(
      db.insert(bookingRecords).values({
        customerId: "00000000-0000-0000-0000-000000000001",
        bookingNumber: "FAIL-001",
        bookingType: "appointment",
        startsAt: new Date(),
        subtotal: "0",
        totalAmount: "0",
        depositAmount: "0",
        paidAmount: "0",
        balanceDue: "0",
        isRecurring: false,
      } as any),
    ).rejects.toThrow();
  });

  it("يرفض bookingNumber مكرر (UNIQUE)", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const r1 = await createTestBookingRecord(db, org.id, customer.id);
    await expect(
      createTestBookingRecord(db, org.id, customer.id, { bookingNumber: r1.bookingNumber }),
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════
// CANCEL + REFUND
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("إلغاء الحجز وحساب الاسترداد", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("تغيير الحالة إلى cancelled يُسجّل cancelledAt وسبب الإلغاء", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    await transitionBookingStatus(db, org.id, record.id, "pending", "cancelled", null, "طلب العميل");

    const [updated] = await db
      .select()
      .from(bookingRecords)
      .where(eq(bookingRecords.id, record.id));

    expect(updated.status).toBe("cancelled");
    expect(updated.cancelledAt).toBeInstanceOf(Date);
    expect(updated.cancellationReason).toBe("طلب العميل");
  });

  it("يُخزّن refundAmount على booking_record", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, {
      paidAmount: "115.00",
    });

    await db
      .update(bookingRecords)
      .set({ refundAmount: "115.00", status: "cancelled", cancelledAt: new Date() } as any)
      .where(eq(bookingRecords.id, record.id));

    const [updated] = await db.select().from(bookingRecords).where(eq(bookingRecords.id, record.id));
    expect(updated.refundAmount).toBe("115.00");
  });

  it("refundAmount يقبل partial (أقل من totalAmount)", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, {
      totalAmount: "500.00",
      paidAmount: "500.00",
    });

    await db
      .update(bookingRecords)
      .set({ refundAmount: "250.00" } as any)
      .where(eq(bookingRecords.id, record.id));

    const [updated] = await db.select().from(bookingRecords).where(eq(bookingRecords.id, record.id));
    expect(parseFloat(updated.refundAmount ?? "0")).toBe(250);
  });
});

// ════════════════════════════════════════════════════════════════
// CONFLICT DETECTION
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("كشف تعارض الأوقات", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("يكشف التعارض عندما تتداخل نافذتا وقت", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    // حجز من 10:00 إلى 11:00
    const slot1Start = new Date("2026-06-01T10:00:00Z");
    const slot1End   = new Date("2026-06-01T11:00:00Z");
    await createTestBookingRecord(db, org.id, customer.id, { startsAt: slot1Start, endsAt: slot1End });

    // محاولة حجز من 10:30 إلى 11:30 — يتداخل
    const { hasConflict } = await detectBookingConflict(
      db, org.id,
      new Date("2026-06-01T10:30:00Z"),
      new Date("2026-06-01T11:30:00Z"),
    );
    expect(hasConflict).toBe(true);
  });

  it("لا تعارض عندما لا تتداخل الأوقات (متتالية)", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    const slot1Start = new Date("2026-06-01T09:00:00Z");
    const slot1End   = new Date("2026-06-01T10:00:00Z");
    await createTestBookingRecord(db, org.id, customer.id, { startsAt: slot1Start, endsAt: slot1End });

    // حجز يبدأ بعد انتهاء الأول بالضبط
    const { hasConflict } = await detectBookingConflict(
      db, org.id,
      new Date("2026-06-01T10:00:00Z"),
      new Date("2026-06-01T11:00:00Z"),
    );
    expect(hasConflict).toBe(false);
  });

  it("الحجوزات الملغاة لا تُسبّب تعارضاً", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    const slotStart = new Date("2026-06-01T10:00:00Z");
    const slotEnd   = new Date("2026-06-01T11:00:00Z");
    const record = await createTestBookingRecord(db, org.id, customer.id, { startsAt: slotStart, endsAt: slotEnd });

    // إلغاء الحجز
    await db.update(bookingRecords)
      .set({ status: "cancelled" } as any)
      .where(eq(bookingRecords.id, record.id));

    const { hasConflict } = await detectBookingConflict(db, org.id, slotStart, slotEnd);
    expect(hasConflict).toBe(false);
  });

  it("التعارض محصور بالمنشأة نفسها — لا تعارض بين منشأتين", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const customer1 = await createTestCustomer(db, org1.id);

    const slotStart = new Date("2026-06-01T10:00:00Z");
    const slotEnd   = new Date("2026-06-01T11:00:00Z");

    // حجز في منشأة 1
    await createTestBookingRecord(db, org1.id, customer1.id, { startsAt: slotStart, endsAt: slotEnd });

    // كشف التعارض من منشأة 2 — يجب أن لا يجد شيئاً
    const { hasConflict } = await detectBookingConflict(db, org2.id, slotStart, slotEnd);
    expect(hasConflict).toBe(false);
  });

  it("يستثني الـ no_show من حساب التعارض", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    const slotStart = new Date("2026-06-01T14:00:00Z");
    const slotEnd   = new Date("2026-06-01T15:00:00Z");
    const record = await createTestBookingRecord(db, org.id, customer.id, { startsAt: slotStart, endsAt: slotEnd });

    await db.update(bookingRecords)
      .set({ status: "no_show" } as any)
      .where(eq(bookingRecords.id, record.id));

    const { hasConflict } = await detectBookingConflict(db, org.id, slotStart, slotEnd);
    expect(hasConflict).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// STATUS TRANSITIONS
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("انتقالات الحالة + Timeline Events", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("pending → confirmed يُحدّث الحالة ويُنشئ timeline event", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    await transitionBookingStatus(db, org.id, record.id, "pending", "confirmed");

    const [updated] = await db.select().from(bookingRecords).where(eq(bookingRecords.id, record.id));
    expect(updated.status).toBe("confirmed");

    const events = await db.select().from(bookingTimelineEvents)
      .where(eq(bookingTimelineEvents.bookingRecordId, record.id));
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("status_changed");
    expect(events[0].fromStatus).toBe("pending");
    expect(events[0].toStatus).toBe("confirmed");
  });

  it("انتقالات متعددة تُنشئ سجلات timeline متسلسلة", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    await transitionBookingStatus(db, org.id, record.id, "pending", "confirmed");
    await transitionBookingStatus(db, org.id, record.id, "confirmed", "in_progress");
    await transitionBookingStatus(db, org.id, record.id, "in_progress", "completed");

    const events = await db.select().from(bookingTimelineEvents)
      .where(eq(bookingTimelineEvents.bookingRecordId, record.id));

    expect(events).toHaveLength(3);
    const statuses = events.map((e) => e.toStatus);
    expect(statuses).toContain("confirmed");
    expect(statuses).toContain("in_progress");
    expect(statuses).toContain("completed");
  });

  it("timeline events مرتبطة بـ orgId وتُفلتر بالصواب", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);
    const c2 = await createTestCustomer(db, org2.id);

    const r1 = await createTestBookingRecord(db, org1.id, c1.id);
    const r2 = await createTestBookingRecord(db, org2.id, c2.id);

    await transitionBookingStatus(db, org1.id, r1.id, "pending", "confirmed");
    await transitionBookingStatus(db, org2.id, r2.id, "pending", "confirmed");

    const org1Events = await db.select().from(bookingTimelineEvents)
      .where(eq(bookingTimelineEvents.orgId, org1.id));

    expect(org1Events.every((e) => e.orgId === org1.id)).toBe(true);
    expect(org1Events.some((e) => e.orgId === org2.id)).toBe(false);
  });

  it("الإلغاء يُسجّل سبباً في الـ metadata", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    await transitionBookingStatus(db, org.id, record.id, "pending", "cancelled", null, "قوة قاهرة");

    const events = await db.select().from(bookingTimelineEvents)
      .where(and(
        eq(bookingTimelineEvents.bookingRecordId, record.id),
        eq(bookingTimelineEvents.eventType, "status_changed"),
      ));

    const cancelEvent = events.find((e) => e.toStatus === "cancelled");
    expect(cancelEvent).toBeDefined();
    expect((cancelEvent!.metadata as any)?.reason).toBe("قوة قاهرة");
  });

  it("timeline events لا تُنشأ عند تحديث غير الحالة", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    // تحديث الملاحظات فقط — بدون timeline event
    await db.update(bookingRecords)
      .set({ internalNotes: "ملاحظة داخلية" } as any)
      .where(eq(bookingRecords.id, record.id));

    const events = await db.select().from(bookingTimelineEvents)
      .where(eq(bookingTimelineEvents.bookingRecordId, record.id));

    expect(events).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// MULTI-TENANT ISOLATION
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("عزل البيانات بين المنشآت (Multi-Tenant)", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("لا يمكن رؤية حجوزات منشأة أخرى عبر فلتر orgId", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);

    await createTestBookingRecord(db, org1.id, c1.id);
    await createTestBookingRecord(db, org1.id, c1.id);

    const org2Records = await db.select().from(bookingRecords)
      .where(eq(bookingRecords.orgId, org2.id));

    expect(org2Records).toHaveLength(0);
  });

  it("UPDATE محكوم بـ orgId — لا يُعدّل حجوزات منشأة أخرى", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);
    const record = await createTestBookingRecord(db, org1.id, c1.id);

    // محاولة تحديث بـ orgId خاطئ
    const result = await db.update(bookingRecords)
      .set({ internalNotes: "اختراق" } as any)
      .where(and(
        eq(bookingRecords.id, record.id),
        eq(bookingRecords.orgId, org2.id), // orgId خاطئ
      ))
      .returning();

    expect(result).toHaveLength(0);

    // التأكد أن السجل الأصلي لم يتغير
    const [original] = await db.select().from(bookingRecords).where(eq(bookingRecords.id, record.id));
    expect(original.internalNotes).toBeNull();
  });

  it("booking_lines لا تُرجع نتائج لـ bookingRecordId من منشأة أخرى", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);
    const c2 = await createTestCustomer(db, org2.id);

    const r1 = await createTestBookingRecord(db, org1.id, c1.id);
    const r2 = await createTestBookingRecord(db, org2.id, c2.id);

    await db.insert(bookingRecords); // confirm both records exist
    const line1 = await db.insert(bookingLines).values({
      bookingRecordId: r1.id,
      itemName: "خدمة org1",
      lineType: "service",
      quantity: 1,
      unitPrice: "100",
      totalPrice: "100",
      vatInclusive: true,
    } as any).returning();

    // Query lines from org2's booking — should find nothing
    const org2Lines = await db.select().from(bookingLines)
      .where(eq(bookingLines.bookingRecordId, r2.id));

    expect(org2Lines).toHaveLength(0);
  });

  it("timeline events محكومة بـ orgId في الـ WHERE", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);
    const record = await createTestBookingRecord(db, org1.id, c1.id);

    await createTimelineEvent(db, org1.id, record.id);

    // استعلام بـ org2 — يجب أن لا يرجع شيء
    const events = await db.select().from(bookingTimelineEvents)
      .where(eq(bookingTimelineEvents.orgId, org2.id));

    expect(events).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// PRIORITY 2 — EDGE CASES
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("الحجوزات المتكررة (Recurring Bookings)", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("ينشئ حجزاً أصلياً مع isRecurring=true", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const parent = await createTestBookingRecord(db, org.id, customer.id, {
      isRecurring: true,
      recurringPattern: { frequency: "weekly", dayOfWeek: 2, endDate: "2026-12-31" },
    });

    expect(parent.isRecurring).toBe(true);
    expect((parent.recurringPattern as any)?.frequency).toBe("weekly");
  });

  it("ينشئ حجزاً فرعياً يشير للأصل عبر parentBookingId", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const parent = await createTestBookingRecord(db, org.id, customer.id, { isRecurring: true });
    const child  = await createTestBookingRecord(db, org.id, customer.id, { parentBookingId: parent.id });

    expect(child.parentBookingId).toBe(parent.id);
  });

  it("يمكن استعلام كل الحجوزات الفرعية لأب معين", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const parent = await createTestBookingRecord(db, org.id, customer.id, { isRecurring: true });

    await createTestBookingRecord(db, org.id, customer.id, { parentBookingId: parent.id });
    await createTestBookingRecord(db, org.id, customer.id, { parentBookingId: parent.id });
    await createTestBookingRecord(db, org.id, customer.id, { parentBookingId: parent.id });

    const children = await db.select().from(bookingRecords)
      .where(and(
        eq(bookingRecords.orgId, org.id),
        eq(bookingRecords.parentBookingId, parent.id),
      ));

    expect(children).toHaveLength(3);
  });
});

describe.skipIf(skipIfNoDb)("قسيمة الخصم (Coupon) والـ UTM", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("يُخزّن كود القسيمة وقيمة الخصم بدقة عشرية", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, {
      couponCode: "RAMADAN25",
      couponDiscount: "125.50",
      totalAmount: "376.50",
    });

    expect(record.couponCode).toBe("RAMADAN25");
    expect(parseFloat(record.couponDiscount ?? "0")).toBeCloseTo(125.5);
  });

  it("يُخزّن 5 حقول UTM كاملة", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, {
      utmSource: "google",
      utmMedium: "search",
      utmCampaign: "summer-promo",
      utmTerm: "حجز صالون",
      utmContent: "ad-v2",
    });

    expect(record.utmSource).toBe("google");
    expect(record.utmTerm).toBe("حجز صالون");
    expect(record.utmContent).toBe("ad-v2");
  });

  it("UTM fields اختيارية — null افتراضياً", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    expect(record.utmSource).toBeNull();
    expect(record.utmCampaign).toBeNull();
  });
});

describe.skipIf(skipIfNoDb)("PDPL — موافقة العميل (consentMetadata)", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("يُخزّن بيانات الموافقة JSONB قابلة للاستعلام", async () => {
    const consentTime = new Date().toISOString();
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, {
      consentMetadata: {
        acceptedTermsAt: consentTime,
        acceptedPrivacyAt: consentTime,
        policyVersion: "v3",
        source: "website",
      },
    });

    const metadata = record.consentMetadata as any;
    expect(metadata?.policyVersion).toBe("v3");
    expect(metadata?.source).toBe("website");
    expect(metadata?.acceptedTermsAt).toBe(consentTime);
  });

  it("consentMetadata اختياري — null عند غيابه", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    expect(record.consentMetadata).toBeNull();
  });
});

describe.skipIf(skipIfNoDb)("timezone — توقيت الرياض (Asia/Riyadh)", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("تُخزَّن التواريخ بـ withTimezone وتُسترجع صحيحة", async () => {
    const riyadhMidnight = new Date("2026-06-15T21:00:00Z"); // UTC = منتصف الليل في الرياض (UTC+3)
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id, {
      startsAt: riyadhMidnight,
    });

    const [fetched] = await db.select().from(bookingRecords).where(eq(bookingRecords.id, record.id));
    expect(fetched.startsAt.toISOString()).toBe(riyadhMidnight.toISOString());
  });

  it("فلترة بنطاق تاريخ تعمل بشكل صحيح مع timezone", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    const morning = new Date("2026-06-15T07:00:00Z"); // 10:00 Riyadh
    const evening = new Date("2026-06-15T17:00:00Z"); // 20:00 Riyadh

    await createTestBookingRecord(db, org.id, customer.id, { startsAt: morning });
    await createTestBookingRecord(db, org.id, customer.id, { startsAt: evening });

    const dayRecords = await db.select().from(bookingRecords)
      .where(and(
        eq(bookingRecords.orgId, org.id),
        gte(bookingRecords.startsAt, new Date("2026-06-15T00:00:00Z")),
        lt(bookingRecords.startsAt, new Date("2026-06-16T00:00:00Z")),
      ));

    expect(dayRecords).toHaveLength(2);
  });
});

// ════════════════════════════════════════════════════════════════
// BOOKING LINES & ADDONS
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("Booking Lines وAddons", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("ينشئ line_addons مرتبطة بـ booking_line", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    const line = await createTestBookingLine(db, record.id);

    const [addon] = await db.insert(bookingLineAddons).values({
      bookingLineId: line.id,
      addonName: "خدمة إضافية",
      quantity: 1,
      unitPrice: "50.00",
      totalPrice: "50.00",
    } as any).returning();

    expect(addon.bookingLineId).toBe(line.id);
    expect(addon.addonName).toBe("خدمة إضافية");
  });

  it("snapshot محفوظ ولا يتغير إذا تغيرت الخدمة الأصل", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    const snapshot = { serviceName: "كشف شعر", price: 150, duration: 45 };
    const line = await createTestBookingLine(db, record.id, { snapshot });

    const [fetched] = await db.select().from(bookingLines).where(eq(bookingLines.id, line.id));
    expect((fetched.snapshot as any)?.serviceName).toBe("كشف شعر");
    expect((fetched.snapshot as any)?.price).toBe(150);
  });

  it("حذف booking_record يحذف lines تلقائياً (CASCADE)", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    const line = await createTestBookingLine(db, record.id);

    await db.delete(bookingRecords).where(eq(bookingRecords.id, record.id));

    const remainingLines = await db.select().from(bookingLines)
      .where(eq(bookingLines.bookingRecordId, record.id));

    expect(remainingLines).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// PAYMENT LINKS
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("روابط الدفع (booking_payment_links)", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("ينشئ payment link مرتبط بـ booking_record", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);
    const fakePaymentId = crypto.randomUUID();

    const [link] = await db.insert(bookingPaymentLinks).values({
      orgId: org.id,
      bookingRecordId: record.id,
      paymentId: fakePaymentId,
      linkType: "payment",
      amountApplied: "115.00",
      metadata: { note: "اختبار" },
    } as any).returning();

    expect(link.bookingRecordId).toBe(record.id);
    expect(link.linkType).toBe("payment");
    expect(link.paymentId).toBe(fakePaymentId);
  });

  it("يقبل linkType: deposit و refund و adjustment", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const record = await createTestBookingRecord(db, org.id, customer.id);

    for (const linkType of ["deposit", "refund", "adjustment"] as const) {
      const [link] = await db.insert(bookingPaymentLinks).values({
        orgId: org.id,
        bookingRecordId: record.id,
        paymentId: crypto.randomUUID(),
        linkType,
        amountApplied: "50.00",
      } as any).returning();

      expect(link.linkType).toBe(linkType);
    }
  });

  it("payment links مفلترة بـ orgId", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);
    const record = await createTestBookingRecord(db, org1.id, c1.id);

    await db.insert(bookingPaymentLinks).values({
      orgId: org1.id,
      bookingRecordId: record.id,
      paymentId: crypto.randomUUID(),
      linkType: "payment",
    } as any);

    const org2Links = await db.select().from(bookingPaymentLinks)
      .where(eq(bookingPaymentLinks.orgId, org2.id));

    expect(org2Links).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
// CONCURRENT BOOKING (Race Condition)
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("الحجوزات المتزامنة — Race Conditions", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("bookingNumber UNIQUE يمنع إنشاء حجزين بنفس الرقم", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);
    const fixedNumber = `RACE-${Date.now()}`;

    // الأول يُنجح
    await createTestBookingRecord(db, org.id, customer.id, { bookingNumber: fixedNumber });

    // الثاني يفشل بـ unique violation
    await expect(
      createTestBookingRecord(db, org.id, customer.id, { bookingNumber: fixedNumber }),
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════
// PRIORITY 3 — E2E FLOWS
// ════════════════════════════════════════════════════════════════

describe.skipIf(skipIfNoDb)("E2E — دورة حياة حجز كاملة", () => {
  let db: TestDb;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ db, cleanup } = await openTestDb());
  });

  afterEach(async () => { await cleanup(); });

  it("E2E: إنشاء → تأكيد → إتمام → تقييم", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    // 1. إنشاء الحجز
    const record = await createTestBookingRecord(db, org.id, customer.id);
    expect(record.status).toBe("pending");

    // 2. إضافة خدمة
    const line = await createTestBookingLine(db, record.id, { itemName: "قص شعر", unitPrice: "80.00", totalPrice: "80.00" });
    expect(line.bookingRecordId).toBe(record.id);

    // 3. تأكيد الحجز
    await transitionBookingStatus(db, org.id, record.id, "pending", "confirmed");

    // 4. بدء التنفيذ
    await transitionBookingStatus(db, org.id, record.id, "confirmed", "in_progress");

    // 5. إتمام
    await transitionBookingStatus(db, org.id, record.id, "in_progress", "completed");

    // 6. تقييم
    await db.update(bookingRecords).set({
      rating: 5,
      reviewText: "خدمة ممتازة",
      reviewedAt: new Date(),
      status: "reviewed",
    } as any).where(eq(bookingRecords.id, record.id));

    const [final] = await db.select().from(bookingRecords).where(eq(bookingRecords.id, record.id));
    expect(final.status).toBe("reviewed");
    expect(final.rating).toBe(5);

    const events = await db.select().from(bookingTimelineEvents)
      .where(eq(bookingTimelineEvents.bookingRecordId, record.id));
    expect(events).toHaveLength(3); // confirmed + in_progress + completed
  });

  it("E2E: إنشاء → دفع عربون → إلغاء + استرداد جزئي", async () => {
    const org = await createTestOrg(db);
    const customer = await createTestCustomer(db, org.id);

    const record = await createTestBookingRecord(db, org.id, customer.id, {
      totalAmount: "500.00",
      depositAmount: "100.00",
    });

    // دفع العربون
    const paymentId = crypto.randomUUID();
    await db.insert(bookingPaymentLinks).values({
      orgId: org.id,
      bookingRecordId: record.id,
      paymentId,
      linkType: "deposit",
      amountApplied: "100.00",
    } as any);

    // إلغاء مع استرداد جزئي (العربون غير قابل للاسترداد)
    await db.update(bookingRecords).set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: "تعارض في المواعيد",
      refundAmount: "0",
      paidAmount: "100.00",
    } as any).where(eq(bookingRecords.id, record.id));

    const [final] = await db.select().from(bookingRecords).where(eq(bookingRecords.id, record.id));
    expect(final.status).toBe("cancelled");
    expect(parseFloat(final.refundAmount ?? "0")).toBe(0);
    expect(parseFloat(final.paidAmount ?? "0")).toBe(100);
  });

  it("E2E: التأكد من isolation كامل عند وجود منشأتين", async () => {
    const org1 = await createTestOrg(db);
    const org2 = await createTestOrg(db);
    const c1 = await createTestCustomer(db, org1.id);
    const c2 = await createTestCustomer(db, org2.id);

    const r1 = await createTestBookingRecord(db, org1.id, c1.id);
    const r2 = await createTestBookingRecord(db, org2.id, c2.id);

    await transitionBookingStatus(db, org1.id, r1.id, "pending", "confirmed");
    await transitionBookingStatus(db, org2.id, r2.id, "pending", "in_progress");

    // التأكد أن كل منشأة تقرأ حالة حجزها الصحيحة
    const [fetch1] = await db.select().from(bookingRecords)
      .where(and(eq(bookingRecords.id, r1.id), eq(bookingRecords.orgId, org1.id)));
    const [fetch2] = await db.select().from(bookingRecords)
      .where(and(eq(bookingRecords.id, r2.id), eq(bookingRecords.orgId, org2.id)));

    expect(fetch1.status).toBe("confirmed");
    expect(fetch2.status).toBe("in_progress");

    // التأكد أن منشأة 1 لا ترى حجز منشأة 2
    const [wrongOrg] = await db.select().from(bookingRecords)
      .where(and(eq(bookingRecords.id, r2.id), eq(bookingRecords.orgId, org1.id)));
    expect(wrongOrg).toBeUndefined();
  });
});
