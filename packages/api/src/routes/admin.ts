import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, asc, count, sql, ilike, or, gt, gte, lte } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { syncOrgEntitlements } from "../lib/entitlements-sync";
import { invalidateOrgContext } from "../lib/org-context";
import { createAlert } from "./alerts";
import { apiErr } from "../lib/errors";
import { runDiagnostics } from "../lib/diagnostics";
import type { Context, Next } from "hono";

type AdminVariables = {
  adminId: string;
  adminName: string;
  adminRole: string;
  requestId: string;
};
import {
  organizations, users, sessions, locations,
  platformAuditLog, orgDocuments, supportTickets,
  platformAnnouncements, systemHealthLog, platformPlans, platformConfig,
  organizationCapabilityOverrides,
  reminderCategories, reminderTemplates, orgReminders,
  otpCodes, roles, bookingPipelineStages,
  subscriptionAddons, subscriptionOrders, subscriptions,
  workOrders, accessLogs, mediaGalleries,
  quotaUsage,
} from "@nasaq/db/schema";
import { _activateOrder } from "./subscription";
import { getPagination, generateSlug } from "../lib/helpers";
import { superAdminMiddleware } from "../middleware/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";
import { scryptSync, randomBytes } from "crypto";

function normalizePhoneAdmin(phone: string): string | null {
  if (!phone) return null;
  let p = phone.replace(/[\s-]/g, "");
  if (p.startsWith("05")) p = "+966" + p.substring(1);
  else if (p.startsWith("966")) p = "+" + p;
  else if (p.startsWith("+966")) { /* already normalized */ }
  else return null;
  return p;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// ============================================================
// NASAQ STAFF MIDDLEWARE — يتحقق من التوكن ويسمح لـ isSuperAdmin أو أي nasaqRole
// ============================================================

async function nasaqStaffMiddleware(c: Context<{ Variables: AdminVariables }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return apiErr(c, "AUTH_NO_TOKEN", 401);

  const token = authHeader.substring(7);
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));

  if (!session) return apiErr(c, "AUTH_EXPIRED", 401);

  const [user] = await db
    .select({ id: users.id, name: users.name, isSuperAdmin: users.isSuperAdmin, nasaqRole: users.nasaqRole })
    .from(users)
    .where(eq(users.id, session.userId));

  if (!user) return apiErr(c, "AUTH_NO_USER", 401);
  if (!user.isSuperAdmin && !user.nasaqRole) return apiErr(c, "AUTH_NOT_STAFF", 403);

  c.set("adminId", user.id);
  c.set("adminName", user.name);
  c.set("adminRole", user.isSuperAdmin ? "super_admin" : (user.nasaqRole as string));
  return next();
}

// ============================================================
// AUDIT HELPER
// ============================================================

function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>,
  ip?: string,
) {
  db.insert(platformAuditLog).values({ adminId, action, targetType, targetId, details: details ?? {}, ip }).catch(() => {});
}

// ============================================================
// ROUTER
// ============================================================

export const adminRouter = new Hono<{ Variables: AdminVariables }>();

adminRouter.use("*", nasaqStaffMiddleware);

// ── Guard helper: يُستدعى في بداية كل مسار حساس ──
function isSuperAdmin(c: Context<{ Variables: AdminVariables }>): boolean {
  return c.get("adminRole") === "super_admin";
}
function superAdminOnly(c: any) {
  return apiErr(c, "AUTH_SUPER_ONLY", 403);
}

// ──────────────────────────────────────────────────────────
// OVERVIEW STATS
// ──────────────────────────────────────────────────────────

adminRouter.get("/stats", async (c) => {
  const [
    [{ total: totalOrgs }],
    [{ total: activeOrgs }],
    [{ total: trialOrgs }],
    [{ total: suspendedOrgs }],
    [{ total: totalUsers }],
    [{ total: openTickets }],
    planDist,
  ] = await Promise.all([
    db.select({ total: count() }).from(organizations),
    db.select({ total: count() }).from(organizations).where(eq(organizations.subscriptionStatus, "active")),
    db.select({ total: count() }).from(organizations).where(eq(organizations.subscriptionStatus, "trialing")),
    db.select({ total: count() }).from(organizations).where(sql`${organizations.suspendedAt} IS NOT NULL`),
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(supportTickets).where(eq(supportTickets.status, "open")),
    db.select({ plan: organizations.plan, cnt: count() })
      .from(organizations)
      .groupBy(organizations.plan),
  ]);

  return c.json({
    data: {
      totalOrgs: Number(totalOrgs),
      activeOrgs: Number(activeOrgs),
      trialOrgs: Number(trialOrgs),
      suspendedOrgs: Number(suspendedOrgs),
      totalUsers: Number(totalUsers),
      openTickets: Number(openTickets),
      planDistribution: planDist.map((r) => ({ plan: r.plan, count: Number(r.cnt) })),
    },
  });
});

// ──────────────────────────────────────────────────────────
// ORGANIZATIONS
// ──────────────────────────────────────────────────────────

adminRouter.get("/orgs", async (c) => {
  const { page, limit, offset } = getPagination(c);
  const q = c.req.query("q");
  const status = c.req.query("status"); // active | trialing | suspended | all
  const plan = c.req.query("plan");
  const businessType = c.req.query("businessType");

  const conditions: any[] = [];
  if (q) conditions.push(or(ilike(organizations.name, `%${q}%`), ilike(organizations.slug, `%${q}%`)));
  if (plan) conditions.push(eq(organizations.plan, plan as any));
  if (businessType) conditions.push(eq(organizations.businessType, businessType));
  if (status === "suspended") conditions.push(sql`${organizations.suspendedAt} IS NOT NULL`);
  else if (status === "active") conditions.push(eq(organizations.subscriptionStatus, "active"));
  else if (status === "trialing") conditions.push(eq(organizations.subscriptionStatus, "trialing"));
  else if (status === "past_due") conditions.push(eq(organizations.subscriptionStatus, "past_due"));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      plan: organizations.plan,
      subscriptionStatus: organizations.subscriptionStatus,
      businessType: organizations.businessType,
      isVerified: organizations.isVerified,
      suspendedAt: organizations.suspendedAt,
      suspendReason: organizations.suspendReason,
      adminNotes: organizations.adminNotes,
      createdAt: organizations.createdAt,
    }).from(organizations).where(where).orderBy(desc(organizations.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(organizations).where(where),
  ]);

  return c.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

adminRouter.get("/orgs/:id", async (c) => {
  const [org] = await db.select({
    id: organizations.id,
    name: organizations.name,
    nameEn: organizations.nameEn,
    slug: organizations.slug,
    phone: organizations.phone,
    email: organizations.email,
    city: organizations.city,
    businessType: organizations.businessType,
    plan: organizations.plan,
    subscriptionStatus: organizations.subscriptionStatus,
    trialEndsAt: organizations.trialEndsAt,
    subscriptionEndsAt: organizations.subscriptionEndsAt,
    isActive: organizations.isActive,
    isVerified: organizations.isVerified,
    suspendedAt: organizations.suspendedAt,
    suspendReason: organizations.suspendReason,
    adminNotes: organizations.adminNotes,
    enabledCapabilities: organizations.enabledCapabilities,
    dashboardProfile: organizations.dashboardProfile,
    accountManagerId: organizations.accountManagerId,
    logo: organizations.logo,
    favicon: organizations.favicon,
    createdAt: organizations.createdAt,
    updatedAt: organizations.updatedAt,
    vatNumber: organizations.vatNumber,
    commercialRegister: organizations.commercialRegister,
    website: organizations.website,
  }).from(organizations).where(eq(organizations.id, c.req.param("id")));
  if (!org) return apiErr(c, "ORG_NOT_FOUND", 404);

  const [{ userCount }] = await db.select({ userCount: count() }).from(users).where(eq(users.orgId, org.id));

  return c.json({ data: { ...org, userCount: Number(userCount) } });
});

