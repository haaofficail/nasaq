import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Images, ImageIcon, Check, Upload, Plus, Loader2, Info } from "lucide-react";
import { mediaApi } from "@/lib/api";
import { clsx } from "clsx";

export interface PickedAsset {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
}

interface MediaPickerModalProps {
  onSelect: (asset: PickedAsset) => void;
  onClose: () => void;
  accept?: "image" | "video" | "document" | "logo" | "all";
  title?: string;
  hint?: string; // e.g. "الغلاف: 800×600 | الشعار: 300×300"
}

// Recommended sizes per context
const SIZE_HINTS: Record<string, string> = {
  logo:     "مقاس مثالي: 300×300 بكسل — PNG بخلفية شفافة",
  image:    "الصور: 1200×800 للغلاف — 800×800 للخدمات — PNG أو JPG",
  all:      "JPG أو PNG أو WebP — بحجم أقصى 10 MB لكل ملف",
  document: "PDF أو Word — بحجم أقصى 10 MB",
  video:    "MP4 أو WebM — بحجم أقصى 200 MB",
};

function fileSizeLabel(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaPickerModal({
  onSelect,
  onClose,
  accept = "image",
  title = "اختر من المكتبة",
  hint,
}: MediaPickerModalProps) {
  const [assets,         setAssets]         = useState<PickedAsset[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [selected,       setSelected]       = useState<PickedAsset | null>(null);
  const [total,          setTotal]          = useState(0);
  const [page,           setPage]           = useState(1);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError,    setUploadError]    = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "40", page: String(pg) };
      if (accept !== "all") params.type = accept;
      if (search) params.q = search;
      const res = await mediaApi.list(params) as any;
      if (pg === 1) setAssets(res.data || []);
      else setAssets(prev => [...prev, ...(res.data || [])]);
      setTotal(res.total || 0);
      setPage(pg);
    } finally {
      setLoading(false);
    }
  }, [search, accept]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(1), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const hasMore = assets.length < total;

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", accept === "logo" ? "logo" : "general");
      const res = await mediaApi.upload(formData, pct => setUploadProgress(pct)) as { data: PickedAsset };
      if (res?.data) {
        setAssets(prev => [res.data, ...prev]);
        setSelected(res.data);
      }
    } catch (err: any) {
      setUploadError(err?.message || "فشل الرفع — تأكد من نوع الملف وحجمه");
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const sizeHint = hint || SIZE_HINTS[accept] || SIZE_HINTS.all;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col">

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); e.target.value = ""; }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Images className="w-4 h-4 text-brand-500" /> {title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-600 text-xs font-semibold hover:bg-brand-100 transition-colors disabled:opacity-50 border-0 cursor-pointer"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {uploading ? `${uploadProgress}%` : "رفع صورة"}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 border-0 bg-transparent cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search + size hint */}
        <div className="px-6 pt-3 pb-2 border-b border-gray-50 shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث باسم الملف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              autoFocus
            />
          </div>
          <div className="flex items-start gap-1.5 pb-1">
            <Info className="w-3 h-3 text-gray-300 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-400 leading-relaxed">{sizeHint}</p>
          </div>
          {uploadError && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{uploadError}</p>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && assets.length === 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Images className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">لا توجد ملفات</p>
              <p className="text-xs mt-1 opacity-70">ارفع ملفات من مكتبة الوسائط أولاً</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {assets.map(asset => (
                  <button
                    key={asset.id}
                    onClick={() => setSelected(selected?.id === asset.id ? null : asset)}
                    title={asset.name}
                    className={clsx(
                      "relative aspect-square rounded-xl border-2 overflow-hidden transition-all group",
                      selected?.id === asset.id
                        ? "border-brand-400 shadow-lg ring-2 ring-brand-200"
                        : "border-transparent hover:border-brand-200 hover:shadow-sm",
                    )}
                  >
                    {asset.fileType === "image" ? (
                      <img
                        src={asset.fileUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-1 p-1">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                        <span className="text-[9px] text-gray-400 truncate w-full text-center px-1">{asset.name}</span>
                      </div>
                    )}

                    {/* Selected overlay */}
                    {selected?.id === asset.id && (
                      <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                        <div className="bg-brand-500 rounded-full p-1 shadow">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Hover info */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-white truncate leading-tight">{asset.name}</p>
                      {asset.sizeBytes && (
                        <p className="text-[8px] text-white/70">{fileSizeLabel(asset.sizeBytes)}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {hasMore && (
                <button
                  onClick={() => load(page + 1)}
                  disabled={loading}
                  className="mt-4 w-full py-2.5 text-sm text-brand-600 font-medium border border-brand-200 rounded-xl hover:bg-brand-50 disabled:opacity-50 transition-colors"
                >
                  {loading ? "جاري التحميل..." : `تحميل المزيد (${total - assets.length} متبقي)`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50 rounded-b-2xl">
          <div>
            {selected ? (
              <div className="flex items-center gap-2">
                {selected.fileType === "image" && (
                  <img src={selected.fileUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-200" />
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-800 truncate max-w-[180px]">{selected.name}</p>
                  {selected.sizeBytes && <p className="text-[10px] text-gray-400">{fileSizeLabel(selected.sizeBytes)}</p>}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">لم يتم اختيار ملف بعد</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-white transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={() => { if (selected) { onSelect(selected); onClose(); } }}
              disabled={!selected}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Upload className="w-3.5 h-3.5" /> اختيار
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
