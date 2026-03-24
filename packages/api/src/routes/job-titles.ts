import { Hono } from "hono";
import { z } from "zod";
import { eq, and, asc, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { jobTitles, jobTitlePermissions } from "@nasaq/db/schema";
import { getOrgId, getUserId, validateBody } from "../lib/helpers";
import { PERMISSION_GROUPS, DEFAULT_PERMISSIONS, resolvePermissions } from "../lib/default-permissions";
import type { SystemRole } from "../lib/default-permissions";

export const jobTitlesRouter = new Hono();

const createJobTitleSchema = z.object({
  name:        z.string().min(1).max(100),
  nameEn:      z.string().max(100).optional().nullable(),
  systemRole:  z.enum(["owner", "manager", "provider", "employee", "reception"]),
  description: z.string().max(500).optional().nullable(),
  color:       z.string().max(20).optional().nullable(),
  isDefault:   z.boolean().default(false),
  sortOrder:   z.number().int().default(0),
});

const updateJobTitleSchema = createJobTitleSchema.partial();

// ============================================================
// LIST — GET /job-titles
// ============================================================

jobTitlesRouter.get("/", async (c) => {
  const orgId = getOrgId(c);

  const titles = await db
    .select()
    .from(jobTitles)
    .where(and(eq(jobTitles.orgId, orgId), eq(jobTitles.isActive, true)))
    .orderBy(asc(jobTitles.sortOrder), asc(jobTitles.name));

  // For each title, load permission overrides and resolve full list
  const results = await Promise.all(titles.map(async (t) => {
    const overrides = await db
      .select({ permissionKey: jobTitlePermissions.permissionKey, allowed: jobTitlePermissions.allowed })
      .from(jobTitlePermissions)
      .where(eq(jobTitlePermissions.jobTitleId, t.id));

    const resolved = resolvePermissions(t.systemRole as SystemRole, overrides);
    return { ...t, resolvedPermissions: resolved, overrides };
  }));

  return c.json({ data: results });
});

// ============================================================
// GET ONE — GET /job-titles/:id
// ============================================================

jobTitlesRouter.get("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [title] = await db
    .select()
    .from(jobTitles)
    .where(and(eq(jobTitles.id, id), eq(jobTitles.orgId, orgId)));

  if (!title) return c.json({ error: "المسمى الوظيفي غير موجود" }, 404);

  const overrides = await db
    .select({ permissionKey: jobTitlePermissions.permissionKey, allowed: jobTitlePermissions.allowed })
    .from(jobTitlePermissions)
    .where(eq(jobTitlePermissions.jobTitleId, id));

  const resolved = resolvePermissions(title.systemRole as SystemRole, overrides);

  return c.json({ data: { ...title, resolvedPermissions: resolved, overrides } });
});

// ============================================================
// CREATE — POST /job-titles
// ============================================================

jobTitlesRouter.post("/", async (c) => {
  const orgId = getOrgId(c);
  const body = await validateBody(c, createJobTitleSchema);
  if (!body) return;

  const [created] = await db
    .insert(jobTitles)
    .values({ ...body, orgId })
    .returning();

  return c.json({ data: created }, 201);
});

// ============================================================
// UPDATE — PUT /job-titles/:id
// ============================================================

jobTitlesRouter.put("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await validateBody(c, updateJobTitleSchema);
  if (!body) return;

  const [existing] = await db
    .select({ id: jobTitles.id })
    .from(jobTitles)
    .where(and(eq(jobTitles.id, id), eq(jobTitles.orgId, orgId)));

  if (!existing) return c.json({ error: "المسمى الوظيفي غير موجود" }, 404);

  const [updated] = await db
    .update(jobTitles)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(jobTitles.id, id), eq(jobTitles.orgId, orgId)))
    .returning();

  return c.json({ data: updated });
});

// ============================================================
// DELETE (soft) — DELETE /job-titles/:id
// ============================================================

jobTitlesRouter.delete("/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  await db
    .update(jobTitles)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(jobTitles.id, id), eq(jobTitles.orgId, orgId)));

  return c.json({ success: true });
});

// ============================================================
// REORDER — POST /job-titles/reorder
// ============================================================

jobTitlesRouter.post("/reorder", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json() as { items: Array<{ id: string; sortOrder: number }> };

  await Promise.all(body.items.map((item) =>
    db.update(jobTitles)
      .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
      .where(and(eq(jobTitles.id, item.id), eq(jobTitles.orgId, orgId)))
  ));

  return c.json({ success: true });
});

// ============================================================
// GET PERMISSIONS — GET /job-titles/:id/permissions
// Returns resolved + grouped permission matrix
// ============================================================

jobTitlesRouter.get("/:id/permissions", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [title] = await db
    .select()
    .from(jobTitles)
    .where(and(eq(jobTitles.id, id), eq(jobTitles.orgId, orgId)));

  if (!title) return c.json({ error: "المسمى الوظيفي غير موجود" }, 404);

  const overrides = await db
    .select({ permissionKey: jobTitlePermissions.permissionKey, allowed: jobTitlePermissions.allowed })
    .from(jobTitlePermissions)
    .where(eq(jobTitlePermissions.jobTitleId, id));

  const resolved = resolvePermissions(title.systemRole as SystemRole, overrides);
  const defaults = DEFAULT_PERMISSIONS[title.systemRole as SystemRole] || [];

  return c.json({
    data: {
      systemRole: title.systemRole,
      defaults,
      overrides,
      resolved,
      groups: PERMISSION_GROUPS,
    },
  });
});

// ============================================================
// SAVE PERMISSIONS — PUT /job-titles/:id/permissions
// Body: { permissions: string[] } — full list of allowed keys
// Computes overrides = diff vs DEFAULT_PERMISSIONS[systemRole]
// ============================================================

jobTitlesRouter.put("/:id/permissions", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");

  const [title] = await db
    .select()
    .from(jobTitles)
    .where(and(eq(jobTitles.id, id), eq(jobTitles.orgId, orgId)));

  if (!title) return c.json({ error: "المسمى الوظيفي غير موجود" }, 404);

  const { permissions: allowed } = await c.req.json() as { permissions: string[] };
  const allowedSet = new Set(allowed);

  const defaults = new Set(DEFAULT_PERMISSIONS[title.systemRole as SystemRole] || []);

  // Compute overrides: only store differences from defaults
  const overrideRows: Array<{ orgId: string; jobTitleId: string; permissionKey: string; allowed: boolean }> = [];

  // Keys that are in allowed but NOT in defaults → explicitly allowed (override)
  for (const key of allowedSet) {
    if (!defaults.has(key)) overrideRows.push({ orgId, jobTitleId: id, permissionKey: key, allowed: true });
  }
  // Keys that are in defaults but NOT in allowed → explicitly revoked (override)
  for (const key of defaults) {
    if (!allowedSet.has(key)) overrideRows.push({ orgId, jobTitleId: id, permissionKey: key, allowed: false });
  }

  // Delete all existing overrides then insert new ones
  await db.delete(jobTitlePermissions).where(eq(jobTitlePermissions.jobTitleId, id));

  if (overrideRows.length > 0) {
    await db.insert(jobTitlePermissions).values(overrideRows);
  }

  return c.json({ success: true, overrideCount: overrideRows.length });
});
