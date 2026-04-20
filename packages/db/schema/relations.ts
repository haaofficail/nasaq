/**
 * Drizzle ORM — تعريف العلاقات بين الجداول
 *
 * ملف مركزي لكل relations() بدلاً من تشتيتها في كل schema.
 * يُتيح type-safe query traversal عبر db.query.*
 */

import { relations } from "drizzle-orm";

import { organizations, locations }                        from "./organizations";
import { users, roles, permissions, rolePermissions, sessions, otpCodes } from "./auth";
import { categories, services, serviceMedia, pricingRules,
         addons, serviceAddons, bundles, bundleItems,
         serviceComponents, serviceCosts, serviceRequirements, serviceStaff } from "./catalog";
import { customers, customerContacts, customerInteractions, customerSegments, customerSubscriptions } from "./customers";
import { bookings, bookingItems, bookingItemAddons, payments,
         bookingAssignments, bookingCommissions, bookingEvents, bookingConsumptions } from "./bookings";
import { invoices, invoiceItems, expenses, vendorCommissions, vendorPayouts } from "./finance";
import { assetTypes, assets, assetReservations, maintenanceLogs, assetTransfers } from "./inventory";
import { shifts, bookingTasks }                            from "./team";
import { campaigns, loyaltyConfig, loyaltyTransactions, reviews } from "./marketing";
import { marketplaceListings, rfpRequests, rfpProposals }  from "./marketplace";
import { approvalRules, approvalRequests }                 from "./approvals";
import { messagesInbox } from "./messages";
import { roomTypes, roomUnits, hotelReservations }         from "./hotel";
import { vehicleCategories, vehicleUnits, carRentalReservations } from "./car-rental";
import { flowerVariants, flowerBatches }                   from "./flowers";
import { salonSupplies, clientBeautyProfiles, visitNotes } from "./salon";
import { chartOfAccounts, journalEntries, journalEntryLines } from "./accounting";
import { treasuryAccounts, treasuryTransactions }          from "./treasury";
import { jobTitles, orgMembers }                           from "./rbac";
import { automationRules, notificationTemplates }          from "./automation";
import { integrationConfigs }                              from "./integrations";
import { reminderCategories, reminderTemplates, orgReminders } from "./reminders";
import { events, ticketTypes, seatSections, seats, ticketIssuances } from "./events";
import { suppliers, purchaseOrders, purchaseOrderItems, goodsReceipts, goodsReceiptItems, supplierInvoices } from "./procurement";
import {
  bookingRecords,
  bookingLines,
  bookingLineAddons,
  bookingTimelineEvents,
  bookingRecordAssignments,
  bookingRecordCommissions,
  bookingRecordConsumptions,
  bookingPaymentLinks,
} from "./canonical-bookings";

// ============================================================
// ORGANIZATIONS
// ============================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users:            many(users),
  locations:        many(locations),
  categories:       many(categories),
  services:         many(services),
  customers:        many(customers),
  bookings:         many(bookings),
  invoices:         many(invoices),
  assets:           many(assets),
  campaigns:        many(campaigns),
  approvalRules:    many(approvalRules),
  approvalRequests: many(approvalRequests),
  messagesInbox:    many(messagesInbox),
  roomTypes:        many(roomTypes),
  vehicleCategories: many(vehicleCategories),
  flowerVariants:   many(flowerVariants),
  loyaltyConfig:    many(loyaltyConfig),
  orgMembers:       many(orgMembers),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  org:      one(organizations, { fields: [locations.orgId], references: [organizations.id] }),
  bookings: many(bookings),
}));

