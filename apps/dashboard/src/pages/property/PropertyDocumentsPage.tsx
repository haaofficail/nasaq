import { useState, useRef, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { propertyApi, mediaApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";
import { Upload, FileText, X, Download, Eye, File, Plus, Image as ImageIcon, AlertCircle } from "lucide-react";

const DOC_TYPES = [
  { value: "",                label: "كل الأنواع" },
  { value: "deed",            label: "صك الملكية" },
  { value: "building_permit", label: "رخصة البناء" },
  { value: "occupancy",       label: "شهادة الإشغال" },
  { value: "civil_defense",   label: "رخصة الدفاع المدني" },
  { value: "insurance",       label: "التأمين" },
  { value: "white_land",      label: "رسوم الأراضي البيضاء" },
  { value: "other",           label: "أخرى" },
];

const ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
const MAX_MB = 20;

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function isImage(url: string) {
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
}

function isPdf(url: string) {
  return /\.pdf(\?|$)/i.test(url);
}

function fileIcon(url: string) {
  if (isImage(url)) return <ImageIcon className="w-5 h-5 text-violet-500" />;
  if (isPdf(url))   return <FileText  className="w-5 h-5 text-red-500" />;
  return <File className="w-5 h-5 text-brand-500" />;
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function ExpiryBadge({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) return <span className="text-gray-400 text-xs">—</span>;
  const days = daysUntil(expiryDate);
  if (days < 0)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">منتهية</span>;
  if (days <= 30)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">تنتهي خلال {days} يوم</span>;
  return <span className="text-xs text-gray-600">{new Date(expiryDate).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}</span>;
}

// ── File preview thumbnail in table ───────────────────────
function DocThumbnail({ url, title }: { url?: string; title: string }) {
  if (!url) return <span className="text-gray-700 font-medium text-sm">{title}</span>;
  if (isImage(url)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 group">
        <img src={url} alt={title} className="w-9 h-9 rounded-lg object-cover border border-gray-100 group-hover:opacity-80 transition-opacity" />
        <span className="text-sm font-medium text-gray-800 group-hover:text-brand-600 transition-colors truncate max-w-[180px]">{title}</span>
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 group">
      <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
        {fileIcon(url)}
      </div>
      <span className="text-sm font-medium text-brand-600 group-hover:underline truncate max-w-[180px]">{title}</span>
    </a>
  );
}

// ── Upload zone component ──────────────────────────────────
interface UploadZoneProps {
  onFileReady: (url: string, name: string) => void;
}

function UploadZone({ onFileReady }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [preview, setPreview]     = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`حجم الملف يتجاوز ${MAX_MB} ميجابايت`);
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("context", "property_doc");
      const res = await mediaApi.upload(fd, (pct) => setProgress(pct));
      const url: string = (res as any)?.data?.url ?? (res as any)?.url ?? "";
      if (!url) throw new Error("لم يُعاد رابط الملف");
      setPreview({ url, name: file.name, size: file.size });
      onFileReady(url, file.name);
    } catch (e: any) {
      setError(e.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  }, [onFileReady]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const clear = () => {
    setPreview(null);
    setError(null);
    setProgress(0);
    onFileReady("", "");
    if (inputRef.current) inputRef.current.value = "";
  };

  if (preview) {
    return (
      <div className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50">
        {isImage(preview.url) ? (
          <div className="relative">
            <img src={preview.url} alt={preview.name} className="w-full max-h-48 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 px-3 pb-3 flex items-end justify-between">
              <div>
                <p className="text-white text-xs font-medium truncate max-w-[200px]">{preview.name}</p>
                <p className="text-white/70 text-[10px]">{humanSize(preview.size)}</p>
              </div>
              <div className="flex gap-1.5">
                <a href={preview.url} target="_blank" rel="noreferrer"
                  className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Eye className="w-3.5 h-3.5 text-white" />
                </a>
                <button onClick={clear}
                  className="w-7 h-7 rounded-lg bg-red-500/80 backdrop-blur-sm flex items-center justify-center hover:bg-red-500 transition-colors">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4">
            <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0">
              {fileIcon(preview.url)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{preview.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{humanSize(preview.size)}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <a href={preview.url} target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center hover:bg-brand-50 hover:border-brand-200 transition-colors">
                <Download className="w-3.5 h-3.5 text-gray-500" />
              </a>
              <button onClick={clear}
                className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center hover:bg-red-100 transition-colors">
                <X className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={clsx(
          "border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all select-none",
          dragging
            ? "border-brand-400 bg-brand-50"
            : "border-gray-200 hover:border-brand-300 hover:bg-gray-50/60"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleChange} />

        {uploading ? (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5 text-brand-500 animate-bounce" />
            </div>
            <p className="text-sm font-medium text-gray-700">جاري الرفع... {progress}%</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mx-auto max-w-[200px]">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 font-medium">
              اسحب الملف هنا أو{" "}
              <span className="text-brand-500 font-semibold">اضغط للاختيار</span>
            </p>
            <p className="text-xs text-gray-400 mt-1.5">
              صور · PDF · Word · Excel — حتى {MAX_MB} MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 bg-white";

export function PropertyDocumentsPage() {
  const [propertyId, setPropertyId] = useState("");
  const [docType, setDocType]       = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [preview, setPreview]       = useState<{ url: string; name: string } | null>(null);

  const [form, setForm] = useState({
    propertyId: "",
    docType:    "deed",
    title:      "",
    fileUrl:    "",
    expiryDate: "",
  });

  const params: Record<string, string> = {};
  if (propertyId) params.propertyId = propertyId;
  if (docType)    params.docType    = docType;

  const { data, loading, error, refetch } = useApi(
    () => propertyApi.documents.list(params),
    [propertyId, docType]
  );
  const { data: propertiesData } = useApi(() => propertyApi.properties.list(), []);

  const docs: any[]       = (data as any)?.data ?? [];
  const properties: any[] = (propertiesData as any)?.data ?? [];

  function openModal() {
    setForm({ propertyId: "", docType: "deed", title: "", fileUrl: "", expiryDate: "" });
    setPreview(null);
    setShowModal(true);
  }

  function handleFileReady(url: string, name: string) {
    setForm((f) => ({ ...f, fileUrl: url }));
    setPreview(url ? { url, name } : null);
    // Auto-fill title from filename if title is empty
    if (url && name && !form.title) {
      const base = name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      setForm((f) => ({ ...f, fileUrl: url, title: f.title || base }));
    }
  }

  async function handleSave() {
    if (!form.propertyId || !form.title || !form.docType) {
      toast.error("يرجى ملء الحقول المطلوبة (العقار، النوع، العنوان)");
      return;
    }
    setSaving(true);
    try {
      await propertyApi.documents.create(form);
      toast.success("تم رفع الوثيقة بنجاح");
      setShowModal(false);
      refetch();
    } catch (e: any) {
      toast.error(`فشل رفع الوثيقة: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">أرشيف الوثائق</h1>
          <p className="text-sm text-gray-400 mt-0.5">إدارة وثائق العقارات والمستندات القانونية</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          رفع وثيقة
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 bg-white"
        >
          <option value="">كل العقارات</option>
          {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 bg-white"
        >
          {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-4"><SkeletonRows rows={6} /></div>
        ) : error ? (
          <div className="p-6 text-red-600 bg-red-50 text-sm rounded-2xl">{error}</div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">لا توجد وثائق</p>
            <p className="text-gray-400 text-xs mt-1">ارفع أول وثيقة عبر زر "رفع وثيقة"</p>
            <button onClick={openModal} className="mt-4 text-xs text-brand-500 hover:text-brand-700 font-medium">
              + رفع وثيقة الآن
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">الوثيقة</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">النوع</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">العقار</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">تاريخ الانتهاء</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">الحالة</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docs.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <DocThumbnail url={doc.fileUrl} title={doc.title} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {DOC_TYPES.find((t) => t.value === doc.docType)?.label ?? doc.docType}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{doc.propertyName ?? "—"}</td>
                    <td className="px-4 py-3"><ExpiryBadge expiryDate={doc.expiryDate} /></td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                        doc.status === "active"  ? "bg-emerald-100 text-emerald-700" :
                        doc.status === "expired" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {doc.status === "active" ? "ساري" : doc.status === "expired" ? "منتهي" : doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-brand-50 flex items-center justify-center transition-colors">
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Upload Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-900">رفع وثيقة جديدة</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {/* Upload zone */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">الملف</label>
                <UploadZone onFileReady={handleFileReady} />
                {!preview && (
                  <div className="mt-2.5">
                    <p className="text-[11px] text-gray-400 text-center mb-2">أو أدخل رابط مباشر</p>
                    <input
                      value={form.fileUrl}
                      onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                      placeholder="https://..."
                      className={inputCls}
                      dir="ltr"
                    />
                  </div>
                )}
              </div>

              {/* Property */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">العقار <span className="text-red-400">*</span></label>
                <select className={inputCls} value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
                  <option value="">اختر العقار</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Doc type */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">نوع الوثيقة <span className="text-red-400">*</span></label>
                <select className={inputCls} value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
                  {DOC_TYPES.filter((t) => t.value).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">العنوان <span className="text-red-400">*</span></label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: صك ملكية - برج الياسمين"
                  className={inputCls}
                />
              </div>

              {/* Expiry date */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm shadow-brand-500/20"
              >
                {saving ? "جاري الحفظ..." : "رفع الوثيقة"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
