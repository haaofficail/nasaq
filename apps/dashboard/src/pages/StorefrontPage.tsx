import { useState, useEffect } from "react";
import { toast } from "@/hooks/useToast";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Globe, Palette, FileText, Rss, Settings2, ExternalLink, Copy, Check,
  Plus, Pencil, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Save,
  Loader2, AlertCircle, Link2, Search, Code, BarChart3, Image,
  Star, Phone, Layout, Type, X, QrCode, Printer, Download,
} from "lucide-react";
import { clsx } from "clsx";
import { websiteApi, settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Input, TextArea, Toggle, Modal } from "@/components/ui";
import { MediaPickerModal } from "@/components/media/MediaPickerModal";
import { fmtDate } from "@/lib/utils";

// ── Block builder (moved from PageBuilderPage) ─────────────────

const BLOCK_TYPES = [
  { type: "hero",         label: "Hero / Banner",  icon: Layout,   desc: "صورة رئيسية + عنوان + CTA" },
  { type: "services",     label: "قائمة الخدمات",  icon: Star,     desc: "عرض الخدمات تلقائياً" },
  { type: "text",         label: "نص حر",          icon: Type,     desc: "فقرة نصية" },
  { type: "image",        label: "صورة",           icon: Image,    desc: "صورة مفردة" },
  { type: "gallery",      label: "معرض صور",       icon: Image,    desc: "شبكة صور" },
  { type: "testimonials", label: "التقييمات",      icon: Star,     desc: "آراء العملاء" },
  { type: "booking_cta",  label: "زر الحجز",       icon: Plus,     desc: "قسم دعوة للحجز" },
  { type: "contact",      label: "تواصل معنا",     icon: Phone,    desc: "نموذج التواصل" },
  { type: "html",         label: "كود HTML",       icon: Code,     desc: "كود مخصص" },
];

const BLOCK_DEFAULTS: Record<string, any> = {
  hero:         { title: "مرحباً بكم", subtitle: "نقدم أفضل الخدمات", buttonText: "احجز الآن", buttonLink: "/book", imageUrl: "", bgColor: "#5b9bd5", textColor: "#ffffff" },
  services:     { title: "خدماتنا", subtitle: "اختر من بين خدماتنا المتميزة", columns: 3 },
  text:         { title: "", content: "أضف نصك هنا...", align: "right" },
  image:        { url: "", alt: "", caption: "", fullWidth: false },
  gallery:      { images: [], columns: 3 },
  testimonials: { title: "آراء عملائنا", showRating: true },
  booking_cta:  { title: "احجز موعدك الآن", subtitle: "خطوة واحدة تفصلك عن تجربة مميزة", buttonText: "احجز الآن", bgColor: "#5b9bd5" },
  contact:      { title: "تواصل معنا", showPhone: true, showEmail: true, showMap: false },
  html:         { code: "<p>كود HTML مخصص</p>" },
};

function BlockEditor({ block, onChange, onPickImage }: {
  block: any;
  onChange: (c: any) => void;
  onPickImage?: (field: string) => void;
}) {
  const f = (key: string, val: any) => onChange({ ...block.content, [key]: val });
  const input = (key: string, label: string, type = "text") => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={block.content?.[key] ?? ""} onChange={e => f(key, e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400" />
    </div>
  );
  const imageField = (key: string, label: string) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        {block.content?.[key] && (
          <img src={block.content[key]} className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" alt="" />
        )}
        <button type="button" onClick={() => onPickImage?.(key)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
          {block.content?.[key] ? "تغيير الصورة" : "اختر صورة"}
        </button>
        {block.content?.[key] && (
          <button type="button" onClick={() => f(key, "")}
            className="px-2.5 py-2 rounded-lg border border-red-100 text-xs text-red-400 hover:bg-red-50 transition-colors">
            ×
          </button>
        )}
      </div>
    </div>
  );
  const toggle = (key: string, label: string) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50">
      <span className="text-sm text-gray-700">{label}</span>
      <button onClick={() => f(key, !block.content?.[key])}
        className={clsx("relative w-9 h-5 rounded-full transition-colors", block.content?.[key] ? "bg-brand-500" : "bg-gray-200")}>
        <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", block.content?.[key] ? "right-0.5" : "left-0.5")} />
      </button>
    </div>
  );

  switch (block.type) {
    case "hero": return <div className="space-y-3">{input("title","العنوان")}{input("subtitle","العنوان الفرعي")}{input("buttonText","نص الزر")}{imageField("imageUrl","صورة الخلفية")}{input("bgColor","لون الخلفية","color")}</div>;
    case "services": return <div className="space-y-3">{input("title","العنوان")}{input("subtitle","العنوان الفرعي")}</div>;
    case "text": return <div className="space-y-3">{input("title","العنوان (اختياري)")}<div><label className="block text-xs text-gray-500 mb-1">المحتوى</label><textarea value={block.content?.content ?? ""} onChange={e => f("content", e.target.value)} rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400" /></div></div>;
    case "image": return <div className="space-y-3">{imageField("url","الصورة")}{input("alt","وصف الصورة")}{input("caption","تعليق الصورة")}</div>;
    case "booking_cta": return <div className="space-y-3">{input("title","العنوان")}{input("subtitle","العنوان الفرعي")}{input("buttonText","نص الزر")}{input("bgColor","لون الخلفية","color")}</div>;
    case "contact": return <div className="space-y-2">{toggle("showPhone","عرض الهاتف")}{toggle("showEmail","عرض الإيميل")}{toggle("showMap","عرض الخريطة")}</div>;
    case "html": return <div><label className="block text-xs text-gray-500 mb-1">كود HTML</label><textarea value={block.content?.code ?? ""} onChange={e => f("code", e.target.value)} rows={5} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-brand-400" /></div>;
    default: return <p className="text-sm text-gray-400 py-2">لا توجد إعدادات لهذا القسم</p>;
  }
}

