import { useState } from "react";
import { Star, MessageSquare, Eye, EyeOff, CheckCircle2, XCircle, Trash2, RefreshCw, Filter } from "lucide-react";
import { clsx } from "clsx";
import { marketingApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, TextArea } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

// ── helpers ───────────────────────────────────────────────────
function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={clsx("w-3.5 h-3.5", n <= rating ? "text-amber-400 fill-amber-400" : "text-gray-200")} />
      ))}
    </div>
  );
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:  { label: "قيد المراجعة", color: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "موافق عليه",   color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "مرفوض",        color: "bg-red-50 text-red-600 border-red-200" },
};

const TABS = [
  { key: "", label: "الكل" },
  { key: "pending",  label: "قيد المراجعة" },
  { key: "approved", label: "موافق عليه" },
  { key: "rejected", label: "مرفوض" },
];

// ── component ─────────────────────────────────────────────────
export function ReviewsPage() {
  const [tab, setTab]             = useState("");
  const [responding, setResponding] = useState<any | null>(null);
  const [responseText, setResponseText] = useState("");

  const { data: statsRes }              = useApi(() => marketingApi.reviewStats(), []);
  const { data: res, loading, refetch } = useApi(() => marketingApi.reviews(tab || undefined), [tab]);

  const { mutate: respondFn, loading: saving } = useMutation(({ id, text }: any) => marketingApi.respondReview(id, text));
  const { mutate: toggleVis }    = useMutation((id: string) => marketingApi.toggleReviewVisibility(id));
  const { mutate: updateStatus } = useMutation(({ id, s }: any) => marketingApi.updateReviewStatus(id, s));
  const { mutate: deleteFn }     = useMutation((id: string) => marketingApi.deleteReview(id));

  const reviewList: any[] = res?.data || [];
  const stats = statsRes?.data || {};

  const handleRespond = async () => {
    if (!responseText.trim()) return;
    await respondFn({ id: responding.id, text: responseText });
    toast.success("تم إرسال الرد");
    setResponding(null); setResponseText("");
    refetch();
  };

  const handleToggle = async (id: string) => {
    await toggleVis(id);
    toast.success("تم تغيير الظهور");
    refetch();
  };

  const handleApprove = async (id: string) => {
    await updateStatus({ id, s: "approved" });
    toast.success("تم الموافقة على التقييم");
    refetch();
  };

  const handleReject = async (id: string) => {
    await updateStatus({ id, s: "rejected" });
    toast.success("تم رفض التقييم");
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التقييم؟")) return;
    await deleteFn(id);
    toast.success("تم الحذف");
    refetch();
  };

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" /> تقييمات العملاء
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">إدارة وعرض تقييمات العملاء وردود الفعل</p>
        </div>
        <button onClick={refetch} className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#eef2f6] hover:bg-[#f8fafc] text-gray-500 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">إجمالي التقييمات</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-2xl font-bold text-amber-500">{stats.avg || "0.0"}</p>
            <p className="text-sm text-gray-400">/ 5</p>
          </div>
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(n => (
              <Star key={n} className={clsx("w-3.5 h-3.5", n <= Math.round(stats.avg || 0) ? "text-amber-400 fill-amber-400" : "text-gray-200")} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">متوسط التقييم</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <p className="text-2xl font-bold text-amber-600">{stats.pending || 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">قيد المراجعة</p>
        </div>
        {/* distribution */}
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">توزيع التقييمات</p>
          <div className="space-y-1">
            {[5,4,3,2,1].map(n => {
              const cnt = stats.distribution?.[n] || 0;
              const pct = stats.total > 0 ? Math.round((cnt / stats.total) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500 w-3">{n}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-gray-400 w-8">{cnt} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* tabs + table */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
        <div className="flex items-center justify-between px-5 border-b border-gray-50">
          <div className="flex overflow-x-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={clsx("px-4 py-[6px] text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  tab === t.key ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700")}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="p-8"><PageSkeleton /></div> : reviewList.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">لا توجد تقييمات بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50">
                  {["العميل", "التقييم", "الوصف", "التاريخ", "الرد", "الظهور", "الحالة", "الإجراءات"].map(h => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviewList.map((rv: any) => {
                  const st = STATUS_LABELS[rv.status] || STATUS_LABELS.pending;
                  return (
                    <tr key={rv.id} className="border-b border-gray-50 last:border-0 hover:bg-[#f8fafc]/40 transition-colors">
                      <td className="px-[10px] py-[6px]">
                        <p className="font-medium text-gray-800">{rv.customerName || rv.customerId?.substring(0, 8)}</p>
                        {rv.customerPhone && <p className="text-xs text-gray-400" dir="ltr">{rv.customerPhone}</p>}
                      </td>
                      <td className="px-[10px] py-[6px]">
                        <StarRow rating={rv.rating} />
                        <p className="text-xs font-bold text-amber-500 mt-0.5">{rv.rating}/5</p>
                      </td>
                      <td className="px-[10px] py-[6px] max-w-[200px]">
                        {rv.comment ? (
                          <p className="text-sm text-gray-700 line-clamp-2">{rv.comment}</p>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-[10px] py-[6px] text-xs text-gray-400 whitespace-nowrap">
                        {rv.createdAt ? fmtDate(rv.createdAt) : "—"}
                      </td>
                      <td className="px-[10px] py-[6px]">
                        {rv.responseText ? (
                          <p className="text-xs text-emerald-600 max-w-[140px] line-clamp-2">{rv.responseText}</p>
                        ) : (
                          <button onClick={() => { setResponding(rv); setResponseText(""); }}
                            className="text-xs text-brand-500 hover:underline whitespace-nowrap">
                            إضافة رد
                          </button>
                        )}
                      </td>
                      <td className="px-[10px] py-[6px]">
                        <button onClick={() => handleToggle(rv.id)}
                          className={clsx("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border transition-colors",
                            rv.isPublished ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-100 text-gray-500 border-[#eef2f6]")}>
                          {rv.isPublished ? <><Eye className="w-3 h-3" /> ظاهر</> : <><EyeOff className="w-3 h-3" /> مخفي</>}
                        </button>
                      </td>
                      <td className="px-[10px] py-[6px]">
                        <span className={clsx("text-[11px] px-2 py-0.5 rounded-full font-medium border", st.color)}>{st.label}</span>
                      </td>
                      <td className="px-[10px] py-[6px]">
                        <div className="flex items-center gap-1">
                          {rv.status === "pending" && (
                            <>
                              <button onClick={() => handleApprove(rv.id)} title="موافقة"
                                className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              </button>
                              <button onClick={() => handleReject(rv.id)} title="رفض"
                                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </>
                          )}
                          {!rv.responseText && (
                            <button onClick={() => { setResponding(rv); setResponseText(""); }} title="رد"
                              className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                              <MessageSquare className="w-3.5 h-3.5 text-brand-500" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(rv.id)} title="حذف"
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
        <div className="space-y-3">
          {[
            { q: "ما الفرق بين «قيد المراجعة» و«موافق عليه»؟", a: "«قيد المراجعة» يعني التقييم وصل لكنك لم تتخذ قراراً بشأنه بعد، أما «موافق عليه» فيعني أنك راجعته وأجزت نشره." },
            { q: "هل يرى العميل تقييمه قبل موافقتي؟", a: "لا، التقييمات المعلّقة لا تظهر في الموقع العام حتى تتم الموافقة عليها وتفعيل الظهور." },
            { q: "ماذا يعني «ظاهر» و«مخفي»؟", a: "«ظاهر» يعني أن التقييم يظهر للعملاء في صفحتك العامة، و«مخفي» يعني أنك أوقفت ظهوره مؤقتاً دون حذفه." },
            { q: "هل يصل العميل بإشعار عند ردّي على تقييمه؟", a: "نعم، إذا كان لديه بريد إلكتروني أو جوال مسجّل يصله إشعار بردّك تلقائياً." },
          ].map(faq => (
            <details key={faq.q} className="border border-[#eef2f6] rounded-xl">
              <summary className="px-[10px] py-[6px] text-sm text-gray-700 cursor-pointer font-medium hover:bg-[#f8fafc] rounded-xl">{faq.q}</summary>
              <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* respond modal */}
      <Modal
        open={!!responding}
        onClose={() => setResponding(null)}
        title="الرد على التقييم"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResponding(null)}>إلغاء</Button>
            <Button onClick={handleRespond} loading={saving}>إرسال الرد</Button>
          </>
        }
      >
        {responding && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <StarRow rating={responding.rating} />
                <span className="text-xs text-gray-400">{responding.createdAt ? fmtDate(responding.createdAt) : ""}</span>
              </div>
              {responding.comment && <p className="text-sm text-gray-700">{responding.comment}</p>}
            </div>
            <TextArea
              label="ردك"
              name="response"
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              rows={4}
              placeholder="اكتب ردك على هذا التقييم..."
              required
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
