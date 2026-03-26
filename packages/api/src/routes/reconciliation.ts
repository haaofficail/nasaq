import { Hono } from "hono";
import { eq, and, desc, sql, count, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import {
  reconciliationStatements,
  reconciliationItems,
  chartOfAccounts,
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const reconciliationRouter = new Hono();

// ============================================================
// RECONCILIATION STATEMENTS — كشوف التسوية
// ============================================================

// GET /reconciliation
reconciliationRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset, page } = getPagination(c);
  const type   = c.req.query("type");
  const status = c.req.query("status");

  const conditions = [eq(reconciliationStatements.orgId, orgId)];
  if (type)   conditions.push(eq(reconciliationStatements.type, type as any));
  if (status) conditions.push(eq(reconciliationStatements.status, status as any));

  const [statements, [{ total }]] = await Promise.all([
    db.select()
      .from(reconciliationStatements)
      .where(and(...conditions))
      .orderBy(desc(reconciliationStatements.periodEnd))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() })
      .from(reconciliationStatements)
      .where(and(...conditions)),
  ]);

  return c.json({
    data: statements,
    pagination: { page, limit, total: Number(total) },
  });
});

// GET /reconciliation/:id
reconciliationRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);

  const [statement] = await db
    .select()
    .from(reconciliationStatements)
    .where(and(
      eq(reconciliationStatements.id, c.req.param("id")),
      eq(reconciliationStatements.orgId, orgId)
    ));

  if (!statement) return c.json({ error: "كشف التسوية غير موجود" }, 404);

  const items = await db
    .select()
    .from(reconciliationItems)
    .where(eq(reconciliationItems.statementId, statement.id));

  // احسب الأرصدة المعدَّلة
  const bookAdjustments = items
    .filter((i) => i.adjustsSide === "book")
    .reduce((s, i) => s + parseFloat(i.amount), 0);

  const externalAdjustments = items
    .filter((i) => i.adjustsSide === "external")
    .reduce((s, i) => s + parseFloat(i.amount), 0);

  const adjustedBook     = parseFloat(statement.bookBalance) + bookAdjustments;
  const adjustedExternal = parseFloat(statement.externalBalance) + externalAdjustments;
  const difference       = adjustedBook - adjustedExternal;

  return c.json({
    data: {
      ...statement,
      items,
      computed: {
        bookAdjustments,
        externalAdjustments,
        adjustedBook,
        adjustedExternal,
        difference,
        isBalanced: Math.abs(difference) < 0.01,
      },
    },
  });
});

// POST /reconciliation
const createStatementSchema = z.object({
  type:            z.enum(["bank", "cash", "ar", "ap"]),
  periodStart:     z.string(),
  periodEnd:       z.string(),
  glAccountId:     z.string().uuid().optional().nullable(),
  bookBalance:     z.number(),
  externalBalance: z.number(),
  notes:           z.string().optional().nullable(),
});

reconciliationRouter.post("/", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);
  const body   = createStatementSchema.parse(await c.req.json());

  const [statement] = await db
    .insert(reconciliationStatements)
    .values({
      orgId,
      type:            body.type,
      status:          "draft",
      periodStart:     new Date(body.periodStart),
      periodEnd:       new Date(body.periodEnd),
      glAccountId:     body.glAccountId ?? null,
      bookBalance:     String(body.bookBalance),
      externalBalance: String(body.externalBalance),
      notes:           body.notes ?? null,
      createdBy:       userId ?? null,
    })
    .returning();

  return c.json({ data: statement }, 201);
});

