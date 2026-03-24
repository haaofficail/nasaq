import { eq, and, sql, gte, lte, ne, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { bookings, bookingItems, services, users } from "@nasaq/db/schema";
import { FIND_AVAILABLE_DAYS_AHEAD, ASSET_BOOKING_THRESHOLD, AUTO_CANCEL_OVERDUE_DAYS } from "./constants";

// ============================================================
// CONFLICT ENGINE
// يفحص 3 طبقات: الموقع + الأصول + الفريق
// ============================================================

export type ConflictResult = {
  hasConflict: boolean;
  conflicts: {
    type: "location" | "asset" | "staff";
    message: string;
    bookingNumber?: string;
    suggestion?: string;
  }[];
};

export async function checkConflicts(params: {
  orgId: string;
  eventDate: Date;
  eventEndDate?: Date;
  locationId?: string;
  serviceIds: string[];
  excludeBookingId?: string; // لتجاهل الحجز الحالي عند التعديل
}): Promise<ConflictResult> {
  const { orgId, eventDate, eventEndDate, locationId, serviceIds, excludeBookingId } = params;
  const conflicts: ConflictResult["conflicts"] = [];
  const endDate = eventEndDate || new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);

  // 1. CHECK LOCATION CONFLICT
  if (locationId) {
    const locationConflicts = await db.select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      eventDate: bookings.eventDate,
    }).from(bookings).where(and(
      eq(bookings.orgId, orgId),
      eq(bookings.locationId, locationId),
      sql`${bookings.status} NOT IN ('cancelled', 'no_show')`,
      // Date overlap check
      lte(bookings.eventDate, endDate),
      gte(sql`COALESCE(${bookings.eventEndDate}, ${bookings.eventDate} + interval '24 hours')`, eventDate),
      excludeBookingId ? ne(bookings.id, excludeBookingId) : sql`1=1`,
    ));

    if (locationConflicts.length > 0) {
      // Find nearest available date
      const suggestion = await findNearestAvailable(orgId, locationId, eventDate);
      conflicts.push({
        type: "location",
        message: `الموقع محجوز في هذا التاريخ (${locationConflicts.map(c => c.bookingNumber).join("، ")})`,
        bookingNumber: locationConflicts[0].bookingNumber,
        suggestion: suggestion ? `أقرب موعد متاح: ${suggestion.toISOString().split("T")[0]}` : undefined,
      });
    }
  }

  // Batch-load all services upfront to avoid N+1 queries (Q4)
  const serviceList = serviceIds.length > 0
    ? await db.select().from(services).where(inArray(services.id, serviceIds))
    : [];
  const serviceMap = new Map(serviceList.map((s) => [s.id, s]));

  // 2. CHECK ASSET AVAILABILITY — single batch query (fixes N+1: was N×M queries → 1 query)
  const allRequiredAssets: { serviceId: string; assetTypeId: string }[] = [];
  for (const serviceId of serviceIds) {
    const service = serviceMap.get(serviceId);
    if (!service) continue;
    for (const req of ((service.requiredAssets as any[]) || [])) {
      if (req.assetTypeId) allRequiredAssets.push({ serviceId, assetTypeId: req.assetTypeId });
    }
  }

  if (allRequiredAssets.length > 0) {
    const uniqueAssetTypeIds = [...new Set(allRequiredAssets.map((r) => r.assetTypeId))];
    // One query: sum booked quantity per assetTypeId using LATERAL JSON unnesting
    const assetCountRows = await db.execute(sql`
      SELECT
        (asset_req->>'assetTypeId') AS asset_type_id,
        COALESCE(SUM((bi.quantity)::int), 0) AS total
      FROM booking_items bi
      JOIN bookings b ON bi.booking_id = b.id
      JOIN services s ON bi.service_id = s.id
      CROSS JOIN LATERAL jsonb_array_elements(s.required_assets) AS asset_req
      WHERE b.org_id = ${orgId}
        AND b.status NOT IN ('cancelled', 'no_show')
        AND b.event_date <= ${endDate}
        AND COALESCE(b.event_end_date, b.event_date + interval '24 hours') >= ${eventDate}
        AND (asset_req->>'assetTypeId') = ANY(${uniqueAssetTypeIds})
        ${excludeBookingId ? sql`AND b.id != ${excludeBookingId}` : sql``}
      GROUP BY asset_req->>'assetTypeId'
    `);
    const assetCountMap = new Map(
      ((assetCountRows as any).rows as { asset_type_id: string; total: string }[])
        .map((r) => [r.asset_type_id, Number(r.total)])
    );

    for (const { serviceId, assetTypeId } of allRequiredAssets) {
      const service = serviceMap.get(serviceId)!;
      const bookedCount = assetCountMap.get(assetTypeId) || 0;
      if (bookedCount >= ASSET_BOOKING_THRESHOLD) {
        conflicts.push({
          type: "asset",
          message: `المعدات المطلوبة لخدمة "${service.name}" قد لا تكون متاحة (${bookedCount} حجز يستخدمها في نفس التاريخ)`,
        });
      }
    }
  }

  // 3. CHECK STAFF AVAILABILITY — 2 queries total outside loop (fixes N+1: was 2N queries → 2 queries)
  const servicesNeedingStaff = serviceIds
    .map((id) => serviceMap.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s && !!s.requiredStaff && s.requiredStaff > 0);

  if (servicesNeedingStaff.length > 0) {
    // Query 1: total staff already committed on this date across all bookings
    const [staffBookings] = await db.select({
      total: sql<number>`COALESCE(SUM(${services.requiredStaff}), 0)`,
    }).from(bookingItems)
      .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
      .innerJoin(services, eq(bookingItems.serviceId, services.id))
      .where(and(
        eq(bookings.orgId, orgId),
        sql`${bookings.status} NOT IN ('cancelled', 'no_show')`,
        lte(bookings.eventDate, endDate),
        gte(sql`COALESCE(${bookings.eventEndDate}, ${bookings.eventDate} + interval '24 hours')`, eventDate),
        sql`${services.requiredStaff} > 0`,
        excludeBookingId ? ne(bookings.id, excludeBookingId) : sql`1=1`,
      ));

    // Query 2: available staff count (one query for all services, not per-service)
    const [availableStaff] = await db.select({ total: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(
        eq(users.orgId, orgId),
        eq(users.status, "active"),
        sql`${users.type} IN ('employee', 'vendor')`,
      ));

    const alreadyCommitted = Number(staffBookings?.total || 0);
    const available = Number(availableStaff?.total || 0);
    const additionalNeeded = servicesNeedingStaff.reduce((sum, s) => sum + (s.requiredStaff || 0), 0);
    const totalNeeded = alreadyCommitted + additionalNeeded;

    if (totalNeeded > available) {
      conflicts.push({
        type: "staff",
        message: `عدد الموظفين المطلوبين (${totalNeeded}) يتجاوز المتاح (${available}) في هذا التاريخ`,
      });
    }
  }

  return { hasConflict: conflicts.length > 0, conflicts };
}

