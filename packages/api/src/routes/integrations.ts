import { Hono } from "hono";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import { integrationConfigs, webhookLogs, syncJobs } from "@nasaq/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { encryptJson, decryptJson } from "../lib/encryption";

export const integrationsRouter = new Hono();

const configSchema = z.object({
  locationId: z.string().uuid().optional().nullable(),
  providerId: z.string().min(1),
  integrationName: z.string().optional().nullable(),
  integrationType: z.enum([
    "booking_channel", "food_delivery", "last_mile", "messaging",
    "payments", "calendar", "automation", "ota", "analytics", "custom_webhook",
  ]),
  credentials: z.record(z.any()).optional(),
  entityMappings: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

// Strip credentials before returning to client — never expose raw creds
function sanitize(row: any) {
  const { credentials: _c, ...rest } = row;
  return rest;
}

// Encrypt credentials field before writing to DB
function withEncryptedCreds(body: any): any {
  if (!body.credentials) return body;
  return { ...body, credentials: encryptJson(body.credentials) };
}

// ============================================================
// INTEGRATION CONFIGS
// ============================================================

integrationsRouter.get("/configs", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db
    .select()
    .from(integrationConfigs)
    .where(and(eq(integrationConfigs.orgId, orgId), eq(integrationConfigs.isActive, true)))
    .orderBy(integrationConfigs.createdAt);
  return c.json({ data: rows.map(sanitize) });
});

integrationsRouter.get("/configs/:id", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db
    .select()
    .from(integrationConfigs)
    .where(and(eq(integrationConfigs.id, c.req.param("id")), eq(integrationConfigs.orgId, orgId)));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: sanitize(row) });
});

integrationsRouter.post("/configs", async (c) => {
  const orgId = getOrgId(c);
  const body = withEncryptedCreds(configSchema.parse(await c.req.json()));
  const [row] = await db
    .insert(integrationConfigs)
    .values({ ...body, orgId, status: "pending_setup" })
    .returning();
  return c.json({ data: sanitize(row) }, 201);
});

integrationsRouter.put("/configs/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = withEncryptedCreds(configSchema.partial().parse(await c.req.json()));
  const [row] = await db
    .update(integrationConfigs)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(integrationConfigs.id, c.req.param("id")), eq(integrationConfigs.orgId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: sanitize(row) });
});

integrationsRouter.patch("/configs/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const { status } = z
    .object({ status: z.enum(["active", "inactive", "error", "pending_setup", "expired"]) })
    .parse(await c.req.json());
  const [row] = await db
    .update(integrationConfigs)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(integrationConfigs.id, c.req.param("id")), eq(integrationConfigs.orgId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: sanitize(row) });
});

// GET /configs/:id/credentials — decrypt and return to owner only (settings:edit required)
integrationsRouter.get("/configs/:id/credentials", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db
    .select({ credentials: integrationConfigs.credentials })
    .from(integrationConfigs)
    .where(and(eq(integrationConfigs.id, c.req.param("id")), eq(integrationConfigs.orgId, orgId)));
  if (!row) return c.json({ error: "Not found" }, 404);
  const creds = decryptJson(row.credentials as string | null);
  return c.json({ data: creds ?? {} });
});

integrationsRouter.delete("/configs/:id", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db
    .update(integrationConfigs)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(integrationConfigs.id, c.req.param("id")), eq(integrationConfigs.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "integration_config", resourceId: updated.id });
  return c.json({ success: true });
});

// ============================================================
// WEBHOOK LOGS
// ============================================================

integrationsRouter.get("/webhook-logs", async (c) => {
  const orgId = getOrgId(c);
  const providerId = c.req.query("providerId");
  const direction = c.req.query("direction");
  const processedQ = c.req.query("processed");
  const page = parseInt(c.req.query("page") ?? "1");
  const limit = parseInt(c.req.query("limit") ?? "50");
  const offset = (page - 1) * limit;

  const conditions: any[] = [eq(webhookLogs.orgId, orgId)];
  if (providerId) conditions.push(eq(webhookLogs.providerId, providerId));
  if (direction) conditions.push(eq(webhookLogs.direction, direction));
  if (processedQ !== undefined) conditions.push(eq(webhookLogs.processed, processedQ === "true"));

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(webhookLogs)
      .where(and(...conditions))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(webhookLogs).where(and(...conditions)),
  ]);
  return c.json({ data: rows, total, page, limit });
});

