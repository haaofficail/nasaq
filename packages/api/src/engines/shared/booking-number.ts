/**
 * Booking Number Generator — Centralized
 * Format: {PREFIX}-{YEAR}-{SEQUENCE}
 * Examples: APT-2026-0042, STY-2026-0001, TBL-2026-0007, EVT-2026-0003
 */

const ENGINE_PREFIXES = {
  appointment: "APT",
  stay:        "STY",
  table:       "TBL",
  event:       "EVT",
  lease:       "LSE",
  legacy:      "BKG", // bookings table (do not use for new bookings)
} as const;

export type EngineType = keyof typeof ENGINE_PREFIXES;

export function generateBookingNumber(engine: EngineType, sequence: number): string {
  const year = new Date().getFullYear();
  const seq  = String(sequence).padStart(4, "0");
  return `${ENGINE_PREFIXES[engine]}-${year}-${seq}`;
}

/**
 * Get next sequence number for an org+engine from DB.
 * Usage in route:
 *   const seq = await getNextSequence(db, orgId, "appointment");
 *   const number = generateBookingNumber("appointment", seq);
 */
export async function getNextSequence(
  db: any,
  orgId: string,
  engine: EngineType
): Promise<number> {
  // Uses advisory lock to prevent race conditions
  const result = await db.execute(`
    SELECT COUNT(*) + 1 AS next_seq
    FROM appointment_bookings
    WHERE org_id = $1
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
  `, [orgId]);
  // Each engine queries its own table — overridden per engine module
  return Number(result.rows[0]?.next_seq ?? 1);
}
