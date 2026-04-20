import { createHmac, timingSafeEqual } from "crypto";

/**
 * يتحقق من Moyasar webhook signature.
 *
 * الفرضية (log mode — لم تُؤكَّد بـ test vector رسمي):
 * - HMAC-SHA256 على raw request body
 * - مقارنة hex strings عبر timingSafeEqual
 *
 * إذا اختلف طول الـ signature → false فوراً (timingSafeEqual يحتاج نفس الطول)
 */
export function verifyMoyasarSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (signature.length !== expected.length) return false;
    return timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expected, "utf8"),
    );
  } catch {
    return false;
  }
}
