// ============================================================
// BOOKING OPS ENGINE — طبقة العمليات التشغيلية للحجوزات
//
// مبني فوق: booking_events + workflow-engine + messaging-engine
// لا يغيّر السلوك الحالي — additive فقط
//
// يحتوي:
//   - Timeline read model     (getBookingTimeline)
//   - SLA / Aging tracking    (getBookingSlaState)
//   - Automation hooks        (runPostTransitionAutomations)
//   - Operational alerts      (listOperationalAlerts)
//
// Source of truth للحوادث: booking_events table (bookingId-scoped)
// الـ audit_logs تبقى للتدقيق الإداري — لا نقرأها هنا
// ============================================================

import { db } from "@nasaq/db/client";
import { bookingEvents, bookings, bookingPipelineStages, users, bookingTimelineEvents, bookingRecords } from "@nasaq/db/schema";
import { and, eq, desc, asc, gte, sql, count, inArray } from "drizzle-orm";
import { log } from "./logger";
import type { WorkflowStage } from "./workflow-engine";

// ── Types ─────────────────────────────────────────────────────

/** حوادث التسلسل الزمني — مطابقة لـ eventType في booking_events + أنواع مضافة */
export type TimelineEventType =
  | "created"
  | "status_changed"
  | "status_blocked"
  | "forced_transition"
  | "warning_emitted"
  | "automation_triggered"
  | "payment_received"
  | "note_added"
  | "rescheduled"
  | "assigned"
  | "cancelled"
  | "refunded";

export interface TimelineEvent {
  id:           string;
  eventType:    TimelineEventType;
  fromStatus?:  string | null;
  toStatus?:    string | null;
  actorId?:     string | null;
  actorName?:   string | null;
  forced?:      boolean;
  reason?:      string | null;
  blockedBy?:   string | null;
  workflowMode?: string | null;
  configState?: string | null;
  notes?:       string | null;
  metadata?:    Record<string, unknown>;
  createdAt:    Date;
}

export interface BookingSlaState {
  bookingId:              string;
  currentStatus:          string;
  createdAt:              Date;
  /** متى دخل الحجز الحالة الحالية — مشتقة من آخر status_changed.toStatus = currentStatus، أو updatedAt */
  statusEnteredAt:        Date;
  totalAgeMs:             number;
  timeInCurrentStatusMs:  number;
  /** الحد الزمني لهذه الحالة بالمللي ثانية (من pipeline stage أو ثابت افتراضي) */
  stalenessThresholdMs:   number;
  isStale:                boolean;
  /** مصدر الحد الزمني */
  thresholdSource:        "pipeline_stage" | "default_constant" | "no_threshold";
}

export type AlertSeverity = "low" | "medium" | "high";
export type AlertType     = "stale_booking" | "repeated_forced_transitions" | "recently_blocked";

export interface OperationalAlert {
  bookingId:      string;
  bookingNumber?: string | null;
  alertType:      AlertType;
  severity:       AlertSeverity;
  message:        string;
  metadata:       Record<string, unknown>;
  detectedAt:     Date;
}

// ── SLA Constants ─────────────────────────────────────────────
//
// مدة بالساعات قبل اعتبار الحجز stale في كل حالة.
// يمكن تجاوزها من pipeline_stage.maxDurationHours.
// الحالات النهائية لا تُحسب stale.

export const DEFAULT_SLA_HOURS: Record<string, number> = {
  pending:          24,   // يوم للتأكيد
  confirmed:        72,   // 3 أيام للانتقال للتجهيز
  deposit_paid:     48,
  fully_confirmed:  48,
  preparing:        12,
  in_progress:       8,
  // completed, reviewed, cancelled, no_show → لا حد زمني
};

// الحالات التي لا يُطبّق عليها SLA stale check
const SLA_EXEMPT_STATUSES = new Set(["completed", "reviewed", "cancelled", "no_show"]);

// ── statusEnteredAt Resolution ────────────────────────────────

/**
 * Pure helper — source of truth لتحديد متى دخل الحجز حالته الحالية.
 *
 * يبحث في قائمة أحداث معطاة عن:
 *   آخر status_changed event حيث toStatus = currentStatus
 *
 * Fallback chain صريح (يُطبّقه الـ caller):
 *   1. نتيجة هذه الدالة (أدق قيمة)
 *   2. booking.updatedAt (approximation — قد يتأثر بتغييرات أخرى)
 *   3. booking.createdAt (last resort)
 *
 * لا تجلب من DB — قابلة للاختبار بالكامل.
 */
