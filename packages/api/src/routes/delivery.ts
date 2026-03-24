import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, desc, sql, inArray } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { deliveryPartners, deliveryAssignments, orgMembers, users, jobTitles } from "@nasaq/db/schema";
import { getOrgId, validateBody, getPagination } from "../lib/helpers";

export const deliveryRouter = new Hono();

// ============================================================
// SCHEMAS
// ============================================================

const createPartnerSchema = z.object({
  name:            z.string().min(1).max(150),
  type:            z.enum(["company", "individual"]).default("company"),
  contactPhone:    z.string().max(30).optional().nullable(),
  commissionType:  z.enum(["percentage", "fixed_per_order", "flat_monthly"]).default("fixed_per_order"),
  commissionValue: z.number().min(0).default(0),
  notes:           z.string().max(500).optional().nullable(),
});

const updatePartnerSchema = createPartnerSchema.partial();

const createAssignmentSchema = z.object({
  orderId:         z.string().uuid(),
  assignedToType:  z.enum(["member", "partner"]),
  assignedToId:    z.string().uuid(),
  deliveryFee:     z.number().min(0).default(0),
  driverShare:     z.number().min(0).default(0),
  notes:           z.string().max(500).optional().nullable(),
});

const updateAssignmentStatusSchema = z.object({
  status: z.enum(["pending", "accepted", "picked_up", "in_transit", "delivered", "failed", "returned"]),
  proofOfDelivery: z.string().optional().nullable(),
  notes:           z.string().optional().nullable(),
});

// ============================================================
// DELIVERY PARTNERS
// ============================================================

// GET /delivery/partners
deliveryRouter.get("/partners", async (c) => {
  const orgId = getOrgId(c);
  const showInactive = c.req.query("showInactive") === "true";

  const partners = await db
    .select()
    .from(deliveryPartners)
    .where(and(
      eq(deliveryPartners.orgId, orgId),
      showInactive ? undefined : eq(deliveryPartners.isActive, true),
    ))
    .orderBy(asc(deliveryPartners.name));

  return c.json({ data: partners });
});

// POST /delivery/partners
deliveryRouter.post("/partners", async (c) => {
  const orgId = getOrgId(c);
  const body = await validateBody(c, createPartnerSchema);
  if (!body) return;

  const { commissionValue, ...partnerRest } = body;
  const [created] = await db
    .insert(deliveryPartners)
    .values({ ...partnerRest, orgId, commissionValue: String(commissionValue) })
    .returning();

  return c.json({ data: created }, 201);
});

// PUT /delivery/partners/:id
deliveryRouter.put("/partners/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await validateBody(c, updatePartnerSchema);
  if (!body) return;

  const [existing] = await db
    .select({ id: deliveryPartners.id })
    .from(deliveryPartners)
    .where(and(eq(deliveryPartners.id, id), eq(deliveryPartners.orgId, orgId)));

  if (!existing) return c.json({ error: "الشريك غير موجود" }, 404);

  const { commissionValue: cv, ...partnerUpdateRest } = body;
  const [updated] = await db
    .update(deliveryPartners)
    .set({
      ...partnerUpdateRest,
      ...(cv !== undefined && { commissionValue: String(cv) }),
      updatedAt: new Date(),
    })
    .where(and(eq(deliveryPartners.id, id), eq(deliveryPartners.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

// DELETE /delivery/partners/:id (soft)
deliveryRouter.delete("/partners/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  await db
    .update(deliveryPartners)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(deliveryPartners.id, id), eq(deliveryPartners.orgId, orgId)));

  return c.json({ success: true });
});

// ============================================================
// AVAILABLE DRIVERS — GET /delivery/drivers
// Returns internal staff (from org_members) + active partners
// ============================================================

deliveryRouter.get("/drivers", async (c) => {
  const orgId = getOrgId(c);

  // Internal staff (org members)
  const staff = await db
    .select({
      id: orgMembers.id,
      type: sql<string>`'member'`,
      name: users.name,
      phone: users.phone,
      avatar: users.avatar,
      jobTitle: jobTitles.name,
      systemRole: jobTitles.systemRole,
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .leftJoin(jobTitles, eq(orgMembers.jobTitleId, jobTitles.id))
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.status, "active")));

  // External partners
  const partners = await db
    .select({
      id: deliveryPartners.id,
      type: sql<string>`'partner'`,
      name: deliveryPartners.name,
      phone: deliveryPartners.contactPhone,
      avatar: sql<null>`null`,
      jobTitle: sql<string>`'شركة توصيل'`,
      systemRole: sql<null>`null`,
    })
    .from(deliveryPartners)
    .where(and(eq(deliveryPartners.orgId, orgId), eq(deliveryPartners.isActive, true)));

  return c.json({ data: { staff, partners } });
});

