import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { websiteApi } from "@/lib/api";
import QRCode from "qrcode";

// ══ Types ═════════════════════════════════════════════════════
interface OrgData {
  id: string; name: string; slug: string;
  phone?: string; email?: string; logo?: string;
  city?: string; address?: string; description?: string;
  primaryColor: string; businessType?: string;
}
interface ServiceItem {
  id: string; name: string; price?: number; pricingType?: string;
}
interface SiteData {
  org: OrgData;
  services: ServiceItem[];
}

// ══ QR Hook ═══════════════════════════════════════════════════
function useQR(slug: string, size: number, color: string) {
  const [qrUrl, setQrUrl] = useState<string>("");
  useEffect(() => {
    QRCode.toDataURL(`https://nasaqpro.tech/s/${slug}`, {
      width: size,
      margin: 1,
      color: { dark: color, light: "#FFFFFF" },
      errorCorrectionLevel: "H",
    }).then(setQrUrl).catch(() => {});
  }, [slug, size, color]);
  return qrUrl;
}

// ══ PDF / PNG Export ══════════════════════════════════════════
async function exportToPDF(slug: string) {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import("jspdf"),
    import("html2canvas").then(m => m.default),
  ]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const a4El = document.getElementById("print-a4")!;
  const a4Canvas = await html2canvas(a4El, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  pdf.addImage(a4Canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);

  pdf.addPage([85, 54], "landscape");
  const cardEl = document.getElementById("print-card")!;
  const cardCanvas = await html2canvas(cardEl, { scale: 4, useCORS: true, backgroundColor: "#ffffff" });
  pdf.addImage(cardCanvas.toDataURL("image/png"), "PNG", 0, 0, 85, 54);

  pdf.addPage([80, 50], "landscape");
  const labelEl = document.getElementById("print-label")!;
  const labelCanvas = await html2canvas(labelEl, { scale: 4, useCORS: true, backgroundColor: "#ffffff" });
  pdf.addImage(labelCanvas.toDataURL("image/png"), "PNG", 0, 0, 80, 50);

  pdf.save(`nasaq-${slug}.pdf`);
}

async function exportToPNG(elementId: string, filename: string) {
  const html2canvas = (await import("html2canvas")).default;
  const el = document.getElementById(elementId)!;
  const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ══ A4 Card ═══════════════════════════════════════════════════
function A4Card({ org, services, qrUrl }: { org: OrgData; services: ServiceItem[]; qrUrl: string }) {
  const primary = org.primaryColor || "#5b9bd5";
  const top6 = services.slice(0, 6);
  return (
    <div id="print-a4" style={{ width: "210mm", minHeight: "297mm", background: "#ffffff", fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl", display: "flex", flexDirection: "column", padding: "20mm", boxSizing: "border-box", position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", paddingBottom: "16px", borderBottom: `3px solid ${primary}` }}>
        {org.logo
          ? <img src={org.logo} alt={org.name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: "contain" }} />
          : <div style={{ width: 64, height: 64, borderRadius: 12, background: primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 28 }}>{org.name[0]}</span>
            </div>
        }
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#1a1a1a" }}>{org.name}</h1>
          {org.city && <p style={{ margin: "4px 0 0", fontSize: 14, color: "#666" }}>{org.city} {org.address ? `— ${org.address}` : ""}</p>}
        </div>
      </div>

      {/* QR + tagline */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "24px 0", padding: "28px", background: `${primary}10`, borderRadius: 16 }}>
        {qrUrl && <img src={qrUrl} alt="QR" style={{ width: 160, height: 160, borderRadius: 8, marginBottom: 16 }} />}
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: primary, textAlign: "center" }}>امسح للحجز والدفع الفوري</p>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#888", direction: "ltr", textAlign: "center" }}>nasaqpro.tech/s/{org.slug}</p>
      </div>

      {/* Top services */}
      {top6.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#333", marginBottom: 12, borderRight: `3px solid ${primary}`, paddingRight: 8 }}>أبرز الخدمات</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {top6.map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f9f9f9", borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>{s.name}</span>
                {s.price != null && s.pricingType !== "free" && (
                  <span style={{ fontSize: 13, color: primary, fontWeight: 700 }}>{Number(s.price).toLocaleString("ar-SA")} ر.س</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      {org.phone && (
        <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "12px 16px", background: "#f5f5f5", borderRadius: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "#555" }}>للتواصل: <strong style={{ color: "#1a1a1a", direction: "ltr" }}>{org.phone}</strong></span>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "#aaa" }}>مدعوم بنظام</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: primary }}>نسق</span>
        <span style={{ fontSize: 11, color: "#aaa" }}>— نظام إدارة الأعمال</span>
      </div>
    </div>
  );
}

