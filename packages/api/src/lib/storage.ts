// ============================================================
// Storage / CDN helpers — مصدر الحقيقة الواحد لروابط الأصول
//
// الأولوية في قراءة الـ base URL:
//   1. CDN_URL          — Cloudflare CDN zone (لو مفعّل)
//   2. R2_PUBLIC_URL    — R2 public endpoint المباشر
//   3. fallback         — https://files.nasaq.sa
//
// للتفعيل: أضف CDN_URL=https://cdn.nasaq.sa في env
// ============================================================

function resolveBase(): string {
  const raw =
    process.env.CDN_URL?.trim() ||
    process.env.R2_PUBLIC_URL?.trim() ||
    "https://files.nasaq.sa";
  return raw.replace(/\/$/, ""); // أزل / الزائدة
}

/** Base URL لخدمة الأصول — يُستخدم في توليد الروابط */
export const ASSET_BASE_URL: string = resolveBase();

/** رابط أصل عام من المفتاح (key) */
export function assetUrl(key: string): string {
  return `${ASSET_BASE_URL}/${key}`;
}

/** رابط الـ thumbnail (Cloudflare Image Resizing) */
export function thumbUrl(key: string): string {
  return `${ASSET_BASE_URL}/thumb/${key}`;
}

/** رابط upload presigned (لـ uploads.ts) */
export function uploadUrl(key: string): string {
  return `${ASSET_BASE_URL}/upload/${key}`;
}

/** تحقق أن publicUrl ينتمي للـ domain المصرّح */
export function isAllowedPublicUrl(url: string): boolean {
  return url.startsWith(ASSET_BASE_URL);
}
