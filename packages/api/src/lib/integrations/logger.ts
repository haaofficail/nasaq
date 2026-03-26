import { pool } from "@nasaq/db/client";

// ============================================================
// INTEGRATION LOGGER — تسجيل كل طلب وارد/صادر للتكاملات
// يجب ألا يرمي خطأ أبداً
// ============================================================

export async function logIntegration(params: {
  orgId: string;
  integrationId?: string;
  direction: "inbound" | "outbound";
  endpoint?: string;
  method?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  statusCode?: number;
  durationMs?: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO integration_logs
        (org_id, integration_id, direction, endpoint, method, request_body, response_body, status_code, duration_ms, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        params.orgId,
        params.integrationId ?? null,
        params.direction,
        params.endpoint ?? null,
        params.method ?? null,
        params.requestBody != null ? JSON.stringify(params.requestBody) : null,
        params.responseBody != null ? JSON.stringify(params.responseBody) : null,
        params.statusCode ?? null,
        params.durationMs ?? null,
        params.errorMessage ?? null,
      ]
    );
  } catch {
    // Logging must never throw — silently discard
  }
}