// ============================================================
// ASSIGNMENTS
// ============================================================

// GET /delivery/assignments
deliveryRouter.get("/assignments", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const orderId = c.req.query("orderId");

  const assignments = await db
    .select()
    .from(deliveryAssignments)
    .where(and(
      eq(deliveryAssignments.orgId, orgId),
      status ? eq(deliveryAssignments.status, status as any) : undefined,
      orderId ? eq(deliveryAssignments.orderId, orderId) : undefined,
    ))
    .orderBy(desc(deliveryAssignments.assignedAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: assignments });
});

// POST /delivery/assignments
deliveryRouter.post("/assignments", async (c) => {
  const orgId = getOrgId(c);
  const body = await validateBody(c, createAssignmentSchema);
  if (!body) return;

  const { deliveryFee, driverShare, ...assignmentRest } = body;
  const [created] = await db
    .insert(deliveryAssignments)
    .values({
      ...assignmentRest,
      orgId,
      deliveryFee: String(deliveryFee),
      driverShare: String(driverShare),
    })
    .returning();

  return c.json({ data: created }, 201);
});

// PATCH /delivery/assignments/:id/status
deliveryRouter.patch("/assignments/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await validateBody(c, updateAssignmentStatusSchema);
  if (!body) return;

  const [existing] = await db
    .select({ id: deliveryAssignments.id })
    .from(deliveryAssignments)
    .where(and(eq(deliveryAssignments.id, id), eq(deliveryAssignments.orgId, orgId)));

  if (!existing) return c.json({ error: "التعيين غير موجود" }, 404);

  const updates: Record<string, any> = { status: body.status, updatedAt: new Date() };
  if (body.status === "picked_up") updates.pickedUpAt = new Date();
  if (body.status === "delivered") updates.deliveredAt = new Date();
  if (body.proofOfDelivery) updates.proofOfDelivery = body.proofOfDelivery;
  if (body.notes) updates.notes = body.notes;

  await db
    .update(deliveryAssignments)
    .set(updates)
    .where(and(eq(deliveryAssignments.id, id), eq(deliveryAssignments.orgId, orgId)));

  return c.json({ success: true });
});

// ============================================================
// STATS — GET /delivery/stats
// ============================================================

deliveryRouter.get("/stats", async (c) => {
  const orgId = getOrgId(c);

  const statusCounts = await db
    .select({
      status: deliveryAssignments.status,
      count: sql<number>`count(*)`,
    })
    .from(deliveryAssignments)
    .where(eq(deliveryAssignments.orgId, orgId))
    .groupBy(deliveryAssignments.status);

  const partnerCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(deliveryPartners)
    .where(and(eq(deliveryPartners.orgId, orgId), eq(deliveryPartners.isActive, true)));

  return c.json({
    data: {
      assignments: Object.fromEntries(statusCounts.map((r) => [r.status, Number(r.count)])),
      activePartners: Number(partnerCount[0]?.count || 0),
    },
  });
});
