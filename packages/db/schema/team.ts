import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric } from "drizzle-orm/pg-core";
import { organizations, locations } from "./organizations";
import { users } from "./auth";
import { bookings } from "./bookings";

// ============================================================
// ENUMS
// ============================================================

export const shiftStatusEnum = pgEnum("shift_status", [
  "scheduled",   // مجدول
  "in_progress", // جاري
  "completed",   // مكتمل
  "cancelled",   // ملغي
  "no_show",     // لم يحضر
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",     // معلقة
  "assigned",    // مُسندة
  "in_progress", // جارية
  "completed",   // مكتملة
  "skipped",     // تم تخطيها
]);

export const taskTypeEnum = pgEnum("task_type", [
  "transport",   // نقل المعدات
  "setup",       // التجهيز/التركيب
  "reception",   // الاستقبال
  "operation",   // التشغيل
  "teardown",    // التفكيك
  "return",      // الإرجاع
  "inspection",  // الفحص
  "custom",      // مخصص
]);

// ============================================================
// SHIFTS — الورديات
// ============================================================

export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),

  // Schedule
  date: timestamp("date", { withTimezone: true }).notNull(),
  startTime: text("start_time").notNull(),         // "08:00"
  endTime: text("end_time").notNull(),             // "22:00"
  
  // Location
  locationId: uuid("location_id").references(() => locations.id),
  
  // Linked booking (optional)
  bookingId: uuid("booking_id").references(() => bookings.id),
  
  // Status
  status: shiftStatusEnum("status").default("scheduled").notNull(),
  
  // Actual times (filled by employee)
  actualStartTime: text("actual_start_time"),
  actualEndTime: text("actual_end_time"),
  
  // Break
  breakMinutes: integer("break_minutes").default(0),
  
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// BOOKING TASKS — مهام كل حجز
// ============================================================

export const bookingTasks = pgTable("booking_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),

  // Task info
  type: taskTypeEnum("type").notNull(),
  title: text("title").notNull(),                  // "نقل خيمة 12x12 إلى القيروان"
  description: text("description"),
  
  // Assignment
  assignedTo: uuid("assigned_to").references(() => users.id),
  
  // Schedule
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
  actualStart: timestamp("actual_start", { withTimezone: true }),
  actualEnd: timestamp("actual_end", { withTimezone: true }),
  
  // Status
  status: taskStatusEnum("status").default("pending").notNull(),
  
  // Priority
  sortOrder: integer("sort_order").default(0),
  
  // Checklist
  checklist: jsonb("checklist").default([]),        // [{ item: "تحميل الخيمة", done: false }]
  
  // Media (before/after photos)
  images: jsonb("images").default([]),
  
  notes: text("notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// PERFORMANCE REVIEWS — تقييم الأداء
// ============================================================

export const performanceReviews = pgTable("performance_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),

  // Period
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

  // Metrics (auto-calculated)
  bookingsCompleted: integer("bookings_completed").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  avgCustomerRating: numeric("avg_customer_rating", { precision: 3, scale: 2 }),
  onTimePercentage: numeric("on_time_percentage", { precision: 5, scale: 2 }), // % التزام بالمواعيد
  issuesCount: integer("issues_count").default(0),
  totalHoursWorked: numeric("total_hours_worked", { precision: 8, scale: 2 }),

  // Manual review
  reviewerNote: text("reviewer_note"),
  overallRating: integer("overall_rating"),         // 1-5
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// VENDOR PROFILES — ملفات مقدمي الخدمة الخارجيين
// ============================================================

export const vendorProfiles = pgTable("vendor_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),

  companyName: text("company_name"),
  commercialRegister: text("commercial_register"),
  vatNumber: text("vat_number"),
  
  // Services offered
  servicesOffered: jsonb("services_offered").default([]),
  
  // Contract
  contractStartDate: timestamp("contract_start_date", { withTimezone: true }),
  contractEndDate: timestamp("contract_end_date", { withTimezone: true }),
  contractDocument: text("contract_document"),      // URL
  
  // Bank details (for payouts)
  bankName: text("bank_name"),
  iban: text("iban"),
  accountHolder: text("account_holder"),
  
  // Rating
  avgRating: numeric("avg_rating", { precision: 3, scale: 2 }),
  totalBookings: integer("total_bookings").default(0),
  
  // Status
  verificationStatus: text("verification_status").default("pending"), // pending, verified, rejected
  isActive: boolean("is_active").default(true).notNull(), // soft delete

  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// TIME OFF — الإجازات
// ============================================================

export const timeOff = pgTable("time_off", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),

  type: text("type").notNull(),                    // annual, sick, personal, unpaid
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  
  reason: text("reason"),
  status: text("status").default("pending"),        // pending, approved, rejected
  approvedBy: uuid("approved_by").references(() => users.id),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
