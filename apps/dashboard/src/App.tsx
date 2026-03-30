import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { SchoolLayout } from "./components/layout/SchoolLayout";
import { ReactNode, lazy, Suspense } from "react";

// ── Eager imports (needed immediately on load) ─────────────────────
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { LandingPage } from "./pages/LandingPage";
import { SchoolLandingPage } from "./pages/SchoolLandingPage";
import { SchoolLoginPage } from "./pages/SchoolLoginPage";
import { SchoolRegisterPage } from "./pages/SchoolRegisterPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";

// ── Lazy page loader ───────────────────────────────────────────────
const lz = (fn: () => Promise<{ default: any } | Record<string, any>>, named?: string) =>
  lazy(() =>
    fn().then((m) => ({
      default: named ? (m as any)[named] : (m as any).default ?? Object.values(m)[0],
    }))
  );

// Public
const PricingPage            = lz(() => import("./pages/PricingPage"), "PricingPage");
const FeaturesPage           = lz(() => import("./pages/FeaturesPage"), "FeaturesPage");
const AboutPage              = lz(() => import("./pages/AboutPage"), "AboutPage");
const ContactPage            = lz(() => import("./pages/ContactPage"), "ContactPage");
const PublicBookingPage      = lz(() => import("./pages/PublicBookingPage"), "PublicBookingPage");
const PublicTrackingPage     = lz(() => import("./pages/PublicTrackingPage"), "PublicTrackingPage");
const PublicFlowerPage       = lz(() => import("./pages/PublicFlowerPage"), "PublicFlowerPage");
const MarketplaceBrowsePage  = lz(() => import("./pages/MarketplaceBrowsePage"), "MarketplaceBrowsePage");
const PublicStorefrontPage   = lz(() => import("./pages/PublicStorefrontPage"), "PublicStorefrontPage");
const PublicPagePage         = lz(() => import("./pages/PublicPagePage"), "PublicPagePage");

// Core dashboard
const DashboardPage          = lz(() => import("./pages/DashboardPage"), "DashboardPage");
const ServiceFormPage        = lz(() => import("./pages/ServiceFormPage"), "ServiceFormPage");
const ServiceDetailPage      = lz(() => import("./pages/ServiceDetailPage"), "ServiceDetailPage");
const CategoriesPage         = lz(() => import("./pages/CategoriesPage"), "CategoriesPage");
const AddonsPage             = lz(() => import("./pages/AddonsPage"), "AddonsPage");
const BookingsPage           = lz(() => import("./pages/BookingsPage"), "BookingsPage");
const BookingDetailPage      = lz(() => import("./pages/BookingDetailPage"), "BookingDetailPage");
const CalendarPage           = lz(() => import("./pages/CalendarPage"), "CalendarPage");
const CustomersPage          = lz(() => import("./pages/CustomersPage"), "CustomersPage");
const CustomerDetailPage     = lz(() => import("./pages/CustomerDetailPage"), "CustomerDetailPage");
const POSPage                = lz(() => import("./pages/POSPage"), "POSPage");
const CatalogPage            = lz(() => import("./pages/CatalogPage"), "CatalogPage");

// Finance
const FinancePage            = lz(() => import("./pages/FinancePage"), "FinancePage");
const InvoicesPage           = lz(() => import("./pages/InvoicesPage"), "InvoicesPage");
const InvoiceDetailPage      = lz(() => import("./pages/InvoiceDetailPage"), "InvoiceDetailPage");
const ExpensesPage           = lz(() => import("./pages/ExpensesPage"), "ExpensesPage");
const ReportsPage            = lz(() => import("./pages/ReportsPage"), "ReportsPage");
const SalesReportPage        = lz(() => import("./pages/SalesReportPage"), "SalesReportPage");
const PaymentsReportPage     = lz(() => import("./pages/PaymentsReportPage"), "PaymentsReportPage");
const ExpensesReportPage     = lz(() => import("./pages/ExpensesReportPage"), "ExpensesReportPage");
const CollectionReportPage   = lz(() => import("./pages/CollectionReportPage"), "CollectionReportPage");
const BookingSalesReportPage = lz(() => import("./pages/BookingSalesReportPage"), "BookingSalesReportPage");
const CommissionsReportPage  = lz(() => import("./pages/CommissionsReportPage"), "CommissionsReportPage");
const RefundsReportPage      = lz(() => import("./pages/RefundsReportPage"), "RefundsReportPage");
const SubscriptionsReportPage= lz(() => import("./pages/SubscriptionsReportPage"), "SubscriptionsReportPage");
const PeakTimesReportPage    = lz(() => import("./pages/PeakTimesReportPage"), "PeakTimesReportPage");
const ProvidersReportPage    = lz(() => import("./pages/ProvidersReportPage"), "ProvidersReportPage");
const CashCloseReportPage    = lz(() => import("./pages/CashCloseReportPage"), "CashCloseReportPage");
const AttendanceReportPage   = lz(() => import("./pages/AttendanceReportPage"), "AttendanceReportPage");
const VisitorsReportPage     = lz(() => import("./pages/VisitorsReportPage"), "VisitorsReportPage");
const TreasuryPage           = lz(() => import("./pages/TreasuryPage"), "TreasuryPage");
const AccountingPage         = lz(() => import("./pages/AccountingPage"), "AccountingPage");
const JournalEntriesPage     = lz(() => import("./pages/JournalEntriesPage"), "JournalEntriesPage");
const FinancialStatementsPage= lz(() => import("./pages/FinancialStatementsPage"), "FinancialStatementsPage");
const ReconciliationPage     = lz(() => import("./pages/ReconciliationPage"), "ReconciliationPage");

