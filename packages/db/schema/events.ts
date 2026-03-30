import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, uniqueIndex, index, date } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
import { users } from "./auth";
import { bookings } from "./bookings";
import { customers } from "./customers";

// ============================================================
// ENUMS
// ============================================================

export const eventStatusEnum = pgEnum("event_status", [
  "draft",       // مسودة
  "published",   // منشور — متاح للبيع
  "sold_out",    // نفذت التذاكر
  "ongoing",     // الفعالية جارية
  "completed",   // انتهت
  "cancelled",   // ملغاة
]);

export const ticketTypeStatusEnum = pgEnum("ticket_type_status", [
  "active",
  "paused",
  "sold_out",
]);

export const ticketIssuanceStatusEnum = pgEnum("ticket_issuance_status", [
  "issued",      // صادرة
  "checked_in",  // تم الدخول
  "cancelled",   // ملغاة
  "transferred", // محوّلة لشخص آخر
]);

export const seatStatusEnum = pgEnum("seat_status", [
  "available",
  "reserved",    // محجوزة مؤقتاً (hold أثناء الدفع)
  "sold",
  "blocked",     // محجوبة من المنظم
]);

// ============================================================
// EVENTS — الفعاليات
// ============================================================

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),

  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  coverImage: text("cover_image"),

  // Timing
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  doorsOpenAt: timestamp("doors_open_at", { withTimezone: true }),

  // Venue
  venueName: text("venue_name"),
  venueAddress: text("venue_address"),
  venueCity: text("venue_city"),
  venueMapUrl: text("venue_map_url"),

  // Capacity
  totalCapacity: integer("total_capacity"),           // 0 = unlimited
  soldTickets: integer("sold_tickets").default(0).notNull(),
  reservedTickets: integer("reserved_tickets").default(0).notNull(),

  // Pricing summary
  minPrice: numeric("min_price", { precision: 10, scale: 2 }),
  maxPrice: numeric("max_price", { precision: 10, scale: 2 }),

  // Settings
  hasSeating: boolean("has_seating").default(false),  // true = seat map required
  allowTransfer: boolean("allow_transfer").default(false),
  requiresApproval: boolean("requires_approval").default(false),

  // Metadata
  tags: jsonb("tags").default([]),                    // ["موسيقى", "عائلي"]
  ageRestriction: integer("age_restriction"),         // null = للجميع

  status: eventStatusEnum("status").default("draft").notNull(),

  createdBy: uuid("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("events_org_id_idx").on(table.orgId),
  index("events_org_status_idx").on(table.orgId, table.status),
  index("events_org_starts_at_idx").on(table.orgId, table.startsAt),
]);

// ============================================================
// TICKET TYPES — أنواع التذاكر لكل فعالية
// مثال: VIP (500 ر.س)، عادي (200 ر.س)، طفل (100 ر.س)
// ============================================================

export const ticketTypes = pgTable("ticket_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventId: uuid("event_id_new").notNull().references(() => events.id, { onDelete: "cascade" }),

  name: text("name").notNull(),                       // "VIP"، "عادي"، "طفل"
  nameEn: text("name_en"),
  description: text("description"),

  price: numeric("price", { precision: 10, scale: 2 }).notNull(),

  // Capacity
  totalQuantity: integer("total_quantity").notNull(), // الكمية الكاملة لهذا النوع
  soldQuantity: integer("sold_quantity").default(0).notNull(),
  reservedQuantity: integer("reserved_quantity").default(0).notNull(),

  // Per-purchase limits
  maxPerOrder: integer("max_per_order").default(10),
  minPerOrder: integer("min_per_order").default(1),

  // Sale window
  saleStartsAt: timestamp("sale_starts_at", { withTimezone: true }),
  saleEndsAt: timestamp("sale_ends_at", { withTimezone: true }),

  // Seating
  seatSectionId: uuid("seat_section_id"),             // FK to seatSections (nullable if no seating)

  sortOrder: integer("sort_order").default(0),
  status: ticketTypeStatusEnum("status").default("active").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("ticket_types_event_idx").on(table.eventId),
]);

