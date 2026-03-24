import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import "dotenv/config";
import { z } from "zod";
import { db, pool } from "@nasaq/db/client";
import { platformAuditLog } from "@nasaq/db/schema";
import { log } from "./lib/logger";
import { startScheduler } from "./jobs/scheduler";

// Middleware
import { authMiddleware, requirePermission, requireCapability, locationFilter, superAdminMiddleware } from "./middleware/auth";

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
import { hotelRouter } from "./routes/hotel";
import { carRentalRouter } from "./routes/car-rental";
import { integrationsRouter } from "./routes/integrations";
import { flowerMasterRouter } from "./routes/flower-master";
import { treasuryRouter } from "./routes/treasury";
import { accountingRouter } from "./routes/accounting";
import { reconciliationRouter } from "./routes/reconciliation";
import { auditLogRouter } from "./routes/audit-log";
import { mediaRouter } from "./routes/media";
import { salonRouter } from "./routes/salon";
import { restaurantRouter } from "./routes/restaurant";
import { rentalRouter } from "./routes/rental";
import { jobTitlesRouter } from "./routes/job-titles";
import { membersRouter } from "./routes/members";
import { deliveryRouter } from "./routes/delivery";
import { adminRouter } from "./routes/admin";
import { commercialRouter } from "./routes/commercial";
import { remindersRouter } from "./routes/reminders";
import { billingRouter } from "./routes/billing";
import { marketplaceRouter } from "./routes/marketplace";
import { eventsRouter } from "./routes/events";
import { procurementRouter } from "./routes/procurement";
import { fulfillmentsRouter } from "./routes/fulfillments";
import { subscriptionRouter, orgStatsRouter } from "./routes/subscription";

// ============================================================
// APP
// ============================================================

const app = new Hono<{ Variables: { adminId?: string; requestId: string } }>().basePath("/api/v1");

// Global middleware
app.use("*", requestId());
app.use("*", cors({
  origin: process.env.DASHBOARD_URL || "http://localhost:5173",
  credentials: true,
}));
app.use("*", logger());
app.use("*", prettyJSON());

