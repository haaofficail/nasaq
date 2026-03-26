import { Hono } from "hono";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import { pool } from "@nasaq/db/client";
import { integrationConfigs, webhookLogs, syncJobs } from "@nasaq/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { encryptJson, decryptJson, encryptString } from "../lib/encryption";
import { INTEGRATION_REGISTRY } from "../lib/integrations/registry";
import { logIntegration } from "../lib/integrations/logger";

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

// ============================================================
// NEW INTEGRATIONS ENDPOINTS (Generation 2)
// ============================================================

const connectSchema = z.object({
  provider: z.string().min(1),
  credentials: z.record(z.string()),
  config: z.record(z.unknown()).optional(),
});

// GET /integrations/available — registry merged with DB status
integrationsRouter.get("/available", async (c) => {
  const orgId = getOrgId(c);
  const category = c.req.query("category");

  // Fetch existing integrations for this org
  const rows = await pool.query<{
    id: string;
    provider: string;
    status: string;
    last_synced_at: string | null;
    error_message: string | null;
  }>(
    "SELECT id, provider, status, last_synced_at, error_message FROM integrations WHERE org_id = $1",
    [orgId]
  );

  const dbMap = new Map(rows.rows.map((r) => [r.provider, r]));

  let registry = INTEGRATION_REGISTRY;
  if (category) {
    registry = registry.filter((e) => e.category === category);
  }

  const result = registry.map((entry) => {
    const db_row = dbMap.get(entry.provider);
    return {
      ...entry,
      id: db_row?.id ?? null,
      status: db_row?.status ?? "inactive",
      lastSyncedAt: db_row?.last_synced_at ?? null,
      errorMessage: db_row?.error_message ?? null,
    };
  });

  return c.json({ data: result });
});

