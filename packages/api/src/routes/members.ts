import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, desc, ilike, or, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { orgMembers, jobTitles, users } from "@nasaq/db/schema";
import { getOrgId, getUserId, validateBody, getPagination } from "../lib/helpers";

export const membersRouter = new Hono();

const createMemberSchema = z.object({
  userId:           z.string().uuid(),
  jobTitleId:       z.string().uuid().optional().nullable(),
  branchId:         z.string().uuid().optional().nullable(),
  employmentType:   z.enum(["internal", "freelance", "outsourced"]).default("internal"),
  salary:           z.number().positive().optional().nullable(),
  commissionRate:   z.number().min(0).max(100).optional().nullable(),
  commissionType:   z.enum(["percentage", "fixed_per_order", "tiered"]).optional().nullable(),
  status:           z.enum(["active", "inactive", "suspended", "pending"]).default("active"),
  hiredAt:          z.string().datetime().optional().nullable(),
  contractEnd:      z.string().datetime().optional().nullable(),
  phone:            z.string().max(30).optional().nullable(),
  emergencyContact: z.string().max(200).optional().nullable(),
  notes:            z.string().max(1000).optional().nullable(),
});

const updateMemberSchema = createMemberSchema.partial().omit({ userId: true });

// ============================================================
// LIST — GET /members
// ============================================================

membersRouter.get("/", async (c) => {
  const orgId = getOrgId(c);
  const { limit, offset } = getPagination(c);
  const search = c.req.query("search");
  const status = c.req.query("status");
  const jobTitleId = c.req.query("jobTitleId");

  const rows = await db
    .select({
      member: orgMembers,
      user: {
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        avatar: users.avatar,
        type: users.type,
      },
      jobTitle: {
        id: jobTitles.id,
        name: jobTitles.name,
        systemRole: jobTitles.systemRole,
        color: jobTitles.color,
      },
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .leftJoin(jobTitles, eq(orgMembers.jobTitleId, jobTitles.id))
    .where(and(
      eq(orgMembers.orgId, orgId),
      status ? eq(orgMembers.status, status as any) : undefined,
      jobTitleId ? eq(orgMembers.jobTitleId, jobTitleId) : undefined,
      search ? or(ilike(users.name, `%${search}%`), ilike(users.phone, `%${search}%`)) : undefined,
    ))
    .orderBy(asc(users.name))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(and(
      eq(orgMembers.orgId, orgId),
      status ? eq(orgMembers.status, status as any) : undefined,
      jobTitleId ? eq(orgMembers.jobTitleId, jobTitleId) : undefined,
      search ? or(ilike(users.name, `%${search}%`), ilike(users.phone, `%${search}%`)) : undefined,
    ));

  return c.json({ data: rows, total: Number(count) });
});

// ============================================================
// GET ONE — GET /members/:id
// ============================================================

membersRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [row] = await db
    .select({
      member: orgMembers,
      user: {
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        avatar: users.avatar,
        type: users.type,
      },
      jobTitle: {
        id: jobTitles.id,
        name: jobTitles.name,
        systemRole: jobTitles.systemRole,
        color: jobTitles.color,
      },
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .leftJoin(jobTitles, eq(orgMembers.jobTitleId, jobTitles.id))
    .where(and(eq(orgMembers.id, id), eq(orgMembers.orgId, orgId)));

  if (!row) return c.json({ error: "العضو غير موجود" }, 404);

  return c.json({ data: row });
});

// ============================================================
// CREATE — POST /members
// ============================================================

membersRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = await validateBody(c, createMemberSchema);
  if (!body) return;

  // Verify user belongs to same org
  const [user] = await db
    .select({ id: users.id, orgId: users.orgId })
    .from(users)
    .where(eq(users.id, body.userId));

  if (!user || user.orgId !== orgId) {
    return c.json({ error: "المستخدم غير موجود في هذه المنشأة" }, 400);
  }

  const { hiredAt, contractEnd, salary, commissionRate, ...memberRest } = body;
  const dateFields = {
    ...(hiredAt !== undefined && { hiredAt: hiredAt ? new Date(hiredAt) : null }),
    ...(contractEnd !== undefined && { contractEnd: contractEnd ? new Date(contractEnd) : null }),
    ...(salary !== undefined && { salary: salary !== null ? String(salary) : null }),
    ...(commissionRate !== undefined && { commissionRate: commissionRate !== null ? String(commissionRate) : null }),
  };
  const [created] = await db
    .insert(orgMembers)
    .values({ ...memberRest, orgId, ...dateFields })
    .onConflictDoUpdate({
      target: [orgMembers.orgId, orgMembers.userId],
      set: { ...memberRest, ...dateFields, updatedAt: new Date() },
    })
    .returning();

  return c.json({ data: created }, 201);
});

// ============================================================
// UPDATE — PUT /members/:id
// ============================================================

membersRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await validateBody(c, updateMemberSchema);
  if (!body) return;

  const [existing] = await db
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .where(and(eq(orgMembers.id, id), eq(orgMembers.orgId, orgId)));

  if (!existing) return c.json({ error: "العضو غير موجود" }, 404);

  const { hiredAt, contractEnd, salary, commissionRate, ...memberUpdateRest } = body;
  const [updated] = await db
    .update(orgMembers)
    .set({
      ...memberUpdateRest,
      updatedAt: new Date(),
      ...(hiredAt !== undefined && { hiredAt: hiredAt ? new Date(hiredAt) : null }),
      ...(contractEnd !== undefined && { contractEnd: contractEnd ? new Date(contractEnd) : null }),
      ...(salary !== undefined && { salary: salary !== null ? String(salary) : null }),
      ...(commissionRate !== undefined && { commissionRate: commissionRate !== null ? String(commissionRate) : null }),
    })
    .where(and(eq(orgMembers.id, id), eq(orgMembers.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

// ============================================================
// CHANGE STATUS — PATCH /members/:id/status
// ============================================================

membersRouter.patch("/:id/status", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { status } = await c.req.json() as { status: string };

  const allowed = ["active", "inactive", "suspended", "pending"];
  if (!allowed.includes(status)) {
    return c.json({ error: "حالة غير صالحة" }, 400);
  }

  await db
    .update(orgMembers)
    .set({ status: status as any, updatedAt: new Date() })
    .where(and(eq(orgMembers.id, id), eq(orgMembers.orgId, orgId)));

  return c.json({ success: true });
});

// ============================================================
// DELETE — DELETE /members/:id
// ============================================================

membersRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  await db
    .delete(orgMembers)
    .where(and(eq(orgMembers.id, id), eq(orgMembers.orgId, orgId)));

  return c.json({ success: true });
});

// ============================================================
// AVAILABLE STAFF — GET /members/available
// Returns active internal/freelance members for assignment
// ============================================================

membersRouter.get("/available", async (c) => {
  const orgId = getOrgId(c);

  const rows = await db
    .select({
      id: orgMembers.id,
      userId: orgMembers.userId,
      name: users.name,
      phone: users.phone,
      avatar: users.avatar,
      jobTitle: jobTitles.name,
      systemRole: jobTitles.systemRole,
      color: jobTitles.color,
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .leftJoin(jobTitles, eq(orgMembers.jobTitleId, jobTitles.id))
    .where(and(
      eq(orgMembers.orgId, orgId),
      eq(orgMembers.status, "active"),
    ))
    .orderBy(asc(users.name));

  return c.json({ data: rows });
});
