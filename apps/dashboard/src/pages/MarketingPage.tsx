import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Megaphone, Tag, Star, ShoppingCart, Plus, Send, Trash2, Eye, EyeOff,
  CheckCircle, XCircle, MessageCircle, BarChart2, RefreshCw, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import { marketingApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select, PageHeader } from "@/components/ui";

const TABS = [
  { id: "campaigns", label: "الحملات" },
  { id: "coupons",   label: "الكوبونات" },
  { id: "reviews",   label: "التقييمات" },
  { id: "abandoned", label: "السلات المتروكة" },
];

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "واتساب", sms: "رسالة نصية", email: "بريد إلكتروني", push: "إشعار", multi: "متعدد",
};
const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "مسودة",    cls: "bg-gray-100 text-gray-500" },
  scheduled: { label: "مجدولة",   cls: "bg-blue-50 text-blue-600" },
  active:    { label: "نشطة",     cls: "bg-emerald-50 text-emerald-600" },
  paused:    { label: "موقوفة",   cls: "bg-amber-50 text-amber-600" },
  completed: { label: "مكتملة",   cls: "bg-violet-50 text-violet-600" },
  cancelled: { label: "ملغية",    cls: "bg-red-50 text-red-500" },
};

const EMPTY_CAMPAIGN = { name: "", body: "", channel: "whatsapp", segmentId: "", scheduledAt: "", status: "draft" };
const EMPTY_COUPON   = { code: "", name: "", discountType: "percentage", discountValue: "", maxUses: "", expiresAt: "", minOrderAmount: "" };