// GET /integrations/connected — only active ones
integrationsRouter.get("/connected", async (c) => {
  const orgId = getOrgId(c);

  const rows = await pool.query<{
    id: string;
    provider: string;
    category: string;
    status: string;
    config: unknown;
    webhook_url: string | null;
    last_synced_at: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, provider, category, status, config, webhook_url, last_synced_at, error_message, created_at, updated_at
     FROM integrations
     WHERE org_id = $1 AND status = 'active'
     ORDER BY updated_at DESC`,
    [orgId]
  );

  // Merge registry metadata
  const result = rows.rows.map((row) => {
    const entry = INTEGRATION_REGISTRY.find((e) => e.provider === row.provider);
    return {
      ...row,
      name: entry?.name ?? row.provider,
      nameEn: entry?.nameEn ?? row.provider,
      region: entry?.region ?? "global",
      features: entry?.features ?? [],
    };
  });

  return c.json({ data: result });
});

// POST /integrations/connect — upsert integration credentials
integrationsRouter.post("/connect", async (c) => {
  const orgId = getOrgId(c);
  const body = connectSchema.parse(await c.req.json());

  // Validate provider exists in registry
  const entry = INTEGRATION_REGISTRY.find((e) => e.provider === body.provider);
  if (!entry) {
    return c.json({ error: "مزود التكامل غير مدعوم" }, 400);
  }

  // Encrypt credentials
  const encryptedCreds = encryptJson(body.credentials as Record<string, unknown>) ?? "{}";
  const configJson = JSON.stringify(body.config ?? {});

  const result = await pool.query<{ id: string; status: string }>(
    `INSERT INTO integrations (org_id, provider, category, status, credentials, config, updated_at)
     VALUES ($1, $2, $3, 'active', $4, $5::jsonb, NOW())
     ON CONFLICT (org_id, provider)
     DO UPDATE SET
       status = 'active',
       credentials = EXCLUDED.credentials,
       config = EXCLUDED.config,
       updated_at = NOW(),
       error_message = NULL
     RETURNING id, status`,
    [orgId, body.provider, entry.category, encryptedCreds, configJson]
  );

  insertAuditLog({
    orgId,
    userId: getUserId(c),
    action: "connected",
    resource: "integration",
    resourceId: result.rows[0].id,
  });

  return c.json({ data: { id: result.rows[0].id, provider: body.provider, status: "active" } }, 201);
});

// POST /integrations/:id/test — test connection
integrationsRouter.post("/:id/test", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const rows = await pool.query<{ id: string; provider: string; credentials: unknown }>(
    "SELECT id, provider, credentials FROM integrations WHERE id = $1 AND org_id = $2",
    [id, orgId]
  );

  if (!rows.rows.length) {
    return c.json({ error: "التكامل غير موجود" }, 404);
  }

  const row = rows.rows[0];
  const entry = INTEGRATION_REGISTRY.find((e) => e.provider === row.provider);
  if (!entry) {
    return c.json({ error: "مزود التكامل غير مدعوم" }, 400);
  }

  // Basic connectivity test — check credentials are non-empty
  const decrypted = decryptJson(row.credentials as string | null) ?? {};
  const requiredFields = entry.fields.filter((f) => f.required).map((f) => f.key);
  const missing = requiredFields.filter((k) => !decrypted[k]);

  if (missing.length > 0) {
    // Mark as error
    await pool.query(
      "UPDATE integrations SET status = 'error', error_message = $1, updated_at = NOW() WHERE id = $2",
      [`الحقول المطلوبة ناقصة: ${missing.join(", ")}`, id]
    );
    return c.json({ ok: false, message: `الحقول المطلوبة ناقصة: ${missing.join(", ")}` });
  }

  // Mark last tested
  await pool.query(
    "UPDATE integrations SET last_synced_at = NOW(), error_message = NULL, updated_at = NOW() WHERE id = $1",
    [id]
  );

  await logIntegration({
    orgId,
    integrationId: id,
    direction: "outbound",
    endpoint: `test/${row.provider}`,
    method: "POST",
    statusCode: 200,
  });

  return c.json({ ok: true, message: "الاتصال ناجح" });
});

// DELETE /integrations/:id — disconnect (set inactive, clear credentials)
integrationsRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const result = await pool.query<{ id: string; provider: string }>(
    `UPDATE integrations
     SET status = 'inactive', credentials = '{}', updated_at = NOW()
     WHERE id = $1 AND org_id = $2
     RETURNING id, provider`,
    [id, orgId]
  );

  if (!result.rows.length) {
    return c.json({ error: "التكامل غير موجود" }, 404);
  }

  insertAuditLog({
    orgId,
    userId: getUserId(c),
    action: "disconnected",
    resource: "integration",
    resourceId: id,
  });

  return c.json({ success: true });
});

// GET /integrations/:id/logs — integration logs
integrationsRouter.get("/:id/logs", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50"), 200);
  const offset = parseInt(c.req.query("offset") ?? "0");

  // Verify ownership
  const check = await pool.query(
    "SELECT id FROM integrations WHERE id = $1 AND org_id = $2",
    [id, orgId]
  );
  if (!check.rows.length) {
    return c.json({ error: "التكامل غير موجود" }, 404);
  }

  const rows = await pool.query(
    `SELECT id, direction, endpoint, method, status_code, duration_ms, error_message, created_at
     FROM integration_logs
     WHERE org_id = $1 AND integration_id = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [orgId, id, limit, offset]
  );

  const total = await pool.query(
    "SELECT COUNT(*) as total FROM integration_logs WHERE org_id = $1 AND integration_id = $2",
    [orgId, id]
  );

  return c.json({ data: rows.rows, total: parseInt(total.rows[0].total), limit, offset });
});

// POST /integrations/webhook/:provider — public inbound webhook handler
integrationsRouter.post("/webhook/:provider", async (c) => {
  const provider = c.req.param("provider");
  const body = await c.req.json().catch(() => ({}));

  // Find active integration for this provider
  const rows = await pool.query<{ id: string; org_id: string }>(
    "SELECT id, org_id FROM integrations WHERE provider = $1 AND status = 'active' LIMIT 1",
    [provider]
  );

  if (!rows.rows.length) {
    return c.json({ error: "No active integration found" }, 404);
  }

  const { id, org_id } = rows.rows[0];

  await logIntegration({
    orgId: org_id,
    integrationId: id,
    direction: "inbound",
    endpoint: `/integrations/webhook/${provider}`,
    method: "POST",
    requestBody: body,
    statusCode: 200,
  });

  return c.json({ received: true });
});
