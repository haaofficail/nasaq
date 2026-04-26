import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { storefrontApi } from "@/lib/api";
import { usePublicTheme } from "@/context/ThemeProvider";
import { PLATFORM_NAME } from "@/hooks/usePlatformConfig";

// ── Types ────────────────────────────────────────────────────────────
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
  offeringType?: string;   // "service" | "product" | "rental" | ... (from catalog schema)
  serviceType?: string;
  isBookable?: boolean;
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
interface StoreProduct {
  id: string; name: string; description?: string;
  sellPrice: number; images: string[];
  is_store_visible: boolean; store_sort_order: number;
  sku?: string; unit?: string;
}

// ── Color helpers ────────────────────────────────────────────────────
function hex2rgb(hex: string, a: number): string {
  try {
    const v = hex.replace("#", "");
    const full = v.length === 3 ? v.split("").map(c => c + c).join("") : v;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  } catch { return hex; }
}

function darken(hex: string, amt = 0.12): string {
  try {
    const v = hex.replace("#", "");
    const full = v.length === 3 ? v.split("").map(c => c + c).join("") : v;
    const r = Math.max(0, parseInt(full.slice(0, 2), 16) - Math.round(255 * amt));
    const g = Math.max(0, parseInt(full.slice(2, 4), 16) - Math.round(255 * amt));
    const b = Math.max(0, parseInt(full.slice(4, 6), 16) - Math.round(255 * amt));
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
  } catch { return hex; }
}

// ── Icon set (clean, minimal) ────────────────────────────────────────
const Icon = {
  wa: (
    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "currentColor" }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 12, height: 12 }}>
      <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 12, height: 12 }}>
      <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 7v5l3 2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} style={{ width: 26, height: 26 }}>
      <path stroke="white" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 14, height: 14 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ── ترميز OS — Public Page Design System ─────────────────────────────
// Constitutional rule: all public-facing pages derive their palette from
// the platform brand #5b9bd5. This guarantees consistent identity and
// naturally cool colors (blue undertone throughout every layer).
//
// BRAND = #5b9bd5 (91,155,213)
//   bg           = brand at 6% opacity on white  → #F0F6FC
//   surfaceSubtle= brand at 10% opacity           → #E3EFF9
//   border       = brand at 22% opacity           → #C9DDEF
//   borderFaint  = brand at 12% opacity           → #DCEBf8
//   t1           = brand darkened 70%             → #0D2138  (deep navy)
//   t2           = brand darkened 35%             → #2F6190  (mid blue-gray)
//   t3           = brand darkened 10%             → #5289BE  (muted cool)
const BRAND = "#5b9bd5";   // ترميز OS platform color — DO NOT change

const T = {
  brand:        BRAND,
  bg:           "#FFFFFF",  // white background
  surface:      "#FFFFFF",  // pure white
  surfaceSubtle:"#E3EFF9",  // ترميز: brand @ 10% — inputs, tags
  border:       "#C9DDEF",  // ترميز: brand @ 22% — card borders
  borderFaint:  "#DCEBf8",  // ترميز: brand @ 12% — subtle dividers
  t1:           "#0D2138",  // ترميز: deep brand navy — primary text
  t2:           "#2F6190",  // ترميز: mid blue-gray — secondary text
  t3:           "#5289BE",  // ترميز: muted cool blue — captions
  wa:           "#25D366",
  shadow:       "0 1px 4px rgba(91,155,213,0.12), 0 1px 2px -1px rgba(91,155,213,0.08)",
  shadowMd:     "0 4px 14px rgba(91,155,213,0.15), 0 2px 4px -2px rgba(91,155,213,0.10)",
};

// ── Sales vs Booking discriminator ───────────────────────────────────
// Products (physical/digital) use sales language.
// All other offering types (service, rental, room_booking, etc.) use booking language.
const SALES_OFFERING_TYPES = new Set(["product", "digital_product"]);
const SALES_SERVICE_TYPES = new Set(["product", "product_shipping", "food_order"]);
function isSalesItem(item: ServiceItem) {
  return SALES_OFFERING_TYPES.has(item.offeringType ?? "") || SALES_SERVICE_TYPES.has(item.serviceType ?? "");
}
function isBookableItem(item: ServiceItem) {
  return item.isBookable !== false;
}
function cartLabel(cart: ServiceItem[]) {
  const hasSales   = cart.some(isSalesItem);
  const hasBooking = cart.some(s => !isSalesItem(s));
  if (hasSales && !hasBooking) return { unit: "منتج", units: "منتجات", cta: "تأكيد الطلب",  empty: "اختر منتجاً للطلب" };
  if (!hasSales && hasBooking) return { unit: "خدمة", units: "خدمات",  cta: "تأكيد الحجز", empty: "اختر خدمة للحجز" };
  return { unit: "عنصر", units: "عناصر", cta: "متابعة", empty: "اختر للمتابعة" };
}
function activeListLabel(items: ServiceItem[]) {
  const hasProducts = items.some(isSalesItem);
  const hasServices = items.some(s => !isSalesItem(s));
  if (hasProducts && !hasServices) return "اختر منتجاً للطلب";
  return "اختر خدمة للحجز";
}

