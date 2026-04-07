/**
 * OrgLogo — شعار المنشأة / التاجر
 *
 * استخدمه في:
 *   - هيدر صفحة البيع المباشر
 *   - متجر المنشأة
 *   - أي صفحة تعرض بيانات منشأة معينة
 *
 * ممنوع استخدامه في:
 *   - صفحات المنصة العامة
 *   - Landing page الرئيسية
 *   - sidebar الأدمن
 *
 * المصدر المعتمد: config?.logoUrl || org.logo
 * Fallback: حرف أول من اسم المنشأة (لا يستخدم شعار المنصة أبداً)
 */

import type { CSSProperties } from "react";

interface OrgLogoProps {
  src: string | null | undefined;
  orgName: string;
  size?: number;
  style?: CSSProperties;
  fallbackBg?: string;
}

export function OrgLogo({ src, orgName, size = 48, style, fallbackBg = "rgba(255,255,255,0.22)" }: OrgLogoProps) {
  const radius = Math.round(size * 0.25);

  if (src) {
    return (
      <img
        src={src}
        alt={orgName}
        style={{
          width: size, height: size,
          borderRadius: radius,
          objectFit: "contain",
          background: "rgba(255,255,255,0.2)",
          padding: Math.round(size * 0.12),
          display: "block",
          ...style,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: radius,
        background: fallbackBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: Math.round(size * 0.42), fontWeight: 900, color: "#fff",
        flexShrink: 0,
        ...style,
      }}
    >
      {orgName[0] || "؟"}
    </div>
  );
}
