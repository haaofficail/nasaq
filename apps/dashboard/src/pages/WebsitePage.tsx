import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { useSearchParams } from "react-router-dom";
import {
  Globe, Palette, Layout, Eye, Settings, Check, ChevronUp, ChevronDown,
  Loader2, CheckCircle, ExternalLink, Monitor, Smartphone, Zap,
  Layers, Users, Image, Star, MapPin, Phone, Info, ShoppingBag,
  BookOpen, Rss, AlertCircle, Save,
} from "lucide-react";
import { websiteApi, settingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { ModernInput, ModernSelect, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

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
  { id: "template",  label: "القالب",    icon: Layout },
  { id: "customize", label: "التخصيص",  icon: Palette },
  { id: "sections",  label: "الأقسام",  icon: Layers },
  { id: "preview",   label: "المعاينة", icon: Eye },
  { id: "advanced",  label: "متقدمة",   icon: Settings },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabId = searchParams.get("tab") || "template";
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
    <div className="flex items-center justify-center h-64 text-gray-400">
      <Loader2 size={24} className="animate-spin text-brand-400" />
    </div>
  );

  return (
    <div className="flex flex-col gap-5" dir="rtl">
      <PageHeader
        title="موقعي"
        description="أنشئ موقع احترافي لمنشأتك — البيانات تتحدث تلقائياً"
        tabs={TABS}
        activeTab={tabId}
        onTabChange={(id) => setSearchParams({ tab: id })}
        actions={
          <div className="flex items-center gap-3">
            {savedMsg && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle size={14} /> تم الحفظ
              </span>
            )}
            {builder.isPublished ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                منشور
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                مسودة
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className={clsx("flex items-center gap-1.5 bg-brand-400 text-white border-0 rounded-xl px-[18px] py-[9px] text-[13px] font-semibold transition-opacity", saving ? "cursor-not-allowed opacity-70" : "cursor-pointer")}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              حفظ
            </button>
          </div>
        }
      />

      {/* ── Tab 1: Template ──────────────────────────────── */}
      {tabId === "template" && (
        <div className="flex flex-col gap-4">
          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap">
            {TEMPLATE_CATS.map(c => (
              <button key={c.id} onClick={() => setTemplateCat(c.id)} className={clsx("px-3.5 py-1.5 rounded-full border text-[13px] cursor-pointer transition-colors", templateCat === c.id ? "border-brand-400 bg-brand-50 text-brand-600 font-semibold" : "border-gray-200 bg-transparent text-gray-400 font-normal hover:border-gray-300")}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
            {filteredTemplates.map(t => (
              <div
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={clsx("bg-white rounded-2xl border-2 overflow-hidden cursor-pointer transition-all", templateId === t.id ? "border-brand-400 ring-[3px] ring-brand-400/20 shadow-sm" : "border-gray-100 shadow-sm hover:border-gray-200")}
              >
                {/* Thumbnail — grad is data-driven, keep inline style */}
                <div className="h-[120px] relative flex items-center justify-center" style={{ background: t.grad }}>
                  {templateId === t.id && (
                    <div className="absolute top-2 left-2 w-[22px] h-[22px] rounded-full bg-white flex items-center justify-center">
                      <Check size={13} className="text-brand-400 stroke-[2.5]" />
                    </div>
                  )}
                  <div className="text-center">
                    <div className="w-10 h-1 bg-white/40 rounded mx-auto mb-1.5" />
                    <div className="w-[60px] h-1 bg-white/25 rounded mx-auto mb-1" />
                    <div className="w-[50px] h-1 bg-white/20 rounded mx-auto" />
                  </div>
                </div>
                {/* Info */}
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-bold text-gray-900">{t.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 2: Customization ─────────────────────────── */}
      {tabId === "customize" && (
        <div className="grid grid-cols-[280px_1fr] gap-4">
          {/* Options panel */}
          <div className="flex flex-col gap-4">
            <Card title="الألوان">
              <div className="flex flex-col gap-3">
                <label className="block text-xs font-medium text-gray-900">اللون الرئيسي</label>
                <div className="flex items-center gap-2.5">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-9 h-9 border border-gray-200 rounded-lg cursor-pointer p-0.5" />
                  <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none text-gray-900" dir="ltr" placeholder="#5b9bd5" />
                </div>
                <label className="block text-xs font-medium text-gray-900">اللون الثانوي (اختياري)</label>
                <div className="flex items-center gap-2.5">
                  <input type="color" value={secondaryColor || "#C8A951"} onChange={e => setSecondaryColor(e.target.value)} className="w-9 h-9 border border-gray-200 rounded-lg cursor-pointer p-0.5" />
                  <input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none text-gray-900" dir="ltr" placeholder="#C8A951 (اختياري)" />
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3.5 items-center">
            <div className="flex gap-2">
              <button onClick={() => setPreviewSize("desktop")} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors", previewSize === "desktop" ? "border-brand-400 bg-brand-50 text-brand-600" : "border-gray-200 bg-transparent text-gray-400")}>
                <Monitor size={13} /> كمبيوتر
              </button>
              <button onClick={() => setPreviewSize("mobile")} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors", previewSize === "mobile" ? "border-brand-400 bg-brand-50 text-brand-600" : "border-gray-200 bg-transparent text-gray-400")}>
                <Smartphone size={13} /> جوال
              </button>
            </div>

            <div className={clsx("border border-gray-200 overflow-hidden shadow-lg", previewSize === "mobile" ? "w-[375px] max-w-[375px] rounded-[24px]" : "w-full max-w-[700px] rounded-xl")}>
              {/* Mock site preview — primaryColor and fontFamily are user-set values, keep inline */}
              <div className="text-center" style={{ background: primaryColor || "#5b9bd5", padding: previewSize === "mobile" ? "24px 16px" : "40px 32px" }}>
                <p className="text-white font-bold mb-2" style={{ fontSize: previewSize === "mobile" ? 18 : 24, fontFamily }}>
                  {builder.heroTitle || "اسم منشأتك"}
                </p>
                <p className="text-white/85 mb-4" style={{ fontSize: previewSize === "mobile" ? 12 : 14, fontFamily }}>
                  {builder.heroSubtitle || "عبارة ترحيبية مميزة"}
                </p>
                <div className="inline-block bg-white px-5 py-2 rounded-lg text-[13px] font-semibold" style={{ color: primaryColor, fontFamily }}>
                  احجز الآن
                </div>
              </div>
              <div className="bg-[#f8f9fc]" style={{ padding: previewSize === "mobile" ? "16px 12px" : "24px 20px" }}>
                <p className="text-[14px] font-semibold text-gray-900 mb-3" style={{ fontFamily }}>خدماتنا</p>
                <div className={clsx("grid gap-2", previewSize === "mobile" ? "grid-cols-2" : "grid-cols-3")}>
                  {[1,2,3].map(i => (
                    <div key={i} className={clsx("bg-white rounded-lg h-12", builder.cardStyle === "bordered" && "border border-gray-200", builder.cardStyle === "shadow" && "shadow-[0_2px_8px_rgba(0,0,0,0.08)]")} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Sections ──────────────────────────────── */}
      {tabId === "sections" && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-gray-400 mb-1">
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
              <div className="flex flex-col gap-2.5 py-3">
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
                <div className="py-3">
                  <label className="block text-xs font-medium text-gray-900">نبذة عن المنشأة</label>
                  <textarea
                    value={builder.aboutText}
                    onChange={e => setB("aboutText", e.target.value)}
                    rows={4}
                    placeholder="اكتب نبذة مختصرة عن منشأتك وتاريخها وما يميزها..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] resize-y outline-none mt-1.5 box-border"
                  />
                </div>
              )}
            </SectionRow>
          ))}
        </div>
      )}

      {/* ── Tab 4: Preview + Publish ─────────────────────── */}
      {tabId === "preview" && (
        <div className="flex flex-col gap-4">
          {/* Status bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[13px] font-semibold text-gray-900">
                رابط موقعك:
                <span className="text-brand-400 font-mono mr-2">
                  {orgSlug ? `nasaq.sa/${orgSlug}` : "—"}
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {builder.isPublished
                  ? `منشور منذ ${builder.publishedAt ? fmtDate(builder.publishedAt) : "—"}`
                  : "مسودة — لم يُنشر بعد"}
              </p>
            </div>
            <div className="flex gap-2">
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-gray-900 text-[13px] font-medium cursor-pointer no-underline hover:bg-gray-50 transition-colors">
                  <ExternalLink size={13} /> معاينة في تاب جديد
                </a>
              )}
              {builder.isPublished ? (
                <button onClick={handleUnpublish} disabled={publishing} className={clsx("flex items-center gap-1.5 px-4 py-2 rounded-xl border-0 bg-red-50 text-red-600 text-[13px] font-semibold transition-opacity", publishing ? "cursor-not-allowed opacity-70" : "cursor-pointer")}>
                  {publishing ? <Loader2 size={13} className="animate-spin" /> : <AlertCircle size={13} />}
                  إيقاف النشر
                </button>
              ) : (
                <button onClick={handlePublish} disabled={publishing} className={clsx("flex items-center gap-1.5 px-4 py-2 rounded-xl border-0 bg-brand-400 text-white text-[13px] font-semibold transition-opacity", publishing ? "cursor-not-allowed opacity-70" : "cursor-pointer")}>
                  {publishing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  نشر الموقع
                </button>
              )}
            </div>
          </div>

          {/* Preview size toggle */}
          <div className="flex gap-2 justify-center">
            {(["desktop", "mobile"] as const).map(size => (
              <button key={size} onClick={() => setPreviewSize(size)} className={clsx("flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors", previewSize === size ? "border-brand-400 bg-brand-50 text-brand-600" : "border-gray-200 bg-transparent text-gray-400")}>
                {size === "desktop" ? <Monitor size={13} /> : <Smartphone size={13} />}
                {size === "desktop" ? "كمبيوتر" : "جوال"}
              </button>
            ))}
          </div>

          {/* iframe */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex justify-center p-4 min-h-[600px]">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                style={{ width: previewSize === "mobile" ? 390 : "100%", height: 580, border: "none", borderRadius: previewSize === "mobile" ? 16 : 8 }}
                className="shadow-lg"
                title="معاينة الموقع"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-gray-400 gap-3">
                <Globe size={40} className="text-gray-200" />
                <p className="text-[14px]">تعذّر تحميل المعاينة</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 5: Advanced ──────────────────────────────── */}
      {tabId === "advanced" && (
        <div className="grid grid-cols-2 gap-4">
          {/* SEO */}
          <Card title="تحسين محركات البحث (SEO)">
            <div className="flex flex-col gap-3">
              <ModernInput label="عنوان الصفحة" value={seo.title} onChange={v => setSeo(s => ({ ...s, title: v }))} placeholder="اسم المنشأة — وصف قصير" />
              <div>
                <label className="block text-xs font-medium text-gray-900">وصف الصفحة</label>
                <textarea value={seo.description} onChange={e => setSeo(s => ({ ...s, description: e.target.value }))} rows={3} placeholder="وصف مختصر يظهر في نتائج البحث..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] resize-none outline-none mt-1.5 box-border" />
              </div>
            </div>
          </Card>

          {/* Analytics */}
          <Card title="التحليلات والتتبع">
            <div className="flex flex-col gap-3">
              <ModernInput label="Google Analytics" value={seo.gaId} onChange={v => setSeo(s => ({ ...s, gaId: v }))} placeholder="G-XXXXXXXXXX" dir="ltr" />
              <ModernInput label="Google Tag Manager" value={seo.gtmId} onChange={v => setSeo(s => ({ ...s, gtmId: v }))} placeholder="GTM-XXXXXXX" dir="ltr" />
              <ModernInput label="Facebook Pixel" value={seo.pixelId} onChange={v => setSeo(s => ({ ...s, pixelId: v }))} placeholder="XXXXXXXXXXXXXXXX" dir="ltr" />
            </div>
          </Card>

          {/* Domain */}
          <Card title="الدومين">
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 rounded-xl px-3.5 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">نطاق نسق المجاني</p>
                <p className="text-[13px] font-semibold text-brand-400 font-mono">
                  nasaq.sa/{orgSlug || "—"}
                </p>
              </div>
              <ModernInput label="نطاق مخصص (اختياري)" value={seo.domain} onChange={v => setSeo(s => ({ ...s, domain: v }))} placeholder="almahfal.com" dir="ltr" />
            </div>
          </Card>

          {/* General settings */}
          <Card title="خيارات عامة">
            <div className="flex flex-col gap-3">
              {[
                { key: "showBookingButton",  label: "إظهار زر الحجز العائم" },
                { key: "showWhatsappButton", label: "إظهار زر واتساب" },
                { key: "showPrices",         label: "إظهار الأسعار في الموقع" },
                { key: "showTeamPhotos",     label: "إظهار صور الفريق" },
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-900">{opt.label}</span>
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[13px] font-bold text-gray-900 mb-3.5">{title}</p>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={clsx("w-9 h-5 rounded-full relative border-0 cursor-pointer transition-colors shrink-0", checked ? "bg-brand-400" : "bg-gray-200")}>
      <span className={clsx("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all", checked ? "right-0.5" : "left-0.5")} />
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
    <div className={clsx("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden", isHidden && "opacity-55")}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
          <Icon size={15} className="text-brand-400" />
        </div>
        {/* Name + source */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900">{section.name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{section.src}</p>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {section.canHide && (
            <span className={clsx("text-[11px] px-2 py-0.5 rounded-full", isHidden ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-700")}>
              {isHidden ? "مخفي" : "مفعّل"}
            </span>
          )}
          {!section.canHide && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">دائم</span>
          )}
          {section.canHide && (
            <ToggleSwitch checked={!isHidden} onChange={() => onToggle()} />
          )}
          <button onClick={onMoveUp} disabled={isFirst} className={clsx("p-1 border-0 bg-transparent rounded-md", isFirst ? "cursor-not-allowed text-gray-200" : "cursor-pointer text-gray-400 hover:text-gray-600")}>
            <ChevronUp size={15} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className={clsx("p-1 border-0 bg-transparent rounded-md", isLast ? "cursor-not-allowed text-gray-200" : "cursor-pointer text-gray-400 hover:text-gray-600")}>
            <ChevronDown size={15} />
          </button>
          {(section.id === "hero" || section.id === "about") && (
            <button onClick={onExpand} className={clsx("px-2 py-1 rounded-lg border text-[11px] cursor-pointer transition-colors", expanded ? "border-brand-400 bg-brand-50 text-brand-600" : "border-gray-200 bg-transparent text-gray-400")}>
              تعديل
            </button>
          )}
        </div>
      </div>
      {children && <div className="border-t border-gray-100 px-4 pb-4">{children}</div>}
    </div>
  );
}
