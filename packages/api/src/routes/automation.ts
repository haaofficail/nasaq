import { Hono } from "hono";
import { eq, and, desc, asc, count } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { automationRules, notificationTemplates, notificationLogs, workflows, scheduledJobs } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { z } from "zod";

const createRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  triggerType: z.string(),
  triggerEvent: z.string().optional().nullable(),
  triggerSchedule: z.string().optional().nullable(),
  conditions: z.array(z.unknown()).optional(),
  actions: z.array(z.unknown()),
});

const updateRuleSchema = createRuleSchema.partial();

const createTemplateSchema = z.object({
  name: z.string(),
  channel: z.string(),
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
  status: z.string().optional(),
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
  const conditions = [eq(automationRules.orgId, orgId)];
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
  const [deleted] = await db.delete(automationRules)
    .where(and(eq(automationRules.id, c.req.param("id")), eq(automationRules.orgId, orgId))).returning();
  if (!deleted) return c.json({ error: "القاعدة غير موجودة" }, 404);
  return c.json({ data: deleted });
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
    const [template] = await db.select().from(notificationTemplates).where(eq(notificationTemplates.id, templateId));
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

  // TODO: Actually send via provider (Twilio, WhatsApp API, Resend, etc.)
  // For now: mark as sent
  await db.update(notificationLogs).set({ status: "sent", sentAt: new Date() }).where(eq(notificationLogs.id, log.id));

  if (process.env.NODE_ENV === "development") {
    console.log(`\n📧 Notification [${channel}] to ${recipientContact}:\n${finalBody}\n`);
  }

  return c.json({ data: { ...log, status: "sent" } }, 201);
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
  const [wf] = await db.insert(workflows).values({ orgId, createdBy: userId, ...body }).returning();
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