// POST /admin/orgs/:id/logo — رفع شعار منشأة مباشرة من الأدمن
adminRouter.post("/orgs/:id/logo", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const orgId = c.req.param("id");

  const [org] = await db.select({ id: organizations.id, name: organizations.name })
    .from(organizations).where(eq(organizations.id, orgId));
  if (!org) return apiErr(c, "ORG_NOT_FOUND", 404);

  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;
  if (!file || !(file instanceof File)) return c.json({ error: "لم يتم إرسال ملف" }, 400);

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  if (!allowed.includes(file.type)) return c.json({ error: "يُسمح بـ JPG, PNG, WebP, SVG فقط" }, 400);
  if (file.size > 5 * 1024 * 1024) return c.json({ error: "الحجم يجب ألا يتجاوز 5MB" }, 400);

  const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/www/nasaq/uploads";
  const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "https://nasaqpro.tech";
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filename = `logo-${nanoid(10)}.${ext}`;
  const orgDir = join(UPLOAD_DIR, orgId);
  await mkdir(orgDir, { recursive: true });
  await writeFile(join(orgDir, filename), Buffer.from(await file.arrayBuffer()));

  const logoUrl = `${PUBLIC_BASE}/uploads/${orgId}/${filename}`;
  await db.update(organizations).set({ logo: logoUrl, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  logAdminAction(adminId, "update_org_logo", "org", orgId, { filename }, c.req.header("X-Forwarded-For"));
  return c.json({ data: { url: logoUrl } }, 201);
});

adminRouter.patch("/orgs/:id", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const body = z.object({
    plan: z.string().optional(),
    subscriptionStatus: z.string().optional(),
    adminNotes: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    enabledCapabilities: z.array(z.string()).optional(),
    dashboardProfile: z.string().optional(),
    logo: z.string().optional().nullable(),
    name: z.string().min(1).max(200).optional(),
    phone: z.string().max(20).optional().nullable(),
    email: z.string().email().optional().nullable(),
    city: z.string().max(100).optional().nullable(),
  }).parse(await c.req.json());
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) updates[key] = value;
  }

  const [updated] = await db.update(organizations).set(updates)
    .where(eq(organizations.id, c.req.param("id"))).returning({ id: organizations.id, name: organizations.name });
  if (!updated) return apiErr(c, "ORG_NOT_FOUND", 404);

  // إذا تغيّرت الـ capabilities، أبطل الكاش فوراً
  if (updates.enabledCapabilities !== undefined) {
    invalidateOrgContext(updated.id);
  }

  logAdminAction(adminId, "update_org", "org", updated.id, { fields: Object.keys(updates) }, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

adminRouter.post("/orgs/:id/verify", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const [updated] = await db.update(organizations)
    .set({ isVerified: true, verifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(organizations.id, c.req.param("id"))).returning({ id: organizations.id, name: organizations.name });
  if (!updated) return apiErr(c, "ORG_NOT_FOUND", 404);

  logAdminAction(adminId, "verify_org", "org", updated.id, {}, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

adminRouter.post("/orgs/:id/suspend", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const { reason } = z.object({ reason: z.string().max(500).optional().default("") }).parse(await c.req.json());
  const [updated] = await db.update(organizations)
    .set({ suspendedAt: new Date(), suspendReason: reason || null, updatedAt: new Date() })
    .where(eq(organizations.id, c.req.param("id"))).returning({ id: organizations.id, name: organizations.name });
  if (!updated) return apiErr(c, "ORG_NOT_FOUND", 404);

  logAdminAction(adminId, "suspend_org", "org", updated.id, { reason }, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

adminRouter.post("/orgs/:id/unsuspend", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const [updated] = await db.update(organizations)
    .set({ suspendedAt: null, suspendReason: null, updatedAt: new Date() })
    .where(eq(organizations.id, c.req.param("id"))).returning({ id: organizations.id, name: organizations.name });
  if (!updated) return apiErr(c, "ORG_NOT_FOUND", 404);

  logAdminAction(adminId, "unsuspend_org", "org", updated.id, {}, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

// ──────────────────────────────────────────────────────────
// USERS (cross-org)
// ──────────────────────────────────────────────────────────

adminRouter.get("/users", async (c) => {
  const { page, limit, offset } = getPagination(c);
  const q = c.req.query("q");
  const orgId = c.req.query("orgId");

  const conditions: any[] = [];
  if (q) conditions.push(or(ilike(users.name, `%${q}%`), ilike(users.phone, `%${q}%`)));
  if (orgId) conditions.push(eq(users.orgId, orgId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: users.id, name: users.name, email: users.email, phone: users.phone,
      type: users.type, status: users.status, isSuperAdmin: users.isSuperAdmin,
      orgId: users.orgId, createdAt: users.createdAt, lastLoginAt: users.lastLoginAt, loginCount: users.loginCount,
    }).from(users).where(where).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(users).where(where),
  ]);

  return c.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

adminRouter.post("/users/:id/make-super-admin", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const [updated] = await db.update(users).set({ isSuperAdmin: true })
    .where(eq(users.id, c.req.param("id"))).returning({ id: users.id, name: users.name });
  if (!updated) return apiErr(c, "USR_NOT_FOUND", 404);

  logAdminAction(adminId, "make_super_admin", "user", updated.id, {}, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

adminRouter.post("/users/:id/revoke-super-admin", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const [updated] = await db.update(users).set({ isSuperAdmin: false })
    .where(eq(users.id, c.req.param("id"))).returning({ id: users.id, name: users.name });
  if (!updated) return apiErr(c, "USR_NOT_FOUND", 404);

  logAdminAction(adminId, "revoke_super_admin", "user", updated.id, {}, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

// ──────────────────────────────────────────────────────────
// IMPERSONATE
// ──────────────────────────────────────────────────────────

adminRouter.post("/impersonate/:orgId", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const orgId = c.req.param("orgId");

  const [org] = await db.select({ id: organizations.id, name: organizations.name })
    .from(organizations).where(eq(organizations.id, orgId));
  if (!org) return apiErr(c, "ORG_NOT_FOUND", 404);

  // Find owner of the org
  const [owner] = await db.select({ id: users.id, name: users.name, orgId: users.orgId })
    .from(users).where(and(eq(users.orgId, orgId), eq(users.type, "owner"))).limit(1);
  if (!owner) return apiErr(c, "ORG_NO_OWNER", 404);

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  // Create a temporary session
  const [session] = await db.insert(sessions).values({
    userId: owner.id,
    token: `imp_${crypto.randomUUID()}`,
    device: `Impersonate by admin ${adminId}`,
    ip: c.req.header("X-Forwarded-For") || "admin",
    expiresAt,
  }).returning();

  logAdminAction(adminId, "impersonate", "org", orgId, { ownerName: owner.name }, c.req.header("X-Forwarded-For"));

  return c.json({
    data: {
      token: session.token,
      expiresAt: expiresAt.toISOString(),
      org: { id: org.id, name: org.name },
      user: { id: owner.id, name: owner.name, orgId: owner.orgId },
    },
  });
});

// ──────────────────────────────────────────────────────────
// DOCUMENTS
// ──────────────────────────────────────────────────────────

adminRouter.get("/documents", async (c) => {
  const { page, limit, offset } = getPagination(c);
  const status = c.req.query("status");
  const orgId = c.req.query("orgId");

  const conditions: any[] = [];
  if (status) conditions.push(eq(orgDocuments.status, status));
  if (orgId) conditions.push(eq(orgDocuments.orgId, orgId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(orgDocuments).where(where).orderBy(desc(orgDocuments.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(orgDocuments).where(where),
  ]);

  return c.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

adminRouter.post("/documents", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const [doc] = await db.insert(orgDocuments).values({
    orgId: body.orgId,
    type: body.type,
    label: body.title ?? body.label ?? null,
    fileUrl: body.fileUrl,
    notes: body.notes ?? null,
    status: body.status ?? "pending",
  }).returning();
  logAdminAction(adminId, "create_document", "org", doc.orgId, { type: doc.type }, c.req.header("X-Forwarded-For"));
  return c.json({ data: doc }, 201);
});

adminRouter.patch("/documents/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status !== undefined) { updates.status = body.status; updates.reviewedBy = adminId; updates.reviewedAt = new Date(); }
  if (body.notes !== undefined) updates.notes = body.notes;

  const [updated] = await db.update(orgDocuments).set(updates)
    .where(eq(orgDocuments.id, c.req.param("id"))).returning();
  if (!updated) return apiErr(c, "DOC_NOT_FOUND", 404);

  logAdminAction(adminId, "review_document", "org", updated.orgId, { status: body.status }, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

// ──────────────────────────────────────────────────────────
// SUPPORT TICKETS
// ──────────────────────────────────────────────────────────

adminRouter.get("/tickets", async (c) => {
  const { page, limit, offset } = getPagination(c);
  const status      = c.req.query("status");
  const priority    = c.req.query("priority");
  const orgId       = c.req.query("orgId");
  const category    = c.req.query("category");
  const orgTypeFilter = c.req.query("orgType"); // e.g. "education"

  const conditions: any[] = [];
  if (status)        conditions.push(eq(supportTickets.status,   status));
  if (priority)      conditions.push(eq(supportTickets.priority, priority));
  if (orgId)         conditions.push(eq(supportTickets.orgId,    orgId));
  if (category)      conditions.push(eq(supportTickets.category, category));
  if (orgTypeFilter) conditions.push(eq(organizations.businessType, orgTypeFilter));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }], statsRows] = await Promise.all([
    db.select({
      id: supportTickets.id, orgId: supportTickets.orgId, subject: supportTickets.subject,
      body: supportTickets.body, category: supportTickets.category, priority: supportTickets.priority,
      status: supportTickets.status, assignedTo: supportTickets.assignedTo, messages: supportTickets.messages,
      createdAt: supportTickets.createdAt, updatedAt: supportTickets.updatedAt, resolvedAt: supportTickets.resolvedAt,
      openedBy: supportTickets.openedBy,
      orgName: organizations.name,
      orgBusinessType: organizations.businessType,
    })
    .from(supportTickets)
    .leftJoin(organizations, eq(supportTickets.orgId, organizations.id))
    .where(where)
    .orderBy(desc(supportTickets.updatedAt))
    .limit(limit).offset(offset),
    db.select({ total: count() }).from(supportTickets).where(where),
    db.select({ status: supportTickets.status, cnt: count() })
      .from(supportTickets).groupBy(supportTickets.status),
  ]);

  const stats: Record<string, number> = {};
  for (const r of statsRows) stats[r.status] = Number(r.cnt);

  return c.json({ data: rows, stats, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

adminRouter.get("/tickets/:id", async (c) => {
  const [ticket] = await db.select({
    id: supportTickets.id, orgId: supportTickets.orgId, subject: supportTickets.subject,
    body: supportTickets.body, category: supportTickets.category, priority: supportTickets.priority,
    status: supportTickets.status, assignedTo: supportTickets.assignedTo, messages: supportTickets.messages,
    createdAt: supportTickets.createdAt, updatedAt: supportTickets.updatedAt, resolvedAt: supportTickets.resolvedAt,
    openedBy: supportTickets.openedBy,
    orgName: organizations.name,
    orgBusinessType: organizations.businessType,
  })
  .from(supportTickets)
  .leftJoin(organizations, eq(supportTickets.orgId, organizations.id))
  .where(eq(supportTickets.id, c.req.param("id")));
  if (!ticket) return apiErr(c, "SUP_NOT_FOUND", 404);
  return c.json({ data: ticket });
});

adminRouter.post("/tickets", async (c) => {
  const body = await c.req.json();
  const [ticket] = await db.insert(supportTickets).values({
    orgId: body.orgId,
    subject: body.subject,
    body: body.body ?? "",
    category: body.category ?? null,
    priority: body.priority ?? "normal",
    status: body.status ?? "open",
    messages: body.messages ?? [],
    assignedTo: body.assignedTo ?? null,
  }).returning();
  return c.json({ data: ticket }, 201);
});

adminRouter.post("/tickets/:id/reply", async (c) => {
  const adminId   = c.get("adminId") as string;
  const adminName = c.get("adminName") as string;
  const body      = await c.req.json();
  const message   = (body.message || "").trim();
  if (!message) return apiErr(c, "MSG_REQUIRED", 400);

  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, c.req.param("id")));
  if (!ticket) return apiErr(c, "SUP_NOT_FOUND", 404);

  const newMsg = {
    id:        crypto.randomUUID(),
    sender:    "admin",
    senderId:  adminId,
    senderName: adminName ?? "فريق الدعم",
    message,
    createdAt: new Date().toISOString(),
  };
  const messages = [...((ticket.messages as any[]) || []), newMsg];

  const [updated] = await db.update(supportTickets)
    .set({ messages, status: "in_progress", updatedAt: new Date() })
    .where(eq(supportTickets.id, ticket.id))
    .returning();

  // Notify the merchant about the admin reply
  await createAlert({
    orgId:    ticket.orgId,
    type:     "support_reply",
    title:    "رد جديد من فريق الدعم",
    body:     `تم الرد على تذكرتك: "${ticket.subject}"`,
    link:     `/dashboard/support`,
    priority: "high",
  });

  logAdminAction(adminId, "reply_ticket", "ticket", ticket.id, {}, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

adminRouter.patch("/tickets/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const allowed = ["status", "priority", "assignedTo", "category"];
  for (const k of allowed) { if (body[k] !== undefined) updates[k] = body[k]; }
  if (body.status === "resolved") updates.resolvedAt = new Date();
  if (body.status === "open")     updates.resolvedAt = null;

  const [updated] = await db.update(supportTickets).set(updates)
    .where(eq(supportTickets.id, c.req.param("id"))).returning();
  if (!updated) return apiErr(c, "SUP_NOT_FOUND", 404);

  logAdminAction(adminId, "update_ticket", "ticket", updated.id, { status: body.status }, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

// ──────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ──────────────────────────────────────────────────────────

// ============================================================
// PLATFORM CONFIG — إعدادات المنصة (شعار، اسم، لون)
// ============================================================

adminRouter.get("/platform-config", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const [row] = await db.select().from(platformConfig).where(eq(platformConfig.id, "default"));
  return c.json({ data: row ?? { id: "default", platformName: "ترميز OS", logoUrl: null, faviconUrl: null, primaryColor: "#5b9bd5" } });
});

adminRouter.put("/platform-config", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const allowed = ["platformName", "logoUrl", "faviconUrl", "primaryColor", "supportEmail", "supportPhone"];
  const updates: Record<string, unknown> = { updatedAt: new Date(), updatedBy: adminId };
  for (const key of allowed) { if (body[key] !== undefined) updates[key] = body[key]; }

  await db.insert(platformConfig).values({ id: "default", ...updates })
    .onConflictDoUpdate({ target: platformConfig.id, set: updates });

  logAdminAction(adminId, "update_platform_config", "platform", "default", { fields: Object.keys(updates) }, c.req.header("X-Forwarded-For"));
  return c.json({ data: { ok: true } });
});

adminRouter.post("/platform-config/logo", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;
  if (!file || !(file instanceof File)) return c.json({ error: "لم يتم إرسال ملف" }, 400);
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
  if (!allowed.includes(file.type)) return c.json({ error: "يُسمح بـ PNG, JPG, WebP, SVG فقط" }, 400);
  if (file.size > 5 * 1024 * 1024) return c.json({ error: "الحجم يجب ألا يتجاوز 5MB" }, 400);

  const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/www/nasaq/uploads";
  const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "https://nasaqpro.tech";
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filename = `platform-logo-${nanoid(8)}.${ext}`;
  const platformDir = join(UPLOAD_DIR, "platform");
  await mkdir(platformDir, { recursive: true });
  await writeFile(join(platformDir, filename), Buffer.from(await file.arrayBuffer()));
  const logoUrl = `${PUBLIC_BASE}/uploads/platform/${filename}`;

  await db.insert(platformConfig).values({ id: "default", logoUrl, updatedAt: new Date(), updatedBy: adminId })
    .onConflictDoUpdate({ target: platformConfig.id, set: { logoUrl, updatedAt: new Date(), updatedBy: adminId } });

  logAdminAction(adminId, "update_platform_logo", "platform", "default", { filename }, c.req.header("X-Forwarded-For"));
  return c.json({ data: { url: logoUrl } }, 201);
});

adminRouter.post("/platform-config/favicon", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;
  if (!file || !(file instanceof File)) return c.json({ error: "لم يتم إرسال ملف" }, 400);
  const allowed = ["image/x-icon", "image/png", "image/svg+xml", "image/webp"];
  if (!allowed.includes(file.type)) return c.json({ error: "يُسمح بـ ICO, PNG, SVG فقط" }, 400);
  if (file.size > 1 * 1024 * 1024) return c.json({ error: "الحجم يجب ألا يتجاوز 1MB" }, 400);

  const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/www/nasaq/uploads";
  const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "https://nasaqpro.tech";
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filename = `platform-favicon-${nanoid(8)}.${ext}`;
  const platformDir = join(UPLOAD_DIR, "platform");
  await mkdir(platformDir, { recursive: true });
  await writeFile(join(platformDir, filename), Buffer.from(await file.arrayBuffer()));
  const faviconUrl = `${PUBLIC_BASE}/uploads/platform/${filename}`;

  await db.insert(platformConfig).values({ id: "default", faviconUrl, updatedAt: new Date(), updatedBy: adminId })
    .onConflictDoUpdate({ target: platformConfig.id, set: { faviconUrl, updatedAt: new Date(), updatedBy: adminId } });

  logAdminAction(adminId, "update_platform_favicon", "platform", "default", { filename }, c.req.header("X-Forwarded-For"));
  return c.json({ data: { url: faviconUrl } }, 201);
});

// Also expose platform config publicly (no auth) for Layout to consume
adminRouter.get("/platform-config/public", async (c) => {
  const [row] = await db.select({
    platformName: platformConfig.platformName,
    logoUrl: platformConfig.logoUrl,
    faviconUrl: platformConfig.faviconUrl,
    primaryColor: platformConfig.primaryColor,
    supportEmail: platformConfig.supportEmail,
    supportPhone: platformConfig.supportPhone,
  }).from(platformConfig).where(eq(platformConfig.id, "default"));
  return c.json({ data: row ?? { platformName: "ترميز OS", logoUrl: null, faviconUrl: null, primaryColor: "#5b9bd5", supportEmail: null, supportPhone: null } });
});

adminRouter.get("/announcements", async (c) => {
  const rows = await db.select().from(platformAnnouncements).orderBy(desc(platformAnnouncements.createdAt));
  return c.json({ data: rows });
});

adminRouter.post("/announcements", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const [row] = await db.insert(platformAnnouncements).values({
    title: body.title,
    body: body.content ?? body.body ?? "",
    type: body.type ?? "info",
    targetPlan: body.targetPlans ?? body.targetPlan ?? null,
    startsAt: body.publishedAt ? new Date(body.publishedAt) : (body.startsAt ? new Date(body.startsAt) : null),
    endsAt: body.expiresAt ? new Date(body.expiresAt) : (body.endsAt ? new Date(body.endsAt) : null),
    createdBy: adminId,
  }).returning();
  logAdminAction(adminId, "create_announcement", "announcement", row.id, {}, c.req.header("X-Forwarded-For"));
  return c.json({ data: row }, 201);
});

adminRouter.patch("/announcements/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.type !== undefined) updates.type = body.type;
  if (body.targetPlans !== undefined) updates.targetPlans = body.targetPlans;
  if (body.publishedAt !== undefined) updates.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
  if (body.expiresAt !== undefined) updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  const [updated] = await db.update(platformAnnouncements)
    .set(updates)
    .where(eq(platformAnnouncements.id, c.req.param("id"))).returning();
  if (!updated) return apiErr(c, "ANN_NOT_FOUND", 404);
  logAdminAction(adminId, "update_announcement", "announcement", updated.id, { fields: Object.keys(updates) }, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

adminRouter.delete("/announcements/:id", async (c) => {
  const adminId = c.get("adminId") as string;
  const [deleted] = await db.delete(platformAnnouncements)
    .where(eq(platformAnnouncements.id, c.req.param("id"))).returning({ id: platformAnnouncements.id });
  if (!deleted) return apiErr(c, "ANN_NOT_FOUND", 404);
  logAdminAction(adminId, "delete_announcement", "announcement", deleted.id, {}, c.req.header("X-Forwarded-For"));
  return c.json({ data: deleted });
});

// ──────────────────────────────────────────────────────────
// PLATFORM AUDIT LOG
// ──────────────────────────────────────────────────────────

adminRouter.get("/audit-log", async (c) => {
  const { page, limit, offset } = getPagination(c);
  const action = c.req.query("action");
  const targetType = c.req.query("targetType");
  const adminId = c.req.query("adminId");
  const fromDate = c.req.query("fromDate");
  const toDate = c.req.query("toDate");

  const conditions: any[] = [];
  if (action) conditions.push(ilike(platformAuditLog.action, `%${action}%`));
  if (targetType) conditions.push(eq(platformAuditLog.targetType, targetType));
  if (adminId) conditions.push(eq(platformAuditLog.adminId, adminId));
  if (fromDate) conditions.push(gte(platformAuditLog.createdAt, new Date(fromDate)));
  if (toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    conditions.push(lte(platformAuditLog.createdAt, to));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(platformAuditLog).where(where).orderBy(desc(platformAuditLog.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(platformAuditLog).where(where),
  ]);
  return c.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

// ──────────────────────────────────────────────────────────
// OTP DEBUG — عرض OTP نشط لأي رقم (سوبر أدمن فقط / SMS غير مفعّل)
// ──────────────────────────────────────────────────────────

adminRouter.get("/debug/otp", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  // Only available when SMS is not configured
  if (process.env.SMS_ENABLED === "true") {
    return c.json({ error: "غير متاح — SMS مفعّل" }, 403);
  }
  const phone = c.req.query("phone");
  const where = phone
    ? and(eq(otpCodes.phone, phone), gt(otpCodes.expiresAt, new Date()))
    : gt(otpCodes.expiresAt, new Date());
  const rows = await db
    .select({
      id: otpCodes.id,
      phone: otpCodes.phone,
      code: otpCodes.code,
      purpose: otpCodes.purpose,
      expiresAt: otpCodes.expiresAt,
      usedAt: otpCodes.usedAt,
      attempts: otpCodes.attempts,
      createdAt: otpCodes.createdAt,
    })
    .from(otpCodes)
    .where(where)
    .orderBy(desc(otpCodes.createdAt))
    .limit(20);
  return c.json({ data: rows, smsEnabled: false });
});

// ──────────────────────────────────────────────────────────
// SYSTEM DIAGNOSTICS — فحص شامل لصحة النظام
// ──────────────────────────────────────────────────────────

adminRouter.get("/system/diagnostics", async (c) => {
  const result = await runDiagnostics();
  return c.json({ data: result });
});

// ──────────────────────────────────────────────────────────
// SYSTEM ERRORS — آخر أخطاء الخادم (500) من سجل الأحداث
// ──────────────────────────────────────────────────────────

adminRouter.get("/system/errors", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50"), 100);
  const rows = await db
    .select()
    .from(platformAuditLog)
    .where(eq(platformAuditLog.action, "srv_error"))
    .orderBy(desc(platformAuditLog.createdAt))
    .limit(limit);
  return c.json({ data: rows });
});

// ──────────────────────────────────────────────────────────
// SYSTEM HEALTH
// ──────────────────────────────────────────────────────────

adminRouter.get("/system", async (c) => {
  const recent = await db.select().from(systemHealthLog)
    .orderBy(desc(systemHealthLog.recordedAt)).limit(24);

  // Live DB probe
  const dbStart = Date.now();
  try {
    const { pool } = await import("@nasaq/db/client");
    await pool.query("SELECT 1");
  } catch {}
  const dbLatency = Date.now() - dbStart;

  const [{ activeSessions }] = await db.select({ activeSessions: count() })
    .from(sessions).where(sql`${sessions.expiresAt} > NOW()`);

  return c.json({
    data: {
      dbLatencyMs: dbLatency,
      activeSessions: Number(activeSessions),
      history: recent,
    },
  });
});

// ──────────────────────────────────────────────────────────
// PLANS — full CRUD
// ──────────────────────────────────────────────────────────

adminRouter.get("/plans", async (c) => {
  const plans = await db.select().from(platformPlans).orderBy(asc(platformPlans.sortOrder));

  // Attach org counts per plan
  const stats = await db.select({
    plan: organizations.plan,
    total: count(),
  }).from(organizations).groupBy(organizations.plan);

  const statsMap = Object.fromEntries(stats.map((s) => [s.plan, Number(s.total)]));

  return c.json({
    data: plans.map((p) => ({ ...p, orgCount: statsMap[p.id] ?? 0 })),
  });
});

adminRouter.put("/plans/:id", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();
  const allowed = ["nameAr", "nameEn", "priceMonthly", "priceYearly", "currency",
    "trialDays", "maxUsers", "maxLocations", "features", "capabilities", "isActive", "sortOrder"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of allowed) { if (body[k] !== undefined) updates[k] = body[k]; }

  const [existing] = await db.select({ id: platformPlans.id }).from(platformPlans).where(eq(platformPlans.id, c.req.param("id")));
  if (!existing) return apiErr(c, "PLAN_NOT_FOUND", 404);

  const [updated] = await db.update(platformPlans).set(updates)
    .where(eq(platformPlans.id, c.req.param("id"))).returning();

  logAdminAction(adminId, "update_plan", "plan", updated.id, { fields: Object.keys(updates) }, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

// ──────────────────────────────────────────────────────────
// ORG CAPABILITIES — per-org toggle
// ──────────────────────────────────────────────────────────

const ALL_CAPABILITIES = [
  "bookings", "customers", "catalog", "media",
  "inventory", "accounting", "delivery", "marketing", "website",
  "attendance", "hotel", "car_rental", "floral", "pos",
  "online_orders", "contracts", "assets",
  "payment_gateway_nasaq",  // الدفع عبر بوابة نسق المركزية
  "payment_gateway_own",    // ربط بوابة دفع خاصة بالمنشأة
] as const;

adminRouter.get("/orgs/:id/capabilities", async (c) => {
  const [org] = await db.select({
    id: organizations.id,
    enabledCapabilities: organizations.enabledCapabilities,
    plan: organizations.plan,
  }).from(organizations).where(eq(organizations.id, c.req.param("id")));
  if (!org) return apiErr(c, "ORG_NOT_FOUND", 404);

  const overrides = await db.select().from(organizationCapabilityOverrides)
    .where(eq(organizationCapabilityOverrides.orgId, org.id));

  return c.json({
    data: {
      orgId: org.id,
      plan: org.plan,
      enabledCapabilities: org.enabledCapabilities as string[],
      overrides,
      allCapabilities: ALL_CAPABILITIES,
    },
  });
});

adminRouter.put("/orgs/:id/capabilities", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const { capabilities } = await c.req.json();
  if (!Array.isArray(capabilities)) return apiErr(c, "ORG_INVALID_CAPS", 400);

  const [updated] = await db.update(organizations)
    .set({ enabledCapabilities: capabilities, updatedAt: new Date() })
    .where(eq(organizations.id, c.req.param("id")))
    .returning({ id: organizations.id, enabledCapabilities: organizations.enabledCapabilities });

  if (!updated) return apiErr(c, "ORG_NOT_FOUND", 404);

  logAdminAction(adminId, "update_capabilities", "org", updated.id, { capabilities }, c.req.header("X-Forwarded-For"));
  invalidateOrgContext(updated.id);
  return c.json({ data: updated });
});

// ──────────────────────────────────────────────────────────
// ORG SUBSCRIPTION — change plan / extend trial
// ──────────────────────────────────────────────────────────

adminRouter.post("/orgs/:id/change-plan", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const { plan, subscriptionStatus, trialEndsAt, subscriptionEndsAt } = await c.req.json();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (plan) updates.plan = plan;
  if (subscriptionStatus) updates.subscriptionStatus = subscriptionStatus;
  if (trialEndsAt) updates.trialEndsAt = new Date(trialEndsAt);
  if (subscriptionEndsAt) updates.subscriptionEndsAt = new Date(subscriptionEndsAt);

  // Auto-set capabilities from plan defaults
  if (plan) {
    const [planConfig] = await db.select({ capabilities: platformPlans.capabilities })
      .from(platformPlans).where(eq(platformPlans.id, plan));
    if (planConfig?.capabilities) updates.enabledCapabilities = planConfig.capabilities;
  }

  const [updated] = await db.update(organizations).set(updates)
    .where(eq(organizations.id, c.req.param("id")))
    .returning({ id: organizations.id, name: organizations.name, plan: organizations.plan });
  if (!updated) return apiErr(c, "ORG_NOT_FOUND", 404);

  logAdminAction(adminId, "change_plan", "org", updated.id, { plan, subscriptionStatus }, c.req.header("X-Forwarded-For"));
  // Sync commercial engine → enabledCapabilities after plan change
  syncOrgEntitlements(updated.id).catch(() => {});
  return c.json({ data: updated });
});

// ──────────────────────────────────────────────────────────
// CREATE ORG — إنشاء منشأة جديدة من الأدمن
// ──────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────
// ORG USERS — list users belonging to an org
// ──────────────────────────────────────────────────────────

adminRouter.get("/orgs/:id/users", async (c) => {
  const rows = await db.select({
    id: users.id, name: users.name, email: users.email,
    phone: users.phone, status: users.status, type: users.type,
    jobTitle: users.jobTitle, createdAt: users.createdAt,
  }).from(users).where(eq(users.orgId, c.req.param("id"))).orderBy(asc(users.name));
  return c.json({ data: rows });
});

// ──────────────────────────────────────────────────────────
// ORG ACCOUNT MANAGER — assign / unassign
// ──────────────────────────────────────────────────────────

adminRouter.put("/orgs/:id/manager", async (c) => {
  const adminId = c.get("adminId") as string;
  const { managerId } = await c.req.json();

  const [updated] = await db.update(organizations)
    .set({ accountManagerId: managerId ?? null, updatedAt: new Date() })
    .where(eq(organizations.id, c.req.param("id")))
    .returning({ id: organizations.id, accountManagerId: organizations.accountManagerId });

  if (!updated) return apiErr(c, "ORG_NOT_FOUND", 404);
  logAdminAction(adminId, "assign_manager", "org", updated.id, { managerId }, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

// ──────────────────────────────────────────────────────────
// NASAQ STAFF — get / set roles
// ──────────────────────────────────────────────────────────

adminRouter.get("/staff", async (c) => {
  const rows = await db.select({
    id: users.id, name: users.name, email: users.email, phone: users.phone,
    isSuperAdmin: users.isSuperAdmin, nasaqRole: users.nasaqRole,
    lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
  }).from(users).where(
    sql`${users.isSuperAdmin} = true OR ${users.nasaqRole} IS NOT NULL`
  ).orderBy(asc(users.name));

  // Attach assigned orgs count per manager
  const managerCounts = await db.select({
    mgr: organizations.accountManagerId,
    cnt: count(),
  }).from(organizations).where(sql`account_manager_id IS NOT NULL`).groupBy(organizations.accountManagerId);
  const cntMap: Record<string, number> = {};
  for (const r of managerCounts) if (r.mgr) cntMap[r.mgr] = Number(r.cnt);

  return c.json({ data: rows.map((u) => ({ ...u, assignedOrgs: cntMap[u.id] ?? 0 })) });
});

adminRouter.patch("/staff/:userId/role", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const { role } = await c.req.json(); // null to remove role

  const updates: Record<string, unknown> = { nasaqRole: role ?? null, updatedAt: new Date() };
  if (role === "super_admin") { updates.nasaqRole = null; updates.isSuperAdmin = true; }
  if (role === null) updates.isSuperAdmin = false;

  const [updated] = await db.update(users).set(updates)
    .where(eq(users.id, c.req.param("userId")))
    .returning({ id: users.id, name: users.name, nasaqRole: users.nasaqRole, isSuperAdmin: users.isSuperAdmin });
  if (!updated) return apiErr(c, "USR_NOT_FOUND", 404);

  logAdminAction(adminId, "set_staff_role", "user", updated.id, { role }, c.req.header("X-Forwarded-For"));
  return c.json({ data: updated });
});

// POST /admin/staff — إنشاء عضو جديد في فريق نسق
adminRouter.post("/staff", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();

  if (!body.name || (!body.email && !body.phone)) {
    return apiErr(c, "USR_INVALID_INPUT", 400);
  }
  if (!body.password || body.password.length < 8) {
    return apiErr(c, "USR_WEAK_PASSWORD", 400);
  }

  // Use admin's orgId for new staff member
  const [admin] = await db.select({ orgId: users.orgId }).from(users).where(eq(users.id, adminId));
  if (!admin) return apiErr(c, "AUTH_NO_ADMIN", 401);

  if (body.email) {
    const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email.toLowerCase().trim()));
    if (dup) return apiErr(c, "USR_EMAIL_TAKEN", 409);
  }

  const role = body.role || "viewer";
  const isSuperAdminFlag = role === "super_admin";

  const [created] = await db.insert(users).values({
    orgId: admin.orgId,
    name: body.name.trim(),
    email: body.email ? body.email.toLowerCase().trim() : null,
    phone: body.phone || null,
    passwordHash: hashPassword(body.password),
    isSuperAdmin: isSuperAdminFlag,
    nasaqRole: isSuperAdminFlag ? null : role,
    type: "employee",
    status: "active",
  }).returning({
    id: users.id, name: users.name, email: users.email, phone: users.phone,
    isSuperAdmin: users.isSuperAdmin, nasaqRole: users.nasaqRole, createdAt: users.createdAt,
  });

  logAdminAction(adminId, "create_staff", "user", created.id, { role }, c.req.header("X-Forwarded-For"));
  return c.json({ data: created }, 201);
});

// DELETE /admin/staff/:id — حذف عضو من فريق نسق
adminRouter.delete("/staff/:id", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const id = c.req.param("id");

  if (id === adminId) return apiErr(c, "USR_SELF_DELETE", 400);

  const [target] = await db.select({ id: users.id, isSuperAdmin: users.isSuperAdmin })
    .from(users).where(eq(users.id, id));
  if (!target) return apiErr(c, "USR_NOT_FOUND", 404);
  if (target.isSuperAdmin) return apiErr(c, "USR_DELETE_SUPER", 403);

  await db.update(users).set({ status: "suspended", nasaqRole: null, updatedAt: new Date() }).where(eq(users.id, id));
  logAdminAction(adminId, "remove_staff", "user", id, {}, c.req.header("X-Forwarded-For"));
  return c.json({ success: true });
});

// ──────────────────────────────────────────────────────────
// CLIENTS PORTFOLIO — orgs by account manager
// ──────────────────────────────────────────────────────────

adminRouter.get("/clients", async (c) => {
  const managerId = c.req.query("managerId");
  const where = managerId
    ? eq(organizations.accountManagerId, managerId)
    : sql`account_manager_id IS NOT NULL`;

  const rows = await db.select({
    id: organizations.id, name: organizations.name, plan: organizations.plan,
    subscriptionStatus: organizations.subscriptionStatus,
    businessType: organizations.businessType,
    accountManagerId: organizations.accountManagerId,
    trialEndsAt: organizations.trialEndsAt,
    subscriptionEndsAt: organizations.subscriptionEndsAt,
    isVerified: organizations.isVerified,
    suspendedAt: organizations.suspendedAt,
  }).from(organizations).where(where).orderBy(desc(organizations.createdAt));

  return c.json({ data: rows });
});

adminRouter.post("/orgs", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const body = await c.req.json();

  const { name, nameEn, businessType, plan, phone, email, city, ownerName, ownerEmail, ownerPassword } = body;
  const ownerPhone = body.ownerPhone ? normalizePhoneAdmin(body.ownerPhone) : null;
  if (!name) return apiErr(c, "ORG_NAME_REQUIRED", 400);
  if (!plan) return apiErr(c, "ORG_PLAN_REQUIRED", 400);

  // If owner phone provided, check it's not already taken
  if (ownerPhone) {
    const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.phone, ownerPhone));
    if (dup) return apiErr(c, "USR_PHONE_TAKEN", 409);
  }
  // If owner email provided, check it's not already taken
  if (ownerEmail) {
    const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, ownerEmail.toLowerCase().trim()));
    if (dup) return apiErr(c, "USR_EMAIL_TAKEN", 409);
  }

  const slug = body.slug || generateSlug(nameEn || name);

  // Get plan capabilities
  const [planConfig] = await db.select({ capabilities: platformPlans.capabilities, trialDays: platformPlans.trialDays })
    .from(platformPlans).where(eq(platformPlans.id, plan));

  const trialDays = planConfig?.trialDays ?? 14;
  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

  let ownerRawPass: string | undefined;

  const org = await db.transaction(async (tx) => {
    const seqResult = await tx.execute(sql`SELECT nextval('org_code_seq') AS n`);
    const seqRow = (seqResult as any).rows?.[0] ?? (seqResult as any)[0] ?? { n: "0001" };
    const orgCode = `NSQ-${String(seqRow.n).padStart(4, "0")}`;

    const [newOrg] = await tx.insert(organizations).values({
      orgCode,
      name,
      nameEn: nameEn || null,
      slug,
      phone: phone || null,
      email: email || null,
      city: city || null,
      businessType: businessType || "general",
      plan,
      subscriptionStatus: "trialing",
      trialEndsAt,
      enabledCapabilities: planConfig?.capabilities ?? ["bookings", "customers", "catalog", "media"],
    }).returning();

    // Default main location
    await tx.insert(locations).values({
      orgId: newOrg.id,
      name: "الفرع الرئيسي",
      isMainBranch: true,
      isActive: true,
    });

    // Create owner user if owner details provided
    if (ownerPhone || ownerName || ownerEmail) {
      ownerRawPass = ownerPassword?.trim()
        || Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 4).toUpperCase();
      const finalHash = hashPassword(ownerRawPass!);
      await tx.insert(users).values({
        orgId: newOrg.id,
        name: ownerName || name,
        phone: ownerPhone || "",
        email: ownerEmail ? ownerEmail.toLowerCase().trim() : null,
        passwordHash: finalHash,
        type: "owner",
        status: "active",
      });

      // Default roles
      await tx.insert(roles).values([
        { orgId: newOrg.id, name: "مدير عمليات", nameEn: "Operations Manager", isSystem: true },
        { orgId: newOrg.id, name: "مشرف حجوزات", nameEn: "Booking Supervisor", isSystem: true },
        { orgId: newOrg.id, name: "محاسب", nameEn: "Accountant", isSystem: true },
      ]);

      // Default booking pipeline
      await tx.insert(bookingPipelineStages).values([
        { orgId: newOrg.id, name: "طلب جديد", color: "#9E9E9E", sortOrder: 1, isDefault: true },
        { orgId: newOrg.id, name: "تأكيد أولي", color: "#FF9800", sortOrder: 2 },
        { orgId: newOrg.id, name: "عربون مدفوع", color: "#2196F3", sortOrder: 3 },
        { orgId: newOrg.id, name: "تأكيد نهائي", color: "#4CAF50", sortOrder: 4 },
        { orgId: newOrg.id, name: "مكتمل", color: "#4CAF50", sortOrder: 5, isTerminal: true },
        { orgId: newOrg.id, name: "ملغي", color: "#F44336", sortOrder: 6, isTerminal: true },
      ]);
    }

    // Create subscription history record
    const planNames: Record<string, string> = {
      basic: "الأساسي", advanced: "المتقدم", pro: "الاحترافي", enterprise: "المؤسسي",
    };
    const subNumber = "SUB-" + randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
    const subStart = new Date();
    const subEnd = new Date(subStart.getTime() + 365 * 24 * 60 * 60 * 1000);
    await tx.insert(subscriptions).values({
      orgId: newOrg.id,
      subscriptionNumber: subNumber,
      planKey: plan,
      planName: planNames[plan] || plan,
      startDate: subStart,
      endDate: subEnd,
      status: "active",
    });

    return newOrg;
  });

  logAdminAction(adminId, "create_org", "org", org.id, { name, plan, hasOwner: !!(ownerPhone || ownerName || ownerEmail) }, c.req.header("X-Forwarded-For"));
  // مزامنة المحرك التجاري للمنشأة الجديدة
  syncOrgEntitlements(org.id).catch(() => {});
  return c.json({
    data: org,
    ownerCredentials: ownerRawPass ? {
      phone: ownerPhone || null,
      email: ownerEmail || null,
      password: ownerRawPass,
    } : null,
  }, 201);
});

// ── Admin: Reset org owner password ────────────────────────
adminRouter.patch("/orgs/:id/reset-password", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const orgId = c.req.param("id");
  const body = await c.req.json();
  const password = body.password?.trim();
  if (!password || password.length < 6) return apiErr(c, "PASSWORD_TOO_SHORT", 400);

  const [owner] = await db.select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.type, "owner")));

  if (!owner) return apiErr(c, "OWNER_NOT_FOUND", 404);

  await db.update(users)
    .set({ passwordHash: hashPassword(password) })
    .where(eq(users.id, owner.id));

  logAdminAction(adminId, "reset_owner_password", "org", orgId, { ownerName: owner.name }, c.req.header("X-Forwarded-For"));
  return c.json({ ok: true });
});

// ── Admin: Subscription Add-ons ────────────────────────────

adminRouter.get("/orgs/:id/addons", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const rows = await db.select().from(subscriptionAddons)
    .where(eq(subscriptionAddons.orgId, c.req.param("id")))
    .orderBy(asc(subscriptionAddons.createdAt));
  return c.json({ data: rows });
});

adminRouter.post("/orgs/:id/addons", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  const { addonKey, addonName, price } = await c.req.json();
  if (!addonKey || !addonName) return apiErr(c, "SRV_VALIDATION", 400);
  const [row] = await db.insert(subscriptionAddons).values({
    orgId: c.req.param("id"),
    addonKey, addonName,
    price: String(price ?? 0),
    isActive: true,
    activatedAt: new Date(),
  }).returning();
  logAdminAction(adminId, "add_addon", "org", c.req.param("id"), { addonKey }, c.req.header("X-Forwarded-For"));
  return c.json({ data: row }, 201);
});

adminRouter.delete("/orgs/:id/addons/:addonId", async (c) => {
  if (!isSuperAdmin(c)) return superAdminOnly(c);
  const adminId = c.get("adminId") as string;
  await db.update(subscriptionAddons)
    .set({ isActive: false, deactivatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(subscriptionAddons.id, c.req.param("addonId")), eq(subscriptionAddons.orgId, c.req.param("id"))));
  logAdminAction(adminId, "remove_addon", "org", c.req.param("id"), { addonId: c.req.param("addonId") }, c.req.header("X-Forwarded-For"));
  return c.json({ ok: true });
});

// ── Admin: Reminder categories ─────────────────────────────
adminRouter.get("/reminder-categories", async (c) => {
  const rows = await db.select().from(reminderCategories).orderBy(asc(reminderCategories.name));
  return c.json({ data: rows });
});
adminRouter.post("/reminder-categories", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(reminderCategories).values({ name: body.name, icon: body.icon || null, color: body.color || null, orgId: null }).returning();
  return c.json({ data: row }, 201);
});

// ── Admin: Reminder templates ──────────────────────────────
adminRouter.get("/reminder-templates", async (c) => {
  const rows = await db.select().from(reminderTemplates).orderBy(asc(reminderTemplates.name));
  return c.json({ data: rows });
});
adminRouter.post("/reminder-templates", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(reminderTemplates).values({ name: body.name, description: body.description || null, categoryId: body.categoryId || null, isSystem: true, orgId: null }).returning();
  return c.json({ data: row }, 201);
});
adminRouter.patch("/reminder-templates/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const [row] = await db.update(reminderTemplates).set({ name: body.name, description: body.description }).where(eq(reminderTemplates.id, id)).returning();
  return c.json({ data: row });
});
adminRouter.delete("/reminder-templates/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(reminderTemplates).where(eq(reminderTemplates.id, id));
  return c.json({ success: true });
});