// Operations
const InventoryPage          = lz(() => import("./pages/InventoryPage"), "InventoryPage");
const SuppliersPage          = lz(() => import("./pages/SuppliersPage"), "SuppliersPage");
const ProvidersPage          = lz(() => import("./pages/ProvidersPage"), "ProvidersPage");
const StaffPage              = lz(() => import("./pages/StaffPage"), "StaffPage");
const RolesPage              = lz(() => import("./pages/RolesPage"), "RolesPage");
const AttendancePage         = lz(() => import("./pages/AttendancePage"), "AttendancePage");
const TeamPage               = lz(() => import("./pages/TeamPage"), "TeamPage");
const DeliveryPage           = lz(() => import("./pages/DeliveryPage"), "DeliveryPage");

// Channels / Marketing
const WebsitePage            = lz(() => import("./pages/WebsitePage"), "WebsitePage");
const OnlineOrdersPage       = lz(() => import("./pages/OnlineOrdersPage"), "OnlineOrdersPage");
const AutomationPage         = lz(() => import("./pages/AutomationPage"), "AutomationPage");
const MarketingPage          = lz(() => import("./pages/MarketingPage"), "MarketingPage");
const MessagingSettingsPage  = lz(() => import("./pages/MessagingSettingsPage"), "MessagingSettingsPage");
const ReviewsPage            = lz(() => import("./pages/ReviewsPage"), "ReviewsPage");
const CustomerSegmentsPage   = lz(() => import("./pages/CustomerSegmentsPage"), "CustomerSegmentsPage");
const AbandonedCartsPage     = lz(() => import("./pages/AbandonedCartsPage"), "AbandonedCartsPage");
const CustomerSubscriptionsPage = lz(() => import("./pages/CustomerSubscriptionsPage"), "CustomerSubscriptionsPage");

// Settings
const SettingsPage           = lz(() => import("./pages/SettingsPage"), "SettingsPage");
const BookingSettingsPage    = lz(() => import("./pages/BookingSettingsPage"), "BookingSettingsPage");
const ProfileSettingsPage    = lz(() => import("./pages/ProfileSettingsPage"), "ProfileSettingsPage");
const AccountPage            = lz(() => import("./pages/AccountPage"), "AccountPage");
const WebsiteSettingsPage    = lz(() => import("./pages/WebsiteSettingsPage"), "WebsiteSettingsPage");
const CustomizationPage      = lz(() => import("./pages/CustomizationPage"), "CustomizationPage");
const PlatformPage           = lz(() => import("./pages/PlatformPage"), "PlatformPage");
const AuditLogPage           = lz(() => import("./pages/AuditLogPage"), "AuditLogPage");
const SubscriptionPage       = lz(() => import("./pages/SubscriptionPage"), "SubscriptionPage");