export function resolveStatusEnteredAt(
  events: ReadonlyArray<{ eventType: string; toStatus?: string | null; createdAt: Date }>,
  currentStatus: string,
): Date | null {
  let latest: Date | null = null;
  for (const ev of events) {
    if (ev.eventType === "status_changed" && ev.toStatus === currentStatus) {
      if (latest === null || ev.createdAt.getTime() > latest.getTime()) {
        latest = ev.createdAt;
      }
    }
  }
  return latest;
}

/**
 * Batch DB query — يجلب statusEnteredAt لمجموعة حجوزات في استعلام واحد.
 *
 * المنطق: لكل booking_id، آخر status_changed event حيث to_status = current booking.status.
 * مصدر واحد للحقيقة مطابق لـ resolveStatusEnteredAt — الفرق أنه مجمّع لتجنب N+1.
 *
 * يُرجع Map<bookingId → statusEnteredAt>.
 * Bookings غير موجودة في النتيجة = لا history = caller يطبّق fallback.
 */
async function fetchStatusEnteredAtBatch(
  orgId:      string,
  bookingIds: string[],
): Promise<Map<string, Date>> {
  if (bookingIds.length === 0) return new Map();

  // TODO Phase 3.B: consolidate once writes also go to booking_timeline_events
  // JOIN على bookingRecords للتأكد من to_status = current status في نفس الاستعلام
  const rows = await db
    .select({
      bookingId:      bookingTimelineEvents.bookingRecordId,
      statusEnteredAt: sql<string>`MAX(${bookingTimelineEvents.createdAt})`.as("status_entered_at"),
    })
    .from(bookingTimelineEvents)
    .innerJoin(bookingRecords, and(
      eq(bookingTimelineEvents.bookingRecordId, bookingRecords.id),
      eq(bookingRecords.orgId, orgId),
      sql`${bookingTimelineEvents.toStatus} = ${bookingRecords.status}`,
    ))
    .where(and(
      eq(bookingTimelineEvents.orgId, orgId),
      eq(bookingTimelineEvents.eventType, "status_changed"),
      inArray(bookingTimelineEvents.bookingRecordId, bookingIds),
    ))
    .groupBy(bookingTimelineEvents.bookingRecordId);

  return new Map(
    rows.map((r) => [r.bookingId, new Date(r.statusEnteredAt)]),
  );
}

// ── Timeline ─────────────────────────────────────────────────

/**
 * يُرجع التسلسل الزمني التشغيلي لحجز معين من booking_events.
 * محكوم بـ orgId — لا يسرّب أحداث منظمة أخرى.
 * مرتّب من الأقدم إلى الأحدث (أقدم أولاً).
 */
export async function getBookingTimeline(
  bookingId: string,
  orgId:     string,
): Promise<TimelineEvent[]> {
  const rows = await db
    .select({
      id:         bookingEvents.id,
      eventType:  bookingEvents.eventType,
      fromStatus: bookingEvents.fromStatus,
      toStatus:   bookingEvents.toStatus,
      metadata:   bookingEvents.metadata,
      notes:      bookingEvents.notes,
      userId:     bookingEvents.userId,
      actorName:  users.name,
      createdAt:  bookingEvents.createdAt,
    })
    .from(bookingEvents)
    .leftJoin(users, eq(bookingEvents.userId, users.id))
    .where(and(
      eq(bookingEvents.bookingId, bookingId),
      eq(bookingEvents.orgId, orgId),
    ))
    .orderBy(asc(bookingEvents.createdAt));

  return rows.map((r) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    return {
      id:          r.id,
      eventType:   r.eventType as TimelineEventType,
      fromStatus:  r.fromStatus,
      toStatus:    r.toStatus,
      actorId:     r.userId ?? null,
      actorName:   r.actorName ?? null,
      forced:      (meta.forced as boolean | undefined) ?? false,
      reason:      (meta.reason as string | undefined) ?? null,
      blockedBy:   (meta.blockedBy as string | undefined) ?? null,
      workflowMode: (meta.workflowMode as string | undefined) ?? null,
      configState: (meta.configState as string | undefined) ?? null,
      notes:       r.notes,
      metadata:    meta,
      createdAt:   r.createdAt,
    };
  });
}

// ── SLA ──────────────────────────────────────────────────────

