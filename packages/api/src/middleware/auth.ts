import { Context, Next } from "hono";
import { eq, and, gt, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { sessions, users, roles, rolePermissions, permissions, orgMembers, jobTitlePermissions, jobTitles, organizations, userConstraints } from "@nasaq/db/schema";
import { resolvePermissions } from "../lib/default-permissions";
import type { SystemRole } from "../lib/default-permissions";
import { orgHasCapability } from "../lib/org-context";
import { permCache, orgStatusCache } from "../lib/cache";

// ============================================================
// AUTH MIDDLEWARE
// يتحقق من التوكن في كل طلب ويحمّل بيانات المستخدم والصلاحيات
// ============================================================

export type UserConstraints = {
  maxDiscountPct:          number | null;
  maxVoidCount:            number | null;
  requireApprovalAbove:    number | null;
  canCreateInvoice:        boolean | null;
  canVoidInvoice:          boolean | null;
  canGiveDiscount:         boolean | null;
  canAccessReports:        boolean | null;
  canExportData:           boolean | null;
  canManageTeam:           boolean | null;
};

export type AuthUser = {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  email: string | null;
  type: string;
  status: string;
  roleId: string | null;
  roleName: string | null;
  permissions: string[]; // ["services:view", "bookings.view", ...]
  dotPermissions: string[]; // new-style dot-notation ["bookings.view", "team.add", ...]
  systemRole: SystemRole | null;
  allowedLocationIds: string[];
  constraints: UserConstraints | null; // Layer 6: per-user overrides
};

/**
 * الميدلوير الأساسي — يمنع الدخول بدون تسجيل
 */
export async function authMiddleware(c: Context, next: Next) {
  // Dev mode: تجاوز عبر X-Org-Id + X-User-Id headers
  // يتطلب NODE_ENV=development وDEV_AUTH_BYPASS=true معاً لمنع التفعيل الخاطئ
  const isDevBypassEnabled =
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTH_BYPASS === "true";

  if (isDevBypassEnabled) {
    const devOrgId = c.req.header("X-Org-Id");
    const devUserId = c.req.header("X-User-Id");
    if (devOrgId && devUserId) {
      // Load user from DB
      const user = await loadUser(devUserId);
      if (user) {
        c.set("user", user);
        c.set("orgId", user.orgId);
        return next();
      }
    }
    // في Dev بدون user — نمرر بس نحط orgId
    if (devOrgId) {
      c.set("orgId", devOrgId);
      c.set("user", null);
      return next();
    }
  }

  // Production: Bearer token
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "غير مصرح — يجب تسجيل الدخول", code: "UNAUTHORIZED" }, 401);
  }

  const token = authHeader.substring(7);

  // Find valid session
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      )
    );

  if (!session) {
    return c.json({ error: "جلسة منتهية — يرجى تسجيل الدخول مجدداً", code: "SESSION_EXPIRED" }, 401);
  }

  // Load user with permissions
  const user = await loadUser(session.userId);
  if (!user) {
    return c.json({ error: "المستخدم غير موجود", code: "USER_NOT_FOUND" }, 401);
  }

  // Check if user account is active (compare status field, NOT type)
  if (user.status === "suspended" || user.status === "inactive") {
    return c.json({ error: "الحساب معطّل", code: "ACCOUNT_DISABLED" }, 403);
  }

  // Check org subscription status — skip for billing/webhooks/health paths
  const path = new URL(c.req.url).pathname;
  const isBypassPath = SUSPENSION_BYPASS_PREFIXES.some((p) => path.startsWith(p));
  if (!isBypassPath) {
    const subStatus = await getOrgSubscriptionStatus(user.orgId);
    if (subStatus === "suspended") {
      return c.json({
        error: "اشتراككم موقوف — يرجى تجديد الاشتراك للاستمرار",
        code: "ORG_SUSPENDED",
        billingUrl: "/billing/status",
      }, 402);
    }
  }

  // Set context
  c.set("user", user);
  c.set("orgId", user.orgId);

  return next();
}

