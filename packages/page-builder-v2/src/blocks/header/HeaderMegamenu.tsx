/**
 * HeaderMegamenu Block — Page Builder v2 (Day 16)
 *
 * Design: "E-commerce Header"
 * Deep navy bar. Logo at start (right in RTL). Nav items with ChevronDown indicators.
 * Hovering/clicking a mega-item drops a multi-column panel spanning full width.
 * Utility icons (Search, Account, Cart with badge) at end.
 * Accessible: aria-expanded, aria-haspopup on triggers.
 *
 * RTL: dir=rtl, ps-/pe-
 */
import React, { useState, useEffect, useRef } from "react";
import type { ComponentConfig } from "@measured/puck";
import {
  ChevronDown,
  Search,
  User,
  ShoppingCart,
  Menu,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

export interface MegaLink {
  label: string;
  url:   string;
}

export interface MegaColumn {
  title:         string;
  links:         MegaLink[];
  featuredImage: string;
  featuredLink:  string;
}

export interface MenuItem {
  label:       string;
  url:         string;
  hasMegamenu: boolean;
  columns:     MegaColumn[];
}

export interface HeaderMegamenuProps {
  logoText:    string;
  logoUrl:     string;
  menuItems:   MenuItem[];
  showSearch:  boolean;
  showAccount: boolean;
  showCart:    boolean;
  cartCount:   number;
  sticky:      boolean;
}

// ── Main component ─────────────────────────────────────────────

export function HeaderMegamenuBlock({
  logoText,
  logoUrl,
  menuItems,
  showSearch,
  showAccount,
  showCart,
  cartCount,
  sticky,
}: HeaderMegamenuProps) {
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function toggleDropdown(i: number) {
    setOpenDropdown(openDropdown === i ? null : i);
  }

  return (
    <header
      dir="rtl"
      ref={headerRef}
      data-block="header-megamenu"
      data-sticky={sticky ? "true" : "false"}
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#0D2138",
        position:   sticky ? "sticky" : "relative",
        top:        sticky ? 0 : undefined,
        zIndex:     sticky ? 50 : undefined,
        borderBottom: "1px solid rgba(91,155,213,0.15)",
      }}
    >
      {/* Main bar */}
      <div
        className="max-w-7xl mx-auto flex items-center justify-between py-3 ps-6 pe-6"
        style={{ minHeight: "64px" }}
      >
        {/* Logo */}
        <a
          href={logoUrl || "/"}
          className="font-bold flex-shrink-0"
          style={{
            color:          "#ffffff",
            fontSize:       "1.25rem",
            textDecoration: "none",
            letterSpacing:  "-0.02em",
          }}
        >
          {logoText}
        </a>

        {/* Desktop nav items */}
        <nav className="hidden md:flex items-center gap-1">
          {menuItems.map((item, i) => (
            <div key={i} data-menu-item="" className="relative">
              {item.hasMegamenu ? (
                <button
                  data-dropdown-trigger=""
                  aria-expanded={openDropdown === i ? "true" : "false"}
                  aria-haspopup="true"
                  onClick={() => toggleDropdown(i)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-white/5"
                  style={{
                    background: "transparent",
                    border:     "none",
                    color:      "#C9DDEF",
                    fontSize:   "0.9rem",
                    cursor:     "pointer",
                    fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                  }}
                >
                  {item.label}
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    style={{
                      transform:  openDropdown === i ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>
              ) : (
                <a
                  href={item.url || "#"}
                  className="flex items-center rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
                  style={{
                    color:          "#C9DDEF",
                    fontSize:       "0.9rem",
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </a>
              )}

              {/* Dropdown panel */}
              {item.hasMegamenu && openDropdown === i && (
                <div
                  data-dropdown=""
                  className="absolute top-full rounded-2xl overflow-hidden"
                  style={{
                    insetInlineStart: "50%",
                    transform:        "translateX(50%)",
                    marginTop:        "0.5rem",
                    background:       "#0a1a2e",
                    border:           "1px solid rgba(91,155,213,0.2)",
                    boxShadow:        "0 16px 48px rgba(0,0,0,0.4)",
                    minWidth:         "600px",
                    zIndex:           100,
                    padding:          "1.5rem",
                  }}
                >
                  <div
                    className="grid gap-6"
                    style={{ gridTemplateColumns: `repeat(${item.columns.length}, 1fr)` }}
                  >
                    {item.columns.map((col, ci) => (
                      <div key={ci} data-mega-column="">
                        <h4
                          className="font-semibold mb-3"
                          style={{ color: "#5b9bd5", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}
                        >
                          {col.title}
                        </h4>
                        <ul
                          className="flex flex-col gap-2"
                          style={{ listStyle: "none", margin: 0, padding: 0 }}
                        >
                          {col.links.map((link, li) => (
                            <li key={li}>
                              <a
                                href={link.url || "#"}
                                className="transition-colors hover:text-white"
                                style={{ color: "#7AADD4", fontSize: "0.875rem", textDecoration: "none" }}
                              >
                                {link.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                        {col.featuredImage && (
                          <a
                            href={col.featuredLink || "#"}
                            className="block mt-4 rounded-xl overflow-hidden"
                          >
                            <img
                              src={col.featuredImage}
                              alt={col.title}
                              data-featured-image=""
                              loading="lazy"
                              className="w-full object-cover"
                              style={{ height: "80px" }}
                            />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Utility icons */}
        <div className="flex items-center gap-2">
          {showSearch && (
            <button
              data-search-btn=""
              aria-label="بحث"
              className="flex items-center justify-center rounded-lg transition-colors hover:bg-white/5"
              style={{
                width:      "38px",
                height:     "38px",
                background: "transparent",
                border:     "none",
                color:      "#C9DDEF",
                cursor:     "pointer",
              }}
            >
              <Search size={18} aria-hidden="true" />
            </button>
          )}

          {showAccount && (
            <button
              data-account-btn=""
              aria-label="الحساب"
              className="flex items-center justify-center rounded-lg transition-colors hover:bg-white/5"
              style={{
                width:      "38px",
                height:     "38px",
                background: "transparent",
                border:     "none",
                color:      "#C9DDEF",
                cursor:     "pointer",
              }}
            >
              <User size={18} aria-hidden="true" />
            </button>
          )}

          {showCart && (
            <button
              data-cart-btn=""
              aria-label="السلة"
              className="relative flex items-center justify-center rounded-lg transition-colors hover:bg-white/5"
              style={{
                width:      "38px",
                height:     "38px",
                background: "transparent",
                border:     "none",
                color:      "#C9DDEF",
                cursor:     "pointer",
              }}
            >
              <ShoppingCart size={18} aria-hidden="true" />
              {cartCount > 0 && (
                <span
                  data-cart-badge=""
                  className="absolute flex items-center justify-center rounded-full font-bold"
                  style={{
                    top:        "-4px",
                    insetInlineEnd: "-4px",
                    width:      "18px",
                    height:     "18px",
                    background: "#5b9bd5",
                    color:      "#ffffff",
                    fontSize:   "0.65rem",
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            data-hamburger=""
            aria-label="القائمة"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="flex md:hidden items-center justify-center rounded-lg"
            style={{
              width:      "38px",
              height:     "38px",
              background: "rgba(91,155,213,0.1)",
              border:     "1px solid rgba(91,155,213,0.2)",
              color:      "#C9DDEF",
              cursor:     "pointer",
            }}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          data-mobile-menu=""
          className="fixed inset-0 flex flex-col"
          style={{
            background: "#0D2138",
            zIndex:     200,
            fontFamily: "'IBM Plex Sans Arabic', sans-serif",
          }}
        >
          <div
            className="flex items-center justify-between ps-6 pe-6 py-4"
            style={{ borderBottom: "1px solid rgba(91,155,213,0.2)" }}
          >
            <span className="font-bold" style={{ color: "#ffffff", fontSize: "1.15rem" }}>{logoText}</span>
            <button
              data-mobile-close=""
              aria-label="إغلاق"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center rounded-lg"
              style={{
                width:      "38px",
                height:     "38px",
                background: "rgba(91,155,213,0.12)",
                border:     "1px solid rgba(91,155,213,0.2)",
                color:      "#ffffff",
                cursor:     "pointer",
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <nav className="flex flex-col ps-6 pe-6 pt-4 overflow-y-auto gap-1">
            {menuItems.map((item, i) => (
              <div key={i}>
                <a
                  href={item.url || "#"}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between py-3 border-b"
                  style={{
                    color:          "#C9DDEF",
                    fontSize:       "1rem",
                    textDecoration: "none",
                    borderColor:    "rgba(91,155,213,0.1)",
                  }}
                >
                  {item.label}
                  {item.hasMegamenu && <ChevronDown size={14} aria-hidden="true" style={{ color: "#5b9bd5" }} />}
                </a>
              </div>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const HeaderMegamenuConfig: ComponentConfig<HeaderMegamenuProps> = {
  label: "هيدر — ميجامينو",
  fields: {
    logoText: { type: "text", label: "نص الشعار" },
    logoUrl:  { type: "text", label: "رابط الشعار" },
    menuItems: {
      type:  "array",
      label: "عناصر القائمة",
      arrayFields: {
        label:       { type: "text", label: "النص" },
        url:         { type: "text", label: "الرابط (اختياري)" },
        hasMegamenu: {
          type:    "radio",
          label:   "يفتح ميجامينو",
          options: [
            { label: "نعم", value: true  as never },
            { label: "لا",  value: false as never },
          ],
        },
        columns: {
          type:  "array",
          label: "أعمدة الميجامينو",
          arrayFields: {
            title:         { type: "text",  label: "عنوان العمود" },
            featuredImage: { type: "text",  label: "صورة مميزة (URL)" },
            featuredLink:  { type: "text",  label: "رابط الصورة المميزة" },
            links: {
              type:  "array",
              label: "روابط",
              arrayFields: {
                label: { type: "text", label: "النص" },
                url:   { type: "text", label: "الرابط" },
              },
              defaultItemProps: { label: "رابط", url: "/" },
            },
          },
          defaultItemProps: { title: "قسم", links: [], featuredImage: "", featuredLink: "" },
        },
      },
      defaultItemProps: { label: "عنصر", url: "/", hasMegamenu: false, columns: [] },
    },
    showSearch: {
      type:    "radio",
      label:   "إظهار البحث",
      options: [{ label: "نعم", value: true as never }, { label: "لا", value: false as never }],
    },
    showAccount: {
      type:    "radio",
      label:   "إظهار زر الحساب",
      options: [{ label: "نعم", value: true as never }, { label: "لا", value: false as never }],
    },
    showCart: {
      type:    "radio",
      label:   "إظهار السلة",
      options: [{ label: "نعم", value: true as never }, { label: "لا", value: false as never }],
    },
    cartCount: { type: "number", label: "عدد عناصر السلة (للمعاينة)" },
    sticky: {
      type:    "radio",
      label:   "ثابت عند التمرير",
      options: [{ label: "نعم", value: true as never }, { label: "لا", value: false as never }],
    },
  },
  defaultProps: {
    logoText:    "ترميز",
    logoUrl:     "/",
    showSearch:  true,
    showAccount: true,
    showCart:    true,
    cartCount:   0,
    sticky:      false,
    menuItems: [
      { label: "الرئيسية",   url: "/",           hasMegamenu: false, columns: [] },
      {
        label: "المنتجات",
        url:   "",
        hasMegamenu: true,
        columns: [
          {
            title:         "الأكثر مبيعاً",
            featuredImage: "",
            featuredLink:  "/bestsellers",
            links: [
              { label: "منتج أول",  url: "/p1" },
              { label: "منتج ثاني", url: "/p2" },
              { label: "منتج ثالث", url: "/p3" },
              { label: "منتج رابع", url: "/p4" },
              { label: "منتج خامس", url: "/p5" },
            ],
          },
          {
            title:         "الإصدارات الجديدة",
            featuredImage: "",
            featuredLink:  "/new",
            links: [
              { label: "إصدار أول",  url: "/n1" },
              { label: "إصدار ثاني", url: "/n2" },
              { label: "إصدار ثالث", url: "/n3" },
              { label: "إصدار رابع", url: "/n4" },
              { label: "إصدار خامس", url: "/n5" },
            ],
          },
          {
            title:         "العروض الخاصة",
            featuredImage: "",
            featuredLink:  "/deals",
            links: [
              { label: "عرض أول",  url: "/d1" },
              { label: "عرض ثاني", url: "/d2" },
              { label: "عرض ثالث", url: "/d3" },
              { label: "عرض رابع", url: "/d4" },
              { label: "عرض خامس", url: "/d5" },
            ],
          },
        ],
      },
      { label: "التصنيفات", url: "/categories", hasMegamenu: false, columns: [] },
      { label: "العروض",    url: "/deals",      hasMegamenu: false, columns: [] },
      { label: "تواصل",     url: "/contact",    hasMegamenu: false, columns: [] },
    ],
  },
  render: (props) => <HeaderMegamenuBlock {...props} />,
};