// ══ Business Card ══════════════════════════════════════════════
function BusinessCard({ org, qrUrl }: { org: OrgData; qrUrl: string }) {
  const primary = org.primaryColor || "#5b9bd5";
  return (
    <div id="print-card" style={{ width: "85mm", height: "54mm", background: "#ffffff", fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl", display: "flex", alignItems: "center", gap: "10mm", padding: "6mm", boxSizing: "border-box", border: "1px solid #f0f0f0", borderRadius: 4, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3mm", background: primary }} />
      {/* QR */}
      {qrUrl && <img src={qrUrl} alt="QR" style={{ width: "35mm", height: "35mm", borderRadius: 4, flexShrink: 0 }} />}
      {/* Info */}
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.3 }}>{org.name}</h2>
        {org.city && <p style={{ margin: "3px 0", fontSize: 10, color: "#777" }}>{org.city}</p>}
        {org.phone && <p style={{ margin: "4px 0", fontSize: 11, fontWeight: 700, color: primary, direction: "ltr" }}>{org.phone}</p>}
        <div style={{ marginTop: 6, padding: "3px 8px", background: primary, borderRadius: 20, display: "inline-block" }}>
          <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>احجز الآن</span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 8, color: "#aaa" }}>مدعوم بنسق</p>
      </div>
    </div>
  );
}

// ══ Shelf Label ════════════════════════════════════════════════
function ShelfLabel({ org, qrUrl }: { org: OrgData; qrUrl: string }) {
  const primary = org.primaryColor || "#5b9bd5";
  return (
    <div id="print-label" style={{ width: "80mm", height: "50mm", background: "#ffffff", fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl", display: "flex", alignItems: "center", gap: "8mm", padding: "5mm", boxSizing: "border-box", border: "1px solid #eee", borderRadius: 4, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2.5mm", background: primary }} />
      {/* QR */}
      {qrUrl && <img src={qrUrl} alt="QR" style={{ width: "28mm", height: "28mm", borderRadius: 4, flexShrink: 0 }} />}
      {/* Text */}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.4 }}>{org.name}</p>
        <p style={{ margin: "4px 0 0", fontSize: 10, color: primary, fontWeight: 700 }}>امسح للحجز</p>
        <p style={{ margin: "8px 0 0", fontSize: 8, color: "#aaa" }}>مدعوم بنسق</p>
      </div>
    </div>
  );
}

// ══ Main Page ═════════════════════════════════════════════════
export function PublicPrintPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const slug = orgSlug || "";

  const primary = data?.org.primaryColor || "#5b9bd5";
  const qrLarge  = useQR(slug, 480, primary);
  const qrMedium = useQR(slug, 280, primary);
  const qrSmall  = useQR(slug, 224, primary);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    websiteApi.publicSite(slug)
      .then((res: any) => { if (res?.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    setExporting(true);
    try { await exportToPDF(slug); } finally { setExporting(false); }
  };

  const handleExportPNG = async (elementId: string, name: string) => {
    setExporting(true);
    try { await exportToPNG(elementId, `nasaq-${slug}-${name}.png`); } finally { setExporting(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #5b9bd5", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (!data) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12, fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl" }}>
      <p style={{ fontSize: 16, color: "#666" }}>المنشأة غير موجودة</p>
      <Link to="/" style={{ color: "#5b9bd5", fontSize: 14 }}>العودة للرئيسية</Link>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        body { margin: 0; background: #f5f5f5; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-page { page-break-after: always; break-after: page; }
        }
      `}</style>

      {/* Action bar — hidden on print */}
      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 100, background: "#1a1a2e", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{data.org.name}</span>
          <span style={{ color: "#aaa", fontSize: 13 }}>— المطبوعات</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => handleExportPNG("print-a4", "a4")} disabled={exporting} style={{ padding: "8px 14px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            A4 PNG
          </button>
          <button onClick={() => handleExportPNG("print-card", "card")} disabled={exporting} style={{ padding: "8px 14px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            بطاقة PNG
          </button>
          <button onClick={() => handleExportPNG("print-label", "label")} disabled={exporting} style={{ padding: "8px 14px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            ملصق PNG
          </button>
          <button onClick={handleExportPDF} disabled={exporting} style={{ padding: "8px 16px", background: primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
            {exporting ? "جاري التصدير..." : "تحميل PDF"}
          </button>
          <button onClick={handlePrint} style={{ padding: "8px 16px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
            طباعة
          </button>
        </div>
      </div>

      {/* Print Preview Container */}
      <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 48, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>

        {/* A4 Card */}
        <div className="print-page no-print-border" style={{ textAlign: "center" }}>
          <p className="no-print" style={{ fontSize: 13, color: "#888", marginBottom: 12, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>A4 Card — 210×297mm</p>
          <div style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)", display: "inline-block" }}>
            <A4Card org={data.org} services={data.services} qrUrl={qrLarge} />
          </div>
        </div>

        {/* Business Card */}
        <div className="print-page" style={{ textAlign: "center" }}>
          <p className="no-print" style={{ fontSize: 13, color: "#888", marginBottom: 12, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>بطاقة العمل — 85×54mm</p>
          <div style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)", display: "inline-block" }}>
            <BusinessCard org={data.org} qrUrl={qrMedium} />
          </div>
        </div>

        {/* Shelf Label */}
        <div className="print-page" style={{ textAlign: "center" }}>
          <p className="no-print" style={{ fontSize: 13, color: "#888", marginBottom: 12, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>ملصق الرف — 80×50mm</p>
          <div style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)", display: "inline-block" }}>
            <ShelfLabel org={data.org} qrUrl={qrSmall} />
          </div>
        </div>

        {/* Back link */}
        <Link className="no-print" to={`/s/${slug}`} style={{ color: "#5b9bd5", fontSize: 14, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
          العودة لصفحة المنشأة
        </Link>
      </div>
    </>
  );
}
