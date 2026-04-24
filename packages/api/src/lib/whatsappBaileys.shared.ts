import path from "path";

export type WaStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

export const WA_QUEUE_NAMES = {
  INIT: "wa-init-session",
  SEND_TEXT: "wa-send-text",
  SEND_IMAGE: "wa-send-image",
  LOGOUT: "wa-logout",
} as const;

export const WA_SESSIONS_DIR = process.env.WA_SESSIONS_DIR ?? "/var/www/nasaq/whatsapp-sessions";
export const WA_BOSS_DATABASE_URL = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
export const WA_PLATFORM_STATE_TARGET_ID = "platform-whatsapp-state";

export function resolveWaSessionDir(orgId: string): string {
  const baseDir = path.resolve(WA_SESSIONS_DIR);
  const resolved = path.resolve(baseDir, orgId);
  if (!resolved.startsWith(`${baseDir}${path.sep}`)) {
    throw new Error("Invalid WhatsApp session id");
  }
  return resolved;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
