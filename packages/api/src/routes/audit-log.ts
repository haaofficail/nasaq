import { Hono } from "hono";
import { eq, and, desc, sql, count, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import { auditLogs, users } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const auditLogRouter = new Hono();

// ============================================================
// AUDIT LOG — سجل المراجعة والتدقيق
// ============================================================

// GET /audit-log
auditLogRouter.get("/", async (c) => {
  const orgId   = getOrgId(c);
  const { limit, offset, page } = getPagination(c);
  const resource   = c.req.query("resource");
  const action     = c.req.query("action");
  const userId     = c.req.query("userId");
  const resourceId = c.req.query("resourceId");
  const search     = c.req.query("search");
  const from       = c.req.query("from");
  const to         = c.req.query("to");

  const conditions = [eq(auditLogs.orgId, orgId)];
  if (resource)   conditions.push(eq(auditLogs.resource, resource));
  if (action)     conditions.push(eq(auditLogs.action, action));
  if (userId)     conditions.push(eq(auditLogs.userId, userId));
  if (resourceId) conditions.push(eq(auditLogs.resourceId, resourceId));
  if (from)       conditions.push(sql`${auditLogs.createdAt} >= ${new Date(from)}`);
  if (to)         conditions.push(sql`${auditLogs.createdAt} <= ${new Date(to)}`);
  if (search)     conditions.push(or(ilike(auditLogs.action, `%${search}%`), ilike(auditLogs.resource, `%${search}%`))!);

  const [entries, [{ total }]] = await Promise.all([
    db.select({
      id:         auditLogs.id,
      action:     auditLogs.action,
      resource:   auditLogs.resource,
      resourceId: auditLogs.resourceId,
      metadata:   auditLogs.metadata,
      newValue:   auditLogs.newValue,
      createdAt:  auditLogs.createdAt,
      userId:     auditLogs.userId,
      userName:   users.name,
      userRole:   users.type,
    })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() })
      .from(auditLogs)
      .where(and(...conditions)),
  ]);

  return c.json({
    data: entries,
    pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
  });
});

// GET /audit-log/:id
auditLogRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);

  const [entry] = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.id, c.req.param("id")), eq(auditLogs.orgId, orgId)));

  if (!entry) return c.json({ error: "السجل غير موجود" }, 404);
  return c.json({ data: entry });
});

// ============================================================
// INTERNAL HELPER — تسجيل حدث في سجل المراجعة
// يُستدعى من الـ middleware أو من أي route مباشرة
// ============================================================

// Compatibility wrapper — used by accounting.ts (maps old field names to auditLogs schema)
export function logAuditEvent(params: {
  orgId:        string;
  userId?:      string | null;
  action:       string;
  entity:       string;
  entityId?:    string;
  oldData?:     unknown;
  newData?:     unknown;
  description?: string;
  requestId?:   string;
  ipAddress?:   string;
  userAgent?:   string;
}): void {
  insertAuditLog({
    orgId:      params.orgId,
    userId:     params.userId,
    action:     params.action,
    resource:   params.entity,
    resourceId: params.entityId,
    oldValue:   params.oldData,
    newValue:   params.newData,
    metadata:   params.description || params.requestId
      ? { description: params.description, requestId: params.requestId }
      : undefined,
    ip:         params.ipAddress,
    userAgent:  params.userAgent,
  });
}
