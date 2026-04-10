import { log } from "./logger";
import { db } from "@nasaq/db/client";
import { salonMonitoringEvents } from "@nasaq/db/schema";

// ============================================================
// SALON STRUCTURED LOGGER
// Events: booking_created | booking_conflict_rejected |
//         booking_completed | booking_cancelled |
//         inventory_deducted | inventory_low_stock_warning |
//         api_error | db_error
// ============================================================

export type SalonEventType =
  | "booking_created"
  | "booking_conflict_rejected"
  | "booking_failed"
  | "booking_completed"
  | "booking_cancelled"
  | "inventory_deducted"
  | "inventory_low_stock_warning"
  | "inventory_recipe_missing"
  | "api_error"
  | "db_error";

export interface SalonLogContext {
  requestId?: string;
  orgId: string;
  bookingId?: string;
  customerId?: string;
  serviceId?: string;
  assignedUserId?: string;
  metadata?: Record<string, unknown>;
}

type Severity = "info" | "warn" | "error";

const SEVERITY_MAP: Record<SalonEventType, Severity> = {
  booking_created:               "info",
  booking_conflict_rejected:     "warn",
  booking_failed:                "error",
  booking_completed:             "info",
  booking_cancelled:             "warn",
  inventory_deducted:            "info",
  inventory_low_stock_warning:   "warn",
  inventory_recipe_missing:      "warn",
  api_error:                     "error",
  db_error:                      "error",
};

// Persisted events — stored in DB for queryable summary
const PERSISTED_EVENTS = new Set<SalonEventType>([
  "booking_conflict_rejected",
  "booking_failed",
  "inventory_low_stock_warning",
  "inventory_recipe_missing",
  "db_error",
]);

function emit(eventType: SalonEventType, message: string, ctx: SalonLogContext) {
  const severity = SEVERITY_MAP[eventType];
  const entry = {
    event:         eventType,
    severity,
    message,
    timestamp:     new Date().toISOString(),
    requestId:     ctx.requestId,
    orgId:         ctx.orgId,
    bookingId:     ctx.bookingId,
    customerId:    ctx.customerId,
    serviceId:     ctx.serviceId,
    assignedUserId: ctx.assignedUserId,
    ...ctx.metadata,
  };

  if (severity === "error") log.error(entry, `[salon] ${eventType}`);
  else if (severity === "warn") log.warn(entry, `[salon] ${eventType}`);
  else log.info(entry, `[salon] ${eventType}`);

  // Persist events that need to be queryable for summary
  if (PERSISTED_EVENTS.has(eventType)) {
    db.insert(salonMonitoringEvents).values({
      orgId:     ctx.orgId,
      eventType,
      bookingId: ctx.bookingId ?? null,
      metadata: {
        requestId:     ctx.requestId,
        customerId:    ctx.customerId,
        serviceId:     ctx.serviceId,
        assignedUserId: ctx.assignedUserId,
        message,
        ...ctx.metadata,
      },
    }).catch(() => {}); // fire-and-forget — never block the request
  }
}

// ── Named event helpers ──────────────────────────────────────

// All helpers use ctx.metadata for extra fields — no extra required top-level keys
// This keeps call sites simple: just pass metadata: { ... }

export const salonLog = {
  bookingCreated(ctx: SalonLogContext) {
    emit("booking_created", `حجز جديد ${ctx.metadata?.bookingNumber ?? ""}`, ctx);
  },

  bookingConflictRejected(ctx: SalonLogContext) {
    emit("booking_conflict_rejected", `رُفض الحجز — تعارض ${ctx.metadata?.conflictType ?? ""}`, ctx);
  },

  bookingFailed(ctx: SalonLogContext) {
    emit("booking_failed", `فشل إنشاء الحجز: ${ctx.metadata?.reason ?? ""}`, ctx);
  },

  bookingCompleted(ctx: SalonLogContext) {
    emit("booking_completed", `اكتمل الحجز ${ctx.bookingId?.slice(0, 8) ?? ""}`, ctx);
  },

  bookingCancelled(ctx: SalonLogContext) {
    emit("booking_cancelled", `أُلغي الحجز ${ctx.bookingId?.slice(0, 8) ?? ""}`, ctx);
  },

  inventoryDeducted(ctx: SalonLogContext) {
    emit("inventory_deducted", `خُصم مخزون (${ctx.metadata?.qty ?? ""})`, ctx);
  },

  inventoryLowStock(ctx: SalonLogContext) {
    emit("inventory_low_stock_warning", `مخزون غير كافٍ — متاح ${ctx.metadata?.available} والمطلوب ${ctx.metadata?.needed}`, ctx);
  },

  inventoryRecipeMissing(ctx: SalonLogContext) {
    emit("inventory_recipe_missing", `وصفة مخزون ناقصة للخدمة ${ctx.serviceId ?? ""}`, ctx);
  },

  apiError(ctx: SalonLogContext) {
    emit("api_error", `خطأ API ${ctx.metadata?.code} (${ctx.metadata?.statusCode})`, ctx);
  },

  dbError(ctx: SalonLogContext) {
    emit("db_error", `خطأ DB أثناء ${ctx.metadata?.operation}: ${ctx.metadata?.error}`, ctx);
  },
};
