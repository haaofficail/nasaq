/**
 * CatalogPage — Unified Catalog with tabs
 * Routes: /dashboard/catalog?tab=services|categories|addons
 */
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui";
import { ServicesPage } from "./ServicesPage";
import { CategoriesPage } from "./CategoriesPage";
import { AddonsPage } from "./AddonsPage";

const TABS = [
  { id: "services",   label: "الخدمات" },
  { id: "categories", label: "التصنيفات" },
  { id: "addons",     label: "الاضافات" },
];

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "services";

  return (
    <div dir="rtl">
      <PageHeader
        title="الخدمات والمنتجات"
        description="أدر خدماتك وتصنيفاتك والاضافات من مكان واحد"
        tabs={TABS}
        activeTab={tab}
        onTabChange={(id) => setSearchParams({ tab: id })}
      />
      {tab === "services"   && <ServicesPage embedded />}
      {tab === "categories" && <CategoriesPage />}
      {tab === "addons"     && <AddonsPage />}
    </div>
  );
}
