/**
 * PlatformLogo — شعار المنصة (ترميز OS)
 *
 * المصدر الموحد لعرض شعار المنصة في جميع الصفحات.
 *
 * استخدمه في:
 *   - Landing page
 *   - PublicLayout (header + footer)
 *   - Layout (sidebar)
 *   - LoginPage / AdminLoginPage / OnboardingPage
 *   - أي صفحة تخص المنصة نفسها
 *
 * ممنوع استخدامه في:
 *   - هيدر صفحات التاجر
 *   - متجر المنشأة
 *   - أي صفحة تخص بيانات منشأة معينة
 *
 * سلسلة الشعار:
 *   1. platformConfig.logoUrl (المرفوع من الأدمن — يُقدَّم عبر /api/v1/platform-assets/)
 *   2. DEFAULT_PLATFORM_LOGO (مُستورد من src/assets/ عبر Vite — مضمون في dist)
 *   3. حرف "ت" كـ fallback نصي عند فشل تحميل الصورة
 */

import { usePlatformConfig, PLATFORM_NAME, PLATFORM_LOGO } from "@/hooks/usePlatformConfig";
import { BRAND, handleLogoError } from "@/lib/branding";

interface PlatformLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** نسخة ثابتة — لا تستدعي hook — مناسبة للفوتر والصفحات العامة التي لا تحتاج API */
export function PlatformLogoStatic({ size = 24, className = "", style }: PlatformLogoProps) {
  return (
    <img
      src={PLATFORM_LOGO}
      alt={PLATFORM_NAME}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 6, objectFit: "contain", ...style }}
      onError={handleLogoError(Math.round(size * 0.5))}
    />
  );
}

/** نسخة ديناميكية — تقرأ من usePlatformConfig — تعرض الشعار المرفوع من الأدمن أولاً */
export function PlatformLogoDynamic({ size = 32, className = "", style }: PlatformLogoProps) {
  const config = usePlatformConfig();
  const src = config.logoUrl || PLATFORM_LOGO;
  return (
    <img
      src={src}
      alt={config.platformName || PLATFORM_NAME}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 6, objectFit: "contain", ...style }}
      onError={handleLogoError(Math.round(size * 0.5))}
    />
  );
}
