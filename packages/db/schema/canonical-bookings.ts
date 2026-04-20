/**
 * Canonical Booking Tables
 *
 * ARCHITECTURE:
 * - bookings (legacy) = read only from this point. No new writes.
 * - appointment_bookings = Engine: Appointment (salon, photography, maintenance)
 * - stay_bookings        = Engine: Stay (hotel, car rental, daily rental)
 * - table_reservations   = Engine: Table (restaurant, cafe)
 * - event_bookings       = Engine: Event (wedding, conference, birthday)
 *
 * Use v_all_bookings view for reporting across all engines.
 */

import {
  pgTable, text, timestamp, boolean, jsonb,
  uuid, integer, numeric, index, date
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { users } from "./auth";
import { locations } from "./organizations";
// bookings.ts import intentionally removed — bookingRef is now a plain UUID tracking field (no FK).
// bookingPaymentLinks.paymentId is a plain UUID (no FK) — payments table stays in bookings.ts until Phase 3.

// ============================================================
// APPOINTMENT BOOKINGS
// Engine: Appointment
// Salon, photography, maintenance, any time-slot service
// ============================================================

export const appointmentBookings = pgTable("appointment_bookings", {
  id:            uuid("id").defaultRandom().primaryKey(),
  orgId:         uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId:    uuid("customer_id").notNull().references(() => customers.id),
  bookingRef:    uuid("booking_ref"), // legacy: references bookings.id (migrated data only)
  bookingRecordId: uuid("booking_record_id").references(() => bookingRecords.id, { onDelete: "cascade" }), // canonical

  bookingNumber: text("booking_number").notNull().unique(),
  status:        text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending"),

  // Schedule
  startAt:          timestamp("start_at", { withTimezone: true }).notNull(),
  endAt:            timestamp("end_at", { withTimezone: true }),
  durationMinutes:  integer("duration_minutes"),

  // Location
  locationId:   uuid("location_id").references(() => locations.id),
  locationNote: text("location_note"),

  // Assignment
  assignedUserId: uuid("assigned_user_id").references(() => users.id),

  // Financials
  subtotal:       numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatAmount:      numeric("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount:    numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paidAmount:     numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),

  // Meta
  source:          text("source").default("dashboard"),
  customerNotes:   text("customer_notes"),
  internalNotes:   text("internal_notes"),
  questionAnswers: jsonb("question_answers").default([]),
  rating:          integer("rating"),
  reviewText:      text("review_text"),
  reviewedAt:      timestamp("reviewed_at", { withTimezone: true }),
  cancelledAt:     timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("appt_bookings_org_idx").on(t.orgId),
  index("appt_bookings_customer_idx").on(t.customerId),
  index("appt_bookings_start_at_idx").on(t.startAt),
  index("appt_bookings_ref_idx").on(t.bookingRef),
  index("appt_bookings_record_id_idx").on(t.bookingRecordId),
]);

// ============================================================
// STAY BOOKINGS
// Engine: Stay
// Hotel rooms, car rentals, daily rentals
// ============================================================

export const stayBookings = pgTable("stay_bookings", {
  id:            uuid("id").defaultRandom().primaryKey(),
  orgId:         uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId:    uuid("customer_id").notNull().references(() => customers.id),
  bookingRef:    uuid("booking_ref"), // legacy: references bookings.id
  bookingRecordId: uuid("booking_record_id").references(() => bookingRecords.id, { onDelete: "cascade" }), // canonical

  bookingNumber: text("booking_number").notNull().unique(),
  status:        text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  stayType:      text("stay_type").notNull().default("hotel"), // hotel|car_rental|daily_rental

  // Unit
  unitId:       uuid("unit_id"),       // room_id or vehicle_id
  unitType:     text("unit_type"),     // room|vehicle|property
  unitSnapshot: jsonb("unit_snapshot"), // frozen snapshot at booking time

  // Period
  checkIn:  timestamp("check_in",  { withTimezone: true }).notNull(),
  checkOut: timestamp("check_out", { withTimezone: true }).notNull(),

  // Check-in/out actuals
  actualCheckIn:  timestamp("actual_check_in",  { withTimezone: true }),
  actualCheckOut: timestamp("actual_check_out", { withTimezone: true }),

  // Guests
  guestCount:    integer("guest_count").default(1),
  driverName:    text("driver_name"),
  driverLicense: text("driver_license"),

  // Pickup/Dropoff (car rental)
  pickupLocation:  text("pickup_location"),
  dropoffLocation: text("dropoff_location"),

  // Financials
  subtotal:       numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatAmount:      numeric("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount:    numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  depositAmount:  numeric("deposit_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  paidAmount:     numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),

  source:             text("source").default("dashboard"),
  customerNotes:      text("customer_notes"),
  internalNotes:      text("internal_notes"),
  cancelledAt:        timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("stay_bookings_org_idx").on(t.orgId),
  index("stay_bookings_customer_idx").on(t.customerId),
  index("stay_bookings_checkin_idx").on(t.checkIn),
  index("stay_bookings_unit_idx").on(t.unitId),
  index("stay_bookings_ref_idx").on(t.bookingRef),
  index("stay_bookings_record_id_idx").on(t.bookingRecordId),
]);

// ============================================================
// TABLE RESERVATIONS
// Engine: Table
// Restaurant and cafe table reservations
// ============================================================

export const tableReservations = pgTable("table_reservations", {
  id:            uuid("id").defaultRandom().primaryKey(),
  orgId:         uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId:    uuid("customer_id").references(() => customers.id),
  bookingRef:    uuid("booking_ref"), // legacy: references bookings.id
  bookingRecordId: uuid("booking_record_id").references(() => bookingRecords.id, { onDelete: "cascade" }), // canonical

  reservationNumber: text("reservation_number").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending|confirmed|seated|completed|cancelled|no_show

  // Table
  tableId:       uuid("table_id"),
  tableSnapshot: jsonb("table_snapshot"), // { number, capacity, section }
  covers:        integer("covers").notNull().default(1),
  section:       text("section"), // indoor|outdoor|private

  // Timing
  reservedAt:      timestamp("reserved_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").default(90),
  seatedAt:        timestamp("seated_at", { withTimezone: true }),
  leftAt:          timestamp("left_at", { withTimezone: true }),

  // Order
  preOrder:        jsonb("pre_order").default([]),
  specialRequests: text("special_requests"),
  occasion:        text("occasion"), // birthday|anniversary|business

  // Optional financials
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).default("0"),
  paidAmount:    numeric("paid_amount", { precision: 12, scale: 2 }).default("0"),

  source:             text("source").default("dashboard"),
  cancelledAt:        timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  noShowAt:           timestamp("no_show_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("table_res_org_idx").on(t.orgId),
  index("table_res_customer_idx").on(t.customerId),
  index("table_res_at_idx").on(t.reservedAt),
  index("table_res_table_idx").on(t.tableId),
  index("table_res_ref_idx").on(t.bookingRef),
  index("table_res_record_id_idx").on(t.bookingRecordId),
]);

// ============================================================
// EVENT BOOKINGS
// Engine: Event
// Weddings, corporate events, conferences, birthdays
// ============================================================

export const eventBookings = pgTable("event_bookings", {
  id:            uuid("id").defaultRandom().primaryKey(),
  orgId:         uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId:    uuid("customer_id").notNull().references(() => customers.id),
  bookingRef:    uuid("booking_ref"), // legacy: references bookings.id
  bookingRecordId: uuid("booking_record_id").references(() => bookingRecords.id, { onDelete: "cascade" }), // canonical

  bookingNumber: text("booking_number").notNull().unique(),
  status:        text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending"),

  // Event
  eventType:  text("event_type"),   // wedding|corporate|birthday|conference
  eventName:  text("event_name"),
  eventDate:  date("event_date").notNull(),
  eventStart: timestamp("event_start", { withTimezone: true }),
  eventEnd:   timestamp("event_end",   { withTimezone: true }),
  setupAt:    timestamp("setup_at",    { withTimezone: true }),
  teardownAt: timestamp("teardown_at", { withTimezone: true }),

  // Location
  locationId:     uuid("location_id").references(() => locations.id),
  customLocation: text("custom_location"),
  locationNotes:  text("location_notes"),

  // Guests
  guestCount:     integer("guest_count"),
  confirmedGuests: integer("confirmed_guests"),

  // Package
  packageId:       uuid("package_id"),
  packageSnapshot: jsonb("package_snapshot"),

  // Financials
  subtotal:       numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatAmount:      numeric("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount:    numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  depositAmount:  numeric("deposit_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  paidAmount:     numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  balanceDue:     numeric("balance_due", { precision: 12, scale: 2 }).notNull().default("0"),

  assignedUserId: uuid("assigned_user_id").references(() => users.id),

  source:             text("source").default("dashboard"),
  customerNotes:      text("customer_notes"),
  internalNotes:      text("internal_notes"),
  questionAnswers:    jsonb("question_answers").default([]),
  cancelledAt:        timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  refundAmount:       numeric("refund_amount", { precision: 10, scale: 2 }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("event_bookings_org_idx").on(t.orgId),
  index("event_bookings_customer_idx").on(t.customerId),
  index("event_bookings_date_idx").on(t.eventDate),
  index("event_bookings_ref_idx").on(t.bookingRef),
  index("event_bookings_record_id_idx").on(t.bookingRecordId),
]);

// ============================================================
// CANONICAL BOOKING AGGREGATE (Phase 1 completion)
// Shared model for booking replacement readiness.
// NOTE: Not wired to runtime paths yet.
// ============================================================

export const bookingRecords = pgTable("booking_records", {
  id:            uuid("id").defaultRandom().primaryKey(),
  orgId:         uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId:    uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
  bookingRef:    uuid("booking_ref"), // legacy tracking only — no FK

  bookingNumber: text("booking_number").notNull().unique(),
  bookingType:   text("booking_type").notNull().default("appointment"), // appointment|event

  status:        text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending"),

  startsAt:      timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt:        timestamp("ends_at", { withTimezone: true }),
  setupAt:       timestamp("setup_at", { withTimezone: true }),
  teardownAt:    timestamp("teardown_at", { withTimezone: true }),

  locationId:     uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  customLocation: text("custom_location"),
  locationNotes:  text("location_notes"),

  subtotal:       numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  vatAmount:      numeric("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount:    numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  depositAmount:  numeric("deposit_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  paidAmount:     numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  balanceDue:     numeric("balance_due", { precision: 12, scale: 2 }).notNull().default("0"),

  // Coupon
  couponCode:      text("coupon_code"),
  couponDiscount:  numeric("coupon_discount", { precision: 10, scale: 2 }),

  // UTM tracking
  utmSource:   text("utm_source"),
  utmMedium:   text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm:     text("utm_term"),
  utmContent:  text("utm_content"),

  // Recurring
  isRecurring:       boolean("is_recurring").default(false).notNull(),
  recurringPattern:  jsonb("recurring_pattern"),
  parentBookingId:   uuid("parent_booking_id"),

  // Consent (PDPL)
  consentMetadata: jsonb("consent_metadata"),

  source:          text("source").default("dashboard"),
  trackingToken:   text("tracking_token").unique(),
  customerNotes:   text("customer_notes"),
  internalNotes:   text("internal_notes"),
  questionAnswers: jsonb("question_answers").default([]),
  metadata:        jsonb("metadata").default({}),

  assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  vendorId:       uuid("vendor_id").references(() => users.id, { onDelete: "set null" }),

  cancelledAt:        timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  refundAmount:       numeric("refund_amount", { precision: 10, scale: 2 }),
  reviewedAt:         timestamp("reviewed_at", { withTimezone: true }),
  rating:             integer("rating"),
  reviewText:         text("review_text"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("booking_records_org_idx").on(t.orgId),
  index("booking_records_customer_idx").on(t.customerId),
  index("booking_records_type_idx").on(t.bookingType),
  index("booking_records_status_idx").on(t.status),
  index("booking_records_starts_at_idx").on(t.startsAt),
  index("booking_records_ref_idx").on(t.bookingRef),
]);

export const bookingLines = pgTable("booking_lines", {
  id:             uuid("id").defaultRandom().primaryKey(),
  bookingRecordId: uuid("booking_record_id").notNull().references(() => bookingRecords.id, { onDelete: "cascade" }),

  itemRefId:      uuid("item_ref_id"), // optional canonical catalog item reference
  serviceRefId:   uuid("service_ref_id"), // optional legacy service reference during migration
  lineType:       text("line_type").notNull().default("service"),

  itemName:       text("item_name").notNull(),
  itemType:       text("item_type"),
  durationMinutes: integer("duration_minutes"),
  vatInclusive:   boolean("vat_inclusive").default(true).notNull(),

  quantity:       integer("quantity").notNull().default(1),
  unitPrice:      numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice:     numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  pricingBreakdown: jsonb("pricing_breakdown").default([]),
  snapshot:       jsonb("snapshot").default({}),
  notes:          text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("booking_lines_record_idx").on(t.bookingRecordId),
  index("booking_lines_item_ref_idx").on(t.itemRefId),
  index("booking_lines_service_ref_idx").on(t.serviceRefId),
]);

export const bookingLineAddons = pgTable("booking_line_addons", {
  id:             uuid("id").defaultRandom().primaryKey(),
  bookingLineId:  uuid("booking_line_id").notNull().references(() => bookingLines.id, { onDelete: "cascade" }),

  addonRefId:     uuid("addon_ref_id"),
  addonName:      text("addon_name").notNull(),
  quantity:       integer("quantity").notNull().default(1),
  unitPrice:      numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice:     numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  snapshot:       jsonb("snapshot").default({}),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("booking_line_addons_line_idx").on(t.bookingLineId),
  index("booking_line_addons_ref_idx").on(t.addonRefId),
]);

export const bookingTimelineEvents = pgTable("booking_timeline_events", {
  id:             uuid("id").defaultRandom().primaryKey(),
  orgId:          uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bookingRecordId: uuid("booking_record_id").notNull().references(() => bookingRecords.id, { onDelete: "cascade" }),
  userId:         uuid("user_id").references(() => users.id, { onDelete: "set null" }),

  eventType:      text("event_type").notNull(),
  fromStatus:     text("from_status"),
  toStatus:       text("to_status"),
  metadata:       jsonb("metadata").default({}).notNull(),
  notes:          text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("booking_timeline_events_record_idx").on(t.bookingRecordId),
  index("booking_timeline_events_org_idx").on(t.orgId),
  index("booking_timeline_events_type_idx").on(t.eventType),
  index("booking_timeline_events_created_idx").on(t.createdAt),
]);

export const bookingRecordAssignments = pgTable("booking_record_assignments", {
  id:             uuid("id").defaultRandom().primaryKey(),
  orgId:          uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bookingRecordId: uuid("booking_record_id").notNull().references(() => bookingRecords.id, { onDelete: "cascade" }),
  userId:         uuid("user_id").notNull().references(() => users.id),

  role:           text("role").notNull().default("staff"),
  assignedAt:     timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  notes:          text("notes"),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("booking_record_assignments_record_idx").on(t.bookingRecordId),
  index("booking_record_assignments_user_idx").on(t.userId),
  index("booking_record_assignments_org_idx").on(t.orgId),
]);

export const bookingRecordCommissions = pgTable("booking_record_commissions", {
  id:             uuid("id").defaultRandom().primaryKey(),
  orgId:          uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bookingRecordId: uuid("booking_record_id").notNull().references(() => bookingRecords.id, { onDelete: "cascade" }),
  bookingLineId:  uuid("booking_line_id").references(() => bookingLines.id, { onDelete: "set null" }),
  userId:         uuid("user_id").notNull().references(() => users.id),

  serviceRefId:   uuid("service_ref_id"),
  commissionMode: text("commission_mode").notNull().default("percentage"), // percentage|fixed
  rate:           numeric("rate", { precision: 10, scale: 2 }).notNull().default("0"),
  baseAmount:     numeric("base_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status:         text("status").notNull().default("pending"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("booking_record_commissions_record_idx").on(t.bookingRecordId),
  index("booking_record_commissions_line_idx").on(t.bookingLineId),
  index("booking_record_commissions_user_idx").on(t.userId),
  index("booking_record_commissions_org_idx").on(t.orgId),
]);

export const bookingRecordConsumptions = pgTable("booking_consumptions_canonical", {
  id:             uuid("id").defaultRandom().primaryKey(),
  orgId:          uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bookingRecordId: uuid("booking_record_id").notNull().references(() => bookingRecords.id, { onDelete: "cascade" }),
  bookingLineId:  uuid("booking_line_id").references(() => bookingLines.id, { onDelete: "set null" }),

  supplyId:       uuid("supply_id"),
  inventoryItemId: uuid("inventory_item_id"),
  quantity:       numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit:           text("unit"),
  consumedAt:     timestamp("consumed_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy:      uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  metadata:       jsonb("metadata").default({}),
  notes:          text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("booking_consumptions_canonical_record_idx").on(t.bookingRecordId),
  index("booking_consumptions_canonical_line_idx").on(t.bookingLineId),
  index("booking_consumptions_canonical_org_idx").on(t.orgId),
  index("booking_consumptions_canonical_supply_idx").on(t.supplyId),
]);

export const bookingPaymentLinks = pgTable("booking_payment_links", {
  id:             uuid("id").defaultRandom().primaryKey(),
  orgId:          uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bookingRecordId: uuid("booking_record_id").notNull().references(() => bookingRecords.id, { onDelete: "cascade" }),
  paymentId:      uuid("payment_id").notNull(), // FK to payments.id added in Phase 3 after payments moves to own schema
  linkType:       text("link_type").notNull().default("payment"), // payment|deposit|refund|adjustment
  amountApplied:  numeric("amount_applied", { precision: 12, scale: 2 }),
  metadata:       jsonb("metadata").default({}),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("booking_payment_links_record_idx").on(t.bookingRecordId),
  index("booking_payment_links_payment_idx").on(t.paymentId),
  index("booking_payment_links_org_idx").on(t.orgId),
]);
