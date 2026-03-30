import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, uniqueIndex, index, date } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
import { customers } from "./customers";

// ============================================================
// ENUMS
// ============================================================

export const propertyTypeEnum = pgEnum("property_type", [
  "residential",
  "commercial",
  "mixed",
  "land",
  "industrial",
]);

export const unitTypeEnum = pgEnum("unit_type", [
  "apartment",
  "office",
  "shop",
  "warehouse",
  "studio",
  "parking",
  "room",
  "villa",
  "duplex",
  "penthouse",
]);

export const unitStatusEnum = pgEnum("unit_status", [
  "vacant",
  "occupied",
  "reserved",
  "maintenance",
  "under_renovation",
  "sold",
]);

export const furnishingEnum = pgEnum("furnishing_type", [
  "unfurnished",
  "semi_furnished",
  "fully_furnished",
]);

export const contractTypeEnum = pgEnum("lease_contract_type", [
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "custom",
]);

export const paymentFrequencyEnum = pgEnum("lease_payment_frequency", [
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
]);

export const depositStatusEnum = pgEnum("deposit_status", [
  "pending",
  "paid",
  "partial",
  "returned",
  "deducted",
]);

export const ejarStatusEnum = pgEnum("ejar_status", [
  "not_submitted",
  "pending",
  "documented",
  "rejected",
  "expired",
]);

export const leaseContractStatusEnum = pgEnum("lease_contract_status", [
  "draft",
  "pending_signature",
  "active",
  "expired",
  "terminated",
  "renewed",
  "suspended",
]);

export const leaseInvoiceStatusEnum = pgEnum("lease_invoice_status", [
  "draft",
  "pending",
  "sent",
  "paid",
  "partial",
  "overdue",
  "cancelled",
  "refunded",
]);

export const leasePaymentMethodEnum = pgEnum("lease_payment_method", [
  "cash",
  "bank_transfer",
  "cheque",
  "ejar_sadad",
  "mada",
  "visa",
  "apple_pay",
  "stc_pay",
  "tabby",
  "tamara",
  "other",
]);

export const paymentSourceEnum = pgEnum("lease_payment_source", [
  "direct",
  "via_ejar",
  "online_portal",
]);

export const propExpenseCategoryEnum = pgEnum("property_expense_category", [
  "maintenance",
  "insurance",
  "government_fees",
  "municipality",
  "utilities",
  "management_fee",
  "marketing",
  "legal",
  "renovation",
  "cleaning",
  "security",
  "elevator",
  "garden",
  "other",
]);

export const maintenanceCategoryEnum = pgEnum("property_maintenance_category", [
  "plumbing",
  "electrical",
  "ac_heating",
  "painting",
  "carpentry",
  "structural",
  "appliance",
  "pest_control",
  "elevator",
  "parking",
  "roof_leak",
  "water_heater",
  "intercom",
  "general",
]);

export const maintenancePriorityEnum = pgEnum("property_maintenance_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const maintenanceStatusEnum = pgEnum("property_maintenance_status", [
  "reported",
  "reviewed",
  "quoted",
  "approved",
  "assigned",
  "in_progress",
  "completed",
  "verified",
  "cancelled",
]);

export const propInspectionTypeEnum = pgEnum("property_inspection_type", [
  "move_in",
  "move_out",
  "periodic",
  "pre_renovation",
  "post_renovation",
]);

export const inspectionRatingEnum = pgEnum("inspection_overall_rating", [
  "excellent",
  "good",
  "fair",
  "poor",
]);

export const reporterTypeEnum = pgEnum("maintenance_reporter_type", [
  "tenant",
  "manager",
  "inspector",
  "owner",
]);

export const reminderTypeEnum = pgEnum("lease_reminder_type", [
  "invoice_upcoming",
  "invoice_overdue",
  "contract_expiring",
  "contract_renewal",
  "maintenance_scheduled",
  "inspection_due",
  "ejar_not_documented",
  "deposit_return",
  "custom",
]);

export const reminderChannelEnum = pgEnum("lease_reminder_channel", [
  "whatsapp",
  "sms",
  "email",
  "system",
]);

export const reminderStatusEnum = pgEnum("lease_reminder_status", [
  "pending",
  "sent",
  "delivered",
  "failed",
  "cancelled",
]);

// ============================================================
// PROPERTIES — العقارات
// ============================================================

