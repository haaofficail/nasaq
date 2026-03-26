import React, { useState } from "react";
import { FileText, CheckCircle, XCircle } from "lucide-react";
import { clsx } from "clsx";
import { adminApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { SectionHeader, Spinner, Empty } from "./shared";

function DocumentsTab() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const { data, loading, refetch } = useApi(() => adminApi.documents({ status: statusFilter || undefined }), [statusFilter]);
  const { mutate: updateDoc } = useMutation(({ id, status }: any) => adminApi.updateDocument(id, { status }));
  const docs: any[] = data?.data || [];

  return (
    <div className="space-y-5">
      <SectionHeader title="الوثائق" sub="مراجعة وتوثيق المنشآت" />
      <div className="flex gap-2">
        {[["pending", "انتظار"], ["approved", "موافق"], ["rejected", "مرفوض"], ["", "الكل"]].map(([s, l]) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
              statusFilter === s ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
            {l}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : docs.length === 0 ? <Empty icon={FileText} text="لا توجد وثائق" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {docs.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50">
              <FileText className="w-5 h-5 text-gray-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{doc.label || doc.type}</p>
                <p className="text-xs text-gray-400">{doc.type}</p>
              </div>
              {doc.status === "pending" ? (
                <div className="flex gap-2 shrink-0">
                  <button onClick={async () => { await updateDoc({ id: doc.id, status: "approved" }); refetch(); }}
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={async () => { await updateDoc({ id: doc.id, status: "rejected" }); refetch(); }}
                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><XCircle className="w-4 h-4" /></button>
                </div>
              ) : (
                <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium",
                  doc.status === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>
                  {doc.status === "approved" ? "موافق" : "مرفوض"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentsTab;
