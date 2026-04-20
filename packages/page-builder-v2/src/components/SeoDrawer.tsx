/**
 * SeoDrawer — Day 18 SEO Management Panel
 *
 * A right-side (start in RTL) drawer that opens from the page editor.
 * Three tabs: SEO | Social | Advanced
 *
 * Aesthetic: "Clinical Editorial" — information-dense but sharply organised.
 * Dark sidebar with crisp white content panels. Monospace character counters.
 * Color-coded bar indicators (green/amber/red) for field completeness.
 *
 * RTL, IBM Plex Sans Arabic, Brand #5b9bd5.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  X, Search, Share2, Settings2, CheckCircle2, AlertTriangle, Info,
  ChevronDown, ExternalLink, RefreshCw,
} from "lucide-react";
import { arabicToSlug, validateSlug, getSeoWarnings, truncateForSerp, buildRobotsContent } from "../utils/seo-utils";
import type { SeoWarning } from "../utils/seo-utils";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SeoFields {
  metaTitle:    string;
  metaDescription: string;
  ogImage:      string;
  canonicalUrl: string;
  schemaType:   string;
  robotsIndex:  boolean;
  robotsFollow: boolean;
  slug:         string;
}

export interface SeoDrawerProps {
  open:          boolean;
  pageTitle:     string;
  pageSlug:      string;
  siteUrl?:      string;
  initialFields: Partial<SeoFields>;
  onSave:        (fields: SeoFields) => Promise<void>;
  onSlugCheck?:  (slug: string) => Promise<{ available: boolean; suggestion?: string }>;
  onClose:       () => void;
}

type Tab = "seo" | "social" | "advanced";

const SCHEMA_TYPES = [
  { value: "",             label: "لا يوجد" },
  { value: "Article",      label: "مقال (Article)" },
  { value: "Product",      label: "منتج (Product)" },
  { value: "Service",      label: "خدمة (Service)" },
  { value: "Organization", label: "مؤسسة (Organization)" },
];

// ── Character Counter Bar ──────────────────────────────────────────────────

interface CharCounterProps {
  value: string;
  min: number;
  max: number;
  label: string;
}

function CharCounter({ value, min, max, label }: CharCounterProps) {
  const len = value.length;
  const pct = Math.min(100, (len / max) * 100);
  const color =
    len === 0    ? "#e5e7eb" :
    len < min    ? "#f59e0b" :
    len > max    ? "#ef4444" :
                   "#22c55e";

  return (
    <div className="mt-1.5" data-char-counter="">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span
          className="text-xs font-mono font-semibold"
          style={{ color: len === 0 ? "#9ca3af" : color }}
          data-char-count=""
        >
          {len}/{max}
        </span>
      </div>
      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── SERP Preview ──────────────────────────────────────────────────────────

interface SerpPreviewProps {
  title: string;
  url: string;
  description: string;
}

function SerpPreview({ title, url, description }: SerpPreviewProps) {
  const displayTitle = truncateForSerp(title || "عنوان الصفحة", 60);
  const displayDesc  = truncateForSerp(description || "أضف وصفاً لصفحتك ليظهر في نتائج البحث.", 160);

  return (
    <div data-serp-preview="" className="rounded-xl border border-gray-100 bg-white p-4 font-sans" dir="ltr">
      <p className="text-xs text-gray-400 mb-3 font-mono" style={{ fontFamily: "monospace" }}>
        Google SERP Preview
      </p>
      {/* URL breadcrumb */}
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-4 h-4 rounded-sm bg-gray-200" />
        <span className="text-xs text-gray-600 truncate">{url || "yoursite.com/page-slug"}</span>
        <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
      </div>
      {/* Title */}
      <p
        className="text-base font-normal mb-0.5 truncate"
        style={{ color: "#1a0dab", fontFamily: "Arial, sans-serif", fontSize: "18px", lineHeight: "1.3" }}
      >
        {displayTitle}
      </p>
      {/* Description */}
      <p
        className="text-sm leading-snug"
        style={{ color: "#4d5156", fontFamily: "Arial, sans-serif", fontSize: "13px", lineHeight: "1.5" }}
      >
        {displayDesc}
      </p>
    </div>
  );
}

// ── OG Social Preview ──────────────────────────────────────────────────────

interface OgPreviewProps {
  title: string;
  description: string;
  image: string;
  url: string;
}