/**
 * ميدلوير التحقق من صلاحية محددة (النمط القديم: resource:action)
 * استخدام: app.use("/services", requirePermission("services", "view"))
 */
export function requirePermission(resource: string, action: string) {
  return async (c: Context, next: Next) => {
    const user: AuthUser | null = c.get("user");

    // Dev mode بدون user — نمرر
    const isDevBypassEnabled =
      process.env.NODE_ENV === "development" &&
      process.env.DEV_AUTH_BYPASS === "true";
    if (!user && isDevBypassEnabled) {
      return next();
    }

    if (!user) {
      return c.json({ error: "غير مصرح", code: "UNAUTHORIZED" }, 401);
    }

    // Owner يتجاوز كل الصلاحيات
    if (user.type === "owner" || user.systemRole === "owner") {
      return next();
    }

    const required = `${resource}:${action}`;

    // ── RBAC v2 compatibility ──────────────────────────────────────────────
    // v1 route resource names don't always match v2 dotPermissions resource names.
    // Map: methodGuard resource → dotPermissions resource(s) + action aliases.
    //
    // Rule: actions map (edit→update), plus per-resource overrides for DELETE.
    // Resource aliases: services/categories/addons → products, inventory → products.
    const DOT_RESOURCE_ALIASES: Record<string, string[]> = {
      services:   ["products"],
      categories: ["products"],
      addons:     ["products"],
      bundles:    ["products"],
      inventory:  ["products"],
    };
    const DOT_ACTION_ALIASES: Record<string, Record<string, string>> = {
      bookings: { delete: "cancel" },
      orders:   { delete: "cancel" },
    };
    const dotAction = DOT_ACTION_ALIASES[resource]?.[action] ?? (action === "edit" ? "update" : action);
    const dotResources = [resource, ...(DOT_RESOURCE_ALIASES[resource] ?? [])];

    // Special case: inventory.view → products.inventory (not products.view)
    const dotCandidates: string[] = dotResources.flatMap((r) => {
      if (r === "products" && resource === "inventory" && dotAction === "view") {
        return [`${r}.inventory`, `${r}.view`];
      }
      return [`${r}.${dotAction}`];
    });

    const hasPermission =
      user.permissions.includes(required) ||
      dotCandidates.some((perm) => user.dotPermissions.includes(perm));

    if (!hasPermission) {
      return c.json({
        error: `ليس لديك صلاحية: ${required}`,
        code: "FORBIDDEN",
        required,
      }, 403);
    }

    return next();
  };
}

/**
 * ميدلوير التحقق من صلاحية بالنمط الجديد (dot-notation)
 * استخدام: requirePerm("bookings.view") أو requirePerm("team.add")
 */
export function requirePerm(permKey: string) {
  return async (c: Context, next: Next) => {
    const user: AuthUser | null = c.get("user");

    const isDevBypassEnabled =
      process.env.NODE_ENV === "development" &&
      process.env.DEV_AUTH_BYPASS === "true";
    if (!user && isDevBypassEnabled) return next();
    if (!user) return c.json({ error: "غير مصرح", code: "UNAUTHORIZED" }, 401);

    if (user.type === "owner" || user.systemRole === "owner") return next();

    if (!user.dotPermissions.includes(permKey)) {
      return c.json({
        error: `ليس لديك صلاحية: ${permKey}`,
        code: "FORBIDDEN",
        required: permKey,
      }, 403);
    }

    return next();
  };
}

/**
 * ميدلوير فلترة البيانات حسب الموقع (Data-level RBAC)
 * يضيف allowedLocationIds للـ context عشان الـ routes تفلتر
 */