// ── Templates ─────────────────────────────────────────────────

const TEMPLATES = [
  { id: "default", name: "عصري", desc: "أبيض وأزرق، شبكة منظمة", preview: "bg-gradient-to-br from-blue-500 to-indigo-600" },
  { id: "warm",    name: "دافئ",  desc: "ذهبي وكريمي، أناقة هادئة", preview: "bg-gradient-to-br from-amber-400 to-orange-500" },
  { id: "dark",    name: "فاخر", desc: "خلفية داكنة، مظهر احترافي",  preview: "bg-gradient-to-br from-gray-800 to-gray-950" },
];

const FONTS = ["IBM Plex Sans Arabic", "Tajawal", "Cairo", "Almarai", "Noto Sans Arabic"];

type Tab = "overview" | "pages" | "design" | "blog" | "settings" | "qr";

export function StorefrontPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "overview";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [copied, setCopied]       = useState(false);
  const [logoPicker, setLogoPicker]   = useState(false);
  const [imagePicker, setImagePicker] = useState<{ blockId: string; field: string } | null>(null);
  // Data
  const { data: pagesRes, refetch: refetchPages } = useApi(() => websiteApi.pages(), []);
  const { data: configRes, refetch: refetchConfig } = useApi(() => websiteApi.config(), []);
  const { data: blogRes, refetch: refetchBlog } = useApi(() => websiteApi.blog(), []);
  const { data: profileRes } = useApi(() => settingsApi.profile(), []);
  const { data: storefrontRes, refetch: refetchStorefront } = useApi(() => websiteApi.storefrontSettings(), []);

  const pages: any[] = pagesRes?.data ?? [];
  const config: any = configRes?.data ?? {};
  const posts: any[] = blogRes?.data ?? [];
  const profile: any = profileRes?.data ?? {};
  const storefrontData: any = storefrontRes?.data ?? null;

  const siteUrl = profile?.slug ? `${window.location.origin}/s/${profile.slug}` : null;
  const printUrl = profile?.slug ? `/s/${profile.slug}/print` : null;

  // QR state
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrCopied, setQrCopied] = useState(false);
  const [sfSlugEdit, setSfSlugEdit] = useState("");
  const [sfSlugEditing, setSfSlugEditing] = useState(false);
  const [sfSaving, setSfSaving] = useState(false);

  useEffect(() => {
    const slug = storefrontData?.slug || profile?.slug;
    if (!slug) return;
    import("qrcode").then(QRCode => {
      QRCode.default.toDataURL(`https://nasaqpro.tech/s/${slug}`, {
        width: 400, margin: 1,
        color: { dark: storefrontData?.primaryColor || "#5b9bd5", light: "#ffffff" },
        errorCorrectionLevel: "H",
      }).then(setQrDataUrl);
    });
  }, [storefrontData?.slug, profile?.slug, storefrontData?.primaryColor]);

  // ── Design state ────────────────────────────────────────────
  const [designForm, setDesignForm] = useState<any>(null);
  const [designSaving, setDesignSaving] = useState(false);
  const d = (k: string, v: any) => setDesignForm((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (config && !designForm) {
      // الأولوية: site_config → org color → الافتراضي
      const resolvedPrimary = config.primaryColor || storefrontData?.primaryColor || "#5b9bd5";
      setDesignForm({
        templateId: config.templateId || "default",
        primaryColor: resolvedPrimary,
        secondaryColor: config.secondaryColor || "#C8A951",
        fontFamily: config.fontFamily || "IBM Plex Sans Arabic",
        logoUrl: config.logoUrl || "",
        headerConfig: config.headerConfig || { showLogo: true, showPhone: true, showBookButton: true },
        footerConfig: config.footerConfig || { showSocial: true, showContact: true, copyright: "" },
      });
    }
  }, [config]);

  const saveDesign = async () => {
    setDesignSaving(true);
    try {
      await websiteApi.updateConfig(designForm);
      // الثيم يُطبَّق فقط على موقع التاجر العام — لا على الداشبورد
      refetchConfig();
      toast.success("تم حفظ التصميم");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setDesignSaving(false);
    }
  };

  // ── Settings state ───────────────────────────────────────────
  const [settingsForm, setSettingsForm] = useState<any>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const s = (k: string, v: any) => setSettingsForm((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (config && !settingsForm) {
      setSettingsForm({
        customDomain: config.customDomain || "",
        defaultMetaTitle: config.defaultMetaTitle || "",
        defaultMetaDescription: config.defaultMetaDescription || "",
        googleAnalyticsId: config.googleAnalyticsId || "",
        gtmContainerId: config.gtmContainerId || "",
        facebookPixelId: config.facebookPixelId || "",
        snapchatPixelId: config.snapchatPixelId || "",
        tiktokPixelId: config.tiktokPixelId || "",
        customHeadCode: config.customHeadCode || "",
        customBodyCode: config.customBodyCode || "",
        sitemapEnabled: config.sitemapEnabled ?? true,
      });
    }
  }, [config]);

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await websiteApi.updateConfig(settingsForm);
      refetchConfig();
      toast.success("تم حفظ الإعدادات");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSettingsSaving(false);
    }
  };

  // ── Pages state ──────────────────────────────────────────────
  const [pageModal, setPageModal] = useState<{ open: boolean; item?: any } | null>(null);
  const [pageForm, setPageForm] = useState({ title: "", type: "custom", isPublished: false });
  const [pageSaving, setPageSaving] = useState(false);
  const [builderPage, setBuilderPage] = useState<any>(null);
  const [builderBlocks, setBuilderBlocks] = useState<any[]>([]);
  const [builderSaving, setBuilderSaving] = useState(false);
  const [addBlockOpen, setAddBlockOpen] = useState(false);

  const openBuilder = (page: any) => {
    setBuilderPage(page);
    setBuilderBlocks((page.blocks || []).map((b: any, i: number) => ({ id: `b${i}`, ...b })));
  };

  const addBlock = (type: string) => {
    const id = `b${Date.now()}`;
    setBuilderBlocks(prev => [...prev, { id, type, content: { ...BLOCK_DEFAULTS[type] } }]);
    setAddBlockOpen(false);
  };

  const saveBuilder = async () => {
    if (!builderPage) return;
    setBuilderSaving(true);
    try {
      const blocks = builderBlocks.map(({ id, ...rest }) => rest);
      await websiteApi.updatePage(builderPage.id, { blocks });
      refetchPages();
      toast.success("تم حفظ الصفحة");
      setBuilderPage(null);
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setBuilderSaving(false);
    }
  };

  const savePage = async () => {
    setPageSaving(true);
    try {
      if (pageModal?.item) {
        await websiteApi.updatePage(pageModal.item.id, pageForm);
      } else {
        await websiteApi.createPage({ ...pageForm, blocks: [] });
      }
      setPageModal(null);
      refetchPages();
      toast.success(pageModal?.item ? "تم التحديث" : "تم إنشاء الصفحة");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setPageSaving(false);
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm("حذف هذه الصفحة؟")) return;
    await websiteApi.deletePage(id);
    refetchPages();
    toast.success("تم الحذف");
  };

  const togglePublish = async (page: any) => {
    await websiteApi.updatePage(page.id, { isPublished: !page.isPublished });
    refetchPages();
    toast.success(page.isPublished ? "أُخفيت الصفحة" : "نُشرت الصفحة");
  };

  // ── Blog state ───────────────────────────────────────────────
  const [postModal, setPostModal] = useState<{ open: boolean; item?: any } | null>(null);
  const [postForm, setPostForm] = useState({ title: "", excerpt: "", content: "", status: "draft", tags: [] as string[], category: "" });
  const [postSaving, setPostSaving] = useState(false);

  const savePost = async () => {
    setPostSaving(true);
    try {
      if (postModal?.item) {
        await websiteApi.updatePost(postModal.item.id, postForm);
      } else {
        await websiteApi.createPost(postForm);
      }
      setPostModal(null);
      refetchBlog();
      toast.success("تم الحفظ");
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setPostSaving(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("حذف هذا المقال؟")) return;
    await websiteApi.deletePost(id);
    refetchBlog();
    toast.success("تم الحذف");
  };

  const copySiteUrl = () => {
    if (!siteUrl) return;
    navigator.clipboard.writeText(siteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "نظرة عامة", icon: Globe },
    { key: "qr",       label: "صفحتي العامة", icon: QrCode },
    { key: "pages",    label: "الصفحات",   icon: FileText },
    { key: "design",   label: "التصميم",   icon: Palette },
    { key: "blog",     label: "المدونة",   icon: Rss },
    { key: "settings", label: "الإعدادات", icon: Settings2 },
  ];

  // ── Block builder view ───────────────────────────────────────
  if (builderPage) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setBuilderPage(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">{builderPage.title}</h2>
            <p className="text-xs text-gray-400 font-mono">/{builderPage.slug}</p>
          </div>
          <Button icon={Plus} size="sm" variant="secondary" onClick={() => setAddBlockOpen(true)}>إضافة قسم</Button>
          <Button icon={Save} loading={builderSaving} onClick={saveBuilder}>حفظ الصفحة</Button>
        </div>

        {builderBlocks.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-20 text-center">
            <Layout className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">لا توجد أقسام بعد</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">ابدأ ببناء صفحتك بإضافة أقسام</p>
            <Button icon={Plus} size="sm" onClick={() => setAddBlockOpen(true)}>إضافة أول قسم</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {builderBlocks.map((block, idx) => {
              const bt = BLOCK_TYPES.find(b => b.type === block.type);
              return (
                <div key={block.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => { if (idx === 0) return; const b = [...builderBlocks]; [b[idx-1], b[idx]] = [b[idx], b[idx-1]]; setBuilderBlocks(b); }} disabled={idx === 0} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                      <button onClick={() => { if (idx === builderBlocks.length - 1) return; const b = [...builderBlocks]; [b[idx+1], b[idx]] = [b[idx], b[idx+1]]; setBuilderBlocks(b); }} disabled={idx === builderBlocks.length - 1} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                    </div>
                    <span className="text-sm font-medium text-gray-700 flex-1">{bt?.label || block.type}</span>
                    <button onClick={() => setBuilderBlocks(prev => prev.filter(b => b.id !== block.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="p-4">
                    <BlockEditor
                      block={block}
                      onChange={(content) => setBuilderBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content } : b))}
                      onPickImage={(field) => setImagePicker({ blockId: block.id, field })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Block Modal */}
        {addBlockOpen && (
          <Modal open title="اختر نوع القسم" onClose={() => setAddBlockOpen(false)} size="sm">
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => addBlock(bt.type)}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50/50 text-right transition-colors">
                  <bt.icon className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{bt.label}</p>
                    <p className="text-xs text-gray-400">{bt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">صفحة البيع السريع</h1>
          <p className="text-sm text-gray-400 mt-0.5">صفحة عامة جاهزة للبيع الفوري — يصلها عملاؤك بالرابط أو رمز QR بدون أي إعداد معقد</p>
        </div>
        {siteUrl && (
          <a href={siteUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <ExternalLink className="w-4 h-4" />
            معاينة الموقع
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={clsx("flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.key ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700")}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ─────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Globe className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-blue-800">صفحة البيع السريع</p>
              <p className="text-xs text-blue-600 mt-0.5">صفحة عامة يصلها عملاؤك مباشرة بالرابط أو رمز QR — تعرض خدماتك وتُمكّن الحجز الفوري. لا تحتاج إعداداً معقداً.</p>
            </div>
          </div>
          {/* URL Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">رابط موقعك</h3>
              <span className={clsx("text-xs px-2.5 py-1 rounded-full font-medium",
                config?.customDomain ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600")}>
                {config?.customDomain ? "دومين مخصص" : "رابط ترميز OS"}
              </span>
            </div>
            {siteUrl ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
                  <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-600 font-mono truncate">{siteUrl}</span>
                </div>
                <button onClick={copySiteUrl} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "تم النسخ" : "نسخ"}
                </button>
                <a href={siteUrl} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-400">أكمل إعداد حسابك للحصول على رابط موقعك</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "الصفحات المنشورة", value: pages.filter(p => p.isPublished).length, total: pages.length, icon: FileText, color: "blue" },
              { label: "مقالات المدونة", value: posts.filter(p => p.status === "published").length, total: posts.length, icon: Rss, color: "indigo" },
              { label: "القالب المستخدم", value: TEMPLATES.find(t => t.id === (config?.templateId || "default"))?.name || "عصري", icon: Palette, color: "purple" },
              { label: "الخط المستخدم", value: (config?.fontFamily || "IBM Plex Sans Arabic").split(" ")[0], icon: Type, color: "gray" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center mb-3",
                  s.color === "blue" ? "bg-blue-50" : s.color === "indigo" ? "bg-indigo-50" : s.color === "purple" ? "bg-purple-50" : "bg-gray-100")}>
                  <s.icon className={clsx("w-4 h-4", s.color === "blue" ? "text-blue-500" : s.color === "indigo" ? "text-indigo-500" : s.color === "purple" ? "text-purple-500" : "text-gray-500")} />
                </div>
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                {typeof s.total === "number" && <p className="text-[10px] text-gray-300 mt-0.5">من أصل {s.total}</p>}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">إجراءات سريعة</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "إضافة صفحة جديدة", icon: Plus, action: () => { setActiveTab("pages"); setPageModal({ open: true }); } },
                { label: "تعديل التصميم", icon: Palette, action: () => setActiveTab("design") },
                { label: "إضافة مقال", icon: Rss, action: () => { setActiveTab("blog"); setPostModal({ open: true }); } },
                { label: "إعدادات الدومين", icon: Link2, action: () => setActiveTab("settings") },
              ].map(action => (
                <button key={action.label} onClick={action.action}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50/30 text-right transition-colors group">
                  <action.icon className="w-4 h-4 text-gray-400 group-hover:text-brand-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-brand-700">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: QR / صفحتي العامة ─────────────────────────────── */}
      {activeTab === "qr" && (
        <div className="space-y-5 max-w-2xl">
          <div className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 flex items-start gap-3">
            <QrCode className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-brand-800">رمز QR + رابط الصفحة</p>
              <p className="text-xs text-brand-600 mt-0.5">اطبع رمز QR وضعه في متجرك أو على بطاقاتك — يُعيد توجيه العميل لصفحتك مباشرة. يمكنك أيضاً تعديل الرابط القصير.</p>
            </div>
          </div>
          {/* Link card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">رابط صفحتك العامة</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200 font-mono text-sm text-gray-600 truncate">
                {siteUrl || "—"}
              </div>
              {siteUrl && (
                <>
                  <button onClick={() => { navigator.clipboard.writeText(siteUrl); setQrCopied(true); setTimeout(() => setQrCopied(false), 2000); }}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 transition-colors">
                    {qrCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {qrCopied ? "تم" : "نسخ"}
                  </button>
                  <a href={siteUrl} target="_blank" rel="noreferrer"
                    className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
            {/* Slug edit */}
            <div className="mt-4">
              {sfSlugEditing ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 flex-1 border border-brand-300 rounded-xl px-3 py-2 bg-brand-50/30 text-sm">
                    <span className="text-gray-400 text-xs">nasaqpro.tech/s/</span>
                    <input value={sfSlugEdit} onChange={e => setSfSlugEdit(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-gray-800 font-mono" dir="ltr" />
                  </div>
                  <button onClick={async () => {
                    setSfSaving(true);
                    try {
                      await websiteApi.updateStorefrontSettings({ slug: sfSlugEdit });
                      await refetchStorefront();
                      setSfSlugEditing(false);
                      toast.success("تم تحديث الرابط");
                    } catch (e: any) {
                      toast.error(e?.message || "فشل التحديث");
                    } finally { setSfSaving(false); }
                  }} disabled={sfSaving}
                    className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
                    {sfSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                  </button>
                  <button onClick={() => setSfSlugEditing(false)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                    إلغاء
                  </button>
                </div>
              ) : (
                <button onClick={() => { setSfSlugEdit(storefrontData?.slug || profile?.slug || ""); setSfSlugEditing(true); }}
                  className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> تعديل الـ Slug
                </button>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">QR Code</h3>
            {qrDataUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
                </div>
                <div className="flex gap-2">
                  <a href={qrDataUrl} download={`nasaq-qr-${storefrontData?.slug || profile?.slug}.png`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
                    <Download className="w-4 h-4" /> تحميل PNG
                  </a>
                  {printUrl && (
                    <a href={printUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                      <Printer className="w-4 h-4" /> المطبوعات
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
              </div>
            )}
          </div>

          {/* Print exports */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-1">تصدير المطبوعات</h3>
            <p className="text-xs text-gray-400 mb-4">3 عناصر طباعة جاهزة للطباعة أو التحميل</p>
            {printUrl ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "A4 Card", desc: "210×297mm — للواجهة والإعلانات", id: "a4" },
                  { label: "بطاقة عمل", desc: "85×54mm — لتوزيعها للعملاء", id: "card" },
                  { label: "ملصق الرف", desc: "80×50mm — يُثبَّت على المنتجات", id: "label" },
                ].map(item => (
                  <a key={item.id} href={printUrl} target="_blank" rel="noreferrer"
                    className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-2xl hover:border-brand-300 hover:bg-brand-50/30 transition-colors text-center group">
                    <QrCode className="w-8 h-8 text-gray-300 group-hover:text-brand-400 transition-colors" />
                    <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                    <p className="text-[11px] text-gray-400">{item.desc}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">أكمل إعداد حسابك أولاً</p>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Pages ─────────────────────────────────────────── */}
      {activeTab === "pages" && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <FileText className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-gray-800">صفحات إضافية</p>
              <p className="text-xs text-gray-500 mt-0.5">أنشئ صفحات مرفقة بموقعك كـ «من نحن» أو «شروط الاستخدام» — تظهر كروابط في تذييل الصفحة العامة.</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">صفحات موقعك — الرئيسية، من نحن، تواصل معنا...</p>
            <Button icon={Plus} size="sm" onClick={() => { setPageForm({ title: "", type: "custom", isPublished: false }); setPageModal({ open: true }); }}>
              صفحة جديدة
            </Button>
          </div>

          {pages.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">لا توجد صفحات بعد</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">أنشئ صفحات مثل "من نحن" أو "تواصل معنا"</p>
              <Button icon={Plus} size="sm" onClick={() => { setPageForm({ title: "", type: "custom", isPublished: false }); setPageModal({ open: true }); }}>إنشاء أول صفحة</Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الصفحة</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الرابط</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الأقسام</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الحالة</th>
                    <th className="py-3 px-4 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map(page => (
                    <tr key={page.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-medium text-gray-900">{page.title}</td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-400">/{page.slug}</td>
                      <td className="py-3 px-4 text-gray-500">{(page.blocks || []).length} قسم</td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-semibold",
                          page.isPublished ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500")}>
                          {page.isPublished ? "منشورة" : "مسودة"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openBuilder(page)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-500" title="تعديل المحتوى"><Layout className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setPageForm({ title: page.title, type: page.type || "custom", isPublished: page.isPublished }); setPageModal({ open: true, item: page }); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="تعديل المعلومات"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => togglePublish(page)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title={page.isPublished ? "إخفاء" : "نشر"}>{page.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                          <button onClick={() => deletePage(page.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Design ─────────────────────────────────────────── */}
      {activeTab === "design" && designForm && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Palette className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-gray-800">هوية بصرية الصفحة</p>
              <p className="text-xs text-gray-500 mt-0.5">اختر القالب واللون والخط — تنعكس التغييرات مباشرة على صفحتك العامة التي يراها عملاؤك.</p>
            </div>
          </div>
          {/* Templates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-1">القالب</h3>
            <p className="text-xs text-gray-400 mb-4">اختر الشكل العام لموقعك</p>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => d("templateId", t.id)}
                  className={clsx("rounded-xl border-2 overflow-hidden text-right transition-all",
                    designForm.templateId === t.id ? "border-brand-500 ring-2 ring-brand-200" : "border-gray-200 hover:border-gray-300")}>
                  <div className={clsx("h-16", t.preview)} />
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-gray-900">{t.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t.desc}</p>
                  </div>
                  {designForm.templateId === t.id && (
                    <div className="px-2.5 pb-2.5"><span className="text-[10px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">مفعّل</span></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-1">الألوان</h3>
            <p className="text-xs text-gray-400 mb-4">اختر من لوحة الألوان أو أدخل كود HEX مخصص</p>

            {/* Palette presets */}
            {(() => {
              const SEMANTIC_PALETTES = [
                { name: "أخضر البيع — الثقة والنمو", primary: "#1a9e72", secondary: "#0d7a54" },
                { name: "لافندر — الابتكار",         primary: "#9b8fc4", secondary: "#6d5f9e" },
                { name: "وردي دافئ — الاهتمام",     primary: "#d4917e", secondary: "#b06050" },
                { name: "سماوي — الموثوقية",         primary: "#7eb5d4", secondary: "#4d8fb5" },
                { name: "عسلي — القيمة والجودة",    primary: "#d4b06a", secondary: "#b08840" },
                { name: "مرجاني — الطاقة",           primary: "#c98b8b", secondary: "#a35f5f" },
              ];
              const EXTRA_PALETTES = [
                { name: "أزرق ترميز",  primary: "#5b9bd5", secondary: "#3b82f6" },
                { name: "بنفسجي",       primary: "#7c3aed", secondary: "#a855f7" },
                { name: "وردي فيوشيا", primary: "#db2777", secondary: "#f472b6" },
                { name: "أخضر زمردي",  primary: "#059669", secondary: "#34d399" },
                { name: "برتقالي",      primary: "#ea580c", secondary: "#fb923c" },
                { name: "فيروزي",       primary: "#0891b2", secondary: "#22d3ee" },
              ];
              const ALL = [...SEMANTIC_PALETTES, ...EXTRA_PALETTES];
              const active = ALL.findIndex(p => p.primary === designForm.primaryColor && p.secondary === designForm.secondaryColor);
              return (
                <div className="mb-5 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">ألوان ترميز OS الرسمية</p>
                    <div className="grid grid-cols-6 gap-2">
                      {SEMANTIC_PALETTES.map((p, i) => (
                        <button
                          key={p.name}
                          title={p.name}
                          onClick={() => { d("primaryColor", p.primary); d("secondaryColor", p.secondary); }}
                          className={clsx(
                            "relative h-10 rounded-xl overflow-hidden border-2 transition-all",
                            i === active ? "border-gray-800 scale-105 shadow-md" : "border-transparent hover:scale-105 hover:border-gray-300"
                          )}
                          style={{ background: `linear-gradient(135deg, ${p.primary} 0%, ${p.secondary} 100%)` }}
                        >
                          {i === active && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-white shadow" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">ألوان إضافية</p>
                    <div className="grid grid-cols-6 gap-2">
                      {EXTRA_PALETTES.map((p, i) => (
                        <button
                          key={p.name}
                          title={p.name}
                          onClick={() => { d("primaryColor", p.primary); d("secondaryColor", p.secondary); }}
                          className={clsx(
                            "relative h-10 rounded-xl overflow-hidden border-2 transition-all",
                            i + SEMANTIC_PALETTES.length === active ? "border-gray-800 scale-105 shadow-md" : "border-transparent hover:scale-105 hover:border-gray-300"
                          )}
                          style={{ background: `linear-gradient(135deg, ${p.primary} 0%, ${p.secondary} 100%)` }}
                        >
                          {i + SEMANTIC_PALETTES.length === active && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-white shadow" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Manual inputs */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">اللون الأساسي</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={designForm.primaryColor} onChange={e => d("primaryColor", e.target.value)} className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer shrink-0" />
                  <input type="text" value={designForm.primaryColor} onChange={e => d("primaryColor", e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-brand-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">اللون الثانوي</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={designForm.secondaryColor || "#C8A951"} onChange={e => d("secondaryColor", e.target.value)} className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer shrink-0" />
                  <input type="text" value={designForm.secondaryColor || ""} onChange={e => d("secondaryColor", e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-brand-400" />
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="mt-4 rounded-xl overflow-hidden border border-gray-100">
              <div style={{ background: `linear-gradient(160deg, ${designForm.primaryColor} 0%, ${designForm.secondaryColor || designForm.primaryColor} 100%)`, padding: "16px 20px" }}>
                <div className="text-white font-bold text-sm">معاينة الهيدر</div>
                <div className="text-white/70 text-xs mt-0.5">هكذا يظهر التدرج للعملاء</div>
              </div>
            </div>
          </div>

          {/* Typography & Logo */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">الخط والشعار</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">نوع الخط</label>
                <select value={designForm.fontFamily} onChange={e => d("fontFamily", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400">
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1.5" style={{ fontFamily: designForm.fontFamily }}>معاينة: نص عربي احترافي</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">شعار الموقع</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {designForm.logoUrl
                      ? <img src={designForm.logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                      : <Image className="w-6 h-6 text-gray-300" />
                    }
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setLogoPicker(true)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                      اختر من المكتبة
                    </button>
                    {designForm.logoUrl && (
                      <button onClick={() => d("logoUrl", "")}
                        className="px-3 py-2 rounded-xl border border-red-100 text-xs text-red-500 hover:bg-red-50 transition-colors">
                        إزالة
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Header config */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">إعدادات الرأس (Header)</h3>
            <div className="space-y-1">
              {[
                { key: "showLogo", label: "عرض الشعار" },
                { key: "showPhone", label: "عرض رقم الهاتف" },
                { key: "showBookButton", label: "عرض زر الحجز" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <button onClick={() => d("headerConfig", { ...designForm.headerConfig, [item.key]: !designForm.headerConfig?.[item.key] })}
                    className={clsx("relative w-10 h-5 rounded-full transition-colors", designForm.headerConfig?.[item.key] ? "bg-brand-500" : "bg-gray-200")}>
                    <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", designForm.headerConfig?.[item.key] ? "right-0.5" : "left-0.5")} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button icon={Save} onClick={saveDesign} loading={designSaving}>حفظ التصميم</Button>
        </div>
      )}

      {/* ── Tab: Blog ──────────────────────────────────────────── */}
      {activeTab === "blog" && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Rss className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-gray-800">مقالات وتدوينات</p>
              <p className="text-xs text-gray-500 mt-0.5">انشر مقالات ونصائح تظهر في صفحتك العامة — تُقوي ثقة العميل وتُحسّن ظهورك في محركات البحث.</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">مقالات المدونة تظهر في موقعك العام</p>
            <Button icon={Plus} size="sm" onClick={() => { setPostForm({ title: "", excerpt: "", content: "", status: "draft", tags: [], category: "" }); setPostModal({ open: true }); }}>
              مقال جديد
            </Button>
          </div>

          {posts.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
              <Rss className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">لا توجد مقالات بعد</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">المدونة تُحسّن ظهورك في محركات البحث</p>
              <Button icon={Plus} size="sm" onClick={() => { setPostForm({ title: "", excerpt: "", content: "", status: "draft", tags: [], category: "" }); setPostModal({ open: true }); }}>كتابة أول مقال</Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">العنوان</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الحالة</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">المشاهدات</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">التاريخ</th>
                    <th className="py-3 px-4 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(post => (
                    <tr key={post.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{post.title}</p>
                        {post.category && <p className="text-xs text-gray-400 mt-0.5">{post.category}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-semibold",
                          post.status === "published" ? "bg-green-50 text-green-600" : post.status === "scheduled" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500")}>
                          {post.status === "published" ? "منشور" : post.status === "scheduled" ? "مجدول" : "مسودة"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{post.views || 0}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{post.publishedAt ? fmtDate(post.publishedAt) : "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => { setPostForm({ title: post.title, excerpt: post.excerpt || "", content: post.content || "", status: post.status, tags: post.tags || [], category: post.category || "" }); setPostModal({ open: true, item: post }); }} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                          <button onClick={() => deletePost(post.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Settings ─────────────────────────────────────── */}
      {activeTab === "settings" && settingsForm && (
        <div className="space-y-5 max-w-2xl">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Settings2 className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-gray-800">إعدادات الصفحة</p>
              <p className="text-xs text-gray-500 mt-0.5">ربط دومين مخصص (اختياري) + إعدادات SEO لتحسين ظهور صفحتك في Google + متابعة الزوار عبر Google Analytics أو Pixel.</p>
            </div>
          </div>
          {/* Domain */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-1">الدومين المخصص</h3>
            <p className="text-xs text-gray-400 mb-4">اربط دومينك الخاص بالموقع</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">الدومين</label>
                <input type="text" value={settingsForm.customDomain} onChange={e => s("customDomain", e.target.value)} placeholder="www.yoursite.com" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-brand-400" />
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
                بعد إضافة الدومين، وجّه DNS Record من نوع CNAME إلى: <span className="font-mono font-bold">nasaqpro.tech</span>
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">تحسين محركات البحث (SEO)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">العنوان الافتراضي</label>
                <input type="text" value={settingsForm.defaultMetaTitle} onChange={e => s("defaultMetaTitle", e.target.value)} placeholder="اسم منشأتك — وصف قصير" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">الوصف الافتراضي</label>
                <textarea value={settingsForm.defaultMetaDescription} onChange={e => s("defaultMetaDescription", e.target.value)} rows={2} placeholder="وصف قصير يظهر في نتائج البحث..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 resize-none" />
                <p className="text-[10px] text-gray-400 mt-1">{settingsForm.defaultMetaDescription?.length || 0} / 160 حرف</p>
              </div>
            </div>
          </div>

          {/* Analytics */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">التتبع والتحليلات</h3>
            <div className="space-y-3">
              {[
                { key: "googleAnalyticsId", label: "Google Analytics ID", placeholder: "G-XXXXXXXXXX" },
                { key: "gtmContainerId", label: "Google Tag Manager", placeholder: "GTM-XXXXXXX" },
                { key: "facebookPixelId", label: "Facebook Pixel ID", placeholder: "123456789012345" },
                { key: "snapchatPixelId", label: "Snapchat Pixel ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
                { key: "tiktokPixelId", label: "TikTok Pixel ID", placeholder: "CXXXXXXXXXXXXXXXXX" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.label}</label>
                  <input type="text" value={settingsForm[f.key]} onChange={e => s(f.key, e.target.value)} placeholder={f.placeholder} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-brand-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Custom Code */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">كود مخصص</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">قبل نهاية &lt;head&gt;</label>
                <textarea value={settingsForm.customHeadCode} onChange={e => s("customHeadCode", e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono outline-none focus:border-brand-400 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">قبل نهاية &lt;body&gt;</label>
                <textarea value={settingsForm.customBodyCode} onChange={e => s("customBodyCode", e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono outline-none focus:border-brand-400 resize-none" />
              </div>
            </div>
          </div>

          <Button icon={Save} onClick={saveSettings} loading={settingsSaving}>حفظ الإعدادات</Button>
        </div>
      )}

      {/* ── Page Modal ─────────────────────────────────────────── */}
      {pageModal && (
        <Modal open title={pageModal.item ? "تعديل بيانات الصفحة" : "إنشاء صفحة جديدة"} onClose={() => setPageModal(null)} size="sm"
          footer={<><Button variant="secondary" onClick={() => setPageModal(null)}>إلغاء</Button><Button onClick={savePage} loading={pageSaving}>حفظ</Button></>}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">عنوان الصفحة *</label>
              <input type="text" value={pageForm.title} onChange={e => setPageForm(p => ({ ...p, title: e.target.value }))} placeholder="من نحن، تواصل معنا..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">نوع الصفحة</label>
              <select value={pageForm.type} onChange={e => setPageForm(p => ({ ...p, type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400">
                <option value="home">الرئيسية</option>
                <option value="services">الخدمات</option>
                <option value="about">من نحن</option>
                <option value="contact">تواصل معنا</option>
                <option value="custom">صفحة مخصصة</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">نشر الصفحة فوراً</span>
              <button onClick={() => setPageForm(p => ({ ...p, isPublished: !p.isPublished }))}
                className={clsx("relative w-10 h-5 rounded-full transition-colors", pageForm.isPublished ? "bg-brand-500" : "bg-gray-200")}>
                <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", pageForm.isPublished ? "right-0.5" : "left-0.5")} />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Post Modal ─────────────────────────────────────────── */}
      {postModal && (
        <Modal open title={postModal.item ? "تعديل المقال" : "مقال جديد"} onClose={() => setPostModal(null)} size="md"
          footer={<><Button variant="secondary" onClick={() => setPostModal(null)}>إلغاء</Button><Button onClick={savePost} loading={postSaving}>حفظ</Button></>}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">العنوان *</label>
              <input type="text" value={postForm.title} onChange={e => setPostForm(p => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">الملخص</label>
              <textarea value={postForm.excerpt} onChange={e => setPostForm(p => ({ ...p, excerpt: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">المحتوى</label>
              <textarea value={postForm.content} onChange={e => setPostForm(p => ({ ...p, content: e.target.value }))} rows={6} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">التصنيف</label>
                <input type="text" value={postForm.category} onChange={e => setPostForm(p => ({ ...p, category: e.target.value }))} placeholder="نصائح، أخبار..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">الحالة</label>
                <select value={postForm.status} onChange={e => setPostForm(p => ({ ...p, status: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400">
                  <option value="draft">مسودة</option>
                  <option value="published">منشور</option>
                </select>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {logoPicker && (
        <MediaPickerModal
          accept="logo"
          title="اختر شعار الموقع"
          onSelect={(asset) => { d("logoUrl", asset.fileUrl); setLogoPicker(false); }}
          onClose={() => setLogoPicker(false)}
        />
      )}

      {imagePicker && (
        <MediaPickerModal
          accept="image"
          title="اختر صورة"
          onSelect={(asset) => {
            setBuilderBlocks(prev => prev.map(b =>
              b.id === imagePicker.blockId
                ? { ...b, content: { ...b.content, [imagePicker.field]: asset.fileUrl } }
                : b
            ));
            setImagePicker(null);
          }}
          onClose={() => setImagePicker(null)}
        />
      )}    </div>
  );
}