// ── Admin: All org reminders (platform-wide) ───────────────
adminRouter.get("/reminders", async (c) => {
  const { orgId, status } = c.req.query();
  let q = db.select({
    id: orgReminders.id, title: orgReminders.title, dueDate: orgReminders.dueDate,
    status: orgReminders.status, priority: orgReminders.priority,
    orgId: orgReminders.orgId, orgName: organizations.name,
    createdAt: orgReminders.createdAt,
  }).from(orgReminders).innerJoin(organizations, eq(orgReminders.orgId, organizations.id));
  const conditions = [sql`${orgReminders.deletedAt} IS NULL`];
  if (orgId) conditions.push(eq(orgReminders.orgId, orgId));
  if (status) conditions.push(eq(orgReminders.status, status));
  const rows = await q.where(and(...conditions)).orderBy(asc(orgReminders.dueDate)).limit(200);
  return c.json({ data: rows });
});

// ============================================================
// ADMIN: Subscription Orders — إدارة طلبات الشراء
// ============================================================

// GET /admin/subscription-orders?status=pending_payment
adminRouter.get("/subscription-orders", async (c) => {
  const status = c.req.query("status") ?? "pending_payment";
  const rows = await db
    .select({
      id:        subscriptionOrders.id,
      orgId:     subscriptionOrders.orgId,
      orgName:   organizations.name,
      orgCode:   organizations.orgCode,
      orderType: subscriptionOrders.orderType,
      itemKey:   subscriptionOrders.itemKey,
      itemName:  subscriptionOrders.itemName,
      price:     subscriptionOrders.price,
      status:    subscriptionOrders.status,
      paymentRef: subscriptionOrders.paymentRef,
      expiresAt: subscriptionOrders.expiresAt,
      createdAt: subscriptionOrders.createdAt,
    })
    .from(subscriptionOrders)
    .innerJoin(organizations, eq(subscriptionOrders.orgId, organizations.id))
    .where(status === "all" ? sql`1=1` : eq(subscriptionOrders.status, status))
    .orderBy(desc(subscriptionOrders.createdAt))
    .limit(200);
  return c.json({ data: rows });
});

