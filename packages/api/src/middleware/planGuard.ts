import type { Context, Next } from "hono";
import { eq, and } from "drizzle-orm";
import { db, pool } from "@nasaq/db/client";
import { plans, pricingPlanFeatures, organizations } from "@nasaq/db/schema";

// ============================================================
// PLAN GUARD MIDDLEWARE
// يتحقق من صلاحيات الباقة قبل السماح بالعملية
// ============================================================

const NEXT_PLAN: Record<string, string> = {
  free: "basic",
  basic: "advanced",
  advanced: "enterprise",
  enterprise: "custom",
};

async function getOrgPlan(orgId: string) {
  const [org] = await db.select({
    currentPlanCode: organizations.currentPlanCode,
  }).from(organizations).where(eq(organizations.id, orgId));

  const planCode = org?.currentPlanCode ?? "free";
  const [plan] = await db.select().from(plans).where(eq(plans.code, planCode));
  return plan;
}

export async function canPerformAction(
  orgId: string,
  action: "add_branch" | "add_employee" | "use_feature",
  featureKey?: string
): Promise<{ allowed: boolean; reason?: string; upgrade_to?: string }> {
  const plan = await getOrgPlan(orgId);
  if (!plan) return { allowed: true };

  if (action === "add_branch") {
    const extraResult = await pool.query<{ extra: string }>(
      `SELECT COALESCE(SUM(quantity), 0)::text as extra FROM org_resource_addons WHERE org_id=$1 AND resource_code='extra_branch' AND status='active'`,
      [orgId]
    );
    const extra = parseInt(extraResult.rows[0]?.extra ?? "0");

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM locations WHERE org_id=$1 AND is_active=true`,
      [orgId]
    );
    const current = parseInt(countResult.rows[0]?.count ?? "0");
    const total = plan.maxBranches + extra;

    if (current >= total) {
      return {
        allowed: false,
        reason: `وصلت للحد الأقصى (${total} فروع)`,
        upgrade_to: NEXT_PLAN[plan.code],
      };
    }
  }

  if (action === "add_employee") {
    const extraResult = await pool.query<{ extra: string }>(
      `SELECT COALESCE(SUM(quantity * 25), 0)::text as extra FROM org_resource_addons WHERE org_id=$1 AND resource_code='extra_employees' AND status='active'`,
      [orgId]
    );
    const extra = parseInt(extraResult.rows[0]?.extra ?? "0");

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM users u
       INNER JOIN org_members om ON om.user_id = u.id
       WHERE om.org_id=$1 AND u.status='active'`,
      [orgId]
    );
    const current = parseInt(countResult.rows[0]?.count ?? "0");
    const total = plan.maxEmployees + extra;

    if (current >= total) {
      return {
        allowed: false,
        reason: `وصلت للحد الأقصى (${total} موظف)`,
        upgrade_to: NEXT_PLAN[plan.code],
      };
    }
  }

  if (action === "use_feature" && featureKey) {
    const [feature] = await db.select().from(pricingPlanFeatures)
      .where(and(
        eq(pricingPlanFeatures.planCode, plan.code),
        eq(pricingPlanFeatures.featureKey, featureKey)
      ));

    if (!feature?.isIncluded) {
      return {
        allowed: false,
        reason: "هذه الميزة غير متاحة في خطتك الحالية",
        upgrade_to: NEXT_PLAN[plan.code],
      };
    }
  }

  return { allowed: true };
}

export function requireFeature(featureKey: string) {
  return async (c: Context, next: Next) => {
    const orgId = c.get("orgId") as string | undefined;
    if (!orgId) return next();

    const check = await canPerformAction(orgId, "use_feature", featureKey);
    if (!check.allowed) {
      return c.json(
        {
          error: "feature_locked",
          message: check.reason,
          upgrade_to: check.upgrade_to,
          cta_url: "/dashboard/billing",
        },
        403
      );
    }
    return next();
  };
}