// PATCH /reconciliation/:id
reconciliationRouter.patch("/:id", async (c) => {
  const orgId = getOrgId(c);
  const body  = createStatementSchema.partial().parse(await c.req.json());

  const [statement] = await db
    .select({ status: reconciliationStatements.status })
    .from(reconciliationStatements)
    .where(and(
      eq(reconciliationStatements.id, c.req.param("id")),
      eq(reconciliationStatements.orgId, orgId)
    ));

  if (!statement) return c.json({ error: "كشف التسوية غير موجود" }, 404);
  if (statement.status === "completed") return c.json({ error: "لا يمكن تعديل كشف مكتمل" }, 422);

  const [updated] = await db
    .update(reconciliationStatements)
    .set({
      ...body,
      bookBalance:     body.bookBalance !== undefined ? String(body.bookBalance) : undefined,
      externalBalance: body.externalBalance !== undefined ? String(body.externalBalance) : undefined,
      periodStart:     body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd:       body.periodEnd   ? new Date(body.periodEnd)   : undefined,
      updatedAt:       new Date(),
    })
    .where(and(
      eq(reconciliationStatements.id, c.req.param("id")),
      eq(reconciliationStatements.orgId, orgId)
    ))
    .returning();

  return c.json({ data: updated });
});

// DELETE /reconciliation/:id  (draft only)
reconciliationRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [statement] = await db
    .select({ status: reconciliationStatements.status })
    .from(reconciliationStatements)
    .where(and(
      eq(reconciliationStatements.id, id),
      eq(reconciliationStatements.orgId, orgId)
    ));

  if (!statement) return c.json({ error: "كشف التسوية غير موجود" }, 404);
  if (statement.status !== "draft") {
    return c.json({ error: "لا يمكن حذف كشف غير مسودة — أعِد فتحه أولاً" }, 422);
  }

  await db
    .delete(reconciliationStatements)
    .where(eq(reconciliationStatements.id, id));

  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "reconciliation_statement", resourceId: id });
  return c.json({ success: true });
});

// ============================================================
// RECONCILIATION ITEMS — بنود التسوية
// ============================================================

// POST /reconciliation/:id/items
const createItemSchema = z.object({
  itemType:    z.enum([
    "outstanding_check", "deposit_in_transit", "bank_charge",
    "bank_interest", "nsf_check", "error_correction", "other"
  ]),
  description:  z.string().min(1),
  amount:       z.number(),                     // موجب أو سالب
  adjustsSide:  z.enum(["book", "external"]),
  reference:    z.string().optional().nullable(),
});

reconciliationRouter.post("/:id/items", async (c) => {
  const orgId = getOrgId(c);
  const body  = createItemSchema.parse(await c.req.json());

  // تحقق من ملكية الكشف
  const [statement] = await db
    .select({ id: reconciliationStatements.id, status: reconciliationStatements.status })
    .from(reconciliationStatements)
    .where(and(
      eq(reconciliationStatements.id, c.req.param("id")),
      eq(reconciliationStatements.orgId, orgId)
    ));

  if (!statement) return c.json({ error: "كشف التسوية غير موجود" }, 404);
  if (statement.status === "completed") return c.json({ error: "الكشف مكتمل — لا يمكن إضافة بنود" }, 422);

  const [item] = await db
    .insert(reconciliationItems)
    .values({
      statementId:  statement.id,
      itemType:     body.itemType,
      description:  body.description,
      amount:       String(body.amount),
      adjustsSide:  body.adjustsSide,
      reference:    body.reference ?? null,
      isCleared:    false,
    })
    .returning();

  // حدِّث حالة الكشف إلى in_progress
  if (statement.status === "draft") {
    await db
      .update(reconciliationStatements)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(reconciliationStatements.id, statement.id));
  }

  return c.json({ data: item }, 201);
});

