import { db } from "@nasaq/db/client";
import { roles, rolePermissions, permissions as permissionsTable } from "@nasaq/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { insertAuditLog } from "./audit";
import { invalidatePermissionCache } from "../middleware/auth";

// ============================================================
// PERMISSION SERVICE
// Single source of truth for role permission management.
// All writes to role_permissions MUST go through here.
// ============================================================

// Owner role default permissions — full access
export const OWNER_DEFAULT_PERMISSIONS = [
  "services:create", "services:edit", "services:delete", "services:view",
  "finance:create", "finance:create_invoice", "finance:edit", "finance:view",
  "finance:post", "finance:manage_finance", "finance:refund", "finance:delete",
  "finance:approve", "finance:reverse", "finance:export", "finance:edit_discount", "finance:close",
  "bookings:create", "bookings:edit", "bookings:view", "bookings:delete",
  "bookings:approve", "bookings:manage_bookings", "bookings:edit_price",
  "customers:create", "customers:edit", "customers:view", "customers:delete",
  "customers:manage_customers", "customers:export",
  "inventory:create", "inventory:edit", "inventory:view", "inventory:delete",
  "inventory:manage_inventory", "inventory:approve",
  "settings:edit", "settings:manage_roles", "settings:manage_settings",
  "settings:manage_users", "settings:view",
  "team:create", "team:edit", "team:view", "team:delete",
  "team:approve", "team:manage_team",
  "attendance:approve", "attendance:manage_attendance",
  "reports:view", "reports:export",
  "website:create", "website:edit", "website:view", "website:manage_website",
  "automation:create", "automation:edit", "automation:view", "automation:delete",
  "marketing:create", "marketing:edit", "marketing:view",
  "marketing:manage_marketing", "marketing:send_message",
];

// Manager default permissions — no delete, no billing
export const MANAGER_DEFAULT_PERMISSIONS = [
  "services:create", "services:edit", "services:view",
  "finance:create", "finance:create_invoice", "finance:edit", "finance:view",
  "bookings:create", "bookings:edit", "bookings:view", "bookings:approve",
  "bookings:manage_bookings", "bookings:edit_price",
  "customers:create", "customers:edit", "customers:view",
  "inventory:create", "inventory:edit", "inventory:view",
  "team:view", "team:edit",
  "attendance:approve", "attendance:manage_attendance",
  "reports:view",
  "website:create", "website:edit", "website:view",
];

// Staff default permissions — operational only
export const STAFF_DEFAULT_PERMISSIONS = [
  "bookings:create", "bookings:edit", "bookings:view",
  "customers:view",
  "attendance:manage_attendance",
];

/**
 * Upsert permissions to role_permissions table with audit log.
 * This is the canonical way to assign permissions to a role.
 */
export async function assignPermissionsToRole(params: {
  roleId: string;
  orgId: string;
  permissions: string[];
  actorId?: string;
  reason?: string;
}): Promise<void> {
  const { roleId, orgId, permissions, actorId, reason } = params;

  // Get previous permissions for audit
  const prevPerms = await getRolePermissions(roleId);

  // Parse "resource:action" pairs
  const pairs = permissions
    .map((p) => {
      const [resource, action] = p.split(":");
      return { resource, action };
    })
    .filter((p) => p.resource && p.action);

  // Upsert each permission string into global permissions table
  if (pairs.length > 0) {
    await db.insert(permissionsTable).values(pairs).onConflictDoNothing();
  }

  // Delete existing role_permissions for this role
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

  // Re-insert with the new set
  if (pairs.length > 0) {
    const permRecords = await db
      .select()
      .from(permissionsTable)
      .where(
        sql`${permissionsTable.resource} || ':' || ${permissionsTable.action} = ANY(ARRAY[${sql.join(
          pairs.map((p) => sql`${p.resource + ":" + p.action}`),
          sql`, `
        )}])`
      );

    if (permRecords.length > 0) {
      await db
        .insert(rolePermissions)
        .values(permRecords.map((p) => ({ roleId, permissionId: p.id })))
        .onConflictDoNothing();
    }
  }

  // Invalidate permission cache for this role
  invalidatePermissionCache(roleId);

  // Audit log
  insertAuditLog({
    orgId,
    userId: actorId ?? null,
    action: "permissions_updated",
    resource: "role_permissions",
    resourceId: roleId,
    oldValue: prevPerms,
    newValue: permissions,
    metadata: { reason },
  });
}

/**
 * Get all permissions for a role as "resource:action" strings.
 */
export async function getRolePermissions(roleId: string): Promise<string[]> {
  const rows = await db
    .select({
      resource: permissionsTable.resource,
      action: permissionsTable.action,
    })
    .from(rolePermissions)
    .innerJoin(permissionsTable, eq(rolePermissions.permissionId, permissionsTable.id))
    .where(eq(rolePermissions.roleId, roleId));

  return rows.map((r) => `${r.resource}:${r.action}`);
}

/**
 * Find the owner role for an org and set OWNER_DEFAULT_PERMISSIONS.
 * Safe to call multiple times — idempotent.
 */
export async function syncOwnerRoleDefaults(orgId: string): Promise<void> {
  const ownerRoles = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.orgId, orgId),
        eq(roles.isActive, true),
        sql`lower(${roles.name}) IN ('owner', 'مالك', 'مدير عام', 'صاحب المنشأة')`
      )
    )
    .limit(1);

  if (!ownerRoles[0]) return;

  const ownerRoleId = ownerRoles[0].id;

  await assignPermissionsToRole({
    roleId: ownerRoleId,
    orgId,
    permissions: OWNER_DEFAULT_PERMISSIONS,
    reason: "sync_owner_defaults",
  });
}
