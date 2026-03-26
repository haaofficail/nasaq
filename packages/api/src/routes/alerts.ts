import { Hono } from "hono";
import { eq, and, desc, count, or, isNull } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { orgAlerts } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { apiErr } from "../lib/errors";

export const alertsRouter = new Hono();

// Helper to create an alert (called internally by other routes)
export async function createAlert(payload: {
  orgId: string;
  userId?: string | null;
  type: string;
  title: string;
  body?: string;
  link?: string;
  priority?: string;
}) {
  await db.insert(orgAlerts).values({
    orgId:    payload.orgId,
    userId:   payload.userId ?? null,
    type:     payload.type,
    title:    payload.title,
    body:     payload.body ?? null,
    link:     payload.link ?? null,
    priority: payload.priority ?? "normal",
  }).catch(() => {});
}

// ── GET /alerts — list recent alerts for the user ──────────
alertsRouter.get("/", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const limit  = Math.min(parseInt(c.req.query("limit") || "20"), 50);

  // Fetch alerts for this org + user (or org-wide alerts with null userId)
  const rows = await db
    .select()
    .from(orgAlerts)
    .where(
      and(
        eq(orgAlerts.orgId, orgId),
        or(isNull(orgAlerts.userId), userId ? eq(orgAlerts.userId, userId) : isNull(orgAlerts.userId))
      )
    )
    .orderBy(desc(orgAlerts.createdAt))
    .limit(limit);

  const [{ unread }] = await db
    .select({ unread: count() })
    .from(orgAlerts)
    .where(
      and(
        eq(orgAlerts.orgId, orgId),
        eq(orgAlerts.isRead, false),
        or(isNull(orgAlerts.userId), userId ? eq(orgAlerts.userId, userId) : isNull(orgAlerts.userId))
      )
    );

  return c.json({ data: rows, unread: Number(unread) });
});

// ── PATCH /alerts/:id/read — mark single alert as read ─────
alertsRouter.patch("/:id/read", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db
    .update(orgAlerts)
    .set({ isRead: true })
    .where(and(eq(orgAlerts.id, c.req.param("id")), eq(orgAlerts.orgId, orgId)))
    .returning();
  if (!updated) return apiErr(c, "NOT_FOUND", 404);
  return c.json({ data: updated });
});

// ── POST /alerts/read-all — mark all as read ───────────────
alertsRouter.post("/read-all", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  await db
    .update(orgAlerts)
    .set({ isRead: true })
    .where(
      and(
        eq(orgAlerts.orgId, orgId),
        eq(orgAlerts.isRead, false),
        or(isNull(orgAlerts.userId), userId ? eq(orgAlerts.userId, userId) : isNull(orgAlerts.userId))
      )
    );
  return c.json({ ok: true });
});
