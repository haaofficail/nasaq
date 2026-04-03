import { Hono } from "hono";
import { eq, and, desc, asc, sql, count, sum, isNull, isNotNull, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  accountingPeriods,
  costCenters,
  fixedAssets,
  assetDepreciationEntries,
  vendors,
  budgets,
  budgetLines,
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { requirePermission } from "../middleware/auth";
import {
  createJournalEntry,
  reverseJournalEntry,
  postPeriodClosingEntries,
  type JournalLineInput,
} from "../lib/posting-engine";
import { logAuditEvent } from "./audit-log";
import { seedChartOfAccounts } from "../lib/seed-chart-of-accounts";

export const accountingRouter = new Hono();

// ============================================================
// CHART OF ACCOUNTS — دليل الحسابات
// ============================================================

// GET /accounting/chart-of-accounts
// يرجع الشجرة كاملة أو مسطّحة حسب ?flat=true
accountingRouter.get("/chart-of-accounts", async (c) => {
  const orgId = getOrgId(c);
  const flat = c.req.query("flat") === "true";
  const type = c.req.query("type");
  const postingOnly = c.req.query("postingOnly") === "true";
  const activeOnly = c.req.query("active") !== "false";

  const conditions = [eq(chartOfAccounts.orgId, orgId)];
  if (type) conditions.push(eq(chartOfAccounts.type, type as any));
  if (postingOnly) conditions.push(eq(chartOfAccounts.isPostingAllowed, true));
  if (activeOnly) conditions.push(eq(chartOfAccounts.isActive, true));

  const accounts = await db
    .select()
    .from(chartOfAccounts)
    .where(and(...conditions))
    .orderBy(asc(chartOfAccounts.code));

  if (flat) return c.json({ data: accounts });

  // بناء الشجرة
  const tree = buildTree(accounts);
  return c.json({ data: tree });
});

function buildTree(accounts: any[]): any[] {
  const map = new Map(accounts.map((a) => [a.id, { ...a, children: [] }]));
  const roots: any[] = [];
  for (const node of map.values()) {
    if (!node.parentId) {
      roots.push(node);
    } else {
      const parent = map.get(node.parentId);
      if (parent) parent.children.push(node);
    }
  }
  return roots;
}

// GET /accounting/chart-of-accounts/:id
accountingRouter.get("/chart-of-accounts/:id", async (c) => {
  const orgId = getOrgId(c);
  const [account] = await db
    .select()
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.id, c.req.param("id")), eq(chartOfAccounts.orgId, orgId)));

  if (!account) return c.json({ error: "الحساب غير موجود" }, 404);
  return c.json({ data: account });
});

// POST /accounting/chart-of-accounts
const createAccountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().optional().nullable(),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  normalBalance: z.enum(["debit", "credit"]),
  parentId: z.string().uuid().optional().nullable(),
  level: z.number().int().min(1).max(5).optional(),
  isPostingAllowed: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

accountingRouter.post("/chart-of-accounts", async (c) => {
  const orgId = getOrgId(c);
  const body = createAccountSchema.parse(await c.req.json());

  // تحقق من عدم تكرار الكود
  const [existing] = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.orgId, orgId), eq(chartOfAccounts.code, body.code)));

  if (existing) return c.json({ error: `الكود ${body.code} موجود بالفعل` }, 422);

  const [account] = await db
    .insert(chartOfAccounts)
    .values({
      orgId,
      code: body.code,
      name: body.name,
      nameEn: body.nameEn ?? null,
      type: body.type,
      normalBalance: body.normalBalance,
      parentId: body.parentId ?? null,
      level: body.level ?? 1,
      isPostingAllowed: body.isPostingAllowed ?? true,
      isSystemAccount: false,
      isActive: true,
    })
    .returning();

  return c.json({ data: account }, 201);
});

// PATCH /accounting/chart-of-accounts/:id
accountingRouter.patch("/chart-of-accounts/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = createAccountSchema.partial().parse(await c.req.json());

  // لا تسمح بتغيير كود حساب نظام
  const [current] = await db
    .select({ isSystemAccount: chartOfAccounts.isSystemAccount })
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.id, c.req.param("id")), eq(chartOfAccounts.orgId, orgId)));

  if (!current) return c.json({ error: "الحساب غير موجود" }, 404);
  if (current.isSystemAccount && body.code) {
    return c.json({ error: "لا يمكن تغيير كود حساب النظام" }, 422);
  }

  const [updated] = await db
    .update(chartOfAccounts)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(chartOfAccounts.id, c.req.param("id")), eq(chartOfAccounts.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

// DELETE /accounting/chart-of-accounts/:id (soft delete)
accountingRouter.delete("/chart-of-accounts/:id", async (c) => {
  const orgId = getOrgId(c);

  const [account] = await db
    .select()
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.id, c.req.param("id")), eq(chartOfAccounts.orgId, orgId)));

  if (!account) return c.json({ error: "الحساب غير موجود" }, 404);
  if (account.isSystemAccount) return c.json({ error: "لا يمكن حذف حساب النظام" }, 422);

  // تحقق من عدم وجود قيود مرتبطة
  const [{ usageCount }] = await db
    .select({ usageCount: count() })
    .from(journalEntryLines)
    .where(eq(journalEntryLines.accountId, c.req.param("id")));

  if (Number(usageCount) > 0) {
    return c.json({ error: "لا يمكن حذف حساب مستخدم في قيود محاسبية" }, 422);
  }

  await db
    .update(chartOfAccounts)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(chartOfAccounts.id, c.req.param("id")));

  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "chart_of_accounts", resourceId: c.req.param("id") });
  return c.json({ success: true });
});

// ============================================================
// POST /accounting/init-chart-of-accounts
// يسمح للمنشآت الموجودة بتهيئة دليل الحسابات يدوياً
// ============================================================

accountingRouter.post("/init-chart-of-accounts", async (c) => {
  const orgId = getOrgId(c);
  await seedChartOfAccounts(orgId);
  return c.json({ success: true, message: "تم تهيئة دليل الحسابات بنجاح" });
});

// ============================================================
// ACCOUNTING PERIODS — الفترات المالية
// ============================================================

// GET /accounting/periods
accountingRouter.get("/periods", async (c) => {
  const orgId = getOrgId(c);
  const periods = await db
    .select()
    .from(accountingPeriods)
    .where(eq(accountingPeriods.orgId, orgId))
    .orderBy(desc(accountingPeriods.startDate));

  return c.json({ data: periods });
});

