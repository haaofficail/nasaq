// PM2 Ecosystem Config — نسق API
// cluster mode: يستخدم جميع CPU cores (الـ VPS المتاحة)
// كل core يشغّل instance مستقل → لا single-process bottleneck
module.exports = {
  apps: [
    {
      name: "nasaq-api",
      script: "./packages/api/dist/index.js",
      exec_mode: "cluster",
      instances: "max",          // استخدم كل الـ cores المتاحة
      max_memory_restart: "512M", // restart عند تجاوز 512MB لكل instance
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Graceful restart — انتظر انتهاء الطلبات الجارية قبل الإغلاق
      kill_timeout: 10000,
      listen_timeout: 5000,
      // إعادة تشغيل تلقائية عند crash
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      // Logs
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
