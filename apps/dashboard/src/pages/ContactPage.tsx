import { useState } from "react";
import React from "react";
import { Mail, MessageCircle, Clock, MapPin, MessageSquare, CheckCircle } from "lucide-react";
import { PublicLayout } from "../components/public/PublicLayout";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";

export function ContactPage() {
  const platform = usePlatformConfig();
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/website/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "حدث خطأ. حاول مرة أخرى.");
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="pt-24 pb-24">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-black text-gray-900 mb-4">تواصل معنا</h1>
            <p className="text-xl text-gray-500">نحن هنا للإجابة على جميع استفساراتك</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-8">معلومات التواصل</h2>
              <div className="space-y-6">
                {[
                  { Icon: Mail,          title: "البريد الإلكتروني", val: platform.supportEmail ?? "info@nasaqpro.tech" },
                  { Icon: MessageCircle, title: "الواتساب",          val: platform.supportPhone ?? "0532064321" },
                  { Icon: Clock,         title: "أوقات العمل",       val: "الأحد - الخميس، 9 ص - 6 م" },
                  { Icon: MapPin,        title: "الموقع",            val: "الرياض، المملكة العربية السعودية" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                      <item.Icon className="w-5 h-5 text-brand-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                      <p className="text-gray-500 text-sm mt-0.5">{item.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 bg-brand-50 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 mb-2">هل تريد عرضاً تجريبياً؟</h3>
                <p className="text-sm text-gray-600 mb-4">
                  يسعدنا تقديم عرض مباشر لإظهار كيف يمكن لنسق مساعدة عملك.
                </p>
                <a
                  href={`https://wa.me/966${(platform.supportPhone ?? "0532064321").replace(/^0/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> تواصل عبر الواتساب
                </a>
              </div>
            </div>

            {/* Form */}
            <div>
              {sent ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-green-700 mb-2">تم إرسال رسالتك!</h3>
                  <p className="text-green-600 text-sm">سنتواصل معك في أقرب وقت ممكن.</p>
                  <button
                    onClick={() => { setSent(false); setForm({ name: "", phone: "", email: "", message: "" }); }}
                    className="mt-6 text-sm text-green-700 underline"
                  >
                    إرسال رسالة جديدة
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-colors"
                      placeholder="اسمك الكريم"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">الجوال</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-colors"
                        placeholder="05XXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-colors"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الرسالة <span className="text-red-400">*</span></label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-colors resize-none"
                      rows={5}
                      placeholder="كيف يمكننا مساعدتك؟"
                      required
                    />
                  </div>
                  {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-500 text-white py-4 rounded-xl font-bold text-base hover:bg-brand-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? "جاري الإرسال..." : "إرسال الرسالة"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
