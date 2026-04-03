// ============================================================
// Smart Guardian — Scanner
// الفحص الدوري الشامل للنظام
// ============================================================

import { pool } from "@nasaq/db/client";
import { log } from "../logger";
import { reportIssue, recordFix } from "./engine";

interface ScanCheckResult {
  check:       string;
  issuesFound: number;
  autoFixed:   number;
}

/**
 * تشغيل الفحص الشامل — يُنادى من الجدولة كل 6 ساعات
 */
export async function runGuardianScan(type: "scheduled" | "manual" = "scheduled"): Promise<void> {
  const t0 = Date.now();
  let scanId: string | null = null;

  try {
    // إنشاء سجل الفحص
    const scanRes = await pool.query<{ id: string }>(
      `INSERT INTO guardian_scans (type, status) VALUES ($1, 'running') RETURNING id`,
      [type],
    );
    scanId = scanRes.rows[0].id;

    const results: ScanCheckResult[] = [];
    let totalIssues = 0;
    let totalFixed  = 0;
    let critCount   = 0;
    let highCount   = 0;
    let medCount    = 0;
    let lowCount    = 0;

    // ── CHECK 1: أصناف بدون سعر ──────────────────────────
    const noPrice = await pool.query<{ org_id: string; id: string; name: string }>(
      `SELECT org_id, id, name FROM menu_items
       WHERE is_active = true AND (price IS NULL OR price = 0)
       LIMIT 100`,
    );
    for (const item of noPrice.rows) {
      await reportIssue({
        code: "MENU-001",
        tenantId: item.org_id,
        contextKey: item.id,
        technicalDetail: `صنف: ${item.name} (${item.id})`,
        affectedCount: 1,
      });
    }
    const r1 = { check: "MENU-001 (أصناف بدون سعر)", issuesFound: noPrice.rows.length, autoFixed: 0 };
    results.push(r1);
    totalIssues += noPrice.rows.length;
    highCount   += noPrice.rows.length;

    // ── CHECK 2: تصنيفات بدون أصناف نشطة ────────────────
    const emptyCats = await pool.query<{ org_id: string; id: string; name: string }>(
      `SELECT mc.org_id, mc.id, mc.name
       FROM menu_categories mc
       WHERE mc.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM menu_items mi
           WHERE mi.category_id = mc.id AND mi.is_active = true
         )
       LIMIT 50`,
    );
    for (const cat of emptyCats.rows) {
      await reportIssue({
        code: "MENU-003",
        tenantId: cat.org_id,
        contextKey: cat.id,
        technicalDetail: `تصنيف: ${cat.name} (${cat.id})`,
      });
    }
    results.push({ check: "MENU-003 (تصنيفات فارغة)", issuesFound: emptyCats.rows.length, autoFixed: 0 });
    totalIssues += emptyCats.rows.length;
    lowCount    += emptyCats.rows.length;

    // ── CHECK 3: حجوزات عالقة > 24 ساعة ─────────────────
    const stuckBookings = await pool.query<{ org_id: string; id: string }>(
      `SELECT org_id, id FROM bookings
       WHERE status = 'pending'
         AND created_at < NOW() - INTERVAL '24 hours'
       LIMIT 100`,
    );
    let autoFixedBookings = 0;
    for (const booking of stuckBookings.rows) {
      const result = await reportIssue({
        code: "BOOK-001",
        tenantId: booking.org_id,
        contextKey: booking.id,
        technicalDetail: `حجز: ${booking.id}`,
      });
      if (result?.isNew) {
        // إصلاح تلقائي: إلغاء الحجز العالق
        try {
          await pool.query(
            `UPDATE bookings SET status = 'cancelled', updated_at = NOW()
             WHERE id = $1 AND status = 'pending'`,
            [booking.id],
          );
          if (result.issueId) {
            await recordFix({
              issueId: result.issueId,
              action: "cancel_stuck_booking",
              descriptionAr: "تم إلغاء الحجز العالق تلقائياً بعد 24 ساعة",
              recordsAffected: 1,
              success: true,
            });
            autoFixedBookings++;
          }
        } catch (fixErr) {
          log.warn({ fixErr, bookingId: booking.id }, "[guardian] auto-fix BOOK-001 failed");
        }
      }
    }
    results.push({ check: "BOOK-001 (حجوزات عالقة)", issuesFound: stuckBookings.rows.length, autoFixed: autoFixedBookings });
    totalIssues += stuckBookings.rows.length;
    totalFixed  += autoFixedBookings;
    highCount   += stuckBookings.rows.length;

    // ── CHECK 4: حجوزات مؤكدة في تاريخ ماضٍ ─────────────
    const pastConfirmed = await pool.query<{ org_id: string; id: string }>(
      `SELECT org_id, id FROM bookings
       WHERE status = 'confirmed'
         AND scheduled_at < NOW() - INTERVAL '1 hour'
       LIMIT 100`,
    ).catch(() => ({ rows: [] as { org_id: string; id: string }[] }));

    for (const booking of pastConfirmed.rows) {
      await reportIssue({
        code: "BOOK-002",
        tenantId: booking.org_id,
        contextKey: booking.id,
        technicalDetail: `حجز: ${booking.id}`,
      });
    }
    results.push({ check: "BOOK-002 (حجوزات ماضية غير مغلقة)", issuesFound: pastConfirmed.rows.length, autoFixed: 0 });
    totalIssues += pastConfirmed.rows.length;
    medCount    += pastConfirmed.rows.length;

    // ── CHECK 5: دفعات عالقة > 1 ساعة ────────────────────
    const stuckPayments = await pool.query<{ org_id: string; id: string }>(
      `SELECT org_id, id FROM invoice_payments
       WHERE status = 'pending'
         AND created_at < NOW() - INTERVAL '1 hour'
       LIMIT 50`,
    ).catch(() => ({ rows: [] as { org_id: string; id: string }[] }));

    for (const pay of stuckPayments.rows) {
      await reportIssue({
        code: "PAY-001",
        tenantId: pay.org_id,
        contextKey: pay.id,
        technicalDetail: `دفعة: ${pay.id}`,
      });
    }
    results.push({ check: "PAY-001 (دفعات عالقة)", issuesFound: stuckPayments.rows.length, autoFixed: 0 });
    totalIssues += stuckPayments.rows.length;
    critCount   += stuckPayments.rows.length;

    // ── CHECK 6: منشآت بدون مالك نشط ─────────────────────
    const noOwner = await pool.query<{ id: string }>(
      `SELECT o.id FROM organizations o
       WHERE o.subscription_status IN ('active','trialing')
         AND NOT EXISTS (
           SELECT 1 FROM users u
           WHERE u.org_id = o.id
             AND u.role = 'owner'
             AND u.status = 'active'
         )
       LIMIT 50`,
    );
    for (const org of noOwner.rows) {
      await reportIssue({ code: "TENANT-001", tenantId: org.id, contextKey: org.id });
    }
    results.push({ check: "TENANT-001 (منشآت بدون مالك)", issuesFound: noOwner.rows.length, autoFixed: 0 });
    totalIssues += noOwner.rows.length;
    highCount   += noOwner.rows.length;

    // ── CHECK 7: أداء قاعدة البيانات ──────────────────────
    const t0db = Date.now();
    await pool.query("SELECT 1");
    const dbLatencyMs = Date.now() - t0db;
    if (dbLatencyMs > 500) {
      await reportIssue({
        code: "SYS-001",
        contextKey: "db_latency",
        technicalDetail: `زمن الاستجابة: ${dbLatencyMs}ms`,
      });
      results.push({ check: "SYS-001 (استجابة DB)", issuesFound: 1, autoFixed: 0 });
      totalIssues++;
      highCount++;
    } else {
      results.push({ check: "SYS-001 (استجابة DB)", issuesFound: 0, autoFixed: 0 });
    }

    // ── CHECK 8: ذاكرة Node.js ────────────────────────────
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapPct = heapTotalMB > 0 ? (heapUsedMB / heapTotalMB) * 100 : 0;
    if (heapPct > 80) {
      await reportIssue({
        code: "SYS-002",
        contextKey: "heap_usage",
        technicalDetail: `الذاكرة المستخدمة: ${heapUsedMB}MB / ${heapTotalMB}MB (${Math.round(heapPct)}%)`,
      });
      results.push({ check: "SYS-002 (ذاكرة مرتفعة)", issuesFound: 1, autoFixed: 0 });
      totalIssues++;
      highCount++;
    } else {
      results.push({ check: "SYS-002 (ذاكرة مرتفعة)", issuesFound: 0, autoFixed: 0 });
    }

    // تحديث سجل الفحص
    const durationMs = Date.now() - t0;
    await pool.query(
      `UPDATE guardian_scans
       SET completed_at = NOW(), duration_ms = $1,
           total_checks = $2, issues_found = $3, auto_fixed = $4,
           critical_count = $5, high_count = $6, medium_count = $7, low_count = $8,
           results = $9, status = 'completed'
       WHERE id = $10`,
      [
        durationMs,
        results.length,
        totalIssues,
        totalFixed,
        critCount,
        highCount,
        medCount,
        lowCount,
        JSON.stringify(results),
        scanId,
      ],
    );

    log.info(
      { scanId, durationMs, totalIssues, totalFixed, critCount, highCount },
      "[guardian] scan completed",
    );
  } catch (err) {
    log.error({ err, scanId }, "[guardian] scan failed");
    if (scanId) {
      await pool.query(
        `UPDATE guardian_scans SET status = 'failed', completed_at = NOW() WHERE id = $1`,
        [scanId],
      ).catch(() => {});
    }
  }
}
