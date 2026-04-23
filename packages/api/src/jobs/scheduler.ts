import { PgBoss } from "pg-boss";
import { db, pool, directPool } from "@nasaq/db/client";
import { organizations, sessions, otpCodes, systemHealthLog, platformAuditLog } from "@nasaq/db/schema";
import { lt, sql, count, eq } from "drizzle-orm";
import { log } from "../lib/logger";
import { refreshAllSegments } from "../lib/segments-engine";
import { autoCancelOverdueBookings } from "../lib/booking-engine";
import { dispatchReminders } from "./reminder-dispatcher";
import { checkSubscriptions } from "./subscription-checker";
import { runAutoBook } from "./auto-book";
import { processMessageQueue } from "./message-queue-processor";
import { runGuardianScan } from "../lib/guardian/scanner";

// ============================================================
// SCHEDULER — نظام الجدولة المستمر
// يستخدم pg-boss للمهام الخلفية المضمونة (تبقى بعد إعادة التشغيل)
//
// المهام:
//   reminder-dispatcher         — كل دقيقة
//   segment-calculator          — كل ساعة
//   subscription-expiry-check   — كل 6 ساعات
//   auto-cancel-bookings        — يومياً 4:00 صباحاً
//   auto-book-subscriptions     — يومياً 6:00 صباحاً
//   session-cleanup             — يومياً 3:00 صباحاً
//   health-snapshot             — كل 5 دقائق
// ============================================================

const TZ = "Asia/Riyadh";

const JOBS = {
  REMINDER_DISPATCH:    "reminder-dispatcher",
  SEGMENT_REFRESH:      "segment-calculator",
  SUBSCRIPTION_CHECK:   "subscription-expiry-check",
  AUTO_CANCEL:          "auto-cancel-bookings",
  AUTO_BOOK:            "auto-book-subscriptions",
  SESSION_CLEANUP:      "session-cleanup",
  HEALTH_SNAPSHOT:      "health-snapshot",
  MSG_QUEUE:            "message-queue-processor",
  GUARDIAN_SCAN:        "guardian-scan",
} as const;

async function runForAllOrgs(fn: (orgId: string) => Promise<unknown>, label: string) {
  const ORG_BATCH_SIZE = 50;
  const orgs = await db.select({ id: organizations.id }).from(organizations);

  for (let start = 0; start < orgs.length; start += ORG_BATCH_SIZE) {
    const batch = orgs.slice(start, start + ORG_BATCH_SIZE);
    await Promise.all(batch.map((org) => fn(org.id)));
  }

  log.info({ label, orgs: orgs.length }, "[scheduler] job done");
}

async function cleanupSessions() {
  const now = new Date();
  const [s, o] = await Promise.all([
    db.delete(sessions).where(lt(sessions.expiresAt, now)),
    db.delete(otpCodes).where(lt(otpCodes.expiresAt, now)),
  ]);
  log.info(
    { sessions: (s as any).rowCount ?? 0, otpCodes: (o as any).rowCount ?? 0 },
    "[job] session-cleanup done",
  );
}

async function snapshotHealth() {
  const t0 = Date.now();
  await pool.query("SELECT 1");
  const dbLatencyMs = Date.now() - t0;

  const [{ activeSessions }] = await db
    .select({ activeSessions: count() })
    .from(sessions)
    .where(sql`${sessions.expiresAt} > NOW()`);

  const [{ activeOrgs }] = await db
    .select({ activeOrgs: count() })
    .from(organizations)
    .where(sql`${organizations.subscriptionStatus} IN ('active', 'trialing')`);

  const since = new Date(Date.now() - 5 * 60 * 1000);
  const [{ recentErrors }] = await db
    .select({ recentErrors: count() })
    .from(platformAuditLog)
    .where(sql`${platformAuditLog.action} = 'srv_error' AND ${platformAuditLog.createdAt} >= ${since}`);

  const notes =
    dbLatencyMs > 500        ? `تحذير: زمن استجابة قاعدة البيانات ${dbLatencyMs}ms`
    : Number(recentErrors) > 5 ? `تحذير: ${recentErrors} أخطاء خادم في آخر 5 دقائق`
    : "طبيعي";

  await db.insert(systemHealthLog).values({
    dbLatencyMs,
    activeSessions: Number(activeSessions),
    activeOrgs:     Number(activeOrgs),
    errorRate:      String(Number(recentErrors)),
    notes,
  });
}