export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  type: propertyTypeEnum("type").default("residential").notNull(),
  address: text("address"),
  city: text("city"),
  district: text("district"),
  postalCode: text("postal_code"),
  locationLat: numeric("location_lat", { precision: 10, scale: 7 }),
  locationLng: numeric("location_lng", { precision: 10, scale: 7 }),

  totalUnits: integer("total_units").default(0),
  totalFloors: integer("total_floors"),
  buildYear: integer("build_year"),
  plotAreaSqm: numeric("plot_area_sqm", { precision: 12, scale: 2 }),
  builtAreaSqm: numeric("built_area_sqm", { precision: 12, scale: 2 }),

  licenseNumber: text("license_number"),
  deedNumber: text("deed_number"),
  ownerName: text("owner_name"),
  ownerNationalId: text("owner_national_id"),

  coverImageUrl: text("cover_image_url"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("properties_org_id_idx").on(table.orgId),
  index("properties_org_type_idx").on(table.orgId, table.type),
  index("properties_org_active_idx").on(table.orgId, table.isActive),
]);

// ============================================================
// PROPERTY UNITS — وحدات العقار
// ============================================================

export const propertyUnits = pgTable("property_units", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),

  unitNumber: text("unit_number").notNull(),
  floor: integer("floor"),
  type: unitTypeEnum("type").default("apartment").notNull(),
  areaSqm: numeric("area_sqm", { precision: 10, scale: 2 }),

  bedrooms: integer("bedrooms").default(0),
  bathrooms: integer("bathrooms").default(0),
  livingRooms: integer("living_rooms").default(0),
  hasBalcony: boolean("has_balcony").default(false),
  hasKitchen: boolean("has_kitchen").default(false),
  hasMaidRoom: boolean("has_maid_room").default(false),
  hasPool: boolean("has_pool").default(false),

  monthlyRent: numeric("monthly_rent", { precision: 12, scale: 2 }),
  yearlyRent: numeric("yearly_rent", { precision: 12, scale: 2 }),
  depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }),

  electricityMeter: text("electricity_meter"),
  waterMeter: text("water_meter"),
  gasMeter: text("gas_meter"),

  status: unitStatusEnum("status").default("vacant").notNull(),
  furnishing: furnishingEnum("furnishing").default("unfurnished"),
  amenities: jsonb("amenities"),
  photos: jsonb("photos"),
  lastInspectionDate: date("last_inspection_date"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("property_units_org_id_idx").on(table.orgId),
  index("property_units_property_id_idx").on(table.propertyId),
  index("property_units_org_status_idx").on(table.orgId, table.status),
]);

// ============================================================
// TENANTS — المستأجرون
// ============================================================

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),

  nationalId: text("national_id"),
  iqamaNumber: text("iqama_number"),
  nationality: text("nationality"),
  passportNumber: text("passport_number"),
  companyName: text("company_name"),
  commercialRegistration: text("commercial_registration"),
  vatNumber: text("vat_number"),

  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyRelation: text("emergency_relation"),

  bankName: text("bank_name"),
  iban: text("iban"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("tenants_org_id_idx").on(table.orgId),
  index("tenants_org_customer_idx").on(table.orgId, table.customerId),
]);

// ============================================================
// LEASE CONTRACTS — عقود الإيجار
// ============================================================

