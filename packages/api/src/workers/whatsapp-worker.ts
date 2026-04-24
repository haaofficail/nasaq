import "dotenv/config";
import { PgBoss } from "pg-boss";
import _makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { pool, directPool } from "@nasaq/db/client";
import { log } from "../lib/logger";

const WA_QUEUES = {
  INIT: "wa-init-session",
  SEND_TEXT: "wa-send-text",
  SEND_IMAGE: "wa-send-image",
  LOGOUT: "wa-logout",
} as const;

const PLATFORM_STATE_TARGET_ID = "platform-whatsapp-state";
const SESSIONS_DIR = process.env.WA_SESSIONS_DIR ?? "/var/www/nasaq/whatsapp-sessions";
const BOSS_DATABASE_URL = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
const RESTORE_DELAY_MS = 500;
const BAILEYS_LOGGER = {
  level: "silent",
  trace(){},
  debug(){},
  info(){},
  warn(){},
  error(){},
  fatal(){},
  child(){ return this; },
} as any;

type WaStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

type QueueName = (typeof WA_QUEUES)[keyof typeof WA_QUEUES];

interface Session {
  socket: any | null;
  status: WaStatus;
  qrBase64: string | null;
  phone: string | null;
  updatedAt: Date;
  generation: number;
  retryCount: number;
}

interface InitJob {
  orgId: string;
  force?: boolean;
}

interface SendTextJob {
  orgId: string;
  phone: string;
  message: string;
}

interface SendImageJob {
  orgId: string;
  phone: string;
  caption: string;
  imageBase64: string;
}

interface LogoutJob {
  orgId: string;
}

const sessions = new Map<string, Session>();
const makeWASocket = (
  typeof _makeWASocket === "function"
    ? _makeWASocket
    : (_makeWASocket as any).default ?? (_makeWASocket as any).makeWASocket
) as (...args: any[]) => any;

function resolveSessionDir(orgId: string): string {
  const baseDir = path.resolve(SESSIONS_DIR);
  const resolved = path.resolve(baseDir, orgId);
  if (!resolved.startsWith(`${baseDir}${path.sep}`)) {
    throw new Error("Invalid WhatsApp session id");
  }
  return resolved;
}

