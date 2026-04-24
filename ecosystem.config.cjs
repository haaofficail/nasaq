// PM2 Ecosystem Config — ترميز OS
//
// ─── الوضع الحالي ───────────────────────────────────────────────
// nasaq-api: API stateless نسبياً، لا يحمل Baileys sockets داخل عملية الويب.
// nasaq-whatsapp-worker: عامل مستقل لاتصالات WhatsApp Baileys وطوابير pg-boss.
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
      instances: 1,
      max_memory_restart: "512M",
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
    // ── WhatsApp Worker ────────────────────────────────────────
    // Singleton لأن Baileys session لكل منشأة يجب أن تبقى في عملية واحدة.
    {
      name: "nasaq-whatsapp-worker",
      script: "./packages/api/src/workers/whatsapp-worker.ts",
      interpreter: "node",
      interpreter_args: "--env-file .env --import ./packages/api/node_modules/tsx/dist/esm/index.cjs",
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "768M",
      env: {
        NODE_ENV: "production",
      },
      kill_timeout: 15000,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      error_file: "/var/log/nasaq/whatsapp-worker-error.log",
      out_file: "/var/log/nasaq/whatsapp-worker-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
