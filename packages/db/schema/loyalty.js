import { pgTable, uuid, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { customers } from "./customers";
// ============================================================
// LOYALTY STAMPS — بطاقات الطوابع للمطاعم والمقاهي
// ============================================================
export const loyaltyStamps = pgTable("loyalty_stamps", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    stampsCount: integer("stamps_count").notNull().default(0),
    stampsGoal: integer("stamps_goal").notNull().default(10),
    freeItemsRedeemed: integer("free_items_redeemed").notNull().default(0),
    lastStampAt: timestamp("last_stamp_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex("loyalty_stamps_org_customer_idx").on(table.orgId, table.customerId),
]);
//# sourceMappingURL=loyalty.js.map