// ============================================================
// AUTH — users, roles, permissions
// ============================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  org:              one(organizations, { fields: [users.orgId],    references: [organizations.id] }),
  role:             one(roles,         { fields: [users.roleId],   references: [roles.id] }),
  sessions:         many(sessions),
  bookingAssignments: many(bookingAssignments),
  bookingCommissions: many(bookingCommissions),
  assignedCanonicalBookings: many(bookingRecords, { relationName: "booking_record_assigned_user" }),
  vendorCanonicalBookings: many(bookingRecords, { relationName: "booking_record_vendor_user" }),
  canonicalTimelineEvents: many(bookingTimelineEvents),
  canonicalAssignments: many(bookingRecordAssignments),
  canonicalCommissions: many(bookingRecordCommissions),
  canonicalConsumptions: many(bookingRecordConsumptions, { relationName: "canonical_consumptions_created_by_user" }),
  serviceStaff:     many(serviceStaff),
  visitNotes:       many(visitNotes),
  shifts:           many(shifts),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  org:             one(organizations, { fields: [roles.orgId], references: [organizations.id] }),
  rolePermissions: many(rolePermissions),
  users:           many(users),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role:       one(roles,       { fields: [rolePermissions.roleId],       references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// ============================================================
// CATALOG — categories, services, addons, pricing
// ============================================================

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  org:      one(organizations, { fields: [categories.orgId],    references: [organizations.id] }),
  parent:   one(categories,    { fields: [categories.parentId], references: [categories.id],    relationName: "children" }),
  children: many(categories,                                                                    { relationName: "children" }),
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  org:               one(organizations, { fields: [services.orgId],      references: [organizations.id] }),
  category:          one(categories,    { fields: [services.categoryId], references: [categories.id] }),
  media:             many(serviceMedia),
  pricingRules:      many(pricingRules),
  serviceAddons:     many(serviceAddons),
  components:        many(serviceComponents),
  costs:             many(serviceCosts),
  requirements:      many(serviceRequirements),
  staff:             many(serviceStaff),
  bookingItems:      many(bookingItems),
  marketplaceListings: many(marketplaceListings),
}));

export const serviceMediaRelations = relations(serviceMedia, ({ one }) => ({
  service: one(services, { fields: [serviceMedia.serviceId], references: [services.id] }),
}));

export const pricingRulesRelations = relations(pricingRules, ({ one }) => ({
  org:     one(organizations, { fields: [pricingRules.orgId],     references: [organizations.id] }),
  service: one(services,      { fields: [pricingRules.serviceId], references: [services.id] }),
}));

export const addonsRelations = relations(addons, ({ one, many }) => ({
  org:           one(organizations, { fields: [addons.orgId], references: [organizations.id] }),
  serviceAddons: many(serviceAddons),
}));

export const serviceAddonsRelations = relations(serviceAddons, ({ one }) => ({
  service: one(services, { fields: [serviceAddons.serviceId], references: [services.id] }),
  addon:   one(addons,   { fields: [serviceAddons.addonId],   references: [addons.id] }),
}));

export const bundlesRelations = relations(bundles, ({ one, many }) => ({
  org:   one(organizations, { fields: [bundles.orgId], references: [organizations.id] }),
  items: many(bundleItems),
}));

export const bundleItemsRelations = relations(bundleItems, ({ one }) => ({
  bundle:  one(bundles,  { fields: [bundleItems.bundleId],  references: [bundles.id] }),
  service: one(services, { fields: [bundleItems.serviceId], references: [services.id] }),
}));

export const serviceCostsRelations = relations(serviceCosts, ({ one }) => ({
  org:     one(organizations, { fields: [serviceCosts.orgId],     references: [organizations.id] }),
  service: one(services,      { fields: [serviceCosts.serviceId], references: [services.id] }),
}));

export const serviceRequirementsRelations = relations(serviceRequirements, ({ one }) => ({
  org:       one(organizations, { fields: [serviceRequirements.orgId],       references: [organizations.id] }),
  service:   one(services,      { fields: [serviceRequirements.serviceId],   references: [services.id] }),
  asset:     one(assets,        { fields: [serviceRequirements.assetId],     references: [assets.id] }),
  assetType: one(assetTypes,    { fields: [serviceRequirements.assetTypeId], references: [assetTypes.id] }),
}));

export const serviceStaffRelations = relations(serviceStaff, ({ one }) => ({
  service: one(services, { fields: [serviceStaff.serviceId], references: [services.id] }),
  user:    one(users,    { fields: [serviceStaff.userId],    references: [users.id] }),
}));

// ============================================================
// CUSTOMERS
// ============================================================

export const customersRelations = relations(customers, ({ one, many }) => ({
  org:              one(organizations, { fields: [customers.orgId], references: [organizations.id] }),
  contacts:         many(customerContacts),
  interactions:     many(customerInteractions),
  bookings:         many(bookings),
  canonicalBookings: many(bookingRecords),
  loyaltyTxns:      many(loyaltyTransactions),
  reviews:          many(reviews),
  beautyProfiles:   many(clientBeautyProfiles),
  subscriptions:    many(customerSubscriptions),
}));

