// ============================================================
// WHATSAPP BAILEYS — QR-based WhatsApp connection per org
// Uses @whiskeysockets/baileys (multi-device, no browser)
// ============================================================

import baileysMod, {
  makeWASocket as makeWASocketNamed,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { log } from "./logger";

// Handle CJS/ESM interop — tsx dynamic-import resolves `default` as the
// whole CJS `module.exports` object instead of `exports.default`.
const _resolved =
  typeof baileysMod === "function"
    ? baileysMod
    : makeWASocketNamed
      ?? (baileysMod as any).makeWASocket
      ?? (baileysMod as any).default;
const makeWASocket = (typeof _resolved === "function" ? _resolved : null) as typeof makeWASocketNamed | null;

// Runtime assertion — fail fast at import time if Baileys is broken
if (typeof makeWASocket !== "function") {
  log.error("[wa-baileys] CRITICAL: makeWASocket could not be resolved from @whiskeysockets/baileys — QR sessions will not work");
}

export type WaStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

interface Session {
  socket:    any | null;
  status:    WaStatus;
  qrBase64:  string | null;   // data:image/png;base64,…
  phone:     string | null;   // e.g. "966501234567"
  lastError: string | null;
  updatedAt: Date;
  /** Monotonically increasing init generation — prevents stale event handlers */
  generation: number;
  /** Consecutive transient-close counter for backoff */
  reconnectAttempts: number;
  /** Timer handle for scheduled reconnect */
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

// ── Singleton map (lives for the process lifetime) ────────
const sessions = new Map<string, Session>();

const SESSIONS_DIR =
  process.env.WA_SESSIONS_DIR ?? "/var/www/nasaq/whatsapp-sessions";
const DEFAULT_BROWSER: [string, string, string] = ["Ubuntu", "Chrome", "22.04.4"];

/** Max auto-reconnect attempts before giving up */
const MAX_RECONNECT_ATTEMPTS = 5;
/** Base delay for exponential backoff (ms) */
const RECONNECT_BASE_DELAY = 3_000;

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
      qrBase64: null, phone: null, lastError: null, updatedAt: new Date(),
      generation: 0, reconnectAttempts: 0, reconnectTimer: null,
    });
  }
  return sessions.get(orgId)!;
}

function touch(sess: Session, patch: Partial<Session>) {
  Object.assign(sess, patch, { updatedAt: new Date() });
}

/** Check if a session's socket is still alive (not null & ws open) */
function isSocketAlive(sess: Session): boolean {
  if (!sess.socket) return false;
  try {
    const ws = sess.socket.ws;
    // readyState 1 = OPEN
    return ws && ws.readyState === 1;
  } catch {
    return false;
  }
}

/** Safely close/end a socket without throwing */
function destroySocket(sess: Session): void {
  if (!sess.socket) return;
  try { sess.socket.end(undefined); } catch { /* silent */ }
  sess.socket = null;
}

/** Cancel any pending reconnect timer */
function cancelReconnect(sess: Session): void {
  if (sess.reconnectTimer) {
    clearTimeout(sess.reconnectTimer);
    sess.reconnectTimer = null;
  }
}

// ── Public API ────────────────────────────────────────────

/**
 * Start or resume a session.
 *
 * Safe to call repeatedly — will no-op if the session is genuinely active.
 * Detects stale states (qr_ready/connecting with dead socket) and forces re-init.
 * @param force  If true, tears down any existing session and starts fresh.
 */