// POST /accounting/periods
accountingRouter.post("/periods", async (c) => {
  const orgId = getOrgId(c);
  const body = z.object({
    name: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
    notes: z.string().optional().nullable(),
  }).parse(await c.req.json());

  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  if (start >= end) return c.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, 422);

  const [period] = await db
    .insert(accountingPeriods)
    .values({
      orgId,
      name: body.name,
      startDate: start,
      endDate: end,
      status: "open",
      notes: body.notes ?? null,
    })
    .returning();

  return c.json({ data: period }, 201);
});

// POST /accounting/periods/:id/close — إغلاق فترة (requires finance:close)
accountingRouter.post("/periods/:id/close", requirePermission("finance", "close"), async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);

  const [period] = await db
    .select()
    .from(accountingPeriods)
    .where(and(eq(accountingPeriods.id, c.req.param("id")!), eq(accountingPeriods.orgId, orgId)));

  if (!period) return c.json({ error: "الفترة غير موجودة" }, 404);
  if (period.status !== "open") return c.json({ error: "الفترة مُغلقة بالفعل" }, 422);

  // تحقق من عدم وجود قيود في حالة draft
  const [{ draftCount }] = await db
    .select({ draftCount: count() })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.periodId, period.id),
        eq(journalEntries.status, "draft")
      )
    );

  if (Number(draftCount) > 0) {
    return c.json({
      error: `لا يمكن إغلاق الفترة — يوجد ${draftCount} قيد في حالة مسودة`,
      draftCount: Number(draftCount),
    }, 422);
  }

  const [closed] = await db
    .update(accountingPeriods)
    .set({ status: "closed", closedBy: userId ?? null, closedAt: new Date() })
    .where(eq(accountingPeriods.id, period.id))
    .returning();

  logAuditEvent({
    orgId,
    userId,
    action: "close",
    entity: "accounting_period",
    entityId: period.id,
    description: `إغلاق الفترة المالية: ${period.name}`,
  });

  return c.json({ data: closed });
});

// POST /accounting/periods/:id/closing-entries — توليد قيود الإقفال تلقائياً
accountingRouter.post("/periods/:id/closing-entries", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);

  const [period] = await db
    .select()
    .from(accountingPeriods)
    .where(and(eq(accountingPeriods.id, c.req.param("id")!), eq(accountingPeriods.orgId, orgId)));

  if (!period) return c.json({ error: "الفترة غير موجودة" }, 404);
  if (period.status === "locked") return c.json({ error: "الفترة مقفلة — لا يمكن توليد قيود إقفال" }, 422);

  // تحقق من عدم وجود قيود إقفال مسبقة لهذه الفترة
  const [{ existingClosing }] = await db
    .select({ existingClosing: count() })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.orgId, orgId),
        eq(journalEntries.periodId, period.id),
        eq(journalEntries.sourceType, "closing")
      )
    );

  if (Number(existingClosing) > 0) {
    return c.json({ error: "قيود الإقفال موجودة بالفعل لهذه الفترة — احذفها أولاً لإعادة التوليد" }, 422);
  }

  try {
    const result = await postPeriodClosingEntries(orgId, period.id, userId!);
    return c.json({
      data: {
        netIncome: result.netIncome,
        revenueEntryNumber: result.revenueEntry?.entryNumber ?? null,
        expenseEntryNumber: result.expenseEntry?.entryNumber ?? null,
        incomeSummaryEntryNumber: result.incomeSummaryEntry?.entryNumber ?? null,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 422);
  }
});

// POST /accounting/periods/:id/lock — قفل فترة (لا تعديل من أي نوع)
accountingRouter.post("/periods/:id/lock", async (c) => {
  const orgId = getOrgId(c);

  const [period] = await db
    .select()
    .from(accountingPeriods)
    .where(and(eq(accountingPeriods.id, c.req.param("id")!), eq(accountingPeriods.orgId, orgId)));

  if (!period) return c.json({ error: "الفترة غير موجودة" }, 404);
  if (period.status === "locked") return c.json({ error: "الفترة مقفلة بالفعل" }, 422);
  if (period.status === "open") return c.json({ error: "أغلق الفترة أولاً قبل القفل" }, 422);

  const [locked] = await db
    .update(accountingPeriods)
    .set({ status: "locked" })
    .where(eq(accountingPeriods.id, period.id))
    .returning();

  return c.json({ data: locked });
});

// ============================================================
// JOURNAL ENTRIES — القيود المحاسبية
// ============================================================

// GET /accounting/journal-entries
accountingRouter.get("/journal-entries", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const sourceType = c.req.query("sourceType");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const periodId = c.req.query("periodId");

  const conditions = [eq(journalEntries.orgId, orgId)];
  if (status) conditions.push(eq(journalEntries.status, status as any));
  if (sourceType) conditions.push(eq(journalEntries.sourceType, sourceType as any));
  if (from) conditions.push(sql`${journalEntries.date} >= ${new Date(from)}`);
  if (to) conditions.push(sql`${journalEntries.date} <= ${new Date(to)}`);
  if (periodId) conditions.push(eq(journalEntries.periodId, periodId));

  const [entries, [{ total }]] = await Promise.all([
    db.select().from(journalEntries)
      .where(and(...conditions))
      .orderBy(desc(journalEntries.date), desc(journalEntries.createdAt))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(journalEntries).where(and(...conditions)),
  ]);

  return c.json({
    data: entries,
    pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
  });
});

// GET /accounting/journal-entries/:id
accountingRouter.get("/journal-entries/:id", async (c) => {
  const orgId = getOrgId(c);

  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, c.req.param("id")!), eq(journalEntries.orgId, orgId)));

  if (!entry) return c.json({ error: "القيد غير موجود" }, 404);

  const lines = await db
    .select({
      id: journalEntryLines.id,
      accountId: journalEntryLines.accountId,
      accountCode: chartOfAccounts.code,
      accountName: chartOfAccounts.name,
      accountType: chartOfAccounts.type,
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
      description: journalEntryLines.description,
      lineOrder: journalEntryLines.lineOrder,
    })
    .from(journalEntryLines)
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(eq(journalEntryLines.entryId, entry.id))
    .orderBy(asc(journalEntryLines.lineOrder));

  return c.json({ data: { ...entry, lines } });
});

// POST /accounting/journal-entries — قيد يدوي
const createEntrySchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  reference: z.string().optional().nullable(),
  periodId: z.string().uuid().optional().nullable(),
  lines: z.array(z.object({
    accountId: z.string().uuid(),
    debit: z.number().min(0).optional(),
    credit: z.number().min(0).optional(),
    description: z.string().optional().nullable(),
    branchId: z.string().uuid().optional().nullable(),
  })).min(2),
});

