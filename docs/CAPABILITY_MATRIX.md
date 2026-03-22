# Capability Matrix — Nasaq Platform

Last updated: 2026-03-22

## Core Capabilities (all business types)

| Capability | API Route | Dashboard Route | Status |
|-----------|-----------|-----------------|--------|
| Service Catalog | `/services`, `/categories`, `/addons` | `/dashboard/services`, `/categories`, `/addons` | ACTIVE |
| Bookings & Pipeline | `/bookings` | `/dashboard/bookings` | ACTIVE |
| Calendar View | `/bookings/calendar/events` | `/dashboard/calendar` | ACTIVE |
| Customers (CRM) | `/customers` | `/dashboard/customers` | ACTIVE |
| Finance (Invoices/Expenses) | `/finance` | `/dashboard/finance`, `/invoices`, `/expenses` | ACTIVE |
| Reports | `/finance/reports` | `/dashboard/reports` | ACTIVE |
| Inventory Management | `/inventory` | `/dashboard/inventory` | ACTIVE |
| Suppliers | `/suppliers` | `/dashboard/suppliers` | ACTIVE |
| Team & Attendance | `/team` | `/dashboard/staff`, `/attendance` | ACTIVE |
| Roles & Permissions | `/team/roles` | `/dashboard/permissions` | ACTIVE |
| Service Providers | `/team/vendors` | `/dashboard/providers` | ACTIVE |
| POS | `/pos` | `/dashboard/pos` | ACTIVE |
| Online Orders | `/online-orders` | `/dashboard/online-orders` | ACTIVE |
| Website Builder | `/website` | `/dashboard/website` | ACTIVE |
| Marketing & Coupons | `/marketing` | `/dashboard/marketing` | ACTIVE |
| Automation Rules | `/automation` | `/dashboard/automation` | ACTIVE |
| Messaging (WhatsApp) | `/messaging` | `/dashboard/messaging` | ACTIVE |
| Platform (API Keys/Webhooks) | `/platform` | `/dashboard/platform` | ACTIVE |
| Settings | `/settings` | `/dashboard/settings` | ACTIVE |
| Bundles & Pricing Rules | `/bundles`, `/pricing-rules` | — | ACTIVE |

## Specialty Capabilities by Business Type

### Food & Beverage (restaurant, cafe, catering, bakery)

| Capability | API Route | Dashboard Route | Status |
|-----------|-----------|-----------------|--------|
| Menu Management | `/menu/items`, `/menu/categories` | `/dashboard/menu`, `/dashboard/menu/categories` | ACTIVE |
| Kitchen Display | — | `/dashboard/kitchen` | UI only |
| Table Reservations | — | `/dashboard/reservations` | UI only |

### Beauty & Wellness (salon, barber, spa, fitness)

| Capability | API Route | Dashboard Route | Status |
|-----------|-----------|-----------------|--------|
| Staff Schedule | `/team/shifts` | `/dashboard/schedule` | ACTIVE |
| Commissions | `/team/vendors` (provider_earnings) | `/dashboard/commissions` | ACTIVE |

### Flower Shop (flower_shop)

| Capability | API Route | Dashboard Route | Status |
|-----------|-----------|-----------------|--------|
| Flower Inventory | `/flower-builder/inventory` | `/dashboard/flower-inventory` | ACTIVE |
| Arrangements/Packages | `/arrangements` | `/dashboard/arrangements` | ACTIVE |
| Custom Bouquet Builder | `/flower-builder` | `/flowers/:slug` (public) | ACTIVE |

### Rental (rental)

| Capability | API Route | Dashboard Route | Status |
|-----------|-----------|-----------------|--------|
| Rental Assets | `/inventory/assets` | `/dashboard/assets` | ACTIVE |
| Contracts | — | `/dashboard/contracts` | UI only |
| Inspections | — | `/dashboard/inspections` | UI only |

### Events (events)

| Capability | API Route | Dashboard Route | Status |
|-----------|-----------|-----------------|--------|
| Events | `/bookings` (event bookings) | `/dashboard/events` | ACTIVE |
| Event Packages | `/bundles` | `/dashboard/packages` | ACTIVE |

## Planned Capabilities (not yet implemented)

| Capability | Target Business Types | Priority |
|-----------|----------------------|----------|
| Kitchen Display System (live orders) | restaurant, cafe | HIGH |
| Table Reservation Engine | restaurant, cafe | HIGH |
| Contract Management | rental | MEDIUM |
| Inspection Checklists | rental | MEDIUM |
| Loyalty Program | all types | MEDIUM |
| Gift Cards | retail, flower_shop | LOW |
| Delivery Driver Tracking | restaurant, flower_shop | LOW |
