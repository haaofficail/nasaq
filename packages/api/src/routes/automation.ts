import { Hono } from "hono";
import { eq, and, desc, asc, count } from "drizzle-orm";
import { db, pool } from "@nasaq/db/client";
import { automationRules, notificationTemplates, notificationLogs, workflows, scheduledJobs } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { encryptString, decryptString } from "../lib/encryption";
import { z } from "zod";
import { sendSms } from "../lib/sms";
import { sendWhatsApp } from "../lib/whatsapp";
import { sendEmail, buildEmailHtml } from "../lib/email";

const createRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  status: z.enum(["active", "paused", "draft"]).optional(),
  triggerType: z.enum(["event", "schedule", "condition"]),
  triggerEvent: z.string().optional().nullable(),
  triggerSchedule: z.string().optional().nullable(),
  conditions: z.array(z.unknown()).optional(),
  actions: z.array(z.unknown()),
});

const updateRuleSchema = createRuleSchema.partial();

const createTemplateSchema = z.object({
  name: z.string(),
  channel: z.enum(["whatsapp", "sms", "email", "push", "internal"]),
  subject: z.string().optional().nullable(),
  body: z.string(),
  availableVariables: z.array(z.string()).optional(),
  whatsappTemplateName: z.string().optional().nullable(),
  whatsappTemplateLanguage: z.string().optional(),
  category: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

const createWorkflowSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  definition: z.unknown(),
  status: z.enum(["active", "paused", "draft"]).optional(),
});

const updateWorkflowSchema = createWorkflowSchema.partial();

const createJobSchema = z.object({
  name: z.string(),
  cronExpression: z.string(),
  timezone: z.string().optional(),
  actionType: z.string(),
  actionConfig: z.unknown().optional(),
  isActive: z.boolean().optional(),
});

export const automationRouter = new Hono();

// ============================================================
// AUTOMATION RULES
// ============================================================

automationRouter.get("/rules", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status");
  const conditions: any[] = [eq(automationRules.orgId, orgId)];
  if (status) conditions.push(eq(automationRules.status, status as any));
  const result = await db.select().from(automationRules).where(and(...conditions)).orderBy(desc(automationRules.createdAt));
  return c.json({ data: result });
});

automationRouter.post("/rules", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createRuleSchema.parse(await c.req.json());
  const [rule] = await db.insert(automationRules).values({ orgId, createdBy: userId, ...body }).returning();
  return c.json({ data: rule }, 201);
});

automationRouter.put("/rules/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updateRuleSchema.parse(await c.req.json());
  const [updated] = await db.update(automationRules).set({ ...body, updatedAt: new Date() })
    .where(and(eq(automationRules.id, c.req.param("id")), eq(automationRules.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "القاعدة غير موجودة" }, 404);
  return c.json({ data: updated });
});

automationRouter.delete("/rules/:id", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db.update(automationRules)
    .set({ status: "paused", updatedAt: new Date() })
    .where(and(eq(automationRules.id, c.req.param("id")), eq(automationRules.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "القاعدة غير موجودة" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "automation_rule", resourceId: updated.id });
  return c.json({ data: updated });
});

// ============================================================
// NOTIFICATION TEMPLATES
// ============================================================

automationRouter.get("/templates", async (c) => {
  const orgId = getOrgId(c);
  const channel = c.req.query("channel");
  const conditions = [eq(notificationTemplates.orgId, orgId)];
  if (channel) conditions.push(eq(notificationTemplates.channel, channel as any));
  const result = await db.select().from(notificationTemplates).where(and(...conditions)).orderBy(asc(notificationTemplates.name));
  return c.json({ data: result });
});

automationRouter.post("/templates", async (c) => {
  const orgId = getOrgId(c);
  const body = createTemplateSchema.parse(await c.req.json());
  const [template] = await db.insert(notificationTemplates).values({ orgId, ...body }).returning();
  return c.json({ data: template }, 201);
});

automationRouter.put("/templates/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updateTemplateSchema.parse(await c.req.json());
  const [updated] = await db.update(notificationTemplates).set({ ...body, updatedAt: new Date() })
    .where(and(eq(notificationTemplates.id, c.req.param("id")), eq(notificationTemplates.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "القالب غير موجود" }, 404);
  return c.json({ data: updated });
});

// ============================================================
// SEND NOTIFICATION — إرسال إشعار فوري
// ============================================================

