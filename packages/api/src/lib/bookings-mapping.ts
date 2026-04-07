import type {
  bookings,
  bookingItems,
  bookingItemAddons,
  bookingEvents,
  bookingAssignments,
  bookingCommissions,
  bookingConsumptions,
  payments,
} from "@nasaq/db/schema";

type LegacyBooking = typeof bookings.$inferSelect;
type LegacyBookingItem = typeof bookingItems.$inferSelect;
type LegacyBookingItemAddon = typeof bookingItemAddons.$inferSelect;
type LegacyBookingEvent = typeof bookingEvents.$inferSelect;
type LegacyBookingAssignment = typeof bookingAssignments.$inferSelect;
type LegacyBookingCommission = typeof bookingCommissions.$inferSelect;
type LegacyBookingConsumption = typeof bookingConsumptions.$inferSelect;
type LegacyPayment = typeof payments.$inferSelect;

export type LegacyBookingAggregate = {
  booking: LegacyBooking;
  items: LegacyBookingItem[];
  addons: LegacyBookingItemAddon[];
  events: LegacyBookingEvent[];
  assignments: LegacyBookingAssignment[];
  commissions: LegacyBookingCommission[];
  consumptions: LegacyBookingConsumption[];
  payments: LegacyPayment[];
};

// Canonical target payload contracts (Phase 2 mapping only)
export type CanonicalBookingRecordPayload = {
  booking_records: Record<string, unknown>;
};

export type CanonicalBookingAggregatePayload = {
  booking_records: Record<string, unknown>;
  booking_lines: Array<{ legacyBookingItemId: string; row: Record<string, unknown> }>;
  booking_line_addons: Array<{ legacyBookingItemId: string; row: Record<string, unknown> }>;
  booking_timeline_events: Array<Record<string, unknown>>;
  booking_record_assignments: Array<Record<string, unknown>>;
  booking_record_commissions: Array<{ legacyBookingItemId: string | null; row: Record<string, unknown> }>;
  booking_consumptions_canonical: Array<{ legacyBookingItemId: string | null; row: Record<string, unknown> }>;
  booking_payment_links: Array<Record<string, unknown>>;
};

const statusMap: Record<string, string> = {
  pending: "pending",
  confirmed: "confirmed",
  deposit_paid: "confirmed",
  fully_confirmed: "confirmed",
  preparing: "in_progress",
  in_progress: "in_progress",
  completed: "completed",
  reviewed: "completed",
  cancelled: "cancelled",
  no_show: "no_show",
};

const paymentStatusMap: Record<string, string> = {
  pending: "pending",
  paid: "paid",
  partially_paid: "partially_paid",
  overdue: "overdue",
  refunded: "refunded",
  partially_refunded: "partially_refunded",
};

const sortByCreatedAtThenId = <T extends { id: string; createdAt?: Date | null }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta === tb ? a.id.localeCompare(b.id) : ta - tb;
  });

const toCanonicalStatus = (legacyStatus: string | null | undefined): string =>
  legacyStatus ? (statusMap[legacyStatus] ?? legacyStatus) : "pending";

const toCanonicalPaymentStatus = (legacyPaymentStatus: string | null | undefined): string =>
  legacyPaymentStatus ? (paymentStatusMap[legacyPaymentStatus] ?? legacyPaymentStatus) : "pending";