// جلب اسم المنشأة لـ log مقروء
function wrap(label: string, fn: () => Promise<void>): () => Promise<void> {
  return async () => {
    try {
      await fn();
    } catch (err) {
      log.error({ err }, `[job] ${label} failed`);
    }
  };
}

export async function startScheduler(): Promise<PgBoss> {
  // pg-boss يحتاج LISTEN/NOTIFY وعمليات DDL — يجب اتصال مباشر (ليس pooler)
  const boss = new PgBoss(process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!);

  boss.on("error", (err) => log.error({ err }, "[pg-boss] internal error"));

  await boss.start();
  log.info("[scheduler] pg-boss started");

  // ── إنشاء الطوابير (مطلوب في pg-boss v10+) ─────────────────
  await Promise.all(Object.values(JOBS).map((name) => boss.createQueue(name)));

  // ── تسجيل الجداول الزمنية ──────────────────────────────────
  await Promise.all([
    boss.schedule(JOBS.REMINDER_DISPATCH,  "* * * * *",    null, { tz: TZ }),
    boss.schedule(JOBS.SEGMENT_REFRESH,    "0 * * * *",    null, { tz: TZ }),
    boss.schedule(JOBS.SUBSCRIPTION_CHECK, "0 */6 * * *",  null, { tz: TZ }),
    boss.schedule(JOBS.AUTO_CANCEL,        "0 4 * * *",    null, { tz: TZ }),
    boss.schedule(JOBS.AUTO_BOOK,          "0 6 * * *",    null, { tz: TZ }),
    boss.schedule(JOBS.SESSION_CLEANUP,    "0 3 * * *",    null, { tz: TZ }),
    boss.schedule(JOBS.HEALTH_SNAPSHOT,    "*/5 * * * *",  null, { tz: TZ }),
    boss.schedule(JOBS.MSG_QUEUE,          "* * * * *",    null, { tz: TZ }),
    boss.schedule(JOBS.GUARDIAN_SCAN,      "0 */6 * * *",  null, { tz: TZ }),
  ]);

  // ── تسجيل المعالجات ────────────────────────────────────────
  await Promise.all([
    boss.work(JOBS.REMINDER_DISPATCH,  wrap("reminder-dispatcher",    dispatchReminders)),
    boss.work(JOBS.SEGMENT_REFRESH,    wrap("segment-calculator",     () => runForAllOrgs(refreshAllSegments,        "segment-calculator"))),
    boss.work(JOBS.SUBSCRIPTION_CHECK, wrap("subscription-checker",   checkSubscriptions)),
    boss.work(JOBS.AUTO_CANCEL,        wrap("auto-cancel-bookings",   () => runForAllOrgs(autoCancelOverdueBookings, "auto-cancel"))),
    boss.work(JOBS.AUTO_BOOK,          wrap("auto-book-subscriptions", runAutoBook)),
    boss.work(JOBS.SESSION_CLEANUP,    wrap("session-cleanup",        cleanupSessions)),
    boss.work(JOBS.HEALTH_SNAPSHOT,    wrap("health-snapshot",        snapshotHealth)),
    boss.work(JOBS.MSG_QUEUE,          wrap("message-queue-processor", processMessageQueue)),
    boss.work(JOBS.GUARDIAN_SCAN,      wrap("guardian-scan",           () => runGuardianScan("scheduled"))),
  ]);

  log.info("[scheduler] all 9 jobs registered");
  return boss;
}
