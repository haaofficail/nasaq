import { useState, useEffect } from "react";
import DOMPurify from "dompurify";

function safeHref(url: string, fallback = "#"): string {
  if (!url) return fallback;
  const lower = url.trim().toLowerCase().replace(/[\s\u0000-\u001f]/g, "");
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) return fallback;
  return url;
}
import { useParams, Link } from "react-router-dom";
import { websiteApi } from "@/lib/api";
import { MapPin, Phone, ArrowRight, Globe, Instagram, Twitter } from "lucide-react";

interface OrgData {
  id: string; name: string; slug: string;
  logo?: string; phone?: string; email?: string;
  city?: string; address?: string;
  primaryColor: string;
  instagram?: string; twitter?: string;
}

interface SiteConfig {
  templateId?: string; logoUrl?: string; primaryColor?: string;
  fontFamily?: string; builderConfig?: Record<string, unknown>;
}

interface BlockItem {
  id: string; type: string; content: Record<string, unknown>;
}

interface PageData {
  id: string; title: string; slug: string;
  isPublished: boolean; blocks: BlockItem[];
}

interface SiteData {
  org: OrgData; config: SiteConfig | null;
}

interface PageResponse {
  data: PageData;
}

// ── Block Renderer ─────────────────────────────────────────────────
function RenderBlock({ block, primary, font }: {
  block: BlockItem; primary: string; font: string;
}) {
  const c = block.content;

  switch (block.type) {
    case "hero": {
      const bg = String(c.bgColor || primary);
      if (c.imageUrl) {
        return (
          <section className="relative overflow-hidden">
            <div className="relative h-[360px]">
              <img src={String(c.imageUrl)} alt={String(c.title || "")} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />
              <div className="relative h-full flex items-end">
                <div className="max-w-5xl mx-auto px-4 pb-12 w-full">
                  {!!c.title && <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2" style={{ fontFamily: font }}>{String(c.title)}</h1>}
                  {!!c.subtitle && <p className="text-white/80 text-lg mb-5">{String(c.subtitle)}</p>}
                  {!!c.buttonText && <a href={safeHref(String(c.buttonLink || "#"))} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm" style={{ background: primary, color: "white" }}>{String(c.buttonText)}</a>}
                </div>
              </div>
            </div>
          </section>
        );
      }
      return (
        <section className="py-20" style={{ background: bg }}>
          <div className="max-w-5xl mx-auto px-4 text-center">
            {!!c.title && <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3" style={{ fontFamily: font }}>{String(c.title)}</h1>}
            {!!c.subtitle && <p className="text-white/80 text-lg mb-6">{String(c.subtitle)}</p>}
            {!!c.buttonText && <a href={safeHref(String(c.buttonLink || "#"))} className="inline-flex items-center gap-2 px-8 py-[6px] rounded-xl font-bold text-sm bg-white" style={{ color: bg }}>{String(c.buttonText)}</a>}
          </div>
        </section>
      );
    }

    case "text": {
      const align = String(c.align || "right");
      return (
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4" style={{ textAlign: align as React.CSSProperties["textAlign"], fontFamily: font }}>
            {!!c.title && <h2 className="text-2xl font-extrabold text-gray-900 mb-4">{String(c.title)}</h2>}
            <p className="text-base leading-loose text-gray-600">{String(c.content || "")}</p>
          </div>
        </section>
      );
    }

    case "image": {
      const full = !!c.fullWidth;
      return (
        <section className={full ? "" : "py-10"}>
          <div className={full ? "" : "max-w-4xl mx-auto px-4"}>
            {!!c.url && <img src={String(c.url)} alt={String(c.alt || "")} className={`${full ? "w-full" : "w-full rounded-2xl"} object-cover`} />}
            {!!c.caption && <p className="text-center text-sm text-gray-400 mt-3">{String(c.caption)}</p>}
          </div>
        </section>
      );
    }

    case "gallery": {
      const images = Array.isArray(c.images) ? (c.images as string[]) : [];
      const cols = Number(c.columns || 3);
      if (images.length === 0) return null;
      return (
        <section className="py-10">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {images.map((img, i) => (
                <img key={i} src={img} alt="" className="w-full h-52 object-cover rounded-2xl" />
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "booking_cta": {
      const bg = String(c.bgColor || primary);
      return (
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4">
            <div className="rounded-3xl overflow-hidden p-8 md:p-14 text-center" style={{ background: bg }}>
              {!!c.title && <p className="text-2xl md:text-3xl font-extrabold text-white mb-2" style={{ fontFamily: font }}>{String(c.title)}</p>}
              {!!c.subtitle && <p className="text-white/75 text-base mb-8">{String(c.subtitle)}</p>}
              {!!c.buttonText && (
                <a href={safeHref(String(c.buttonLink || "#"))} className="inline-flex items-center gap-2 px-8 py-[6px] rounded-xl font-bold text-sm bg-white shadow-lg" style={{ color: bg }}>
                  {String(c.buttonText)}
                </a>
              )}
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
        <section className="py-10">
          <div className="max-w-5xl mx-auto px-4"
            dangerouslySetInnerHTML={{ __html: clean }} />
        </section>
      );
    }

    default:
      return null;
  }
}

// ── Main Component ─────────────────────────────────────────────────
export function PublicPagePage() {
  const { orgSlug, pageSlug } = useParams<{ orgSlug: string; pageSlug: string }>();
  const [site, setSite] = useState<SiteData | null>(null);
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orgSlug || !pageSlug) return;
    Promise.all([
      websiteApi.publicSite(orgSlug),
      websiteApi.publicPage(orgSlug, pageSlug) as Promise<PageResponse>,
    ]).then(([siteData, pageData]) => {
      if (!siteData?.org || !pageData?.data) { setNotFound(true); setLoading(false); return; }
      setSite(siteData as SiteData);
      setPage(pageData.data);
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [orgSlug, pageSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="w-10 h-10 border-4 border-[#eef2f6] rounded-full animate-spin" style={{ borderTopColor: "#5b9bd5" }} />
      </div>
    );
  }

  if (notFound || !site || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center px-4">
          <p className="text-6xl font-black text-gray-100 mb-4">404</p>
          <p className="text-xl font-bold text-gray-700 mb-2">هذه الصفحة غير موجودة</p>
          <Link to={`/s/${orgSlug}`} className="text-sm font-medium text-blue-600 hover:underline">
            العودة إلى الموقع الرئيسي
          </Link>
        </div>
      </div>
    );
  }

  const { org, config } = site;
  const primary = config?.primaryColor || org.primaryColor || "#5b9bd5";
  const font = config?.fontFamily || "IBM Plex Sans Arabic";
  const logo = config?.logoUrl || org.logo;
  const isDark = config?.templateId === "dark" || config?.templateId === "bold" || config?.templateId === "corporate";

  const bgPage = isDark ? "#0d0d0d" : "#f9fafb";
  const bgHeader = isDark ? "#111" : "#fff";
  const borderHeader = isDark ? "#222" : "#f1f5f9";
  const textMain = isDark ? "#f3f4f6" : "#111827";
  const textSub = isDark ? "#9ca3af" : "#6b7280";

  const blocks: BlockItem[] = Array.isArray(page.blocks) ? page.blocks : [];

  return (
    <div dir="rtl" style={{ fontFamily: font, background: bgPage, color: textMain, minHeight: "100vh" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b px-4 py-3" style={{ background: bgHeader, borderColor: borderHeader }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link to={`/s/${orgSlug}`} className="flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: textSub }}>
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <Link to={`/s/${orgSlug}`} className="flex items-center gap-2 font-extrabold text-base" style={{ color: textMain }}>
            {logo && <img src={logo} alt={org.name} className="w-7 h-7 rounded-lg object-cover" />}
            {org.name}
          </Link>
          <Link to={`/book/${orgSlug}`}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: primary }}>
            احجز الآن
          </Link>
        </div>
      </header>

      {/* Page title (if no hero block at top) */}
      {(blocks.length === 0 || blocks[0]?.type !== "hero") && (
        <div className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-extrabold" style={{ color: textMain, fontFamily: font }}>{page.title}</h1>
        </div>
      )}

      {/* Blocks */}
      <main>
        {blocks.length > 0 ? (
          blocks.map(block => (
            <RenderBlock key={block.id} block={block} primary={primary} font={font} />
          ))
        ) : (
          <div className="max-w-5xl mx-auto px-4 py-20 text-center">
            <p className="text-gray-400">لا يوجد محتوى في هذه الصفحة بعد.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 px-4" style={{ background: isDark ? "#0a0a0a" : "#111827", borderColor: isDark ? "#222" : "#1f2937" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <Link to={`/s/${orgSlug}`} className="font-bold text-white hover:opacity-80 transition-opacity">{org.name}</Link>
          <div className="flex items-center gap-4">
            {org.phone && <a href={`tel:${org.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors"><Phone className="w-3.5 h-3.5" /><span dir="ltr">{org.phone}</span></a>}
            {(org.address || org.city) && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{org.city}</span>}
          </div>
          <div className="flex items-center gap-3">
            {org.instagram && <a href={`https://instagram.com/${org.instagram}`} target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><Instagram className="w-4 h-4" /></a>}
            {org.twitter && <a href={`https://twitter.com/${org.twitter}`} target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><Twitter className="w-4 h-4" /></a>}
            <a href="https://nasaq.sa" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white transition-colors text-xs"><Globe className="w-3 h-3" />ترميز OS</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
