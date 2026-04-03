-- ============================================================
-- 088 — Media Galleries (معرض صور مشترك)
-- Photography studios share client albums via shareable links
-- ============================================================

CREATE TABLE IF NOT EXISTS "media_galleries" (
  "id"           uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id"       uuid        NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "created_by_id" uuid       REFERENCES "users"("id") ON DELETE SET NULL,
  "name"         text        NOT NULL,
  "description"  text,
  "token"        text        NOT NULL UNIQUE,
  "asset_ids"    text[]      NOT NULL DEFAULT '{}',
  "client_name"  text,
  "expires_at"   timestamptz,
  "is_active"    boolean     NOT NULL DEFAULT true,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "media_galleries_org_idx"   ON "media_galleries" ("org_id");
CREATE INDEX IF NOT EXISTS "media_galleries_token_idx" ON "media_galleries" ("token");
