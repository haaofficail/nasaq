# Architecture Audit — نسق (Updated)

## Stack
- **Frontend**: React 19 + Vite + TypeScript + TailwindCSS (SPA, single app)
- **Backend**: Hono v4 + Drizzle ORM + PostgreSQL (single API process)
- **Monorepo**: pnpm workspaces — `apps/dashboard`, `packages/api`, `packages/db`
- **Deployment**: VPS (PM2 + Nginx), rsync deploy

---

## Registered Routes (packages/api/src/index.ts)
| Route Prefix | File | Status |
|---|---|---|
| `/auth` | auth.ts | ✓ Complete |
| `/categories` | categories.ts | ✓ Complete |
| `/services` | services.ts | ✓ Complete + components/costs/requirements |
| `/addons` | addons.ts | ✓ Complete |
| `/bundles` | bundles.ts | ✓ Complete |
| `/pricing-rules` | pricing-rules.ts | ✓ Complete |
| `/bookings` | bookings.ts | ✓ Complete |
| `/customers` | customers.ts | ✓ Complete |
| `/uploads` | uploads.ts | ✓ Complete |
| `/import` | import.ts | ✓ Complete |
| `/approvals` | approvals.ts | ✓ Complete |
| `/finance` | finance.ts | ✓ Complete |
| `/inventory` | inventory.ts | ✓ Complete |
| `/team` | team.ts | ✓ Complete |
| `/automation` | automation.ts | ✓ Complete |
| `/marketing` | marketing.ts | ✓ Complete |
| `/platform` | platform.ts | ✓ Complete |
| `/website` | website.ts | ✓ Complete |
| `/settings` | settings.ts | ✓ Complete |
| `/suppliers` | suppliers.ts | ✓ Complete |
| `/pos` | pos.ts | ✓ Complete |
| `/online-orders` | online-orders.ts | ✓ Complete |
| `/menu` | menu.ts | ✓ (restaurant) |
| `/arrangements` | arrangements.ts | ✓ (flower_shop) |
| `/messaging` | messaging.ts | ✓ Partial (WhatsApp only) |
| `/flower-builder` | flower-builder.ts | ✓ (flower_shop) |
| `/attendance` | attendance.ts | ✓ Complete |
| **`/hotel`** | hotel.ts | **⬜ MISSING** |
| **`/car-rental`** | car-rental.ts | **⬜ MISSING** |
| **`/integrations`** | integrations.ts | **⬜ MISSING** |

---

## DB Schema Files (packages/db/schema/)
| File | Tables | Status |
|---|---|---|
| organizations.ts | organizations, locations | ✓ |
| auth.ts | users, roles, permissions, rolePermissions, sessions, otpCodes, auditLogs | ✓ |
| catalog.ts | categories, services, serviceMedia, pricingRules, addons, serviceAddons, bundles, bundleItems, serviceComponents, serviceCosts, serviceRequirements, seasons | ✓ — missing offeringType field |
| bookings.ts | bookings, bookingItems, bookingItemAddons, payments, bookingPipelineStages | ✓ |
| customers.ts | customers | ✓ |
| finance.ts | invoices, invoiceItems, expenses, commissions, commissionRules | ✓ |
| inventory.ts | assetTypes, assets, assetReservations, maintenanceLogs, assetTransfers | ✓ |
| team.ts | shifts, bookingTasks, taskAssignments, attendance | ✓ |
| automation.ts | automationRules | ✓ |
| marketing.ts | customerSegments, campaigns | ✓ |
| marketplace.ts | marketplaceListings, rfpRequests, rfpProposals | ✓ |
| website.ts | sitePages, siteConfig, blogPosts, contactSubmissions | ✓ |
| approvals.ts | approvalRequests | ✓ |
| **hotel.ts** | roomTypes, roomUnits, hotelReservations, housekeepingLogs | **⬜ MISSING** |
| **car-rental.ts** | vehicleCategories, vehicleUnits, carRentalReservations, vehicleInspections | **⬜ MISSING** |
| **integrations.ts** | integrationConfigs, webhookLogs, syncJobs, integrationMappings | **⬜ MISSING** |

---

