import { PublicLayout } from "../components/public/PublicLayout";

export function CompliancePage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-6 py-24">
        <h1 className="text-3xl font-black text-gray-900 mb-4">الامتثال</h1>
        <p className="text-gray-600 leading-8">
          تعمل نسق وفق معايير الامتثال المحلية، وتطبّق ضوابط الحماية والحوكمة المطلوبة للبيانات والعمليات المالية.
        </p>
      </div>
    </PublicLayout>
  );
}
