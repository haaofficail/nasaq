import { PublicLayout } from "../components/public/PublicLayout";

export function TermsPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-6 py-24">
        <h1 className="text-3xl font-black text-gray-900 mb-4">الشروط والأحكام</h1>
        <p className="text-gray-600 leading-8">
          باستخدامك منصة نسق فإنك توافق على شروط الاستخدام وسياسة الخصوصية والالتزام بالأنظمة المعمول بها.
        </p>
      </div>
    </PublicLayout>
  );
}