export function locationFilter() {
  return async (c: Context, next: Next) => {
    const user: AuthUser | null = c.get("user");
    
    if (user && user.allowedLocationIds.length > 0) {
      c.set("locationFilter", user.allowedLocationIds);
    } else {
      c.set("locationFilter", null); // null = all locations
    }

    return next();
  };
}

// ============================================================
// CAPABILITY GATE MIDDLEWARE
// Checks org.enabledCapabilities via cached OrgContext
// ============================================================

export function requireCapability(capability: string) {
  return async (c: Context, next: Next) => {
    const orgId = c.get("orgId") as string | undefined;
    if (!orgId) return c.json({ error: "Unauthorized" }, 401);

    const isDevBypassEnabled =
      process.env.NODE_ENV === "development" &&
      process.env.DEV_AUTH_BYPASS === "true";
    if (isDevBypassEnabled) return next();

    const hasCapability = await orgHasCapability(orgId, capability);
    if (!hasCapability) {
      return c.json({
        error: `هذه الميزة غير مفعّلة لحسابك (${capability})`,
        code: "CAPABILITY_DISABLED",
        capability,
      }, 403);
    }
    return next();
  };
}

// ============================================================
// SUPER ADMIN MIDDLEWARE — مصدر الحقيقة الوحيد، يُستورد في admin.ts و commercial.ts
// ============================================================

export async function superAdminMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return c.json({ error: "غير مصرح" }, 401);

  const token = authHeader.substring(7);
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.token, token), sql`${sessions.expiresAt} > NOW()`));

  if (!session) return c.json({ error: "الجلسة منتهية" }, 401);

  const [user] = await db
    .select({ id: users.id, name: users.name, isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, session.userId));

  if (!user?.isSuperAdmin) return c.json({ error: "غير مصرح — يلزم صلاحية سوبر أدمن" }, 403);

  c.set("adminId", user.id);
  c.set("adminName", user.name);
  return next();
}

// ============================================================
// HELPERS
// ============================================================

// ── Org subscription status cache (30s TTL) ───────────────────────────────
// المثيل من cache.ts — يدعم Redis عند تفعيله
const ORG_STATUS_TTL_MS = 30_000;

/** يُبطل cache المنشأة — استدعه بعد تحديث حالة الاشتراك مباشرة */
export function invalidateOrgStatusCache(orgId: string): void {
  orgStatusCache.del(orgId);
}

async function getOrgSubscriptionStatus(orgId: string): Promise<string> {
  const cached = await orgStatusCache.get<string>(`org:${orgId}`);
  if (cached !== null) return cached;

  const [org] = await db
    .select({ subscriptionStatus: organizations.subscriptionStatus })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const status = org?.subscriptionStatus ?? "active";
  await orgStatusCache.set(`org:${orgId}`, status, ORG_STATUS_TTL_MS);
  return status;
}

// المسارات التي تعمل حتى لو المنشأة موقوفة (billing + webhooks + health)
const SUSPENSION_BYPASS_PREFIXES = [
  "/api/v1/billing",
  "/api/v1/webhooks",
  "/api/v1/health",
  "/api/v1/auth",
  "/api/v1/admin",
];

// Short-lived permission cache (2min TTL) — مثيل من cache.ts، يدعم Redis
// key: roleId (old) or `jt:${jobTitleId}` (new)
const PERM_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

type PermCacheEntry = {
  permissions: string[];
  dotPermissions: string[];
  roleName: string | null;
  systemRole: SystemRole | null;
};

/** Invalidate cached permissions for a role or job title */
export function invalidatePermissionCache(key: string): void {
  permCache.del(`perm:${key}`);
  permCache.del(`perm:jt:${key}`);
}

