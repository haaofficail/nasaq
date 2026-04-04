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
  propertyOwners,
  propertyDocuments,
  propertyValuations,
  propertyConstruction,
  constructionPhases,
  constructionDailyLogs,
  constructionCosts,
  constructionPayments,
  constructionChangeOrders,
  propertyListings,
  propertyInquiries,
  propertySales,
  customers,
  organizations,
} from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { apiErr } from "../lib/errors";
import { autoJournal } from "../lib/autoJournal";

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
          WHERE org_id = $1 AND TO_CHAR(paid_at, 'YYYY-MM') = TO_CHAR(gs, 'YYYY-MM')
        ), 0)::text AS expenses,
        (
          COALESCE((SELECT SUM(paid_amount) FROM lease_invoices WHERE org_id = $1 AND TO_CHAR(period_start, 'YYYY-MM') = TO_CHAR(gs, 'YYYY-MM')), 0) -
          COALESCE((SELECT SUM(amount) FROM property_expenses WHERE org_id = $1 AND TO_CHAR(paid_at, 'YYYY-MM') = TO_CHAR(gs, 'YYYY-MM')), 0)
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
        AND paid_at >= date_trunc('month', NOW() - INTERVAL '2 months')
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
        // قيد محاسبي تلقائي — إصدار فاتورة إيجار
        await autoJournal.invoiceIssued({
          orgId,
          invoiceId: inv.id,
          invoiceNumber,
          amount: Number(contract.rentAmount),
        });
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

      const [newInv] = await db.insert(leaseInvoices).values({
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
      } as any).returning();
      // قيد محاسبي تلقائي — إصدار فاتورة إيجار
      await autoJournal.invoiceIssued({
        orgId,
        invoiceId: newInv.id,
        invoiceNumber,
        amount: Number(contract.rentAmount),
      });
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

    // قيد محاسبي تلقائي — تحصيل فاتورة إيجار
    await autoJournal.invoicePaid({
      orgId,
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      amount: parseFloat(body.amount),
      paymentMethod: body.method || "cash",
    });

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

    // قيد محاسبي تلقائي — استلام دفعة إيجار
    await autoJournal.contractPaymentReceived({
      orgId,
      contractId: body.contractId || payment.contractId || "",
      contractNumber: receiptNumber,
      amount: Number(body.amount),
      paymentMethod: body.method || "cash",
      description: `دفعة إيجار - ${receiptNumber}`,
    });

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

// ============================================================
// PROPERTY OWNERS — ملاك العقارات
// ============================================================

propertyRouter.get("/owners", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { limit, offset } = getPagination(c);
    const rows = await db
      .select()
      .from(propertyOwners)
      .where(eq(propertyOwners.orgId, orgId))
      .orderBy(desc(propertyOwners.createdAt))
      .limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: count() }).from(propertyOwners).where(eq(propertyOwners.orgId, orgId));
    return c.json({ data: rows, pagination: { total: Number(total), limit, offset } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/owners", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = await c.req.json();
    const [row] = await db.insert(propertyOwners).values({ ...body as any, orgId }).returning();
    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/owners/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const [owner] = await db.select().from(propertyOwners).where(and(eq(propertyOwners.id, id), eq(propertyOwners.orgId, orgId)));
    if (!owner) return c.json({ error: "غير موجود" }, 404);
    const props = await db.select().from(properties).where(and(eq(properties.orgId, orgId), eq(properties.propertyOwnerId, id)));
    return c.json({ data: { ...owner, properties: props } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.put("/owners/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.update(propertyOwners).set({ ...body as any, updatedAt: new Date() }).where(and(eq(propertyOwners.id, id), eq(propertyOwners.orgId, orgId))).returning();
    if (!row) return c.json({ error: "غير موجود" }, 404);
    return c.json({ data: row });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.delete("/owners/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    await db.delete(propertyOwners).where(and(eq(propertyOwners.id, id), eq(propertyOwners.orgId, orgId)));
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/owners/:id/report", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const [owner] = await db.select().from(propertyOwners).where(and(eq(propertyOwners.id, id), eq(propertyOwners.orgId, orgId)));
    if (!owner) return c.json({ error: "غير موجود" }, 404);
    const props = await db.select({ id: properties.id }).from(properties).where(and(eq(properties.orgId, orgId), eq(properties.propertyOwnerId, id)));
    const propIds = props.map(p => p.id);
    let totalIncome = 0;
    let totalExpenses = 0;
    if (propIds.length > 0) {
      const payments = await db.select({ amount: leasePayments.amount }).from(leasePayments).where(and(eq(leasePayments.orgId, orgId)));
      totalIncome = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const expenses = await db.select({ amount: propertyExpenses.amount }).from(propertyExpenses).where(and(eq(propertyExpenses.orgId, orgId)));
      totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    }
    const managementFee = owner.managementFeeType === "percentage"
      ? totalIncome * (Number(owner.managementFeePercent || 0) / 100)
      : Number(owner.managementFeeFixed || 0);
    const netToOwner = totalIncome - totalExpenses - managementFee;
    return c.json({ data: { owner, totalIncome, totalExpenses, managementFee, netToOwner, propertiesCount: propIds.length } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ============================================================
// COMPLIANCE — الامتثال التنظيمي
// ============================================================

propertyRouter.get("/properties/:id/compliance", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const [prop] = await db.select().from(properties).where(and(eq(properties.id, id), eq(properties.orgId, orgId)));
    if (!prop) return c.json({ error: "غير موجود" }, 404);
    const today = new Date();
    const contracts = await db.select({ ejarStatus: leaseContracts.ejarStatus }).from(leaseContracts).where(and(eq(leaseContracts.orgId, orgId), eq(leaseContracts.propertyId, id), eq(leaseContracts.status, "active")));
    const undocumentedContracts = contracts.filter(c => c.ejarStatus !== "documented").length;
    const docs = await db.select({ expiryDate: propertyDocuments.expiryDate, docType: propertyDocuments.docType }).from(propertyDocuments).where(and(eq(propertyDocuments.orgId, orgId), eq(propertyDocuments.propertyId, id)));
    const insuranceDoc = docs.find(d => d.docType === "insurance");
    const insuranceValid = insuranceDoc?.expiryDate ? new Date(insuranceDoc.expiryDate) > today : false;
    const civilDefenseValid = (prop as any).civilDefenseLicenseExpiry ? new Date((prop as any).civilDefenseLicenseExpiry) > today : false;
    const buildingPermitActive = (prop as any).buildingPermitStatus === "active";
    const whiteLandOk = !(prop as any).whiteLandApplicable || ((prop as any).whiteLandNextDueDate ? new Date((prop as any).whiteLandNextDueDate) > today : true);
    const checks = {
      rerRegistered: { ok: (prop as any).rerRegistered === true, label: "مسجل في السجل العيني", link: "https://rer.sa", action: "سجّل عقارك في منصة السجل العيني" },
      buildingPermitActive: { ok: buildingPermitActive, label: "رخصة بناء سارية", link: "https://balady.gov.sa", action: "جدّد رخصة البناء عبر منصة بلدي" },
      occupancyCertificate: { ok: (prop as any).occupancyCertificate === true, label: "شهادة إشغال", link: "https://balady.gov.sa", action: "استخرج شهادة الإشغال من بلدي" },
      civilDefenseValid: { ok: civilDefenseValid, label: "رخصة دفاع مدني سارية", link: "https://cd.gov.sa", action: "جدّد رخصة الدفاع المدني" },
      insuranceValid: { ok: insuranceValid, label: "تأمين ساري", link: null, action: "أضف وثيقة تأمين سارية" },
      allContractsEjar: { ok: undocumentedContracts === 0, label: "كل العقود موثقة في إيجار", link: "https://ejar.sa", action: `وثّق ${undocumentedContracts} عقد في منصة إيجار` },
      whiteLandFees: { ok: whiteLandOk, label: "رسوم أراضي بيضاء مسددة", link: "https://wlf.mof.gov.sa", action: "سدّد رسوم الأراضي البيضاء" },
      mullakRegistered: { ok: !(prop as any).hasOwnersAssociation || (prop as any).mullakRegistered, label: "مسجل في ملاك", link: "https://mullak.sa", action: "سجّل في منصة ملاك لجمعيات الملاك" },
      buildingCodeCompliant: { ok: (prop as any).buildingCodeCompliant === true, label: "مطابق لكود البناء", link: "https://momra.gov.sa", action: "تأكد من مطابقة العقار لكود البناء السعودي" },
    };
    const passCount = Object.values(checks).filter(c => c.ok).length;
    const score = Math.round((passCount / 9) * 100);
    return c.json({ data: { propertyId: id, propertyName: prop.name, score, checks } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/compliance/alerts", async (c) => {
  try {
    const orgId = getOrgId(c);
    const today = new Date();
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const alerts: any[] = [];
    const props = await db.select().from(properties).where(and(eq(properties.orgId, orgId), eq(properties.isActive, true)));
    for (const prop of props) {
      if (!(prop as any).rerRegistered) alerts.push({ type: "rer", severity: "high", propertyId: prop.id, propertyName: prop.name, message: "غير مسجل في السجل العيني" });
      if ((prop as any).whiteLandApplicable && (prop as any).whiteLandNextDueDate) {
        const due = new Date((prop as any).whiteLandNextDueDate);
        if (due <= in30) alerts.push({ type: "white_land", severity: "high", propertyId: prop.id, propertyName: prop.name, message: `رسوم الأراضي البيضاء مستحقة: ${due.toLocaleDateString("ar-SA")}` });
      }
    }
    const contracts = await db.select().from(leaseContracts).where(and(eq(leaseContracts.orgId, orgId), eq(leaseContracts.status, "active")));
    for (const contract of contracts) {
      if (contract.ejarStatus !== "documented") alerts.push({ type: "ejar", severity: "medium", contractId: contract.id, contractNumber: contract.contractNumber, message: "عقد غير موثق في منصة إيجار" });
    }
    const docs = await db.select().from(propertyDocuments).where(and(eq(propertyDocuments.orgId, orgId)));
    for (const doc of docs) {
      if (doc.expiryDate) {
        const exp = new Date(doc.expiryDate);
        if (exp <= today) alerts.push({ type: "document_expired", severity: "high", documentId: doc.id, message: `وثيقة منتهية: ${doc.title}` });
        else if (exp <= in30) alerts.push({ type: "document_expiring", severity: "medium", documentId: doc.id, message: `وثيقة تنتهي قريباً: ${doc.title}` });
      }
    }
    return c.json({ data: alerts });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ============================================================
// PROPERTY DOCUMENTS — وثائق العقار
// ============================================================

propertyRouter.get("/documents", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { limit, offset } = getPagination(c);
    const propertyId = c.req.query("propertyId");
    const conditions = [eq(propertyDocuments.orgId, orgId)];
    if (propertyId) conditions.push(eq(propertyDocuments.propertyId, propertyId));
    const rows = await db.select().from(propertyDocuments).where(and(...conditions)).orderBy(desc(propertyDocuments.createdAt)).limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: count() }).from(propertyDocuments).where(and(...conditions));
    return c.json({ data: rows, pagination: { total: Number(total), limit, offset } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/documents/expiring", async (c) => {
  try {
    const orgId = getOrgId(c);
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const rows = await db.select().from(propertyDocuments).where(and(eq(propertyDocuments.orgId, orgId), lte(propertyDocuments.expiryDate, in30.toISOString().split("T")[0]))).orderBy(asc(propertyDocuments.expiryDate));
    return c.json({ data: rows });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/documents", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = await c.req.json();
    const [row] = await db.insert(propertyDocuments).values({ ...body as any, orgId }).returning();
    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.put("/documents/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.update(propertyDocuments).set({ ...body as any, updatedAt: new Date() }).where(and(eq(propertyDocuments.id, id), eq(propertyDocuments.orgId, orgId))).returning();
    return c.json({ data: row });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.delete("/documents/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    await db.delete(propertyDocuments).where(and(eq(propertyDocuments.id, id), eq(propertyDocuments.orgId, orgId)));
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ============================================================
// PROPERTY VALUATIONS — تقييمات العقار
// ============================================================

propertyRouter.get("/valuations", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { limit, offset } = getPagination(c);
    const propertyId = c.req.query("propertyId");
    const conditions = [eq(propertyValuations.orgId, orgId)];
    if (propertyId) conditions.push(eq(propertyValuations.propertyId, propertyId));
    const rows = await db.select().from(propertyValuations).where(and(...conditions)).orderBy(desc(propertyValuations.valuationDate)).limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: count() }).from(propertyValuations).where(and(...conditions));
    return c.json({ data: rows, pagination: { total: Number(total), limit, offset } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/valuations", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = await c.req.json();
    const [row] = await db.insert(propertyValuations).values({ ...body as any, orgId }).returning();
    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.delete("/valuations/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    await db.delete(propertyValuations).where(and(eq(propertyValuations.id, id), eq(propertyValuations.orgId, orgId)));
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ============================================================
// PROPERTY CONSTRUCTION — إدارة الإنشاء
// ============================================================

propertyRouter.get("/construction", async (c) => {
  try {
    const orgId = getOrgId(c);
    const rows = await db.select().from(propertyConstruction).where(eq(propertyConstruction.orgId, orgId)).orderBy(desc(propertyConstruction.createdAt));
    return c.json({ data: rows });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/construction", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = await c.req.json();
    const [row] = await db.insert(propertyConstruction).values({ ...body as any, orgId }).returning();
    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/construction/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const [project] = await db.select().from(propertyConstruction).where(and(eq(propertyConstruction.id, id), eq(propertyConstruction.orgId, orgId)));
    if (!project) return c.json({ error: "غير موجود" }, 404);
    const phases = await db.select().from(constructionPhases).where(eq(constructionPhases.constructionId, id)).orderBy(asc(constructionPhases.orderIndex));
    const costs = await db.select({ total: sql<number>`SUM(total_amount)` }).from(constructionCosts).where(eq(constructionCosts.constructionId, id));
    const actualSpent = Number(costs[0]?.total || 0);
    return c.json({ data: { ...project, phases, actualSpent } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.put("/construction/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.update(propertyConstruction).set({ ...body as any, updatedAt: new Date() }).where(and(eq(propertyConstruction.id, id), eq(propertyConstruction.orgId, orgId))).returning();
    return c.json({ data: row });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/construction/:id/phases/template", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const templates = [
      { name: "التصميم والترخيص", orderIndex: 0 }, { name: "الأساسات", orderIndex: 1 },
      { name: "الهيكل الإنشائي", orderIndex: 2 }, { name: "السباكة والكهرباء", orderIndex: 3 },
      { name: "التشطيبات الداخلية", orderIndex: 4 }, { name: "الواجهات الخارجية", orderIndex: 5 },
      { name: "المناظر الطبيعية", orderIndex: 6 }, { name: "التسليم والاستلام", orderIndex: 7 },
    ];
    const inserted = await Promise.all(templates.map(t => db.insert(constructionPhases).values({ ...t, constructionId: id, orgId }).returning()));
    return c.json({ data: inserted.map(r => r[0]) }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/construction/:id/phases", async (c) => {
  try {
    const { id } = c.req.param();
    const rows = await db.select().from(constructionPhases).where(eq(constructionPhases.constructionId, id)).orderBy(asc(constructionPhases.orderIndex));
    return c.json({ data: rows });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/construction/:id/phases", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.insert(constructionPhases).values({ ...body as any, constructionId: id, orgId }).returning();
    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.patch("/construction/:id/phases/:phaseId", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { phaseId } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.update(constructionPhases).set({ ...body as any, updatedAt: new Date() }).where(and(eq(constructionPhases.id, phaseId), eq(constructionPhases.orgId, orgId))).returning();
    return c.json({ data: row });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/construction/:id/daily-logs", async (c) => {
  try {
    const { id } = c.req.param();
    const rows = await db.select().from(constructionDailyLogs).where(eq(constructionDailyLogs.constructionId, id)).orderBy(desc(constructionDailyLogs.logDate));
    return c.json({ data: rows });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/construction/:id/daily-logs", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.insert(constructionDailyLogs).values({ ...body as any, constructionId: id, orgId }).returning();
    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/construction/:id/costs", async (c) => {
  try {
    const { id } = c.req.param();
    const rows = await db.select().from(constructionCosts).where(eq(constructionCosts.constructionId, id)).orderBy(desc(constructionCosts.costDate));
    return c.json({ data: rows });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/construction/:id/costs", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.insert(constructionCosts).values({ ...body as any, constructionId: id, orgId }).returning();
    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/construction/:id/costs/budget-vs-actual", async (c) => {
  try {
    const { id } = c.req.param();
    const phases = await db.select().from(constructionPhases).where(eq(constructionPhases.constructionId, id)).orderBy(asc(constructionPhases.orderIndex));
    const costs = await db.select({ phaseId: constructionCosts.phaseId, total: sql<number>`SUM(total_amount)` }).from(constructionCosts).where(eq(constructionCosts.constructionId, id)).groupBy(constructionCosts.phaseId);
    const costsMap: Record<string, number> = {};
    costs.forEach(c => { if (c.phaseId) costsMap[c.phaseId] = Number(c.total || 0); });
    const result = phases.map(p => ({ phaseId: p.id, name: p.name, estimatedCost: Number(p.estimatedCost || 0), actualCost: costsMap[p.id] || 0 }));
    return c.json({ data: result });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/construction/:id/payments", async (c) => {
  try {
    const { id } = c.req.param();
    const rows = await db.select().from(constructionPayments).where(eq(constructionPayments.constructionId, id)).orderBy(desc(constructionPayments.createdAt));
    return c.json({ data: rows });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/construction/:id/payments", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [{ n }] = await pool.query("SELECT nextval('property_construction_seq') AS n") as any;
    const [row] = await db.insert(constructionPayments).values({ ...body as any, constructionId: id, orgId, paymentNumber: Number(n) }).returning();

    // قيد محاسبي تلقائي — دفعة إنشاء
    await autoJournal.contractPaymentReceived({
      orgId,
      contractId: id,
      contractNumber: `CON-${String(n).padStart(4, "0")}`,
      amount: Number(body.amount),
      paymentMethod: body.method || "cash",
      description: `دفعة إنشاء #${n}`,
    });

    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.patch("/construction/:id/payments/:paymentId/approve", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { paymentId } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.update(constructionPayments).set({ status: "approved", approvedAt: new Date(), approvedBy: body.approvedBy }).where(and(eq(constructionPayments.id, paymentId), eq(constructionPayments.orgId, orgId))).returning();
    return c.json({ data: row });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/construction/:id/change-orders", async (c) => {
  try {
    const { id } = c.req.param();
    const rows = await db.select().from(constructionChangeOrders).where(eq(constructionChangeOrders.constructionId, id)).orderBy(desc(constructionChangeOrders.createdAt));
    return c.json({ data: rows });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/construction/:id/change-orders", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [{ n }] = await pool.query("SELECT nextval('property_change_order_seq') AS n") as any;
    const changeOrderNumber = `CO-${String(n).padStart(3, "0")}`;
    const [row] = await db.insert(constructionChangeOrders).values({ ...body as any, constructionId: id, orgId, changeOrderNumber, proposedAt: new Date() }).returning();
    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.patch("/construction/:id/change-orders/:coId/approve", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { coId } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.update(constructionChangeOrders).set({ status: "approved", approvedAt: new Date(), approvedBy: body.approvedBy }).where(and(eq(constructionChangeOrders.id, coId), eq(constructionChangeOrders.orgId, orgId))).returning();
    return c.json({ data: row });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/construction/:id/report", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const [project] = await db.select().from(propertyConstruction).where(and(eq(propertyConstruction.id, id), eq(propertyConstruction.orgId, orgId)));
    if (!project) return c.json({ error: "غير موجود" }, 404);
    const phases = await db.select().from(constructionPhases).where(eq(constructionPhases.constructionId, id)).orderBy(asc(constructionPhases.orderIndex));
    const [costsAgg] = await db.select({ total: sql<number>`SUM(total_amount)` }).from(constructionCosts).where(eq(constructionCosts.constructionId, id));
    const changeOrders = await db.select({ costImpact: constructionChangeOrders.costImpact }).from(constructionChangeOrders).where(and(eq(constructionChangeOrders.constructionId, id), eq(constructionChangeOrders.status, "approved")));
    const totalChangeOrderImpact = changeOrders.reduce((sum, co) => sum + Number(co.costImpact || 0), 0);
    const actualSpent = Number(costsAgg?.total || 0);
    const totalBudget = Number(project.totalBudget || 0);
    const budgetVariance = totalBudget - actualSpent - totalChangeOrderImpact;
    const overallProgress = phases.length > 0 ? Math.round(phases.reduce((sum, p) => sum + (p.progress || 0), 0) / phases.length) : 0;
    return c.json({ data: { project, phases, actualSpent, totalChangeOrderImpact, budgetVariance, overallProgress, completedPhases: phases.filter(p => p.status === "completed").length, totalPhases: phases.length } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ============================================================
// PROPERTY LISTINGS — إعلانات الوحدات
// ============================================================

propertyRouter.get("/listings", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { limit, offset } = getPagination(c);
    const rows = await db.select().from(propertyListings).where(eq(propertyListings.orgId, orgId)).orderBy(desc(propertyListings.createdAt)).limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: count() }).from(propertyListings).where(eq(propertyListings.orgId, orgId));
    return c.json({ data: rows, pagination: { total: Number(total), limit, offset } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/listings", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = await c.req.json();
    const [row] = await db.insert(propertyListings).values({ ...body as any, orgId }).returning();
    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.put("/listings/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.update(propertyListings).set({ ...body as any, updatedAt: new Date() }).where(and(eq(propertyListings.id, id), eq(propertyListings.orgId, orgId))).returning();
    return c.json({ data: row });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.patch("/listings/:id/publish", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const [row] = await db.update(propertyListings).set({ status: "active", publishedAt: new Date(), updatedAt: new Date() }).where(and(eq(propertyListings.id, id), eq(propertyListings.orgId, orgId))).returning();
    return c.json({ data: row });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/listings/available/:orgSlug", async (c) => {
  try {
    const { orgSlug } = c.req.param();
    const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq((organizations as any).slug, orgSlug));
    if (!org) return c.json({ data: [] });
    const rows = await db.select().from(propertyListings).where(and(eq(propertyListings.orgId, org.id), eq(propertyListings.status, "active"))).orderBy(desc(propertyListings.publishedAt));
    return c.json({ data: rows });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ============================================================
// PROPERTY INQUIRIES — استفسارات العملاء
// ============================================================

propertyRouter.get("/inquiries", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { limit, offset } = getPagination(c);
    const rows = await db.select().from(propertyInquiries).where(eq(propertyInquiries.orgId, orgId)).orderBy(desc(propertyInquiries.createdAt)).limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: count() }).from(propertyInquiries).where(eq(propertyInquiries.orgId, orgId));
    return c.json({ data: rows, pagination: { total: Number(total), limit, offset } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/inquiries", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = await c.req.json();
    const [row] = await db.insert(propertyInquiries).values({ ...body as any, orgId }).returning();
    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.patch("/inquiries/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.update(propertyInquiries).set({ ...body as any }).where(and(eq(propertyInquiries.id, id), eq(propertyInquiries.orgId, orgId))).returning();
    return c.json({ data: row });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ============================================================
// PROPERTY SALES — عمليات البيع
// ============================================================

propertyRouter.get("/sales", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { limit, offset } = getPagination(c);
    const rows = await db.select().from(propertySales).where(eq(propertySales.orgId, orgId)).orderBy(desc(propertySales.createdAt)).limit(limit).offset(offset);
    const [{ total }] = await db.select({ total: count() }).from(propertySales).where(eq(propertySales.orgId, orgId));
    return c.json({ data: rows, pagination: { total: Number(total), limit, offset } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.post("/sales", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = await c.req.json();
    const commissionAmount = body.salePrice ? Number(body.salePrice) * (Number(body.commissionPercent || 2.5) / 100) : 0;
    const [row] = await db.insert(propertySales).values({ ...body as any, orgId, commissionAmount: String(commissionAmount) }).returning();
    return c.json({ data: row }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.put("/sales/:id", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const body = await c.req.json();
    const [row] = await db.update(propertySales).set({ ...body as any, updatedAt: new Date() }).where(and(eq(propertySales.id, id), eq(propertySales.orgId, orgId))).returning();
    return c.json({ data: row });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.patch("/sales/:id/complete", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { id } = c.req.param();
    const [sale] = await db.select().from(propertySales).where(and(eq(propertySales.id, id), eq(propertySales.orgId, orgId)));
    if (!sale) return c.json({ error: "غير موجود" }, 404);
    await db.update(propertySales).set({ status: "completed", updatedAt: new Date() }).where(eq(propertySales.id, id));
    if (sale.unitId) await db.update(propertyUnits).set({ status: "sold", updatedAt: new Date() }).where(eq(propertyUnits.id, sale.unitId));
    return c.json({ success: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ============================================================
// SMART ADVISOR — المستشار الذكي
// ============================================================

propertyRouter.get("/advisor/:propertyId", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { propertyId } = c.req.param();
    const [prop] = await db.select().from(properties).where(and(eq(properties.id, propertyId), eq(properties.orgId, orgId)));
    if (!prop) return c.json({ error: "غير موجود" }, 404);
    const units = await db.select({ status: propertyUnits.status, monthlyRent: propertyUnits.monthlyRent }).from(propertyUnits).where(and(eq(propertyUnits.propertyId, propertyId), eq(propertyUnits.orgId, orgId)));
    const totalUnits = units.length;
    const occupiedUnits = units.filter(u => u.status === "occupied").length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const monthlyRentTotal = units.filter(u => u.status === "occupied").reduce((sum, u) => sum + Number(u.monthlyRent || 0), 0);
    const annualIncome = monthlyRentTotal * 12;
    const purchasePrice = Number((prop as any).purchasePrice || 0);
    const roi = purchasePrice > 0 ? ((annualIncome / purchasePrice) * 100).toFixed(2) : null;
    const recoveryYears = annualIncome > 0 ? (purchasePrice / annualIncome).toFixed(1) : null;
    const recommendations: string[] = [];
    if (occupancyRate < 80) recommendations.push(`نسبة الإشغال ${occupancyRate}% — يُنصح بمراجعة أسعار الإيجار أو تفعيل إعلانات للوحدات الشاغرة`);
    if (occupancyRate === 100) recommendations.push("إشغال كامل — فكّر في مشروع توسعة أو رفع الإيجار عند التجديد");
    if (roi && Number(roi) < 5) recommendations.push(`العائد ${roi}% — أقل من المتوسط. راجع تكاليف التشغيل أو قيّم إعادة تمويل العقار`);
    return c.json({ data: { propertyId, propertyName: prop.name, occupancyRate, monthlyRentTotal, annualIncome, roi, recoveryYears, recommendations } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/reports/investment-analysis", async (c) => {
  try {
    const orgId = getOrgId(c);
    const props = await db.select().from(properties).where(and(eq(properties.orgId, orgId), eq(properties.isActive, true)));
    const analysis = await Promise.all(props.map(async (prop) => {
      const units = await db.select({ status: propertyUnits.status, monthlyRent: propertyUnits.monthlyRent }).from(propertyUnits).where(eq(propertyUnits.propertyId, prop.id));
      const occupied = units.filter(u => u.status === "occupied");
      const monthlyIncome = occupied.reduce((sum, u) => sum + Number(u.monthlyRent || 0), 0);
      const annualIncome = monthlyIncome * 12;
      const purchasePrice = Number((prop as any).purchasePrice || 0);
      const roi = purchasePrice > 0 ? Number(((annualIncome / purchasePrice) * 100).toFixed(2)) : null;
      return { propertyId: prop.id, name: prop.name, totalUnits: units.length, occupiedUnits: occupied.length, occupancyRate: units.length > 0 ? Math.round((occupied.length / units.length) * 100) : 0, monthlyIncome, annualIncome, purchasePrice, roi };
    }));
    return c.json({ data: analysis });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/portfolio/summary", async (c) => {
  try {
    const orgId = getOrgId(c);
    const props = await db.select().from(properties).where(and(eq(properties.orgId, orgId), eq(properties.isActive, true)));
    const totalProperties = props.length;
    const totalMarketValue = props.reduce((sum, p) => sum + Number((p as any).currentMarketValue || 0), 0);
    const [paymentsAgg] = await db.select({ total: sql<number>`SUM(amount)` }).from(leasePayments).where(eq(leasePayments.orgId, orgId));
    const [expensesAgg] = await db.select({ total: sql<number>`SUM(amount)` }).from(propertyExpenses).where(eq(propertyExpenses.orgId, orgId));
    const units = await db.select({ status: propertyUnits.status }).from(propertyUnits).where(eq(propertyUnits.orgId, orgId));
    const totalUnits = units.length;
    const occupiedUnits = units.filter(u => u.status === "occupied").length;
    const totalIncome = Number(paymentsAgg?.total || 0);
    const totalExpenses = Number(expensesAgg?.total || 0);
    const netIncome = totalIncome - totalExpenses;
    return c.json({ data: { totalProperties, totalUnits, occupiedUnits, vacantUnits: totalUnits - occupiedUnits, occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0, totalMarketValue, totalIncome, totalExpenses, netIncome } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/reports/owner-statement/:ownerId", async (c) => {
  try {
    const orgId = getOrgId(c);
    const { ownerId } = c.req.param();
    const [owner] = await db.select().from(propertyOwners).where(and(eq(propertyOwners.id, ownerId), eq(propertyOwners.orgId, orgId)));
    if (!owner) return c.json({ error: "غير موجود" }, 404);
    const props = await db.select({ id: properties.id, name: properties.name }).from(properties).where(and(eq(properties.orgId, orgId), eq((properties as any).propertyOwnerId, ownerId)));
    const [paymentsAgg] = await db.select({ total: sql<number>`SUM(amount)` }).from(leasePayments).where(eq(leasePayments.orgId, orgId));
    const [expensesAgg] = await db.select({ total: sql<number>`SUM(amount)` }).from(propertyExpenses).where(eq(propertyExpenses.orgId, orgId));
    const totalIncome = Number(paymentsAgg?.total || 0);
    const totalExpenses = Number(expensesAgg?.total || 0);
    const managementFee = owner.managementFeeType === "percentage" ? totalIncome * (Number(owner.managementFeePercent || 0) / 100) : Number(owner.managementFeeFixed || 0);
    const netToOwner = totalIncome - totalExpenses - managementFee;
    return c.json({ data: { owner, properties: props, totalIncome, totalExpenses, managementFee, netToOwner } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

propertyRouter.get("/reports/office-commissions", async (c) => {
  try {
    const orgId = getOrgId(c);
    const owners = await db.select().from(propertyOwners).where(and(eq(propertyOwners.orgId, orgId), eq(propertyOwners.isActive, true)));
    const [paymentsAgg] = await db.select({ total: sql<number>`SUM(amount)` }).from(leasePayments).where(eq(leasePayments.orgId, orgId));
    const totalCollected = Number(paymentsAgg?.total || 0);
    const commissions = owners.map(owner => {
      const fee = owner.managementFeeType === "percentage" ? totalCollected * (Number(owner.managementFeePercent || 0) / 100) : Number(owner.managementFeeFixed || 0);
      return { ownerId: owner.id, ownerName: owner.ownerName, feeType: owner.managementFeeType, feeRate: owner.managementFeePercent, commission: fee };
    });
    const totalCommissions = commissions.reduce((sum, c) => sum + c.commission, 0);
    return c.json({ data: { commissions, totalCommissions } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ============================================================
// QUICK PAYMENT — الدفع السريع
// ============================================================

propertyRouter.post("/payments/quick", async (c) => {
  try {
    const orgId = getOrgId(c);
    const body = await c.req.json();
    const { contractId, amount, method, notes } = body;
    const [{ n }] = await pool.query("SELECT nextval('property_payment_seq') AS n") as any;
    const receiptNumber = `RCT-${String(n).padStart(4, "0")}`;
    const [payment] = await db.insert(leasePayments).values({ orgId, contractId, amount: String(amount), method: method || "cash", receiptNumber, paidAt: new Date(), notes: notes || null } as any).returning();
    const openInvoices = await db.select().from(leaseInvoices).where(and(eq(leaseInvoices.contractId, contractId), eq(leaseInvoices.orgId, orgId), sql`status IN ('pending','overdue','partial')`)).orderBy(asc(leaseInvoices.dueDate)).limit(1);
    if (openInvoices.length > 0) {
      const inv = openInvoices[0];
      const newPaid = Number(inv.paidAmount || 0) + Number(amount);
      const newStatus = newPaid >= Number(inv.totalAmount) ? "paid" : "partial";
      await db.update(leaseInvoices).set({ paidAmount: String(newPaid), status: newStatus as any, paidAt: newStatus === "paid" ? new Date() : undefined, updatedAt: new Date() }).where(eq(leaseInvoices.id, inv.id));
    }

    // قيد محاسبي تلقائي — دفع سريع
    await autoJournal.contractPaymentReceived({
      orgId,
      contractId,
      contractNumber: receiptNumber,
      amount: Number(amount),
      paymentMethod: method || "cash",
      description: `دفع سريع - ${receiptNumber}`,
    });

    return c.json({ data: { payment, receiptNumber } }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});