// Verticals
const HotelPage              = lz(() => import("./pages/HotelPage"));
const CarRentalPage          = lz(() => import("./pages/CarRentalPage"));
const IntegrationsPage       = lz(() => import("./pages/IntegrationsPage"));
const IntegrationLogsPage    = lz(() => import("./pages/IntegrationLogsPage"), "IntegrationLogsPage");
const MenuPage               = lz(() => import("./pages/MenuPage"), "MenuPage");
const MenuCategoriesPage     = lz(() => import("./pages/MenuCategoriesPage"), "MenuCategoriesPage");
const KitchenPage            = lz(() => import("./pages/KitchenPage"), "KitchenPage");
const ReservationsPage       = lz(() => import("./pages/ReservationsPage"), "ReservationsPage");
const TableMapPage           = lz(() => import("./pages/TableMapPage"), "TableMapPage");
const RestaurantAnalyticsPage= lz(() => import("./pages/RestaurantAnalyticsPage"), "RestaurantAnalyticsPage");
const RestaurantBookingSettingsPage = lz(() => import("./pages/RestaurantBookingSettingsPage"), "RestaurantBookingSettingsPage");
const LoyaltyPage            = lz(() => import("./pages/LoyaltyPage"), "LoyaltyPage");
const FlowerAnalyticsPage    = lz(() => import("./pages/FlowerAnalyticsPage"), "FlowerAnalyticsPage");
const RentalAnalyticsPage    = lz(() => import("./pages/RentalAnalyticsPage"), "RentalAnalyticsPage");
const SchedulePage           = lz(() => import("./pages/SchedulePage"), "SchedulePage");
const CommissionsPage        = lz(() => import("./pages/CommissionsPage"), "CommissionsPage");
const SalonSuppliesPage      = lz(() => import("./pages/SalonSuppliesPage"), "SalonSuppliesPage");
const ClientBeautyCardPage   = lz(() => import("./pages/ClientBeautyCardPage"), "ClientBeautyCardPage");
const StaffPerformancePage   = lz(() => import("./pages/StaffPerformancePage"), "StaffPerformancePage");
const RecallPage             = lz(() => import("./pages/RecallPage"), "RecallPage");
const FlowerInventoryPage    = lz(() => import("./pages/FlowerInventoryPage"), "FlowerInventoryPage");
const FlowerMasterPage       = lz(() => import("./pages/FlowerMasterPage"), "FlowerMasterPage");
const ArrangementsPage       = lz(() => import("./pages/ArrangementsPage"), "ArrangementsPage");
const AssetsPage             = lz(() => import("./pages/AssetsPage"), "AssetsPage");
const ContractsPage          = lz(() => import("./pages/ContractsPage"), "ContractsPage");
const InspectionsPage        = lz(() => import("./pages/InspectionsPage"), "InspectionsPage");
const MaintenancePage        = lz(() => import("./pages/MaintenancePage"), "MaintenancePage");
const WarehousePage          = lz(() => import("./pages/WarehousePage"), "WarehousePage");
const EventsPage             = lz(() => import("./pages/EventsPage"), "EventsPage");
const PackagesPage           = lz(() => import("./pages/PackagesPage"), "PackagesPage");
const MediaLibraryPage       = lz(() => import("./pages/MediaLibraryPage"), "MediaLibraryPage");
const AdminPage              = lz(() => import("./pages/AdminPage"), "AdminPage");
const AdminPaymentsPage      = lz(() => import("./pages/AdminPaymentsPage"), "AdminPaymentsPage");
const PaymentsPage           = lz(() => import("./pages/PaymentsPage"), "PaymentsPage");
const PublicPaymentPage      = lz(() => import("./pages/PublicPaymentPage"), "PublicPaymentPage");
const RemindersPage          = lz(() => import("./pages/RemindersPage"), "RemindersPage");
const SupportPage            = lz(() => import("./pages/SupportPage"), "SupportPage");
const GuidePage              = lz(() => import("./pages/GuidePage"), "GuidePage");
const BarcodeLabelPage       = lz(() => import("./pages/BarcodeLabelPage"));

