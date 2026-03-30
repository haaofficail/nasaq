/**
 * Lease Engine
 *
 * Owns: rental contracts, rental_unit_definitions (long-term)
 * Business types: rental, real_estate
 *
 * Difference from Stay engine:
 *   Stay    = short term (days/weeks) — hotel, car daily
 *   Lease   = long term (months/years) with contracts and payment schedules
 *
 * Delegates to existing contracts/rental.ts until full migration.
 * New features go here — not in legacy rental.ts.
 */

import { Hono } from "hono";

export const leaseEngine = new Hono();

// Lease engine routes will be progressively migrated from:
// packages/api/src/routes/rental.ts
//
// Current delegation: legacy routes handle requests
// Migration path:
//   Phase 1: New lease bookings → this engine
//   Phase 2: Migrate existing contracts → lease engine models
//   Phase 3: Deprecate rental.ts routes

leaseEngine.get("/", (c) => c.json({
  engine: "lease",
  status: "migration_in_progress",
  legacyRoutes: ["/api/v1/rental/*", "/api/v1/contracts/*"],
}));