export const leaseContracts = pgTable("lease_contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),

  contractNumber: text("contract_number").notNull(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  unitId: uuid("unit_id").references(() => propertyUnits.id, { onDelete: "set null" }),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),

  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  contractType: contractTypeEnum("contract_type").default("annual").notNull(),
  rentAmount: numeric("rent_amount", { precision: 12, scale: 2 }).notNull(),
  paymentFrequency: paymentFrequencyEnum("payment_frequency").default("monthly").notNull(),

  depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }).default("0"),
  depositStatus: depositStatusEnum("deposit_status").default("pending"),
  depositReturnedAmount: numeric("deposit_returned_amount", { precision: 12, scale: 2 }),
  depositDeductionReason: text("deposit_deduction_reason"),

  includesElectricity: boolean("includes_electricity").default(false),
  includesWater: boolean("includes_water").default(false),
  includesAC: boolean("includes_ac").default(false),
  includesInternet: boolean("includes_internet").default(false),
  includesParking: boolean("includes_parking").default(false),
  parkingSpots: integer("parking_spots").default(0),

  ejarContractNumber: text("ejar_contract_number"),
  ejarStatus: ejarStatusEnum("ejar_status").default("not_submitted"),
  ejarDocumentedAt: timestamp("ejar_documented_at", { withTimezone: true }),
  ejarExpiresAt: timestamp("ejar_expires_at", { withTimezone: true }),
  ejarNotes: text("ejar_notes"),

  autoRenew: boolean("auto_renew").default(true),
  renewalNoticeDays: integer("renewal_notice_days").default(60),
  renewedFromId: uuid("renewed_from_id"),
  renewalRentIncrease: numeric("renewal_rent_increase", { precision: 5, scale: 2 }).default("0"),

  status: leaseContractStatusEnum("status").default("draft").notNull(),
  terminationReason: text("termination_reason"),
  terminationDate: date("termination_date"),
  terminatedBy: text("terminated_by"),

  attachments: jsonb("attachments"),
  internalNotes: text("internal_notes"),

  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("lease_contracts_org_id_idx").on(table.orgId),
  index("lease_contracts_org_status_idx").on(table.orgId, table.status),
  index("lease_contracts_unit_id_idx").on(table.unitId),
  index("lease_contracts_tenant_id_idx").on(table.tenantId),
  index("lease_contracts_org_ejar_idx").on(table.orgId, table.ejarStatus),
]);

// ============================================================
// LEASE INVOICES — فواتير الإيجار
// ============================================================

export const leaseInvoices = pgTable("lease_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  contractId: uuid("contract_id").notNull().references(() => leaseContracts.id, { onDelete: "cascade" }),

  invoiceNumber: text("invoice_number").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  periodLabel: text("period_label"),

  rentAmount: numeric("rent_amount", { precision: 12, scale: 2 }).notNull(),
  serviceCharge: numeric("service_charge", { precision: 12, scale: 2 }).default("0"),
  parkingFee: numeric("parking_fee", { precision: 12, scale: 2 }).default("0"),
  otherCharges: numeric("other_charges", { precision: 12, scale: 2 }).default("0"),
  otherChargesDescription: text("other_charges_description"),

  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("0"),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),

  status: leaseInvoiceStatusEnum("status").default("draft").notNull(),
  dueDate: date("due_date").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).default("0"),

  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  overdueNoticeSentAt: timestamp("overdue_notice_sent_at", { withTimezone: true }),
  secondReminderSentAt: timestamp("second_reminder_sent_at", { withTimezone: true }),

  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("lease_invoices_org_id_idx").on(table.orgId),
  index("lease_invoices_contract_id_idx").on(table.contractId),
  index("lease_invoices_org_status_idx").on(table.orgId, table.status),
  index("lease_invoices_org_due_date_idx").on(table.orgId, table.dueDate),
]);

// ============================================================
// LEASE PAYMENTS — مدفوعات الإيجار
// ============================================================

export const leasePayments = pgTable("lease_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").references(() => leaseInvoices.id, { onDelete: "set null" }),
  contractId: uuid("contract_id").notNull().references(() => leaseContracts.id, { onDelete: "cascade" }),

  receiptNumber: text("receipt_number").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: leasePaymentMethodEnum("method").default("cash").notNull(),
  paymentSource: paymentSourceEnum("payment_source").default("direct"),

  chequeNumber: text("cheque_number"),
  chequeDate: date("cheque_date"),
  bankName: text("bank_name"),
  transferReference: text("transfer_reference"),
  gatewayTransactionId: text("gateway_transaction_id"),

  paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
  receivedBy: text("received_by"),
  approvedBy: text("approved_by"),
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
  isReconciled: boolean("is_reconciled").default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("lease_payments_org_id_idx").on(table.orgId),
  index("lease_payments_contract_id_idx").on(table.contractId),
  index("lease_payments_invoice_id_idx").on(table.invoiceId),
]);

// ============================================================
// PROPERTY EXPENSES — مصروفات العقار
// ============================================================