export async function initBaileys(orgId: string, force = false): Promise<void> {
  const sess = get(orgId);

  // Force-restart: tear down existing state first
  if (force) {
    log.info({ orgId }, "[wa-baileys] force re-init requested");
    cancelReconnect(sess);
    destroySocket(sess);
    touch(sess, { status: "disconnected", qrBase64: null, lastError: null, reconnectAttempts: 0 });
  }

  // Already connected with a live socket — nothing to do
  if (sess.status === "connected" && isSocketAlive(sess)) return;

  // Session claims connecting/qr_ready but socket is dead — force reset
  if ((sess.status === "connecting" || sess.status === "qr_ready") && !isSocketAlive(sess)) {
    log.warn({ orgId, claimedStatus: sess.status }, "[wa-baileys] stale session detected — socket dead, resetting");
    destroySocket(sess);
    touch(sess, { status: "disconnected", qrBase64: null });
  }

  // Genuinely connecting/qr_ready with live socket — let it proceed
  if (sess.status === "connecting" || sess.status === "qr_ready") return;

  // Bump generation so old event handlers become no-ops
  const gen = ++sess.generation;
  cancelReconnect(sess);
  touch(sess, { status: "connecting", qrBase64: null, lastError: null });

  try {
    if (typeof makeWASocket !== "function") {
      throw new Error("[wa-baileys] Could not resolve makeWASocket — check @whiskeysockets/baileys version");
    }
    const dir = ensureDir(orgId);
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    let version: [number, number, number] = [2, 3000, 1015901307];
    try {
      const fetched = await fetchLatestBaileysVersion();
      version = fetched.version as [number, number, number];
    } catch {
      log.warn({ orgId }, "[wa-baileys] fetchLatestBaileysVersion failed — using fallback version");
    }
    const browserModule =
      (typeof Browsers === "object" && Browsers ? Browsers : undefined)
      ?? (baileysMod as any)?.Browsers;
    const browserConfig: [string, string, string] =
      browserModule?.ubuntu?.("Chrome") ?? DEFAULT_BROWSER;
    log.info({ orgId, browserConfig, version, gen }, "[wa-baileys] creating socket");

    const sock = makeWASocket({
      version,
      auth:               state,
      printQRInTerminal:  false,
      browser:            browserConfig,
      // suppress Baileys internal logger
      logger: { level: "silent", trace(){}, debug(){}, info(){}, warn(){}, error(){}, fatal(){}, child(){ return this; } } as any,
    });

    touch(sess, { socket: sock });

    sock.ev.on("creds.update", () => {
      if (sess.generation !== gen) return; // stale handler
      saveCreds();
      log.debug({ orgId }, "[wa-baileys] creds saved");
    });

    sock.ev.on("connection.update", async (update: { connection?: string; lastDisconnect?: { error?: unknown }; qr?: string }) => {
      // Guard: if a newer init has started, ignore this handler entirely
      if (sess.generation !== gen) return;

      const { connection, lastDisconnect, qr } = update;

      // New QR received — convert to base64 PNG
      if (qr) {
        try {
          const png = await QRCode.toDataURL(qr, {
            width: 512,
            margin: 4,
            errorCorrectionLevel: "M",
            color: { dark: "#000000", light: "#ffffff" },
          });
          touch(sess, { status: "qr_ready", qrBase64: png, lastError: null });
          log.info({ orgId, gen }, "[wa-baileys] QR ready");
        } catch (err) {
          touch(sess, { lastError: "تعذّر توليد باركود QR. راجع إعدادات الخادم." });
          log.error({ err, orgId }, "[wa-baileys] QR generation failed");
        }
      }

      if (connection === "open") {
        const phoneRaw = sock.user?.id?.split(":")[0] ?? null;
        touch(sess, { status: "connected", qrBase64: null, phone: phoneRaw, lastError: null, reconnectAttempts: 0 });
        log.info({ orgId, phone: phoneRaw, gen }, "[wa-baileys] connected ✓");
      }

      if (connection === "close") {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const reasonMsg = (lastDisconnect?.error as Boom)?.message ?? "unknown";
        log.info({ orgId, reason, reasonMsg, gen }, "[wa-baileys] connection closed");

        // Clear socket reference — it's dead
        touch(sess, { socket: null, qrBase64: null });

        if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.multideviceMismatch) {
          // Permanent logout or protocol mismatch — clear files, no reconnect
          const dir = path.join(SESSIONS_DIR, orgId);
          fs.rmSync(dir, { recursive: true, force: true });
          touch(sess, {
            status: "disconnected",
            phone: null,
            reconnectAttempts: 0,
            lastError:
              reason === DisconnectReason.multideviceMismatch
                ? "عدم توافق بروتوكول واتساب. أعد بدء جلسة QR جديدة."
                : "تم تسجيل الخروج من واتساب. ابدأ جلسة QR جديدة.",
          });
          log.info({ orgId, reason }, "[wa-baileys] permanent disconnect — session cleared");
        } else {
          // Transient error — attempt auto-reconnect with exponential backoff
          const attempts = sess.reconnectAttempts + 1;
          if (attempts <= MAX_RECONNECT_ATTEMPTS && hasSavedSession(orgId)) {
            const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, attempts - 1), 60_000);
            touch(sess, {
              status: "connecting",
              reconnectAttempts: attempts,
              lastError: `انقطع الاتصال — إعادة المحاولة (${attempts}/${MAX_RECONNECT_ATTEMPTS})...`,
            });
            log.info({ orgId, attempts, delay, gen }, "[wa-baileys] scheduling reconnect");
            sess.reconnectTimer = setTimeout(() => {
              // Only reconnect if this generation is still current
              if (sess.generation === gen) {
                initBaileys(orgId, true).catch((err) =>
                  log.error({ err, orgId }, "[wa-baileys] auto-reconnect failed")
                );
              }
            }, delay);
          } else {
            touch(sess, {
              status: "disconnected",
              reconnectAttempts: 0,
              lastError: "انقطع اتصال واتساب بعد عدة محاولات. أعد بدء الجلسة.",
            });
            log.warn({ orgId, attempts, gen }, "[wa-baileys] max reconnect attempts reached — giving up");
          }
        }
      }
    });
  } catch (err: any) {
    const msg = err?.message || "فشل تهيئة جلسة واتساب";
    touch(sess, { status: "disconnected", socket: null, qrBase64: null, lastError: msg, reconnectAttempts: 0 });
    log.error({ err, orgId }, "[wa-baileys] init failed");
    throw err;
  }
}