/**
 * يحسب حالة SLA لحجز معين.
 * Pure function — قابلة للاختبار بالكامل عبر تمرير `now`.
 *
 * ترتيب مصدر الحد الزمني:
 *   1. pipeline stage.maxDurationHours للحالة الحالية
 *   2. DEFAULT_SLA_HOURS للحالة الحالية
 *   3. no_threshold (الحالات النهائية والمعفاة)
 *
 * statusEnteredAt: آخر status_changed.toStatus = currentStatus في الأحداث،
 *   أو updatedAt الحجز كـ approximation.
 */
export function getBookingSlaState(params: {
  bookingId:        string;
  currentStatus:    string;
  createdAt:        Date;
  updatedAt:        Date;
  stages:           WorkflowStage[];
  /** أحدث وقت دخل فيه الحجز الحالة الحالية — من timeline إن كان متاحاً */
  statusEnteredAt?: Date | null;
  /** للاختبار فقط — افتراضياً new Date() */
  now?:             Date;
}): BookingSlaState {
  const now            = params.now ?? new Date();
  const statusEnteredAt = params.statusEnteredAt ?? params.updatedAt;
  const totalAgeMs     = now.getTime() - params.createdAt.getTime();
  const timeInStatusMs = now.getTime() - statusEnteredAt.getTime();

  // الحالات النهائية لا تُحسب stale
  if (SLA_EXEMPT_STATUSES.has(params.currentStatus)) {
    return {
      bookingId:             params.bookingId,
      currentStatus:         params.currentStatus,
      createdAt:             params.createdAt,
      statusEnteredAt,
      totalAgeMs,
      timeInCurrentStatusMs: timeInStatusMs,
      stalenessThresholdMs:  0,
      isStale:               false,
      thresholdSource:       "no_threshold",
    };
  }

  // ابحث عن pipeline stage لهذه الحالة
  const stage = params.stages.find((s) => s.mappedStatus === params.currentStatus);
  const stageDurationHours = (stage as any)?.maxDurationHours as number | undefined | null;

  let thresholdMs:  number;
  let thresholdSource: BookingSlaState["thresholdSource"];

  if (stageDurationHours != null && stageDurationHours > 0) {
    thresholdMs    = stageDurationHours * 60 * 60 * 1000;
    thresholdSource = "pipeline_stage";
  } else if (DEFAULT_SLA_HOURS[params.currentStatus] != null) {
    thresholdMs    = DEFAULT_SLA_HOURS[params.currentStatus] * 60 * 60 * 1000;
    thresholdSource = "default_constant";
  } else {
    // لا حد زمني معروف
    return {
      bookingId:             params.bookingId,
      currentStatus:         params.currentStatus,
      createdAt:             params.createdAt,
      statusEnteredAt,
      totalAgeMs,
      timeInCurrentStatusMs: timeInStatusMs,
      stalenessThresholdMs:  0,
      isStale:               false,
      thresholdSource:       "no_threshold",
    };
  }

  return {
    bookingId:             params.bookingId,
    currentStatus:         params.currentStatus,
    createdAt:             params.createdAt,
    statusEnteredAt,
    totalAgeMs,
    timeInCurrentStatusMs: timeInStatusMs,
    stalenessThresholdMs:  thresholdMs,
    isStale:               timeInStatusMs > thresholdMs,
    thresholdSource,
  };
}

// ── Automation Engine ─────────────────────────────────────────
//
// طبقة automation بسيطة وآمنة — fire-and-forget، لا ترمي exceptions.
// تُسجّل automation_triggered event في booking_events للـ timeline.
//
// TODO: ربط automation_triggered بـ messaging-engine.ts عند تفعيل الإشعارات المتقدمة.
// TODO: إضافة circuit-breaker لمنع حلقات automation لو تشعّبت القواعد.

