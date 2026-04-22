/**
 * PagesV2Page — إدارة الصفحات (Page Builder v2)
 * Day 17: قائمة الصفحات + محرر
 * Day 18: SEO Drawer + Slug Validation
 * Day 19: Auto-save + Publish Flow
 *
 * RTL, IBM Plex Sans Arabic, Brand Kit #5b9bd5
 * No emojis. Skeleton + error + empty + data states.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { PuckEditor, SeoDrawer, useAutoSave, diffVersions, summarizeVersionDiff, formatRelativeTime, getChangeTypeLabel, PuckRender, puckConfig, computePageStatusBadge, formatSaveStatus } from "@nasaq/page-builder-v2";
import type { PuckData, SeoDrawerFields, SaveStatus, PageBadgeStatus, BlockDiff, ChangeType } from "@nasaq/page-builder-v2";
import { pagesV2Api } from "@/lib/api";
import type { PageV2Summary, PageV2Full } from "@/lib/api";
import { TemplateGallery } from "@/components/page-builder-v2/TemplateGallery";
import {
  Plus, Globe, FileText, Archive, ChevronLeft, Search,
  MoreVertical, Pencil, Copy, Trash2, RotateCcw, X,
  ChevronDown, ArrowUpDown, Loader2, Calendar, History,
  Eye, GitCompare, CornerUpLeft, Plus as PlusIcon,
} from "lucide-react";
import { toast } from "@/hooks/useToast";
import {
  filterPagesBySearch,
  paginatePages,
  sortPages,
  getPageStatusActions,
} from "@nasaq/page-builder-v2";
import type { SortOption } from "@nasaq/page-builder-v2";

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

// ── Editor badge (4 states derived from content comparison) ───────────────
const BADGE_LABEL: Record<PageBadgeStatus, string> = {
  draft:     "مسودة",
  published: "منشورة",
  modified:  "منشورة مع تعديلات",
  archived:  "مؤرشفة",
};

const BADGE_COLORS: Record<PageBadgeStatus, string> = {
  draft:     "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  modified:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  archived:  "bg-gray-100 text-gray-500 border-gray-200",
};

// ── Save indicator style ──────────────────────────────────────────────────
const SAVE_STATUS_COLORS: Record<SaveStatus, string> = {
  idle:     "text-gray-400",
  unsaved:  "text-gray-500",
  saving:   "text-[#5b9bd5]",
  saved:    "text-emerald-600",
  error:    "text-red-500",
  conflict: "text-orange-500",
};

const PAGE_LIMIT = 20;

const SORT_LABELS: Record<SortOption, string> = {
  updated_desc: "آخر تعديل (الأحدث)",
  updated_asc:  "آخر تعديل (الأقدم)",
  title_asc:    "الاسم أ → ي",
  sort_order:   "الترتيب المخصص",
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

// ── Confirm Dialog ─────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
        style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      >
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl ${danger ? "bg-red-500 hover:bg-red-600" : ""}`}
            style={danger ? undefined : { background: "#5b9bd5" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Publish Dialog ─────────────────────────────────────────────────────────

interface PublishDialogProps {
  page: PageV2Full;
  publishing: boolean;
  onPublishNow: () => void;
  onSchedule: (publishAt: string) => void;
  onCancel: () => void;
}

function PublishDialog({ page, publishing, onPublishNow, onSchedule, onCancel }: PublishDialogProps) {
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [dateTime, setDateTime] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000); // default: +1 hour
    return d.toISOString().slice(0, 16);
  });

  const blockCount = (page.draftData as any)?.content?.length ?? 0;
  const isFirstPublish = !page.publishedData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" data-publish-dialog="">
      <div
        dir="rtl"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isFirstPublish ? "نشر الصفحة" : "نشر التغييرات"}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">{page.title}</p>
            </div>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content summary */}
        <div className="px-6 py-4">
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 mb-4">
            <span className="font-medium text-gray-900">{blockCount}</span> بلوك في المسودة
            {!isFirstPublish && (
              <span className="text-gray-400 ms-2">— سيحل محل النسخة المنشورة</span>
            )}
          </div>

          {/* Mode selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 border border-transparent has-[:checked]:border-[#5b9bd5] has-[:checked]:bg-blue-50/40 transition-colors">
              <input
                type="radio"
                name="publish-mode"
                value="now"
                checked={mode === "now"}
                onChange={() => setMode("now")}
                className="accent-[#5b9bd5]"
                data-schedule-toggle="now"
              />
              <span className="text-sm font-medium text-gray-700">نشر الآن</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 border border-transparent has-[:checked]:border-[#5b9bd5] has-[:checked]:bg-blue-50/40 transition-colors">
              <input
                type="radio"
                name="publish-mode"
                value="schedule"
                checked={mode === "schedule"}
                onChange={() => setMode("schedule")}
                className="accent-[#5b9bd5]"
                data-schedule-toggle="later"
              />
              <span className="text-sm font-medium text-gray-700">جدولة للنشر لاحقاً</span>
            </label>

            {mode === "schedule" && (
              <div className="px-3 pt-1 pb-2">
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#5b9bd5]"
                  style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                  data-publish-at-input=""
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            onClick={() => mode === "now" ? onPublishNow() : onSchedule(new Date(dateTime).toISOString())}
            disabled={publishing || (mode === "schedule" && !dateTime)}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#5b9bd5" }}
            data-publish-confirm-btn=""
          >
            {publishing ? "جاري النشر..." : mode === "now" ? "نشر" : "جدولة"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Unpublish Dialog ───────────────────────────────────────────────────────

interface UnpublishDialogProps {
  pageTitle: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function UnpublishDialog({ pageTitle, loading, onConfirm, onCancel }: UnpublishDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" data-unpublish-dialog="">
      <div
        dir="rtl"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
        style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">إلغاء النشر</h3>
            <p className="text-xs text-gray-400 truncate max-w-[200px]">{pageTitle}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          الصفحة لن تكون مرئية للزوار. يمكنك نشرها مجدداً في أي وقت.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 transition-colors"
            data-unpublish-confirm-btn=""
          >
            {loading ? "جاري..." : "إلغاء النشر"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Conflict Dialog ────────────────────────────────────────────────────────

interface ConflictDialogProps {
  onOverwrite: () => void;
  onLoadLatest: () => void;
}

function ConflictDialog({ onOverwrite, onLoadLatest }: ConflictDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" data-conflict-dialog="">
      <div
        dir="rtl"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
        style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Pencil className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">تعديل متزامن</h3>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          تم تعديل هذه الصفحة من جهاز آخر. اختر كيف تريد المتابعة:
        </p>
        <div className="space-y-2">
          <button
            onClick={onOverwrite}
            className="w-full px-4 py-3 text-sm font-medium text-white rounded-xl transition-all hover:opacity-90 text-start"
            style={{ background: "#5b9bd5" }}
            data-overwrite-btn=""
          >
            <span className="font-semibold block">تجاهل وكتابة فوق</span>
            <span className="text-xs opacity-80">احتفظ بتعديلاتك الحالية</span>
          </button>
          <button
            onClick={onLoadLatest}
            className="w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-start"
            data-load-latest-btn=""
          >
            <span className="font-semibold block">تحميل النسخة الأحدث</span>
            <span className="text-xs text-gray-400">ستفقد التعديلات غير المحفوظة</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Version History Types ──────────────────────────────────────────────────

interface VersionSummary {
  id: string;
  versionNumber: number;
  changeType: string;
  createdAt: string;
  label?: string;
  createdBy?: string | null;
}

// ── Version History Drawer ─────────────────────────────────────────────────

interface VersionHistoryDrawerProps {
  pageId: string;
  onClose: () => void;
  onPreview: (version: VersionSummary) => void;
  onCompare: (fromVersion: VersionSummary, toVersion: VersionSummary) => void;
  onRestore: (version: VersionSummary) => void;
  currentVersionId?: string;
}

function VersionHistoryDrawer({ pageId, onClose, onPreview, onCompare, onRestore, currentVersionId }: VersionHistoryDrawerProps) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedA, setSelectedA] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    pagesV2Api.versions(pageId).then((res) => {
      if (active) { setVersions(res.data); setLoading(false); }
    }).catch((err) => {
      if (active) { setError(err instanceof Error ? err.message : "فشل التحميل"); setLoading(false); }
    });
    return () => { active = false; };
  }, [pageId]);

  const CHANGE_TYPE_COLORS: Record<string, string> = {
    auto_save:   "bg-gray-100 text-gray-500",
    manual_save: "bg-blue-50 text-blue-600",
    publish:     "bg-emerald-50 text-emerald-700",
    restored:    "bg-amber-50 text-amber-700",
  };

  return (
    <div className="fixed inset-0 z-50 flex" data-version-drawer="">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel — slides from the right (RTL = "start" side) */}
      <div
        dir="rtl"
        className="relative ms-auto h-full w-full max-w-sm bg-white shadow-2xl flex flex-col"
        style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-900">سجل التعديلات</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compare hint */}
        {selectedA && (
          <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 flex items-center justify-between">
            <span>اختر نسخة ثانية للمقارنة</span>
            <button onClick={() => setSelectedA(null)} className="text-blue-400 hover:text-blue-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
            </div>
          )}
          {!loading && error && (
            <div className="text-center py-16 text-sm text-gray-400">{error}</div>
          )}
          {!loading && !error && versions.length === 0 && (
            <div className="text-center py-16 text-sm text-gray-400">لا توجد نسخ محفوظة بعد</div>
          )}
          {!loading && !error && versions.map((v) => (
            <div
              key={v.id}
              className={`px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${
                v.id === currentVersionId ? "bg-blue-50/40" : ""
              }`}
              data-version-row={v.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-800">
                      نسخة {v.versionNumber}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CHANGE_TYPE_COLORS[v.changeType] ?? "bg-gray-100 text-gray-500"}`}>
                      {getChangeTypeLabel(v.changeType as ChangeType)}
                    </span>
                    {v.id === currentVersionId && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#5b9bd5]/10 text-[#5b9bd5]">
                        الحالية
                      </span>
                    )}
                  </div>
                  {v.label && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{v.label}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatRelativeTime(v.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Preview */}
                  <button
                    onClick={() => onPreview(v)}
                    className="p-1.5 text-gray-400 hover:text-[#5b9bd5] hover:bg-blue-50 rounded-lg transition-colors"
                    title="معاينة"
                    data-preview-btn={v.id}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {/* Compare */}
                  <button
                    onClick={() => {
                      if (!selectedA) {
                        setSelectedA(v.id);
                      } else if (selectedA !== v.id) {
                        const fromV = versions.find((x) => x.id === selectedA)!;
                        onCompare(fromV, v);
                        setSelectedA(null);
                      }
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      selectedA === v.id
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-400 hover:text-[#5b9bd5] hover:bg-blue-50"
                    }`}
                    title={selectedA ? "قارن مع هذه النسخة" : "اختر للمقارنة"}
                    data-compare-btn={v.id}
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                  </button>

                  {/* Restore */}
                  <button
                    onClick={() => onRestore(v)}
                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="استعادة"
                    data-restore-btn={v.id}
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Version Preview Modal ──────────────────────────────────────────────────

interface VersionPreviewModalProps {
  version: VersionSummary & { data: unknown };
  pageTitle: string;
  onClose: () => void;
  onRestore: () => void;
}

function VersionPreviewModal({ version, pageTitle, onClose, onRestore }: VersionPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col" data-preview-modal="">
      {/* Top bar */}
      <div
        dir="rtl"
        className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0 shadow-sm"
        style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-semibold text-gray-900">{pageTitle}</p>
            <p className="text-xs text-gray-400">
              نسخة {version.versionNumber} — {getChangeTypeLabel(version.changeType as ChangeType)} — {formatRelativeTime(version.createdAt)}
            </p>
          </div>
        </div>
        <button
          onClick={onRestore}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-xl transition-all hover:opacity-90"
          style={{ background: "#5b9bd5" }}
          data-restore-from-preview-btn=""
        >
          <CornerUpLeft className="w-3.5 h-3.5" />
          استعادة هذه النسخة
        </button>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="bg-white mx-auto max-w-5xl rounded-xl shadow-sm overflow-hidden min-h-full">
          <PuckRender
            config={puckConfig as any}
            data={version.data as any}
          />
        </div>
      </div>
    </div>
  );
}

// ── Compare Dialog ─────────────────────────────────────────────────────────

interface CompareDialogProps {
  fromVersion: VersionSummary & { data: unknown };
  toVersion: VersionSummary & { data: unknown };
  onClose: () => void;
  onRestoreFrom: () => void;
  onRestoreTo: () => void;
}

function DiffStatusBadge({ status }: { status: BlockDiff["status"] }) {
  const colors: Record<BlockDiff["status"], string> = {
    added:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
    removed:   "bg-red-50 text-red-600 border border-red-200",
    modified:  "bg-yellow-50 text-yellow-700 border border-yellow-200",
    unchanged: "bg-gray-50 text-gray-500 border border-gray-200",
  };
  const labels: Record<BlockDiff["status"], string> = {
    added: "مضاف", removed: "محذوف", modified: "معدّل", unchanged: "بدون تغيير",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function CompareDialog({ fromVersion, toVersion, onClose, onRestoreFrom, onRestoreTo }: CompareDialogProps) {
  const diffs = diffVersions(
    fromVersion.data as { content: Array<{ type: string; props: { id: string } }> },
    toVersion.data as { content: Array<{ type: string; props: { id: string } }> },
  );
  const summary = summarizeVersionDiff(diffs);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      data-compare-dialog=""
    >
      <div
        dir="rtl"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]"
        style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-bold text-gray-900">مقارنة النسخ</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Version labels */}
        <div className="grid grid-cols-2 gap-px bg-gray-100 flex-shrink-0">
          <div className="bg-white px-6 py-3">
            <p className="text-xs font-semibold text-gray-500">نسخة قديمة</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              نسخة {fromVersion.versionNumber}
              <span className="font-normal text-gray-400 ms-1.5">— {formatRelativeTime(fromVersion.createdAt)}</span>
            </p>
          </div>
          <div className="bg-white px-6 py-3">
            <p className="text-xs font-semibold text-[#5b9bd5]">نسخة جديدة</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              نسخة {toVersion.versionNumber}
              <span className="font-normal text-gray-400 ms-1.5">— {formatRelativeTime(toVersion.createdAt)}</span>
            </p>
          </div>
        </div>

        {/* Summary pills */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          {summary.added > 0 && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">+{summary.added} مضاف</span>
          )}
          {summary.removed > 0 && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-600">{summary.removed}- محذوف</span>
          )}
          {summary.modified > 0 && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">{summary.modified} معدّل</span>
          )}
          {summary.unchanged > 0 && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-50 text-gray-500">{summary.unchanged} بدون تغيير</span>
          )}
        </div>

        {/* Diff rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {diffs.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-400">النسختان متطابقتان</div>
          )}
          {diffs.map((d) => (
            <div
              key={d.blockId}
              className={`px-6 py-3 flex items-center justify-between ${
                d.status === "added"     ? "bg-emerald-50/40" :
                d.status === "removed"  ? "bg-red-50/40" :
                d.status === "modified" ? "bg-yellow-50/30" :
                ""
              }`}
              data-diff-row={d.blockId}
            >
              <div>
                <p className="text-xs font-semibold text-gray-800">{d.blockType}</p>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">{d.blockId}</p>
              </div>
              <DiffStatusBadge status={d.status} />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">إغلاق</button>
          <div className="flex gap-2">
            <button
              onClick={onRestoreFrom}
              className="px-3.5 py-2 text-xs font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              data-restore-from-btn=""
            >
              استعادة النسخة القديمة
            </button>
            <button
              onClick={onRestoreTo}
              className="px-3.5 py-2 text-xs font-semibold text-white rounded-xl hover:opacity-90 transition-all"
              style={{ background: "#5b9bd5" }}
              data-restore-to-btn=""
            >
              استعادة النسخة الجديدة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Restore Confirm Dialog ─────────────────────────────────────────────────

interface RestoreConfirmDialogProps {
  version: VersionSummary;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function RestoreConfirmDialog({ version, loading, onConfirm, onCancel }: RestoreConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" data-restore-confirm-dialog="">
      <div
        dir="rtl"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
        style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <CornerUpLeft className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">استعادة النسخة</h3>
            <p className="text-xs text-gray-400">نسخة {version.versionNumber} — {formatRelativeTime(version.createdAt)}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          سيتم نسخ محتوى هذه النسخة إلى المسودة الحالية. التعديلات غير المحفوظة لن تُفقد — ستُحفظ كنسخة جديدة أولاً.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50 hover:opacity-90 transition-all"
            style={{ background: "#5b9bd5" }}
            data-restore-confirm-btn=""
          >
            {loading ? "جاري الاستعادة..." : "استعادة"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rename Input ───────────────────────────────────────────────────────────

interface RenameInputProps {
  initialValue: string;
  onSave: (val: string) => void;
  onCancel: () => void;
}

function RenameInput({ initialValue, onSave, onCancel }: RenameInputProps) {
  const [val, setVal] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  return (
    <input
      ref={ref}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && val.trim()) { e.preventDefault(); onSave(val.trim()); }
        if (e.key === "Escape") onCancel();
      }}
      onBlur={() => { if (val.trim() && val.trim() !== initialValue) onSave(val.trim()); else onCancel(); }}
      className="flex-1 text-sm font-semibold text-gray-900 border-b border-[#5b9bd5] outline-none bg-transparent px-0 py-0.5 min-w-0"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      onClick={(e) => e.stopPropagation()}
      data-rename-input=""
    />
  );
}

// ── Row Actions Menu ───────────────────────────────────────────────────────

interface RowMenuProps {
  page: PageV2Summary;
  onEdit: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onClose: () => void;
}

function RowMenu({ page, onEdit, onRename, onDuplicate, onDelete, onRestore, onPermanentDelete, onClose }: RowMenuProps) {
  const actions = getPageStatusActions(page.status);

  const items: Array<{ key: string; label: string; icon: React.ReactNode; handler: () => void; danger?: boolean }> = [];

  if (actions.includes("edit"))            items.push({ key: "edit",    label: "تعديل في المحرر", icon: <Pencil className="w-3.5 h-3.5" />,    handler: onEdit });
  if (actions.includes("rename"))          items.push({ key: "rename",  label: "إعادة تسمية",       icon: <Pencil className="w-3.5 h-3.5" />,    handler: onRename });
  if (actions.includes("duplicate"))       items.push({ key: "dup",     label: "تكرار",              icon: <Copy    className="w-3.5 h-3.5" />,    handler: onDuplicate });
  if (actions.includes("delete"))          items.push({ key: "del",     label: "حذف (أرشفة)",        icon: <Archive className="w-3.5 h-3.5" />,   handler: onDelete,           danger: true });
  if (actions.includes("restore"))         items.push({ key: "restore", label: "استعادة",             icon: <RotateCcw className="w-3.5 h-3.5" />, handler: onRestore });
  if (actions.includes("permanent_delete"))items.push({ key: "perm",   label: "حذف نهائي",           icon: <Trash2  className="w-3.5 h-3.5" />,   handler: onPermanentDelete,  danger: true });

  return (
    <div
      data-row-menu=""
      className="absolute end-0 top-full mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="absolute top-2 end-2 text-gray-400 hover:text-gray-600"
        onClick={onClose}
        aria-label="إغلاق"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => { item.handler(); onClose(); }}
          className={`flex items-center gap-2.5 w-full text-start px-3.5 py-2 text-xs font-medium transition-colors hover:bg-gray-50 ${item.danger ? "text-red-500" : "text-gray-700"}`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── New Page Choice Dialog ─────────────────────────────────────────────────
// الخطوة الأولى: اختر "من قالب" أو "صفحة فارغة"

interface NewPageChoiceDialogProps {
  onFromTemplate: () => void;
  onFromScratch: () => void;
  onCancel: () => void;
}

function NewPageChoiceDialog({ onFromTemplate, onFromScratch, onCancel }: NewPageChoiceDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8"
        style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">صفحة جديدة</h2>
            <p className="text-sm text-gray-500 mt-0.5">كيف تريد البدء؟</p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onFromTemplate}
            className="flex items-start gap-4 p-4 rounded-2xl border-2 border-[#5b9bd5]/30 hover:border-[#5b9bd5] hover:bg-blue-50/30 transition-all text-start"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "#EBF3FB" }}>
              <FileText className="w-5 h-5" style={{ color: "#5b9bd5" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">من قالب</p>
              <p className="text-xs text-gray-500 mt-0.5">اختر من 10 قوالب جاهزة بمحتوى عربي أصيل</p>
            </div>
          </button>

          <button
            onClick={onFromScratch}
            className="flex items-start gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-start"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-gray-100">
              <Plus className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">صفحة فارغة</p>
              <p className="text-xs text-gray-500 mt-0.5">ابدأ من الصفر وأضف البلوكات التي تريدها</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Page Dialog ────────────────────────────────────────────────────────

interface NewPageDialogProps {
  onConfirm: (title: string, pageType: string) => void;
  onCancel: () => void;
  saving: boolean;
}

const PAGE_TYPES = [
  { value: "custom",   label: "صفحة مخصصة" },
  { value: "home",     label: "الرئيسية" },
  { value: "about",    label: "من نحن" },
  { value: "contact",  label: "تواصل معنا" },
  { value: "services", label: "الخدمات" },
  { value: "blog",     label: "المدونة" },
  { value: "faq",      label: "الأسئلة الشائعة" },
];

function NewPageDialog({ onConfirm, onCancel, saving }: NewPageDialogProps) {
  const [title, setTitle] = useState("");
  const [pageType, setPageType] = useState("custom");

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
          onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) onConfirm(title.trim(), pageType); }}
          placeholder="مثال: الرئيسية"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 text-gray-900"
          style={{ "--tw-ring-color": "#5b9bd5" } as React.CSSProperties}
        />

        {title.trim() && (
          <p className="mt-2 text-xs text-gray-400">
            الرابط: <span className="font-mono text-gray-600">/{titleToSlug(title.trim())}</span>
          </p>
        )}

        <label className="block text-sm font-medium text-gray-700 mt-5 mb-1.5">
          نوع الصفحة
        </label>
        <div className="relative">
          <select
            value={pageType}
            onChange={(e) => setPageType(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 text-gray-900 appearance-none"
            style={{ "--tw-ring-color": "#5b9bd5" } as React.CSSProperties}
            data-page-type-select=""
          >
            {PAGE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex gap-3 mt-8 justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={() => { if (title.trim()) onConfirm(title.trim(), pageType); }}
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

type FilterStatus = "all" | PageV2Summary["status"];

interface ListViewProps {
  pages: PageV2Summary[];
  loading: boolean;
  error: string | null;
  onNewPage: () => void;
  onEdit: (page: PageV2Summary) => void;
  onRefresh: () => void;
}

function ListView({ pages, loading, error, onNewPage, onEdit, onRefresh }: ListViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [sort, setSort] = useState<SortOption>("updated_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "permanent";
    page: PageV2Summary;
  } | null>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-row-menu]") && !target.closest("[data-menu-trigger]")) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  // Reset pagination when filter/search/sort changes
  useEffect(() => { setCurrentPage(1); }, [search, filter, sort]);

  // Apply filter
  const byStatus = filter === "all"
    ? pages
    : pages.filter((p) => p.status === filter);

  // Apply search
  const searched = filterPagesBySearch(byStatus, search);

  // Apply sort
  const sorted = sortPages(searched, sort);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_LIMIT));
  const paginated = paginatePages(sorted, currentPage, PAGE_LIMIT);

  // Counts per status
  const counts: Record<FilterStatus, number> = {
    all:       pages.length,
    draft:     pages.filter((p) => p.status === "draft").length,
    published: pages.filter((p) => p.status === "published").length,
    archived:  pages.filter((p) => p.status === "archived").length,
  };

  // Row action handlers
  const handleRename = useCallback(async (page: PageV2Summary, newTitle: string) => {
    setRenameId(null);
    try {
      await pagesV2Api.update(page.id, { title: newTitle });
      toast.success("تم تغيير الاسم");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تغيير الاسم");
    }
  }, [onRefresh]);

  const handleDuplicate = useCallback(async (page: PageV2Summary) => {
    try {
      await pagesV2Api.duplicate(page.id);
      toast.success(`تم تكرار "${page.title}"`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل التكرار");
    }
  }, [onRefresh]);

  const handleDelete = useCallback(async (page: PageV2Summary) => {
    setConfirmAction(null);
    try {
      await pagesV2Api.archive(page.id);
      toast.success("تم نقل الصفحة إلى الأرشيف");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الحذف");
    }
  }, [onRefresh]);

  const handleRestore = useCallback(async (page: PageV2Summary) => {
    try {
      await pagesV2Api.restore(page.id);
      toast.success("تم استعادة الصفحة");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الاستعادة");
    }
  }, [onRefresh]);

  const handlePermanentDelete = useCallback(async (page: PageV2Summary) => {
    setConfirmAction(null);
    try {
      await pagesV2Api.permanentDelete(page.id);
      toast.success("تم حذف الصفحة نهائياً");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الحذف النهائي");
    }
  }, [onRefresh]);

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

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-100 pb-0">
        {(["all", "draft", "published", "archived"] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              filter === s
                ? "border-[#5b9bd5] text-[#5b9bd5] bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            data-filter-tab={s}
          >
            {s === "all" ? "الكل" : STATUS_LABEL[s]}
            <span className="ms-1.5 text-xs opacity-60">({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Search + Sort bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الرابط..."
            className="w-full rounded-xl border border-gray-200 pe-10 ps-4 py-2.5 text-sm focus:outline-none focus:ring-2 text-gray-900"
            style={{ "--tw-ring-color": "#5b9bd5" } as React.CSSProperties}
            data-search-input=""
          />
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-xl border border-gray-200 ps-4 pe-8 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 appearance-none bg-white"
            style={{ "--tw-ring-color": "#5b9bd5" } as React.CSSProperties}
            data-sort-select=""
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
              <option key={k} value={k}>{SORT_LABELS[k]}</option>
            ))}
          </select>
          <ArrowUpDown className="absolute top-1/2 -translate-y-1/2 start-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
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

        {/* Search empty */}
        {!loading && !error && pages.length > 0 && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700">لا توجد نتائج للبحث</p>
            <p className="text-xs text-gray-400 mt-1">جرّب كلمات مختلفة أو اضبط الفلتر</p>
          </div>
        )}

        {/* Data */}
        {!loading && !error && sorted.length > 0 && (
          <>
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
              <span>الصفحة</span>
              <span>الحالة</span>
              <span>آخر تعديل</span>
              <span className="w-8" />
            </div>

            {paginated.map((page) => (
              <div
                key={page.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-4 border-b border-gray-50 hover:bg-gray-50/60 transition-colors group last:border-0 relative"
                onClick={() => { if (renameId !== page.id) onEdit(page); }}
              >
                {/* Title / Rename */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "color-mix(in srgb, #5b9bd5 10%, transparent)" }}
                  >
                    <Globe className="w-4 h-4" style={{ color: "#5b9bd5" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {renameId === page.id ? (
                      <RenameInput
                        initialValue={page.title}
                        onSave={(val) => handleRename(page, val)}
                        onCancel={() => setRenameId(null)}
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 truncate">{page.title}</p>
                    )}
                    <p className="text-xs text-gray-400 truncate font-mono">/{page.slug}</p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[page.status]}`}
                >
                  {STATUS_LABEL[page.status]}
                </span>

                <span className="text-xs text-gray-400">{formatDate(page.updatedAt)}</span>

                {/* 3-dot menu trigger */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    data-menu-trigger=""
                    aria-label="خيارات"
                    onClick={() => setOpenMenuId((prev) => (prev === page.id ? null : page.id))}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {openMenuId === page.id && (
                    <RowMenu
                      page={page}
                      onClose={() => setOpenMenuId(null)}
                      onEdit={() => onEdit(page)}
                      onRename={() => setRenameId(page.id)}
                      onDuplicate={() => handleDuplicate(page)}
                      onDelete={() => setConfirmAction({ type: "delete", page })}
                      onRestore={() => handleRestore(page)}
                      onPermanentDelete={() => setConfirmAction({ type: "permanent", page })}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-xs text-gray-500" data-pagination="">
                <span>
                  {((currentPage - 1) * PAGE_LIMIT) + 1}–{Math.min(currentPage * PAGE_LIMIT, sorted.length)} من {sorted.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    data-prev-page=""
                  >
                    السابق
                  </button>
                  <span className="px-3 py-1.5 font-medium text-gray-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    data-next-page=""
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm dialogs */}
      {confirmAction?.type === "delete" && (
        <ConfirmDialog
          title="حذف الصفحة"
          message={`سيتم نقل "${confirmAction.page.title}" إلى الأرشيف. يمكنك استعادتها لاحقاً.`}
          confirmLabel="حذف"
          onConfirm={() => handleDelete(confirmAction.page)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction?.type === "permanent" && (
        <ConfirmDialog
          title="حذف نهائي"
          message={`سيتم حذف "${confirmAction.page.title}" بشكل نهائي ولا يمكن التراجع عن هذا.`}
          confirmLabel="حذف نهائي"
          danger
          onConfirm={() => handlePermanentDelete(confirmAction.page)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

// ── Editor Wrapper ─────────────────────────────────────────────────────────

interface EditorViewProps {
  page: PageV2Full;
  onBack: () => void;
  onSaved: () => void;
}

// ── Onboarding Tooltip ────────────────────────────────────────────────────
// يظهر أول مرة فقط — يُخزّن في localStorage

const ONBOARDING_KEY = "pbuilder_v2_onboarded";

function OnboardingTooltip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      dir="rtl"
      className="fixed bottom-6 end-6 z-[90] w-80 bg-white rounded-2xl shadow-2xl border border-[#5b9bd5]/20 overflow-hidden"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">مرحباً بك في المحرر</p>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Steps */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
            style={{ background: "#5b9bd5" }}>
            1
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            اسحب البلوكات من القائمة على اليمين وأفلتها في الصفحة
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
            style={{ background: "#5b9bd5" }}>
            2
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            انقر على أي عنصر في الصفحة لتعديل محتواه من اللوحة اليسرى
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
            style={{ background: "#5b9bd5" }}>
            3
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            استخدم زر "نشر" في الأعلى لتفعيل الصفحة وإظهارها للزوار
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-4">
        <button
          onClick={onDismiss}
          className="w-full py-2 px-4 text-sm font-semibold text-white rounded-xl transition-colors"
          style={{ background: "#5b9bd5" }}
        >
          فهمت، لنبدأ
        </button>
      </div>
    </div>
  );
}

function EditorView({ page, onBack, onSaved }: EditorViewProps) {
  const [seoOpen, setSeoOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  // Onboarding tooltip — يظهر أول مرة فقط
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem(ONBOARDING_KEY);
    } catch {
      return false;
    }
  });

  function dismissOnboarding() {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {}
    setShowOnboarding(false);
  }
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [editorMenuOpen, setEditorMenuOpen] = useState(false);

  // Version history state
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<(VersionSummary & { data: unknown }) | null>(null);
  const [compareVersions, setCompareVersions] = useState<{
    from: VersionSummary & { data: unknown };
    to: VersionSummary & { data: unknown };
  } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<VersionSummary | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Track latest Puck data for auto-save (without re-rendering on every keystroke)
  const currentDataRef = useRef<PuckData | null>(null);
  const lastSavedAtRef = useRef<string>(page.updatedAt);

  const initialData = (page.draftData ?? page.publishedData ?? {
    content: [],
    root: { props: { title: page.title, description: "" } },
  }) as Partial<PuckData>;

  // ── useAutoSave ─────────────────────────────────────────────
  const { saveStatus, markDirty, doSave } = useAutoSave({
    saveFn: async (signal) => {
      const data = currentDataRef.current;
      if (!data) return;
      await pagesV2Api.autosave(
        page.id,
        data,
        lastSavedAtRef.current,
        signal,
      );
      lastSavedAtRef.current = new Date().toISOString();
    },
    onConflict: () => setConflictDialogOpen(true),
    intervalMs: 30_000,
  });

  // ── Badge: computed from page status + whether user has local changes ────
  const badgeStatus: PageBadgeStatus = saveStatus === "unsaved" || saveStatus === "saving"
    ? (page.publishedData ? "modified" : "draft")
    : computePageStatusBadge({
        status: page.status,
        draftData: page.draftData,
        publishedData: page.publishedData,
      });

  // ── onChange: track current data + mark dirty ────────────────
  const handleChange = useCallback((data: PuckData) => {
    currentDataRef.current = data;
    markDirty();
  }, [markDirty]);

  // ── onSave (manual, Puck's "Publish" button) ─────────────────
  const handleSave = useCallback(async (data: PuckData) => {
    currentDataRef.current = data;
    await doSave();
  }, [doSave]);

  // ── Publish ──────────────────────────────────────────────────
  const handlePublishNow = useCallback(async () => {
    setPublishing(true);
    try {
      // First flush any unsaved changes
      const data = currentDataRef.current;
      if (data && (saveStatus === "unsaved" || saveStatus === "error")) {
        await pagesV2Api.autosave(page.id, data);
        lastSavedAtRef.current = new Date().toISOString();
      }
      await pagesV2Api.publish(page.id);
      toast.success("تم نشر الصفحة");
      setPublishDialogOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل النشر");
    } finally {
      setPublishing(false);
    }
  }, [page.id, saveStatus, onSaved]);

  // ── Schedule ─────────────────────────────────────────────────
  const handleSchedule = useCallback(async (publishAt: string) => {
    setPublishing(true);
    try {
      await pagesV2Api.schedule(page.id, publishAt);
      toast.success("تمت جدولة النشر");
      setPublishDialogOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الجدولة");
    } finally {
      setPublishing(false);
    }
  }, [page.id, onSaved]);

  // ── Unpublish ────────────────────────────────────────────────
  const handleUnpublish = useCallback(async () => {
    setUnpublishing(true);
    try {
      await pagesV2Api.unpublish(page.id);
      toast.success("تم إلغاء النشر");
      setUnpublishDialogOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل إلغاء النشر");
    } finally {
      setUnpublishing(false);
    }
  }, [page.id, onSaved]);

  // ── Conflict resolution ──────────────────────────────────────
  const handleOverwrite = useCallback(async () => {
    // Force save without lastSavedAt check (bypass conflict detection)
    const data = currentDataRef.current;
    if (!data) return;
    try {
      await pagesV2Api.update(page.id, { draftData: data });
      lastSavedAtRef.current = new Date().toISOString();
      toast.success("تم الحفظ");
      setConflictDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الحفظ");
    }
  }, [page.id]);

  const handleLoadLatest = useCallback(() => {
    setConflictDialogOpen(false);
    onSaved(); // Re-fetch page from server
  }, [onSaved]);

  // ── SEO save ─────────────────────────────────────────────────
  const handleSeoSave = useCallback(async (fields: SeoDrawerFields) => {
    try {
      await pagesV2Api.update(page.id, {
        metaTitle:       fields.metaTitle       ?? undefined,
        metaDescription: fields.metaDescription ?? undefined,
        ogImage:         fields.ogImage         ?? undefined,
        canonicalUrl:    fields.canonicalUrl    ?? undefined,
        schemaType:      fields.schemaType      ?? undefined,
        robotsIndex:     fields.robotsIndex,
        robotsFollow:    fields.robotsFollow,
        slug:            fields.slug            ?? undefined,
      });
      toast.success("تم حفظ إعدادات SEO");
      setSeoOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل حفظ SEO");
    }
  }, [page.id]);

  const handleSlugCheck = useCallback(async (slug: string) => {
    return pagesV2Api.slugCheck(slug, page.id);
  }, [page.id]);

  // ── Version: load full version data ─────────────────────────
  const loadVersionData = useCallback(async (v: VersionSummary): Promise<VersionSummary & { data: unknown }> => {
    const res = await pagesV2Api.getVersion(page.id, v.id);
    return { ...v, data: res.data.data };
  }, [page.id]);

  const handlePreviewVersion = useCallback(async (v: VersionSummary) => {
    try {
      const full = await loadVersionData(v);
      setPreviewVersion(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحميل النسخة");
    }
  }, [loadVersionData]);

  const handleCompareVersions = useCallback(async (fromV: VersionSummary, toV: VersionSummary) => {
    try {
      const res = await pagesV2Api.compareVersions(page.id, fromV.id, toV.id);
      setCompareVersions({
        from: { ...fromV, data: res.data.from.data },
        to:   { ...toV,   data: res.data.to.data },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحميل النسخ");
    }
  }, [page.id]);

  const handleRestore = useCallback(async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      await pagesV2Api.revert(page.id, restoreTarget.id);
      toast.success(`تم استعادة نسخة ${restoreTarget.versionNumber}`);
      setRestoreTarget(null);
      setVersionDrawerOpen(false);
      setPreviewVersion(null);
      setCompareVersions(null);
      onSaved(); // Reload page from server
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الاستعادة");
    } finally {
      setRestoring(false);
    }
  }, [restoreTarget, page.id, onSaved]);

  // ── Publish button label logic ───────────────────────────────
  const publishBtnLabel = (() => {
    if (publishing) return "جاري النشر...";
    if (!page.publishedData) return "نشر الصفحة";
    if (badgeStatus === "modified") return "نشر التغييرات";
    return "تم النشر";
  })();
  const publishBtnDisabled = publishing || (badgeStatus === "published" && !page.scheduledAt);

  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }} className="flex flex-col h-full">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-2.5 bg-white border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 rotate-180" />
          الصفحات
        </button>

        <span className="text-gray-200 select-none">|</span>

        {/* Page title + status badge */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{page.title}</span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${BADGE_COLORS[badgeStatus]}`}
            data-page-status-badge={badgeStatus}
          >
            {BADGE_LABEL[badgeStatus]}
          </span>
        </div>

        {/* Auto-save indicator */}
        <div
          className={`text-xs font-medium flex items-center gap-1.5 transition-all ${SAVE_STATUS_COLORS[saveStatus]}`}
          data-save-indicator=""
          data-save-status={saveStatus}
        >
          {saveStatus === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
          {saveStatus !== "idle" && (
            <span>{formatSaveStatus(saveStatus)}</span>
          )}
        </div>

        {/* Right actions */}
        <div className="ms-auto flex items-center gap-2">
          {/* Version history button */}
          <button
            onClick={() => setVersionDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 rounded-xl border border-gray-200 hover:border-[#5b9bd5] hover:text-[#5b9bd5] transition-colors"
            data-version-history-btn=""
          >
            <History className="w-3.5 h-3.5" />
            سجل التعديلات
          </button>

          {/* SEO button */}
          <button
            onClick={() => setSeoOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 rounded-xl border border-gray-200 hover:border-[#5b9bd5] hover:text-[#5b9bd5] transition-colors"
            data-seo-btn=""
          >
            <Search className="w-3.5 h-3.5" />
            SEO
          </button>

          {/* Editor actions dropdown (unpublish, etc) */}
          {page.status === "published" && (
            <div className="relative">
              <button
                onClick={() => setEditorMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                data-editor-menu-btn=""
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {editorMenuOpen && (
                <div
                  className="absolute end-0 top-full mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px]"
                  data-editor-menu=""
                >
                  <button
                    onClick={() => { setEditorMenuOpen(false); setUnpublishDialogOpen(true); }}
                    className="flex items-center gap-2 w-full text-start px-3.5 py-2 text-xs font-medium text-red-500 hover:bg-gray-50"
                    data-unpublish-btn=""
                  >
                    <Globe className="w-3.5 h-3.5" />
                    إلغاء النشر
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Publish button */}
          <button
            onClick={() => !publishBtnDisabled && setPublishDialogOpen(true)}
            disabled={publishBtnDisabled}
            className="px-4 py-1.5 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-default"
            style={{ background: "#5b9bd5" }}
            data-publish-btn=""
          >
            {publishBtnLabel}
          </button>
        </div>
      </div>

      {/* ── Editor ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden" data-testid="puck-editor">
        <PuckEditor
          initialData={initialData}
          onSave={handleSave}
          onChange={handleChange}
        />
      </div>

      {/* ── SEO Drawer ──────────────────────────────────────── */}
      <SeoDrawer
        open={seoOpen}
        pageTitle={page.title}
        pageSlug={page.slug}
        siteUrl={typeof window !== "undefined" ? window.location.hostname : "yoursite.com"}
        initialFields={{
          metaTitle:       page.metaTitle       ?? "",
          metaDescription: page.metaDescription ?? "",
          ogImage:         page.ogImage         ?? "",
          canonicalUrl:    page.canonicalUrl    ?? "",
          schemaType:      page.schemaType      ?? "",
          robotsIndex:     page.robotsIndex     ?? true,
          robotsFollow:    page.robotsFollow    ?? true,
          slug:            page.slug,
        }}
        onSave={handleSeoSave}
        onSlugCheck={handleSlugCheck}
        onClose={() => setSeoOpen(false)}
      />

      {/* ── Dialogs ─────────────────────────────────────────── */}
      {publishDialogOpen && (
        <PublishDialog
          page={page}
          publishing={publishing}
          onPublishNow={handlePublishNow}
          onSchedule={handleSchedule}
          onCancel={() => setPublishDialogOpen(false)}
        />
      )}

      {unpublishDialogOpen && (
        <UnpublishDialog
          pageTitle={page.title}
          loading={unpublishing}
          onConfirm={handleUnpublish}
          onCancel={() => setUnpublishDialogOpen(false)}
        />
      )}

      {conflictDialogOpen && (
        <ConflictDialog
          onOverwrite={handleOverwrite}
          onLoadLatest={handleLoadLatest}
        />
      )}

      {/* ── Version History Drawer ─────────────────────────── */}
      {versionDrawerOpen && (
        <VersionHistoryDrawer
          pageId={page.id}
          onClose={() => setVersionDrawerOpen(false)}
          onPreview={handlePreviewVersion}
          onCompare={handleCompareVersions}
          onRestore={(v) => setRestoreTarget(v)}
        />
      )}

      {/* ── Version Preview Modal ──────────────────────────── */}
      {previewVersion && (
        <VersionPreviewModal
          version={previewVersion}
          pageTitle={page.title}
          onClose={() => setPreviewVersion(null)}
          onRestore={() => {
            setRestoreTarget(previewVersion);
            setPreviewVersion(null);
          }}
        />
      )}

      {/* ── Compare Dialog ─────────────────────────────────── */}
      {compareVersions && (
        <CompareDialog
          fromVersion={compareVersions.from}
          toVersion={compareVersions.to}
          onClose={() => setCompareVersions(null)}
          onRestoreFrom={() => {
            setRestoreTarget(compareVersions.from);
            setCompareVersions(null);
          }}
          onRestoreTo={() => {
            setRestoreTarget(compareVersions.to);
            setCompareVersions(null);
          }}
        />
      )}

      {/* ── Restore Confirm Dialog ─────────────────────────── */}
      {restoreTarget && (
        <RestoreConfirmDialog
          version={restoreTarget}
          loading={restoring}
          onConfirm={handleRestore}
          onCancel={() => setRestoreTarget(null)}
        />
      )}

      {/* Onboarding Tooltip — أول زيارة فقط */}
      {showOnboarding && (
        <OnboardingTooltip onDismiss={dismissOnboarding} />
      )}
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
  // Dialog state: null=closed, "choice"=اختيار, "scratch"=صفحة فارغة, "gallery"=من قالب
  const [newDialogMode, setNewDialogMode] = useState<null | "choice" | "scratch" | "gallery">(null);
  const [creating, setCreating] = useState(false);
  const [listKey, setListKey] = useState(0);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadPages(); }, [listKey]);

  const handleNewPage = useCallback(async (title: string, pageType: string) => {
    setCreating(true);
    try {
      const slug = titleToSlug(title);
      const res = await pagesV2Api.create({ title, slug, pageType });
      setNewDialogMode(null);
      setView({ mode: "editor", page: res.data });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الإنشاء");
    } finally {
      setCreating(false);
    }
  }, []);

  // عند الانتهاء من إنشاء صفحة من قالب — افتح المحرر
  const handleFromTemplate = useCallback(async (pageId: string) => {
    setNewDialogMode(null);
    try {
      const res = await pagesV2Api.get(pageId);
      setView({ mode: "editor", page: res.data });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر فتح الصفحة");
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

  const handleRefresh = useCallback(() => {
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
        onNewPage={() => setNewDialogMode("choice")}
        onEdit={handleEdit}
        onRefresh={handleRefresh}
      />

      {newDialogMode === "choice" && (
        <NewPageChoiceDialog
          onFromTemplate={() => setNewDialogMode("gallery")}
          onFromScratch={() => setNewDialogMode("scratch")}
          onCancel={() => setNewDialogMode(null)}
        />
      )}

      {newDialogMode === "scratch" && (
        <NewPageDialog
          onConfirm={handleNewPage}
          onCancel={() => setNewDialogMode(null)}
          saving={creating}
        />
      )}

      {newDialogMode === "gallery" && (
        <TemplateGallery
          onUse={handleFromTemplate}
          onCancel={() => setNewDialogMode(null)}
        />
      )}
    </div>
  );
}
