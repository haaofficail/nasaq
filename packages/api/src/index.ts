import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import "dotenv/config";
import { db, pool } from "@nasaq/db/client";
import { organizations } from "@nasaq/db/schema";
import { log } from "./lib/logger";
import { autoCancelOverdueBookings } from "./lib/booking-engine";
import { refreshAllSegments } from "./lib/segments-engine";
import { SEGMENT_REFRESH_INTERVAL_MS, AUTO_CANCEL_INTERVAL_MS } from "./lib/constants";

// Middleware
import { authMiddleware, requirePermission, locationFilter } from "./middleware/auth";

// Routes
import { authRouter } from "./routes/auth";
import { categoriesRouter } from "./routes/categories";
import { servicesRouter } from "./routes/services";
import { addonsRouter } from "./routes/addons";
import { bundlesRouter } from "./routes/bundles";
import { pricingRulesRouter } from "./routes/pricing-rules";
import { bookingsRouter } from "./routes/bookings";
import { customersRouter } from "./routes/customers";
import { uploadsRouter } from "./routes/uploads";
import { importRouter } from "./routes/import";
import { approvalsRouter } from "./routes/approvals";
import { financeRouter } from "./routes/finance";
import { inventoryRouter } from "./routes/inventory";
import { teamRouter } from "./routes/team";
import { automationRouter } from "./routes/automation";
import { marketingRouter } from "./routes/marketing";
import { platformRouter } from "./routes/platform";
import { websiteRouter } from "./routes/website";
import { settingsRouter } from "./routes/settings";
import { suppliersRouter } from "./routes/suppliers";
import { posRouter } from "./routes/pos";
import { onlineOrdersRouter } from "./routes/online-orders";
import { menuRouter } from "./routes/menu";
import { arrangementsRouter } from "./routes/arrangements";
import { messagingRouter } from "./routes/messaging";
import { flowerBuilderRouter } from "./routes/flower-builder";
import { attendanceRouter } from "./routes/attendance";

// ============================================================
// APP
// ============================================================

const app = new Hono().basePath("/api/v1");

// Global middleware
app.use("*", requestId());
app.use("*", cors({
  origin: process.env.DASHBOARD_URL || "http://localhost:5173",
  credentials: true,
}));
app.use("*", logger());
app.use("*", prettyJSON());

// Propagate request ID to response header (O2)
app.use("*", async (c, next) => {
  await next();
  const id = c.get("requestId") as string | undefined;
  if (id) c.res.headers.set("X-Request-Id", id);
});

