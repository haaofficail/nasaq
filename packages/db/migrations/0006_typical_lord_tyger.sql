CREATE TYPE "public"."budget_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."cost_center_type" AS ENUM('branch', 'department', 'project', 'property', 'vehicle', 'employee');--> statement-breakpoint
CREATE TYPE "public"."depreciation_method" AS ENUM('straight_line', 'declining_balance', 'units_of_production');--> statement-breakpoint
CREATE TYPE "public"."fixed_asset_category" AS ENUM('land', 'building', 'vehicle', 'furniture', 'equipment', 'computer', 'machinery', 'other');--> statement-breakpoint
CREATE TYPE "public"."fixed_asset_status" AS ENUM('active', 'disposed', 'sold', 'fully_depreciated', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."purchase_invoice_status" AS ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'sent', 'confirmed', 'partial_received', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."purchase_payment_method" AS ENUM('cash', 'bank_transfer', 'cheque');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."event_execution_task_status" AS ENUM('pending', 'in_progress', 'done', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."event_quotation_status" AS ENUM('draft', 'sent', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."payment_tx_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."assoc_fee_frequency" AS ENUM('monthly', 'quarterly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."building_permit_status" AS ENUM('none', 'active', 'expired', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."construction_contract_type" AS ENUM('lump_sum', 'cost_plus', 'unit_price', 'design_build');--> statement-breakpoint
CREATE TYPE "public"."construction_project_type" AS ENUM('new_build', 'renovation', 'addition', 'interior_fitout', 'infrastructure');--> statement-breakpoint
CREATE TYPE "public"."construction_status" AS ENUM('design', 'permitting', 'foundation', 'structure', 'finishing', 'handover', 'completed');--> statement-breakpoint
CREATE TYPE "public"."lease_contract_type" AS ENUM('monthly', 'quarterly', 'semi_annual', 'annual', 'custom');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('pending', 'paid', 'partial', 'returned', 'deducted');--> statement-breakpoint
CREATE TYPE "public"."disposal_status" AS ENUM('free', 'mortgaged', 'frozen', 'disputed', 'government_hold');--> statement-breakpoint
CREATE TYPE "public"."property_doc_type" AS ENUM('deed', 'permit', 'plan', 'contract', 'insurance', 'tax', 'utility', 'safety', 'completion', 'civil_defense', 'building_code', 'photo', 'other');--> statement-breakpoint
CREATE TYPE "public"."ejar_status" AS ENUM('not_submitted', 'pending', 'documented', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."furnishing_type" AS ENUM('unfurnished', 'semi_furnished', 'fully_furnished');--> statement-breakpoint
CREATE TYPE "public"."property_inquiry_source" AS ENUM('walk_in', 'phone', 'whatsapp', 'website', 'referral');--> statement-breakpoint
CREATE TYPE "public"."property_inquiry_status" AS ENUM('new', 'contacted', 'viewing_scheduled', 'negotiating', 'approved', 'rejected', 'rented');--> statement-breakpoint
CREATE TYPE "public"."inspection_overall_rating" AS ENUM('excellent', 'good', 'fair', 'poor');--> statement-breakpoint
CREATE TYPE "public"."lease_contract_status" AS ENUM('draft', 'pending_signature', 'active', 'expired', 'terminated', 'renewed', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."lease_invoice_status" AS ENUM('draft', 'pending', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."lease_payment_method" AS ENUM('cash', 'bank_transfer', 'cheque', 'ejar_sadad', 'mada', 'visa', 'apple_pay', 'stc_pay', 'tabby', 'tamara', 'other');--> statement-breakpoint
CREATE TYPE "public"."property_listing_status" AS ENUM('draft', 'active', 'rented', 'expired');--> statement-breakpoint
CREATE TYPE "public"."property_maintenance_category" AS ENUM('plumbing', 'electrical', 'ac_heating', 'painting', 'carpentry', 'structural', 'appliance', 'pest_control', 'elevator', 'parking', 'roof_leak', 'water_heater', 'intercom', 'general');--> statement-breakpoint
CREATE TYPE "public"."property_maintenance_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."property_maintenance_status" AS ENUM('reported', 'reviewed', 'quoted', 'approved', 'assigned', 'in_progress', 'completed', 'verified', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."management_fee_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."management_type" AS ENUM('self_managed', 'office_managed');--> statement-breakpoint
CREATE TYPE "public"."lease_payment_frequency" AS ENUM('monthly', 'quarterly', 'semi_annual', 'annual');--> statement-breakpoint
CREATE TYPE "public"."lease_payment_source" AS ENUM('direct', 'via_ejar', 'online_portal');--> statement-breakpoint
CREATE TYPE "public"."phase_status" AS ENUM('not_started', 'in_progress', 'completed', 'on_hold', 'delayed');--> statement-breakpoint
CREATE TYPE "public"."portfolio_type" AS ENUM('invested', 'land', 'under_construction', 'personal', 'for_sale', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."property_expense_category" AS ENUM('maintenance', 'insurance', 'government_fees', 'municipality', 'utilities', 'management_fee', 'marketing', 'legal', 'renovation', 'cleaning', 'security', 'elevator', 'garden', 'other', 'owners_association', 'white_land_fee');--> statement-breakpoint
CREATE TYPE "public"."property_inspection_type" AS ENUM('move_in', 'move_out', 'periodic', 'pre_renovation', 'post_renovation');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('residential', 'commercial', 'mixed', 'land', 'industrial');--> statement-breakpoint
CREATE TYPE "public"."lease_reminder_channel" AS ENUM('whatsapp', 'sms', 'email', 'system');--> statement-breakpoint
CREATE TYPE "public"."lease_reminder_status" AS ENUM('pending', 'sent', 'delivered', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lease_reminder_type" AS ENUM('invoice_upcoming', 'invoice_overdue', 'contract_expiring', 'contract_renewal', 'maintenance_scheduled', 'inspection_due', 'ejar_not_documented', 'deposit_return', 'custom', 'document_expiry', 'construction_delay', 'construction_budget_exceeded', 'white_land_fee_due', 'fal_license_expiry', 'riyadh_freeze_warning', 'najiz_execution_eligible', 'compliance_missing');--> statement-breakpoint
CREATE TYPE "public"."maintenance_reporter_type" AS ENUM('tenant', 'manager', 'inspector', 'owner');--> statement-breakpoint
CREATE TYPE "public"."rer_status" AS ENUM('not_registered', 'pending', 'registered');--> statement-breakpoint
CREATE TYPE "public"."property_sale_method" AS ENUM('cash', 'bank_mortgage', 'installment', 'developer_finance');--> statement-breakpoint
CREATE TYPE "public"."property_sale_status" AS ENUM('listed', 'offer_received', 'negotiating', 'agreed', 'deed_transfer', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."property_sale_type" AS ENUM('full_property', 'single_unit');--> statement-breakpoint
CREATE TYPE "public"."unit_status" AS ENUM('vacant', 'occupied', 'reserved', 'maintenance', 'under_renovation', 'sold');--> statement-breakpoint
CREATE TYPE "public"."unit_type" AS ENUM('apartment', 'office', 'shop', 'warehouse', 'studio', 'parking', 'room', 'villa', 'duplex', 'penthouse');--> statement-breakpoint
CREATE TYPE "public"."property_valuation_type" AS ENUM('purchase', 'market', 'insurance', 'mortgage', 'sale');--> statement-breakpoint
CREATE TYPE "public"."zoning_type" AS ENUM('residential', 'commercial', 'mixed', 'industrial', 'agricultural');--> statement-breakpoint
CREATE TYPE "public"."privacy_request_status" AS ENUM('pending', 'processing', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."privacy_request_type" AS ENUM('export', 'delete');--> statement-breakpoint
CREATE TYPE "public"."security_incident_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
ALTER TYPE "public"."school_session_type" ADD VALUE 'ramadan';--> statement-breakpoint
CREATE TABLE "asset_depreciation_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"journal_entry_id" uuid,
	"depreciation_date" date NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"bank_account_id" uuid,
	"transaction_date" date NOT NULL,
	"value_date" date,
	"description" text NOT NULL,
	"reference" text,
	"debit_amount" numeric(15, 2) DEFAULT '0',
	"credit_amount" numeric(15, 2) DEFAULT '0',
	"balance" numeric(15, 2),
	"is_reconciled" boolean DEFAULT false NOT NULL,
	"reconciled_with_id" uuid,
	"import_batch" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"budget_id" uuid NOT NULL,
	"account_id" uuid,
	"cost_center_id" uuid,
	"month" date NOT NULL,
	"budget_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"actual_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"variance_percent" numeric(8, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" "budget_status" DEFAULT 'draft',
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"parent_id" uuid,
	"type" "cost_center_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"asset_code" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"category" "fixed_asset_category" NOT NULL,
	"account_id" uuid,
	"depreciation_account_id" uuid,
	"expense_account_id" uuid,
	"cost_center_id" uuid,
	"purchase_date" date,
	"purchase_price" numeric(15, 2),
	"purchase_invoice" text,
	"vendor_name" text,
	"warranty_end_date" date,
	"useful_life_months" integer,
	"salvage_value" numeric(15, 2) DEFAULT '0',
	"depreciation_method" "depreciation_method" DEFAULT 'straight_line',
	"monthly_depreciation" numeric(15, 2) DEFAULT '0',
	"accumulated_depreciation" numeric(15, 2) DEFAULT '0',
	"net_book_value" numeric(15, 2) DEFAULT '0',
	"status" "fixed_asset_status" DEFAULT 'active',
	"disposal_date" date,
	"disposal_price" numeric(15, 2),
	"disposal_reason" text,
	"location" text,
	"assigned_to" text,
	"serial_number" text,
	"barcode" text,
	"photos" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"vendor_id" uuid,
	"po_id" uuid,
	"invoice_date" date NOT NULL,
	"due_date" date,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"vat_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" "purchase_invoice_status" DEFAULT 'pending',
	"zatca_qr_code" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"invoice_id" uuid,
	"vendor_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"method" "purchase_payment_method" DEFAULT 'bank_transfer',
	"cheque_number" text,
	"bank_reference" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" text,
	"notes" text,
	"journal_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"phone" text,
	"email" text,
	"vat_number" text,
	"commercial_registration" text,
	"bank_name" text,
	"iban" text,
	"address" text,
	"city" text,
	"category" text,
	"rating" integer,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_galleries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"token" text NOT NULL,
	"asset_ids" text[] DEFAULT '{}' NOT NULL,
	"client_name" text,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_galleries_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "plan_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_code" varchar(20) NOT NULL,
	"capability_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salon_monitoring_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"booking_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_constraints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"max_discount_pct" numeric(5, 2),
	"max_void_count" integer,
	"require_approval_above" numeric(10, 2),
	"can_create_invoice" boolean,
	"can_void_invoice" boolean,
	"can_give_discount" boolean,
	"can_access_reports" boolean,
	"can_export_data" boolean,
	"can_manage_team" boolean,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_wa_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"org_id" uuid,
	"recipient_phone" text NOT NULL,
	"recipient_name" text,
	"template_id" uuid,
	"message_text" text NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"attachment_url" text,
	"category" text DEFAULT 'general' NOT NULL,
	"provider_message_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_wa_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"body" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_wa_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"platform_name" text DEFAULT 'نسق',
	"logo_url" text,
	"favicon_url" text,
	"primary_color" text DEFAULT '#5b9bd5',
	"support_email" text,
	"support_phone" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "platform_kill_switches" (
	"id" text PRIMARY KEY NOT NULL,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"reason" text,
	"disabled_by" text,
	"disabled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quota_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"metric_key" text NOT NULL,
	"period" text NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_execution_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"event_id" uuid,
	"quotation_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"assigned_to" text,
	"due_date" timestamp with time zone,
	"event_phase" text DEFAULT 'pre_event' NOT NULL,
	"status" "event_execution_task_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"quotation_id" uuid NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"qty" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"event_id" uuid,
	"quotation_number" text NOT NULL,
	"client_name" text NOT NULL,
	"client_phone" text,
	"client_email" text,
	"title" text NOT NULL,
	"event_date" date,
	"event_venue" text,
	"guest_count" integer,
	"notes" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '15' NOT NULL,
	"vat_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"deposit_required" numeric(12, 2) DEFAULT '0' NOT NULL,
	"valid_until" date,
	"payment_terms" text,
	"status" "event_quotation_status" DEFAULT 'draft' NOT NULL,
	"accepted_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"total_platform_fee" numeric(10, 2) NOT NULL,
	"net_amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"status" "settlement_status" DEFAULT 'pending' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"iban_number" text,
	"account_name" text,
	"payout_reference" text,
	"payout_method" text DEFAULT 'bank_transfer',
	"admin_note" text,
	"completed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"platform_fee_percent" numeric(5, 2) DEFAULT '2.5',
	"platform_fee_fixed" numeric(5, 2) DEFAULT '0',
	"iban_number" text,
	"account_name" text,
	"bank_name" text,
	"notify_on_payment" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_settings_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"invoice_id" uuid,
	"booking_id" uuid,
	"customer_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"platform_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"merchant_amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"status" "payment_tx_status" DEFAULT 'pending' NOT NULL,
	"moyasar_id" text,
	"moyasar_status" text,
	"payment_method" text,
	"card_info" jsonb,
	"moyasar_fee" numeric(10, 2),
	"moyasar_data" jsonb,
	"description" text,
	"success_url" text,
	"failure_url" text,
	"metadata" jsonb,
	"settlement_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "payment_transactions_moyasar_id_unique" UNIQUE("moyasar_id")
);
--> statement-breakpoint
CREATE TABLE "construction_change_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"construction_id" uuid NOT NULL,
	"change_order_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"reason" text DEFAULT 'owner_request',
	"requested_by" text DEFAULT 'owner',
	"cost_impact" numeric(12, 2) DEFAULT '0',
	"time_impact" integer DEFAULT 0,
	"status" text DEFAULT 'proposed' NOT NULL,
	"proposed_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"attachments" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"construction_id" uuid NOT NULL,
	"phase_id" uuid,
	"cost_date" date NOT NULL,
	"category" text DEFAULT 'materials' NOT NULL,
	"description" text NOT NULL,
	"vendor" text,
	"vendor_phone" text,
	"quantity" numeric(12, 2),
	"unit_price" numeric(12, 2),
	"total_amount" numeric(14, 2) NOT NULL,
	"vat_amount" numeric(12, 2) DEFAULT '0',
	"payment_status" text DEFAULT 'pending',
	"payment_method" text,
	"cheque_number" text,
	"invoice_number" text,
	"receipt_url" text,
	"approved_by" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_daily_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"construction_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"weather" text,
	"temperature" integer,
	"workers_count" integer DEFAULT 0,
	"supervisor_present" boolean DEFAULT false,
	"work_description" text,
	"materials_received" jsonb,
	"equipment_on_site" jsonb,
	"issues" text,
	"safety_incidents" text,
	"visitor_log" jsonb,
	"photos" jsonb,
	"logged_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"construction_id" uuid NOT NULL,
	"payment_number" integer DEFAULT 1 NOT NULL,
	"period_start" date,
	"period_end" date,
	"completion_percentage" integer,
	"gross_amount" numeric(14, 2) NOT NULL,
	"retention_deducted" numeric(12, 2) DEFAULT '0',
	"previous_payments" numeric(14, 2) DEFAULT '0',
	"net_payable" numeric(14, 2) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"approved_by" text,
	"attachments" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "construction_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"construction_id" uuid NOT NULL,
	"name" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" "phase_status" DEFAULT 'not_started' NOT NULL,
	"planned_start_date" date,
	"planned_end_date" date,
	"actual_start_date" date,
	"actual_end_date" date,
	"progress" integer DEFAULT 0,
	"estimated_cost" numeric(14, 2),
	"actual_cost" numeric(14, 2) DEFAULT '0',
	"depends_on" uuid,
	"description" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lease_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"contract_number" text NOT NULL,
	"property_id" uuid,
	"unit_id" uuid,
	"tenant_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"contract_type" "lease_contract_type" DEFAULT 'annual' NOT NULL,
	"rent_amount" numeric(12, 2) NOT NULL,
	"payment_frequency" "lease_payment_frequency" DEFAULT 'monthly' NOT NULL,
	"deposit_amount" numeric(12, 2) DEFAULT '0',
	"deposit_status" "deposit_status" DEFAULT 'pending',
	"deposit_returned_amount" numeric(12, 2),
	"deposit_deduction_reason" text,
	"includes_electricity" boolean DEFAULT false,
	"includes_water" boolean DEFAULT false,
	"includes_ac" boolean DEFAULT false,
	"includes_internet" boolean DEFAULT false,
	"includes_parking" boolean DEFAULT false,
	"parking_spots" integer DEFAULT 0,
	"ejar_contract_number" text,
	"ejar_status" "ejar_status" DEFAULT 'not_submitted',
	"ejar_documented_at" timestamp with time zone,
	"ejar_expires_at" timestamp with time zone,
	"ejar_notes" text,
	"auto_renew" boolean DEFAULT true,
	"renewal_notice_days" integer DEFAULT 60,
	"renewed_from_id" uuid,
	"renewal_rent_increase" numeric(5, 2) DEFAULT '0',
	"status" "lease_contract_status" DEFAULT 'draft' NOT NULL,
	"termination_reason" text,
	"termination_date" date,
	"terminated_by" text,
	"attachments" jsonb,
	"internal_notes" text,
	"riyadh_freeze_applies" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lease_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"period_label" text,
	"rent_amount" numeric(12, 2) NOT NULL,
	"service_charge" numeric(12, 2) DEFAULT '0',
	"parking_fee" numeric(12, 2) DEFAULT '0',
	"other_charges" numeric(12, 2) DEFAULT '0',
	"other_charges_description" text,
	"subtotal" numeric(12, 2) NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '0',
	"vat_amount" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"status" "lease_invoice_status" DEFAULT 'draft' NOT NULL,
	"due_date" date NOT NULL,
	"paid_at" timestamp with time zone,
	"paid_amount" numeric(12, 2) DEFAULT '0',
	"reminder_sent_at" timestamp with time zone,
	"overdue_notice_sent_at" timestamp with time zone,
	"second_reminder_sent_at" timestamp with time zone,
	"notes" text,
	"zatca_qr_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lease_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"invoice_id" uuid,
	"contract_id" uuid NOT NULL,
	"receipt_number" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" "lease_payment_method" DEFAULT 'cash' NOT NULL,
	"payment_source" "lease_payment_source" DEFAULT 'direct',
	"cheque_number" text,
	"cheque_date" date,
	"bank_name" text,
	"transfer_reference" text,
	"gateway_transaction_id" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"received_by" text,
	"approved_by" text,
	"notes" text,
	"receipt_url" text,
	"is_reconciled" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lease_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"contract_id" uuid,
	"invoice_id" uuid,
	"reminder_type" "lease_reminder_type" NOT NULL,
	"channel" "lease_reminder_channel" DEFAULT 'whatsapp',
	"recipient" text,
	"recipient_phone" text,
	"recipient_email" text,
	"message" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"status" "lease_reminder_status" DEFAULT 'pending' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "property_type" DEFAULT 'residential' NOT NULL,
	"address" text,
	"city" text,
	"district" text,
	"postal_code" text,
	"location_lat" numeric(10, 7),
	"location_lng" numeric(10, 7),
	"total_units" integer DEFAULT 0,
	"total_floors" integer,
	"build_year" integer,
	"plot_area_sqm" numeric(12, 2),
	"built_area_sqm" numeric(12, 2),
	"license_number" text,
	"deed_number" text,
	"owner_name" text,
	"owner_national_id" text,
	"cover_image_url" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"portfolio_type" "portfolio_type",
	"management_type" "management_type",
	"property_owner_id" uuid,
	"purchase_price" numeric(14, 2),
	"purchase_date" date,
	"current_market_value" numeric(14, 2),
	"last_valuation_date" date,
	"plot_number" text,
	"plan_number" text,
	"zoning" "zoning_type",
	"street_width" numeric(6, 2),
	"number_of_streets" integer,
	"rer_registered" boolean DEFAULT false,
	"rer_number" text,
	"rer_status" "rer_status" DEFAULT 'not_registered',
	"disposal_status" "disposal_status" DEFAULT 'free',
	"mortgage_bank" text,
	"mortgage_amount" numeric(14, 2),
	"mortgage_end_date" date,
	"freeze_reason" text,
	"freeze_date" date,
	"building_permit_number" text,
	"building_permit_date" date,
	"building_permit_expiry" date,
	"building_permit_status" "building_permit_status" DEFAULT 'none',
	"occupancy_certificate" boolean DEFAULT false,
	"occupancy_certificate_date" date,
	"civil_defense_license" text,
	"civil_defense_license_expiry" date,
	"building_code_compliant" boolean DEFAULT false,
	"last_inspection_by_authority" date,
	"white_land_applicable" boolean DEFAULT false,
	"white_land_zone" text,
	"white_land_fee_rate" numeric(5, 2),
	"white_land_estimated_annual_fee" numeric(12, 2),
	"white_land_registration_number" text,
	"white_land_last_payment_date" date,
	"white_land_next_due_date" date,
	"has_owners_association" boolean DEFAULT false,
	"owners_association_name" text,
	"owners_association_fee" numeric(12, 2),
	"owners_association_fee_frequency" "assoc_fee_frequency" DEFAULT 'monthly',
	"mullak_registered" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "property_construction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"property_id" uuid,
	"project_name" text NOT NULL,
	"project_type" "construction_project_type" DEFAULT 'new_build' NOT NULL,
	"contractor_name" text,
	"contractor_phone" text,
	"architect_name" text,
	"supervisor_name" text,
	"building_permit_number" text,
	"permit_date" date,
	"permit_expiry" date,
	"contract_type" "construction_contract_type" DEFAULT 'lump_sum',
	"contract_amount" numeric(14, 2),
	"total_budget" numeric(14, 2),
	"actual_spent_to_date" numeric(14, 2) DEFAULT '0',
	"retention_percentage" numeric(5, 2) DEFAULT '10',
	"retention_amount" numeric(14, 2) DEFAULT '0',
	"retention_release_date" date,
	"estimated_completion_date" date,
	"actual_completion_date" date,
	"warranty_end_date" date,
	"penalty_per_day" numeric(10, 2),
	"accumulated_penalty" numeric(12, 2) DEFAULT '0',
	"overall_progress" integer DEFAULT 0,
	"status" "construction_status" DEFAULT 'design' NOT NULL,
	"notes" text,
	"attachments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"property_id" uuid,
	"doc_type" "property_doc_type" DEFAULT 'other' NOT NULL,
	"title" text NOT NULL,
	"file_url" text,
	"expiry_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"property_id" uuid,
	"unit_id" uuid,
	"contract_id" uuid,
	"expense_number" text NOT NULL,
	"category" "property_expense_category" DEFAULT 'maintenance' NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"vat_amount" numeric(12, 2) DEFAULT '0',
	"paid_to" text,
	"paid_to_phone" text,
	"paid_at" date,
	"payment_method" text,
	"receipt_url" text,
	"charge_to_owner" boolean DEFAULT true,
	"charge_to_tenant" boolean DEFAULT false,
	"is_recurring" boolean DEFAULT false,
	"recurring_frequency" text,
	"approved_by" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"listing_id" uuid,
	"inquirer_name" text NOT NULL,
	"inquirer_phone" text NOT NULL,
	"inquirer_national_id" text,
	"source" "property_inquiry_source" DEFAULT 'phone',
	"status" "property_inquiry_status" DEFAULT 'new' NOT NULL,
	"scheduled_viewing_date" date,
	"viewing_notes" text,
	"offered_rent" numeric(12, 2),
	"assigned_to" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"property_id" uuid,
	"unit_id" uuid,
	"contract_id" uuid,
	"type" "property_inspection_type" DEFAULT 'periodic' NOT NULL,
	"inspection_date" date NOT NULL,
	"inspected_by" text,
	"condition" jsonb,
	"overall_rating" "inspection_overall_rating",
	"general_notes" text,
	"photos" jsonb,
	"tenant_signature" text,
	"manager_signature" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"unit_id" uuid,
	"property_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"photos" jsonb,
	"advertised_rent" numeric(12, 2),
	"features" jsonb,
	"status" "property_listing_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"views" integer DEFAULT 0,
	"inquiries_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_maintenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"property_id" uuid,
	"unit_id" uuid,
	"contract_id" uuid,
	"ticket_number" text NOT NULL,
	"reported_by" "maintenance_reporter_type" DEFAULT 'tenant',
	"reporter_name" text,
	"reporter_phone" text,
	"category" "property_maintenance_category" DEFAULT 'general' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"photos" jsonb,
	"priority" "property_maintenance_priority" DEFAULT 'normal' NOT NULL,
	"status" "property_maintenance_status" DEFAULT 'reported' NOT NULL,
	"assigned_to" text,
	"assigned_company" text,
	"assigned_phone" text,
	"estimated_cost" numeric(12, 2),
	"quoted_cost" numeric(12, 2),
	"approved_cost" numeric(12, 2),
	"actual_cost" numeric(12, 2),
	"scheduled_date" date,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completion_photos" jsonb,
	"tenant_rating" integer,
	"tenant_feedback" text,
	"warranty_days" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"owner_name" text NOT NULL,
	"owner_national_id" text,
	"owner_phone" text,
	"owner_email" text,
	"owner_iban" text,
	"owner_bank_name" text,
	"management_fee_type" "management_fee_type" DEFAULT 'percentage',
	"management_fee_percent" numeric(5, 2) DEFAULT '7.5',
	"management_fee_fixed" numeric(12, 2),
	"contract_number" text,
	"contract_start" date,
	"contract_end" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"property_id" uuid,
	"unit_id" uuid,
	"sale_type" "property_sale_type" DEFAULT 'full_property' NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_national_id" text,
	"buyer_phone" text,
	"sale_method" "property_sale_method" DEFAULT 'cash',
	"sale_price" numeric(14, 2) NOT NULL,
	"deposit_paid" numeric(12, 2) DEFAULT '0',
	"mortgage_bank" text,
	"mortgage_approval_number" text,
	"installment_plan" jsonb,
	"commission_percent" numeric(5, 2) DEFAULT '2.5',
	"commission_amount" numeric(12, 2),
	"deed_transfer_date" date,
	"deed_transfer_number" text,
	"status" "property_sale_status" DEFAULT 'listed' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"unit_number" text NOT NULL,
	"floor" integer,
	"type" "unit_type" DEFAULT 'apartment' NOT NULL,
	"area_sqm" numeric(10, 2),
	"bedrooms" integer DEFAULT 0,
	"bathrooms" integer DEFAULT 0,
	"living_rooms" integer DEFAULT 0,
	"has_balcony" boolean DEFAULT false,
	"has_kitchen" boolean DEFAULT false,
	"has_maid_room" boolean DEFAULT false,
	"has_pool" boolean DEFAULT false,
	"monthly_rent" numeric(12, 2),
	"yearly_rent" numeric(12, 2),
	"deposit_amount" numeric(12, 2),
	"electricity_meter" text,
	"water_meter" text,
	"gas_meter" text,
	"status" "unit_status" DEFAULT 'vacant' NOT NULL,
	"furnishing" "furnishing_type" DEFAULT 'unfurnished',
	"amenities" jsonb,
	"photos" jsonb,
	"last_inspection_date" date,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"valuation_date" date NOT NULL,
	"valuation_type" "property_valuation_type" DEFAULT 'market' NOT NULL,
	"valued_by" text,
	"valuation_amount" numeric(14, 2) NOT NULL,
	"notes" text,
	"report_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid,
	"national_id" text,
	"iqama_number" text,
	"nationality" text,
	"passport_number" text,
	"company_name" text,
	"commercial_registration" text,
	"vat_number" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_relation" text,
	"bank_name" text,
	"iban" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"booking_ref" uuid,
	"booking_number" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"duration_minutes" integer,
	"location_id" uuid,
	"location_note" text,
	"assigned_user_id" uuid,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vat_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"source" text DEFAULT 'dashboard',
	"customer_notes" text,
	"internal_notes" text,
	"question_answers" jsonb DEFAULT '[]'::jsonb,
	"rating" integer,
	"review_text" text,
	"reviewed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_bookings_booking_number_unique" UNIQUE("booking_number")
);
--> statement-breakpoint
CREATE TABLE "booking_line_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_line_id" uuid NOT NULL,
	"addon_ref_id" uuid,
	"addon_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_record_id" uuid NOT NULL,
	"item_ref_id" uuid,
	"service_ref_id" uuid,
	"line_type" text DEFAULT 'service' NOT NULL,
	"item_name" text NOT NULL,
	"item_type" text,
	"duration_minutes" integer,
	"vat_inclusive" boolean DEFAULT true NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"pricing_breakdown" jsonb DEFAULT '[]'::jsonb,
	"snapshot" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_payment_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_record_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"link_type" text DEFAULT 'payment' NOT NULL,
	"amount_applied" numeric(12, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_record_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_record_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_record_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_record_id" uuid NOT NULL,
	"booking_line_id" uuid,
	"user_id" uuid NOT NULL,
	"service_ref_id" uuid,
	"commission_mode" text DEFAULT 'percentage' NOT NULL,
	"rate" numeric(10, 2) DEFAULT '0' NOT NULL,
	"base_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"commission_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_consumptions_canonical" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_record_id" uuid NOT NULL,
	"booking_line_id" uuid,
	"supply_id" uuid,
	"inventory_item_id" uuid,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" text,
	"consumed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"booking_ref" uuid,
	"booking_number" text NOT NULL,
	"booking_type" text DEFAULT 'appointment' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"setup_at" timestamp with time zone,
	"teardown_at" timestamp with time zone,
	"location_id" uuid,
	"custom_location" text,
	"location_notes" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vat_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance_due" numeric(12, 2) DEFAULT '0' NOT NULL,
	"source" text DEFAULT 'dashboard',
	"tracking_token" text,
	"customer_notes" text,
	"internal_notes" text,
	"question_answers" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"assigned_user_id" uuid,
	"vendor_id" uuid,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"reviewed_at" timestamp with time zone,
	"rating" integer,
	"review_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_records_booking_number_unique" UNIQUE("booking_number"),
	CONSTRAINT "booking_records_tracking_token_unique" UNIQUE("tracking_token")
);
--> statement-breakpoint
CREATE TABLE "booking_timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_record_id" uuid NOT NULL,
	"user_id" uuid,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"booking_ref" uuid,
	"booking_number" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"event_type" text,
	"event_name" text,
	"event_date" date NOT NULL,
	"event_start" timestamp with time zone,
	"event_end" timestamp with time zone,
	"setup_at" timestamp with time zone,
	"teardown_at" timestamp with time zone,
	"location_id" uuid,
	"custom_location" text,
	"location_notes" text,
	"guest_count" integer,
	"confirmed_guests" integer,
	"package_id" uuid,
	"package_snapshot" jsonb,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vat_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance_due" numeric(12, 2) DEFAULT '0' NOT NULL,
	"assigned_user_id" uuid,
	"source" text DEFAULT 'dashboard',
	"customer_notes" text,
	"internal_notes" text,
	"question_answers" jsonb DEFAULT '[]'::jsonb,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"refund_amount" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_bookings_booking_number_unique" UNIQUE("booking_number")
);
--> statement-breakpoint
CREATE TABLE "stay_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"booking_ref" uuid,
	"booking_number" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"stay_type" text DEFAULT 'hotel' NOT NULL,
	"unit_id" uuid,
	"unit_type" text,
	"unit_snapshot" jsonb,
	"check_in" timestamp with time zone NOT NULL,
	"check_out" timestamp with time zone NOT NULL,
	"actual_check_in" timestamp with time zone,
	"actual_check_out" timestamp with time zone,
	"guest_count" integer DEFAULT 1,
	"driver_name" text,
	"driver_license" text,
	"pickup_location" text,
	"dropoff_location" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vat_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"source" text DEFAULT 'dashboard',
	"customer_notes" text,
	"internal_notes" text,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stay_bookings_booking_number_unique" UNIQUE("booking_number")
);
--> statement-breakpoint
CREATE TABLE "table_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid,
	"booking_ref" uuid,
	"reservation_number" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"table_id" uuid,
	"table_snapshot" jsonb,
	"covers" integer DEFAULT 1 NOT NULL,
	"section" text,
	"reserved_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 90,
	"seated_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"pre_order" jsonb DEFAULT '[]'::jsonb,
	"special_requests" text,
	"occasion" text,
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"paid_amount" numeric(12, 2) DEFAULT '0',
	"source" text DEFAULT 'dashboard',
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"no_show_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "table_reservations_reservation_number_unique" UNIQUE("reservation_number")
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"image_url" text,
	"category_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"is_taxable" boolean DEFAULT true NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '15',
	"legacy_service_id" uuid,
	"sort_order" integer DEFAULT 0,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_item_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"base_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"compare_price" numeric(12, 2),
	"cost_price" numeric(12, 2),
	"sku" text,
	"barcode" text,
	"track_inventory" boolean DEFAULT false,
	"stock_quantity" integer DEFAULT 0,
	"reorder_level" integer DEFAULT 0,
	"is_shippable" boolean DEFAULT false,
	"weight_grams" integer,
	"requires_age_verify" boolean DEFAULT false,
	"has_variants" boolean DEFAULT false,
	"variant_options" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_definitions_catalog_item_id_unique" UNIQUE("catalog_item_id")
);
--> statement-breakpoint
CREATE TABLE "rental_unit_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_item_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"unit_type" text NOT NULL,
	"unit_code" text,
	"price_per_night" numeric(12, 2),
	"price_per_hour" numeric(12, 2),
	"price_per_day" numeric(12, 2),
	"price_per_week" numeric(12, 2),
	"price_per_month" numeric(12, 2),
	"min_rental_days" integer DEFAULT 1,
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"capacity" integer,
	"specs" jsonb DEFAULT '{}'::jsonb,
	"maintenance_due_at" timestamp with time zone,
	"last_serviced_at" timestamp with time zone,
	"is_available" boolean DEFAULT true,
	"location_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rental_unit_definitions_catalog_item_id_unique" UNIQUE("catalog_item_id")
);
--> statement-breakpoint
CREATE TABLE "service_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_item_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"base_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"price_type" text DEFAULT 'fixed' NOT NULL,
	"price_from" numeric(12, 2),
	"price_to" numeric(12, 2),
	"duration_minutes" integer,
	"buffer_before_mins" integer DEFAULT 0,
	"buffer_after_mins" integer DEFAULT 0,
	"booking_advance_hrs" integer DEFAULT 0,
	"requires_assignment" boolean DEFAULT false,
	"max_concurrent" integer DEFAULT 1,
	"min_quantity" integer DEFAULT 1,
	"max_quantity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_definitions_catalog_item_id_unique" UNIQUE("catalog_item_id")
);
--> statement-breakpoint
CREATE TABLE "access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"location_id" uuid,
	"customer_id" uuid,
	"customer_name" text,
	"method" text DEFAULT 'manual' NOT NULL,
	"granted" boolean DEFAULT true NOT NULL,
	"deny_reason" text,
	"access_token" text,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"location_id" uuid,
	"order_number" text NOT NULL,
	"customer_id" uuid,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"status" text DEFAULT 'received' NOT NULL,
	"category" text DEFAULT 'repair' NOT NULL,
	"item_name" text NOT NULL,
	"item_model" text,
	"item_serial" text,
	"item_barcode" text,
	"item_condition" text,
	"problem_description" text NOT NULL,
	"diagnosis" text,
	"resolution" text,
	"estimated_cost" numeric(10, 2),
	"final_cost" numeric(10, 2),
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"deposit_paid" boolean DEFAULT false,
	"is_paid" boolean DEFAULT false,
	"warranty_days" integer DEFAULT 0,
	"journal_entry_id" uuid,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"estimated_ready_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"diagnosing_at" timestamp with time zone,
	"waiting_parts_at" timestamp with time zone,
	"in_progress_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"cancelled_by" uuid,
	"assigned_to_id" uuid,
	"internal_notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_stamps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"stamps_count" integer DEFAULT 0 NOT NULL,
	"stamps_goal" integer DEFAULT 10 NOT NULL,
	"free_items_redeemed" integer DEFAULT 0 NOT NULL,
	"last_stamp_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"check_in" time,
	"check_out" time,
	"status" text DEFAULT 'present' NOT NULL,
	"late_minutes" integer DEFAULT 0,
	"overtime_minutes" integer DEFAULT 0,
	"source" text DEFAULT 'manual',
	"zkteco_device_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"deduction_type" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"deduction_month" text NOT NULL,
	"status" text DEFAULT 'pending',
	"payroll_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_employee_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"document_name" text NOT NULL,
	"document_number" text,
	"issue_date" date,
	"expiry_date" date,
	"file_url" text,
	"is_verified" boolean DEFAULT false,
	"reminder_days" integer DEFAULT 60,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_number" text NOT NULL,
	"full_name" text NOT NULL,
	"full_name_en" text,
	"national_id" text,
	"nationality" text DEFAULT 'SA',
	"date_of_birth" date,
	"gender" text,
	"phone" text,
	"email" text,
	"address" text,
	"job_title" text,
	"department" text,
	"employment_type" text DEFAULT 'full_time' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"hire_date" date NOT NULL,
	"termination_date" date,
	"termination_reason" text,
	"basic_salary" numeric(12, 2) DEFAULT '0' NOT NULL,
	"housing_allowance" numeric(10, 2) DEFAULT '0',
	"transport_allowance" numeric(10, 2) DEFAULT '0',
	"other_allowances" jsonb,
	"bank_name" text,
	"iban" text,
	"gosi_number" text,
	"gosi_eligible" boolean DEFAULT true,
	"is_saudi" boolean DEFAULT false,
	"payroll_day" integer DEFAULT 28,
	"manager_id" uuid,
	"user_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_government_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"fee_type" text NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"due_date" date,
	"paid_date" date,
	"status" text DEFAULT 'upcoming',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_leave_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"leave_type" text NOT NULL,
	"entitled_days" integer DEFAULT 0,
	"used_days" integer DEFAULT 0,
	"remaining_days" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_leaves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days_count" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_loan_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"loan_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"due_month" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending',
	"payroll_id" uuid,
	"deducted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"loan_number" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"purpose" text,
	"approval_status" text DEFAULT 'pending',
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"total_installments" integer DEFAULT 1 NOT NULL,
	"paid_installments" integer DEFAULT 0,
	"installment_amount" numeric(10, 2),
	"start_month" text,
	"status" text DEFAULT 'active',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_payroll" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"payroll_number" text NOT NULL,
	"payroll_month" text NOT NULL,
	"payroll_date" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_basic" numeric(14, 2) DEFAULT '0',
	"total_allowances" numeric(14, 2) DEFAULT '0',
	"total_additions" numeric(14, 2) DEFAULT '0',
	"total_deductions" numeric(14, 2) DEFAULT '0',
	"total_loans" numeric(14, 2) DEFAULT '0',
	"total_gosi_employee" numeric(12, 2) DEFAULT '0',
	"total_gosi_employer" numeric(12, 2) DEFAULT '0',
	"total_net" numeric(14, 2) DEFAULT '0',
	"total_gratuity_provision" numeric(12, 2) DEFAULT '0',
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"payment_method" text DEFAULT 'bank_transfer',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_payroll_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"payroll_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"basic_salary" numeric(12, 2) DEFAULT '0',
	"housing_allowance" numeric(10, 2) DEFAULT '0',
	"transport_allowance" numeric(10, 2) DEFAULT '0',
	"other_allowances" jsonb,
	"overtime_amount" numeric(10, 2) DEFAULT '0',
	"additions_amount" numeric(10, 2) DEFAULT '0',
	"absence_deduction" numeric(10, 2) DEFAULT '0',
	"late_deduction" numeric(10, 2) DEFAULT '0',
	"loans_deduction" numeric(10, 2) DEFAULT '0',
	"direct_deductions" numeric(10, 2) DEFAULT '0',
	"gosi_employee" numeric(10, 2) DEFAULT '0',
	"gosi_employer" numeric(10, 2) DEFAULT '0',
	"gratuity_provision" numeric(10, 2) DEFAULT '0',
	"net_salary" numeric(12, 2) DEFAULT '0',
	"working_days" integer DEFAULT 0,
	"absent_days" integer DEFAULT 0,
	"late_days" integer DEFAULT 0,
	"overtime_hours" numeric(6, 2) DEFAULT '0',
	"status" text DEFAULT 'included',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "hr_performance_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"review_year" integer NOT NULL,
	"review_period" text NOT NULL,
	"reviewer_id" uuid,
	"overall_score" numeric(3, 1),
	"criteria" jsonb,
	"strengths" text,
	"improvements" text,
	"goals_next_period" text,
	"status" text DEFAULT 'draft',
	"employee_acknowledged" boolean DEFAULT false,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_zkteco_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"device_name" text,
	"device_ip" text,
	"last_sync_at" timestamp with time zone,
	"records_synced" integer DEFAULT 0,
	"status" text DEFAULT 'active',
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"addon_code" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"started_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"amount_paid" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "org_resource_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"resource_code" varchar(50) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"started_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"amount_paid" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "plan_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name_ar" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"description_ar" varchar(255),
	"price_yearly" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "plan_addons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name_ar" varchar(50) NOT NULL,
	"name_en" varchar(50) NOT NULL,
	"price_monthly" numeric(10, 2) NOT NULL,
	"price_yearly" numeric(10, 2) NOT NULL,
	"original_price_monthly" numeric(10, 2),
	"original_price_yearly" numeric(10, 2),
	"max_branches" integer DEFAULT 1 NOT NULL,
	"max_employees" integer DEFAULT 10 NOT NULL,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"is_launch_offer" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pricing_plan_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_code" varchar(20) NOT NULL,
	"feature_key" varchar(100) NOT NULL,
	"is_included" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "resource_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name_ar" varchar(100) NOT NULL,
	"price_monthly" numeric(10, 2),
	"price_yearly" numeric(10, 2),
	"unit_ar" varchar(50),
	"quantity" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "resource_addons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "organization_legal_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"business_name" text,
	"commercial_registration" text,
	"vat_number" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"refund_policy" text,
	"cancellation_policy" text,
	"data_retention_days" integer DEFAULT 365,
	"allow_data_export" boolean DEFAULT true,
	"allow_data_deletion" boolean DEFAULT true,
	"dpo_email" text,
	"privacy_policy_url" text,
	"terms_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "organization_legal_settings_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "privacy_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"customer_id" uuid,
	"type" "privacy_request_type" NOT NULL,
	"status" "privacy_request_status" DEFAULT 'pending' NOT NULL,
	"requester_name" text,
	"requester_email" text,
	"requester_phone" text,
	"notes" text,
	"processed_by" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "security_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"severity" "security_incident_severity" NOT NULL,
	"affected_data" text,
	"actions_taken" text,
	"reported_to_ndmo" boolean DEFAULT false,
	"ndmo_reported_at" timestamp with time zone,
	"detected_at" timestamp with time zone DEFAULT now(),
	"reported_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "booking_items" DROP CONSTRAINT "booking_items_service_id_services_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_location_id_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_assigned_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_vendor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_booking_id_bookings_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_vendor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_approved_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_chart_of_account_id_chart_of_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "invoice_payments" DROP CONSTRAINT "invoice_payments_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_booking_id_bookings_id_fk";
--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "vendor_commissions" DROP CONSTRAINT "vendor_commissions_vendor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "vendor_payouts" DROP CONSTRAINT "vendor_payouts_vendor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "accounting_periods" DROP CONSTRAINT "accounting_periods_closed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_period_id_accounting_periods_id_fk";
--> statement-breakpoint
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_posted_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_reversed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "journal_entry_lines" DROP CONSTRAINT "journal_entry_lines_account_id_chart_of_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "journal_entry_lines" DROP CONSTRAINT "journal_entry_lines_branch_id_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "otp_codes" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "storefront_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "current_plan_code" varchar(20) DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "plan_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "is_trial" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "trial_started_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "referral_code" varchar(12);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "referred_by_org_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "referral_credited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "otp_codes" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "service_components" ADD COLUMN "asset_id" uuid;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "min_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "booking_pipeline_stages" ADD COLUMN "mapped_status" text;--> statement-breakpoint
ALTER TABLE "booking_pipeline_stages" ADD COLUMN "is_skippable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "consent_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD COLUMN "currency" text DEFAULT 'SAR' NOT NULL;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD COLUMN "is_bank_account" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD COLUMN "bank_iban" text;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD COLUMN "bank_branch" text;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD COLUMN "is_cash_account" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD COLUMN "budget_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD COLUMN "cost_center_id" uuid;--> statement-breakpoint
ALTER TABLE "client_beauty_profiles" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "visit_notes" ADD COLUMN "custom_fields" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "org_documents" ADD COLUMN "document_number" text;--> statement-breakpoint
ALTER TABLE "org_documents" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "org_documents" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "org_documents" ADD COLUMN "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "org_documents" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD COLUMN "invite_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD COLUMN "invited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "asset_depreciation_entries" ADD CONSTRAINT "asset_depreciation_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_depreciation_entries" ADD CONSTRAINT "asset_depreciation_entries_asset_id_fixed_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."fixed_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_depreciation_entries" ADD CONSTRAINT "asset_depreciation_entries_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_parent_id_cost_centers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_depreciation_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("depreciation_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_expense_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("expense_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_invoice_id_purchase_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."purchase_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_galleries" ADD CONSTRAINT "media_galleries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_galleries" ADD CONSTRAINT "media_galleries_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salon_monitoring_events" ADD CONSTRAINT "salon_monitoring_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_constraints" ADD CONSTRAINT "user_constraints_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_constraints" ADD CONSTRAINT "user_constraints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_execution_tasks" ADD CONSTRAINT "event_execution_tasks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_execution_tasks" ADD CONSTRAINT "event_execution_tasks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_execution_tasks" ADD CONSTRAINT "event_execution_tasks_quotation_id_event_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."event_quotations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_execution_tasks" ADD CONSTRAINT "event_execution_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_quotation_items" ADD CONSTRAINT "event_quotation_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_quotation_items" ADD CONSTRAINT "event_quotation_items_quotation_id_event_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."event_quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_quotations" ADD CONSTRAINT "event_quotations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_quotations" ADD CONSTRAINT "event_quotations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_quotations" ADD CONSTRAINT "event_quotations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_settlements" ADD CONSTRAINT "merchant_settlements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_settlements" ADD CONSTRAINT "merchant_settlements_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_settings" ADD CONSTRAINT "payment_settings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_change_orders" ADD CONSTRAINT "construction_change_orders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_change_orders" ADD CONSTRAINT "construction_change_orders_construction_id_property_construction_id_fk" FOREIGN KEY ("construction_id") REFERENCES "public"."property_construction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_costs" ADD CONSTRAINT "construction_costs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_costs" ADD CONSTRAINT "construction_costs_construction_id_property_construction_id_fk" FOREIGN KEY ("construction_id") REFERENCES "public"."property_construction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_costs" ADD CONSTRAINT "construction_costs_phase_id_construction_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."construction_phases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_daily_logs" ADD CONSTRAINT "construction_daily_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_daily_logs" ADD CONSTRAINT "construction_daily_logs_construction_id_property_construction_id_fk" FOREIGN KEY ("construction_id") REFERENCES "public"."property_construction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_payments" ADD CONSTRAINT "construction_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_payments" ADD CONSTRAINT "construction_payments_construction_id_property_construction_id_fk" FOREIGN KEY ("construction_id") REFERENCES "public"."property_construction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_phases" ADD CONSTRAINT "construction_phases_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_phases" ADD CONSTRAINT "construction_phases_construction_id_property_construction_id_fk" FOREIGN KEY ("construction_id") REFERENCES "public"."property_construction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_invoices" ADD CONSTRAINT "lease_invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_invoices" ADD CONSTRAINT "lease_invoices_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_payments" ADD CONSTRAINT "lease_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_payments" ADD CONSTRAINT "lease_payments_invoice_id_lease_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."lease_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_payments" ADD CONSTRAINT "lease_payments_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_reminders" ADD CONSTRAINT "lease_reminders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_reminders" ADD CONSTRAINT "lease_reminders_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_reminders" ADD CONSTRAINT "lease_reminders_invoice_id_lease_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."lease_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_property_owner_id_property_owners_id_fk" FOREIGN KEY ("property_owner_id") REFERENCES "public"."property_owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_construction" ADD CONSTRAINT "property_construction_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_construction" ADD CONSTRAINT "property_construction_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_expenses" ADD CONSTRAINT "property_expenses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_expenses" ADD CONSTRAINT "property_expenses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_expenses" ADD CONSTRAINT "property_expenses_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_expenses" ADD CONSTRAINT "property_expenses_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_inquiries" ADD CONSTRAINT "property_inquiries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_inquiries" ADD CONSTRAINT "property_inquiries_listing_id_property_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."property_listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_listings" ADD CONSTRAINT "property_listings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_listings" ADD CONSTRAINT "property_listings_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_listings" ADD CONSTRAINT "property_listings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_maintenance" ADD CONSTRAINT "property_maintenance_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_maintenance" ADD CONSTRAINT "property_maintenance_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_maintenance" ADD CONSTRAINT "property_maintenance_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_maintenance" ADD CONSTRAINT "property_maintenance_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_sales" ADD CONSTRAINT "property_sales_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_sales" ADD CONSTRAINT "property_sales_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_sales" ADD CONSTRAINT "property_sales_unit_id_property_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."property_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_units" ADD CONSTRAINT "property_units_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_units" ADD CONSTRAINT "property_units_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_valuations" ADD CONSTRAINT "property_valuations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_valuations" ADD CONSTRAINT "property_valuations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_bookings" ADD CONSTRAINT "appointment_bookings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_bookings" ADD CONSTRAINT "appointment_bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_bookings" ADD CONSTRAINT "appointment_bookings_booking_ref_bookings_id_fk" FOREIGN KEY ("booking_ref") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_bookings" ADD CONSTRAINT "appointment_bookings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_bookings" ADD CONSTRAINT "appointment_bookings_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_line_addons" ADD CONSTRAINT "booking_line_addons_booking_line_id_booking_lines_id_fk" FOREIGN KEY ("booking_line_id") REFERENCES "public"."booking_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_lines" ADD CONSTRAINT "booking_lines_booking_record_id_booking_records_id_fk" FOREIGN KEY ("booking_record_id") REFERENCES "public"."booking_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_payment_links" ADD CONSTRAINT "booking_payment_links_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_payment_links" ADD CONSTRAINT "booking_payment_links_booking_record_id_booking_records_id_fk" FOREIGN KEY ("booking_record_id") REFERENCES "public"."booking_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_payment_links" ADD CONSTRAINT "booking_payment_links_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_record_assignments" ADD CONSTRAINT "booking_record_assignments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_record_assignments" ADD CONSTRAINT "booking_record_assignments_booking_record_id_booking_records_id_fk" FOREIGN KEY ("booking_record_id") REFERENCES "public"."booking_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_record_assignments" ADD CONSTRAINT "booking_record_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_record_commissions" ADD CONSTRAINT "booking_record_commissions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_record_commissions" ADD CONSTRAINT "booking_record_commissions_booking_record_id_booking_records_id_fk" FOREIGN KEY ("booking_record_id") REFERENCES "public"."booking_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_record_commissions" ADD CONSTRAINT "booking_record_commissions_booking_line_id_booking_lines_id_fk" FOREIGN KEY ("booking_line_id") REFERENCES "public"."booking_lines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_record_commissions" ADD CONSTRAINT "booking_record_commissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_consumptions_canonical" ADD CONSTRAINT "booking_consumptions_canonical_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_consumptions_canonical" ADD CONSTRAINT "booking_consumptions_canonical_booking_record_id_booking_records_id_fk" FOREIGN KEY ("booking_record_id") REFERENCES "public"."booking_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_consumptions_canonical" ADD CONSTRAINT "booking_consumptions_canonical_booking_line_id_booking_lines_id_fk" FOREIGN KEY ("booking_line_id") REFERENCES "public"."booking_lines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_consumptions_canonical" ADD CONSTRAINT "booking_consumptions_canonical_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_records" ADD CONSTRAINT "booking_records_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_records" ADD CONSTRAINT "booking_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_records" ADD CONSTRAINT "booking_records_booking_ref_bookings_id_fk" FOREIGN KEY ("booking_ref") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_records" ADD CONSTRAINT "booking_records_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_records" ADD CONSTRAINT "booking_records_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_records" ADD CONSTRAINT "booking_records_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_timeline_events" ADD CONSTRAINT "booking_timeline_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_timeline_events" ADD CONSTRAINT "booking_timeline_events_booking_record_id_booking_records_id_fk" FOREIGN KEY ("booking_record_id") REFERENCES "public"."booking_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_timeline_events" ADD CONSTRAINT "booking_timeline_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_booking_ref_bookings_id_fk" FOREIGN KEY ("booking_ref") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_bookings" ADD CONSTRAINT "stay_bookings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_bookings" ADD CONSTRAINT "stay_bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stay_bookings" ADD CONSTRAINT "stay_bookings_booking_ref_bookings_id_fk" FOREIGN KEY ("booking_ref") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_booking_ref_bookings_id_fk" FOREIGN KEY ("booking_ref") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_legacy_service_id_services_id_fk" FOREIGN KEY ("legacy_service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_definitions" ADD CONSTRAINT "product_definitions_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_definitions" ADD CONSTRAINT "product_definitions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_unit_definitions" ADD CONSTRAINT "rental_unit_definitions_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_unit_definitions" ADD CONSTRAINT "rental_unit_definitions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_unit_definitions" ADD CONSTRAINT "rental_unit_definitions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_definitions" ADD CONSTRAINT "service_definitions_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_definitions" ADD CONSTRAINT "service_definitions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_stamps" ADD CONSTRAINT "loyalty_stamps_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_stamps" ADD CONSTRAINT "loyalty_stamps_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance" ADD CONSTRAINT "hr_attendance_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_attendance" ADD CONSTRAINT "hr_attendance_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_deductions" ADD CONSTRAINT "hr_deductions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_deductions" ADD CONSTRAINT "hr_deductions_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_deductions" ADD CONSTRAINT "hr_deductions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_documents" ADD CONSTRAINT "hr_employee_documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employee_documents" ADD CONSTRAINT "hr_employee_documents_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_employees" ADD CONSTRAINT "hr_employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_government_fees" ADD CONSTRAINT "hr_government_fees_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_government_fees" ADD CONSTRAINT "hr_government_fees_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leaves" ADD CONSTRAINT "hr_leaves_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leaves" ADD CONSTRAINT "hr_leaves_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_leaves" ADD CONSTRAINT "hr_leaves_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_loan_installments" ADD CONSTRAINT "hr_loan_installments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_loan_installments" ADD CONSTRAINT "hr_loan_installments_loan_id_hr_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."hr_loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_loan_installments" ADD CONSTRAINT "hr_loan_installments_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_loans" ADD CONSTRAINT "hr_loans_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_loans" ADD CONSTRAINT "hr_loans_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_loans" ADD CONSTRAINT "hr_loans_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_payroll" ADD CONSTRAINT "hr_payroll_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_payroll" ADD CONSTRAINT "hr_payroll_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_payroll_items" ADD CONSTRAINT "hr_payroll_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_payroll_items" ADD CONSTRAINT "hr_payroll_items_payroll_id_hr_payroll_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."hr_payroll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_payroll_items" ADD CONSTRAINT "hr_payroll_items_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_employee_id_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_performance_reviews" ADD CONSTRAINT "hr_performance_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_zkteco_devices" ADD CONSTRAINT "hr_zkteco_devices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_addons" ADD CONSTRAINT "org_addons_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_resource_addons" ADD CONSTRAINT "org_resource_addons_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_legal_settings" ADD CONSTRAINT "organization_legal_settings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ade_asset_id_idx" ON "asset_depreciation_entries" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "ade_org_date_idx" ON "asset_depreciation_entries" USING btree ("org_id","depreciation_date");--> statement-breakpoint
CREATE INDEX "bt_org_id_idx" ON "bank_transactions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "bt_org_account_idx" ON "bank_transactions" USING btree ("org_id","bank_account_id");--> statement-breakpoint
CREATE INDEX "bt_org_reconciled_idx" ON "bank_transactions" USING btree ("org_id","is_reconciled");--> statement-breakpoint
CREATE INDEX "bl_budget_id_idx" ON "budget_lines" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "bl_org_account_idx" ON "budget_lines" USING btree ("org_id","account_id");--> statement-breakpoint
CREATE INDEX "budgets_org_id_idx" ON "budgets" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cost_centers_org_code_idx" ON "cost_centers" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "cost_centers_org_id_idx" ON "cost_centers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "cost_centers_parent_id_idx" ON "cost_centers" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "fa_org_id_idx" ON "fixed_assets" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fa_org_status_idx" ON "fixed_assets" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "fa_org_code_idx" ON "fixed_assets" USING btree ("org_id","asset_code");--> statement-breakpoint
CREATE INDEX "pinv_org_id_idx" ON "purchase_invoices" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "pinv_org_status_idx" ON "purchase_invoices" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "pinv_vendor_id_idx" ON "purchase_invoices" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "ppay_org_id_idx" ON "purchase_payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ppay_invoice_id_idx" ON "purchase_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "vendors_org_id_idx" ON "vendors" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "media_galleries_org_idx" ON "media_galleries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "media_galleries_token_idx" ON "media_galleries" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_capabilities_unique_idx" ON "plan_capabilities" USING btree ("plan_code","capability_key");--> statement-breakpoint
CREATE INDEX "sme_org_type_idx" ON "salon_monitoring_events" USING btree ("org_id","event_type");--> statement-breakpoint
CREATE INDEX "sme_org_created_idx" ON "salon_monitoring_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_constraints_unique_idx" ON "user_constraints" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "user_constraints_org_idx" ON "user_constraints" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_admin_wa_messages_admin" ON "admin_wa_messages" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_admin_wa_messages_org" ON "admin_wa_messages" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_admin_wa_messages_created" ON "admin_wa_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_admin_wa_messages_category" ON "admin_wa_messages" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_admin_wa_messages_phone" ON "admin_wa_messages" USING btree ("recipient_phone");--> statement-breakpoint
CREATE UNIQUE INDEX "quota_usage_unique_idx" ON "quota_usage" USING btree ("org_id","metric_key","period");--> statement-breakpoint
CREATE INDEX "quota_usage_org_idx" ON "quota_usage" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "event_execution_tasks_org_idx" ON "event_execution_tasks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "event_execution_tasks_event_idx" ON "event_execution_tasks" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_execution_tasks_status_idx" ON "event_execution_tasks" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "event_quotation_items_quotation_idx" ON "event_quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "event_quotations_org_idx" ON "event_quotations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "event_quotations_status_idx" ON "event_quotations" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "settlement_org_idx" ON "merchant_settlements" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "settlement_status_idx" ON "merchant_settlements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_tx_org_idx" ON "payment_transactions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "payment_tx_invoice_idx" ON "payment_transactions" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_tx_booking_idx" ON "payment_transactions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payment_tx_moyasar_idx" ON "payment_transactions" USING btree ("moyasar_id");--> statement-breakpoint
CREATE INDEX "construction_co_org_id_idx" ON "construction_change_orders" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "construction_co_const_id_idx" ON "construction_change_orders" USING btree ("construction_id");--> statement-breakpoint
CREATE INDEX "construction_costs_org_id_idx" ON "construction_costs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "construction_costs_const_id_idx" ON "construction_costs" USING btree ("construction_id");--> statement-breakpoint
CREATE INDEX "construction_costs_phase_id_idx" ON "construction_costs" USING btree ("phase_id");--> statement-breakpoint
CREATE INDEX "construction_logs_org_id_idx" ON "construction_daily_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "construction_logs_const_id_idx" ON "construction_daily_logs" USING btree ("construction_id");--> statement-breakpoint
CREATE INDEX "construction_logs_date_idx" ON "construction_daily_logs" USING btree ("construction_id","log_date");--> statement-breakpoint
CREATE INDEX "construction_payments_org_id_idx" ON "construction_payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "construction_payments_const_id_idx" ON "construction_payments" USING btree ("construction_id");--> statement-breakpoint
CREATE INDEX "construction_phases_org_id_idx" ON "construction_phases" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "construction_phases_const_id_idx" ON "construction_phases" USING btree ("construction_id");--> statement-breakpoint
CREATE INDEX "lease_contracts_org_id_idx" ON "lease_contracts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "lease_contracts_org_status_idx" ON "lease_contracts" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "lease_contracts_unit_id_idx" ON "lease_contracts" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "lease_contracts_tenant_id_idx" ON "lease_contracts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "lease_contracts_org_ejar_idx" ON "lease_contracts" USING btree ("org_id","ejar_status");--> statement-breakpoint
CREATE INDEX "lease_invoices_org_id_idx" ON "lease_invoices" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "lease_invoices_contract_id_idx" ON "lease_invoices" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "lease_invoices_org_status_idx" ON "lease_invoices" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "lease_invoices_org_due_date_idx" ON "lease_invoices" USING btree ("org_id","due_date");--> statement-breakpoint
CREATE INDEX "lease_payments_org_id_idx" ON "lease_payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "lease_payments_contract_id_idx" ON "lease_payments" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "lease_payments_invoice_id_idx" ON "lease_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "lease_reminders_org_id_idx" ON "lease_reminders" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "lease_reminders_contract_id_idx" ON "lease_reminders" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "lease_reminders_org_status_idx" ON "lease_reminders" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "properties_org_id_idx" ON "properties" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "properties_org_type_idx" ON "properties" USING btree ("org_id","type");--> statement-breakpoint
CREATE INDEX "properties_org_active_idx" ON "properties" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "properties_org_portfolio_idx" ON "properties" USING btree ("org_id","portfolio_type");--> statement-breakpoint
CREATE INDEX "properties_org_disposal_idx" ON "properties" USING btree ("org_id","disposal_status");--> statement-breakpoint
CREATE INDEX "properties_owner_id_idx" ON "properties" USING btree ("property_owner_id");--> statement-breakpoint
CREATE INDEX "properties_org_rer_idx" ON "properties" USING btree ("org_id","rer_status");--> statement-breakpoint
CREATE INDEX "property_construction_org_id_idx" ON "property_construction" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "property_construction_property_idx" ON "property_construction" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_construction_status_idx" ON "property_construction" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "property_documents_org_id_idx" ON "property_documents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "property_documents_property_id_idx" ON "property_documents" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_documents_expiry_idx" ON "property_documents" USING btree ("org_id","expiry_date");--> statement-breakpoint
CREATE INDEX "property_expenses_org_id_idx" ON "property_expenses" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "property_expenses_property_id_idx" ON "property_expenses" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_expenses_org_category_idx" ON "property_expenses" USING btree ("org_id","category");--> statement-breakpoint
CREATE INDEX "property_inquiries_org_id_idx" ON "property_inquiries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "property_inquiries_listing_id_idx" ON "property_inquiries" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "property_inquiries_status_idx" ON "property_inquiries" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "property_inspections_org_id_idx" ON "property_inspections" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "property_inspections_unit_id_idx" ON "property_inspections" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "property_inspections_contract_id_idx" ON "property_inspections" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "property_listings_org_id_idx" ON "property_listings" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "property_listings_unit_id_idx" ON "property_listings" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "property_listings_status_idx" ON "property_listings" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "property_maintenance_org_id_idx" ON "property_maintenance" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "property_maintenance_property_id_idx" ON "property_maintenance" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_maintenance_org_status_idx" ON "property_maintenance" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "property_maintenance_org_priority_idx" ON "property_maintenance" USING btree ("org_id","priority");--> statement-breakpoint
CREATE INDEX "property_owners_org_id_idx" ON "property_owners" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "property_owners_org_active_idx" ON "property_owners" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "property_sales_org_id_idx" ON "property_sales" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "property_sales_property_id_idx" ON "property_sales" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_sales_status_idx" ON "property_sales" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "property_units_org_id_idx" ON "property_units" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "property_units_property_id_idx" ON "property_units" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "property_units_org_status_idx" ON "property_units" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "property_valuations_org_id_idx" ON "property_valuations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "property_valuations_property_id_idx" ON "property_valuations" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "tenants_org_id_idx" ON "tenants" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "tenants_org_customer_idx" ON "tenants" USING btree ("org_id","customer_id");--> statement-breakpoint
CREATE INDEX "appt_bookings_org_idx" ON "appointment_bookings" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "appt_bookings_customer_idx" ON "appointment_bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "appt_bookings_start_at_idx" ON "appointment_bookings" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "appt_bookings_ref_idx" ON "appointment_bookings" USING btree ("booking_ref");--> statement-breakpoint
CREATE INDEX "booking_line_addons_line_idx" ON "booking_line_addons" USING btree ("booking_line_id");--> statement-breakpoint
CREATE INDEX "booking_line_addons_ref_idx" ON "booking_line_addons" USING btree ("addon_ref_id");--> statement-breakpoint
CREATE INDEX "booking_lines_record_idx" ON "booking_lines" USING btree ("booking_record_id");--> statement-breakpoint
CREATE INDEX "booking_lines_item_ref_idx" ON "booking_lines" USING btree ("item_ref_id");--> statement-breakpoint
CREATE INDEX "booking_lines_service_ref_idx" ON "booking_lines" USING btree ("service_ref_id");--> statement-breakpoint
CREATE INDEX "booking_payment_links_record_idx" ON "booking_payment_links" USING btree ("booking_record_id");--> statement-breakpoint
CREATE INDEX "booking_payment_links_payment_idx" ON "booking_payment_links" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "booking_payment_links_org_idx" ON "booking_payment_links" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "booking_record_assignments_record_idx" ON "booking_record_assignments" USING btree ("booking_record_id");--> statement-breakpoint
CREATE INDEX "booking_record_assignments_user_idx" ON "booking_record_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "booking_record_assignments_org_idx" ON "booking_record_assignments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "booking_record_commissions_record_idx" ON "booking_record_commissions" USING btree ("booking_record_id");--> statement-breakpoint
CREATE INDEX "booking_record_commissions_line_idx" ON "booking_record_commissions" USING btree ("booking_line_id");--> statement-breakpoint
CREATE INDEX "booking_record_commissions_user_idx" ON "booking_record_commissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "booking_record_commissions_org_idx" ON "booking_record_commissions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "booking_consumptions_canonical_record_idx" ON "booking_consumptions_canonical" USING btree ("booking_record_id");--> statement-breakpoint
CREATE INDEX "booking_consumptions_canonical_line_idx" ON "booking_consumptions_canonical" USING btree ("booking_line_id");--> statement-breakpoint
CREATE INDEX "booking_consumptions_canonical_org_idx" ON "booking_consumptions_canonical" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "booking_consumptions_canonical_supply_idx" ON "booking_consumptions_canonical" USING btree ("supply_id");--> statement-breakpoint
CREATE INDEX "booking_records_org_idx" ON "booking_records" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "booking_records_customer_idx" ON "booking_records" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "booking_records_type_idx" ON "booking_records" USING btree ("booking_type");--> statement-breakpoint
CREATE INDEX "booking_records_status_idx" ON "booking_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_records_starts_at_idx" ON "booking_records" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "booking_records_ref_idx" ON "booking_records" USING btree ("booking_ref");--> statement-breakpoint
CREATE INDEX "booking_timeline_events_record_idx" ON "booking_timeline_events" USING btree ("booking_record_id");--> statement-breakpoint
CREATE INDEX "booking_timeline_events_org_idx" ON "booking_timeline_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "booking_timeline_events_type_idx" ON "booking_timeline_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "booking_timeline_events_created_idx" ON "booking_timeline_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "event_bookings_org_idx" ON "event_bookings" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "event_bookings_customer_idx" ON "event_bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "event_bookings_date_idx" ON "event_bookings" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "event_bookings_ref_idx" ON "event_bookings" USING btree ("booking_ref");--> statement-breakpoint
CREATE INDEX "stay_bookings_org_idx" ON "stay_bookings" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "stay_bookings_customer_idx" ON "stay_bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "stay_bookings_checkin_idx" ON "stay_bookings" USING btree ("check_in");--> statement-breakpoint
CREATE INDEX "stay_bookings_unit_idx" ON "stay_bookings" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "stay_bookings_ref_idx" ON "stay_bookings" USING btree ("booking_ref");--> statement-breakpoint
CREATE INDEX "table_res_org_idx" ON "table_reservations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "table_res_customer_idx" ON "table_reservations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "table_res_at_idx" ON "table_reservations" USING btree ("reserved_at");--> statement-breakpoint
CREATE INDEX "table_res_table_idx" ON "table_reservations" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "table_res_ref_idx" ON "table_reservations" USING btree ("booking_ref");--> statement-breakpoint
CREATE INDEX "catalog_items_org_idx" ON "catalog_items" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "catalog_items_type_idx" ON "catalog_items" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "catalog_items_category_idx" ON "catalog_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "catalog_items_legacy_idx" ON "catalog_items" USING btree ("legacy_service_id");--> statement-breakpoint
CREATE INDEX "prod_def_org_idx" ON "product_definitions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "prod_def_sku_idx" ON "product_definitions" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "rental_def_org_idx" ON "rental_unit_definitions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "rental_def_type_idx" ON "rental_unit_definitions" USING btree ("unit_type");--> statement-breakpoint
CREATE INDEX "svc_def_org_idx" ON "service_definitions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "access_logs_org_idx" ON "access_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "access_logs_accessed_at_idx" ON "access_logs" USING btree ("org_id","accessed_at");--> statement-breakpoint
CREATE INDEX "access_logs_customer_idx" ON "access_logs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "work_orders_org_idx" ON "work_orders" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "work_orders_status_idx" ON "work_orders" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "work_orders_number_idx" ON "work_orders" USING btree ("org_id","order_number");--> statement-breakpoint
CREATE INDEX "work_orders_customer_idx" ON "work_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "work_orders_assigned_idx" ON "work_orders" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_stamps_org_customer_idx" ON "loyalty_stamps" USING btree ("org_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_att_emp_date_idx" ON "hr_attendance" USING btree ("org_id","employee_id","attendance_date");--> statement-breakpoint
CREATE INDEX "hr_att_org_date_idx" ON "hr_attendance" USING btree ("org_id","attendance_date");--> statement-breakpoint
CREATE INDEX "hr_docs_emp_idx" ON "hr_employee_documents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "hr_docs_expiry_idx2" ON "hr_employee_documents" USING btree ("expiry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_emp_org_number_idx" ON "hr_employees" USING btree ("org_id","employee_number");--> statement-breakpoint
CREATE INDEX "hr_emp_org_status_idx" ON "hr_employees" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "hr_gov_fees_due_idx2" ON "hr_government_fees" USING btree ("org_id","due_date","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_lb_emp_year_type_idx" ON "hr_leave_balances" USING btree ("org_id","employee_id","year","leave_type");--> statement-breakpoint
CREATE INDEX "hr_leaves_emp_idx" ON "hr_leaves" USING btree ("employee_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_loans_org_number_idx" ON "hr_loans" USING btree ("org_id","loan_number");--> statement-breakpoint
CREATE INDEX "hr_loans_emp_idx" ON "hr_loans" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_payroll_org_number_idx" ON "hr_payroll" USING btree ("org_id","payroll_number");--> statement-breakpoint
CREATE INDEX "hr_payroll_month_idx2" ON "hr_payroll" USING btree ("org_id","payroll_month");--> statement-breakpoint
CREATE INDEX "hr_pi_payroll_idx" ON "hr_payroll_items" USING btree ("payroll_id");--> statement-breakpoint
CREATE INDEX "hr_pi_emp_idx" ON "hr_payroll_items" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hr_zkteco_org_device_idx" ON "hr_zkteco_devices" USING btree ("org_id","device_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_requests_org_id" ON "privacy_requests" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_requests_status" ON "privacy_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_security_incidents_org_id" ON "security_incidents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_security_incidents_severity" ON "security_incidents" USING btree ("severity");--> statement-breakpoint
ALTER TABLE "service_components" ADD CONSTRAINT "service_components_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_chart_of_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("chart_of_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_commissions" ADD CONSTRAINT "vendor_commissions_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payouts" ADD CONSTRAINT "vendor_payouts_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_period_id_accounting_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."accounting_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversed_by_users_id_fk" FOREIGN KEY ("reversed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_branch_id_locations_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "otp_codes_email_idx" ON "otp_codes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "jel_cost_center_idx" ON "journal_entry_lines" USING btree ("cost_center_id");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_referral_code_unique" UNIQUE("referral_code");