// POST /admin/subscription-orders/:id/confirm — super_admin only
adminRouter.post("/subscription-orders/:id/confirm", async (c) => {
  if (!isSuperAdmin(c)) return c.json({ error: "غير مصرح" }, 403);
  const orderId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const paymentRef: string | null = body.paymentRef ?? null;

  const [order] = await db.select().from(subscriptionOrders).where(eq(subscriptionOrders.id, orderId));
  if (!order)                       return c.json({ error: "الطلب غير موجود" }, 404);
  if (order.status === "paid")      return c.json({ error: "الطلب مدفوع بالفعل" }, 409);
  if (order.status === "cancelled") return c.json({ error: "الطلب ملغي" }, 409);

  await _activateOrder(order, paymentRef);

  const adminId = c.get("adminId") as string;
  logAdminAction(adminId, "confirm_payment", "subscription_order", order.id, { paymentRef }, c.req.header("X-Forwarded-For"));

  return c.json({ data: { success: true, orderId } });
});

// POST /admin/subscription-orders/:id/cancel — super_admin only
adminRouter.post("/subscription-orders/:id/cancel", async (c) => {
  if (!isSuperAdmin(c)) return c.json({ error: "غير مصرح" }, 403);
  const orderId = c.req.param("id");
  const [order] = await db.select({ id: subscriptionOrders.id, status: subscriptionOrders.status })
    .from(subscriptionOrders).where(eq(subscriptionOrders.id, orderId));
  if (!order) return c.json({ error: "الطلب غير موجود" }, 404);

  await db.update(subscriptionOrders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(subscriptionOrders.id, orderId));

  return c.json({ data: { success: true } });
});

