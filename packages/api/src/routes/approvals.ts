import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { approvalRules, approvalRequests } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { DEFAULT_EXPIRY_HOURS } from "@nasaq/db/constants";

const createApprovalRequestSchema = z.object({
  ruleId: z.string().uuid().optional().nullable(),
  resource: z.string().min(1),
  resourceId: z.string().uuid(),
  action: z.string().min(1),
  description: z.string().max(1000).optional().nullable(),
  requestData: z.record(z.unknown()).optional(),
  approverRoleId: z.string().uuid().optional().nullable(),
  approverUserId: z.string().uuid().optional().nullable(),
  expiryHours: z.number().int().positive().optional(),
});

const createApprovalRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  triggerResource: z.string().min(1),
  triggerAction: z.string().min(1),
  triggerCondition: z.record(z.unknown()),
  approverRoleId: z.string().uuid().optional().nullable(),
  approverUserId: z.string().uuid().optional().nullable(),
  expiryHours: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional(),
});

export const approvalsRouter = new Hono();

// ============================================================
// GET /approvals — List pending approval requests
// ============================================================

approvalsRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const status = c.req.query("status") || "pending";

  const result = await db.select().from(approvalRequests)
    .where(and(
      eq(approvalRequests.orgId, orgId),
      eq(approvalRequests.status, status as any),
    ))
    .orderBy(desc(approvalRequests.createdAt));

  return c.json({ data: result, total: result.length });
});

// ============================================================
// POST /approvals/check — Check if an action needs approval
// Called before performing sensitive actions
// ============================================================

approvalsRouter.post("/check", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { resource, action, data } = body;

  const rules = await db.select().from(approvalRules)
    .where(and(
      eq(approvalRules.orgId, orgId),
      eq(approvalRules.triggerResource, resource),
      eq(approvalRules.triggerAction, action),
      eq(approvalRules.isActive, true),
    ));

  for (const rule of rules) {
    const condition = rule.triggerCondition as any;
    if (evaluateCondition(condition, data)) {
      return c.json({
        requiresApproval: true,
        rule: { id: rule.id, name: rule.name, description: rule.description },
      });
    }
  }

  return c.json({ requiresApproval: false });
});

// ============================================================
// POST /approvals — Create approval request
// ============================================================

approvalsRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createApprovalRequestSchema.parse(await c.req.json());

  const [request] = await db.insert(approvalRequests).values({
    orgId,
    ruleId: body.ruleId || null,
    resource: body.resource,
    resourceId: body.resourceId,
    action: body.action,
    description: body.description,
    requestData: body.requestData || {},
    requestedBy: userId!,
    approverRoleId: body.approverRoleId || null,
    approverUserId: body.approverUserId || null,
    expiresAt: new Date(Date.now() + (body.expiryHours || DEFAULT_EXPIRY_HOURS) * 60 * 60 * 1000),
  }).returning();

  // TODO: Send notification to approver (WhatsApp/Push)

  return c.json({ data: request }, 201);
});

// ============================================================
// PATCH /approvals/:id/approve — Approve
// ============================================================

approvalsRouter.patch("/:id/approve", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const id = c.req.param("id");
  const body = await c.req.json();

  const [updated] = await db.update(approvalRequests).set({
    status: "approved",
    resolvedBy: userId,
    resolvedAt: new Date(),
    resolutionNote: body.note || null,
  }).where(and(
    eq(approvalRequests.id, id),
    eq(approvalRequests.orgId, orgId),
    eq(approvalRequests.status, "pending"),
  )).returning();

  if (!updated) return c.json({ error: "الطلب غير موجود أو تم حله مسبقاً" }, 404);

  // TODO: Execute the original action now that it's approved

  return c.json({ data: updated });
});

// ============================================================
// PATCH /approvals/:id/reject — Reject
// ============================================================

approvalsRouter.patch("/:id/reject", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const id = c.req.param("id");
  const body = await c.req.json();

  const [updated] = await db.update(approvalRequests).set({
    status: "rejected",
    resolvedBy: userId,
    resolvedAt: new Date(),
    resolutionNote: body.note || "مرفوض",
  }).where(and(
    eq(approvalRequests.id, id),
    eq(approvalRequests.orgId, orgId),
    eq(approvalRequests.status, "pending"),
  )).returning();

  if (!updated) return c.json({ error: "الطلب غير موجود أو تم حله مسبقاً" }, 404);
  return c.json({ data: updated });
});

// ============================================================
// APPROVAL RULES CRUD
// ============================================================

approvalsRouter.get("/rules", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(approvalRules)
    .where(eq(approvalRules.orgId, orgId));
  return c.json({ data: result });
});

approvalsRouter.post("/rules", async (c) => {
  const orgId = getOrgId(c);
  const body = createApprovalRuleSchema.parse(await c.req.json());
  const [rule] = await db.insert(approvalRules).values({
    orgId,
    name: body.name,
    description: body.description,
    triggerResource: body.triggerResource,
    triggerAction: body.triggerAction,
    triggerCondition: body.triggerCondition,
    approverRoleId: body.approverRoleId,
    approverUserId: body.approverUserId,
    expiryHours: body.expiryHours,
    isActive: body.isActive,
    priority: body.priority,
  }).returning();
  return c.json({ data: rule }, 201);
});

approvalsRouter.delete("/rules/:id", async (c) => {
  const orgId = getOrgId(c);
  const [deleted] = await db.delete(approvalRules)
    .where(and(eq(approvalRules.id, c.req.param("id")), eq(approvalRules.orgId, orgId)))
    .returning();
  if (!deleted) return c.json({ error: "القاعدة غير موجودة" }, 404);
  return c.json({ data: deleted });
});

// ============================================================
// HELPERS
// ============================================================

function evaluateCondition(condition: any, data: any): boolean {
  if (!condition || !data) return false;
  const fieldValue = data[condition.field];
  if (fieldValue === undefined) return false;

  switch (condition.op) {
    case "gt": return Number(fieldValue) > Number(condition.value);
    case "gte": return Number(fieldValue) >= Number(condition.value);
    case "lt": return Number(fieldValue) < Number(condition.value);
    case "lte": return Number(fieldValue) <= Number(condition.value);
    case "eq": return fieldValue === condition.value;
    case "neq": return fieldValue !== condition.value;
    default: return false;
  }
}
