import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, gte, lte, sql, count } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { shifts, bookingTasks, performanceReviews, vendorProfiles, timeOff, users, roles, rolePermissions, permissions as permissionsTable, bookings } from "@nasaq/db/schema";
import { getOrgId, getUserId, getPagination } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";
import { invalidatePermissionCache } from "../middleware/auth";

const createShiftSchema = z.object({
  userId: z.string().uuid(),
  date: z.string(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "no_show"]).default("scheduled"),
  notes: z.string().max(1000).optional().nullable(),
});

const generateTasksSchema = z.object({
  bookingId: z.string().uuid(),
  eventDate: z.string(),
  locationName: z.string().min(1).max(200),
  serviceName: z.string().min(1).max(300),
});

const updateShiftSchema = z.object({
  userId: z.string().uuid().optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  locationId: z.string().uuid().optional().nullable(),
  bookingId: z.string().uuid().optional().nullable(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "no_show"]).optional(),
  actualStartTime: z.string().optional().nullable(),
  actualEndTime: z.string().optional().nullable(),
  breakMinutes: z.number().int().optional(),
  notes: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  scheduledStart: z.string().optional().nullable(),
  scheduledEnd: z.string().optional().nullable(),
  actualStart: z.string().optional().nullable(),
  actualEnd: z.string().optional().nullable(),
  status: z.string().optional(),
  sortOrder: z.number().int().optional(),
  checklist: z.array(z.unknown()).optional(),
  images: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
});

