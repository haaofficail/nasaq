/**
 * FooterComprehensive Block — Page Builder v2 (Day 15)
 *
 * Design: "Comprehensive Footer"
 * Deep navy background. Top section: logo+description on the right, 4 link columns.
 * Social icons row. Bottom bar: copyright + bottom links.
 *
 * RTL: dir=rtl, ps-/pe-
 */
import React from "react";
import type { ComponentConfig } from "@measured/puck";
import {
  Twitter, Instagram, Linkedin, Youtube, Facebook,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

export interface FooterColumnLink {
  label: string;
  url:   string;
}

export interface FooterColumn {
  title: string;
  links: FooterColumnLink[];
}

export interface ComprehensiveSocialLink {
  platform: "twitter" | "instagram" | "linkedin" | "youtube" | "facebook";
  url:      string;
}

export interface FooterComprehensiveProps {
  logoText:    string;
  tagline:     string;
  description: string;
  columns:     FooterColumn[];
  socialLinks: ComprehensiveSocialLink[];
  bottomLinks: FooterColumnLink[];
  copyright:   string;
}

// ── Social icon helper ─────────────────────────────────────────

function SocialIcon({ platform }: { platform: string }) {
  const size = 18;
  switch (platform) {
    case "twitter":   return <Twitter   size={size} aria-hidden="true" />;
    case "instagram": return <Instagram size={size} aria-hidden="true" />;
    case "linkedin":  return <Linkedin  size={size} aria-hidden="true" />;
    case "youtube":   return <Youtube   size={size} aria-hidden="true" />;
    case "facebook":  return <Facebook  size={size} aria-hidden="true" />;
    default:          return null;
  }
}

// ── Main component ─────────────────────────────────────────────

export function FooterComprehensiveBlock({
  logoText,
  tagline,
  description,
  columns,
  socialLinks,
  bottomLinks,
  copyright,
}: FooterComprehensiveProps) {
  return (
    <footer
      dir="rtl"
      data-block="footer-comprehensive"
      className="w-full ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#0D2138",
        color:      "#C9DDEF",
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Top section */}
        <div
          className="py-14 grid gap-10"
          style={{
            gridTemplateColumns: "1fr repeat(auto-fit, minmax(140px, 1fr))",
            display:             "grid",
          }}
        >
          {/* Brand column */}
          <div style={{ maxWidth: "260px" }}>
            <span
              className="font-bold"
              style={{ color: "#ffffff", fontSize: "1.3rem" }}
            >
              {logoText}
            </span>
            {tagline && (
              <p
                className="mt-1"
                style={{ color: "#5b9bd5", fontSize: "0.8rem", fontWeight: 500 }}
              >
                {tagline}
              </p>
            )}
            {description && (
              <p
                className="mt-3"
                style={{ color: "#7AADD4", fontSize: "0.85rem", lineHeight: "1.7" }}
              >
                {description}
              </p>
            )}
          </div>

          {/* Link columns */}
          {columns.map((col, ci) => (
            <div key={ci} data-footer-column="">
              <h4
                className="font-semibold mb-4"
                style={{ color: "#ffffff", fontSize: "0.9rem" }}
              >
                {col.title}
              </h4>
              <ul
                className="flex flex-col gap-2.5"
                style={{ listStyle: "none", margin: 0, padding: 0 }}
              >
                {col.links.map((link, li) => (
                  <li key={li}>
                    <a
                      href={link.url || "#"}
                      style={{
                        color:          "#7AADD4",
                        fontSize:       "0.85rem",
                        textDecoration: "none",
                        lineHeight:     "1.5",
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social icons */}
        {socialLinks.length > 0 && (
          <div
            className="flex items-center gap-3 py-6"
            style={{ borderTop: "1px solid rgba(91,155,213,0.2)" }}
          >
            <span
              style={{ color: "#5289BE", fontSize: "0.8rem", marginInlineEnd: "0.5rem" }}
            >
              تابعنا
            </span>
            <div data-social-links="" className="flex items-center gap-3">
              {socialLinks.map((s, i) => (
                <a
                  key={i}
                  href={s.url || "#"}
                  aria-label={s.platform}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center rounded-lg transition-all duration-200 hover:opacity-70"
                  style={{
                    width:      "36px",
                    height:     "36px",
                    background: "rgba(91,155,213,0.12)",
                    color:      "#5b9bd5",
                    border:     "1px solid rgba(91,155,213,0.25)",
                  }}
                >
                  <SocialIcon platform={s.platform} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 py-5"
          style={{ borderTop: "1px solid rgba(91,155,213,0.2)" }}
        >
          <p style={{ color: "#5289BE", fontSize: "0.8rem" }}>{copyright}</p>

          {bottomLinks.length > 0 && (
            <ul
              className="flex flex-wrap gap-5"
              style={{ listStyle: "none", margin: 0, padding: 0 }}
            >
              {bottomLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.url || "#"}
                    style={{
                      color:          "#5289BE",
                      fontSize:       "0.8rem",
                      textDecoration: "none",
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const FooterComprehensiveConfig: ComponentConfig<FooterComprehensiveProps> = {
  label: "تذييل — شامل",
  fields: {
    logoText:    { type: "text",     label: "اسم الموقع / الشعار" },
    tagline:     { type: "text",     label: "الشعار الفرعي" },
    description: { type: "textarea", label: "وصف قصير" },
    copyright:   { type: "text",     label: "نص حقوق النشر" },
    columns: {
      type:  "array",
      label: "أعمدة الروابط",
      arrayFields: {
        title: { type: "text",  label: "عنوان العمود" },
        links: {
          type:  "array",
          label: "الروابط",
          arrayFields: {
            label: { type: "text", label: "النص" },
            url:   { type: "text", label: "الرابط" },
          },
          defaultItemProps: { label: "رابط", url: "/" },
        },
      },
      defaultItemProps: { title: "قسم", links: [] },
    },
    socialLinks: {
      type:  "array",
      label: "روابط التواصل الاجتماعي",
      arrayFields: {
        platform: { type: "text", label: "المنصة (twitter, instagram, linkedin, youtube, facebook)" },
        url:      { type: "text", label: "الرابط" },
      },
      defaultItemProps: { platform: "twitter", url: "" },
    },
    bottomLinks: {
      type:  "array",
      label: "روابط الشريط السفلي",
      arrayFields: {
        label: { type: "text", label: "النص" },
        url:   { type: "text", label: "الرابط" },
      },
      defaultItemProps: { label: "رابط", url: "/" },
    },
  },
  defaultProps: {
    logoText:    "ترميز OS",
    tagline:     "منصة إدارة الأعمال الذكية للمنشآت السعودية",
    description: "نمكّن المنشآت الصغيرة والمتوسطة من إدارة أعمالها بكفاءة عالية",
    copyright:   "© 2026 ترميز OS. جميع الحقوق محفوظة.",
    columns: [
      {
        title: "عن الشركة",
        links: [
          { label: "من نحن",  url: "/about"  },
          { label: "رؤيتنا", url: "/vision" },
          { label: "فريقنا", url: "/team"   },
        ],
      },
      {
        title: "خدماتنا",
        links: [
          { label: "إدارة المواعيد", url: "/services/bookings"  },
          { label: "إدارة المخزون",  url: "/services/inventory" },
          { label: "التقارير",       url: "/services/reports"   },
        ],
      },
      {
        title: "الدعم",
        links: [
          { label: "الأسئلة الشائعة", url: "/faq"     },
          { label: "اتصل بنا",        url: "/contact" },
          { label: "المدونة",          url: "/blog"    },
        ],
      },
      {
        title: "قانوني",
        links: [
          { label: "سياسة الخصوصية", url: "/privacy" },
          { label: "شروط الخدمة",    url: "/terms"   },
        ],
      },
    ],
    socialLinks: [
      { platform: "twitter",   url: "" },
      { platform: "instagram", url: "" },
      { platform: "linkedin",  url: "" },
      { platform: "youtube",   url: "" },
    ],
    bottomLinks: [
      { label: "سياسة الخصوصية", url: "/privacy" },
      { label: "شروط الخدمة",    url: "/terms"   },
    ],
  },
  render: (props) => <FooterComprehensiveBlock {...props} />,
};
