import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, gte, lte, count, sql, or, isNull, isNotNull, lt, gt } from "drizzle-orm";
import { db, pool } from "@nasaq/db/client";
import {
  properties,
  propertyUnits,
  tenants,
  leaseContracts,
  leaseInvoices,
  leasePayments,
  propertyExpenses,
  propertyMaintenance,
  propertyInspections,
  leaseReminders,
  customers,
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { apiErr } from "../lib/errors";

export const propertyRouter = new Hono();

// ============================================================
// SCHEMAS
// ============================================================

const propertySchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  totalUnits: z.number().int().optional().default(0),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const unitSchema = z.object({
  propertyId: z.string().uuid(),
  unitNumber: z.string(),
  floor: z.number().int().optional().nullable(),
  type: z.string().optional().nullable(),
  areaSqm: z.string().optional().nullable(),
  monthlyRent: z.string().optional().nullable(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const tenantSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  name: z.string().optional(),
  phone: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const contractSchema = z.object({
  propertyId: z.string().uuid(),
  unitId: z.string().uuid(),
  tenantId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  rentAmount: z.string(),
  depositAmount: z.string().optional().nullable(),
  paymentFrequency: z.string().optional(),
  paymentDay: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  ejarContractNumber: z.string().optional().nullable(),
  ejarStatus: z.string().optional().nullable(),
});

const invoicePaySchema = z.object({
  amount: z.string(),
  method: z.string().optional(),
  paymentSource: z.string().optional(),
  notes: z.string().optional().nullable(),
});

const expenseSchema = z.object({
  propertyId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  category: z.string(),
  description: z.string().optional().nullable(),
  amount: z.string(),
  date: z.string(),
  vendor: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const maintenanceSchema = z.object({
  propertyId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  tenantId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  category: z.string().optional(),
  title: z.string(),
  description: z.string().optional().nullable(),
  priority: z.string().optional(),
  reportedBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const inspectionSchema = z.object({
  propertyId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  type: z.string(),
  inspectionDate: z.string(),
  inspector: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.unknown()).optional(),
});

// ============================================================
// DASHBOARD
// ============================================================

propertyRouter.get("/dashboard", async (c) => {
  try {
    const orgId = getOrgId(c);
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [unitStats] = await db.select({
      total: count(propertyUnits.id),
      occupied: sql<number>`COUNT(CASE WHEN ${propertyUnits.status} = 'occupied' THEN 1 END)`,
      vacant: sql<number>`COUNT(CASE WHEN ${propertyUnits.status} = 'vacant' THEN 1 END)`,
      maintenance: sql<number>`COUNT(CASE WHEN ${propertyUnits.status} = 'maintenance' THEN 1 END)`,
    }).from(propertyUnits).where(and(eq(propertyUnits.orgId, orgId), eq(propertyUnits.isActive, true)));

    const totalUnits = Number(unitStats.total);
    const occupied = Number(unitStats.occupied);
    const vacant = Number(unitStats.vacant);
    const maintenanceUnits = Number(unitStats.maintenance);
    const occupancyRate = totalUnits > 0 ? ((occupied / totalUnits) * 100).toFixed(1) : "0.0";

    const [propCount] = await db.select({ total: count(properties.id) })
      .from(properties).where(and(eq(properties.orgId, orgId), eq(properties.isActive, true)));

    const [revenue] = await db.select({
      total: sql<string>`COALESCE(SUM(${leaseInvoices.paidAmount}), 0)`,
    }).from(leaseInvoices).where(and(
      eq(leaseInvoices.orgId, orgId),
      gte(leaseInvoices.periodStart, firstOfMonth.toISOString().split("T")[0]),
      lte(leaseInvoices.periodStart, lastOfMonth.toISOString().split("T")[0]),
    ));

    const [expenses] = await db.select({
      total: sql<string>`COALESCE(SUM(${propertyExpenses.amount}), 0)`,
    }).from(propertyExpenses).where(and(
      eq(propertyExpenses.orgId, orgId),
      gte(propertyExpenses.paidAt, firstOfMonth.toISOString().split("T")[0]),
      lte(propertyExpenses.paidAt, lastOfMonth.toISOString().split("T")[0]),
    ));

    const [overdueRow] = await db.select({
      cnt: count(leaseInvoices.id),
      total: sql<string>`COALESCE(SUM(${leaseInvoices.totalAmount} - ${leaseInvoices.paidAmount}), 0)`,
    }).from(leaseInvoices).where(and(
      eq(leaseInvoices.orgId, orgId),
      sql`${leaseInvoices.status} IN ('overdue', 'partial')`,
      lt(leaseInvoices.dueDate, now.toISOString().split("T")[0]),
    ));

    const today = now;
    const in30 = new Date(today); in30.setDate(today.getDate() + 30);
    const in60 = new Date(today); in60.setDate(today.getDate() + 60);

    const [exp30] = await db.select({ cnt: count(leaseContracts.id) })
      .from(leaseContracts).where(and(
        eq(leaseContracts.orgId, orgId),
        eq(leaseContracts.status, "active"),
        lte(leaseContracts.endDate, in30.toISOString().split("T")[0]),
        gte(leaseContracts.endDate, today.toISOString().split("T")[0]),
      ));

    const [exp60] = await db.select({ cnt: count(leaseContracts.id) })
      .from(leaseContracts).where(and(
        eq(leaseContracts.orgId, orgId),
        eq(leaseContracts.status, "active"),
        lte(leaseContracts.endDate, in60.toISOString().split("T")[0]),
        gte(leaseContracts.endDate, today.toISOString().split("T")[0]),
      ));

    const [openMaint] = await db.select({
      cnt: count(propertyMaintenance.id),
      urgent: sql<number>`COUNT(CASE WHEN ${propertyMaintenance.priority} = 'urgent' THEN 1 END)`,
    }).from(propertyMaintenance).where(and(
      eq(propertyMaintenance.orgId, orgId),
      sql`${propertyMaintenance.status} IN ('pending', 'assigned', 'approved', 'in_progress')`,
    ));

    const [undocEjar] = await db.select({ cnt: count(leaseContracts.id) })
      .from(leaseContracts).where(and(
        eq(leaseContracts.orgId, orgId),
        eq(leaseContracts.status, "active"),
        isNull(leaseContracts.ejarContractNumber),
      ));

    // Revenue chart — last 6 months
    const revenueChart = await pool.query<{ month: string; revenue: string; expenses: string; net: string }>(`
      SELECT
        TO_CHAR(gs, 'YYYY-MM') AS month,
        COALESCE((
          SELECT SUM(paid_amount) FROM lease_invoices
          WHERE org_id = $1 AND TO_CHAR(period_start, 'YYYY-MM') = TO_CHAR(gs, 'YYYY-MM')
        ), 0)::text AS revenue,
        COALESCE((
          SELECT SUM(amount) FROM property_expenses
          WHERE org_id = $1 AND TO_CHAR(date, 'YYYY-MM') = TO_CHAR(gs, 'YYYY-MM')
        ), 0)::text AS expenses,
        (
          COALESCE((SELECT SUM(paid_amount) FROM lease_invoices WHERE org_id = $1 AND TO_CHAR(period_start, 'YYYY-MM') = TO_CHAR(gs, 'YYYY-MM')), 0) -
          COALESCE((SELECT SUM(amount) FROM property_expenses WHERE org_id = $1 AND TO_CHAR(date, 'YYYY-MM') = TO_CHAR(gs, 'YYYY-MM')), 0)
        )::text AS net
      FROM generate_series(
        date_trunc('month', NOW() - INTERVAL '5 months'),
        date_trunc('month', NOW()),
        '1 month'::interval
      ) gs
      ORDER BY gs ASC
    `, [orgId]);

    // Top expense categories
    const topExpenses = await pool.query<{ category: string; total: string }>(`
      SELECT category, SUM(amount)::text AS total
      FROM property_expenses
      WHERE org_id = $1
        AND date >= date_trunc('month', NOW() - INTERVAL '2 months')
      GROUP BY category
      ORDER BY total DESC
      LIMIT 5
    `, [orgId]);

    // Recent payments
    const recentPayments = await db.select().from(leasePayments)
      .where(eq(leasePayments.orgId, orgId))
      .orderBy(desc(leasePayments.createdAt))
      .limit(10);

    const monthlyRevenue = revenue.total?.toString() || "0";
    const monthlyExpenses = expenses.total?.toString() || "0";
    const netIncome = (parseFloat(monthlyRevenue) - parseFloat(monthlyExpenses)).toFixed(2);

    return c.json({
      data: {
        totalProperties: Number(propCount.total),
        totalUnits,
        occupancyRate,
        vacantUnits: vacant,
        maintenanceUnits,
        monthlyRevenue,
        monthlyExpenses,
        netIncome,
        overdueInvoices: {
          count: Number(overdueRow.cnt),
          totalAmount: overdueRow.total?.toString() || "0",
        },
        expiringContracts: {
          count: Number(exp60.cnt),
          within30days: Number(exp30.cnt),
          within60days: Number(exp60.cnt),
        },
        openMaintenanceTickets: {
          count: Number(openMaint.cnt),
          urgent: Number(openMaint.urgent),
        },
        undocumentedEjarContracts: { count: Number(undocEjar.cnt) },
        revenueChart: revenueChart.rows,
        occupancyTrend: [],
        topExpenseCategories: topExpenses.rows,
        recentPayments,
        alerts: [],
      },
    });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

// ============================================================
// PROPERTIES
// ============================================================

propertyRouter.get("/properties", async (c) => {
  try {
    const orgId = getOrgId(c);
    const rows = await db.select().from(properties)
      .where(and(eq(properties.orgId, orgId), eq(properties.isActive, true)))
      .orderBy(asc(properties.name));

    // Attach unit occupancy stats
    const enriched = await Promise.all(rows.map(async (prop) => {
      const [stats] = await db.select({
        totalUnits: count(propertyUnits.id),
        occupiedUnits: sql<number>`COUNT(CASE WHEN ${propertyUnits.status} = 'occupied' THEN 1 END)`,
      }).from(propertyUnits).where(and(
        eq(propertyUnits.orgId, orgId),
        eq(propertyUnits.propertyId, prop.id),
        eq(propertyUnits.isActive, true),
      ));
      const total = Number(stats.totalUnits);
      const occupied = Number(stats.occupiedUnits);
      const vacancyRate = total > 0 ? (((total - occupied) / total) * 100).toFixed(1) : "0.0";
      return { ...prop, totalUnits: total, occupiedUnits: occupied, vacancyRate };
    }));

    return c.json({ data: enriched });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/properties/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const id = c.req.param("id");
    const [prop] = await db.select().from(properties)
      .where(and(eq(properties.id, id), eq(properties.orgId, orgId)));
    if (!prop) return c.json({ error: "العقار غير موجود" }, 404);

    const units = await db.select().from(propertyUnits)
      .where(and(eq(propertyUnits.propertyId, id), eq(propertyUnits.orgId, orgId)))
      .orderBy(asc(propertyUnits.unitNumber));

    const activeContracts = await db.select().from(leaseContracts)
      .where(and(
        eq(leaseContracts.propertyId, id),
        eq(leaseContracts.orgId, orgId),
        eq(leaseContracts.status, "active"),
      ));

    const [expenseSummary] = await db.select({
      total: sql<string>`COALESCE(SUM(${propertyExpenses.amount}), 0)`,
    }).from(propertyExpenses).where(and(
      eq(propertyExpenses.propertyId, id),
      eq(propertyExpenses.orgId, orgId),
    ));

    return c.json({ data: { ...prop, units, activeContracts, expensesTotal: expenseSummary.total } });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/properties", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = propertySchema.parse(await c.req.json());
    const [prop] = await db.insert(properties).values({
      orgId,
      ...body,
    } as any).returning();
    return c.json({ data: prop }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.put("/properties/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = propertySchema.partial().parse(await c.req.json());
    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
    const [updated] = await db.update(properties).set(updates)
      .where(and(eq(properties.id, c.req.param("id")), eq(properties.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "العقار غير موجود" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.delete("/properties/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const [updated] = await db.update(properties)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(properties.id, c.req.param("id")), eq(properties.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "العقار غير موجود" }, 404);
    insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "property", resourceId: updated.id });
    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

// ============================================================
// UNITS
// ============================================================

propertyRouter.get("/units/vacant", async (c) => {
  try {
    const orgId = getOrgId(c);
    const rows = await db.select().from(propertyUnits)
      .where(and(
        eq(propertyUnits.orgId, orgId),
        eq(propertyUnits.status, "vacant"),
        eq(propertyUnits.isActive, true),
      ))
      .orderBy(asc(propertyUnits.unitNumber));
    return c.json({ data: rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/units", async (c) => {
  try {
    const orgId = getOrgId(c);
    const status = c.req.query("status");
    const type = c.req.query("type");
    const propertyId = c.req.query("propertyId");
    const minRent = c.req.query("minRent");
    const maxRent = c.req.query("maxRent");
    const conditions: any[] = [eq(propertyUnits.orgId, orgId), eq(propertyUnits.isActive, true)];
    if (status) conditions.push(eq(propertyUnits.status, status as any));
    if (type) conditions.push(eq(propertyUnits.type, type as any));
    if (propertyId) conditions.push(eq(propertyUnits.propertyId, propertyId));
    if (minRent) conditions.push(gte(propertyUnits.monthlyRent, minRent));
    if (maxRent) conditions.push(lte(propertyUnits.monthlyRent, maxRent));
    const rows = await db.select().from(propertyUnits)
      .where(and(...conditions))
      .orderBy(asc(propertyUnits.unitNumber));
    return c.json({ data: rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/units/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const id = c.req.param("id");
    const [unit] = await db.select().from(propertyUnits)
      .where(and(eq(propertyUnits.id, id), eq(propertyUnits.orgId, orgId)));
    if (!unit) return c.json({ error: "الوحدة غير موجودة" }, 404);

    const [currentContract] = await db.select().from(leaseContracts)
      .where(and(
        eq(leaseContracts.unitId, id),
        eq(leaseContracts.orgId, orgId),
        eq(leaseContracts.status, "active"),
      )).limit(1);

    const maintenanceTickets = await db.select().from(propertyMaintenance)
      .where(and(eq(propertyMaintenance.unitId, id), eq(propertyMaintenance.orgId, orgId)))
      .orderBy(desc(propertyMaintenance.createdAt)).limit(10);

    return c.json({ data: { ...unit, currentContract: currentContract || null, maintenanceTickets } });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/units", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = unitSchema.parse(await c.req.json());
    const [unit] = await db.insert(propertyUnits).values({ orgId, ...body } as any).returning();
    return c.json({ data: unit }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.put("/units/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = unitSchema.partial().parse(await c.req.json());
    const [updated] = await db.update(propertyUnits).set({  ...body, updatedAt: new Date() } as any)
      .where(and(eq(propertyUnits.id, c.req.param("id")), eq(propertyUnits.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "الوحدة غير موجودة" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.patch("/units/:id/status", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { status } = await c.req.json();
    const [updated] = await db.update(propertyUnits).set({ status, updatedAt: new Date() })
      .where(and(eq(propertyUnits.id, c.req.param("id")), eq(propertyUnits.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "الوحدة غير موجودة" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/units/bulk", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { propertyId, units } = await c.req.json();
    if (!propertyId || !Array.isArray(units) || units.length === 0) {
      return c.json({ error: "propertyId و units مطلوبان" }, 400);
    }
    const rows = units.map((u: any) => ({ orgId, propertyId, ...u }));
    const created = await db.insert(propertyUnits).values(rows).returning();
    return c.json({ data: created }, 201);
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

// ============================================================
// TENANTS
// ============================================================

propertyRouter.get("/tenants", async (c) => {
  try {
    const orgId = getOrgId(c);
    const search = c.req.query("search");
    const { limit, offset, page } = getPagination(c);

    let rows;
    if (search) {
      rows = await pool.query<any>(`
        SELECT t.*, c.name AS customer_name, c.phone AS customer_phone, c.national_id AS customer_national_id
        FROM tenants t
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.org_id = $1
          AND t.is_active = true
          AND (
            c.name ILIKE $2 OR c.phone ILIKE $2 OR c.national_id ILIKE $2
            OR t.name ILIKE $2 OR t.phone ILIKE $2 OR t.national_id ILIKE $2
          )
        ORDER BY t.created_at DESC
        LIMIT $3 OFFSET $4
      `, [orgId, `%${search}%`, limit, offset]);
      rows = rows.rows;
    } else {
      rows = await db.select().from(tenants)
        .where(and(eq(tenants.orgId, orgId), eq(tenants.isActive, true)))
        .orderBy(desc(tenants.createdAt))
        .limit(limit).offset(offset);
    }
    return c.json({ data: rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/tenants/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const id = c.req.param("id");
    const [tenant] = await db.select().from(tenants)
      .where(and(eq(tenants.id, id), eq(tenants.orgId, orgId)));
    if (!tenant) return c.json({ error: "المستأجر غير موجود" }, 404);

    const contracts = await db.select().from(leaseContracts)
      .where(and(eq(leaseContracts.tenantId, id), eq(leaseContracts.orgId, orgId)))
      .orderBy(desc(leaseContracts.startDate));

    const tenantContractIds = contracts.map((c: any) => c.id);
    const payments = tenantContractIds.length > 0
      ? await pool.query(
          `SELECT lp.* FROM lease_payments lp WHERE lp.org_id = $1 AND lp.contract_id = ANY($2) ORDER BY lp.created_at DESC LIMIT 20`,
          [orgId, tenantContractIds]
        ).then(r => r.rows)
      : [];

    const maintenanceRequests = tenantContractIds.length > 0
      ? await pool.query(
          `SELECT pm.* FROM property_maintenance pm WHERE pm.org_id = $1 AND pm.contract_id = ANY($2) ORDER BY pm.created_at DESC LIMIT 10`,
          [orgId, tenantContractIds]
        ).then(r => r.rows)
      : [];

    return c.json({ data: { ...tenant, contracts, payments, maintenanceRequests } });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/tenants", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = tenantSchema.parse(await c.req.json());
    const [tenant] = await db.insert(tenants).values({ orgId, ...body } as any).returning();
    return c.json({ data: tenant }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.put("/tenants/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = tenantSchema.partial().parse(await c.req.json());
    const [updated] = await db.update(tenants).set({  ...body, updatedAt: new Date() } as any)
      .where(and(eq(tenants.id, c.req.param("id")), eq(tenants.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "المستأجر غير موجود" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

// ============================================================
// CONTRACTS
// ============================================================

propertyRouter.get("/contracts/expiring", async (c) => {
  try {
    const orgId = getOrgId(c);
    const days = parseInt(c.req.query("days") || "60");
    const future = new Date(); future.setDate(future.getDate() + days);
    const rows = await db.select().from(leaseContracts)
      .where(and(
        eq(leaseContracts.orgId, orgId),
        eq(leaseContracts.status, "active"),
        lte(leaseContracts.endDate, future.toISOString().split("T")[0]),
        gte(leaseContracts.endDate, new Date().toISOString().split("T")[0]),
      ))
      .orderBy(asc(leaseContracts.endDate));
    return c.json({ data: rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/contracts", async (c) => {
  try {
    const orgId = getOrgId(c);
    const status = c.req.query("status");
    const propertyId = c.req.query("propertyId");
    const unitId = c.req.query("unitId");
    const expiringIn = c.req.query("expiringIn");
    const conditions: any[] = [eq(leaseContracts.orgId, orgId)];
    if (status) conditions.push(eq(leaseContracts.status, status as any));
    if (propertyId) conditions.push(eq(leaseContracts.propertyId, propertyId));
    if (unitId) conditions.push(eq(leaseContracts.unitId, unitId));
    if (expiringIn) {
      const future = new Date(); future.setDate(future.getDate() + parseInt(expiringIn));
      conditions.push(lte(leaseContracts.endDate, future.toISOString().split("T")[0]));
      conditions.push(gte(leaseContracts.endDate, new Date().toISOString().split("T")[0]));
    }
    const rows = await db.select().from(leaseContracts)
      .where(and(...conditions))
      .orderBy(desc(leaseContracts.createdAt));
    return c.json({ data: rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/contracts/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const id = c.req.param("id");
    const [contract] = await db.select().from(leaseContracts)
      .where(and(eq(leaseContracts.id, id), eq(leaseContracts.orgId, orgId)));
    if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

    const [unit] = await db.select().from(propertyUnits)
      .where(eq(propertyUnits.id, contract.unitId!));
    const [tenant] = await db.select().from(tenants)
      .where(eq(tenants.id, contract.tenantId!));
    const invoices = await db.select().from(leaseInvoices)
      .where(and(eq(leaseInvoices.contractId, id), eq(leaseInvoices.orgId, orgId)))
      .orderBy(asc(leaseInvoices.periodStart));
    const payments = await db.select().from(leasePayments)
      .where(and(eq(leasePayments.contractId, id), eq(leasePayments.orgId, orgId)))
      .orderBy(desc(leasePayments.createdAt));

    return c.json({ data: { ...contract, unit, tenant, invoices, payments } });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/contracts/:id/statement", async (c) => {
  try {
    const orgId = getOrgId(c);
    const id = c.req.param("id");
    const [contract] = await db.select().from(leaseContracts)
      .where(and(eq(leaseContracts.id, id), eq(leaseContracts.orgId, orgId)));
    if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

    const invoices = await db.select().from(leaseInvoices)
      .where(and(eq(leaseInvoices.contractId, id), eq(leaseInvoices.orgId, orgId)))
      .orderBy(asc(leaseInvoices.periodStart));
    const payments = await db.select().from(leasePayments)
      .where(and(eq(leasePayments.contractId, id), eq(leasePayments.orgId, orgId)))
      .orderBy(asc(leasePayments.createdAt));

    // Build running balance
    let balance = 0;
    const entries: any[] = [];
    for (const inv of invoices) {
      balance += parseFloat(inv.totalAmount || "0");
      entries.push({ type: "invoice", date: inv.periodStart, description: `فاتورة ${inv.invoiceNumber}`, debit: inv.totalAmount, credit: null, balance: balance.toFixed(2) });
    }
    for (const pay of payments) {
      balance -= parseFloat(pay.amount || "0");
      entries.push({ type: "payment", date: pay.createdAt, description: `دفعة ${pay.receiptNumber}`, debit: null, credit: pay.amount, balance: balance.toFixed(2) });
    }
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return c.json({ data: { contract, entries, totalInvoiced: invoices.reduce((s, i) => s + parseFloat(i.totalAmount || "0"), 0).toFixed(2), totalPaid: payments.reduce((s, p) => s + parseFloat(p.amount || "0"), 0).toFixed(2), balance: balance.toFixed(2) } });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/contracts", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = contractSchema.parse(await c.req.json());

    // Generate contract number
    const seqResult = await pool.query<{ n: string }>("SELECT nextval('property_contract_seq') AS n");
    const contractNumber = `LC-${String(seqResult.rows[0].n).padStart(4, "0")}`;

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const status = startDate <= new Date() ? "active" : "pending";

    const [contract] = await db.insert(leaseContracts).values({
      orgId,
      ...body,
      contractNumber,
      startDate: body.startDate,
      endDate: body.endDate,
      status,
    } as any).returning();

    // Mark unit as occupied
    if (status === "active") {
      await db.update(propertyUnits).set({ status: "occupied", updatedAt: new Date() })
        .where(and(eq(propertyUnits.id, body.unitId), eq(propertyUnits.orgId, orgId)));
    }

    return c.json({ data: contract }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.put("/contracts/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = contractSchema.partial().parse(await c.req.json());
    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.startDate) updates.startDate = new Date(body.startDate);
    if (body.endDate) updates.endDate = new Date(body.endDate);
    const [updated] = await db.update(leaseContracts).set(updates)
      .where(and(eq(leaseContracts.id, c.req.param("id")), eq(leaseContracts.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "العقد غير موجود" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/contracts/:id/renew", async (c) => {
  try {
    const orgId = getOrgId(c);
    const id = c.req.param("id");
    const { startDate, endDate, rentAmount, increasePercentage } = await c.req.json();
    const [old] = await db.select().from(leaseContracts)
      .where(and(eq(leaseContracts.id, id), eq(leaseContracts.orgId, orgId)));
    if (!old) return c.json({ error: "العقد غير موجود" }, 404);

    const seqResult = await pool.query<{ n: string }>("SELECT nextval('property_contract_seq') AS n");
    const contractNumber = `LC-${String(seqResult.rows[0].n).padStart(4, "0")}`;

    const [newContract] = await db.insert(leaseContracts).values({
      orgId,
      propertyId: old.propertyId,
      unitId: old.unitId,
      tenantId: old.tenantId,
      contractNumber,
      startDate: startDate,
      endDate: endDate,
      rentAmount: rentAmount || old.rentAmount,
      depositAmount: old.depositAmount,
      paymentFrequency: old.paymentFrequency,
      status: "active",
      renewedFromId: old.id,
    } as any).returning();

    await db.update(leaseContracts).set({ status: "renewed", updatedAt: new Date() })
      .where(eq(leaseContracts.id, id));

    return c.json({ data: newContract }, 201);
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/contracts/:id/terminate", async (c) => {
  try {
    const orgId = getOrgId(c);
    const id = c.req.param("id");
    const { reason, terminationDate } = await c.req.json();
    const [contract] = await db.select().from(leaseContracts)
      .where(and(eq(leaseContracts.id, id), eq(leaseContracts.orgId, orgId)));
    if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

    const [updated] = await db.update(leaseContracts).set({
      status: "terminated",
      terminationReason: reason,
      terminationDate: terminationDate ? terminationDate : new Date().toISOString().split("T")[0],
      updatedAt: new Date(),
    }).where(eq(leaseContracts.id, id)).returning();

    // Free the unit
    await db.update(propertyUnits).set({ status: "vacant", updatedAt: new Date() })
      .where(and(eq(propertyUnits.id, contract.unitId!), eq(propertyUnits.orgId, orgId)));

    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.patch("/contracts/:id/ejar", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { ejarContractNumber, ejarStatus, ejarNotes } = await c.req.json();
    const [updated] = await db.update(leaseContracts).set({
      ejarContractNumber: ejarContractNumber ?? undefined,
      ejarStatus: ejarStatus ?? undefined,
      ejarNotes: ejarNotes ?? undefined,
      updatedAt: new Date(),
    }).where(and(eq(leaseContracts.id, c.req.param("id")), eq(leaseContracts.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "العقد غير موجود" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

// ============================================================
// INVOICES
// ============================================================

propertyRouter.get("/invoices/overdue", async (c) => {
  try {
    const orgId = getOrgId(c);
    const now = new Date();
    const rows = await db.select().from(leaseInvoices)
      .where(and(
        eq(leaseInvoices.orgId, orgId),
        sql`${leaseInvoices.status} IN ('sent', 'partial', 'overdue')`,
        lt(leaseInvoices.dueDate, now.toISOString().split("T")[0]),
      ))
      .orderBy(asc(leaseInvoices.dueDate));

    const enriched = rows.map((inv) => ({
      ...inv,
      daysOverdue: Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
    }));
    return c.json({ data: enriched });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/invoices", async (c) => {
  try {
    const orgId = getOrgId(c);
    const status = c.req.query("status");
    const contractId = c.req.query("contractId");
    const overdue = c.req.query("overdue");
    const month = c.req.query("month"); // YYYY-MM
    const conditions: any[] = [eq(leaseInvoices.orgId, orgId)];
    if (status) conditions.push(eq(leaseInvoices.status, status as any));
    if (contractId) conditions.push(eq(leaseInvoices.contractId, contractId));
    if (overdue === "true") conditions.push(lt(leaseInvoices.dueDate, new Date().toISOString().split("T")[0]));
    if (month) {
      const [year, mon] = month.split("-").map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 0);
      conditions.push(gte(leaseInvoices.periodStart, typeof start === "string" ? start : start.toISOString().split("T")[0]));
      conditions.push(lte(leaseInvoices.periodStart, typeof end === "string" ? end : end.toISOString().split("T")[0]));
    }
    const rows = await db.select().from(leaseInvoices)
      .where(and(...conditions))
      .orderBy(desc(leaseInvoices.createdAt));
    return c.json({ data: rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/invoices/generate-for-contract/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const contractId = c.req.param("id");
    const [contract] = await db.select().from(leaseContracts)
      .where(and(eq(leaseContracts.id, contractId), eq(leaseContracts.orgId, orgId)));
    if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

    const seqBase = await pool.query<{ n: string }>("SELECT nextval('property_invoice_seq') AS n");
    let seqNum = parseInt(seqBase.rows[0].n);

    // Generate monthly invoices from startDate to endDate
    const generated: any[] = [];
    const current = new Date(contract.startDate);
    current.setDate(1);
    const contractEnd = new Date(contract.endDate);

    while (current <= contractEnd) {
      const periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      // Check if invoice already exists for this period
      const [existing] = await db.select({ id: leaseInvoices.id }).from(leaseInvoices)
        .where(and(
          eq(leaseInvoices.orgId, orgId),
          eq(leaseInvoices.contractId, contractId),
          eq(leaseInvoices.periodStart, current.toISOString().split('T')[0]),
        )).limit(1);
      if (!existing) {
        const invoiceNumber = `INV-${String(seqNum).padStart(4, "0")}`;
        const dueDate = new Date(current.getFullYear(), current.getMonth(), 1);
        const [inv] = await db.insert(leaseInvoices).values({
          orgId,
          contractId,
          invoiceNumber,
          periodStart: current.toISOString().split("T")[0],
          periodEnd: periodEnd.toISOString().split("T")[0],
          rentAmount: contract.rentAmount,
          subtotal: contract.rentAmount,
          dueDate: dueDate.toISOString().split("T")[0],
          totalAmount: contract.rentAmount,
          paidAmount: "0",
          status: "draft",
        } as any).returning();
        generated.push(inv);
        seqNum++;
      }
      current.setMonth(current.getMonth() + 1);
    }
    return c.json({ data: { generated: generated.length, invoices: generated } });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/invoices/generate", async (c) => {
  try {
    const orgId = getOrgId(c);
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const activeContracts = await db.select().from(leaseContracts)
      .where(and(eq(leaseContracts.orgId, orgId), eq(leaseContracts.status, "active")));

    let generatedCount = 0;
    let skippedCount = 0;

    for (const contract of activeContracts) {
      const [existing] = await db.select({ id: leaseInvoices.id }).from(leaseInvoices)
        .where(and(
          eq(leaseInvoices.orgId, orgId),
          eq(leaseInvoices.contractId, contract.id),
          eq(leaseInvoices.periodStart, firstOfMonth.toISOString().split('T')[0]),
        )).limit(1);

      if (existing) { skippedCount++; continue; }

      const seqResult = await pool.query<{ n: string }>("SELECT nextval('property_invoice_seq') AS n");
      const invoiceNumber = `INV-${String(seqResult.rows[0].n).padStart(4, "0")}`;
      const dueDate = new Date(now.getFullYear(), now.getMonth(), 1);

      await db.insert(leaseInvoices).values({
        orgId,
        contractId: contract.id,
        invoiceNumber,
        periodStart: firstOfMonth.toISOString().split("T")[0],
        periodEnd: lastOfMonth.toISOString().split("T")[0],
        rentAmount: contract.rentAmount,
        subtotal: contract.rentAmount,
        dueDate: dueDate.toISOString().split("T")[0],
        totalAmount: contract.rentAmount,
        paidAmount: "0",
        status: "draft",
      } as any);
      generatedCount++;
    }
    return c.json({ data: { generated: generatedCount, skipped: skippedCount } });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.patch("/invoices/:id/send", async (c) => {
  try {
    const orgId = getOrgId(c);
    const [updated] = await db.update(leaseInvoices).set({
      status: "sent",
      reminderSentAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(leaseInvoices.id, c.req.param("id")), eq(leaseInvoices.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "الفاتورة غير موجودة" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.patch("/invoices/:id/pay", async (c) => {
  try {
    const orgId = getOrgId(c);
    const id = c.req.param("id");
    const body = invoicePaySchema.parse(await c.req.json());

    const [invoice] = await db.select().from(leaseInvoices)
      .where(and(eq(leaseInvoices.id, id), eq(leaseInvoices.orgId, orgId)));
    if (!invoice) return c.json({ error: "الفاتورة غير موجودة" }, 404);

    const newPaid = parseFloat(invoice.paidAmount || "0") + parseFloat(body.amount);
    const total = parseFloat(invoice.totalAmount || "0");
    const newStatus = newPaid >= total ? "paid" : "partial";

    // Generate receipt number
    const seqResult = await pool.query<{ n: string }>("SELECT nextval('property_payment_seq') AS n");
    const receiptNumber = `RCT-${String(seqResult.rows[0].n).padStart(4, "0")}`;

    const [payment] = await db.insert(leasePayments).values({
      orgId,
      invoiceId: id,
      contractId: invoice.contractId,
      receiptNumber,
      amount: String(body.amount),
      method: (body.method || "cash") as any,
      paymentSource: (body.paymentSource || "direct") as any,
      notes: body.notes ?? null,
      paidAt: new Date(),
    } as any).returning();

    const [updatedInvoice] = await db.update(leaseInvoices).set({
      paidAmount: newPaid.toFixed(2),
      status: newStatus,
      paidAt: newStatus === "paid" ? new Date() : undefined,
      updatedAt: new Date(),
    }).where(eq(leaseInvoices.id, id)).returning();

    return c.json({ data: { invoice: updatedInvoice, payment } });
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.patch("/invoices/:id/cancel", async (c) => {
  try {
    const orgId = getOrgId(c);
    const [updated] = await db.update(leaseInvoices).set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(leaseInvoices.id, c.req.param("id")), eq(leaseInvoices.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "الفاتورة غير موجودة" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

// ============================================================
// PAYMENTS
// ============================================================

propertyRouter.get("/payments", async (c) => {
  try {
    const orgId = getOrgId(c);
    const method = c.req.query("method");
    const paymentSource = c.req.query("paymentSource");
    const contractId = c.req.query("contractId");
    const from = c.req.query("from");
    const to = c.req.query("to");
    const conditions: any[] = [eq(leasePayments.orgId, orgId)];
    if (method) conditions.push(eq(leasePayments.method, method as any));
    if (paymentSource) conditions.push(eq(leasePayments.paymentSource, paymentSource as any));
    if (contractId) conditions.push(eq(leasePayments.contractId, contractId));
    if (from) conditions.push(gte(leasePayments.createdAt, new Date(from)));
    if (to) conditions.push(lte(leasePayments.createdAt, new Date(to)));
    const rows = await db.select().from(leasePayments)
      .where(and(...conditions))
      .orderBy(desc(leasePayments.createdAt));
    return c.json({ data: rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/payments", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = await c.req.json();
    const seqResult = await pool.query<{ n: string }>("SELECT nextval('property_payment_seq') AS n");
    const receiptNumber = `RCT-${String(seqResult.rows[0].n).padStart(4, "0")}`;
    const [payment] = await db.insert(leasePayments).values({ orgId, receiptNumber, ...body }).returning();
    return c.json({ data: payment }, 201);
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/payments/:id/receipt", async (c) => {
  return c.json({ data: { receiptUrl: null, message: "PDF generation coming soon" } });
});

// ============================================================
// EXPENSES
// ============================================================

propertyRouter.get("/expenses/summary", async (c) => {
  try {
    const orgId = getOrgId(c);
    const rows = await pool.query<{ category: string; total: string }>(`
      SELECT category, SUM(amount)::text AS total
      FROM property_expenses
      WHERE org_id = $1
      GROUP BY category
      ORDER BY total DESC
    `, [orgId]);
    const grandTotal = rows.rows.reduce((s, r) => s + parseFloat(r.total), 0).toFixed(2);
    return c.json({ data: { categories: rows.rows, grandTotal } });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/expenses", async (c) => {
  try {
    const orgId = getOrgId(c);
    const category = c.req.query("category");
    const propertyId = c.req.query("propertyId");
    const from = c.req.query("from");
    const to = c.req.query("to");
    const conditions: any[] = [eq(propertyExpenses.orgId, orgId)];
    if (category) conditions.push(eq(propertyExpenses.category, category as any));
    if (propertyId) conditions.push(eq(propertyExpenses.propertyId, propertyId));
    if (from) conditions.push(gte(propertyExpenses.paidAt, from as string));
    if (to) conditions.push(lte(propertyExpenses.paidAt, to as string));
    const rows = await db.select().from(propertyExpenses)
      .where(and(...conditions))
      .orderBy(desc(propertyExpenses.paidAt));
    return c.json({ data: rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/expenses", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = expenseSchema.parse(await c.req.json());
    const seqResult = await pool.query<{ n: string }>("SELECT nextval('property_expense_seq') AS n");
    const expenseNumber = `EXP-${String(seqResult.rows[0].n).padStart(4, "0")}`;
    const [expense] = await db.insert(propertyExpenses).values({
      orgId,
      expenseNumber,
      ...body,
    } as any).returning();
    return c.json({ data: expense }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.put("/expenses/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = expenseSchema.partial().parse(await c.req.json());
    const [updated] = await db.update(propertyExpenses).set({  ...body, updatedAt: new Date() } as any)
      .where(and(eq(propertyExpenses.id, c.req.param("id")), eq(propertyExpenses.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "المصروف غير موجود" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.delete("/expenses/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const [deleted] = await db.delete(propertyExpenses)
      .where(and(eq(propertyExpenses.id, c.req.param("id")), eq(propertyExpenses.orgId, orgId)))
      .returning();
    if (!deleted) return c.json({ error: "المصروف غير موجود" }, 404);
    insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "property_expense", resourceId: deleted.id });
    return c.json({ data: deleted });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

// ============================================================
// MAINTENANCE
// ============================================================

propertyRouter.get("/maintenance", async (c) => {
  try {
    const orgId = getOrgId(c);
    const status = c.req.query("status");
    const priority = c.req.query("priority");
    const category = c.req.query("category");
    const propertyId = c.req.query("propertyId");
    const conditions: any[] = [eq(propertyMaintenance.orgId, orgId)];
    if (status) conditions.push(eq(propertyMaintenance.status, status as any));
    if (priority) conditions.push(eq(propertyMaintenance.priority, priority as any));
    if (category) conditions.push(eq(propertyMaintenance.category, category as any));
    if (propertyId) conditions.push(eq(propertyMaintenance.propertyId, propertyId));
    const rows = await db.select().from(propertyMaintenance)
      .where(and(...conditions))
      .orderBy(desc(propertyMaintenance.createdAt));
    return c.json({ data: rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/maintenance/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const [row] = await db.select().from(propertyMaintenance)
      .where(and(eq(propertyMaintenance.id, c.req.param("id")), eq(propertyMaintenance.orgId, orgId)));
    if (!row) return c.json({ error: "طلب الصيانة غير موجود" }, 404);
    return c.json({ data: row });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/maintenance", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = maintenanceSchema.parse(await c.req.json());
    const seqResult = await pool.query<{ n: string }>("SELECT nextval('property_maintenance_seq') AS n");
    const ticketNumber = `MNT-${String(seqResult.rows[0].n).padStart(4, "0")}`;
    const [ticket] = await db.insert(propertyMaintenance).values({
      orgId,
      ticketNumber,
      ...body,
      status: "pending",
    } as any).returning();
    return c.json({ data: ticket }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.put("/maintenance/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = maintenanceSchema.partial().parse(await c.req.json());
    const [updated] = await db.update(propertyMaintenance).set({  ...body, updatedAt: new Date() } as any)
      .where(and(eq(propertyMaintenance.id, c.req.param("id")), eq(propertyMaintenance.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "طلب الصيانة غير موجود" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.patch("/maintenance/:id/assign", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { assignedTo, assignedCompany, assignedPhone, estimatedCost } = await c.req.json();
    const [updated] = await db.update(propertyMaintenance).set({
      assignedTo, assignedCompany, assignedPhone, estimatedCost,
      status: "assigned", updatedAt: new Date(),
    }).where(and(eq(propertyMaintenance.id, c.req.param("id")), eq(propertyMaintenance.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "طلب الصيانة غير موجود" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.patch("/maintenance/:id/approve", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { approvedCost } = await c.req.json();
    const [updated] = await db.update(propertyMaintenance).set({
      approvedCost, status: "approved",  updatedAt: new Date(),
    }).where(and(eq(propertyMaintenance.id, c.req.param("id")), eq(propertyMaintenance.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "طلب الصيانة غير موجود" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.patch("/maintenance/:id/start", async (c) => {
  try {
    const orgId = getOrgId(c);
    const [updated] = await db.update(propertyMaintenance).set({
      status: "in_progress", startedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(propertyMaintenance.id, c.req.param("id")), eq(propertyMaintenance.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "طلب الصيانة غير موجود" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.patch("/maintenance/:id/complete", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { actualCost, completionPhotos } = await c.req.json();
    const [updated] = await db.update(propertyMaintenance).set({
      actualCost, completionPhotos,
      status: "completed", completedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(propertyMaintenance.id, c.req.param("id")), eq(propertyMaintenance.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "طلب الصيانة غير موجود" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.patch("/maintenance/:id/rate", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { rating, feedback } = await c.req.json();
    const [updated] = await db.update(propertyMaintenance).set({
      tenantRating: rating, tenantFeedback: feedback, updatedAt: new Date(),
    }).where(and(eq(propertyMaintenance.id, c.req.param("id")), eq(propertyMaintenance.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "طلب الصيانة غير موجود" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

// ============================================================
// INSPECTIONS
// ============================================================

propertyRouter.get("/inspections", async (c) => {
  try {
    const orgId = getOrgId(c);
    const type = c.req.query("type");
    const unitId = c.req.query("unitId");
    const contractId = c.req.query("contractId");
    const conditions: any[] = [eq(propertyInspections.orgId, orgId)];
    if (type) conditions.push(eq(propertyInspections.type, type as any));
    if (unitId) conditions.push(eq(propertyInspections.unitId, unitId));
    if (contractId) conditions.push(eq(propertyInspections.contractId, contractId));
    const rows = await db.select().from(propertyInspections)
      .where(and(...conditions))
      .orderBy(desc(propertyInspections.inspectionDate));
    return c.json({ data: rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/inspections/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const [row] = await db.select().from(propertyInspections)
      .where(and(eq(propertyInspections.id, c.req.param("id")), eq(propertyInspections.orgId, orgId)));
    if (!row) return c.json({ error: "المعاينة غير موجودة" }, 404);
    return c.json({ data: row });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/inspections", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = inspectionSchema.parse(await c.req.json());
    const [inspection] = await db.insert(propertyInspections).values({
      orgId,
      ...body,
      inspectionDate: body.inspectionDate,
    } as any).returning();
    return c.json({ data: inspection }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.put("/inspections/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = inspectionSchema.partial().parse(await c.req.json());
    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.inspectionDate) updates.inspectionDate = new Date(body.inspectionDate);
    const [updated] = await db.update(propertyInspections).set(updates)
      .where(and(eq(propertyInspections.id, c.req.param("id")), eq(propertyInspections.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "المعاينة غير موجودة" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return c.json({ error: "بيانات غير صحيحة", details: err.flatten() }, 400);
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/inspections/:id/sign", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { tenantSignature, managerSignature } = await c.req.json();
    const [updated] = await db.update(propertyInspections).set({
      tenantSignature, managerSignature,
      updatedAt: new Date(),
    } as any).where(and(eq(propertyInspections.id, c.req.param("id")), eq(propertyInspections.orgId, orgId)))
      .returning();
    if (!updated) return c.json({ error: "المعاينة غير موجودة" }, 404);
    return c.json({ data: updated });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

// ============================================================
// REPORTS
// ============================================================

propertyRouter.get("/reports/occupancy", async (c) => {
  try {
    const orgId = getOrgId(c);
    const result = await pool.query<any>(`
      SELECT
        p.id, p.name,
        COUNT(pu.id) AS total_units,
        COUNT(CASE WHEN pu.status = 'occupied' THEN 1 END) AS occupied,
        COUNT(CASE WHEN pu.status = 'vacant' THEN 1 END) AS vacant,
        CASE
          WHEN COUNT(pu.id) > 0
          THEN ROUND(COUNT(CASE WHEN pu.status = 'occupied' THEN 1 END)::numeric / COUNT(pu.id) * 100, 1)
          ELSE 0
        END AS occupancy_rate
      FROM properties p
      LEFT JOIN property_units pu ON pu.property_id = p.id AND pu.org_id = p.org_id AND pu.is_active = true
      WHERE p.org_id = $1 AND p.is_active = true
      GROUP BY p.id, p.name
      ORDER BY p.name
    `, [orgId]);
    return c.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/reports/collection", async (c) => {
  try {
    const orgId = getOrgId(c);
    const result = await pool.query<any>(`
      SELECT
        payment_source,
        COUNT(*)::int AS count,
        SUM(amount)::text AS collected
      FROM lease_payments
      WHERE org_id = $1
      GROUP BY payment_source
      ORDER BY collected DESC
    `, [orgId]);

    const [invoiced] = await db.select({
      total: sql<string>`COALESCE(SUM(${leaseInvoices.totalAmount}), 0)`,
      paid: sql<string>`COALESCE(SUM(${leaseInvoices.paidAmount}), 0)`,
    }).from(leaseInvoices).where(eq(leaseInvoices.orgId, orgId));

    return c.json({ data: { bySource: result.rows, totalInvoiced: invoiced.total, totalCollected: invoiced.paid } });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/reports/profit-loss", async (c) => {
  try {
    const orgId = getOrgId(c);
    const result = await pool.query<any>(`
      SELECT
        p.id, p.name,
        COALESCE(rev.revenue, 0)::text AS revenue,
        COALESCE(exp.expenses, 0)::text AS expenses,
        (COALESCE(rev.revenue, 0) - COALESCE(exp.expenses, 0))::text AS net
      FROM properties p
      LEFT JOIN (
        SELECT li.property_id, SUM(li.paid_amount) AS revenue
        FROM lease_invoices li WHERE li.org_id = $1
        GROUP BY li.property_id
      ) rev ON rev.property_id = p.id
      LEFT JOIN (
        SELECT pe.property_id, SUM(pe.amount) AS expenses
        FROM property_expenses pe WHERE pe.org_id = $1
        GROUP BY pe.property_id
      ) exp ON exp.property_id = p.id
      WHERE p.org_id = $1 AND p.is_active = true
      ORDER BY p.name
    `, [orgId]);
    return c.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/reports/roi", async (c) => {
  try {
    const orgId = getOrgId(c);
    const result = await pool.query<any>(`
      SELECT
        p.id, p.name, p.invested_amount,
        COALESCE(rev.revenue, 0)::text AS net_income,
        CASE
          WHEN p.invested_amount IS NOT NULL AND p.invested_amount::numeric > 0
          THEN ROUND((COALESCE(rev.revenue, 0) / p.invested_amount::numeric) * 100, 2)::text
          ELSE NULL
        END AS roi_percent
      FROM properties p
      LEFT JOIN (
        SELECT li.property_id, SUM(li.paid_amount) AS revenue
        FROM lease_invoices li WHERE li.org_id = $1
        GROUP BY li.property_id
      ) rev ON rev.property_id = p.id
      WHERE p.org_id = $1 AND p.is_active = true
      ORDER BY p.name
    `, [orgId]);
    return c.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/reports/expiring-contracts", async (c) => {
  try {
    const orgId = getOrgId(c);
    const days = parseInt(c.req.query("days") || "60");
    const future = new Date(); future.setDate(future.getDate() + days);
    const result = await pool.query<any>(`
      SELECT lc.*, t.name AS tenant_name, t.phone AS tenant_phone,
        pu.unit_number, p.name AS property_name
      FROM lease_contracts lc
      LEFT JOIN tenants t ON lc.tenant_id = t.id
      LEFT JOIN property_units pu ON lc.unit_id = pu.id
      LEFT JOIN properties p ON lc.property_id = p.id
      WHERE lc.org_id = $1 AND lc.status = 'active'
        AND lc.end_date <= $2 AND lc.end_date >= NOW()
      ORDER BY lc.end_date ASC
    `, [orgId, future]);
    return c.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/reports/overdue-payments", async (c) => {
  try {
    const orgId = getOrgId(c);
    const result = await pool.query<any>(`
      SELECT li.*,
        t.name AS tenant_name, t.phone AS tenant_phone,
        pu.unit_number, p.name AS property_name,
        EXTRACT(DAY FROM NOW() - li.due_date)::int AS days_overdue
      FROM lease_invoices li
      LEFT JOIN tenants t ON li.tenant_id = t.id
      LEFT JOIN property_units pu ON li.unit_id = pu.id
      LEFT JOIN properties p ON pu.property_id = p.id
      WHERE li.org_id = $1
        AND li.status IN ('sent', 'partial', 'overdue')
        AND li.due_date < NOW()
      ORDER BY li.due_date ASC
    `, [orgId]);
    return c.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/reports/maintenance-summary", async (c) => {
  try {
    const orgId = getOrgId(c);
    const result = await pool.query<any>(`
      SELECT
        category,
        COUNT(*)::int AS count,
        SUM(COALESCE(actual_cost, estimated_cost, 0))::text AS total_cost,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed,
        COUNT(CASE WHEN status IN ('pending', 'assigned', 'approved', 'in_progress') THEN 1 END)::int AS open
      FROM property_maintenance
      WHERE org_id = $1
      GROUP BY category
      ORDER BY total_cost DESC
    `, [orgId]);
    return c.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

// ============================================================
// TENANT PORTAL (no orgId auth — use contractId as key)
// ============================================================

propertyRouter.get("/portal/lookup", async (c) => {
  try {
    const q = c.req.query("q");
    if (!q) return c.json({ error: "q مطلوب" }, 400);
    const result = await pool.query<any>(`
      SELECT lc.id, lc.contract_number, lc.start_date, lc.end_date, lc.status,
        t.name AS tenant_name, t.phone AS tenant_phone,
        pu.unit_number, p.name AS property_name
      FROM lease_contracts lc
      LEFT JOIN tenants t ON lc.tenant_id = t.id
      LEFT JOIN property_units pu ON lc.unit_id = pu.id
      LEFT JOIN properties p ON lc.property_id = p.id
      WHERE lc.contract_number = $1 OR t.phone = $1
      LIMIT 5
    `, [q]);
    return c.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/portal/:contractId/invoices", async (c) => {
  try {
    const contractId = c.req.param("contractId");
    const rows = await db.select().from(leaseInvoices)
      .where(eq(leaseInvoices.contractId, contractId))
      .orderBy(desc(leaseInvoices.periodStart));
    return c.json({ data: rows });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.get("/portal/:contractId/statement", async (c) => {
  try {
    const contractId = c.req.param("contractId");
    const [contract] = await db.select().from(leaseContracts)
      .where(eq(leaseContracts.id, contractId));
    if (!contract) return c.json({ error: "العقد غير موجود" }, 404);
    const invoices = await db.select().from(leaseInvoices)
      .where(eq(leaseInvoices.contractId, contractId))
      .orderBy(asc(leaseInvoices.periodStart));
    const payments = await db.select().from(leasePayments)
      .where(eq(leasePayments.contractId, contractId))
      .orderBy(asc(leasePayments.createdAt));
    return c.json({ data: { contract, invoices, payments } });
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});

propertyRouter.post("/portal/:contractId/maintenance", async (c) => {
  try {
    const contractId = c.req.param("contractId");
    const [contract] = await db.select().from(leaseContracts)
      .where(eq(leaseContracts.id, contractId));
    if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

    const body = await c.req.json();
    const seqResult = await pool.query<{ n: string }>("SELECT nextval('property_maintenance_seq') AS n");
    const ticketNumber = `MNT-${String(seqResult.rows[0].n).padStart(4, "0")}`;

    const [ticket] = await db.insert(propertyMaintenance).values({
      orgId: contract.orgId,
      ticketNumber,
      contractId,
      unitId: contract.unitId,
      propertyId: contract.propertyId,
      title: body.title,
      description: body.description,
      category: body.category ?? "general",
      priority: (body.priority || "normal") as any,
      reportedBy: "tenant",
      status: "reported",
    } as any).returning();
    return c.json({ data: ticket }, 201);
  } catch (err) {
    console.error(err);
    return apiErr(c, "SRV_INTERNAL", 500);
  }
});