export const customerContactsRelations = relations(customerContacts, ({ one }) => ({
  customer: one(customers, { fields: [customerContacts.customerId], references: [customers.id] }),
}));

export const customerInteractionsRelations = relations(customerInteractions, ({ one }) => ({
  customer: one(customers, { fields: [customerInteractions.customerId], references: [customers.id] }),
  user:     one(users,     { fields: [customerInteractions.userId],     references: [users.id] }),
}));

export const customerSubscriptionsRelations = relations(customerSubscriptions, ({ one }) => ({
  org:      one(organizations, { fields: [customerSubscriptions.orgId],      references: [organizations.id] }),
  customer: one(customers,     { fields: [customerSubscriptions.customerId], references: [customers.id] }),
  service:  one(services,      { fields: [customerSubscriptions.serviceId],  references: [services.id] }),
}));

// ============================================================
// BOOKINGS
// ============================================================

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  org:         one(organizations, { fields: [bookings.orgId],      references: [organizations.id] }),
  customer:    one(customers,     { fields: [bookings.customerId], references: [customers.id] }),
  location:    one(locations,     { fields: [bookings.locationId], references: [locations.id] }),
  items:       many(bookingItems),
  payments:    many(payments),
  assignments: many(bookingAssignments),
  commissions: many(bookingCommissions),
  events:      many(bookingEvents),
  tasks:       many(bookingTasks),
  consumptions: many(bookingConsumptions),
}));

export const bookingItemsRelations = relations(bookingItems, ({ one, many }) => ({
  booking: one(bookings,  { fields: [bookingItems.bookingId], references: [bookings.id] }),
  service: one(services,  { fields: [bookingItems.serviceId], references: [services.id] }),
  addons:  many(bookingItemAddons),
}));

