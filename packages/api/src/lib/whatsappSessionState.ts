import { pool } from "@nasaq/db/client";
import { log } from "./logger";
import { isUuid, WA_PLATFORM_STATE_TARGET_ID, type WaStatus } from "./whatsappBaileys.shared";

export interface PersistedBaileysState {
  status: WaStatus;
  qrBase64: string | null;
  phone: string | null;
  updatedAt: Date;
}

interface PersistStateInput extends PersistedBaileysState {
  generation?: number;
  retryCount?: number;
}

const EMPTY_STATE: PersistedBaileysState = {
  status: "disconnected",
  qrBase64: null,
  phone: null,
  updatedAt: new Date(0),
};

function toState(row: { status?: string | null; qrBase64?: string | null; phone?: string | null; updatedAt?: Date | string | null } | null | undefined): PersistedBaileysState {
  if (!row?.status) return { ...EMPTY_STATE, updatedAt: new Date() };
  return {
    status: (row.status as WaStatus) ?? "disconnected",
    qrBase64: row.qrBase64 ?? null,
    phone: row.phone ?? null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
  };
}

export async function getPersistedBaileysState(orgId: string): Promise<PersistedBaileysState> {
  if (orgId === "platform" || !isUuid(orgId)) {
    try {
      const result = await pool.query<{ actions: { status?: WaStatus; qrBase64?: string | null; phone?: string | null; updatedAt?: string | null } }>(
        `SELECT actions
           FROM rule_definitions
          WHERE scope = 'global'
            AND target_id = $1
          ORDER BY created_at DESC
          LIMIT 1`,
        [WA_PLATFORM_STATE_TARGET_ID],
      );

      const state = result.rows[0]?.actions;
      return toState(state ? {
        status: state.status,
        qrBase64: state.qrBase64 ?? null,
        phone: state.phone ?? null,
        updatedAt: state.updatedAt ?? null,
      } : null);
    } catch (err) {
      log.warn({ err }, "[wa-state] platform state lookup failed");
      return { ...EMPTY_STATE, updatedAt: new Date() };
    }
  }

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
    log.warn({ err, orgId }, "[wa-state] org state lookup failed");
    return { ...EMPTY_STATE, updatedAt: new Date() };
  }
}

export async function persistBaileysState(orgId: string, state: PersistStateInput): Promise<void> {
  if (orgId === "platform" || !isUuid(orgId)) {
    const payload = {
      status: state.status,
      qrBase64: state.qrBase64,
      phone: state.phone,
      updatedAt: state.updatedAt.toISOString(),
    };

    const existing = await pool.query<{ id: string }>(
      `SELECT id
         FROM rule_definitions
        WHERE scope = 'global'
          AND target_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [WA_PLATFORM_STATE_TARGET_ID],
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
          WA_PLATFORM_STATE_TARGET_ID,
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
        WA_PLATFORM_STATE_TARGET_ID,
      ],
    );
    return;
  }

  const connectedAt = state.status === "connected" ? state.updatedAt : null;
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
      state.phone,
      JSON.stringify({ generation: state.generation ?? 0, retryCount: state.retryCount ?? 0 }),
      state.status,
      state.qrBase64,
      connectedAt,
    ],
  );
}
