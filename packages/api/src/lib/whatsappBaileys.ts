import { PgBoss } from "pg-boss";
import fs from "fs";
import path from "path";
import { pool } from "@nasaq/db/client";
import { log } from "./logger";

export type WaStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

export interface BaileysState {
  status: WaStatus;
  qrBase64: string | null;
  phone: string | null;
  updatedAt: Date;
}

const WA_QUEUES = {
  INIT: "wa-init-session",
  SEND_TEXT: "wa-send-text",
  SEND_IMAGE: "wa-send-image",
  LOGOUT: "wa-logout",
} as const;

const SESSIONS_DIR =
  process.env.WA_SESSIONS_DIR ?? "/var/www/nasaq/whatsapp-sessions";
const BOSS_DATABASE_URL = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

const PLATFORM_STATE_TARGET_ID = "platform-whatsapp-state";
const EMPTY_STATE: BaileysState = {
  status: "disconnected",
  qrBase64: null,
  phone: null,
  updatedAt: new Date(0),
};

let bossPromise: Promise<PgBoss> | null = null;

function resolveSessionDir(orgId: string): string {
  const baseDir = path.resolve(SESSIONS_DIR);
  const resolved = path.resolve(baseDir, orgId);
  if (!resolved.startsWith(`${baseDir}${path.sep}`)) {
    throw new Error("Invalid WhatsApp session id");
  }
  return resolved;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      if (!BOSS_DATABASE_URL) throw new Error("DATABASE_URL is required for WhatsApp pg-boss producer");
      const boss = new PgBoss(BOSS_DATABASE_URL);
      boss.on("error", (err) => log.error({ err }, "[wa-producer] pg-boss error"));
      await boss.start();
      await Promise.all(Object.values(WA_QUEUES).map((queue) => boss.createQueue(queue)));
      return boss;
    })().catch((err) => {
      bossPromise = null;
      throw err;
    });
  }
  return bossPromise;
}

async function enqueue(queue: (typeof WA_QUEUES)[keyof typeof WA_QUEUES], payload: Record<string, unknown>): Promise<void> {
  const boss = await getBoss();
  await boss.send(queue, payload);
}

function toState(row: { status?: string | null; qrBase64?: string | null; phone?: string | null; updatedAt?: Date | string | null } | null | undefined): BaileysState {
  if (!row?.status) return { ...EMPTY_STATE, updatedAt: new Date() };
  return {
    status: (row.status as WaStatus) ?? "disconnected",
    qrBase64: row.qrBase64 ?? null,
    phone: row.phone ?? null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
  };
}

async function getPersistedPlatformState(): Promise<BaileysState> {
  try {
    const result = await pool.query<{ actions: { status?: WaStatus; qrBase64?: string | null; phone?: string | null; updatedAt?: string | null } }>(
      `SELECT actions
         FROM rule_definitions
        WHERE scope = 'global'
          AND target_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [PLATFORM_STATE_TARGET_ID],
    );

    const state = result.rows[0]?.actions;
    return toState(state ? {
      status: state.status,
      qrBase64: state.qrBase64 ?? null,
      phone: state.phone ?? null,
      updatedAt: state.updatedAt ?? null,
    } : null);
  } catch (err) {
    log.warn({ err }, "[wa-producer] platform state lookup failed");
    return { ...EMPTY_STATE, updatedAt: new Date() };
  }
}

async function getPersistedOrgState(orgId: string): Promise<BaileysState> {
  try {
    const result = await pool.query<{ status: WaStatus; qr_code: string | null; phone: string | null; updated_at: Date }>(
      `SELECT status, qr_code, phone, updated_at
         FROM whatsapp_sessions
        WHERE org_id = $1
        LIMIT 1`,
      [orgId],
    );

    const row = result.rows[0];
    return toState(row ? {
      status: row.status,
      qrBase64: row.qr_code,
      phone: row.phone,
      updatedAt: row.updated_at,
    } : null);
  } catch (err) {
    log.warn({ err, orgId }, "[wa-producer] org state lookup failed");
    return { ...EMPTY_STATE, updatedAt: new Date() };
  }
}

export async function initBaileys(orgId: string, force = false): Promise<void> {
  await enqueue(WA_QUEUES.INIT, { orgId, force });
}

export async function getBaileysState(orgId: string): Promise<BaileysState> {
  if (orgId === "platform" || !isUuid(orgId)) {
    return getPersistedPlatformState();
  }
  return getPersistedOrgState(orgId);
}

export async function sendViaBaileys(orgId: string, phone: string, message: string): Promise<boolean> {
  await enqueue(WA_QUEUES.SEND_TEXT, { orgId, phone, message });
  return true;
}

export async function sendImageViaBaileys(
  orgId: string,
  phone: string,
  imageBuffer: Buffer,
  caption: string,
): Promise<boolean> {
  await enqueue(WA_QUEUES.SEND_IMAGE, {
    orgId,
    phone,
    caption,
    imageBase64: imageBuffer.toString("base64"),
  });
  return true;
}

export async function logoutBaileys(orgId: string): Promise<void> {
  await enqueue(WA_QUEUES.LOGOUT, { orgId });
}

export function hasSavedSession(orgId: string): boolean {
  return fs.existsSync(path.join(resolveSessionDir(orgId), "creds.json"));
}

export async function restoreAllBaileys(): Promise<void> {
  log.info("[wa-producer] restoreAllBaileys is handled by whatsapp-worker");
}
