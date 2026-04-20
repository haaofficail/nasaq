/**
 * FooterMinimal Block — Page Builder v2 (Day 15)
 *
 * Design: "Minimal Footer"
 * Light white background. Horizontal layout: logo+tagline on the right,
 * nav links in the middle, social icons on the left. Copyright bar below.
 *
 * RTL: dir=rtl, ps-/pe-
 */
import React from "react";
import type { ComponentConfig } from "@measured/puck";
import {
  Twitter, Instagram, Linkedin, Youtube, Facebook,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

export interface FooterLink {
  label: string;
  url:   string;
}

export interface FooterSocialLink {
  platform: "twitter" | "instagram" | "linkedin" | "youtube" | "facebook";
  url:      string;
}

export interface FooterMinimalProps {
  logoText:    string;
  tagline:     string;
  copyright:   string;
  links:       FooterLink[];
  socialLinks: FooterSocialLink[];
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

export function FooterMinimalBlock({
  logoText,
  tagline,
  copyright,
  links,
  socialLinks,
}: FooterMinimalProps) {
  return (
    <footer
      dir="rtl"
      data-block="footer-minimal"
      className="w-full py-8 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#ffffff",
        borderTop:  "1.5px solid #E3EFF9",
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Main row */}
        <div
          className="flex flex-wrap items-center justify-between gap-6"
          style={{ marginBottom: links.length || socialLinks.length ? "1.5rem" : 0 }}
        >
          {/* Logo + tagline */}
          <div>
            <span
              className="font-bold"
              style={{ color: "#0D2138", fontSize: "1.15rem" }}
            >
              {logoText}
            </span>
            {tagline && (
              <p
                className="mt-0.5"
                style={{ color: "#2F6190", fontSize: "0.8rem" }}
              >
                {tagline}
              </p>
            )}
          </div>

          {/* Nav links */}
          {links.length > 0 && (
            <nav data-footer-links="">
              <ul className="flex flex-wrap gap-5" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {links.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.url || "#"}
                      style={{
                        color:          "#2F6190",
                        fontSize:       "0.875rem",
                        textDecoration: "none",
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Social icons */}
          {socialLinks.length > 0 && (
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
                    background: "#F0F6FC",
                    color:      "#2F6190",
                    border:     "1px solid #C9DDEF",
                  }}
                >
                  <SocialIcon platform={s.platform} />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Copyright bar */}
        <div
          data-copyright=""
          className="pt-5"
          style={{
            borderTop: "1px solid #E3EFF9",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#5289BE", fontSize: "0.8rem" }}>{copyright}</p>
        </div>
      </div>
    </footer>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const FooterMinimalConfig: ComponentConfig<FooterMinimalProps> = {
  label: "تذييل — بسيط",
  fields: {
    logoText:  { type: "text",     label: "اسم الموقع / الشعار" },
    tagline:   { type: "text",     label: "الشعار الفرعي" },
    copyright: { type: "text",     label: "نص حقوق النشر" },
    links: {
      type:  "array",
      label: "روابط التنقل",
      arrayFields: {
        label: { type: "text", label: "النص" },
        url:   { type: "text", label: "الرابط" },
      },
      defaultItemProps: { label: "رابط", url: "/" },
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
  },
  defaultProps: {
    logoText:  "ترميز OS",
    tagline:   "منصة إدارة الأعمال الذكية",
    copyright: "© 2026 ترميز OS. جميع الحقوق محفوظة.",
    links: [
      { label: "الرئيسية",         url: "/" },
      { label: "الخدمات",         url: "/services" },
      { label: "سياسة الخصوصية", url: "/privacy" },
      { label: "اتصل بنا",       url: "/contact" },
    ],
    socialLinks: [
      { platform: "twitter",   url: "" },
      { platform: "instagram", url: "" },
      { platform: "linkedin",  url: "" },
    ],
  },
  render: (props) => <FooterMinimalBlock {...props} />,
};
