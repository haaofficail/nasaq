import { useState, useRef, useCallback, useEffect } from "react";
import {
  Images, Video, FileText, Layers, Search, Upload, Grid3X3, List,
  X, Tag, Copy, Trash2, RefreshCw, ChevronRight, CheckSquare,
  Square, Download, Link2, Clock, HardDrive, Plus, AlertCircle,
  Check, Loader2, ImageIcon, History,
} from "lucide-react";
import { clsx } from "clsx";
import { mediaApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

// ── Types ────────────────────────────────────────────────────────────────────

type AssetType = "image" | "video" | "document" | "logo";

interface Asset {
  id: string;
  name: string;
  fileUrl: string;
  r2Key: string;
  fileType: AssetType;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  tags: string[];
  category: string | null;
  altText: string | null;
  relatedServiceId: string | null;
  version: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UploadItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "confirming" | "done" | "error";
  progress: number;  // 0-100
  error?: string;
  assetId?: string;
  category: string;
  tags: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<AssetType | "all", { label: string; icon: any; color: string; bg: string }> = {
  all:      { label: "الكل",     icon: Images,    color: "text-gray-600",   bg: "bg-gray-100" },
  image:    { label: "صور",      icon: ImageIcon, color: "text-blue-600",   bg: "bg-blue-50" },
  video:    { label: "فيديو",    icon: Video,     color: "text-purple-600", bg: "bg-purple-50" },
  document: { label: "مستندات",  icon: FileText,  color: "text-amber-600",  bg: "bg-amber-50" },
  logo:     { label: "شعارات",   icon: Layers,    color: "text-emerald-600", bg: "bg-emerald-50" },
};

const ACCEPT = "image/*,video/mp4,video/webm,video/quicktime,application/pdf,.doc,.docx,.xls,.xlsx";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function fileSizeLabel(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function inferType(mime: string): AssetType {
  if (mime.startsWith("image/"))  return "image";
  if (mime.startsWith("video/"))  return "video";
  return "document";
}

// ── Upload helper using XHR for progress tracking ────────────────────────────

function uploadToR2(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function AssetThumbnail({ asset, selected, onSelect, onClick }: {
  asset: Asset;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const cfg = TYPE_CONFIG[asset.fileType];
  const Icon = cfg.icon;

  return (
    <div
      className={clsx(
        "group relative rounded-2xl border-2 overflow-hidden cursor-pointer transition-all bg-white",
        selected ? "border-brand-400 shadow-md" : "border-transparent hover:border-brand-200 hover:shadow-sm",
      )}
      onClick={onClick}
    >
      {/* Thumbnail area */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {asset.fileType === "image" && !imgErr ? (
          <img
            src={asset.fileUrl}
            alt={asset.altText || asset.name}
            loading="lazy"
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : asset.fileType === "video" ? (
          <div className={clsx("w-full h-full flex items-center justify-center", cfg.bg)}>
            <Video className={clsx("w-10 h-10", cfg.color)} />
          </div>
        ) : (
          <div className={clsx("w-full h-full flex items-center justify-center", cfg.bg)}>
            <Icon className={clsx("w-10 h-10", cfg.color)} />
          </div>
        )}
      </div>

      {/* Selection checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="select"
      >
        {selected
          ? <CheckSquare className="w-5 h-5 text-brand-500 drop-shadow" />
          : <Square className="w-5 h-5 text-white drop-shadow" />}
      </button>

      {/* Tags */}
      {asset.tags.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-1.5 flex gap-1 flex-wrap bg-gradient-to-t from-black/30 to-transparent">
          {asset.tags.slice(0, 2).map(t => (
            <span key={t} className="text-[10px] bg-white/80 text-gray-700 rounded-full px-1.5 py-0.5 font-medium">{t}</span>
          ))}
          {asset.tags.length > 2 && (
            <span className="text-[10px] bg-white/80 text-gray-500 rounded-full px-1.5 py-0.5">+{asset.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Version badge */}
      {asset.version > 1 && (
        <div className="absolute top-2 left-2">
          <span className="text-[10px] bg-brand-500 text-white rounded-full px-1.5 py-0.5 font-medium">v{asset.version}</span>
        </div>
      )}

      {/* Name */}
      <div className="px-2 py-1.5 border-t border-gray-100">
        <p className="text-xs text-gray-700 truncate font-medium">{asset.name}</p>
        <p className="text-[11px] text-gray-400">{fileSizeLabel(asset.sizeBytes)}</p>
      </div>
    </div>
  );
}

function AssetListRow({ asset, selected, onSelect, onClick }: {
  asset: Asset;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}) {
  const cfg = TYPE_CONFIG[asset.fileType];
  const Icon = cfg.icon;
  return (
    <div
      className={clsx(
        "flex items-center gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors",
        selected && "bg-brand-50",
      )}
      onClick={onClick}
    >
      <button onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        {selected
          ? <CheckSquare className="w-4 h-4 text-brand-500" />
          : <Square className="w-4 h-4 text-gray-300" />}
      </button>

      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
        {asset.fileType === "image"
          ? <img src={asset.fileUrl} alt="" className="w-10 h-10 rounded-xl object-cover" onError={(e) => { (e.target as any).style.display = "none"; }} />
          : <Icon className={clsx("w-5 h-5", cfg.color)} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
        <p className="text-xs text-gray-400 truncate">{asset.category || cfg.label}</p>
      </div>

      <div className="hidden sm:flex gap-2">
        {asset.tags.slice(0, 3).map(t => (
          <span key={t} className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{t}</span>
        ))}
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-gray-500">{fileSizeLabel(asset.sizeBytes)}</p>
        <p className="text-[11px] text-gray-400">{fmtDate(asset.createdAt)}</p>
      </div>
    </div>
  );
}

function UploadQueue({ items, onClear }: {
  items: UploadItem[];
  onClear: () => void;
}) {
  if (items.length === 0) return null;
  const done = items.every(i => i.status === "done" || i.status === "error");

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white rounded-2xl border border-gray-200 shadow-xl w-80">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">
          رفع الملفات ({items.filter(i => i.status === "done").length}/{items.length})
        </span>
        {done && (
          <button onClick={onClear} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
        {items.map(item => (
          <div key={item.id} className="px-4 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{item.file.name}</p>
              </div>
              {item.status === "done"      && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              {item.status === "error"     && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              {(item.status === "uploading" || item.status === "confirming") && (
                <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin shrink-0" />
              )}
            </div>
            {item.status === "uploading" && (
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-150"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            )}
            {item.status === "error" && (
              <p className="text-[11px] text-red-500">{item.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Detail Panel ─────────────────────────────────────────────────────────────

function AssetDetail({
  asset,
  onClose,
  onUpdate,
  onDelete,
}: {
  asset: Asset;
  onClose: () => void;
  onUpdate: (updated: Asset) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name:     asset.name,
    altText:  asset.altText || "",
    category: asset.category || "",
    tags:     asset.tags.join(", "),
    fileType: asset.fileType,
  });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cfg = TYPE_CONFIG[asset.fileType];
  const Icon = cfg.icon;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await mediaApi.update(asset.id, {
        name:     form.name,
        altText:  form.altText || undefined,
        category: form.category || undefined,
        tags:     form.tags.split(",").map(t => t.trim()).filter(Boolean),
        fileType: form.fileType as AssetType,
      });
      onUpdate((res as any).data);
      setEditing(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(asset.fileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await mediaApi.delete(asset.id);
      onDelete(asset.id);
    } catch { setDeleting(false); }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="font-semibold text-gray-900 text-sm truncate flex-1">{asset.name}</h3>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Preview */}
        <div className="bg-gray-50 border-b border-gray-100 flex items-center justify-center" style={{ minHeight: 200 }}>
          {asset.fileType === "image" ? (
            <img src={asset.fileUrl} alt={asset.altText || asset.name} className="max-h-52 max-w-full object-contain" />
          ) : asset.fileType === "video" ? (
            <video src={asset.fileUrl} controls className="max-h-52 max-w-full rounded-xl" />
          ) : (
            <div className={clsx("w-20 h-20 rounded-2xl flex items-center justify-center", cfg.bg)}>
              <Icon className={clsx("w-10 h-10", cfg.color)} />
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* File info */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "النوع",        value: cfg.label,                     icon: Icon },
              { label: "الحجم",        value: fileSizeLabel(asset.sizeBytes), icon: HardDrive },
              { label: "الأبعاد",      value: asset.width ? `${asset.width} × ${asset.height}` : "—", icon: ImageIcon },
              { label: "الإصدار",      value: `v${asset.version}`,           icon: History },
              { label: "تاريخ الرفع",  value: fmtDate(asset.createdAt),      icon: Clock },
            ].map(row => (
              <div key={row.label} className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[10px] text-gray-400 mb-0.5">{row.label}</p>
                <p className="text-xs font-medium text-gray-800">{row.value}</p>
              </div>
            ))}
          </div>

          {/* Metadata edit */}
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">الاسم</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">النص البديل (Alt Text)</label>
                <input
                  value={form.altText}
                  onChange={e => setForm(p => ({ ...p, altText: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400"
                  placeholder="وصف الصورة..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">التصنيف</label>
                <input
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400"
                  placeholder="مثال: شعارات، تسويق، منتجات"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">الوسوم (مفصولة بفواصل)</label>
                <input
                  value={form.tags}
                  onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400"
                  placeholder="hero, dark-bg, summer"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">نوع الملف</label>
                <select
                  value={form.fileType}
                  onChange={e => setForm(p => ({ ...p, fileType: e.target.value as AssetType }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 bg-white"
                >
                  {Object.entries(TYPE_CONFIG).filter(([k]) => k !== "all").map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-brand-500 text-white rounded-xl py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-1">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} حفظ
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {asset.altText && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">النص البديل</p>
                  <p className="text-xs text-gray-700">{asset.altText}</p>
                </div>
              )}
              {asset.category && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">التصنيف</p>
                  <p className="text-xs text-gray-700">{asset.category}</p>
                </div>
              )}
              {asset.tags.length > 0 && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">الوسوم</p>
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map(t => (
                      <span key={t} className="text-[11px] bg-brand-50 text-brand-700 border border-brand-100 rounded-full px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => setEditing(true)}
                className="w-full border border-gray-200 rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 mt-1"
              >
                تعديل البيانات
              </button>
            </div>
          )}

          {/* Version history */}
          <div>
            <button
              onClick={() => setShowVersions(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-600 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              سجل الإصدارات
              <ChevronRight className={clsx("w-3.5 h-3.5 transition-transform", showVersions && "rotate-90")} />
            </button>
            {showVersions && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
                  <span className="font-medium text-brand-700">v{asset.version} (الحالي)</span>
                  <span className="text-brand-500">{fmtDate(asset.createdAt)}</span>
                </div>
                {asset.parentId && (
                  <p className="text-[11px] text-gray-400 text-center">لمشاهدة كل الإصدارات افتح الملف الأصلي</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 space-y-2 shrink-0">
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </button>
          <a
            href={asset.fileUrl}
            download={asset.name}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> تحميل
          </a>
        </div>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-1.5 border border-red-100 text-red-500 rounded-xl py-2 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> حذف
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
            <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1">
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} تأكيد الحذف
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Upload Config Modal ───────────────────────────────────────────────────────

function UploadConfigModal({
  files,
  onConfirm,
  onClose,
}: {
  files: File[];
  onConfirm: (category: string, tags: string, type: AssetType) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState("");
  const [tags,     setTags]     = useState("");
  const [fileType, setFileType] = useState<AssetType>(
    files[0]?.type.startsWith("video") ? "video" : "image",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">إعدادات الرفع</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">{files.length} ملف جاهز للرفع</p>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">التصنيف (اختياري)</label>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              placeholder="مثال: شعارات، تسويق"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">الوسوم (مفصولة بفواصل)</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400"
              placeholder="hero, summer, promotion"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">نوع الملف</label>
            <div className="grid grid-cols-4 gap-2">
              {(["image", "video", "document", "logo"] as AssetType[]).map(t => {
                const c = TYPE_CONFIG[t];
                const Ic = c.icon;
                return (
                  <button
                    key={t}
                    onClick={() => setFileType(t)}
                    className={clsx(
                      "flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-colors",
                      fileType === t ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Ic className="w-4 h-4" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
          <button
            onClick={() => onConfirm(category, tags, fileType)}
            className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600"
          >
            <Upload className="w-4 h-4 inline ml-1.5" /> رفع الآن
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function MediaLibraryPage() {
  // ── Data state ────────────────────────────────────────────
  const [assets,    setAssets]    = useState<Asset[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);

  // ── Filters ───────────────────────────────────────────────
  const [search,    setSearch]    = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AssetType>("all");
  const [category,  setCategory]  = useState("");
  const [tagFilter, setTagFilter] = useState("");

  // ── UI state ──────────────────────────────────────────────
  const [viewMode,  setViewMode]  = useState<"grid" | "list">("grid");
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [detail,    setDetail]    = useState<Asset | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Upload state ──────────────────────────────────────────
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showConfig,   setShowConfig]   = useState(false);
  const [uploads,      setUploads]      = useState<UploadItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categoriesRes } = useApi(() => mediaApi.categories(), []);
  const { data: tagsRes }       = useApi(() => mediaApi.tags(), []);
  const categories: string[] = (categoriesRes as any)?.data ?? [];
  const allTags:    string[] = (tagsRes as any)?.data ?? [];

  // ── Fetch assets ──────────────────────────────────────────

  const fetchAssets = useCallback(async (pg: number = 1) => {
    setLoading(true);
    try {
      const params: any = { page: String(pg), limit: "32" };
      if (search)                params.q        = search;
      if (typeFilter !== "all")  params.type     = typeFilter;
      if (category)              params.category = category;
      if (tagFilter)             params.tag      = tagFilter;

      const res = await mediaApi.list(params) as any;
      if (pg === 1) {
        setAssets(res.data || []);
      } else {
        setAssets(prev => [...prev, ...(res.data || [])]);
      }
      setTotal(res.total || 0);
      setPage(pg);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, category, tagFilter]);

  useEffect(() => { fetchAssets(1); }, [fetchAssets]);

  // ── Upload flow ───────────────────────────────────────────

  const processFiles = (files: File[]) => {
    const valid = files.filter(f => {
      if (!ALLOWED_MIME_TYPES.has(f.type)) return false;
      const maxMB = f.type.startsWith("video") ? 200 : f.type === "application/pdf" ? 25 : 15;
      return f.size <= maxMB * 1024 * 1024;
    });
    if (valid.length === 0) return;
    setPendingFiles(valid);
    setShowConfig(true);
  };

  const startUploads = async (category: string, tags: string, fileType: AssetType) => {
    setShowConfig(false);
    const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);

    const queue: UploadItem[] = pendingFiles.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      status: "pending",
      progress: 0,
      category,
      tags,
    }));
    setUploads(prev => [...prev, ...queue]);
    setPendingFiles([]);

    for (const item of queue) {
      const updateItem = (patch: Partial<UploadItem>) =>
        setUploads(prev => prev.map(u => u.id === item.id ? { ...u, ...patch } : u));

      updateItem({ status: "uploading" });
      try {
        // 1. Get presigned URL
        const presigned = await mediaApi.presigned({
          filename:    item.file.name,
          contentType: item.file.type,
          category,
        }) as any;

        const { uploadUrl, publicUrl, key, devMode } = presigned.data;

        // 2. Upload to R2 (skip in dev mode)
        if (uploadUrl && !devMode) {
          await uploadToR2(uploadUrl, item.file, (pct) => updateItem({ progress: pct }));
        } else {
          updateItem({ progress: 100 });
        }

        // 3. Confirm upload
        updateItem({ status: "confirming" });

        const assetType = fileType || inferType(item.file.type);

        const confirmed = await mediaApi.confirm({
          r2Key:     key,
          publicUrl,
          name:      item.file.name.replace(/\.[^.]+$/, ""),
          mimeType:  item.file.type,
          sizeBytes: item.file.size,
          fileType:  assetType,
          tags:      tagList,
          category:  category || undefined,
        }) as any;

        updateItem({ status: "done", assetId: confirmed.data?.id });

        // Prepend to list
        setAssets(prev => [confirmed.data, ...prev]);
        setTotal(t => t + 1);

      } catch (err: any) {
        updateItem({ status: "error", error: err.message || "فشل الرفع" });
      }
    }
  };

  // ── Drag & drop ───────────────────────────────────────────

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  // ── Selection ─────────────────────────────────────────────

  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    if (!confirm(`حذف ${selected.size} ملف؟`)) return;
    await mediaApi.bulkDelete(Array.from(selected));
    setAssets(prev => prev.filter(a => !selected.has(a.id)));
    setTotal(t => t - selected.size);
    clearSelection();
    if (detail && selected.has(detail.id)) setDetail(null);
  };

  // ── Stats ─────────────────────────────────────────────────

  const typeCounts = assets.reduce((acc, a) => {
    acc[a.fileType] = (acc[a.fileType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hasMore = assets.length < total;

  // ── Search debounce ───────────────────────────────────────
  const searchTimeout = useRef<any>(null);
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchAssets(1), 400);
  };

  return (
    <div
      className="flex h-full min-h-0"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* ── Main pane ── */}
      <div className={clsx("flex-1 min-w-0 flex flex-col", detail && "lg:mr-72")}>

        {/* ── Drag overlay ── */}
        {isDragging && (
          <div className="absolute inset-0 z-40 bg-brand-500/10 border-4 border-dashed border-brand-400 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Upload className="w-12 h-12 text-brand-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-brand-700">أفلت الملفات هنا</p>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Images className="w-5 h-5 text-brand-500" /> مكتبة الوسائط
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{total} ملف مرفوع</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchAssets(1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-brand-600 transition-colors"
            >
              <Upload className="w-4 h-4" /> رفع ملفات
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={e => processFiles(Array.from(e.target.files || []))}
              onClick={e => { (e.target as HTMLInputElement).value = ""; }}
            />
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 shrink-0">
          {(["image", "video", "document", "logo"] as AssetType[]).map(t => {
            const cfg = TYPE_CONFIG[t];
            const Ic  = cfg.icon;
            return (
              <button
                key={t}
                onClick={() => { setTypeFilter(typeFilter === t ? "all" : t); fetchAssets(1); }}
                className={clsx(
                  "rounded-2xl border p-3 text-right transition-all",
                  typeFilter === t ? "border-brand-300 bg-brand-50" : "bg-white border-gray-100 hover:border-gray-200",
                )}
              >
                <div className={clsx("w-7 h-7 rounded-xl flex items-center justify-center mb-2", cfg.bg)}>
                  <Ic className={clsx("w-3.5 h-3.5", cfg.color)} />
                </div>
                <p className={clsx("text-base font-bold", cfg.color)}>{typeCounts[t] || 0}</p>
                <p className="text-xs text-gray-400">{cfg.label}</p>
              </button>
            );
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="بحث باسم الملف..."
              className="border border-gray-200 rounded-xl pr-9 pl-3 py-2 text-sm outline-none focus:border-brand-400 w-48"
            />
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); fetchAssets(1); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 bg-white"
            >
              <option value="">كل التصنيفات</option>
              {categories.map(c => <option key={c} value={c!}>{c}</option>)}
            </select>
          )}

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              {allTags.slice(0, 8).map(t => (
                <button
                  key={t}
                  onClick={() => { setTagFilter(tagFilter === t ? "" : t); fetchAssets(1); }}
                  className={clsx(
                    "text-xs px-2.5 py-1 rounded-full border transition-colors",
                    tagFilter === t ? "bg-brand-500 text-white border-brand-500" : "bg-white border-gray-200 text-gray-600 hover:border-brand-300",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* View toggle */}
          <div className="mr-auto flex border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={clsx("px-3 py-2 transition-colors", viewMode === "grid" ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-gray-50")}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={clsx("px-3 py-2 transition-colors", viewMode === "list" ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-gray-50")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Bulk actions bar ── */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-2xl px-4 py-2.5 mb-3 shrink-0">
            <span className="text-sm font-semibold text-brand-700">{selected.size} محدد</span>
            <div className="flex gap-2 mr-auto">
              <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> إلغاء التحديد
              </button>
              <button onClick={handleBulkDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 border border-red-100 rounded-lg px-2 py-1 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" /> حذف
              </button>
            </div>
          </div>
        )}

        {/* ── Asset grid / list ── */}
        <div className="flex-1 overflow-y-auto pb-4">
          {loading && assets.length === 0 ? (
            <div className={clsx(
              viewMode === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                : "space-y-1",
            )}>
              {[...Array(12)].map((_, i) => (
                <div key={i} className={clsx(
                  "bg-gray-100 animate-pulse rounded-2xl",
                  viewMode === "grid" ? "aspect-square" : "h-16",
                )} />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div
              className="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center cursor-pointer hover:border-brand-300 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد ملفات بعد</h3>
              <p className="text-sm text-gray-400 mb-4">اسحب وأفلت الملفات هنا أو اضغط للاختيار</p>
              <span className="inline-flex items-center gap-2 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium">
                <Plus className="w-4 h-4" /> رفع أول ملف
              </span>
            </div>
          ) : viewMode === "grid" ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {assets.map(asset => (
                  <AssetThumbnail
                    key={asset.id}
                    asset={asset}
                    selected={selected.has(asset.id)}
                    onSelect={() => toggleSelect(asset.id)}
                    onClick={() => setDetail(asset)}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => fetchAssets(page + 1)}
                    disabled={loading}
                    className="border border-gray-200 rounded-xl px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `تحميل المزيد (${total - assets.length} متبقي)`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {assets.map(asset => (
                <AssetListRow
                  key={asset.id}
                  asset={asset}
                  selected={selected.has(asset.id)}
                  onSelect={() => toggleSelect(asset.id)}
                  onClick={() => setDetail(asset)}
                />
              ))}
              {hasMore && (
                <div className="text-center py-4">
                  <button
                    onClick={() => fetchAssets(page + 1)}
                    disabled={loading}
                    className="text-sm text-brand-500 hover:text-brand-700 disabled:opacity-50 flex items-center gap-1 mx-auto"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    تحميل المزيد ({total - assets.length} متبقي)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail panel (side sheet) ── */}
      {detail && (
        <div className="fixed lg:absolute top-0 left-0 bottom-0 w-72 z-30 border-r border-gray-100 shadow-xl lg:shadow-none">
          <AssetDetail
            asset={detail}
            onClose={() => setDetail(null)}
            onUpdate={(updated) => {
              setAssets(prev => prev.map(a => a.id === updated.id ? updated : a));
              setDetail(updated);
            }}
            onDelete={(id) => {
              setAssets(prev => prev.filter(a => a.id !== id));
              setTotal(t => t - 1);
              setDetail(null);
            }}
          />
        </div>
      )}

      {/* ── Upload config modal ── */}
      {showConfig && (
        <UploadConfigModal
          files={pendingFiles}
          onConfirm={startUploads}
          onClose={() => { setShowConfig(false); setPendingFiles([]); }}
        />
      )}

      {/* ── Upload queue (bottom-left) ── */}
      <UploadQueue
        items={uploads}
        onClear={() => setUploads([])}
      />
    </div>
  );
}
