CREATE TYPE "public"."reconciliation_item_type" AS ENUM('outstanding_check', 'deposit_in_transit', 'bank_charge', 'bank_interest', 'nsf_check', 'error_correction', 'other');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_status" AS ENUM('draft', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_type" AS ENUM('bank', 'cash', 'ar', 'ap');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'view', 'login', 'logout', 'post', 'reverse', 'close', 'lock', 'export', 'approve', 'reject');--> statement-breakpoint
CREATE TABLE "reconciliation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement_id" uuid NOT NULL,
	"item_type" "reconciliation_item_type" NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"adjusts_side" text NOT NULL,
	"journal_entry_id" uuid,
	"is_cleared" boolean DEFAULT false NOT NULL,
	"cleared_at" timestamp with time zone,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"type" "reconciliation_type" NOT NULL,
	"status" "reconciliation_status" DEFAULT 'draft' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"gl_account_id" uuid,
	"book_balance" numeric(15, 2) NOT NULL,
	"external_balance" numeric(15, 2) NOT NULL,
	"adjusted_book_balance" numeric(15, 2),
	"adjusted_external_balance" numeric(15, 2),
	"final_difference" numeric(15, 2),
	"notes" text,
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"user_id" uuid,
	"action" "audit_action" NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_statement_id_reconciliation_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "public"."reconciliation_statements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_statements" ADD CONSTRAINT "reconciliation_statements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_statements" ADD CONSTRAINT "reconciliation_statements_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_statements" ADD CONSTRAINT "reconciliation_statements_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_statements" ADD CONSTRAINT "reconciliation_statements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recon_items_statement_idx" ON "reconciliation_items" USING btree ("statement_id");--> statement-breakpoint
CREATE INDEX "recon_org_id_idx" ON "reconciliation_statements" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "recon_status_idx" ON "reconciliation_statements" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "recon_period_idx" ON "reconciliation_statements" USING btree ("org_id","period_end");--> statement-breakpoint
CREATE INDEX "audit_org_date_idx" ON "audit_log" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_log" USING btree ("org_id","action");