// Find nearest available date for a location — single query via generate_series (Q2)
async function findNearestAvailable(orgId: string, locationId: string, fromDate: Date): Promise<Date | null> {
  const result = await db.execute(sql`
    SELECT candidate::date AS available_date
    FROM generate_series(
      ${fromDate}::date + interval '1 day',
      ${fromDate}::date + interval '${sql.raw(String(FIND_AVAILABLE_DAYS_AHEAD))} days',
      interval '1 day'
    ) AS candidate
    WHERE NOT EXISTS (
      SELECT 1 FROM bookings
      WHERE org_id = ${orgId}
        AND location_id = ${locationId}
        AND event_date = candidate::date
        AND status NOT IN ('cancelled', 'no_show')
    )
    LIMIT 1
  `);
  const row = (result as any).rows?.[0] as { available_date: string } | undefined;
  return row ? new Date(row.available_date) : null;
}

// ============================================================
// RECURRING BOOKINGS
// ينشئ حجوزات متكررة مع فحص تعارضات لكل تاريخ
// ============================================================

export type RecurringPattern = {
  frequency: "weekly" | "biweekly" | "monthly" | "custom";
  endDate: string;           // تاريخ نهاية التكرار
  customDays?: number;       // كل X يوم (للـ custom)
  skipConflicts?: boolean;   // تخطي التواريخ المتعارضة بدل الإلغاء
};

