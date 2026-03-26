import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Star, MapPin, Phone, Mail, Clock, Instagram, Twitter, Globe,
  CalendarCheck, MessageSquare, CheckCircle, X, Menu, ChevronDown,
  ChevronLeft, ChevronRight, ArrowLeft, BookOpen, ArrowUp, ZoomIn,
} from "lucide-react";
import { websiteApi } from "@/lib/api";
import DOMPurify from "dompurify";

// ══ Types ═════════════════════════════════════════════════════════

interface OrgData {
  id: string; name: string; nameEn?: string; slug: string;
  phone?: string; email?: string; logo?: string;
  city?: string; address?: string; description?: string; tagline?: string;
  coverImage?: string; instagram?: string; twitter?: string;
  tiktok?: string; snapchat?: string; businessType?: string;
  primaryColor: string; secondaryColor?: string;
}

interface SiteConfig {
  templateId?: string; logoUrl?: string; primaryColor?: string;
  secondaryColor?: string; fontFamily?: string;
  // Extended design system
  accentColor?: string; bgColor?: string; cardBgColor?: string;
  textColor?: string; borderColor?: string;
  headingSize?: string; fontWeight?: string; letterSpacing?: string;
  buttonStyle?: string; buttonRadius?: string;
  cardStyle?: string; cardRadius?: string;
  sectionSpacing?: string; shadowScale?: string;
  gradientFrom?: string; gradientTo?: string;
  customCss?: string;
  defaultMetaTitle?: string; defaultMetaDescription?: string;
  builderConfig?: BuilderConfig;
}

interface BuilderConfig {
  heroTitle?: string; heroSubtitle?: string; aboutText?: string;
  sectionsOrder?: string[]; hiddenSections?: string[];
  showBookingButton?: boolean; showWhatsappButton?: boolean;
  whatsappMessage?: string; showPrices?: boolean; showTeamPhotos?: boolean;
  heroLayout?: string; cardStyle?: string;
  announcement?: string;
  statsItems?: { label: string; value: string }[];
  faqItems?: { q: string; a: string }[];
  customBlocks?: { id: string; type: string; content: Record<string, unknown> }[];
  // Per-section detailed settings
  heroSettings?: { buttonText?: string; buttonLink?: string; bgColor?: string; imageUrl?: string; layout?: string };
  servicesSettings?: { title?: string; subtitle?: string; layout?: string };
  aboutSettings?: { title?: string; imageUrl?: string; features?: string };
  reviewsSettings?: { title?: string; showRating?: boolean };
  contactSettings?: { title?: string; showForm?: boolean; showMap?: boolean };
}

interface Service {
  id: string; name: string; nameEn?: string; description?: string;
  price?: number; pricingType?: string; duration?: number;
  coverImage?: string; categoryId?: string; status: string;
}

interface Category { id: string; name: string; nameEn?: string; icon?: string; color?: string; }
interface Branch { id: string; name: string; address?: string; phone?: string; city?: string; }
interface BlogPost { id: string; title: string; slug: string; excerpt?: string; coverImage?: string; publishedAt?: string; }
interface Review { id: string; rating: number; comment?: string; authorName?: string; createdAt: string; }

interface SitePage { id: string; title: string; slug: string; isPublished: boolean; type?: string; }

interface SiteData {
  org: OrgData; config: SiteConfig | null;
  pages: SitePage[]; services: Service[]; categories: Category[];
  branches: Branch[]; blog: BlogPost[]; reviews: Review[];
  stats: { avgRating: string | null; reviewCount: number; serviceCount: number; };
}

// ══ Template Styles Registry ══════════════════════════════════════
// Each template defines a genuinely different layout experience

interface TemplateStyle {
  isDark: boolean;
  heroStyle: "fullscreen" | "split" | "centered" | "minimal" | "gradient" | "magazine";
  serviceStyle: "grid" | "list" | "menu" | "magazine" | "showcase";
  navStyle: "solid" | "dark" | "glass";
  defaultPrimary: string;
  accentBg: string;        // section alt background
  heroOverlayGrad: string; // gradient overlay on cover image
  badge: string;           // pill badge bg
  badgeText: string;       // pill badge text
}

const TEMPLATE_STYLES: Record<string, TemplateStyle> = {
  classic: {
    isDark: false, heroStyle: "fullscreen", serviceStyle: "grid",
    navStyle: "solid", defaultPrimary: "#5b9bd5",
    accentBg: "#f8f9fb", heroOverlayGrad: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 100%)",
    badge: "#eff6ff", badgeText: "#3b82f6",
  },
  modern: {
    isDark: true, heroStyle: "split", serviceStyle: "magazine",
    navStyle: "dark", defaultPrimary: "#4f46e5",
    accentBg: "#111827", heroOverlayGrad: "linear-gradient(135deg, rgba(15,15,40,0.92) 0%, rgba(45,53,97,0.7) 100%)",
    badge: "#1e1b4b", badgeText: "#818cf8",
  },
  luxury: {
    isDark: true, heroStyle: "centered", serviceStyle: "showcase",
    navStyle: "glass", defaultPrimary: "#c8a951",
    accentBg: "#0d0b0b", heroOverlayGrad: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.85) 100%)",
    badge: "#27140c", badgeText: "#c8a951",
  },
  minimal: {
    isDark: false, heroStyle: "minimal", serviceStyle: "list",
    navStyle: "solid", defaultPrimary: "#64748b",
    accentBg: "#f1f5f9", heroOverlayGrad: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)",
    badge: "#f1f5f9", badgeText: "#475569",
  },
  cafe: {
    isDark: false, heroStyle: "fullscreen", serviceStyle: "menu",
    navStyle: "solid", defaultPrimary: "#d97706",
    accentBg: "#fefce8", heroOverlayGrad: "linear-gradient(to top, rgba(30,15,5,0.88) 0%, rgba(30,15,5,0.3) 100%)",
    badge: "#fef3c7", badgeText: "#d97706",
  },
  boutique: {
    isDark: false, heroStyle: "gradient", serviceStyle: "grid",
    navStyle: "solid", defaultPrimary: "#be185d",
    accentBg: "#fff1f2", heroOverlayGrad: "linear-gradient(135deg, rgba(190,24,93,0.85) 0%, rgba(157,23,77,0.7) 100%)",
    badge: "#fce7f3", badgeText: "#be185d",
  },
  bold: {
    isDark: true, heroStyle: "magazine", serviceStyle: "magazine",
    navStyle: "dark", defaultPrimary: "#f59e0b",
    accentBg: "#0a0a0a", heroOverlayGrad: "linear-gradient(to left, transparent 40%, rgba(0,0,0,0.95) 100%)",
    badge: "#1c1917", badgeText: "#f59e0b",
  },
  corporate: {
    isDark: false, heroStyle: "split", serviceStyle: "list",
    navStyle: "solid", defaultPrimary: "#1e40af",
    accentBg: "#f0f7ff", heroOverlayGrad: "linear-gradient(to top, rgba(10,20,60,0.88) 0%, rgba(10,20,60,0.2) 100%)",
    badge: "#dbeafe", badgeText: "#1e40af",
  },
  festive: {
    isDark: true, heroStyle: "gradient", serviceStyle: "showcase",
    navStyle: "glass", defaultPrimary: "#7c3aed",
    accentBg: "#0f0820", heroOverlayGrad: "linear-gradient(135deg, rgba(124,58,237,0.9) 0%, rgba(79,70,229,0.7) 100%)",
    badge: "#2e1065", badgeText: "#a78bfa",
  },
  starter: {
    isDark: false, heroStyle: "centered", serviceStyle: "grid",
    navStyle: "solid", defaultPrimary: "#059669",
    accentBg: "#f0fdf4", heroOverlayGrad: "linear-gradient(to top, rgba(0,60,30,0.8) 0%, rgba(0,60,30,0.15) 100%)",
    badge: "#d1fae5", badgeText: "#059669",
  },
};

const DEFAULT_STYLE: TemplateStyle = TEMPLATE_STYLES.classic;

// ══ Helpers ═══════════════════════════════════════════════════════

function formatPrice(price?: number, pricingType?: string) {
  if (!price) return null;
  if (pricingType === "from") return `يبدأ من ${price.toLocaleString("en-US")} ر.س`;
  return `${price.toLocaleString("en-US")} ر.س`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "long", day: "numeric" });
}

