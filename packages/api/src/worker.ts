// ============================================================
// NASAQ WORKER — عملية الـ jobs المستقلة عن الـ API
//
// يُشغَّل بشكل منفصل عن index.ts (API server) لتخفيف الحمل
// يستخدم pg-boss عبر directPool (اتصال مباشر بـ PostgreSQL)
//
// التشغيل اليدوي:
//   node dist/worker.js
//
// لتفعيله في PM2:
//   1. أوقف استدعاء startScheduler() في index.ts (علّق السطرين أدناه)
//   2. شغّل: pm2 start ecosystem.config.cjs (يبدأ nasaq-worker)
//   3. أعِد تشغيل: pm2 restart nasaq-api --update-env
//
// الوضع الحالي: هذا الملف جاهز لكنه غير مُفعَّل
//   - index.ts لا يزال يُشغّل startScheduler()
//   - لا تشغّل هذا الملف مع index.ts في نفس الوقت (سيُنشئ job processors مزدوجة)
// ============================================================

import "dotenv/config";
import { directPool } from "@nasaq/db/client";
import { log } from "./lib/logger";
import { startScheduler } from "./jobs/scheduler";

// Startup env validation
const REQUIRED_ENV = ["DATABASE_URL"];
const missing = REQUIRED_ENV.filter((v) => !process.env[v]);
if (missing.length > 0) {
  log.fatal({ missing }, "[worker] missing required env vars");
  process.exit(1);
}

// DB connectivity check
try {
  await directPool.query("SELECT 1");
  log.info("[worker] database connected (direct pool)");
} catch (err) {
  log.fatal({ err }, "[worker] cannot connect to database");
  process.exit(1);
}

// Start scheduler
const boss = await startScheduler();
log.info("[worker] jobs started (pg-boss)");

// Graceful shutdown
const shutdown = async () => {
  log.info("[worker] shutting down...");
  await boss.stop({ graceful: true, timeout: 10_000 }).catch(() => {});
  await directPool.end().catch(() => {});
  log.info("[worker] shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT",  shutdown);
