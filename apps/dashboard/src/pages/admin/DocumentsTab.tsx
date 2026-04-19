import React, { useState } from "react";
import { FileText, CheckCircle, XCircle, ExternalLink, AlertTriangle, Calendar, MessageCircle } from "lucide-react";
import { clsx } from "clsx";
import { adminApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { SectionHeader, Spinner, Empty, Modal } from "./shared";

const DOC_TYPES: Record<string, string> = {
  commercial_register: "سجل تجاري",
  freelance_doc: "وثيقة عمل حر",
  vat_certificate: "شهادة ضريبية",
  id_copy: "صورة الهوية",
  bank_certificate: "شهادة بنكية",
  license: "رخصة نشاط",
  other: "أخرى",
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:  { label: "بانتظار المراجعة", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "موافق عليها",      cls: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "مرفوضة",           cls: "bg-red-50 text-red-500" },
};

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function DocumentsTab() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectModal, setRejectModal] = useState<{ open: boolean; docId: string }>({ open: false, docId: "" });
  const [rejectionReason, setRejectionReason] = useState("");

  const { data, loading, refetch } = useApi(
    () => adminApi.documents({ status: statusFilter || undefined }),
    [statusFilter],
  );
  const { mutate: updateDoc } = useMutation(
    ({ id, payload }: { id: string; payload: any }) => adminApi.updateDocument(id, payload),
  );

  const docs: any[] = data?.data || [];

  const counts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    all: 0,
  };
  // counts are approximate from current page; good enough for tab badges
  if (!loading) {
    docs.forEach((doc: any) => {
      if (doc.status === "pending") counts.pending++;
      else if (doc.status === "approved") counts.approved++;
      else if (doc.status === "rejected") counts.rejected++;
    });
    counts.all = docs.length;
  }

  const handleApprove = async (id: string) => {
    const result = await updateDoc({ id, payload: { status: "approved" } });
    if (result) {
      toast.success("تمت الموافقة على الوثيقة");
      // Try sending WhatsApp notification
      const doc = docs.find((d: any) => d.id === id);
      if (doc?.orgId) {
        sendDocNotification(doc, "approved");
      }
      refetch();
    }
  };

  const openRejectModal = (id: string) => {
    setRejectionReason("");
    setRejectModal({ open: true, docId: id });
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("يرجى كتابة سبب الرفض");
      return;
    }
    const result = await updateDoc({
      id: rejectModal.docId,
      payload: { status: "rejected", rejectionReason: rejectionReason.trim() },
    });
    if (result) {
      toast.success("تم رفض الوثيقة");
      // Try sending WhatsApp notification
      const doc = docs.find((d: any) => d.id === rejectModal.docId);
      if (doc?.orgId) {
        sendDocNotification(doc, "rejected", rejectionReason.trim());
      }
      setRejectModal({ open: false, docId: "" });
      refetch();
    }
  };

  // Send WhatsApp notification for document status change
  const sendDocNotification = async (doc: any, action: string, reason?: string) => {
    // Only send if org has a valid phone number
    const phone = doc.orgPhone;
    if (!phone || phone.length < 5) return;
    try {
      await adminApi.sendDocNotification({
        phone,
        orgName: doc.orgName || "المنشأة",
        documentType: DOC_TYPES[doc.type] || doc.type,
        action,
        rejectionReason: reason,
        expiresAt: doc.expiresAt,
        orgId: doc.orgId,
      });
    } catch {
      // Silent — notification is best-effort
    }
  };

  const tabs: [string, string][] = [
    ["pending", "انتظار"],
    ["approved", "موافق"],
    ["rejected", "مرفوض"],
    ["", "الكل"],
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="الوثائق" sub="مراجعة وتوثيق المنشآت" />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {tabs.map(([value, label]) => {
          const key = (value || "all") as keyof typeof counts;
          const c = counts[key];
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors inline-flex items-center gap-1.5",
                statusFilter === value
                  ? "bg-brand-500 text-white"
                  : "bg-white border border-[#eef2f6] text-gray-600 hover:bg-[#f8fafc]",
              )}
            >
              {label}
              {!loading && c > 0 && (
                <span
                  className={clsx(
                    "text-[10px] leading-none px-1.5 py-0.5 rounded-full",
                    statusFilter === value
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500",
                  )}
                >
                  {c}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Document list */}
      {loading ? (
        <Spinner />
      ) : docs.length === 0 ? (
        <Empty icon={FileText} text="لا توجد وثائق" />
      ) : (
        <div className="space-y-3">
          {docs.map((doc: any) => {
            const expiringSoon = isExpiringSoon(doc.expiresAt);
            const expired = isExpired(doc.expiresAt);
            const statusInfo = STATUS_MAP[doc.status] || STATUS_MAP.pending;

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-[#eef2f6] p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-[10px] bg-[#f8fafc] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">
                        {DOC_TYPES[doc.type] || doc.type}
                      </p>
                      <span className={clsx("text-[11px] px-2 py-0.5 rounded-full font-medium", statusInfo.cls)}>
                        {statusInfo.label}
                      </span>
                      {(expiringSoon || expired) && (
                        <span
                          className={clsx(
                            "text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1",
                            expired
                              ? "bg-red-50 text-red-500"
                              : "bg-amber-50 text-amber-600",
                          )}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {expired ? "منتهية الصلاحية" : "قاربت على الانتهاء"}
                        </span>
                      )}
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-500">
                      <div>
                        <span className="text-gray-400">المنشأة: </span>
                        <span className="text-gray-700">{doc.orgName || doc.orgId?.slice(0, 8)}</span>
                      </div>
                      {doc.documentNumber && (
                        <div>
                          <span className="text-gray-400">رقم الوثيقة: </span>
                          <span className="text-gray-700">{doc.documentNumber}</span>
                        </div>
                      )}
                      {doc.label && (
                        <div>
                          <span className="text-gray-400">التسمية: </span>
                          <span className="text-gray-700">{doc.label}</span>
                        </div>
                      )}
                      {doc.expiresAt && (
                        <div className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-400">تنتهي: </span>
                          <span className={clsx("text-gray-700", expired && "text-red-500 font-medium")}>
                            {formatDate(doc.expiresAt)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">تاريخ الرفع: </span>
                        <span className="text-gray-700">{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>

                    {/* Rejection reason */}
                    {doc.status === "rejected" && doc.rejectionReason && (
                      <div className="text-xs bg-red-50 text-red-600 rounded-xl px-3 py-2">
                        <span className="font-medium">سبب الرفض: </span>
                        {doc.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-[#f8fafc] text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="عرض الملف"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {doc.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(doc.id)}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          title="موافقة"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openRejectModal(doc.id)}
                          className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          title="رفض"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, docId: "" })} title="رفض الوثيقة">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">سبب الرفض</label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[#eef2f6] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            placeholder="اكتب سبب رفض الوثيقة..."
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setRejectModal({ open: false, docId: "" })}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              تأكيد الرفض
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default DocumentsTab;
