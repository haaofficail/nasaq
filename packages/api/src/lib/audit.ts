import { db } from "@nasaq/db/client";
import { auditLogs } from "@nasaq/db/schema";

type AuditParams = {
  orgId: string;
  userId?: string | null;
  action: string;        // created | updated | deleted | approved | rejected | payment_recorded
  resource: string;      // booking | payment | customer | service ...
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
  userAgent?: string;
};

// Fire-and-forget — never throws, never blocks the response
export function insertAuditLog(params: AuditParams): void {
  db.insert(auditLogs).values({
    orgId: params.orgId,
    userId: params.userId ?? null,
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId ?? null,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
  }).catch((err) => {
    // Log but never surface to the caller
    import("./logger").then(({ log }) => log.error({ err }, "audit log insert failed"));
  });
}