// Inbound webhook ingestion — public (no auth)
integrationsRouter.post("/webhook/inbound/:providerId", async (c) => {
  const providerId = c.req.param("providerId");
  const body = await c.req.json().catch(() => ({}));
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((v, k) => { headers[k] = v; });

  const [config] = await db
    .select({ orgId: integrationConfigs.orgId, id: integrationConfigs.id })
    .from(integrationConfigs)
    .where(and(eq(integrationConfigs.providerId, providerId), eq(integrationConfigs.status, "active")))
    .limit(1);

  if (!config) return c.json({ error: "No active integration found" }, 404);

  await db.insert(webhookLogs).values({
    orgId: config.orgId,
    integrationConfigId: config.id,
    direction: "inbound",
    providerId,
    eventType: (body as any)?.event_type ?? (body as any)?.type ?? "unknown",
    headers,
    payload: body,
    processed: false,
  });

  return c.json({ received: true });
});

// ============================================================
// SYNC JOBS
// ============================================================

integrationsRouter.get("/sync-jobs", async (c) => {
  const orgId = getOrgId(c);
  const integrationConfigId = c.req.query("integrationConfigId");
  const status = c.req.query("status");
  const page = parseInt(c.req.query("page") ?? "1");
  const limit = parseInt(c.req.query("limit") ?? "20");
  const offset = (page - 1) * limit;

  const conditions: any[] = [eq(syncJobs.orgId, orgId)];
  if (integrationConfigId) conditions.push(eq(syncJobs.integrationConfigId, integrationConfigId));
  if (status) conditions.push(eq(syncJobs.status, status as any));

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(syncJobs)
      .where(and(...conditions))
      .orderBy(desc(syncJobs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(syncJobs).where(and(...conditions)),
  ]);
  return c.json({ data: rows, total, page, limit });
});

integrationsRouter.post("/sync-jobs", async (c) => {
  const orgId = getOrgId(c);
  const body = z
    .object({
      integrationConfigId: z.string().uuid().optional().nullable(),
      jobType: z.string().min(1),
      scheduledAt: z.string().optional(),
    })
    .parse(await c.req.json());

  const [row] = await db
    .insert(syncJobs)
    .values({
      ...body,
      orgId,
      status: "queued",
      triggeredBy: "manual",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
    })
    .returning();
  return c.json({ data: row }, 201);
});

// ============================================================
// PROVIDER REGISTRY (static)
// ============================================================

const PROVIDERS = [
  { id: "gatherin",        name: "GatherIn",            type: "booking_channel", region: "SA" },
  { id: "hungerstation",   name: "HungerStation",        type: "food_delivery",   region: "SA" },
  { id: "jahez",           name: "جاهز",                 type: "food_delivery",   region: "SA" },
  { id: "toyou",           name: "ToYou",                type: "last_mile",       region: "SA" },
  { id: "smsa",            name: "SMSA Express",         type: "last_mile",       region: "SA" },
  { id: "naq",             name: "ناق",                  type: "last_mile",       region: "SA" },
  { id: "booking_com",     name: "Booking.com",          type: "ota",             region: "GLOBAL" },
  { id: "airbnb",          name: "Airbnb",               type: "ota",             region: "GLOBAL" },
  { id: "whatsapp",        name: "WhatsApp Business",    type: "messaging",       region: "GLOBAL" },
  { id: "sms",             name: "SMS (Unifonic)",       type: "messaging",       region: "SA" },
  { id: "moyasar",         name: "Moyasar",              type: "payments",        region: "SA" },
  { id: "stripe",          name: "Stripe",               type: "payments",        region: "GLOBAL" },
  { id: "paypal",          name: "PayPal",               type: "payments",        region: "GLOBAL" },
  { id: "google_calendar", name: "Google Calendar",      type: "calendar",        region: "GLOBAL" },
  { id: "zapier",          name: "Zapier",               type: "automation",      region: "GLOBAL" },
  { id: "n8n",             name: "n8n",                  type: "automation",      region: "GLOBAL" },
  { id: "google_analytics",name: "Google Analytics",     type: "analytics",       region: "GLOBAL" },
];

integrationsRouter.get("/providers", async (c) => {
  const type = c.req.query("type");
  const providers = type ? PROVIDERS.filter((p) => p.type === type) : PROVIDERS;
  return c.json({ data: providers });
});