async function loadUser(userId: string): Promise<AuthUser | null> {
  const [user] = await db
    .select({
      id: users.id,
      orgId: users.orgId,
      name: users.name,
      phone: users.phone,
      email: users.email,
      type: users.type,
      roleId: users.roleId,
      status: users.status,
      allowedLocationIds: users.allowedLocationIds,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return null;

  let userPermissions: string[] = [];
  let dotPermissions: string[] = [];
  let roleName: string | null = null;
  let systemRole: SystemRole | null = null;

  // ── New RBAC v2: check org_members → job_title ─────────────────────
  const [member] = await db
    .select({ jobTitleId: orgMembers.jobTitleId })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, user.orgId)));

  if (member?.jobTitleId) {
    const cacheKey = `perm:jt:${member.jobTitleId}`;
    const cached = await permCache.get<PermCacheEntry>(cacheKey);

    if (cached) {
      dotPermissions = cached.dotPermissions;
      roleName = cached.roleName;
      systemRole = cached.systemRole;
    } else {
      const [jt] = await db
        .select()
        .from(jobTitles)
        .where(eq(jobTitles.id, member.jobTitleId));

      if (jt) {
        systemRole = jt.systemRole as SystemRole;
        roleName = jt.name;

        const overrides = await db
          .select({ permissionKey: jobTitlePermissions.permissionKey, allowed: jobTitlePermissions.allowed })
          .from(jobTitlePermissions)
          .where(eq(jobTitlePermissions.jobTitleId, jt.id));

        dotPermissions = resolvePermissions(systemRole, overrides);
        await permCache.set(cacheKey, { permissions: [], dotPermissions, roleName, systemRole }, PERM_CACHE_TTL_MS);
      }
    }
  }

  // ── Legacy RBAC v1: roleId → colon-separated permissions ───────────
  if (user.roleId) {
    const cacheKey = `perm:${user.roleId}`;
    const cached = await permCache.get<PermCacheEntry>(cacheKey);
    if (cached) {
      userPermissions = cached.permissions;
      if (!roleName) roleName = cached.roleName;
    } else {
      const [role] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, user.roleId));

      const legacyRoleName = role?.name || null;

      const perms = await db
        .select({
          resource: permissions.resource,
          action: permissions.action,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, user.roleId));

      userPermissions = perms.map((p) => `${p.resource}:${p.action}`);
      await permCache.set(cacheKey, {
        permissions: userPermissions,
        dotPermissions: [],
        roleName: legacyRoleName,
        systemRole: null,
      }, PERM_CACHE_TTL_MS);
      if (!roleName) roleName = legacyRoleName;
    }
  }

  // owner type always gets full access regardless of roles
  if (user.type === "owner") {
    systemRole = "owner";
  }

  // ── Load user constraints (Layer 6) ────────────────────────
  let constraints: UserConstraints | null = null;
  if (user.type !== "owner") {
    const [cr] = await db
      .select()
      .from(userConstraints)
      .where(and(eq(userConstraints.userId, userId), eq(userConstraints.orgId, user.orgId)));

    if (cr) {
      constraints = {
        maxDiscountPct:       cr.maxDiscountPct       !== null ? Number(cr.maxDiscountPct)       : null,
        maxVoidCount:         cr.maxVoidCount          ?? null,
        requireApprovalAbove: cr.requireApprovalAbove !== null ? Number(cr.requireApprovalAbove) : null,
        canCreateInvoice:     cr.canCreateInvoice      ?? null,
        canVoidInvoice:       cr.canVoidInvoice        ?? null,
        canGiveDiscount:      cr.canGiveDiscount       ?? null,
        canAccessReports:     cr.canAccessReports      ?? null,
        canExportData:        cr.canExportData         ?? null,
        canManageTeam:        cr.canManageTeam         ?? null,
      };
    }
  }

  return {
    id: user.id,
    orgId: user.orgId,
    name: user.name,
    phone: user.phone,
    email: user.email,
    type: user.type,
    status: user.status,
    roleId: user.roleId,
    roleName,
    permissions: userPermissions,
    dotPermissions,
    systemRole,
    allowedLocationIds: (user.allowedLocationIds as string[]) || [],
    constraints,
  };
}
