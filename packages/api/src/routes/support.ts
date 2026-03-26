import { Hono } from "hono";
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { supportTickets } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { apiErr } from "../lib/errors";
import { z } from "zod";
import { createAlert } from "./alerts";

export const supportRouter = new Hono();

const createTicketSchema = z.object({
  subject:  z.string().min(3).max(200),
  body:     z.string().min(10),
  category: z.enum(["general", "billing", "technical", "onboarding"]).default("general"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

const replySchema = z.object({
  message: z.string().min(1).max(5000),
});

// ── List org's tickets ──────────────────────────────────────
supportRouter.get("/tickets", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const status   = c.req.query("status");
  const category = c.req.query("category");

  const conditions: any[] = [eq(supportTickets.orgId, orgId)];
  if (status)   conditions.push(eq(supportTickets.status,   status));
  if (category) conditions.push(eq(supportTickets.category, category));

  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(supportTickets).where(where).orderBy(desc(supportTickets.updatedAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(supportTickets).where(where),
  ]);

  // stats
  const [statsRows] = await Promise.all([
    db.select({ status: supportTickets.status, cnt: count() })
      .from(supportTickets)
      .where(eq(supportTickets.orgId, orgId))
      .groupBy(supportTickets.status),
  ]);
  const stats: Record<string, number> = {};
  for (const r of statsRows) stats[r.status] = Number(r.cnt);

  return c.json({
    data: rows,
    stats,
    pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
  });
});

// ── Get single ticket ───────────────────────────────────────
supportRouter.get("/tickets/:id", async (c) => {
  const orgId = getOrgId(c);
  const [ticket] = await db.select().from(supportTickets)
    .where(and(eq(supportTickets.id, c.req.param("id")), eq(supportTickets.orgId, orgId)));
  if (!ticket) return apiErr(c, "TICKET_NOT_FOUND", 404);
  return c.json({ data: ticket });
});

// ── Create ticket ───────────────────────────────────────────
supportRouter.post("/tickets", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = createTicketSchema.parse(await c.req.json());

  const [ticket] = await db.insert(supportTickets).values({
    orgId,
    openedBy: userId ?? undefined,
    subject:  body.subject,
    body:     body.body,
    category: body.category,
    priority: body.priority,
    status:   "open",
    messages: [],
  }).returning();

  // Alert the merchant: ticket received
  await createAlert({
    orgId,
    userId,
    type:  "support_opened",
    title: "تم استلام تذكرة الدعم",
    body:  `سنرد على "${body.subject}" في أقرب وقت`,
    link:  `/dashboard/support`,
  });

  return c.json({ data: ticket }, 201);
});

// ── Add reply (merchant) ────────────────────────────────────
supportRouter.post("/tickets/:id/reply", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = replySchema.parse(await c.req.json());

  const [ticket] = await db.select().from(supportTickets)
    .where(and(eq(supportTickets.id, c.req.param("id")), eq(supportTickets.orgId, orgId)));
  if (!ticket) return apiErr(c, "TICKET_NOT_FOUND", 404);
  if (ticket.status === "closed") return apiErr(c, "TICKET_CLOSED", 400);

  const newMsg = {
    id:        crypto.randomUUID(),
    sender:    "merchant" as const,
    senderId:  userId,
    message:   body.message,
    createdAt: new Date().toISOString(),
  };

  const messages = [...((ticket.messages as any[]) || []), newMsg];
  const [updated] = await db.update(supportTickets)
    .set({ messages, updatedAt: new Date(), status: ticket.status === "resolved" ? "open" : ticket.status })
    .where(eq(supportTickets.id, ticket.id))
    .returning();

  return c.json({ data: updated });
});

// ── Close ticket ────────────────────────────────────────────
supportRouter.patch("/tickets/:id/close", async (c) => {
  const orgId = getOrgId(c);

  const [ticket] = await db.select().from(supportTickets)
    .where(and(eq(supportTickets.id, c.req.param("id")), eq(supportTickets.orgId, orgId)));
  if (!ticket) return apiErr(c, "TICKET_NOT_FOUND", 404);

  const [updated] = await db.update(supportTickets)
    .set({ status: "closed", updatedAt: new Date() })
    .where(eq(supportTickets.id, ticket.id))
    .returning();

  return c.json({ data: updated });
});
