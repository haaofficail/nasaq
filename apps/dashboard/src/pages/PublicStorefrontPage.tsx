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

// ══ Helpers ════════════════════════════════════════════════════════
function h2r(hex: string, a: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  } catch { return hex; }
}

function darken(hex: string, amt = 0.15): string {
  try {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - Math.round(255 * amt));
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - Math.round(255 * amt));
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - Math.round(255 * amt));
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
  } catch { return hex; }
}

// ══ Icons ══════════════════════════════════════════════════════════
function WaIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "currentColor", ...style }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 12, height: 12 }}>
      <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 12, height: 12 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ width: 16, height: 16 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 14, height: 14 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

// ══ Booking Sheet ══════════════════════════════════════════════════
function BookingSheet({ service, org, slug, onClose }: {
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
  const slots = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];
  const canSubmit = date && time && name.trim() && phone.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(""); setSubmitting(true);
    try {
      const res = await websiteApi.publicBook(slug, {
        customerName: name.trim(), customerPhone: phone.trim(),
        serviceId: service.id,
        eventDate: new Date(`${date}T${time}`).toISOString(),
        selectedAddons: [],
      });
      if (res?.data) setDone(res.data);
      else setError(res?.error || "حدث خطأ، حاول مجدداً");
    } catch { setError("تعذّر الاتصال، حاول مجدداً"); }
    finally { setSubmitting(false); }
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
      <div className="fixed inset-0 z-40" onClick={onClose}
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
      <div dir="rtl" style={{
        ...F, position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
        background: "#ffffff",
        borderRadius: "28px 28px 0 0",
        maxHeight: "94dvh", overflowY: "auto",
        maxWidth: 440, margin: "0 auto",
        animation: "slideUp 0.28s cubic-bezier(0.32,0.72,0,1)",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 14, paddingBottom: 6 }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: "#e2e8f0" }} />
        </div>

        {done ? (
          <div style={{ padding: "24px 24px 48px", textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
              background: `linear-gradient(135deg, ${primary}, ${darken(primary, 0.1)})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 12px 32px ${h2r(primary, 0.35)}`,
            }}>
              <svg style={{ width: 32, height: 32 }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path stroke="white" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900, color: "#0f172a" }}>تم الحجز بنجاح</p>
            {done.bookingNumber && (
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94a3b8", fontWeight: 600, letterSpacing: 0.5 }}>
                رقم الحجز #{done.bookingNumber}
              </p>
            )}
            <div style={{
              margin: "20px 0", padding: "16px 20px", borderRadius: 20,
              background: "#f8fafc", border: "1px solid #f1f5f9",
            }}>
              <p style={{ margin: "0 0 4px", fontWeight: 800, color: "#0f172a", fontSize: 15 }}>{service.name}</p>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{date} · {time}</p>
            </div>
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "15px 0", borderRadius: 18,
                background: "#25D366", color: "white",
                fontWeight: 800, fontSize: 15, textDecoration: "none",
                marginBottom: 12, boxShadow: "0 6px 20px rgba(37,211,102,0.35)",
              }}>
                <WaIcon />
                تحدث معنا على واتساب
              </a>
            )}
            <button onClick={onClose} style={{
              width: "100%", padding: "14px 0", borderRadius: 18,
              background: "#f8fafc", border: "1.5px solid #e2e8f0",
              color: "#64748b", fontWeight: 700, fontSize: 14,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              إغلاق
            </button>
          </div>
        ) : (
          <div style={{ padding: "4px 20px 48px" }}>
            {/* Service info */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 0 18px", borderBottom: "1px solid #f1f5f9", marginBottom: 22,
            }}>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 800, color: "#0f172a", fontSize: 16 }}>{service.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {price > 0 && (
                    <span style={{ fontSize: 15, fontWeight: 900, color: primary }}>
                      {price.toLocaleString("ar-SA")} ر.س
                    </span>
                  )}
                  {service.duration ? (
                    <span style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                      <ClockIcon /> {service.duration} دقيقة
                    </span>
                  ) : null}
                </div>
              </div>
              <button onClick={onClose} style={{
                width: 36, height: 36, borderRadius: "50%", border: "1.5px solid #e2e8f0",
                background: "white", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#94a3b8",
              }}>
                <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Date */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                التاريخ
              </label>
              <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)}
                style={{
                  width: "100%", borderRadius: 16, padding: "14px 16px", fontSize: 14,
                  border: `1.5px solid ${date ? primary : "#e5e7eb"}`,
                  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                  background: date ? h2r(primary, 0.03) : "white", color: "#0f172a",
                }} />
            </div>

            {/* Time */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                الوقت
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {slots.map(s => (
                  <button key={s} onClick={() => setTime(s)} style={{
                    padding: "10px 4px", borderRadius: 14, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    border: `1.5px solid ${time === s ? primary : "#e5e7eb"}`,
                    background: time === s ? primary : "white",
                    color: time === s ? "white" : "#374151",
                    boxShadow: time === s ? `0 4px 12px ${h2r(primary, 0.3)}` : "none",
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                الاسم
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="اسمك الكريم"
                style={{
                  width: "100%", borderRadius: 16, padding: "14px 16px", fontSize: 14,
                  border: "1.5px solid #e5e7eb", outline: "none", fontFamily: "inherit",
                  boxSizing: "border-box", color: "#0f172a",
                }} />
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                رقم الجوال
              </label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="05xxxxxxxx" dir="ltr"
                style={{
                  width: "100%", borderRadius: 16, padding: "14px 16px", fontSize: 14,
                  border: "1.5px solid #e5e7eb", outline: "none", fontFamily: "inherit",
                  boxSizing: "border-box", textAlign: "right", color: "#0f172a",
                }} />
            </div>

            {error && (
              <div style={{
                marginBottom: 16, padding: "12px 16px", borderRadius: 14,
                background: "#fef2f2", border: "1px solid #fecaca",
                color: "#dc2626", fontSize: 13, fontWeight: 600, textAlign: "center",
              }}>{error}</div>
            )}

            <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{
              width: "100%", padding: "16px 0", borderRadius: 20,
              background: canSubmit && !submitting
                ? `linear-gradient(135deg, ${primary}, ${darken(primary, 0.1)})`
                : "#e2e8f0",
              color: canSubmit && !submitting ? "white" : "#94a3b8",
              fontWeight: 900, fontSize: 16, border: "none",
              cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              boxShadow: canSubmit && !submitting ? `0 8px 24px ${h2r(primary, 0.4)}` : "none",
              transition: "all 0.2s",
            }}>
              {submitting ? "جاري الحجز..." : "تأكيد الحجز"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ══ Flower Section ═════════════════════════════════════════════════
function FlowerBuilderSection({ section, slug }: { section: FlowerSection; slug: string }) {
  const accent = section.accentColor || "#e11d48";
  const F: React.CSSProperties = { fontFamily: "'IBM Plex Sans Arabic', sans-serif" };

  return (
    <div style={{ ...F, margin: "24px 0 0" }}>
      <div style={{
        margin: "0 16px", borderRadius: 24, overflow: "hidden",
        background: section.heroImage
          ? `linear-gradient(160deg, ${h2r(accent, 0.92)} 0%, ${h2r(accent, 0.75)} 100%), url(${section.heroImage}) center/cover`
          : `linear-gradient(135deg, ${accent} 0%, ${h2r(accent, 0.75)} 100%)`,
        padding: "28px 24px 24px", position: "relative",
      }}>
        <div style={{ position: "absolute", top: -24, left: -24, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -36, right: -12, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "relative" }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: 1.5, textTransform: "uppercase" }}>
            باقات الورد
          </p>
          <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
            {section.heroTitle}
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}>
            {section.heroSubtitle}
          </p>
          <a href={section.builderUrl} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "12px 24px", borderRadius: 16,
            background: "rgba(255,255,255,0.95)", color: accent,
            fontWeight: 800, fontSize: 14, textDecoration: "none",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)", fontFamily: "inherit",
          }}>
            ابني باقتك
            <svg style={{ width: 14, height: 14, transform: "rotate(180deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      {section.packages.length > 0 && (
        <div style={{ padding: "18px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#0f172a" }}>الباقات الجاهزة</p>
            <a href={section.builderUrl} style={{ fontSize: 12, fontWeight: 700, color: accent, textDecoration: "none" }}>عرض الكل</a>
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {section.packages.map(pkg => (
              <a key={pkg.id} href={section.builderUrl} style={{ textDecoration: "none", flexShrink: 0, width: 152 }}>
                <div style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                  {pkg.image ? (
                    <img src={pkg.image} alt={pkg.name} style={{ width: "100%", height: 108, objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ height: 108, background: `linear-gradient(135deg, ${h2r(accent, 0.12)}, ${h2r(accent, 0.05)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🌷</div>
                  )}
                  <div style={{ padding: "12px 12px 14px" }}>
                    <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{pkg.name}</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: accent }}>{Number(pkg.basePrice).toFixed(0)} ر.س</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "14px 16px 0" }}>
        <a href={section.builderUrl} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "16px 0", borderRadius: 20,
          background: h2r(accent, 0.07), border: `1.5px dashed ${h2r(accent, 0.3)}`,
          color: accent, fontWeight: 800, fontSize: 14,
          textDecoration: "none", fontFamily: "inherit",
        }}>
          <span style={{ fontSize: 20 }}>🌺</span>
          صمّم باقتك الخاصة
          <svg style={{ width: 14, height: 14, transform: "rotate(180deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}

// ══ Skeleton ═══════════════════════════════════════════════════════
function Skeleton() {
  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", minHeight: "100dvh", background: "#f8fafc", maxWidth: 440, margin: "0 auto" }}>
      <style>{`@keyframes sh{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ height: 220, background: "#e2e8f0", animation: "sh 1.5s ease-in-out infinite" }} />
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: 88, borderRadius: 20, background: "#e2e8f0", animation: `sh 1.5s ease-in-out ${i * 0.1}s infinite` }} />
        ))}
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
      .then((res: any) => { if (res?.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Skeleton />;

  if (!data) return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
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

  const activeServices = services.filter(s => !s.status || s.status === "active" || s.status === "published");
  const filtered = activeCat === "all" ? activeServices : activeServices.filter(s => s.categoryId === activeCat);

  const waLink = org.phone
    ? `https://wa.me/${org.phone.replace(/\D/g, "")}?text=${encodeURIComponent("مرحبا، أريد الاستفسار عن خدماتكم")}`
    : null;

  const headerGradient = secondary
    ? `linear-gradient(150deg, ${primary} 0%, ${secondary} 100%)`
    : `linear-gradient(150deg, ${primary} 0%, ${darken(primary, 0.18)} 100%)`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{margin:0;background:#f1f5f9;}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .cat-bar::-webkit-scrollbar{display:none}
        .svc-card{transition:transform 0.15s,box-shadow 0.15s;}
        .svc-card:active{transform:scale(0.98);}
      `}</style>

      <div dir="rtl" style={{ ...F, maxWidth: 440, margin: "0 auto", minHeight: "100dvh", background: "#f8fafc", position: "relative", paddingBottom: 80 }}>

        {/* ── Hero Header ── */}
        <div style={{ position: "relative", background: headerGradient, overflow: "hidden", paddingBottom: 32 }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 20, left: 40, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -40, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(0,0,0,0.08)", pointerEvents: "none" }} />

          <div style={{ position: "relative", padding: "48px 22px 0" }}>
            {/* Logo */}
            {showLogo && (
              <div style={{ marginBottom: 14 }}>
                <OrgLogo src={logo} orgName={org.name} size={68}
                  style={{ borderRadius: 18, boxShadow: "0 8px 24px rgba(0,0,0,0.2), 0 0 0 3px rgba(255,255,255,0.25)" }} />
              </div>
            )}

            {/* Name */}
            <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1.15, letterSpacing: -0.3 }}>
              {org.name}
            </h1>

            {/* City / tagline */}
            {(org.city || org.tagline || org.description) && (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {org.city && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
                    <LocationIcon />
                    {org.city}
                  </span>
                )}
                {(org.tagline || org.description) && (
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                    {org.tagline || org.description}
                  </span>
                )}
              </div>
            )}

            {/* Action pills */}
            {showPhone && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer" style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "10px 18px", borderRadius: 999,
                    background: "#25D366",
                    boxShadow: "0 4px 16px rgba(37,211,102,0.4)",
                    color: "white", fontWeight: 700, fontSize: 13,
                    textDecoration: "none",
                  }}>
                    <WaIcon />
                    واتساب
                  </a>
                )}
                {org.phone && (
                  <a href={`tel:${org.phone}`} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "10px 18px", borderRadius: 999,
                    background: "rgba(255,255,255,0.18)",
                    border: "1.5px solid rgba(255,255,255,0.3)",
                    color: "white", fontWeight: 600, fontSize: 13,
                    textDecoration: "none", direction: "ltr",
                  }}>
                    <PhoneIcon />
                    {org.phone}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Bottom wave */}
          <svg viewBox="0 0 440 24" preserveAspectRatio="none"
            style={{ display: "block", width: "100%", height: 24, marginTop: 20, fill: "#f8fafc" }}>
            <path d="M0 24 C110 0 330 0 440 24 L440 24 L0 24 Z" />
          </svg>
        </div>

        {/* ── Stats bar ── */}
        <div style={{ padding: "4px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", fontWeight: 600 }}>
            {activeServices.length > 0 ? (
              <><span style={{ color: primary, fontWeight: 800 }}>{activeServices.length}</span> خدمة متاحة</>
            ) : "لا توجد خدمات بعد"}
          </p>
        </div>

        {/* ── Category filter ── */}
        {categories.length > 0 && (
          <div ref={catBarRef} className="cat-bar" style={{
            display: "flex", gap: 8, overflowX: "auto",
            padding: "12px 20px 6px", scrollbarWidth: "none",
          }}>
            {[{ id: "all", name: "الكل" }, ...categories].map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{
                flexShrink: 0, padding: "8px 18px", borderRadius: 999,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
                border: "1.5px solid",
                background: activeCat === cat.id ? primary : "white",
                color: activeCat === cat.id ? "white" : "#374151",
                borderColor: activeCat === cat.id ? primary : "#e5e7eb",
                boxShadow: activeCat === cat.id ? `0 4px 14px ${h2r(primary, 0.35)}` : "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Services list ── */}
        <div style={{ padding: "12px 16px 8px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>لا توجد خدمات في هذا التصنيف</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((s, i) => {
                const price = parseFloat(s.basePrice || String(s.price ?? 0));
                const hasPrice = price > 0 && s.pricingType !== "free";
                const isFree = s.pricingType === "free";
                return (
                  <div key={s.id} className="svc-card" style={{
                    background: "white",
                    borderRadius: 22,
                    overflow: "hidden",
                    border: "1px solid #f1f5f9",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    display: "flex",
                    alignItems: "stretch",
                    animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
                  }}>
                    {/* Color accent bar */}
                    <div style={{ width: 5, background: `linear-gradient(180deg, ${primary}, ${h2r(primary, 0.4)})`, flexShrink: 0 }} />

                    {/* Content */}
                    <div style={{ flex: 1, padding: "14px 14px 14px 16px", display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: "0 0 5px", fontWeight: 800, color: "#0f172a", fontSize: 14, lineHeight: 1.35 }}>
                          {s.name}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {hasPrice && (
                            <span style={{ fontSize: 15, fontWeight: 900, color: primary, letterSpacing: -0.2 }}>
                              {s.pricingType === "from" ? "من " : ""}
                              {price.toLocaleString("ar-SA")} <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>ر.س</span>
                            </span>
                          )}
                          {isFree && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "3px 10px", borderRadius: 8 }}>
                              مجاني
                            </span>
                          )}
                          {s.duration && s.duration > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                              <ClockIcon />{s.duration} د
                            </span>
                          )}
                        </div>
                        {s.description && (
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                            {s.description}
                          </p>
                        )}
                      </div>

                      {/* Book button */}
                      <button onClick={() => setBookingService(s)} style={{
                        flexShrink: 0,
                        padding: "10px 18px",
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${primary}, ${darken(primary, 0.1)})`,
                        color: "white",
                        fontWeight: 800,
                        fontSize: 13,
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        boxShadow: `0 4px 12px ${h2r(primary, 0.35)}`,
                        whiteSpace: "nowrap",
                      }}>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "32px 20px 20px" }}>
          <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 500 }}>مدعوم بـ</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#5b9bd5" }}>{PLATFORM_NAME}</span>
        </div>

        {/* ── Fixed bottom bar ── */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 440,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          padding: "12px 16px 20px",
          display: "flex", gap: 10, zIndex: 30,
          boxShadow: "0 -8px 32px rgba(0,0,0,0.08)",
        }}>
          {showBookButton && activeServices.length > 0 && (
            <button onClick={() => setBookingService(activeServices[0])} style={{
              flex: 1, padding: "14px 0", borderRadius: 18,
              background: `linear-gradient(135deg, ${primary}, ${darken(primary, 0.1)})`,
              color: "white", fontWeight: 900, fontSize: 15, border: "none",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: `0 6px 20px ${h2r(primary, 0.4)}`,
            }}>
              احجز الآن
            </button>
          )}
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer" style={{
              flex: showBookButton && activeServices.length > 0 ? "0 0 auto" : 1,
              padding: "14px 20px", borderRadius: 18,
              background: "#25D366", color: "white",
              fontWeight: 800, fontSize: 15, border: "none",
              cursor: "pointer", fontFamily: "inherit",
              textDecoration: "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              boxShadow: "0 6px 20px rgba(37,211,102,0.35)",
            }}>
              <WaIcon />
              {(!showBookButton || activeServices.length === 0) && "واتساب"}
            </a>
          )}
        </div>

        {/* ── Booking Sheet ── */}
        {bookingService && (
          <BookingSheet service={bookingService} org={org} slug={slug} onClose={() => setBookingService(null)} />
        )}
      </div>
    </>
  );
}
