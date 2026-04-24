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
import { persistBaileysState } from "../lib/whatsappSessionState";
import {
  isUuid,
  resolveWaSessionDir,
  WA_BOSS_DATABASE_URL,
  WA_PLATFORM_STATE_TARGET_ID,
  WA_QUEUE_NAMES,
  WA_SESSIONS_DIR,
  type WaStatus,
} from "../lib/whatsappBaileys.shared";

const RESTORE_DELAY_MS = 500;
const RECONNECT_BACKOFF_BASE_MS = 5_000;
const RECONNECT_BACKOFF_MAX_MS = 60_000;
const SHUTDOWN_TIMEOUT_MS = 10_000;
type QueueName = (typeof WA_QUEUE_NAMES)[keyof typeof WA_QUEUE_NAMES];

const SILENT_BAILEYS_LOGGER = {
  level: "silent",
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => SILENT_BAILEYS_LOGGER,
} as any;

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

function ensureDir(orgId: string): string {
  const dir = resolveWaSessionDir(orgId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function hasSavedSession(orgId: string): boolean {
  return fs.existsSync(path.join(resolveWaSessionDir(orgId), "creds.json"));
}

function getRandomizedDelayMs(baseMs: number): number {
  return baseMs + Math.floor(Math.random() * baseMs);
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

async function touch(orgId: string, patch: Partial<Session>): Promise<Session> {
  const sess = get(orgId);
  Object.assign(sess, patch, { updatedAt: new Date() });
  await persistBaileysState(orgId, {
    status: sess.status,
    qrBase64: sess.qrBase64,
    phone: sess.phone,
    updatedAt: sess.updatedAt,
    generation: sess.generation,
    retryCount: sess.retryCount,
  });
  return sess;
}

function normalizeJid(phone: string): string {
  return `${phone.replace(/\+/g, "").replace(/\s/g, "")}@s.whatsapp.net`;
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
    logger: SILENT_BAILEYS_LOGGER,
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
        fs.rmSync(resolveWaSessionDir(orgId), { recursive: true, force: true });
        await touch(orgId, { status: "disconnected", phone: null, retryCount: 0 });
        return;
      }

      const retries = (get(orgId).retryCount ?? 0) + 1;
      await touch(orgId, { status: "disconnected", retryCount: retries });

      if (retries > 5) {
        log.warn({ orgId, retries }, "[wa-worker] max retries reached");
      } else if (hasSavedSession(orgId)) {
        const backoffMs = Math.min(RECONNECT_BACKOFF_BASE_MS * retries, RECONNECT_BACKOFF_MAX_MS);
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

  fs.rmSync(resolveWaSessionDir(orgId), { recursive: true, force: true });
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
  if (!fs.existsSync(WA_SESSIONS_DIR)) return;
  const dirs = fs.readdirSync(WA_SESSIONS_DIR).filter((dir) =>
    fs.statSync(path.join(WA_SESSIONS_DIR, dir)).isDirectory() &&
    fs.existsSync(path.join(WA_SESSIONS_DIR, dir, "creds.json")),
  );

  for (const orgId of dirs) {
    await new Promise((resolve) => setTimeout(resolve, getRandomizedDelayMs(RESTORE_DELAY_MS)));
    initSession(orgId).catch((err) => log.error({ err, orgId }, "[wa-worker] restore failed"));
  }
}

async function handleJob(queue: QueueName, data: unknown): Promise<void> {
  switch (queue) {
    case WA_QUEUE_NAMES.INIT:
      await initSession((data as InitJob).orgId, (data as InitJob).force ?? false);
      return;
    case WA_QUEUE_NAMES.SEND_TEXT:
      await sendText(data as SendTextJob);
      return;
    case WA_QUEUE_NAMES.SEND_IMAGE:
      await sendImage(data as SendImageJob);
      return;
    case WA_QUEUE_NAMES.LOGOUT:
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

if (!WA_BOSS_DATABASE_URL) {
  log.fatal("[wa-worker] DIRECT_DATABASE_URL or DATABASE_URL is required");
  process.exit(1);
}

const boss = new PgBoss(WA_BOSS_DATABASE_URL);
boss.on("error", (err) => log.error({ err }, "[wa-worker] pg-boss error"));

await boss.start();
await Promise.all(Object.values(WA_QUEUE_NAMES).map((queue) => boss.createQueue(queue)));
await Promise.all(Object.values(WA_QUEUE_NAMES).map((queue) =>
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
  await boss.stop({ graceful: true, timeout: SHUTDOWN_TIMEOUT_MS }).catch(() => {});
  await Promise.all([pool.end().catch(() => {}), directPool.end().catch(() => {})]);
  log.info("[wa-worker] shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
