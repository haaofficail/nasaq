import { useState, useEffect } from "react";
import {
  Globe, Palette, Layout, Eye, Settings, Check, ChevronUp, ChevronDown,
  Loader2, CheckCircle, ExternalLink, Monitor, Smartphone, Zap,
  Layers, Users, Image, Star, MapPin, Phone, Info, ShoppingBag,
  BookOpen, Rss, AlertCircle, Save,
} from "lucide-react";
import { websiteApi, settingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { ModernInput, ModernSelect } from "@/components/ui";
import { COLORS, SHADOWS, TYPOGRAPHY } from "@/lib/design-tokens";

const FONT = TYPOGRAPHY.family;

// ── Templates ────────────────────────────────────────────────
const TEMPLATES = [
  { id: "classic",   name: "كلاسيكي",  desc: "تصميم نظيف واحترافي",              cat: "all",       grad: "linear-gradient(135deg,#5b9bd5 0%,#4a8bc5 100%)" },
  { id: "modern",    name: "عصري",     desc: "خطوط جريئة وزوايا حادة",            cat: "all",       grad: "linear-gradient(135deg,#1a1a2e 0%,#2d3561 100%)" },
  { id: "luxury",    name: "فاخر",     desc: "للصالونات والسبا الراقية",           cat: "salon",     grad: "linear-gradient(135deg,#9c304b 0%,#c8a951 100%)" },
  { id: "minimal",   name: "بسيط",     desc: "للمستقلين والمنشآت الصغيرة",         cat: "all",       grad: "linear-gradient(135deg,#94a3b8 0%,#cbd5e1 100%)" },
  { id: "cafe",      name: "كافيه",    desc: "للمطاعم والكافيهات",                 cat: "restaurant",grad: "linear-gradient(135deg,#d97706 0%,#92400e 100%)" },
  { id: "boutique",  name: "بوتيك",    desc: "لمحلات الورود والهدايا",             cat: "flowers",   grad: "linear-gradient(135deg,#be185d 0%,#9d174d 100%)" },
  { id: "bold",      name: "جريء",     desc: "للصالونات الرجالية",                 cat: "salon",     grad: "linear-gradient(135deg,#111827 0%,#374151 100%)" },
  { id: "corporate", name: "مؤسسي",    desc: "للشركات وتأجير المعدات",             cat: "rental",    grad: "linear-gradient(135deg,#1e3a5f 0%,#1e40af 100%)" },
  { id: "festive",   name: "احتفالي",  desc: "للفعاليات والمناسبات",               cat: "events",    grad: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)" },
  { id: "starter",   name: "بداية",    desc: "صفحة واحدة — ابدأ بسرعة",           cat: "all",       grad: "linear-gradient(135deg,#059669 0%,#047857 100%)" },
];

const TEMPLATE_CATS = [
  { id: "all", label: "الكل" },
  { id: "salon", label: "صالون" },
  { id: "restaurant", label: "مطعم" },
  { id: "rental", label: "تأجير" },
  { id: "flowers", label: "ورود" },
  { id: "events", label: "فعاليات" },
];

// ── Sections ────────────────────────────────────────────────
const ALL_SECTIONS = [
  { id: "hero",     name: "البانر الرئيسي", icon: Layers,     canHide: false, src: "العنوان + رسالة ترحيب + زر حجز" },
  { id: "services", name: "الخدمات",        icon: Layers,     canHide: true,  src: "يُسحب تلقائي من الخدمات المضافة" },
  { id: "team",     name: "الفريق",          icon: Users,      canHide: true,  src: "مقدمو الخدمة — يتحدث تلقائي" },
  { id: "gallery",  name: "معرض الأعمال",   icon: Image,      canHide: true,  src: "من مكتبة الوسائط" },
  { id: "reviews",  name: "التقييمات",       icon: Star,       canHide: true,  src: "تقييمات 4 نجوم وأعلى — تلقائي" },
  { id: "about",    name: "عن المنشأة",      icon: Info,       canHide: true,  src: "نص تكتبه أنت أدناه" },
  { id: "products", name: "المنتجات",        icon: ShoppingBag,canHide: true,  src: "المنتجات المفعّلة أونلاين" },
  { id: "location", name: "الموقع",          icon: MapPin,     canHide: true,  src: "من بيانات المنشأة — تلقائي" },
  { id: "contact",  name: "تواصل معنا",      icon: Phone,      canHide: true,  src: "الجوال والبريد من إعدادات المنشأة" },
];

const DEFAULT_ORDER = ["hero","services","team","gallery","reviews","about","location","contact"];

// ── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { label: "القالب",    icon: Layout },
  { label: "التخصيص",  icon: Palette },
  { label: "الأقسام",  icon: Layers },
  { label: "المعاينة", icon: Eye },
  { label: "متقدمة",   icon: Settings },
];

