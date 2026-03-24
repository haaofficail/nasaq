import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ReactNode } from "react";

// ── Auth / Onboarding ──────────────────────────────────────────────
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OnboardingPage } from "./pages/OnboardingPage";

// ── Public ────────────────────────────────────────────────────────
import { LandingPage } from "./pages/LandingPage";
import { PricingPage } from "./pages/PricingPage";
import { FeaturesPage } from "./pages/FeaturesPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { PublicBookingPage } from "./pages/PublicBookingPage";
import { PublicTrackingPage } from "./pages/PublicTrackingPage";
import { PublicFlowerPage } from "./pages/PublicFlowerPage";
import { MarketplaceBrowsePage } from "./pages/MarketplaceBrowsePage";

// ── Core dashboard ────────────────────────────────────────────────
import { DashboardPage } from "./pages/DashboardPage";
import { ServicesPage } from "./pages/ServicesPage";
import { ServiceDetailPage } from "./pages/ServiceDetailPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { AddonsPage } from "./pages/AddonsPage";
import { BookingsPage } from "./pages/BookingsPage";
import { BookingDetailPage } from "./pages/BookingDetailPage";
import { CalendarPage } from "./pages/CalendarPage";
import { CustomersPage } from "./pages/CustomersPage";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { POSPage } from "./pages/POSPage";

// ── Finance ───────────────────────────────────────────────────────
import { FinancePage } from "./pages/FinancePage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { TreasuryPage } from "./pages/TreasuryPage";
import { AccountingPage } from "./pages/AccountingPage";
import { JournalEntriesPage } from "./pages/JournalEntriesPage";
import { FinancialStatementsPage } from "./pages/FinancialStatementsPage";
import { ReconciliationPage } from "./pages/ReconciliationPage";

// ── Operations ────────────────────────────────────────────────────
import { InventoryPage } from "./pages/InventoryPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { ProvidersPage } from "./pages/ProvidersPage";
import { StaffPage } from "./pages/StaffPage";
import { RolesPage } from "./pages/RolesPage";
import { AttendancePage } from "./pages/AttendancePage";
import { TeamPage } from "./pages/TeamPage";
import { DeliveryPage } from "./pages/DeliveryPage";

// ── Channels ──────────────────────────────────────────────────────
import { StorefrontPage } from "./pages/StorefrontPage";
import { WebsitePage } from "./pages/WebsitePage";
import { PublicStorefrontPage } from "./pages/PublicStorefrontPage";
import { OnlineOrdersPage } from "./pages/OnlineOrdersPage";
import { AutomationPage } from "./pages/AutomationPage";
import { MarketingPage } from "./pages/MarketingPage";
import { MessagingSettingsPage } from "./pages/MessagingSettingsPage";

// ── Settings ──────────────────────────────────────────────────────
import { SettingsPage } from "./pages/SettingsPage";
import { BookingSettingsPage } from "./pages/BookingSettingsPage";
import { ProfileSettingsPage } from "./pages/ProfileSettingsPage";
import { AccountPage } from "./pages/AccountPage";
import { WebsiteSettingsPage } from "./pages/WebsiteSettingsPage";
import { CustomizationPage } from "./pages/CustomizationPage";
import { PlatformPage } from "./pages/PlatformPage";
import { AuditLogPage } from "./pages/AuditLogPage";

// ── New verticals ─────────────────────────────────────────────────
import HotelPage from "./pages/HotelPage";
import CarRentalPage from "./pages/CarRentalPage";
import IntegrationsPage from "./pages/IntegrationsPage";

