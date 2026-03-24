/**
 * Nasaq Diagnostics Engine — نظام الفحص الشامل
 *
 * مستوحى من:
 *  - Google SRE Book (Golden Signals: latency, traffic, errors, saturation)
 *  - Netflix Hystrix / Chaos Engineering principles
 *  - AWS Health Dashboard architecture
 *  - PostgreSQL DBA best practices (pg_stat_*, dead tuples, cache hit)
 *
 * الفئات:
 *  🗄  database    — اتصال، أداء، تضخم، استعلامات بطيئة
 *  🔗  integrity   — كسور البيانات، سجلات يتيمة، FK violations
 *  💼  business    — منطق أعمال معطل، حسابات منتهية، تذاكر متأخرة
 *  ⚡  performance  — معدل الأخطاء، الجلسات، الاستجابة
 *  🔐  security    — صلاحيات مفرطة، حسابات خاملة، جلسات قديمة
 */

import { db, pool } from "@nasaq/db/client";
import {
  organizations, users, sessions, bookings,
  supportTickets, orgDocuments, orgReminders,
  planFeatures, featuresCatalog, tenantAddOns, addOns,
  platformAuditLog,
} from "@nasaq/db/schema";
import { count, sql, and, eq, lt, gt, isNull, ne } from "drizzle-orm";

// ============================================================
// TYPES
// ============================================================

export type CheckStatus = "ok" | "warn" | "error" | "info";
export type CheckCategory = "database" | "integrity" | "business" | "performance" | "security";

export interface DiagnosticCheck {
  id: string;
  category: CheckCategory;
  name: string;              // Arabic
  status: CheckStatus;
  message: string;           // Arabic — what was found
  value?: string | number | null;
  threshold?: string;        // e.g. "< 100ms"
  details?: Record<string, unknown>;
}

export interface DiagnosticsResult {
  runAt: string;
  durationMs: number;
  summary: { ok: number; warn: number; error: number; info: number; total: number };
  checks: DiagnosticCheck[];
}

// ============================================================
// SAFE WRAPPER — يمنع فشل فحص واحد من إيقاف الباقي
// ============================================================

async function safe(
  id: string,
  category: CheckCategory,
  name: string,
  fn: () => Promise<Omit<DiagnosticCheck, "id" | "category" | "name">>,
): Promise<DiagnosticCheck> {
  try {
    const result = await fn();
    return { id, category, name, ...result };
  } catch (err: any) {
    return {
      id,
      category,
      name,
      status: "error",
      message: `فشل تنفيذ الفحص: ${err?.message ?? "خطأ غير معروف"}`,
    };
  }
}

// ============================================================
// ── CATEGORY 1: DATABASE ─────────────────────────────────────
// ============================================================

async function checkDbLatency(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const t0 = Date.now();
  await pool.query("SELECT 1");
  const ms = Date.now() - t0;
  if (ms > 500) return { status: "error", message: `زمن استجابة DB مرتفع جداً: ${ms}ms`, value: ms, threshold: "< 500ms" };
  if (ms > 150) return { status: "warn",  message: `زمن استجابة DB مرتفع: ${ms}ms`, value: ms, threshold: "< 150ms" };
  return { status: "ok", message: `زمن الاستجابة طبيعي: ${ms}ms`, value: ms, threshold: "< 150ms" };
}

async function checkDbSize(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ size: string; size_bytes: string }>(
    `SELECT pg_size_pretty(pg_database_size(current_database())) AS size,
            pg_database_size(current_database()) AS size_bytes`
  );
  const bytes = parseInt(rows[0].size_bytes);
  const gb = bytes / (1024 ** 3);
  if (gb > 20) return { status: "warn",  message: `حجم قاعدة البيانات كبير: ${rows[0].size}`, value: rows[0].size };
  return { status: "info", message: `حجم قاعدة البيانات: ${rows[0].size}`, value: rows[0].size };
}

async function checkCacheHitRatio(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ ratio: string }>(
    `SELECT round(
       blks_hit::numeric / NULLIF(blks_hit + blks_read, 0) * 100, 2
     ) AS ratio
     FROM pg_stat_database
     WHERE datname = current_database()`
  );
  const ratio = parseFloat(rows[0]?.ratio ?? "0");
  if (ratio < 90) return { status: "warn",  message: `معدل إصابة الـ cache منخفض: ${ratio}%`, value: `${ratio}%`, threshold: "> 95%" };
  if (ratio < 95) return { status: "warn",  message: `معدل إصابة الـ cache مقبول: ${ratio}%`, value: `${ratio}%`, threshold: "> 95%" };
  return { status: "ok", message: `معدل إصابة الـ cache ممتاز: ${ratio}%`, value: `${ratio}%`, threshold: "> 95%" };
}

