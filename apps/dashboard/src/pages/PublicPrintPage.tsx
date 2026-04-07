import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { websiteApi } from "@/lib/api";
import QRCode from "qrcode";

// ══ Types ══════════════════════════════════════════════════════
interface OrgData {
  id: string; name: string; slug: string;
  phone?: string; email?: string; logo?: string;
  city?: string; address?: string; description?: string;
  primaryColor: string; businessType?: string;
}
interface ServiceItem {
  id: string; name: string;
  basePrice?: string; price?: number; pricingType?: string;
  description?: string; duration?: number; status?: string;
}
interface SiteData {
  org: OrgData;
  services: ServiceItem[];
}

// ══ QR Hook ════════════════════════════════════════════════════
function useQR(url: string, size: number) {
  const [qrUrl, setQrUrl] = useState("");
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, {
      width: size, margin: 1,
      color: { dark: "#1a1a2e", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setQrUrl).catch(() => {});
  }, [url, size]);
  return qrUrl;
}

// ══ Export helpers ═════════════════════════════════════════════
// scale: pixels-per-CSS-pixel — higher = sharper at small physical sizes
async function exportToPNG(elementId: string, filename: string, scale = 3) {
  const h2c = (await import("html2canvas")).default;
  const el = document.getElementById(elementId)!;
  const canvas = await h2c(el, { scale, useCORS: true, backgroundColor: "#ffffff" });
  const a = document.createElement("a");
  a.download = filename; a.href = canvas.toDataURL("image/png"); a.click();
}
async function exportAllPDF(slug: string) {
  const [{ jsPDF }, h2c] = await Promise.all([
    import("jspdf"), import("html2canvas").then(m => m.default),
  ]);
  // Page 1 — A4 (210×297mm portrait)
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const a4 = await h2c(document.getElementById("print-a4")!, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  pdf.addImage(a4.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
  // Page 2 — Business card (85×54mm landscape)
  pdf.addPage([85, 54], "landscape");
  const card = await h2c(document.getElementById("print-card")!, { scale: 6, useCORS: true, backgroundColor: "#ffffff" });
  pdf.addImage(card.toDataURL("image/png"), "PNG", 0, 0, 85, 54);
  // Page 3 — Shelf label (80×50mm landscape)
  pdf.addPage([80, 50], "landscape");
  const shelf = await h2c(document.getElementById("print-shelf")!, { scale: 6, useCORS: true, backgroundColor: "#ffffff" });
  pdf.addImage(shelf.toDataURL("image/png"), "PNG", 0, 0, 80, 50);
  pdf.save(`${slug}-print.pdf`);
}

// ══ A4 Catalog Page ════════════════════════════════════════════
function A4Page({ org, services, qrUrl }: { org: OrgData; services: ServiceItem[]; qrUrl: string }) {
  const primary = org.primaryColor || "#5b9bd5";
  const dark = "#0f172a";
  const muted = "#64748b";
  const light = "#f8fafc";
  const border = "#e2e8f0";

  // hex to rgba helper
  const hex2rgba = (hex: string, a: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  const active = services.filter(s => !s.status || s.status === "active" || s.status === "published");
  const top = active.slice(0, 24);
  const cols = top.length > 8 ? 3 : 2;

  const F: React.CSSProperties = { fontFamily: "'IBM Plex Sans Arabic', sans-serif" };

  return (
    <div id="print-a4" style={{
      ...F, width: "210mm", minHeight: "297mm", background: "#fff",
      direction: "rtl", display: "flex", flexDirection: "column",
      boxSizing: "border-box", overflow: "hidden", position: "relative",
    }}>

      {/* ── Header band ── */}
      <div style={{
        background: `linear-gradient(135deg, ${primary} 0%, ${hex2rgba(primary, 0.8)} 100%)`,
        padding: "20mm 14mm 14mm",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "10mm",
      }}>
        {/* Logo + name */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {org.logo
            ? <img src={org.logo} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "contain", background: "#fff", padding: 4 }} />
            : <div style={{ width: 56, height: 56, borderRadius: 12, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 26 }}>{org.name[0]}</span>
              </div>
          }
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>{org.name}</h1>
            {(org.city || org.address) && (
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                {[org.city, org.address].filter(Boolean).join(" — ")}
              </p>
            )}
            {org.phone && (
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600, direction: "ltr" }}>
                {org.phone}
              </p>
            )}
          </div>
        </div>

        {/* QR */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: 6, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
            {qrUrl
              ? <img src={qrUrl} alt="QR" style={{ width: 80, height: 80, display: "block" }} />
              : <div style={{ width: 80, height: 80, background: "#f0f0f0" }} />
            }
          </div>
          <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 9, fontWeight: 700 }}>امسح للحجز</span>
        </div>
      </div>

      {/* ── Section title ── */}
      <div style={{ padding: "10mm 14mm 6mm", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 20, background: primary, borderRadius: 2 }} />
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: dark }}>
          {active.length > 0 ? "قائمة الخدمات والأسعار" : "خدماتنا"}
        </h2>
        {active.length > 0 && (
          <span style={{ marginRight: "auto", fontSize: 10, color: muted, background: light, border: `1px solid ${border}`, padding: "2px 8px", borderRadius: 20 }}>
            {active.length} خدمة
          </span>
        )}
      </div>

      {/* ── Services grid ── */}
      <div style={{ flex: 1, padding: "0 14mm 8mm" }}>
        {active.length > 0 ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "6px",
          }}>
            {top.map((s, i) => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px",
                background: i % 2 === 0 ? light : "#fff",
                border: `1px solid ${border}`,
                borderRadius: 8,
                gap: 8,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: dark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name}
                  </p>
                  {s.duration && s.duration > 0 && (
                    <p style={{ margin: "2px 0 0", fontSize: 9, color: muted }}>{s.duration} دقيقة</p>
                  )}
                </div>
                {s.pricingType !== "free" && (s.basePrice != null || s.price != null) && (
                  <span style={{
                    fontSize: 12, fontWeight: 800, color: "#fff",
                    background: primary, padding: "2px 8px", borderRadius: 6,
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    {(s.pricingType === "from" ? "من " : "")}
                    {Number(s.basePrice ?? s.price).toLocaleString("ar-SA")} ر.س
                  </span>
                )}
                {s.pricingType === "free" && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: 6, flexShrink: 0 }}>
                    مجاني
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: muted }}>تواصل معنا للاستفسار عن خدماتنا</p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: `1px solid ${border}`,
        padding: "6mm 14mm",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: light,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: muted }}>الحجز عبر:</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: primary, direction: "ltr" }}>
            nasaqpro.tech/s/{org.slug}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 9, color: "#cbd5e1" }}>مدعوم بـ</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: primary }}>ترميز OS</span>
        </div>
      </div>
    </div>
  );
}