const createVendorProfileSchema = z.object({
  userId: z.string().uuid(),
  companyName: z.string().optional().nullable(),
  commercialRegister: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  servicesOffered: z.array(z.string()).optional(),
  contractStartDate: z.string().optional().nullable(),
  contractEndDate: z.string().optional().nullable(),
  contractDocument: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  accountHolder: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const teamRouter = new Hono();

// ============================================================
// SHIFTS — الورديات
// ============================================================

teamRouter.get("/shifts", async (c) => {
  const orgId = getOrgId(c);
  const from = c.req.query("from");
  const to = c.req.query("to");
  const userId = c.req.query("userId");

  const conditions = [eq(shifts.orgId, orgId)];
  if (from) conditions.push(gte(shifts.date, new Date(from)));
  if (to) conditions.push(lte(shifts.date, new Date(to)));
  if (userId) conditions.push(eq(shifts.userId, userId));

  const result = await db.select({ shift: shifts, userName: users.name })
    .from(shifts).leftJoin(users, eq(shifts.userId, users.id))
    .where(and(...conditions)).orderBy(asc(shifts.date));

  return c.json({ data: result.map(r => ({ ...r.shift, userName: r.userName })) });
});

teamRouter.post("/shifts", async (c) => {
  const orgId = getOrgId(c);
  const raw = await c.req.json();

  // Support bulk creation — validate each item
  const rawItems = Array.isArray(raw) ? raw : [raw];
  const parsed = rawItems.map((item) => createShiftSchema.safeParse(item));
  const invalid = parsed.find((r) => !r.success);
  if (invalid && !invalid.success) return c.json({ error: invalid.error.flatten() }, 400);
  const items = (parsed as { success: true; data: any }[]).map((r) => r.data);

  const created = await db.insert(shifts)
    .values(items.map((item) => ({ orgId, ...item, date: new Date(item.date) })))
    .returning();

  return c.json({ data: created }, 201);
});

teamRouter.patch("/shifts/:id", async (c) => {
  const orgId = getOrgId(c);
  const parsedBody = updateShiftSchema.safeParse(await c.req.json());
  if (!parsedBody.success) return c.json({ error: parsedBody.error.flatten() }, 400);
  const body = parsedBody.data;
  const { date: shiftDate, ...shiftRest } = body;
  const [updated] = await db.update(shifts).set({
    ...shiftRest,
    ...(shiftDate !== undefined && { date: new Date(shiftDate) }),
    updatedAt: new Date(),
  }).where(and(eq(shifts.id, c.req.param("id")), eq(shifts.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "الوردية غير موجودة" }, 404);
  return c.json({ data: updated });
});

// Available staff for a date
teamRouter.get("/available", async (c) => {
  const orgId = getOrgId(c);
  const date = c.req.query("date");
  const locationId = c.req.query("locationId");
  if (!date) return c.json({ error: "التاريخ مطلوب" }, 400);

  // Get all active staff — explicit columns only, never SELECT * on users
  const allStaff = await db.select({
    id:       users.id,
    name:     users.name,
    phone:    users.phone,
    email:    users.email,
    type:     users.type,
    avatar:   users.avatar,
    roleId:   users.roleId,
  }).from(users).where(and(
    eq(users.orgId, orgId), eq(users.status, "active"), sql`${users.type} IN ('employee', 'vendor')`,
  ));

  // Get who's already scheduled
  const scheduled = await db.select({ userId: shifts.userId }).from(shifts)
    .where(and(eq(shifts.orgId, orgId), eq(shifts.date, new Date(date)), sql`${shifts.status} != 'cancelled'`));

  // Get who's on leave
  const onLeave = await db.select({ userId: timeOff.userId }).from(timeOff)
    .where(and(eq(timeOff.orgId, orgId), eq(timeOff.status, "approved"),
      lte(timeOff.startDate, new Date(date)), gte(timeOff.endDate, new Date(date))));

  const busyIds = new Set([...scheduled.map(s => s.userId), ...onLeave.map(l => l.userId)]);
  const available = allStaff.filter(s => !busyIds.has(s.id));

  return c.json({ data: { available, scheduled: scheduled.length, onLeave: onLeave.length, total: allStaff.length } });
});

// ============================================================
// BOOKING TASKS — مهام الحجز
// ============================================================

teamRouter.get("/tasks", async (c) => {
  const orgId = getOrgId(c);
  const bookingId = c.req.query("bookingId");
  const userId = c.req.query("userId");
  const status = c.req.query("status");
  const date = c.req.query("date");

  const conditions = [eq(bookingTasks.orgId, orgId)];
  if (bookingId) conditions.push(eq(bookingTasks.bookingId, bookingId));
  if (userId) conditions.push(eq(bookingTasks.assignedTo, userId));
  if (status) conditions.push(eq(bookingTasks.status, status as any));
  if (date) conditions.push(sql`DATE(${bookingTasks.scheduledStart}) = ${date}`);

  const result = await db.select({ task: bookingTasks, assigneeName: users.name })
    .from(bookingTasks).leftJoin(users, eq(bookingTasks.assignedTo, users.id))
    .where(and(...conditions)).orderBy(asc(bookingTasks.sortOrder));

  return c.json({ data: result.map(r => ({ ...r.task, assigneeName: r.assigneeName })) });
});

// Auto-generate tasks for a booking — bulk insert instead of per-row loop (Q7)
teamRouter.post("/tasks/generate", async (c) => {
  const orgId = getOrgId(c);
  const { bookingId, eventDate, locationName, serviceName } = generateTasksSchema.parse(await c.req.json());

  // Verify booking belongs to org
  const [bk] = await db.select({ id: bookings.id }).from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.orgId, orgId)));
  if (!bk) return c.json({ error: "الحجز غير موجود" }, 404);

  const date = new Date(eventDate);
  const H = 60 * 60 * 1000;
  const defaultTasks = [
    { type: "transport", title: `نقل معدات ${serviceName} إلى ${locationName}`, sortOrder: 1,
      scheduledStart: new Date(date.getTime() - 4 * H), scheduledEnd: new Date(date.getTime() - 3 * H) },
    { type: "setup", title: `تجهيز وتركيب ${serviceName}`, sortOrder: 2,
      scheduledStart: new Date(date.getTime() - 3 * H), scheduledEnd: new Date(date.getTime() - H) },
    { type: "reception", title: "استقبال العميل والتسليم", sortOrder: 3,
      scheduledStart: new Date(date.getTime() - 30 * 60 * 1000), scheduledEnd: date },
    { type: "teardown", title: `تفكيك ${serviceName}`, sortOrder: 4,
      scheduledStart: new Date(date.getTime() + 24 * H), scheduledEnd: new Date(date.getTime() + 26 * H) },
    { type: "return", title: "إرجاع المعدات للمستودع", sortOrder: 5,
      scheduledStart: new Date(date.getTime() + 26 * H), scheduledEnd: new Date(date.getTime() + 28 * H) },
    { type: "inspection", title: "فحص المعدات بعد الاستخدام", sortOrder: 6,
      scheduledStart: new Date(date.getTime() + 28 * H), scheduledEnd: new Date(date.getTime() + 29 * H) },
  ];

  const created = await db.insert(bookingTasks)
    .values(defaultTasks.map((task) => ({ orgId, bookingId, ...task } as any)))
    .returning();

  return c.json({ data: created }, 201);
});

