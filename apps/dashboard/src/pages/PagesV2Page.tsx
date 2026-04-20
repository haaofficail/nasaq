/**
 * PagesV2Page — إدارة الصفحات (Page Builder v2)
 *
 * Views:
 *   - list: قائمة الصفحات مع حالة كل صفحة
 *   - editor: محرر Puck (create / edit)
 *
 * RTL, IBM Plex Sans Arabic, Brand Kit #5b9bd5
 * No emojis. Skeleton + error + empty + data states.
 */

import { useState, useCallback, useEffect } from "react";
import { PuckEditor } from "@nasaq/page-builder-v2";
import type { PuckData } from "@nasaq/page-builder-v2";
import { pagesV2Api } from "@/lib/api";
import type { PageV2Summary, PageV2Full } from "@/lib/api";
import { Plus, Globe, FileText, Archive, ChevronLeft } from "lucide-react";
import { toast } from "@/hooks/useToast";

// ── Helpers ────────────────────────────────────────────────────────────────

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

const STATUS_LABEL: Record<PageV2Summary["status"], string> = {
  draft: "مسودة",
  published: "منشورة",
  archived: "مؤرشفة",
};

const STATUS_COLORS: Record<PageV2Summary["status"], string> = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 animate-pulse">
      <div className="h-4 w-40 bg-gray-100 rounded-md" />
      <div className="h-4 w-20 bg-gray-100 rounded-full ms-auto" />
      <div className="h-4 w-16 bg-gray-100 rounded-md" />
    </div>
  );
}

// ── New Page Dialog ────────────────────────────────────────────────────────

interface NewPageDialogProps {
  onConfirm: (title: string) => void;
  onCancel: () => void;
  saving: boolean;
}

