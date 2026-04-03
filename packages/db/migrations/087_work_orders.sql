-- ============================================================
-- 087 — Work Orders & Access Control
-- أوامر العمل (ورشة، صيانة، خياطة) + سجل الدخول (جيم، اشتراكات)
-- ============================================================

-- Work orders table
CREATE TABLE IF NOT EXISTS "work_orders" (
  "id"                  uuid         PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id"              uuid         NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"         uuid         REFERENCES "locations"("id") ON DELETE SET NULL,
  "order_number"        text         NOT NULL,
  "customer_id"         uuid         REFERENCES "customers"("id") ON DELETE SET NULL,
  "customer_name"       text         NOT NULL,
  "customer_phone"      text,
  "status"              text         NOT NULL DEFAULT 'received',
  "category"            text         NOT NULL DEFAULT 'repair',
  "item_name"           text         NOT NULL,
  "item_model"          text,
  "item_serial"         text,
  "item_barcode"        text,
  "item_condition"      text,
  "problem_description" text         NOT NULL,
  "diagnosis"           text,
  "resolution"          text,
  "estimated_cost"      numeric(10,2),
  "final_cost"          numeric(10,2),
  "deposit_amount"      numeric(10,2) DEFAULT '0',
  "deposit_paid"        boolean      DEFAULT false,
  "is_paid"             boolean      DEFAULT false,
  "warranty_days"       integer      DEFAULT 0,
  "estimated_ready_at"  timestamptz,
  "ready_at"            timestamptz,
  "delivered_at"        timestamptz,
  "assigned_to_id"      uuid         REFERENCES "users"("id") ON DELETE SET NULL,
  "internal_notes"      text,
  "is_active"           boolean      NOT NULL DEFAULT true,
  "created_by_id"       uuid         REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"          timestamptz  NOT NULL DEFAULT now(),
  "updated_at"          timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "work_orders_org_idx"      ON "work_orders" ("org_id");
CREATE INDEX IF NOT EXISTS "work_orders_status_idx"   ON "work_orders" ("org_id", "status");
CREATE INDEX IF NOT EXISTS "work_orders_number_idx"   ON "work_orders" ("org_id", "order_number");
CREATE INDEX IF NOT EXISTS "work_orders_customer_idx" ON "work_orders" ("customer_id");
CREATE INDEX IF NOT EXISTS "work_orders_assigned_idx" ON "work_orders" ("assigned_to_id");

-- Access logs table
CREATE TABLE IF NOT EXISTS "access_logs" (
  "id"            uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id"        uuid        NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "location_id"   uuid        REFERENCES "locations"("id") ON DELETE SET NULL,
  "customer_id"   uuid        REFERENCES "customers"("id") ON DELETE SET NULL,
  "customer_name" text,
  "method"        text        NOT NULL DEFAULT 'manual',
  "granted"       boolean     NOT NULL DEFAULT true,
  "deny_reason"   text,
  "access_token"  text,
  "accessed_at"   timestamptz NOT NULL DEFAULT now(),
  "created_by_id" uuid        REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "access_logs_org_idx"         ON "access_logs" ("org_id");
CREATE INDEX IF NOT EXISTS "access_logs_accessed_at_idx" ON "access_logs" ("org_id", "accessed_at");
CREATE INDEX IF NOT EXISTS "access_logs_customer_idx"    ON "access_logs" ("customer_id");