// ── Default builder config ───────────────────────────────────
const defaultBuilder = () => ({
  heroTitle: "",
  heroSubtitle: "",
  heroImage: "",
  aboutText: "",
  sectionsOrder: DEFAULT_ORDER,
  hiddenSections: [] as string[],
  showBookingButton: true,
  showWhatsappButton: true,
  whatsappMessage: "مرحبا، أبي أحجز موعد",
  showPrices: true,
  showTeamPhotos: true,
  isPublished: false,
  publishedAt: null as string | null,
  subdomain: "",
  customColors: {} as Record<string, string>,
  heroLayout: "image-bg",
  cardStyle: "bordered",
});

// ══════════════════════════════════════════════════════════════
export function WebsitePage() {
  const [tab, setTab] = useState(0);
  const [templateCat, setTemplateCat] = useState("all");
  const [previewSize, setPreviewSize] = useState<"mobile" | "desktop">("desktop");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Remote data
  const { data: configRes, loading: configLoading, refetch: refetchConfig } = useApi(() => websiteApi.config(), []);
  const { data: profileRes } = useApi(() => settingsApi.profile(), []);

  const remoteConfig = configRes?.data || {};
  const orgSlug: string = profileRes?.data?.slug || profileRes?.data?.id || "";
  const previewUrl = orgSlug ? `/s/${orgSlug}` : "";

  // Local editable state (merged from server)
  const [templateId, setTemplateId] = useState("classic");
  const [primaryColor, setPrimaryColor] = useState("#5b9bd5");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [fontFamily, setFontFamily] = useState("IBM Plex Sans Arabic");
  const [builder, setBuilder] = useState(defaultBuilder());
  const [seo, setSeo] = useState({ title: "", description: "", gaId: "", gtmId: "", pixelId: "", domain: "" });

  // Sync server → local on first load
  useEffect(() => {
    if (!configRes) return;
    const cfg = configRes.data || {};
    setTemplateId(cfg.templateId || "classic");
    setPrimaryColor(cfg.primaryColor || "#5b9bd5");
    setSecondaryColor(cfg.secondaryColor || "");
    setFontFamily(cfg.fontFamily || "IBM Plex Sans Arabic");
    setSeo({
      title:       cfg.defaultMetaTitle || "",
      description: cfg.defaultMetaDescription || "",
      gaId:        cfg.googleAnalyticsId || "",
      gtmId:       cfg.gtmContainerId || "",
      pixelId:     cfg.facebookPixelId || "",
      domain:      cfg.customDomain || "",
    });
    const bc = cfg.builderConfig || {};
    setBuilder({
      heroTitle:          bc.heroTitle || "",
      heroSubtitle:       bc.heroSubtitle || "",
      heroImage:          bc.heroImage || "",
      aboutText:          bc.aboutText || "",
      sectionsOrder:      bc.sectionsOrder || DEFAULT_ORDER,
      hiddenSections:     bc.hiddenSections || [],
      showBookingButton:  bc.showBookingButton !== false,
      showWhatsappButton: bc.showWhatsappButton !== false,
      whatsappMessage:    bc.whatsappMessage || "مرحبا، أبي أحجز موعد",
      showPrices:         bc.showPrices !== false,
      showTeamPhotos:     bc.showTeamPhotos !== false,
      isPublished:        bc.isPublished || cfg.isPublished || false,
      publishedAt:        bc.publishedAt || null,
      subdomain:          bc.subdomain || "",
      customColors:       bc.customColors || {},
      heroLayout:         bc.heroLayout || "image-bg",
      cardStyle:          bc.cardStyle || "bordered",
    });
  }, [configRes]);

  const setB = (key: string, val: any) => setBuilder(b => ({ ...b, [key]: val }));

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await websiteApi.updateConfig({
        templateId,
        primaryColor,
        secondaryColor: secondaryColor || null,
        fontFamily,
        defaultMetaTitle: seo.title || null,
        defaultMetaDescription: seo.description || null,
        googleAnalyticsId: seo.gaId || null,
        gtmContainerId: seo.gtmId || null,
        facebookPixelId: seo.pixelId || null,
        customDomain: seo.domain || null,
        builderConfig: builder,
      });
      setSavedMsg(true);
      refetchConfig();
      setTimeout(() => setSavedMsg(false), 2500);
    } catch {/* ignore */}
    setSaving(false);
  };

  // ── Publish ────────────────────────────────────────────────
  const handlePublish = async () => {
    setPublishing(true);
    try {
      await websiteApi.publish();
      setB("isPublished", true);
      setB("publishedAt", new Date().toISOString());
      refetchConfig();
    } catch {/* ignore */}
    setPublishing(false);
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      await websiteApi.unpublish();
      setB("isPublished", false);
      refetchConfig();
    } catch {/* ignore */}
    setPublishing(false);
  };

  // ── Section reorder ────────────────────────────────────────
  const moveSection = (id: string, dir: -1 | 1) => {
    const order = [...builder.sectionsOrder];
    const idx = order.indexOf(id);
    if (idx < 0) return;
    const to = idx + dir;
    if (to < 0 || to >= order.length) return;
    [order[idx], order[to]] = [order[to], order[idx]];
    setB("sectionsOrder", order);
  };

  const toggleSection = (id: string) => {
    const hidden = builder.hiddenSections.includes(id)
      ? builder.hiddenSections.filter(s => s !== id)
      : [...builder.hiddenSections, id];
    setB("hiddenSections", hidden);
  };

  // ── Sorted sections ────────────────────────────────────────
  const orderedSections = [
    ...builder.sectionsOrder.map(id => ALL_SECTIONS.find(s => s.id === id)).filter(Boolean),
    ...ALL_SECTIONS.filter(s => !builder.sectionsOrder.includes(s.id)),
  ] as typeof ALL_SECTIONS;

  const filteredTemplates = templateCat === "all"
    ? TEMPLATES
    : TEMPLATES.filter(t => t.cat === templateCat || t.cat === "all");

  if (configLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256, fontFamily: FONT, color: COLORS.muted }}>
      <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: COLORS.primary }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, direction: "rtl", fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.dark, margin: 0 }}>موقعي</h1>
          <p style={{ fontSize: 13, color: COLORS.muted, margin: "4px 0 0" }}>
            أنشئ موقع احترافي لمنشأتك — البيانات تتحدث تلقائياً
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {savedMsg && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: COLORS.successText }}>
              <CheckCircle size={14} /> تم الحفظ
            </span>
          )}
          {builder.isPublished ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: COLORS.successBg, color: COLORS.successText }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.success }} />
              منشور
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: "#f1f5f9", color: COLORS.muted }}>
              مسودة
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.primary, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: FONT }}
          >
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
            حفظ
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 4, overflowX: "auto" }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 0", padding: "8px 14px", borderRadius: 10, border: "none", fontFamily: FONT, fontSize: 13, fontWeight: tab === i ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", background: tab === i ? COLORS.primary : "transparent", color: tab === i ? "#fff" : COLORS.muted, justifyContent: "center" }}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Template ──────────────────────────────── */}
      {tab === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Category filter */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TEMPLATE_CATS.map(c => (
              <button key={c.id} onClick={() => setTemplateCat(c.id)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${templateCat === c.id ? COLORS.primary : COLORS.border}`, background: templateCat === c.id ? `${COLORS.primary}12` : "transparent", color: templateCat === c.id ? COLORS.primary : COLORS.muted, fontSize: 13, fontWeight: templateCat === c.id ? 600 : 400, cursor: "pointer", fontFamily: FONT }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Template grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {filteredTemplates.map(t => (
              <div
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                style={{ background: COLORS.surface, borderRadius: 14, border: `2px solid ${templateId === t.id ? COLORS.primary : COLORS.border}`, overflow: "hidden", cursor: "pointer", transition: "all 0.15s", boxShadow: templateId === t.id ? `0 0 0 3px ${COLORS.primary}20` : SHADOWS.card }}
              >
                {/* Thumbnail */}
                <div style={{ height: 120, background: t.grad, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {templateId === t.id && (
                    <div style={{ position: "absolute", top: 8, left: 8, width: 22, height: 22, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={13} color={COLORS.primary} style={{ strokeWidth: 2.5 }} />
                    </div>
                  )}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.4)", borderRadius: 2, margin: "0 auto 6px" }} />
                    <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.25)", borderRadius: 2, margin: "0 auto 4px" }} />
                    <div style={{ width: 50, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto" }} />
                  </div>
                </div>
                {/* Info */}
                <div style={{ padding: "10px 12px" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark, margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 11, color: COLORS.muted, margin: "3px 0 0" }}>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 2: Customization ─────────────────────────── */}
      {tab === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
          {/* Options panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card title="الألوان">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={labelStyle}>اللون الرئيسي</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: 36, height: 36, border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: "pointer", padding: 2 }} />
                  <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={inputStyle} dir="ltr" placeholder="#5b9bd5" />
                </div>
                <label style={labelStyle}>اللون الثانوي (اختياري)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="color" value={secondaryColor || "#C8A951"} onChange={e => setSecondaryColor(e.target.value)} style={{ width: 36, height: 36, border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: "pointer", padding: 2 }} />
                  <input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={inputStyle} dir="ltr" placeholder="#C8A951 (اختياري)" />
                </div>
              </div>
            </Card>

            <Card title="الخط">
              <ModernSelect
                label="خط العناوين والنصوص"
                value={fontFamily}
                onChange={setFontFamily}
                options={[
                  { value: "IBM Plex Sans Arabic", label: "IBM Plex Sans Arabic" },
                  { value: "Tajawal",               label: "Tajawal" },
                  { value: "Cairo",                 label: "Cairo" },
                  { value: "Noto Sans Arabic",      label: "Noto Sans Arabic" },
                ]}
              />
            </Card>

            <Card title="البانر الرئيسي">
              <ModernSelect
                label="تخطيط البانر"
                value={builder.heroLayout}
                onChange={v => setB("heroLayout", v)}
                options={[
                  { value: "image-bg",  label: "صورة خلفية" },
                  { value: "split",     label: "نص + صورة جانبية" },
                  { value: "text-only", label: "نص فقط" },
                ]}
              />
            </Card>

            <Card title="شكل البطاقات">
              <ModernSelect
                value={builder.cardStyle}
                onChange={v => setB("cardStyle", v)}
                options={[
                  { value: "bordered", label: "بحدود" },
                  { value: "shadow",   label: "بظل" },
                  { value: "flat",     label: "مسطحة" },
                  { value: "glass",    label: "شفافة" },
                ]}
              />
            </Card>
          </div>

          {/* Live preview mockup */}
          <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, boxShadow: SHADOWS.card, padding: 20, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPreviewSize("desktop")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `1px solid ${previewSize === "desktop" ? COLORS.primary : COLORS.border}`, background: previewSize === "desktop" ? `${COLORS.primary}10` : "transparent", color: previewSize === "desktop" ? COLORS.primary : COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                <Monitor size={13} /> كمبيوتر
              </button>
              <button onClick={() => setPreviewSize("mobile")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `1px solid ${previewSize === "mobile" ? COLORS.primary : COLORS.border}`, background: previewSize === "mobile" ? `${COLORS.primary}10` : "transparent", color: previewSize === "mobile" ? COLORS.primary : COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                <Smartphone size={13} /> جوال
              </button>
            </div>

            <div style={{ width: previewSize === "mobile" ? 375 : "100%", maxWidth: previewSize === "mobile" ? 375 : 700, border: `1px solid ${COLORS.border}`, borderRadius: previewSize === "mobile" ? 24 : 10, overflow: "hidden", boxShadow: SHADOWS.dropdown }}>
              {/* Mock site preview */}
              <div style={{ background: primaryColor || COLORS.primary, padding: previewSize === "mobile" ? "24px 16px" : "40px 32px", textAlign: "center" }}>
                <p style={{ fontSize: previewSize === "mobile" ? 18 : 24, fontWeight: 700, color: "#fff", margin: "0 0 8px", fontFamily: fontFamily }}>
                  {builder.heroTitle || "اسم منشأتك"}
                </p>
                <p style={{ fontSize: previewSize === "mobile" ? 12 : 14, color: "rgba(255,255,255,0.85)", margin: "0 0 16px", fontFamily: fontFamily }}>
                  {builder.heroSubtitle || "عبارة ترحيبية مميزة"}
                </p>
                <div style={{ display: "inline-block", background: "#fff", color: primaryColor, padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: fontFamily }}>
                  احجز الآن
                </div>
              </div>
              <div style={{ background: "#f8f9fc", padding: previewSize === "mobile" ? "16px 12px" : "24px 20px" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.dark, margin: "0 0 12px", fontFamily: fontFamily }}>خدماتنا</p>
                <div style={{ display: "grid", gridTemplateColumns: previewSize === "mobile" ? "1fr 1fr" : "repeat(3,1fr)", gap: 8 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ background: "#fff", borderRadius: 8, border: builder.cardStyle === "bordered" ? `1px solid ${COLORS.border}` : "none", boxShadow: builder.cardStyle === "shadow" ? "0 2px 8px rgba(0,0,0,0.08)" : "none", height: 48 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Sections ──────────────────────────────── */}
      {tab === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 4px" }}>
            رتّب الأقسام وأظهر أو أخفِ ما تريد — البيانات تُسحب تلقائياً
          </p>

          {/* Hero — always shown, always on top, has editable content */}
          <SectionRow
            section={ALL_SECTIONS[0]}
            isFirst={true}
            isLast={false}
            isHidden={false}
            expanded={expandedSection === "hero"}
            onToggle={() => {}}
            onExpand={() => setExpandedSection(expandedSection === "hero" ? null : "hero")}
            onMoveUp={() => {}}
            onMoveDown={() => {}}
          >
            {expandedSection === "hero" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0 4px" }}>
                <ModernInput label="عنوان البانر" value={builder.heroTitle} onChange={v => setB("heroTitle", v)} placeholder="مرحبًا بكم في منشأتنا" />
                <ModernInput label="العبارة الفرعية" value={builder.heroSubtitle} onChange={v => setB("heroSubtitle", v)} placeholder="تجربة فريدة تنتظركم" />
              </div>
            )}
          </SectionRow>

          {/* Ordered sections (excluding hero) */}
          {orderedSections.filter(s => s.id !== "hero").map((section, idx, arr) => (
            <SectionRow
              key={section.id}
              section={section}
              isFirst={idx === 0}
              isLast={idx === arr.length - 1}
              isHidden={builder.hiddenSections.includes(section.id)}
              expanded={expandedSection === section.id}
              onToggle={() => toggleSection(section.id)}
              onExpand={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              onMoveUp={() => moveSection(section.id, -1)}
              onMoveDown={() => moveSection(section.id, 1)}
            >
              {expandedSection === "about" && section.id === "about" && (
                <div style={{ padding: "12px 0 4px" }}>
                  <label style={labelStyle}>نبذة عن المنشأة</label>
                  <textarea
                    value={builder.aboutText}
                    onChange={e => setB("aboutText", e.target.value)}
                    rows={4}
                    placeholder="اكتب نبذة مختصرة عن منشأتك وتاريخها وما يميزها..."
                    style={{ width: "100%", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: FONT, resize: "vertical", outline: "none", boxSizing: "border-box", marginTop: 6 }}
                  />
                </div>
              )}
            </SectionRow>
          ))}
        </div>
      )}

      {/* ── Tab 4: Preview + Publish ─────────────────────── */}
      {tab === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Status bar */}
          <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, boxShadow: SHADOWS.card, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark, margin: 0 }}>
                رابط موقعك:
                <span style={{ color: COLORS.primary, fontFamily: "monospace", marginRight: 8 }}>
                  {orgSlug ? `nasaq.sa/${orgSlug}` : "—"}
                </span>
              </p>
              <p style={{ fontSize: 12, color: COLORS.muted, margin: "3px 0 0" }}>
                {builder.isPublished
                  ? `منشور منذ ${builder.publishedAt ? new Date(builder.publishedAt).toLocaleDateString("ar-SA") : "—"}`
                  : "مسودة — لم يُنشر بعد"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 10, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.dark, fontSize: 13, fontWeight: 500, cursor: "pointer", textDecoration: "none", fontFamily: FONT }}>
                  <ExternalLink size={13} /> معاينة في تاب جديد
                </a>
              )}
              {builder.isPublished ? (
                <button onClick={handleUnpublish} disabled={publishing} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 18px", borderRadius: 10, border: "none", background: "#fef2f2", color: COLORS.dangerText, fontSize: 13, fontWeight: 600, cursor: publishing ? "not-allowed" : "pointer", opacity: publishing ? 0.7 : 1, fontFamily: FONT }}>
                  {publishing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <AlertCircle size={13} />}
                  إيقاف النشر
                </button>
              ) : (
                <button onClick={handlePublish} disabled={publishing} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 18px", borderRadius: 10, border: "none", background: COLORS.primary, color: "#fff", fontSize: 13, fontWeight: 600, cursor: publishing ? "not-allowed" : "pointer", opacity: publishing ? 0.7 : 1, fontFamily: FONT }}>
                  {publishing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={13} />}
                  نشر الموقع
                </button>
              )}
            </div>
          </div>

          {/* Preview size toggle */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {(["desktop", "mobile"] as const).map(size => (
              <button key={size} onClick={() => setPreviewSize(size)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, border: `1px solid ${previewSize === size ? COLORS.primary : COLORS.border}`, background: previewSize === size ? `${COLORS.primary}10` : "transparent", color: previewSize === size ? COLORS.primary : COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                {size === "desktop" ? <Monitor size={13} /> : <Smartphone size={13} />}
                {size === "desktop" ? "كمبيوتر" : "جوال"}
              </button>
            ))}
          </div>

          {/* iframe */}
          <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, boxShadow: SHADOWS.card, overflow: "hidden", display: "flex", justifyContent: "center", padding: "16px", minHeight: 600 }}>
            {previewUrl ? (
              <iframe
                src={previewUrl}
                style={{ width: previewSize === "mobile" ? 390 : "100%", height: 580, border: "none", borderRadius: previewSize === "mobile" ? 16 : 8, boxShadow: SHADOWS.dropdown }}
                title="معاينة الموقع"
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, color: COLORS.muted, gap: 12 }}>
                <Globe size={40} color="#e2e8f0" />
                <p style={{ fontSize: 14 }}>تعذّر تحميل المعاينة</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 5: Advanced ──────────────────────────────── */}
      {tab === 4 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* SEO */}
          <Card title="تحسين محركات البحث (SEO)">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ModernInput label="عنوان الصفحة" value={seo.title} onChange={v => setSeo(s => ({ ...s, title: v }))} placeholder="اسم المنشأة — وصف قصير" />
              <div>
                <label style={labelStyle}>وصف الصفحة</label>
                <textarea value={seo.description} onChange={e => setSeo(s => ({ ...s, description: e.target.value }))} rows={3} placeholder="وصف مختصر يظهر في نتائج البحث..." style={{ width: "100%", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: FONT, resize: "none", outline: "none", boxSizing: "border-box", marginTop: 6 }} />
              </div>
            </div>
          </Card>

          {/* Analytics */}
          <Card title="التحليلات والتتبع">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ModernInput label="Google Analytics" value={seo.gaId} onChange={v => setSeo(s => ({ ...s, gaId: v }))} placeholder="G-XXXXXXXXXX" dir="ltr" />
              <ModernInput label="Google Tag Manager" value={seo.gtmId} onChange={v => setSeo(s => ({ ...s, gtmId: v }))} placeholder="GTM-XXXXXXX" dir="ltr" />
              <ModernInput label="Facebook Pixel" value={seo.pixelId} onChange={v => setSeo(s => ({ ...s, pixelId: v }))} placeholder="XXXXXXXXXXXXXXXX" dir="ltr" />
            </div>
          </Card>

          {/* Domain */}
          <Card title="الدومين">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: COLORS.light, borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 2px" }}>نطاق نسق المجاني</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary, margin: 0, fontFamily: "monospace" }}>
                  nasaq.sa/{orgSlug || "—"}
                </p>
              </div>
              <ModernInput label="نطاق مخصص (اختياري)" value={seo.domain} onChange={v => setSeo(s => ({ ...s, domain: v }))} placeholder="almahfal.com" dir="ltr" />
            </div>
          </Card>

          {/* General settings */}
          <Card title="خيارات عامة">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { key: "showBookingButton",  label: "إظهار زر الحجز العائم" },
                { key: "showWhatsappButton", label: "إظهار زر واتساب" },
                { key: "showPrices",         label: "إظهار الأسعار في الموقع" },
                { key: "showTeamPhotos",     label: "إظهار صور الفريق" },
              ].map(opt => (
                <div key={opt.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: COLORS.dark }}>{opt.label}</span>
                  <ToggleSwitch
                    checked={!!(builder as any)[opt.key]}
                    onChange={v => setB(opt.key, v)}
                  />
                </div>
              ))}
              {builder.showWhatsappButton && (
                <ModernInput label="رسالة واتساب الافتراضية" value={builder.whatsappMessage} onChange={v => setB("whatsappMessage", v)} placeholder="مرحبا، أبي أحجز موعد" />
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, boxShadow: SHADOWS.card, padding: 18 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.dark, margin: "0 0 14px" }}>{title}</p>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{ width: 36, height: 20, borderRadius: 10, position: "relative", border: "none", cursor: "pointer", background: checked ? COLORS.primary : "#e2e8f0", transition: "background 0.15s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, width: 16, height: 16, background: "#fff", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.15)", transition: "right 0.15s, left 0.15s", ...(checked ? { right: 2 } : { left: 2 }) }} />
    </button>
  );
}

function SectionRow({ section, isFirst, isLast, isHidden, expanded, onToggle, onExpand, onMoveUp, onMoveDown, children }: {
  section: { id: string; name: string; icon: any; canHide: boolean; src: string };
  isFirst: boolean; isLast: boolean; isHidden: boolean; expanded: boolean;
  onToggle: () => void; onExpand: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  children?: React.ReactNode;
}) {
  const Icon = section.icon;
  return (
    <div style={{ background: COLORS.surface, borderRadius: 12, border: `1px solid ${isHidden ? COLORS.border : COLORS.border}`, boxShadow: SHADOWS.card, opacity: isHidden ? 0.55 : 1, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
        {/* Icon */}
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${COLORS.primary}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={15} color={COLORS.primary} />
        </div>
        {/* Name + source */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.dark, margin: 0 }}>{section.name}</p>
          <p style={{ fontSize: 11, color: COLORS.muted, margin: "2px 0 0" }}>{section.src}</p>
        </div>
        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {section.canHide && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: isHidden ? "#f1f5f9" : COLORS.successBg, color: isHidden ? COLORS.muted : COLORS.successText, fontFamily: TYPOGRAPHY.family }}>
              {isHidden ? "مخفي" : "مفعّل"}
            </span>
          )}
          {!section.canHide && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: COLORS.muted, fontFamily: TYPOGRAPHY.family }}>دائم</span>
          )}
          {section.canHide && (
            <ToggleSwitch checked={!isHidden} onChange={v => onToggle()} />
          )}
          <button onClick={onMoveUp} disabled={isFirst} style={{ padding: 4, border: "none", background: "none", cursor: isFirst ? "not-allowed" : "pointer", color: isFirst ? "#d1d5db" : COLORS.muted, borderRadius: 6 }}>
            <ChevronUp size={15} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} style={{ padding: 4, border: "none", background: "none", cursor: isLast ? "not-allowed" : "pointer", color: isLast ? "#d1d5db" : COLORS.muted, borderRadius: 6 }}>
            <ChevronDown size={15} />
          </button>
          {(section.id === "hero" || section.id === "about") && (
            <button onClick={onExpand} style={{ padding: "4px 8px", borderRadius: 7, border: `1px solid ${expanded ? COLORS.primary : COLORS.border}`, background: expanded ? `${COLORS.primary}10` : "transparent", cursor: "pointer", fontSize: 11, color: expanded ? COLORS.primary : COLORS.muted, fontFamily: TYPOGRAPHY.family }}>
              تعديل
            </button>
          )}
        </div>
      </div>
      {children && <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: COLORS.dark,
  fontFamily: TYPOGRAPHY.family, display: "block",
};

const inputStyle: React.CSSProperties = {
  flex: 1, border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "8px 12px",
  fontSize: 13, fontFamily: TYPOGRAPHY.family, outline: "none", color: COLORS.dark,
};
