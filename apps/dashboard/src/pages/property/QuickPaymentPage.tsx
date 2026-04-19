import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { propertyApi } from "@/lib/api";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";

const PAYMENT_METHODS_AR: Record<string, string> = {
  cash: "نقد", bank_transfer: "تحويل بنكي", cheque: "شيك",
  mada: "مدى", visa: "فيزا", stc_pay: "STC Pay",
};

export function QuickPaymentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [contractSearch, setContractSearch] = useState("");
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [transferReference, setTransferReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<any | null>(null);

  const { data: contractsData, loading: contractsLoading } = useApi(
    () => contractSearch.length >= 2
      ? propertyApi.contracts.list({ search: contractSearch, status: "active" })
      : Promise.resolve({ data: [] }),
    [contractSearch]
  );
  const contracts: any[] = (contractsData as any)?.data ?? [];

  const { mutate: quickPay, loading: paying } = useMutation((d: any) =>
    propertyApi.quickPayment(d)
  );

  function selectContract(c: any) {
    setSelectedContract(c);
    setAmount(String(c.rentAmount ?? ""));
    setStep(2);
  }

  async function handlePay() {
    if (!selectedContract) return;
    const res = await quickPay({
      contractId: selectedContract.id,
      amount: Number(amount),
      method,
      transferReference,
      notes,
    });
    if (res) {
      const receiptData = (res as any).data;
      setReceipt(receiptData);
      toast.success("تم تسجيل الدفعة بنجاح");
      setStep(3);
    }
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">دفع سريع</h1>
          <p className="text-sm text-gray-400 mt-0.5">سجّل دفعة في 3 خطوات</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {([1, 2, 3] as const).map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                step === s ? "bg-brand-500 text-white" :
                step > s ? "bg-emerald-500 text-white" :
                "bg-gray-100 text-gray-500"
              )}>
                {step > s ? "✓" : s}
              </div>
              <span className={clsx("text-xs", step >= s ? "text-gray-700 font-medium" : "text-gray-400")}>
                {s === 1 ? "اختر العقد" : s === 2 ? "المبلغ والطريقة" : "تأكيد"}
              </span>
              {s < 3 && <div className={clsx("flex-1 h-0.5", step > s ? "bg-emerald-400" : "bg-gray-100")} />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Contract */}
        {step === 1 && (
          <div className="bg-white border border-[#eef2f6] rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">اختر العقد</h2>
            <input
              value={contractSearch}
              onChange={(e) => setContractSearch(e.target.value)}
              placeholder="ابحث باسم المستأجر أو رقم الوحدة..."
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            {contractsLoading && contractSearch.length >= 2 && (
              <SkeletonRows rows={3} />
            )}
            {!contractsLoading && contractSearch.length >= 2 && contracts.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">لا توجد عقود مطابقة</p>
            )}
            {contractSearch.length < 2 && (
              <p className="text-xs text-gray-400 text-center py-4">اكتب حرفين على الأقل للبحث</p>
            )}
            {contracts.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {contracts.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => selectContract(c)}
                    className="w-full text-right bg-[#f8fafc] hover:bg-brand-50 border border-[#eef2f6] hover:border-brand-200 rounded-xl p-3 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.tenantName ?? "مستأجر"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{c.unitName ?? "—"} — {c.contractNumber}</p>
                      </div>
                      <p className="text-sm font-bold text-brand-600">{Number(c.rentAmount ?? 0).toLocaleString("en-US")} ريال</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Amount + Method */}
        {step === 2 && selectedContract && (
          <div className="bg-white border border-[#eef2f6] rounded-2xl shadow-sm p-5 space-y-4">
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-3">
              <p className="text-xs text-brand-600 font-medium">العقد المحدد</p>
              <p className="text-sm font-bold text-gray-800 mt-1">{selectedContract.tenantName} — {selectedContract.unitName}</p>
              <p className="text-xs text-gray-500">{selectedContract.contractNumber}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ريال)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PAYMENT_METHODS_AR).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setMethod(k)}
                      className={clsx(
                        "border rounded-xl py-2 text-xs font-medium transition-colors",
                        method === k
                          ? "bg-brand-500 text-white border-brand-500"
                          : "border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              {method === "bank_transfer" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم التحويل</label>
                  <input
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm border border-[#eef2f6] rounded-xl text-gray-600 hover:bg-[#f8fafc]"
              >
                رجوع
              </button>
              <button
                onClick={handlePay}
                disabled={paying || !amount || Number(amount) <= 0}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {paying ? "جارٍ التسجيل..." : "سجّل الدفعة"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && receipt && (
          <div className="bg-white border border-[#eef2f6] rounded-2xl shadow-sm p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl text-emerald-600">✓</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">تم تسجيل الدفعة</h2>
            <div className="bg-gray-50 rounded-2xl p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">رقم السند</span>
                <span className="font-bold text-gray-800">{receipt.receiptNumber ?? receipt.id?.slice(0, 12)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">المبلغ</span>
                <span className="font-bold text-emerald-700">{Number(receipt.amount ?? amount).toLocaleString("en-US")} ريال</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">طريقة الدفع</span>
                <span className="text-gray-700">{PAYMENT_METHODS_AR[method] ?? method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">التاريخ</span>
                <span className="text-gray-700">{new Date().toLocaleDateString("ar-SA")}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => { setStep(1); setSelectedContract(null); setContractSearch(""); setAmount(""); setReceipt(null); }}
                className="border border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc] px-4 py-2 rounded-xl text-sm font-medium"
              >
                دفعة جديدة
              </button>
              <button
                onClick={() => navigate("/property/payments")}
                className="bg-brand-500 text-white hover:bg-brand-600 px-4 py-2 rounded-xl text-sm font-medium"
              >
                سجل المدفوعات
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
