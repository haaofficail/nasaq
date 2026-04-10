import webPush from "web-push";
import { pool } from "@nasaq/db/client";
import { log } from "./logger";

// ============================================================
// WEB PUSH SERVICE — VAPID
// ENV:
//   VAPID_PUBLIC_KEY   — Generate with: web-push generate-vapid-keys
//   VAPID_PRIVATE_KEY  — Generate with: web-push generate-vapid-keys
//   VAPID_SUBJECT      — mailto:admin@tarmizos.com
// ============================================================

let _vapidConfigured = false;

function ensureVapid() {
  if (_vapidConfigured) return true;
  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub  = process.env.VAPID_SUBJECT ?? "mailto:admin@tarmizos.com";
  if (!pub || !priv) return false;
  webPush.setVapidDetails(sub, pub, priv);
  _vapidConfigured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

// ── Send push to all subscriptions for an org ────────────────
export async function sendPushToOrg(
  orgId: string,
  payload: { title: string; body: string; url?: string; icon?: string },
): Promise<number> {
  if (!ensureVapid()) {
    log.warn({ orgId }, "[push] VAPID not configured — skipping");
    return 0;
  }

  const { rows: subs } = await pool.query(
    `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE org_id = $1`,
    [orgId],
  );

  if (subs.length === 0) return 0;

  const data = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    url:   payload.url  ?? "/dashboard",
    icon:  payload.icon ?? "/icon-192.png",
  });

  let sent = 0;
  const staleEndpoints: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
          { TTL: 3600 },
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired — remove it
          staleEndpoints.push(sub.endpoint);
        } else {
          log.warn({ err, endpoint: sub.endpoint }, "[push] send failed");
        }
      }
    }),
  );

  // Cleanup expired subscriptions
  if (staleEndpoints.length > 0) {
    await pool.query(
      `DELETE FROM push_subscriptions WHERE endpoint = ANY($1)`,
      [staleEndpoints],
    ).catch(() => {});
  }

  log.info({ orgId, sent, stale: staleEndpoints.length }, "[push] sent");
  return sent;
}