function isHidden(bc: BuilderConfig | undefined, sectionId: string) {
  return (bc?.hiddenSections || []).includes(sectionId);
}

// ══ Sub-components ════════════════════════════════════════════════

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"} fill={s <= rating ? "#f59e0b" : "none"} stroke={s <= rating ? "#f59e0b" : "#d1d5db"} />
      ))}
    </div>
  );
}

function ContactForm({ orgId, primary }: { orgId: string; primary: string }) {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      await fetch("/api/v1/website/contacts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, orgId }),
      });
      setStatus("done");
    } catch { setStatus("error"); }
  };

  if (status === "done") return (
    <div className="flex flex-col items-center gap-3 py-10">
      <CheckCircle className="w-12 h-12 text-emerald-500" />
      <p className="font-bold text-gray-800 text-lg">تم إرسال رسالتك بنجاح</p>
      <p className="text-gray-500 text-sm">سنتواصل معك في أقرب وقت</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم *</label>
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
            placeholder="اسمك الكريم" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الجوال *</label>
          <input required value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
            placeholder="05xxxxxxxx" dir="ltr" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">رسالتك *</label>
        <textarea required rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
          placeholder="اكتب رسالتك هنا..." />
      </div>
      {status === "error" && <p className="text-red-500 text-sm">حدث خطأ، يرجى المحاولة مجدداً</p>}
      <button type="submit" disabled={status === "sending"}
        className="w-full py-3.5 rounded-xl font-bold text-white transition-opacity disabled:opacity-60 text-sm"
        style={{ background: primary }}>
        {status === "sending" ? "جاري الإرسال..." : "إرسال الرسالة"}
      </button>
    </form>
  );
}

// ══ Main Component ════════════════════════════════════════════════