async function checkDeadTuples(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ relname: string; n_dead_tup: string; n_live_tup: string }>(
    `SELECT relname, n_dead_tup, n_live_tup
     FROM pg_stat_user_tables
     WHERE n_dead_tup > 10000
     ORDER BY n_dead_tup DESC
     LIMIT 5`
  );
  if (rows.length === 0) return { status: "ok", message: "لا يوجد تضخم في الجداول (dead tuples طبيعية)" };
  const tables = rows.map(r => `${r.relname}(${parseInt(r.n_dead_tup).toLocaleString()})`).join(", ");
  return {
    status: "warn",
    message: `يوجد تضخم في ${rows.length} جدول — يُنصح بـ VACUUM: ${tables}`,
    details: { tables: rows },
  };
}

async function checkLongRunningQueries(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ pid: number; duration: string; state: string; query: string }>(
    `SELECT pid,
            round(extract(epoch FROM (now() - query_start)))::text || 's' AS duration,
            state,
            left(query, 80) AS query
     FROM pg_stat_activity
     WHERE state != 'idle'
       AND query_start < now() - INTERVAL '30 seconds'
       AND query NOT ILIKE '%pg_stat_activity%'
     ORDER BY query_start
     LIMIT 5`
  );
  if (rows.length === 0) return { status: "ok", message: "لا توجد استعلامات طويلة (> 30 ثانية)" };
  return {
    status: "warn",
    message: `${rows.length} استعلام طويل نشط (> 30s)`,
    value: rows.length,
    details: { queries: rows },
  };
}

async function checkConnections(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ active: string; max: string; pct: string }>(
    `SELECT count(*) FILTER (WHERE state != 'idle') AS active,
            current_setting('max_connections')::int AS max,
            round(count(*) * 100.0 / current_setting('max_connections')::int, 1) AS pct
     FROM pg_stat_activity`
  );
  const pct = parseFloat(rows[0].pct);
  const active = parseInt(rows[0].active);
  const max = parseInt(rows[0].max);
  if (pct > 80) return { status: "error", message: `استخدام الاتصالات مرتفع جداً: ${active}/${max} (${pct}%)`, value: `${pct}%`, threshold: "< 80%" };
  if (pct > 60) return { status: "warn",  message: `استخدام الاتصالات مرتفع: ${active}/${max} (${pct}%)`, value: `${pct}%`, threshold: "< 60%" };
  return { status: "ok", message: `اتصالات قاعدة البيانات طبيعية: ${active}/${max} (${pct}%)`, value: `${pct}%` };
}

async function checkUnusedIndexes(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ indexname: string; tablename: string; idx_scan: string }>(
    `SELECT indexname, tablename, idx_scan
     FROM pg_stat_user_indexes
     WHERE idx_scan = 0
       AND indexname NOT LIKE '%_pkey'
       AND indexname NOT LIKE '%_unique%'
     ORDER BY pg_relation_size(indexrelid) DESC
     LIMIT 10`
  );
  if (rows.length === 0) return { status: "ok", message: "كل الفهارس مستخدمة" };
  return {
    status: "info",
    message: `${rows.length} فهرس غير مستخدم — قد يؤثر على الكتابة`,
    value: rows.length,
    details: { indexes: rows.map(r => `${r.tablename}.${r.indexname}`) },
  };
}

// ============================================================
// ── CATEGORY 2: DATA INTEGRITY ───────────────────────────────
// ============================================================

async function checkOrphanedUsers(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(users)
    .where(and(isNull(users.orgId), eq(users.isSuperAdmin, false), isNull(users.nasaqRole)));
  const n = Number(total);
  if (n > 0) return { status: "warn", message: `${n} مستخدم بدون منشأة (ليسوا سوبر أدمن)`, value: n };
  return { status: "ok", message: "كل المستخدمين مرتبطون بمنشآتهم" };
}

async function checkOrgsWithoutUsers(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt
     FROM organizations o
     WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.org_id = o.id)`
  );
  const n = parseInt(rows[0].cnt);
  if (n > 0) return { status: "warn", message: `${n} منشأة بدون أي مستخدم`, value: n };
  return { status: "ok", message: "كل المنشآت لديها مستخدمون" };
}

async function checkOrphanedPlanFeatures(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt
     FROM plan_features pf
     WHERE NOT EXISTS (SELECT 1 FROM features_catalog fc WHERE fc.id = pf.feature_id)`
  );
  const n = parseInt(rows[0].cnt);
  if (n > 0) return {
    status: "error",
    message: `${n} ربط plan_features يشير لميزة غير موجودة — انتهاك FK محتمل`,
    value: n,
  };
  return { status: "ok", message: "كل روابط plan_features سليمة" };
}

