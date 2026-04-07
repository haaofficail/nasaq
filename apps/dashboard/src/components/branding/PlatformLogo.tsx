/**
 * PlatformLogo — شعار المنصة (ترميز OS)
 *
 * استخدمه في:
 *   - Landing page
 *   - فوتر صفحات المنصة العامة
 *   - Layout (sidebar)
 *   - أي صفحة تخص المنصة نفسها
 *
 * ممنوع استخدامه في:
 *   - هيدر صفحات التاجر
 *   - متجر المنشأة
 *   - أي صفحة تخص بيانات منشأة معينة
 *
 * المصدر الوحيد المعتمد: usePlatformConfig → platformConfig.logoUrl
 * Fallback: /favicon.svg (شعار المنصة الافتراضي)
 */

import { usePlatformConfig, PLATFORM_NAME, PLATFORM_LOGO } from "@/hooks/usePlatformConfig";

interface PlatformLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** إذا true يقرأ من API (للصفحات التي تحمّل الـ hook أصلاً) */
  dynamic?: boolean;
}

/** نسخة ثابتة — لا تستدعي hook — مناسبة للفوتر والصفحات العامة */
export function PlatformLogoStatic({ size = 24, className = "", style }: Omit<PlatformLogoProps, "dynamic">) {
  return (
    <img
      src={PLATFORM_LOGO}
      alt={PLATFORM_NAME}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 6, objectFit: "contain", ...style }}
    />
  );
}

/** نسخة ديناميكية — تقرأ من usePlatformConfig — للـ Layout والـ Landing page */
export function PlatformLogoDynamic({ size = 32, className = "", style }: Omit<PlatformLogoProps, "dynamic">) {
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
    />
  );
}