function OgPreview({ title, description, image, url }: OgPreviewProps) {
  const displayTitle = truncateForSerp(title || "عنوان الصفحة", 60);
  const displayDesc  = truncateForSerp(description || "وصف الصفحة على وسائل التواصل الاجتماعي.", 125);
  const domain = url ? url.replace(/^https?:\/\//, "").split("/")[0] : "yoursite.com";

  return (
    <div data-og-preview="" className="rounded-xl overflow-hidden border border-gray-100 bg-white" dir="ltr">
      <p className="text-xs text-gray-400 px-4 pt-3 pb-2 font-mono" style={{ fontFamily: "monospace" }}>
        Facebook / OG Preview
      </p>
      {/* Image area */}
      <div
        className="w-full bg-gray-100 flex items-center justify-center"
        style={{ height: "180px" }}
      >
        {image ? (
          <img
            src={image}
            alt="OG"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Share2 className="w-8 h-8 text-gray-300" />
            <span className="text-xs text-gray-400">لا توجد صورة OG</span>
          </div>
        )}
      </div>
      {/* Text */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs uppercase text-gray-400 mb-1 tracking-wider">{domain}</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{displayTitle}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{displayDesc}</p>
      </div>
    </div>
  );
}

// ── Warning Badge ─────────────────────────────────────────────────────────

function WarningBadge({ warning }: { warning: SeoWarning }) {
  const color = warning.type === "error" ? "text-red-600 bg-red-50" :
                warning.type === "warning" ? "text-amber-700 bg-amber-50" :
                "text-blue-600 bg-blue-50";
  const Icon = warning.type === "error" ? AlertTriangle :
               warning.type === "warning" ? AlertTriangle : Info;

  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${color}`} data-seo-warning="">
      <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>{warning.message}</span>
    </div>
  );
}

// ── Main SeoDrawer ────────────────────────────────────────────────────────

export function SeoDrawer({
  open,
  pageTitle,
  pageSlug,
  siteUrl = "yoursite.com",
  initialFields,
  onSave,
  onSlugCheck,
  onClose,
}: SeoDrawerProps) {
  const [tab, setTab] = useState<Tab>("seo");
  const [saving, setSaving] = useState(false);

  // Form state
  const [fields, setFields] = useState<SeoFields>({
    metaTitle:       initialFields.metaTitle    ?? pageTitle ?? "",
    metaDescription: initialFields.metaDescription ?? "",
    ogImage:         initialFields.ogImage      ?? "",
    canonicalUrl:    initialFields.canonicalUrl ?? "",
    schemaType:      initialFields.schemaType   ?? "",
    robotsIndex:     initialFields.robotsIndex  ?? true,
    robotsFollow:    initialFields.robotsFollow ?? true,
    slug:            initialFields.slug         ?? pageSlug ?? "",
  });

  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [slugSuggestion, setSlugSuggestion] = useState<string>("");
  const [slugErrors, setSlugErrors] = useState<string[]>([]);

  // Sync initialFields when they change (e.g. page reloads)
  useEffect(() => {
    setFields({
      metaTitle:       initialFields.metaTitle    ?? pageTitle ?? "",
      metaDescription: initialFields.metaDescription ?? "",
      ogImage:         initialFields.ogImage      ?? "",
      canonicalUrl:    initialFields.canonicalUrl ?? "",
      schemaType:      initialFields.schemaType   ?? "",
      robotsIndex:     initialFields.robotsIndex  ?? true,
      robotsFollow:    initialFields.robotsFollow ?? true,
      slug:            initialFields.slug         ?? pageSlug ?? "",
    });
    setSlugStatus("idle");
    setSlugErrors([]);
  }, [open]); // reset on drawer open

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const set = useCallback(<K extends keyof SeoFields>(key: K, value: SeoFields[K]) => {
    setFields(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSlugChange = useCallback((val: string) => {
    const raw = val.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    set("slug", raw);
    const errs = validateSlug(raw);
    setSlugErrors(errs);
    setSlugStatus("idle");
    setSlugSuggestion("");
  }, [set]);

  const handleSlugBlur = useCallback(async () => {
    if (!onSlugCheck || !fields.slug || slugErrors.length > 0) return;
    setSlugStatus("checking");
    try {
      const res = await onSlugCheck(fields.slug);
      if (res.available) {
        setSlugStatus("ok");
      } else {
        setSlugStatus("taken");
        setSlugSuggestion(res.suggestion ?? "");
      }
    } catch {
      setSlugStatus("idle");
    }
  }, [onSlugCheck, fields.slug, slugErrors]);

  const autoGenerateSlug = useCallback(() => {
    const generated = arabicToSlug(fields.metaTitle || pageTitle || "page");
    set("slug", generated || pageSlug);
    setSlugErrors(validateSlug(generated || pageSlug));
    setSlugStatus("idle");
  }, [fields.metaTitle, pageTitle, pageSlug, set]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(fields);
    } finally {
      setSaving(false);
    }
  }, [fields, onSave]);

  const warnings = getSeoWarnings({
    title:       fields.metaTitle,
    description: fields.metaDescription,
    ogImage:     fields.ogImage,
  });

  const pageUrl = `${siteUrl}/pages/${fields.slug || pageSlug}`;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        data-seo-backdrop=""
      />

      {/* Drawer */}
      <div
        dir="rtl"
        data-seo-drawer=""
        className="fixed top-0 start-0 bottom-0 z-50 flex flex-col bg-white shadow-2xl"
        style={{
          width: "420px",
          fontFamily: "'IBM Plex Sans Arabic', sans-serif",
          borderInlineEnd: "1px solid #e5e7eb",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
          style={{ background: "#0D2138" }}
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-[#5b9bd5]" />
            <span className="text-sm font-bold text-white">إعدادات SEO</span>
            {warnings.length > 0 && (
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                style={{ background: warnings.some(w => w.type === "error") ? "#ef4444" : "#f59e0b", color: "#fff" }}
                data-warning-count=""
              >
                {warnings.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "#9ca3af" }}
            aria-label="إغلاق"
            data-seo-close=""
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-gray-100 bg-gray-50/80">
          {([
            { key: "seo",      label: "SEO",     icon: <Search   className="w-3.5 h-3.5" /> },
            { key: "social",   label: "Social",  icon: <Share2   className="w-3.5 h-3.5" /> },
            { key: "advanced", label: "متقدم",   icon: <Settings2 className="w-3.5 h-3.5" /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-seo-tab={t.key}
              className={`flex items-center gap-1.5 flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${
                tab === t.key
                  ? "border-[#5b9bd5] text-[#5b9bd5] bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" data-seo-content="">

          {/* ── SEO Tab ───────────────────────────────────────── */}
          {tab === "seo" && (
            <>
              {/* SEO Title */}
              <div data-seo-section="title">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  عنوان الصفحة (SEO Title)
                </label>
                <input
                  type="text"
                  value={fields.metaTitle}
                  onChange={(e) => set("metaTitle", e.target.value)}
                  placeholder={pageTitle || "أدخل عنوان SEO..."}
                  maxLength={70}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": "#5b9bd5" } as React.CSSProperties}
                  data-seo-title-input=""
                />
                <CharCounter value={fields.metaTitle} min={30} max={60} label="مثالي: 30–60 حرف" />
              </div>

              {/* Meta Description */}
              <div data-seo-section="description">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  وصف الصفحة (Meta Description)
                </label>
                <textarea
                  value={fields.metaDescription}
                  onChange={(e) => set("metaDescription", e.target.value)}
                  placeholder="أدخل وصفاً مختصراً يظهر في نتائج البحث..."
                  maxLength={200}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 resize-none"
                  style={{ "--tw-ring-color": "#5b9bd5" } as React.CSSProperties}
                  data-seo-desc-input=""
                />
                <CharCounter value={fields.metaDescription} min={120} max={160} label="مثالي: 120–160 حرف" />
              </div>

              {/* Warnings */}
              {warnings.filter(w => w.field === "title" || w.field === "description").length > 0 && (
                <div className="space-y-1.5">
                  {warnings
                    .filter(w => w.field === "title" || w.field === "description")
                    .map((w, i) => <WarningBadge key={i} warning={w} />)}
                </div>
              )}

              {/* SERP Preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">معاينة نتيجة البحث</p>
                <SerpPreview
                  title={fields.metaTitle || pageTitle}
                  url={pageUrl}
                  description={fields.metaDescription}
                />
              </div>
            </>
          )}

          {/* ── Social Tab ─────────────────────────────────────── */}
          {tab === "social" && (
            <>
              <div data-seo-section="og-image">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  صورة المشاركة (OG Image)
                </label>
                <input
                  type="url"
                  value={fields.ogImage}
                  onChange={(e) => set("ogImage", e.target.value)}
                  placeholder="https://yoursite.com/og-image.jpg"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 font-mono"
                  style={{
                    "--tw-ring-color": "#5b9bd5",
                    direction: "ltr",
                    textAlign: "left",
                  } as React.CSSProperties}
                  data-og-image-input=""
                  dir="ltr"
                />
                <p className="mt-1 text-xs text-gray-400">الحجم المثالي: 1200×630 بيكسل</p>
              </div>

              {warnings.filter(w => w.field === "ogImage").length > 0 && (
                <div className="space-y-1.5">
                  {warnings.filter(w => w.field === "ogImage").map((w, i) => (
                    <WarningBadge key={i} warning={w} />
                  ))}
                </div>
              )}

              {/* OG Preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">معاينة وسائل التواصل</p>
                <OgPreview
                  title={fields.metaTitle || pageTitle}
                  description={fields.metaDescription}
                  image={fields.ogImage}
                  url={pageUrl}
                />
              </div>
            </>
          )}

          {/* ── Advanced Tab ──────────────────────────────────── */}
          {tab === "advanced" && (
            <>
              {/* Slug Editor */}
              <div data-seo-section="slug">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  رابط الصفحة (Slug)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fields.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    onBlur={handleSlugBlur}
                    placeholder="page-slug"
                    className="w-full rounded-xl border px-3 py-2.5 pe-10 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2"
                    style={{
                      "--tw-ring-color": "#5b9bd5",
                      direction: "ltr",
                      borderColor: slugStatus === "taken" ? "#ef4444" : slugStatus === "ok" ? "#22c55e" : "#e5e7eb",
                    } as React.CSSProperties}
                    dir="ltr"
                    data-slug-input=""
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 end-3">
                    {slugStatus === "checking" && (
                      <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                    )}
                    {slugStatus === "ok" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" data-slug-ok="" />
                    )}
                    {slugStatus === "taken" && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" data-slug-taken="" />
                    )}
                  </div>
                </div>

                {/* Preview URL */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-400 font-mono truncate" dir="ltr">
                    {siteUrl}/pages/{fields.slug || "..."}
                  </span>
                </div>

                {/* Auto-generate button */}
                <button
                  onClick={autoGenerateSlug}
                  className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#5b9bd5] hover:text-[#5b9bd5] transition-colors"
                  data-auto-slug=""
                >
                  توليد تلقائي من العنوان
                </button>

                {/* Validation errors */}
                {slugErrors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {slugErrors.map((err, i) => (
                      <p key={i} className="text-xs text-red-500" data-slug-error="">{err}</p>
                    ))}
                  </div>
                )}

                {/* Slug taken suggestion */}
                {slugStatus === "taken" && slugSuggestion && (
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs text-red-500">هذا الرابط مستخدم بالفعل.</p>
                    <button
                      onClick={() => { set("slug", slugSuggestion); setSlugStatus("idle"); }}
                      className="text-xs font-semibold underline"
                      style={{ color: "#5b9bd5" }}
                      data-use-suggestion=""
                    >
                      استخدم: {slugSuggestion}
                    </button>
                  </div>
                )}
              </div>

              {/* Canonical URL */}
              <div data-seo-section="canonical">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Canonical URL
                </label>
                <input
                  type="url"
                  value={fields.canonicalUrl}
                  onChange={(e) => set("canonicalUrl", e.target.value)}
                  placeholder="https://yoursite.com/pages/my-page"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2"
                  style={{
                    "--tw-ring-color": "#5b9bd5",
                    direction: "ltr",
                  } as React.CSSProperties}
                  dir="ltr"
                  data-canonical-input=""
                />
                <p className="mt-1 text-xs text-gray-400">اتركه فارغاً لاستخدام رابط الصفحة الافتراضي</p>
              </div>

              {/* Schema Type */}
              <div data-seo-section="schema">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  نوع Schema Markup
                </label>
                <div className="relative">
                  <select
                    value={fields.schemaType}
                    onChange={(e) => set("schemaType", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 pe-8 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 appearance-none bg-white"
                    style={{ "--tw-ring-color": "#5b9bd5" } as React.CSSProperties}
                    data-schema-select=""
                  >
                    {SCHEMA_TYPES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Robots */}
              <div data-seo-section="robots">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Robots
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fields.robotsIndex}
                      onChange={(e) => set("robotsIndex", e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: "#5b9bd5" }}
                      data-robots-index=""
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-800">
                        {fields.robotsIndex ? "index" : "noindex"} — السماح بالفهرسة
                      </p>
                      <p className="text-xs text-gray-400">محركات البحث تفهرس هذه الصفحة</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fields.robotsFollow}
                      onChange={(e) => set("robotsFollow", e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: "#5b9bd5" }}
                      data-robots-follow=""
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-800">
                        {fields.robotsFollow ? "follow" : "nofollow"} — متابعة الروابط
                      </p>
                      <p className="text-xs text-gray-400">محركات البحث تتبع روابط هذه الصفحة</p>
                    </div>
                  </label>
                </div>
                {/* Robots preview */}
                <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                  <p className="text-xs text-gray-500 mb-0.5">القيمة المُولَّدة:</p>
                  <p className="text-xs font-mono text-gray-800" data-robots-preview="">
                    {buildRobotsContent(fields.robotsIndex, fields.robotsFollow)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between bg-gray-50/80">
          {/* Overall SEO health */}
          <div className="flex items-center gap-2">
            {warnings.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <span className="text-xs text-gray-600">
              {warnings.length === 0
                ? "إعدادات SEO مكتملة"
                : `${warnings.length} ${warnings.length === 1 ? "تحذير" : "تحذيرات"}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              إغلاق
            </button>
            <button
              onClick={handleSave}
              disabled={saving || slugErrors.length > 0}
              className="px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "#5b9bd5" }}
              data-seo-save=""
            >
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
