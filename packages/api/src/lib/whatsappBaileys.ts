// ============================================================
// WHATSAPP BAILEYS — QR-based WhatsApp connection per org
// Uses @whiskeysockets/baileys (multi-device, no browser)
// ============================================================

import _makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { log } from "./logger";

// CJS/ESM interop — Baileys default export may be module object or the function itself
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeWASocket = (
  typeof _makeWASocket === "function"
    ? _makeWASocket
    : (_makeWASocket as any).default ?? (_makeWASocket as any).makeWASocket
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) as (...args: any[]) => any;

export type WaStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

interface Session {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket:       any | null;
  status:       WaStatus;
  qrBase64:     string | null;   // data:image/png;base64,…
  phone:        string | null;   // e.g. "966501234567"
  updatedAt:    Date;
  generation:   number;          // incremented on each init — stale handlers are ignored
  retryCount:   number;          // consecutive reconnect attempts (reset on successful connect)
}

// ── Singleton map (lives for the process lifetime) ────────
const sessions = new Map<string, Session>();

const SESSIONS_DIR =
  process.env.WA_SESSIONS_DIR ?? "/var/www/nasaq/whatsapp-sessions";

// ── Helpers ───────────────────────────────────────────────

function ensureDir(orgId: string): string {
  const dir = path.join(SESSIONS_DIR, orgId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function get(orgId: string): Session {
  if (!sessions.has(orgId)) {
    sessions.set(orgId, {
      socket: null, status: "disconnected",
      qrBase64: null, phone: null, updatedAt: new Date(), generation: 0, retryCount: 0,
    });
  }
  return sessions.get(orgId)!;
}

function touch(sess: Session, patch: Partial<Session>) {
  Object.assign(sess, patch, { updatedAt: new Date() });
}

// ── Public API ────────────────────────────────────────────

/** Start or resume a session.
 *  @param force  If true, tears down any existing socket and reinitialises. */
export async function initBaileys(orgId: string, force = false): Promise<void> {
  const sess = get(orgId);

  // Tear down existing socket when force=true
  if (force && sess.socket) {
    try { sess.socket.end(undefined); } catch {}
    touch(sess, { socket: null, status: "disconnected", qrBase64: null });
  }

  // Already in-flight or connected — do nothing (unless forced)
  if (!force && (sess.status === "connected" || sess.status === "connecting" || sess.status === "qr_ready")) return;

  // Increment generation so stale event handlers from previous sockets are ignored
  const gen = sess.generation + 1;
  touch(sess, { status: "connecting", qrBase64: null, generation: gen });

  const dir = ensureDir(orgId);
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version }          = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth:               state,
    printQRInTerminal:  false,
    logger: { level: "silent", trace(){}, debug(){}, info(){}, warn(){}, error(){}, fatal(){}, child(){ return this; } } as any,
  });

  touch(sess, { socket: sock });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update: { connection?: string; lastDisconnect?: { error?: unknown }; qr?: string }) => {
    // Ignore events from a stale socket (replaced by a newer init call)
    if (sessions.get(orgId)?.generation !== gen) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const png = await QRCode.toDataURL(qr, { width: 320, margin: 2, color: { dark: "#111827", light: "#ffffff" } });
        touch(sess, { status: "qr_ready", qrBase64: png });
        log.info({ orgId }, "[wa-baileys] QR ready");
      } catch (err) {
        log.error({ err, orgId }, "[wa-baileys] QR generation failed");
      }
    }

    if (connection === "open") {
      const phoneRaw = sock.user?.id?.split(":")[0] ?? null;
      touch(sess, { status: "connected", qrBase64: null, phone: phoneRaw, retryCount: 0 });
      log.info({ orgId, phone: phoneRaw }, "[wa-baileys] connected");
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      log.info({ orgId, reason }, "[wa-baileys] closed");

      touch(sess, { socket: null, qrBase64: null });

      if (reason === DisconnectReason.loggedOut) {
        // Permanent logout — clear files and stop
        const dir = path.join(SESSIONS_DIR, orgId);
        fs.rmSync(dir, { recursive: true, force: true });
        touch(sess, { status: "disconnected", phone: null, retryCount: 0 });
      } else {
        // Transient error — auto-reconnect with exponential backoff (max 5 retries)
        const retries = (sess.retryCount ?? 0) + 1;
        touch(sess, { status: "disconnected", retryCount: retries });

        if (retries > 5) {
          log.warn({ orgId, retries }, "[wa-baileys] max retries reached — giving up until manual reconnect");
        } else if (hasSavedSession(orgId)) {
          const backoffMs = Math.min(5_000 * retries, 60_000); // 5s, 10s, 15s, 20s, 25s … cap 60s
          log.info({ orgId, reason, retries, backoffMs }, "[wa-baileys] reconnecting with backoff");
          setTimeout(() => {
            // Only reconnect if generation hasn't changed (no newer init already running)
            if (sessions.get(orgId)?.generation === gen) {
              initBaileys(orgId).catch(() => {});
            }
          }, backoffMs);
        }
      }
    }
  });
}

