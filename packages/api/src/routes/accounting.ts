import { Hono } from "hono";
import { eq, and, desc, asc, sql, count, sum, isNull, isNotNull, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  accountingPeriods,
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import {
  createJournalEntry,
  reverseJournalEntry,
  postPeriodClosingEntries,
  type JournalLineInput,
} from "../lib/posting-engine";
import { logAuditEvent } from "./audit-log";

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

  return c.json({ success: true });
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

// POST /accounting/periods/:id/close — إغلاق فترة
accountingRouter.post("/periods/:id/close", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);

  const [period] = await db
    .select()
    .from(accountingPeriods)
    .where(and(eq(accountingPeriods.id, c.req.param("id")), eq(accountingPeriods.orgId, orgId)));

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
    .where(and(eq(accountingPeriods.id, c.req.param("id")), eq(accountingPeriods.orgId, orgId)));

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
    .where(and(eq(accountingPeriods.id, c.req.param("id")), eq(accountingPeriods.orgId, orgId)));

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
    .where(and(eq(journalEntries.id, c.req.param("id")), eq(journalEntries.orgId, orgId)));

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

// POST /accounting/journal-entries/:id/post — ترحيل قيد مسودة
accountingRouter.post("/journal-entries/:id/post", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);

  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, c.req.param("id")), eq(journalEntries.orgId, orgId)));

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

// POST /accounting/journal-entries/:id/reverse — عكس قيد
accountingRouter.post("/journal-entries/:id/reverse", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = z.object({ reason: z.string().optional() }).optional().parse(
    await c.req.json().catch(() => ({}))
  );

  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, c.req.param("id")), eq(journalEntries.orgId, orgId)));

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