async function checkStaleSessions(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const [{ total }] = await db
    .select({ total: count() })
    .from(sessions)
    .where(lt(sessions.expiresAt, cutoff));
  const n = Number(total);
  if (n > 1000) return { status: "warn",  message: `${n.toLocaleString()} جلسة منتهية > 30 يوم — يُنصح بتنظيفها`, value: n };
  if (n > 100)  return { status: "info",  message: `${n} جلسة منتهية قابلة للتنظيف`, value: n };
  return { status: "ok", message: `جلسات منتهية قليلة: ${n}` };
}

async function checkOrphanedTenantAddons(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt
     FROM tenant_add_ons ta
     WHERE NOT EXISTS (SELECT 1 FROM add_ons a WHERE a.id = ta.add_on_id)`
  );
  const n = parseInt(rows[0].cnt);
  if (n > 0) return { status: "error", message: `${n} tenant_add_ons تشير لإضافة محذوفة`, value: n };
  return { status: "ok", message: "كل tenant_add_ons سليمة" };
}

async function checkInconsistentOrgState(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt
     FROM organizations
     WHERE suspended_at IS NOT NULL
       AND subscription_status = 'active'`
  );
  const n = parseInt(rows[0].cnt);
  if (n > 0) return {
    status: "warn",
    message: `${n} منشأة موقوفة لكن حالة الاشتراك "active" — تناقض في البيانات`,
    value: n,
  };
  return { status: "ok", message: "حالات المنشآت متسقة" };
}

// ============================================================
// ── CATEGORY 3: BUSINESS LOGIC ───────────────────────────────
// ============================================================

async function checkExpiredTrials(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const now = new Date();
  const { rows } = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt
     FROM organizations
     WHERE subscription_status = 'trialing'
       AND trial_ends_at < NOW()`
  );
  const n = parseInt(rows[0].cnt);
  if (n > 0) return {
    status: "warn",
    message: `${n} منشأة انتهت تجربتها لكنها لا تزال بحالة "trialing"`,
    value: n,
  };
  return { status: "ok", message: "كل التجارب المنتهية تم تحديث حالتها" };
}

async function checkExpiringSubscriptions(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const { rows } = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt
     FROM organizations
     WHERE subscription_status = 'active'
       AND subscription_ends_at IS NOT NULL
       AND subscription_ends_at < $1`, [in7days]
  );
  const n = parseInt(rows[0].cnt);
  if (n > 0) return { status: "warn", message: `${n} اشتراك سينتهي خلال 7 أيام`, value: n };
  return { status: "ok", message: "لا توجد اشتراكات تنتهي قريباً" };
}

async function checkOldOpenTickets(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [{ total }] = await db
    .select({ total: count() })
    .from(supportTickets)
    .where(and(eq(supportTickets.status, "open"), lt(supportTickets.createdAt, cutoff)));
  const n = Number(total);
  if (n > 0) return { status: "warn", message: `${n} تذكرة مفتوحة منذ أكثر من 14 يوماً دون حل`, value: n };
  return { status: "ok", message: "لا توجد تذاكر مفتوحة قديمة" };
}

async function checkOverdueReminders(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const now = new Date();
  const [{ total }] = await db
    .select({ total: count() })
    .from(orgReminders)
    .where(and(eq(orgReminders.status, "active"), lt(orgReminders.dueDate, now.toISOString().slice(0, 10))));
  const n = Number(total);
  if (n > 50) return { status: "warn",  message: `${n} تذكير متأخر عن موعده`, value: n };
  if (n > 0)  return { status: "info",  message: `${n} تذكير متأخر`, value: n };
  return { status: "ok", message: "لا توجد تذكيرات متأخرة" };
}

async function checkPendingDocuments(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [{ total }] = await db
    .select({ total: count() })
    .from(orgDocuments)
    .where(and(eq(orgDocuments.status, "pending"), lt(orgDocuments.createdAt, cutoff)));
  const n = Number(total);
  if (n > 0) return { status: "warn", message: `${n} وثيقة لم تُراجع منذ أكثر من 14 يوماً`, value: n };
  return { status: "ok", message: "لا توجد وثائق معلّقة قديمة" };
}

