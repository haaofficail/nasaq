import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Star, MapPin, Phone, Mail, Clock, ChevronLeft, ChevronRight,
  Instagram, Twitter, Globe, CalendarCheck, ArrowLeft, BookOpen,
  MessageSquare, CheckCircle, X, Menu,
} from "lucide-react";
import { websiteApi } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

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
  defaultMetaTitle?: string; defaultMetaDescription?: string;
  headerConfig?: any; footerConfig?: any;
}

interface Service {
  id: string; name: string; nameEn?: string; description?: string;
  price?: number; pricingType?: string; duration?: number;
  coverImage?: string; categoryId?: string; status: string;
}

interface Category { id: string; name: string; nameEn?: string; icon?: string; }
interface Branch { id: string; name: string; address?: string; phone?: string; city?: string; openingHours?: any; }
interface BlogPost { id: string; title: string; slug: string; excerpt?: string; coverImage?: string; publishedAt?: string; authorName?: string; }
interface Review { id: string; rating: number; comment?: string; authorName?: string; createdAt: string; }

interface SiteData {
  org: OrgData; config: SiteConfig | null;
  pages: any[]; services: Service[]; categories: Category[];
  branches: Branch[]; blog: BlogPost[]; reviews: Review[];
  stats: { avgRating: string | null; reviewCount: number; serviceCount: number; };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

function formatPrice(price?: number, pricingType?: string) {
  if (!price) return null;
  if (pricingType === "from") return `يبدأ من ${price.toLocaleString("en-US")} ر.س`;
  return `${price.toLocaleString("en-US")} ر.س`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", month: "long", day: "numeric" });
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${cls} ${s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function ServiceCard({ service, orgSlug, primary }: { service: Service; orgSlug: string; primary: string }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      {service.coverImage ? (
        <img src={service.coverImage} alt={service.name} className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 flex items-center justify-center text-4xl" style={{ background: `color-mix(in srgb, ${primary} 8%, white)` }}>
          ✦
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-base leading-snug">{service.name}</h3>
        {service.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2 flex-1">{service.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          {service.price ? (
            <span className="font-bold text-sm" style={{ color: primary }}>
              {formatPrice(service.price, service.pricingType)}
            </span>
          ) : <span />}
          <Link
            to={`/book/${orgSlug}?serviceId=${service.id}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-white"
            style={{ background: primary }}
          >
            احجز الآن
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <StarRating rating={review.rating} />
      {review.comment && <p className="mt-3 text-gray-600 text-sm leading-relaxed line-clamp-4">{review.comment}</p>}
      <div className="mt-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm">
          {(review.authorName || "؟")[0]}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{review.authorName || "عميل"}</p>
          <p className="text-xs text-gray-400">{formatDate(review.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

function ContactForm({ orgId, primary }: { orgId: string; primary: string }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
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
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <CheckCircle className="w-10 h-10 text-green-500" />
        <p className="font-semibold text-gray-800">تم إرسال رسالتك بنجاح</p>
        <p className="text-sm text-gray-500">سنتواصل معك قريباً</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">الاسم *</label>
          <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="اسمك الكريم" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">رقم الجوال *</label>
          <input required value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="05xxxxxxxx" dir="ltr" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">البريد الإلكتروني</label>
        <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="example@email.com" dir="ltr" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">رسالتك *</label>
        <textarea required rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
          placeholder="اكتب رسالتك هنا..." />
      </div>
      {status === "error" && <p className="text-red-500 text-sm">حدث خطأ، يرجى المحاولة مجدداً</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: primary }}
      >
        {status === "sending" ? "جاري الإرسال..." : "إرسال الرسالة"}
      </button>
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function PublicStorefrontPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [mobileMenu, setMobileMenu] = useState(false);
  const servicesRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const reviewsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!orgSlug) return;
    websiteApi.publicSite(orgSlug)
      .then((res: any) => {
        if (res?.data) setData(res.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <p className="text-5xl mb-4">404</p>
          <p className="text-xl font-semibold text-gray-700">هذا الموقع غير موجود</p>
          <p className="text-gray-400 mt-2">تأكد من صحة الرابط أو تواصل مع صاحب المتجر</p>
        </div>
      </div>
    );
  }

  const { org, config, services, categories, branches, blog, reviews, stats } = data;

  const primary = config?.primaryColor || org.primaryColor || "#1A56DB";
  const logo = config?.logoUrl || org.logo;
  const template = config?.templateId || "default";

  // CSS vars injected inline for theming
  const themeStyle = {
    "--primary": primary,
    "--primary-rgb": hexToRgb(primary.startsWith("#") ? primary : "#1A56DB"),
  } as React.CSSProperties;

  const filteredServices = activeCat === "all"
    ? services
    : services.filter(s => s.categoryId === activeCat);

  const navLinks = [
    { label: "الخدمات", onClick: () => servicesRef.current?.scrollIntoView({ behavior: "smooth" }) },
    { label: "التقييمات", onClick: () => reviewsRef.current?.scrollIntoView({ behavior: "smooth" }) },
    { label: "تواصل معنا", onClick: () => contactRef.current?.scrollIntoView({ behavior: "smooth" }) },
  ];

  // ── Dark template ────────────────────────────────────────────────────────
  const isDark = template === "dark";
  const bgMain = isDark ? "bg-gray-950" : "bg-gray-50";
  const bgCard = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`min-h-screen ${bgMain} ${textMain}`} dir="rtl" style={themeStyle}>

      {/* ── Header ── */}
      <header className={`sticky top-0 z-50 ${isDark ? "bg-gray-950/90 border-gray-800" : "bg-white/90 border-gray-100"} border-b backdrop-blur-md`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            {logo ? (
              <img src={logo} alt={org.name} className="h-9 w-auto max-w-[120px] object-contain" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                style={{ background: primary }}>
                {org.name[0]}
              </div>
            )}
            <span className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>{org.name}</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(n => (
              <button key={n.label} onClick={n.onClick}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? "text-gray-300 hover:text-white hover:bg-gray-800" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}>
                {n.label}
              </button>
            ))}
          </nav>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-2">
            <Link to={`/book/${org.slug}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: primary }}>
              <CalendarCheck className="w-4 h-4" />
              <span className="hidden sm:inline">احجز الآن</span>
            </Link>
            <button onClick={() => setMobileMenu(v => !v)} className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileMenu && (
          <div className={`md:hidden border-t ${isDark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-100"} px-4 py-3 flex flex-col gap-1`}>
            {navLinks.map(n => (
              <button key={n.label} onClick={() => { n.onClick(); setMobileMenu(false); }}
                className={`text-right px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? "text-gray-300 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-50"}`}>
                {n.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {org.coverImage ? (
          <div className="relative h-[420px] md:h-[520px]">
            <img src={org.coverImage} alt={org.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
            <div className="relative h-full flex items-end">
              <div className="max-w-6xl mx-auto px-4 pb-12 w-full">
                <HeroContent org={org} stats={stats} primary={primary} orgSlug={org.slug} light />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative py-20 md:py-28" style={{ background: `linear-gradient(135deg, ${primary}18 0%, ${primary}08 100%)` }}>
            <div className="max-w-6xl mx-auto px-4">
              <HeroContent org={org} stats={stats} primary={primary} orgSlug={org.slug} />
            </div>
          </div>
        )}
      </section>

      {/* ── Services ── */}
      {services.length > 0 && (
        <section ref={servicesRef} className="py-16 max-w-6xl mx-auto px-4">
          <SectionHeader title="خدماتنا" subtitle={`${stats.serviceCount} خدمة متاحة`} isDark={isDark} />

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-8 mt-4">
              <button
                onClick={() => setActiveCat("all")}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={activeCat === "all" ? { background: primary, color: "white" } : {}}
              >
                الكل
              </button>
              {categories.map(cat => (
                <button key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className="px-4 py-1.5 rounded-full text-sm font-medium transition-all border"
                  style={activeCat === cat.id
                    ? { background: primary, color: "white", borderColor: primary }
                    : { borderColor: isDark ? "#374151" : "#e5e7eb", color: isDark ? "#d1d5db" : "#6b7280" }
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredServices.map(s => (
              <ServiceCard key={s.id} service={s} orgSlug={org.slug} primary={primary} />
            ))}
          </div>

          {filteredServices.length === 0 && (
            <p className={`text-center py-12 ${textSub}`}>لا توجد خدمات في هذا التصنيف</p>
          )}
        </section>
      )}

      {/* ── Reviews ── */}
      {reviews.length > 0 && (
        <section ref={reviewsRef} className={`py-16 ${isDark ? "bg-gray-900/50" : "bg-white"}`}>
          <div className="max-w-6xl mx-auto px-4">
            <SectionHeader
              title="آراء العملاء"
              subtitle={stats.avgRating ? `${stats.avgRating} ★  من ${stats.reviewCount} تقييم` : `${stats.reviewCount} تقييم`}
              isDark={isDark}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
              {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Blog ── */}
      {blog.length > 0 && (
        <section className="py-16 max-w-6xl mx-auto px-4">
          <SectionHeader title="المدونة" subtitle="آخر المقالات والأخبار" isDark={isDark} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {blog.map(post => (
              <div key={post.id} className={`rounded-2xl overflow-hidden border ${bgCard} shadow-sm hover:shadow-md transition-all`}>
                {post.coverImage && (
                  <img src={post.coverImage} alt={post.title} className="w-full h-44 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-semibold leading-snug">{post.title}</h3>
                  {post.excerpt && <p className={`text-sm mt-1.5 line-clamp-2 ${textSub}`}>{post.excerpt}</p>}
                  <div className={`flex items-center gap-2 mt-3 text-xs ${textSub}`}>
                    <BookOpen className="w-3.5 h-3.5" />
                    {post.authorName && <span>{post.authorName}</span>}
                    {post.publishedAt && <span>· {formatDate(post.publishedAt)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Branches + Contact ── */}
      <section ref={contactRef} className={`py-16 ${isDark ? "bg-gray-900/50" : "bg-gray-50"}`}>
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeader title="تواصل معنا" isDark={isDark} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-8">

            {/* Contact info + branches */}
            <div className="space-y-6">
              {/* Org contact */}
              <div className={`rounded-2xl p-5 border ${bgCard}`}>
                <h3 className="font-semibold mb-4">معلومات التواصل</h3>
                <div className={`space-y-3 text-sm ${textSub}`}>
                  {org.phone && (
                    <a href={`tel:${org.phone}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                      <Phone className="w-4 h-4 shrink-0" style={{ color: primary }} />
                      <span dir="ltr">{org.phone}</span>
                    </a>
                  )}
                  {org.email && (
                    <a href={`mailto:${org.email}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                      <Mail className="w-4 h-4 shrink-0" style={{ color: primary }} />
                      <span>{org.email}</span>
                    </a>
                  )}
                  {org.address && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: primary }} />
                      <span>{org.address}{org.city ? `، ${org.city}` : ""}</span>
                    </div>
                  )}
                </div>

                {/* Social */}
                {(org.instagram || org.twitter || org.tiktok || org.snapchat) && (
                  <div className="flex gap-2 mt-4">
                    {org.instagram && (
                      <a href={`https://instagram.com/${org.instagram}`} target="_blank" rel="noreferrer"
                        className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:opacity-80"
                        style={{ borderColor: primary, color: primary }}>
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {org.twitter && (
                      <a href={`https://twitter.com/${org.twitter}`} target="_blank" rel="noreferrer"
                        className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:opacity-80"
                        style={{ borderColor: primary, color: primary }}>
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                    {(org.tiktok || org.snapchat) && (
                      <a href={org.tiktok ? `https://tiktok.com/@${org.tiktok}` : `https://snapchat.com/add/${org.snapchat}`}
                        target="_blank" rel="noreferrer"
                        className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:opacity-80"
                        style={{ borderColor: primary, color: primary }}>
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Branches */}
              {branches.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">الفروع</h3>
                  {branches.map(b => (
                    <div key={b.id} className={`rounded-2xl p-4 border ${bgCard} text-sm`}>
                      <p className="font-medium">{b.name}</p>
                      {b.address && <p className={`mt-1 ${textSub} flex items-center gap-1.5`}><MapPin className="w-3.5 h-3.5" />{b.address}</p>}
                      {b.phone && <p className={`mt-1 ${textSub} flex items-center gap-1.5`}><Phone className="w-3.5 h-3.5" /><span dir="ltr">{b.phone}</span></p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact form */}
            <div className={`rounded-2xl p-6 border ${bgCard}`}>
              <div className="flex items-center gap-2 mb-5">
                <MessageSquare className="w-5 h-5" style={{ color: primary }} />
                <h3 className="font-semibold">أرسل لنا رسالة</h3>
              </div>
              <ContactForm orgId={org.id} primary={primary} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={`border-t py-8 ${isDark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-100"}`}>
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            {logo ? (
              <img src={logo} alt={org.name} className="h-6 w-auto object-contain" />
            ) : (
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: primary }}>
                {org.name[0]}
              </div>
            )}
            <span className={`font-medium ${isDark ? "text-white" : "text-gray-800"}`}>{org.name}</span>
          </div>
          <p className={textSub}>
            جميع الحقوق محفوظة © {new Date().getFullYear()}
          </p>
          <a href="https://nasaq.sa" target="_blank" rel="noreferrer" className={`${textSub} hover:opacity-80 transition-opacity text-xs`}>
            مدعوم بـ نسق
          </a>
        </div>
      </footer>
    </div>
  );
}

// ── Hero Content sub-component ─────────────────────────────────────────────

function HeroContent({ org, stats, primary, orgSlug, light }: {
  org: OrgData; stats: SiteData["stats"]; primary: string; orgSlug: string; light?: boolean;
}) {
  const textColor = light ? "text-white" : "text-gray-900";
  const subColor = light ? "text-white/80" : "text-gray-500";

  return (
    <div className="max-w-2xl">
      <h1 className={`text-3xl md:text-4xl font-extrabold leading-tight ${textColor}`}>{org.name}</h1>
      {org.tagline && <p className={`text-lg md:text-xl mt-2 ${subColor}`}>{org.tagline}</p>}
      {org.description && (
        <p className={`mt-3 text-base leading-relaxed line-clamp-3 ${subColor}`}>{org.description}</p>
      )}

      {/* Stats */}
      {(stats.avgRating || stats.reviewCount > 0 || stats.serviceCount > 0) && (
        <div className={`flex flex-wrap gap-4 mt-5 ${subColor} text-sm`}>
          {stats.avgRating && (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{stats.avgRating}</span>
              {stats.reviewCount > 0 && <span>({stats.reviewCount} تقييم)</span>}
            </div>
          )}
          {stats.serviceCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: primary }} />
              <span>{stats.serviceCount} خدمة متاحة</span>
            </div>
          )}
          {org.city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{org.city}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Link
          to={`/book/${orgSlug}`}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white shadow-lg transition-all hover:opacity-90 hover:-translate-y-0.5"
          style={{ background: primary }}
        >
          <CalendarCheck className="w-4 h-4" />
          احجز موعدك
        </Link>
        {org.phone && (
          <a
            href={`tel:${org.phone}`}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold border transition-all hover:-translate-y-0.5 ${light ? "text-white border-white/40 bg-white/10 backdrop-blur-sm" : "text-gray-700 border-gray-200 bg-white"}`}
          >
            <Phone className="w-4 h-4" />
            اتصل بنا
          </a>
        )}
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, isDark }: { title: string; subtitle?: string; isDark?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{title}</h2>
        {subtitle && <p className={`mt-1 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{subtitle}</p>}
      </div>
    </div>
  );
}
