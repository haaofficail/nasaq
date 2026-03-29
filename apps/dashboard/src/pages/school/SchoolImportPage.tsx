import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload, Download, CheckCircle2, XCircle, FileSpreadsheet,
  Clock, AlertTriangle, Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { schoolApi } from "@/lib/api";
import { fmtHijri } from "@/lib/utils";

// ── Template definitions (mirrors backend IMPORT_TEMPLATES) ────

type ImportType = "students" | "classRooms" | "teachers" | "schedules";

const TEMPLATES: Record<ImportType, {
  headers: string[];
  sample: Record<string, string>;
  required: string[];
}> = {
  students: {
    headers:  ["الاسم الكامل", "رقم الطالب", "رقم الهوية", "تاريخ الميلاد", "الجنس", "الصف", "اسم الفصل", "اسم ولي الأمر", "جوال ولي الأمر", "صلة القرابة"],
    sample:   { "الاسم الكامل": "أحمد علي الزهراني", "رقم الطالب": "S-001", "رقم الهوية": "", "تاريخ الميلاد": "2015-03-10", "الجنس": "ذكر", "الصف": "الأول الابتدائي", "اسم الفصل": "أ", "اسم ولي الأمر": "علي الزهراني", "جوال ولي الأمر": "0512345678", "صلة القرابة": "الأب" },
    required: ["الاسم الكامل"],
  },
  teachers: {
    headers:  ["الاسم الكامل", "الرقم الوظيفي", "المادة", "الجوال", "البريد الإلكتروني", "رقم الهوية", "الجنس", "المؤهل العلمي"],
    sample:   { "الاسم الكامل": "محمد سعد العتيبي", "الرقم الوظيفي": "EMP-001", "المادة": "الرياضيات", "الجوال": "0556789012", "البريد الإلكتروني": "teacher@school.sa", "رقم الهوية": "", "الجنس": "ذكر", "المؤهل العلمي": "بكالوريوس تربية" },
    required: ["الاسم الكامل"],
  },
  classRooms: {
    headers:  ["الصف", "اسم الفصل", "الطاقة الاستيعابية"],
    sample:   { "الصف": "الأول الابتدائي", "اسم الفصل": "أ", "الطاقة الاستيعابية": "30" },
    required: ["الصف", "اسم الفصل"],
  },
  schedules: {
    headers:  ["الصف", "اسم الفصل", "اليوم", "رقم الحصة", "المادة", "اسم المعلم"],
    sample:   { "الصف": "الأول الابتدائي", "اسم الفصل": "أ", "اليوم": "الأحد", "رقم الحصة": "1", "المادة": "الرياضيات", "اسم المعلم": "محمد العتيبي" },
    required: ["الصف", "اسم الفصل", "اليوم", "رقم الحصة"],
  },
};

const TABS: { key: ImportType; label: string }[] = [
  { key: "students",   label: "طلاب" },
  { key: "classRooms", label: "فصول" },
  { key: "teachers",   label: "معلمون" },
  { key: "schedules",  label: "الجداول" },
];

type ParsedRow = Record<string, string>;

type ValidatedRow = {
  data: Record<string, string>;
  valid: boolean;
  error?: string;
  classroomStatus?: "found" | "will_create" | "unspecified";
  normalizedGrade?: string;
};

type ImportResult = {
  imported: number;
  errors: number;
  classroomsCreated?: number;
};

// ── File parsing with SheetJS ──────────────────────────────────

function parseFile(buffer: ArrayBuffer, fileName: string): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false,
  });
  // Normalise every cell value to string
  return rows.map((row) => {
    const obj: ParsedRow = {};
    for (const key of Object.keys(row)) {
      obj[String(key).trim()] = String(row[key] ?? "").trim();
    }
    return obj;
  });
}

// ── Client-side row validation ────────────────────────────────

function clientValidate(rows: ParsedRow[], required: string[]): ValidatedRow[] {
  return rows.map((row) => {
    const missing = required.filter((col) => !row[col]?.trim());
    if (missing.length > 0) {
      return { data: row, valid: false, error: `حقول مطلوبة: ${missing.join("، ")}` };
    }
    return { data: row, valid: true };
  });
}

// ── Template download as .xlsx ─────────────────────────────────

function downloadTemplate(type: ImportType) {
  const tpl = TEMPLATES[type];
  const ws = XLSX.utils.aoa_to_sheet([
    tpl.headers,
    tpl.headers.map((h) => tpl.sample[h] ?? ""),
  ]);

  // Column widths
  ws["!cols"] = tpl.headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "البيانات");
  XLSX.writeFile(wb, `قالب_${type}.xlsx`);
}

// ── Import Tab ────────────────────────────────────────────────

