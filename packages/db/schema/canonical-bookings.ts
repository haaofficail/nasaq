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
import { bookings } from "./bookings";

// ============================================================
// APPOINTMENT BOOKINGS
// Engine: Appointment
// Salon, photography, maintenance, any time-slot service
// ============================================================

export const appointmentBookings = pgTable("appointment_bookings", {
  id:            uuid("id").defaultRandom().primaryKey(),
  orgId:         uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId:    uuid("customer_id").notNull().references(() => customers.id),
  bookingRef:    uuid("booking_ref").references(() => bookings.id), // legacy link

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
  bookingRef:    uuid("booking_ref").references(() => bookings.id),

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
  bookingRef:    uuid("booking_ref").references(() => bookings.id),

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
  bookingRef:    uuid("booking_ref").references(() => bookings.id),

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
]);
