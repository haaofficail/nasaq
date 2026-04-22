// PM2 Ecosystem Config — نسق
//
// ─── الوضع الحالي ───────────────────────────────────────────────
// nasaq-api: cluster mode (جميع الـ cores)، يضم API + jobs في نفس الـ process
//
// ─── الانتقال لـ Worker Separation ────────────────────────────
// عند الجاهزية:
//   1. في packages/api/src/index.ts: علّق سطر `await startScheduler()` ونهايته
//   2. أضف كتلة nasaq-worker أدناه (محفوظة في التعليق)
//   3. شغّل: pm2 delete nasaq-api && pm2 start ecosystem.config.cjs && pm2 save
//
// كتلة nasaq-worker (غير مفعّلة):
// {
//   name: "nasaq-worker",
//   script: "./packages/api/src/worker.ts",
//   interpreter: "node",
//   interpreter_args: "--env-file .env --import ./packages/api/node_modules/tsx/dist/esm/index.cjs",
//   exec_mode: "fork",
//   instances: 1,
//   max_memory_restart: "256M",
//   env: { NODE_ENV: "production" },
//   kill_timeout: 15000,
//   autorestart: true,
//   max_restarts: 5,
//   restart_delay: 5000,
//   error_file: "/var/log/nasaq/worker-error.log",
//   out_file: "/var/log/nasaq/worker-out.log",
//   merge_logs: true,
//   log_date_format: "YYYY-MM-DD HH:mm:ss",
// }
module.exports = {
  apps: [
    // ── API Server ─────────────────────────────────────────────
    // يستخدم node --import tsx لتشغيل TypeScript مباشرة مع دعم cluster mode
    // @nasaq/db exports .ts files → تتطلب tsx loader في الـ runtime
    {
      name: "nasaq-api",
      script: "./packages/api/src/index.ts",
      interpreter: "node",
      interpreter_args: "--env-file .env --import ./packages/api/node_modules/tsx/dist/esm/index.cjs",
      exec_mode: "fork",
      instances: 1,               // fork مطلوب لـ Baileys (singleton WhatsApp session per org)
      max_memory_restart: "768M", // أكثر بسبب Baileys sessions في الذاكرة
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      kill_timeout: 15000,   // وقت كافي لـ pg-boss graceful stop (10s) + buffer
      listen_timeout: 10000,
      wait_ready: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,   // 5s > وقت shutdown المتوقع — يمنع EADDRINUSE
      error_file: "/var/log/nasaq/api-error.log",
      out_file: "/var/log/nasaq/api-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
