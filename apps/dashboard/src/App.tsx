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

// ── Operations ────────────────────────────────────────────────────
import { InventoryPage } from "./pages/InventoryPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { ProvidersPage } from "./pages/ProvidersPage";
import { StaffPage } from "./pages/StaffPage";
import { RolesPage } from "./pages/RolesPage";
import { TeamPage } from "./pages/TeamPage";
import { AttendancePage } from "./pages/AttendancePage";

// ── Channels ──────────────────────────────────────────────────────
import { SiteBuilderPage } from "./pages/SiteBuilderPage";
import { PageBuilderPage } from "./pages/PageBuilderPage";
import { WebsiteSettingsPage } from "./pages/WebsiteSettingsPage";
import { OnlineOrdersPage } from "./pages/OnlineOrdersPage";
import { AutomationPage } from "./pages/AutomationPage";
import { MarketingPage } from "./pages/MarketingPage";
import { MessagingSettingsPage } from "./pages/MessagingSettingsPage";

// ── Settings ──────────────────────────────────────────────────────
import { SettingsPage } from "./pages/SettingsPage";
import { BookingSettingsPage } from "./pages/BookingSettingsPage";
import { ProfileSettingsPage } from "./pages/ProfileSettingsPage";
import { CustomizationPage } from "./pages/CustomizationPage";
import { PlatformPage } from "./pages/PlatformPage";
import { AuditLogPage } from "./pages/AuditLogPage";

// ── Business-type specific ────────────────────────────────────────
import { MenuPage } from "./pages/MenuPage";
import { MenuCategoriesPage } from "./pages/MenuCategoriesPage";
import { KitchenPage } from "./pages/KitchenPage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { CommissionsPage } from "./pages/CommissionsPage";
import { FlowerInventoryPage } from "./pages/FlowerInventoryPage";
import { ArrangementsPage } from "./pages/ArrangementsPage";
import { AssetsPage } from "./pages/AssetsPage";
import { ContractsPage } from "./pages/ContractsPage";
import { InspectionsPage } from "./pages/InspectionsPage";
import { EventsPage } from "./pages/EventsPage";
import { PackagesPage } from "./pages/PackagesPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("nasaq_token");
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
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
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Public booking / tracking */}
      <Route path="/book/:slug" element={<PublicBookingPage />} />
      <Route path="/track/:token" element={<PublicTrackingPage />} />
      <Route path="/marketplace" element={<MarketplaceBrowsePage />} />
      <Route path="/flowers/:slug" element={<PublicFlowerPage />} />

      {/* ── Dashboard (auth required) ── */}
      <Route path="/dashboard" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />

        {/* Services */}
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:id" element={<ServiceDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories-mgmt" element={<CategoriesPage />} />  {/* legacy alias */}
        <Route path="addons" element={<AddonsPage />} />
        <Route path="addons-mgmt" element={<AddonsPage />} />           {/* legacy alias */}

        {/* Bookings */}
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />
        <Route path="bookings/calendar" element={<CalendarPage />} />
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

        {/* Operations */}
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="permissions" element={<RolesPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="attendance" element={<AttendancePage />} />

        {/* Channels */}
        <Route path="website" element={<SiteBuilderPage />} />
        <Route path="website/builder" element={<PageBuilderPage />} />
        <Route path="website/settings" element={<WebsiteSettingsPage />} />
        <Route path="site-builder" element={<SiteBuilderPage />} />     {/* legacy alias */}
        <Route path="online-orders" element={<OnlineOrdersPage />} />
        <Route path="automation" element={<AutomationPage />} />
        <Route path="marketing" element={<MarketingPage />} />
        <Route path="messaging" element={<MessagingSettingsPage />} />

        {/* Settings */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/booking" element={<BookingSettingsPage />} />
        <Route path="settings/website" element={<WebsiteSettingsPage />} />
        <Route path="settings/profile" element={<ProfileSettingsPage />} />
        <Route path="settings/roles" element={<RolesPage />} />
        <Route path="settings/staff" element={<StaffPage />} />
        <Route path="settings/audit-log" element={<AuditLogPage />} />
        <Route path="customization" element={<CustomizationPage />} />
        <Route path="platform" element={<PlatformPage />} />

        {/* Restaurant / Cafe */}
        <Route path="menu" element={<MenuPage />} />
        <Route path="menu/categories" element={<MenuCategoriesPage />} />
        <Route path="kitchen" element={<KitchenPage />} />
        <Route path="reservations" element={<ReservationsPage />} />

        {/* Salon */}
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="commissions" element={<CommissionsPage />} />

        {/* Flower shop */}
        <Route path="flower-inventory" element={<FlowerInventoryPage />} />
        <Route path="arrangements" element={<ArrangementsPage />} />

        {/* Rental */}
        <Route path="assets" element={<AssetsPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="inspections" element={<InspectionsPage />} />

        {/* Events */}
        <Route path="events" element={<EventsPage />} />
        <Route path="packages" element={<PackagesPage />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
