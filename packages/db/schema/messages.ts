/**
 * messages — inbox رسائل التواصل (contact form submissions)
 *
 * DB table: "messages_inbox" (renamed from "contact_submissions" in Migration 149)
 */
import { pgTable, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const messagesInbox = pgTable("messages_inbox", {
  id:      uuid("id").defaultRandom().primaryKey(),
  orgId:   uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name:    text("name").notNull(),
  phone:   text("phone"),
  email:   text("email"),
  message: text("message").notNull(),

  source:   text("source").default("website"),   // website | storefront_v2 | landing_page
  pageSlug: text("page_slug"),

  isRead:    boolean("is_read").default(false),
  repliedAt: timestamp("replied_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MessageInbox    = typeof messagesInbox.$inferSelect;
export type NewMessageInbox = typeof messagesInbox.$inferInsert;