export const bookingItemAddonsRelations = relations(bookingItemAddons, ({ one }) => ({
  bookingItem: one(bookingItems, { fields: [bookingItemAddons.bookingItemId], references: [bookingItems.id] }),
  addon:       one(addons,       { fields: [bookingItemAddons.addonId],       references: [addons.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  org:     one(organizations, { fields: [payments.orgId],     references: [organizations.id] }),
  booking: one(bookings,      { fields: [payments.bookingId], references: [bookings.id] }),
}));

export const bookingAssignmentsRelations = relations(bookingAssignments, ({ one }) => ({
  booking: one(bookings, { fields: [bookingAssignments.bookingId], references: [bookings.id] }),
  user:    one(users,    { fields: [bookingAssignments.userId],    references: [users.id] }),
}));

export const bookingCommissionsRelations = relations(bookingCommissions, ({ one }) => ({
  org:     one(organizations, { fields: [bookingCommissions.orgId],     references: [organizations.id] }),
  booking: one(bookings,      { fields: [bookingCommissions.bookingId], references: [bookings.id] }),
  user:    one(users,         { fields: [bookingCommissions.userId],    references: [users.id] }),
}));

export const bookingEventsRelations = relations(bookingEvents, ({ one }) => ({
  booking: one(bookings, { fields: [bookingEvents.bookingId], references: [bookings.id] }),
  user:    one(users,    { fields: [bookingEvents.userId],    references: [users.id] }),
}));

export const bookingRecordsRelations = relations(bookingRecords, ({ one, many }) => ({
  org:            one(organizations, { fields: [bookingRecords.orgId],      references: [organizations.id] }),
  customer:       one(customers,     { fields: [bookingRecords.customerId], references: [customers.id] }),
  location:       one(locations,     { fields: [bookingRecords.locationId], references: [locations.id] }),
  assignedUser:   one(users,         { fields: [bookingRecords.assignedUserId], references: [users.id], relationName: "booking_record_assigned_user" }),
  vendor:         one(users,         { fields: [bookingRecords.vendorId], references: [users.id], relationName: "booking_record_vendor_user" }),
  legacyBooking:  one(bookings,      { fields: [bookingRecords.bookingRef], references: [bookings.id] }),
  lines:          many(bookingLines),
  timelineEvents: many(bookingTimelineEvents),
  assignments:    many(bookingRecordAssignments),
  commissions:    many(bookingRecordCommissions),
  consumptions:   many(bookingRecordConsumptions),
  paymentLinks:   many(bookingPaymentLinks),
}));

export const bookingLinesRelations = relations(bookingLines, ({ one, many }) => ({
  bookingRecord: one(bookingRecords, { fields: [bookingLines.bookingRecordId], references: [bookingRecords.id] }),
  addons:        many(bookingLineAddons),
  commissions:   many(bookingRecordCommissions),
  consumptions:  many(bookingRecordConsumptions),
}));

export const bookingLineAddonsRelations = relations(bookingLineAddons, ({ one }) => ({
  bookingLine: one(bookingLines, { fields: [bookingLineAddons.bookingLineId], references: [bookingLines.id] }),
}));

export const bookingTimelineEventsRelations = relations(bookingTimelineEvents, ({ one }) => ({
  org:           one(organizations, { fields: [bookingTimelineEvents.orgId], references: [organizations.id] }),
  bookingRecord: one(bookingRecords, { fields: [bookingTimelineEvents.bookingRecordId], references: [bookingRecords.id] }),
  user:          one(users, { fields: [bookingTimelineEvents.userId], references: [users.id] }),
}));

export const bookingRecordAssignmentsRelations = relations(bookingRecordAssignments, ({ one }) => ({
  org:           one(organizations, { fields: [bookingRecordAssignments.orgId], references: [organizations.id] }),
  bookingRecord: one(bookingRecords, { fields: [bookingRecordAssignments.bookingRecordId], references: [bookingRecords.id] }),
  user:          one(users, { fields: [bookingRecordAssignments.userId], references: [users.id] }),
}));

export const bookingRecordCommissionsRelations = relations(bookingRecordCommissions, ({ one }) => ({
  org:           one(organizations, { fields: [bookingRecordCommissions.orgId], references: [organizations.id] }),
  bookingRecord: one(bookingRecords, { fields: [bookingRecordCommissions.bookingRecordId], references: [bookingRecords.id] }),
  bookingLine:   one(bookingLines, { fields: [bookingRecordCommissions.bookingLineId], references: [bookingLines.id] }),
  user:          one(users, { fields: [bookingRecordCommissions.userId], references: [users.id] }),
}));

export const canonicalBookingConsumptionsRelations = relations(bookingRecordConsumptions, ({ one }) => ({
  org:           one(organizations, { fields: [bookingRecordConsumptions.orgId], references: [organizations.id] }),
  bookingRecord: one(bookingRecords, { fields: [bookingRecordConsumptions.bookingRecordId], references: [bookingRecords.id] }),
  bookingLine:   one(bookingLines, { fields: [bookingRecordConsumptions.bookingLineId], references: [bookingLines.id] }),
  createdByUser: one(users, { fields: [bookingRecordConsumptions.createdBy], references: [users.id], relationName: "canonical_consumptions_created_by_user" }),
}));

export const bookingPaymentLinksRelations = relations(bookingPaymentLinks, ({ one }) => ({
  org:           one(organizations, { fields: [bookingPaymentLinks.orgId], references: [organizations.id] }),
  bookingRecord: one(bookingRecords, { fields: [bookingPaymentLinks.bookingRecordId], references: [bookingRecords.id] }),
  payment:       one(payments, { fields: [bookingPaymentLinks.paymentId], references: [payments.id] }),
}));

// ============================================================
// FINANCE
// ============================================================

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  org:      one(organizations, { fields: [invoices.orgId],      references: [organizations.id] }),
  customer: one(customers,     { fields: [invoices.customerId], references: [customers.id] }),
  booking:  one(bookings,      { fields: [invoices.bookingId],  references: [bookings.id] }),
  items:    many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  org:  one(organizations, { fields: [expenses.orgId],     references: [organizations.id] }),
  user: one(users,         { fields: [expenses.createdBy], references: [users.id] }),
}));

export const vendorCommissionsRelations = relations(vendorCommissions, ({ one }) => ({
  org: one(organizations, { fields: [vendorCommissions.orgId], references: [organizations.id] }),
}));

export const vendorPayoutsRelations = relations(vendorPayouts, ({ one }) => ({
  org: one(organizations, { fields: [vendorPayouts.orgId], references: [organizations.id] }),
}));