export function mapLegacyBookingAggregateToCanonical(
  aggregate: LegacyBookingAggregate,
): CanonicalBookingAggregatePayload {
  const { booking } = aggregate;

  return {
    booking_records: {
      orgId: booking.orgId,
      customerId: booking.customerId,
      bookingRef: booking.id,
      bookingNumber: booking.bookingNumber,
      status: toCanonicalStatus(booking.status),
      paymentStatus: toCanonicalPaymentStatus(booking.paymentStatus),
      startsAt: booking.eventDate,
      endsAt: booking.eventEndDate,
      setupAt: booking.setupDate,
      teardownAt: booking.teardownDate,
      locationId: booking.locationId,
      customLocation: booking.customLocation,
      locationNotes: booking.locationNotes,
      subtotal: booking.subtotal,
      discountAmount: booking.discountAmount,
      vatAmount: booking.vatAmount,
      totalAmount: booking.totalAmount,
      depositAmount: booking.depositAmount,
      paidAmount: booking.paidAmount,
      balanceDue: booking.balanceDue,
      source: booking.source,
      trackingToken: booking.trackingToken,
      customerNotes: booking.customerNotes,
      internalNotes: booking.internalNotes,
      questionAnswers: booking.questionAnswers,
      assignedUserId: booking.assignedUserId,
      vendorId: booking.vendorId,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      reviewedAt: booking.reviewedAt,
      rating: booking.rating,
      reviewText: booking.reviewText,
      metadata: {
        legacyBookingId: booking.id,
      },
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    },
    booking_lines: sortByCreatedAtThenId(aggregate.items).map((item) => ({
      legacyBookingItemId: item.id,
      row: {
        serviceRefId: item.serviceId,
        itemName: item.serviceName,
        itemType: item.serviceType,
        durationMinutes: item.durationMinutes,
        vatInclusive: item.vatInclusive,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        pricingBreakdown: item.pricingBreakdown,
        notes: item.notes,
        createdAt: item.createdAt,
      },
    })),
    booking_line_addons: sortByCreatedAtThenId(
      aggregate.addons as Array<LegacyBookingItemAddon & { createdAt?: Date | null }>,
    ).map((addon) => ({
      legacyBookingItemId: addon.bookingItemId,
      row: {
        addonRefId: addon.addonId,
        addonName: addon.addonName,
        quantity: addon.quantity,
        unitPrice: addon.unitPrice,
        totalPrice: addon.totalPrice,
      },
    })),
    booking_timeline_events: sortByCreatedAtThenId(aggregate.events).map((event) => ({
      orgId: event.orgId,
      userId: event.userId,
      eventType: event.eventType,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      metadata: { ...(event.metadata ?? {}), legacyEventId: event.id },
      notes: event.notes,
      createdAt: event.createdAt,
    })),
    booking_record_assignments: sortByCreatedAtThenId(aggregate.assignments).map((assignment) => ({
      orgId: assignment.orgId,
      userId: assignment.userId,
      role: assignment.role,
      assignedAt: assignment.assignedAt,
      notes: assignment.notes,
      createdAt: assignment.createdAt,
    })),
    booking_record_commissions: sortByCreatedAtThenId(aggregate.commissions).map((commission) => ({
      legacyBookingItemId: commission.bookingItemId,
      row: {
        orgId: commission.orgId,
        userId: commission.userId,
        serviceRefId: commission.serviceId,
        commissionMode: commission.commissionMode,
        rate: commission.rate,
        baseAmount: commission.baseAmount,
        commissionAmount: commission.commissionAmount,
        status: commission.status,
        createdAt: commission.createdAt,
        updatedAt: commission.updatedAt,
      },
    })),
    booking_consumptions_canonical: sortByCreatedAtThenId(aggregate.consumptions).map((consumption) => ({
      legacyBookingItemId: consumption.bookingItemId,
      row: {
        orgId: consumption.orgId,
        supplyId: consumption.supplyId,
        inventoryItemId: consumption.inventoryItemId,
        quantity: consumption.quantity,
        unit: consumption.unit,
        consumedAt: consumption.consumedAt,
        createdBy: consumption.createdBy,
        notes: consumption.notes,
        createdAt: consumption.createdAt,
      },
    })),
    booking_payment_links: sortByCreatedAtThenId(aggregate.payments).map((payment) => ({
      orgId: payment.orgId,
      paymentId: payment.id,
      linkType: payment.type,
      amountApplied: payment.amount,
      metadata: {
        legacyBookingId: payment.bookingId,
        paymentStatus: payment.status,
        paidAt: payment.paidAt,
      },
      createdAt: payment.createdAt,
    })),
  };
}
