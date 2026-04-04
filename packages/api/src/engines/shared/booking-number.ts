/**
 * Booking Number Generator — Centralized
 * Format: {PREFIX}-{YEAR}-{RANDOM6}
 * Examples: APT-2026-K3X9Q1, STY-2026-W7M2P4, TBL-2026-A5B8C2, EVT-2026-Z1N6R0
 *
 * Uses crypto.getRandomValues — collision-resistant (~2.17B combinations).
 * Replaces the previous SELECT COUNT(*) + 1 approach which caused duplicate
 * booking numbers under concurrent load.
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

export function generateBookingNumber(engine: EngineType): string {
  const year = new Date().getFullYear();
  const arr  = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const random = arr[0].toString(36).padStart(6, "0").substring(0, 6).toUpperCase();
  return `${ENGINE_PREFIXES[engine]}-${year}-${random}`;
}
