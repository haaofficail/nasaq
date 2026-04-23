import { pgTable, text, timestamp, boolean, pgEnum, jsonb, uuid, integer, numeric, index, date } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
import { customers } from "./customers";
// ============================================================
// ENUMS — القديمة (محافظة على الأسماء تماماً)
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
    "owners_association",
    "white_land_fee",
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
    "document_expiry",
    "construction_delay",
    "construction_budget_exceeded",
    "white_land_fee_due",
    "fal_license_expiry",
    "riyadh_freeze_warning",
    "najiz_execution_eligible",
    "compliance_missing",
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
// ENUMS — الجديدة (migration 085)
// ============================================================
export const portfolioTypeEnum = pgEnum("portfolio_type", [
    "invested",
    "land",
    "under_construction",
    "personal",
    "for_sale",
    "mixed",
]);
export const managementTypeEnum = pgEnum("management_type", [
    "self_managed",
    "office_managed",
]);
export const zoningEnum = pgEnum("zoning_type", [
    "residential",
    "commercial",
    "mixed",
    "industrial",
    "agricultural",
]);
export const rerStatusEnum = pgEnum("rer_status", [
    "not_registered",
    "pending",
    "registered",
]);
export const disposalStatusEnum = pgEnum("disposal_status", [
    "free",
    "mortgaged",
    "frozen",
    "disputed",
    "government_hold",
]);
export const buildingPermitStatusEnum = pgEnum("building_permit_status", [
    "none",
    "active",
    "expired",
    "suspended",
]);
export const assocFeeFrequencyEnum = pgEnum("assoc_fee_frequency", [
    "monthly",
    "quarterly",
    "annual",
]);
export const constructionStatusEnum = pgEnum("construction_status", [
    "design",
    "permitting",
    "foundation",
    "structure",
    "finishing",
    "handover",
    "completed",
]);
export const constructionProjectTypeEnum = pgEnum("construction_project_type", [
    "new_build",
    "renovation",
    "addition",
    "interior_fitout",
    "infrastructure",
]);
export const constructionContractTypeEnum = pgEnum("construction_contract_type", [
    "lump_sum",
    "cost_plus",
    "unit_price",
    "design_build",
]);
export const phaseStatusEnum = pgEnum("phase_status", [
    "not_started",
    "in_progress",
    "completed",
    "on_hold",
    "delayed",
]);
export const docTypeEnum = pgEnum("property_doc_type", [
    "deed",
    "permit",
    "plan",
    "contract",
    "insurance",
    "tax",
    "utility",
    "safety",
    "completion",
    "civil_defense",
    "building_code",
    "photo",
    "other",
]);
export const valuationTypeEnum = pgEnum("property_valuation_type", [
    "purchase",
    "market",
    "insurance",
    "mortgage",
    "sale",
]);
export const listingStatusEnum = pgEnum("property_listing_status", [
    "draft",
    "active",
    "rented",
    "expired",
]);
export const inquiryStatusEnum = pgEnum("property_inquiry_status", [
    "new",
    "contacted",
    "viewing_scheduled",
    "negotiating",
    "approved",
    "rejected",
    "rented",
]);
export const inquirySourceEnum = pgEnum("property_inquiry_source", [
    "walk_in",
    "phone",
    "whatsapp",
    "website",
    "referral",
]);
export const saleTypeEnum = pgEnum("property_sale_type", [
    "full_property",
    "single_unit",
]);
export const saleMethodEnum = pgEnum("property_sale_method", [
    "cash",
    "bank_mortgage",
    "installment",
    "developer_finance",
]);
export const saleStatusEnum = pgEnum("property_sale_status", [
    "listed",
    "offer_received",
    "negotiating",
    "agreed",
    "deed_transfer",
    "completed",
    "cancelled",
]);
export const managementFeeTypeEnum = pgEnum("management_fee_type", [
    "percentage",
    "fixed",
]);
// ============================================================
// PROPERTY OWNERS — ملاك العقارات (migration 085)
// ============================================================
export const propertyOwners = pgTable("property_owners", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    ownerName: text("owner_name").notNull(),
    ownerNationalId: text("owner_national_id"),
    ownerPhone: text("owner_phone"),
    ownerEmail: text("owner_email"),
    ownerIban: text("owner_iban"),
    ownerBankName: text("owner_bank_name"),
    managementFeeType: managementFeeTypeEnum("management_fee_type").default("percentage"),
    managementFeePercent: numeric("management_fee_percent", { precision: 5, scale: 2 }).default("7.5"),
    managementFeeFixed: numeric("management_fee_fixed", { precision: 12, scale: 2 }),
    contractNumber: text("contract_number"),
    contractStart: date("contract_start"),
    contractEnd: date("contract_end"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("property_owners_org_id_idx").on(table.orgId),
    index("property_owners_org_active_idx").on(table.orgId, table.isActive),
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
    // -------------------------------------------------------
    // الحقول الجديدة — migration 085
    // -------------------------------------------------------
    portfolioType: portfolioTypeEnum("portfolio_type"),
    managementType: managementTypeEnum("management_type"),
    propertyOwnerId: uuid("property_owner_id").references(() => propertyOwners.id, { onDelete: "set null" }),
    // تقييم مالي
    purchasePrice: numeric("purchase_price", { precision: 14, scale: 2 }),
    purchaseDate: date("purchase_date"),
    currentMarketValue: numeric("current_market_value", { precision: 14, scale: 2 }),
    lastValuationDate: date("last_valuation_date"),
    // بيانات الأرض والتخطيط
    plotNumber: text("plot_number"),
    planNumber: text("plan_number"),
    zoning: zoningEnum("zoning"),
    streetWidth: numeric("street_width", { precision: 6, scale: 2 }),
    numberOfStreets: integer("number_of_streets"),
    // الرخصة العقارية (فال)
    rerRegistered: boolean("rer_registered").default(false),
    rerNumber: text("rer_number"),
    rerStatus: rerStatusEnum("rer_status").default("not_registered"),
    // حالة التصرف والرهن والتجميد
    disposalStatus: disposalStatusEnum("disposal_status").default("free"),
    mortgageBank: text("mortgage_bank"),
    mortgageAmount: numeric("mortgage_amount", { precision: 14, scale: 2 }),
    mortgageEndDate: date("mortgage_end_date"),
    freezeReason: text("freeze_reason"),
    freezeDate: date("freeze_date"),
    // تراخيص البناء
    buildingPermitNumber: text("building_permit_number"),
    buildingPermitDate: date("building_permit_date"),
    buildingPermitExpiry: date("building_permit_expiry"),
    buildingPermitStatus: buildingPermitStatusEnum("building_permit_status").default("none"),
    // شهادة الإشغال والدفاع المدني
    occupancyCertificate: boolean("occupancy_certificate").default(false),
    occupancyCertificateDate: date("occupancy_certificate_date"),
    civilDefenseLicense: text("civil_defense_license"),
    civilDefenseLicenseExpiry: date("civil_defense_license_expiry"),
    // الامتثال لكود البناء
    buildingCodeCompliant: boolean("building_code_compliant").default(false),
    lastInspectionByAuthority: date("last_inspection_by_authority"),
    // الأراضي البيضاء
    whiteLandApplicable: boolean("white_land_applicable").default(false),
    whiteLandZone: text("white_land_zone"),
    whiteLandFeeRate: numeric("white_land_fee_rate", { precision: 5, scale: 2 }),
    whiteLandEstimatedAnnualFee: numeric("white_land_estimated_annual_fee", { precision: 12, scale: 2 }),
    whiteLandRegistrationNumber: text("white_land_registration_number"),
    whiteLandLastPaymentDate: date("white_land_last_payment_date"),
    whiteLandNextDueDate: date("white_land_next_due_date"),
    // اتحاد الملاك
    hasOwnersAssociation: boolean("has_owners_association").default(false),
    ownersAssociationName: text("owners_association_name"),
    ownersAssociationFee: numeric("owners_association_fee", { precision: 12, scale: 2 }),
    ownersAssociationFeeFrequency: assocFeeFrequencyEnum("owners_association_fee_frequency").default("monthly"),
    mullakRegistered: boolean("mullak_registered").default(false),
}, (table) => [
    index("properties_org_id_idx").on(table.orgId),
    index("properties_org_type_idx").on(table.orgId, table.type),
    index("properties_org_active_idx").on(table.orgId, table.isActive),
    index("properties_org_portfolio_idx").on(table.orgId, table.portfolioType),
    index("properties_org_disposal_idx").on(table.orgId, table.disposalStatus),
    index("properties_owner_id_idx").on(table.propertyOwnerId),
    index("properties_org_rer_idx").on(table.orgId, table.rerStatus),
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
    // migration 085
    riyadhFreezeApplies: boolean("riyadh_freeze_applies").default(false),
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
    // migration 085
    zatcaQrCode: text("zatca_qr_code"),
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
// ============================================================
// PROPERTY DOCUMENTS — وثائق العقار (migration 085)
// ============================================================
export const propertyDocuments = pgTable("property_documents", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
    docType: docTypeEnum("doc_type").default("other").notNull(),
    title: text("title").notNull(),
    fileUrl: text("file_url"),
    expiryDate: date("expiry_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("property_documents_org_id_idx").on(table.orgId),
    index("property_documents_property_id_idx").on(table.propertyId),
    index("property_documents_expiry_idx").on(table.orgId, table.expiryDate),
]);
// ============================================================
// PROPERTY VALUATIONS — تقييمات العقار (migration 085)
// ============================================================
export const propertyValuations = pgTable("property_valuations", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
    valuationDate: date("valuation_date").notNull(),
    valuationType: valuationTypeEnum("valuation_type").default("market").notNull(),
    valuedBy: text("valued_by"),
    valuationAmount: numeric("valuation_amount", { precision: 14, scale: 2 }).notNull(),
    notes: text("notes"),
    reportUrl: text("report_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("property_valuations_org_id_idx").on(table.orgId),
    index("property_valuations_property_id_idx").on(table.propertyId),
]);
// ============================================================
// PROPERTY CONSTRUCTION — مشاريع البناء (migration 085)
// ============================================================
export const propertyConstruction = pgTable("property_construction", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
    projectName: text("project_name").notNull(),
    projectType: constructionProjectTypeEnum("project_type").default("new_build").notNull(),
    contractorName: text("contractor_name"),
    contractorPhone: text("contractor_phone"),
    architectName: text("architect_name"),
    supervisorName: text("supervisor_name"),
    buildingPermitNumber: text("building_permit_number"),
    permitDate: date("permit_date"),
    permitExpiry: date("permit_expiry"),
    contractType: constructionContractTypeEnum("contract_type").default("lump_sum"),
    contractAmount: numeric("contract_amount", { precision: 14, scale: 2 }),
    totalBudget: numeric("total_budget", { precision: 14, scale: 2 }),
    actualSpentToDate: numeric("actual_spent_to_date", { precision: 14, scale: 2 }).default("0"),
    retentionPercentage: numeric("retention_percentage", { precision: 5, scale: 2 }).default("10"),
    retentionAmount: numeric("retention_amount", { precision: 14, scale: 2 }).default("0"),
    retentionReleaseDate: date("retention_release_date"),
    estimatedCompletionDate: date("estimated_completion_date"),
    actualCompletionDate: date("actual_completion_date"),
    warrantyEndDate: date("warranty_end_date"),
    penaltyPerDay: numeric("penalty_per_day", { precision: 10, scale: 2 }),
    accumulatedPenalty: numeric("accumulated_penalty", { precision: 12, scale: 2 }).default("0"),
    overallProgress: integer("overall_progress").default(0),
    status: constructionStatusEnum("status").default("design").notNull(),
    notes: text("notes"),
    attachments: jsonb("attachments"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("property_construction_org_id_idx").on(table.orgId),
    index("property_construction_property_idx").on(table.propertyId),
    index("property_construction_status_idx").on(table.orgId, table.status),
]);
// ============================================================
// CONSTRUCTION PHASES — مراحل البناء (migration 085)
// ============================================================
export const constructionPhases = pgTable("construction_phases", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    constructionId: uuid("construction_id").notNull().references(() => propertyConstruction.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    orderIndex: integer("order_index").default(0).notNull(),
    status: phaseStatusEnum("status").default("not_started").notNull(),
    plannedStartDate: date("planned_start_date"),
    plannedEndDate: date("planned_end_date"),
    actualStartDate: date("actual_start_date"),
    actualEndDate: date("actual_end_date"),
    progress: integer("progress").default(0),
    estimatedCost: numeric("estimated_cost", { precision: 14, scale: 2 }),
    actualCost: numeric("actual_cost", { precision: 14, scale: 2 }).default("0"),
    dependsOn: uuid("depends_on"),
    description: text("description"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("construction_phases_org_id_idx").on(table.orgId),
    index("construction_phases_const_id_idx").on(table.constructionId),
]);
// ============================================================
// CONSTRUCTION DAILY LOGS — السجلات اليومية (migration 085)
// ============================================================
export const constructionDailyLogs = pgTable("construction_daily_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    constructionId: uuid("construction_id").notNull().references(() => propertyConstruction.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    weather: text("weather"),
    temperature: integer("temperature"),
    workersCount: integer("workers_count").default(0),
    supervisorPresent: boolean("supervisor_present").default(false),
    workDescription: text("work_description"),
    materialsReceived: jsonb("materials_received"),
    equipmentOnSite: jsonb("equipment_on_site"),
    issues: text("issues"),
    safetyIncidents: text("safety_incidents"),
    visitorLog: jsonb("visitor_log"),
    photos: jsonb("photos"),
    loggedBy: text("logged_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("construction_logs_org_id_idx").on(table.orgId),
    index("construction_logs_const_id_idx").on(table.constructionId),
    index("construction_logs_date_idx").on(table.constructionId, table.logDate),
]);
// ============================================================
// CONSTRUCTION COSTS — تكاليف البناء (migration 085)
// ============================================================
export const constructionCosts = pgTable("construction_costs", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    constructionId: uuid("construction_id").notNull().references(() => propertyConstruction.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id").references(() => constructionPhases.id, { onDelete: "set null" }),
    costDate: date("cost_date").notNull(),
    category: text("category").default("materials").notNull(),
    description: text("description").notNull(),
    vendor: text("vendor"),
    vendorPhone: text("vendor_phone"),
    quantity: numeric("quantity", { precision: 12, scale: 2 }),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).default("0"),
    paymentStatus: text("payment_status").default("pending"),
    paymentMethod: text("payment_method"),
    chequeNumber: text("cheque_number"),
    invoiceNumber: text("invoice_number"),
    receiptUrl: text("receipt_url"),
    approvedBy: text("approved_by"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("construction_costs_org_id_idx").on(table.orgId),
    index("construction_costs_const_id_idx").on(table.constructionId),
    index("construction_costs_phase_id_idx").on(table.phaseId),
]);
// ============================================================
// CONSTRUCTION PAYMENTS — دفعات المقاول (migration 085)
// ============================================================
export const constructionPayments = pgTable("construction_payments", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    constructionId: uuid("construction_id").notNull().references(() => propertyConstruction.id, { onDelete: "cascade" }),
    paymentNumber: integer("payment_number").default(1).notNull(),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    completionPercentage: integer("completion_percentage"),
    grossAmount: numeric("gross_amount", { precision: 14, scale: 2 }).notNull(),
    retentionDeducted: numeric("retention_deducted", { precision: 12, scale: 2 }).default("0"),
    previousPayments: numeric("previous_payments", { precision: 14, scale: 2 }).default("0"),
    netPayable: numeric("net_payable", { precision: 14, scale: 2 }).notNull(),
    status: text("status").default("draft").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    attachments: jsonb("attachments"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("construction_payments_org_id_idx").on(table.orgId),
    index("construction_payments_const_id_idx").on(table.constructionId),
]);
// ============================================================
// CONSTRUCTION CHANGE ORDERS — أوامر التغيير (migration 085)
// ============================================================
export const constructionChangeOrders = pgTable("construction_change_orders", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    constructionId: uuid("construction_id").notNull().references(() => propertyConstruction.id, { onDelete: "cascade" }),
    changeOrderNumber: text("change_order_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    reason: text("reason").default("owner_request"),
    requestedBy: text("requested_by").default("owner"),
    costImpact: numeric("cost_impact", { precision: 12, scale: 2 }).default("0"),
    timeImpact: integer("time_impact").default(0),
    status: text("status").default("proposed").notNull(),
    proposedAt: timestamp("proposed_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),
    attachments: jsonb("attachments"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("construction_co_org_id_idx").on(table.orgId),
    index("construction_co_const_id_idx").on(table.constructionId),
]);
// ============================================================
// PROPERTY LISTINGS — إعلانات الإيجار (migration 085)
// ============================================================
export const propertyListings = pgTable("property_listings", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").references(() => propertyUnits.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    photos: jsonb("photos"),
    advertisedRent: numeric("advertised_rent", { precision: 12, scale: 2 }),
    features: jsonb("features"),
    status: listingStatusEnum("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    views: integer("views").default(0),
    inquiriesCount: integer("inquiries_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("property_listings_org_id_idx").on(table.orgId),
    index("property_listings_unit_id_idx").on(table.unitId),
    index("property_listings_status_idx").on(table.orgId, table.status),
]);
// ============================================================
// PROPERTY INQUIRIES — استفسارات المستأجرين (migration 085)
// ============================================================
export const propertyInquiries = pgTable("property_inquiries", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").references(() => propertyListings.id, { onDelete: "set null" }),
    inquirerName: text("inquirer_name").notNull(),
    inquirerPhone: text("inquirer_phone").notNull(),
    inquirerNationalId: text("inquirer_national_id"),
    source: inquirySourceEnum("source").default("phone"),
    status: inquiryStatusEnum("status").default("new").notNull(),
    scheduledViewingDate: date("scheduled_viewing_date"),
    viewingNotes: text("viewing_notes"),
    offeredRent: numeric("offered_rent", { precision: 12, scale: 2 }),
    assignedTo: text("assigned_to"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("property_inquiries_org_id_idx").on(table.orgId),
    index("property_inquiries_listing_id_idx").on(table.listingId),
    index("property_inquiries_status_idx").on(table.orgId, table.status),
]);
// ============================================================
// PROPERTY SALES — صفقات البيع (migration 085)
// ============================================================
export const propertySales = pgTable("property_sales", {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
    unitId: uuid("unit_id").references(() => propertyUnits.id, { onDelete: "set null" }),
    saleType: saleTypeEnum("sale_type").default("full_property").notNull(),
    buyerName: text("buyer_name").notNull(),
    buyerNationalId: text("buyer_national_id"),
    buyerPhone: text("buyer_phone"),
    saleMethod: saleMethodEnum("sale_method").default("cash"),
    salePrice: numeric("sale_price", { precision: 14, scale: 2 }).notNull(),
    depositPaid: numeric("deposit_paid", { precision: 12, scale: 2 }).default("0"),
    mortgageBank: text("mortgage_bank"),
    mortgageApprovalNumber: text("mortgage_approval_number"),
    installmentPlan: jsonb("installment_plan"),
    commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 }).default("2.5"),
    commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }),
    deedTransferDate: date("deed_transfer_date"),
    deedTransferNumber: text("deed_transfer_number"),
    status: saleStatusEnum("status").default("listed").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("property_sales_org_id_idx").on(table.orgId),
    index("property_sales_property_id_idx").on(table.propertyId),
    index("property_sales_status_idx").on(table.orgId, table.status),
]);
//# sourceMappingURL=property.js.map