teamRouter.patch("/tasks/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = updateTaskSchema.parse(await c.req.json());
  const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
  if (body.status === "completed") updates.completedAt = new Date();

  const [updated] = await db.update(bookingTasks).set(updates)
    .where(and(eq(bookingTasks.id, c.req.param("id")), eq(bookingTasks.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "المهمة غير موجودة" }, 404);
  return c.json({ data: updated });
});

// ============================================================
// PERFORMANCE
// ============================================================

teamRouter.get("/performance/:userId", async (c) => {
  const orgId = getOrgId(c);
  const userId = c.req.param("userId");
  const months = parseInt(c.req.query("months") || "3");
  const since = new Date(); since.setMonth(since.getMonth() - months);

  const [taskStats] = await db.select({
    total: count(),
    completed: sql<number>`COUNT(*) FILTER (WHERE ${bookingTasks.status} = 'completed')`,
  }).from(bookingTasks).where(and(eq(bookingTasks.orgId, orgId), eq(bookingTasks.assignedTo, userId), gte(bookingTasks.createdAt, since)));

  const [shiftStats] = await db.select({
    total: count(),
    completed: sql<number>`COUNT(*) FILTER (WHERE ${shifts.status} = 'completed')`,
    noShow: sql<number>`COUNT(*) FILTER (WHERE ${shifts.status} = 'no_show')`,
  }).from(shifts).where(and(eq(shifts.orgId, orgId), eq(shifts.userId, userId), gte(shifts.date, since)));

  return c.json({
    data: {
      userId, period: `${months} أشهر`,
      tasks: { total: Number(taskStats.total), completed: Number(taskStats.completed), completionRate: taskStats.total ? Math.round(Number(taskStats.completed) / Number(taskStats.total) * 100) : 0 },
      shifts: { total: Number(shiftStats.total), completed: Number(shiftStats.completed), noShow: Number(shiftStats.noShow) },
    },
  });
});

// ============================================================
// VENDOR PROFILES
// ============================================================

teamRouter.get("/vendors", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select({ profile: vendorProfiles, userName: users.name, userPhone: users.phone })
    .from(vendorProfiles).leftJoin(users, eq(vendorProfiles.userId, users.id))
    .where(and(eq(vendorProfiles.orgId, orgId), eq(vendorProfiles.isActive, true)));
  return c.json({ data: result.map(r => ({ ...r.profile, name: r.userName, phone: r.userPhone })) });
});

teamRouter.post("/vendors", async (c) => {
  const orgId = getOrgId(c);
  const body = createVendorProfileSchema.parse(await c.req.json());
  const { contractStartDate, contractEndDate, ...vendorRest } = body;
  const [profile] = await db.insert(vendorProfiles).values({
    orgId, ...vendorRest,
    ...(contractStartDate !== undefined && { contractStartDate: contractStartDate ? new Date(contractStartDate) : null }),
    ...(contractEndDate !== undefined && { contractEndDate: contractEndDate ? new Date(contractEndDate) : null }),
  }).returning();
  return c.json({ data: profile }, 201);
});

// ============================================================
// TIME OFF
// ============================================================