## Dashboard Pages (apps/dashboard/src/pages/)
| Page | Business Type | Status |
|---|---|---|
| DashboardPage | all | ✓ |
| ServicesPage, ServiceDetailPage | all | ✓ |
| CategoriesPage, AddonsPage | all | ✓ |
| BookingsPage, BookingDetailPage, CalendarPage | all | ✓ |
| CustomersPage, CustomerDetailPage | all | ✓ |
| POSPage | all | ✓ |
| FinancePage, InvoicesPage, ExpensesPage, ReportsPage | all | ✓ |
| InventoryPage, SuppliersPage | all | ✓ |
| StaffPage, TeamPage, RolesPage, AttendancePage | all | ✓ |
| StorefrontPage, PublicStorefrontPage | all | ✓ |
| MenuPage, KitchenPage, ReservationsPage | restaurant/cafe | ✓ |
| SchedulePage, CommissionsPage | salon/barber | ✓ |
| FlowerInventoryPage, ArrangementsPage | flower_shop | ✓ |
| AssetsPage, ContractsPage, InspectionsPage | equipment_rental | ✓ |
| EventsPage, PackagesPage | events | ✓ |
| IntegrationsPage | all | **⬜ MISSING** |
| **HotelPage** | hotel | **⬜ MISSING** |
| **CarRentalPage** | car_rental | **⬜ MISSING** |

---

## Type System — ما يجب إصلاحه
1. **offeringType** غائب عن `services` — أحرج ثغرة في النظام
2. **hotel و car_rental** غائبان عن قائمة business types
3. لا يوجد registry موحد لـ business types (موزع على 3 ملفات)
4. `rental` مبهم — يعني "إيجار معدات" لكن اسمه عام

---

## Single Source of Truth (SSoT) Map
| Data | SSoT | Notes |
|---|---|---|
| Org identity | organizations | |
| Business type | organizations.businessType | يحتاج enum أو registry |
| Offering type | services.offeringType | **⬜ لا يوجد بعد** |
| Branding | siteConfig (falls back to org) | |
| Services/catalog | services, categories | |
| Bookings | bookings | |
| Hotel rooms | roomTypes, roomUnits | **⬜ لا يوجد بعد** |
| Hotel reservations | hotelReservations | **⬜ لا يوجد بعد** |
| Vehicle fleet | vehicleCategories, vehicleUnits | **⬜ لا يوجد بعد** |
| Car rental reservations | carRentalReservations | **⬜ لا يوجد بعد** |
| Integrations | integrationConfigs | **⬜ لا يوجد بعد** |
| Inventory/assets | assetTypes, assets | ✓ (for equipment_rental) |
| Finance | invoices, expenses | |
| Permissions | roles, permissions, rolePermissions | |

---

## Capabilities / Operational Flexibility
**الوضع الحالي:** `organizations.settings` هو JSONB مرن لكن لا توجد وثيقة للـ capabilities المدعومة.

**المطلوب إضافته لـ settings JSON:**
```json
{
  "capabilities": {
    "inventory_tracking": false,
    "unit_based_management": false,
    "asset_linking": false,
    "staff_assignment": true,
    "schedule_linking": false,
    "availability_control": false,
    "advanced_pricing": false,
    "inspections": false,
    "housekeeping": false,
    "maintenance_workflows": false,
    "deposits": false,
    "external_integrations": false,
    "hotel_mode": "simple",
    "car_rental_mode": "simple"
  }
}
```

---

## Navigation/Routing Status

### Business Type Nav Groups في Layout.tsx
| Business Type | Nav Group | Status |
|---|---|---|
| restaurant, cafe, catering, bakery | FOOD_GROUP | ✓ |
| salon, barber, spa, fitness | BEAUTY_GROUP | ✓ |
| flower_shop | custom group | ✓ |
| equipment_rental (rental) | custom group | ✓ |
| events | custom group | ✓ |
| **hotel** | **⬜ MISSING** | |
| **car_rental** | **⬜ MISSING** | |

---

## ما اكتمل في هذه الدورة
- ✅ StorefrontPage.tsx — لوحة موقع موحدة (استبدلت 3 صفحات)
- ✅ PublicStorefrontPage.tsx — الموقع العام للتاجر على `/s/:orgSlug`
- ✅ serviceRequirements — ربط الخدمة بموظف/أصل/متطلب نصي
- ✅ Enhanced public endpoint — يعيد categories + branches + stats
- ✅ Layout.tsx — تبسيط قائمة موقعي
