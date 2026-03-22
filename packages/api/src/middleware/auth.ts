import { Context, Next } from "hono";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { sessions, users, roles, rolePermissions, permissions } from "@nasaq/db/schema";

// ============================================================
// AUTH MIDDLEWARE
// يتحقق من التوكن في كل طلب ويحمّل بيانات المستخدم والصلاحيات
// ============================================================

export type AuthUser = {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  email: string | null;
  type: string;
  roleId: string | null;
  roleName: string | null;
  permissions: string[]; // ["services:view", "services:create", "bookings:edit"]
  allowedLocationIds: string[];
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

  // Check if user is active
  if (user.type === "inactive" || user.type === "suspended") {
    return c.json({ error: "الحساب معطّل", code: "ACCOUNT_DISABLED" }, 403);
  }

  // Set context
  c.set("user", user);
  c.set("orgId", user.orgId);

  return next();
}

/**
 * ميدلوير التحقق من صلاحية محددة
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
    if (user.type === "owner") {
      return next();
    }

    const required = `${resource}:${action}`;
    if (!user.permissions.includes(required)) {
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
// HELPERS
// ============================================================

async function loadUser(userId: string): Promise<AuthUser | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return null;

  // Load role + permissions
  let userPermissions: string[] = [];
  let roleName: string | null = null;

  if (user.roleId) {
    // Get role name
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, user.roleId));

    roleName = role?.name || null;

    // Get permissions
    const perms = await db
      .select({
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, user.roleId));

    userPermissions = perms.map((p) => `${p.resource}:${p.action}`);
  }

  return {
    id: user.id,
    orgId: user.orgId,
    name: user.name,
    phone: user.phone,
    email: user.email,
    type: user.type,
    roleId: user.roleId,
    roleName,
    permissions: userPermissions,
    allowedLocationIds: (user.allowedLocationIds as string[]) || [],
  };
}
