// ============================================================
// WHATSAPP BAILEYS — QR-based WhatsApp connection per org
// Uses @whiskeysockets/baileys (multi-device, no browser)
//
// Lifecycle guarantees:
//   - Generation tracking prevents stale event handlers
//   - isSocketAlive() checks ws.readyState for integrity
//   - getBaileysState() auto-corrects stale states on poll
//   - force=true on initBaileys allows explicit re-init
//   - Reconnect with exponential backoff (max 5 attempts)
//   - restoreAllBaileys() called at startup for saved sessions
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

export type WaStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

interface Session {
  socket:       any | null;
  status:       WaStatus;
  qrBase64:     string | null;   // data:image/png;base64,…
  phone:        string | null;   // e.g. "966501234567"
  lastError:    string | null;
  updatedAt:    Date;
  generation:   number;          // tracks init generation for event isolation
  reconnects:   number;          // current consecutive reconnect count
  reconnectTimer: ReturnType<typeof setTimeout> | null; // pending reconnect timer
}

// ── Singleton map (lives for the process lifetime) ────────
const sessions = new Map<string, Session>();

const SESSIONS_DIR =
  process.env.WA_SESSIONS_DIR ?? "/var/www/nasaq/whatsapp-sessions";
const DEFAULT_BROWSER: [string, string, string] = ["Ubuntu", "Chrome", "22.04.4"];

// Reconnect config
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 2_000;   // 2s, 4s, 8s, 16s, 32s

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
      generation: 0, reconnects: 0, reconnectTimer: null,
    });
  }
  return sessions.get(orgId)!;
}

function touch(sess: Session, patch: Partial<Session>) {
  Object.assign(sess, patch, { updatedAt: new Date() });
}

/** Check if the underlying WebSocket is actually alive */
function isSocketAlive(sock: any): boolean {
  try {
    // Baileys sockets expose ws property with readyState
    const ws = sock?.ws;
    if (!ws) return false;
    // WebSocket.OPEN = 1
    return ws.readyState === 1;
  } catch {
    return false;
  }
}

/** Safely close a socket without throwing */
function safeCloseSocket(sock: any): void {
  if (!sock) return;
  try { sock.end(undefined); } catch { /* ignore */ }
}

/** Cancel any pending reconnect timer for a session */
function cancelReconnect(sess: Session): void {
  if (sess.reconnectTimer) {
    clearTimeout(sess.reconnectTimer);
    sess.reconnectTimer = null;
  }
}

// ── Public API ────────────────────────────────────────────

/**
 * Start or resume a session.
 * @param orgId  - session key ("platform" for admin, orgId for merchants)
 * @param force  - if true, tear down existing socket and re-init (admin only)
 */
export async function initBaileys(orgId: string, force = false): Promise<void> {
  const sess = get(orgId);

  // force=true: explicitly tear down and re-create (used by admin re-init)
  if (force && sess.socket) {
    log.info({ orgId }, "[wa-baileys] force re-init — closing existing socket");
    cancelReconnect(sess);
    safeCloseSocket(sess.socket);
    touch(sess, { socket: null, qrBase64: null, status: "disconnected" });
  }

  // Already in-flight or connected — do nothing (unless forced above)
  if (sess.status === "connected" || sess.status === "connecting" || sess.status === "qr_ready") return;

  // Bump generation to invalidate any stale event handlers
  const gen = ++sess.generation;
  cancelReconnect(sess);
  touch(sess, { status: "connecting", qrBase64: null, lastError: null, reconnects: 0 });

  try {
    if (typeof makeWASocket !== "function") {
      throw new Error("[wa-baileys] Could not resolve makeWASocket — check @whiskeysockets/baileys version");
    }
    const dir = ensureDir(orgId);
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    // Fetch latest WA Web version — fallback to a known-good version if
    // the network call to web.whatsapp.com fails (common in production).
    // Fallback: WA Web v2.3000.x — update periodically from fetchLatestBaileysVersion() output.
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
    log.info({ orgId, browserConfig, version }, "[wa-baileys] socket init config");

    const sock = makeWASocket({
      version,
      auth:               state,
      browser:            browserConfig,
      printQRInTerminal:  false,
      // suppress Baileys internal logger
      logger: { level: "silent", trace(){}, debug(){}, info(){}, warn(){}, error(){}, fatal(){}, child(){ return this; } } as any,
    });

    touch(sess, { socket: sock });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: { connection?: string; lastDisconnect?: { error?: unknown }; qr?: string }) => {
      // Generation guard: ignore events from stale sockets
      if (sess.generation !== gen) {
        log.info({ orgId, gen, currentGen: sess.generation }, "[wa-baileys] ignoring stale event");
        return;
      }

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
          log.info({ orgId }, "[wa-baileys] QR ready");
        } catch (err) {
          touch(sess, { lastError: "تعذّر توليد باركود QR. راجع إعدادات الخادم." });
          log.error({ err, orgId }, "[wa-baileys] QR generation failed");
        }
      }

      if (connection === "open") {
        const phoneRaw = sock.user?.id?.split(":")[0] ?? null;
        touch(sess, { status: "connected", qrBase64: null, phone: phoneRaw, lastError: null, reconnects: 0 });
        log.info({ orgId, phone: phoneRaw }, "[wa-baileys] connected");
      }

      if (connection === "close") {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        log.info({ orgId, reason }, "[wa-baileys] closed");

        // Clear socket reference to prevent stale refs
        safeCloseSocket(sess.socket);
        touch(sess, { socket: null, qrBase64: null });

        if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.multideviceMismatch) {
          // Permanent logout or protocol mismatch — clear files
          const dir = path.join(SESSIONS_DIR, orgId);
          fs.rmSync(dir, { recursive: true, force: true });
          touch(sess, {
            status: "disconnected",
            phone: null,
            reconnects: 0,
            lastError:
              reason === DisconnectReason.multideviceMismatch
                ? "عدم توافق بروتوكول واتساب. أعد بدء جلسة QR جديدة."
                : "تم تسجيل الخروج من واتساب. ابدأ جلسة QR جديدة.",
          });
        } else {
          // Transient error — attempt reconnect with exponential backoff
          const attempt = sess.reconnects + 1;
          if (attempt <= MAX_RECONNECT_ATTEMPTS && hasSavedSession(orgId)) {
            const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1);
            log.info({ orgId, attempt, delay }, "[wa-baileys] scheduling reconnect");
            touch(sess, { status: "disconnected", reconnects: attempt });
            sess.reconnectTimer = setTimeout(() => {
              sess.reconnectTimer = null;
              initBaileys(orgId).catch((err) => {
                log.warn({ err, orgId }, "[wa-baileys] reconnect failed");
              });
            }, delay);
          } else {
            touch(sess, { status: "disconnected", reconnects: 0, lastError: "انقطع اتصال واتساب. أعد بدء الجلسة." });
          }
        }
      }
    });
  } catch (err: any) {
    const msg = err?.message || "فشل تهيئة جلسة واتساب";
    touch(sess, { status: "disconnected", socket: null, qrBase64: null, lastError: msg });
    log.error({ err, orgId }, "[wa-baileys] init failed");
    throw err;
  }
}