automationRouter.post("/send", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { templateId, channel, recipientType, recipientId, recipientContact, variables } = body;

  // Load template
  let finalBody = body.body || "";
  let finalSubject = body.subject || "";

  if (templateId) {
    const [template] = await db.select().from(notificationTemplates).where(and(eq(notificationTemplates.id, templateId), eq(notificationTemplates.orgId, orgId)));
    if (template) {
      finalBody = template.body;
      finalSubject = template.subject || "";
      // Replace variables
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          finalBody = finalBody.replace(new RegExp(`\\{${key}\\}`, "g"), value as string);
          finalSubject = finalSubject.replace(new RegExp(`\\{${key}\\}`, "g"), value as string);
        }
      }
    }
  }

  // Log the notification
  const [log] = await db.insert(notificationLogs).values({
    orgId, templateId, channel: channel || "whatsapp",
    recipientType, recipientId, recipientContact,
    subject: finalSubject, body: finalBody, status: "pending",
  }).returning();

  // ── إرسال فعلي عبر القناة ──────────────────────────────────
  let delivered = false;
  try {
    if (channel === "sms") {
      delivered = await sendSms(recipientContact, finalBody);
    } else if (channel === "whatsapp") {
      delivered = await sendWhatsApp(recipientContact, finalBody);
    } else if (channel === "email") {
      delivered = await sendEmail({
        to:      recipientContact,
        subject: finalSubject || "إشعار من نسق",
        html:    buildEmailHtml({ title: finalSubject || "إشعار", body: finalBody }),
        text:    finalBody,
      });
    }
  } catch (_err) {
    // لا تكسر الاستجابة — سجّل فقط
  }

  const finalStatus = delivered ? "sent" : "failed";
  await db.update(notificationLogs)
    .set({ status: finalStatus, sentAt: delivered ? new Date() : null })
    .where(eq(notificationLogs.id, log.id));

  return c.json({ data: { ...log, status: finalStatus } }, 201);
});

// ============================================================
// NOTIFICATION LOG
// ============================================================

automationRouter.get("/logs", async (c) => {
  const orgId = getOrgId(c);
  const channel = c.req.query("channel");
  const status = c.req.query("status");
  const limit = Math.min(50, parseInt(c.req.query("limit") || "20"));

  const conditions = [eq(notificationLogs.orgId, orgId)];
  if (channel) conditions.push(eq(notificationLogs.channel, channel as any));
  if (status) conditions.push(eq(notificationLogs.status, status));

  const result = await db.select().from(notificationLogs).where(and(...conditions)).orderBy(desc(notificationLogs.createdAt)).limit(limit);
  return c.json({ data: result });
});

// ============================================================
// WORKFLOWS — مسارات العمل المرئية
// ============================================================

automationRouter.get("/workflows", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(workflows).where(eq(workflows.orgId, orgId)).orderBy(desc(workflows.createdAt));
  return c.json({ data: result });
});

automationRouter.get("/workflows/:id", async (c) => {
  const orgId = getOrgId(c);
  const [wf] = await db.select().from(workflows).where(and(eq(workflows.id, c.req.param("id")), eq(workflows.orgId, orgId)));
  if (!wf) return c.json({ error: "المسار غير موجود" }, 404);
  return c.json({ data: wf });
});

automationRouter.post("/workflows", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createWorkflowSchema.parse(await c.req.json());
  const [wf] = await db.insert(workflows).values({ orgId, createdBy: userId, ...body, definition: body.definition ?? {} }).returning();
  return c.json({ data: wf }, 201);
});

automationRouter.put("/workflows/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updateWorkflowSchema.parse(await c.req.json());
  const [updated] = await db.update(workflows).set({ ...body, updatedAt: new Date() })
    .where(and(eq(workflows.id, c.req.param("id")), eq(workflows.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "المسار غير موجود" }, 404);
  return c.json({ data: updated });
});

// ============================================================
// SCHEDULED JOBS
// ============================================================

automationRouter.get("/jobs", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(scheduledJobs).where(eq(scheduledJobs.orgId, orgId));
  return c.json({ data: result });
});

automationRouter.post("/jobs", async (c) => {
  const orgId = getOrgId(c);
  const body = createJobSchema.parse(await c.req.json());
  const [job] = await db.insert(scheduledJobs).values({ orgId, ...body }).returning();
  return c.json({ data: job }, 201);
});

