import { useState, useRef } from "react";
import {
  Upload, Download, CheckCircle2, XCircle, FileSpreadsheet, Clock,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";

// ── CSV parsing (no external library) ────────────────────────

function parseCSV(text: string): string[][] {
  return text
    .trim()
    .split("\n")
    .map((line) =>
      line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
    );
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return obj;
  });
}

// ── Types ─────────────────────────────────────────────────────

type ImportType = "students" | "classRooms" | "teachers" | "schedules";

const TABS: { key: ImportType; label: string }[] = [
  { key: "students",   label: "طلاب" },
  { key: "classRooms", label: "فصول" },
  { key: "teachers",   label: "معلمون" },
  { key: "schedules",  label: "الجداول" },
];

type PreviewRow = {
  data: Record<string, string>;
  valid: boolean;
  error?: string;
};

// ── Single Import Tab Component ───────────────────────────────

function ImportTab({ type }: { type: ImportType }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const { data: logsData, loading: logsLoading, refetch: refetchLogs } = useApi(
    () => schoolApi.listImportLogs({ type }),
    [type]
  );
  const logs: any[] = logsData?.data ?? [];

  const handleDownloadTemplate = async () => {
    try {
      const resp = await schoolApi.getImportTemplate(type);
      const templateData = (resp as any).data ?? resp;
      const headers: string[] = templateData.headers ?? Object.keys(templateData.sample ?? {});
      const sample: string[] = templateData.sample
        ? headers.map((h: string) => templateData.sample[h] ?? "")
        : [];

      const csvLines = [headers.join(",")];
      if (sample.length) csvLines.push(sample.join(","));

      const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template_${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // handled
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(null);
    setImportDone(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      setRawRows(rows);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handlePreview = async () => {
    if (rawRows.length < 2) return;
    setValidating(true);
    try {
      const objects = rowsToObjects(rawRows);
      const result: any = await schoolApi.previewImport(type, objects);
      setPreview(result?.data?.rows ?? result?.rows ?? []);
    } catch {
      // handled
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const validRows = preview.filter((r) => r.valid).map((r) => r.data);
      await schoolApi.confirmImport(type, validRows);
      setImportDone(true);
      setPreview(null);
      setRawRows([]);
      if (fileRef.current) fileRef.current.value = "";
      refetchLogs();
    } catch {
      // handled
    } finally {
      setImporting(false);
    }
  };

  const previewHeaders = rawRows[0] ?? [];
  const previewBodyRows = rawRows.slice(1, 11);
  const validCount = preview?.filter((r) => r.valid).length ?? 0;
  const errorCount = preview?.filter((r) => !r.valid).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          تحميل القالب
        </button>

        <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          رفع ملف
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Import success */}
      {importDone && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          تم الاستيراد بنجاح
        </div>
      )}

      {/* Raw Preview */}
      {rawRows.length > 1 && !preview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              معاينة الملف ({rawRows.length - 1} صف)
            </p>
            <button
              onClick={handlePreview}
              disabled={validating}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {validating ? "جاري التحقق..." : "معاينة وتحقق"}
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    {previewHeaders.map((h, i) => (
                      <th key={i} className="text-right px-3 py-2 font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {previewBodyRows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-gray-50">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 text-gray-700">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Validation Preview */}
      {preview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                {validCount} صف صالح
              </span>
              <span className="flex items-center gap-1.5 text-sm text-red-600">
                <XCircle className="w-4 h-4" />
                {errorCount} صف خاطئ
              </span>
            </div>
            {validCount > 0 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {importing ? "جاري الاستيراد..." : `تأكيد الاستيراد (${validCount})`}
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-right px-3 py-2 font-medium text-gray-500">الحالة</th>
                    {Object.keys(preview[0]?.data ?? {}).map((h) => (
                      <th key={h} className="text-right px-3 py-2 font-medium text-gray-500">{h}</th>
                    ))}
                    <th className="text-right px-3 py-2 font-medium text-gray-500">الخطأ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.map((row, i) => (
                    <tr
                      key={i}
                      className={clsx(
                        "hover:opacity-90 transition-opacity",
                        row.valid ? "bg-emerald-50/40" : "bg-red-50/40"
                      )}
                    >
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </td>
                      {Object.values(row.data).map((v, ci) => (
                        <td key={ci} className="px-3 py-2 text-gray-700">{v}</td>
                      ))}
                      <td className="px-3 py-2 text-red-500">{row.error ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Import Logs */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">سجل الاستيرادات السابقة</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {logsLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
              <Clock className="w-8 h-8" />
              <p className="text-xs">لا توجد استيرادات سابقة</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium">عدد الصفوف</th>
                  <th className="text-right px-4 py-3 font-medium">ناجح</th>
                  <th className="text-right px-4 py-3 font-medium">خطأ</th>
                  <th className="text-right px-4 py-3 font-medium">بواسطة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 tabular-nums text-xs">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("ar-SA") : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.totalRows ?? 0}</td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">{log.successRows ?? 0}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">{log.errorRows ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{log.createdByName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export function SchoolImportPage() {
  const [activeTab, setActiveTab] = useState<ImportType>("students");

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 p-6 text-white">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative">
          <h1 className="text-xl font-black">استيراد البيانات</h1>
          <p className="text-sm text-gray-400 mt-1">
            حمّل قالب CSV، عبّئه ببياناتك، ثم ارفعه للمعاينة والتحقق قبل التأكيد النهائي.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-medium">طلاب · فصول · معلمون · جداول</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <ImportTab key={activeTab} type={activeTab} />
    </div>
  );
}