accountingRouter.post("/journal-entries", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = createEntrySchema.parse(await c.req.json());

  // تحقق أن كل الحسابات تنتمي للمنشأة وتقبل الترحيل
  const accountIds = body.lines.map((l) => l.accountId);
  const validAccounts = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.orgId, orgId),
        eq(chartOfAccounts.isPostingAllowed, true),
        eq(chartOfAccounts.isActive, true),
        inArray(chartOfAccounts.id, accountIds)
      )
    );

  if (validAccounts.length !== accountIds.length) {
    return c.json({ error: "بعض الحسابات غير موجودة أو لا تقبل الترحيل المباشر" }, 422);
  }

  const lines: JournalLineInput[] = body.lines.map((l) => ({
    accountId: l.accountId,
    debit: l.debit,
    credit: l.credit,
    description: l.description ?? undefined,
    branchId: l.branchId ?? undefined,
  }));

  try {
    const result = await createJournalEntry({
      orgId,
      date: new Date(body.date),
      description: body.description,
      reference: body.reference ?? undefined,
      sourceType: "manual",
      periodId: body.periodId ?? undefined,
      createdBy: userId ?? undefined,
      lines,
    });

    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, result.entryId));

    return c.json({ data: entry, entryNumber: result.entryNumber }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 422);
  }
});

// POST /accounting/journal-entries/:id/post — ترحيل قيد مسودة (requires finance:post)
accountingRouter.post("/journal-entries/:id/post", requirePermission("finance", "post"), async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);

  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, c.req.param("id")!), eq(journalEntries.orgId, orgId)));

  if (!entry) return c.json({ error: "القيد غير موجود" }, 404);
  if (entry.status !== "draft") return c.json({ error: "القيد مُرحَّل بالفعل" }, 422);

  // تحقق من الفترة
  if (entry.periodId) {
    const [period] = await db
      .select({ status: accountingPeriods.status })
      .from(accountingPeriods)
      .where(eq(accountingPeriods.id, entry.periodId));

    if (period && period.status !== "open") {
      return c.json({ error: "الفترة المالية مُغلقة — لا يمكن الترحيل إليها" }, 422);
    }
  }

  const [posted] = await db
    .update(journalEntries)
    .set({ status: "posted", postedBy: userId ?? null, postedAt: new Date() })
    .where(eq(journalEntries.id, entry.id))
    .returning();

  logAuditEvent({
    orgId,
    userId,
    action: "post",
    entity: "journal_entry",
    entityId: entry.id,
    description: `ترحيل قيد ${entry.entryNumber}`,
  });

  return c.json({ data: posted });
});

// POST /accounting/journal-entries/:id/reverse — عكس قيد (requires finance:reverse)
accountingRouter.post("/journal-entries/:id/reverse", requirePermission("finance", "reverse"), async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const bodyParsed = z.object({ reason: z.string().optional() }).optional().safeParse(
    await c.req.json().catch(() => ({}))
  );
  if (!bodyParsed.success) return c.json({ error: bodyParsed.error.flatten() }, 400);
  const body = bodyParsed.data;

  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, c.req.param("id")!), eq(journalEntries.orgId, orgId)));

  if (!entry) return c.json({ error: "القيد غير موجود" }, 404);

  try {
    const result = await reverseJournalEntry(entry.id, userId!, body?.reason);
    const [reversalEntry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, result.entryId));

    logAuditEvent({
      orgId,
      userId,
      action: "reverse",
      entity: "journal_entry",
      entityId: entry.id,
      description: `عكس قيد ${entry.entryNumber} → ${result.entryNumber}`,
    });

    return c.json({ data: reversalEntry, entryNumber: result.entryNumber });
  } catch (err: any) {
    return c.json({ error: err.message }, 422);
  }
});

// ============================================================
// REPORTS — التقارير المحاسبية
// ============================================================