teamRouter.get("/time-off", async (c) => {
  const orgId = getOrgId(c);
  const userId = c.req.query("userId");
  const conditions = [eq(timeOff.orgId, orgId)];
  if (userId) conditions.push(eq(timeOff.userId, userId));
  const result = await db.select().from(timeOff).where(and(...conditions)).orderBy(desc(timeOff.startDate));
  return c.json({ data: result });
});

const createTimeOffSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().max(1000).optional().nullable(),
});

teamRouter.post("/time-off", async (c) => {
  const orgId = getOrgId(c);
  const body = createTimeOffSchema.parse(await c.req.json());
  const [request] = await db.insert(timeOff).values({
    orgId, userId: body.userId, type: body.type,
    startDate: new Date(body.startDate), endDate: new Date(body.endDate), reason: body.reason,
  }).returning();
  return c.json({ data: request }, 201);
});

teamRouter.patch("/time-off/:id/approve", async (c) => {
  const orgId = getOrgId(c);
  const userId = getUserId(c);
  const [updated] = await db.update(timeOff).set({ status: "approved", approvedBy: userId })
    .where(and(eq(timeOff.id, c.req.param("id")), eq(timeOff.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "الطلب غير موجود" }, 404);
  return c.json({ data: updated });
});

// ============================================================
// ROLES — الأدوار والصلاحيات
// ============================================================

teamRouter.get("/roles", async (c) => {
  const orgId = getOrgId(c);
  const rolesList = await db.select().from(roles).where(and(eq(roles.orgId, orgId), eq(roles.isActive, true))).orderBy(asc(roles.name));
  const memberCounts = await db.select({ roleId: users.roleId, count: count() })
    .from(users).where(eq(users.orgId, orgId)).groupBy(users.roleId);
  const countMap = new Map(memberCounts.map(m => [m.roleId, Number(m.count)]));

  // Load permissions per role
  const allRolePerms = await db.select({ roleId: rolePermissions.roleId, resource: permissionsTable.resource, action: permissionsTable.action })
    .from(rolePermissions).innerJoin(permissionsTable, eq(rolePermissions.permissionId, permissionsTable.id))
    .where(sql`${rolePermissions.roleId} IN (${sql.join(rolesList.map(r => sql`${r.id}`), sql`, `)})`);
  const permsMap = new Map<string, string[]>();
  for (const rp of allRolePerms) {
    if (!permsMap.has(rp.roleId)) permsMap.set(rp.roleId, []);
    permsMap.get(rp.roleId)!.push(`${rp.resource}:${rp.action}`);
  }

  return c.json({ data: rolesList.map(r => ({ ...r, memberCount: countMap.get(r.id) || 0, permissions: permsMap.get(r.id) || [] })) });
});

teamRouter.post("/roles", async (c) => {
  const orgId = getOrgId(c);
  const { name, nameEn, description } = await c.req.json();
  const [role] = await db.insert(roles).values({ orgId, name, nameEn, description }).returning();
  return c.json({ data: role }, 201);
});

teamRouter.put("/roles/:id", async (c) => {
  const orgId = getOrgId(c);
  const { name, nameEn, description } = await c.req.json();
  const [updated] = await db.update(roles).set({ name, nameEn, description, updatedAt: new Date() })
    .where(and(eq(roles.id, c.req.param("id")), eq(roles.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "الدور غير موجود" }, 404);
  return c.json({ data: updated });
});

teamRouter.put("/roles/:id/permissions", async (c) => {
  const orgId = getOrgId(c);
  const roleId = c.req.param("id");
  const { permissions: perms } = await c.req.json() as { permissions: string[] };
  const role = await db.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.orgId, orgId))).limit(1);
  if (!role[0]) return c.json({ error: "الدور غير موجود" }, 404);

  // Upsert each permission string ("resource:action") into permissions table
  const pairs = perms.map(p => { const [resource, action] = p.split(":"); return { resource, action }; }).filter(p => p.resource && p.action);
  if (pairs.length > 0) {
    await db.insert(permissionsTable).values(pairs).onConflictDoNothing();
  }

  // Delete existing and re-insert
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (pairs.length > 0) {
    const permRecords = await db.select().from(permissionsTable)
      .where(sql`${permissionsTable.resource} || ':' || ${permissionsTable.action} = ANY(ARRAY[${sql.join(pairs.map(p => sql`${p.resource + ":" + p.action}`), sql`, `)}])`);
    if (permRecords.length > 0) {
      await db.insert(rolePermissions).values(permRecords.map(p => ({ roleId, permissionId: p.id }))).onConflictDoNothing();
    }
  }

  invalidatePermissionCache(roleId);

  // Return updated permissions list
  const currentPerms = await db.select({ perm: permissionsTable })
    .from(rolePermissions).innerJoin(permissionsTable, eq(rolePermissions.permissionId, permissionsTable.id))
    .where(eq(rolePermissions.roleId, roleId));
  return c.json({ data: { id: roleId, permissions: currentPerms.map(r => `${r.perm.resource}:${r.perm.action}`) } });
});