function NewPageDialog({ onConfirm, onCancel, saving }: NewPageDialogProps) {
  const [title, setTitle] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8"
        style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-2">صفحة جديدة</h2>
        <p className="text-sm text-gray-500 mb-6">أدخل عنواناً للصفحة الجديدة.</p>

        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          عنوان الصفحة
        </label>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) onConfirm(title.trim()); }}
          placeholder="مثال: الرئيسية"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 text-gray-900"
          style={{ "--tw-ring-color": "#5b9bd5" } as React.CSSProperties}
        />

        {title.trim() && (
          <p className="mt-2 text-xs text-gray-400">
            الرابط: <span className="font-mono text-gray-600">/{titleToSlug(title.trim())}</span>
          </p>
        )}

        <div className="flex gap-3 mt-8 justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={() => { if (title.trim()) onConfirm(title.trim()); }}
            disabled={!title.trim() || saving}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50"
            style={{ background: "#5b9bd5" }}
          >
            {saving ? "جاري الإنشاء..." : "إنشاء وفتح المحرر"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── List View ──────────────────────────────────────────────────────────────

interface ListViewProps {
  pages: PageV2Summary[];
  loading: boolean;
  error: string | null;
  onNewPage: () => void;
  onEdit: (page: PageV2Summary) => void;
}

function ListView({ pages, loading, error, onNewPage, onEdit }: ListViewProps) {
  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الصفحات</h1>
          <p className="text-sm text-gray-500 mt-0.5">أنشئ وعدّل صفحات موقعك بالمحرر المرئي</p>
        </div>
        <button
          onClick={onNewPage}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "#5b9bd5" }}
        >
          <Plus className="w-4 h-4" />
          صفحة جديدة
        </button>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Loading */}
        {loading && (
          <div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <Archive className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">تعذّر تحميل الصفحات</p>
            <p className="text-xs text-gray-400">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && pages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "color-mix(in srgb, #5b9bd5 10%, transparent)" }}
            >
              <FileText className="w-7 h-7" style={{ color: "#5b9bd5" }} />
            </div>
            <p className="text-base font-semibold text-gray-800 mb-1">لا توجد صفحات بعد</p>
            <p className="text-sm text-gray-500 mb-6">أنشئ أول صفحة لموقعك الآن</p>
            <button
              onClick={onNewPage}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl"
              style={{ background: "#5b9bd5" }}
            >
              <Plus className="w-4 h-4" />
              صفحة جديدة
            </button>
          </div>
        )}

        {/* Data */}
        {!loading && !error && pages.length > 0 && (
          <>
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
              <span>الصفحة</span>
              <span>الحالة</span>
              <span>آخر تعديل</span>
              <span />
            </div>
            {pages.map((page) => (
              <div
                key={page.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-4 border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer group last:border-0"
                onClick={() => onEdit(page)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "color-mix(in srgb, #5b9bd5 10%, transparent)" }}
                  >
                    <Globe className="w-4 h-4" style={{ color: "#5b9bd5" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{page.title}</p>
                    <p className="text-xs text-gray-400 truncate font-mono">/{page.slug}</p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[page.status]}`}
                >
                  {STATUS_LABEL[page.status]}
                </span>

                <span className="text-xs text-gray-400">{formatDate(page.updatedAt)}</span>

                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(page); }}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity hover:border-[#5b9bd5] hover:text-[#5b9bd5]"
                >
                  تعديل
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Editor Wrapper ─────────────────────────────────────────────────────────

interface EditorViewProps {
  page: PageV2Full;
  onBack: () => void;
  onSaved: () => void;
}

function EditorView({ page, onBack, onSaved }: EditorViewProps) {
  const [publishing, setPublishing] = useState(false);

  const handleSave = useCallback(async (data: PuckData) => {
    try {
      await pagesV2Api.update(page.id, { draftData: data });
      toast.success("تم حفظ المسودة");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الحفظ");
    }
  }, [page.id, onSaved]);

  const handlePublish = useCallback(async (data: PuckData) => {
    // Save draft first, then publish
    try {
      await pagesV2Api.update(page.id, { draftData: data });
      setPublishing(true);
      await pagesV2Api.publish(page.id);
      toast.success("تم نشر الصفحة");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل النشر");
    } finally {
      setPublishing(false);
    }
  }, [page.id, onSaved]);

  const initialData = (page.draftData ?? page.publishedData ?? { content: [], root: { props: { title: page.title, description: "" } } }) as Partial<PuckData>;

  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }} className="flex flex-col h-full">
      {/* Editor Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 rotate-180" />
          الصفحات
        </button>

        <span className="text-gray-200">|</span>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-900 truncate">{page.title}</span>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[page.status]}`}>
            {STATUS_LABEL[page.status]}
          </span>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <button
            onClick={() => handlePublish(initialData as PuckData)}
            disabled={publishing}
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#5b9bd5" }}
          >
            {publishing ? "جاري النشر..." : "نشر"}
          </button>
        </div>
      </div>

      {/* Puck Editor — fills remaining height */}
      <div className="flex-1 overflow-hidden" data-testid="puck-editor">
        <PuckEditor
          initialData={initialData}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type View =
  | { mode: "list" }
  | { mode: "editor"; page: PageV2Full };

export function PagesV2Page() {
  const [view, setView] = useState<View>({ mode: "list" });
  const [pages, setPages] = useState<PageV2Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [listKey, setListKey] = useState(0); // increment to refresh list

  // Load list
  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pagesV2Api.list();
      setPages(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر التحميل");
    } finally {
      setLoading(false);
    }
  }, [listKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadPages(); }, [listKey]);

  const handleNewPage = useCallback(async (title: string) => {
    setCreating(true);
    try {
      const slug = titleToSlug(title);
      const res = await pagesV2Api.create({ title, slug, pageType: "custom" });
      setShowNewDialog(false);
      setView({ mode: "editor", page: res.data });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الإنشاء");
    } finally {
      setCreating(false);
    }
  }, []);

  const handleEdit = useCallback(async (summary: PageV2Summary) => {
    try {
      const res = await pagesV2Api.get(summary.id);
      setView({ mode: "editor", page: res.data });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر فتح الصفحة");
    }
  }, []);

  const handleBack = useCallback(() => {
    setView({ mode: "list" });
    setListKey((k) => k + 1);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  if (view.mode === "editor") {
    return (
      <EditorView
        page={view.page}
        onBack={handleBack}
        onSaved={handleBack}
      />
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <ListView
        pages={pages}
        loading={loading}
        error={error}
        onNewPage={() => setShowNewDialog(true)}
        onEdit={handleEdit}
      />

      {showNewDialog && (
        <NewPageDialog
          onConfirm={handleNewPage}
          onCancel={() => setShowNewDialog(false)}
          saving={creating}
        />
      )}
    </div>
  );
}
