import { eq, and, sql, gte, lte, gt, lt } from "drizzle-orm";
import { db } from "@nasaq/db/client";
import { customers, customerSegments, loyaltyConfig, loyaltyTransactions } from "@nasaq/db/schema";

// ============================================================
// SMART SEGMENTS ENGINE
// يقيّم القواعد الديناميكية ويحدّث عدد العملاء في كل شريحة
// ============================================================

type Condition = {
  field: string;      // totalSpent, totalBookings, lastBookingAt, tier, type, city, source
  op: string;         // eq, neq, gt, gte, lt, lte, in, not_in, before, after, contains
  value: any;
};

type SegmentRules = {
  operator: "and" | "or";
  conditions: Condition[];
};

/**
 * Build SQL WHERE clause from segment rules
 */
function buildSegmentQuery(rules: SegmentRules): any {
  const clauses = rules.conditions.map((cond) => {
    const field = getField(cond.field);
    if (!field) return sql`1=1`;

    switch (cond.op) {
      case "eq": return sql`${field} = ${cond.value}`;
      case "neq": return sql`${field} != ${cond.value}`;
      case "gt": return sql`CAST(${field} AS DECIMAL) > ${Number(cond.value)}`;
      case "gte": return sql`CAST(${field} AS DECIMAL) >= ${Number(cond.value)}`;
      case "lt": return sql`CAST(${field} AS DECIMAL) < ${Number(cond.value)}`;
      case "lte": return sql`CAST(${field} AS DECIMAL) <= ${Number(cond.value)}`;
      case "in": return sql`${field} = ANY(${cond.value})`;
      case "not_in": return sql`${field} != ALL(${cond.value})`;
      case "before": {
        const d = resolveDate(cond.value);
        return sql`${field} < ${d}`;
      }
      case "after": {
        const d = resolveDate(cond.value);
        return sql`${field} > ${d}`;
      }
      case "contains": return sql`${field} ILIKE ${"%" + cond.value + "%"}`;
      default: return sql`1=1`;
    }
  });

  if (rules.operator === "or") {
    return sql.join(clauses, sql` OR `);
  }
  return and(...clauses);
}

function getField(fieldName: string) {
  const map: Record<string, any> = {
    totalSpent: customers.totalSpent,
    totalBookings: customers.totalBookings,
    lastBookingAt: customers.lastBookingAt,
    tier: customers.tier,
    type: customers.type,
    city: customers.city,
    source: customers.source,
    loyaltyPoints: customers.loyaltyPoints,
    name: customers.name,
    isActive: customers.isActive,
    createdAt: customers.createdAt,
  };
  return map[fieldName] || null;
}

function resolveDate(value: string): Date {
  // Support relative dates: "30_days_ago", "7_days_ago", "1_year_ago"
  const match = value.match(/^(\d+)_(days?|weeks?|months?|years?)_ago$/);
  if (match) {
    const n = parseInt(match[1]);
    const unit = match[2].replace(/s$/, "");
    const now = new Date();
    switch (unit) {
      case "day": now.setDate(now.getDate() - n); break;
      case "week": now.setDate(now.getDate() - n * 7); break;
      case "month": now.setMonth(now.getMonth() - n); break;
      case "year": now.setFullYear(now.getFullYear() - n); break;
    }
    return now;
  }
  return new Date(value);
}

/**
 * Evaluate a segment and return matching customer IDs
 */
export async function evaluateSegment(orgId: string, rules: SegmentRules) {
  const whereClause = buildSegmentQuery(rules);

  const result = await db.select({
    id: customers.id,
    name: customers.name,
  }).from(customers).where(and(
    eq(customers.orgId, orgId),
    eq(customers.isActive, true),
    whereClause,
  ));

  return result;
}

/**
 * Refresh all segments for an organization
 * Called periodically (e.g., every hour via cron job)
 */
export async function refreshAllSegments(orgId: string) {
  const segments = await db.select().from(customerSegments)
    .where(and(eq(customerSegments.orgId, orgId), eq(customerSegments.isActive, true)));

  const results = await Promise.all(
    segments.map(async (segment) => {
      const rules = segment.rules as SegmentRules;
      const matches = await evaluateSegment(orgId, rules);

      await db.update(customerSegments).set({
        customerCount: matches.length,
        lastCalculatedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(customerSegments.id, segment.id));

      return { id: segment.id, name: segment.name, count: matches.length };
    })
  );

  return results;
}

// ============================================================
// LOYALTY POINTS AWARDING
// يُمنح تلقائياً عند تسجيل دفعة مكتملة للحجز
// ============================================================

export async function awardLoyaltyPoints(params: {
  orgId: string;
  customerId: string;
  bookingId: string;
  bookingAmount: number;
}) {
  const { orgId, customerId, bookingId, bookingAmount } = params;

  const [config] = await db.select().from(loyaltyConfig).where(
    and(eq(loyaltyConfig.orgId, orgId), eq(loyaltyConfig.isActive, true))
  );
  if (!config) return;

  const points = Math.floor(bookingAmount * parseFloat(String(config.pointsPerSar ?? "1")));
  if (points <= 0) return;

  await db.transaction(async (tx) => {
    await tx.insert(loyaltyTransactions).values({
      orgId, customerId, bookingId,
      type: "earned",
      points,
      description: `نقاط مكتسبة من حجز`,
    });
    await tx.update(customers).set({
      loyaltyPoints: sql`COALESCE(${customers.loyaltyPoints}, 0) + ${points}`,
      updatedAt: new Date(),
    }).where(and(eq(customers.id, customerId), eq(customers.orgId, orgId)));
  });
}

// ============================================================
// REFERRAL SYSTEM
// نظام الإحالة — رابط + مكافآت + تتبع
// ============================================================

export async function processReferral(params: {
  orgId: string;
  referralCode: string;
  newCustomerId: string;
  bookingAmount: number;
}) {
  const { orgId, referralCode, newCustomerId, bookingAmount } = params;

  // Find referrer
  const [referrer] = await db.select().from(customers)
    .where(and(eq(customers.orgId, orgId), eq(customers.referralCode, referralCode)));

  if (!referrer) return { success: false, error: "كود الإحالة غير صحيح" };
  if (referrer.id === newCustomerId) return { success: false, error: "لا يمكنك إحالة نفسك" };

  // Reward referrer + mark new customer — both in one transaction to prevent double-credit
  const rewardAmount = Math.round(bookingAmount * 0.05 * 100) / 100;
  await db.transaction(async (tx) => {
    await tx.update(customers).set({
      walletBalance: sql`COALESCE(CAST(${customers.walletBalance} AS DECIMAL), 0) + ${rewardAmount}`,
      updatedAt: new Date(),
    }).where(eq(customers.id, referrer.id));

    await tx.update(customers).set({
      referredBy: referrer.id,
      source: "referral",
      updatedAt: new Date(),
    }).where(eq(customers.id, newCustomerId));
  });

  return {
    success: true,
    referrer: { id: referrer.id, name: referrer.name, reward: rewardAmount },
    newCustomerDiscount: 0, // Can be configured: e.g., 100 SAR welcome credit
  };
}
