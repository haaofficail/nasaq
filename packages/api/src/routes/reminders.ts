import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, desc, lte, gte, isNull, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { reminderCategories, reminderTemplates, orgReminders } from "@nasaq/db/schema";
import { getOrgId, getUserId, validateBody, stripBody } from "../lib/helpers";

export const remindersRouter = new Hono();

// ──────────────────────────────────────────────────────────────
// CATEGORIES
// ──────────────────────────────────────────────────────────────

remindersRouter.get("/categories", async (c) => {
  const rows = await db
    .select()
    .from(reminderCategories)
    .where(
      sql`(${reminderCategories.orgId} IS NULL OR ${reminderCategories.orgId} = ${getOrgId(c)}::uuid)
          AND ${reminderCategories.isActive} = true`
    )
    .orderBy(asc(reminderCategories.sortOrder));

  return c.json({ data: rows });
});

// ──────────────────────────────────────────────────────────────
// TEMPLATES
// ──────────────────────────────────────────────────────────────

remindersRouter.get("/templates", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db
    .select()
    .from(reminderTemplates)
    .where(
      sql`(${reminderTemplates.orgId} IS NULL OR ${reminderTemplates.orgId} = ${orgId}::uuid)
          AND ${reminderTemplates.isActive} = true
          AND ${reminderTemplates.deletedAt} IS NULL`
    )
    .orderBy(asc(reminderTemplates.sortOrder), asc(reminderTemplates.name));

  return c.json({ data: rows });
});

// ──────────────────────────────────────────────────────────────
// ORG REMINDERS — LIST
// ──────────────────────────────────────────────────────────────

remindersRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { status, priority, category } = c.req.query() as Record<string, string>;

  let conditions = sql`${orgReminders.orgId} = ${orgId}::uuid AND ${orgReminders.deletedAt} IS NULL`;
  if (status)   conditions = sql`${conditions} AND ${orgReminders.status} = ${status}`;
  if (priority) conditions = sql`${conditions} AND ${orgReminders.priority} = ${priority}`;
  if (category) conditions = sql`${conditions} AND ${orgReminders.categoryId} = ${category}::uuid`;

  const rows = await db
    .select()
    .from(orgReminders)
    .where(conditions)
    .orderBy(asc(orgReminders.dueDate));

  return c.json({ data: rows });
});

// ──────────────────────────────────────────────────────────────
// UPCOMING — due within next X days
// ──────────────────────────────────────────────────────────────

remindersRouter.get("/upcoming", async (c) => {
  const orgId = getOrgId(c);
  const days = parseInt(c.req.query("days") || "30");
  const today = new Date().toISOString().split("T")[0];
  const future = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];

  const rows = await db
    .select()
    .from(orgReminders)
    .where(
      sql`${orgReminders.orgId} = ${orgId}::uuid
          AND ${orgReminders.deletedAt} IS NULL
          AND ${orgReminders.status} IN ('upcoming','snoozed')
          AND ${orgReminders.dueDate} >= ${today}
          AND ${orgReminders.dueDate} <= ${future}`
    )
    .orderBy(asc(orgReminders.dueDate))
    .limit(20);

  return c.json({ data: rows });
});

// ──────────────────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  title:               z.string().min(1),
  dueDate:             z.string(),
  description:         z.string().optional().nullable(),
  categoryId:          z.string().uuid().optional().nullable(),
  templateId:          z.string().uuid().optional().nullable(),
  priority:            z.enum(["low","medium","high"]).default("medium"),
  remindBeforeDays:    z.array(z.number()).default([30, 7, 1]),
  isRecurring:         z.boolean().default(false),
  recurrence:          z.string().optional().nullable(),
  notificationChannels: z.array(z.string()).default(["dashboard"]),
  linkedType:          z.string().optional().nullable(),
  linkedId:            z.string().uuid().optional().nullable(),
  linkedLabel:         z.string().optional().nullable(),
  notes:               z.string().optional().nullable(),
  tags:                z.array(z.string()).default([]),
});

remindersRouter.post("/", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await validateBody(c, createSchema);
  if (!body) return;

  const [created] = await db
    .insert(orgReminders)
    .values({ ...body, orgId, createdBy: userId, createdByType: "user" })
    .returning();

  return c.json({ data: created }, 201);
});

// ──────────────────────────────────────────────────────────────
// CREATE FROM TEMPLATE
// ──────────────────────────────────────────────────────────────

remindersRouter.post("/from-template", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { templateId, dueDate } = await c.req.json() as { templateId: string; dueDate: string };

  const [tpl] = await db.select().from(reminderTemplates).where(eq(reminderTemplates.id, templateId));
  if (!tpl) return c.json({ error: "القالب غير موجود" }, 404);

  const [created] = await db
    .insert(orgReminders)
    .values({
      orgId,
      templateId,
      categoryId:           tpl.categoryId,
      title:                tpl.defaultTitle || tpl.name,
      description:          tpl.defaultDescription,
      icon:                 tpl.icon,
      color:                tpl.color,
      tags:                 tpl.tags,
      dueDate,
      remindBeforeDays:     tpl.defaultRemindBeforeDays,
      recurrence:           tpl.defaultRecurrence,
      notificationChannels: tpl.defaultChannels,
      createdBy:            userId,
      createdByType:        "user",
    })
    .returning();

  return c.json({ data: created }, 201);
});

// ──────────────────────────────────────────────────────────────
// UPDATE
// ──────────────────────────────────────────────────────────────

remindersRouter.patch("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  const body  = stripBody(await c.req.json());

  const [updated] = await db
    .update(orgReminders)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(orgReminders.id, id), eq(orgReminders.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "غير موجود" }, 404);
  return c.json({ data: updated });
});

// ──────────────────────────────────────────────────────────────
// COMPLETE
// ──────────────────────────────────────────────────────────────

remindersRouter.post("/:id/complete", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");

  const [updated] = await db
    .update(orgReminders)
    .set({ status: "completed", completedAt: new Date(), completedBy: userId, updatedAt: new Date() })
    .where(and(eq(orgReminders.id, id), eq(orgReminders.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

// ──────────────────────────────────────────────────────────────
// SNOOZE
// ──────────────────────────────────────────────────────────────

remindersRouter.post("/:id/snooze", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");
  const { until } = await c.req.json() as { until: string };

  const [updated] = await db
    .update(orgReminders)
    .set({ status: "snoozed", snoozedUntil: until, updatedAt: new Date() })
    .where(and(eq(orgReminders.id, id), eq(orgReminders.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

// ──────────────────────────────────────────────────────────────
// SOFT DELETE
// ──────────────────────────────────────────────────────────────

remindersRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id    = c.req.param("id");

  await db
    .update(orgReminders)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(orgReminders.id, id), eq(orgReminders.orgId, orgId)));

  return c.json({ success: true });
});
