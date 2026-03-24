import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ============================================================
// FIELD-LEVEL ENCRYPTION — AES-256-GCM
// Used for sensitive JSON fields (integration credentials, API keys)
//
// Requires env var: ENCRYPTION_KEY — 64 hex chars (32 bytes)
// Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// ============================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // 96 bits recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    // If key is missing, encryption is a no-op (warn once per process)
    return Buffer.alloc(32);
  }
  return Buffer.from(hex, "hex");
}

let warnedOnce = false;
function warnIfNoKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if ((!hex || hex.length !== 64) && !warnedOnce) {
    console.warn("[SECURITY] ENCRYPTION_KEY is not set — credentials stored unencrypted");
    warnedOnce = true;
  }
}

/**
 * Encrypt a JSON-serialisable object.
 * Returns a base64 string: iv(12) + ciphertext + authTag(16)
 * Returns null if input is null/undefined.
 */
export function encryptJson(value: Record<string, unknown> | null | undefined): string | null {
  if (value == null) return null;
  warnIfNoKey();

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: base64(iv || ciphertext || authTag)
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

/**
 * Decrypt a base64 string previously produced by encryptJson.
 * Returns the original object, or null on failure.
 */
export function decryptJson(encoded: string | null | undefined): Record<string, unknown> | null {
  if (!encoded) return null;

  try {
    const buf = Buffer.from(encoded, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(buf.length - TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);

    const key = getKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Detect if a stored value is already encrypted (base64, not plain JSON).
 * Used for graceful migration: reads old plaintext rows without crashing.
 */
export function isEncrypted(value: unknown): boolean {
  if (typeof value !== "string") return false;
  // Encrypted values are base64 strings, not JSON objects/arrays
  try {
    const parsed = JSON.parse(value);
    return typeof parsed !== "object";
  } catch {
    return true; // can't parse as JSON → assume encrypted base64
  }
}

/**
 * Encrypt a plain string field (e.g. API keys, secrets).
 * Wraps the string in { v } before passing to encryptJson.
 * Returns null if value is null/undefined/empty.
 */
export function encryptString(value: string | null | undefined): string | null {
  if (!value) return null;
  return encryptJson({ v: value });
}

/**
 * Decrypt a string previously encrypted with encryptString.
 * Falls back gracefully to the original value if it was never encrypted
 * (supports migration of existing plain-text rows).
 */
export function decryptString(encoded: string | null | undefined): string | null {
  if (!encoded) return null;
  if (!isEncrypted(encoded)) return encoded; // plain-text row — migration safety
  const obj = decryptJson(encoded);
  return obj ? (obj.v as string) ?? null : null;
}