export function MarketingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabId = searchParams.get("tab") || "campaigns";

  // Modals
  const [showCampaign, setShowCampaign] = useState(false);
  const [showCoupon,   setShowCoupon]   = useState(false);
  const [showReview,   setShowReview]   = useState(false);
  const [replyId,      setReplyId]      = useState<string | null>(null);
  const [replyText,    setReplyText]    = useState("");
  const [reviewPhone,  setReviewPhone]  = useState("");
  const [reviewName,   setReviewName]   = useState("");
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null);
  const [deleteReviewId, setDeleteReviewId]     = useState<string | null>(null);

  // Forms
  const [campForm, setCampForm] = useState({ ...EMPTY_CAMPAIGN });
  const [coupForm, setCoupForm] = useState({ ...EMPTY_COUPON });

  // Data
  const { data: campRes, loading: cLoading, refetch: refetchCampaigns } = useApi(() => marketingApi.campaigns(), []);
  const { data: coupRes, loading: coLoading, refetch: refetchCoupons }  = useApi(() => marketingApi.coupons(), []);
  const { data: revRes,  loading: rLoading,  refetch: refetchReviews }  = useApi(() => marketingApi.reviews(), []);
  const { data: statRes }  = useApi(() => marketingApi.reviewStats(), []);
  const { data: cartRes }  = useApi(() => marketingApi.abandonedCartsStats(), []);
  const { data: segRes }   = useApi(() => marketingApi.segments(), []);

  const campaigns: any[] = campRes?.data ?? [];
  const coupons:   any[] = coupRes?.data ?? [];
  const reviews:   any[] = revRes?.data ?? [];
  const stats:     any   = statRes?.data ?? {};
  const cartStats: any   = cartRes?.data ?? {};
  const segments:  any[] = segRes?.data ?? [];

  // Mutations
  const { mutate: createCampaign, loading: creatingCamp } = useMutation((d: any) => marketingApi.createCampaign(d));
  const { mutate: deleteCampaign } = useMutation((id: string) => marketingApi.deleteCampaign(id));
  const { mutate: sendCampaign   } = useMutation((id: string) => marketingApi.sendCampaign(id));
  const { mutate: createCoupon,  loading: creatingCoup } = useMutation((d: any) => marketingApi.createCoupon(d));
  const { mutate: deleteCoupon   } = useMutation((id: string) => marketingApi.deleteCoupon(id));
  const { mutate: toggleCoupon   } = useMutation((d: any) => marketingApi.updateCoupon(d.id, { isActive: !d.isActive }));
  const { mutate: respondReview, loading: responding } = useMutation((d: any) => marketingApi.respondReview(d.id, d.text));
  const { mutate: updateStatus   } = useMutation((d: any) => marketingApi.updateReviewStatus(d.id, d.status));
  const { mutate: deleteReview   } = useMutation((id: string) => marketingApi.deleteReview(id));
  const { mutate: requestReview, loading: sendingReview } = useMutation((d: any) => marketingApi.requestReview(d));

  const handleCreateCampaign = async () => {
    await createCampaign({ ...campForm, segmentId: campForm.segmentId || null, scheduledAt: campForm.scheduledAt || null });
    setShowCampaign(false);
    setCampForm({ ...EMPTY_CAMPAIGN });
    refetchCampaigns();
  };

  const handleCreateCoupon = async () => {
    await createCoupon({
      ...coupForm,
      maxUses: coupForm.maxUses ? Number(coupForm.maxUses) : null,
      expiresAt: coupForm.expiresAt || null,
      minOrderAmount: coupForm.minOrderAmount || null,
    });
    setShowCoupon(false);
    setCoupForm({ ...EMPTY_COUPON });
    refetchCoupons();
  };

  const handleSendCampaign = async (id: string) => {
    await sendCampaign(id);
    refetchCampaigns();
  };

  const handleDeleteCampaign = async (id: string) => {
    setDeleteCampaignId(id);
  };

  const doDeleteCampaign = async () => {
    if (!deleteCampaignId) return;
    await deleteCampaign(deleteCampaignId);
    setDeleteCampaignId(null);
    refetchCampaigns();
  };

  const handleReply = async () => {
    if (!replyId || !replyText.trim()) return;
    await respondReview({ id: replyId, text: replyText });
    setReplyId(null);
    setReplyText("");
    refetchReviews();
  };

  const handleSendReviewRequest = async () => {
    await requestReview({ phone: reviewPhone, customerName: reviewName });
    setShowReview(false);
    setReviewPhone("");
    setReviewName("");
  };

  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const activeCoupons   = coupons.filter(c => c.isActive).length;

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        title="التسويق"
        description="الحملات والكوبونات والتقييمات"
        tabs={TABS}
        activeTab={tabId}
        onTabChange={(id) => setSearchParams({ tab: id })}
        actions={
          <div className="flex gap-2">
            {tabId === "campaigns" && (
              <Button icon={Plus} onClick={() => setShowCampaign(true)}>حملة جديدة</Button>
            )}
            {tabId === "coupons" && (
              <Button icon={Tag} onClick={() => setShowCoupon(true)}>كوبون جديد</Button>
            )}
            {tabId === "reviews" && (
              <Button variant="secondary" icon={Send} onClick={() => setShowReview(true)}>طلب تقييم</Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "حملات نشطة",    value: activeCampaigns,     color: "text-brand-500", bg: "bg-blue-50",   icon: Megaphone },
          { label: "كوبونات فعّالة", value: activeCoupons,       color: "text-violet-600", bg: "bg-violet-50", icon: Tag },
          { label: "التقييمات",     value: stats.total ?? reviews.length, color: "text-amber-600", bg: "bg-amber-50", icon: Star },
          { label: "متوسط التقييم", value: stats.avg ? stats.avg.toFixed(1) : "—", color: "text-amber-600", bg: "bg-amber-50", icon: BarChart2 },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", s.bg)}>
              <s.icon className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── CAMPAIGNS ───────────────────────────────────── */}
      {tabId === "campaigns" && (
        <div className="space-y-3">
          {cLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)
          ) : campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500 mb-1">لا توجد حملات</p>
              <p className="text-xs text-gray-400 mb-4">أنشئ حملتك الأولى للتواصل مع عملائك</p>
              <Button icon={Plus} onClick={() => setShowCampaign(true)}>حملة جديدة</Button>
            </div>
          ) : (
            campaigns.map((c: any) => {
              const st = STATUS_LABELS[c.status] ?? STATUS_LABELS.draft;
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-gray-200 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {CHANNEL_LABELS[c.channel] ?? c.channel}
                      {c.audienceCount > 0 && ` · ${c.audienceCount} مستلم`}
                      {c.totalSent > 0 && ` · أُرسل ${c.totalSent}`}
                    </p>
                  </div>
                  <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0", st.cls)}>{st.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {(c.status === "draft" || c.status === "scheduled") && (
                      <button
                        onClick={() => handleSendCampaign(c.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-[#4a8bc4] transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" /> إرسال
                      </button>
                    )}
                    <button onClick={() => handleDeleteCampaign(c.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── COUPONS ─────────────────────────────────────── */}
      {tabId === "coupons" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {coLoading ? (
            <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : coupons.length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500 mb-1">لا توجد كوبونات</p>
              <p className="text-xs text-gray-400 mb-4">أنشئ كوباً للخصم وشاركه مع عملائك</p>
              <Button icon={Tag} onClick={() => setShowCoupon(true)}>كوبون جديد</Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {["الكود", "الاسم", "الخصم", "الحد الأدنى", "الاستخدام", "الانتهاء", "الحالة", ""].map(h => (
                    <th key={h} className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-500">{c.code}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 px-4 tabular-nums">
                      {c.discountType === "percentage" ? `${c.discountValue}%` : `${c.discountValue} ر.س`}
                    </td>
                    <td className="py-3 px-4 text-gray-500 tabular-nums">
                      {c.minOrderAmount ? `${c.minOrderAmount} ر.س` : "—"}
                    </td>
                    <td className="py-3 px-4 text-gray-500 tabular-nums">
                      {c.timesUsed || 0}{c.maxUses ? `/${c.maxUses}` : ""}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("ar-SA") : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={async () => { await toggleCoupon(c); refetchCoupons(); }}
                        className={clsx(
                          "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors",
                          c.isActive ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        )}
                      >
                        {c.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {c.isActive ? "فعّال" : "موقوف"}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={async () => { await deleteCoupon(c.id); refetchCoupons(); }} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── REVIEWS ─────────────────────────────────────── */}
      {tabId === "reviews" && (
        <div className="space-y-4">
          {/* Stats bar */}
          {stats.total > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-3xl font-black text-amber-500">{stats.avg?.toFixed(1) ?? "—"}</p>
                  <div className="flex gap-0.5 justify-center mt-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={clsx("w-4 h-4", i <= Math.round(stats.avg ?? 0) ? "text-amber-400" : "text-gray-200")} fill={i <= Math.round(stats.avg ?? 0) ? "currentColor" : "none"} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{stats.total} تقييم</p>
                </div>
                <div className="flex-1 min-w-48 space-y-1.5">
                  {[5,4,3,2,1].map(n => {
                    const cnt = stats.distribution?.[n] ?? 0;
                    const pct = stats.total ? Math.round(cnt / stats.total * 100) : 0;
                    return (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-3">{n}</span>
                        <Star className="w-3 h-3 text-amber-400" fill="currentColor" />
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-6 text-left">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
                {stats.pending > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
                    <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
                    <p className="text-xs text-amber-500">في الانتظار</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {rLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500 mb-1">لا توجد تقييمات</p>
              <p className="text-xs text-gray-400 mb-4">أرسل طلب تقييم لعملائك لبدء جمع الآراء</p>
              <Button variant="secondary" icon={Send} onClick={() => setShowReview(true)}>طلب تقييم</Button>
            </div>
          ) : (
            reviews.map((r: any) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-gray-500">{(r.customerName || "؟")[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{r.customerName || "عميل"}</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className={clsx("w-3.5 h-3.5", i <= r.rating ? "text-amber-400" : "text-gray-200")} fill={i <= r.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status === "pending" && (
                      <>
                        <button onClick={async () => { await updateStatus({ id: r.id, status: "approved" }); refetchReviews(); }} className="p-1.5 text-gray-300 hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-50" title="موافقة">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={async () => { await updateStatus({ id: r.id, status: "rejected" }); refetchReviews(); }} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50" title="رفض">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => setReplyId(replyId === r.id ? null : r.id)} className="p-1.5 text-gray-300 hover:text-brand-500 transition-colors rounded-lg hover:bg-blue-50" title="رد">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteReviewId(r.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                      r.status === "approved" ? "bg-emerald-50 text-emerald-600" :
                      r.status === "rejected" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
                    )}>
                      {r.status === "approved" ? "موافق عليه" : r.status === "rejected" ? "مرفوض" : "بانتظار"}
                    </span>
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
                {r.responseText && (
                  <div className="bg-blue-50 rounded-xl p-3 border-r-2 border-brand-500">
                    <p className="text-xs text-gray-400 mb-1 font-medium">ردك</p>
                    <p className="text-sm text-gray-700">{r.responseText}</p>
                  </div>
                )}
                {replyId === r.id && (
                  <div className="flex gap-2 pt-1">
                    <input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="اكتب ردك..."
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
                    />
                    <button
                      onClick={handleReply}
                      disabled={responding || !replyText.trim()}
                      className="px-4 py-2 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-[#4a8bc4] transition-colors disabled:opacity-50"
                    >
                      {responding ? <RefreshCw className="w-4 h-4 animate-spin" /> : "إرسال"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ABANDONED CARTS ─────────────────────────────── */}
      {tabId === "abandoned" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "إجمالي السلات المتروكة", value: cartStats.total ?? 0, icon: ShoppingCart, color: "text-gray-700", bg: "bg-gray-50" },
            { label: "تم استرداده", value: cartStats.recovered ?? 0, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "معدل الاسترداد", value: `${cartStats.recoveryRate ?? 0}%`, icon: BarChart2, color: "text-brand-500", bg: "bg-blue-50" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-3", s.bg)}>
                <s.icon className={clsx("w-5 h-5", s.color)} />
              </div>
              <p className={clsx("text-3xl font-bold tabular-nums", s.color)}>{s.value}</p>
              <p className="text-sm text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
          <div className="sm:col-span-3 bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              السلات المتروكة تُسجَّل تلقائياً عندما يبدأ عميل عملية حجز ولا يكملها.<br />
              <span className="text-gray-400 text-xs">يمكنك إرسال كوبون خصم لهم لإعادتهم.</span>
            </p>
          </div>
        </div>
      )}

      {/* ── CREATE CAMPAIGN MODAL ───────────────────────── */}
      <Modal
        open={showCampaign}
        onClose={() => setShowCampaign(false)}
        title="حملة جديدة"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCampaign(false)}>إلغاء</Button>
            <Button onClick={handleCreateCampaign} loading={creatingCamp} icon={Megaphone}>إنشاء</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="اسم الحملة" name="name" value={campForm.name}
            onChange={e => setCampForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="القناة" name="channel" value={campForm.channel}
              onChange={e => setCampForm(f => ({ ...f, channel: e.target.value }))}
              options={[
                { value: "whatsapp", label: "واتساب" },
                { value: "sms", label: "رسالة نصية" },
                { value: "email", label: "بريد إلكتروني" },
              ]}
            />
            <Select label="الحالة" name="status" value={campForm.status}
              onChange={e => setCampForm(f => ({ ...f, status: e.target.value }))}
              options={[
                { value: "draft", label: "مسودة" },
                { value: "scheduled", label: "مجدولة" },
                { value: "active", label: "نشطة فوراً" },
              ]}
            />
          </div>
          {segments.length > 0 && (
            <Select label="الشريحة المستهدفة (اختياري)" name="segment" value={campForm.segmentId}
              onChange={e => setCampForm(f => ({ ...f, segmentId: e.target.value }))}
              options={[{ value: "", label: "كل العملاء" }, ...segments.map((s: any) => ({ value: s.id, label: s.name }))]}
            />
          )}
          {campForm.status === "scheduled" && (
            <Input label="وقت الإرسال" name="scheduledAt" type="datetime-local" value={campForm.scheduledAt}
              onChange={e => setCampForm(f => ({ ...f, scheduledAt: e.target.value }))} dir="ltr" />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">نص الرسالة <span className="text-red-400">*</span></label>
            <textarea
              value={campForm.body}
              onChange={e => setCampForm(f => ({ ...f, body: e.target.value }))}
              rows={4}
              placeholder="أهلاً {customer_name}، لدينا عرض خاص لك..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-blue-100 transition-colors resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{campForm.body.length} حرف</p>
          </div>
        </div>
      </Modal>

      {/* ── CREATE COUPON MODAL ─────────────────────────── */}
      <Modal
        open={showCoupon}
        onClose={() => setShowCoupon(false)}
        title="كوبون جديد"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCoupon(false)}>إلغاء</Button>
            <Button onClick={handleCreateCoupon} loading={creatingCoup} icon={Tag}>إنشاء</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="الكود" name="code" value={coupForm.code}
            onChange={e => setCoupForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="RAMADAN20" dir="ltr" required />
          <Input label="الاسم" name="name" value={coupForm.name}
            onChange={e => setCoupForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="النوع" name="type" value={coupForm.discountType}
              onChange={e => setCoupForm(f => ({ ...f, discountType: e.target.value }))}
              options={[{ value: "percentage", label: "نسبة %" }, { value: "fixed", label: "مبلغ ثابت" }]}
            />
            <Input label={coupForm.discountType === "percentage" ? "النسبة %" : "المبلغ ر.س"} name="value"
              type="number" value={coupForm.discountValue}
              onChange={e => setCoupForm(f => ({ ...f, discountValue: e.target.value }))} dir="ltr" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="حد الاستخدام" name="max" type="number" value={coupForm.maxUses}
              onChange={e => setCoupForm(f => ({ ...f, maxUses: e.target.value }))} dir="ltr"
              hint="فارغ = غير محدود" />
            <Input label="حد أدنى للطلب (ر.س)" name="min" type="number" value={coupForm.minOrderAmount}
              onChange={e => setCoupForm(f => ({ ...f, minOrderAmount: e.target.value }))} dir="ltr"
              hint="فارغ = بدون حد" />
          </div>
          <Input label="تاريخ الانتهاء" name="expires" type="date" value={coupForm.expiresAt}
            onChange={e => setCoupForm(f => ({ ...f, expiresAt: e.target.value }))} dir="ltr"
            hint="فارغ = لا ينتهي" />
        </div>
      </Modal>

      {/* ── REQUEST REVIEW MODAL ────────────────────────── */}
      <Modal
        open={showReview}
        onClose={() => setShowReview(false)}
        title="طلب تقييم من عميل"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowReview(false)}>إلغاء</Button>
            <Button onClick={handleSendReviewRequest} loading={sendingReview} icon={Send} disabled={!reviewPhone}>إرسال</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs text-brand-500 font-medium">سيُرسل النظام رسالة واتساب/SMS تتضمن رابط التقييم</p>
          </div>
          <Input label="رقم الجوال" name="phone" value={reviewPhone}
            onChange={e => setReviewPhone(e.target.value)} placeholder="05XXXXXXXX" dir="ltr" required />
          <Input label="اسم العميل (اختياري)" name="name" value={reviewName}
            onChange={e => setReviewName(e.target.value)} placeholder="محمد أحمد" />
        </div>
      </Modal>

      {/* Delete Campaign Confirmation */}
      <Modal open={!!deleteCampaignId} onClose={() => setDeleteCampaignId(null)} title="حذف الحملة" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteCampaignId(null)}>تراجع</Button><Button variant="danger" onClick={doDeleteCampaign}>نعم، احذف</Button></>}>
        <p className="text-sm text-gray-600">سيتم حذف هذه الحملة نهائياً. هل أنت متأكد؟</p>
      </Modal>

      {/* Delete Review Confirmation */}
      <Modal open={!!deleteReviewId} onClose={() => setDeleteReviewId(null)} title="حذف التقييم" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteReviewId(null)}>تراجع</Button><Button variant="danger" onClick={async () => { if (deleteReviewId) { await deleteReview(deleteReviewId); setDeleteReviewId(null); refetchReviews(); } }}>نعم، احذف</Button></>}>
        <p className="text-sm text-gray-600">سيتم حذف هذا التقييم نهائياً. هل أنت متأكد؟</p>
      </Modal>
    </div>
  );
}
