CREATE TYPE "public"."dam_asset_type" AS ENUM('image', 'video', 'document', 'logo');--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by" text,
	"name" text NOT NULL,
	"file_url" text NOT NULL,
	"r2_key" text NOT NULL,
	"file_type" "dam_asset_type" DEFAULT 'image' NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"tags" text[] DEFAULT '{}',
	"category" text,
	"alt_text" text,
	"related_service_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_assets_org_idx" ON "media_assets" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "media_assets_type_idx" ON "media_assets" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "media_assets_created_idx" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "media_assets_service_idx" ON "media_assets" USING btree ("related_service_id");--> statement-breakpoint
CREATE INDEX "media_assets_parent_idx" ON "media_assets" USING btree ("parent_id");