import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, desc, ilike, or, count, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { customers, customerContacts, customerInteractions, customerSegments } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { nanoid } from "nanoid";

// ============================================================
// SCHEMAS
// ============================================================

const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(5).max(20),
  email: z.string().email().optional().nullable(),
  type: z.enum(["individual", "business"]).default("individual"),
  tier: z.enum(["regular", "vip", "enterprise"]).default("regular"),
  city: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  commercialRegister: z.string().max(50).optional().nullable(),
  vatNumber: z.string().max(50).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(50)).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

const createContactSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

const createSegmentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  conditions: z.array(z.object({
    field: z.string(),
    op: z.string(),
    value: z.unknown(),
  })).optional(),
  isActive: z.boolean().optional(),
  isDynamic: z.boolean().optional(),
});

const createInteractionSchema = z.object({
  type: z.enum(["call", "whatsapp", "sms", "email", "note", "meeting"]),
  subject: z.string().min(1).max(200),
  content: z.string().max(5000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const customersRouter = new Hono();

// ============================================================
// GET /customers — List with search, filter, pagination
// ============================================================

customersRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { page, limit, offset } = getPagination(c);
  const search = c.req.query("search");
  const tier = c.req.query("tier");
  const type = c.req.query("type");
  const isActive = c.req.query("isActive");

  // Default: show active customers only; pass isActive=false to see deactivated
  const activeFilter = isActive !== undefined ? isActive === "true" : true;
  const conditions = [eq(customers.orgId, orgId), eq(customers.isActive, activeFilter)];
  if (tier) conditions.push(eq(customers.tier, tier as any));
  if (type) conditions.push(eq(customers.type, type as any));
  if (search) {
    conditions.push(or(
      ilike(customers.name, `%${search}%`),
      ilike(customers.phone, `%${search}%`),
      ilike(customers.email, `%${search}%`),
      ilike(customers.companyName, `%${search}%`)
    )!);
  }

  const [result, [{ total }]] = await Promise.all([
    db.select().from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.createdAt))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(customers).where(and(...conditions)),
  ]);

  return c.json({
    data: result,
    pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
  });
});

// ============================================================
// GET /customers/:id — Full profile (360°)
// ============================================================

customersRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [customer] = await db.select().from(customers)
    .where(and(eq(customers.id, id), eq(customers.orgId, orgId)));
  if (!customer) return c.json({ error: "العميل غير موجود" }, 404);

  // tenant-safe: customer already verified to belong to orgId above —
  // contacts/interactions inherit org scope via customerId FK
  const [contacts, recentInteractions] = await Promise.all([
    db.select().from(customerContacts).where(eq(customerContacts.customerId, id)),
    db.select().from(customerInteractions)
      .where(eq(customerInteractions.customerId, id))
      .orderBy(desc(customerInteractions.createdAt))
      .limit(20),
  ]);

  return c.json({ data: { ...customer, contacts, recentInteractions } });
});

// ============================================================
// POST /customers — Create
// ============================================================

customersRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = createCustomerSchema.parse(await c.req.json());

  const referralCode = nanoid(8).toUpperCase();

  const [created] = await db.insert(customers).values({
    orgId,
    ...body,
    referralCode,
  }).returning();

  insertAuditLog({ orgId, userId: getUserId(c), action: "created", resource: "customer", resourceId: created.id });
  return c.json({ data: created }, 201);
});

// ============================================================
// PUT /customers/:id — Update
// ============================================================

customersRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = updateCustomerSchema.parse(await c.req.json());

  const [updated] = await db.update(customers)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "العميل غير موجود" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "updated", resource: "customer", resourceId: updated.id });
  return c.json({ data: updated });
});

// ============================================================
// POST /customers/:id/interactions — Add interaction
// ============================================================

customersRouter.post("/:id/interactions", async (c) => {
  const orgId = getOrgId(c);
  const customerId = c.req.param("id");
  const userId = getUserId(c);
  const body = createInteractionSchema.parse(await c.req.json());

  const [parent] = await db.select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)));
  if (!parent) return c.json({ error: "العميل غير موجود" }, 404);

  const [interaction] = await db.insert(customerInteractions).values({
    customerId,
    userId,
    type: body.type,
    subject: body.subject,
    content: body.content,
    metadata: body.metadata || {},
  }).returning();

  return c.json({ data: interaction }, 201);
});

// ============================================================
// POST /customers/:id/contacts — Add B2B contact
// ============================================================

customersRouter.post("/:id/contacts", async (c) => {
  const orgId = getOrgId(c);
  const customerId = c.req.param("id");
  const body = createContactSchema.parse(await c.req.json());

  // Verify parent customer belongs to this org
  const [parent] = await db.select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)));
  if (!parent) return c.json({ error: "العميل غير موجود" }, 404);

  const [contact] = await db.insert(customerContacts).values({
    customerId,
    name: body.name,
    phone: body.phone,
    email: body.email,
    role: body.role,
    isPrimary: body.isPrimary || false,
  }).returning();

  return c.json({ data: contact }, 201);
});

// ============================================================
// SEGMENTS
// ============================================================

// GET /customers/segments
customersRouter.get("/segments/list", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select().from(customerSegments)
    .where(eq(customerSegments.orgId, orgId))
    .orderBy(asc(customerSegments.name));
  return c.json({ data: result });
});

// POST /customers/segments
customersRouter.post("/segments", async (c) => {
  const orgId = getOrgId(c);
  const body = createSegmentSchema.parse(await c.req.json());
  const [segment] = await db.insert(customerSegments).values({
    orgId,
    name: body.name,
    description: body.description,
    color: body.color,
    rules: body.conditions,
    isActive: body.isActive,
  }).returning();
  return c.json({ data: segment }, 201);
});

// GET /customers/stats — Quick stats
customersRouter.get("/stats/summary", async (c) => {
  const orgId = getOrgId(c);

  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [[stats], sourceRows] = await Promise.all([
    db.select({
      total: count(),
      totalVIP: sql<number>`COUNT(*) FILTER (WHERE ${customers.tier} = 'vip')`,
      totalBusiness: sql<number>`COUNT(*) FILTER (WHERE ${customers.type} = 'business')`,
      totalSpent: sql<string>`COALESCE(SUM(CAST(${customers.totalSpent} AS DECIMAL)), 0)`,
      newThisMonth: sql<number>`COUNT(*) FILTER (WHERE ${customers.createdAt} >= ${thisMonthStart})`,
      returning: sql<number>`COUNT(*) FILTER (WHERE ${customers.totalBookings} > 1)`,
    }).from(customers).where(and(eq(customers.orgId, orgId), eq(customers.isActive, true))),

    db.select({
      source: sql<string>`COALESCE(${customers.source}, 'direct')`,
      count: count(),
    }).from(customers).where(and(eq(customers.orgId, orgId), eq(customers.isActive, true)))
      .groupBy(sql`COALESCE(${customers.source}, 'direct')`),
  ]);

  return c.json({ data: { ...stats, sourceBreakdown: sourceRows } });
});
