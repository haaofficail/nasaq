import { useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { hrApi } from "@/lib/api";
import { Modal } from "@/components/ui";
import { Printer, Download } from "lucide-react";

function SAR(v: any) {
  const n = parseFloat(v ?? 0);
  return n.toLocaleString("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 });
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className={bold ? "font-bold bg-gray-50" : ""}>
      <td className="py-1.5 px-3 text-sm text-gray-700 border-b border-gray-100">{label}</td>
      <td className="py-1.5 px-3 text-sm text-gray-800 text-left border-b border-gray-100">{value}</td>
    </tr>
  );
}

export function PayslipModal({
  payrollId,
  employeeId,
  onClose,
}: {
  payrollId: string;
  employeeId: string;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data, loading, error } = useApi(
    () => hrApi.payslip(payrollId, employeeId),
    [payrollId, employeeId]
  );
  const slip = data?.data ?? null;

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`
      <html dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>قسيمة الراتب</title>
          <style>
            body { font-family: "IBM Plex Sans Arabic", Arial, sans-serif; margin: 20px; color: #1a1a1a; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 6px 10px; font-size: 13px; border-bottom: 1px solid #eee; }
            .header { text-align: center; margin-bottom: 24px; }
            .section { margin-bottom: 16px; }
            .section-title { font-weight: bold; font-size: 13px; background: #f5f5f5; padding: 6px 10px; border-radius: 4px; margin-bottom: 4px; }
            .total { font-weight: bold; font-size: 14px; background: #f0f9f4; }
            .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #888; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <Modal open title="قسيمة الراتب" onClose={onClose} size="md">
      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">جاري تحميل القسيمة...</div>
      ) : error || !slip ? (
        <div className="p-8 text-center text-red-500 text-sm">تعذّر تحميل القسيمة</div>
      ) : (
        <>
          {/* Actions */}
          <div className="flex justify-end gap-2 px-4 py-3 border-b">
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
              <Printer className="w-4 h-4" /> طباعة
            </button>
          </div>

          {/* Payslip content */}
          <div ref={printRef} className="p-5 space-y-4" dir="rtl">
            {/* Header */}
            <div className="header text-center border-b pb-4 mb-4">
              <div className="text-lg font-bold text-gray-800">{slip.orgName ?? "المنشأة"}</div>
              <div className="text-xs text-gray-500 mt-1">قسيمة راتب — {slip.payrollMonth}</div>
            </div>

            {/* Employee info */}
            <div className="section">
              <div className="section-title bg-gray-50 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 mb-2">بيانات الموظف</div>
              <table className="w-full">
                <tbody>
                  <Row label="الاسم" value={slip.employee?.fullName ?? "—"} />
                  <Row label="الرقم الوظيفي" value={slip.employee?.employeeNumber ?? "—"} />
                  <Row label="المسمى الوظيفي" value={slip.employee?.jobTitle ?? "—"} />
                  <Row label="القسم" value={slip.employee?.department ?? "—"} />
                  <Row label="تاريخ الصرف" value={slip.payrollDate ?? "—"} />
                </tbody>
              </table>
            </div>

            {/* Earnings */}
            <div className="section">
              <div className="section-title bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 mb-2">الإضافات</div>
              <table className="w-full">
                <tbody>
                  <Row label="الراتب الأساسي" value={SAR(slip.basicSalary)} />
                  {parseFloat(slip.housingAllowance) > 0 && <Row label="بدل السكن" value={SAR(slip.housingAllowance)} />}
                  {parseFloat(slip.transportAllowance) > 0 && <Row label="بدل المواصلات" value={SAR(slip.transportAllowance)} />}
                  {parseFloat(slip.overtimeAmount) > 0 && <Row label="أجر الإضافي" value={SAR(slip.overtimeAmount)} />}
                  {parseFloat(slip.additionsAmount) > 0 && <Row label="إضافات أخرى" value={SAR(slip.additionsAmount)} />}
                  <Row label="إجمالي الإضافات" value={SAR(
                    parseFloat(slip.basicSalary || 0) +
                    parseFloat(slip.housingAllowance || 0) +
                    parseFloat(slip.transportAllowance || 0) +
                    parseFloat(slip.overtimeAmount || 0) +
                    parseFloat(slip.additionsAmount || 0)
                  )} bold />
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div className="section">
              <div className="section-title bg-red-50 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 mb-2">الحسومات</div>
              <table className="w-full">
                <tbody>
                  {parseFloat(slip.absenceDeduction) > 0 && <Row label="حسم الغياب" value={SAR(slip.absenceDeduction)} />}
                  {parseFloat(slip.lateDeduction) > 0 && <Row label="حسم التأخير" value={SAR(slip.lateDeduction)} />}
                  {parseFloat(slip.loansDeduction) > 0 && <Row label="اقتطاع السلف" value={SAR(slip.loansDeduction)} />}
                  {parseFloat(slip.directDeductions) > 0 && <Row label="حسومات أخرى" value={SAR(slip.directDeductions)} />}
                  {parseFloat(slip.gosiEmployee) > 0 && <Row label="التأمينات (حصة الموظف)" value={SAR(slip.gosiEmployee)} />}
                  <Row label="إجمالي الحسومات" value={SAR(
                    parseFloat(slip.absenceDeduction || 0) +
                    parseFloat(slip.lateDeduction || 0) +
                    parseFloat(slip.loansDeduction || 0) +
                    parseFloat(slip.directDeductions || 0) +
                    parseFloat(slip.gosiEmployee || 0)
                  )} bold />
                </tbody>
              </table>
            </div>

            {/* Net */}
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">صافي الراتب</div>
              <div className="text-2xl font-bold text-brand-700">{SAR(slip.netSalary)}</div>
            </div>

            {/* Attendance summary */}
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="font-bold text-gray-800">{slip.workingDays ?? 0}</div>
                <div className="text-xs text-gray-500">أيام العمل</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <div className="font-bold text-red-600">{slip.absentDays ?? 0}</div>
                <div className="text-xs text-gray-500">أيام الغياب</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <div className="font-bold text-emerald-700">{parseFloat(slip.overtimeHours ?? 0).toFixed(1)}</div>
                <div className="text-xs text-gray-500">ساعات إضافية</div>
              </div>
            </div>

            {/* Footer */}
            <div className="footer text-center text-xs text-gray-400 border-t pt-3 mt-3">
              هذه القسيمة وثيقة رسمية — تم إصدارها من نظام ترميز OS
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
