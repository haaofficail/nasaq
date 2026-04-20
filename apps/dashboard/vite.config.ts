import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@nasaq/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@nasaq/page-builder-v2": path.resolve(__dirname, "../../packages/page-builder-v2/src"),
      "@nasaq/ui-v2": path.resolve(__dirname, "../../packages/ui-v2/src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["xlsx"],
    exclude: ["@capacitor-firebase/messaging", "capacitor-thermal-printer"],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // These Capacitor plugins import native/firebase SDKs not available on web.
      // They are loaded via dynamic import only when isNative === true.
      external: (id) =>
        id === "@capacitor-firebase/messaging" || id === "capacitor-thermal-printer",
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/scheduler/")) return "react";
          if (id.includes("react-router")) return "router";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("clsx") || id.includes("class-variance") || id.includes("tailwind-merge")) return "ui-utils";
          if (id.includes("date-fns") || id.includes("dayjs")) return "date";
          if (id.includes("@capacitor")) return "capacitor";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
