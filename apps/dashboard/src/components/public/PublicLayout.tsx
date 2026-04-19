import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { BRAND } from "@/lib/branding";
import { PlatformBrandDynamic } from "@/components/branding/PlatformLogo";

export function PublicLayout({ children }: { children: ReactNode }) {
  const platform = usePlatformConfig();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-white font-[Tajawal,sans-serif]">
      {/* Sticky Header */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white shadow-sm border-b border-[#eef2f6]" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <PlatformBrandDynamic logoSize={32} textSize="xl" variant="default" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">الميزات</Link>
            <Link to="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">الأسعار</Link>
            <Link to="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">من نحن</Link>
            <Link to="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">تواصل</Link>
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2">
              سجّل دخول
            </Link>
            <Link
              to="/register"
              className="bg-[#5b9bd5] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              ابدأ مجاناً
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <div className="w-5 h-0.5 bg-gray-700 mb-1" />
            <div className="w-5 h-0.5 bg-gray-700 mb-1" />
            <div className="w-5 h-0.5 bg-gray-700" />
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-[#eef2f6] px-6 py-4 space-y-3">
            <Link to="/features" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>الميزات</Link>
            <Link to="/pricing" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>الأسعار</Link>
            <Link to="/about" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>من نحن</Link>
            <Link to="/contact" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>تواصل</Link>
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="flex-1 text-center border border-[#eef2f6] text-sm font-medium text-gray-700 py-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>سجّل دخول</Link>
              <Link to="/register" className="flex-1 text-center bg-[#5b9bd5] text-white text-sm font-bold py-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>ابدأ مجاناً</Link>
            </div>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <PlatformBrandDynamic logoSize={32} textSize="xl" variant="dark" />
              </div>
              <p className="text-sm leading-relaxed">منصة متكاملة لإدارة حجوزاتك وفعالياتك</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">المنتج</h4>
              <div className="space-y-2">
                <Link to="/features" className="block text-sm hover:text-white transition-colors">الميزات</Link>
                <Link to="/pricing" className="block text-sm hover:text-white transition-colors">الأسعار</Link>
                <Link to="/register" className="block text-sm hover:text-white transition-colors">ابدأ مجاناً</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">الشركة</h4>
              <div className="space-y-2">
                <Link to="/about" className="block text-sm hover:text-white transition-colors">من نحن</Link>
                <Link to="/contact" className="block text-sm hover:text-white transition-colors">تواصل معنا</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">تواصل</h4>
              <div className="space-y-2">
                {platform.supportEmail && (
                  <a href={`mailto:${platform.supportEmail}`} className="block text-sm hover:text-white transition-colors">{platform.supportEmail}</a>
                )}
                {platform.supportPhone && (
                  <a href={`tel:+966${platform.supportPhone.replace(/^0/, "")}`} className="block text-sm hover:text-white transition-colors" dir="ltr">{platform.supportPhone}</a>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2026 ترميز OS. جميع الحقوق محفوظة.</p>
            <div className="flex gap-6">
              <a href="#" className="text-sm hover:text-white transition-colors">سياسة الخصوصية</a>
              <a href="#" className="text-sm hover:text-white transition-colors">شروط الاستخدام</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
