CREATE TYPE "public"."cashier_shift_status" AS ENUM('open', 'closed', 'reconciled');--> statement-breakpoint
CREATE TYPE "public"."treasury_account_type" AS ENUM('main_cash', 'branch_cash', 'cashier_drawer', 'petty_cash', 'bank_account', 'employee_custody');--> statement-breakpoint
CREATE TYPE "public"."treasury_source_type" AS ENUM('booking', 'invoice', 'expense', 'pos', 'transfer', 'payroll', 'manual');--> statement-breakpoint
CREATE TYPE "public"."treasury_transaction_type" AS ENUM('receipt', 'payment', 'transfer_in', 'transfer_out', 'opening', 'closing', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."treasury_transfer_status" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "cashier_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"treasury_account_id" uuid NOT NULL,
	"cashier_id" uuid NOT NULL,
	"opening_balance" numeric(15, 2) NOT NULL,
	"closing_balance" numeric(15, 2),
	"actual_cash" numeric(15, 2),
	"variance" numeric(15, 2),
	"status" "cashier_shift_status" DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"notes" text,
	"closed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "treasury_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "treasury_account_type" NOT NULL,
	"branch_id" uuid,
	"responsible_user_id" uuid,
	"opening_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"current_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"account_number" text,
	"bank_name" text,
	"iban" text,
	"gl_account_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treasury_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"treasury_account_id" uuid NOT NULL,
	"transaction_type" "treasury_transaction_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"balance_after" numeric(15, 2) NOT NULL,
	"description" text NOT NULL,
	"reference" text,
	"voucher_number" text,
	"source_type" "treasury_source_type",
	"source_id" uuid,
	"payment_method" text,
	"counterparty_type" text,
	"counterparty_id" uuid,
	"counterparty_name" text,
	"shift_id" uuid,
	"period_id" uuid,
	"journal_entry_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treasury_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"from_account_id" uuid NOT NULL,
	"to_account_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text,
	"transfer_date" timestamp with time zone NOT NULL,
	"status" "treasury_transfer_status" DEFAULT 'pending' NOT NULL,
	"from_transaction_id" uuid,
	"to_transaction_id" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"journal_entry_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_treasury_account_id_treasury_accounts_id_fk" FOREIGN KEY ("treasury_account_id") REFERENCES "public"."treasury_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_accounts" ADD CONSTRAINT "treasury_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_accounts" ADD CONSTRAINT "treasury_accounts_branch_id_locations_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_accounts" ADD CONSTRAINT "treasury_accounts_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_accounts" ADD CONSTRAINT "treasury_accounts_gl_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_treasury_account_id_treasury_accounts_id_fk" FOREIGN KEY ("treasury_account_id") REFERENCES "public"."treasury_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_shift_id_cashier_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."cashier_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_period_id_accounting_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."accounting_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transfers" ADD CONSTRAINT "treasury_transfers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transfers" ADD CONSTRAINT "treasury_transfers_from_account_id_treasury_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."treasury_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transfers" ADD CONSTRAINT "treasury_transfers_to_account_id_treasury_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."treasury_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transfers" ADD CONSTRAINT "treasury_transfers_from_transaction_id_treasury_transactions_id_fk" FOREIGN KEY ("from_transaction_id") REFERENCES "public"."treasury_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transfers" ADD CONSTRAINT "treasury_transfers_to_transaction_id_treasury_transactions_id_fk" FOREIGN KEY ("to_transaction_id") REFERENCES "public"."treasury_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transfers" ADD CONSTRAINT "treasury_transfers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treasury_transfers" ADD CONSTRAINT "treasury_transfers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cs_account_idx" ON "cashier_shifts" USING btree ("treasury_account_id");--> statement-breakpoint
CREATE INDEX "cs_cashier_idx" ON "cashier_shifts" USING btree ("cashier_id");--> statement-breakpoint
CREATE INDEX "cs_org_status_idx" ON "cashier_shifts" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "cs_opened_at_idx" ON "cashier_shifts" USING btree ("org_id","opened_at");--> statement-breakpoint
CREATE INDEX "ta_org_id_idx" ON "treasury_accounts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ta_type_idx" ON "treasury_accounts" USING btree ("org_id","type");--> statement-breakpoint
CREATE INDEX "ta_branch_idx" ON "treasury_accounts" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "tt_account_idx" ON "treasury_transactions" USING btree ("treasury_account_id");--> statement-breakpoint
CREATE INDEX "tt_org_date_idx" ON "treasury_transactions" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "tt_source_idx" ON "treasury_transactions" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "tt_shift_idx" ON "treasury_transactions" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "tt_voucher_idx" ON "treasury_transactions" USING btree ("org_id","voucher_number");--> statement-breakpoint
CREATE INDEX "ttr_org_idx" ON "treasury_transfers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ttr_from_idx" ON "treasury_transfers" USING btree ("from_account_id");--> statement-breakpoint
CREATE INDEX "ttr_to_idx" ON "treasury_transfers" USING btree ("to_account_id");--> statement-breakpoint
CREATE INDEX "ttr_status_idx" ON "treasury_transfers" USING btree ("org_id","status");