/** Get current session state for an org */
export function getBaileysState(orgId: string): {
  status:    WaStatus;
  qrBase64:  string | null;
  phone:     string | null;
  updatedAt: Date;
} {
  const sess = get(orgId);
  return {
    status:    sess.status,
    qrBase64:  sess.qrBase64,
    phone:     sess.phone,
    updatedAt: sess.updatedAt,
  };
}

/** Send a WhatsApp message via an active Baileys session */
export async function sendViaBaileys(orgId: string, phone: string, message: string): Promise<boolean> {
  const sess = get(orgId);
  if (sess.status !== "connected" || !sess.socket) return false;

  try {
    const jid = phone.replace(/\+/g, "").replace(/\s/g, "") + "@s.whatsapp.net";
    await sess.socket.sendMessage(jid, { text: message });
    log.info({ orgId, phone }, "[wa-baileys] message sent");
    return true;
  } catch (err: any) {
    log.error({ err, orgId, phone }, "[wa-baileys] send failed");
    // If the error is a genuine connection failure, reset state and reconnect
    const msg = String(err?.message ?? err?.output?.payload?.message ?? "");
    if (msg.includes("Connection Closed") || msg.includes("not open") || err?.output?.statusCode === 428) {
      log.warn({ orgId }, "[wa-baileys] connection lost on send — resetting and reconnecting");
      touch(sess, { status: "disconnected", socket: null, qrBase64: null });
      if (hasSavedSession(orgId)) initBaileys(orgId).catch(() => {});
    }
    return false;
  }
}

/** Send a WhatsApp image+caption via an active Baileys session.
 *  Falls back to text-only if the socket is not connected or if the send fails. */
export async function sendImageViaBaileys(
  orgId: string,
  phone: string,
  imageBuffer: Buffer,
  caption: string,
): Promise<boolean> {
  const sess = get(orgId);
  if (sess.status !== "connected" || !sess.socket) return false;

  try {
    const jid = phone.replace(/\+/g, "").replace(/\s/g, "") + "@s.whatsapp.net";
    await sess.socket.sendMessage(jid, { image: imageBuffer, caption });
    log.info({ orgId, phone }, "[wa-baileys] image+caption sent");
    return true;
  } catch (err: any) {
    log.error({ err, orgId, phone }, "[wa-baileys] image send failed");
    const msg = String(err?.message ?? err?.output?.payload?.message ?? "");
    if (msg.includes("Connection Closed") || msg.includes("not open") || err?.output?.statusCode === 428) {
      log.warn({ orgId }, "[wa-baileys] connection lost on image send — resetting");
      touch(sess, { status: "disconnected", socket: null, qrBase64: null });
      if (hasSavedSession(orgId)) initBaileys(orgId).catch(() => {});
    }
    return false;
  }
}

/** Logout and remove session files */
export async function logoutBaileys(orgId: string): Promise<void> {
  const sess = get(orgId);

  if (sess.socket) {
    try { await sess.socket.logout(); } catch {}
    sess.socket = null;
  }

  const dir = path.join(SESSIONS_DIR, orgId);
  fs.rmSync(dir, { recursive: true, force: true });

  touch(sess, { status: "disconnected", qrBase64: null, phone: null });
  log.info({ orgId }, "[wa-baileys] logged out");
}

/** Check if saved credentials exist (session can be restored) */
export function hasSavedSession(orgId: string): boolean {
  return fs.existsSync(path.join(SESSIONS_DIR, orgId, "creds.json"));
}

/** Restore all saved sessions on server startup */
export async function restoreAllBaileys(): Promise<void> {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const dirs = fs.readdirSync(SESSIONS_DIR).filter(d =>
    fs.statSync(path.join(SESSIONS_DIR, d)).isDirectory() &&
    fs.existsSync(path.join(SESSIONS_DIR, d, "creds.json"))
  );
  for (const orgId of dirs) {
    log.info({ orgId }, "[wa-baileys] restoring session");
    initBaileys(orgId).catch(() => {});
  }
}
