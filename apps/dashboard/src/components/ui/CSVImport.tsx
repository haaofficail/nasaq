import { useState, useRef } from "react";
import { Modal, Button } from "../ui";
import { Upload, FileSpreadsheet, Check, AlertCircle, X } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  type: "services" | "customers";
  onSuccess?: () => void;
};

type ImportResult = { imported: number; skipped: number; updated?: number; errors: { row: number; error: string }[] };

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });

  return { headers, rows };
}

const fieldMappings: Record<string, Record<string, string>> = {
  services: {
    "الاسم": "name", "name": "name", "اسم الخدمة": "name",
    "السعر": "basePrice", "price": "basePrice", "السعر الأساسي": "basePrice",
    "الوصف": "description", "description": "description",
    "الوصف المختصر": "shortDescription", "السعة": "maxCapacity", "capacity": "maxCapacity",
    "المدة": "durationMinutes", "duration": "durationMinutes",
  },
  customers: {
    "الاسم": "name", "name": "name", "اسم العميل": "name",
    "الجوال": "phone", "phone": "phone", "رقم الجوال": "phone",
    "البريد": "email", "email": "email",
    "المدينة": "city", "city": "city",
    "النوع": "type", "type": "type",
    "المصدر": "source", "source": "source",
    "الشركة": "companyName", "company": "companyName",
  },
};

export function CSVImport({ open, onClose, type, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setResult(null);
    const text = await f.text();
    const parsed = parseCSV(text);
    setPreview(parsed);
  };

  const mapRow = (row: Record<string, string>): Record<string, any> => {
    const mapped: Record<string, any> = {};
    const mapping = fieldMappings[type] || {};
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = mapping[key] || mapping[key.toLowerCase()] || key;
      mapped[mappedKey] = value;
    }
    return mapped;
  };

  const doImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const rows = preview.rows.map(mapRow);
      const res = await api.post<{ data: ImportResult }>(`/import/${type}`, { rows });
      setResult(res.data);
      if (res.data.imported > 0) onSuccess?.();
    } catch (err: any) {
      setResult({ imported: 0, skipped: preview.rows.length, errors: [{ row: 0, error: err.message }] });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); };

  const label = type === "services" ? "خدمات" : "عملاء";

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title={`استيراد ${label} من CSV`} size="xl"
      footer={result ? (
        <Button onClick={() => { reset(); onClose(); }}>إغلاق</Button>
      ) : preview ? (
        <>
          <Button variant="ghost" onClick={reset}>إعادة</Button>
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>إلغاء</Button>
          <Button onClick={doImport} loading={importing} icon={Upload}>استيراد {preview.rows.length} {label}</Button>
        </>
      ) : (
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
      )}
    >
      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <Check className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700">{result.imported}</p>
              <p className="text-xs text-green-600">تم الاستيراد</p>
            </div>
            {result.updated !== undefined && (
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <FileSpreadsheet className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                <p className="text-xs text-blue-600">تم التحديث</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <X className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-500">{result.skipped}</p>
              <p className="text-xs text-gray-400">تم تخطيه</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-50 rounded-xl p-4 max-h-40 overflow-y-auto">
              <p className="text-sm font-medium text-red-700 mb-2">الأخطاء:</p>
              {result.errors.slice(0, 10).map((e, i) => (
                <p key={i} className="text-xs text-red-600">صف {e.row}: {e.error}</p>
              ))}
              {result.errors.length > 10 && <p className="text-xs text-red-400 mt-1">... و {result.errors.length - 10} أخطاء أخرى</p>}
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {!result && preview && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700">{file?.name}</p>
              <p className="text-xs text-green-600">{preview.rows.length} صف — {preview.headers.length} عمود</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#eef2f6] rounded-lg max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">#</th>
                  {preview.headers.map(h => (
                    <th key={h} className="px-3 py-2 text-right text-gray-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-[#eef2f6]">
                    <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                    {preview.headers.map(h => (
                      <td key={h} className="px-3 py-1.5 text-gray-700 max-w-[200px] truncate">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 10 && <p className="text-xs text-gray-400 text-center">يعرض أول 10 صفوف من {preview.rows.length}</p>}
        </div>
      )}

      {/* Upload zone */}
      {!result && !preview && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#eef2f6] rounded-xl p-12 text-center cursor-pointer hover:border-[#eef2f6] hover:bg-[#f8fafc] transition-colors"
        >
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">اسحب ملف CSV هنا أو اضغط للاختيار</p>
          <p className="text-xs text-gray-400 mt-2">
            {type === "services" ? "الأعمدة المطلوبة: الاسم، السعر. اختيارية: الوصف، السعة، المدة" : "الأعمدة المطلوبة: الاسم، الجوال. اختيارية: البريد، المدينة، النوع، المصدر"}
          </p>
        </div>
      )}
    </Modal>
  );
}