// ============================================================
// INVENTORY
// ============================================================

export const assetTypesRelations = relations(assetTypes, ({ one, many }) => ({
  org:    one(organizations, { fields: [assetTypes.orgId], references: [organizations.id] }),
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  org:          one(organizations, { fields: [assets.orgId],       references: [organizations.id] }),
  assetType:    one(assetTypes,    { fields: [assets.assetTypeId], references: [assetTypes.id] }),
  reservations: many(assetReservations),
  maintenance:  many(maintenanceLogs),
  transfers:    many(assetTransfers),
}));

export const assetReservationsRelations = relations(assetReservations, ({ one }) => ({
  asset:   one(assets,   { fields: [assetReservations.assetId],   references: [assets.id] }),
  booking: one(bookings, { fields: [assetReservations.bookingId], references: [bookings.id] }),
}));

export const maintenanceLogsRelations = relations(maintenanceLogs, ({ one }) => ({
  org:   one(organizations, { fields: [maintenanceLogs.orgId],    references: [organizations.id] }),
  asset: one(assets,        { fields: [maintenanceLogs.assetId],  references: [assets.id] }),
}));

// ============================================================
// MARKETING
// ============================================================

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  org: one(organizations, { fields: [campaigns.orgId], references: [organizations.id] }),
}));