automationRouter.patch("/jobs/:id/toggle", async (c) => {
  const orgId = getOrgId(c);
  const [current] = await db.select().from(scheduledJobs).where(and(eq(scheduledJobs.id, c.req.param("id")), eq(scheduledJobs.orgId, orgId)));
  if (!current) return c.json({ error: "الوظيفة غير موجودة" }, 404);
  const [updated] = await db.update(scheduledJobs).set({ isActive: !current.isActive }).where(eq(scheduledJobs.id, current.id)).returning();
  return c.json({ data: updated });
});

// ============================================================
// WHATSAPP TEMPLATES — قوالب رسائل واتساب
// ============================================================

const whatsappTemplateSchema = z.object({
  name: z.string().min(1),
  triggerEvent: z.enum(["booking_confirmed", "booking_reminder_24h", "booking_reminder_1h", "booking_cancelled", "payment_received"]),
  messageBody: z.string().min(1),
  isActive: z.boolean().optional().default(true),
  language: z.string().optional().default("ar"),
});

const whatsappTemplateUpdateSchema = whatsappTemplateSchema.partial();

automationRouter.get("/whatsapp-templates", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT * FROM whatsapp_templates WHERE org_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [orgId]
  );
  return c.json({ data: result.rows });
});

automationRouter.post("/whatsapp-templates", async (c) => {
  const orgId = getOrgId(c);
  const body = whatsappTemplateSchema.parse(await c.req.json());
  const result = await pool.query(
    `INSERT INTO whatsapp_templates (org_id, name, trigger_event, message_body, is_active, language)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [orgId, body.name, body.triggerEvent, body.messageBody, body.isActive ?? true, body.language ?? "ar"]
  );
  return c.json({ data: result.rows[0] }, 201);
});

automationRouter.put("/whatsapp-templates/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = whatsappTemplateUpdateSchema.parse(await c.req.json());
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (body.name !== undefined) { fields.push(`name = $${idx++}`); values.push(body.name); }
  if (body.triggerEvent !== undefined) { fields.push(`trigger_event = $${idx++}`); values.push(body.triggerEvent); }
  if (body.messageBody !== undefined) { fields.push(`message_body = $${idx++}`); values.push(body.messageBody); }
  if (body.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(body.isActive); }
  if (body.language !== undefined) { fields.push(`language = $${idx++}`); values.push(body.language); }
  if (fields.length === 0) return c.json({ error: "لا يوجد حقول للتحديث" }, 400);
  fields.push(`updated_at = NOW()`);
  values.push(orgId, id);
  const result = await pool.query(
    `UPDATE whatsapp_templates SET ${fields.join(", ")} WHERE org_id = $${idx++} AND id = $${idx++} RETURNING *`,
    values
  );
  if (result.rowCount === 0) return c.json({ error: "القالب غير موجود" }, 404);
  return c.json({ data: result.rows[0] });
});

automationRouter.delete("/whatsapp-templates/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const result = await pool.query(
    `DELETE FROM whatsapp_templates WHERE org_id = $1 AND id = $2 RETURNING id`,
    [orgId, id]
  );
  if (result.rowCount === 0) return c.json({ error: "القالب غير موجود" }, 404);
  return c.json({ data: { id } });
});

automationRouter.post("/whatsapp-templates/:id/test", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { phone } = await c.req.json();
  if (!phone) return c.json({ error: "رقم الهاتف مطلوب" }, 400);

  const result = await pool.query(
    `SELECT * FROM whatsapp_templates WHERE org_id = $1 AND id = $2`,
    [orgId, id]
  );
  if (result.rowCount === 0) return c.json({ error: "القالب غير موجود" }, 404);

  const template = result.rows[0];
  // Replace variables with sample data for the test
  const sampleVars: Record<string, string> = {
    "{{customer_name}}": "عميل تجريبي",
    "{{service_name}}": "خدمة تجريبية",
    "{{booking_date}}": new Date().toLocaleDateString("ar-SA"),
    "{{booking_time}}": "10:00 ص",
    "{{amount}}": "100",
    "{{business_name}}": "ترميز OS",
  };
  let message = template.message_body as string;
  for (const [variable, value] of Object.entries(sampleVars)) {
    message = message.replaceAll(variable, value);
  }

  let delivered = false;
  try {
    delivered = await sendWhatsApp(phone, message);
  } catch (_err) {
    // silent
  }

  return c.json({ data: { delivered, message } });
});

// ============================================================
// WHATSAPP CONNECTION — إعداد اتصال واتساب (API أو QR)
// ============================================================

automationRouter.get("/whatsapp-connection", async (c) => {
  const orgId = getOrgId(c);
  const result = await pool.query(
    `SELECT id, mode, status, phone_number, display_name, api_phone_id,
            messages_sent, last_activity, error_message, qr_code, updated_at
     FROM whatsapp_connections WHERE org_id = $1`,
    [orgId]
  );
  return c.json({ data: result.rows[0] ?? null });
});

// Save API credentials (Meta WhatsApp Business API)
automationRouter.post("/whatsapp-connection/api", async (c) => {
  const orgId = getOrgId(c);
  const { phoneId, accessToken, webhookVerify } = await c.req.json();
  if (!phoneId || !accessToken) return c.json({ error: "phoneId و accessToken مطلوبان" }, 400);

  // Test the credentials first
  let phoneNumber: string | null = null;
  let displayName: string | null = null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.ok) {
      const data = await res.json() as any;
      phoneNumber = data.display_phone_number ?? null;
      displayName = data.verified_name ?? null;
    }
  } catch (_) { /* silent — save anyway */ }

  const encryptedToken = encryptString(accessToken);

  await pool.query(
    `INSERT INTO whatsapp_connections (org_id, mode, status, phone_number, display_name, api_phone_id, api_access_token, api_webhook_verify, updated_at)
     VALUES ($1, 'api', 'connected', $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (org_id) DO UPDATE SET
       mode = 'api', status = 'connected',
       phone_number = COALESCE($2, whatsapp_connections.phone_number),
       display_name = COALESCE($3, whatsapp_connections.display_name),
       api_phone_id = $4, api_access_token = $5,
       api_webhook_verify = $6, error_message = NULL, updated_at = NOW()`,
    [orgId, phoneNumber, displayName, phoneId, encryptedToken, webhookVerify ?? null]
  );

  return c.json({ data: { ok: true, phoneNumber, displayName } });
});

// Start QR session
automationRouter.post("/whatsapp-connection/qr/start", async (c) => {
  const orgId = getOrgId(c);
  // Mark as pending_qr immediately
  await pool.query(
    `INSERT INTO whatsapp_connections (org_id, mode, status, updated_at)
     VALUES ($1, 'qr', 'pending_qr', NOW())
     ON CONFLICT (org_id) DO UPDATE SET mode = 'qr', status = 'pending_qr', qr_code = NULL, error_message = NULL, updated_at = NOW()`,
    [orgId]
  );

  // Start session async (don't await — returns immediately)
  import("../lib/whatsapp-qr").then(({ startQrSession }) => {
    startQrSession(orgId).catch(console.error);
  }).catch(console.error);

  return c.json({ data: { ok: true } });
});

// Disconnect
automationRouter.delete("/whatsapp-connection", async (c) => {
  const orgId = getOrgId(c);
  try {
    const { stopSession } = await import("../lib/whatsapp-qr");
    await stopSession(orgId);
  } catch (_) {
    // If baileys not installed, just update DB
    await pool.query(
      `UPDATE whatsapp_connections SET status = 'disconnected', qr_code = NULL, phone_number = NULL, updated_at = NOW() WHERE org_id = $1`,
      [orgId]
    );
  }
  return c.json({ data: { ok: true } });
});

// Send test message
automationRouter.post("/whatsapp-connection/test-send", async (c) => {
  const orgId = getOrgId(c);
  const { phone, message } = await c.req.json();
  if (!phone) return c.json({ error: "رقم الهاتف مطلوب" }, 400);

  const conn = await pool.query(
    `SELECT mode, status, api_phone_id, api_access_token FROM whatsapp_connections WHERE org_id = $1`,
    [orgId]
  );
  const row = conn.rows[0];
  if (!row) return c.json({ error: "لا يوجد اتصال مُهيأ" }, 400);

  const testMsg = message || "مرحباً من ترميز OS — هذه رسالة تجريبية";
  let delivered = false;

  if (row.mode === "api" && row.api_phone_id && row.api_access_token) {
    // Send via Meta API
    const decryptedToken = decryptString(row.api_access_token) ?? row.api_access_token;
    const normalised = phone.replace(/\D/g, "");
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${row.api_phone_id}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${decryptedToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalised,
          type: "text",
          text: { body: testMsg },
        }),
      }
    );
    delivered = res.ok;
  } else if (row.mode === "qr" && row.status === "connected") {
    try {
      const { sendViaQr } = await import("../lib/whatsapp-qr");
      delivered = await sendViaQr(orgId, phone, testMsg);
    } catch (_) {
      delivered = false;
    }
  }

  return c.json({ data: { delivered } });
});
