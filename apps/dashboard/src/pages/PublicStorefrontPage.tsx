import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { websiteApi } from "@/lib/api";
import { usePublicTheme } from "@/context/ThemeProvider";
import { PLATFORM_NAME } from "@/hooks/usePlatformConfig";
import { OrgLogo } from "@/components/branding/OrgLogo";

// ══ Types ══════════════════════════════════════════════════════════
interface OrgData {
  id: string; name: string; slug: string;
  phone?: string; city?: string; address?: string;
  logo?: string; primaryColor: string;
  description?: string; tagline?: string;
}
interface ServiceItem {
  id: string; name: string;
  basePrice?: string; price?: number;
  duration?: number; categoryId?: string;
  status?: string; description?: string;
  pricingType?: string;
}
interface Category { id: string; name: string; }
interface FlowerPackageItem {
  id: string; name: string; description?: string;
  basePrice: number; image?: string;
}
interface FlowerInventoryItem {
  id: string; name: string; color?: string; type?: string;
  sellPrice: number; stock: number; imageUrl?: string;
}
interface FlowerSection {
  isEnabled: boolean;
  heroTitle: string; heroSubtitle: string;
  heroImage: string | null; accentColor: string;
  packages: FlowerPackageItem[];
  inventory: FlowerInventoryItem[];
  builderUrl: string;
}
interface HeaderConfig {
  showLogo?: boolean;
  showPhone?: boolean;
  showBookButton?: boolean;
}
interface SiteData {
  org: OrgData;
  services: ServiceItem[];
  categories: Category[];
  config: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    fontFamily?: string;
    headerConfig?: HeaderConfig;
  } | null;
  flowerSection?: FlowerSection | null;
}