// ══ Business Card ══════════════════════════════════════════════
function BusinessCard({ org, qrUrl }: { org: OrgData; qrUrl: string }) {
  const primary = org.primaryColor || "#5b9bd5";
  const F: React.CSSProperties = { fontFamily: "'IBM Plex Sans Arabic', sans-serif" };
  return (
    <div id="print-card" style={{
      ...F, width: "85mm", height: "54mm", direction: "rtl",
      background: "#fff", boxSizing: "border-box",
      display: "flex", overflow: "hidden", position: "relative",
      border: "1px solid #e2e8f0",
    }}>
      {/* Left accent */}
      <div style={{ width: "14mm", background: `linear-gradient(180deg, ${primary} 0%, ${primary}cc 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "#fff", fontWeight: 900, fontSize: 16, writingMode: "vertical-rl" }}>{org.name[0]}</span>
      </div>
      {/* Content */}
      <div style={{ flex: 1, padding: "5mm 4mm", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>{org.name}</h2>
          {org.city && <p style={{ margin: "2px 0 0", fontSize: 9, color: "#64748b" }}>{org.city}</p>}
          {org.phone && <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 700, color: primary, direction: "ltr" }}>{org.phone}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ background: primary, color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4 }}>احجز الآن</div>
          <span style={{ fontSize: 8, color: "#94a3b8" }}>ترميز OS</span>
        </div>
      </div>
      {/* QR */}
      <div style={{ width: "20mm", padding: "3mm", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, borderRight: "1px solid #f1f5f9" }}>
        {qrUrl && <img src={qrUrl} alt="QR" style={{ width: "15mm", height: "15mm" }} />}
        <span style={{ fontSize: 7, color: "#94a3b8", textAlign: "center" }}>امسح</span>
      </div>
    </div>
  );
}

// ══ Shelf Label — 80×50mm ══════════════════════════════════════
function ShelfLabel({ org, qrUrl }: { org: OrgData; qrUrl: string }) {
  const primary = org.primaryColor || "#5b9bd5";
  const F: React.CSSProperties = { fontFamily: "'IBM Plex Sans Arabic', sans-serif" };
  return (
    <div id="print-shelf" style={{
      ...F, width: "80mm", height: "50mm", direction: "rtl",
      background: "#fff", boxSizing: "border-box",
      display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
      border: "1px solid #e2e8f0",
    }}>
      {/* Top accent bar */}
      <div style={{ height: "8mm", background: `linear-gradient(90deg, ${primary} 0%, ${primary}cc 100%)`, display: "flex", alignItems: "center", padding: "0 4mm", gap: 6 }}>
        {org.logo
          ? <img src={org.logo} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "contain", background: "#fff", padding: 1 }} />
          : <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 10 }}>{org.name[0]}</span>
            </div>
        }
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.name}</span>
      </div>
      {/* Body */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 4mm", gap: "4mm" }}>
        {/* QR */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {qrUrl
            ? <img src={qrUrl} alt="QR" style={{ width: "22mm", height: "22mm" }} />
            : <div style={{ width: "22mm", height: "22mm", background: "#f1f5f9" }} />
          }
          <span style={{ fontSize: 6, color: "#94a3b8", textAlign: "center" }}>امسح للحجز</span>
        </div>
        {/* Info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          {org.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 8, color: "#64748b" }}>هاتف:</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: primary, direction: "ltr" }}>{org.phone}</span>
            </div>
          )}
          {org.city && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 8, color: "#64748b" }}>الموقع:</span>
              <span style={{ fontSize: 8, color: "#374151" }}>{org.city}</span>
            </div>
          )}
          <div style={{ marginTop: 2, background: primary, color: "#fff", fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 4, width: "fit-content" }}>
            احجز الآن
          </div>
          <span style={{ fontSize: 7, color: "#cbd5e1", marginTop: 1, direction: "ltr" }}>nasaqpro.tech/s/{org.slug}</span>
        </div>
      </div>
    </div>
  );
}

// ══ Main Page ══════════════════════════════════════════════════
export function PublicPrintPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const slug = orgSlug || "";

  const publicUrl = `https://nasaqpro.tech/s/${slug}`;
  const qrA4    = useQR(publicUrl, 400);
  const qrCard  = useQR(publicUrl, 200);
  const qrShelf = useQR(publicUrl, 200);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    websiteApi.publicSite(slug)
      .then((res: any) => { if (res?.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: 28, height: 28, border: "3px solid #5b9bd5", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 10, fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl" }}>
      <p style={{ color: "#64748b" }}>المنشأة غير موجودة</p>
      <Link to="/" style={{ color: "#5b9bd5", fontSize: 13 }}>العودة</Link>
    </div>
  );

  const primary = data.org.primaryColor || "#5b9bd5";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f1f5f9; font-family: 'IBM Plex Sans Arabic', sans-serif; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          #print-a4 { box-shadow: none !important; }
        }
      `}</style>

      {/* ── Action bar ── */}
      <div className="no-print" style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#0f172a", padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl",
        borderBottom: `3px solid ${primary}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: primary }} />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{data.org.name}</span>
          <span style={{ color: "#475569", fontSize: 12 }}>— صفحة المطبوعات</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={async () => { setExporting(true); try { await exportToPNG("print-a4", `${slug}-a4.png`); } finally { setExporting(false); } }}
            disabled={exporting}
            style={{ padding: "7px 14px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
          >
            PNG
          </button>
          <button
            onClick={async () => { setExporting(true); try { await exportAllPDF(slug); } finally { setExporting(false); } }}
            disabled={exporting}
            style={{ padding: "7px 16px", background: primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
          >
            {exporting ? "جاري..." : "تحميل PDF"}
          </button>
          <button
            onClick={() => window.print()}
            style={{ padding: "7px 16px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
          >
            طباعة
          </button>
        </div>
      </div>

      {/* ── Preview area ── */}
      <div style={{ padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 48, fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl" }}>

        {/* ── 1. A4 ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", letterSpacing: "0.08em" }}>A4 Card</span>
            <span style={{ fontSize: 11, color: "#475569" }}>210×297mm — للواجهة والإعلانات</span>
          </div>
          <div style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.15)", borderRadius: 4 }}>
            <A4Page org={data.org} services={data.services} qrUrl={qrA4} />
          </div>
          <div className="no-print" style={{ display: "flex", gap: 8 }}>
            <button onClick={async () => { setExporting(true); try { await exportToPNG("print-a4", `${slug}-a4.png`, 2); } finally { setExporting(false); } }}
              disabled={exporting}
              style={{ padding: "7px 16px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              تحميل PNG
            </button>
          </div>
        </div>

        {/* ── 2. Business Card ── */}
        <div className="no-print" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", letterSpacing: "0.08em" }}>بطاقة عمل</span>
            <span style={{ fontSize: 11, color: "#475569" }}>85×54mm — لتوزيعها للعملاء</span>
          </div>
          <div style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)", borderRadius: 4 }}>
            <BusinessCard org={data.org} qrUrl={qrCard} />
          </div>
          <button onClick={async () => { setExporting(true); try { await exportToPNG("print-card", `${slug}-card.png`, 6); } finally { setExporting(false); } }}
            disabled={exporting}
            style={{ padding: "7px 16px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
            تحميل PNG
          </button>
        </div>

        {/* ── 3. Shelf Label ── */}
        <div className="no-print" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", letterSpacing: "0.08em" }}>ملصق الرف</span>
            <span style={{ fontSize: 11, color: "#475569" }}>80×50mm — يُثبَّت على المنتجات</span>
          </div>
          <div style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)", borderRadius: 4 }}>
            <ShelfLabel org={data.org} qrUrl={qrShelf} />
          </div>
          <button onClick={async () => { setExporting(true); try { await exportToPNG("print-shelf", `${slug}-shelf.png`, 6); } finally { setExporting(false); } }}
            disabled={exporting}
            style={{ padding: "7px 16px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
            تحميل PNG
          </button>
        </div>

        <Link className="no-print" to={`/s/${slug}`} style={{ color: "#475569", fontSize: 12, fontFamily: "inherit", textDecoration: "none", borderBottom: "1px solid #334155", paddingBottom: 2 }}>
          العودة لصفحة المنشأة
        </Link>
      </div>
    </>
  );
}
