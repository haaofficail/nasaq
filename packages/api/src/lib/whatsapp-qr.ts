// ============================================================
// WHATSAPP QR SESSION MANAGER — إدارة جلسات واتساب بالباركود
//
// Uses @whiskeysockets/baileys to manage per-org WhatsApp sessions
// Sessions stored in WHATSAPP_SESSIONS_DIR/{orgId}/
// ============================================================

import path from "path";
import { pool } from "@nasaq/db/client";

const SESSIONS_DIR = process.env.WHATSAPP_SESSIONS_DIR ?? "/var/www/nasaq/whatsapp-sessions";
const DEFAULT_BROWSER: [string, string, string] = ["Ubuntu", "Chrome", "22.04.4"];

// In-memory state per orgId
interface SessionState {
  qrCode: string | null;
  status: "disconnected" | "pending_qr" | "connected" | "error";
  phoneNumber: string | null;
  displayName: string | null;
  errorMessage: string | null;
  sock: unknown;
}

const sessions = new Map<string, SessionState>();

// ── Save state to DB ────────────────────────────────────────
async function persistState(orgId: string, state: Partial<SessionState>): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO whatsapp_connections (org_id, mode, status, phone_number, display_name, session_id, qr_code, error_message, updated_at)
       VALUES ($1, 'qr', $2, $3, $4, $1, $5, $6, NOW())
       ON CONFLICT (org_id) DO UPDATE SET
         mode = 'qr',
         status = COALESCE($2, whatsapp_connections.status),
         phone_number = COALESCE($3, whatsapp_connections.phone_number),
         display_name = COALESCE($4, whatsapp_connections.display_name),
         session_id = $1,
         qr_code = $5,
         error_message = $6,
         updated_at = NOW()`,
      [orgId, state.status ?? "disconnected", state.phoneNumber ?? null, state.displayName ?? null, state.qrCode ?? null, state.errorMessage ?? null]
    );
  } catch (err) {
    console.error("[WhatsApp QR] DB persist error:", err);
  }
}

// ── Start a QR session for an org ──────────────────────────
export async function startQrSession(orgId: string): Promise<void> {
  // Stop existing session first
  await stopSession(orgId);

  const existing = sessions.get(orgId);
  if (existing?.status === "connected") return;

  const state: SessionState = {
    qrCode: null, status: "pending_qr", phoneNumber: null,
    displayName: null, errorMessage: null, sock: null,
  };
  sessions.set(orgId, state);
  await persistState(orgId, { status: "pending_qr" });

  try {
    // Dynamic import — only installed on server
    const baileysMod = await import("@whiskeysockets/baileys");
    // Handle CJS/ESM interop — `default` may be the whole CJS exports object
    const makeWASocket =
      (typeof baileysMod.default === "function"
        ? baileysMod.default
        : baileysMod.makeWASocket
          ?? (baileysMod.default as any)?.makeWASocket) as (...args: any[]) => any;
    if (typeof makeWASocket !== "function") {
      throw new Error("[WhatsApp QR] Could not resolve makeWASocket — check @whiskeysockets/baileys version");
    }
    const useMultiFileAuthState = baileysMod.useMultiFileAuthState
      ?? (baileysMod.default as any)?.useMultiFileAuthState;
    const DisconnectReason = baileysMod.DisconnectReason
      ?? (baileysMod.default as any)?.DisconnectReason;
    const fetchLatestBaileysVersion = baileysMod.fetchLatestBaileysVersion
      ?? (baileysMod.default as any)?.fetchLatestBaileysVersion;
    const { Boom } = await import("@hapi/boom");
    const QRCode = await import("qrcode");

    const authDir = path.join(SESSIONS_DIR, orgId);
    const { state: authState, saveCreds } = await useMultiFileAuthState(authDir);
    let version: [number, number, number] = [2, 3000, 1015901307];
    try {
      const fetched = await fetchLatestBaileysVersion();
      version = fetched.version as [number, number, number];
    } catch {
      console.warn("[WhatsApp QR] fetchLatestBaileysVersion failed — using fallback");
    }
    const browserModule =
      (typeof baileysMod.Browsers === "object" && baileysMod.Browsers ? baileysMod.Browsers : undefined)
      ?? (baileysMod.default as any)?.Browsers;
    const browserConfig: [string, string, string] =
      browserModule?.ubuntu?.("Chrome") ?? DEFAULT_BROWSER;
    console.info("[WhatsApp QR] socket init config", { orgId, browserConfig, version });

    const sock = makeWASocket({
      version,
      auth: authState,
      printQRInTerminal: false,
      logger: { level: "silent" } as any,
      browser: browserConfig,
    });

    state.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      const current = sessions.get(orgId);
      if (!current) return;

      if (qr) {
        try {
          const qrImage = await QRCode.default.toDataURL(qr, {
            width: 512,
            margin: 4,
            errorCorrectionLevel: "M",
            color: { dark: "#000000", light: "#ffffff" },
          });
          current.qrCode = qrImage;
          current.status = "pending_qr";
          await persistState(orgId, { status: "pending_qr", qrCode: qrImage });
        } catch (err) {
          console.error("[WhatsApp QR] QR generation error:", err);
        }
      }

      if (connection === "open") {
        const phoneNumber = sock.user?.id?.split(":")[0]?.replace("@s.whatsapp.net", "") ?? null;
        const displayName = sock.user?.name ?? null;
        current.status = "connected";
        current.phoneNumber = phoneNumber;
        current.displayName = displayName;
        current.qrCode = null;
        await persistState(orgId, { status: "connected", phoneNumber, displayName, qrCode: null });
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          // Try reconnecting
          setTimeout(() => startQrSession(orgId), 3000);
        } else {
          current.status = "disconnected";
          sessions.delete(orgId);
          await persistState(orgId, { status: "disconnected", qrCode: null });
        }
      }
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    state.status = "error";
    state.errorMessage = msg;
    await persistState(orgId, { status: "error", errorMessage: msg });
    console.error("[WhatsApp QR] Session start error:", msg);
  }
}

// ── Stop / disconnect a session ─────────────────────────────
export async function stopSession(orgId: string): Promise<void> {
  const state = sessions.get(orgId);
  if (state?.sock) {
    try {
      await (state.sock as any).logout();
    } catch (_) {
      // silent
    }
    try {
      (state.sock as any).end();
    } catch (_) {
      // silent
    }
  }
  sessions.delete(orgId);
  await persistState(orgId, { status: "disconnected", qrCode: null, phoneNumber: null });
}

// ── Send a message via QR session ──────────────────────────
export async function sendViaQr(orgId: string, phone: string, message: string): Promise<boolean> {
  const state = sessions.get(orgId);
  if (!state?.sock || state.status !== "connected") return false;
  try {
    const jid = phone.replace(/\D/g, "") + "@s.whatsapp.net";
    await (state.sock as any).sendMessage(jid, { text: message });

    // Increment counter
    await pool.query(
      `UPDATE whatsapp_connections SET messages_sent = messages_sent + 1, last_activity = NOW() WHERE org_id = $1`,
      [orgId]
    );
    return true;
  } catch (err) {
    console.error("[WhatsApp QR] Send error:", err);
    return false;
  }
}

// ── Get current state (memory-first, fallback DB) ──────────
export function getSessionState(orgId: string): SessionState | null {
  return sessions.get(orgId) ?? null;
}

// ── Restore sessions on startup ────────────────────────────
export async function restoreActiveSessions(): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT org_id FROM whatsapp_connections WHERE mode = 'qr' AND status = 'connected'`
    );
    for (const row of result.rows) {
      // Fire and forget
      startQrSession(row.org_id as string).catch((err) =>
        console.error("[WhatsApp QR] Restore error:", err)
      );
    }
  } catch (err) {
    console.error("[WhatsApp QR] Restore sessions error:", err);
  }
}
