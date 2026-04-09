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
 *
 * تصميم الفصل البصري:
 *   - الشعار دائمًا في حاوية بيضاء (bg-white) مستقلة بصرياً
 *   - النص له لون صريح — لا يعتمد على توريث اللون من الأب
 *   - variant: "default" (نص غامق) | "dark" (نص فاتح للخلفيات الداكنة)
 */

import { usePlatformConfig, PLATFORM_NAME, PLATFORM_LOGO } from "@/hooks/usePlatformConfig";
import { BRAND, handleLogoError } from "@/lib/branding";

/** نوع المتغير البصري — default للخلفيات الفاتحة، dark للداكنة */
export type BrandVariant = "default" | "dark";

interface PlatformLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** نسخة ثابتة — لا تستدعي hook — مناسبة للفوتر والصفحات العامة التي لا تحتاج API */
export function PlatformLogoStatic({ size = 24, className = "", style }: PlatformLogoProps) {
  return (
    <div
      className={`inline-flex items-center justify-center bg-white rounded-lg overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      <img
        src={PLATFORM_LOGO}
        alt={PLATFORM_NAME}
        width={size}
        height={size}
        className="w-full h-full object-contain"
        style={{ borderRadius: 6 }}
        onError={handleLogoError(Math.round(size * 0.5))}
      />
    </div>
  );
}

/** نسخة ديناميكية — تقرأ من usePlatformConfig — تعرض الشعار المرفوع من الأدمن أولاً */
export function PlatformLogoDynamic({ size = 32, className = "", style }: PlatformLogoProps) {
  const config = usePlatformConfig();
  const src = config.logoUrl || PLATFORM_LOGO;
  return (
    <div
      className={`inline-flex items-center justify-center bg-white rounded-lg overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      <img
        src={src}
        alt={config.platformName || PLATFORM_NAME}
        width={size}
        height={size}
        className="w-full h-full object-contain"
        style={{ borderRadius: 6 }}
        onError={handleLogoError(Math.round(size * 0.5))}
      />
    </div>
  );
}

/* ─── PlatformBrand: شعار + نص مدمج ─────────────────────────────────────────── */

interface PlatformBrandProps {
  /** حجم الشعار (بكسل) */
  logoSize?: number;
  /** حجم النص */
  textSize?: "sm" | "base" | "lg" | "xl" | "2xl";
  /** المتغير البصري — default للخلفيات الفاتحة، dark للداكنة */
  variant?: BrandVariant;
  /** كلاسات إضافية على الحاوية الخارجية */
  className?: string;
  /** إظهار النص بجانب الشعار */
  showText?: boolean;
  /** نص مخصص بدل الافتراضي */
  label?: string;
}

const TEXT_SIZE_MAP: Record<string, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

const TEXT_COLOR_MAP: Record<BrandVariant, string> = {
  default: "text-gray-900",
  dark: "text-white",
};

/** شعار + اسم المنصة — مكوّن مستقل بصرياً لا يتأثر بتوريث الألوان */
export function PlatformBrandStatic({
  logoSize = 32,
  textSize = "lg",
  variant = "default",
  className = "",
  showText = true,
  label,
}: PlatformBrandProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <PlatformLogoStatic size={logoSize} />
      {showText && (
        <span className={`font-bold tracking-tight ${TEXT_SIZE_MAP[textSize] || "text-lg"} ${TEXT_COLOR_MAP[variant]}`}>
          {label || BRAND.nameAr}
        </span>
      )}
    </div>
  );
}

/** شعار + اسم المنصة (ديناميكي — يقرأ الاسم والشعار من الإعدادات) */
export function PlatformBrandDynamic({
  logoSize = 32,
  textSize = "lg",
  variant = "default",
  className = "",
  showText = true,
  label,
}: PlatformBrandProps) {
  const config = usePlatformConfig();
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <PlatformLogoDynamic size={logoSize} />
      {showText && (
        <span className={`font-bold tracking-tight ${TEXT_SIZE_MAP[textSize] || "text-lg"} ${TEXT_COLOR_MAP[variant]}`}>
          {label || config.platformName || BRAND.nameAr}
        </span>
      )}
    </div>
  );
}
