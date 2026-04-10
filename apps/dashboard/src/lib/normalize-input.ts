/**
 * Arabic-Indic (٠-٩, U+0660–U+0669) and Persian/Farsi (۰-۹, U+06F0–U+06F9)
 * digit normalization utilities for mobile-first input handling.
 */

/** Convert Arabic-Indic and Persian digits to ASCII (Latin) digits */
export function toLatinDigits(val: string): string {
  return val
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Normalize a numeric string:
 * - Converts Arabic/Persian digits to Latin
 * - Strips everything except digits and a single decimal point
 */
export function normalizeNumeric(val: string): string {
  const converted = toLatinDigits(val);
  // Allow digits and at most one decimal point
  const parts = converted.replace(/[^\d.]/g, "").split(".");
  if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
  return parts.join(".");
}

/**
 * Normalize a phone number string:
 * - Converts Arabic/Persian digits to Latin
 * - Preserves leading zeros (critical: 05... should not become 5...)
 * - Preserves leading + for international format
 * - Strips all non-digit characters except leading +
 */
export function normalizePhone(val: string): string {
  const converted = toLatinDigits(val);
  const hasPlus = converted.startsWith("+");
  // Keep digits only
  const digits = converted.replace(/\D/g, "");
  return hasPlus ? "+" + digits : digits;
}

/**
 * Parse a (potentially Arabic/Persian) numeric string to a float.
 * Returns 0 if the string is not a valid number.
 */
export function parseArabicNumber(val: string): number {
  return parseFloat(normalizeNumeric(val)) || 0;
}