// ══ Booking Sheet ══════════════════════════════════════════════════
function BookingSheet({
  service, org, slug, onClose,
}: {
  service: ServiceItem; org: OrgData; slug: string; onClose: () => void;
}) {
  const primary = org.primaryColor || "#5b9bd5";
  const price = parseFloat(service.basePrice || String(service.price ?? 0));

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ bookingNumber?: string } | null>(null);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const slots = [
    "09:00","10:00","11:00","12:00","13:00",
    "14:00","15:00","16:00","17:00","18:00","19:00","20:00",
  ];

  const canSubmit = date && time && name.trim() && phone.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await websiteApi.publicBook(slug, {
        customerName: name.trim(),
        customerPhone: phone.trim(),
        serviceId: service.id,
        eventDate: new Date(`${date}T${time}`).toISOString(),
        selectedAddons: [],
      });
      if (res?.data) setDone(res.data);
      else setError(res?.error || "حدث خطأ، حاول مجدداً");
    } catch {
      setError("تعذّر الاتصال، حاول مجدداً");
    } finally {
      setSubmitting(false);
    }
  };

  const waLink = org.phone
    ? `https://wa.me/${org.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        done
          ? `مرحبا، تم حجز "${service.name}" بتاريخ ${date} الساعة ${time}`
          : `مرحبا، أريد الاستفسار عن "${service.name}"`
      )}`
    : null;

  const F: React.CSSProperties = { fontFamily: "'IBM Plex Sans Arabic', sans-serif" };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        style={{ backdropFilter: "blur(2px)" }}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-white"
        dir="rtl"
        style={{
          ...F,
          borderRadius: "20px 20px 0 0",
          maxHeight: "92dvh",
          overflowY: "auto",
          maxWidth: 440,
          margin: "0 auto",
          animation: "slideUp 0.25s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0.5 sticky top-0 bg-white z-10">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e2e8f0" }} />
        </div>

        {done ? (
          /* ── Success ── */
          <div className="px-5 pt-5 pb-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: `${primary}15` }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path stroke={primary} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xl font-black text-gray-900 mb-1">تم الحجز بنجاح</p>
            {done.bookingNumber && (
              <p className="text-xs text-gray-400 mb-1">رقم الحجز: {done.bookingNumber}</p>
            )}
            <p className="text-sm font-bold text-gray-700 mb-1">{service.name}</p>
            <p className="text-sm text-gray-500 mb-6">{date} · {time}</p>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-white text-sm mb-3"
                style={{ background: "#25D366" }}
              >
                <WaIcon className="w-5 h-5 fill-white" />
                تحدث معنا على واتساب
              </a>
            )}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-sm font-medium text-gray-500 border border-gray-200 bg-transparent cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <div className="px-5 pb-8">
            {/* Service header */}
            <div className="flex items-center justify-between pt-4 pb-4 border-b border-gray-100 mb-5">
              <div>
                <p className="font-bold text-gray-900 text-sm">{service.name}</p>
                {price > 0 && (
                  <p className="text-sm font-extrabold mt-0.5" style={{ color: primary }}>
                    {price.toLocaleString("ar-SA")} ر.س
                    {service.duration ? ` · ${service.duration} دقيقة` : ""}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border-0 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Date */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">التاريخ</label>
              <input
                type="date"
                min={today}
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm border outline-none transition-colors"
                style={{ borderColor: date ? primary : "#e5e7eb" }}
              />
            </div>

            {/* Time slots */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">الوقت</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {slots.map(s => (
                  <button
                    key={s}
                    onClick={() => setTime(s)}
                    className="py-2 rounded-xl text-sm font-medium border cursor-pointer transition-all"
                    style={{
                      background: time === s ? primary : "white",
                      color: time === s ? "white" : "#374151",
                      borderColor: time === s ? primary : "#e5e7eb",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">الاسم</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="اسمك الكريم"
                className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-gray-400"
              />
            </div>

            {/* Phone */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">رقم الجوال</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-gray-400 text-right"
              />
            </div>

            {error && <p className="text-red-500 text-xs mb-3 text-center">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm cursor-pointer border-0 transition-opacity disabled:opacity-40"
              style={{ background: primary }}
            >
              {submitting ? "جاري الحجز..." : "تأكيد الحجز"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ══ Icons ══════════════════════════════════════════════════════════
function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

// ══ Flower Section ═════════════════════════════════════════════════
function FlowerBuilderSection({ section, slug }: { section: FlowerSection; slug: string }) {
  const accent = section.accentColor || "#e11d48";
  const F: React.CSSProperties = { fontFamily: "'IBM Plex Sans Arabic', sans-serif" };

  // hex → rgba helper
  const h2r = (hex: string, a: number) => {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    } catch { return hex; }
  };

  return (
    <div style={{ ...F, margin: "16px 0 0" }}>
      {/* Section header */}
      <div style={{
        margin: "0 16px",
        borderRadius: 20,
        overflow: "hidden",
        background: section.heroImage
          ? `linear-gradient(160deg, ${h2r(accent, 0.92)} 0%, ${h2r(accent, 0.75)} 100%), url(${section.heroImage}) center/cover`
          : `linear-gradient(135deg, ${accent} 0%, ${h2r(accent, 0.75)} 100%)`,
        padding: "24px 20px 20px",
        position: "relative",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -20, left: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -30, right: -10, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>🌸</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase" }}>
              باقات الورد
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.25 }}>
            {section.heroTitle}
          </h2>
          <p style={{ margin: "6px 0 16px", fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
            {section.heroSubtitle}
          </p>
          <a
            href={section.builderUrl}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "11px 22px", borderRadius: 14,
              background: "rgba(255,255,255,0.95)", color: accent,
              fontWeight: 800, fontSize: 14, textDecoration: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              fontFamily: "inherit",
            }}
          >
            <span>ابني باقتك</span>
            <svg style={{ width: 14, height: 14, transform: "rotate(180deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      {/* Packages grid — only if there are packages */}
      {section.packages.length > 0 && (
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#0f172a" }}>الباقات الجاهزة</p>
            <a href={section.builderUrl} style={{ fontSize: 12, fontWeight: 600, color: accent, textDecoration: "none" }}>
              عرض الكل
            </a>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {section.packages.map(pkg => (
              <a
                key={pkg.id}
                href={section.builderUrl}
                style={{ textDecoration: "none", flexShrink: 0, width: 148 }}
              >
                <div style={{
                  background: "white",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}>
                  {pkg.image ? (
                    <img src={pkg.image} alt={pkg.name}
                      style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{
                      height: 100, background: `linear-gradient(135deg, ${h2r(accent, 0.12)}, ${h2r(accent, 0.05)})`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
                    }}>🌷</div>
                  )}
                  <div style={{ padding: "10px 10px 12px" }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                      {pkg.name}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 800, color: accent }}>
                      {Number(pkg.basePrice).toFixed(0)} ر.س
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Flower types — only if no packages, show available flowers */}
      {section.packages.length === 0 && section.inventory.length > 0 && (
        <div style={{ padding: "16px 16px 0" }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: "#0f172a" }}>ورود متاحة</p>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {section.inventory.slice(0, 8).map(fl => (
              <a key={fl.id} href={section.builderUrl}
                style={{ textDecoration: "none", flexShrink: 0 }}>
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 6, padding: "10px 12px",
                  background: "white", borderRadius: 14,
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  minWidth: 72,
                }}>
                  {fl.imageUrl ? (
                    <img src={fl.imageUrl} alt={fl.name}
                      style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover" }} />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: 10,
                      background: h2r(accent, 0.1),
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                    }}>🌸</div>
                  )}
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#374151", textAlign: "center", lineHeight: 1.3, maxWidth: 68 }}>
                    {fl.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: accent }}>
                    {Number(fl.sellPrice).toFixed(0)} ر.س
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* CTA row */}
      <div style={{ padding: "14px 16px 0" }}>
        <a
          href={section.builderUrl}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 0", borderRadius: 16,
            background: h2r(accent, 0.08),
            border: `1.5px dashed ${h2r(accent, 0.3)}`,
            color: accent, fontWeight: 800, fontSize: 14,
            textDecoration: "none", fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 18 }}>🌺</span>
          صمّم باقتك الخاصة
          <svg style={{ width: 14, height: 14, transform: "rotate(180deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}

// ══ Main ═══════════════════════════════════════════════════════════
export function PublicStorefrontPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("all");
  const [bookingService, setBookingService] = useState<ServiceItem | null>(null);
  const catBarRef = useRef<HTMLDivElement>(null);
  const slug = orgSlug || "";
  usePublicTheme(data);

  useEffect(() => {
    if (!slug) return;
    websiteApi.publicSite(slug)
      .then((res: any) => {
        if (res?.data) {
          setData(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const defaultF: React.CSSProperties = { fontFamily: "'IBM Plex Sans Arabic', sans-serif" };

  if (loading) return (
    <div dir="rtl" style={{ ...defaultF, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <style>{`@keyframes s{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#5b9bd5", animation: "s .7s linear infinite" }} />
    </div>
  );

  if (!data) return (
    <div dir="rtl" style={{ ...defaultF, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <p style={{ color: "#94a3b8", fontSize: 14 }}>المنشأة غير موجودة</p>
    </div>
  );

  const { org, services, categories, config } = data;
  const primary = config?.primaryColor || org.primaryColor || "#5b9bd5";
  const secondary = config?.secondaryColor || "";
  const logo = config?.logoUrl || org.logo;
  const fontFamily = config?.fontFamily || "IBM Plex Sans Arabic";
  const headerCfg = config?.headerConfig;
  const showLogo = headerCfg?.showLogo !== false;
  const showPhone = headerCfg?.showPhone !== false;
  const showBookButton = headerCfg?.showBookButton !== false;
  const F: React.CSSProperties = { fontFamily: `'${fontFamily}', sans-serif` };

  const activeServices = services.filter(s =>
    !s.status || s.status === "active" || s.status === "published"
  );
  const filtered = activeCat === "all"
    ? activeServices
    : activeServices.filter(s => s.categoryId === activeCat);

  const waLink = org.phone
    ? `https://wa.me/${org.phone.replace(/\D/g, "")}?text=${encodeURIComponent("مرحبا، أريد الاستفسار عن خدماتكم")}`
    : null;

  // hex → rgba helper for header gradient
  const h2r = (hex: string, a: number) => {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    } catch { return hex; }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{margin:0;background:#f1f5f9;}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .cat-bar::-webkit-scrollbar{display:none}
      `}</style>

      <div
        dir="rtl"
        style={{
          ...F,
          maxWidth: 440,
          margin: "0 auto",
          minHeight: "100dvh",
          background: "#f8fafc",
          position: "relative",
          paddingBottom: 64,
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            background: secondary
              ? `linear-gradient(160deg, ${primary} 0%, ${secondary} 100%)`
              : `linear-gradient(160deg, ${primary} 0%, ${h2r(primary, 0.75)} 100%)`,
            padding: "40px 20px 28px",
          }}
        >
          {/* شعار المنشأة فقط — لا يستخدم شعار المنصة أبداً */}
          {showLogo && (
            <OrgLogo
              src={logo}
              orgName={org.name}
              size={64}
              style={{ marginBottom: 12 }}
            />
          )}

          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
            {org.name}
          </h1>

          {(org.city || org.tagline || org.description) && (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}>
              {[org.city, org.tagline || org.description].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* WhatsApp + Phone row */}
          {showPhone && (
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 16px", borderRadius: 12,
                    background: "rgba(255,255,255,0.18)",
                    border: "1.5px solid rgba(255,255,255,0.35)",
                    color: "#fff", fontWeight: 700, fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  <WaIcon className="w-4 h-4 fill-white" />
                  واتساب
                </a>
              )}
              {org.phone && (
                <a
                  href={`tel:${org.phone}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 16px", borderRadius: 12,
                    background: "rgba(255,255,255,0.12)",
                    border: "1.5px solid rgba(255,255,255,0.25)",
                    color: "rgba(255,255,255,0.9)", fontWeight: 600, fontSize: 13,
                    textDecoration: "none", direction: "ltr",
                  }}
                >
                  {org.phone}
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Services count pill ── */}
        <div style={{ padding: "14px 20px 0" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
            {activeServices.length > 0 ? `${activeServices.length} خدمة متاحة` : "لا توجد خدمات بعد"}
          </p>
        </div>

        {/* ── Category filter bar ── */}
        {categories.length > 0 && (
          <div
            ref={catBarRef}
            className="cat-bar"
            style={{
              display: "flex", gap: 8, overflowX: "auto",
              padding: "10px 20px 4px",
              scrollbarWidth: "none",
            }}
          >
            {[{ id: "all", name: "الكل" }, ...categories].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                style={{
                  flexShrink: 0,
                  padding: "7px 16px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1.5px solid",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  background: activeCat === cat.id ? primary : "white",
                  color: activeCat === cat.id ? "white" : "#374151",
                  borderColor: activeCat === cat.id ? primary : "#e5e7eb",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Services list ── */}
        <div style={{ padding: "12px 16px 8px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: 14 }}>
              لا توجد خدمات في هذا التصنيف
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(s => {
                const price = parseFloat(s.basePrice || String(s.price ?? 0));
                const hasPrice = price > 0 && s.pricingType !== "free";
                const isFree = s.pricingType === "free";
                return (
                  <div
                    key={s.id}
                    style={{
                      background: "white",
                      borderRadius: 16,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    {/* Name + duration */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: "#0f172a", fontSize: 14, lineHeight: 1.4 }}>
                        {s.name}
                      </p>
                      {s.duration && s.duration > 0 && (
                        <p style={{ margin: "3px 0 0", fontSize: 11, color: "#94a3b8" }}>
                          {s.duration} دقيقة
                        </p>
                      )}
                    </div>

                    {/* Price + book */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {hasPrice && (
                        <span style={{ fontSize: 14, fontWeight: 800, color: primary }}>
                          {s.pricingType === "from" ? "من " : ""}
                          {price.toLocaleString("ar-SA")} ر.س
                        </span>
                      )}
                      {isFree && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "3px 10px", borderRadius: 8 }}>
                          مجاني
                        </span>
                      )}
                      <button
                        onClick={() => setBookingService(s)}
                        style={{
                          padding: "8px 18px",
                          borderRadius: 12,
                          background: primary,
                          color: "white",
                          fontWeight: 700,
                          fontSize: 13,
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        احجز
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Flower Section ── */}
        {data.flowerSection?.isEnabled && (
          <FlowerBuilderSection section={data.flowerSection} slug={slug} />
        )}

        {/* ── Footer ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 5, padding: "28px 20px 16px",
        }}>
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>مدعوم بـ</span>
          <span style={{
            fontSize: 12, fontWeight: 700, color: "#5b9bd5",
            letterSpacing: 0, lineHeight: 1,
          }}>{PLATFORM_NAME}</span>
        </div>

        {/* ── Fixed bottom action bar ── */}
        <div style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 440,
          background: "white",
          borderTop: "1px solid #f1f5f9",
          padding: "10px 16px",
          display: "flex",
          gap: 10,
          zIndex: 30,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
        }}>
          {showBookButton && (
            <button
              onClick={() => {
                if (activeServices.length > 0) setBookingService(activeServices[0]);
              }}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 14,
                background: primary,
                color: "white",
                fontWeight: 800,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              احجز الآن
            </button>
          )}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 14,
                background: "#25D366",
                color: "white",
                fontWeight: 800,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <WaIcon className="w-4 h-4 fill-white" />
              واتساب
            </a>
          )}
        </div>

        {/* ── Booking Bottom Sheet ── */}
        {bookingService && (
          <BookingSheet
            service={bookingService}
            org={org}
            slug={slug}
            onClose={() => setBookingService(null)}
          />
        )}
      </div>
    </>
  );
}