// ============================================================
// SEAT SECTIONS — أقسام القاعة (للفعاليات ذات المقاعد)
// مثال: الصف الأول، الطابق الأول، المنطقة الذهبية
// ============================================================

export const seatSections = pgTable("seat_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),

  name: text("name").notNull(),                       // "الصف الأول"
  nameEn: text("name_en"),
  color: text("color"),                               // لون القسم في الخريطة
  rowCount: integer("row_count"),
  seatsPerRow: integer("seats_per_row"),
  totalSeats: integer("total_seats"),
  sortOrder: integer("sort_order").default(0),

  // Seat map position (for visual editor)
  positionX: numeric("position_x", { precision: 8, scale: 2 }),
  positionY: numeric("position_y", { precision: 8, scale: 2 }),
  width: numeric("width", { precision: 8, scale: 2 }),
  height: numeric("height", { precision: 8, scale: 2 }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("seat_sections_event_idx").on(table.eventId),
]);

// ============================================================
// SEATS — المقاعد الفردية (للأحداث ذات الحجز بالمقعد)
// ============================================================

export const seats = pgTable("seats", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  sectionId: uuid("section_id").notNull().references(() => seatSections.id, { onDelete: "cascade" }),

  row: text("row").notNull(),                         // "A"، "B"، "1"
  number: integer("number").notNull(),                // 1, 2, 3 ...
  label: text("label"),                               // "A1"، "B12"

  status: seatStatusEnum("status").default("available").notNull(),

  // Hold expiry (للمقاعد المحجوزة مؤقتاً أثناء الدفع)
  heldUntil: timestamp("held_until", { withTimezone: true }),
  heldByCustomerId: uuid("held_by_customer_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("seats_event_section_row_num_uidx").on(table.eventId, table.sectionId, table.row, table.number),
  index("seats_event_status_idx").on(table.eventId, table.status),
]);

// ============================================================
// TICKET ISSUANCES — التذاكر الصادرة
// كل سجل = تذكرة واحدة بيد عميل محدد
// ============================================================

export const ticketIssuances = pgTable("ticket_issuances", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  ticketTypeId: uuid("ticket_type_id").notNull().references(() => ticketTypes.id),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),

  // Seating (nullable if no assigned seating)
  seatId: uuid("seat_id").references(() => seats.id, { onDelete: "set null" }),

  // Ticket identity
  ticketNumber: text("ticket_number").notNull(),      // TKT-2026-00001
  qrCode: text("qr_code").notNull(),                  // unique hash for scanning
  barcode: text("barcode"),

  // Attendee info (may differ from customer)
  attendeeName: text("attendee_name"),
  attendeePhone: text("attendee_phone"),
  attendeeEmail: text("attendee_email"),

  // Pricing
  paidPrice: numeric("paid_price", { precision: 10, scale: 2 }).notNull(),
  vatAmount: numeric("vat_amount", { precision: 10, scale: 2 }).default("0"),

  // Check-in
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  checkedInBy: uuid("checked_in_by").references(() => users.id, { onDelete: "set null" }),

  // Transfer
  transferredFromId: uuid("transferred_from_id"), // ID of original issuance
  transferredAt: timestamp("transferred_at", { withTimezone: true }),

  status: ticketIssuanceStatusEnum("status").default("issued").notNull(),

  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("ticket_issuances_qr_uidx").on(table.qrCode),
  uniqueIndex("ticket_issuances_number_uidx").on(table.orgId, table.ticketNumber),
  index("ticket_issuances_event_idx").on(table.eventId),
  index("ticket_issuances_booking_idx").on(table.bookingId),
  index("ticket_issuances_customer_idx").on(table.customerId),
  index("ticket_issuances_status_idx").on(table.eventId, table.status),
]);

// ============================================================
// EVENT QUOTATIONS — عروض أسعار الفعاليات
// سيناريو: حفلات / مؤتمرات / أعراس → يُرسل للعميل للموافقة
// ============================================================

export const eventQuotationStatusEnum = pgEnum("event_quotation_status", [
  "draft",     // مسودة
  "sent",      // أُرسل للعميل
  "accepted",  // وافق العميل
  "rejected",  // رفض العميل
  "expired",   // انتهت مدة الصلاحية
]);