/** Get current session state for an org (with integrity check) */
export function getBaileysState(orgId: string): {
  status:    WaStatus;
  qrBase64:  string | null;
  phone:     string | null;
  lastError: string | null;
  updatedAt: Date;
} {
  const sess = get(orgId);

  // Integrity check: if session claims connected but socket is dead, correct it
  if (sess.status === "connected" && !isSocketAlive(sess)) {
    log.warn({ orgId }, "[wa-baileys] getBaileysState: status was connected but socket is dead — correcting");
    destroySocket(sess);
    touch(sess, { status: "disconnected", qrBase64: null, lastError: "الجلسة انتهت. أعد الاتصال." });
  }
  // If connecting/qr_ready but socket dead — also correct
  if ((sess.status === "connecting" || sess.status === "qr_ready") && !isSocketAlive(sess) && !sess.reconnectTimer) {
    log.warn({ orgId, claimedStatus: sess.status }, "[wa-baileys] getBaileysState: stale state detected — correcting");
    touch(sess, { status: "disconnected", qrBase64: null });
  }

  return {
    status:    sess.status,
    qrBase64:  sess.qrBase64,
    phone:     sess.phone,
    lastError: sess.lastError,
    updatedAt: sess.updatedAt,
  };
}

/** Send a WhatsApp message via an active Baileys session */
export async function sendViaBaileys(orgId: string, phone: string, message: string): Promise<boolean> {
  const sess = get(orgId);
  if (sess.status !== "connected" || !isSocketAlive(sess)) return false;

  try {
    const jid = phone.replace(/\+/g, "").replace(/\s/g, "") + "@s.whatsapp.net";
    await sess.socket.sendMessage(jid, { text: message });
    log.info({ orgId, phone }, "[wa-baileys] message sent");
    return true;
  } catch (err) {
    log.error({ err, orgId, phone }, "[wa-baileys] send failed");
    return false;
  }
}

/** Logout and remove session files */
export async function logoutBaileys(orgId: string): Promise<void> {
  const sess = get(orgId);
  cancelReconnect(sess);

  if (sess.socket) {
    try { await sess.socket.logout(); } catch { /* silent */ }
    destroySocket(sess);
  }

  const dir = path.join(SESSIONS_DIR, orgId);
  fs.rmSync(dir, { recursive: true, force: true });

  touch(sess, { status: "disconnected", qrBase64: null, phone: null, lastError: null, reconnectAttempts: 0 });
  log.info({ orgId }, "[wa-baileys] logged out ✓");
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
  log.info({ count: dirs.length }, "[wa-baileys] restoring saved sessions on startup");
  for (const orgId of dirs) {
    log.info({ orgId }, "[wa-baileys] restoring session");
    initBaileys(orgId).catch((err) =>
      log.error({ err, orgId }, "[wa-baileys] restore failed")
    );
  }
}
