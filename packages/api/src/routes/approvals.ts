import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, pool } from "@nasaq/db/client";
import { approvalRules, approvalRequests, bookings } from "@nasaq/db/schema";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { requirePermission } from "../middleware/auth";
import { apiErr } from "../lib/errors";
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
// APPROVAL EXECUTION — يُنفّذ الإجراء المطلوب بعد الموافقة
// المدعوم حالياً: تغيير حالة الحجز (resource = "booking")
// ============================================================

async function executeApprovedAction(
  orgId: string,
  request: typeof approvalRequests.$inferSelect,
) {
  if (request.resource !== "booking") return;

  const data = request.requestData as Record<string, unknown>;
  const newStatus = data?.status as string | undefined;
  if (!newStatus) return;

  await db.update(bookings).set({
    status: newStatus as any,
    updatedAt: new Date(),
  }).where(and(
    eq(bookings.id, request.resourceId),
    eq(bookings.orgId, orgId),
  ));
}

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
    ruleId: body.ruleId ?? null,
    resource: body.resource,
    resourceId: body.resourceId,
    action: body.action,
    description: body.description ?? "",
    requestData: body.requestData || {},
    requestedBy: userId!,
    approverRoleId: body.approverRoleId ?? null,
    approverUserId: body.approverUserId ?? null,
    expiresAt: new Date(Date.now() + (body.expiryHours || DEFAULT_EXPIRY_HOURS) * 60 * 60 * 1000),
  }).returning();

  // Notify approver via message_logs (fire-and-forget)
  if (body.approverUserId) {
    pool.query(`
      INSERT INTO message_logs (org_id, channel, recipient_phone, message_text, status, category)
      SELECT $1, 'dashboard', u.phone,
        $2, 'sent', 'approval_request'
      FROM users u WHERE u.id = $3 LIMIT 1
    `, [
      orgId,
      `طلب موافقة جديد: ${body.description || body.action} — ${body.resource}`,
      body.approverUserId,
    ]).catch(() => {});
  }

  return c.json({ data: request }, 201);
});

// ============================================================
// PATCH /approvals/:id/approve — Approve (requires approvals:approve)
// ============================================================

approvalsRouter.patch("/:id/approve", requirePermission("approvals", "approve"), async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const id = c.req.param("id")!;
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

  if (!updated) return apiErr(c, "APPR_NOT_FOUND", 404);

  // Execute the original action — currently supports booking status transitions
  executeApprovedAction(orgId, updated).catch(() => {});

  return c.json({ data: updated });
});

// ============================================================
// PATCH /approvals/:id/reject — Reject (requires approvals:reject)
// ============================================================

approvalsRouter.patch("/:id/reject", requirePermission("approvals", "reject"), async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const id = c.req.param("id")!;
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

  if (!updated) return apiErr(c, "APPR_NOT_FOUND", 404);
  return c.json({ data: updated });
});

// ============================================================
// APPROVAL RULES CRUD
// ============================================================

approvalsRouter.get("/rules", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(approvalRules)
    .where(and(eq(approvalRules.orgId, orgId), eq(approvalRules.isActive, true)));
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
  const [updated] = await db.update(approvalRules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(approvalRules.id, c.req.param("id")), eq(approvalRules.orgId, orgId)))
    .returning();
  if (!updated) return apiErr(c, "APPR_RULE_NOT_FOUND", 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "approval_rule", resourceId: updated.id });
  return c.json({ data: updated });
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
