import { Hono } from "hono";
import { eq, and, desc, asc, gte, lte, sql, count, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@nasaq/db/client";
import {
  treasuryAccounts,
  treasuryTransactions,
  treasuryTransfers,
  cashierShifts,
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import {
  postTreasuryTransfer,
  isAccountingEnabled,
} from "../lib/posting-engine";

export const treasuryRouter = new Hono();

// ============================================================
// HELPERS
// ============================================================

async function getOrgSettings(orgId: string): Promise<Record<string, any>> {
  const result = await db.execute(
    sql`SELECT settings FROM organizations WHERE id = ${orgId} LIMIT 1`
  );
  return (result.rows[0] as any)?.settings ?? {};
}

async function generateVoucherNumber(orgId: string, prefix: "RV" | "PV"): Promise<string> {
  const year = new Date().getFullYear();
  const [{ total }] = await db
    .select({ total: count() })
    .from(treasuryTransactions)
    .where(
      and(
        eq(treasuryTransactions.orgId, orgId),
        sql`${treasuryTransactions.voucherNumber} LIKE ${`${prefix}-${year}-%`}`
      )
    );
  const seq = (Number(total) + 1).toString().padStart(5, "0");
  return `${prefix}-${year}-${seq}`;
}

// ============================================================
// ACCOUNTS — الصناديق
// ============================================================

// GET /treasury/accounts
treasuryRouter.get("/accounts", async (c) => {
  const orgId = getOrgId(c);
  const type = c.req.query("type");
  const activeOnly = c.req.query("active") !== "false";

  const conditions = [eq(treasuryAccounts.orgId, orgId)];
  if (type) conditions.push(eq(treasuryAccounts.type, type as any));
  if (activeOnly) conditions.push(eq(treasuryAccounts.isActive, true));

  const accounts = await db
    .select()
    .from(treasuryAccounts)
    .where(and(...conditions))
    .orderBy(asc(treasuryAccounts.type), asc(treasuryAccounts.name));

  return c.json({ data: accounts });
});

// GET /treasury/accounts/summary
// ملخص: إجمالي الأرصدة مجمّعة حسب النوع
treasuryRouter.get("/accounts/summary", async (c) => {
  const orgId = getOrgId(c);

  const byType = await db
    .select({
      type: treasuryAccounts.type,
      count: count(),
      totalBalance: sum(treasuryAccounts.currentBalance),
    })
    .from(treasuryAccounts)
    .where(and(eq(treasuryAccounts.orgId, orgId), eq(treasuryAccounts.isActive, true)))
    .groupBy(treasuryAccounts.type);

  const [totalRow] = await db
    .select({ total: sum(treasuryAccounts.currentBalance) })
    .from(treasuryAccounts)
    .where(and(eq(treasuryAccounts.orgId, orgId), eq(treasuryAccounts.isActive, true)));

  return c.json({
    data: {
      byType,
      totalBalance: totalRow?.total ?? "0",
    },
  });
});

// GET /treasury/accounts/:id
treasuryRouter.get("/accounts/:id", async (c) => {
  const orgId = getOrgId(c);
  const [account] = await db
    .select()
    .from(treasuryAccounts)
    .where(and(eq(treasuryAccounts.id, c.req.param("id")), eq(treasuryAccounts.orgId, orgId)));

  if (!account) return c.json({ error: "الصندوق غير موجود" }, 404);
  return c.json({ data: account });
});

// POST /treasury/accounts
const createAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["main_cash", "branch_cash", "cashier_drawer", "petty_cash", "bank_account", "employee_custody"]),
  branchId: z.string().uuid().optional().nullable(),
  responsibleUserId: z.string().uuid().optional().nullable(),
  openingBalance: z.string().optional(),
  currency: z.string().optional(),
  accountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  glAccountId: z.string().uuid().optional().nullable(),
  isDefault: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

treasuryRouter.post("/accounts", async (c) => {
  const orgId = getOrgId(c);
  const body = createAccountSchema.parse(await c.req.json());
  const openingBalance = body.openingBalance ?? "0";

  const [account] = await db
    .insert(treasuryAccounts)
    .values({
      orgId,
      name: body.name,
      type: body.type,
      branchId: body.branchId ?? null,
      responsibleUserId: body.responsibleUserId ?? null,
      openingBalance,
      currentBalance: openingBalance,
      currency: body.currency ?? "SAR",
      accountNumber: body.accountNumber ?? null,
      bankName: body.bankName ?? null,
      iban: body.iban ?? null,
      glAccountId: body.glAccountId ?? null,
      isDefault: body.isDefault ?? false,
      notes: body.notes ?? null,
    })
    .returning();

  return c.json({ data: account }, 201);
});

// PATCH /treasury/accounts/:id
treasuryRouter.patch("/accounts/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = createAccountSchema.partial().parse(await c.req.json());

  const [updated] = await db
    .update(treasuryAccounts)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(treasuryAccounts.id, c.req.param("id")), eq(treasuryAccounts.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "الصندوق غير موجود" }, 404);
  return c.json({ data: updated });
});

