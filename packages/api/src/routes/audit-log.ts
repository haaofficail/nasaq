import { Hono } from "hono";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import { auditLog } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";

export const auditLogRouter = new Hono();

// ============================================================
// AUDIT LOG — سجل المراجعة والتدقيق
// ============================================================

// GET /audit-log
auditLogRouter.get("/", async (c) => {
  const orgId  = getOrgId(c);
  const { limit, offset, page } = getPagination(c);
  const entity = c.req.query("entity");
  const action = c.req.query("action");
  const userId = c.req.query("userId");
  const from   = c.req.query("from");
  const to     = c.req.query("to");

  const conditions = [eq(auditLog.orgId, orgId)];
  if (entity) conditions.push(eq(auditLog.entity, entity));
  if (action) conditions.push(eq(auditLog.action, action as any));
  if (userId) conditions.push(eq(auditLog.userId, userId));
  if (from)   conditions.push(sql`${auditLog.createdAt} >= ${new Date(from)}`);
  if (to)     conditions.push(sql`${auditLog.createdAt} <= ${new Date(to)}`);

  const [entries, [{ total }]] = await Promise.all([
    db.select()
      .from(auditLog)
      .where(and(...conditions))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() })
      .from(auditLog)
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
    .from(auditLog)
    .where(and(eq(auditLog.id, c.req.param("id")), eq(auditLog.orgId, orgId)));

  if (!entry) return c.json({ error: "السجل غير موجود" }, 404);
  return c.json({ data: entry });
});

// ============================================================
// INTERNAL HELPER — تسجيل حدث في سجل المراجعة
// يُستدعى من الـ middleware أو من أي route مباشرة
// ============================================================

export async function logAuditEvent(params: {
  orgId:       string;
  userId?:     string | null;
  action:      "create" | "update" | "delete" | "view" | "login" | "logout"
               | "post" | "reverse" | "close" | "lock" | "export" | "approve" | "reject";
  entity:      string;
  entityId?:   string;
  oldData?:    unknown;
  newData?:    unknown;
  description?: string;
  requestId?:  string;
  ipAddress?:  string;
  userAgent?:  string;
}): Promise<void> {
  // Fire-and-forget — لا نبلوك الـ response الرئيسي
  db.insert(auditLog)
    .values({
      orgId:       params.orgId,
      userId:      params.userId ?? null,
      action:      params.action,
      entity:      params.entity,
      entityId:    params.entityId ?? null,
      oldData:     params.oldData ?? null,
      newData:     params.newData ?? null,
      description: params.description ?? null,
      requestId:   params.requestId ?? null,
      ipAddress:   params.ipAddress ?? null,
      userAgent:   params.userAgent ?? null,
    })
    .catch(() => {}); // لا نرفع خطأ إذا فشل التسجيل
}
