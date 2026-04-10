/**
 * ترميز OS — Central Branding Configuration
 * All display names, labels, and marketing copy live here.
 * Never change internal identifiers, API endpoints, or DB keys.
 */

import platformLogoSvg from "@/assets/platform-logo.svg";

export const BRAND = {
  nameAr:  "ترميز OS",
  nameEn:  "Nasaq",
  product: "ترميز OS",
  tagline: "لخدمات الأعمال",
  taglineLong: "منصة متكاملة لإدارة وتشغيل وبيع الأعمال",
  welcomeAr: "مرحبًا بك في ترميز OS",
  copyright: `© ${new Date().getFullYear()} ترميز OS. جميع الحقوق محفوظة.`,
  /** الحرف المستخدم كـ fallback عند عدم وجود شعار */
  logoLetter: "ت",
} as const;

/**
 * شعار المنصة الافتراضي — مُعالج عبر Vite asset pipeline.
 * يعمل في dev و production بغض النظر عن base path أو إعدادات السيرفر.
 */
export const DEFAULT_PLATFORM_LOGO: string = platformLogoSvg;

/**
 * معالج خطأ تحميل الشعار — يُخفي الصورة ويعرض حرف fallback بدلاً منها.
 * يُستخدم في كل أماكن عرض الشعار لضمان عدم ظهور صورة مكسورة.
 *
 * @param fontSize حجم الخط (بالبكسل) للحرف البديل — يعتمد على حجم الحاوية
 * @param applyBg إذا true يضع خلفية brand على الحاوية (للحالات بدون خلفية)
 */
export function handleLogoError(fontSize = 14, applyBg = false) {
  return (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    img.style.display = "none";
    const parent = img.parentElement;
    if (parent && !parent.querySelector("[data-logo-fallback]")) {
      if (applyBg) parent.style.background = "#5b9bd5";
      const span = document.createElement("span");
      span.setAttribute("data-logo-fallback", "true");
      span.textContent = BRAND.logoLetter;
      span.style.cssText = `color:#fff;font-weight:800;font-size:${fontSize}px`;
      parent.appendChild(span);
    }
  };
}