// School System
const SchoolDashboardPage          = lz(() => import("./pages/school/SchoolDashboardPage"), "SchoolDashboardPage");
const SchoolDayMonitorPage         = lz(() => import("./pages/school/SchoolDayMonitorPage"), "SchoolDayMonitorPage");
const SchoolStudentsPage           = lz(() => import("./pages/school/SchoolStudentsPage"), "SchoolStudentsPage");
const SchoolClassesPage            = lz(() => import("./pages/school/SchoolClassesPage"), "SchoolClassesPage");
const SchoolCasesPage              = lz(() => import("./pages/school/SchoolCasesPage"), "SchoolCasesPage");
const SchoolImportPage             = lz(() => import("./pages/school/SchoolImportPage"), "SchoolImportPage");
const SchoolAccountPage            = lz(() => import("./pages/school/SchoolAccountPage"), "SchoolAccountPage");
const SchoolTeachersPage           = lz(() => import("./pages/school/SchoolTeachersPage"), "SchoolTeachersPage");
const SchoolTeacherSchedulePage    = lz(() => import("./pages/school/SchoolTeacherSchedulePage"), "SchoolTeacherSchedulePage");
const SchoolViolationsPage         = lz(() => import("./pages/school/SchoolViolationsPage"), "SchoolViolationsPage");
const SchoolNotificationsPage      = lz(() => import("./pages/school/SchoolNotificationsPage"), "SchoolNotificationsPage");
const SchoolStudentDetailPage      = lz(() => import("./pages/school/SchoolStudentDetailPage"), "SchoolStudentDetailPage");
const SchoolAttendancePage         = lz(() => import("./pages/school/SchoolAttendancePage"), "SchoolAttendancePage");
const SchoolBehaviorPage           = lz(() => import("./pages/school/SchoolBehaviorPage"), "SchoolBehaviorPage");
const SchoolSetupPage              = lz(() => import("./pages/school/SchoolSetupPage"), "SchoolSetupPage");
const SchoolClassRoomDetailPage    = lz(() => import("./pages/school/SchoolClassRoomDetailPage"), "SchoolClassRoomDetailPage");
const SchoolSubjectsPage           = lz(() => import("./pages/school/SchoolSubjectsPage"), "SchoolSubjectsPage");
const SchoolTeacherAttendancePage  = lz(() => import("./pages/school/SchoolTeacherAttendancePage"), "SchoolTeacherAttendancePage");
const SchoolAcademicCalendarPage   = lz(() => import("./pages/school/SchoolAcademicCalendarPage"), "SchoolAcademicCalendarPage");
const SchoolGuidePage              = lz(() => import("./pages/school/SchoolGuidePage"), "SchoolGuidePage");
const SchoolTimetablePage          = lz(() => import("./pages/school/SchoolTimetablePage"), "SchoolTimetablePage");
const SchoolTimetableTemplatesPage = lz(() => import("./pages/school/SchoolTimetableTemplatesPage"), "SchoolTimetableTemplatesPage");
const SchoolScheduleWeeksPage      = lz(() => import("./pages/school/SchoolScheduleWeeksPage"), "SchoolScheduleWeeksPage");
const SchoolPeriodsPage            = lz(() => import("./pages/school/SchoolPeriodsPage"), "SchoolPeriodsPage");
const SchoolTeacherWorkPage        = lz(() => import("./pages/school/SchoolTeacherWorkPage"), "SchoolTeacherWorkPage");
const SchoolTeacherProfilePage     = lz(() => import("./pages/school/SchoolTeacherProfilePage"), "SchoolTeacherProfilePage");
const SchoolInvitePage             = lz(() => import("./pages/school/SchoolInvitePage"), "SchoolInvitePage");