export function PublicStorefrontPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [reviewIdx, setReviewIdx] = useState(0);

  const [scrolled, setScrolled]   = useState(false);
  const [showTop, setShowTop]     = useState(false);
  const [lightbox, setLightbox]   = useState<string | null>(null);

  const servicesRef = useRef<HTMLElement>(null);
  const aboutRef    = useRef<HTMLElement>(null);
  const reviewsRef  = useRef<HTMLElement>(null);
  const contactRef  = useRef<HTMLElement>(null);

  // ── Scroll state (header shadow + back-to-top) ─────────────────
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      setShowTop(y > 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Scroll reveal (IntersectionObserver) ───────────────────────
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("sf-visible"); obs.unobserve(e.target); }
      }),
      { threshold: 0.07, rootMargin: "0px 0px -30px 0px" }
    );
    document.querySelectorAll(".sf-reveal, .sf-reveal-scale").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);

  useEffect(() => {
    if (!orgSlug) return;
    websiteApi.publicSite(orgSlug)
      .then((res: { data?: SiteData }) => {
        if (res?.data) setData(res.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-brand-400 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">جاري تحميل الموقع...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="text-center px-4">
        <p className="text-7xl font-black text-gray-100 mb-4">404</p>
        <p className="text-xl font-bold text-gray-700">هذا الموقع غير موجود</p>
        <p className="text-gray-400 mt-2 text-sm">تأكد من صحة الرابط أو تواصل مع صاحب المنشأة</p>
      </div>
    </div>
  );

  const { org, config, services, categories, branches, blog, reviews, stats, pages } = data;
  const bc = config?.builderConfig || {};
  const tplId = config?.templateId || "classic";
  const tpl: TemplateStyle = TEMPLATE_STYLES[tplId] || DEFAULT_STYLE;
  const primary = config?.primaryColor || org.primaryColor || tpl.defaultPrimary;
  const font = config?.fontFamily || "IBM Plex Sans Arabic";
  const logo = config?.logoUrl || org.logo;
  const isDark = tpl.isDark;
  // Per-section settings (merchant overrides)
  const heroSettingsBC = bc.heroSettings || {};
  const servicesSettingsBC = bc.servicesSettings || {};
  const aboutSettingsBC = bc.aboutSettings || {};
  const reviewsSettingsBC = bc.reviewsSettings || {};
  const contactSettingsBC = bc.contactSettings || {};

  // Final hero/service style: merchant override wins, then template default
  const heroStyle: TemplateStyle["heroStyle"] = (heroSettingsBC.layout as TemplateStyle["heroStyle"]) || tpl.heroStyle;
  const serviceStyle: TemplateStyle["serviceStyle"] = (servicesSettingsBC.layout as TemplateStyle["serviceStyle"]) || tpl.serviceStyle;
  const { navStyle } = tpl;

  // Design system — value maps
  const _btnRadiusMap: Record<string, string> = { none: "0px", sm: "6px", md: "10px", lg: "14px", full: "9999px" };
  const _cardRadiusMap: Record<string, string> = { none: "0px", sm: "8px", md: "12px", lg: "16px", xl: "24px" };
  const _spacingMap: Record<string, string> = { tight: "48px", normal: "80px", relaxed: "112px", wide: "148px" };
  const _shadowMap: Record<string, string> = {
    none: "none",
    subtle: "0 1px 3px rgba(0,0,0,0.08)",
    medium: "0 4px 12px rgba(0,0,0,0.12)",
    strong: "0 8px 30px rgba(0,0,0,0.2)",
  };
  const _headingSizeMap: Record<string, string> = { sm: "1.5rem", md: "2rem", lg: "2.5rem", xl: "3.5rem" };
  const _fontWeightMap: Record<string, string> = { normal: "400", semibold: "600", bold: "700", extrabold: "800" };
  const _letterSpacingMap: Record<string, string> = { tight: "-0.025em", normal: "0em", wide: "0.05em" };

  const ds = config || {};
  const bgPage = ds.bgColor || (isDark ? "#0f0f0f" : "#f8f9fb");
  const bgCard = ds.cardBgColor || (isDark ? "#1c1c1c" : "#ffffff");
  const borderCard = ds.borderColor || (isDark ? "#2a2a2a" : "#e5e7eb");
  const textMain = ds.textColor || (isDark ? "#f9fafb" : "#111827");
  const textSub = isDark ? "#9ca3af" : "#6b7280";
  const bgSectionAlt = tpl.accentBg;

  const gradientHero = ds.gradientFrom && ds.gradientTo
    ? `linear-gradient(135deg, ${ds.gradientFrom}, ${ds.gradientTo})`
    : primary;

  // Sanitize merchant customCss — prevent style-tag breakout and dangerous CSS functions
  const sanitizeCss = (css: string): string => {
    return css
      .replace(/<\/style\s*>/gi, "")          // prevent </style> breakout
      .replace(/expression\s*\(/gi, "")        // IE expression()
      .replace(/@import\b/gi, "")             // @import
      .replace(/url\s*\(\s*["']?\s*(?!data:image\/)(?!https?:\/\/)/gi, "url(#");  // allow only http(s) and data:image urls
  };

  // CSS vars — injected via <style> tag, user-driven values
  const cssVarsBlock = `.sf-root{--primary:${primary};--font:${font};--btn-radius:${_btnRadiusMap[ds.buttonRadius || "lg"] || "14px"};--card-radius:${_cardRadiusMap[ds.cardRadius || "lg"] || "16px"};--card-shadow:${_shadowMap[ds.shadowScale || "subtle"]};--section-py:${_spacingMap[ds.sectionSpacing || "normal"]};--heading-size:${_headingSizeMap[ds.headingSize || "lg"]};--heading-weight:${_fontWeightMap[ds.fontWeight || "bold"]};--letter-spacing:${_letterSpacingMap[ds.letterSpacing || "normal"]};--gradient-hero:${gradientHero};}${ds.customCss ? sanitizeCss(ds.customCss) : ""}`;

  const themeVars = { fontFamily: font } as React.CSSProperties;

  const filteredServices = activeCat === "all"
    ? services
    : services.filter(s => s.categoryId === activeCat);

  // Group services by category for showcase mode
  const servicesByCategory: { cat: Category | null; services: Service[] }[] = categories.length > 0
    ? categories.map(cat => ({
        cat,
        services: services.filter(s => s.categoryId === cat.id),
      })).filter(g => g.services.length > 0)
    : [{ cat: null, services }];

  const publishedPages = (pages || []).filter(p => p.isPublished && p.type !== "home");

  const navLinks: { label: string; ref?: React.RefObject<HTMLElement | null>; href?: string }[] = [
    ...(services.length > 0 ? [{ label: "الخدمات", ref: servicesRef }] : []),
    ...(!isHidden(bc, "about") && (org.description || bc.aboutText) ? [{ label: "من نحن", ref: aboutRef }] : []),
    ...(reviews.length > 0 ? [{ label: "التقييمات", ref: reviewsRef }] : []),
    ...publishedPages.map(p => ({ label: p.title, href: `/s/${org.slug}/p/${p.slug}` })),
    { label: "تواصل معنا", ref: contactRef },
  ];

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenu(false);
  };

  // Default stats if none in config
  const displayStats = bc.statsItems && bc.statsItems.length > 0
    ? bc.statsItems
    : [
        ...(stats.reviewCount > 0 ? [{ label: "تقييم عميل", value: `+${stats.reviewCount}` }] : []),
        ...(stats.serviceCount > 0 ? [{ label: "خدمة متاحة", value: `${stats.serviceCount}` }] : []),
        ...(stats.avgRating ? [{ label: "متوسط التقييم", value: `${stats.avgRating} / 5` }] : []),
        ...(branches.length > 1 ? [{ label: "فرع", value: `${branches.length}` }] : []),
      ];

  const faqItems = bc.faqItems || [];
  const customBlocks = bc.customBlocks || [];
  const announcement = bc.announcement || (org.tagline ? `${org.name} — ${org.tagline} — احجز الآن على الرقم ${org.phone || ""}` : null);
  const showWhatsApp = bc.showWhatsappButton !== false && !!org.phone;
  const whatsappLink = `https://wa.me/${(org.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(bc.whatsappMessage || "مرحبا، أريد الاستفسار عن خدماتكم")}`;

  const reviewsPerPage = 3;
  const maxReviewPage = Math.max(0, Math.ceil(reviews.length / reviewsPerPage) - 1);
  const visibleReviews = reviews.slice(reviewIdx * reviewsPerPage, reviewIdx * reviewsPerPage + reviewsPerPage);

  return (
    <div dir="rtl" className="sf-root" style={{ ...themeVars, background: bgPage, color: textMain, minHeight: "100vh" }}>
      <style>{cssVarsBlock}</style>
      <style>{`
        @keyframes sf-fadeUp   { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sf-fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes sf-scaleIn  { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }
        @keyframes sf-pulse    { 0%,100%{transform:scale(1);opacity:.55} 50%{transform:scale(1.65);opacity:0} }
        @keyframes sf-shimmer  { from{background-position:200% 0} to{background-position:-200% 0} }
        @keyframes sf-bounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes marquee     { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .sf-reveal             { opacity:0; transform:translateY(26px); transition:opacity .65s cubic-bezier(.4,0,.2,1),transform .65s cubic-bezier(.4,0,.2,1); }
        .sf-reveal.sf-visible  { opacity:1; transform:translateY(0); }
        .sf-reveal-scale       { opacity:0; transform:scale(0.95); transition:opacity .55s ease,transform .55s ease; }
        .sf-reveal-scale.sf-visible { opacity:1; transform:scale(1); }
        .sf-d1 { transition-delay:.05s!important }  .sf-d2 { transition-delay:.12s!important }
        .sf-d3 { transition-delay:.19s!important }  .sf-d4 { transition-delay:.26s!important }
        .sf-d5 { transition-delay:.33s!important }  .sf-d6 { transition-delay:.40s!important }
        .wa-ring::before { content:''; position:absolute; inset:0; border-radius:50%; background:#25D366; animation:sf-pulse 2.2s ease-out infinite; pointer-events:none; }
        .sf-img-zoom img   { transition:transform .5s cubic-bezier(.4,0,.2,1); }
        .sf-img-zoom:hover img { transform:scale(1.07); }
        .sf-card-lift      { transition:box-shadow .25s ease,transform .25s ease; }
        .sf-card-lift:hover{ box-shadow:0 16px 40px rgba(0,0,0,.13); transform:translateY(-4px); }
      `}</style>

      {/* ── Announcement Ticker ── */}
      {announcement && (
        <div className="overflow-hidden py-2.5 text-xs font-medium text-white" style={{ background: primary }} dir="ltr">
          <div className="flex whitespace-nowrap" style={{ animation: "marquee 30s linear infinite" }}>
            {[...Array(8)].map((_, i) => (
              <span key={i} className="mx-10" dir="rtl">{announcement}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-md transition-shadow duration-300" style={{
        background: navStyle === "dark" ? "rgba(10,10,10,0.97)" : navStyle === "glass" ? "rgba(0,0,0,0.45)" : isDark ? "rgba(15,15,15,0.95)" : "rgba(255,255,255,0.95)",
        borderColor: navStyle === "dark" || navStyle === "glass" ? "rgba(255,255,255,0.08)" : borderCard,
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.09)" : "none",
      }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            {logo ? (
              <img src={logo} alt={org.name} className="h-9 w-auto max-w-[130px] object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm"
                style={{ background: primary }}>{org.name[0]}</div>
            )}
            <div className="hidden sm:block">
              <p className="font-extrabold text-[15px] leading-tight" style={{ color: textMain }}>{org.name}</p>
              {org.city && <p className="text-[11px] leading-none mt-0.5" style={{ color: textSub }}>{org.city}</p>}
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(n => n.href ? (
              <Link key={n.label} to={n.href}
                className="px-3.5 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5"
                style={{ color: textSub }}>
                {n.label}
              </Link>
            ) : (
              <button key={n.label} onClick={() => scrollTo(n.ref!)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 cursor-pointer border-0 bg-transparent"
                style={{ color: textSub }}>
                {n.label}
              </button>
            ))}
          </nav>

          {/* CTA + phone */}
          <div className="flex items-center gap-2">
            {org.phone && (
              <a href={`tel:${org.phone}`}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors hover:opacity-80"
                style={{ borderColor: borderCard, color: textSub }}>
                <Phone className="w-3.5 h-3.5" />
                <span dir="ltr">{org.phone}</span>
              </a>
            )}
            <Link to={`/book/${org.slug}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 shadow-sm"
              style={{ background: primary }}>
              <CalendarCheck className="w-4 h-4" />
              <span className="hidden sm:inline">احجز الآن</span>
              <span className="sm:hidden">احجز</span>
            </Link>
            <button onClick={() => setMobileMenu(v => !v)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-colors border-0 bg-transparent cursor-pointer"
              style={{ color: textMain }}>
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenu && (
          <div className="md:hidden border-t px-4 py-3 flex flex-col gap-1" style={{ background: isDark ? "#111" : "#fff", borderColor: borderCard }}>
            {navLinks.map(n => n.href ? (
              <Link key={n.label} to={n.href} onClick={() => setMobileMenu(false)}
                className="text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-black/5"
                style={{ color: textMain }}>
                {n.label}
              </Link>
            ) : (
              <button key={n.label} onClick={() => scrollTo(n.ref!)}
                className="text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 cursor-pointer border-0 bg-transparent w-full"
                style={{ color: textMain }}>
                {n.label}
              </button>
            ))}
            {org.phone && (
              <a href={`tel:${org.phone}`} className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium" style={{ color: primary }}>
                <Phone className="w-4 h-4" /> {org.phone}
              </a>
            )}
          </div>
        )}
      </header>

      {/* ── Hero (template-driven layout) ── */}
      {!isHidden(bc, "hero") && (
        <section className="relative overflow-hidden">
          {/* FULLSCREEN: full-width image, text anchored at bottom */}
          {heroStyle === "fullscreen" && (org.coverImage ? (
            <div className="relative h-[480px] md:h-[580px]">
              <img src={org.coverImage} alt={org.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: tpl.heroOverlayGrad }} />
              <div className="relative h-full flex items-end">
                <div className="max-w-6xl mx-auto px-4 pb-14 w-full">
                  <HeroContent org={org} stats={stats} bc={bc} primary={primary} light />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-24 md:py-32" style={{ background: gradientHero }}>
              <div className="max-w-6xl mx-auto px-4">
                <HeroContent org={org} stats={stats} bc={bc} primary={primary} light />
              </div>
            </div>
          ))}

          {/* SPLIT: text on right, image on left (50/50) */}
          {heroStyle === "split" && (
            <div className="min-h-[480px] grid grid-cols-1 md:grid-cols-2" style={{ background: isDark ? "#111" : "#fff" }}>
              <div className={`${isDark ? "bg-gray-950" : "bg-gray-50"} flex items-center justify-center p-10 md:p-16 order-2 md:order-1`}>
                <HeroContent org={org} stats={stats} bc={bc} primary={primary} dark={isDark} />
              </div>
              <div className="relative min-h-[280px] order-1 md:order-2">
                {org.coverImage ? (
                  <img src={org.coverImage} alt={org.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}aa 100%)` }} />
                )}
              </div>
            </div>
          )}

          {/* CENTERED: image as full background, text perfectly centered */}
          {heroStyle === "centered" && (org.coverImage ? (
            <div className="relative min-h-[520px] flex items-center justify-center">
              <img src={org.coverImage} alt={org.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: tpl.heroOverlayGrad }} />
              <div className="relative text-center max-w-3xl mx-auto px-6 py-20">
                <HeroContent org={org} stats={stats} bc={bc} primary={primary} light center />
              </div>
            </div>
          ) : (
            <div className="min-h-[480px] flex items-center justify-center text-center" style={{ background: gradientHero }}>
              <div className="max-w-3xl mx-auto px-6 py-20">
                <HeroContent org={org} stats={stats} bc={bc} primary={primary} light center />
              </div>
            </div>
          ))}

          {/* MINIMAL: no image, clean white/dark with text only — maximum whitespace */}
          {heroStyle === "minimal" && (
            <div className="py-16 md:py-24 border-b" style={{ background: bgCard, borderColor: borderCard }}>
              <div className="max-w-6xl mx-auto px-4">
                <HeroContent org={org} stats={stats} bc={bc} primary={primary} dark={isDark} />
              </div>
            </div>
          )}

          {/* GRADIENT: bold color gradient, no image needed */}
          {heroStyle === "gradient" && (
            <div className="relative py-24 md:py-32 overflow-hidden" style={{ background: gradientHero }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
              {org.coverImage && (
                <div className="absolute inset-y-0 left-0 w-1/3 opacity-20 hidden md:block">
                  <img src={org.coverImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative max-w-6xl mx-auto px-4 text-center">
                <HeroContent org={org} stats={stats} bc={bc} primary={primary} light center />
              </div>
            </div>
          )}

          {/* MAGAZINE: bold editorial, large offset text + image tiles */}
          {heroStyle === "magazine" && (
            <div className="min-h-[520px] relative" style={{ background: isDark ? "#0a0a0a" : "#111" }}>
              {org.coverImage && (
                <>
                  <img src={org.coverImage} alt={org.name} className="absolute inset-0 w-full h-full object-cover opacity-25" />
                  <div className="absolute inset-0" style={{ background: tpl.heroOverlayGrad }} />
                </>
              )}
              <div className="relative max-w-6xl mx-auto px-4 flex items-end min-h-[520px] pb-16">
                <div className="max-w-2xl">
                  <div className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5" style={{ background: primary, color: "white" }}>
                    {org.businessType || "خدمات متميزة"}
                  </div>
                  <HeroContent org={org} stats={stats} bc={bc} primary={primary} light />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Stats Bar ── */}
      {displayStats.length > 0 && (
        <div style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 100%)` }} className="py-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="max-w-6xl mx-auto px-4 relative">
            <div className="grid gap-6 text-white text-center sf-reveal"
              style={{ gridTemplateColumns: `repeat(${Math.min(displayStats.length, 4)}, 1fr)` }}>
              {displayStats.slice(0, 4).map((s, i) => (
                <div key={i} className={`py-2 sf-reveal sf-d${i + 1}`}>
                  <p className="text-3xl md:text-5xl font-black tracking-tight">{s.value}</p>
                  <div className="w-8 h-0.5 bg-white/40 mx-auto my-2 rounded-full" />
                  <p className="text-sm text-white/80 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Categories Showcase ── */}
      {!isHidden(bc, "services") && categories.length > 0 && (
        <section className="py-14 max-w-6xl mx-auto px-4">
          <SectionTitle title="الأقسام" isDark={isDark} primary={primary} />
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <button
              onClick={() => { setActiveCat("all"); servicesRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all cursor-pointer bg-transparent"
              style={{ borderColor: activeCat === "all" ? primary : borderCard, background: activeCat === "all" ? `${primary}12` : bgCard }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                style={{ background: primary }}>الكل</div>
              <span className="text-sm font-semibold" style={{ color: textMain }}>جميع الخدمات</span>
              <span className="text-xs" style={{ color: textSub }}>{services.length} خدمة</span>
            </button>
            {categories.map(cat => {
              const count = services.filter(s => s.categoryId === cat.id).length;
              const isActive = activeCat === cat.id;
              return (
                <button key={cat.id}
                  onClick={() => { setActiveCat(cat.id); servicesRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                  className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all cursor-pointer bg-transparent"
                  style={{ borderColor: isActive ? primary : borderCard, background: isActive ? `${primary}12` : bgCard }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
                    style={{ background: isActive ? primary : `${primary}15`, color: isActive ? "white" : primary }}>
                    {cat.icon || cat.name[0]}
                  </div>
                  <span className="text-sm font-semibold text-center" style={{ color: textMain }}>{cat.name}</span>
                  <span className="text-xs" style={{ color: textSub }}>{count} خدمة</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Services ── */}
      {!isHidden(bc, "services") && services.length > 0 && (
        <section ref={servicesRef} className="py-14" style={{ background: bgSectionAlt }}>
          <div className="max-w-6xl mx-auto px-4">
            {/* Category filter bar */}
            {categories.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-8 justify-center">
                <FilterPill label="الكل" active={activeCat === "all"} onClick={() => setActiveCat("all")} primary={primary} isDark={isDark} />
                {categories.map(cat => (
                  <FilterPill key={cat.id} label={cat.name} active={activeCat === cat.id} onClick={() => setActiveCat(cat.id)} primary={primary} isDark={isDark} />
                ))}
              </div>
            )}

            {/* Services grouped by category (when showing all) OR flat grid */}
            {activeCat === "all" && servicesByCategory.length > 1 ? (
              <div className="space-y-14">
                {servicesByCategory.map(({ cat, services: catServices }) => (
                  <div key={cat?.id || "all"}>
                    {cat && (
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                          style={{ background: `${primary}15`, color: primary }}>
                          {cat.icon || cat.name[0]}
                        </div>
                        <h3 className="font-bold text-lg" style={{ color: textMain }}>{cat.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${primary}12`, color: primary }}>{catServices.length} خدمة</span>
                      </div>
                    )}
                    <ServiceLayout services={catServices} orgSlug={org.slug} primary={primary} showPrice={bc.showPrices !== false} bgCard={bgCard} borderCard={borderCard} textMain={textMain} textSub={textSub} style={serviceStyle} />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {activeCat !== "all" && (
                  <SectionTitle title={categories.find(c => c.id === activeCat)?.name || "الخدمات"} isDark={isDark} primary={primary} />
                )}
                {activeCat === "all" && <SectionTitle title={servicesSettingsBC.title || "خدماتنا"} subtitle={servicesSettingsBC.subtitle || `${stats.serviceCount} خدمة متاحة`} isDark={isDark} primary={primary} />}
                <div className="mt-8">
                  <ServiceLayout services={filteredServices} orgSlug={org.slug} primary={primary} showPrice={bc.showPrices !== false} bgCard={bgCard} borderCard={borderCard} textMain={textMain} textSub={textSub} style={serviceStyle} />
                </div>
                {filteredServices.length === 0 && (
                  <p className="text-center py-12 text-sm" style={{ color: textSub }}>لا توجد خدمات في هذا التصنيف</p>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ── About ── */}
      {!isHidden(bc, "about") && (bc.aboutText || org.description) && (
        <section ref={aboutRef} className="py-16 max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionTitle title={`عن ${org.name}`} isDark={isDark} primary={primary} />
              <p className="mt-5 text-base leading-loose" style={{ color: textSub }}>
                {bc.aboutText || org.description}
              </p>
              <div className="flex gap-3 mt-7">
                <Link to={`/book/${org.slug}`}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white shadow-sm hover:opacity-90 transition-opacity text-sm"
                  style={{ background: primary }}>
                  <CalendarCheck className="w-4 h-4" /> احجز موعدك
                </Link>
                {org.phone && (
                  <a href={`tel:${org.phone}`}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold border text-sm transition-colors hover:opacity-80"
                    style={{ borderColor: primary, color: primary }}>
                    <Phone className="w-4 h-4" /> اتصل بنا
                  </a>
                )}
              </div>
            </div>
            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: "جودة مضمونة", desc: "نلتزم بأعلى معايير الجودة في كل خدمة" },
                { title: "فريق متخصص", desc: "خبراء محترفون في مجالهم" },
                { title: "خدمة سريعة", desc: "نحرص على دقة المواعيد والالتزام" },
                { title: "رضا العملاء", desc: "سعادتك هي أولويتنا الأولى" },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl p-4 border" style={{ background: bgCard, borderColor: borderCard }}>
                  <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center text-white font-bold text-xs"
                    style={{ background: `${primary}18`, color: primary }}>
                    {i + 1}
                  </div>
                  <p className="font-bold text-sm mb-1" style={{ color: textMain }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: textSub }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Reviews ── */}
      {!isHidden(bc, "reviews") && reviews.length > 0 && (
        <section ref={reviewsRef} className="py-16" style={{ background: bgSectionAlt }}>
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-end justify-between mb-8">
              <SectionTitle
                title="آراء العملاء"
                subtitle={stats.avgRating ? `${stats.avgRating} من 5 — ${stats.reviewCount} تقييم` : `${stats.reviewCount} تقييم`}
                isDark={isDark} primary={primary}
              />
              {reviews.length > reviewsPerPage && (
                <div className="flex gap-2">
                  <button onClick={() => setReviewIdx(i => Math.max(0, i - 1))} disabled={reviewIdx === 0}
                    className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer bg-transparent"
                    style={{ borderColor: borderCard, color: textSub }}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setReviewIdx(i => Math.min(maxReviewPage, i + 1))} disabled={reviewIdx >= maxReviewPage}
                    className="w-9 h-9 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer bg-transparent"
                    style={{ borderColor: borderCard, color: textSub }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleReviews.map((r, idx) => (
                <div key={r.id} className={`sf-reveal sf-d${(idx % 3) + 1} sf-card-lift rounded-2xl p-5 border relative overflow-hidden`}
                  style={{ background: bgCard, borderColor: borderCard }}>
                  {/* Decorative quote mark */}
                  <div className="absolute top-3 left-4 text-6xl font-black leading-none select-none pointer-events-none"
                    style={{ color: primary, opacity: 0.07 }}>"</div>
                  <StarRating rating={r.rating} />
                  {r.comment && (
                    <p className="mt-3 text-sm leading-relaxed line-clamp-4 relative z-10" style={{ color: textSub }}>
                      {r.comment}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-3 pt-4 border-t" style={{ borderColor: borderCard }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${primary}, ${primary}bb)` }}>
                      {(r.authorName || "؟")[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: textMain }}>{r.authorName || "عميل"}</p>
                      <p className="text-xs" style={{ color: textSub }}>{formatDate(r.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {reviews.length > reviewsPerPage && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: maxReviewPage + 1 }).map((_, i) => (
                  <button key={i} onClick={() => setReviewIdx(i)}
                    className="w-2.5 h-2.5 rounded-full transition-all cursor-pointer border-0"
                    style={{ background: i === reviewIdx ? primary : `${primary}30` }} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Blog ── */}
      {blog.length > 0 && (
        <section className="py-16 max-w-6xl mx-auto px-4">
          <SectionTitle title="المدونة" subtitle="آخر المقالات والأخبار" isDark={isDark} primary={primary} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {blog.map(post => (
              <div key={post.id} className="rounded-2xl overflow-hidden border hover:shadow-md transition-all"
                style={{ background: bgCard, borderColor: borderCard }}>
                {post.coverImage && <img src={post.coverImage} alt={post.title} className="w-full h-44 object-cover" />}
                <div className="p-5">
                  <h3 className="font-bold leading-snug" style={{ color: textMain }}>{post.title}</h3>
                  {post.excerpt && <p className="text-sm mt-1.5 line-clamp-2" style={{ color: textSub }}>{post.excerpt}</p>}
                  {post.publishedAt && <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: textSub }}>
                    <BookOpen className="w-3.5 h-3.5" /> {formatDate(post.publishedAt)}
                  </p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Custom Blocks (merchant promotional content) ── */}
      {customBlocks.length > 0 && (
        <div>
          {customBlocks.map(block => (
            <PublicBlock key={block.id} block={block} org={org} primary={primary} font={font} bgCard={bgCard} borderCard={borderCard} textMain={textMain} textSub={textSub} services={services} categories={categories} />
          ))}
        </div>
      )}

      {/* ── FAQ ── */}
      {faqItems.length > 0 && (
        <section className="py-16" style={{ background: bgSectionAlt }}>
          <div className="max-w-3xl mx-auto px-4">
            <SectionTitle title="الأسئلة الشائعة" isDark={isDark} primary={primary} centered />
            <div className="mt-8 space-y-3">
              {faqItems.map((item, i) => (
                <div key={i} className="rounded-2xl border overflow-hidden" style={{ borderColor: borderCard }}>
                  <button onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-right font-semibold text-sm transition-colors cursor-pointer border-0 bg-transparent"
                    style={{ background: activeFaq === i ? `${primary}10` : bgCard, color: textMain }}>
                    {item.q}
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${activeFaq === i ? "rotate-180" : ""}`} style={{ color: textSub }} />
                  </button>
                  {activeFaq === i && (
                    <div className="px-5 pb-4 text-sm leading-relaxed" style={{ background: bgCard, color: textSub }}>
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Booking CTA ── */}
      {bc.showBookingButton !== false && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="relative rounded-3xl overflow-hidden p-8 md:p-14 text-center" style={{ background: primary }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
              <div className="relative">
                <p className="text-2xl md:text-3xl font-extrabold text-white mb-2">جاهز لتجربة مميزة؟</p>
                <p className="text-white/75 text-base mb-8">احجز موعدك الآن بسهولة وسرعة</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link to={`/book/${org.slug}`}
                    className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 shadow-lg"
                    style={{ background: "white", color: primary }}>
                    <CalendarCheck className="w-4 h-4" /> احجز الآن
                  </Link>
                  {org.phone && (
                    <a href={`tel:${org.phone}`}
                      className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm border-2 border-white/40 text-white bg-white/10 transition-all hover:-translate-y-0.5 backdrop-blur-sm">
                      <Phone className="w-4 h-4" /> اتصل بنا
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Contact + Branches ── */}
      <section ref={contactRef} className="py-16" style={{ background: bgSectionAlt }}>
        <div className="max-w-6xl mx-auto px-4">
          <SectionTitle title={contactSettingsBC.title || "تواصل معنا"} isDark={isDark} primary={primary} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-10">
            {/* Info side */}
            <div className="space-y-5">
              <div className="rounded-2xl p-6 border" style={{ background: bgCard, borderColor: borderCard }}>
                <p className="font-bold mb-5" style={{ color: textMain }}>معلومات التواصل</p>
                <div className="space-y-4">
                  {org.phone && (
                    <a href={`tel:${org.phone}`} className="flex items-center gap-3 text-sm group hover:opacity-80 transition-opacity" style={{ color: textSub }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${primary}15` }}>
                        <Phone className="w-4 h-4" style={{ color: primary }} />
                      </div>
                      <span dir="ltr" className="font-medium" style={{ color: textMain }}>{org.phone}</span>
                    </a>
                  )}
                  {org.email && (
                    <a href={`mailto:${org.email}`} className="flex items-center gap-3 text-sm hover:opacity-80 transition-opacity" style={{ color: textSub }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${primary}15` }}>
                        <Mail className="w-4 h-4" style={{ color: primary }} />
                      </div>
                      <span style={{ color: textMain }}>{org.email}</span>
                    </a>
                  )}
                  {(org.address || org.city) && (
                    <div className="flex items-center gap-3 text-sm" style={{ color: textSub }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${primary}15` }}>
                        <MapPin className="w-4 h-4" style={{ color: primary }} />
                      </div>
                      <span style={{ color: textMain }}>{[org.address, org.city].filter(Boolean).join("، ")}</span>
                    </div>
                  )}
                </div>

                {/* Social */}
                {(org.instagram || org.twitter || org.tiktok || org.snapchat) && (
                  <div className="flex gap-2 mt-5 pt-5 border-t" style={{ borderColor: borderCard }}>
                    {org.instagram && <SocialIcon href={`https://instagram.com/${org.instagram}`} primary={primary} borderColor={borderCard}><Instagram className="w-4 h-4" /></SocialIcon>}
                    {org.twitter && <SocialIcon href={`https://twitter.com/${org.twitter}`} primary={primary} borderColor={borderCard}><Twitter className="w-4 h-4" /></SocialIcon>}
                    {org.tiktok && <SocialIcon href={`https://tiktok.com/@${org.tiktok}`} primary={primary} borderColor={borderCard}><Globe className="w-4 h-4" /></SocialIcon>}
                    {org.snapchat && <SocialIcon href={`https://snapchat.com/add/${org.snapchat}`} primary={primary} borderColor={borderCard}><Globe className="w-4 h-4" /></SocialIcon>}
                  </div>
                )}
              </div>

              {/* Branches */}
              {branches.length > 0 && (
                <div className="space-y-3">
                  <p className="font-bold text-sm" style={{ color: textMain }}>الفروع ({branches.length})</p>
                  {branches.map(b => (
                    <div key={b.id} className="rounded-2xl p-4 border text-sm" style={{ background: bgCard, borderColor: borderCard }}>
                      <p className="font-semibold" style={{ color: textMain }}>{b.name}</p>
                      {b.address && (
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="flex items-center gap-1.5" style={{ color: textSub }}><MapPin className="w-3.5 h-3.5 shrink-0" />{b.address}</p>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([b.address, b.city].filter(Boolean).join(" "))}`}
                            target="_blank" rel="noreferrer"
                            className="text-[10px] font-medium shrink-0 hover:opacity-80 transition-opacity mr-2"
                            style={{ color: primary }}>الخريطة</a>
                        </div>
                      )}
                      {b.phone && <p className="flex items-center gap-1.5 mt-1" style={{ color: textSub }}><Phone className="w-3.5 h-3.5" /><span dir="ltr">{b.phone}</span></p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Map + Contact form */}
            <div className="space-y-5">
              {contactSettingsBC.showMap !== false && (org.address || org.city) && (
                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: borderCard }}>
                  <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent([org.address, org.city].filter(Boolean).join("، "))}&output=embed&hl=ar`}
                    width="100%"
                    height="240"
                    style={{ border: 0, display: "block" }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="موقع المنشأة"
                  />
                  <div className="flex items-center justify-between px-4 py-2.5 text-xs" style={{ background: bgCard, color: textSub }}>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{[org.address, org.city].filter(Boolean).join("، ")}</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([org.address, org.city].filter(Boolean).join(" "))}`}
                      target="_blank" rel="noreferrer"
                      className="font-medium hover:opacity-80 transition-opacity"
                      style={{ color: primary }}>
                      فتح في خرائط Google
                    </a>
                  </div>
                </div>
              )}
              <div className="rounded-2xl p-6 md:p-8 border" style={{ background: bgCard, borderColor: borderCard }}>
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${primary}15` }}>
                    <MessageSquare className="w-4 h-4" style={{ color: primary }} />
                  </div>
                  <p className="font-bold" style={{ color: textMain }}>أرسل لنا رسالة</p>
                </div>
                {contactSettingsBC.showForm !== false && <ContactForm orgId={org.id} primary={primary} />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-10" style={{ background: isDark ? "#0a0a0a" : "#111827", borderColor: isDark ? "#222" : "#1f2937" }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pb-8 border-b border-white/10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                {logo ? (
                  <img src={logo} alt={org.name} className="h-8 w-auto object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: primary }}>{org.name[0]}</div>
                )}
                <span className="font-bold text-white">{org.name}</span>
              </div>
              {org.tagline && <p className="text-sm text-gray-400 leading-relaxed">{org.tagline}</p>}
            </div>

            {/* Links */}
            <div>
              <p className="font-semibold text-white text-sm mb-3">روابط سريعة</p>
              <div className="space-y-2">
                {navLinks.map(n => n.href ? (
                  <Link key={n.label} to={n.href} className="block text-sm text-gray-400 hover:text-white transition-colors">{n.label}</Link>
                ) : (
                  <button key={n.label} onClick={() => scrollTo(n.ref!)}
                    className="block text-sm text-gray-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0 text-right w-full">
                    {n.label}
                  </button>
                ))}
                <Link to={`/book/${org.slug}`} className="block text-sm text-gray-400 hover:text-white transition-colors no-underline" style={{ color: primary }}>
                  احجز الآن
                </Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="font-semibold text-white text-sm mb-3">تواصل معنا</p>
              <div className="space-y-2 text-sm text-gray-400">
                {org.phone && <a href={`tel:${org.phone}`} className="flex items-center gap-2 hover:text-white transition-colors"><Phone className="w-3.5 h-3.5" /><span dir="ltr">{org.phone}</span></a>}
                {org.email && <a href={`mailto:${org.email}`} className="flex items-center gap-2 hover:text-white transition-colors"><Mail className="w-3.5 h-3.5" />{org.email}</a>}
                {org.city && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{org.city}</div>}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-xs text-gray-500">
            <p>جميع الحقوق محفوظة لـ {org.name} © {new Date().getFullYear()}</p>
            <a href="https://nasaq.sa" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors no-underline">
              مدعوم بـ نسق
            </a>
          </div>
        </div>
      </footer>

      {/* ── WhatsApp Float ── */}
      {showWhatsApp && (
        <a href={whatsappLink} target="_blank" rel="noreferrer"
          className="fixed bottom-6 left-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-50 wa-ring relative"
          style={{ background: "#25D366" }}>
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white relative z-10">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </a>
      )}

      {/* ── Back to Top ── */}
      {showTop && (
        <button onClick={scrollToTop}
          className="fixed bottom-6 right-6 w-11 h-11 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-200 z-50 border-0 cursor-pointer"
          style={{ background: primary, color: "white" }}
          aria-label="العودة للأعلى">
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors border-0 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// ══ Helper Components ═════════════════════════════════════════════

function HeroContent({ org, stats, bc, primary, light, dark, center }: {
  org: OrgData; stats: SiteData["stats"]; bc: BuilderConfig;
  primary: string; light?: boolean; dark?: boolean; center?: boolean;
}) {
  const textColor = light ? "text-white" : dark ? "text-white" : "text-gray-900";
  const subColor = light ? "text-white/75" : dark ? "text-gray-300" : "text-gray-500";
  const title = bc.heroTitle || org.name;
  const subtitle = bc.heroSubtitle || org.tagline || org.description;
  const btnText = bc.heroSettings?.buttonText || "احجز موعدك الآن";
  const btnLink = bc.heroSettings?.buttonLink || `/book/${org.slug}`;

  return (
    <div className={center ? "text-center mx-auto" : "max-w-2xl"}>
      {org.city && (
        <div className="flex items-center gap-1.5 text-sm mb-4 opacity-80">
          <MapPin className={`w-3.5 h-3.5 ${light ? "text-white/70" : ""}`} />
          <span className={light ? "text-white/80" : "text-gray-500"}>{org.city}</span>
        </div>
      )}
      <h1 className={`text-3xl md:text-5xl font-extrabold leading-tight ${textColor}`}
        style={{ textShadow: light ? "0 2px 20px rgba(0,0,0,0.3)" : "none" }}>
        {title}
      </h1>
      {subtitle && (
        <p className={`text-lg md:text-xl mt-3 leading-relaxed ${subColor}`}>{subtitle}</p>
      )}
      {(stats.avgRating || stats.reviewCount > 0) && (
        <div className="flex flex-wrap gap-4 mt-5">
          {stats.avgRating && (
            <div className={`flex items-center gap-1.5 text-sm ${light ? "text-white/80" : "text-gray-500"}`}>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold">{stats.avgRating}</span>
              {stats.reviewCount > 0 && <span>({stats.reviewCount} تقييم)</span>}
            </div>
          )}
          {stats.serviceCount > 0 && (
            <div className={`flex items-center gap-1.5 text-sm ${light ? "text-white/80" : "text-gray-500"}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: light ? "white" : primary }} />
              <span>{stats.serviceCount} خدمة متاحة</span>
            </div>
          )}
        </div>
      )}
      <div className={`flex flex-wrap gap-3 mt-7 ${center ? "justify-center" : ""}`}>
        <Link to={btnLink}
          className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white shadow-xl hover:opacity-90 hover:-translate-y-0.5 transition-all text-sm"
          style={{ background: primary }}>
          <CalendarCheck className="w-4 h-4" /> {btnText}
        </Link>
        {org.phone && (
          <a href={`tel:${org.phone}`}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm border-2 hover:-translate-y-0.5 transition-all ${light ? "text-white border-white/40 bg-white/10 backdrop-blur-sm" : "text-gray-700 border-gray-200 bg-white"}`}>
            <Phone className="w-4 h-4" /> <span dir="ltr">{org.phone}</span>
          </a>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle, isDark, primary, centered }: { title: string; subtitle?: string; isDark?: boolean; primary: string; centered?: boolean }) {
  return (
    <div className={centered ? "text-center" : ""}>
      <div className={`flex items-center gap-3 ${centered ? "justify-center" : ""}`}>
        <div className="w-1 h-6 rounded-full" style={{ background: primary }} />
        <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: isDark ? "#f9fafb" : "#111827" }}>{title}</h2>
      </div>
      {subtitle && <p className="mt-1.5 text-sm" style={{ color: isDark ? "#9ca3af" : "#6b7280", marginRight: centered ? 0 : "1rem" }}>{subtitle}</p>}
    </div>
  );
}

function FilterPill({ label, active, onClick, primary, isDark }: { label: string; active: boolean; onClick: () => void; primary: string; isDark?: boolean }) {
  return (
    <button onClick={onClick}
      className="px-4 py-1.5 rounded-full text-sm font-medium transition-all border cursor-pointer bg-transparent"
      style={active
        ? { background: primary, color: "white", borderColor: primary }
        : { borderColor: isDark ? "#374151" : "#e5e7eb", color: isDark ? "#d1d5db" : "#6b7280" }}>
      {label}
    </button>
  );
}

function ServiceCard({ service, orgSlug, primary, showPrice, bgCard, borderCard, textMain, textSub }: {
  service: Service; orgSlug: string; primary: string; showPrice: boolean;
  bgCard: string; borderCard: string; textMain: string; textSub: string;
}) {
  return (
    <div className="sf-reveal sf-reveal-scale sf-card-lift rounded-2xl overflow-hidden border flex flex-col group"
      style={{ background: bgCard, borderColor: borderCard }}>
      {/* Image with zoom */}
      <div className="relative overflow-hidden">
        {service.coverImage ? (
          <>
            <img src={service.coverImage} alt={service.name}
              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Link to={`/book/${orgSlug}?serviceId=${service.id}`}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <span className="bg-white/90 backdrop-blur-sm text-xs font-bold px-4 py-2 rounded-full translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
                style={{ color: primary }}>
                احجز الآن
              </span>
            </Link>
          </>
        ) : (
          <div className="w-full h-48 flex items-center justify-center text-5xl font-black transition-transform duration-300 group-hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${primary}18, ${primary}30)`, color: primary }}>
            {service.name[0]}
          </div>
        )}
        {/* Price badge */}
        {showPrice && service.price && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow"
            style={{ background: primary }}>
            {formatPrice(service.price, service.pricingType)}
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold leading-snug text-sm" style={{ color: textMain }}>{service.name}</h3>
        {service.description && (
          <p className="text-xs mt-1.5 line-clamp-2 flex-1 leading-relaxed" style={{ color: textSub }}>{service.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          {showPrice && service.price ? (
            <span className="font-extrabold text-sm" style={{ color: primary }}>
              {formatPrice(service.price, service.pricingType)}
            </span>
          ) : <span />}
          <Link to={`/book/${orgSlug}?serviceId=${service.id}`}
            className="flex items-center gap-1 text-xs font-bold px-3.5 py-2 rounded-xl hover:opacity-90 hover:gap-2 transition-all duration-200 text-white shrink-0"
            style={{ background: primary }}>
            احجز
            <ArrowLeft className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Renders services according to the template's serviceStyle
function ServiceLayout({ services, orgSlug, primary, showPrice, bgCard, borderCard, textMain, textSub, style }: {
  services: Service[]; orgSlug: string; primary: string; showPrice: boolean;
  bgCard: string; borderCard: string; textMain: string; textSub: string;
  style: TemplateStyle["serviceStyle"];
}) {
  if (services.length === 0) return null;

  // LIST: horizontal row — image on right, text on left
  if (style === "list") {
    return (
      <div className="flex flex-col divide-y" style={{ borderColor: borderCard }}>
        {services.map(s => (
          <div key={s.id} className="flex items-center gap-4 py-4 hover:bg-black/[0.02] transition-colors rounded-xl px-2 -mx-2">
            {s.coverImage ? (
              <img src={s.coverImage} alt={s.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl flex items-center justify-center font-black text-xl shrink-0" style={{ background: `${primary}12`, color: primary }}>{s.name[0]}</div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm leading-snug" style={{ color: textMain }}>{s.name}</h3>
              {s.description && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: textSub }}>{s.description}</p>}
              {showPrice && s.price && <p className="text-xs font-extrabold mt-1" style={{ color: primary }}>{formatPrice(s.price, s.pricingType)}</p>}
            </div>
            <Link to={`/book/${orgSlug}?serviceId=${s.id}`}
              className="shrink-0 text-xs font-bold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
              style={{ background: primary }}>
              احجز
            </Link>
          </div>
        ))}
      </div>
    );
  }

  // MENU: restaurant menu style — name bold, price big, category dividers, minimal images
  if (style === "menu") {
    return (
      <div className="space-y-3">
        {services.map(s => (
          <div key={s.id} className="flex items-start gap-4 p-4 rounded-2xl border hover:shadow-sm transition-all" style={{ background: bgCard, borderColor: borderCard }}>
            {s.coverImage && <img src={s.coverImage} alt={s.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-extrabold text-base leading-tight" style={{ color: textMain }}>{s.name}</h3>
                {showPrice && s.price && (
                  <span className="font-black text-lg shrink-0" style={{ color: primary }}>{formatPrice(s.price, s.pricingType)}</span>
                )}
              </div>
              {s.description && <p className="text-sm mt-1.5 line-clamp-2 leading-relaxed" style={{ color: textSub }}>{s.description}</p>}
              {s.duration && <p className="text-xs mt-2 opacity-60" style={{ color: textSub }}>{s.duration} دقيقة</p>}
            </div>
            <Link to={`/book/${orgSlug}?serviceId=${s.id}`}
              className="shrink-0 text-xs font-bold px-3 py-2 rounded-xl text-white transition-opacity hover:opacity-90 self-end"
              style={{ background: primary }}>
              احجز
            </Link>
          </div>
        ))}
      </div>
    );
  }

  // MAGAZINE: first service as featured hero, rest as 3-col grid
  if (style === "magazine") {
    const [first, ...rest] = services;
    return (
      <div className="space-y-4">
        {first && (
          <div className="relative rounded-3xl overflow-hidden" style={{ minHeight: 280 }}>
            {first.coverImage ? (
              <img src={first.coverImage} alt={first.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}99 100%)` }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
            <div className="relative p-6 md:p-8 flex flex-col justify-end h-full min-h-[280px]">
              <h3 className="font-black text-xl md:text-2xl text-white leading-tight">{first.name}</h3>
              {first.description && <p className="text-white/70 text-sm mt-1.5 line-clamp-2">{first.description}</p>}
              <div className="flex items-center gap-3 mt-4">
                {showPrice && first.price && <span className="font-extrabold text-white">{formatPrice(first.price, first.pricingType)}</span>}
                <Link to={`/book/${orgSlug}?serviceId=${first.id}`}
                  className="text-xs font-bold px-4 py-2.5 rounded-xl text-white" style={{ background: primary }}>
                  احجز الآن
                </Link>
              </div>
            </div>
          </div>
        )}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map(s => <ServiceCard key={s.id} service={s} orgSlug={orgSlug} primary={primary} showPrice={showPrice} bgCard={bgCard} borderCard={borderCard} textMain={textMain} textSub={textSub} />)}
          </div>
        )}
      </div>
    );
  }

  // SHOWCASE: 2-col with large images and minimal text overlay
  if (style === "showcase") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {services.map(s => (
          <Link key={s.id} to={`/book/${orgSlug}?serviceId=${s.id}`}
            className="group relative rounded-3xl overflow-hidden block"
            style={{ minHeight: 240 }}>
            {s.coverImage ? (
              <img src={s.coverImage} alt={s.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primary}cc 0%, ${primary}66 100%)` }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h3 className="font-extrabold text-white text-lg leading-tight">{s.name}</h3>
              <div className="flex items-center justify-between mt-2">
                {showPrice && s.price && <span className="text-white/80 text-sm font-bold">{formatPrice(s.price, s.pricingType)}</span>}
                <span className="text-xs font-bold text-white px-3 py-1 rounded-full" style={{ background: primary }}>احجز</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  // DEFAULT: GRID
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {services.map(s => <ServiceCard key={s.id} service={s} orgSlug={orgSlug} primary={primary} showPrice={showPrice} bgCard={bgCard} borderCard={borderCard} textMain={textMain} textSub={textSub} />)}
    </div>
  );
}

function SocialIcon({ href, primary, borderColor, children }: { href: string; primary: string; borderColor: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:opacity-80 hover:-translate-y-0.5"
      style={{ borderColor: primary, color: primary }}>
      {children}
    </a>
  );
}

// ── Safe href — rejects javascript: / data: / vbscript: protocols ─
function safeHref(url: string, fallback = "#"): string {
  if (!url) return fallback;
  const lower = url.trim().toLowerCase().replace(/[\s\u0000-\u001f]/g, "");
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) return fallback;
  return url;
}

// ── Public Block Renderer (merchant custom content) ───────────────
function PublicBlock({ block, org, primary, font, bgCard, borderCard, textMain, textSub, services, categories }: {
  block: { id: string; type: string; content: Record<string, unknown> };
  org: OrgData; primary: string; font: string;
  bgCard: string; borderCard: string; textMain: string; textSub: string;
  services: Service[]; categories: Category[];
}) {
  const [blockLightbox, setBlockLightbox] = useState<string | null>(null);
  const c = block.content;

  switch (block.type) {
    case "hero": {
      const bg = String(c.bgColor || primary);
      return (
        <section className="relative overflow-hidden">
          {c.imageUrl ? (
            <div className="relative h-[360px]">
              <img src={String(c.imageUrl)} alt={String(c.title || "")} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />
              <div className="relative h-full flex items-end">
                <div className="max-w-6xl mx-auto px-4 pb-12 w-full">
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{String(c.title || "")}</h2>
                  {!!c.subtitle && <p className="text-white/80 text-lg mb-5">{String(c.subtitle)}</p>}
                  {!!c.buttonText && <a href={safeHref(String(c.buttonLink || "/book/" + org.slug))} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm" style={{ background: primary, color: "white" }}>{String(c.buttonText)}</a>}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20" style={{ background: bg }}>
              <div className="max-w-6xl mx-auto px-4 text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3" style={{ fontFamily: font }}>{String(c.title || "")}</h2>
                {!!c.subtitle && <p className="text-white/80 text-lg mb-6">{String(c.subtitle)}</p>}
                {!!c.buttonText && <a href={safeHref(String(c.buttonLink || "/book/" + org.slug))} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-white" style={{ color: bg }}>{String(c.buttonText)}</a>}
              </div>
            </div>
          )}
        </section>
      );
    }

    case "text": {
      const align = String(c.align || "right");
      return (
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4" style={{ textAlign: align as React.CSSProperties["textAlign"] }}>
            {!!c.title && <h2 className="text-2xl font-extrabold mb-4" style={{ color: textMain, fontFamily: font }}>{String(c.title)}</h2>}
            <p className="text-base leading-loose" style={{ color: textSub, fontFamily: font }}>{String(c.content || "")}</p>
          </div>
        </section>
      );
    }

    case "image": {
      return (
        <section className="py-10">
          <div className={`mx-auto px-4 ${c.fullWidth ? "max-w-none px-0" : "max-w-4xl"}`}>
            {!!c.url && <img src={String(c.url)} alt={String(c.alt || "")} className={`w-full object-cover ${c.fullWidth ? "" : "rounded-2xl"}`} style={{ maxHeight: 480 }} />}
            {!!c.caption && <p className="text-center text-sm mt-3" style={{ color: textSub }}>{String(c.caption)}</p>}
          </div>
        </section>
      );
    }

    case "gallery": {
      const images = (c.images as string[]) || [];
      const cols = Number(c.columns || 3);
      return images.length > 0 ? (
        <section className="py-10">
          {blockLightbox && (
            <div className="fixed inset-0 z-[100] bg-black/92 flex items-center justify-center p-4 backdrop-blur-sm"
              onClick={() => setBlockLightbox(null)}>
              <button onClick={() => setBlockLightbox(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white border-0 cursor-pointer transition-colors">
                <X className="w-5 h-5" />
              </button>
              <img src={blockLightbox} alt="" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
                onClick={e => e.stopPropagation()} />
            </div>
          )}
          <div className="max-w-6xl mx-auto px-4 sf-reveal">
            {!!c.title && (
              <h2 className="text-2xl font-extrabold mb-6" style={{ color: textMain, fontFamily: font }}>{String(c.title)}</h2>
            )}
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {images.map((img, i) => (
                <button key={i} onClick={() => setBlockLightbox(img)}
                  className="relative group overflow-hidden rounded-2xl border-0 p-0 cursor-zoom-in">
                  <img src={img} alt="" className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                    <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null;
    }

    case "services": {
      const catFilter = String(c.categoryFilter || "").trim();
      const sectionTitle = String(c.title || "");
      const filteredServices = catFilter
        ? services.filter(sv => {
            const matched = categories.find(cat => cat.name === catFilter || cat.id === catFilter);
            return matched ? sv.categoryId === matched.id : sv.categoryId === catFilter;
          })
        : services;
      const visible = filteredServices.filter(sv => sv.status === "active" || sv.status === "published");
      if (visible.length === 0) return null;
      return (
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-4">
            {!!sectionTitle && (
              <h2 className="text-2xl font-extrabold mb-2" style={{ color: textMain, fontFamily: font }}>{sectionTitle}</h2>
            )}
            {!!c.subtitle && (
              <p className="text-base mb-6" style={{ color: textSub, fontFamily: font }}>{String(c.subtitle)}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map(sv => (
                <div key={sv.id} className="rounded-2xl overflow-hidden border" style={{ background: bgCard, borderColor: borderCard }}>
                  {sv.coverImage && (
                    <img src={sv.coverImage} alt={sv.name} className="w-full h-40 object-cover" />
                  )}
                  <div className="p-4">
                    <p className="font-bold text-sm" style={{ color: textMain, fontFamily: font }}>{sv.name}</p>
                    {sv.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: textSub }}>{sv.description}</p>}
                    <div className="flex items-center justify-between mt-3">
                      {sv.price && (
                        <span className="text-sm font-bold" style={{ color: primary }}>{sv.price} ر.س</span>
                      )}
                      <Link to={`/book/${org.slug}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white"
                        style={{ background: primary }}>
                        احجز
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "booking_cta": {
      const bg = String(c.bgColor || primary);
      return (
        <section className="py-14">
          <div className="max-w-6xl mx-auto px-4">
            <div className="rounded-3xl p-10 text-center" style={{ background: bg }}>
              <h2 className="text-2xl font-extrabold text-white mb-2" style={{ fontFamily: font }}>{String(c.title || "احجز موعدك الآن")}</h2>
              {!!c.subtitle && <p className="text-white/75 mb-6">{String(c.subtitle)}</p>}
              <Link to={`/book/${org.slug}`} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-white" style={{ color: bg }}>
                <CalendarCheck className="w-4 h-4" /> {String(c.buttonText || "احجز الآن")}
              </Link>
            </div>
          </div>
        </section>
      );
    }

    case "html": {
      const clean = DOMPurify.sanitize(String(c.code || ""), {
        FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "base"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"],
        FORCE_BODY: true,
      });
      return (
        <section className="py-8 max-w-6xl mx-auto px-4">
          <div dangerouslySetInnerHTML={{ __html: clean }} />
        </section>
      );
    }

    default: return null;
  }
}