export const eventQuotations = pgTable("event_quotations", {
  id:          uuid("id").defaultRandom().primaryKey(),
  orgId:       uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventId:     uuid("event_id").references(() => events.id, { onDelete: "set null" }),

  // رقم العرض التسلسلي
  quotationNumber: text("quotation_number").notNull(),

  // معلومات العميل
  clientName:  text("client_name").notNull(),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),

  // تفاصيل الفعالية
  title:       text("title").notNull(),
  eventDate:   date("event_date"),
  eventVenue:  text("event_venue"),
  guestCount:  integer("guest_count"),
  notes:       text("notes"),

  // الأسعار
  subtotal:        numeric("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  discountAmount:  numeric("discount_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  vatRate:         numeric("vat_rate", { precision: 5, scale: 2 }).default("15").notNull(),
  vatAmount:       numeric("vat_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  total:           numeric("total", { precision: 12, scale: 2 }).default("0").notNull(),
  depositRequired: numeric("deposit_required", { precision: 12, scale: 2 }).default("0").notNull(),

  // الشروط
  validUntil:    date("valid_until"),
  paymentTerms:  text("payment_terms"),

  // الحالة
  status:      eventQuotationStatusEnum("status").default("draft").notNull(),
  acceptedAt:  timestamp("accepted_at", { withTimezone: true }),
  sentAt:      timestamp("sent_at", { withTimezone: true }),

  createdBy:   uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("event_quotations_org_idx").on(table.orgId),
  index("event_quotations_status_idx").on(table.orgId, table.status),
]);

// ============================================================
// EVENT QUOTATION ITEMS — بنود عرض الأسعار
// ============================================================

export const eventQuotationItems = pgTable("event_quotation_items", {
  id:           uuid("id").defaultRandom().primaryKey(),
  orgId:        uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  quotationId:  uuid("quotation_id").notNull().references(() => eventQuotations.id, { onDelete: "cascade" }),

  description:  text("description").notNull(),
  category:     text("category"),  // venue / catering / entertainment / decoration / crew / other
  qty:          numeric("qty", { precision: 10, scale: 2 }).default("1").notNull(),
  unitPrice:    numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice:   numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  notes:        text("notes"),
  sortOrder:    integer("sort_order").default(0).notNull(),

  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("event_quotation_items_quotation_idx").on(table.quotationId),
]);

// ============================================================
// EVENT EXECUTION TASKS — مهام تتبع التنفيذ
// للمتابعة الداخلية: ماذا تم وماذا تبقى قبل وأثناء وبعد الفعالية
// ============================================================

export const eventExecutionTaskStatusEnum = pgEnum("event_execution_task_status", [
  "pending",     // قيد الانتظار
  "in_progress", // جاري
  "done",        // مكتمل
  "blocked",     // معلق / عائق
]);

export const eventExecutionTasks = pgTable("event_execution_tasks", {
  id:           uuid("id").defaultRandom().primaryKey(),
  orgId:        uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventId:      uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
  quotationId:  uuid("quotation_id").references(() => eventQuotations.id, { onDelete: "set null" }),

  title:        text("title").notNull(),
  description:  text("description"),
  category:     text("category"),    // setup / catering / av / decor / security / cleanup / admin
  assignedTo:   text("assigned_to"), // اسم الموظف أو الفريق
  dueDate:      timestamp("due_date", { withTimezone: true }),
  eventPhase:   text("event_phase").default("pre_event").notNull(), // pre_event / day_of / post_event

  status:       eventExecutionTaskStatusEnum("status").default("pending").notNull(),
  completedAt:  timestamp("completed_at", { withTimezone: true }),
  notes:        text("notes"),
  sortOrder:    integer("sort_order").default(0).notNull(),

  createdBy:    uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("event_execution_tasks_org_idx").on(table.orgId),
  index("event_execution_tasks_event_idx").on(table.eventId),
  index("event_execution_tasks_status_idx").on(table.orgId, table.status),
]);