/** الانتقالات التي تُطلق automation event */
const AUTOMATION_TRIGGER_STATUSES = new Set([
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

/**
 * يُشغّل automation hooks بعد انتقال ناجح — fire-and-forget.
 * لا يؤثر على response المستخدم إطلاقاً.
 */
export function runPostTransitionAutomations(params: {
  orgId:         string;
  bookingId:     string;
  userId:        string | null;
  fromStatus:    string;
  toStatus:      string;
  forced:        boolean;
  workflowMode:  string;
  configState:   string;
}): void {
  // fire-and-forget — لا await
  (async () => {
    try {
      if (!AUTOMATION_TRIGGER_STATUSES.has(params.toStatus)) return;

      await db.insert(bookingEvents).values({
        orgId:      params.orgId,
        bookingId:  params.bookingId,
        userId:     params.userId ?? null,
        eventType:  "automation_triggered",
        fromStatus: params.fromStatus,
        toStatus:   params.toStatus,
        metadata: {
          trigger:      `status_entered_${params.toStatus}`,
          forced:       params.forced,
          workflowMode: params.workflowMode,
          configState:  params.configState,
          // TODO: add notificationSent, integrationsFired when wired
        },
      });

      log.info(
        { orgId: params.orgId, bookingId: params.bookingId, toStatus: params.toStatus },
        "[ops-engine] automation_triggered event logged",
      );
    } catch (err) {
      // automation failure never surfaces to user
      log.error({ err, bookingId: params.bookingId }, "[ops-engine] automation hook failed silently");
    }
  })();
}

/**
 * يُسجّل blocked transition event — يُستدعى بعد إرجاع 422.
 * خارج transaction (التي انفجرت) — fire-and-forget.
 */
export function recordBlockedTransitionEvent(params: {
  orgId:         string;
  bookingId:     string;
  userId:        string | null;
  fromStatus:    string;
  attemptedStatus: string;
  reason:        string;
  blockedBy?:    string | null;
  requiresForce: boolean;
  workflowMode:  string;
}): void {
  db.insert(bookingEvents).values({
    orgId:      params.orgId,
    bookingId:  params.bookingId,
    userId:     params.userId ?? null,
    eventType:  "status_blocked",
    fromStatus: params.fromStatus,
    toStatus:   params.attemptedStatus,
    metadata: {
      blockReason:   params.reason,
      blockedBy:     params.blockedBy ?? null,
      requiresForce: params.requiresForce,
      workflowMode:  params.workflowMode,
    },
  }).catch((err) => {
    log.error({ err, bookingId: params.bookingId }, "[ops-engine] status_blocked event insert failed");
  });
}

// ── Operational Alerts ────────────────────────────────────────
//
// يُشتق الـ alerts من ثلاثة مصادر:
//   1. stale_booking      — bookings في حالة نشطة تجاوزت عتبة SLA
//   2. recently_blocked   — booking_events.eventType = 'status_blocked' خلال 48 ساعة
//   3. repeated_forced    — booking_events.eventType = 'forced_transition' مكرر خلال 7 أيام

/**
 * يُرجع قائمة التنبيهات التشغيلية للمنشأة.
 * محكوم بـ orgId — لا يسرّب بيانات منظمات أخرى.
 */
export async function listOperationalAlerts(
  orgId:   string,
  limit = 50,
): Promise<OperationalAlert[]> {
  const alerts: OperationalAlert[] = [];
  const now = new Date();

  // ── 1. Recently blocked transitions (last 48h) ──
  // TODO Phase 3.B: consolidate once writes also go to booking_timeline_events
  const blockedCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const blocked = await db
    .select({
      bookingId:    bookingTimelineEvents.bookingRecordId,
      bookingNumber: bookingRecords.bookingNumber,
      metadata:     bookingTimelineEvents.metadata,
      createdAt:    bookingTimelineEvents.createdAt,
    })
    .from(bookingTimelineEvents)
    .leftJoin(bookingRecords, and(
      eq(bookingTimelineEvents.bookingRecordId, bookingRecords.id),
      eq(bookingRecords.orgId, orgId),
    ))
    .where(and(
      eq(bookingTimelineEvents.orgId, orgId),
      eq(bookingTimelineEvents.eventType, "status_blocked"),
      gte(bookingTimelineEvents.createdAt, blockedCutoff),
    ))
    .orderBy(desc(bookingTimelineEvents.createdAt))
    .limit(limit);

  for (const row of blocked) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    alerts.push({
      bookingId:    row.bookingId,
      bookingNumber: row.bookingNumber ?? null,
      alertType:   "recently_blocked",
      severity:    "medium",
      message:     `حجز محظور من الانتقال: ${meta.blockReason ?? "خطأ في الـ workflow"}`,
      metadata:    meta,
      detectedAt:  row.createdAt,
    });
  }

  // ── 2. Repeated forced transitions (last 7 days, ≥2 times per booking) ──
  const forcedCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const forcedRows = await db
    .select({
      bookingId:    bookingTimelineEvents.bookingRecordId,
      bookingNumber: bookingRecords.bookingNumber,
      forceCount:   count(bookingTimelineEvents.id).as("force_count"),
    })
    .from(bookingTimelineEvents)
    .leftJoin(bookingRecords, and(
      eq(bookingTimelineEvents.bookingRecordId, bookingRecords.id),
      eq(bookingRecords.orgId, orgId),
    ))
    .where(and(
      eq(bookingTimelineEvents.orgId, orgId),
      eq(bookingTimelineEvents.eventType, "forced_transition"),
      gte(bookingTimelineEvents.createdAt, forcedCutoff),
    ))
    .groupBy(bookingTimelineEvents.bookingRecordId, bookingRecords.bookingNumber)
    .having(sql`count(${bookingTimelineEvents.id}) >= 2`);

  for (const row of forcedRows) {
    alerts.push({
      bookingId:    row.bookingId,
      bookingNumber: row.bookingNumber ?? null,
      alertType:   "repeated_forced_transitions",
      severity:    "high",
      message:     `حجز مُعاد تجاوز قواعده ${row.forceCount} مرة خلال 7 أيام`,
      metadata:    { forceCount: row.forceCount },
      detectedAt:  now,
    });
  }

  // ── 3. Stale bookings ──
  // استعلام على الحجوزات النشطة (غير النهائية) للمنظمة
  const activeBookings = await db
    .select({
      id:            bookingRecords.id,
      bookingNumber: bookingRecords.bookingNumber,
      status:        bookingRecords.status,
      createdAt:     bookingRecords.createdAt,
      updatedAt:     bookingRecords.updatedAt,
    })
    .from(bookingRecords)
    .where(and(
      eq(bookingRecords.orgId, orgId),
      sql`${bookingRecords.status} NOT IN ('completed','reviewed','cancelled','no_show')`,
    ))
    .orderBy(asc(bookingRecords.updatedAt))
    .limit(limit);

  if (activeBookings.length > 0) {
    // استعلام مراحل الـ pipeline مرة واحدة فقط
    const stages = await db
      .select({
        id:               bookingPipelineStages.id,
        name:             bookingPipelineStages.name,
        sortOrder:        bookingPipelineStages.sortOrder,
        mappedStatus:     bookingPipelineStages.mappedStatus,
        isSkippable:      bookingPipelineStages.isSkippable,
        isTerminal:       bookingPipelineStages.isTerminal,
        autoTransitionCondition: bookingPipelineStages.autoTransitionCondition,
        notificationTemplate:    bookingPipelineStages.notificationTemplate,
        maxDurationHours: (bookingPipelineStages as any).maxDurationHours,
      })
      .from(bookingPipelineStages)
      .where(eq(bookingPipelineStages.orgId, orgId));

    // Batch query: statusEnteredAt الحقيقي لكل حجز نشط في استعلام واحد
    // يعتمد على آخر status_changed.toStatus = current booking.status
    // Fallback صريح: إذا لا history → updatedAt → createdAt (يُطبّق أدناه)
    const statusEnteredAtMap = await fetchStatusEnteredAtBatch(
      orgId,
      activeBookings.map((b) => b.id),
    );

    for (const booking of activeBookings) {
      // Fallback chain صريح:
      //   1. من booking_events (status_changed مطابق) — الأدق
      //   2. booking.updatedAt — approximation عند غياب history
      //   3. booking.createdAt — last resort
      const statusEnteredAt =
        statusEnteredAtMap.get(booking.id) ??
        booking.updatedAt ??
        booking.createdAt;

      const sla = getBookingSlaState({
        bookingId:      booking.id,
        currentStatus:  booking.status,
        createdAt:      booking.createdAt,
        updatedAt:      booking.updatedAt,
        stages:         stages as any,
        statusEnteredAt,
      });

      if (sla.isStale) {
        const overMs    = sla.timeInCurrentStatusMs - sla.stalenessThresholdMs;
        const overHours = Math.round(overMs / (60 * 60 * 1000));
        alerts.push({
          bookingId:     booking.id,
          bookingNumber: booking.bookingNumber ?? null,
          alertType:    "stale_booking",
          severity:     overHours > 24 ? "high" : "medium",
          message:      `الحجز في حالة "${booking.status}" منذ ${overHours} ساعة إضافية عن الحد`,
          metadata: {
            currentStatus:       booking.status,
            thresholdSource:     sla.thresholdSource,
            overByMs:            overMs,
            overByHours:         overHours,
            // يُظهر هل statusEnteredAt مشتق من history أم fallback
            statusEnteredAtSource: statusEnteredAtMap.has(booking.id) ? "history" : "fallback_updatedAt",
          },
          detectedAt: now,
        });
      }
    }
  }

  // رتّب: high أولاً ثم medium ثم low، ثم الأحدث
  alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    if (diff !== 0) return diff;
    return b.detectedAt.getTime() - a.detectedAt.getTime();
  });

  return alerts;
}
