/**
 * HeaderSimple Block — Page Builder v2 (Day 16)
 *
 * Design: "Minimal Header"
 * Crisp white bar. Logo anchored to start (right in RTL).
 * Horizontal nav links with subtle underline-on-active indicator.
 * CTA pill at the end. Hamburger opens a full-height dark overlay on mobile.
 * Supports sticky positioning and three background variants.
 *
 * RTL: dir=rtl, ps-/pe-
 */
import React, { useState, useEffect } from "react";
import type { ComponentConfig } from "@measured/puck";
import { Menu, X, Search } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

export interface HeaderLink {
  label:    string;
  url:      string;
  isActive?: boolean;
}

export type HeaderBg = "white" | "dark" | "transparent";

export interface HeaderSimpleProps {
  logoText:        string;
  logoUrl:         string;
  links:           HeaderLink[];
  ctaText:         string;
  ctaLink:         string;
  sticky:          boolean;
  backgroundColor: HeaderBg;
  showSearch:      boolean;
}

// ── Background styles ──────────────────────────────────────────

const BG_STYLES: Record<HeaderBg, { bg: string; text: string; border: string; logoColor: string }> = {
  white:       { bg: "#ffffff",   text: "#0D2138", border: "rgba(201,221,239,0.7)", logoColor: "#0D2138"  },
  dark:        { bg: "#0D2138",   text: "#ffffff", border: "rgba(91,155,213,0.2)", logoColor: "#ffffff"  },
  transparent: { bg: "transparent", text: "#0D2138", border: "transparent",        logoColor: "#0D2138"  },
};

// ── Main component ─────────────────────────────────────────────