teamRouter.delete("/roles/:id", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db.update(roles)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(roles.id, c.req.param("id")), eq(roles.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "الدور غير موجود" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "role", resourceId: updated.id });
  return c.json({ data: { success: true } });
});

// ============================================================
// ATTENDANCE — الحضور (using shifts as attendance records)
// ============================================================

teamRouter.get("/attendance", async (c) => {
  const orgId = getOrgId(c);
  const date = c.req.query("date") || new Date().toISOString().split("T")[0];
  const userId = c.req.query("userId");

  const conditions = [eq(shifts.orgId, orgId), sql`DATE(${shifts.date}) = ${date}`];
  if (userId) conditions.push(eq(shifts.userId, userId));

  const result = await db.select({ shift: shifts, userName: users.name, userPhone: users.phone, userAvatar: users.avatar, jobTitle: users.jobTitle })
    .from(shifts).leftJoin(users, eq(shifts.userId, users.id))
    .where(and(...conditions)).orderBy(asc(shifts.date));

  return c.json({ data: result.map(r => ({ ...r.shift, userName: r.userName, userPhone: r.userPhone, userAvatar: r.userAvatar, jobTitle: r.jobTitle })) });
});

teamRouter.get("/attendance/summary", async (c) => {
  const orgId = getOrgId(c);
  const date = c.req.query("date") || new Date().toISOString().split("T")[0];

  const [{ total }] = await db.select({ total: count() }).from(users)
    .where(and(eq(users.orgId, orgId), eq(users.status, "active")));

  const dayShifts = await db.select({ status: shifts.status, actualStart: shifts.actualStartTime, startTime: shifts.startTime })
    .from(shifts).where(and(eq(shifts.orgId, orgId), sql`DATE(${shifts.date}) = ${date}`));

  const present = dayShifts.filter(s => s.actualStart).length;
  const late = dayShifts.filter(s => {
    if (!s.actualStart || !s.startTime) return false;
    return new Date(s.actualStart as any) > new Date(s.startTime as any);
  }).length;

  return c.json({ data: { date, total: Number(total), present, late, absent: Number(total) - present } });
});

teamRouter.post("/attendance/checkin", async (c) => {
  const orgId = getOrgId(c);
  const { userId, shiftId, notes } = await c.req.json();
  const now = new Date();

  if (shiftId) {
    const [updated] = await db.update(shifts).set({ actualStartTime: now.toTimeString().slice(0, 5), status: "in_progress", notes, updatedAt: now })
      .where(and(eq(shifts.id, shiftId), eq(shifts.orgId, orgId))).returning();
    return c.json({ data: updated });
  }

  // Create a new attendance shift for today
  const today = now.toISOString().split("T")[0];
  const checkInTime = now.toTimeString().slice(0, 5);
  const [created] = await db.insert(shifts).values({
    orgId, userId, date: new Date(today),
    startTime: checkInTime, endTime: "23:59",
    actualStartTime: checkInTime, status: "in_progress", notes,
  }).returning();
  return c.json({ data: created }, 201);
});