export const loyaltyConfigRelations = relations(loyaltyConfig, ({ one }) => ({
  org: one(organizations, { fields: [loyaltyConfig.orgId], references: [organizations.id] }),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  org:      one(organizations, { fields: [loyaltyTransactions.orgId],      references: [organizations.id] }),
  customer: one(customers,     { fields: [loyaltyTransactions.customerId], references: [customers.id] }),
  booking:  one(bookings,      { fields: [loyaltyTransactions.bookingId],  references: [bookings.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  org:      one(organizations, { fields: [reviews.orgId],      references: [organizations.id] }),
  customer: one(customers,     { fields: [reviews.customerId], references: [customers.id] }),
  booking:  one(bookings,      { fields: [reviews.bookingId],  references: [bookings.id] }),
}));

// ============================================================
// MARKETPLACE
// ============================================================

export const marketplaceListingsRelations = relations(marketplaceListings, ({ one }) => ({
  org:     one(organizations, { fields: [marketplaceListings.orgId],     references: [organizations.id] }),
  service: one(services,      { fields: [marketplaceListings.serviceId], references: [services.id] }),
}));

export const rfpRequestsRelations = relations(rfpRequests, ({ many }) => ({
  proposals: many(rfpProposals),
}));

export const rfpProposalsRelations = relations(rfpProposals, ({ one }) => ({
  rfp: one(rfpRequests,  { fields: [rfpProposals.rfpId],  references: [rfpRequests.id] }),
  org: one(organizations, { fields: [rfpProposals.orgId], references: [organizations.id] }),
}));

// ============================================================
// APPROVALS
// ============================================================

export const approvalRulesRelations = relations(approvalRules, ({ one }) => ({
  org: one(organizations, { fields: [approvalRules.orgId], references: [organizations.id] }),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
  org:         one(organizations, { fields: [approvalRequests.orgId],        references: [organizations.id] }),
  requestedBy: one(users,         { fields: [approvalRequests.requestedBy],  references: [users.id],          relationName: "requester" }),
  resolvedBy:  one(users,         { fields: [approvalRequests.resolvedBy],   references: [users.id],          relationName: "resolver" }),
}));

// ============================================================
// MESSAGES INBOX
// ============================================================

export const messagesInboxRelations = relations(messagesInbox, ({ one }) => ({
  org: one(organizations, { fields: [messagesInbox.orgId], references: [organizations.id] }),
}));

// ============================================================
// HOTEL
// ============================================================

export const roomTypesRelations = relations(roomTypes, ({ one, many }) => ({
  org:   one(organizations, { fields: [roomTypes.orgId], references: [organizations.id] }),
  units: many(roomUnits),
}));

export const roomUnitsRelations = relations(roomUnits, ({ one, many }) => ({
  org:          one(organizations, { fields: [roomUnits.orgId],      references: [organizations.id] }),
  roomType:     one(roomTypes,     { fields: [roomUnits.roomTypeId], references: [roomTypes.id] }),
  reservations: many(hotelReservations),
}));

export const hotelReservationsRelations = relations(hotelReservations, ({ one }) => ({
  org:      one(organizations, { fields: [hotelReservations.orgId],      references: [organizations.id] }),
  roomUnit: one(roomUnits,     { fields: [hotelReservations.roomUnitId], references: [roomUnits.id] }),
}));

// ============================================================
// CAR RENTAL
// ============================================================

export const vehicleCategoriesRelations = relations(vehicleCategories, ({ one, many }) => ({
  org:   one(organizations, { fields: [vehicleCategories.orgId], references: [organizations.id] }),
  units: many(vehicleUnits),
}));

export const vehicleUnitsRelations = relations(vehicleUnits, ({ one, many }) => ({
  org:          one(organizations,     { fields: [vehicleUnits.orgId],       references: [organizations.id] }),
  category:     one(vehicleCategories, { fields: [vehicleUnits.categoryId],  references: [vehicleCategories.id] }),
  reservations: many(carRentalReservations),
}));

export const carRentalReservationsRelations = relations(carRentalReservations, ({ one }) => ({
  org:         one(organizations, { fields: [carRentalReservations.orgId],          references: [organizations.id] }),
  vehicleUnit: one(vehicleUnits,  { fields: [carRentalReservations.vehicleUnitId],  references: [vehicleUnits.id] }),
  category:    one(vehicleCategories, { fields: [carRentalReservations.categoryId], references: [vehicleCategories.id] }),
}));

// ============================================================
// FLOWERS
// ============================================================

export const flowerVariantsRelations = relations(flowerVariants, ({ many }) => ({
  batches: many(flowerBatches),
}));

export const flowerBatchesRelations = relations(flowerBatches, ({ one }) => ({
  org:     one(organizations, { fields: [flowerBatches.orgId],     references: [organizations.id] }),
  variant: one(flowerVariants, { fields: [flowerBatches.variantId], references: [flowerVariants.id] }),
}));

// ============================================================
// SALON
// ============================================================

export const salonSuppliesRelations = relations(salonSupplies, ({ one }) => ({
  org: one(organizations, { fields: [salonSupplies.orgId], references: [organizations.id] }),
}));

export const clientBeautyProfilesRelations = relations(clientBeautyProfiles, ({ one }) => ({
  org:      one(organizations, { fields: [clientBeautyProfiles.orgId],      references: [organizations.id] }),
  customer: one(customers,     { fields: [clientBeautyProfiles.customerId], references: [customers.id] }),
}));

export const visitNotesRelations = relations(visitNotes, ({ one }) => ({
  org:      one(organizations, { fields: [visitNotes.orgId],      references: [organizations.id] }),
  customer: one(customers,     { fields: [visitNotes.customerId], references: [customers.id] }),
  staff:    one(users,         { fields: [visitNotes.staffId],    references: [users.id] }),
  booking:  one(bookings,      { fields: [visitNotes.bookingId],  references: [bookings.id] }),
}));

// ============================================================
// ACCOUNTING
// ============================================================

export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one, many }) => ({
  org:      one(organizations,  { fields: [chartOfAccounts.orgId],     references: [organizations.id] }),
  parent:   one(chartOfAccounts, { fields: [chartOfAccounts.parentId], references: [chartOfAccounts.id], relationName: "children" }),
  children: many(chartOfAccounts,                                                                         { relationName: "children" }),
  lines:    many(journalEntryLines),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  org:   one(organizations, { fields: [journalEntries.orgId], references: [organizations.id] }),
  lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  entry:   one(journalEntries,  { fields: [journalEntryLines.entryId],   references: [journalEntries.id] }),
  account: one(chartOfAccounts, { fields: [journalEntryLines.accountId], references: [chartOfAccounts.id] }),
}));

// ============================================================
// TREASURY
// ============================================================

export const treasuryAccountsRelations = relations(treasuryAccounts, ({ one, many }) => ({
  org:          one(organizations, { fields: [treasuryAccounts.orgId], references: [organizations.id] }),
  transactions: many(treasuryTransactions),
}));

export const treasuryTransactionsRelations = relations(treasuryTransactions, ({ one }) => ({
  org:     one(organizations,  { fields: [treasuryTransactions.orgId],      references: [organizations.id] }),
  account: one(treasuryAccounts, { fields: [treasuryTransactions.treasuryAccountId], references: [treasuryAccounts.id] }),
}));