export function generateRecurringDates(startDate: Date, pattern: RecurringPattern): Date[] {
  const dates: Date[] = [];
  const end = new Date(pattern.endDate);
  let current = new Date(startDate);

  const increment = {
    weekly: 7,
    biweekly: 14,
    monthly: 0, // handled differently
    custom: pattern.customDays || 7,
  };

  while (current <= end) {
    // Skip the first one (already created as original booking)
    if (current.getTime() !== startDate.getTime()) {
      dates.push(new Date(current));
    }

    if (pattern.frequency === "monthly") {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + increment[pattern.frequency]);
    }
  }

  return dates;
}

// ============================================================
// AUTO CANCEL / REFUND
// إلغاء تلقائي للحجوزات المتأخرة + حساب المبلغ المسترد
// ============================================================

export type CancellationPolicy = {
  freeHours: number;         // إلغاء مجاني خلال X ساعة من الحجز
  refundPercentBefore: number; // استرداد Y% إذا ألغي قبل Z يوم
  refundDaysBefore: number;
  noRefundDaysBefore: number; // لا استرداد بعد هذا
};

export function calculateRefund(params: {
  policy: CancellationPolicy;
  bookingCreatedAt: Date;
  eventDate: Date;
  cancelledAt: Date;
  totalAmount: number;
  paidAmount: number;
}): { refundAmount: number; refundPercent: number; reason: string } {
  const { policy, bookingCreatedAt, eventDate, cancelledAt, totalAmount, paidAmount } = params;

  const hoursSinceBooking = (cancelledAt.getTime() - bookingCreatedAt.getTime()) / (1000 * 60 * 60);
  const daysBeforeEvent = (eventDate.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24);

  // Free cancellation period
  if (hoursSinceBooking <= policy.freeHours) {
    return {
      refundAmount: paidAmount,
      refundPercent: 100,
      reason: `إلغاء مجاني (خلال ${policy.freeHours} ساعة من الحجز)`,
    };
  }

  // Before refund deadline
  if (daysBeforeEvent >= policy.refundDaysBefore) {
    const refund = paidAmount * (policy.refundPercentBefore / 100);
    return {
      refundAmount: Math.round(refund * 100) / 100,
      refundPercent: policy.refundPercentBefore,
      reason: `استرداد ${policy.refundPercentBefore}% (قبل ${policy.refundDaysBefore} أيام من الحدث)`,
    };
  }

  // No refund period
  if (daysBeforeEvent < policy.noRefundDaysBefore) {
    return {
      refundAmount: 0,
      refundPercent: 0,
      reason: `لا استرداد (أقل من ${policy.noRefundDaysBefore} يوم قبل الحدث)`,
    };
  }

  // Partial refund (between refundDaysBefore and noRefundDaysBefore)
  const ratio = (daysBeforeEvent - policy.noRefundDaysBefore) / (policy.refundDaysBefore - policy.noRefundDaysBefore);
  const percent = Math.round(policy.refundPercentBefore * ratio);
  const refund = paidAmount * (percent / 100);

  return {
    refundAmount: Math.round(refund * 100) / 100,
    refundPercent: percent,
    reason: `استرداد ${percent}% (${Math.round(daysBeforeEvent)} يوم قبل الحدث)`,
  };
}

// Auto-cancel overdue bookings — single UPDATE instead of per-row loop (Q3)
export async function autoCancelOverdueBookings(orgId: string, maxOverdueDays: number = AUTO_CANCEL_OVERDUE_DAYS) {
  const cutoffDate = new Date(Date.now() - maxOverdueDays * 24 * 60 * 60 * 1000);

  const cancelled = await db.update(bookings).set({
    status: "cancelled",
    cancelledAt: new Date(),
    cancellationReason: `إلغاء تلقائي — لم يتم الدفع خلال ${maxOverdueDays} أيام`,
    updatedAt: new Date(),
  }).where(and(
    eq(bookings.orgId, orgId),
    eq(bookings.status, "pending"),
    eq(bookings.paymentStatus, "pending"),
    lte(bookings.createdAt, cutoffDate),
  )).returning({ bookingNumber: bookings.bookingNumber });

  return { cancelled: cancelled.map((b) => b.bookingNumber), count: cancelled.length };
}