// ============================================================
// ── CATEGORY 4: PERFORMANCE ──────────────────────────────────
// ============================================================

async function checkRecentErrorRate(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const since1h  = new Date(Date.now() - 60 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { rows: r1h } = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt FROM platform_audit_log WHERE action = 'srv_error' AND created_at > $1`, [since1h]
  );
  const { rows: r24h } = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt FROM platform_audit_log WHERE action = 'srv_error' AND created_at > $1`, [since24h]
  );
  const h1  = parseInt(r1h[0].cnt);
  const h24 = parseInt(r24h[0].cnt);
  if (h1 > 20)  return { status: "error", message: `${h1} خطأ خادم في الساعة الأخيرة — يتطلب تدخل فوري`, value: h1, details: { last1h: h1, last24h: h24 } };
  if (h1 > 5)   return { status: "warn",  message: `${h1} أخطاء خادم في الساعة الأخيرة`, value: h1, details: { last1h: h1, last24h: h24 } };
  if (h24 > 50) return { status: "warn",  message: `${h24} خطأ خادم في 24 ساعة الأخيرة`, value: h24, details: { last1h: h1, last24h: h24 } };
  return { status: "ok", message: `معدل الأخطاء طبيعي (${h1} في الساعة، ${h24} في 24 ساعة)`, details: { last1h: h1, last24h: h24 } };
}

async function checkActiveSessions(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(sessions)
    .where(gt(sessions.expiresAt, new Date()));
  const n = Number(total);
  if (n > 10000) return { status: "warn", message: `${n.toLocaleString()} جلسة نشطة — حمل مرتفع`, value: n };
  return { status: "info", message: `${n.toLocaleString()} جلسة نشطة حالياً`, value: n };
}

async function checkTableRowCounts(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ relname: string; n_live_tup: string }>(
    `SELECT relname, n_live_tup
     FROM pg_stat_user_tables
     WHERE n_live_tup > 0
     ORDER BY n_live_tup DESC
     LIMIT 8`
  );
  const details = Object.fromEntries(rows.map(r => [r.relname, parseInt(r.n_live_tup)]));
  return {
    status: "info",
    message: `أكبر الجداول: ${rows.slice(0, 3).map(r => `${r.relname}(${parseInt(r.n_live_tup).toLocaleString()})`).join(", ")}`,
    details,
  };
}

// ============================================================
// ── CATEGORY 5: SECURITY ─────────────────────────────────────
// ============================================================

async function checkSuperAdminCount(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(users)
    .where(eq(users.isSuperAdmin, true));
  const n = Number(total);
  if (n > 5)  return { status: "warn", message: `عدد السوبر أدمن مرتفع: ${n} — راجع الصلاحيات`, value: n, threshold: "≤ 5" };
  if (n === 0) return { status: "error", message: "لا يوجد سوبر أدمن نشط — النظام بلا مدير!", value: 0 };
  return { status: "ok", message: `عدد السوبر أدمن: ${n}`, value: n };
}

async function checkInactiveStaff(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const { rows } = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt
     FROM users
     WHERE (is_super_admin = true OR nasaq_role IS NOT NULL)
       AND (last_login_at IS NULL OR last_login_at < $1)`, [cutoff]
  );
  const n = parseInt(rows[0].cnt);
  if (n > 0) return { status: "warn", message: `${n} عضو فريق نسق لم يسجّل دخولاً منذ 90+ يوماً`, value: n };
  return { status: "ok", message: "كل أعضاء الفريق نشطون" };
}

async function checkOldSessions(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days
  const [{ total }] = await db
    .select({ total: count() })
    .from(sessions)
    .where(and(lt(sessions.createdAt, cutoff), gt(sessions.expiresAt, new Date())));
  const n = Number(total);
  if (n > 0) return { status: "warn", message: `${n} جلسة نشطة عمرها أكثر من 60 يوم — مشبوهة`, value: n };
  return { status: "ok", message: "لا توجد جلسات نشطة قديمة مشبوهة" };
}

async function checkSuspendedUsersWithSessions(): Promise<Omit<DiagnosticCheck, "id" | "category" | "name">> {
  const { rows } = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE u.status = 'suspended'
       AND s.expires_at > NOW()`
  );
  const n = parseInt(rows[0].cnt);
  if (n > 0) return {
    status: "error",
    message: `${n} جلسة نشطة لمستخدمين موقوفين — ثغرة أمنية!`,
    value: n,
  };
  return { status: "ok", message: "لا توجد جلسات نشطة لمستخدمين موقوفين" };
}

