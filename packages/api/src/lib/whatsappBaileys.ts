import { PgBoss } from "pg-boss";
import fs from "fs";
import path from "path";
import { log } from "./logger";
import { resolveWaSessionDir, WA_BOSS_DATABASE_URL, WA_QUEUE_NAMES, type WaStatus } from "./whatsappBaileys.shared";
import { getPersistedBaileysState } from "./whatsappSessionState";

export interface BaileysState {
  status: WaStatus;
  qrBase64: string | null;
  phone: string | null;
  updatedAt: Date;
}

const EMPTY_STATE: BaileysState = {
  status: "disconnected",
  qrBase64: null,
  phone: null,
  updatedAt: new Date(0),
};

let bossPromise: Promise<PgBoss> | null = null;

async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      if (!WA_BOSS_DATABASE_URL) throw new Error("DATABASE_URL is required for WhatsApp pg-boss producer");
      const boss = new PgBoss(WA_BOSS_DATABASE_URL);
      boss.on("error", (err) => log.error({ err }, "[wa-producer] pg-boss error"));
      await boss.start();
      await Promise.all(Object.values(WA_QUEUE_NAMES).map((queue) => boss.createQueue(queue)));
      return boss;
    })().catch((err) => {
      bossPromise = null;
      throw err;
    });
  }
  return bossPromise;
}

async function enqueue(queue: (typeof WA_QUEUE_NAMES)[keyof typeof WA_QUEUE_NAMES], payload: Record<string, unknown>): Promise<void> {
  const boss = await getBoss();
  await boss.send(queue, payload);
}

export async function initBaileys(orgId: string, force = false): Promise<void> {
  await enqueue(WA_QUEUE_NAMES.INIT, { orgId, force });
}

export async function getBaileysState(orgId: string): Promise<BaileysState> {
  return getPersistedBaileysState(orgId);
}

export async function sendViaBaileys(orgId: string, phone: string, message: string): Promise<boolean> {
  await enqueue(WA_QUEUE_NAMES.SEND_TEXT, { orgId, phone, message });
  return true;
}

export async function sendImageViaBaileys(
  orgId: string,
  phone: string,
  imageBuffer: Buffer,
  caption: string,
): Promise<boolean> {
  await enqueue(WA_QUEUE_NAMES.SEND_IMAGE, {
    orgId,
    phone,
    caption,
    imageBase64: imageBuffer.toString("base64"),
  });
  return true;
}

export async function logoutBaileys(orgId: string): Promise<void> {
  await enqueue(WA_QUEUE_NAMES.LOGOUT, { orgId });
}

export function hasSavedSession(orgId: string): boolean {
  return fs.existsSync(path.join(resolveWaSessionDir(orgId), "creds.json"));
}

export async function restoreAllBaileys(): Promise<void> {
  log.info("[wa-producer] restoreAllBaileys is handled by whatsapp-worker");
}