// DELETE /treasury/accounts/:id (soft delete)
treasuryRouter.delete("/accounts/:id", async (c) => {
  const orgId = getOrgId(c);

  // تحقق من أن الرصيد صفر قبل الحذف
  const [account] = await db
    .select({ currentBalance: treasuryAccounts.currentBalance })
    .from(treasuryAccounts)
    .where(and(eq(treasuryAccounts.id, c.req.param("id")), eq(treasuryAccounts.orgId, orgId)));

  if (!account) return c.json({ error: "الصندوق غير موجود" }, 404);
  if (parseFloat(account.currentBalance ?? "0") !== 0) {
    return c.json({ error: "لا يمكن حذف صندوق برصيد غير صفري" }, 422);
  }

  await db
    .update(treasuryAccounts)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(treasuryAccounts.id, c.req.param("id")), eq(treasuryAccounts.orgId, orgId)));

  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "treasury_account", resourceId: c.req.param("id") });
  return c.json({ success: true });
});

// ============================================================
// TRANSACTIONS — حركات الصندوق
// ============================================================

// GET /treasury/accounts/:id/transactions
treasuryRouter.get("/accounts/:id/transactions", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset, page } = getPagination(c);
  const from = c.req.query("from");
  const to = c.req.query("to");
  const type = c.req.query("type");

  const conditions = [
    eq(treasuryTransactions.treasuryAccountId, c.req.param("id")),
    eq(treasuryTransactions.orgId, orgId),
  ];
  if (from) conditions.push(gte(treasuryTransactions.createdAt, new Date(from)));
  if (to) conditions.push(lte(treasuryTransactions.createdAt, new Date(to)));
  if (type) conditions.push(eq(treasuryTransactions.transactionType, type as any));

  const [transactions, [{ total }]] = await Promise.all([
    db.select().from(treasuryTransactions)
      .where(and(...conditions))
      .orderBy(desc(treasuryTransactions.createdAt))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(treasuryTransactions).where(and(...conditions)),
  ]);

  return c.json({
    data: transactions,
    pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
  });
});

// ============================================================
// RECEIPT VOUCHER — سند القبض
// POST /treasury/receipt
// ============================================================

const receiptSchema = z.object({
  treasuryAccountId: z.string().uuid(),
  amount: z.string().refine((v) => parseFloat(v) > 0, { message: "المبلغ يجب أن يكون أكبر من صفر" }),
  description: z.string().min(1),
  reference: z.string().optional().nullable(),
  sourceType: z.enum(["booking", "invoice", "expense", "pos", "transfer", "payroll", "manual"]).optional(),
  sourceId: z.string().uuid().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  counterpartyType: z.string().optional().nullable(),
  counterpartyId: z.string().uuid().optional().nullable(),
  counterpartyName: z.string().optional().nullable(),
  shiftId: z.string().uuid().optional().nullable(),
});