// GET /accounting/reports/trial-balance?periodId=xxx | ?from=&to=
// ميزان المراجعة
accountingRouter.get("/reports/trial-balance", async (c) => {
  const orgId = getOrgId(c);
  const periodId = c.req.query("periodId");
  const from = c.req.query("from");
  const to = c.req.query("to");

  const dateConditions: string[] = [];
  const params: any[] = [orgId];

  if (periodId) {
    params.push(periodId);
    dateConditions.push(`je.period_id = $${params.length}`);
  } else if (from && to) {
    params.push(from, to);
    dateConditions.push(`je.date BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  const whereClause = dateConditions.length > 0
    ? `AND ${dateConditions.join(" AND ")}`
    : "";

  const rows = await db.execute(sql`
    SELECT
      coa.id,
      coa.code,
      coa.name,
      coa.type,
      coa.normal_balance,
      COALESCE(SUM(jel.debit::numeric), 0)  AS total_debit,
      COALESCE(SUM(jel.credit::numeric), 0) AS total_credit,
      CASE
        WHEN coa.normal_balance = 'debit'
          THEN COALESCE(SUM(jel.debit::numeric), 0) - COALESCE(SUM(jel.credit::numeric), 0)
        ELSE
          COALESCE(SUM(jel.credit::numeric), 0) - COALESCE(SUM(jel.debit::numeric), 0)
      END AS balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
    LEFT JOIN journal_entries je
      ON je.id = jel.entry_id
      AND je.org_id = ${orgId}
      AND je.status = 'posted'
    WHERE coa.org_id = ${orgId}
      AND coa.is_posting_allowed = true
      AND coa.is_active = true
    GROUP BY coa.id, coa.code, coa.name, coa.type, coa.normal_balance
    HAVING COALESCE(SUM(jel.debit::numeric), 0) > 0
        OR COALESCE(SUM(jel.credit::numeric), 0) > 0
    ORDER BY coa.code ASC
  `);

  const accounts = rows.rows as any[];
  const totalDebit = accounts.reduce((s, r) => s + parseFloat(r.total_debit), 0);
  const totalCredit = accounts.reduce((s, r) => s + parseFloat(r.total_credit), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return c.json({
    data: {
      accounts,
      totals: { totalDebit, totalCredit, isBalanced },
    },
  });
});

// GET /accounting/reports/ledger/:accountId?from=&to=
// حركة حساب (أستاذ مساعد)
accountingRouter.get("/reports/ledger/:accountId", async (c) => {
  const orgId = getOrgId(c);
  const accountId = c.req.param("accountId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const { limit, offset, page } = getPagination(c);

  const [account] = await db
    .select()
    .from(chartOfAccounts)
    .where(and(eq(chartOfAccounts.id, accountId), eq(chartOfAccounts.orgId, orgId)));

  if (!account) return c.json({ error: "الحساب غير موجود" }, 404);

  const dateFilter = from && to
    ? sql`AND je.date BETWEEN ${new Date(from)} AND ${new Date(to)}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      je.date,
      je.entry_number,
      je.description       AS entry_description,
      jel.description      AS line_description,
      jel.debit::numeric   AS debit,
      jel.credit::numeric  AS credit,
      je.source_type,
      je.source_id
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.entry_id
    WHERE jel.account_id = ${accountId}
      AND je.org_id = ${orgId}
      AND je.status = 'posted'
      ${dateFilter}
    ORDER BY je.date ASC, je.entry_number ASC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const lines = rows.rows as any[];

  // احسب الرصيد الجاري
  let runningBalance = 0;
  const linesWithBalance = lines.map((line) => {
    const debit = parseFloat(line.debit ?? "0");
    const credit = parseFloat(line.credit ?? "0");
    if (account.normalBalance === "debit") {
      runningBalance += debit - credit;
    } else {
      runningBalance += credit - debit;
    }
    return { ...line, runningBalance };
  });

  return c.json({
    data: {
      account,
      lines: linesWithBalance,
      pagination: { page, limit },
    },
  });
});

// GET /accounting/reports/income-statement?from=&to=
// قائمة الدخل
accountingRouter.get("/reports/income-statement", async (c) => {
  const orgId = getOrgId(c);
  const from = c.req.query("from") || new Date(new Date().getFullYear(), 0, 1).toISOString();
  const to = c.req.query("to") || new Date().toISOString();

  const rows = await db.execute(sql`
    SELECT
      coa.code,
      coa.name,
      coa.type,
      coa.normal_balance,
      COALESCE(SUM(jel.credit::numeric) - SUM(jel.debit::numeric), 0) AS net_credit,
      COALESCE(SUM(jel.debit::numeric)  - SUM(jel.credit::numeric), 0) AS net_debit
    FROM chart_of_accounts coa
    JOIN journal_entry_lines jel ON jel.account_id = coa.id
    JOIN journal_entries je ON je.id = jel.entry_id
      AND je.org_id = ${orgId}
      AND je.status = 'posted'
      AND je.date BETWEEN ${new Date(from)} AND ${new Date(to)}
    WHERE coa.org_id = ${orgId}
      AND coa.type IN ('revenue', 'expense')
      AND coa.is_active = true
    GROUP BY coa.code, coa.name, coa.type, coa.normal_balance
    ORDER BY coa.type DESC, coa.code ASC
  `);

  const accounts = rows.rows as any[];
  const revenues = accounts.filter((r) => r.type === "revenue");
  const expenses = accounts.filter((r) => r.type === "expense");

  const totalRevenue = revenues.reduce((s, r) => s + parseFloat(r.net_credit), 0);
  const totalExpenses = expenses.reduce((s, r) => s + parseFloat(r.net_debit), 0);
  const netIncome = totalRevenue - totalExpenses;

  return c.json({
    data: {
      period: { from, to },
      revenues: { items: revenues, total: totalRevenue },
      expenses: { items: expenses, total: totalExpenses },
      netIncome,
      profitMargin: totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 100) : 0,
    },
  });
});

// GET /accounting/reports/balance-sheet
// الميزانية العمومية (لحظية)
accountingRouter.get("/reports/balance-sheet", async (c) => {
  const orgId = getOrgId(c);
  const asOf = c.req.query("asOf") || new Date().toISOString();

  const rows = await db.execute(sql`
    SELECT
      coa.code,
      coa.name,
      coa.type,
      coa.normal_balance,
      CASE
        WHEN coa.normal_balance = 'debit'
          THEN COALESCE(SUM(jel.debit::numeric), 0) - COALESCE(SUM(jel.credit::numeric), 0)
        ELSE
          COALESCE(SUM(jel.credit::numeric), 0) - COALESCE(SUM(jel.debit::numeric), 0)
      END AS balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jel.entry_id
      AND je.org_id = ${orgId}
      AND je.status = 'posted'
      AND je.date <= ${new Date(asOf)}
    WHERE coa.org_id = ${orgId}
      AND coa.type IN ('asset', 'liability', 'equity')
      AND coa.is_posting_allowed = true
      AND coa.is_active = true
    GROUP BY coa.code, coa.name, coa.type, coa.normal_balance
    ORDER BY coa.type, coa.code ASC
  `);

  const accounts = (rows.rows as any[]).filter((r) => parseFloat(r.balance) !== 0);
  const assets = accounts.filter((r) => r.type === "asset");
  const liabilities = accounts.filter((r) => r.type === "liability");
  const equity = accounts.filter((r) => r.type === "equity");

  const totalAssets = assets.reduce((s, r) => s + parseFloat(r.balance), 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + parseFloat(r.balance), 0);
  const totalEquity = equity.reduce((s, r) => s + parseFloat(r.balance), 0);
  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  return c.json({
    data: {
      asOf,
      assets: { items: assets, total: totalAssets },
      liabilities: { items: liabilities, total: totalLiabilities },
      equity: { items: equity, total: totalEquity },
      isBalanced,
    },
  });
});

// ============================================================
// AR AGING — تقادم ذمم العملاء
// GET /accounting/reports/ar-aging?asOf=
// ============================================================

accountingRouter.get("/reports/ar-aging", async (c) => {
  const orgId = getOrgId(c);
  const asOf = c.req.query("asOf") || new Date().toISOString();
  const asOfDate = new Date(asOf);

  // جلب كل الحركات في حساب ذمم العملاء حتى تاريخ التقرير
  const rows = await db.execute(sql`
    SELECT
      je.source_id,
      je.source_type,
      je.date,
      je.description,
      je.entry_number,
      jel.debit::numeric  AS debit,
      jel.credit::numeric AS credit
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.entry_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE coa.org_id = ${orgId}
      AND coa.system_key = 'AR'
      AND je.status = 'posted'
      AND je.date <= ${asOfDate}
    ORDER BY je.source_id, je.date ASC
  `);

  // تجميع حسب source_id لحساب الرصيد المتبقي لكل مصدر
  const sourceMap = new Map<string, any>();
  for (const row of rows.rows as any[]) {
    const key = row.source_id || row.entry_number;
    if (!sourceMap.has(key)) {
      sourceMap.set(key, {
        sourceId: row.source_id,
        sourceType: row.source_type,
        date: row.date,
        description: row.description,
        entryNumber: row.entry_number,
        balance: 0,
      });
    }
    const item = sourceMap.get(key);
    // AR طبيعته مدين — الرصيد = مدين - دائن
    item.balance += parseFloat(row.debit) - parseFloat(row.credit);
  }

  const openItems = Array.from(sourceMap.values()).filter((i) => i.balance > 0.005);

  // تصنيف حسب العمر
  const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
  const bucketItems = { current: [] as any[], days30: [] as any[], days60: [] as any[], days90: [] as any[], over90: [] as any[] };

  for (const item of openItems) {
    const ageDays = Math.floor((asOfDate.getTime() - new Date(item.date).getTime()) / 86400000);
    item.ageDays = ageDays;
    if (ageDays <= 30) {
      buckets.current += item.balance;
      bucketItems.current.push(item);
    } else if (ageDays <= 60) {
      buckets.days30 += item.balance;
      bucketItems.days30.push(item);
    } else if (ageDays <= 90) {
      buckets.days60 += item.balance;
      bucketItems.days60.push(item);
    } else if (ageDays <= 120) {
      buckets.days90 += item.balance;
      bucketItems.days90.push(item);
    } else {
      buckets.over90 += item.balance;
      bucketItems.over90.push(item);
    }
  }

  const totalAR = Object.values(buckets).reduce((s, v) => s + v, 0);

  return c.json({
    data: {
      asOf,
      totalAR,
      buckets,
      bucketItems,
      openItemsCount: openItems.length,
    },
  });
});

// ============================================================
// AP AGING — تقادم ذمم الموردين
// GET /accounting/reports/ap-aging?asOf=
// ============================================================

accountingRouter.get("/reports/ap-aging", async (c) => {
  const orgId = getOrgId(c);
  const asOf = c.req.query("asOf") || new Date().toISOString();
  const asOfDate = new Date(asOf);

  const rows = await db.execute(sql`
    SELECT
      je.source_id,
      je.source_type,
      je.date,
      je.description,
      je.entry_number,
      jel.debit::numeric  AS debit,
      jel.credit::numeric AS credit
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.entry_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE coa.org_id = ${orgId}
      AND coa.system_key = 'AP'
      AND je.status = 'posted'
      AND je.date <= ${asOfDate}
    ORDER BY je.source_id, je.date ASC
  `);

  const sourceMap = new Map<string, any>();
  for (const row of rows.rows as any[]) {
    const key = row.source_id || row.entry_number;
    if (!sourceMap.has(key)) {
      sourceMap.set(key, {
        sourceId: row.source_id,
        sourceType: row.source_type,
        date: row.date,
        description: row.description,
        entryNumber: row.entry_number,
        balance: 0,
      });
    }
    const item = sourceMap.get(key);
    // AP طبيعته دائن — الرصيد = دائن - مدين
    item.balance += parseFloat(row.credit) - parseFloat(row.debit);
  }

  const openItems = Array.from(sourceMap.values()).filter((i) => i.balance > 0.005);

  const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
  const bucketItems = { current: [] as any[], days30: [] as any[], days60: [] as any[], days90: [] as any[], over90: [] as any[] };

  for (const item of openItems) {
    const ageDays = Math.floor((asOfDate.getTime() - new Date(item.date).getTime()) / 86400000);
    item.ageDays = ageDays;
    if (ageDays <= 30) {
      buckets.current += item.balance;
      bucketItems.current.push(item);
    } else if (ageDays <= 60) {
      buckets.days30 += item.balance;
      bucketItems.days30.push(item);
    } else if (ageDays <= 90) {
      buckets.days60 += item.balance;
      bucketItems.days60.push(item);
    } else if (ageDays <= 120) {
      buckets.days90 += item.balance;
      bucketItems.days90.push(item);
    } else {
      buckets.over90 += item.balance;
      bucketItems.over90.push(item);
    }
  }

  const totalAP = Object.values(buckets).reduce((s, v) => s + v, 0);

  return c.json({
    data: {
      asOf,
      totalAP,
      buckets,
      bucketItems,
      openItemsCount: openItems.length,
    },
  });
});

// ============================================================
// CASH FLOW STATEMENT — قائمة التدفقات النقدية (الطريقة غير المباشرة)
// GET /accounting/reports/cash-flow?from=&to=
// ============================================================

accountingRouter.get("/reports/cash-flow", async (c) => {
  const orgId = getOrgId(c);
  const from = c.req.query("from") || new Date(new Date().getFullYear(), 0, 1).toISOString();
  const to   = c.req.query("to")   || new Date().toISOString();

  // صافي الدخل من قائمة الدخل
  const incomeRows = await db.execute(sql`
    SELECT
      coa.type,
      CASE
        WHEN coa.type = 'revenue'
          THEN COALESCE(SUM(jel.credit::numeric), 0) - COALESCE(SUM(jel.debit::numeric), 0)
        ELSE
          COALESCE(SUM(jel.debit::numeric), 0) - COALESCE(SUM(jel.credit::numeric), 0)
      END AS net
    FROM chart_of_accounts coa
    JOIN journal_entry_lines jel ON jel.account_id = coa.id
    JOIN journal_entries je ON je.id = jel.entry_id
    WHERE coa.org_id = ${orgId}
      AND coa.type IN ('revenue', 'expense')
      AND je.status = 'posted'
      AND je.source_type != 'closing'
      AND je.date BETWEEN ${new Date(from)} AND ${new Date(to)}
    GROUP BY coa.type
  `);

  let totalRevenue = 0, totalExpense = 0;
  for (const r of incomeRows.rows as any[]) {
    if (r.type === "revenue") totalRevenue = parseFloat(r.net);
    else totalExpense = parseFloat(r.net);
  }
  const netIncome = totalRevenue - totalExpense;

  // الإهلاك (غير نقدي — يُضاف للصافي)
  const deprRows = await db.execute(sql`
    SELECT COALESCE(SUM(jel.debit::numeric), 0) AS depreciation
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.entry_id
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE coa.org_id = ${orgId}
      AND coa.system_key = 'DEPRECIATION_EXPENSE'
      AND je.status = 'posted'
      AND je.date BETWEEN ${new Date(from)} AND ${new Date(to)}
  `);
  const depreciation = parseFloat((deprRows.rows[0] as any)?.depreciation ?? "0");

  // التغيرات في رأس المال العامل: AR, AP, Inventory, Deferred Revenue, Accrued Expenses
  const wcKeys = ["AR", "AP", "INVENTORY", "DEFERRED_REVENUE", "ACCRUED_EXPENSES"];
  const wcRows = await db.execute(sql`
    SELECT
      coa.system_key,
      coa.normal_balance,
      COALESCE(SUM(jel.debit::numeric), 0) - COALESCE(SUM(jel.credit::numeric), 0) AS net_change
    FROM chart_of_accounts coa
    JOIN journal_entry_lines jel ON jel.account_id = coa.id
    JOIN journal_entries je ON je.id = jel.entry_id
    WHERE coa.org_id = ${orgId}
      AND coa.system_key = ANY(${wcKeys})
      AND je.status = 'posted'
      AND je.date BETWEEN ${new Date(from)} AND ${new Date(to)}
    GROUP BY coa.system_key, coa.normal_balance
  `);

  const workingCapitalChanges: Record<string, number> = {};
  for (const r of wcRows.rows as any[]) {
    const netChange = parseFloat(r.net_change);
    // زيادة الأصول المتداولة تستهلك نقدية (سالب)، زيادة الالتزامات توفر نقدية (موجب)
    if (r.normal_balance === "debit") {
      workingCapitalChanges[r.system_key] = -netChange;
    } else {
      workingCapitalChanges[r.system_key] = netChange;
    }
  }

  const totalWCChange = Object.values(workingCapitalChanges).reduce((s, v) => s + v, 0);
  const operatingCashFlow = netIncome + depreciation + totalWCChange;

  // النقد من أنشطة التشغيل فقط (مبسّط — لا يفرّق بين استثمار وتمويل)
  return c.json({
    data: {
      period: { from, to },
      operatingActivities: {
        netIncome,
        addBack: { depreciation },
        workingCapitalChanges,
        totalWorkingCapitalChange: totalWCChange,
        netOperatingCashFlow: operatingCashFlow,
      },
      // التدفقات من الأنشطة الاستثمارية والتمويلية تحتاج تصنيف أعمق
      // سيُضاف في مرحلة لاحقة عند إضافة cost_center للقيود
      note: "قائمة التدفقات مبسّطة — أنشطة التشغيل فقط في هذا الإصدار",
    },
  });
});

// ============================================================
// COST CENTERS — مراكز التكلفة
// ============================================================

accountingRouter.get("/cost-centers", async (c) => {
  const orgId = getOrgId(c);
  const search = c.req.query("search");
  const conditions = [eq(costCenters.orgId, orgId), eq(costCenters.isActive, true)];
  const rows = await db.select().from(costCenters).where(and(...conditions)).orderBy(asc(costCenters.code));
  const data = search
    ? rows.filter(r => r.name.includes(search) || r.code.includes(search))
    : rows;
  return c.json({ data });
});

accountingRouter.post("/cost-centers", async (c) => {
  const orgId = getOrgId(c);
  const body = z.object({
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(200),
    type: z.enum(["branch", "department", "project", "property", "vehicle", "employee"]).default("department"),
    notes: z.string().optional().nullable(),
    parentId: z.string().uuid().optional().nullable(),
  }).parse(await c.req.json());
  const [row] = await db.insert(costCenters).values({ orgId, code: body.code, name: body.name, type: body.type, notes: body.notes ?? null, parentId: body.parentId ?? null, isActive: true }).returning();
  return c.json({ data: row }, 201);
});

accountingRouter.put("/cost-centers/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const [row] = await db.update(costCenters).set({ name: body.name, notes: body.notes ?? null, isActive: body.isActive ?? true, updatedAt: new Date() })
    .where(and(eq(costCenters.id, c.req.param("id")), eq(costCenters.orgId, orgId))).returning();
  if (!row) return c.json({ error: "مركز التكلفة غير موجود" }, 404);
  return c.json({ data: row });
});

