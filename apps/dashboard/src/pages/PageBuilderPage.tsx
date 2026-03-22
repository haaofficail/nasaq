import { useState, useEffect } from "react";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Eye, Save, Globe,
  Loader2, FileText, Image, Type, Layout, Star, Phone,
  Check, X, Settings, Code,
} from "lucide-react";
import { clsx } from "clsx";
import { websiteApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input } from "@/components/ui";

// ─── Block definitions ──────────────────────────────────────────
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
  hero:         { title: "مرحباً بكم", subtitle: "نقدم أفضل الخدمات", buttonText: "احجز الآن", buttonLink: "/book", imageUrl: "", bgColor: "#1A56DB", textColor: "#ffffff" },
  services:     { title: "خدماتنا", subtitle: "اختر من بين خدماتنا المتميزة", columns: 3 },
  text:         { title: "", content: "أضف نصك هنا...", align: "right" },
  image:        { url: "", alt: "", caption: "", fullWidth: false },
  gallery:      { images: [], columns: 3 },
  testimonials: { title: "آراء عملائنا", showRating: true },
  booking_cta:  { title: "احجز موعدك الآن", subtitle: "خطوة واحدة تفصلك عن تجربة مميزة", buttonText: "احجز الآن", bgColor: "#1A56DB" },
  contact:      { title: "تواصل معنا", showPhone: true, showEmail: true, showMap: false },
  html:         { code: "<p>كود HTML مخصص</p>" },
};

function blockLabel(type: string) {
  return BLOCK_TYPES.find((b) => b.type === type)?.label || type;
}