export const propertyExpenses = pgTable("property_expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  unitId: uuid("unit_id").references(() => propertyUnits.id, { onDelete: "set null" }),
  contractId: uuid("contract_id").references(() => leaseContracts.id, { onDelete: "set null" }),

  expenseNumber: text("expense_number").notNull(),
  category: propExpenseCategoryEnum("category").default("maintenance").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).default("0"),

  paidTo: text("paid_to"),
  paidToPhone: text("paid_to_phone"),
  paidAt: date("paid_at"),
  paymentMethod: text("payment_method"),
  receiptUrl: text("receipt_url"),

  chargeToOwner: boolean("charge_to_owner").default(true),
  chargeToTenant: boolean("charge_to_tenant").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: text("recurring_frequency"),
  approvedBy: text("approved_by"),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("property_expenses_org_id_idx").on(table.orgId),
  index("property_expenses_property_id_idx").on(table.propertyId),
  index("property_expenses_org_category_idx").on(table.orgId, table.category),
]);

// ============================================================
// PROPERTY MAINTENANCE — طلبات الصيانة
// ============================================================

export const propertyMaintenance = pgTable("property_maintenance", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  unitId: uuid("unit_id").references(() => propertyUnits.id, { onDelete: "set null" }),
  contractId: uuid("contract_id").references(() => leaseContracts.id, { onDelete: "set null" }),

  ticketNumber: text("ticket_number").notNull(),
  reportedBy: reporterTypeEnum("reported_by").default("tenant"),
  reporterName: text("reporter_name"),
  reporterPhone: text("reporter_phone"),

  category: maintenanceCategoryEnum("category").default("general").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  photos: jsonb("photos"),
  priority: maintenancePriorityEnum("priority").default("normal").notNull(),
  status: maintenanceStatusEnum("status").default("reported").notNull(),

  assignedTo: text("assigned_to"),
  assignedCompany: text("assigned_company"),
  assignedPhone: text("assigned_phone"),

  estimatedCost: numeric("estimated_cost", { precision: 12, scale: 2 }),
  quotedCost: numeric("quoted_cost", { precision: 12, scale: 2 }),
  approvedCost: numeric("approved_cost", { precision: 12, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 12, scale: 2 }),

  scheduledDate: date("scheduled_date"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completionPhotos: jsonb("completion_photos"),

  tenantRating: integer("tenant_rating"),
  tenantFeedback: text("tenant_feedback"),
  warrantyDays: integer("warranty_days"),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("property_maintenance_org_id_idx").on(table.orgId),
  index("property_maintenance_property_id_idx").on(table.propertyId),
  index("property_maintenance_org_status_idx").on(table.orgId, table.status),
  index("property_maintenance_org_priority_idx").on(table.orgId, table.priority),
]);

// ============================================================
// PROPERTY INSPECTIONS — معاينات العقار
// ============================================================

export const propertyInspections = pgTable("property_inspections", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  unitId: uuid("unit_id").references(() => propertyUnits.id, { onDelete: "set null" }),
  contractId: uuid("contract_id").references(() => leaseContracts.id, { onDelete: "set null" }),

  type: propInspectionTypeEnum("type").default("periodic").notNull(),
  inspectionDate: date("inspection_date").notNull(),
  inspectedBy: text("inspected_by"),
  condition: jsonb("condition"),
  overallRating: inspectionRatingEnum("overall_rating"),
  generalNotes: text("general_notes"),
  photos: jsonb("photos"),
  tenantSignature: text("tenant_signature"),
  managerSignature: text("manager_signature"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("property_inspections_org_id_idx").on(table.orgId),
  index("property_inspections_unit_id_idx").on(table.unitId),
  index("property_inspections_contract_id_idx").on(table.contractId),
]);

// ============================================================
// LEASE REMINDERS — تذكيرات عقود الإيجار
// ============================================================

export const leaseReminders = pgTable("lease_reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  contractId: uuid("contract_id").references(() => leaseContracts.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").references(() => leaseInvoices.id, { onDelete: "set null" }),

  reminderType: reminderTypeEnum("reminder_type").notNull(),
  channel: reminderChannelEnum("channel").default("whatsapp"),
  recipient: text("recipient"),
  recipientPhone: text("recipient_phone"),
  recipientEmail: text("recipient_email"),
  message: text("message"),

  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  status: reminderStatusEnum("status").default("pending").notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("lease_reminders_org_id_idx").on(table.orgId),
  index("lease_reminders_contract_id_idx").on(table.contractId),
  index("lease_reminders_org_status_idx").on(table.orgId, table.status),
]);