function ensureDir(orgId: string): string {
  const dir = resolveSessionDir(orgId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function hasSavedSession(orgId: string): boolean {
  return fs.existsSync(path.join(resolveSessionDir(orgId), "creds.json"));
}

function getRandomizedDelayMs(baseMs: number): number {
  return baseMs + Math.floor(Math.random() * baseMs);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function get(orgId: string): Session {
  if (!sessions.has(orgId)) {
    sessions.set(orgId, {
      socket: null,
      status: "disconnected",
      qrBase64: null,
      phone: null,
      updatedAt: new Date(),
      generation: 0,
      retryCount: 0,
    });
  }
  return sessions.get(orgId)!;
}

async function persistPlatformState(sess: Session): Promise<void> {
  const payload = {
    status: sess.status,
    qrBase64: sess.qrBase64,
    phone: sess.phone,
    updatedAt: sess.updatedAt.toISOString(),
  };

  const existing = await pool.query<{ id: string }>(
    `SELECT id
       FROM rule_definitions
      WHERE scope = 'global'
        AND target_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [PLATFORM_STATE_TARGET_ID],
  );

  if (existing.rows[0]?.id) {
    await pool.query(
      `UPDATE rule_definitions
          SET name = $2,
              description = $3,
              trigger = $4,
              conditions = '[]'::jsonb,
              actions = $5::jsonb,
              priority = 0,
              scope = 'global',
              target_id = $1,
              is_active = true
        WHERE id = $6`,
      [
        PLATFORM_STATE_TARGET_ID,
        "System WhatsApp platform state",
        "Internal state cache for platform Baileys worker",
        "system.whatsapp.platform-state",
        JSON.stringify(payload),
        existing.rows[0].id,
      ],
    );
    return;
  }

  await pool.query(
    `INSERT INTO rule_definitions (
       name,
       description,
       trigger,
       conditions,
       actions,
       priority,
       scope,
       target_id,
       is_active,
       created_by
     ) VALUES ($1, $2, $3, '[]'::jsonb, $4::jsonb, 0, 'global', $5, true, NULL)`,
    [
      "System WhatsApp platform state",
      "Internal state cache for platform Baileys worker",
      "system.whatsapp.platform-state",
      JSON.stringify(payload),
      PLATFORM_STATE_TARGET_ID,
    ],
  );
}

async function persistState(orgId: string): Promise<void> {
  const sess = get(orgId);
  const connectedAt = sess.status === "connected" ? sess.updatedAt : null;

  if (orgId === "platform" || !isUuid(orgId)) {
    await persistPlatformState(sess);
    return;
  }

  await pool.query(
    `INSERT INTO whatsapp_sessions (
       org_id,
       phone,
       session_data,
       status,
       qr_code,
       connected_at,
       updated_at
     ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, NOW())
     ON CONFLICT (org_id) DO UPDATE SET
       phone = EXCLUDED.phone,
       session_data = EXCLUDED.session_data,
       status = EXCLUDED.status,
       qr_code = EXCLUDED.qr_code,
       connected_at = EXCLUDED.connected_at,
       updated_at = NOW()`,
    [
      orgId,
      sess.phone,
      JSON.stringify({ generation: sess.generation, retryCount: sess.retryCount }),
      sess.status,
      sess.qrBase64,
      connectedAt,
    ],
  );
}

async function touch(orgId: string, patch: Partial<Session>): Promise<Session> {
  const sess = get(orgId);
  Object.assign(sess, patch, { updatedAt: new Date() });
  await persistState(orgId);
  return sess;
}

function normalizeJid(phone: string): string {
  return `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
}

function isConnectionError(err: any): boolean {
  const msg = String(err?.message ?? err?.output?.payload?.message ?? "");
  return msg.includes("Connection Closed") || msg.includes("not open") || err?.output?.statusCode === 428;
}

async function initSession(orgId: string, force = false): Promise<void> {
  const sess = get(orgId);

  if (force && sess.socket) {
    try { sess.socket.end(undefined); } catch {}
    await touch(orgId, { socket: null, status: "disconnected", qrBase64: null });
  }

  if (!force && (sess.status === "connected" || sess.status === "connecting" || sess.status === "qr_ready")) return;

  const gen = sess.generation + 1;
  await touch(orgId, { status: "connecting", qrBase64: null, generation: gen });

  const dir = ensureDir(orgId);
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: BAILEYS_LOGGER,
  });

  await touch(orgId, { socket: sock });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update: { connection?: string; lastDisconnect?: { error?: unknown }; qr?: string }) => {
    if (sessions.get(orgId)?.generation !== gen) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const png = await QRCode.toDataURL(qr, {
          width: 320,
          margin: 2,
          color: { dark: "#111827", light: "#ffffff" },
        });
        await touch(orgId, { status: "qr_ready", qrBase64: png });
        log.info({ orgId }, "[wa-worker] QR ready");
      } catch (err) {
        log.error({ err, orgId }, "[wa-worker] QR generation failed");
      }
    }

    if (connection === "open") {
      const phoneRaw = sock.user?.id?.split(":")[0] ?? null;
      await touch(orgId, { status: "connected", qrBase64: null, phone: phoneRaw, retryCount: 0 });
      log.info({ orgId, phone: phoneRaw }, "[wa-worker] connected");
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      log.info({ orgId, reason }, "[wa-worker] closed");

      await touch(orgId, { socket: null, qrBase64: null });

      if (reason === DisconnectReason.loggedOut) {
        fs.rmSync(resolveSessionDir(orgId), { recursive: true, force: true });
        await touch(orgId, { status: "disconnected", phone: null, retryCount: 0 });
        return;
      }

      const retries = (get(orgId).retryCount ?? 0) + 1;
      await touch(orgId, { status: "disconnected", retryCount: retries });

      if (retries > 5) {
        log.warn({ orgId, retries }, "[wa-worker] max retries reached");
      } else if (hasSavedSession(orgId)) {
        const backoffMs = Math.min(5_000 * retries, 60_000);
        log.info({ orgId, retries, backoffMs }, "[wa-worker] reconnecting with backoff");
        setTimeout(() => {
          if (sessions.get(orgId)?.generation === gen) {
            initSession(orgId).catch((err) => log.error({ err, orgId }, "[wa-worker] reconnect failed"));
          }
        }, backoffMs);
      }
    }
  });
}