// ── Booking Sheet — supports single or multiple services ─────────────
function BookingSheet({ services: cartServices, org, slug, onClose }: {
  services: ServiceItem[]; org: OrgData; slug: string; onClose: () => void;
}) {
  // Public pages always use platform BRAND — org color never overrides buttons/structure
  const primary = BRAND;
  const total   = cartServices.reduce((sum, s) => sum + parseFloat(s.basePrice || String(s.price ?? 0)), 0);
  const totalDuration = cartServices.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const needsSchedule = cartServices.some(s => !isSalesItem(s));
  const isOrderOnly = !needsSchedule;

  const [date, setDate]       = useState("");
  const [time, setTime]       = useState("");
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [agreed, setAgreed]   = useState(false);
  const [submitting, setSub]  = useState(false);
  const [done, setDone]       = useState<{ bookingNumber?: string; totalAmount?: string } | null>(null);
  const [error, setError]     = useState("");

  const today      = new Date().toISOString().split("T")[0];
  const slots      = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];
  const canSubmit  = (!needsSchedule || (date && time)) && name.trim() && phone.trim() && agreed;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(""); setSub(true);
    try {
      const res = await storefrontApi.publicBook(slug, {
        customerName:  name.trim(),
        customerPhone: phone.trim(),
        serviceIds:    cartServices.map(s => s.id),
        ...(needsSchedule && { eventDate: new Date(`${date}T${time}`).toISOString() }),
        selectedAddons: [],
        acceptedTerms: true,
      });
      if (res?.data) setDone(res.data);
      else setError(res?.error || "حدث خطأ، حاول مجدداً");
    } catch { setError("تعذّر الاتصال، حاول مجدداً"); }
    finally { setSub(false); }
  };

  const serviceNames = cartServices.map(s => s.name).join("، ");
  const waLink = org.phone
    ? `https://wa.me/${org.phone.replace(/\D/g,"")}?text=${encodeURIComponent(
        done
          ? needsSchedule
            ? `مرحبا، تم حجز: ${serviceNames} بتاريخ ${date} الساعة ${time}`
            : `مرحبا، تم طلب: ${serviceNames}`
          : `مرحبا، أريد الاستفسار عن: ${serviceNames}`
      )}`
    : null;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: 14,
    border: `1.5px solid ${T.border}`, outline: "none", fontFamily: "inherit",
    boxSizing: "border-box", color: T.t1, background: T.surfaceSubtle,
    transition: "border-color .15s",
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(13,33,56,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose} />

      <div dir="rtl" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
        background: T.surface, borderRadius: "20px 20px 0 0",
        maxHeight: "93dvh", overflowY: "auto",
        maxWidth: 440, margin: "0 auto",
        boxShadow: "0 -8px 40px rgba(13,33,56,0.18)",
        animation: "sheetIn .28s cubic-bezier(.32,.72,0,1)",
        fontFamily: "inherit",
      }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} />
        </div>

        {done ? (
          /* ── Success ── */
          <div style={{ padding: "24px 22px 48px", textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 18px",
              background: `linear-gradient(135deg, ${primary}, ${darken(primary)})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 8px 24px ${hex2rgb(primary, 0.3)}`,
            }}>
              {Icon.check}
            </div>
            <p style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900, color: T.t1 }}>{isOrderOnly ? "تم الطلب بنجاح" : "تم الحجز بنجاح"}</p>
            {done.bookingNumber && (
              <p style={{ margin: "0 0 18px", fontSize: 12, color: T.t3, fontWeight: 600 }}>{isOrderOnly ? "رقم الطلب" : "رقم الحجز"} #{done.bookingNumber}</p>
            )}
            {/* Services summary */}
            <div style={{ margin: "0 0 20px", borderRadius: 14, background: T.surfaceSubtle, border: `1px solid ${T.borderFaint}`, overflow: "hidden" }}>
              {cartServices.map((s, i) => (
                <div key={s.id} style={{ padding: "11px 16px", borderBottom: i < cartServices.length - 1 ? `1px solid ${T.borderFaint}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{s.name}</span>
                  {parseFloat(s.basePrice || String(s.price ?? 0)) > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 800, color: primary }}>{parseFloat(s.basePrice || String(s.price ?? 0)).toLocaleString("ar-SA")} ر.س</span>
                  )}
                </div>
              ))}
              <div style={{ padding: "11px 16px", background: hex2rgb(primary, 0.06), display: "flex", justifyContent: "space-between" }}>
                {needsSchedule && <span style={{ fontSize: 12, fontWeight: 700, color: T.t2 }}>{date} · {time}</span>}
                {total > 0 && <span style={{ fontSize: 14, fontWeight: 900, color: primary }}>{total.toLocaleString("ar-SA")} ر.س</span>}
              </div>
            </div>
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "14px 0", borderRadius: 14,
                background: T.wa, color: "white", fontWeight: 800, fontSize: 14,
                textDecoration: "none", marginBottom: 10,
                boxShadow: `0 4px 16px rgba(37,211,102,0.3)`,
              }}>
                {Icon.wa} تواصل معنا
              </a>
            )}
            <button onClick={onClose} style={{
              width: "100%", padding: "13px 0", borderRadius: 14, border: "none",
              background: T.surfaceSubtle, color: T.t2, fontWeight: 700, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>إغلاق</button>
          </div>

        ) : (
          /* ── Form ── */
          <div style={{ padding: "8px 20px 48px" }}>

            {/* Cart summary header */}
            <div style={{ padding: "12px 0 16px", borderBottom: `1px solid ${T.borderFaint}`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ margin: 0, fontWeight: 900, color: T.t1, fontSize: 15 }}>
                  {cartServices.length === 1 ? cartServices[0].name : `${cartServices.length} خدمات محددة`}
                </p>
                <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surfaceSubtle, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.t3 }}>
                  {Icon.close}
                </button>
              </div>

              {/* Service list (multi-service mode) */}
              {cartServices.length > 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {cartServices.map(s => {
                    const p = parseFloat(s.basePrice || String(s.price ?? 0));
                    return (
                      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 10, background: T.surfaceSubtle }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{s.name}</span>
                        {p > 0 && <span style={{ fontSize: 13, fontWeight: 800, color: primary }}>{p.toLocaleString("ar-SA")} ر.س</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {total > 0 && (
                  <span style={{ fontSize: cartServices.length > 1 ? 16 : 15, fontWeight: 900, color: primary }}>
                    {cartServices.length > 1 ? "المجموع: " : ""}{total.toLocaleString("ar-SA")} ر.س
                  </span>
                )}
                {totalDuration > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: T.t3 }}>
                    {Icon.clock} {totalDuration} دقيقة
                  </span>
                )}
              </div>
            </div>

            {needsSchedule && (
              <>
                {/* Date */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 7 }}>التاريخ</label>
                  <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)}
                    style={{ ...inputStyle, borderColor: date ? primary : T.border, background: date ? hex2rgb(primary, 0.04) : T.surfaceSubtle }} />
                </div>

                {/* Time slots */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 7 }}>الوقت</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7 }}>
                    {slots.map(s => (
                      <button key={s} onClick={() => setTime(s)} style={{
                        padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                        border: `1.5px solid ${time === s ? primary : T.border}`,
                        background: time === s ? primary : T.surfaceSubtle,
                        color: time === s ? "white" : T.t2,
                        boxShadow: time === s ? `0 2px 8px ${hex2rgb(primary, 0.25)}` : "none",
                      }}>{s}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Name */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 7 }}>الاسم</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسمك الكريم" style={inputStyle} />
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 7 }}>رقم الجوال</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr"
                style={{ ...inputStyle, textAlign: "right" }} />
            </div>

            {/* Terms checkbox — PDPL م/8-أ */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20, cursor: "pointer" }}>
              <div onClick={() => setAgreed(!agreed)} style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                border: `2px solid ${agreed ? primary : T.border}`,
                background: agreed ? primary : T.surface,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .15s",
              }}>
                {agreed && <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} style={{ width: 12, height: 12 }}>
                  <path stroke="white" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>}
              </div>
              <span style={{ fontSize: 12, color: T.t2, lineHeight: 1.5 }}>
                أوافق على الشروط والأحكام وسياسة الخصوصية
              </span>
            </label>

            {error && (
              <div style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 10, background: "#FFF1F2", border: "1px solid #FECDD3", color: "#E11D48", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{
              width: "100%", padding: "15px 0", borderRadius: 14, border: "none",
              background: canSubmit && !submitting
                ? `linear-gradient(135deg, ${primary} 0%, ${darken(primary)} 100%)`
                : T.surfaceSubtle,
              color: canSubmit && !submitting ? "white" : T.t3,
              fontWeight: 900, fontSize: 15,
              cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              boxShadow: canSubmit && !submitting ? `0 6px 20px ${hex2rgb(primary, 0.35)}` : "none",
              transition: "all .2s",
            }}>
              {submitting
                ? (cartLabel(cartServices).cta === "تأكيد الطلب" ? "جاري تأكيد الطلب..." : "جاري الحجز...")
                : `${cartLabel(cartServices).cta}${cartServices.length > 1 ? ` (${cartServices.length})` : ""}`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Flower Section ───────────────────────────────────────────────────
function FlowerBuilderSection({ section, slug }: { section: FlowerSection; slug: string }) {
  const accent = section.accentColor || "#e11d48";

  return (
    <div style={{ margin: "16px 0 0", padding: "0 16px" }}>
      <div style={{
        borderRadius: 20, overflow: "hidden",
        background: section.heroImage
          ? `linear-gradient(160deg, ${hex2rgb(accent, 0.9)} 0%, ${hex2rgb(accent, 0.72)} 100%), url(${section.heroImage}) center/cover`
          : `linear-gradient(135deg, ${accent} 0%, ${darken(accent, 0.1)} 100%)`,
        padding: "24px 22px", position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.1) 100%)" }} />
        <div style={{ position: "relative" }}>
          <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: 1.2, textTransform: "uppercase" }}>باقات الورد</p>
          <h2 style={{ margin: "0 0 5px", fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>{section.heroTitle}</h2>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{section.heroSubtitle}</p>
          <a href={section.builderUrl} style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px",
            borderRadius: 12, background: "rgba(255,255,255,0.95)", color: accent,
            fontWeight: 800, fontSize: 13, textDecoration: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontFamily: "inherit",
          }}>
            ابني باقتك
            <svg style={{ width: 13, height: 13, transform: "rotate(180deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      {section.packages.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.t1 }}>الباقات الجاهزة</p>
            <a href={section.builderUrl} style={{ fontSize: 12, fontWeight: 700, color: accent, textDecoration: "none" }}>عرض الكل</a>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {section.packages.map(pkg => (
              <a key={pkg.id} href={section.builderUrl} style={{ textDecoration: "none", flexShrink: 0, width: 140 }}>
                <div style={{ background: T.surface, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.borderFaint}`, boxShadow: T.shadow }}>
                  {pkg.image
                    ? <img src={pkg.image} alt={pkg.name} style={{ width: "100%", height: 96, objectFit: "cover", display: "block" }} />
                    : <div style={{ height: 96, background: hex2rgb(accent, 0.08), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>🌷</div>
                  }
                  <div style={{ padding: "10px 12px 12px" }}>
                    <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 700, color: T.t1, lineHeight: 1.3 }}>{pkg.name}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: accent }}>{Number(pkg.basePrice).toFixed(0)} ر.س</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Product Checkout Sheet ────────────────────────────────────────────
function ProductCheckoutSheet({ productCart, slug, sessionId, orgAccent, org, onClose }: {
  productCart: Map<string, { product: StoreProduct; qty: number }>;
  slug: string; sessionId: string; orgAccent: string;
  org: OrgData; onClose: () => void;
}) {
  const primary = BRAND;
  const items   = Array.from(productCart.values());
  const total   = items.reduce((s, { product, qty }) => s + product.sellPrice * qty, 0);

  const [name,        setName]      = useState("");
  const [phone,       setPhone]     = useState("");
  const [email,       setEmail]     = useState("");
  const [street,      setStreet]    = useState("");
  const [city,        setCity]      = useState("");
  const [couponCode,  setCoupon]    = useState("");
  const [agreed,      setAgreed]    = useState(false);
  const [submitting,  setSub]       = useState(false);
  const [error,       setError]     = useState("");

  const canSubmit = name.trim() && phone.trim() && street.trim() && city.trim() && agreed;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: 14,
    border: `1.5px solid ${T.border}`, outline: "none", fontFamily: "inherit",
    boxSizing: "border-box", color: T.t1, background: T.surfaceSubtle,
    transition: "border-color .15s",
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(""); setSub(true);
    try {
      const callbackUrl = `${window.location.origin}/pay/${encodeURIComponent(slug)}`;
      const res = await storefrontApi.checkout(slug, sessionId, {
        customerName:    name.trim(),
        customerPhone:   phone.trim(),
        customerEmail:   email.trim() || undefined,
        deliveryAddress: { street: street.trim(), city: city.trim() },
        couponCode:      couponCode.trim() || undefined,
        paymentMethod:   "online",
        callbackUrl,
      });
      if (res?.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        setError(res?.error || "حدث خطأ، حاول مجدداً");
      }
    } catch { setError("تعذّر الاتصال، حاول مجدداً"); }
    finally { setSub(false); }
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(13,33,56,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose} />
      <div dir="rtl" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
        background: T.surface, borderRadius: "20px 20px 0 0",
        maxHeight: "93dvh", overflowY: "auto",
        maxWidth: 440, margin: "0 auto",
        boxShadow: "0 -8px 40px rgba(13,33,56,0.18)",
        animation: "sheetIn .28s cubic-bezier(.32,.72,0,1)",
        fontFamily: "inherit",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} />
        </div>

        <div style={{ padding: "8px 20px 48px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${T.borderFaint}`, marginBottom: 20 }}>
            <p style={{ margin: 0, fontWeight: 900, color: T.t1, fontSize: 15 }}>تفاصيل الطلب</p>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surfaceSubtle, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.t3 }}>
              {Icon.close}
            </button>
          </div>

          {/* Order summary */}
          <div style={{ marginBottom: 20, borderRadius: 14, border: `1px solid ${T.borderFaint}`, overflow: "hidden" }}>
            {items.map(({ product, qty }, i) => (
              <div key={product.id} style={{ padding: "11px 14px", borderBottom: i < items.length - 1 ? `1px solid ${T.borderFaint}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", background: T.surface }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "white", background: BRAND, borderRadius: 6, padding: "1px 7px", flexShrink: 0 }}>{qty}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: orgAccent, flexShrink: 0, marginRight: 8 }}>
                  {(product.sellPrice * qty).toLocaleString("ar-SA")} ر.س
                </span>
              </div>
            ))}
            <div style={{ padding: "11px 14px", background: hex2rgb(orgAccent, 0.06), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.t2 }}>المجموع</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: orgAccent }}>{total.toLocaleString("ar-SA")} ر.س</span>
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 7 }}>الاسم</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسمك الكريم" style={inputStyle} />
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 7 }}>رقم الجوال</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr" style={{ ...inputStyle, textAlign: "right" }} />
          </div>

          {/* Email (optional) */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 7 }}>
              البريد الإلكتروني <span style={{ fontWeight: 500, color: T.t3 }}>(اختياري)</span>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" dir="ltr" style={{ ...inputStyle, textAlign: "right" }} />
          </div>

          {/* Delivery address */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 7 }}>الشارع والحي</label>
            <input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="اسم الشارع والحي" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 7 }}>المدينة</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="المدينة" style={inputStyle} />
          </div>

          {/* Coupon code (optional) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.t2, marginBottom: 7 }}>
              كود الخصم <span style={{ fontWeight: 500, color: T.t3 }}>(اختياري)</span>
            </label>
            <input type="text" value={couponCode} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="PROMO2026" dir="ltr" style={{ ...inputStyle, textAlign: "right", letterSpacing: 1 }} />
          </div>

          {/* Terms */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20, cursor: "pointer" }}>
            <div onClick={() => setAgreed(!agreed)} style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: `2px solid ${agreed ? primary : T.border}`,
              background: agreed ? primary : T.surface,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .15s",
            }}>
              {agreed && <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} style={{ width: 12, height: 12 }}>
                <path stroke="white" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>}
            </div>
            <span style={{ fontSize: 12, color: T.t2, lineHeight: 1.5 }}>أوافق على الشروط والأحكام وسياسة الخصوصية</span>
          </label>

          {error && (
            <div style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 10, background: "#FFF1F2", border: "1px solid #FECDD3", color: "#E11D48", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{
            width: "100%", padding: "15px 0", borderRadius: 14, border: "none",
            background: canSubmit && !submitting
              ? `linear-gradient(135deg, ${orgAccent} 0%, ${darken(orgAccent)} 100%)`
              : T.surfaceSubtle,
            color: canSubmit && !submitting ? "white" : T.t3,
            fontWeight: 900, fontSize: 15,
            cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            boxShadow: canSubmit && !submitting ? `0 6px 20px ${hex2rgb(orgAccent, 0.35)}` : "none",
            transition: "all .2s",
          }}>
            {submitting ? "جاري الانتقال للدفع..." : "انتقل للدفع"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Store Products Section ────────────────────────────────────────────
function StoreProductsSection({ products, orgAccent, productCart, onQtyChange, onCheckout }: {
  products: StoreProduct[];
  orgAccent: string;
  productCart: Map<string, { product: StoreProduct; qty: number }>;
  onQtyChange: (product: StoreProduct, delta: number) => void;
  onCheckout: () => void;
}) {
  const cartTotal = Array.from(productCart.values()).reduce((s, { product, qty }) => s + product.sellPrice * qty, 0);
  const cartCount = Array.from(productCart.values()).reduce((s, { qty }) => s + qty, 0);

  return (
    <div style={{ margin: "16px 0 0", padding: "0 16px" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: T.t1 }}>المنتجات</p>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.t3 }}>{products.length} منتج</span>
      </div>

      {/* Product grid — 2 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {products.map(product => {
          const entry   = productCart.get(product.id);
          const qty     = entry?.qty ?? 0;
          const imgSrc  = product.images?.[0];

          return (
            <div key={product.id} style={{
              background: T.surface, borderRadius: 16, overflow: "hidden",
              border: `1px solid ${qty > 0 ? hex2rgb(orgAccent, 0.3) : T.borderFaint}`,
              boxShadow: qty > 0 ? `0 4px 16px ${hex2rgb(orgAccent, 0.12)}` : T.shadow,
              transition: "border-color .15s, box-shadow .15s",
            }}>
              {/* Image */}
              <div style={{ position: "relative", height: 110, background: hex2rgb(orgAccent, 0.06), overflow: "hidden" }}>
                {imgSrc
                  ? <img src={imgSrc} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={hex2rgb(orgAccent, 0.4)} strokeWidth={1.5} style={{ width: 32, height: 32 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                      </svg>
                    </div>
                  )
                }
                {qty > 0 && (
                  <div style={{ position: "absolute", top: 6, left: 6, background: orgAccent, color: "white", borderRadius: 8, padding: "2px 7px", fontSize: 11, fontWeight: 900 }}>
                    {qty}
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: "10px 10px 12px" }}>
                <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 800, color: T.t1, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</p>
                {product.description && (
                  <p style={{ margin: "0 0 6px", fontSize: 10, color: T.t3, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                    {product.description}
                  </p>
                )}
                <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 900, color: orgAccent }}>{Number(product.sellPrice).toLocaleString("ar-SA")} ر.س</p>

                {/* Qty control */}
                {qty === 0 ? (
                  <button onClick={() => onQtyChange(product, 1)} style={{
                    width: "100%", padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 800,
                    border: `1.5px solid ${orgAccent}`, background: "white", color: orgAccent,
                    cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                  }}>
                    أضف
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: hex2rgb(orgAccent, 0.07), borderRadius: 10, padding: "4px 6px" }}>
                    <button onClick={() => onQtyChange(product, 1)} style={{
                      width: 28, height: 28, borderRadius: 8, border: "none", background: orgAccent,
                      color: "white", fontSize: 16, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                    }}>+</button>
                    <span style={{ fontSize: 14, fontWeight: 900, color: T.t1 }}>{qty}</span>
                    <button onClick={() => onQtyChange(product, -1)} style={{
                      width: 28, height: 28, borderRadius: 8, border: `1px solid ${hex2rgb(orgAccent, 0.3)}`, background: "white",
                      color: orgAccent, fontSize: 16, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                    }}>−</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart CTA — appears when cart is non-empty */}
      {cartCount > 0 && (
        <div style={{ marginTop: 16, padding: "14px", borderRadius: 16, background: "#0f172a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
                {cartCount} {cartCount === 1 ? "منتج" : "منتجات"}
              </p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: orgAccent, letterSpacing: -0.4 }}>
                {cartTotal.toLocaleString("ar-SA")} ر.س
              </p>
            </div>
            <button onClick={onCheckout} style={{
              flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${orgAccent} 0%, ${darken(orgAccent)} 100%)`,
              color: "white", fontWeight: 900, fontSize: 14,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: `0 4px 16px ${hex2rgb(orgAccent, 0.4)}`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all .15s",
            }}>
              <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: 6, padding: "1px 7px", fontSize: 12, fontWeight: 900 }}>
                {cartCount}
              </span>
              اطلب الآن
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} style={{ width: 14, height: 14 }}>
                <path stroke="white" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div dir="rtl" className="sf-container" style={{ fontFamily: "inherit", minHeight: "100dvh", background: T.bg }}>
      <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: -1 }} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
      <div style={{ height: 74, background: T.surface, borderBottom: `1px solid ${T.border}` }} />
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ height: 82, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, animation: `pulse 1.5s ease-in-out ${i * 0.07}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export function PublicStorefrontPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData]                   = useState<SiteData | null>(null);
  const [loading, setLoading]             = useState(true);
  const [activeCat, setActiveCat]         = useState("all");
  const [cart, setCart]                   = useState<ServiceItem[]>([]);
  const [showSheet, setShowSheet]         = useState(false);
  const [viewMode, setViewMode]           = useState<"list" | "grid">("grid");
  const catBarRef                         = useRef<HTMLDivElement>(null);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [productCart, setProductCart]     = useState<Map<string, { product: StoreProduct; qty: number }>>(new Map());
  const [showProductCheckout, setShowProductCheckout] = useState(false);
  const slug = orgSlug || "";

  // Persist cart session id in localStorage
  const sessionId = (() => {
    if (!slug) return "";
    const key = `nasaq_cart_${slug}_sid`;
    let sid = localStorage.getItem(key);
    if (!sid) { sid = crypto.randomUUID(); localStorage.setItem(key, sid); }
    return sid;
  })();

  const inCart     = (id: string) => cart.some(s => s.id === id);
  const toggleCart = (svc: ServiceItem) => {
    if (!isBookableItem(svc)) return;
    setCart(prev => inCart(svc.id) ? prev.filter(s => s.id !== svc.id) : [...prev, svc]);
  };

  useEffect(() => {
    if (!slug) return;
    storefrontApi.get(slug)
      .then((res: any) => { if (res?.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    storefrontApi.getProducts(slug)
      .then((res: any) => { if (Array.isArray(res?.data)) setStoreProducts(res.data); })
      .catch(() => {});
  }, [slug]);

  const handleProductQtyChange = (product: StoreProduct, delta: number) => {
    setProductCart(prev => {
      const next = new Map(prev);
      const entry = next.get(product.id);
      const newQty = (entry?.qty ?? 0) + delta;
      if (newQty <= 0) {
        next.delete(product.id);
      } else {
        next.set(product.id, { product, qty: newQty });
      }
      // Persist to backend cart (fire-and-forget)
      const cartItems = Array.from(next.values()).map(({ product: p, qty: q }) => ({ productId: p.id, name: p.name, qty: q, price: p.sellPrice }));
      const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
      if (cartItems.length > 0) {
        storefrontApi.upsertCart(slug, { sessionId, items: cartItems, totalAmount: cartTotal }).catch(() => {});
      }
      return next;
    });
  };

  if (loading) return <Skeleton />;

  if (!data) return (
    <div dir="rtl" style={{ fontFamily: "inherit", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <p style={{ color: T.t3, fontSize: 14 }}>المنشأة غير موجودة</p>
    </div>
  );

  const { org, services, categories, config } = data;

  // Platform brand = #5b9bd5 — structural identity (stripe, footer)
  // orgAccent = org.primaryColor — price, add buttons, active pill, cart CTA
  const orgAccent  = org.primaryColor || "#d4b06a";
  const fontFamily = config?.fontFamily || "IBM Plex Sans Arabic";
  const headerCfg  = config?.headerConfig;
  const showPhone  = headerCfg?.showPhone !== false;
  const showBook   = headerCfg?.showBookButton !== false;
  const F: React.CSSProperties = { fontFamily: `'${fontFamily}', sans-serif` };

  const active    = services.filter(s => !s.status || s.status === "active" || s.status === "published");
  const filtered  = activeCat === "all" ? active : active.filter(s => s.categoryId === activeCat);
  const totalCart = cart.reduce((sum, s) => sum + parseFloat(s.basePrice || String(s.price ?? 0)), 0);
  const catMap    = Object.fromEntries(categories.map(c => [c.id, c.name]));

  // Hero initials (2 chars max)
  const initials = org.name.trim().slice(0, 2);

  const waLink = org.phone
    ? `https://wa.me/${org.phone.replace(/\D/g,"")}?text=${encodeURIComponent("مرحبا، أريد الاستفسار عن خدماتكم")}`
    : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{margin:0;background:#0f172a;}
        @keyframes sheetIn{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes cardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes barUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .chip-bar::-webkit-scrollbar{display:none}
        .svc-row{cursor:pointer;transition:transform .12s;}
        .svc-row:active{transform:scale(0.988);}
        .book-pill{transition:all .15s;}
        .book-pill:active{opacity:.82;transform:scale(0.95);}
        .grid-card{cursor:pointer;transition:transform .12s;}
        .grid-card:active{transform:scale(0.97);}
        .view-toggle-btn{transition:all .15s;}
        .view-toggle-btn:active{opacity:.7;}
        .sf-container{max-width:440px;margin:0 auto;}
        @media(min-width:640px){.sf-container{max-width:680px;}}
        @media(min-width:1024px){.sf-container{max-width:900px;}}
      `}</style>

      {/* Fixed bg */}
      <div style={{ position: "fixed", inset: 0, background: "#f8fafc", zIndex: -1 }} />

      <div dir="rtl" className="sf-container" style={{ ...F, minHeight: "100dvh", background: "#f8fafc", paddingBottom: 96 }}>

        {/* ━━━━ HERO ━━━━
            Full-bleed dark gradient — scrolls with page.
            Store avatar · name · stats · contact buttons.
        */}
        <div style={{
          background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
          padding: "48px 20px 28px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* ترميز OS identity stripe */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${BRAND} 0%, #3d84c8 100%)` }} />

          {/* Subtle radial glow */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `radial-gradient(ellipse 80% 60% at 30% 50%, ${hex2rgb(orgAccent, 0.14)} 0%, transparent 70%)`,
          }} />

          <div style={{ position: "relative" }}>
            {/* Avatar + name row */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 20 }}>
              {/* Initials avatar */}
              <div style={{
                width: 64, height: 64, borderRadius: 16, flexShrink: 0,
                background: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 900, color: orgAccent,
                boxShadow: `0 8px 24px rgba(0,0,0,0.35)`,
                fontFamily: "inherit",
              }}>
                {initials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 900, color: "#f8fafc", lineHeight: 1.2, letterSpacing: -0.4 }}>
                  {org.name}
                </p>
                {/* Service count badge */}
                {active.length > 0 && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11, fontWeight: 700,
                    color: orgAccent,
                    background: hex2rgb(orgAccent, 0.15),
                    padding: "3px 8px", borderRadius: 999,
                    border: `1px solid ${hex2rgb(orgAccent, 0.25)}`,
                  }}>
                    {active.length} خدمة
                  </span>
                )}
              </div>
            </div>

            {/* Stats row with border-top divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16, marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#f8fafc" }}>4.9</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>التقييم</span>
                </div>
                <span style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#f8fafc" }}>{active.length}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>خدمة</span>
                </div>
                {org.city && (
                  <>
                    <span style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: "#f8fafc", fontWeight: 700 }}>
                        {Icon.pin} {org.city}
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>الموقع</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Contact buttons */}
            {showPhone && (org.phone || waLink) && (
              <div style={{ display: "flex", gap: 9 }}>
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer" style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    height: 34, borderRadius: 10,
                    background: "#25D366", color: "white",
                    fontWeight: 800, fontSize: 13, textDecoration: "none",
                    boxShadow: "0 4px 14px rgba(37,211,102,0.35)",
                    fontFamily: "inherit",
                  }}>
                    {Icon.wa} واتساب
                  </a>
                )}
                {org.phone && (
                  <a href={`tel:${org.phone}`} style={{
                    ...(waLink ? { flexShrink: 0, width: 40 } : { flex: 1 }),
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    height: 34, borderRadius: 10,
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.9)",
                    fontWeight: 700, fontSize: 13, textDecoration: "none",
                    fontFamily: "inherit",
                  }}>
                    {Icon.phone}
                    {!waLink && "اتصال"}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ━━━━ STICKY CATEGORY PILLS ━━━━ */}
        <div style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          <div ref={catBarRef} className="chip-bar" style={{
            display: "flex", gap: 6, overflowX: "auto",
            padding: "10px 14px", scrollbarWidth: "none",
          }}>
            {[{ id: "all", name: "الكل" }, ...categories].map(cat => {
              const isActive = activeCat === cat.id;
              return (
                <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{
                  flexShrink: 0, padding: "6px 14px", borderRadius: 999,
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  transition: "all .15s",
                  border: `1.5px solid ${isActive ? orgAccent : T.border}`,
                  background: isActive ? orgAccent : "white",
                  color: isActive ? "white" : T.t2,
                  boxShadow: isActive ? `0 2px 10px ${hex2rgb(orgAccent, 0.3)}` : "none",
                }}>
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ━━━━ SERVICES ━━━━ */}
        <div style={{ padding: viewMode === "grid" ? "12px 12px 4px" : "12px 14px 4px" }}>
          {/* Section header: count label + view toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {filtered.length} خدمة متاحة
            </span>
            <div style={{ display: "flex", gap: 3, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
              {(["grid", "list"] as const).map(mode => (
                <button key={mode} className="view-toggle-btn" onClick={() => setViewMode(mode)} style={{
                  width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
                  background: viewMode === mode ? "#0f172a" : "transparent",
                  color: viewMode === mode ? "white" : T.t3,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "inherit", transition: "all .15s",
                }}>
                  {mode === "grid" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            /* Empty state */
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: "0 auto 14px",
                background: T.surfaceSubtle,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg fill="none" viewBox="0 0 24 24" stroke={T.border} strokeWidth={1.5} style={{ width: 26, height: 26 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p style={{ margin: "0 0 4px", fontSize: 14, color: T.t2, fontWeight: 700 }}>اختر خدمة للحجز</p>
              <p style={{ margin: 0, fontSize: 12, color: T.t3, fontWeight: 500 }}>لا توجد خدمات في هذا التصنيف</p>
            </div>

          ) : viewMode === "grid" ? (
            /* ── GRID VIEW ── */
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {filtered.map((s, i) => {
                const price    = parseFloat(s.basePrice || String(s.price ?? 0));
                const hasPrice = price > 0 && s.pricingType !== "free";
                const isFree   = s.pricingType === "free";
                const added    = inCart(s.id);
                const selectable = isBookableItem(s);
                return (
                  <div key={s.id} className="grid-card" style={{
                    background: "white",
                    borderRadius: 16,
                    border: `1.5px solid ${added ? hex2rgb(orgAccent, 0.4) : T.borderFaint}`,
                    boxShadow: added ? `0 0 0 2px ${hex2rgb(orgAccent, 0.15)}, ${T.shadow}` : T.shadow,
                    overflow: "hidden",
                    animation: `cardIn .22s ease ${i * 0.03}s both`,
                    transition: "border-color .15s, box-shadow .15s",
                  }}>
                    {/* Image area — warm honey gradient */}
                    <div style={{
                      height: 130, position: "relative",
                      background: "linear-gradient(135deg, #faf7ef 0%, #f5edda 100%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={hex2rgb(orgAccent, 0.35)} strokeWidth={1.5} style={{ width: 32, height: 32 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                      </svg>
                      {/* Category badge — top right */}
                      {s.categoryId && catMap[s.categoryId] && (
                        <div style={{
                          position: "absolute", top: 8, right: 8,
                          fontSize: 9, fontWeight: 700, color: T.t2,
                          background: "rgba(255,255,255,0.85)", padding: "2px 7px", borderRadius: 999,
                          backdropFilter: "blur(4px)",
                        }}>
                          {catMap[s.categoryId]}
                        </div>
                      )}
                      {added && (
                        <div style={{
                          position: "absolute", top: 8, left: 8,
                          width: 22, height: 22, borderRadius: 6,
                          background: "#0f172a",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} style={{ width: 12, height: 12 }}>
                            <path stroke="white" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div style={{ padding: "10px 10px 11px" }}>
                      <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 800, color: T.t1, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {s.name}
                      </p>
                      {s.description && (
                        <p style={{ margin: "0 0 6px", fontSize: 10, color: T.t3, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                          {s.description}
                        </p>
                      )}

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 6 }}>
                        <div>
                          {hasPrice && (
                            <span style={{ fontSize: 13, fontWeight: 900, color: orgAccent, letterSpacing: -0.3 }}>
                              {price.toLocaleString("ar-SA")}
                              <span style={{ fontSize: 9, fontWeight: 600, marginRight: 1 }}> ر.س</span>
                            </span>
                          )}
                          {isFree && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#D1FAE5", padding: "2px 6px", borderRadius: 5 }}>مجاني</span>
                          )}
                          {!hasPrice && !isFree && (
                            <span style={{ fontSize: 10, color: T.t3, fontWeight: 500 }}>عند الطلب</span>
                          )}
                        </div>

                        {showBook && selectable && (
                          <button className="book-pill" onClick={() => toggleCart(s)} style={{
                            width: 28, height: 28, borderRadius: 8, border: "none",
                            background: added ? "#0f172a" : orgAccent,
                            color: "white",
                            cursor: "pointer", fontFamily: "inherit",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: added ? "0 2px 8px rgba(0,0,0,0.2)" : `0 2px 8px ${hex2rgb(orgAccent, 0.3)}`,
                          }}>
                            {added ? (
                              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} style={{ width: 13, height: 13 }}>
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} style={{ width: 13, height: 13 }}>
                                <path stroke="currentColor" strokeLinecap="round" d="M12 5v14M5 12h14" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          ) : (
            /* ── LIST VIEW ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {filtered.map((s, i) => {
                const price    = parseFloat(s.basePrice || String(s.price ?? 0));
                const hasPrice = price > 0 && s.pricingType !== "free";
                const isFree   = s.pricingType === "free";
                const added    = inCart(s.id);
                const selectable = isBookableItem(s);
                return (
                  <div key={s.id} className="svc-row" style={{
                    background: "white",
                    borderRadius: 16,
                    border: `1.5px solid ${added ? hex2rgb(orgAccent, 0.35) : T.borderFaint}`,
                    boxShadow: added ? `0 0 0 2px ${hex2rgb(orgAccent, 0.12)}, ${T.shadow}` : T.shadow,
                    display: "flex",
                    alignItems: "stretch",
                    gap: 0,
                    overflow: "hidden",
                    animation: `cardIn .26s ease ${i * 0.04}s both`,
                    transition: "border-color .15s, box-shadow .15s",
                  }}>
                    {/* Thumbnail — 56×56 square warm gradient */}
                    <div style={{
                      width: 56, height: 56, flexShrink: 0, alignSelf: "center",
                      margin: "0 0 0 12px",
                      borderRadius: 10, overflow: "hidden",
                      background: "linear-gradient(135deg, #faf7ef 0%, #f5edda 100%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={hex2rgb(orgAccent, 0.35)} strokeWidth={1.5} style={{ width: 22, height: 22 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                      </svg>
                    </div>

                    {/* Text block */}
                    <div style={{ flex: 1, minWidth: 0, padding: "13px 10px 13px 0" }}>
                      {/* Category name */}
                      {s.categoryId && catMap[s.categoryId] && (
                        <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, color: T.t3 }}>
                          {catMap[s.categoryId]}
                        </p>
                      )}
                      <p style={{ margin: "0 0 4px", fontWeight: 800, color: T.t1, fontSize: 14, lineHeight: 1.3 }}>
                        {s.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {hasPrice && (
                          <span style={{ fontSize: 14, fontWeight: 900, color: orgAccent, letterSpacing: -0.3 }}>
                            {s.pricingType === "from" && <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 2 }}>من </span>}
                            {price.toLocaleString("ar-SA")}
                            <span style={{ fontSize: 9, fontWeight: 600, color: hex2rgb(orgAccent, 0.65), marginRight: 2 }}> ر.س</span>
                          </span>
                        )}
                        {isFree && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#D1FAE5", padding: "2px 7px", borderRadius: 5 }}>مجاني</span>
                        )}
                        {s.duration && s.duration > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: T.t3, fontWeight: 600 }}>
                            {Icon.clock} {s.duration} د
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Add button — honey outline style */}
                    {showBook && selectable && (
                      <div style={{ display: "flex", alignItems: "center", padding: "0 14px 0 10px", flexShrink: 0 }}>
                        <button className="book-pill" onClick={() => toggleCart(s)} style={{
                          padding: "6px 14px",
                          borderRadius: 10,
                          background: added ? orgAccent : "white",
                          color: added ? "white" : orgAccent,
                          fontWeight: 800, fontSize: 12,
                          border: `1.5px solid ${orgAccent}`,
                          cursor: "pointer", fontFamily: "inherit",
                          whiteSpace: "nowrap",
                          boxShadow: added ? `0 2px 8px ${hex2rgb(orgAccent, 0.3)}` : "none",
                          display: "flex", alignItems: "center", gap: 4,
                          transition: "all .15s",
                        }}>
                          {added ? (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} style={{ width: 12, height: 12 }}>
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              مضاف
                            </>
                          ) : "أضف"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Flower section */}
        {data.flowerSection?.isEnabled && (
          <FlowerBuilderSection section={data.flowerSection} slug={slug} />
        )}

        {/* Store products section */}
        {storeProducts.length > 0 && (
          <StoreProductsSection
            products={storeProducts}
            orgAccent={orgAccent}
            productCart={productCart}
            onQtyChange={handleProductQtyChange}
            onCheckout={() => setShowProductCheckout(true)}
          />
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "28px 0 12px" }}>
          <span style={{ fontSize: 11, color: T.t3, fontWeight: 500 }}>مدعوم بـ</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: BRAND }}>{PLATFORM_NAME}</span>
        </div>

        {/* ━━━━ BOTTOM CTA BAR ━━━━
            Always white outer wrapper.
            Inner: dark #0f172a rounded container when items in cart.
            Inner: light #f1f5f9 rounded pill when empty.
        */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20,
          background: "white",
          borderTop: `1px solid ${T.borderFaint}`,
          boxShadow: "0 -4px 20px rgba(15,23,42,0.07)",
          animation: "barUp .25s ease both",
        }}>
          <div className="sf-container" style={{ boxSizing: "border-box", padding: "10px 14px env(safe-area-inset-bottom, 10px)" }}>
          {showBook && active.length > 0 && (
            <>
              {cart.length > 0 ? (
                /* Dark inner container with cart info + CTA */
                <div style={{
                  background: "#0f172a", borderRadius: 14,
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
                      {cart.length} {cart.length === 1 ? cartLabel(cart).unit : cartLabel(cart).units}
                    </span>
                    {totalCart > 0 && (
                      <span style={{ fontSize: 15, fontWeight: 900, color: orgAccent, letterSpacing: -0.4 }}>
                        {totalCart.toLocaleString("ar-SA")} ر.س
                      </span>
                    )}
                  </div>

                  <button onClick={() => setShowSheet(true)} style={{
                    flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
                    background: `linear-gradient(135deg, ${orgAccent} 0%, ${darken(orgAccent)} 100%)`,
                    color: "white", fontWeight: 900, fontSize: 14,
                    cursor: "pointer", fontFamily: "inherit",
                    boxShadow: `0 4px 16px ${hex2rgb(orgAccent, 0.4)}`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all .15s",
                  }}>
                    <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: 6, padding: "1px 7px", fontSize: 12, fontWeight: 900 }}>
                      {cart.length}
                    </span>
                    {cartLabel(cart).cta}
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} style={{ width: 14, height: 14 }}>
                      <path stroke="white" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {waLink && (
                    <a href={waLink} target="_blank" rel="noreferrer" style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: "rgba(37,211,102,0.15)",
                      border: "1px solid rgba(37,211,102,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#25D366", textDecoration: "none",
                    }}>
                      {Icon.wa}
                    </a>
                  )}
                </div>
              ) : (
                /* Empty state — light pill */
                <div style={{
                  height: 50, background: "#f1f5f9", borderRadius: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 13, color: T.t3, fontWeight: 600 }}>{cartLabel(cart).empty}</span>
                </div>
              )}
            </>
          )}

          {/* WA only (no booking enabled) */}
          {(!showBook || active.length === 0) && waLink && (
            <a href={waLink} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", height: 50, borderRadius: 14,
              background: "#25D366", color: "white",
              fontWeight: 800, fontSize: 14, textDecoration: "none",
              boxShadow: "0 4px 16px rgba(37,211,102,0.3)",
              fontFamily: "inherit",
            }}>
              {Icon.wa} واتساب
            </a>
          )}
          </div>{/* /sf-container inner */}
        </div>

        {/* Booking sheet */}
        {showSheet && cart.length > 0 && (
          <BookingSheet
            services={cart}
            org={org}
            slug={slug}
            onClose={() => { setShowSheet(false); setCart([]); }}
          />
        )}

        {/* Product checkout sheet */}
        {showProductCheckout && productCart.size > 0 && (
          <ProductCheckoutSheet
            productCart={productCart}
            slug={slug}
            sessionId={sessionId}
            orgAccent={orgAccent}
            org={org}
            onClose={() => setShowProductCheckout(false)}
          />
        )}
      </div>
    </>
  );
}