accountingRouter.delete("/cost-centers/:id", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db.update(costCenters).set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(costCenters.id, c.req.param("id")), eq(costCenters.orgId, orgId))).returning({ id: costCenters.id });
  if (!row) return c.json({ error: "مركز التكلفة غير موجود" }, 404);
  return c.json({ success: true });
});

// ============================================================
// VENDORS — الموردون
// ============================================================

accountingRouter.get("/vendors", async (c) => {
  const orgId = getOrgId(c);
  const search = c.req.query("search");
  const isActive = c.req.query("isActive");
  const conditions = [eq(vendors.orgId, orgId)];
  if (isActive !== undefined) conditions.push(eq(vendors.isActive, isActive !== "false"));
  const rows = await db.select().from(vendors).where(and(...conditions)).orderBy(asc(vendors.name));
  const data = search ? rows.filter(r => r.name.includes(search) || (r.phone ?? "").includes(search)) : rows;
  return c.json({ data });
});

accountingRouter.get("/vendors/:id", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db.select().from(vendors).where(and(eq(vendors.id, c.req.param("id")), eq(vendors.orgId, orgId)));
  if (!row) return c.json({ error: "المورد غير موجود" }, 404);
  return c.json({ data: row });
});

accountingRouter.get("/vendors/:id/statement", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const from = c.req.query("from");
  const to = c.req.query("to");

  const [vendor] = await db.select().from(vendors).where(and(eq(vendors.id, id), eq(vendors.orgId, orgId)));
  if (!vendor) return c.json({ error: "المورد غير موجود" }, 404);

  // AP journal lines for this vendor (entries referencing vendor_id via metadata)
  // Simplified: query AP account lines
  const params: any[] = [orgId, id];
  let dateFilter = "";
  if (from) { params.push(from); dateFilter += ` AND je.entry_date >= $${params.length}`; }
  if (to) { params.push(to); dateFilter += ` AND je.entry_date <= $${params.length}`; }

  const { pool } = await import("@nasaq/db/client");
  const lines = await pool.query(
    `SELECT je.entry_date, je.description, jel.debit, jel.credit, ca.name as account_name
     FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id
     JOIN chart_of_accounts ca ON ca.id = jel.account_id
     WHERE je.org_id = $1 AND je.status = 'posted'
       AND jel.vendor_id = $2 ${dateFilter}
     ORDER BY je.entry_date ASC`,
    params
  );
  const totalDebit = lines.rows.reduce((s: number, r: any) => s + parseFloat(r.debit || 0), 0);
  const totalCredit = lines.rows.reduce((s: number, r: any) => s + parseFloat(r.credit || 0), 0);
  return c.json({ data: { vendor, lines: lines.rows, totalDebit, totalCredit, balance: totalDebit - totalCredit } });
});

