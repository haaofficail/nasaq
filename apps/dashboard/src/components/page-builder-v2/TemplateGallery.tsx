/**
 * TemplateGallery — معرض قوالب صفحات Page Builder v2
 *
 * يُعرض داخل Dialog عند إنشاء صفحة جديدة.
 * يجلب القوالب من /api/v2/page-templates ويعرضها كـ cards مع فلتر بالفئة.
 * عند النقر: POST /api/v2/page-templates/:slug/use → redirect للمحرر.
 *
 * RTL, IBM Plex Sans Arabic, Brand #5b9bd5
 * لا emoji, Tailwind فقط
 */

import { useState, useEffect } from "react";
import { X, Loader2, ImageOff, ChevronDown } from "lucide-react";
import { pageTemplatesApi } from "@/lib/api";
import type { PageTemplateItem } from "@/lib/api";
import { toast } from "@/hooks/useToast";


// ── تصنيفات القوالب ──────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  all: "الكل",
  restaurant: "مطاعم",
  cafe: "مقاهي",
  salon: "صالونات",
  barber: "حلاقة",
  spa: "سبا",
  fitness: "لياقة",
  clinic: "عيادات",
  education: "تعليم",
  school: "مدارس",
  "real-estate": "عقارات",
  real_estate: "عقارات",
  hotel: "فنادق",
  "car-rental": "تأجير سيارات",
  car_rental: "تأجير سيارات",
  events: "فعاليات",
  event_organizer: "تنظيم فعاليات",
  flower_shop: "محلات الورد",
  bakery: "مخابز",
  catering: "تموين وضيافة",
  retail: "متاجر",
  rental: "تأجير",
  photography: "تصوير",
  maintenance: "صيانة",
  workshop: "ورش",
  laundry: "مغاسل",
  printing: "طباعة",
  logistics: "شحن ولوجستيات",
  construction: "مقاولات",
  digital_services: "خدمات رقمية",
  technology: "تقنية",
  general: "عام",
};

// ── نموذج البيانات ──────────────────────────────────────────

function titleToSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "page"
  );
}

// ── Props ───────────────────────────────────────────────────

export interface TemplateGalleryProps {
  onUse: (pageId: string) => void;
  onCancel: () => void;
}

// ── Card ─────────────────────────────────────────────────────

function TemplateCard({
  template,
  onUse,
}: {
  template: PageTemplateItem;
  onUse: (template: PageTemplateItem) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-gray-100 overflow-hidden bg-white hover:shadow-lg hover:border-[#5b9bd5]/30 transition-all duration-200"
    >
      {/* صورة المعاينة */}
      <div className="relative overflow-hidden bg-gray-50" style={{ paddingBottom: "60%" }}>
        {!imgError && template.previewImageUrl ? (
          <img
            src={template.previewImageUrl}
            alt={template.nameAr}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <ImageOff className="w-8 h-8" />
          </div>
        )}

        {/* Featured badge */}
        {template.isFeatured && (
          <span className="absolute top-2 end-2 px-2 py-0.5 text-xs font-semibold text-white rounded-full"
            style={{ background: "#5b9bd5" }}
          >
            مميز
          </span>
        )}
      </div>

      {/* المحتوى */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-900 leading-tight">{template.nameAr}</h3>
          <span className="shrink-0 text-xs text-gray-400 bg-gray-50 rounded-full px-2 py-0.5 border border-gray-100">
            {CATEGORY_LABELS[template.category] ?? template.category}
          </span>
        </div>

        {template.descriptionAr && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{template.descriptionAr}</p>
        )}

        {/* استخدام القالب */}
        <button
          onClick={() => onUse(template)}
          className="mt-auto w-full py-2 px-4 text-sm font-semibold text-white rounded-xl transition-colors"
          style={{ background: "#5b9bd5" }}
        >
          استخدم هذا القالب
        </button>
      </div>
    </div>
  );
}

// ── Confirm + Form Dialog ───────────────────────────────────

interface ConfirmUseProps {
  template: PageTemplateItem;
  saving: boolean;
  onConfirm: (title: string, slug: string) => void;
  onBack: () => void;
}

function ConfirmUseDialog({ template, saving, onConfirm, onBack }: ConfirmUseProps) {
  const [title, setTitle] = useState(template.nameAr);
  const [slug, setSlug] = useState(() => titleToSlug(template.nameAr));
  const [slugTouched, setSlugTouched] = useState(false);

  // auto-sync slug from title unless manually touched
  useEffect(() => {
    if (!slugTouched) {
      setSlug(titleToSlug(title));
    }
  }, [title, slugTouched]);

  const slugValid = /^[a-z0-9-]+$/.test(slug) && slug.length > 0;

  return (
    <div
      dir="rtl"
      className="flex flex-col gap-5"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      <div>
        <h3 className="text-base font-bold text-gray-900">تفاصيل الصفحة الجديدة</h3>
        <p className="text-sm text-gray-500 mt-1">
          سيتم إنشاء صفحة جديدة من قالب <span className="font-medium text-gray-700">{template.nameAr}</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">عنوان الصفحة</label>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: الصفحة الرئيسية"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b9bd5] text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">رابط الصفحة</label>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#5b9bd5]">
          <span className="text-sm text-gray-400 shrink-0">/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              setSlugTouched(true);
            }}
            placeholder="page-slug"
            className="flex-1 text-sm font-mono text-gray-700 focus:outline-none bg-transparent"
          />
        </div>
        {!slugValid && slug.length > 0 && (
          <p className="text-xs text-red-500 mt-1">الرابط يقبل أحرف إنجليزية صغيرة وأرقام وشرطة فقط</p>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={onBack}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          رجوع
        </button>
        <button
          onClick={() => onConfirm(title.trim(), slug)}
          disabled={!title.trim() || !slugValid || saving}
          className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50"
          style={{ background: "#5b9bd5" }}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري الإنشاء...
            </span>
          ) : "إنشاء وفتح المحرر"}
        </button>
      </div>
    </div>
  );
}