function ImportTab({ type }: { type: ImportType }) {
  const tpl = TEMPLATES[type];
  const fileRef = useRef<HTMLInputElement>(null);

  // State
  const [fileName,       setFileName]       = useState<string | null>(null);
  const [parsedRows,     setParsedRows]      = useState<ParsedRow[]>([]);
  const [missingCols,    setMissingCols]     = useState<string[]>([]);
  const [clientRows,     setClientRows]      = useState<ValidatedRow[] | null>(null);
  const [serverRows,     setServerRows]      = useState<ValidatedRow[] | null>(null);
  const [parsing,        setParsing]         = useState(false);
  const [validating,     setValidating]      = useState(false);
  const [importing,      setImporting]       = useState(false);
  const [importProgress, setImportProgress]  = useState(0);
  const [importResult,   setImportResult]    = useState<ImportResult | null>(null);
  const [parseError,     setParseError]      = useState<string | null>(null);

  const { data: logsData, loading: logsLoading, refetch: refetchLogs } = useApi(
    () => schoolApi.listImportLogs({ type }),
    [type]
  );
  const logs: any[] = logsData?.data ?? [];

  // ── Reset on new file ──────────────────────────────────────
  const reset = () => {
    setParsedRows([]);
    setMissingCols([]);
    setClientRows(null);
    setServerRows(null);
    setImportResult(null);
    setParseError(null);
    setFileName(null);
    setImportProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── File selected ──────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    reset();
    setFileName(file.name);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer;
        const rows = parseFile(buffer, file.name);

        if (rows.length === 0) {
          setParseError("الملف فارغ أو لا يحتوي على بيانات.");
          setParsing(false);
          return;
        }

        // Detect missing required columns
        const fileHeaders = Object.keys(rows[0]);
        const missing = tpl.required.filter((col) => !fileHeaders.includes(col));
        setMissingCols(missing);
        setParsedRows(rows);

        // Client-side validation immediately
        const validated = clientValidate(rows, tpl.required);
        setClientRows(validated);
      } catch {
        setParseError("تعذّرت قراءة الملف. تأكد أنه بصيغة xlsx أو csv صحيحة.");
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Server validation ──────────────────────────────────────
  const handleServerValidate = async () => {
    if (parsedRows.length === 0) return;
    setValidating(true);
    try {
      const result: any = await schoolApi.previewImport(type, parsedRows);
      setServerRows(result?.data?.rows ?? result?.rows ?? []);
    } catch {
      // api layer handles
    } finally {
      setValidating(false);
    }
  };

  // ── Confirm import ─────────────────────────────────────────
  const handleImport = async () => {
    const rows = serverRows ?? clientRows;
    if (!rows) return;

    const validRows = rows.filter((r) => r.valid).map((r) => r.data);
    if (validRows.length === 0) return;

    setImporting(true);
    setImportProgress(0);

    // Simulate progress while waiting
    const interval = setInterval(() => {
      setImportProgress((p) => (p < 85 ? p + 12 : p));
    }, 200);

    try {
      const res: any = await schoolApi.confirmImport(type, validRows);
      clearInterval(interval);
      setImportProgress(100);
      const data = res?.data ?? res;
      setImportResult({
        imported:          data?.imported          ?? validRows.length,
        errors:            data?.errors            ?? 0,
        classroomsCreated: data?.classroomsCreated ?? 0,
      });
      // Clear file state
      setParsedRows([]);
      setClientRows(null);
      setServerRows(null);
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      refetchLogs();
    } catch {
      clearInterval(interval);
    } finally {
      setImporting(false);
    }
  };

  // ── Derived counts ─────────────────────────────────────────
  const displayRows  = serverRows ?? clientRows;
  const validCount   = displayRows?.filter((r) => r.valid).length  ?? 0;
  const errorCount   = displayRows?.filter((r) => !r.valid).length ?? 0;
  const displayHeaders = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : [];

  return (
    <div className="space-y-5">

      {/* Actions bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => downloadTemplate(type)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          تحميل القالب (.xlsx)
        </button>

        <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          {fileName ? `${fileName}` : "رفع ملف"}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {fileName && (
          <button
            onClick={reset}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          >
            مسح
          </button>
        )}
      </div>

      {/* Parsing spinner */}
      {parsing && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          جاري قراءة الملف...
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <XCircle className="w-4 h-4 shrink-0" />
          {parseError}
        </div>
      )}

      {/* Missing columns warning */}
      {missingCols.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">أعمدة مطلوبة غير موجودة في الملف</p>
            <p className="text-xs mt-0.5">
              الأعمدة الناقصة: <span className="font-mono">{missingCols.join("، ")}</span>
            </p>
            <p className="text-xs mt-1 text-amber-700">
              حمّل القالب للحصول على الأعمدة الصحيحة.
            </p>
          </div>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className={clsx(
          "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
          importResult.errors === 0
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-amber-50 border-amber-200 text-amber-800"
        )}>
          {importResult.errors === 0
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />
          }
          <span>
            تم الاستيراد —{" "}
            <strong>{importResult.imported}</strong> صف ناجح
            {(importResult.classroomsCreated ?? 0) > 0 && (
              <span className="text-emerald-600"> · {importResult.classroomsCreated} فصل أُنشئ تلقائياً</span>
            )}
            {importResult.errors > 0 && (
              <span className="text-red-600"> · {importResult.errors} صف فشل</span>
            )}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {importing && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              جاري الاستيراد...
            </span>
            <span>{importProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* File preview + validation */}
      {displayRows && displayRows.length > 0 && !importing && (
        <div className="space-y-3">
          {/* Summary + actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                {validCount} جاهز للاستيراد
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                  <XCircle className="w-4 h-4" />
                  {errorCount} صف فيه بيانات ناقصة
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!serverRows && missingCols.length === 0 && (
                <button
                  onClick={handleServerValidate}
                  disabled={validating}
                  className="px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 text-sm font-medium hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                >
                  {validating ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      جاري التحقق...
                    </span>
                  ) : "تحقق من الخادم"}
                </button>
              )}
              {validCount > 0 && missingCols.length === 0 && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  تأكيد الاستيراد ({validCount})
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-8">#</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-500 w-16">الحالة</th>
                    {displayHeaders.map((h) => (
                      <th
                        key={h}
                        className={clsx(
                          "text-right px-3 py-2.5 font-semibold whitespace-nowrap",
                          tpl.required.includes(h) ? "text-gray-800" : "text-gray-400"
                        )}
                      >
                        {h}
                        {tpl.required.includes(h) && (
                          <span className="text-red-400 mr-0.5">*</span>
                        )}
                      </th>
                    ))}
                    {type === "students" && serverRows && (
                      <th className="text-right px-3 py-2.5 font-semibold text-gray-500 whitespace-nowrap">الفصل</th>
                    )}
                    <th className="text-right px-3 py-2.5 font-semibold text-gray-500">ملاحظة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayRows.map((row, i) => (
                    <tr
                      key={i}
                      className={clsx(
                        "transition-colors",
                        row.valid
                          ? "hover:bg-emerald-50/30"
                          : "bg-red-50/50 hover:bg-red-50"
                      )}
                    >
                      <td className="px-3 py-2 text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2">
                        {row.valid
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          : <XCircle className="w-3.5 h-3.5 text-red-500" />
                        }
                      </td>
                      {displayHeaders.map((h) => {
                        const val = row.data[h] ?? "";
                        const isEmpty = tpl.required.includes(h) && !val.trim();
                        return (
                          <td
                            key={h}
                            className={clsx(
                              "px-3 py-2",
                              isEmpty ? "text-red-400 font-medium" : "text-gray-700"
                            )}
                          >
                            {val || (isEmpty ? "—" : "")}
                          </td>
                        );
                      })}
                      {type === "students" && serverRows && (
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.classroomStatus === "found" && (
                            <span className="text-emerald-600 text-[11px] font-medium">موجود</span>
                          )}
                          {row.classroomStatus === "will_create" && (
                            <span className="text-blue-600 text-[11px] font-medium">سيُنشأ تلقائياً</span>
                          )}
                          {row.classroomStatus === "unspecified" && (
                            <span className="text-gray-400 text-[11px]">غير محدد</span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2 text-red-500 text-[11px]">
                        {row.error ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {displayRows.length > 20 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                يُعرض {Math.min(displayRows.length, displayRows.length)} من {parsedRows.length} صف
              </div>
            )}
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
                <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
                  <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium">الإجمالي</th>
                  <th className="text-right px-4 py-3 font-medium">ناجح</th>
                  <th className="text-right px-4 py-3 font-medium">خطأ</th>
                  <th className="text-right px-4 py-3 font-medium">بواسطة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">
                      {fmtHijri(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {log.totalRows ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-700 font-semibold">{log.successRows ?? log.importedRows ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "font-semibold",
                        (log.errorRows ?? 0) > 0 ? "text-red-600" : "text-gray-400"
                      )}>
                        {log.errorRows ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{log.createdByName ?? "—"}</td>
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

// ── Page ───────────────────────────────────────────────────────

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
            حمّل القالب xlsx، عبّئه ببياناتك، ارفعه للمعاينة والتحقق، ثم أكّد الاستيراد.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-medium">
              يدعم xlsx · xls · csv — الأعمدة المطلوبة محددة بـ *
            </span>
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