accountingRouter.post("/vendors", async (c) => {
  const orgId = getOrgId(c);
  const body = z.object({
    name: z.string().min(1),
    contactPerson: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    vatNumber: z.string().optional().nullable(),
    commercialRegistration: z.string().optional().nullable(),
    bankName: z.string().optional().nullable(),
    iban: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }).parse(await c.req.json());
  const [row] = await db.insert(vendors).values({ orgId, ...body, isActive: true }).returning();
  return c.json({ data: row }, 201);
});

accountingRouter.put("/vendors/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const [row] = await db.update(vendors).set({ ...body, updatedAt: new Date() })
    .where(and(eq(vendors.id, c.req.param("id")), eq(vendors.orgId, orgId))).returning();
  if (!row) return c.json({ error: "المورد غير موجود" }, 404);
  return c.json({ data: row });
});

accountingRouter.delete("/vendors/:id", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db.update(vendors).set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(vendors.id, c.req.param("id")), eq(vendors.orgId, orgId))).returning({ id: vendors.id });
  if (!row) return c.json({ error: "المورد غير موجود" }, 404);
  return c.json({ success: true });
});

// ============================================================
// FIXED ASSETS — الأصول الثابتة
// ============================================================

const createAssetSchema = z.object({
  name: z.string().min(1).max(200),
  nameEn: z.string().optional().nullable(),
  category: z.enum(["land", "building", "vehicle", "furniture", "equipment", "computer", "machinery", "other"]),
  purchaseDate: z.string().optional().nullable(),
  purchasePrice: z.string().optional().nullable(),
  purchaseInvoice: z.string().optional().nullable(),
  vendorName: z.string().optional().nullable(),
  warrantyEndDate: z.string().optional().nullable(),
  usefulLifeMonths: z.number().int().min(1).optional().nullable(),
  salvageValue: z.string().optional().nullable(),
  depreciationMethod: z.enum(["straight_line", "declining_balance", "units_of_production"]).optional().default("straight_line"),
  location: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  costCenterId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /accounting/assets/summary
accountingRouter.get("/assets/summary", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db.select().from(fixedAssets).where(eq(fixedAssets.orgId, orgId));
  const active = rows.filter(r => r.status === "active");
  const totalCost = rows.reduce((s, r) => s + parseFloat(r.purchasePrice ?? "0"), 0);
  const totalAccDep = rows.reduce((s, r) => s + parseFloat(r.accumulatedDepreciation ?? "0"), 0);
  const totalNBV = rows.reduce((s, r) => s + parseFloat(r.netBookValue ?? "0"), 0);
  const byCategory: Record<string, number> = {};
  for (const r of rows) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  return c.json({ data: { total: rows.length, active: active.length, totalCost, totalAccDep, totalNBV, byCategory } });
});

// GET /accounting/assets
accountingRouter.get("/assets", async (c) => {
  const orgId = getOrgId(c);
  const category = c.req.query("category");
  const status = c.req.query("status");
  const search = c.req.query("search");
  const conditions = [eq(fixedAssets.orgId, orgId)];
  if (category) conditions.push(eq(fixedAssets.category, category as any));
  if (status) conditions.push(eq(fixedAssets.status, status as any));
  let rows = await db.select().from(fixedAssets).where(and(...conditions)).orderBy(asc(fixedAssets.assetCode));
  if (search) rows = rows.filter(r => r.name.includes(search) || r.assetCode.includes(search));
  return c.json({ data: rows });
});

// GET /accounting/assets/:id
accountingRouter.get("/assets/:id", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db.select().from(fixedAssets).where(and(eq(fixedAssets.id, c.req.param("id")), eq(fixedAssets.orgId, orgId)));
  if (!row) return c.json({ error: "الأصل غير موجود" }, 404);
  const depEntries = await db.select().from(assetDepreciationEntries).where(eq(assetDepreciationEntries.assetId, row.id)).orderBy(desc(assetDepreciationEntries.depreciationDate));
  return c.json({ data: { ...row, depreciationEntries: depEntries } });
});