// ── Business-type specific ────────────────────────────────────────
import { MenuPage } from "./pages/MenuPage";
import { MenuCategoriesPage } from "./pages/MenuCategoriesPage";
import { KitchenPage } from "./pages/KitchenPage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { TableMapPage } from "./pages/TableMapPage";
import { RestaurantAnalyticsPage } from "./pages/RestaurantAnalyticsPage";
import { RestaurantBookingSettingsPage } from "./pages/RestaurantBookingSettingsPage";
import { LoyaltyPage } from "./pages/LoyaltyPage";
import { FlowerAnalyticsPage } from "./pages/FlowerAnalyticsPage";
import { RentalAnalyticsPage } from "./pages/RentalAnalyticsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { CommissionsPage } from "./pages/CommissionsPage";
import { SalonSuppliesPage } from "./pages/SalonSuppliesPage";
import { ClientBeautyCardPage } from "./pages/ClientBeautyCardPage";
import { StaffPerformancePage } from "./pages/StaffPerformancePage";
import { RecallPage } from "./pages/RecallPage";
import { FlowerInventoryPage } from "./pages/FlowerInventoryPage";
import { FlowerMasterPage } from "./pages/FlowerMasterPage";
import { ArrangementsPage } from "./pages/ArrangementsPage";
import { AssetsPage } from "./pages/AssetsPage";
import { ContractsPage } from "./pages/ContractsPage";
import { InspectionsPage } from "./pages/InspectionsPage";
import { WarehousePage } from "./pages/WarehousePage";
import { EventsPage } from "./pages/EventsPage";
import { PackagesPage } from "./pages/PackagesPage";
import { MediaLibraryPage } from "./pages/MediaLibraryPage";
import { AdminPage } from "./pages/AdminPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { RemindersPage } from "./pages/RemindersPage";
import { CatalogPage } from "./pages/CatalogPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("nasaq_token");
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function RequireAdminAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("nasaq_token");
  const location = useLocation();
  if (!token) return <Navigate to="/admin-login" state={{ from: location }} replace />;
  try {
    const user = JSON.parse(localStorage.getItem("nasaq_user") || "{}");
    if (!user?.isSuperAdmin) return <Navigate to="/admin-login" replace />;
  } catch {
    return <Navigate to="/admin-login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public landing pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />

      {/* Super Admin Panel — standalone, no merchant layout */}
      <Route path="/admin" element={<RequireAdminAuth><AdminPage /></RequireAdminAuth>} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Public booking / tracking / storefront */}
      <Route path="/book/:slug" element={<PublicBookingPage />} />
      <Route path="/track/:token" element={<PublicTrackingPage />} />
      <Route path="/marketplace" element={<MarketplaceBrowsePage />} />
      <Route path="/flowers/:slug" element={<PublicFlowerPage />} />
      <Route path="/s/:orgSlug" element={<PublicStorefrontPage />} />

      {/* ── Dashboard (auth required) ── */}
      <Route path="/dashboard" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />

        {/* Services */}
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:id" element={<ServiceDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="addons" element={<AddonsPage />} />

        {/* Bookings */}
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />
        <Route path="calendar" element={<CalendarPage />} />

        {/* Customers */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />

        {/* POS */}
        <Route path="pos" element={<POSPage />} />

        {/* Finance */}
        <Route path="finance" element={<FinancePage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="treasury" element={<TreasuryPage />} />
        <Route path="accounting" element={<AccountingPage />} />
        <Route path="accounting/journal-entries" element={<JournalEntriesPage />} />
        <Route path="financial-statements" element={<FinancialStatementsPage />} />
        <Route path="reconciliation" element={<ReconciliationPage />} />

        {/* Operations */}
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="suppliers" element={<Navigate to="/dashboard/inventory?tab=suppliers" replace />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="permissions" element={<RolesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="delivery" element={<DeliveryPage />} />

        {/* Channels */}
        <Route path="website" element={<WebsitePage />} />
        <Route path="online-orders" element={<OnlineOrdersPage />} />
        <Route path="automation" element={<AutomationPage />} />
        <Route path="marketing" element={<MarketingPage />} />
        <Route path="messaging" element={<MessagingSettingsPage />} />

        {/* Hotel */}
        <Route path="hotel" element={<HotelPage />} />

        {/* Car Rental */}
        <Route path="car-rental" element={<CarRentalPage />} />

        {/* Integrations */}
        <Route path="integrations" element={<IntegrationsPage />} />

        {/* Settings */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/booking" element={<BookingSettingsPage />} />
        <Route path="settings/profile" element={<ProfileSettingsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="settings/website" element={<WebsiteSettingsPage />} />
        <Route path="settings/audit-log" element={<AuditLogPage />} />
        <Route path="customization" element={<CustomizationPage />} />
        <Route path="platform" element={<PlatformPage />} />

        {/* Restaurant / Cafe */}
        <Route path="menu" element={<MenuPage />} />
        <Route path="menu/categories" element={<MenuCategoriesPage />} />
        <Route path="kitchen" element={<KitchenPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="table-map" element={<TableMapPage />} />
        <Route path="restaurant-analytics" element={<RestaurantAnalyticsPage />} />
        <Route path="restaurant-booking-settings" element={<RestaurantBookingSettingsPage />} />
        <Route path="loyalty" element={<LoyaltyPage />} />

        {/* Salon */}
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="commissions" element={<CommissionsPage />} />
        <Route path="salon-supplies" element={<SalonSuppliesPage />} />
        <Route path="staff-performance" element={<StaffPerformancePage />} />
        <Route path="customers/:id/beauty-card" element={<ClientBeautyCardPage />} />
        <Route path="recall" element={<RecallPage />} />

        {/* Flower shop */}
        <Route path="flower-inventory" element={<FlowerInventoryPage />} />
        <Route path="flower-master" element={<FlowerMasterPage />} />
        <Route path="arrangements" element={<ArrangementsPage />} />
        <Route path="flower-analytics" element={<FlowerAnalyticsPage />} />

        {/* Rental */}
        <Route path="assets" element={<AssetsPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
        <Route path="warehouse" element={<WarehousePage />} />
        <Route path="rental-analytics" element={<RentalAnalyticsPage />} />

        {/* Events */}
        <Route path="events" element={<EventsPage />} />
        <Route path="packages" element={<PackagesPage />} />

        {/* Media Library */}
        <Route path="media" element={<MediaLibraryPage />} />

        {/* Catalog (unified) */}
        <Route path="catalog" element={<CatalogPage />} />

        {/* Orders (alias for online-orders) */}
        <Route path="orders" element={<OnlineOrdersPage />} />

        {/* Reminders */}
        <Route path="reminders" element={<RemindersPage />} />

        {/* Super Admin Panel — moved to /admin (standalone, no merchant layout) */}

        {/* ── Redirects from old routes ── */}
        <Route path="employees"        element={<Navigate to="/dashboard/team" replace />} />
        <Route path="providers"        element={<Navigate to="/dashboard/team" replace />} />
        <Route path="staff"            element={<Navigate to="/dashboard/team" replace />} />
        <Route path="permissions"      element={<Navigate to="/dashboard/team?tab=roles" replace />} />
        <Route path="attendance"       element={<Navigate to="/dashboard/team?tab=schedule" replace />} />
        <Route path="commissions"      element={<Navigate to="/dashboard/team?tab=commissions" replace />} />
        <Route path="calendar"         element={<Navigate to="/dashboard/bookings" replace />} />
        <Route path="schedule"         element={<Navigate to="/dashboard/team?tab=schedule" replace />} />
        <Route path="revenue"          element={<Navigate to="/dashboard/finance" replace />} />
        <Route path="invoices"         element={<Navigate to="/dashboard/finance?tab=invoices" replace />} />
        <Route path="expenses"         element={<Navigate to="/dashboard/finance?tab=expenses" replace />} />
        <Route path="categories"       element={<Navigate to="/dashboard/catalog?tab=categories" replace />} />
        <Route path="addons"           element={<Navigate to="/dashboard/catalog?tab=addons" replace />} />
        <Route path="services"         element={<Navigate to="/dashboard/catalog" replace />} />
        <Route path="suppliers"        element={<Navigate to="/dashboard/inventory?tab=suppliers" replace />} />
        <Route path="automation"       element={<Navigate to="/dashboard/marketing" replace />} />
        <Route path="messaging"        element={<Navigate to="/dashboard/marketing?tab=messaging" replace />} />
        {/* online-orders is now rendered at /orders, but keep old route working */}
        <Route path="settings/profile" element={<Navigate to="/dashboard/settings" replace />} />
        <Route path="settings/website" element={<Navigate to="/dashboard/website?tab=settings" replace />} />
        <Route path="customization"    element={<Navigate to="/dashboard/settings" replace />} />
        <Route path="platform"         element={<Navigate to="/dashboard/settings" replace />} />
        <Route path="settings/booking" element={<Navigate to="/dashboard/settings?tab=booking" replace />} />
        <Route path="settings/audit-log" element={<Navigate to="/dashboard/settings?tab=audit" replace />} />
        <Route path="media"            element={<Navigate to="/dashboard/website?tab=media" replace />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