teamRouter.patch("/attendance/:id/checkout", async (c) => {
  const orgId = getOrgId(c);
  const now = new Date();
  const [updated] = await db.update(shifts).set({ actualEndTime: now.toTimeString().slice(0, 5), status: "completed", updatedAt: now })
    .where(and(eq(shifts.id, c.req.param("id")), eq(shifts.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "السجل غير موجود" }, 404);
  return c.json({ data: updated });
});

// ============================================================
// MEMBERS (Staff) — أعضاء الفريق
// ============================================================

teamRouter.get("/members", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select({ user: users, roleName: roles.name })
    .from(users).leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.orgId, orgId)).orderBy(asc(users.name));
  return c.json({ data: result.map(r => ({ ...r.user, roleName: r.roleName })) });
});

teamRouter.get("/members/:id", async (c) => {
  const orgId = getOrgId(c);
  const result = await db.select({ user: users, roleName: roles.name })
    .from(users).leftJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.id, c.req.param("id")), eq(users.orgId, orgId)));
  if (!result[0]) return c.json({ error: "الموظف غير موجود" }, 404);
  return c.json({ data: { ...result[0].user, roleName: result[0].roleName } });
});

const memberSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().nullable(),
  type: z.enum(["owner", "admin", "employee", "vendor"]).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  roleId: z.string().uuid().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  salary: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  skills: z.array(z.string()).optional(),
});

teamRouter.post("/members", async (c) => {
  const orgId = getOrgId(c);
  const body = memberSchema.parse(await c.req.json());
  const [user] = await db.insert(users).values({
    orgId, name: body.name, phone: body.phone, email: body.email,
    type: (body.type || "employee") as any, status: (body.status || "active") as any,
    roleId: body.roleId, jobTitle: body.jobTitle, salary: body.salary,
    startDate: body.startDate ? new Date(body.startDate) : null,
    skills: body.skills || [],
  }).returning();
  return c.json({ data: user }, 201);
});

teamRouter.put("/members/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = memberSchema.partial().parse(await c.req.json());
  const updates: any = { ...body, updatedAt: new Date() };
  if (body.startDate) updates.startDate = new Date(body.startDate);
  const [updated] = await db.update(users).set(updates)
    .where(and(eq(users.id, c.req.param("id")), eq(users.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "الموظف غير موجود" }, 404);
  return c.json({ data: updated });
});

teamRouter.delete("/members/:id", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db.update(users).set({ status: "inactive" as any, updatedAt: new Date() })
    .where(and(eq(users.id, c.req.param("id")), eq(users.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "الموظف غير موجود" }, 404);
  return c.json({ data: { success: true } });
});

// PUT /vendors/:id  +  DELETE /vendors/:id
teamRouter.put("/vendors/:id", async (c) => {
  const orgId = getOrgId(c);
  const body = createVendorProfileSchema.partial().parse(await c.req.json());
  const { contractStartDate: csDate, contractEndDate: ceDate, ...vendorUpdateRest } = body;
  const [updated] = await db.update(vendorProfiles).set({
    ...vendorUpdateRest,
    ...(csDate !== undefined && { contractStartDate: csDate ? new Date(csDate) : null }),
    ...(ceDate !== undefined && { contractEndDate: ceDate ? new Date(ceDate) : null }),
    updatedAt: new Date(),
  }).where(and(eq(vendorProfiles.id, c.req.param("id")), eq(vendorProfiles.orgId, orgId))).returning();
  if (!updated) return c.json({ error: "المزود غير موجود" }, 404);
  return c.json({ data: updated });
});

teamRouter.delete("/vendors/:id", async (c) => {
  const orgId = getOrgId(c);
  const [updated] = await db.update(vendorProfiles)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(vendorProfiles.id, c.req.param("id")), eq(vendorProfiles.orgId, orgId)))
    .returning();
  if (!updated) return c.json({ error: "المزود غير موجود" }, 404);
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "vendor_profile", resourceId: updated.id });
  return c.json({ data: { success: true } });
});