// GET /accounting/assets/:id/depreciation-schedule
accountingRouter.get("/assets/:id/depreciation-schedule", async (c) => {
  const orgId = getOrgId(c);
  const [asset] = await db.select().from(fixedAssets).where(and(eq(fixedAssets.id, c.req.param("id")), eq(fixedAssets.orgId, orgId)));
  if (!asset) return c.json({ error: "الأصل غير موجود" }, 404);
  if (!asset.purchasePrice || !asset.usefulLifeMonths) return c.json({ data: [] });

  const cost = parseFloat(asset.purchasePrice);
  const salvage = parseFloat(asset.salvageValue ?? "0");
  const months = asset.usefulLifeMonths;
  const monthly = (cost - salvage) / months;
  const startDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date();

  const schedule = Array.from({ length: months }, (_, i) => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i + 1);
    const accDep = Math.min(monthly * (i + 1), cost - salvage);
    return {
      month: i + 1,
      date: d.toISOString().slice(0, 7),
      depreciation: monthly.toFixed(2),
      accumulatedDepreciation: accDep.toFixed(2),
      netBookValue: (cost - accDep).toFixed(2),
    };
  });
  return c.json({ data: schedule });
});

// POST /accounting/assets
accountingRouter.post("/assets", async (c) => {
  const orgId = getOrgId(c);
  const body = createAssetSchema.parse(await c.req.json());

  // توليد رمز الأصل
  const existing = await db.select({ code: fixedAssets.assetCode }).from(fixedAssets).where(eq(fixedAssets.orgId, orgId)).orderBy(desc(fixedAssets.createdAt));
  const lastNum = existing.length > 0
    ? Math.max(...existing.map(r => parseInt(r.code.replace(/\D/g, "") || "0")))
    : 0;
  const assetCode = `FA-${String(lastNum + 1).padStart(3, "0")}`;

  const price = body.purchasePrice ? parseFloat(body.purchasePrice) : 0;
  const salvage = body.salvageValue ? parseFloat(body.salvageValue) : 0;
  const lifeMonths = body.usefulLifeMonths ?? 60;
  const monthlyDep = lifeMonths > 0 ? ((price - salvage) / lifeMonths) : 0;

  const [row] = await db.insert(fixedAssets).values({
    orgId,
    assetCode,
    name: body.name,
    nameEn: body.nameEn ?? null,
    category: body.category,
    purchaseDate: body.purchaseDate ?? null,
    purchasePrice: body.purchasePrice ?? null,
    purchaseInvoice: body.purchaseInvoice ?? null,
    vendorName: body.vendorName ?? null,
    warrantyEndDate: body.warrantyEndDate ?? null,
    usefulLifeMonths: body.usefulLifeMonths ?? null,
    salvageValue: body.salvageValue ?? "0",
    depreciationMethod: (body.depreciationMethod ?? "straight_line") as any,
    monthlyDepreciation: monthlyDep.toFixed(2),
    accumulatedDepreciation: "0",
    netBookValue: body.purchasePrice ?? "0",
    location: body.location ?? null,
    assignedTo: body.assignedTo ?? null,
    serialNumber: body.serialNumber ?? null,
    costCenterId: body.costCenterId ?? null,
    notes: body.notes ?? null,
    status: "active",
  }).returning();

  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "fixed_asset", resourceId: row.id });
  return c.json({ data: row }, 201);
});