// ── Loading fallback ───────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#5b9bd5] border-t-transparent animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("nasaq_token") || sessionStorage.getItem("nasaq_token");
  const location = useLocation();
  if (!token) {
    const loginPath = location.pathname.startsWith("/school") ? "/school/login" : "/login";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }
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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public landing pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/school" element={<SchoolLandingPage />} />
        <Route path="/school/login" element={<SchoolLoginPage />} />
        <Route path="/school/register" element={<SchoolRegisterPage />} />
        <Route path="/school/invite/:token" element={<SchoolInvitePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />

        {/* Super Admin Panel */}
        <Route path="/admin" element={<RequireAdminAuth><AdminPage /></RequireAdminAuth>} />
        <Route path="/admin/payments" element={<RequireAdminAuth><AdminPaymentsPage /></RequireAdminAuth>} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Public booking / tracking / storefront */}
        <Route path="/book/:slug" element={<PublicBookingPage />} />
        <Route path="/track/:token" element={<PublicTrackingPage />} />
        <Route path="/marketplace" element={<MarketplaceBrowsePage />} />
        <Route path="/flowers/:slug" element={<PublicFlowerPage />} />
        <Route path="/s/:orgSlug" element={<PublicStorefrontPage />} />
        <Route path="/s/:orgSlug/p/:pageSlug" element={<PublicPagePage />} />
        <Route path="/pay/:orgSlug" element={<PublicPaymentPage />} />

        {/* ── Dashboard (auth required) ── */}
        <Route path="/dashboard" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />

          <Route path="services/new" element={<ServiceFormPage />} />
          <Route path="services/:id/edit" element={<ServiceFormPage />} />
          <Route path="services/:id" element={<ServiceDetailPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="addons" element={<AddonsPage />} />

          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/:id" element={<BookingDetailPage />} />
          <Route path="calendar" element={<CalendarPage />} />

          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />

          <Route path="pos" element={<POSPage />} />

          <Route path="finance" element={<FinancePage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/sales" element={<SalesReportPage />} />
          <Route path="reports/payments" element={<PaymentsReportPage />} />
          <Route path="reports/collection" element={<CollectionReportPage />} />
          <Route path="reports/expenses" element={<ExpensesReportPage />} />
          <Route path="reports/commissions" element={<CommissionsReportPage />} />
          <Route path="reports/booking-sales" element={<BookingSalesReportPage />} />
          <Route path="reports/refunds" element={<RefundsReportPage />} />
          <Route path="reports/cash-close" element={<CashCloseReportPage />} />
          <Route path="reports/providers" element={<ProvidersReportPage />} />
          <Route path="reports/attendance" element={<AttendanceReportPage />} />
          <Route path="reports/subscriptions" element={<SubscriptionsReportPage />} />
          <Route path="reports/visitors" element={<VisitorsReportPage />} />
          <Route path="reports/peak-times" element={<PeakTimesReportPage />} />
          <Route path="treasury" element={<TreasuryPage />} />
          <Route path="accounting" element={<AccountingPage />} />
          <Route path="accounting/journal-entries" element={<JournalEntriesPage />} />
          <Route path="financial-statements" element={<FinancialStatementsPage />} />
          <Route path="reconciliation" element={<ReconciliationPage />} />

          <Route path="inventory" element={<InventoryPage />} />
          <Route path="suppliers" element={<Navigate to="/dashboard/inventory?tab=suppliers" replace />} />
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="permissions" element={<RolesPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="delivery" element={<DeliveryPage />} />

          <Route path="website" element={<WebsitePage />} />
          <Route path="online-orders" element={<OnlineOrdersPage />} />
          <Route path="automation" element={<AutomationPage />} />
          <Route path="marketing" element={<MarketingPage />} />
          <Route path="messaging" element={<MessagingSettingsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="segments" element={<CustomerSegmentsPage />} />
          <Route path="abandoned-carts" element={<AbandonedCartsPage />} />
          <Route path="customer-subscriptions" element={<CustomerSubscriptionsPage />} />

          <Route path="hotel" element={<HotelPage />} />
          <Route path="car-rental" element={<CarRentalPage />} />

          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="integrations/:id/logs" element={<IntegrationLogsPage />} />

          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/booking" element={<BookingSettingsPage />} />
          <Route path="settings/profile" element={<ProfileSettingsPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="settings/website" element={<WebsiteSettingsPage />} />
          <Route path="settings/audit-log" element={<AuditLogPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="customization" element={<CustomizationPage />} />
          <Route path="platform" element={<PlatformPage />} />

          <Route path="menu" element={<MenuPage />} />
          <Route path="menu/categories" element={<MenuCategoriesPage />} />
          <Route path="kitchen" element={<KitchenPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="table-map" element={<TableMapPage />} />
          <Route path="restaurant-analytics" element={<RestaurantAnalyticsPage />} />
          <Route path="restaurant-booking-settings" element={<RestaurantBookingSettingsPage />} />
          <Route path="loyalty" element={<LoyaltyPage />} />

          <Route path="schedule" element={<SchedulePage />} />
          <Route path="commissions" element={<CommissionsPage />} />
          <Route path="salon-supplies" element={<SalonSuppliesPage />} />
          <Route path="staff-performance" element={<StaffPerformancePage />} />
          <Route path="customers/:id/beauty-card" element={<ClientBeautyCardPage />} />
          <Route path="recall" element={<RecallPage />} />

          <Route path="flower-inventory" element={<FlowerInventoryPage />} />
          <Route path="flower-master" element={<FlowerMasterPage />} />
          <Route path="arrangements" element={<ArrangementsPage />} />
          <Route path="flower-analytics" element={<FlowerAnalyticsPage />} />

          <Route path="assets" element={<AssetsPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="inspections" element={<InspectionsPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="warehouse" element={<WarehousePage />} />
          <Route path="rental-analytics" element={<RentalAnalyticsPage />} />

          <Route path="events" element={<EventsPage />} />
          <Route path="packages" element={<PackagesPage />} />

          <Route path="media" element={<MediaLibraryPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="barcode-labels" element={<BarcodeLabelPage />} />
          <Route path="orders" element={<OnlineOrdersPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="payments" element={<PaymentsPage />} />

          {/* ── Old school routes → redirect to /school/* ── */}
          <Route path="school/day-monitor"         element={<Navigate to="/school/day-monitor" replace />} />
          <Route path="school/students"            element={<Navigate to="/school/students" replace />} />
          <Route path="school/classes"             element={<Navigate to="/school/classes" replace />} />
          <Route path="school/periods/today"       element={<Navigate to="/school/periods" replace />} />
          <Route path="school/cases"               element={<Navigate to="/school/cases" replace />} />
          <Route path="school/timetable-templates" element={<Navigate to="/school/timetable-templates" replace />} />
          <Route path="school/schedules/weeks"     element={<Navigate to="/school/schedules/weeks" replace />} />
          <Route path="school/import"              element={<Navigate to="/school/import" replace />} />
          <Route path="school/attendance"          element={<Navigate to="/school/attendance" replace />} />
          <Route path="school/teachers"            element={<Navigate to="/school/teachers" replace />} />
          <Route path="school/violations"          element={<Navigate to="/school/violations" replace />} />
          <Route path="school/account"             element={<Navigate to="/school/account" replace />} />

          {/* ── Redirects from old routes ── */}
          <Route path="employees"          element={<Navigate to="/dashboard/team" replace />} />
          <Route path="settings/profile"   element={<Navigate to="/dashboard/settings" replace />} />
          <Route path="settings/website"   element={<Navigate to="/dashboard/website?tab=settings" replace />} />
          <Route path="customization"      element={<Navigate to="/dashboard/settings" replace />} />
          <Route path="platform"           element={<Navigate to="/dashboard/settings" replace />} />
          <Route path="settings/booking"   element={<Navigate to="/dashboard/settings?tab=booking" replace />} />
          <Route path="settings/audit-log" element={<Navigate to="/dashboard/settings?tab=audit" replace />} />
          <Route path="revenue"            element={<Navigate to="/dashboard/finance" replace />} />
          <Route path="automation"         element={<Navigate to="/dashboard/marketing" replace />} />
          <Route path="messaging"          element={<Navigate to="/dashboard/marketing?tab=messaging" replace />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        {/* ── School System (auth required, isolated layout) ── */}
        <Route path="/school" element={<RequireAuth><SchoolLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/school/dashboard" replace />} />
          <Route path="dashboard"          element={<SchoolDashboardPage />} />
          <Route path="day-monitor"        element={<SchoolDayMonitorPage />} />
          <Route path="students"           element={<SchoolStudentsPage />} />
          <Route path="classes"            element={<SchoolClassesPage />} />
          <Route path="classes/:classRoomId" element={<SchoolClassRoomDetailPage />} />
          <Route path="cases"              element={<SchoolCasesPage />} />
          <Route path="import"             element={<SchoolImportPage />} />
          <Route path="teachers"           element={<SchoolTeachersPage />} />
          <Route path="teachers/:teacherId" element={<SchoolTeacherProfilePage />} />
          <Route path="teachers/:teacherId/schedule" element={<SchoolTeacherSchedulePage />} />
          <Route path="violations"         element={<SchoolViolationsPage />} />
          <Route path="notifications"      element={<SchoolNotificationsPage />} />
          <Route path="account"            element={<SchoolAccountPage />} />
          <Route path="students/:studentId" element={<SchoolStudentDetailPage />} />
          <Route path="attendance"              element={<SchoolAttendancePage />} />
          <Route path="teacher-attendance"    element={<SchoolTeacherAttendancePage />} />
          <Route path="academic-calendar"    element={<SchoolAcademicCalendarPage />} />
          <Route path="schedule"             element={<SchoolAcademicCalendarPage />} />
          <Route path="guide"                element={<SchoolGuidePage />} />
          <Route path="timetable"            element={<SchoolTimetablePage />} />
          <Route path="timetable-templates" element={<SchoolTimetableTemplatesPage />} />
          <Route path="schedules/weeks"    element={<SchoolScheduleWeeksPage />} />
          <Route path="periods"            element={<SchoolPeriodsPage />} />
          <Route path="behavior"           element={<SchoolBehaviorPage />} />
          <Route path="setup"             element={<SchoolSetupPage />} />
          <Route path="subjects"          element={<SchoolSubjectsPage />} />
          <Route path="teacher-work"      element={<SchoolTeacherWorkPage />} />
          <Route path="support"           element={<SupportPage />} />
          <Route path="team"              element={<TeamPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