// ============================================================
// MAIN RUNNER
// ============================================================

export async function runDiagnostics(): Promise<DiagnosticsResult> {
  const start = Date.now();

  // Run all checks — safely and in parallel per category
  const [
    dbLatency,
    dbSize,
    cacheHit,
    deadTuples,
    longQueries,
    connections,
    unusedIndexes,
    orphanedUsers,
    orgsNoUsers,
    orphanedPlanFeatures,
    staleSessions,
    orphanedAddons,
    inconsistentOrgs,
    expiredTrials,
    expiringSubscriptions,
    oldTickets,
    overdueReminders,
    pendingDocs,
    errorRate,
    activeSessions,
    rowCounts,
    superAdminCount,
    inactiveStaff,
    oldSessionsSec,
    suspendedWithSessions,
  ] = await Promise.all([
    safe("db_latency",           "database",    "زمن استجابة قاعدة البيانات",          checkDbLatency),
    safe("db_size",              "database",    "حجم قاعدة البيانات",                    checkDbSize),
    safe("db_cache_hit",         "database",    "معدل إصابة الـ cache",                  checkCacheHitRatio),
    safe("db_dead_tuples",       "database",    "تضخم الجداول (dead tuples)",            checkDeadTuples),
    safe("db_long_queries",      "database",    "استعلامات طويلة نشطة",                  checkLongRunningQueries),
    safe("db_connections",       "database",    "اتصالات قاعدة البيانات",               checkConnections),
    safe("db_unused_indexes",    "database",    "فهارس غير مستخدمة",                     checkUnusedIndexes),
    safe("int_orphaned_users",   "integrity",   "مستخدمون بدون منشأة",                   checkOrphanedUsers),
    safe("int_orgs_no_users",    "integrity",   "منشآت بدون مستخدمين",                   checkOrgsWithoutUsers),
    safe("int_plan_features",    "integrity",   "كسور في plan_features",                 checkOrphanedPlanFeatures),
    safe("int_stale_sessions",   "integrity",   "جلسات منتهية قديمة",                    checkStaleSessions),
    safe("int_orphaned_addons",  "integrity",   "tenant_add_ons معطلة",                  checkOrphanedTenantAddons),
    safe("int_org_state",        "integrity",   "تناقض حالة المنشآت",                    checkInconsistentOrgState),
    safe("biz_expired_trials",   "business",    "تجارب منتهية بدون تحديث",               checkExpiredTrials),
    safe("biz_expiring_subs",    "business",    "اشتراكات تنتهي قريباً",                 checkExpiringSubscriptions),
    safe("biz_old_tickets",      "business",    "تذاكر دعم قديمة مفتوحة",               checkOldOpenTickets),
    safe("biz_overdue_reminders","business",    "تذكيرات متأخرة",                         checkOverdueReminders),
    safe("biz_pending_docs",     "business",    "وثائق معلّقة قديمة",                    checkPendingDocuments),
    safe("perf_error_rate",      "performance", "معدل أخطاء الخادم",                     checkRecentErrorRate),
    safe("perf_sessions",        "performance", "الجلسات النشطة",                         checkActiveSessions),
    safe("perf_row_counts",      "performance", "أحجام الجداول الرئيسية",                checkTableRowCounts),
    safe("sec_super_admin",      "security",    "عدد حسابات السوبر أدمن",               checkSuperAdminCount),
    safe("sec_inactive_staff",   "security",    "أعضاء الفريق غير النشطين",              checkInactiveStaff),
    safe("sec_old_sessions",     "security",    "جلسات نشطة قديمة",                      checkOldSessions),
    safe("sec_suspended_sessions","security",   "جلسات مستخدمين موقوفين",               checkSuspendedUsersWithSessions),
  ]);

  const checks = [
    dbLatency, dbSize, cacheHit, deadTuples, longQueries, connections, unusedIndexes,
    orphanedUsers, orgsNoUsers, orphanedPlanFeatures, staleSessions, orphanedAddons, inconsistentOrgs,
    expiredTrials, expiringSubscriptions, oldTickets, overdueReminders, pendingDocs,
    errorRate, activeSessions, rowCounts,
    superAdminCount, inactiveStaff, oldSessionsSec, suspendedWithSessions,
  ];

  const summary = {
    ok:    checks.filter(c => c.status === "ok").length,
    warn:  checks.filter(c => c.status === "warn").length,
    error: checks.filter(c => c.status === "error").length,
    info:  checks.filter(c => c.status === "info").length,
    total: checks.length,
  };

  return {
    runAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    summary,
    checks,
  };
}