// ============================================================
// RBAC
// ============================================================

export const jobTitlesRelations = relations(jobTitles, ({ one, many }) => ({
  org:     one(organizations, { fields: [jobTitles.orgId], references: [organizations.id] }),
  members: many(orgMembers),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  org:      one(organizations, { fields: [orgMembers.orgId],      references: [organizations.id] }),
  user:     one(users,         { fields: [orgMembers.userId],     references: [users.id] }),
  jobTitle: one(jobTitles,     { fields: [orgMembers.jobTitleId], references: [jobTitles.id] }),
}));

// ============================================================
// AUTOMATION
// ============================================================

export const automationRulesRelations = relations(automationRules, ({ one }) => ({
  org: one(organizations, { fields: [automationRules.orgId], references: [organizations.id] }),
}));

export const notificationTemplatesRelations = relations(notificationTemplates, ({ one }) => ({
  org: one(organizations, { fields: [notificationTemplates.orgId], references: [organizations.id] }),
}));

// ============================================================
// INTEGRATIONS
// ============================================================

export const integrationConfigsRelations = relations(integrationConfigs, ({ one }) => ({
  org: one(organizations, { fields: [integrationConfigs.orgId], references: [organizations.id] }),
}));

// ============================================================
// REMINDERS
// ============================================================

export const reminderCategoriesRelations = relations(reminderCategories, ({ one, many }) => ({
  org:       one(organizations,    { fields: [reminderCategories.orgId], references: [organizations.id] }),
  templates: many(reminderTemplates),
}));

export const reminderTemplatesRelations = relations(reminderTemplates, ({ one, many }) => ({
  org:      one(organizations,    { fields: [reminderTemplates.orgId],      references: [organizations.id] }),
  category: one(reminderCategories, { fields: [reminderTemplates.categoryId], references: [reminderCategories.id] }),
  reminders: many(orgReminders),
}));

export const orgRemindersRelations = relations(orgReminders, ({ one }) => ({
  org:      one(organizations,     { fields: [orgReminders.orgId],      references: [organizations.id] }),
  template: one(reminderTemplates, { fields: [orgReminders.templateId], references: [reminderTemplates.id] }),
}));

// ============================================================
// EVENTS & TICKETS
// ============================================================

export const eventsRelations = relations(events, ({ one, many }) => ({
  org:         one(organizations, { fields: [events.orgId],      references: [organizations.id] }),
  location:    one(locations,     { fields: [events.locationId], references: [locations.id] }),
  createdBy:   one(users,         { fields: [events.createdBy],  references: [users.id] }),
  ticketTypes: many(ticketTypes),
  sections:    many(seatSections),
  issuances:   many(ticketIssuances),
}));

export const ticketTypesRelations = relations(ticketTypes, ({ one, many }) => ({
  org:       one(organizations, { fields: [ticketTypes.orgId],    references: [organizations.id] }),
  event:     one(events,        { fields: [ticketTypes.eventId],  references: [events.id] }),
  issuances: many(ticketIssuances),
}));

export const seatSectionsRelations = relations(seatSections, ({ one, many }) => ({
  org:   one(organizations, { fields: [seatSections.orgId],    references: [organizations.id] }),
  event: one(events,        { fields: [seatSections.eventId],  references: [events.id] }),
  seats: many(seats),
}));

export const seatsRelations = relations(seats, ({ one }) => ({
  org:     one(organizations, { fields: [seats.orgId],      references: [organizations.id] }),
  event:   one(events,        { fields: [seats.eventId],    references: [events.id] }),
  section: one(seatSections,  { fields: [seats.sectionId],  references: [seatSections.id] }),
}));

export const ticketIssuancesRelations = relations(ticketIssuances, ({ one }) => ({
  org:        one(organizations, { fields: [ticketIssuances.orgId],         references: [organizations.id] }),
  event:      one(events,        { fields: [ticketIssuances.eventId],       references: [events.id] }),
  ticketType: one(ticketTypes,   { fields: [ticketIssuances.ticketTypeId],  references: [ticketTypes.id] }),
  booking:    one(bookings,      { fields: [ticketIssuances.bookingId],     references: [bookings.id] }),
  customer:   one(customers,     { fields: [ticketIssuances.customerId],    references: [customers.id] }),
  seat:       one(seats,         { fields: [ticketIssuances.seatId],        references: [seats.id] }),
  checkedInBy: one(users,        { fields: [ticketIssuances.checkedInBy],   references: [users.id] }),
}));