// Security headers
app.use("*", async (c, next) => {
  await next();
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  if (process.env.NODE_ENV !== "development") {
    c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
});

// Propagate request ID to response header (O2)
app.use("*", async (c, next) => {
  await next();
  const id = c.get("requestId") as string | undefined;
  if (id) c.res.headers.set("X-Request-Id", id);
});

// Global error handler — يُسجّل كل خطأ 500 في platformAuditLog ويُرجع كوداً
app.onError((err, c) => {
  // ZodError from bare .parse() calls → 400 instead of 500
  if (err instanceof z.ZodError) {
    const first = err.errors[0];
    const msg = first
      ? `${first.path.length ? first.path.join(".") + ": " : ""}${first.message}`
      : "بيانات غير صحيحة";
    return c.json({ error: msg, code: "VALIDATION_ERROR", details: err.flatten() }, 400);
  }

  const requestId = (c.get("requestId") as string | undefined) ?? undefined;
  const url = new URL(c.req.url);
  const path = url.pathname;
  const method = c.req.method;
  const adminId = (c.get("adminId") as string | undefined) ?? "system";

  // log the error for visibility in the admin system tab
  db.insert(platformAuditLog).values({
    adminId,
    action: "srv_error",
    targetType: "system",
    targetId: requestId ?? null,
    details: {
      code: "SRV_INTERNAL",
      path,
      method,
      message: err.message,
      requestId,
    },
    ip: (c.req.header("CF-Connecting-IP") || c.req.header("X-Real-IP") || (c.req.header("X-Forwarded-For") || "").split(",")[0].trim() || null),
  }).catch(() => {});

  log.error(`[SRV_INTERNAL] ${method} ${path} rid=${requestId ?? "-"} ${err.message}`);

  return c.json(
    { error: "خطأ في الخادم، يرجى المحاولة لاحقاً", code: "SRV_INTERNAL", requestId },
    500,
  );
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
app.use("/uploads/*", methodGuard("services"));
app.use("/import/*", methodGuard("settings"));
app.use("/approvals/*", methodGuard("bookings"));
app.use("/finance/*", authMiddleware);
app.use("/inventory/*", authMiddleware);
app.use("/inventory/*", requireCapability("inventory"));
app.use("/team/*", authMiddleware);
app.use("/automation/*", authMiddleware);
app.use("/marketing/*", authMiddleware);
app.use("/platform/*", authMiddleware);
app.use("/website/*", async (c, next) => {
  // Public: website public routes — no auth required
  if (c.req.path.includes("/website/public/")) return next();
  return authMiddleware(c, next);
});
app.use("/website/*", async (c, next) => {
  if (c.req.path.includes("/website/public/")) return next();
  return requireCapability("website")(c, next);
});
app.use("/settings/*", authMiddleware);
app.use("/suppliers/*", authMiddleware);
app.use("/suppliers/*", requireCapability("inventory"));
app.use("/pos/*", authMiddleware);
app.use("/pos/*", requireCapability("pos"));
app.use("/online-orders/*", authMiddleware);
app.use("/online-orders/*", requireCapability("pos"));
app.use("/menu/*", authMiddleware);
app.use("/menu/*", requireCapability("pos"));
app.use("/arrangements/*", authMiddleware);
app.use("/arrangements/*", requireCapability("floral"));
app.use("/messaging/*", authMiddleware);
app.use("/flower-builder/*", async (c, next) => {
  if (c.req.path.includes("/flower-builder/public/")) return next();
  return authMiddleware(c, next);
});
app.use("/flower-builder/*", async (c, next) => {
  if (c.req.path.includes("/flower-builder/public/")) return next();
  return requireCapability("floral")(c, next);
});

// RBAC: permission guards per resource — maps HTTP method to action
// GET → view | POST → create | PUT/PATCH → edit | DELETE → delete
// actionOverrides: optional per-method action name (e.g. { DELETE: "remove" })
function methodGuard(resource: string, actionOverrides: Partial<Record<string, string>> = {}) {
  return async (c: any, next: any) => {
    const method = c.req.method;
    let action: string;
    if (actionOverrides[method])               action = actionOverrides[method]!;
    else if (method === "GET")                 action = "view";
    else if (method === "POST")                action = "create";
    else if (method === "DELETE")              action = "delete";
    else                                       action = "edit"; // PUT, PATCH
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

// --- Fulfillments (warehouse lifecycle) ---
app.use("/fulfillments/*", authMiddleware);
app.use("/fulfillments/*", requireCapability("inventory"));
app.use("/fulfillments/*", methodGuard("inventory"));
app.route("/fulfillments", fulfillmentsRouter);

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

// --- Salon Supplies ---
app.use("/salon/*", authMiddleware);
app.use("/salon/*", methodGuard("inventory"));
app.route("/salon", salonRouter);

// --- Restaurant Intelligence ---
app.use("/restaurant/*", authMiddleware);
app.use("/restaurant/*", methodGuard("bookings"));
app.route("/restaurant", restaurantRouter);

// --- Rental (contracts + inspections + analytics) ---
app.use("/rental/*", authMiddleware);
app.use("/rental/*", methodGuard("bookings"));
app.route("/rental", rentalRouter);

// --- Contracts (backward compat alias → rental) ---
app.use("/contracts/*", authMiddleware);
app.use("/contracts/*", methodGuard("bookings"));
app.route("/contracts", rentalRouter);

// --- Inspections (backward compat alias) ---
app.use("/inspections/*", authMiddleware);
app.use("/inspections/*", methodGuard("bookings"));
app.route("/inspections", rentalRouter);

// --- Attendance Engine ---
app.use("/attendance/*", authMiddleware);
app.use("/attendance/*", requireCapability("attendance"));
app.use("/attendance/*", methodGuard("team"));
app.route("/attendance", attendanceRouter);

// --- Hotel ---
app.use("/hotel/*", authMiddleware);
app.use("/hotel/*", requireCapability("hotel"));
app.use("/hotel/*", methodGuard("bookings"));
app.route("/hotel", hotelRouter);

// --- Car Rental ---
app.use("/car-rental/*", authMiddleware);
app.use("/car-rental/*", requireCapability("car_rental"));
app.use("/car-rental/*", methodGuard("bookings"));
app.route("/car-rental", carRentalRouter);

// --- Integrations ---
app.use("/integrations/*", async (c, next) => {
  // Public: inbound webhooks from providers
  if (c.req.path.includes("/integrations/webhook/inbound/")) return next();
  return authMiddleware(c, next);
});
app.use("/integrations/*", async (c, next) => {
  if (c.req.path.includes("/integrations/webhook/inbound/")) return next();
  return methodGuard("settings")(c, next);
});
app.route("/integrations", integrationsRouter);

// --- Treasury ---
app.use("/treasury/*", authMiddleware);
app.use("/treasury/*", requireCapability("accounting"));
app.use("/treasury/*", methodGuard("finance"));
app.route("/treasury", treasuryRouter);

// --- Accounting ---
app.use("/accounting/*", authMiddleware);
app.use("/accounting/*", requireCapability("accounting"));
app.use("/accounting/*", methodGuard("finance"));
app.route("/accounting", accountingRouter);

// --- Reconciliation ---
app.use("/reconciliation/*", authMiddleware);
app.use("/reconciliation/*", requireCapability("accounting"));
app.use("/reconciliation/*", methodGuard("finance"));
app.route("/reconciliation", reconciliationRouter);

// --- Audit Log ---
app.use("/audit-log/*", authMiddleware);
app.use("/audit-log/*", methodGuard("finance"));
app.route("/audit-log", auditLogRouter);

// --- Media Library (DAM) ---
app.use("/media/*", authMiddleware);
app.use("/media/*", methodGuard("services"));
app.route("/media", mediaRouter);

// --- RBAC v2: Job Titles ---
app.use("/job-titles/*", authMiddleware);
app.use("/job-titles/*", methodGuard("team"));
app.route("/job-titles", jobTitlesRouter);

// --- RBAC v2: Org Members ---
app.use("/members/*", authMiddleware);
app.use("/members/*", methodGuard("team", { DELETE: "remove" }));
app.route("/members", membersRouter);

// --- Delivery ---
app.use("/delivery/*", authMiddleware);
app.use("/delivery/*", methodGuard("team"));
app.route("/delivery", deliveryRouter);

// --- Billing & Subscription (يعمل حتى عند إيقاف الاشتراك) ---
// webhook عام بدون auth، status + renew يتطلبان auth لكن يتجاوزان suspension check
app.use("/billing/*", async (c, next) => {
  // webhook لا يحتاج auth
  if (c.req.path.endsWith("/webhook/moyasar")) return next();
  return authMiddleware(c, next);
});
app.route("/billing", billingRouter);

// --- Organization Subscription & Stats ---
app.use("/organization/*", authMiddleware);
app.route("/organization/subscription", subscriptionRouter);
app.route("/organization/stats", orgStatsRouter);

// --- Marketplace (سوق نسق) ---
// Public: GET /marketplace, GET /marketplace/categories, POST /marketplace/rfp
// Authenticated: /marketplace/my-listings, /marketplace/listings
app.use("/marketplace/*", async (c, next) => {
  const path   = c.req.path;
  const method = c.req.method;
  // Allow public read + RFP
  if (method === "GET"  && (path === "/api/v1/marketplace" || path === "/api/v1/marketplace/categories")) return next();
  if (method === "POST" && path === "/api/v1/marketplace/rfp") return next();
  return authMiddleware(c, next);
});
app.route("/marketplace", marketplaceRouter);

// --- Super Admin Panel ---
// Note: admin router has its own super-admin middleware, no outer guards needed
app.route("/admin", adminRouter);

// --- Commercial Engine (plan builder, features, quotas, add-ons, entitlements) ---
// Note: commercial router has its own super-admin middleware for write operations
app.route("/admin", commercialRouter);

// --- Events & Tickets ---
app.use("/events/*", authMiddleware);
app.use("/events/*", methodGuard("bookings"));
app.route("/events", eventsRouter);

// --- Procurement (Suppliers / PO / GR / Invoices) ---
app.use("/procurement/*", authMiddleware);
app.use("/procurement/*", requireCapability("inventory"));
app.use("/procurement/*", methodGuard("inventory"));
app.route("/procurement", procurementRouter);

// --- Reminders ---
app.use("/reminders/*", authMiddleware);
app.use("/reminders/*", async (c, next) => {
  // Templates & categories are read-only reference data — no extra permission needed
  const path = c.req.path;
  if (c.req.method === "GET" && (path.endsWith("/templates") || path.endsWith("/categories"))) {
    return next();
  }
  return methodGuard("bookings")(c, next);
});
app.route("/reminders", remindersRouter);

// --- Flower Master Data ---
app.use("/flower-master/*", authMiddleware);
app.use("/flower-master/*", requireCapability("floral"));
app.use("/flower-master/*", async (c, next) => {
  // GET — read-only, no perm check needed
  if (c.req.method === "GET") return next();
  // POST — merchants can add new variants (contribute to shared catalog)
  if (c.req.method === "POST") return methodGuard("services")(c, next);
  // PUT / PATCH / DELETE — edit/disable existing global variants → super admin only
  return superAdminMiddleware(c, next);
});
app.route("/flower-master", flowerMasterRouter);

// ============================================================
// ERROR HANDLING
// ============================================================

app.notFound((c) => c.json({ error: "Not found", path: c.req.path }, 404));

// ============================================================
// SCHEDULED JOBS — managed by pg-boss (src/jobs/scheduler.ts)
// ============================================================

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

// Start pg-boss scheduler (creates pgboss schema on first run, resumes on restart)
const boss = await startScheduler();

const port = parseInt(process.env.PORT || "3000");

log.info({ port, url: `http://localhost:${port}/api/v1` }, "nasaq-api started");

const server = serve({ fetch: app.fetch, port });

// Graceful shutdown — stop pg-boss, drain connections, close pool
const shutdown = () => {
  log.info("shutting down — stopping scheduler and DB pool");
  boss.stop({ graceful: true, timeout: 10_000 }).then(() => {
    server.close(async () => {
      await pool.end();
      log.info("shutdown complete");
      process.exit(0);
    });
  }).catch(() => process.exit(1));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default app;
