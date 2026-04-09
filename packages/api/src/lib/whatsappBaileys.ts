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

export type WaStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

interface Session {
  socket:    any | null;
  status:    WaStatus;
  qrBase64:  string | null;   // data:image/png;base64,…
  phone:     string | null;   // e.g. "966501234567"
  lastError: string | null;
  updatedAt: Date;
}

// ── Singleton map (lives for the process lifetime) ────────
const sessions = new Map<string, Session>();

const SESSIONS_DIR =
  process.env.WA_SESSIONS_DIR ?? "/var/www/nasaq/whatsapp-sessions";
const DEFAULT_BROWSER: [string, string, string] = ["Ubuntu", "Chrome", "22.04.4"];

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
    });
  }
  return sessions.get(orgId)!;
}

function touch(sess: Session, patch: Partial<Session>) {
  Object.assign(sess, patch, { updatedAt: new Date() });
}

// ── Public API ────────────────────────────────────────────

/** Start or resume a session. No-op if already connecting/connected. */
export async function initBaileys(orgId: string): Promise<void> {
  const sess = get(orgId);

  // Already in-flight or connected — do nothing
  if (sess.status === "connected" || sess.status === "connecting" || sess.status === "qr_ready") return;

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
    log.info({ orgId, browserConfig, version }, "[wa-baileys] socket init config");

    const sock = makeWASocket({
      version,
      auth:               state,
      printQRInTerminal:  false,
      browser:            browserConfig,
      // suppress Baileys internal logger
      logger: { level: "silent", trace(){}, debug(){}, info(){}, warn(){}, error(){}, fatal(){}, child(){ return this; } } as any,
    });

    touch(sess, { socket: sock });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: { connection?: string; lastDisconnect?: { error?: unknown }; qr?: string }) => {
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
        touch(sess, { status: "connected", qrBase64: null, phone: phoneRaw, lastError: null });
        log.info({ orgId, phone: phoneRaw }, "[wa-baileys] connected");
      }

      if (connection === "close") {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        log.info({ orgId, reason }, "[wa-baileys] closed");

        touch(sess, { socket: null, qrBase64: null });

        if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.multideviceMismatch) {
          // Permanent logout or protocol mismatch — clear files
          const dir = path.join(SESSIONS_DIR, orgId);
          fs.rmSync(dir, { recursive: true, force: true });
          touch(sess, {
            status: "disconnected",
            phone: null,
            lastError:
              reason === DisconnectReason.multideviceMismatch
                ? "عدم توافق بروتوكول واتساب. أعد بدء جلسة QR جديدة."
                : "تم تسجيل الخروج من واتساب. ابدأ جلسة QR جديدة.",
          });
        } else {
          // Transient error — reset to disconnected so user can re-init
          touch(sess, { status: "disconnected", lastError: "انقطع اتصال واتساب قبل ظهور QR. أعد بدء الجلسة." });
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

/** Get current session state for an org */
export function getBaileysState(orgId: string): {
  status:    WaStatus;
  qrBase64:  string | null;
  phone:     string | null;
  lastError: string | null;
  updatedAt: Date;
} {
  const sess = get(orgId);
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

  if (sess.socket) {
    try { await sess.socket.logout(); } catch {}
    sess.socket = null;
  }

  const dir = path.join(SESSIONS_DIR, orgId);
  fs.rmSync(dir, { recursive: true, force: true });

  touch(sess, { status: "disconnected", qrBase64: null, phone: null, lastError: null });
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