// ──────────────────────────────────────────────────────────
// WORK ORDERS — cross-org view for super_admin
// ──────────────────────────────────────────────────────────

adminRouter.get("/work-orders", async (c) => {
  const { page, limit, offset } = getPagination(c);
  const orgId   = c.req.query("orgId");
  const status  = c.req.query("status");
  const q       = c.req.query("q");

  const conds: any[] = [];
  if (orgId)  conds.push(eq(workOrders.orgId, orgId));
  if (status) conds.push(eq(workOrders.status, status as any));
  if (q)      conds.push(or(ilike(workOrders.customerName, `%${q}%`), ilike(workOrders.itemName, `%${q}%`)));

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: workOrders.id, orgId: workOrders.orgId, orgName: organizations.name,
      status: workOrders.status, category: workOrders.category,
      customerName: workOrders.customerName, itemName: workOrders.itemName,
      finalCost: workOrders.finalCost, createdAt: workOrders.createdAt,
    })
    .from(workOrders)
    .leftJoin(organizations, eq(organizations.id, workOrders.orgId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(workOrders.createdAt))
    .limit(limit).offset(offset),
    db.select({ total: count() }).from(workOrders).where(conds.length ? and(...conds) : undefined),
  ]);

  return c.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

// ──────────────────────────────────────────────────────────
// ACCESS LOGS — cross-org view for super_admin
// ──────────────────────────────────────────────────────────

