// PM2 Ecosystem Config — نسق
//
// ─── الوضع الحالي ───────────────────────────────────────────────
// nasaq-api: cluster mode (جميع الـ cores)، يضم API + jobs في نفس الـ process
//
// ─── الانتقال لـ Worker Separation ────────────────────────────
// عند الجاهزية:
//   1. في packages/api/src/index.ts: علّق سطر `await startScheduler()` ونهايته
//   2. فعّل nasaq-worker أدناه (احذف `disabled: true`)
//   3. شغّل: pm2 delete nasaq-api && pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    // ── API Server ─────────────────────────────────────────────
    {
      name: "nasaq-api",
      script: "./packages/api/dist/index.js",
      exec_mode: "cluster",
      instances: "max",           // استخدم كل الـ cores المتاحة
      max_memory_restart: "512M", // restart عند تجاوز 512MB لكل instance
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      kill_timeout: 10000,
      listen_timeout: 5000,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },

    // ── Worker Process (Jobs) — معطّل حتى تفعيل Worker Separation ──
    // لتفعيله: احذف سطر `disabled: true` وعلّق startScheduler() في index.ts
    {
      name: "nasaq-worker",
      script: "./packages/api/dist/worker.js",
      exec_mode: "fork",     // worker واحد فقط — لا cluster
      instances: 1,
      disabled: true,        // ← احذف هذا السطر عند التفعيل
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
      },
      kill_timeout: 15000,   // انتظر انتهاء الـ jobs الجارية
      autorestart: true,
      max_restarts: 5,
      restart_delay: 5000,
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