// Health check with DB probe (O5)
app.get("/health", async (c) => {
  try {
    await pool.query("SELECT 1");
    return c.json({
      status: "ok",
      version: process.env.APP_VERSION || "0.1.0",
      name: "nasaq-api",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return c.json({ status: "error", name: "nasaq-api", timestamp: new Date().toISOString() }, 503);
  }
});

// ============================================================
// PUBLIC ROUTES (no auth required)
// ============================================================

// Auth (login/logout)
app.route("/auth", authRouter);

// ============================================================
// PROTECTED ROUTES (auth required)
// ============================================================

// Apply auth middleware to all routes below
app.use("/categories/*", authMiddleware);
app.use("/services/*", authMiddleware);
app.use("/addons/*", authMiddleware);
app.use("/bundles/*", authMiddleware);
app.use("/pricing-rules/*", authMiddleware);
app.use("/bookings/*", async (c, next) => {
  // Public: booking tracking endpoint — no auth required
  if (c.req.path.includes("/bookings/track/")) return next();
  return authMiddleware(c, next);
});
app.use("/customers/*", authMiddleware);
app.use("/uploads/*", authMiddleware);
app.use("/import/*", authMiddleware);
app.use("/approvals/*", authMiddleware);
app.use("/finance/*", authMiddleware);
app.use("/inventory/*", authMiddleware);
app.use("/team/*", authMiddleware);
app.use("/automation/*", authMiddleware);
app.use("/marketing/*", authMiddleware);
app.use("/platform/*", authMiddleware);
app.use("/website/*", async (c, next) => {
  // Public: website public routes — no auth required
  if (c.req.path.includes("/website/public/")) return next();
  return authMiddleware(c, next);
});
app.use("/settings/*", authMiddleware);
app.use("/suppliers/*", authMiddleware);
app.use("/pos/*", authMiddleware);
app.use("/online-orders/*", authMiddleware);
app.use("/menu/*", authMiddleware);
app.use("/arrangements/*", authMiddleware);
app.use("/messaging/*", authMiddleware);
app.use("/flower-builder/*", async (c, next) => {
  if (c.req.path.includes("/flower-builder/public/")) return next();
  return authMiddleware(c, next);
});

// RBAC: permission guards per resource (owners bypass automatically)
function methodGuard(resource: string) {
  return async (c: any, next: any) => {
    const action = c.req.method === "GET" ? "view" : "edit";
    return requirePermission(resource, action)(c, next);
  };
}

app.use("/categories/*", methodGuard("services"));
app.use("/services/*", methodGuard("services"));
app.use("/addons/*", methodGuard("services"));
app.use("/bundles/*", methodGuard("services"));
app.use("/pricing-rules/*", methodGuard("services"));
app.use("/bookings/*", async (c, next) => {
  if (c.req.path.includes("/bookings/track/")) return next();
  return methodGuard("bookings")(c, next);
});
app.use("/customers/*", methodGuard("customers"));
app.use("/finance/*", methodGuard("finance"));
app.use("/inventory/*", methodGuard("inventory"));
app.use("/team/*", methodGuard("team"));
app.use("/automation/*", methodGuard("automation"));
app.use("/marketing/*", methodGuard("marketing"));
app.use("/platform/*", methodGuard("platform"));
app.use("/website/*", async (c, next) => {
  if (c.req.path.includes("/website/public/")) return next();
  return methodGuard("website")(c, next);
});
app.use("/settings/*", methodGuard("settings"));
app.use("/suppliers/*", methodGuard("inventory"));
app.use("/pos/*", methodGuard("bookings"));
app.use("/online-orders/*", methodGuard("bookings"));
app.use("/menu/*", methodGuard("services"));
app.use("/arrangements/*", methodGuard("services"));
app.use("/messaging/*", methodGuard("settings"));
app.use("/flower-builder/*", async (c, next) => {
  if (c.req.path.includes("/flower-builder/public/")) return next();
  return methodGuard("services")(c, next);
});

// Apply location filter
app.use("/bookings/*", async (c, next) => {
  if (c.req.path.includes("/bookings/track/")) return next();
  return locationFilter()(c, next);
});

// --- Service Catalog ---
app.route("/categories", categoriesRouter);
app.route("/services", servicesRouter);
app.route("/addons", addonsRouter);
app.route("/bundles", bundlesRouter);
app.route("/pricing-rules", pricingRulesRouter);

// --- Bookings ---
app.route("/bookings", bookingsRouter);

// --- CRM ---
app.route("/customers", customersRouter);

// --- Files ---
app.route("/uploads", uploadsRouter);

// --- Import ---
app.route("/import", importRouter);

// --- Approvals ---
app.route("/approvals", approvalsRouter);

// --- Phase 2: Finance ---
app.route("/finance", financeRouter);

// --- Phase 2: Inventory ---
app.route("/inventory", inventoryRouter);

// --- Phase 2: Team ---
app.route("/team", teamRouter);

// --- Phase 2: Automation ---
app.route("/automation", automationRouter);

// --- Phase 3: Marketing ---
app.route("/marketing", marketingRouter);

// --- Phase 4: Platform ---
app.route("/platform", platformRouter);

// --- Website & Blog ---
app.route("/website", websiteRouter);

// --- Settings ---
app.route("/settings", settingsRouter);

// --- Suppliers ---
app.route("/suppliers", suppliersRouter);

// --- POS ---
app.route("/pos", posRouter);

// --- Online Orders ---
app.route("/online-orders", onlineOrdersRouter);

// --- Menu (Restaurant / Cafe / Catering / Bakery) ---
app.route("/menu", menuRouter);

// --- Arrangements (Flower Shop) ---
app.route("/arrangements", arrangementsRouter);

// --- Messaging (WhatsApp) ---
app.route("/messaging", messagingRouter);

// --- Flower Builder ---
app.route("/flower-builder", flowerBuilderRouter);

// --- Attendance Engine ---
app.use("/attendance/*", authMiddleware);
app.route("/attendance", attendanceRouter);

// ============================================================
// ERROR HANDLING
// ============================================================

app.notFound((c) => c.json({ error: "Not found", path: c.req.path }, 404));

app.onError((err, c) => {
  const reqId = c.get("requestId") as string | undefined;
  log.error({ requestId: reqId, path: c.req.path, method: c.req.method, err }, "unhandled error");
  return c.json({
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    requestId: reqId,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  }, 500);
});

// ============================================================
// SCHEDULED JOBS (L3/L4)
// ============================================================

async function runForAllOrgs(job: (orgId: string) => Promise<unknown>, label: string) {
  const start = Date.now();
  try {
    const orgs = await db.select({ id: organizations.id }).from(organizations);
    await Promise.all(orgs.map((org) => job(org.id)));
    log.info({ label, orgs: orgs.length, durationMs: Date.now() - start }, "scheduler job done");
  } catch (err) {
    log.error({ label, err }, "scheduler job error");
  }
}

// Refresh customer segments every hour
const segmentInterval = setInterval(() => runForAllOrgs(refreshAllSegments, "refreshAllSegments"), SEGMENT_REFRESH_INTERVAL_MS);

// Auto-cancel overdue bookings once per day
const cancelInterval = setInterval(() => runForAllOrgs(autoCancelOverdueBookings, "autoCancelOverdueBookings"), AUTO_CANCEL_INTERVAL_MS);

// ============================================================
// START
// ============================================================

// Startup env validation — fail fast if required vars are missing (L1/L6)
const REQUIRED_ENV = ["DATABASE_URL"];
const missingEnv = REQUIRED_ENV.filter((v) => !process.env[v]);
if (missingEnv.length > 0) {
  log.fatal({ missing: missingEnv }, "missing required environment variables");
  process.exit(1);
}

// DB connectivity check before accepting traffic
try {
  await pool.query("SELECT 1");
  log.info("database connected");
} catch (err) {
  log.fatal({ err }, "cannot connect to database");
  process.exit(1);
}

const port = parseInt(process.env.PORT || "3000");

log.info({ port, url: `http://localhost:${port}/api/v1` }, "nasaq-api started");

const server = serve({ fetch: app.fetch, port });

// Graceful shutdown — stop schedulers, drain connections, close pool (L1/L2)
const shutdown = () => {
  log.info("shutting down — closing server and DB pool");
  clearInterval(segmentInterval);
  clearInterval(cancelInterval);
  server.close(async () => {
    await pool.end();
    log.info("shutdown complete");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default app;