adminRouter.get("/access-logs", async (c) => {
  const { page, limit, offset } = getPagination(c);
  const orgId   = c.req.query("orgId");
  const granted = c.req.query("granted");
  const date    = c.req.query("date");

  const conds: any[] = [];
  if (orgId)             conds.push(eq(accessLogs.orgId, orgId));
  if (granted !== undefined) conds.push(eq(accessLogs.granted, granted === "true"));
  if (date)              conds.push(sql`DATE(${accessLogs.accessedAt}) = ${date}`);

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: accessLogs.id, orgId: accessLogs.orgId, orgName: organizations.name,
      customerName: accessLogs.customerName, method: accessLogs.method,
      granted: accessLogs.granted, denyReason: accessLogs.denyReason,
      accessedAt: accessLogs.accessedAt,
    })
    .from(accessLogs)
    .leftJoin(organizations, eq(organizations.id, accessLogs.orgId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(accessLogs.accessedAt))
    .limit(limit).offset(offset),
    db.select({ total: count() }).from(accessLogs).where(conds.length ? and(...conds) : undefined),
  ]);

  return c.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

// ──────────────────────────────────────────────────────────
// GALLERIES — cross-org view for super_admin
// ──────────────────────────────────────────────────────────

adminRouter.get("/galleries", async (c) => {
  const { page, limit, offset } = getPagination(c);
  const orgId = c.req.query("orgId");
  const q     = c.req.query("q");

  const conds: any[] = [eq(mediaGalleries.isActive, true)];
  if (orgId) conds.push(eq(mediaGalleries.orgId, orgId));
  if (q)     conds.push(ilike(mediaGalleries.name, `%${q}%`));

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: mediaGalleries.id, orgId: mediaGalleries.orgId, orgName: organizations.name,
      name: mediaGalleries.name, clientName: mediaGalleries.clientName,
      token: mediaGalleries.token, assetIds: mediaGalleries.assetIds,
      expiresAt: mediaGalleries.expiresAt, createdAt: mediaGalleries.createdAt,
    })
    .from(mediaGalleries)
    .leftJoin(organizations, eq(organizations.id, mediaGalleries.orgId))
    .where(and(...conds))
    .orderBy(desc(mediaGalleries.createdAt))
    .limit(limit).offset(offset),
    db.select({ total: count() }).from(mediaGalleries).where(and(...conds)),
  ]);

  return c.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});

// ──────────────────────────────────────────────────────────
// QUOTA USAGE — cross-org usage metrics for super_admin
// ──────────────────────────────────────────────────────────

adminRouter.get("/quota-usage", async (c) => {
  const { page, limit, offset } = getPagination(c);
  const orgId  = c.req.query("orgId");
  const metric = c.req.query("metric");

  const conds: any[] = [];
  if (orgId)  conds.push(eq(quotaUsage.orgId, orgId));
  if (metric) conds.push(eq(quotaUsage.metricKey, metric));

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: quotaUsage.id, orgId: quotaUsage.orgId, orgName: organizations.name,
      metricKey: quotaUsage.metricKey, period: quotaUsage.period,
      usedCount: quotaUsage.usedCount, updatedAt: quotaUsage.updatedAt,
    })
    .from(quotaUsage)
    .leftJoin(organizations, eq(organizations.id, quotaUsage.orgId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(quotaUsage.updatedAt))
    .limit(limit).offset(offset),
    db.select({ total: count() }).from(quotaUsage).where(conds.length ? and(...conds) : undefined),
  ]);

  return c.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
});
