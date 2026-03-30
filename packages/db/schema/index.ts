// ============================================================
// نسق — Nasaq Database Schema
// Phase 1: النواة التشغيلية
// ============================================================

export * from "./organizations";
export * from "./auth";
export * from "./catalog";
export * from "./customers";
export * from "./bookings";
export * from "./approvals";
export * from "./finance";
export * from "./inventory";
export * from "./team";
export * from "./automation";
export * from "./marketing";
export * from "./marketplace";
export * from "./website";
export * from "./hotel";
export * from "./car-rental";
export * from "./integrations";
export * from "./flowers";
export * from "./accounting";
export * from "./treasury";
export * from "./reconciliation";
export * from "./audit-log";
export * from "./media";
export * from "./capabilities";
export * from "./salon";
export * from "./rbac";
export * from "./admin";
export * from "./platform";
export * from "./commercial";
export * from "./reminders";
export * from "./events";
export * from "./procurement";
export * from "./relations";
export * from "./subscriptions";
export * from "./notifications";
export * from "./maintenance";
export * from "./school";
export * from "./payment-gateway";
export * from "./property";

// ============================================================
// CANONICAL ARCHITECTURE — Phase 1 (2026-03)
// الجداول الكنونية الجديدة — لا تعدّل bookings أو services
// ============================================================
// FREEZE:
//   - bookings      → read-only. New writes → appointment_bookings / stay_bookings / etc.
//   - services      → frozen. No new offeringType. New items → catalog_items
//   - payments      → canonical. payment_transactions = gateway events only
export * from "./canonical-bookings";
export * from "./canonical-catalog";