// ── Main Gallery ─────────────────────────────────────────────

export function TemplateGallery({ onUse, onCancel }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<PageTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplateItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    pageTemplatesApi
      .list()
      .then((res) => {
        if (!cancelled) setTemplates(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("تعذر تحميل القوالب — حاول مرة أخرى");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered =
    category === "all" ? templates : templates.filter((t) => t.category === category);

  const categories = [
    "all",
    ...Array.from(new Set(templates.map((t) => t.category))).sort(),
  ];

  async function handleUse(title: string, slug: string) {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      const res = await pageTemplatesApi.use(selectedTemplate.slug, {
        title,
        slug,
        pageType: "home",
        showInNavigation: true,
      });
      toast.success(res.data.message);
      onUse(res.data.pageId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^\[HTTP_\d+\] /, "") : "حدث خطأ";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        dir="rtl"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden"
        style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {selectedTemplate ? "تفاصيل الصفحة" : "اختر قالباً"}
            </h2>
            {!selectedTemplate && (
              <p className="text-sm text-gray-500 mt-0.5">
                {templates.length > 0 ? `${templates.length} قالب جاهز` : ""}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {selectedTemplate ? (
            <ConfirmUseDialog
              template={selectedTemplate}
              saving={saving}
              onConfirm={handleUse}
              onBack={() => setSelectedTemplate(null)}
            />
          ) : (
            <>
              {/* فلتر الفئات */}
              {!loading && !error && templates.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                        category === cat
                          ? "text-white border-transparent"
                          : "text-gray-600 border-gray-200 hover:border-[#5b9bd5] hover:text-[#5b9bd5]"
                      }`}
                      style={category === cat ? { background: "#5b9bd5" } : undefined}
                    >
                      {CATEGORY_LABELS[cat] ?? cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin me-2" />
                  <span className="text-sm">جاري التحميل...</span>
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div className="text-center py-12">
                  <p className="text-sm text-red-500 mb-3">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-[#5b9bd5] hover:underline"
                  >
                    أعد المحاولة
                  </button>
                </div>
              )}

              {/* Grid */}
              {!loading && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((t) => (
                    <TemplateCard
                      key={t.slug}
                      template={t}
                      onUse={(tmpl) => setSelectedTemplate(tmpl)}
                    />
                  ))}
                </div>
              )}

              {!loading && !error && filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-12">
                  لا توجد قوالب في هذه الفئة
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