treasuryRouter.post("/receipt", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = receiptSchema.parse(await c.req.json());

  const amount = parseFloat(body.amount);
  const voucherNumber = await generateVoucherNumber(orgId, "RV");

  let notFound = false;
  const [transaction] = await db.transaction(async (tx) => {
    // قراءة الرصيد مع قفل FOR UPDATE داخل المعاملة — يمنع TOCTOU
    const result = await tx.execute(
      sql`SELECT id, current_balance FROM treasury_accounts WHERE id = ${body.treasuryAccountId} AND org_id = ${orgId} FOR UPDATE`
    );
    const account = result.rows[0] as { id: string; current_balance: string } | undefined;
    if (!account) { notFound = true; return []; }

    const newBalance = parseFloat(account.current_balance ?? "0") + amount;

    await tx
      .update(treasuryAccounts)
      .set({ currentBalance: String(newBalance), updatedAt: new Date() })
      .where(eq(treasuryAccounts.id, body.treasuryAccountId));

    return tx
      .insert(treasuryTransactions)
      .values({
        orgId,
        treasuryAccountId: body.treasuryAccountId,
        transactionType: "receipt",
        amount: body.amount,
        balanceAfter: String(newBalance),
        description: body.description,
        reference: body.reference ?? null,
        voucherNumber,
        sourceType: body.sourceType ?? null,
        sourceId: body.sourceId ?? null,
        paymentMethod: body.paymentMethod ?? null,
        counterpartyType: body.counterpartyType ?? null,
        counterpartyId: body.counterpartyId ?? null,
        counterpartyName: body.counterpartyName ?? null,
        shiftId: body.shiftId ?? null,
        createdBy: userId ?? null,
      })
      .returning();
  });

  if (notFound) return c.json({ error: "الصندوق غير موجود" }, 404);
  return c.json({ data: transaction, voucherNumber }, 201);
});

// ============================================================
// PAYMENT VOUCHER — سند الصرف
// POST /treasury/payment
// ============================================================

const paymentSchema = receiptSchema.extend({
  // نفس بنية سند القبض لكن مع التحقق من كفاية الرصيد
});

treasuryRouter.post("/payment", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = paymentSchema.parse(await c.req.json());

  const amount = parseFloat(body.amount);
  const voucherNumber = await generateVoucherNumber(orgId, "PV");

  let notFound = false;
  let insufficientBalance = false;
  let currentBalance = 0;

  const [transaction] = await db.transaction(async (tx) => {
    // قراءة الرصيد مع قفل FOR UPDATE داخل المعاملة — يمنع TOCTOU والسلبي
    const result = await tx.execute(
      sql`SELECT id, current_balance FROM treasury_accounts WHERE id = ${body.treasuryAccountId} AND org_id = ${orgId} FOR UPDATE`
    );
    const account = result.rows[0] as { id: string; current_balance: string } | undefined;
    if (!account) { notFound = true; return []; }

    currentBalance = parseFloat(account.current_balance ?? "0");
    if (currentBalance < amount) { insufficientBalance = true; return []; }

    const newBalance = currentBalance - amount;

    await tx
      .update(treasuryAccounts)
      .set({ currentBalance: String(newBalance), updatedAt: new Date() })
      .where(eq(treasuryAccounts.id, body.treasuryAccountId));

    return tx
      .insert(treasuryTransactions)
      .values({
        orgId,
        treasuryAccountId: body.treasuryAccountId,
        transactionType: "payment",
        amount: body.amount,
        balanceAfter: String(newBalance),
        description: body.description,
        reference: body.reference ?? null,
        voucherNumber,
        sourceType: body.sourceType ?? null,
        sourceId: body.sourceId ?? null,
        paymentMethod: body.paymentMethod ?? null,
        counterpartyType: body.counterpartyType ?? null,
        counterpartyId: body.counterpartyId ?? null,
        counterpartyName: body.counterpartyName ?? null,
        shiftId: body.shiftId ?? null,
        createdBy: userId ?? null,
      })
      .returning();
  });

  if (notFound) return c.json({ error: "الصندوق غير موجود" }, 404);
  if (insufficientBalance) return c.json({ error: "رصيد الصندوق غير كافٍ", currentBalance, requested: amount }, 422);
  return c.json({ data: transaction, voucherNumber }, 201);
});

