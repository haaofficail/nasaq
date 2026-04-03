// ============================================================
// Smart Guardian — Admin API
// واجهة برمجية للأدمن لعرض وإدارة المشاكل المكتشفة
// ============================================================

import { Hono } from "hono";
import { pool } from "@nasaq/db/client";
import { superAdminMiddleware } from "../middleware/auth";
import { runGuardianScan } from "../lib/guardian/scanner";

export const guardianRouter = new Hono();

// جميع نقاط guardian تتطلب super_admin
guardianRouter.use("*", superAdminMiddleware);

// ── GET /guardian/issues ─────────────────────────────────────
guardianRouter.get("/issues", async (c) => {
  const status   = c.req.query("status");
  const severity = c.req.query("severity");
  const module   = c.req.query("module");
  const tenantId = c.req.query("tenantId");
  const page     = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const limit    = Math.min(100, parseInt(c.req.query("limit") ?? "50"));
  const offset   = (page - 1) * limit;

  const conds: string[] = [];
  const params: unknown[] = [];
  let pi = 1;

  if (status)   { conds.push(`gi.status = $${pi++}`);   params.push(status); }
  if (severity) { conds.push(`gi.severity = $${pi++}`); params.push(severity); }
  if (module)   { conds.push(`gi.module = $${pi++}`);   params.push(module); }
  if (tenantId) { conds.push(`gi.tenant_id = $${pi++}`); params.push(tenantId); }

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const [rowsRes, countRes] = await Promise.all([
    pool.query(
      `SELECT gi.id, gi.code, gi.severity, gi.category, gi.title_ar, gi.description_ar,
              gi.module, gi.page, gi.status, gi.occurrences, gi.affected_count,
              gi.auto_fixable, gi.auto_fixed, gi.fix_description_ar, gi.fix_applied_at,
              gi.is_user_facing, gi.first_seen_at, gi.last_seen_at,
              gi.technical_detail, gi.tenant_id,
              o.name AS tenant_name
       FROM guardian_issues gi
       LEFT JOIN organizations o ON o.id = gi.tenant_id
       ${where}
       ORDER BY
         CASE gi.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         gi.last_seen_at DESC
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, limit, offset],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS n FROM guardian_issues gi ${where}`,
      params,
    ),
  ]);

  const total = countRes.rows[0]?.n ?? 0;

  return c.json({
    data: rowsRes.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ── GET /guardian/issues/stats ──────────────────────────────
guardianRouter.get("/issues/stats", async (c) => {
  const [bySeverity, byStatus, byModule, recent] = await Promise.all([
    pool.query(`SELECT severity, COUNT(*)::int AS n FROM guardian_issues GROUP BY severity`),
    pool.query(`SELECT status, COUNT(*)::int AS n FROM guardian_issues GROUP BY status`),
    pool.query(`SELECT module, COUNT(*)::int AS n FROM guardian_issues GROUP BY module ORDER BY n DESC`),
    pool.query(`SELECT COUNT(*)::int AS n FROM guardian_issues WHERE created_at > NOW() - INTERVAL '24 hours'`),
  ]);

  return c.json({
    data: {
      bySeverity: Object.fromEntries(bySeverity.rows.map((r: any) => [r.severity, r.n])),
      byStatus:   Object.fromEntries(byStatus.rows.map((r: any) => [r.status, r.n])),
      byModule:   byModule.rows,
      last24h:    recent.rows[0]?.n ?? 0,
    },
  });
});

// ── GET /guardian/issues/:id ─────────────────────────────────
guardianRouter.get("/issues/:id", async (c) => {
  const id = c.req.param("id");

  const [issueRes, fixesRes] = await Promise.all([
    pool.query(
      `SELECT gi.*, o.name AS tenant_name
       FROM guardian_issues gi
       LEFT JOIN organizations o ON o.id = gi.tenant_id
       WHERE gi.id = $1`,
      [id],
    ),
    pool.query(
      `SELECT * FROM guardian_fixes WHERE issue_id = $1 ORDER BY fixed_at DESC`,
      [id],
    ),
  ]);

  if (!issueRes.rows[0]) return c.json({ error: "not found" }, 404);

  return c.json({ data: { ...issueRes.rows[0], fixes: fixesRes.rows } });
});

// ── PATCH /guardian/issues/:id ──────────────────────────────
guardianRouter.patch("/issues/:id", async (c) => {
  const id   = c.req.param("id");
  const body = await c.req.json();
  const allowed = ["status", "resolution_note"] as const;

  const sets: string[] = [];
  const params: unknown[] = [];
  let pi = 1;

  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${key} = $${pi++}`);
      params.push(body[key]);
    }
  }

  if (sets.length === 0) return c.json({ error: "no fields to update" }, 400);

  if (body.status === "resolved") {
    sets.push(`resolved_at = NOW()`);
  }
  sets.push(`updated_at = NOW()`);
  params.push(id);

  await pool.query(
    `UPDATE guardian_issues SET ${sets.join(", ")} WHERE id = $${pi}`,
    params,
  );

  return c.json({ data: { id, updated: true } });
});

// ── GET /guardian/scans ──────────────────────────────────────
guardianRouter.get("/scans", async (c) => {
  const limit = Math.min(50, parseInt(c.req.query("limit") ?? "20"));

  const res = await pool.query(
    `SELECT id, type, started_at, completed_at, duration_ms,
            total_checks, issues_found, auto_fixed,
            critical_count, high_count, medium_count, low_count,
            status
     FROM guardian_scans
     ORDER BY started_at DESC
     LIMIT $1`,
    [limit],
  );

  return c.json({ data: res.rows });
});

// ── POST /guardian/scans/run ─────────────────────────────────
guardianRouter.post("/scans/run", async (c) => {
  // نشغل الفحص بشكل غير متزامن ونرد فوراً
  runGuardianScan("manual").catch((err) => {
    console.error("[guardian] manual scan error", err);
  });

  return c.json({ data: { message: "الفحص يعمل في الخلفية، راجع قائمة الفحوصات خلال لحظات" } });
});

// ── GET /guardian/scans/:id ──────────────────────────────────
guardianRouter.get("/scans/:id", async (c) => {
  const id = c.req.param("id");
  const res = await pool.query(
    `SELECT * FROM guardian_scans WHERE id = $1`,
    [id],
  );
  if (!res.rows[0]) return c.json({ error: "not found" }, 404);
  return c.json({ data: res.rows[0] });
});