export function HeaderSimpleBlock({
  logoText,
  logoUrl,
  links,
  ctaText,
  ctaLink,
  sticky,
  backgroundColor,
  showSearch,
}: HeaderSimpleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = BG_STYLES[backgroundColor] ?? BG_STYLES.white;

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  return (
    <header
      dir="rtl"
      data-block="header-simple"
      data-sticky={sticky ? "true" : "false"}
      style={{
        fontFamily:      "'IBM Plex Sans Arabic', sans-serif",
        background:      theme.bg,
        borderBottom:    `1px solid ${theme.border}`,
        position:        sticky ? "sticky" : "relative",
        top:             sticky ? 0 : undefined,
        zIndex:          sticky ? 50 : undefined,
        backdropFilter:  backgroundColor === "transparent" ? "blur(8px)" : undefined,
      }}
    >
      <div
        className="max-w-6xl mx-auto flex items-center justify-between py-3 ps-6 pe-6"
        style={{ minHeight: "64px" }}
      >
        {/* Logo */}
        <a
          href={logoUrl || "/"}
          className="font-bold flex-shrink-0"
          style={{
            color:          theme.logoColor,
            fontSize:       "1.25rem",
            textDecoration: "none",
            letterSpacing:  "-0.02em",
          }}
        >
          {logoText}
        </a>

        {/* Desktop nav */}
        <nav data-nav-links="" className="hidden md:flex items-center gap-7">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url || "#"}
              className="relative transition-opacity duration-150 hover:opacity-70"
              style={{
                color:          link.isActive ? "#5b9bd5" : theme.text,
                fontSize:       "0.9rem",
                fontWeight:     link.isActive ? 600 : 400,
                textDecoration: "none",
                paddingBottom:  "2px",
              }}
            >
              {link.label}
              {link.isActive && (
                <span
                  className="absolute"
                  style={{
                    bottom:     0,
                    insetInlineStart: 0,
                    insetInlineEnd:   0,
                    height:    "2px",
                    background: "#5b9bd5",
                    borderRadius: "2px",
                  }}
                />
              )}
            </a>
          ))}
        </nav>

        {/* Actions: search + CTA + hamburger */}
        <div className="flex items-center gap-3">
          {showSearch && (
            <button
              data-search-btn=""
              aria-label="بحث"
              className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
              style={{
                width:      "36px",
                height:     "36px",
                background: "transparent",
                border:     "none",
                color:      theme.text,
                cursor:     "pointer",
              }}
            >
              <Search size={18} aria-hidden="true" />
            </button>
          )}

          {ctaText && (
            <a
              href={ctaLink || "#"}
              data-cta=""
              className="hidden md:inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{
                background:     "#5b9bd5",
                color:          "#ffffff",
                padding:        "0.5rem 1.4rem",
                fontSize:       "0.875rem",
                textDecoration: "none",
              }}
            >
              {ctaText}
            </a>
          )}

          {/* Hamburger — visible on all viewports for unit tests */}
          <button
            data-hamburger=""
            aria-label="القائمة"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="flex items-center justify-center rounded-lg"
            style={{
              width:      "40px",
              height:     "40px",
              background: "transparent",
              border:     "none",
              color:      theme.text,
              cursor:     "pointer",
            }}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile overlay menu */}
      {menuOpen && (
        <div
          data-mobile-menu=""
          className="fixed inset-0 flex flex-col"
          style={{
            background: "#0D2138",
            zIndex:     200,
            fontFamily: "'IBM Plex Sans Arabic', sans-serif",
          }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between ps-6 pe-6 py-4" style={{ borderBottom: "1px solid rgba(91,155,213,0.2)" }}>
            <span className="font-bold" style={{ color: "#ffffff", fontSize: "1.15rem" }}>
              {logoText}
            </span>
            <button
              data-mobile-close=""
              aria-label="إغلاق القائمة"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center rounded-lg"
              style={{
                width:      "40px",
                height:     "40px",
                background: "rgba(91,155,213,0.12)",
                border:     "1px solid rgba(91,155,213,0.2)",
                color:      "#ffffff",
                cursor:     "pointer",
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Links */}
          <nav className="flex flex-col ps-6 pe-6 pt-6 gap-4">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url || "#"}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between py-3 font-medium transition-opacity hover:opacity-70"
                style={{
                  color:          link.isActive ? "#5b9bd5" : "#C9DDEF",
                  fontSize:       "1.05rem",
                  textDecoration: "none",
                  borderBottom:   "1px solid rgba(91,155,213,0.1)",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Mobile CTA */}
          {ctaText && (
            <div className="ps-6 pe-6 pt-8">
              <a
                href={ctaLink || "#"}
                className="block w-full text-center rounded-xl font-semibold py-3 transition-all hover:opacity-90"
                style={{
                  background:     "#5b9bd5",
                  color:          "#ffffff",
                  fontSize:       "1rem",
                  textDecoration: "none",
                }}
              >
                {ctaText}
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const HeaderSimpleConfig: ComponentConfig<HeaderSimpleProps> = {
  label: "هيدر — بسيط",
  fields: {
    logoText: { type: "text", label: "نص الشعار" },
    logoUrl:  { type: "text", label: "رابط الشعار" },
    links: {
      type:  "array",
      label: "روابط التنقل",
      arrayFields: {
        label:    { type: "text",     label: "النص" },
        url:      { type: "text",     label: "الرابط" },
        isActive: {
          type:    "radio",
          label:   "نشط",
          options: [
            { label: "نعم", value: true  as never },
            { label: "لا",  value: false as never },
          ],
        },
      },
      defaultItemProps: { label: "رابط", url: "/", isActive: false },
    },
    ctaText:  { type: "text", label: "نص زر CTA (اختياري)" },
    ctaLink:  { type: "text", label: "رابط CTA" },
    sticky: {
      type:    "radio",
      label:   "ثابت عند التمرير",
      options: [
        { label: "نعم", value: true  as never },
        { label: "لا",  value: false as never },
      ],
    },
    showSearch: {
      type:    "radio",
      label:   "إظهار زر البحث",
      options: [
        { label: "نعم", value: true  as never },
        { label: "لا",  value: false as never },
      ],
    },
    backgroundColor: {
      type:    "radio",
      label:   "لون الخلفية",
      options: [
        { label: "أبيض",      value: "white"       as never },
        { label: "داكن",      value: "dark"        as never },
        { label: "شفاف",      value: "transparent" as never },
      ],
    },
  },
  defaultProps: {
    logoText:        "ترميز",
    logoUrl:         "/",
    links: [
      { label: "الرئيسية",   url: "/",        isActive: true  },
      { label: "المتجر",     url: "/store",   isActive: false },
      { label: "من نحن",     url: "/about",   isActive: false },
      { label: "تواصل معنا", url: "/contact", isActive: false },
    ],
    ctaText:         "ابدأ الآن",
    ctaLink:         "/signup",
    sticky:          false,
    backgroundColor: "white",
    showSearch:      false,
  },
  render: (props) => <HeaderSimpleBlock {...props} />,
};