// ============================================================
// TRANSFERS — تحويلات بين الصناديق
// ============================================================

// POST /treasury/transfer
const transferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.string().refine((v) => parseFloat(v) > 0),
  description: z.string().optional(),
  transferDate: z.string().optional(),
});

treasuryRouter.post("/transfer", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = transferSchema.parse(await c.req.json());
  const amount = parseFloat(body.amount);
  const transferDate = body.transferDate ? new Date(body.transferDate) : new Date();

  if (body.fromAccountId === body.toAccountId) {
    return c.json({ error: "لا يمكن التحويل من صندوق إلى نفسه" }, 422);
  }

  // جلب الصندوقين
  const [fromAccount, toAccount] = await Promise.all([
    db.select().from(treasuryAccounts)
      .where(and(eq(treasuryAccounts.id, body.fromAccountId), eq(treasuryAccounts.orgId, orgId)))
      .then((r) => r[0]),
    db.select().from(treasuryAccounts)
      .where(and(eq(treasuryAccounts.id, body.toAccountId), eq(treasuryAccounts.orgId, orgId)))
      .then((r) => r[0]),
  ]);

  if (!fromAccount) return c.json({ error: "الصندوق المحوِّل غير موجود" }, 404);
  if (!toAccount) return c.json({ error: "الصندوق المستقبِل غير موجود" }, 404);

  const fromBalance = parseFloat(fromAccount.currentBalance ?? "0");
  if (fromBalance < amount) {
    return c.json({ error: "رصيد الصندوق المحوِّل غير كافٍ", currentBalance: fromBalance }, 422);
  }

  const newFromBalance = fromBalance - amount;
  const newToBalance = parseFloat(toAccount.currentBalance ?? "0") + amount;
  const description = body.description || `تحويل من ${fromAccount.name} إلى ${toAccount.name}`;

  const transfer = await db.transaction(async (tx) => {
    // تحديث الأرصدة
    await Promise.all([
      tx.update(treasuryAccounts)
        .set({ currentBalance: String(newFromBalance), updatedAt: new Date() })
        .where(eq(treasuryAccounts.id, body.fromAccountId)),
      tx.update(treasuryAccounts)
        .set({ currentBalance: String(newToBalance), updatedAt: new Date() })
        .where(eq(treasuryAccounts.id, body.toAccountId)),
    ]);

    // إنشاء حركتي الصرف والقبض
    const [outTx] = await tx
      .insert(treasuryTransactions)
      .values({
        orgId,
        treasuryAccountId: body.fromAccountId,
        transactionType: "transfer_out",
        amount: body.amount,
        balanceAfter: String(newFromBalance),
        description,
        sourceType: "transfer",
        createdBy: userId ?? null,
      })
      .returning();

    const [inTx] = await tx
      .insert(treasuryTransactions)
      .values({
        orgId,
        treasuryAccountId: body.toAccountId,
        transactionType: "transfer_in",
        amount: body.amount,
        balanceAfter: String(newToBalance),
        description,
        sourceType: "transfer",
        createdBy: userId ?? null,
      })
      .returning();

    // سجل التحويل
    const [transferRecord] = await tx
      .insert(treasuryTransfers)
      .values({
        orgId,
        fromAccountId: body.fromAccountId,
        toAccountId: body.toAccountId,
        amount: body.amount,
        description,
        transferDate,
        status: "completed",
        fromTransactionId: outTx.id,
        toTransactionId: inTx.id,
        approvedBy: userId ?? null,
        approvedAt: new Date(),
        createdBy: userId ?? null,
      })
      .returning();

    return transferRecord;
  });

  // ترحيل محاسبي إذا كانت المنشأة مفعّلة
  if (fromAccount.glAccountId && toAccount.glAccountId) {
    const settings = await getOrgSettings(orgId);
    if (isAccountingEnabled(settings)) {
      await postTreasuryTransfer({
        orgId,
        date: transferDate,
        amount,
        fromAccountId: fromAccount.glAccountId,
        toAccountId: toAccount.glAccountId,
        description,
        sourceId: transfer.id,
        createdBy: userId ?? undefined,
      }).catch(() => {/* لا نوقف العملية إذا فشل الترحيل */});
    }
  }

  return c.json({ data: transfer }, 201);
});

