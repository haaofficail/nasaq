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
 * إذا فشل التحميل: يعرض حرف "ت" كـ placeholder
 */

import { useState } from "react";
import { usePlatformConfig, PLATFORM_NAME, PLATFORM_LOGO } from "@/hooks/usePlatformConfig";
import { BRAND } from "@/lib/branding";

interface PlatformLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** إذا true يقرأ من API (للصفحات التي تحمّل الـ hook أصلاً) */
  dynamic?: boolean;
}

/** Fallback عند فشل تحميل الصورة — حرف "ت" داخل مربع */
function LogoFallback({ size, className, style }: { size: number; className: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: "#5b9bd5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: Math.round(size * 0.5),
        flexShrink: 0,
        ...style,
      }}
    >
      {BRAND.logoLetter}
    </div>
  );
}

/** نسخة ثابتة — لا تستدعي hook — مناسبة للفوتر والصفحات العامة */
export function PlatformLogoStatic({ size = 24, className = "", style }: Omit<PlatformLogoProps, "dynamic">) {
  const [failed, setFailed] = useState(false);

  if (failed) return <LogoFallback size={size} className={className} style={style} />;

  return (
    <img
      src={PLATFORM_LOGO}
      alt={PLATFORM_NAME}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 6, objectFit: "contain", ...style }}
      onError={() => setFailed(true)}
    />
  );
}

/** نسخة ديناميكية — تقرأ من usePlatformConfig — للـ Layout والـ Landing page */
export function PlatformLogoDynamic({ size = 32, className = "", style }: Omit<PlatformLogoProps, "dynamic">) {
  const config = usePlatformConfig();
  const src = config.logoUrl || PLATFORM_LOGO;
  const [failed, setFailed] = useState(false);

  if (failed) return <LogoFallback size={size} className={className} style={style} />;

  return (
    <img
      src={src}
      alt={config.platformName || PLATFORM_NAME}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 6, objectFit: "contain", ...style }}
      onError={() => setFailed(true)}
    />
  );
}