// ============================================================
// PROCUREMENT & SUPPLIERS
// ============================================================

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  org:            one(organizations, { fields: [suppliers.orgId],     references: [organizations.id] }),
  createdBy:      one(users,         { fields: [suppliers.createdBy], references: [users.id] }),
  purchaseOrders: many(purchaseOrders),
  invoices:       many(supplierInvoices),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  org:        one(organizations, { fields: [purchaseOrders.orgId],       references: [organizations.id] }),
  supplier:   one(suppliers,     { fields: [purchaseOrders.supplierId],  references: [suppliers.id] }),
  location:   one(locations,     { fields: [purchaseOrders.locationId],  references: [locations.id] }),
  createdBy:  one(users,         { fields: [purchaseOrders.createdBy],   references: [users.id], relationName: "po_creator" }),
  approvedBy: one(users,         { fields: [purchaseOrders.approvedBy],  references: [users.id], relationName: "po_approver" }),
  items:      many(purchaseOrderItems),
  receipts:   many(goodsReceipts),
  invoices:   many(supplierInvoices),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  po:  one(purchaseOrders, { fields: [purchaseOrderItems.poId],  references: [purchaseOrders.id] }),
  org: one(organizations,  { fields: [purchaseOrderItems.orgId], references: [organizations.id] }),
}));

export const goodsReceiptsRelations = relations(goodsReceipts, ({ one, many }) => ({
  org:        one(organizations,  { fields: [goodsReceipts.orgId],       references: [organizations.id] }),
  po:         one(purchaseOrders, { fields: [goodsReceipts.poId],        references: [purchaseOrders.id] }),
  supplier:   one(suppliers,      { fields: [goodsReceipts.supplierId],  references: [suppliers.id] }),
  location:   one(locations,      { fields: [goodsReceipts.locationId],  references: [locations.id] }),
  receivedBy: one(users,          { fields: [goodsReceipts.receivedBy],  references: [users.id], relationName: "gr_receiver" }),
  approvedBy: one(users,          { fields: [goodsReceipts.approvedBy],  references: [users.id], relationName: "gr_approver" }),
  items:      many(goodsReceiptItems),
}));

export const goodsReceiptItemsRelations = relations(goodsReceiptItems, ({ one }) => ({
  gr:     one(goodsReceipts,      { fields: [goodsReceiptItems.grId],     references: [goodsReceipts.id] }),
  poItem: one(purchaseOrderItems, { fields: [goodsReceiptItems.poItemId], references: [purchaseOrderItems.id] }),
  org:    one(organizations,      { fields: [goodsReceiptItems.orgId],    references: [organizations.id] }),
}));

export const supplierInvoicesRelations = relations(supplierInvoices, ({ one }) => ({
  org:        one(organizations,  { fields: [supplierInvoices.orgId],       references: [organizations.id] }),
  supplier:   one(suppliers,      { fields: [supplierInvoices.supplierId],  references: [suppliers.id] }),
  po:         one(purchaseOrders, { fields: [supplierInvoices.poId],        references: [purchaseOrders.id] }),
  gr:         one(goodsReceipts,  { fields: [supplierInvoices.grId],        references: [goodsReceipts.id] }),
  approvedBy: one(users,          { fields: [supplierInvoices.approvedBy],  references: [users.id] }),
}));

// ============================================================
// TEAM
// ============================================================

export const shiftsRelations = relations(shifts, ({ one }) => ({
  org:  one(organizations, { fields: [shifts.orgId],  references: [organizations.id] }),
  user: one(users,         { fields: [shifts.userId], references: [users.id] }),
}));

export const bookingTasksRelations = relations(bookingTasks, ({ one }) => ({
  org:     one(organizations, { fields: [bookingTasks.orgId],     references: [organizations.id] }),
  booking: one(bookings,      { fields: [bookingTasks.bookingId], references: [bookings.id] }),
  user:    one(users,         { fields: [bookingTasks.assignedTo], references: [users.id] }),
}));