// GET /treasury/transfers
treasuryRouter.get("/transfers", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset, page } = getPagination(c);

  const [transfers, [{ total }]] = await Promise.all([
    db.select().from(treasuryTransfers)
      .where(eq(treasuryTransfers.orgId, orgId))
      .orderBy(desc(treasuryTransfers.createdAt))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(treasuryTransfers)
      .where(eq(treasuryTransfers.orgId, orgId)),
  ]);

  return c.json({
    data: transfers,
    pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
  });
});

// ============================================================
// CASHIER SHIFTS — وردية الكاشير
// ============================================================

// GET /treasury/shifts — وردية الكاشير الحالية
treasuryRouter.get("/shifts", async (c) => {
  const orgId = getOrgId(c);
  const accountId = c.req.query("accountId");
  const status = c.req.query("status");
  const { limit, offset, page } = getPagination(c);

  const conditions = [eq(cashierShifts.orgId, orgId)];
  if (accountId) conditions.push(eq(cashierShifts.treasuryAccountId, accountId));
  if (status) conditions.push(eq(cashierShifts.status, status as any));

  const [shifts, [{ total }]] = await Promise.all([
    db.select().from(cashierShifts)
      .where(and(...conditions))
      .orderBy(desc(cashierShifts.openedAt))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(cashierShifts).where(and(...conditions)),
  ]);

  return c.json({
    data: shifts,
    pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
  });
});

// POST /treasury/shifts/open — فتح وردية
treasuryRouter.post("/shifts/open", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = z.object({
    treasuryAccountId: z.string().uuid(),
    openingBalance: z.string().optional(),
    notes: z.string().optional().nullable(),
  }).parse(await c.req.json());

  // تحقق من عدم وجود وردية مفتوحة لنفس الصندوق
  const [existing] = await db
    .select({ id: cashierShifts.id })
    .from(cashierShifts)
    .where(
      and(
        eq(cashierShifts.treasuryAccountId, body.treasuryAccountId),
        eq(cashierShifts.status, "open"),
        eq(cashierShifts.orgId, orgId)
      )
    );

  if (existing) {
    return c.json({ error: "يوجد وردية مفتوحة بالفعل لهذا الصندوق", shiftId: existing.id }, 422);
  }

  // جلب رصيد الصندوق الحالي كرصيد افتتاحي
  const [account] = await db
    .select({ currentBalance: treasuryAccounts.currentBalance })
    .from(treasuryAccounts)
    .where(and(eq(treasuryAccounts.id, body.treasuryAccountId), eq(treasuryAccounts.orgId, orgId)));

  if (!account) return c.json({ error: "الصندوق غير موجود" }, 404);

  const openingBalance = body.openingBalance ?? account.currentBalance ?? "0";

  const [shift] = await db
    .insert(cashierShifts)
    .values({
      orgId,
      treasuryAccountId: body.treasuryAccountId,
      cashierId: userId!,
      openingBalance,
      status: "open",
      notes: body.notes ?? null,
    })
    .returning();

  return c.json({ data: shift }, 201);
});