async function sendText(job: SendTextJob): Promise<void> {
  const sess = get(job.orgId);
  if (sess.status !== "connected" || !sess.socket) return;

  try {
    await sess.socket.sendMessage(normalizeJid(job.phone), { text: job.message });
    log.info({ orgId: job.orgId, phone: job.phone }, "[wa-worker] message sent");
  } catch (err: any) {
    log.error({ err, orgId: job.orgId, phone: job.phone }, "[wa-worker] send failed");
    if (isConnectionError(err)) {
      await touch(job.orgId, { status: "disconnected", socket: null, qrBase64: null });
      if (hasSavedSession(job.orgId)) {
        initSession(job.orgId).catch((reconnectErr) => log.error({ err: reconnectErr, orgId: job.orgId }, "[wa-worker] reconnect after send failed"));
      }
      return;
    }
    throw err;
  }
}

async function sendImage(job: SendImageJob): Promise<void> {
  const sess = get(job.orgId);
  if (sess.status !== "connected" || !sess.socket) return;

  try {
    await sess.socket.sendMessage(normalizeJid(job.phone), {
      image: Buffer.from(job.imageBase64, "base64"),
      caption: job.caption,
    });
    log.info({ orgId: job.orgId, phone: job.phone }, "[wa-worker] image sent");
  } catch (err: any) {
    log.error({ err, orgId: job.orgId, phone: job.phone }, "[wa-worker] image send failed");
    if (isConnectionError(err)) {
      await touch(job.orgId, { status: "disconnected", socket: null, qrBase64: null });
      if (hasSavedSession(job.orgId)) {
        initSession(job.orgId).catch((reconnectErr) => log.error({ err: reconnectErr, orgId: job.orgId }, "[wa-worker] reconnect after image failed"));
      }
      return;
    }
    throw err;
  }
}

async function logoutSession(orgId: string): Promise<void> {
  const sess = get(orgId);
  if (sess.socket) {
    try { await sess.socket.logout(); } catch {}
    try { sess.socket.end(undefined); } catch {}
  }

  fs.rmSync(resolveSessionDir(orgId), { recursive: true, force: true });
  await touch(orgId, {
    socket: null,
    status: "disconnected",
    qrBase64: null,
    phone: null,
    retryCount: 0,
  });
  log.info({ orgId }, "[wa-worker] logged out");
}

async function restoreAllBaileys(): Promise<void> {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const dirs = fs.readdirSync(SESSIONS_DIR).filter((dir) =>
    fs.statSync(path.join(SESSIONS_DIR, dir)).isDirectory() &&
    fs.existsSync(path.join(SESSIONS_DIR, dir, "creds.json")),
  );

  for (const orgId of dirs) {
    await new Promise((resolve) => setTimeout(resolve, getRandomizedDelayMs(RESTORE_DELAY_MS)));
    initSession(orgId).catch((err) => log.error({ err, orgId }, "[wa-worker] restore failed"));
  }
}

async function handleJob(queue: QueueName, data: unknown): Promise<void> {
  switch (queue) {
    case WA_QUEUES.INIT:
      await initSession((data as InitJob).orgId, (data as InitJob).force ?? false);
      return;
    case WA_QUEUES.SEND_TEXT:
      await sendText(data as SendTextJob);
      return;
    case WA_QUEUES.SEND_IMAGE:
      await sendImage(data as SendImageJob);
      return;
    case WA_QUEUES.LOGOUT:
      await logoutSession((data as LogoutJob).orgId);
      return;
  }
}

const REQUIRED_ENV = ["DATABASE_URL"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  log.fatal({ missing }, "[wa-worker] missing required env vars");
  process.exit(1);
}

try {
  await directPool.query("SELECT 1");
  log.info("[wa-worker] database connected");
} catch (err) {
  log.fatal({ err }, "[wa-worker] cannot connect to database");
  process.exit(1);
}

if (!BOSS_DATABASE_URL) {
  log.fatal("[wa-worker] DATABASE_URL is required");
  process.exit(1);
}

const boss = new PgBoss(BOSS_DATABASE_URL);
boss.on("error", (err) => log.error({ err }, "[wa-worker] pg-boss error"));

await boss.start();
await Promise.all(Object.values(WA_QUEUES).map((queue) => boss.createQueue(queue)));
await Promise.all(Object.values(WA_QUEUES).map((queue) =>
  boss.work(queue, async (jobs) => {
    for (const job of jobs) {
      await handleJob(queue, job.data);
    }
  }),
));

await restoreAllBaileys();
log.info("[wa-worker] queues registered and sessions restored");

const shutdown = async () => {
  log.info("[wa-worker] shutting down...");
  await boss.stop({ graceful: true, timeout: 10_000 }).catch(() => {});
  await Promise.all([pool.end().catch(() => {}), directPool.end().catch(() => {})]);
  log.info("[wa-worker] shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
