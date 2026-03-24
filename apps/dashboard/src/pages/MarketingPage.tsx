import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Megaphone, Tag, Star, ShoppingCart, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { marketingApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select, PageHeader } from "@/components/ui";

const MARKETING_TABS = [
  { id: "campaigns", label: "الحملات" },
  { id: "coupons",   label: "الكوبونات" },
  { id: "reviews",   label: "التقييمات" },
  { id: "abandoned", label: "السلات المتروكة" },
];

export function MarketingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabId = searchParams.get("tab") || "campaigns";
  const activeTab = MARKETING_TABS.findIndex(t => t.id === tabId);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    name: "",
    discountType: "percentage",
    discountValue: "",
    maxUses: "",
  });

  const { data: campRes, loading: cLoading } = useApi(() => marketingApi.campaigns(), []);
  const { data: coupRes, loading: coLoading, refetch: refetchCoupons } = useApi(() => marketingApi.coupons(), []);
  const { data: revRes } = useApi(() => marketingApi.reviews(), []);
  const { data: cartRes } = useApi(() => marketingApi.abandonedCarts(), []);
  const { mutate: createCoupon, loading: creating } = useMutation((data: any) => marketingApi.createCoupon(data));

  const campaigns: any[] = campRes?.data || [];
  const coupons: any[] = coupRes?.data || [];
  const reviews: any[] = revRes?.data || [];
  const cartStats: any = cartRes?.data || {};

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : "—";

  const handleCreateCoupon = async () => {
    await createCoupon(couponForm);
    setShowCoupon(false);
    refetchCoupons();
  };

  if (cLoading || coLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="التسويق"
        description="الحملات والكوبونات والتقييمات"
        tabs={MARKETING_TABS}
        activeTab={tabId}
        onTabChange={(id) => setSearchParams({ tab: id })}
        actions={<Button variant="secondary" icon={Tag} onClick={() => setShowCoupon(true)}>كوبون جديد</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "حملات نشطة", value: campaigns.filter((c) => c.status === "active").length, color: "text-brand-600", bg: "bg-brand-50", icon: Megaphone },
          { label: "كوبونات فعّالة", value: coupons.filter((c) => c.isActive).length, color: "text-violet-600", bg: "bg-violet-50", icon: Tag },
          { label: "التقييمات", value: reviews.length, color: "text-amber-600", bg: "bg-amber-50", icon: Star },
          { label: "متوسط التقييم", value: avgRating, color: "text-amber-600", bg: "bg-amber-50", icon: Star },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-3", s.bg)}>
              <s.icon className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Campaigns */}
      {tabId === "campaigns" && (
        <div className="space-y-3">
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Megaphone className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد حملات</p>
            </div>
          ) : (
            campaigns.map((c: any) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-gray-200 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.channel} — {c.status}</p>
                </div>
                <span className={clsx(
                  "px-2.5 py-1 rounded-full text-[10px] font-semibold",
                  c.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                )}>
                  {c.status === "active" ? "نشطة" : c.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Coupons */}
      {tabId === "coupons" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {coupons.length === 0 ? (
            <div className="p-10 text-center">
              <Tag className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد كوبونات</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold uppercase tracking-wide">الكود</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الاسم</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الخصم</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الاستخدام</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-5 font-mono font-bold text-brand-600">{c.code}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 px-4 tabular-nums">
                      {c.discountType === "percentage"
                        ? `${c.discountValue}%`
                        : `${c.discountValue} ر.س`}
                    </td>
                    <td className="py-3 px-4 text-gray-500 tabular-nums">
                      {c.timesUsed || 0}{c.maxUses ? `/${c.maxUses}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Reviews */}
      {tabId === "reviews" && (
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Star className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">لا توجد تقييمات</p>
            </div>
          ) : (
            reviews.map((r: any) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">{r.customerName || "عميل"}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={clsx("w-4 h-4", i < (r.rating || 0) ? "text-amber-400" : "text-gray-200")}
                        fill={i < (r.rating || 0) ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Abandoned carts */}
      {tabId === "abandoned" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-2xl font-bold tabular-nums text-gray-900 mb-1">{cartStats.total || 0}</p>
          <p className="text-sm text-gray-500">سلات متروكة</p>
          <p className="text-xs text-gray-400 mt-1">
            معدل الاسترداد: <span className="font-semibold">{cartStats.recoveryRate || 0}%</span>
          </p>
        </div>
      )}

      {/* Create Coupon Modal */}
      <Modal
        open={showCoupon}
        onClose={() => setShowCoupon(false)}
        title="كوبون جديد"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCoupon(false)}>إلغاء</Button>
            <Button onClick={handleCreateCoupon} loading={creating} icon={Tag}>إنشاء</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="الكود"
            name="code"
            value={couponForm.code}
            onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="RAMADAN20"
            dir="ltr"
            required
          />
          <Input
            label="الاسم"
            name="name"
            value={couponForm.name}
            onChange={(e) => setCouponForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="النوع"
              name="type"
              value={couponForm.discountType}
              onChange={(e) => setCouponForm((f) => ({ ...f, discountType: e.target.value }))}
              options={[
                { value: "percentage", label: "نسبة %" },
                { value: "fixed", label: "مبلغ ثابت" },
              ]}
            />
            <Input
              label="القيمة"
              name="value"
              type="number"
              value={couponForm.discountValue}
              onChange={(e) => setCouponForm((f) => ({ ...f, discountValue: e.target.value }))}
              dir="ltr"
              required
            />
          </div>
          <Input
            label="حد الاستخدام"
            name="max"
            type="number"
            value={couponForm.maxUses}
            onChange={(e) => setCouponForm((f) => ({ ...f, maxUses: e.target.value }))}
            dir="ltr"
            hint="اتركه فارغاً لغير محدود"
          />
        </div>
      </Modal>
    </div>
  );
}
