// ============================================================
// Smart Guardian — Engine
// محرك تسجيل وتجميع المشاكل
// ============================================================

import { createHash } from "crypto";
import { pool } from "@nasaq/db/client";
import { log } from "../logger";
import { getCatalogEntry } from "./issue-catalog";

export interface ReportIssueOptions {
  code:           string;               // e.g. "MENU-001"
  tenantId?:      string;
  userId?:        string;
  page?:          string;
  apiEndpoint?:   string;
  technicalDetail?: string;
  errorMessage?:  string;
  stackTrace?:    string;
  requestBody?:   Record<string, unknown>;
  requestParams?: Record<string, unknown>;
  affectedCount?: number;
  contextKey?:    string;               // extra string to make fingerprint unique within same code+tenant
}

export interface ReportIssueResult {
  issueId:    string;
  isNew:      boolean;
  occurrences: number;
  autoFixed:  boolean;
}

/**
 * رصد وتسجيل مشكلة في النظام.
 * إذا وجدت مشكلة مطابقة (نفس code+tenant+contextKey) يزيد العداد فقط.
 * إذا كانت auto-fixable يُطلق منطق الإصلاح المناسب.
 */
export async function reportIssue(opts: ReportIssueOptions): Promise<ReportIssueResult | null> {
  const def = getCatalogEntry(opts.code);
  if (!def) {
    log.warn({ code: opts.code }, "[guardian] unknown issue code — skipped");
    return null;
  }

  // حساب البصمة للتجميع
  const fpRaw = `${opts.code}:${opts.tenantId ?? "global"}:${opts.contextKey ?? ""}`;
  const fingerprint = createHash("md5").update(fpRaw).digest("hex");

  try {
    // هل هذه المشكلة موجودة ومفتوحة؟
    const existing = await pool.query<{ id: string; occurrences: number }>(
      `SELECT id, occurrences FROM guardian_issues
       WHERE fingerprint = $1 AND status IN ('open','investigating')
       LIMIT 1`,
      [fingerprint],
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      await pool.query(
        `UPDATE guardian_issues
         SET occurrences = occurrences + 1,
             last_seen_at = NOW(),
             affected_count = GREATEST(affected_count, $1),
             updated_at = NOW()
         WHERE id = $2`,
        [opts.affectedCount ?? 1, row.id],
      );
      return { issueId: row.id, isNew: false, occurrences: row.occurrences + 1, autoFixed: false };
    }

    // إنشاء مشكلة جديدة
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO guardian_issues (
        tenant_id, user_id, module, page, api_endpoint,
        code, severity, category, title_ar, description_ar,
        technical_detail, error_message, stack_trace, request_body, request_params,
        is_user_facing, affected_count, auto_fixable, fix_description_ar,
        fingerprint, status
       ) VALUES (
        $1,$2,$3,$4,$5, $6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15, $16,$17,$18,$19, $20,'open'
       ) RETURNING id`,
      [
        opts.tenantId ?? null,
        opts.userId ?? null,
        def.module,
        opts.page ?? null,
        opts.apiEndpoint ?? null,
        def.code,
        def.severity,
        def.category,
        def.titleAr,
        def.descriptionAr,
        opts.technicalDetail ?? null,
        opts.errorMessage ?? null,
        opts.stackTrace ?? null,
        opts.requestBody ? JSON.stringify(opts.requestBody) : null,
        opts.requestParams ? JSON.stringify(opts.requestParams) : null,
        def.isUserFacing,
        opts.affectedCount ?? 1,
        def.autoFixable,
        def.fixDescriptionAr ?? null,
        fingerprint,
      ],
    );

    const issueId = inserted.rows[0].id;

    log.info({ code: opts.code, issueId, tenantId: opts.tenantId }, "[guardian] new issue reported");

    return { issueId, isNew: true, occurrences: 1, autoFixed: false };
  } catch (err) {
    // لا نوقف التطبيق بسبب خطأ في Guardian
    log.error({ err, code: opts.code }, "[guardian] reportIssue failed silently");
    return null;
  }
}

/**
 * تسجيل إصلاح تلقائي لمشكلة
 */
export async function recordFix(opts: {
  issueId:         string;
  action:          string;
  descriptionAr:   string;
  beforeState?:    Record<string, unknown>;
  afterState?:     Record<string, unknown>;
  recordsAffected?: number;
  success:         boolean;
  errorIfFailed?:  string;
  fixedBy?:        string;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO guardian_fixes (
        issue_id, action, description_ar, before_state, after_state,
        records_affected, success, error_if_failed, fixed_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        opts.issueId,
        opts.action,
        opts.descriptionAr,
        opts.beforeState ? JSON.stringify(opts.beforeState) : null,
        opts.afterState  ? JSON.stringify(opts.afterState)  : null,
        opts.recordsAffected ?? 0,
        opts.success,
        opts.errorIfFailed ?? null,
        opts.fixedBy ?? "system",
      ],
    );

    if (opts.success) {
      await pool.query(
        `UPDATE guardian_issues
         SET auto_fixed = true, fix_applied_at = NOW(), status = 'resolved',
             resolved_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [opts.issueId],
      );
    }
  } catch (err) {
    log.error({ err, issueId: opts.issueId }, "[guardian] recordFix failed silently");
  }
}