/**
 * Get current session state for an org.
 * Auto-corrects stale states: if status says connected but socket is dead,
 * resets to disconnected so callers never see a false "connected".
 */
export function getBaileysState(orgId: string): {
  status:    WaStatus;
  qrBase64:  string | null;
  phone:     string | null;
  lastError: string | null;
  updatedAt: Date;
} {
  const sess = get(orgId);

  // Stale state correction: if we think we're connected but socket is dead
  if (sess.status === "connected" && sess.socket && !isSocketAlive(sess.socket)) {
    log.warn({ orgId }, "[wa-baileys] stale connected state — socket is dead, resetting");
    safeCloseSocket(sess.socket);
    touch(sess, { status: "disconnected", socket: null, qrBase64: null });
  }

  // Stale QR correction: if qr_ready but no socket
  if (sess.status === "qr_ready" && !sess.socket) {
    log.warn({ orgId }, "[wa-baileys] stale qr_ready state — no socket, resetting");
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
  if (sess.status !== "connected" || !sess.socket) return false;

  // Double-check socket is actually alive before sending
  if (!isSocketAlive(sess.socket)) {
    log.warn({ orgId, phone }, "[wa-baileys] send aborted — socket is dead");
    touch(sess, { status: "disconnected", socket: null, qrBase64: null });
    return false;
  }

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
    try { await sess.socket.logout(); } catch { /* ignore */ }
    safeCloseSocket(sess.socket);
    sess.socket = null;
  }

  const dir = path.join(SESSIONS_DIR, orgId);
  fs.rmSync(dir, { recursive: true, force: true });

  touch(sess, { status: "disconnected", qrBase64: null, phone: null, lastError: null, reconnects: 0 });
  log.info({ orgId }, "[wa-baileys] logged out");
}

/** Check if saved credentials exist (session can be restored) */
export function hasSavedSession(orgId: string): boolean {
  return fs.existsSync(path.join(SESSIONS_DIR, orgId, "creds.json"));
}

/**
 * Restore all saved sessions on server startup.
 * Validates creds.json integrity before attempting restore.
 */
export async function restoreAllBaileys(): Promise<void> {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const dirs = fs.readdirSync(SESSIONS_DIR).filter(d => {
    const dirPath = path.join(SESSIONS_DIR, d);
    const credsPath = path.join(dirPath, "creds.json");
    if (!fs.statSync(dirPath).isDirectory()) return false;
    if (!fs.existsSync(credsPath)) return false;
    // Validate creds.json is non-empty and parseable
    try {
      const raw = fs.readFileSync(credsPath, "utf8").trim();
      if (!raw || raw.length < 10) {
        log.warn({ orgId: d }, "[wa-baileys] skipping restore — creds.json empty or corrupt");
        return false;
      }
      JSON.parse(raw);
      return true;
    } catch {
      log.warn({ orgId: d }, "[wa-baileys] skipping restore — creds.json invalid JSON");
      return false;
    }
  });
  log.info({ count: dirs.length, sessions: dirs }, "[wa-baileys] restoring saved sessions on startup");
  for (const orgId of dirs) {
    log.info({ orgId }, "[wa-baileys] restoring session");
    initBaileys(orgId).catch((err) => {
      log.warn({ err, orgId }, "[wa-baileys] restore failed — session will remain disconnected");
    });
  }
}

// ── Exported for testing ─────────────────────────────────
export const _test = {
  sessions,
  isSocketAlive,
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_BASE_DELAY_MS,
  get,
  cancelReconnect,
};