// PUT /accounting/assets/:id
accountingRouter.put("/assets/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = createAssetSchema.partial().parse(await c.req.json());
  const [current] = await db.select().from(fixedAssets).where(and(eq(fixedAssets.id, c.req.param("id")), eq(fixedAssets.orgId, orgId)));
  if (!current) return c.json({ error: "الأصل غير موجود" }, 404);

  const price = body.purchasePrice ? parseFloat(body.purchasePrice) : parseFloat(current.purchasePrice ?? "0");
  const salvage = body.salvageValue ? parseFloat(body.salvageValue) : parseFloat(current.salvageValue ?? "0");
  const lifeMonths = body.usefulLifeMonths ?? current.usefulLifeMonths ?? 60;
  const monthlyDep = lifeMonths > 0 ? ((price - salvage) / lifeMonths) : 0;

  const [row] = await db.update(fixedAssets).set({
    ...body,
    monthlyDepreciation: monthlyDep.toFixed(2),
    netBookValue: (price - parseFloat(current.accumulatedDepreciation ?? "0")).toFixed(2),
    updatedAt: new Date(),
  }).where(and(eq(fixedAssets.id, c.req.param("id")), eq(fixedAssets.orgId, orgId))).returning();

  return c.json({ data: row });
});

// DELETE /accounting/assets/:id (soft — set status to disposed)
accountingRouter.delete("/assets/:id", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db.update(fixedAssets).set({ status: "disposed", disposalDate: new Date().toISOString().slice(0, 10), updatedAt: new Date() })
    .where(and(eq(fixedAssets.id, c.req.param("id")), eq(fixedAssets.orgId, orgId))).returning({ id: fixedAssets.id });
  if (!row) return c.json({ error: "الأصل غير موجود" }, 404);
  return c.json({ success: true });
});

// POST /accounting/assets/depreciate-monthly — تشغيل الاستهلاك الشهري
accountingRouter.post("/assets/depreciate-monthly", async (c) => {
  const orgId = getOrgId(c);
  const today = new Date();
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const activeAssets = await db.select().from(fixedAssets)
    .where(and(eq(fixedAssets.orgId, orgId), eq(fixedAssets.status, "active")));

  let processed = 0;
  let skipped = 0;
  for (const asset of activeAssets) {
    if (!asset.monthlyDepreciation || parseFloat(asset.monthlyDepreciation) <= 0) { skipped++; continue; }
    const price = parseFloat(asset.purchasePrice ?? "0");
    const salvage = parseFloat(asset.salvageValue ?? "0");
    const accDep = parseFloat(asset.accumulatedDepreciation ?? "0");
    const maxDep = price - salvage;
    if (accDep >= maxDep) {
      await db.update(fixedAssets).set({ status: "fully_depreciated", updatedAt: new Date() }).where(eq(fixedAssets.id, asset.id));
      skipped++;
      continue;
    }
    const monthDep = Math.min(parseFloat(asset.monthlyDepreciation), maxDep - accDep);
    const newAccDep = accDep + monthDep;
    const newNBV = price - newAccDep;

    await db.insert(assetDepreciationEntries).values({
      orgId,
      assetId: asset.id,
      depreciationDate: `${monthStr}-01`,
      amount: monthDep.toFixed(2),
    });
    await db.update(fixedAssets).set({
      accumulatedDepreciation: newAccDep.toFixed(2),
      netBookValue: newNBV.toFixed(2),
      status: newNBV <= 0 ? "fully_depreciated" : "active",
      updatedAt: new Date(),
    }).where(eq(fixedAssets.id, asset.id));
    processed++;
  }
  return c.json({ data: { month: monthStr, processed, skipped } });
});

// ============================================================
// BUDGETS — الموازنات التقديرية
// ============================================================

accountingRouter.get("/budgets", async (c) => {
  const orgId = getOrgId(c);
  const rows = await db.select().from(budgets).where(eq(budgets.orgId, orgId)).orderBy(desc(budgets.periodEnd));
  return c.json({ data: rows });
});

accountingRouter.get("/budgets/:id", async (c) => {
  const orgId = getOrgId(c);
  const [budget] = await db.select().from(budgets).where(and(eq(budgets.id, c.req.param("id")), eq(budgets.orgId, orgId)));
  if (!budget) return c.json({ error: "الموازنة غير موجودة" }, 404);
  const lines = await db.select().from(budgetLines).where(eq(budgetLines.budgetId, budget.id)).orderBy(asc(budgetLines.month));
  return c.json({ data: { ...budget, lines } });
});

accountingRouter.post("/budgets", async (c) => {
  const orgId = getOrgId(c);
  const body = z.object({
    name: z.string().min(1),
    periodStart: z.string(),
    periodEnd: z.string(),
    notes: z.string().optional().nullable(),
  }).parse(await c.req.json());
  const [row] = await db.insert(budgets).values({ orgId, ...body, notes: body.notes ?? null, status: "draft", createdBy: getUserId(c) ?? null }).returning();
  return c.json({ data: row }, 201);
});

accountingRouter.patch("/budgets/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const [row] = await db.update(budgets).set({ ...body, updatedAt: new Date() })
    .where(and(eq(budgets.id, c.req.param("id")), eq(budgets.orgId, orgId))).returning();
  if (!row) return c.json({ error: "الموازنة غير موجودة" }, 404);
  return c.json({ data: row });
});

accountingRouter.post("/budgets/:id/activate", async (c) => {
  const orgId = getOrgId(c);
  const [row] = await db.update(budgets).set({ status: "active", updatedAt: new Date() })
    .where(and(eq(budgets.id, c.req.param("id")), eq(budgets.orgId, orgId))).returning();
  if (!row) return c.json({ error: "الموازنة غير موجودة" }, 404);
  return c.json({ data: row });
});

accountingRouter.post("/budgets/:id/lines", async (c) => {
  const orgId = getOrgId(c);
  const body = z.object({
    accountId: z.string().uuid().optional().nullable(),
    costCenterId: z.string().uuid().optional().nullable(),
    month: z.string(),                  // YYYY-MM-01
    budgetAmount: z.string().or(z.number()).transform(v => String(v)),
  }).parse(await c.req.json());
  const [line] = await db.insert(budgetLines).values({
    orgId,
    budgetId: c.req.param("id"),
    accountId: body.accountId ?? null,
    costCenterId: body.costCenterId ?? null,
    month: body.month,
    budgetAmount: body.budgetAmount,
    actualAmount: "0",
  }).returning();
  return c.json({ data: line }, 201);
});

accountingRouter.put("/budgets/:id/lines/:lineId", async (c) => {
  const body = await c.req.json();
  const [line] = await db.update(budgetLines).set({
    budgetAmount: body.budgetAmount !== undefined ? String(body.budgetAmount) : undefined,
    actualAmount: body.actualAmount !== undefined ? String(body.actualAmount) : undefined,
    updatedAt: new Date(),
  }).where(and(eq(budgetLines.id, c.req.param("lineId")), eq(budgetLines.budgetId, c.req.param("id")))).returning();
  if (!line) return c.json({ error: "السطر غير موجود" }, 404);
  return c.json({ data: line });
});
