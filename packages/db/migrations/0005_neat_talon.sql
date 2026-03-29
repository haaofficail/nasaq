CREATE TYPE "public"."question_type" AS ENUM('text', 'textarea', 'select', 'multi', 'checkbox', 'number', 'date', 'location', 'file', 'image');--> statement-breakpoint
CREATE TYPE "public"."commission_type_enum" AS ENUM('percentage', 'fixed_per_order', 'tiered');--> statement-breakpoint
CREATE TYPE "public"."delivery_assigned_to_type" AS ENUM('member', 'partner');--> statement-breakpoint
CREATE TYPE "public"."delivery_commission_type" AS ENUM('percentage', 'fixed_per_order', 'flat_monthly');--> statement-breakpoint
CREATE TYPE "public"."delivery_partner_type" AS ENUM('company', 'individual');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('internal', 'freelance', 'outsourced');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'inactive', 'suspended', 'pending');--> statement-breakpoint
CREATE TYPE "public"."system_role" AS ENUM('owner', 'manager', 'provider', 'employee', 'reception');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'sold_out', 'ongoing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."seat_status" AS ENUM('available', 'reserved', 'sold', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."ticket_issuance_status" AS ENUM('issued', 'checked_in', 'cancelled', 'transferred');--> statement-breakpoint
CREATE TYPE "public"."ticket_type_status" AS ENUM('active', 'paused', 'sold_out');--> statement-breakpoint
CREATE TYPE "public"."gr_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."po_status" AS ENUM('draft', 'submitted', 'acknowledged', 'partially_received', 'received', 'cancelled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."supplier_invoice_status" AS ENUM('draft', 'received', 'matched', 'approved', 'paid', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('active', 'inactive', 'blacklisted');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('auto', 'manual', 'scheduled', 'broadcast');--> statement-breakpoint
CREATE TYPE "public"."behavior_incident_degree" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TYPE "public"."counseling_session_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."counseling_session_type" AS ENUM('individual', 'group', 'guardian');--> statement-breakpoint
CREATE TYPE "public"."school_case_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."school_case_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."school_day_of_week" AS ENUM('sun', 'mon', 'tue', 'wed', 'thu');--> statement-breakpoint
CREATE TYPE "public"."school_event_type" AS ENUM('holiday', 'national_day', 'exam', 'activity', 'other');--> statement-breakpoint
CREATE TYPE "public"."school_import_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."school_session_type" AS ENUM('summer', 'winter');--> statement-breakpoint
CREATE TYPE "public"."school_staff_type" AS ENUM('principal', 'vice_principal', 'counselor', 'teacher', 'admin_staff');--> statement-breakpoint
CREATE TYPE "public"."student_attendance_status" AS ENUM('present', 'absent', 'late', 'excused');--> statement-breakpoint
CREATE TYPE "public"."student_referral_status" AS ENUM('pending', 'assigned', 'in_progress', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."student_referral_type" AS ENUM('counselor', 'vice_principal', 'medical');--> statement-breakpoint
CREATE TYPE "public"."student_referral_urgency" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."teacher_engagement_level" AS ENUM('low', 'normal', 'high');--> statement-breakpoint
CREATE TYPE "public"."teacher_follow_up_by" AS ENUM('counselor', 'vice_principal', 'guardian');--> statement-breakpoint
CREATE TYPE "public"."teacher_note_type" AS ENUM('academic', 'behavioral', 'social', 'other');--> statement-breakpoint
CREATE TYPE "public"."teacher_prep_status" AS ENUM('draft', 'ready', 'done');--> statement-breakpoint
ALTER TYPE "public"."subscription_plan" ADD VALUE 'free' BEFORE 'basic';--> statement-breakpoint
CREATE TABLE "business_vocabulary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"business_type" text,
	"term_key" text NOT NULL,
	"value_ar" text NOT NULL,
	"value_en" text,
	"context" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_capability_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"capability_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"reason" text,
	"set_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"question" text NOT NULL,
	"type" "question_type" DEFAULT 'text' NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb,
	"is_paid" boolean DEFAULT false NOT NULL,
	"price" numeric(10, 2) DEFAULT '0',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"commission_mode" text DEFAULT 'inherit' NOT NULL,
	"commission_value" numeric(10, 2) DEFAULT '0',
	"custom_duration_minutes" integer,
	"custom_price" numeric(10, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"service_id" uuid,
	"name" text NOT NULL,
	"price" numeric,
	"interval" text,
	"max_usage" integer,
	"current_usage" integer DEFAULT 0,
	"start_date" date,
	"next_billing_date" date,
	"next_booking_date" date,
	"auto_book" boolean DEFAULT false,
	"preferred_day" integer,
	"preferred_time" text,
	"preferred_provider_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"booking_item_id" uuid,
	"user_id" uuid NOT NULL,
	"service_id" uuid,
	"commission_mode" text DEFAULT 'percentage' NOT NULL,
	"rate" numeric(10, 2) DEFAULT '0' NOT NULL,
	"base_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"commission_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_consumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"booking_item_id" uuid,
	"supply_id" uuid,
	"inventory_item_id" uuid,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" text,
	"consumed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" uuid,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" text DEFAULT 'cash' NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"reference" text,
	"transfer_name" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"from_location_type" text,
	"from_location_id" uuid,
	"from_assigned_user_id" uuid,
	"from_customer_id" uuid,
	"to_location_type" text NOT NULL,
	"to_location_id" uuid,
	"to_assigned_user_id" uuid,
	"to_customer_id" uuid,
	"to_booking_id" uuid,
	"reason" text,
	"notes" text,
	"moved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"thumbnail" text,
	"category" text DEFAULT 'all',
	"is_premium" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"integration_id" uuid,
	"direction" text NOT NULL,
	"endpoint" text,
	"method" text,
	"request_body" jsonb,
	"response_body" jsonb,
	"status_code" integer,
	"duration_ms" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"credentials" jsonb DEFAULT '{}'::jsonb,
	"config" jsonb DEFAULT '{}'::jsonb,
	"webhook_url" text,
	"webhook_secret" text,
	"last_synced_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label_ar" text NOT NULL,
	"label_en" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"requires" text[],
	"is_premium" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_beauty_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"hair_type" text,
	"hair_texture" text,
	"hair_condition" text,
	"natural_color" text,
	"current_color" text,
	"skin_type" text,
	"skin_concerns" text,
	"allergies" text,
	"sensitivities" text,
	"medical_notes" text,
	"preferred_staff_id" uuid,
	"preferences" text,
	"avoid_notes" text,
	"last_formula" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salon_supplies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"unit" text DEFAULT 'piece' NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '0' NOT NULL,
	"min_quantity" numeric(10, 2) DEFAULT '0' NOT NULL,
	"cost_per_unit" numeric(10, 2),
	"supplier_id" uuid,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salon_supply_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"delta" numeric(10, 2) NOT NULL,
	"reason" text DEFAULT 'manual' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_supply_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "visit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"staff_id" uuid,
	"service_id" uuid,
	"formula" text,
	"products_used" text,
	"processing_time" integer,
	"technique" text,
	"result_notes" text,
	"private_notes" text,
	"recommended_products" text,
	"next_visit_in" integer,
	"next_visit_date" date,
	"before_photo_url" text,
	"after_photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"assigned_to_type" "delivery_assigned_to_type" NOT NULL,
	"assigned_to_id" uuid NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"picked_up_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"delivery_fee" numeric(10, 2) DEFAULT '0',
	"driver_share" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"proof_of_delivery" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "delivery_partner_type" DEFAULT 'company' NOT NULL,
	"contact_phone" text,
	"commission_type" "delivery_commission_type" DEFAULT 'fixed_per_order' NOT NULL,
	"commission_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_title_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"job_title_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	"allowed" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"system_role" "system_role" NOT NULL,
	"description" text,
	"color" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"job_title_id" uuid,
	"branch_id" uuid,
	"employment_type" "employment_type" DEFAULT 'internal' NOT NULL,
	"salary" numeric(10, 2),
	"commission_rate" numeric(5, 2),
	"commission_type" "commission_type_enum",
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"hired_at" timestamp with time zone,
	"contract_end" timestamp with time zone,
	"phone" text,
	"emergency_contact" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"priority" text DEFAULT 'normal',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"type" text NOT NULL,
	"label" text,
	"file_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"type" text DEFAULT 'info',
	"target_plan" text,
	"is_active" boolean DEFAULT true,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"opened_by" uuid,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"category" text DEFAULT 'general',
	"priority" text DEFAULT 'normal',
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" uuid,
	"resolved_at" timestamp with time zone,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_health_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_latency_ms" integer,
	"db_latency_ms" integer,
	"error_rate" numeric(5, 2),
	"active_orgs" integer,
	"active_sessions" integer,
	"notes" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"price_monthly" numeric(10, 2) DEFAULT '0',
	"price_yearly" numeric(10, 2) DEFAULT '0',
	"currency" text DEFAULT 'SAR',
	"trial_days" integer DEFAULT 14,
	"max_users" integer DEFAULT 5,
	"max_locations" integer DEFAULT 1,
	"features" jsonb DEFAULT '[]'::jsonb,
	"capabilities" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "add_ons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"description_ar" text,
	"type" text NOT NULL,
	"target_feature" text,
	"target_quota" text,
	"quota_increment" integer DEFAULT 0,
	"price_monthly" numeric(10, 2) DEFAULT '0',
	"price_yearly" numeric(10, 2) DEFAULT '0',
	"price_one_time" numeric(10, 2) DEFAULT '0',
	"billing_cycle" text DEFAULT 'monthly',
	"is_free" boolean DEFAULT false,
	"is_recurring" boolean DEFAULT true,
	"max_quantity" integer DEFAULT 99,
	"allowed_plans" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "add_ons_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "billing_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"billing_mode" text DEFAULT 'standard' NOT NULL,
	"custom_price_monthly" numeric(10, 2),
	"custom_price_yearly" numeric(10, 2),
	"billing_cycle" text,
	"payment_terms" text,
	"invoice_notes" text,
	"contract_start" timestamp with time zone,
	"contract_end" timestamp with time zone,
	"is_billing_paused" boolean DEFAULT false,
	"reason" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"target_scope" text NOT NULL,
	"target_id" text,
	"billing_cycle" text DEFAULT 'all',
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_permanent" boolean DEFAULT false,
	"is_stackable" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feature_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"icon" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "features_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text,
	"name_ar" text NOT NULL,
	"name_en" text,
	"description_ar" text,
	"type" text DEFAULT 'toggle',
	"icon" text,
	"is_core" boolean DEFAULT false,
	"is_premium" boolean DEFAULT false,
	"is_enterprise" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plan_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" text NOT NULL,
	"feature_id" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"config" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "plan_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" text NOT NULL,
	"quota_id" text NOT NULL,
	"value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"applied_by" uuid,
	"applied_at" timestamp with time zone DEFAULT now(),
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description_ar" text,
	"internal_key" text,
	"type" text NOT NULL,
	"value" numeric(10, 2) DEFAULT '0',
	"coupon_code" text,
	"is_automatic" boolean DEFAULT false,
	"priority" integer DEFAULT 0,
	"is_stackable" boolean DEFAULT false,
	"target_plans" jsonb DEFAULT '[]'::jsonb,
	"billing_cycle" text,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"free_features" jsonb DEFAULT '[]'::jsonb,
	"free_period_days" integer DEFAULT 0,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "promotions_internal_key_unique" UNIQUE("internal_key"),
	CONSTRAINT "promotions_coupon_code_unique" UNIQUE("coupon_code")
);
--> statement-breakpoint
CREATE TABLE "quotas_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"unit_ar" text,
	"description_ar" text,
	"default_value" integer DEFAULT 0,
	"hard_cap" integer,
	"soft_limit" boolean DEFAULT false,
	"overage_policy" text DEFAULT 'block',
	"overage_price" numeric(10, 2),
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "rule_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger" text NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb,
	"actions" jsonb DEFAULT '[]'::jsonb,
	"priority" integer DEFAULT 0,
	"scope" text DEFAULT 'global',
	"target_id" text,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_add_ons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"add_on_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1,
	"price_override" numeric(10, 2),
	"is_free" boolean DEFAULT false,
	"granted_by" uuid,
	"starts_at" timestamp with time zone DEFAULT now(),
	"ends_at" timestamp with time zone,
	"is_permanent" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_feature_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"feature_id" text NOT NULL,
	"enabled" boolean NOT NULL,
	"reason" text,
	"granted_by" uuid,
	"starts_at" timestamp with time zone DEFAULT now(),
	"ends_at" timestamp with time zone,
	"is_permanent" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"type" text NOT NULL,
	"target_id" text,
	"value" jsonb DEFAULT '{}'::jsonb,
	"name_ar" text NOT NULL,
	"reason" text NOT NULL,
	"granted_by" uuid,
	"starts_at" timestamp with time zone DEFAULT now(),
	"ends_at" timestamp with time zone,
	"is_permanent" boolean DEFAULT false,
	"billing_effect" text DEFAULT 'free',
	"is_active" boolean DEFAULT true,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revoke_reason" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_quota_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"quota_id" text NOT NULL,
	"value" integer NOT NULL,
	"reason" text,
	"granted_by" uuid,
	"starts_at" timestamp with time zone DEFAULT now(),
	"ends_at" timestamp with time zone,
	"is_permanent" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "org_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"template_id" uuid,
	"category_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"icon" text DEFAULT 'Bell',
	"color" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"due_date" date NOT NULL,
	"remind_before_days" jsonb DEFAULT '[30,7,1]'::jsonb,
	"is_recurring" boolean DEFAULT false,
	"recurrence" text,
	"recurrence_interval" integer,
	"recurrence_end_date" date,
	"next_occurrence" date,
	"status" text DEFAULT 'upcoming',
	"completed_at" timestamp with time zone,
	"completed_by" uuid,
	"snoozed_until" date,
	"linked_type" text,
	"linked_id" uuid,
	"linked_label" text,
	"extra_data" jsonb DEFAULT '{}'::jsonb,
	"notification_channels" jsonb DEFAULT '["dashboard"]'::jsonb,
	"notifications_log" jsonb DEFAULT '[]'::jsonb,
	"priority" text DEFAULT 'medium',
	"created_by_type" text DEFAULT 'system',
	"created_by" uuid,
	"notes" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminder_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"name" text NOT NULL,
	"name_en" text,
	"icon" text DEFAULT 'Bell',
	"color" text DEFAULT '#5b9bd5',
	"sort_order" integer DEFAULT 0,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminder_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"category_id" uuid,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"icon" text DEFAULT 'Bell',
	"color" text,
	"default_title" text,
	"default_description" text,
	"default_remind_before_days" jsonb DEFAULT '[30,7,1]'::jsonb,
	"default_recurrence" text,
	"default_channels" jsonb DEFAULT '["dashboard"]'::jsonb,
	"sms_template" text,
	"email_subject_template" text,
	"email_body_template" text,
	"extra_fields" jsonb,
	"available_variables" jsonb DEFAULT '["org_name","due_date","title","days_remaining"]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"applicable_to" jsonb DEFAULT '["all"]'::jsonb,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"location_id" uuid,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"cover_image" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"doors_open_at" timestamp with time zone,
	"venue_name" text,
	"venue_address" text,
	"venue_city" text,
	"venue_map_url" text,
	"total_capacity" integer,
	"sold_tickets" integer DEFAULT 0 NOT NULL,
	"reserved_tickets" integer DEFAULT 0 NOT NULL,
	"min_price" numeric(10, 2),
	"max_price" numeric(10, 2),
	"has_seating" boolean DEFAULT false,
	"allow_transfer" boolean DEFAULT false,
	"requires_approval" boolean DEFAULT false,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"age_restriction" integer,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seat_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"color" text,
	"row_count" integer,
	"seats_per_row" integer,
	"total_seats" integer,
	"sort_order" integer DEFAULT 0,
	"position_x" numeric(8, 2),
	"position_y" numeric(8, 2),
	"width" numeric(8, 2),
	"height" numeric(8, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"row" text NOT NULL,
	"number" integer NOT NULL,
	"label" text,
	"status" "seat_status" DEFAULT 'available' NOT NULL,
	"held_until" timestamp with time zone,
	"held_by_customer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_issuances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"ticket_type_id" uuid NOT NULL,
	"booking_id" uuid,
	"customer_id" uuid,
	"seat_id" uuid,
	"ticket_number" text NOT NULL,
	"qr_code" text NOT NULL,
	"barcode" text,
	"attendee_name" text,
	"attendee_phone" text,
	"attendee_email" text,
	"paid_price" numeric(10, 2) NOT NULL,
	"vat_amount" numeric(10, 2) DEFAULT '0',
	"checked_in_at" timestamp with time zone,
	"checked_in_by" uuid,
	"transferred_from_id" uuid,
	"transferred_at" timestamp with time zone,
	"status" "ticket_issuance_status" DEFAULT 'issued' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"event_id_new" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"total_quantity" integer NOT NULL,
	"sold_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"max_per_order" integer DEFAULT 10,
	"min_per_order" integer DEFAULT 1,
	"sale_starts_at" timestamp with time zone,
	"sale_ends_at" timestamp with time zone,
	"seat_section_id" uuid,
	"sort_order" integer DEFAULT 0,
	"status" "ticket_type_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gr_id" uuid NOT NULL,
	"po_item_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"received_quantity" numeric(10, 3) NOT NULL,
	"accepted_quantity" numeric(10, 3) NOT NULL,
	"rejected_quantity" numeric(10, 3) DEFAULT '0',
	"rejection_reason" text,
	"quality_notes" text,
	"expiry_date" timestamp with time zone,
	"stock_updated" boolean DEFAULT false,
	"line_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"po_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"location_id" uuid,
	"gr_number" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"received_by" uuid NOT NULL,
	"notes" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"status" "gr_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"item_code" text,
	"item_description" text,
	"category" text,
	"unit" text DEFAULT 'unit',
	"ordered_quantity" numeric(10, 3) NOT NULL,
	"received_quantity" numeric(10, 3) DEFAULT '0',
	"unit_price" numeric(10, 2) NOT NULL,
	"discount" numeric(5, 2) DEFAULT '0',
	"total_price" numeric(15, 2) NOT NULL,
	"asset_type_id" uuid,
	"flower_variant_id" uuid,
	"supply_item_id" uuid,
	"notes" text,
	"line_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"location_id" uuid,
	"po_number" text NOT NULL,
	"reference_number" text,
	"order_date" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_delivery" timestamp with time zone,
	"actual_delivery" timestamp with time zone,
	"subtotal" numeric(15, 2) NOT NULL,
	"vat_amount" numeric(15, 2) DEFAULT '0',
	"discount_amount" numeric(15, 2) DEFAULT '0',
	"total_amount" numeric(15, 2) NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0',
	"currency" text DEFAULT 'SAR',
	"delivery_address" text,
	"delivery_notes" text,
	"notes" text,
	"internal_notes" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"status" "po_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"po_id" uuid,
	"gr_id" uuid,
	"invoice_number" text NOT NULL,
	"invoice_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone,
	"subtotal" numeric(15, 2) NOT NULL,
	"vat_amount" numeric(15, 2) DEFAULT '0',
	"total_amount" numeric(15, 2) NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0',
	"currency" text DEFAULT 'SAR',
	"notes" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"status" "supplier_invoice_status" DEFAULT 'received' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"code" text,
	"contact_name" text,
	"phone" text,
	"email" text,
	"website" text,
	"address" text,
	"city" text,
	"country" text DEFAULT 'SA',
	"tax_number" text,
	"bank_name" text,
	"bank_iban" text,
	"currency" text DEFAULT 'SAR',
	"payment_terms_days" integer DEFAULT 30,
	"total_orders" integer DEFAULT 0,
	"total_spent" numeric(15, 2) DEFAULT '0',
	"avg_delivery_days" numeric(5, 1),
	"quality_score" numeric(3, 1),
	"on_time_rate" numeric(5, 2),
	"categories" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"status" "supplier_status" DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"addon_key" text NOT NULL,
	"addon_name" text NOT NULL,
	"price" text DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now(),
	"deactivated_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"order_type" text NOT NULL,
	"item_key" text NOT NULL,
	"item_name" text NOT NULL,
	"price" integer DEFAULT 0,
	"status" text DEFAULT 'pending_payment',
	"payment_ref" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"subscription_number" text,
	"plan_key" text NOT NULL,
	"plan_name" text NOT NULL,
	"plan_price" integer DEFAULT 0,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"status" text DEFAULT 'active',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_subscription_number_unique" UNIQUE("subscription_number")
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"type" "notification_type" DEFAULT 'auto' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"platform" text DEFAULT 'web',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduled_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"service_id" uuid,
	"booking_id" uuid,
	"location_id" uuid,
	"asset_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'cleaning' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_to_id" uuid,
	"assigned_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"notes" text,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cost_amount" numeric(10, 2),
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "behavior_compensations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"compensation_date" date DEFAULT CURRENT_DATE NOT NULL,
	"compensation_type" text NOT NULL,
	"description" text,
	"points_added" integer DEFAULT 5 NOT NULL,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "behavior_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"category_id" uuid,
	"incident_date" date DEFAULT CURRENT_DATE NOT NULL,
	"degree" "behavior_incident_degree" DEFAULT '1' NOT NULL,
	"violation_code" text,
	"description" text,
	"deduction_points" integer DEFAULT 0 NOT NULL,
	"action_taken" text,
	"guardian_notified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"grade" text NOT NULL,
	"name" text NOT NULL,
	"capacity" integer,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counseling_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"counselor_user_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"case_id" uuid,
	"referral_id" uuid,
	"session_date" date NOT NULL,
	"session_type" "counseling_session_type" NOT NULL,
	"duration_minutes" integer,
	"session_notes" text,
	"action_plan" text,
	"next_session_date" date,
	"status" "counseling_session_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"stage" text DEFAULT 'متوسط' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardian_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"incident_id" uuid,
	"notification_date" date DEFAULT CURRENT_DATE NOT NULL,
	"notification_type" text NOT NULL,
	"message" text,
	"sent_to" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"sent_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"week_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"class_room_id" uuid NOT NULL,
	"teacher_id" uuid,
	"day_of_week" "school_day_of_week" NOT NULL,
	"subject" text NOT NULL,
	"teacher_late_minutes" integer DEFAULT 0 NOT NULL,
	"teacher_arrived_at" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"template_id" uuid,
	"semester_id" uuid,
	"week_number" integer NOT NULL,
	"label" text,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_case_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"description" text NOT NULL,
	"action_taken" text,
	"result" text,
	"done_by" text,
	"done_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"student_id" uuid,
	"class_room_id" uuid,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"status" "school_case_status" DEFAULT 'open' NOT NULL,
	"priority" "school_case_priority" DEFAULT 'normal' NOT NULL,
	"assigned_to" text,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"semester_id" uuid,
	"title" text NOT NULL,
	"event_type" "school_event_type" DEFAULT 'other' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"description" text,
	"color" text,
	"affects_attendance" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_import_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"import_type" text NOT NULL,
	"status" "school_import_status" DEFAULT 'pending' NOT NULL,
	"file_name" text,
	"file_url" text,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"skipped_rows" integer DEFAULT 0 NOT NULL,
	"error_rows" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"year_label" text NOT NULL,
	"semester_number" integer NOT NULL,
	"label" text,
	"start_date" date,
	"end_date" date,
	"is_active" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"school_name" text NOT NULL,
	"school_logo_url" text,
	"school_address" text,
	"school_phone" text,
	"school_email" text,
	"school_region" text,
	"school_type" text,
	"education_level" text,
	"school_gender" text,
	"setup_status" text DEFAULT 'not_started' NOT NULL,
	"setup_step" integer DEFAULT 0 NOT NULL,
	"active_week_id" uuid,
	"session_start_time" text DEFAULT '07:30',
	"session_end_time" text DEFAULT '14:30',
	"period_duration_minutes" integer DEFAULT 45,
	"break_duration_minutes" integer DEFAULT 30,
	"number_of_periods" integer DEFAULT 7,
	"session_type" text DEFAULT 'winter',
	"notification_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_staff_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"staff_type" "school_staff_type" NOT NULL,
	"teacher_profile_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_standby_activations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"activation_date" date NOT NULL,
	"absent_teacher_id" uuid,
	"standby_teacher_id" uuid NOT NULL,
	"class_room_id" uuid,
	"subject" text NOT NULL,
	"period_label" text,
	"start_time" text,
	"end_time" text,
	"notes" text,
	"notified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_timetable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"class_room_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"period_number" integer NOT NULL,
	"subject" text,
	"teacher_id" uuid,
	"start_time" text,
	"end_time" text,
	"is_break" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_violation_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"severity" text DEFAULT 'medium' NOT NULL,
	"default_degree" text DEFAULT '1' NOT NULL,
	"color" text DEFAULT '#f59e0b' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_violations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"category_id" uuid,
	"description" text,
	"degree" text DEFAULT '1' NOT NULL,
	"violation_date" date DEFAULT CURRENT_DATE NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_whatsapp_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"student_id" uuid,
	"teacher_id" uuid,
	"recipient" text NOT NULL,
	"event_type" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"ref_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"class_room_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"status" "student_attendance_status" DEFAULT 'present' NOT NULL,
	"late_minutes" integer,
	"notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_behavior_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"academic_year" text DEFAULT to_char(CURRENT_DATE, 'YYYY') NOT NULL,
	"behavior_score" integer DEFAULT 80 NOT NULL,
	"attendance_score" integer DEFAULT 100 NOT NULL,
	"total_score" integer DEFAULT 90 NOT NULL,
	"last_calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"referred_by_user_id" uuid NOT NULL,
	"referral_date" date NOT NULL,
	"referral_type" "student_referral_type" NOT NULL,
	"reason" text NOT NULL,
	"urgency" "student_referral_urgency" DEFAULT 'normal' NOT NULL,
	"status" "student_referral_status" DEFAULT 'pending' NOT NULL,
	"assigned_to_user_id" uuid,
	"assigned_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"case_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"from_class_id" uuid,
	"to_class_id" uuid NOT NULL,
	"reason" text,
	"transferred_by" uuid,
	"transferred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"class_room_id" uuid,
	"full_name" text NOT NULL,
	"student_number" text,
	"national_id" text,
	"grade" text,
	"birth_date" date,
	"gender" text,
	"guardian_name" text,
	"guardian_phone" text,
	"guardian_relation" text,
	"address" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_grade_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"grade_level_id" uuid NOT NULL,
	"weekly_hours" integer DEFAULT 4 NOT NULL,
	"weekly_periods" integer DEFAULT 4,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"type" text DEFAULT 'core' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"class_room_id" uuid,
	"attendance_date" date NOT NULL,
	"status" text DEFAULT 'absent' NOT NULL,
	"period_number" integer,
	"notes" text,
	"recorded_by" uuid,
	"notified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_class_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"class_room_id" uuid,
	"grade" text,
	"stage" text,
	"subject" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_daily_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"teacher_profile_id" uuid NOT NULL,
	"class_room_id" uuid NOT NULL,
	"schedule_entry_id" uuid,
	"date" date NOT NULL,
	"period_id" uuid,
	"subject_id" uuid NOT NULL,
	"topic_covered" text NOT NULL,
	"notes" text,
	"student_engagement" "teacher_engagement_level" DEFAULT 'normal' NOT NULL,
	"students_absent" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_preparations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"teacher_profile_id" uuid NOT NULL,
	"class_room_id" uuid NOT NULL,
	"week_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"day_of_week" "school_day_of_week" NOT NULL,
	"subject_id" uuid NOT NULL,
	"preparation_text" text,
	"learning_objectives" text,
	"resources" text,
	"status" "teacher_prep_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"employee_number" text,
	"subject" text,
	"phone" text,
	"email" text,
	"national_id" text,
	"date_of_birth_hijri" text,
	"gender" text,
	"qualification" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_student_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"teacher_profile_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"class_room_id" uuid NOT NULL,
	"note_date" date NOT NULL,
	"note_type" "teacher_note_type" NOT NULL,
	"note" text NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"requires_follow_up" boolean DEFAULT false NOT NULL,
	"follow_up_by" "teacher_follow_up_by",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_template_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"period_number" integer NOT NULL,
	"label" text,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_break" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"session_type" "school_session_type" DEFAULT 'winter' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_org_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_org_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "org_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "org_code" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "booking_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "operating_profile" text DEFAULT 'general';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "service_delivery_modes" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "enabled_capabilities" jsonb DEFAULT '["bookings","customers","catalog","media"]'::jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "dashboard_profile" text DEFAULT 'default';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "suspend_reason" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "account_manager_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "favicon" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "favicon_files" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_super_admin" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nasaq_role" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_ip" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "login_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "service_media" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "service_type" text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "service_pricing_mode" text DEFAULT 'fixed' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "assignment_mode" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "is_bookable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "is_visible_in_pos" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "is_visible_online" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "buffer_before_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "buffer_after_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "has_delivery" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "allows_pickup" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "allows_in_venue" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "delivery_cost" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "amenities" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "barcode" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_items" ADD COLUMN "service_type" text;--> statement-breakpoint
ALTER TABLE "booking_items" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "booking_items" ADD COLUMN "vat_inclusive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "question_answers" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "buyer_company_name" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "buyer_cr_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "source_type" text DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "parent_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "split_type" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "split_index" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "split_total" integer;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "location_type" text DEFAULT 'warehouse' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "assigned_to_user_id" uuid;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "rented_to_customer_id" uuid;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "rental_booking_id" uuid;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "is_movable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "is_rentable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_profiles" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "site_config" ADD COLUMN "builder_config" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "site_config" ADD COLUMN "is_published" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "site_pages" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_vocabulary" ADD CONSTRAINT "business_vocabulary_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_capability_overrides" ADD CONSTRAINT "organization_capability_overrides_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_questions" ADD CONSTRAINT "service_questions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_questions" ADD CONSTRAINT "service_questions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_subscriptions" ADD CONSTRAINT "customer_subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_assignments" ADD CONSTRAINT "booking_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_commissions" ADD CONSTRAINT "booking_commissions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_commissions" ADD CONSTRAINT "booking_commissions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_commissions" ADD CONSTRAINT "booking_commissions_booking_item_id_booking_items_id_fk" FOREIGN KEY ("booking_item_id") REFERENCES "public"."booking_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_commissions" ADD CONSTRAINT "booking_commissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_commissions" ADD CONSTRAINT "booking_commissions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_consumptions" ADD CONSTRAINT "booking_consumptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_consumptions" ADD CONSTRAINT "booking_consumptions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_consumptions" ADD CONSTRAINT "booking_consumptions_booking_item_id_booking_items_id_fk" FOREIGN KEY ("booking_item_id") REFERENCES "public"."booking_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_consumptions" ADD CONSTRAINT "booking_consumptions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_from_assigned_user_id_users_id_fk" FOREIGN KEY ("from_assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_to_assigned_user_id_users_id_fk" FOREIGN KEY ("to_assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_moved_by_users_id_fk" FOREIGN KEY ("moved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_beauty_profiles" ADD CONSTRAINT "client_beauty_profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_beauty_profiles" ADD CONSTRAINT "client_beauty_profiles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salon_supplies" ADD CONSTRAINT "salon_supplies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salon_supply_adjustments" ADD CONSTRAINT "salon_supply_adjustments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salon_supply_adjustments" ADD CONSTRAINT "salon_supply_adjustments_supply_id_salon_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."salon_supplies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_supply_recipes" ADD CONSTRAINT "service_supply_recipes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_supply_recipes" ADD CONSTRAINT "service_supply_recipes_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_supply_recipes" ADD CONSTRAINT "service_supply_recipes_supply_id_salon_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."salon_supplies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_partners" ADD CONSTRAINT "delivery_partners_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_title_permissions" ADD CONSTRAINT "job_title_permissions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_title_permissions" ADD CONSTRAINT "job_title_permissions_job_title_id_job_titles_id_fk" FOREIGN KEY ("job_title_id") REFERENCES "public"."job_titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_titles" ADD CONSTRAINT "job_titles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_job_title_id_job_titles_id_fk" FOREIGN KEY ("job_title_id") REFERENCES "public"."job_titles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_alerts" ADD CONSTRAINT "org_alerts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_alerts" ADD CONSTRAINT "org_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_documents" ADD CONSTRAINT "org_documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_documents" ADD CONSTRAINT "org_documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_announcements" ADD CONSTRAINT "platform_announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_audit_log" ADD CONSTRAINT "platform_audit_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "add_ons" ADD CONSTRAINT "add_ons_target_feature_features_catalog_id_fk" FOREIGN KEY ("target_feature") REFERENCES "public"."features_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "add_ons" ADD CONSTRAINT "add_ons_target_quota_quotas_catalog_id_fk" FOREIGN KEY ("target_quota") REFERENCES "public"."quotas_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_overrides" ADD CONSTRAINT "billing_overrides_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "features_catalog" ADD CONSTRAINT "features_catalog_group_id_feature_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."feature_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_feature_id_features_catalog_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_quotas" ADD CONSTRAINT "plan_quotas_quota_id_quotas_catalog_id_fk" FOREIGN KEY ("quota_id") REFERENCES "public"."quotas_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_add_ons" ADD CONSTRAINT "tenant_add_ons_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_add_ons" ADD CONSTRAINT "tenant_add_ons_add_on_id_add_ons_id_fk" FOREIGN KEY ("add_on_id") REFERENCES "public"."add_ons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_feature_overrides" ADD CONSTRAINT "tenant_feature_overrides_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_feature_overrides" ADD CONSTRAINT "tenant_feature_overrides_feature_id_features_catalog_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_grants" ADD CONSTRAINT "tenant_grants_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_quota_overrides" ADD CONSTRAINT "tenant_quota_overrides_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_quota_overrides" ADD CONSTRAINT "tenant_quota_overrides_quota_id_quotas_catalog_id_fk" FOREIGN KEY ("quota_id") REFERENCES "public"."quotas_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_reminders" ADD CONSTRAINT "org_reminders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_reminders" ADD CONSTRAINT "org_reminders_template_id_reminder_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."reminder_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_reminders" ADD CONSTRAINT "org_reminders_category_id_reminder_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."reminder_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_categories" ADD CONSTRAINT "reminder_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_templates" ADD CONSTRAINT "reminder_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_templates" ADD CONSTRAINT "reminder_templates_category_id_reminder_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."reminder_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_sections" ADD CONSTRAINT "seat_sections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_sections" ADD CONSTRAINT "seat_sections_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_section_id_seat_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."seat_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_issuances" ADD CONSTRAINT "ticket_issuances_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_issuances" ADD CONSTRAINT "ticket_issuances_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_issuances" ADD CONSTRAINT "ticket_issuances_ticket_type_id_ticket_types_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_issuances" ADD CONSTRAINT "ticket_issuances_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_issuances" ADD CONSTRAINT "ticket_issuances_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_issuances" ADD CONSTRAINT "ticket_issuances_seat_id_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_issuances" ADD CONSTRAINT "ticket_issuances_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_event_id_new_events_id_fk" FOREIGN KEY ("event_id_new") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_gr_id_goods_receipts_id_fk" FOREIGN KEY ("gr_id") REFERENCES "public"."goods_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_po_item_id_purchase_order_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_gr_id_goods_receipts_id_fk" FOREIGN KEY ("gr_id") REFERENCES "public"."goods_receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_addons" ADD CONSTRAINT "subscription_addons_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_compensations" ADD CONSTRAINT "behavior_compensations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_compensations" ADD CONSTRAINT "behavior_compensations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_incidents" ADD CONSTRAINT "behavior_incidents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_incidents" ADD CONSTRAINT "behavior_incidents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_incidents" ADD CONSTRAINT "behavior_incidents_category_id_school_violation_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."school_violation_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_rooms" ADD CONSTRAINT "class_rooms_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_counselor_user_id_users_id_fk" FOREIGN KEY ("counselor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_case_id_school_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."school_cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_referral_id_student_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."student_referrals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_levels" ADD CONSTRAINT "grade_levels_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_notifications" ADD CONSTRAINT "guardian_notifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_notifications" ADD CONSTRAINT "guardian_notifications_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_notifications" ADD CONSTRAINT "guardian_notifications_incident_id_behavior_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."behavior_incidents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_week_id_schedule_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."schedule_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_period_id_timetable_template_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."timetable_template_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_class_room_id_class_rooms_id_fk" FOREIGN KEY ("class_room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_teacher_id_teacher_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_weeks" ADD CONSTRAINT "schedule_weeks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_weeks" ADD CONSTRAINT "schedule_weeks_template_id_timetable_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."timetable_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_weeks" ADD CONSTRAINT "schedule_weeks_semester_id_school_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."school_semesters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_case_steps" ADD CONSTRAINT "school_case_steps_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_case_steps" ADD CONSTRAINT "school_case_steps_case_id_school_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."school_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_cases" ADD CONSTRAINT "school_cases_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_cases" ADD CONSTRAINT "school_cases_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_cases" ADD CONSTRAINT "school_cases_class_room_id_class_rooms_id_fk" FOREIGN KEY ("class_room_id") REFERENCES "public"."class_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_semester_id_school_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."school_semesters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_import_logs" ADD CONSTRAINT "school_import_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_semesters" ADD CONSTRAINT "school_semesters_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_settings" ADD CONSTRAINT "school_settings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_staff_profiles" ADD CONSTRAINT "school_staff_profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_staff_profiles" ADD CONSTRAINT "school_staff_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_staff_profiles" ADD CONSTRAINT "school_staff_profiles_teacher_profile_id_teacher_profiles_id_fk" FOREIGN KEY ("teacher_profile_id") REFERENCES "public"."teacher_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_standby_activations" ADD CONSTRAINT "school_standby_activations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_standby_activations" ADD CONSTRAINT "school_standby_activations_absent_teacher_id_teacher_profiles_id_fk" FOREIGN KEY ("absent_teacher_id") REFERENCES "public"."teacher_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_standby_activations" ADD CONSTRAINT "school_standby_activations_standby_teacher_id_teacher_profiles_id_fk" FOREIGN KEY ("standby_teacher_id") REFERENCES "public"."teacher_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_standby_activations" ADD CONSTRAINT "school_standby_activations_class_room_id_class_rooms_id_fk" FOREIGN KEY ("class_room_id") REFERENCES "public"."class_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_timetable" ADD CONSTRAINT "school_timetable_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_timetable" ADD CONSTRAINT "school_timetable_class_room_id_class_rooms_id_fk" FOREIGN KEY ("class_room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_timetable" ADD CONSTRAINT "school_timetable_teacher_id_teacher_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_violation_categories" ADD CONSTRAINT "school_violation_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_violations" ADD CONSTRAINT "school_violations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_violations" ADD CONSTRAINT "school_violations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_violations" ADD CONSTRAINT "school_violations_category_id_school_violation_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."school_violation_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_whatsapp_logs" ADD CONSTRAINT "school_whatsapp_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_whatsapp_logs" ADD CONSTRAINT "school_whatsapp_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_whatsapp_logs" ADD CONSTRAINT "school_whatsapp_logs_teacher_id_teacher_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_class_room_id_class_rooms_id_fk" FOREIGN KEY ("class_room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_behavior_scores" ADD CONSTRAINT "student_behavior_scores_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_behavior_scores" ADD CONSTRAINT "student_behavior_scores_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_case_id_school_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."school_cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_from_class_id_class_rooms_id_fk" FOREIGN KEY ("from_class_id") REFERENCES "public"."class_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_to_class_id_class_rooms_id_fk" FOREIGN KEY ("to_class_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_room_id_class_rooms_id_fk" FOREIGN KEY ("class_room_id") REFERENCES "public"."class_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_grade_levels" ADD CONSTRAINT "subject_grade_levels_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_grade_levels" ADD CONSTRAINT "subject_grade_levels_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_grade_levels" ADD CONSTRAINT "subject_grade_levels_grade_level_id_grade_levels_id_fk" FOREIGN KEY ("grade_level_id") REFERENCES "public"."grade_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_attendance" ADD CONSTRAINT "teacher_attendance_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_attendance" ADD CONSTRAINT "teacher_attendance_teacher_id_teacher_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_attendance" ADD CONSTRAINT "teacher_attendance_class_room_id_class_rooms_id_fk" FOREIGN KEY ("class_room_id") REFERENCES "public"."class_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_teacher_id_teacher_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_class_room_id_class_rooms_id_fk" FOREIGN KEY ("class_room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_daily_logs" ADD CONSTRAINT "teacher_daily_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_daily_logs" ADD CONSTRAINT "teacher_daily_logs_teacher_profile_id_teacher_profiles_id_fk" FOREIGN KEY ("teacher_profile_id") REFERENCES "public"."teacher_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_daily_logs" ADD CONSTRAINT "teacher_daily_logs_class_room_id_class_rooms_id_fk" FOREIGN KEY ("class_room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_daily_logs" ADD CONSTRAINT "teacher_daily_logs_schedule_entry_id_schedule_entries_id_fk" FOREIGN KEY ("schedule_entry_id") REFERENCES "public"."schedule_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_daily_logs" ADD CONSTRAINT "teacher_daily_logs_period_id_timetable_template_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."timetable_template_periods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_daily_logs" ADD CONSTRAINT "teacher_daily_logs_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_preparations" ADD CONSTRAINT "teacher_preparations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_preparations" ADD CONSTRAINT "teacher_preparations_teacher_profile_id_teacher_profiles_id_fk" FOREIGN KEY ("teacher_profile_id") REFERENCES "public"."teacher_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_preparations" ADD CONSTRAINT "teacher_preparations_class_room_id_class_rooms_id_fk" FOREIGN KEY ("class_room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_preparations" ADD CONSTRAINT "teacher_preparations_week_id_schedule_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."schedule_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_preparations" ADD CONSTRAINT "teacher_preparations_period_id_timetable_template_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."timetable_template_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_preparations" ADD CONSTRAINT "teacher_preparations_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_student_notes" ADD CONSTRAINT "teacher_student_notes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_student_notes" ADD CONSTRAINT "teacher_student_notes_teacher_profile_id_teacher_profiles_id_fk" FOREIGN KEY ("teacher_profile_id") REFERENCES "public"."teacher_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_student_notes" ADD CONSTRAINT "teacher_student_notes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_student_notes" ADD CONSTRAINT "teacher_student_notes_class_room_id_class_rooms_id_fk" FOREIGN KEY ("class_room_id") REFERENCES "public"."class_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_template_periods" ADD CONSTRAINT "timetable_template_periods_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_template_periods" ADD CONSTRAINT "timetable_template_periods_template_id_timetable_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."timetable_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_templates" ADD CONSTRAINT "timetable_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_vocab_org_idx" ON "business_vocabulary" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "business_vocab_type_idx" ON "business_vocabulary" USING btree ("business_type","term_key");--> statement-breakpoint
CREATE UNIQUE INDEX "org_cap_overrides_unique_idx" ON "organization_capability_overrides" USING btree ("org_id","capability_key");--> statement-breakpoint
CREATE INDEX "org_cap_overrides_org_idx" ON "organization_capability_overrides" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "service_questions_service_idx" ON "service_questions" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_staff_unique_idx" ON "service_staff" USING btree ("service_id","user_id");--> statement-breakpoint
CREATE INDEX "booking_assignments_booking_idx" ON "booking_assignments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_assignments_user_idx" ON "booking_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "booking_commissions_booking_idx" ON "booking_commissions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_commissions_user_idx" ON "booking_commissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "booking_consumptions_booking_idx" ON "booking_consumptions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_consumptions_org_idx" ON "booking_consumptions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_events_org_idx" ON "booking_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "invoice_payments_invoice_idx" ON "invoice_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_payments_org_idx" ON "invoice_payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "asset_movements_asset_id_idx" ON "asset_movements" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_movements_org_id_idx" ON "asset_movements" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "integration_logs_org_id_idx" ON "integration_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "integration_logs_integration_id_idx" ON "integration_logs" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "integration_logs_created_at_idx" ON "integration_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "integrations_org_id_idx" ON "integrations" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "capability_registry_key_idx" ON "capability_registry" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "cbp_org_customer_uidx" ON "client_beauty_profiles" USING btree ("org_id","customer_id");--> statement-breakpoint
CREATE INDEX "cbp_org_customer_idx" ON "client_beauty_profiles" USING btree ("org_id","customer_id");--> statement-breakpoint
CREATE INDEX "salon_supplies_org_idx" ON "salon_supplies" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "salon_supplies_active_category_idx" ON "salon_supplies" USING btree ("org_id","is_active","category");--> statement-breakpoint
CREATE INDEX "salon_supply_adj_supply_idx" ON "salon_supply_adjustments" USING btree ("supply_id");--> statement-breakpoint
CREATE INDEX "salon_supply_adj_org_idx" ON "salon_supply_adjustments" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ssr_service_supply_uidx" ON "service_supply_recipes" USING btree ("service_id","supply_id");--> statement-breakpoint
CREATE INDEX "ssr_service_idx" ON "service_supply_recipes" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "ssr_supply_idx" ON "service_supply_recipes" USING btree ("supply_id");--> statement-breakpoint
CREATE INDEX "vn_booking_idx" ON "visit_notes" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "vn_customer_idx" ON "visit_notes" USING btree ("org_id","customer_id");--> statement-breakpoint
CREATE INDEX "vn_staff_idx" ON "visit_notes" USING btree ("org_id","staff_id");--> statement-breakpoint
CREATE INDEX "delivery_assignments_order_idx" ON "delivery_assignments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "delivery_assignments_org_idx" ON "delivery_assignments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "delivery_partners_org_idx" ON "delivery_partners" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_title_perms_unique_idx" ON "job_title_permissions" USING btree ("org_id","job_title_id","permission_key");--> statement-breakpoint
CREATE INDEX "job_title_perms_jt_idx" ON "job_title_permissions" USING btree ("job_title_id");--> statement-breakpoint
CREATE INDEX "job_titles_org_idx" ON "job_titles" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_unique_idx" ON "org_members" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "org_members_org_idx" ON "org_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_members_jt_idx" ON "org_members" USING btree ("job_title_id");--> statement-breakpoint
CREATE INDEX "org_alerts_org_idx" ON "org_alerts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_alerts_user_idx" ON "org_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_alerts_read_idx" ON "org_alerts" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "org_documents_org_idx" ON "org_documents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "platform_audit_admin_idx" ON "platform_audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "platform_audit_target_idx" ON "platform_audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "support_tickets_org_idx" ON "support_tickets" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "system_health_time_idx" ON "system_health_log" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "org_reminders_org_idx" ON "org_reminders" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_reminders_due_idx" ON "org_reminders" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "org_reminders_status_idx" ON "org_reminders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_org_id_idx" ON "events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "events_org_status_idx" ON "events" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "events_org_starts_at_idx" ON "events" USING btree ("org_id","starts_at");--> statement-breakpoint
CREATE INDEX "seat_sections_event_idx" ON "seat_sections" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seats_event_section_row_num_uidx" ON "seats" USING btree ("event_id","section_id","row","number");--> statement-breakpoint
CREATE INDEX "seats_event_status_idx" ON "seats" USING btree ("event_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_issuances_qr_uidx" ON "ticket_issuances" USING btree ("qr_code");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_issuances_number_uidx" ON "ticket_issuances" USING btree ("org_id","ticket_number");--> statement-breakpoint
CREATE INDEX "ticket_issuances_event_idx" ON "ticket_issuances" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "ticket_issuances_booking_idx" ON "ticket_issuances" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "ticket_issuances_customer_idx" ON "ticket_issuances" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "ticket_issuances_status_idx" ON "ticket_issuances" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "ticket_types_event_idx" ON "ticket_types" USING btree ("event_id_new");--> statement-breakpoint
CREATE INDEX "gr_items_gr_id_idx" ON "goods_receipt_items" USING btree ("gr_id");--> statement-breakpoint
CREATE INDEX "gr_items_po_item_idx" ON "goods_receipt_items" USING btree ("po_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gr_org_number_uidx" ON "goods_receipts" USING btree ("org_id","gr_number");--> statement-breakpoint
CREATE INDEX "gr_po_id_idx" ON "goods_receipts" USING btree ("po_id");--> statement-breakpoint
CREATE INDEX "gr_org_date_idx" ON "goods_receipts" USING btree ("org_id","received_at");--> statement-breakpoint
CREATE INDEX "po_items_po_id_idx" ON "purchase_order_items" USING btree ("po_id");--> statement-breakpoint
CREATE UNIQUE INDEX "po_org_number_uidx" ON "purchase_orders" USING btree ("org_id","po_number");--> statement-breakpoint
CREATE INDEX "po_org_supplier_idx" ON "purchase_orders" USING btree ("org_id","supplier_id");--> statement-breakpoint
CREATE INDEX "po_org_status_idx" ON "purchase_orders" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "po_org_date_idx" ON "purchase_orders" USING btree ("org_id","order_date");--> statement-breakpoint
CREATE UNIQUE INDEX "sup_inv_org_number_uidx" ON "supplier_invoices" USING btree ("org_id","supplier_id","invoice_number");--> statement-breakpoint
CREATE INDEX "sup_inv_org_supplier_idx" ON "supplier_invoices" USING btree ("org_id","supplier_id");--> statement-breakpoint
CREATE INDEX "sup_inv_org_status_idx" ON "supplier_invoices" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "sup_inv_due_date_idx" ON "supplier_invoices" USING btree ("org_id","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_org_code_uidx" ON "suppliers" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "suppliers_org_status_idx" ON "suppliers" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "subscription_addons_org_idx" ON "subscription_addons" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "subscription_addons_key_idx" ON "subscription_addons" USING btree ("org_id","addon_key");--> statement-breakpoint
CREATE INDEX "subscription_orders_org_idx" ON "subscription_orders" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "subscription_orders_status_idx" ON "subscription_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "maintenance_tasks_org_idx" ON "maintenance_tasks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "maintenance_tasks_service_idx" ON "maintenance_tasks" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "maintenance_tasks_booking_idx" ON "maintenance_tasks" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "maintenance_tasks_status_idx" ON "maintenance_tasks" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "maintenance_tasks_scheduled_idx" ON "maintenance_tasks" USING btree ("org_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "behavior_compensations_org_idx" ON "behavior_compensations" USING btree ("org_id","compensation_date");--> statement-breakpoint
CREATE INDEX "behavior_compensations_student_idx" ON "behavior_compensations" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE INDEX "behavior_incidents_org_idx" ON "behavior_incidents" USING btree ("org_id","incident_date");--> statement-breakpoint
CREATE INDEX "behavior_incidents_student_idx" ON "behavior_incidents" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE INDEX "behavior_incidents_status_idx" ON "behavior_incidents" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "class_rooms_org_idx" ON "class_rooms" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "class_rooms_grade_idx" ON "class_rooms" USING btree ("org_id","grade");--> statement-breakpoint
CREATE UNIQUE INDEX "class_rooms_org_grade_name_unique" ON "class_rooms" USING btree ("org_id","grade","name");--> statement-breakpoint
CREATE INDEX "counseling_sessions_org_idx" ON "counseling_sessions" USING btree ("org_id","session_date");--> statement-breakpoint
CREATE INDEX "counseling_sessions_counselor_idx" ON "counseling_sessions" USING btree ("org_id","counselor_user_id");--> statement-breakpoint
CREATE INDEX "counseling_sessions_student_idx" ON "counseling_sessions" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE INDEX "counseling_sessions_case_idx" ON "counseling_sessions" USING btree ("org_id","case_id");--> statement-breakpoint
CREATE INDEX "counseling_sessions_status_idx" ON "counseling_sessions" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "grade_levels_org_stage_idx" ON "grade_levels" USING btree ("org_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_levels_org_name_idx" ON "grade_levels" USING btree ("org_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_levels_org_code_idx" ON "grade_levels" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "guardian_notifications_org_idx" ON "guardian_notifications" USING btree ("org_id","notification_date");--> statement-breakpoint
CREATE INDEX "guardian_notifications_student_idx" ON "guardian_notifications" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE INDEX "schedule_entries_org_idx" ON "schedule_entries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "schedule_entries_week_idx" ON "schedule_entries" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "schedule_entries_class_room_idx" ON "schedule_entries" USING btree ("org_id","class_room_id");--> statement-breakpoint
CREATE INDEX "schedule_entries_teacher_idx" ON "schedule_entries" USING btree ("org_id","teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_entries_unique" ON "schedule_entries" USING btree ("week_id","period_id","class_room_id","day_of_week");--> statement-breakpoint
CREATE INDEX "schedule_weeks_org_idx" ON "schedule_weeks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "schedule_weeks_template_idx" ON "schedule_weeks" USING btree ("org_id","template_id");--> statement-breakpoint
CREATE INDEX "school_case_steps_case_idx" ON "school_case_steps" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "school_cases_org_idx" ON "school_cases" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "school_cases_student_idx" ON "school_cases" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE INDEX "school_cases_status_idx" ON "school_cases" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "school_cases_priority_idx" ON "school_cases" USING btree ("org_id","priority");--> statement-breakpoint
CREATE INDEX "school_events_org_idx" ON "school_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "school_events_semester_idx" ON "school_events" USING btree ("org_id","semester_id");--> statement-breakpoint
CREATE INDEX "school_events_date_idx" ON "school_events" USING btree ("org_id","start_date");--> statement-breakpoint
CREATE INDEX "school_import_logs_org_idx" ON "school_import_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "school_import_logs_status_idx" ON "school_import_logs" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "school_import_logs_type_idx" ON "school_import_logs" USING btree ("org_id","import_type");--> statement-breakpoint
CREATE INDEX "school_semesters_org_idx" ON "school_semesters" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_semesters_unique" ON "school_semesters" USING btree ("org_id","year_label","semester_number");--> statement-breakpoint
CREATE UNIQUE INDEX "school_settings_org_unique" ON "school_settings" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_staff_profiles_org_user_unique" ON "school_staff_profiles" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "school_staff_profiles_org_idx" ON "school_staff_profiles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "school_staff_profiles_teacher_idx" ON "school_staff_profiles" USING btree ("org_id","teacher_profile_id");--> statement-breakpoint
CREATE INDEX "standby_activations_org_date_idx" ON "school_standby_activations" USING btree ("org_id","activation_date");--> statement-breakpoint
CREATE INDEX "standby_activations_absent_idx" ON "school_standby_activations" USING btree ("org_id","absent_teacher_id");--> statement-breakpoint
CREATE INDEX "standby_activations_standby_idx" ON "school_standby_activations" USING btree ("org_id","standby_teacher_id");--> statement-breakpoint
CREATE INDEX "school_timetable_class_idx" ON "school_timetable" USING btree ("org_id","class_room_id");--> statement-breakpoint
CREATE INDEX "school_timetable_teacher_idx" ON "school_timetable" USING btree ("org_id","teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "school_timetable_unique" ON "school_timetable" USING btree ("org_id","class_room_id","day_of_week","period_number");--> statement-breakpoint
CREATE INDEX "school_violation_categories_org_idx" ON "school_violation_categories" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "school_violations_org_idx" ON "school_violations" USING btree ("org_id","violation_date");--> statement-breakpoint
CREATE INDEX "school_violations_student_idx" ON "school_violations" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE INDEX "school_violations_degree_idx" ON "school_violations" USING btree ("org_id","degree");--> statement-breakpoint
CREATE INDEX "school_whatsapp_logs_org_idx" ON "school_whatsapp_logs" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "school_whatsapp_logs_student_idx" ON "school_whatsapp_logs" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_attendance_unique_idx" ON "student_attendance" USING btree ("org_id","student_id","attendance_date");--> statement-breakpoint
CREATE INDEX "student_attendance_org_date_idx" ON "student_attendance" USING btree ("org_id","attendance_date");--> statement-breakpoint
CREATE INDEX "student_attendance_student_idx" ON "student_attendance" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_attendance_classroom_idx" ON "student_attendance" USING btree ("class_room_id","attendance_date");--> statement-breakpoint
CREATE UNIQUE INDEX "student_behavior_scores_unique" ON "student_behavior_scores" USING btree ("org_id","student_id","academic_year");--> statement-breakpoint
CREATE INDEX "student_behavior_scores_org_idx" ON "student_behavior_scores" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE INDEX "student_referrals_org_idx" ON "student_referrals" USING btree ("org_id","referral_date");--> statement-breakpoint
CREATE INDEX "student_referrals_student_idx" ON "student_referrals" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE INDEX "student_referrals_status_idx" ON "student_referrals" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "student_referrals_assigned_idx" ON "student_referrals" USING btree ("org_id","assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "student_referrals_urgency_idx" ON "student_referrals" USING btree ("org_id","urgency");--> statement-breakpoint
CREATE INDEX "student_transfers_student_idx" ON "student_transfers" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE INDEX "student_transfers_date_idx" ON "student_transfers" USING btree ("org_id","transferred_at");--> statement-breakpoint
CREATE INDEX "students_org_idx" ON "students" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "students_class_room_idx" ON "students" USING btree ("org_id","class_room_id");--> statement-breakpoint
CREATE INDEX "students_active_idx" ON "students" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "students_grade_idx" ON "students" USING btree ("org_id","grade");--> statement-breakpoint
CREATE INDEX "sgl_grade_idx" ON "subject_grade_levels" USING btree ("org_id","grade_level_id");--> statement-breakpoint
CREATE INDEX "sgl_subject_idx" ON "subject_grade_levels" USING btree ("org_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sgl_unique_idx" ON "subject_grade_levels" USING btree ("org_id","subject_id","grade_level_id");--> statement-breakpoint
CREATE INDEX "subjects_org_idx" ON "subjects" USING btree ("org_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_org_name_idx" ON "subjects" USING btree ("org_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_org_code_idx" ON "subjects" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "teacher_attendance_org_date_idx" ON "teacher_attendance" USING btree ("org_id","attendance_date");--> statement-breakpoint
CREATE INDEX "teacher_attendance_teacher_idx" ON "teacher_attendance" USING btree ("org_id","teacher_id");--> statement-breakpoint
CREATE INDEX "teacher_class_assignments_teacher_idx" ON "teacher_class_assignments" USING btree ("org_id","teacher_id");--> statement-breakpoint
CREATE INDEX "teacher_class_assignments_classroom_idx" ON "teacher_class_assignments" USING btree ("org_id","class_room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_daily_logs_unique" ON "teacher_daily_logs" USING btree ("teacher_profile_id","class_room_id","date","period_id");--> statement-breakpoint
CREATE INDEX "teacher_daily_logs_teacher_idx" ON "teacher_daily_logs" USING btree ("org_id","teacher_profile_id");--> statement-breakpoint
CREATE INDEX "teacher_daily_logs_date_idx" ON "teacher_daily_logs" USING btree ("org_id","date");--> statement-breakpoint
CREATE INDEX "teacher_daily_logs_subject_idx" ON "teacher_daily_logs" USING btree ("org_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_preparations_unique" ON "teacher_preparations" USING btree ("teacher_profile_id","week_id","period_id","class_room_id","day_of_week");--> statement-breakpoint
CREATE INDEX "teacher_preparations_teacher_idx" ON "teacher_preparations" USING btree ("org_id","teacher_profile_id");--> statement-breakpoint
CREATE INDEX "teacher_preparations_week_idx" ON "teacher_preparations" USING btree ("org_id","week_id");--> statement-breakpoint
CREATE INDEX "teacher_preparations_subject_idx" ON "teacher_preparations" USING btree ("org_id","subject_id");--> statement-breakpoint
CREATE INDEX "teacher_profiles_org_idx" ON "teacher_profiles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "teacher_profiles_active_idx" ON "teacher_profiles" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "teacher_student_notes_teacher_idx" ON "teacher_student_notes" USING btree ("org_id","teacher_profile_id");--> statement-breakpoint
CREATE INDEX "teacher_student_notes_student_idx" ON "teacher_student_notes" USING btree ("org_id","student_id");--> statement-breakpoint
CREATE INDEX "teacher_student_notes_date_idx" ON "teacher_student_notes" USING btree ("org_id","note_date");--> statement-breakpoint
CREATE INDEX "teacher_student_notes_follow_up_idx" ON "teacher_student_notes" USING btree ("org_id","requires_follow_up");--> statement-breakpoint
CREATE INDEX "timetable_template_periods_template_idx" ON "timetable_template_periods" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "timetable_template_periods_unique" ON "timetable_template_periods" USING btree ("template_id","period_number");--> statement-breakpoint
CREATE INDEX "timetable_templates_org_idx" ON "timetable_templates" USING btree ("org_id");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_listings_org_service_idx" ON "marketplace_listings" USING btree ("org_id","service_id");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_org_code_unique" UNIQUE("org_code");