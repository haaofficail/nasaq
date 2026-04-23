import { pgTable, text, timestamp, uuid, numeric, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { services } from "./catalog";
import { bookings } from "./bookings";
import { locations } from "./organizations";
import { users } from "./auth";
import { assets } from "./inventory";
// ============================================================
// MAINTENANCE TASKS — الصيانة والنظافة
// Unified task system: chalets, apartments, rooms, camps, equipment, hotels
// ============================================================
export const maintenanceTasks = pgTable("maintenance_tasks", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    // Optional links — a task can be standalone or linked to a booking / service / location / asset
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    // Task details
    title: text("title").notNull(),
    description: text("description"),
    type: text("type").notNull().default("cleaning"), // cleaning | maintenance | inspection | damage_repair
    priority: text("priority").notNull().default("normal"), // low | normal | high | urgent
    status: text("status").notNull().default("pending"), // pending | in_progress | completed | issue_reported
    // Assignment
    assignedToId: uuid("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    // Schedule
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Outcome
    notes: text("notes"),
    photos: jsonb("photos").notNull().default([]),
    costAmount: numeric("cost_amount", { precision: 10, scale: 2 }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    index("maintenance_tasks_org_idx").on(t.orgId),
    index("maintenance_tasks_service_idx").on(t.serviceId),
    index("maintenance_tasks_booking_idx").on(t.bookingId),
    index("maintenance_tasks_status_idx").on(t.orgId, t.status),
    index("maintenance_tasks_scheduled_idx").on(t.orgId, t.scheduledAt),
]);
//# sourceMappingURL=maintenance.js.map