// ─── Block Editors ──────────────────────────────────────────────
function BlockEditor({ block, onChange }: { block: any; onChange: (c: any) => void }) {
  const c = block.content || {};
  const set = (k: string, v: any) => onChange({ ...c, [k]: v });
  const inputCls = "w-full border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all";

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5"><label className="text-xs font-medium text-gray-600">{label}</label>{children}</div>
  );

  if (block.type === "hero") return (
    <div className="space-y-4 p-4">
      <Field label="العنوان"><input className={inputCls} value={c.title || ""} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="العنوان الفرعي"><input className={inputCls} value={c.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} /></Field>
      <Field label="نص الزر"><input className={inputCls} value={c.buttonText || ""} onChange={(e) => set("buttonText", e.target.value)} /></Field>
      <Field label="رابط الزر"><input className={inputCls} value={c.buttonLink || ""} onChange={(e) => set("buttonLink", e.target.value)} dir="ltr" /></Field>
      <Field label="صورة الخلفية"><input className={inputCls} value={c.imageUrl || ""} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." dir="ltr" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="لون الخلفية">
          <div className="flex gap-2 items-center">
            <input type="color" value={c.bgColor || "#1A56DB"} onChange={(e) => set("bgColor", e.target.value)} className="w-10 h-10 rounded-xl border border-gray-100 p-1 cursor-pointer" />
            <input className={inputCls + " font-mono"} value={c.bgColor || "#1A56DB"} onChange={(e) => set("bgColor", e.target.value)} dir="ltr" />
          </div>
        </Field>
        <Field label="لون النص">
          <div className="flex gap-2 items-center">
            <input type="color" value={c.textColor || "#ffffff"} onChange={(e) => set("textColor", e.target.value)} className="w-10 h-10 rounded-xl border border-gray-100 p-1 cursor-pointer" />
            <input className={inputCls + " font-mono"} value={c.textColor || "#ffffff"} onChange={(e) => set("textColor", e.target.value)} dir="ltr" />
          </div>
        </Field>
      </div>
    </div>
  );

  if (block.type === "text") return (
    <div className="space-y-4 p-4">
      <Field label="العنوان (اختياري)"><input className={inputCls} value={c.title || ""} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="المحتوى">
        <textarea rows={5} className={inputCls + " resize-none"} value={c.content || ""} onChange={(e) => set("content", e.target.value)} dir="rtl" />
      </Field>
      <Field label="المحاذاة">
        <select className={inputCls} value={c.align || "right"} onChange={(e) => set("align", e.target.value)}>
          <option value="right">يمين</option>
          <option value="center">وسط</option>
          <option value="left">يسار</option>
        </select>
      </Field>
    </div>
  );

  if (block.type === "image") return (
    <div className="space-y-4 p-4">
      <Field label="رابط الصورة"><input className={inputCls} value={c.url || ""} onChange={(e) => set("url", e.target.value)} placeholder="https://..." dir="ltr" /></Field>
      <Field label="وصف الصورة (alt)"><input className={inputCls} value={c.alt || ""} onChange={(e) => set("alt", e.target.value)} /></Field>
      <Field label="تعليق الصورة"><input className={inputCls} value={c.caption || ""} onChange={(e) => set("caption", e.target.value)} /></Field>
      {c.url && <img src={c.url} alt={c.alt} className="w-full h-32 object-cover rounded-xl border border-gray-100" />}
    </div>
  );

  if (block.type === "services") return (
    <div className="space-y-4 p-4">
      <Field label="عنوان القسم"><input className={inputCls} value={c.title || ""} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="العنوان الفرعي"><input className={inputCls} value={c.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} /></Field>
      <Field label="عدد الأعمدة">
        <select className={inputCls} value={c.columns || 3} onChange={(e) => set("columns", +e.target.value)}>
          {[2,3,4].map((n) => <option key={n} value={n}>{n} أعمدة</option>)}
        </select>
      </Field>
    </div>
  );

  if (block.type === "booking_cta") return (
    <div className="space-y-4 p-4">
      <Field label="العنوان"><input className={inputCls} value={c.title || ""} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="العنوان الفرعي"><input className={inputCls} value={c.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} /></Field>
      <Field label="نص الزر"><input className={inputCls} value={c.buttonText || ""} onChange={(e) => set("buttonText", e.target.value)} /></Field>
      <Field label="لون الخلفية">
        <div className="flex gap-2 items-center">
          <input type="color" value={c.bgColor || "#1A56DB"} onChange={(e) => set("bgColor", e.target.value)} className="w-10 h-10 rounded-xl border border-gray-100 p-1 cursor-pointer" />
          <input className={inputCls + " font-mono"} value={c.bgColor || "#1A56DB"} onChange={(e) => set("bgColor", e.target.value)} dir="ltr" />
        </div>
      </Field>
    </div>
  );

  if (block.type === "html") return (
    <div className="p-4">
      <Field label="كود HTML">
        <textarea rows={8} className={inputCls + " resize-none font-mono text-xs"} value={c.code || ""} onChange={(e) => set("code", e.target.value)} dir="ltr" spellCheck={false} />
      </Field>
    </div>
  );

  if (block.type === "contact") return (
    <div className="space-y-4 p-4">
      <Field label="العنوان"><input className={inputCls} value={c.title || ""} onChange={(e) => set("title", e.target.value)} /></Field>
      {["showPhone","showEmail","showMap"].map((k) => (
        <div key={k} className="flex items-center justify-between py-1.5">
          <span className="text-sm text-gray-700">{{showPhone:"إظهار الجوال",showEmail:"إظهار الإيميل",showMap:"إظهار الخريطة"}[k]}</span>
          <button onClick={() => set(k, !c[k])} className={clsx("relative w-9 h-5 rounded-full transition-colors", c[k] ? "bg-brand-500" : "bg-gray-200")}>
            <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", c[k] ? "right-0.5" : "left-0.5")} />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4">
      <Field label="عنوان القسم"><input className={inputCls} value={c.title || ""} onChange={(e) => set("title", e.target.value)} /></Field>
    </div>
  );
}

// ─── Block Preview ──────────────────────────────────────────────
function BlockPreview({ block }: { block: any }) {
  const c = block.content || {};
  if (block.type === "hero") return (
    <div className="py-12 px-6 text-center rounded-xl" style={{ background: c.bgColor || "#1A56DB", color: c.textColor || "#fff" }}>
      {c.imageUrl && <img src={c.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 rounded-xl" />}
      <h2 className="text-2xl font-bold mb-2">{c.title || "العنوان"}</h2>
      <p className="opacity-80 mb-4">{c.subtitle || "العنوان الفرعي"}</p>
      <button className="bg-white text-brand-600 px-5 py-2 rounded-xl text-sm font-semibold">{c.buttonText || "احجز الآن"}</button>
    </div>
  );
  if (block.type === "services") return (
    <div className="py-8 px-4 text-center bg-gray-50 rounded-xl">
      <h2 className="text-lg font-bold text-gray-900 mb-1">{c.title || "خدماتنا"}</h2>
      <p className="text-sm text-gray-400 mb-4">{c.subtitle}</p>
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map((i) => <div key={i} className="bg-white rounded-xl p-3 h-16 flex items-center justify-center text-gray-300 text-xs border border-gray-100">خدمة {i}</div>)}
      </div>
    </div>
  );
  if (block.type === "text") return (
    <div className="py-6 px-4" style={{ textAlign: c.align || "right" }}>
      {c.title && <h2 className="text-lg font-bold text-gray-900 mb-2">{c.title}</h2>}
      <p className="text-sm text-gray-600 leading-relaxed">{c.content || "النص..."}</p>
    </div>
  );
  if (block.type === "image") return (
    <div className="py-4 px-4">
      {c.url ? <img src={c.url} alt={c.alt} className="w-full rounded-xl object-cover max-h-48" /> : <div className="w-full h-32 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300 text-sm">صورة</div>}
      {c.caption && <p className="text-xs text-gray-400 text-center mt-2">{c.caption}</p>}
    </div>
  );
  if (block.type === "booking_cta") return (
    <div className="py-10 px-6 text-center rounded-xl" style={{ background: c.bgColor || "#1A56DB" }}>
      <h2 className="text-xl font-bold text-white mb-2">{c.title || "احجز الآن"}</h2>
      <p className="text-white/70 text-sm mb-4">{c.subtitle}</p>
      <button className="bg-white text-brand-600 px-6 py-2.5 rounded-xl text-sm font-bold">{c.buttonText || "احجز"}</button>
    </div>
  );
  if (block.type === "contact") return (
    <div className="py-8 px-4 bg-gray-50 rounded-xl text-center">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{c.title || "تواصل معنا"}</h2>
      <div className="flex justify-center gap-4 text-sm text-gray-500">
        {c.showPhone && <span>📞 الجوال</span>}
        {c.showEmail && <span>✉️ الإيميل</span>}
      </div>
    </div>
  );
  if (block.type === "html") return (
    <div className="py-4 px-4 bg-gray-50 rounded-xl"><code className="text-xs text-gray-500">{c.code?.slice(0,80)}...</code></div>
  );
  return <div className="py-4 px-4 bg-gray-50 rounded-xl text-center text-sm text-gray-400">{blockLabel(block.type)}</div>;
}

// ─── Main Page ──────────────────────────────────────────────────
export function PageBuilderPage() {
  const { data: pagesRes, loading: pagesLoading, refetch } = useApi(() => websiteApi.pages(), []);
  const pages: any[] = pagesRes?.data || [];

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number | null>(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);

  const { mutate: updatePage, loading: saving } = useMutation(({ id, data }: any) => websiteApi.updatePage(id, data));
  const { mutate: createPage, loading: creating } = useMutation((data: any) => websiteApi.createPage(data));

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  useEffect(() => {
    if (pages.length > 0 && !selectedPageId) setSelectedPageId(pages[0].id);
  }, [pages]);

  useEffect(() => {
    if (selectedPage) setBlocks(selectedPage.blocks || []);
  }, [selectedPageId, selectedPage]);

  const handleSave = async () => {
    if (!selectedPageId) return;
    await updatePage({ id: selectedPageId, data: { blocks } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refetch();
  };

  const handlePublish = async () => {
    if (!selectedPageId) return;
    await updatePage({ id: selectedPageId, data: { blocks, isPublished: true } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refetch();
  };

  const handleCreatePage = async () => {
    if (!newPageTitle.trim()) return;
    const res: any = await createPage({ title: newPageTitle, blocks: [] });
    setShowNewPage(false);
    setNewPageTitle("");
    await refetch();
    if (res?.data?.id) setSelectedPageId(res.data.id);
  };

  const addBlock = (type: string) => {
    const newBlock = { id: Date.now().toString(), type, content: { ...BLOCK_DEFAULTS[type] } };
    setBlocks((b) => [...b, newBlock]);
    setSelectedBlockIdx(blocks.length);
    setShowAddBlock(false);
  };

  const removeBlock = (idx: number) => {
    setBlocks((b) => b.filter((_, i) => i !== idx));
    setSelectedBlockIdx(null);
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const b = [...blocks];
    const target = idx + dir;
    if (target < 0 || target >= b.length) return;
    [b[idx], b[target]] = [b[target], b[idx]];
    setBlocks(b);
    setSelectedBlockIdx(target);
  };

  const updateBlockContent = (idx: number, content: any) => {
    setBlocks((b) => b.map((block, i) => i === idx ? { ...block, content } : block));
  };

  if (pagesLoading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">منشئ الصفحات</h1>
          <p className="text-sm text-gray-400 mt-0.5">صمّم صفحات موقعك بالسحب والإضافة</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(!preview)}
            className={clsx("flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors", preview ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-100 hover:border-gray-200")}
          >
            <Eye className="w-4 h-4" />
            {preview ? "تحرير" : "معاينة"}
          </button>
          <Button variant="secondary" onClick={handleSave} loading={saving} icon={saved ? Check : Save}>
            {saved ? "تم الحفظ" : "حفظ"}
          </Button>
          <Button onClick={handlePublish} loading={saving} icon={Globe}>
            نشر
          </Button>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)]">
        {/* Left: Pages list + Blocks palette */}
        {!preview && (
          <div className="w-56 shrink-0 flex flex-col gap-3">
            {/* Pages */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-50">
                <span className="text-xs font-semibold text-gray-700">الصفحات</span>
                <button onClick={() => setShowNewPage(true)} className="w-6 h-6 rounded-lg bg-brand-50 flex items-center justify-center hover:bg-brand-100 transition-colors">
                  <Plus className="w-3.5 h-3.5 text-brand-500" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-40">
                {pages.length === 0 ? (
                  <p className="text-xs text-gray-400 p-3 text-center">لا توجد صفحات</p>
                ) : (
                  pages.map((p) => (
                    <button key={p.id} onClick={() => setSelectedPageId(p.id)}
                      className={clsx("w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-right", p.id === selectedPageId ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-50")}>
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate flex-1">{p.title}</span>
                      {p.isPublished && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Block palette */}
            <div className="bg-white rounded-2xl border border-gray-100 flex-1 overflow-hidden flex flex-col">
              <div className="px-3 py-2.5 border-b border-gray-50">
                <span className="text-xs font-semibold text-gray-700">إضافة بلوك</span>
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {BLOCK_TYPES.map((bt) => (
                  <button key={bt.type} onClick={() => addBlock(bt.type)}
                    disabled={!selectedPageId}
                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors text-right disabled:opacity-40">
                    <bt.icon className="w-4 h-4 text-brand-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{bt.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Center: Canvas */}
        <div className={clsx("flex-1 bg-white rounded-2xl border border-gray-100 overflow-y-auto", preview && "w-full")}>
          {!selectedPageId ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <FileText className="w-12 h-12 text-gray-200" />
              <p className="text-sm text-gray-400">اختر صفحة أو أنشئ صفحة جديدة</p>
              <Button icon={Plus} onClick={() => setShowNewPage(true)}>صفحة جديدة</Button>
            </div>
          ) : blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Layout className="w-12 h-12 text-gray-200" />
              <p className="text-sm text-gray-400">الصفحة فارغة — اختر بلوك من اليسار</p>
              <button onClick={() => addBlock("hero")} className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
                <Plus className="w-4 h-4" /> ابدأ بـ Hero
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Page title bar */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                <span className="text-sm font-semibold text-gray-700">{selectedPage?.title}</span>
                <div className="flex items-center gap-1.5">
                  {selectedPage?.isPublished ? (
                    <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-semibold">منشورة</span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-semibold">مسودة</span>
                  )}
                </div>
              </div>

              {blocks.map((block, idx) => (
                <div
                  key={block.id || idx}
                  onClick={() => !preview && setSelectedBlockIdx(idx)}
                  className={clsx(
                    "rounded-xl transition-all cursor-pointer overflow-hidden",
                    !preview && "border-2",
                    !preview && idx === selectedBlockIdx ? "border-brand-300 shadow-sm shadow-brand-100" : "border-transparent hover:border-gray-200"
                  )}
                >
                  {/* Controls */}
                  {!preview && idx === selectedBlockIdx && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-brand-50 border-b border-brand-100">
                      <span className="text-xs font-semibold text-brand-600">{blockLabel(block.type)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, -1); }} disabled={idx === 0} className="p-1 rounded hover:bg-brand-100 text-brand-400 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, 1); }} disabled={idx === blocks.length - 1} className="p-1 rounded hover:bg-brand-100 text-brand-400 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); removeBlock(idx); }} className="p-1 rounded hover:bg-red-100 text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  )}
                  <BlockPreview block={block} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Block settings */}
        {!preview && selectedBlockIdx !== null && blocks[selectedBlockIdx] && (
          <div className="w-64 shrink-0 bg-white rounded-2xl border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-brand-500" />
                <span className="text-sm font-semibold text-gray-700">{blockLabel(blocks[selectedBlockIdx].type)}</span>
              </div>
              <button onClick={() => setSelectedBlockIdx(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <BlockEditor
                block={blocks[selectedBlockIdx]}
                onChange={(content) => updateBlockContent(selectedBlockIdx, content)}
              />
            </div>
          </div>
        )}
      </div>

      {/* New page modal */}
      <Modal
        open={showNewPage}
        onClose={() => setShowNewPage(false)}
        title="صفحة جديدة"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewPage(false)}>إلغاء</Button>
            <Button onClick={handleCreatePage} loading={creating} icon={Plus}>إنشاء</Button>
          </>
        }
      >
        <Input label="عنوان الصفحة" name="title" value={newPageTitle} onChange={(e) => setNewPageTitle(e.target.value)} placeholder="عن النشاط" required />
      </Modal>
    </div>
  );
}