// PATCH /reconciliation/:statementId/items/:itemId — تعديل بند (تأشير مقابَل، تعديل مبلغ)
reconciliationRouter.patch("/:statementId/items/:itemId", async (c) => {
  const orgId = getOrgId(c);
  const body  = createItemSchema.extend({
    isCleared: z.boolean().optional(),
  }).partial().parse(await c.req.json());

  // تحقق من ملكية الكشف
  const [statement] = await db
    .select({ id: reconciliationStatements.id, status: reconciliationStatements.status })
    .from(reconciliationStatements)
    .where(and(
      eq(reconciliationStatements.id, c.req.param("statementId")),
      eq(reconciliationStatements.orgId, orgId)
    ));

  if (!statement) return c.json({ error: "كشف التسوية غير موجود" }, 404);
  if (statement.status === "completed") return c.json({ error: "الكشف مكتمل — لا يمكن تعديل البنود" }, 422);

  const [updated] = await db
    .update(reconciliationItems)
    .set({
      ...body,
      amount:    body.amount !== undefined ? String(body.amount) : undefined,
      clearedAt: body.isCleared ? new Date() : undefined,
    })
    .where(and(
      eq(reconciliationItems.id, c.req.param("itemId")),
      eq(reconciliationItems.statementId, c.req.param("statementId")),
    ))
    .returning();

  if (!updated) return c.json({ error: "البند غير موجود" }, 404);
  return c.json({ data: updated });
});

// DELETE /reconciliation/:statementId/items/:itemId
reconciliationRouter.delete("/:statementId/items/:itemId", async (c) => {
  const orgId = getOrgId(c);
  const itemId = c.req.param("itemId");

  const [statement] = await db
    .select({ status: reconciliationStatements.status })
    .from(reconciliationStatements)
    .where(and(
      eq(reconciliationStatements.id, c.req.param("statementId")),
      eq(reconciliationStatements.orgId, orgId)
    ));

  if (!statement) return c.json({ error: "كشف التسوية غير موجود" }, 404);
  if (statement.status === "completed") return c.json({ error: "الكشف مكتمل" }, 422);

  await db
    .delete(reconciliationItems)
    .where(and(
      eq(reconciliationItems.id, itemId),
      eq(reconciliationItems.statementId, c.req.param("statementId")),
    ));

  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "reconciliation_item", resourceId: itemId });
  return c.json({ success: true });
});

// ============================================================
// COMPLETE RECONCILIATION — إتمام التسوية
// POST /reconciliation/:id/complete
// يتحقق من التوازن ثم يُغلق الكشف
// ============================================================

reconciliationRouter.post("/:id/complete", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);

  const [statement] = await db
    .select()
    .from(reconciliationStatements)
    .where(and(
      eq(reconciliationStatements.id, c.req.param("id")),
      eq(reconciliationStatements.orgId, orgId)
    ));

  if (!statement) return c.json({ error: "كشف التسوية غير موجود" }, 404);
  if (statement.status === "completed") return c.json({ error: "الكشف مكتمل بالفعل" }, 422);

  const items = await db
    .select()
    .from(reconciliationItems)
    .where(eq(reconciliationItems.statementId, statement.id));

  const bookAdj     = items.filter((i) => i.adjustsSide === "book")
    .reduce((s, i) => s + parseFloat(i.amount), 0);
  const externalAdj = items.filter((i) => i.adjustsSide === "external")
    .reduce((s, i) => s + parseFloat(i.amount), 0);

  const adjustedBook     = parseFloat(statement.bookBalance) + bookAdj;
  const adjustedExternal = parseFloat(statement.externalBalance) + externalAdj;
  const difference       = adjustedBook - adjustedExternal;

  if (Math.abs(difference) > 0.01) {
    return c.json({
      error: `لا يمكن إتمام التسوية — الفرق ${difference.toFixed(2)} ر.س. يجب أن يكون صفراً`,
      difference,
      adjustedBook,
      adjustedExternal,
    }, 422);
  }

  const [completed] = await db
    .update(reconciliationStatements)
    .set({
      status:                  "completed",
      adjustedBookBalance:     String(adjustedBook),
      adjustedExternalBalance: String(adjustedExternal),
      finalDifference:         String(difference),
      completedBy:             userId ?? null,
      completedAt:             new Date(),
      updatedAt:               new Date(),
    })
    .where(eq(reconciliationStatements.id, statement.id))
    .returning();

  return c.json({ data: completed });
});
