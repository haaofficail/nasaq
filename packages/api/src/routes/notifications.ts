import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, gte } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { notificationLog, scheduledNotifications } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination, validateBody } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { sendPushToOrg, getVapidPublicKey } from "../lib/push";

export const notificationsRouter = new Hono();

// GET /notifications/vapid-public-key — للمتصفح لتسجيل Push subscription
notificationsRouter.get("/vapid-public-key", (c) => {
  const key = getVapidPublicKey();
  if (!key) return c.json({ error: "Push notifications not configured" }, 503);
  return c.json({ data: { publicKey: key } });
});

// POST /notifications/subscribe — تسجيل push subscription من المتصفح
notificationsRouter.post("/subscribe", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { endpoint, p256dh, auth } = await c.req.json();
  if (!endpoint || !p256dh || !auth) return c.json({ error: "بيانات الاشتراك ناقصة" }, 400);

  const { pool } = await import("@nasaq/db/client");
  await pool.query(
    `INSERT INTO push_subscriptions (org_id, user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = $4, auth = $5, updated_at = NOW()`,
    [orgId, userId ?? null, endpoint, p256dh, auth],
  );
  return c.json({ success: true });
});

// ============================================================
// NOTIFICATION LOG — سجل الإشعارات المُرسَلة
// ============================================================

// GET /notifications/log
notificationsRouter.get("/log", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);

  const rows = await db
    .select()
    .from(notificationLog)
    .where(eq(notificationLog.orgId, orgId))
    .orderBy(desc(notificationLog.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows });
});

// ============================================================
// SCHEDULED NOTIFICATIONS — الإشعارات المجدولة
// ============================================================

const createScheduledSchema = z.object({
  title:       z.string().min(1).max(200),
  body:        z.string().min(1).max(1000),
  scheduledAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
});

const updateScheduledSchema = createScheduledSchema.partial().extend({
  status: z.enum(["pending", "sent", "cancelled"]).optional(),
});

// GET /notifications/scheduled
notificationsRouter.get("/scheduled", async (c) => {
  const orgId = getOrgId(c);

  const rows = await db
    .select()
    .from(scheduledNotifications)
    .where(
      and(
        eq(scheduledNotifications.orgId, orgId),
        // Only show upcoming + recently-sent (last 30 days)
        gte(scheduledNotifications.scheduledAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      ),
    )
    .orderBy(desc(scheduledNotifications.scheduledAt));

  return c.json({ data: rows });
});

// POST /notifications/scheduled
notificationsRouter.post("/scheduled", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = await validateBody(c, createScheduledSchema);
  if (!body) return;

  const [created] = await db
    .insert(scheduledNotifications)
    .values({
      orgId,
      title:       body.title,
      body:        body.body,
      scheduledAt: new Date(body.scheduledAt),
      status:      "pending",
      createdBy:   userId ?? null,
    })
    .returning();

  insertAuditLog({
    orgId,
    userId,
    action:     "created",
    resource:   "notification",
    resourceId: created.id,
    newValue:   { title: body.title, scheduledAt: body.scheduledAt },
  });

  return c.json({ data: created }, 201);
});

// PATCH /notifications/scheduled/:id
notificationsRouter.patch("/scheduled/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");
  const body   = await validateBody(c, updateScheduledSchema);
  if (!body) return;

  const [existing] = await db
    .select()
    .from(scheduledNotifications)
    .where(and(eq(scheduledNotifications.id, id), eq(scheduledNotifications.orgId, orgId)));

  if (!existing) return c.json({ error: "الإشعار غير موجود" }, 404);
  if (existing.status === "sent") return c.json({ error: "لا يمكن تعديل إشعار مُرسَل" }, 409);

  const [updated] = await db
    .update(scheduledNotifications)
    .set({
      ...(body.title       !== undefined && { title:       body.title }),
      ...(body.body        !== undefined && { body:        body.body }),
      ...(body.scheduledAt !== undefined && { scheduledAt: new Date(body.scheduledAt) }),
      ...(body.status      !== undefined && { status:      body.status }),
    })
    .where(and(eq(scheduledNotifications.id, id), eq(scheduledNotifications.orgId, orgId)))
    .returning();

  insertAuditLog({
    orgId,
    userId,
    action:     "updated",
    resource:   "notification",
    resourceId: id,
    oldValue:   { title: existing.title, status: existing.status },
    newValue:   body,
  });

  return c.json({ data: updated });
});

// DELETE /notifications/scheduled/:id
notificationsRouter.delete("/scheduled/:id", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const id     = c.req.param("id");

  const [existing] = await db
    .select({ id: scheduledNotifications.id, status: scheduledNotifications.status })
    .from(scheduledNotifications)
    .where(and(eq(scheduledNotifications.id, id), eq(scheduledNotifications.orgId, orgId)));

  if (!existing) return c.json({ error: "الإشعار غير موجود" }, 404);
  if (existing.status === "sent") return c.json({ error: "لا يمكن حذف إشعار مُرسَل" }, 409);

  // Soft-cancel instead of hard delete
  await db
    .update(scheduledNotifications)
    .set({ status: "cancelled" })
    .where(and(eq(scheduledNotifications.id, id), eq(scheduledNotifications.orgId, orgId)));

  insertAuditLog({
    orgId,
    userId,
    action:     "deleted",
    resource:   "notification",
    resourceId: id,
  });

  return c.json({ success: true });
});

// POST /notifications/broadcast
// يرسل إشعاراً فورياً ويسجّله في notification_log
notificationsRouter.post("/broadcast", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const { title, body } = await c.req.json();

  if (!title || !body) return c.json({ error: "العنوان والمحتوى مطلوبان" }, 400);

  // إرسال Push فعلي لجميع مشتركي المنشأة
  const recipientCount = await sendPushToOrg(orgId, { title, body });

  const [log] = await db
    .insert(notificationLog)
    .values({
      orgId,
      title,
      body,
      type:           "broadcast",
      recipientCount,
      createdBy:      userId ?? null,
    })
    .returning();

  insertAuditLog({
    orgId,
    userId,
    action:     "created",
    resource:   "notification",
    resourceId: log.id,
    metadata:   { type: "broadcast", title },
  });

  return c.json({ data: log }, 201);
});
