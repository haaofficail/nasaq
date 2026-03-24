CREATE TYPE "public"."subscription_plan" AS ENUM('basic', 'advanced', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'cancelled', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended', 'invited');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('owner', 'employee', 'vendor');--> statement-breakpoint
CREATE TYPE "public"."addon_type" AS ENUM('optional', 'required');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."offering_type" AS ENUM('service', 'product', 'package', 'rental', 'room_booking', 'vehicle_rental', 'subscription', 'digital_product', 'add_on', 'reservation', 'extra_charge');--> statement-breakpoint
CREATE TYPE "public"."pricing_mode" AS ENUM('fixed', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."pricing_rule_type" AS ENUM('seasonal', 'day_of_week', 'capacity', 'location', 'customer', 'early_bird');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."customer_tier" AS ENUM('regular', 'vip', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('individual', 'business');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('call', 'whatsapp', 'sms', 'email', 'note', 'meeting');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'deposit_paid', 'fully_confirmed', 'preparing', 'in_progress', 'completed', 'reviewed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('mada', 'visa_master', 'apple_pay', 'tamara', 'tabby', 'bank_transfer', 'cash', 'wallet', 'payment_link');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'partially_paid', 'overdue', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."commission_type" AS ENUM('fixed', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('rent', 'salaries', 'equipment', 'transport', 'maintenance', 'marketing', 'utilities', 'supplies', 'other');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('simplified', 'tax', 'credit_note', 'debit_note');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('available', 'in_use', 'maintenance', 'damaged', 'lost', 'retired');--> statement-breakpoint
CREATE TYPE "public"."maintenance_type" AS ENUM('preventive', 'corrective', 'cleaning', 'inspection');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('pending', 'in_transit', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shift_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'assigned', 'in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('transport', 'setup', 'reception', 'operation', 'teardown', 'return', 'inspection', 'custom');--> statement-breakpoint
CREATE TYPE "public"."automation_status" AS ENUM('active', 'paused', 'draft');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('whatsapp', 'sms', 'email', 'push', 'internal');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('event', 'schedule', 'condition');--> statement-breakpoint
CREATE TYPE "public"."campaign_channel" AS ENUM('whatsapp', 'sms', 'email', 'push', 'multi');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."loyalty_tier" AS ENUM('bronze', 'silver', 'gold', 'vip');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."hotel_reservation_status" AS ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'completed');--> statement-breakpoint
CREATE TYPE "public"."housekeeping_status" AS ENUM('pending', 'in_progress', 'completed', 'inspected', 'issue_reported');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'out_of_service');--> statement-breakpoint
CREATE TYPE "public"."car_rental_status" AS ENUM('pending', 'confirmed', 'picked_up', 'returned', 'cancelled', 'no_show', 'completed');--> statement-breakpoint
CREATE TYPE "public"."inspection_type" AS ENUM('pre_rental', 'post_rental', 'routine', 'damage');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('available', 'reserved', 'rented', 'maintenance', 'inspection', 'out_of_service');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'inactive', 'error', 'pending_setup', 'expired');--> statement-breakpoint
CREATE TYPE "public"."integration_type" AS ENUM('booking_channel', 'food_delivery', 'last_mile', 'messaging', 'payments', 'calendar', 'automation', 'ota', 'analytics', 'custom_webhook');--> statement-breakpoint
CREATE TYPE "public"."sync_job_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."bloom_stage" AS ENUM('bud', 'semi_open', 'open', 'full_bloom');--> statement-breakpoint
CREATE TYPE "public"."flower_color" AS ENUM('red', 'pink', 'white', 'yellow', 'orange', 'purple', 'lavender', 'peach', 'coral', 'burgundy', 'cream', 'bi_color', 'mixed', 'blue', 'green', 'champagne', 'black', 'silver', 'other');--> statement-breakpoint
CREATE TYPE "public"."flower_grade" AS ENUM('premium_plus', 'premium', 'grade_a', 'grade_b', 'grade_c');--> statement-breakpoint
CREATE TYPE "public"."flower_origin" AS ENUM('netherlands', 'kenya', 'ethiopia', 'zimbabwe', 'tanzania', 'south_africa', 'ecuador', 'colombia', 'brazil', 'france', 'spain', 'italy', 'turkey', 'israel', 'japan', 'china', 'india', 'thailand', 'malaysia', 'vietnam', 'indonesia', 'australia', 'local_saudi', 'local_uae', 'local_kuwait', 'local_bahrain', 'local_qatar', 'local_oman', 'other');--> statement-breakpoint
CREATE TYPE "public"."flower_quality_status" AS ENUM('fresh', 'good', 'acceptable', 'expiring', 'expired', 'damaged');--> statement-breakpoint
CREATE TYPE "public"."flower_size" AS ENUM('xs', 'small', 'medium', 'large', 'xl');--> statement-breakpoint
CREATE TYPE "public"."flower_type" AS ENUM('rose', 'tulip', 'lily', 'orchid', 'carnation', 'baby_rose', 'hydrangea', 'peony', 'sunflower', 'gypsophila', 'chrysanthemum', 'dahlia', 'freesia', 'iris', 'lisianthus', 'anthurium', 'statice', 'ranunculus', 'delphinium', 'anemone', 'alstroemeria', 'snapdragon', 'narcissus', 'jasmine', 'gardenia', 'protea', 'calla_lily', 'gerbera', 'matthiola', 'waxflower', 'bird_of_paradise');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('asset', 'liability', 'equity', 'revenue', 'expense');--> statement-breakpoint
CREATE TYPE "public"."journal_entry_status" AS ENUM('draft', 'posted', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."journal_source_type" AS ENUM('booking', 'invoice', 'expense', 'payment', 'pos', 'treasury', 'transfer', 'manual', 'closing', 'opening');--> statement-breakpoint
CREATE TYPE "public"."normal_balance" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('open', 'closed', 'locked');--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"branch_code" text,
	"type" text DEFAULT 'branch',
	"color" text DEFAULT '#6366f1',
	"is_main_branch" boolean DEFAULT false NOT NULL,
	"address" text,
	"city" text,
	"latitude" text,
	"longitude" text,
	"manager_name" text,
	"manager_phone" text,
	"capacity" text,
	"opening_hours" jsonb,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"logo" text,
	"phone" text,
	"email" text,
	"website" text,
	"primary_color" text DEFAULT '#1A56DB',
	"secondary_color" text DEFAULT '#C8A951',
	"commercial_register" text,
	"vat_number" text,
	"city" text,
	"address" text,
	"plan" "subscription_plan" DEFAULT 'basic' NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"subscription_ends_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{"timezone":"Asia/Riyadh","currency":"SAR","language":"ar","dateFormat":"YYYY-MM-DD","weekStartsOn":"sunday","vatRate":15,"vatInclusive":true}'::jsonb,
	"business_type" text DEFAULT 'general',
	"custom_domain" text,
	"subdomain" text,
	"instagram" text,
	"twitter" text,
	"tiktok" text,
	"snapchat" text,
	"google_maps_embed" text,
	"cover_image" text,
	"tagline" text,
	"description" text,
	"onboarding_completed" boolean DEFAULT false,
	"onboarding_step" text DEFAULT '0',
	"has_demo_data" boolean DEFAULT false,
	"demo_cleared_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code" text NOT NULL,
	"purpose" text DEFAULT 'login',
	"attempts" integer DEFAULT 0,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"description" text,
	"description_en" text
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"device" text,
	"ip" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"avatar" text,
	"password_hash" text,
	"last_login_at" timestamp with time zone,
	"failed_login_attempts" integer DEFAULT 0,
	"locked_until" timestamp with time zone,
	"type" "user_type" DEFAULT 'employee' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"role_id" uuid,
	"job_title" text,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"salary" text,
	"start_date" timestamp with time zone,
	"allowed_location_ids" jsonb DEFAULT '[]'::jsonb,
	"working_hours" jsonb DEFAULT '{"sunday":{"start":"08:00","end":"22:00","active":true},"monday":{"start":"08:00","end":"22:00","active":true},"tuesday":{"start":"08:00","end":"22:00","active":true},"wednesday":{"start":"08:00","end":"22:00","active":true},"thursday":{"start":"08:00","end":"22:00","active":true},"friday":{"start":null,"end":null,"active":false},"saturday":{"start":"08:00","end":"22:00","active":true}}'::jsonb,
	"access_start_time" text,
	"access_end_time" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"image" text,
	"price_mode" "pricing_mode" DEFAULT 'fixed' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"type" "addon_type" DEFAULT 'optional' NOT NULL,
	"asset_type_id" uuid,
	"max_quantity" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundle_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"included_addon_ids" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"description" text,
	"image" text,
	"status" "service_status" DEFAULT 'draft' NOT NULL,
	"discount_mode" "pricing_mode" DEFAULT 'percentage' NOT NULL,
	"discount_value" numeric(10, 2) DEFAULT '0',
	"total_base_price" numeric(10, 2),
	"final_price" numeric(10, 2),
	"meta_title" text,
	"meta_description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"description" text,
	"image" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"service_id" uuid,
	"name" text NOT NULL,
	"type" "pricing_rule_type" NOT NULL,
	"config" jsonb NOT NULL,
	"adjustment_mode" "pricing_mode" DEFAULT 'percentage' NOT NULL,
	"adjustment_value" numeric(10, 2) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"addon_id" uuid NOT NULL,
	"price_override" numeric(10, 2),
	"type_override" "addon_type",
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"inventory_item_id" uuid,
	"flower_inventory_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"quantity" numeric(10, 2) DEFAULT '1',
	"unit" text DEFAULT 'حبة',
	"unit_cost" numeric(10, 2) DEFAULT '0',
	"is_optional" boolean DEFAULT false,
	"is_upgradeable" boolean DEFAULT false,
	"upgrade_options" jsonb DEFAULT '[]'::jsonb,
	"show_to_customer" boolean DEFAULT true,
	"customer_label" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"material_cost" numeric(10, 2) DEFAULT '0',
	"labor_minutes" integer DEFAULT 0,
	"labor_cost_per_minute" numeric(10, 2) DEFAULT '0',
	"overhead_percent" numeric(5, 2) DEFAULT '0',
	"commission_percent" numeric(5, 2) DEFAULT '0',
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"type" "media_type" DEFAULT 'image' NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"alt_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"requirement_type" text NOT NULL,
	"user_id" uuid,
	"employee_role" text,
	"asset_id" uuid,
	"asset_type_id" uuid,
	"label" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"notes" text,
	"is_required" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"category_id" uuid,
	"offering_type" "offering_type" DEFAULT 'service' NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"short_description" text,
	"description" text,
	"status" "service_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"scheduled_publish_at" timestamp with time zone,
	"base_price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"vat_inclusive" boolean DEFAULT true NOT NULL,
	"min_capacity" integer,
	"max_capacity" integer,
	"capacity_label" text,
	"duration_minutes" integer,
	"setup_minutes" integer,
	"teardown_minutes" integer,
	"buffer_minutes" integer DEFAULT 0,
	"min_advance_hours" integer,
	"max_advance_days" integer,
	"cancellation_policy" jsonb DEFAULT '{"freeHours":24,"refundPercentBefore":50,"refundDaysBefore":3,"noRefundDaysBefore":1}'::jsonb,
	"deposit_percent" numeric(5, 2) DEFAULT '30',
	"allowed_location_ids" jsonb DEFAULT '[]'::jsonb,
	"required_assets" jsonb DEFAULT '[]'::jsonb,
	"required_staff" integer DEFAULT 0,
	"meta_title" text,
	"meta_description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"total_bookings" integer DEFAULT 0,
	"avg_rating" numeric(3, 2),
	"is_template" boolean DEFAULT false NOT NULL,
	"template_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"role" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"user_id" uuid,
	"type" "interaction_type" NOT NULL,
	"subject" text,
	"content" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"rules" jsonb NOT NULL,
	"customer_count" integer DEFAULT 0,
	"last_calculated_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"type" "customer_type" DEFAULT 'individual' NOT NULL,
	"tier" "customer_tier" DEFAULT 'regular' NOT NULL,
	"company_name" text,
	"commercial_register" text,
	"vat_number" text,
	"city" text,
	"address" text,
	"source" text,
	"referred_by" uuid,
	"referral_code" text,
	"total_spent" numeric(12, 2) DEFAULT '0',
	"total_bookings" integer DEFAULT 0,
	"avg_booking_value" numeric(10, 2),
	"last_booking_at" timestamp with time zone,
	"loyalty_points" integer DEFAULT 0,
	"wallet_balance" numeric(10, 2) DEFAULT '0',
	"credit_limit" numeric(10, 2),
	"credit_used" numeric(10, 2) DEFAULT '0',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"internal_notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "booking_item_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_item_id" uuid NOT NULL,
	"addon_id" uuid,
	"addon_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"service_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"pricing_breakdown" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"auto_transition_condition" jsonb,
	"max_duration_hours" integer,
	"notification_template" text,
	"is_default" boolean DEFAULT false,
	"is_terminal" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"booking_number" text NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"event_end_date" timestamp with time zone,
	"setup_date" timestamp with time zone,
	"teardown_date" timestamp with time zone,
	"location_id" uuid,
	"custom_location" text,
	"location_notes" text,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"vat_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"paid_amount" numeric(12, 2) DEFAULT '0',
	"balance_due" numeric(12, 2) DEFAULT '0',
	"coupon_code" text,
	"coupon_discount" numeric(10, 2),
	"assigned_user_id" uuid,
	"vendor_id" uuid,
	"tracking_token" text,
	"source" text DEFAULT 'dashboard',
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"customer_notes" text,
	"internal_notes" text,
	"rating" integer,
	"review_text" text,
	"reviewed_at" timestamp with time zone,
	"is_recurring" boolean DEFAULT false,
	"recurring_pattern" jsonb,
	"parent_booking_id" uuid,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"refund_amount" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_number_unique" UNIQUE("booking_number"),
	CONSTRAINT "bookings_tracking_token_unique" UNIQUE("tracking_token")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"customer_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"gateway_provider" text,
	"gateway_transaction_id" text,
	"gateway_response" jsonb,
	"payment_link_url" text,
	"payment_link_expires_at" timestamp with time zone,
	"type" text DEFAULT 'payment' NOT NULL,
	"receipt_number" text,
	"notes" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"rule_id" uuid,
	"resource" text NOT NULL,
	"resource_id" text NOT NULL,
	"action" text NOT NULL,
	"description" text NOT NULL,
	"request_data" jsonb,
	"requested_by" uuid NOT NULL,
	"approver_role_id" uuid,
	"approver_user_id" uuid,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_resource" text NOT NULL,
	"trigger_action" text NOT NULL,
	"trigger_condition" jsonb NOT NULL,
	"approver_role_id" uuid,
	"approver_user_id" uuid,
	"expiry_hours" integer DEFAULT 48,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"category" "expense_category" NOT NULL,
	"subcategory" text,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'SAR',
	"expense_date" timestamp with time zone NOT NULL,
	"booking_id" uuid,
	"vendor_id" uuid,
	"receipt_url" text,
	"receipt_number" text,
	"is_recurring" boolean DEFAULT false,
	"recurring_frequency" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"taxable_amount" numeric(10, 2) NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '15',
	"vat_amount" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_id" uuid,
	"customer_id" uuid,
	"invoice_number" text NOT NULL,
	"invoice_type" "invoice_type" DEFAULT 'simplified' NOT NULL,
	"uuid" text NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"issue_date" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" timestamp with time zone,
	"seller_name" text NOT NULL,
	"seller_vat_number" text,
	"seller_address" text,
	"seller_cr" text,
	"buyer_name" text NOT NULL,
	"buyer_phone" text,
	"buyer_email" text,
	"buyer_vat_number" text,
	"buyer_address" text,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"taxable_amount" numeric(12, 2) NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '15',
	"vat_amount" numeric(10, 2) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0',
	"qr_code" text,
	"zatca_xml" text,
	"zatca_status" text,
	"zatca_response" jsonb,
	"template_id" text,
	"notes" text,
	"terms_and_conditions" text,
	"related_invoice_id" uuid,
	"sent_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number"),
	CONSTRAINT "invoices_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "payment_gateway_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"display_name" text NOT NULL,
	"api_key" text,
	"publishable_key" text,
	"secret_key" text,
	"webhook_secret" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false,
	"supported_methods" jsonb DEFAULT '[]'::jsonb,
	"transaction_fee_percent" numeric(5, 2),
	"transaction_fee_fixed" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"commission_type" "commission_type" DEFAULT 'percentage' NOT NULL,
	"commission_value" numeric(10, 2) NOT NULL,
	"service_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"gross_amount" numeric(12, 2) NOT NULL,
	"commission_amount" numeric(10, 2) NOT NULL,
	"net_amount" numeric(12, 2) NOT NULL,
	"booking_ids" jsonb DEFAULT '[]'::jsonb,
	"booking_count" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_method" text,
	"payment_reference" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"booking_id" uuid,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"checked_out_by" uuid,
	"checked_out_at" timestamp with time zone,
	"returned_by" uuid,
	"returned_at" timestamp with time zone,
	"return_condition" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"from_location_id" uuid,
	"to_location_id" uuid NOT NULL,
	"status" "transfer_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid,
	"confirmed_by" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "asset_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"category" text,
	"default_price" numeric(10, 2),
	"default_lifespan_months" integer,
	"maintenance_interval_uses" integer,
	"maintenance_interval_days" integer,
	"image" text,
	"min_stock" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"asset_type_id" uuid NOT NULL,
	"serial_number" text,
	"barcode" text,
	"name" text,
	"status" "asset_status" DEFAULT 'available' NOT NULL,
	"condition" text,
	"current_location_id" uuid,
	"purchase_date" timestamp with time zone,
	"purchase_price" numeric(10, 2),
	"current_value" numeric(10, 2),
	"total_uses" integer DEFAULT 0,
	"last_used_at" timestamp with time zone,
	"last_maintenance_at" timestamp with time zone,
	"next_maintenance_at" timestamp with time zone,
	"images" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"type" "maintenance_type" NOT NULL,
	"description" text,
	"cost" numeric(10, 2) DEFAULT '0',
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"performed_by" text,
	"assigned_to" uuid,
	"condition_before" text,
	"condition_after" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"type" "task_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assigned_to" uuid,
	"scheduled_start" timestamp with time zone,
	"scheduled_end" timestamp with time zone,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"checklist" jsonb DEFAULT '[]'::jsonb,
	"images" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"bookings_completed" integer DEFAULT 0,
	"tasks_completed" integer DEFAULT 0,
	"avg_customer_rating" numeric(3, 2),
	"on_time_percentage" numeric(5, 2),
	"issues_count" integer DEFAULT 0,
	"total_hours_worked" numeric(8, 2),
	"reviewer_note" text,
	"overall_rating" integer,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"location_id" uuid,
	"booking_id" uuid,
	"status" "shift_status" DEFAULT 'scheduled' NOT NULL,
	"actual_start_time" text,
	"actual_end_time" text,
	"break_minutes" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending',
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" text,
	"commercial_register" text,
	"vat_number" text,
	"services_offered" jsonb DEFAULT '[]'::jsonb,
	"contract_start_date" timestamp with time zone,
	"contract_end_date" timestamp with time zone,
	"contract_document" text,
	"bank_name" text,
	"iban" text,
	"account_holder" text,
	"avg_rating" numeric(3, 2),
	"total_bookings" integer DEFAULT 0,
	"verification_status" text DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "automation_status" DEFAULT 'draft' NOT NULL,
	"trigger_type" "trigger_type" NOT NULL,
	"trigger_event" text,
	"trigger_schedule" text,
	"conditions" jsonb DEFAULT '[]'::jsonb,
	"actions" jsonb NOT NULL,
	"times_triggered" integer DEFAULT 0,
	"last_triggered_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"template_id" uuid,
	"automation_rule_id" uuid,
	"recipient_type" text,
	"recipient_id" text,
	"recipient_contact" text,
	"channel" "notification_channel" NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"provider_message_id" text,
	"provider_response" jsonb,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"available_variables" jsonb DEFAULT '[]'::jsonb,
	"whatsapp_template_name" text,
	"whatsapp_template_language" text DEFAULT 'ar',
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"cron_expression" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Riyadh',
	"action_type" text NOT NULL,
	"action_config" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_run_status" text,
	"last_run_error" text,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"definition" jsonb NOT NULL,
	"status" "automation_status" DEFAULT 'draft' NOT NULL,
	"times_executed" integer DEFAULT 0,
	"last_executed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "abandoned_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"session_id" text,
	"customer_id" uuid,
	"phone" text,
	"email" text,
	"items" jsonb NOT NULL,
	"event_date" timestamp with time zone,
	"total_amount" numeric(12, 2),
	"recovery_status" text DEFAULT 'abandoned',
	"reminders_sent" integer DEFAULT 0,
	"last_reminder_at" timestamp with time zone,
	"recovered_at" timestamp with time zone,
	"recovered_booking_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"channel" "campaign_channel" DEFAULT 'whatsapp' NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"segment_id" uuid,
	"audience_count" integer DEFAULT 0,
	"subject" text,
	"body" text NOT NULL,
	"template_id" uuid,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"coupon_id" uuid,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"total_sent" integer DEFAULT 0,
	"total_delivered" integer DEFAULT 0,
	"total_opened" integer DEFAULT 0,
	"total_clicked" integer DEFAULT 0,
	"total_converted" integer DEFAULT 0,
	"revenue_generated" numeric(12, 2) DEFAULT '0',
	"cost" numeric(10, 2) DEFAULT '0',
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"discount_type" text DEFAULT 'percentage' NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"max_discount_amount" numeric(10, 2),
	"min_order_amount" numeric(10, 2),
	"service_ids" jsonb DEFAULT '[]'::jsonb,
	"customer_ids" jsonb DEFAULT '[]'::jsonb,
	"max_uses" integer,
	"max_uses_per_customer" integer DEFAULT 1,
	"times_used" integer DEFAULT 0,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" jsonb DEFAULT '[]'::jsonb,
	"meta_title" text,
	"meta_description" text,
	"facebook_pixel_id" text,
	"google_analytics_id" text,
	"snapchat_pixel_id" text,
	"views" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"is_published" boolean DEFAULT false,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"points_per_sar" numeric(5, 2) DEFAULT '1',
	"point_value" numeric(5, 2) DEFAULT '0.1',
	"silver_threshold" integer DEFAULT 500,
	"gold_threshold" integer DEFAULT 2000,
	"vip_threshold" integer DEFAULT 5000,
	"silver_discount" numeric(5, 2) DEFAULT '5',
	"gold_discount" numeric(5, 2) DEFAULT '10',
	"vip_discount" numeric(5, 2) DEFAULT '15',
	"referral_reward_points" integer DEFAULT 100,
	"referral_discount_percent" numeric(5, 2) DEFAULT '5',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"description" text,
	"booking_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"booking_id" uuid,
	"customer_id" uuid NOT NULL,
	"service_id" uuid,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"response_text" text,
	"responded_by" uuid,
	"responded_at" timestamp with time zone,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"is_published" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"key_prefix" text NOT NULL,
	"scopes" jsonb DEFAULT '["read"]'::jsonb,
	"rate_limit" integer DEFAULT 100,
	"last_used_at" timestamp with time zone,
	"total_requests" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "app_store_plugins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"description" text,
	"category" text,
	"icon" text,
	"developer_name" text,
	"developer_url" text,
	"is_free" boolean DEFAULT true,
	"monthly_price" numeric(10, 2),
	"config_schema" jsonb DEFAULT '[]'::jsonb,
	"is_published" boolean DEFAULT false,
	"install_count" integer DEFAULT 0,
	"avg_rating" numeric(3, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_store_plugins_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "installed_plugins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"plugin_id" uuid NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"installed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"marketplace_price" numeric(10, 2),
	"featured_until" timestamp with time zone,
	"sort_score" numeric(5, 2) DEFAULT '0',
	"views" integer DEFAULT 0,
	"inquiries" integer DEFAULT 0,
	"bookings" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfp_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfp_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"proposal_text" text NOT NULL,
	"proposed_price" numeric(10, 2) NOT NULL,
	"estimated_duration" text,
	"included_services" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfp_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_name" text NOT NULL,
	"client_phone" text NOT NULL,
	"client_email" text,
	"client_city" text,
	"event_type" text,
	"guest_count" integer,
	"event_date" timestamp with time zone,
	"budget" numeric(10, 2),
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL,
	"response_status" integer,
	"response_body" text,
	"response_time_ms" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0,
	"next_retry_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" jsonb DEFAULT '["*"]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_deliveries" integer DEFAULT 0,
	"total_failures" integer DEFAULT 0,
	"last_delivery_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_image" text,
	"author_id" uuid,
	"author_name" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"category" text,
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"canonical_url" text,
	"related_service_ids" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"scheduled_publish_at" timestamp with time zone,
	"views" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"message" text NOT NULL,
	"source" text DEFAULT 'website',
	"page_slug" text,
	"is_read" boolean DEFAULT false,
	"replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"template_id" text DEFAULT 'default',
	"logo_url" text,
	"favicon_url" text,
	"primary_color" text DEFAULT '#1A56DB',
	"secondary_color" text,
	"font_family" text DEFAULT 'IBM Plex Sans Arabic',
	"header_config" jsonb DEFAULT '{"showLogo":true,"showPhone":true,"showBookButton":true,"navigation":[{"label":"الرئيسية","link":"/"},{"label":"خدماتنا","link":"/services"},{"label":"من نحن","link":"/about"},{"label":"تواصل معنا","link":"/contact"}]}'::jsonb,
	"footer_config" jsonb DEFAULT '{"showSocial":true,"showContact":true,"copyright":"","social":{"instagram":"","twitter":"","snapchat":"","tiktok":""}}'::jsonb,
	"default_meta_title" text,
	"default_meta_description" text,
	"google_verification" text,
	"sitemap_enabled" boolean DEFAULT true,
	"google_analytics_id" text,
	"gtm_container_id" text,
	"facebook_pixel_id" text,
	"snapchat_pixel_id" text,
	"tiktok_pixel_id" text,
	"custom_head_code" text,
	"custom_body_code" text,
	"custom_domain" text,
	"ssl_enabled" boolean DEFAULT true,
	"whitelabel_enabled" boolean DEFAULT false,
	"hide_powered_by" boolean DEFAULT false,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"type" text DEFAULT 'custom' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"is_published" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"show_in_navigation" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotel_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"location_id" uuid,
	"room_type_id" uuid,
	"room_unit_id" uuid,
	"customer_id" uuid,
	"guest_name" text NOT NULL,
	"guest_phone" text,
	"guest_email" text,
	"guest_id_number" text,
	"guest_nationality" text,
	"adult_count" integer DEFAULT 1 NOT NULL,
	"children_count" integer DEFAULT 0,
	"check_in_date" timestamp with time zone NOT NULL,
	"check_out_date" timestamp with time zone NOT NULL,
	"nights" integer NOT NULL,
	"actual_check_in" timestamp with time zone,
	"actual_check_out" timestamp with time zone,
	"price_per_night" numeric(10, 2) NOT NULL,
	"total_room_cost" numeric(10, 2) NOT NULL,
	"extra_charges" numeric(10, 2) DEFAULT '0',
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"deposit_paid" boolean DEFAULT false,
	"payment_status" text DEFAULT 'pending',
	"payment_method" text,
	"status" "hotel_reservation_status" DEFAULT 'pending' NOT NULL,
	"source" text DEFAULT 'direct',
	"extra_services" jsonb DEFAULT '[]'::jsonb,
	"cancellation_policy" jsonb,
	"special_requests" text,
	"internal_notes" text,
	"assigned_staff_id" uuid,
	"invoice_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotel_seasonal_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"room_type_id" uuid,
	"name" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"price_per_night" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "housekeeping_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"room_unit_id" uuid NOT NULL,
	"task_type" text NOT NULL,
	"priority" text DEFAULT 'normal',
	"status" "housekeeping_status" DEFAULT 'pending' NOT NULL,
	"assigned_to_id" uuid,
	"assigned_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"notes" text,
	"issues" jsonb DEFAULT '[]'::jsonb,
	"photos" jsonb DEFAULT '[]'::jsonb,
	"reservation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"cover_image" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"max_occupancy" integer DEFAULT 2 NOT NULL,
	"max_adults" integer DEFAULT 2,
	"max_children" integer DEFAULT 0,
	"bed_configuration" text,
	"area_sqm" numeric(6, 2),
	"price_per_night" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"weekend_price_per_night" numeric(10, 2),
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"smoking_allowed" boolean DEFAULT false,
	"pets_allowed" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"room_type_id" uuid NOT NULL,
	"location_id" uuid,
	"room_number" text NOT NULL,
	"floor" integer,
	"building" text,
	"status" "room_status" DEFAULT 'available' NOT NULL,
	"price_override" numeric(10, 2),
	"notes_for_staff" text,
	"last_cleaned_at" timestamp with time zone,
	"last_inspected_at" timestamp with time zone,
	"next_maintenance_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_rental_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"category_id" uuid,
	"vehicle_unit_id" uuid,
	"customer_id" uuid,
	"driver_name" text NOT NULL,
	"driver_phone" text,
	"driver_email" text,
	"driver_id_number" text,
	"driver_license" text,
	"driver_age" integer,
	"pickup_date" timestamp with time zone NOT NULL,
	"return_date" timestamp with time zone NOT NULL,
	"rental_days" integer NOT NULL,
	"pickup_location_id" uuid,
	"return_location_id" uuid,
	"pickup_location_note" text,
	"return_location_note" text,
	"actual_pickup" timestamp with time zone,
	"actual_return" timestamp with time zone,
	"pickup_mileage" integer,
	"return_mileage" integer,
	"daily_rate" numeric(10, 2) NOT NULL,
	"total_rental_cost" numeric(10, 2) NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"deposit_returned" boolean DEFAULT false,
	"extra_charges" numeric(10, 2) DEFAULT '0',
	"extra_charges_notes" text,
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) NOT NULL,
	"payment_status" text DEFAULT 'pending',
	"payment_method" text,
	"deposit_paid" boolean DEFAULT false,
	"status" "car_rental_status" DEFAULT 'pending' NOT NULL,
	"add_ons" jsonb DEFAULT '[]'::jsonb,
	"source" text DEFAULT 'direct',
	"special_requests" text,
	"internal_notes" text,
	"assigned_staff_id" uuid,
	"invoice_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"description" text,
	"image" text,
	"price_per_day" numeric(10, 2) NOT NULL,
	"price_per_week" numeric(10, 2),
	"price_per_month" numeric(10, 2),
	"currency" text DEFAULT 'SAR' NOT NULL,
	"deposit_amount" numeric(10, 2) DEFAULT '0',
	"min_rental_days" integer DEFAULT 1,
	"max_rental_days" integer,
	"min_driver_age" integer DEFAULT 21,
	"mileage_limit" integer,
	"extra_mileage_rate" numeric(8, 2),
	"insurance_included" boolean DEFAULT false,
	"fuel_policy" text DEFAULT 'full_to_full',
	"features" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"vehicle_unit_id" uuid NOT NULL,
	"reservation_id" uuid,
	"inspection_type" "inspection_type" NOT NULL,
	"inspected_by" uuid,
	"inspected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mileage_at_inspection" integer,
	"fuel_level" text,
	"exterior_condition" text DEFAULT 'good',
	"interior_condition" text DEFAULT 'good',
	"tires_condition" text DEFAULT 'good',
	"has_damage" boolean DEFAULT false,
	"damage_description" text,
	"damage_photos" jsonb DEFAULT '[]'::jsonb,
	"damage_charge_amount" numeric(10, 2),
	"notes" text,
	"signature" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"location_id" uuid,
	"make" text,
	"model" text,
	"year" integer,
	"color" text,
	"plate_number" text,
	"vin" text,
	"mileage" integer DEFAULT 0,
	"status" "vehicle_status" DEFAULT 'available' NOT NULL,
	"insurance_expiry" timestamp with time zone,
	"registration_expiry" timestamp with time zone,
	"daily_rate_override" numeric(10, 2),
	"internal_notes" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"location_id" uuid,
	"provider_id" text NOT NULL,
	"integration_name" text,
	"integration_type" "integration_type" NOT NULL,
	"credentials" jsonb DEFAULT '{}'::jsonb,
	"entity_mappings" jsonb DEFAULT '{}'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"status" "integration_status" DEFAULT 'pending_setup' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"integration_config_id" uuid,
	"job_type" text NOT NULL,
	"status" "sync_job_status" DEFAULT 'queued' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"records_processed" integer DEFAULT 0,
	"records_created" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"error_summary" text,
	"triggered_by" text DEFAULT 'scheduler',
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"integration_config_id" uuid,
	"direction" text NOT NULL,
	"provider_id" text,
	"event_type" text,
	"headers" jsonb DEFAULT '{}'::jsonb,
	"payload" jsonb,
	"response_status" integer,
	"response_body" text,
	"processed" boolean DEFAULT false,
	"processed_at" timestamp with time zone,
	"error" text,
	"retry_count" integer DEFAULT 0,
	"internal_entity_type" text,
	"internal_entity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flower_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"location_id" uuid,
	"batch_number" text NOT NULL,
	"supplier_id" uuid,
	"quantity_received" integer DEFAULT 0 NOT NULL,
	"quantity_remaining" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(10, 2) DEFAULT '0',
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expiry_estimated" timestamp with time zone NOT NULL,
	"current_bloom_stage" "bloom_stage" DEFAULT 'bud' NOT NULL,
	"quality_status" "flower_quality_status" DEFAULT 'fresh' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flower_recipe_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"service_id" uuid,
	"package_ref" text,
	"quantity" numeric(8, 1) DEFAULT '1' NOT NULL,
	"unit" text DEFAULT 'ساق' NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"substitution_variant_ids" text[] DEFAULT '{}',
	"show_to_customer" boolean DEFAULT true NOT NULL,
	"customer_label_ar" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flower_substitutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"primary_variant_id" uuid NOT NULL,
	"substitute_variant_id" uuid NOT NULL,
	"grade_direction" text DEFAULT 'same' NOT NULL,
	"compatibility_score" integer DEFAULT 7 NOT NULL,
	"price_adjustment_percent" numeric(5, 2) DEFAULT '0',
	"is_auto_allowed" boolean DEFAULT false NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flower_variant_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"price_per_stem" numeric(10, 2) NOT NULL,
	"cost_per_stem" numeric(10, 2),
	"markup_percent" numeric(5, 2),
	"origin_multiplier_override" numeric(5, 3),
	"grade_multiplier_override" numeric(5, 3),
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flower_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flower_type" "flower_type" NOT NULL,
	"color" "flower_color" NOT NULL,
	"origin" "flower_origin" NOT NULL,
	"grade" "flower_grade" NOT NULL,
	"size" "flower_size" NOT NULL,
	"bloom_stage" "bloom_stage" NOT NULL,
	"display_name_ar" text,
	"display_name_en" text,
	"base_price_per_stem" numeric(10, 2) DEFAULT '0',
	"origin_price_multiplier" numeric(5, 3) DEFAULT '1.000',
	"grade_price_multiplier" numeric(5, 3) DEFAULT '1.000',
	"shelf_life_days" integer DEFAULT 7,
	"notes_ar" text,
	"notes_en" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" "period_status" DEFAULT 'open' NOT NULL,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"type" "account_type" NOT NULL,
	"normal_balance" "normal_balance" NOT NULL,
	"parent_id" uuid,
	"level" integer DEFAULT 1 NOT NULL,
	"is_posting_allowed" boolean DEFAULT true NOT NULL,
	"is_system_account" boolean DEFAULT false NOT NULL,
	"system_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"entry_number" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"reference" text,
	"source_type" "journal_source_type" NOT NULL,
	"source_id" uuid,
	"status" "journal_entry_status" DEFAULT 'draft' NOT NULL,
	"period_id" uuid,
	"posted_by" uuid,
	"posted_at" timestamp with time zone,
	"reversed_by" uuid,
	"reversed_at" timestamp with time zone,
	"reversal_entry_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entry_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"cost_center" text,
	"branch_id" uuid,
	"line_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addons" ADD CONSTRAINT "addons_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_addons" ADD CONSTRAINT "service_addons_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_addons" ADD CONSTRAINT "service_addons_addon_id_addons_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_components" ADD CONSTRAINT "service_components_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_components" ADD CONSTRAINT "service_components_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_costs" ADD CONSTRAINT "service_costs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_costs" ADD CONSTRAINT "service_costs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_media" ADD CONSTRAINT "service_media_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requirements" ADD CONSTRAINT "service_requirements_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_interactions" ADD CONSTRAINT "customer_interactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_item_addons" ADD CONSTRAINT "booking_item_addons_booking_item_id_booking_items_id_fk" FOREIGN KEY ("booking_item_id") REFERENCES "public"."booking_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_pipeline_stages" ADD CONSTRAINT "booking_pipeline_stages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_rule_id_approval_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."approval_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_gateway_configs" ADD CONSTRAINT "payment_gateway_configs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_commissions" ADD CONSTRAINT "vendor_commissions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_commissions" ADD CONSTRAINT "vendor_commissions_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payouts" ADD CONSTRAINT "vendor_payouts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payouts" ADD CONSTRAINT "vendor_payouts_vendor_id_users_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_reservations" ADD CONSTRAINT "asset_reservations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_reservations" ADD CONSTRAINT "asset_reservations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_reservations" ADD CONSTRAINT "asset_reservations_checked_out_by_users_id_fk" FOREIGN KEY ("checked_out_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_reservations" ADD CONSTRAINT "asset_reservations_returned_by_users_id_fk" FOREIGN KEY ("returned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_types" ADD CONSTRAINT "asset_types_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_asset_type_id_asset_types_id_fk" FOREIGN KEY ("asset_type_id") REFERENCES "public"."asset_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_current_location_id_locations_id_fk" FOREIGN KEY ("current_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_tasks" ADD CONSTRAINT "booking_tasks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_tasks" ADD CONSTRAINT "booking_tasks_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_tasks" ADD CONSTRAINT "booking_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_automation_rule_id_automation_rules_id_fk" FOREIGN KEY ("automation_rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_config" ADD CONSTRAINT "loyalty_config_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installed_plugins" ADD CONSTRAINT "installed_plugins_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installed_plugins" ADD CONSTRAINT "installed_plugins_plugin_id_app_store_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."app_store_plugins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installed_plugins" ADD CONSTRAINT "installed_plugins_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_proposals" ADD CONSTRAINT "rfp_proposals_rfp_id_rfp_requests_id_fk" FOREIGN KEY ("rfp_id") REFERENCES "public"."rfp_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_proposals" ADD CONSTRAINT "rfp_proposals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_config" ADD CONSTRAINT "site_config_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_reservations" ADD CONSTRAINT "hotel_reservations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_reservations" ADD CONSTRAINT "hotel_reservations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_reservations" ADD CONSTRAINT "hotel_reservations_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_reservations" ADD CONSTRAINT "hotel_reservations_room_unit_id_room_units_id_fk" FOREIGN KEY ("room_unit_id") REFERENCES "public"."room_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_seasonal_pricing" ADD CONSTRAINT "hotel_seasonal_pricing_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_seasonal_pricing" ADD CONSTRAINT "hotel_seasonal_pricing_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_logs" ADD CONSTRAINT "housekeeping_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housekeeping_logs" ADD CONSTRAINT "housekeeping_logs_room_unit_id_room_units_id_fk" FOREIGN KEY ("room_unit_id") REFERENCES "public"."room_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_units" ADD CONSTRAINT "room_units_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_units" ADD CONSTRAINT "room_units_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_units" ADD CONSTRAINT "room_units_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_rental_reservations" ADD CONSTRAINT "car_rental_reservations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_rental_reservations" ADD CONSTRAINT "car_rental_reservations_category_id_vehicle_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."vehicle_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_rental_reservations" ADD CONSTRAINT "car_rental_reservations_vehicle_unit_id_vehicle_units_id_fk" FOREIGN KEY ("vehicle_unit_id") REFERENCES "public"."vehicle_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_categories" ADD CONSTRAINT "vehicle_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_vehicle_unit_id_vehicle_units_id_fk" FOREIGN KEY ("vehicle_unit_id") REFERENCES "public"."vehicle_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_reservation_id_car_rental_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."car_rental_reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_units" ADD CONSTRAINT "vehicle_units_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_units" ADD CONSTRAINT "vehicle_units_category_id_vehicle_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."vehicle_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_units" ADD CONSTRAINT "vehicle_units_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_integration_config_id_integration_configs_id_fk" FOREIGN KEY ("integration_config_id") REFERENCES "public"."integration_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_integration_config_id_integration_configs_id_fk" FOREIGN KEY ("integration_config_id") REFERENCES "public"."integration_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flower_batches" ADD CONSTRAINT "flower_batches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flower_batches" ADD CONSTRAINT "flower_batches_variant_id_flower_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."flower_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flower_batches" ADD CONSTRAINT "flower_batches_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flower_recipe_components" ADD CONSTRAINT "flower_recipe_components_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flower_recipe_components" ADD CONSTRAINT "flower_recipe_components_variant_id_flower_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."flower_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flower_substitutions" ADD CONSTRAINT "flower_substitutions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flower_substitutions" ADD CONSTRAINT "flower_substitutions_primary_variant_id_flower_variants_id_fk" FOREIGN KEY ("primary_variant_id") REFERENCES "public"."flower_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flower_substitutions" ADD CONSTRAINT "flower_substitutions_substitute_variant_id_flower_variants_id_fk" FOREIGN KEY ("substitute_variant_id") REFERENCES "public"."flower_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flower_variant_pricing" ADD CONSTRAINT "flower_variant_pricing_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flower_variant_pricing" ADD CONSTRAINT "flower_variant_pricing_variant_id_flower_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."flower_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_period_id_accounting_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."accounting_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversed_by_users_id_fk" FOREIGN KEY ("reversed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_branch_id_locations_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_org_resource_idx" ON "audit_logs" USING btree ("org_id","resource","resource_id");--> statement-breakpoint
CREATE INDEX "otp_codes_phone_idx" ON "otp_codes" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_resource_action_idx" ON "permissions" USING btree ("resource","action");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_unique_idx" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bundles_org_slug_idx" ON "bundles" USING btree ("org_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_org_slug_idx" ON "categories" USING btree ("org_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "service_addons_unique_idx" ON "service_addons" USING btree ("service_id","addon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_org_slug_idx" ON "services" USING btree ("org_id","slug");--> statement-breakpoint
CREATE INDEX "booking_items_booking_id_idx" ON "booking_items" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_customer_id_idx" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "bookings_event_date_idx" ON "bookings" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "bookings_org_id_idx" ON "bookings" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "payments_booking_id_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_org_id_idx" ON "payments" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gateway_config_org_provider_idx" ON "payment_gateway_configs" USING btree ("org_id","provider");--> statement-breakpoint
CREATE INDEX "asset_reservations_asset_id_idx" ON "asset_reservations" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_reservations_booking_id_idx" ON "asset_reservations" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "asset_reservations_org_id_idx" ON "asset_reservations" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_org_code_idx" ON "coupons" USING btree ("org_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "landing_pages_org_slug_idx" ON "landing_pages" USING btree ("org_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "installed_plugins_org_plugin_idx" ON "installed_plugins" USING btree ("org_id","plugin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_org_slug_idx" ON "blog_posts" USING btree ("org_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "site_pages_org_slug_idx" ON "site_pages" USING btree ("org_id","slug");--> statement-breakpoint
CREATE INDEX "hotel_reservations_org_idx" ON "hotel_reservations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "hotel_reservations_dates_idx" ON "hotel_reservations" USING btree ("check_in_date","check_out_date");--> statement-breakpoint
CREATE INDEX "hotel_reservations_room_idx" ON "hotel_reservations" USING btree ("room_unit_id");--> statement-breakpoint
CREATE INDEX "housekeeping_logs_org_idx" ON "housekeeping_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "housekeeping_logs_room_idx" ON "housekeeping_logs" USING btree ("room_unit_id");--> statement-breakpoint
CREATE INDEX "room_types_org_idx" ON "room_types" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "room_units_org_idx" ON "room_units" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "room_units_type_idx" ON "room_units" USING btree ("room_type_id");--> statement-breakpoint
CREATE INDEX "car_rental_reservations_org_idx" ON "car_rental_reservations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "car_rental_reservations_dates_idx" ON "car_rental_reservations" USING btree ("pickup_date","return_date");--> statement-breakpoint
CREATE INDEX "car_rental_reservations_vehicle_idx" ON "car_rental_reservations" USING btree ("vehicle_unit_id");--> statement-breakpoint
CREATE INDEX "vehicle_categories_org_idx" ON "vehicle_categories" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "vehicle_inspections_org_idx" ON "vehicle_inspections" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "vehicle_inspections_vehicle_idx" ON "vehicle_inspections" USING btree ("vehicle_unit_id");--> statement-breakpoint
CREATE INDEX "vehicle_units_org_idx" ON "vehicle_units" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "vehicle_units_category_idx" ON "vehicle_units" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "integration_configs_org_idx" ON "integration_configs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "integration_configs_provider_idx" ON "integration_configs" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "sync_jobs_org_idx" ON "sync_jobs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_org_idx" ON "webhook_logs" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_created_idx" ON "webhook_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "flower_batches_org_idx" ON "flower_batches" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "flower_batches_variant_idx" ON "flower_batches" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "flower_batches_fefo_idx" ON "flower_batches" USING btree ("org_id","variant_id","expiry_estimated");--> statement-breakpoint
CREATE INDEX "flower_batches_quality_idx" ON "flower_batches" USING btree ("org_id","quality_status");--> statement-breakpoint
CREATE INDEX "flower_recipe_org_idx" ON "flower_recipe_components" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "flower_recipe_service_idx" ON "flower_recipe_components" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "flower_recipe_variant_idx" ON "flower_recipe_components" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "flower_subs_pair_idx" ON "flower_substitutions" USING btree ("org_id","primary_variant_id","substitute_variant_id");--> statement-breakpoint
CREATE INDEX "flower_subs_org_idx" ON "flower_substitutions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "flower_subs_primary_idx" ON "flower_substitutions" USING btree ("primary_variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "flower_pricing_org_variant_active_idx" ON "flower_variant_pricing" USING btree ("org_id","variant_id","is_active");--> statement-breakpoint
CREATE INDEX "flower_pricing_org_idx" ON "flower_variant_pricing" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "flower_variants_identity_idx" ON "flower_variants" USING btree ("flower_type","color","origin","grade","size","bloom_stage");--> statement-breakpoint
CREATE INDEX "flower_variants_type_idx" ON "flower_variants" USING btree ("flower_type");--> statement-breakpoint
CREATE INDEX "flower_variants_origin_idx" ON "flower_variants" USING btree ("origin");--> statement-breakpoint
CREATE INDEX "flower_variants_grade_idx" ON "flower_variants" USING btree ("grade");--> statement-breakpoint
CREATE INDEX "periods_org_id_idx" ON "accounting_periods" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "periods_status_idx" ON "accounting_periods" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "coa_org_code_idx" ON "chart_of_accounts" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "coa_org_id_idx" ON "chart_of_accounts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "coa_parent_id_idx" ON "chart_of_accounts" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "coa_system_key_idx" ON "chart_of_accounts" USING btree ("org_id","system_key");--> statement-breakpoint
CREATE UNIQUE INDEX "je_org_number_idx" ON "journal_entries" USING btree ("org_id","entry_number");--> statement-breakpoint
CREATE INDEX "je_org_id_idx" ON "journal_entries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "je_source_idx" ON "journal_entries" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "je_date_idx" ON "journal_entries" USING btree ("org_id","date");--> statement-breakpoint
CREATE INDEX "je_status_idx" ON "journal_entries" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "je_period_idx" ON "journal_entries" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "jel_entry_id_idx" ON "journal_entry_lines" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "jel_account_id_idx" ON "journal_entry_lines" USING btree ("account_id");