// POST /treasury/shifts/:id/close — إغلاق وردية
treasuryRouter.post("/shifts/:id/close", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const body = z.object({
    actualCash: z.string(),
    notes: z.string().optional().nullable(),
  }).parse(await c.req.json());

  const [shift] = await db
    .select()
    .from(cashierShifts)
    .where(and(eq(cashierShifts.id, c.req.param("id")), eq(cashierShifts.orgId, orgId)));

  if (!shift) return c.json({ error: "الوردية غير موجودة" }, 404);
  if (shift.status !== "open") return c.json({ error: "الوردية مُغلقة بالفعل" }, 422);

  // احسب الرصيد الختامي من الحركات
  const [txSum] = await db
    .select({
      totalIn: sum(
        sql`CASE WHEN ${treasuryTransactions.transactionType} IN ('receipt','transfer_in','opening') THEN ${treasuryTransactions.amount}::numeric ELSE 0 END`
      ),
      totalOut: sum(
        sql`CASE WHEN ${treasuryTransactions.transactionType} IN ('payment','transfer_out','closing') THEN ${treasuryTransactions.amount}::numeric ELSE 0 END`
      ),
    })
    .from(treasuryTransactions)
    .where(
      and(
        eq(treasuryTransactions.shiftId, shift.id),
        eq(treasuryTransactions.orgId, orgId)
      )
    );

  const closingBalance =
    parseFloat(shift.openingBalance ?? "0") +
    parseFloat(txSum.totalIn ?? "0") -
    parseFloat(txSum.totalOut ?? "0");

  const actualCash = parseFloat(body.actualCash);
  const variance = actualCash - closingBalance;

  const [closed] = await db
    .update(cashierShifts)
    .set({
      status: "closed",
      closingBalance: String(closingBalance),
      actualCash: body.actualCash,
      variance: String(variance),
      closedAt: new Date(),
      closedBy: userId ?? null,
      notes: body.notes ?? shift.notes,
    })
    .where(eq(cashierShifts.id, shift.id))
    .returning();

  return c.json({ data: closed, variance, closingBalance });
});

// ============================================================
// REPORTS
// ============================================================

// GET /treasury/reports/daily?date=2026-03-22&accountId=xxx
treasuryRouter.get("/reports/daily", async (c) => {
  const orgId = getOrgId(c);
  const date = c.req.query("date") || new Date().toISOString().split("T")[0];
  const accountId = c.req.query("accountId");

  const conditions = [
    eq(treasuryTransactions.orgId, orgId),
    sql`${treasuryTransactions.createdAt}::date = ${date}`,
  ];
  if (accountId) conditions.push(eq(treasuryTransactions.treasuryAccountId, accountId));

  const [stats] = await db
    .select({
      totalReceipts: sum(
        sql`CASE WHEN ${treasuryTransactions.transactionType} IN ('receipt','transfer_in') THEN ${treasuryTransactions.amount}::numeric ELSE 0 END`
      ),
      totalPayments: sum(
        sql`CASE WHEN ${treasuryTransactions.transactionType} IN ('payment','transfer_out') THEN ${treasuryTransactions.amount}::numeric ELSE 0 END`
      ),
      transactionCount: count(),
    })
    .from(treasuryTransactions)
    .where(and(...conditions));

  const transactions = await db
    .select()
    .from(treasuryTransactions)
    .where(and(...conditions))
    .orderBy(desc(treasuryTransactions.createdAt));

  const receipts = parseFloat(stats.totalReceipts ?? "0");
  const payments = parseFloat(stats.totalPayments ?? "0");

  return c.json({
    data: {
      date,
      totalReceipts: receipts,
      totalPayments: payments,
      netFlow: receipts - payments,
      transactionCount: Number(stats.transactionCount),
      transactions,
    },
  });
});

// GET /treasury/reports/cashflow?months=6
treasuryRouter.get("/reports/cashflow", async (c) => {
  const orgId = getOrgId(c);
  const months = Math.min(24, parseInt(c.req.query("months") || "6"));

  const rows = await db.execute(sql`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') AS month,
      COALESCE(SUM(amount) FILTER (WHERE transaction_type IN ('receipt','transfer_in')), 0) AS total_in,
      COALESCE(SUM(amount) FILTER (WHERE transaction_type IN ('payment','transfer_out')), 0) AS total_out
    FROM treasury_transactions
    WHERE org_id = ${orgId}
      AND created_at >= NOW() - INTERVAL '1 month' * ${months}
    GROUP BY month
    ORDER BY month ASC
  `);

  return c.json({ data: rows.rows });
});
