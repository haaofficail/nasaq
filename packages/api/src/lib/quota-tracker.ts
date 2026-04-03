import { eq, and, sql } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { quotaUsage } from "@nasaq/db/schema";

// ============================================================
// QUOTA TRACKER
// تتبع الاستخدام الفعلي في الوقت الفعلي لكل منشأة
// ============================================================

export type QuotaMetric =
  | "users"
  | "locations"
  | "services"
  | "invoices_month"
  | "bookings_month"
  | "orders_month";

function currentPeriod(metric: QuotaMetric): string {
  if (metric.endsWith("_month")) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  return "all_time";
}

/**
 * Increment a quota counter by 1.
 * Call after a successful resource creation.
 */
export async function incrementQuota(orgId: string, metric: QuotaMetric): Promise<void> {
  const period = currentPeriod(metric);
  await db
    .insert(quotaUsage)
    .values({ orgId, metricKey: metric, period, usedCount: 1 })
    .onConflictDoUpdate({
      target: [quotaUsage.orgId, quotaUsage.metricKey, quotaUsage.period],
      set: {
        usedCount: sql`${quotaUsage.usedCount} + 1`,
        updatedAt: sql`NOW()`,
      },
    });
}

/**
 * Decrement a quota counter (floor at 0).
 * Call after a successful resource deletion.
 */
export async function decrementQuota(orgId: string, metric: QuotaMetric): Promise<void> {
  const period = currentPeriod(metric);
  await db
    .update(quotaUsage)
    .set({
      usedCount: sql`GREATEST(${quotaUsage.usedCount} - 1, 0)`,
      updatedAt: sql`NOW()`,
    })
    .where(
      and(
        eq(quotaUsage.orgId, orgId),
        eq(quotaUsage.metricKey, metric),
        eq(quotaUsage.period, period),
      ),
    );
}

/**
 * Get current usage for a specific metric.
 */
export async function getQuotaUsage(orgId: string, metric: QuotaMetric): Promise<number> {
  const period = currentPeriod(metric);
  const [row] = await db
    .select({ usedCount: quotaUsage.usedCount })
    .from(quotaUsage)
    .where(
      and(
        eq(quotaUsage.orgId, orgId),
        eq(quotaUsage.metricKey, metric),
        eq(quotaUsage.period, period),
      ),
    );
  return row?.usedCount ?? 0;
}

/**
 * Get full quota summary for an org (all metrics).
 */
export async function getOrgQuotaSummary(
  orgId: string,
): Promise<Array<{ metric: string; period: string; used: number; updatedAt: Date }>> {
  const rows = await db
    .select()
    .from(quotaUsage)
    .where(eq(quotaUsage.orgId, orgId))
    .orderBy(quotaUsage.metricKey);

  return rows.map((r) => ({
    metric:    r.metricKey,
    period:    r.period,
    used:      r.usedCount,
    updatedAt: r.updatedAt,
  }));
}
