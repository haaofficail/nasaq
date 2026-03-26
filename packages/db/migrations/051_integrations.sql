CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  credentials JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}',
  webhook_url TEXT,
  webhook_secret TEXT,
  last_synced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, provider)
);

CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  endpoint TEXT,
  method TEXT,
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS integrations_org_id_idx ON integrations(org_id);
CREATE INDEX IF NOT EXISTS integration_logs_org_id_idx ON integration_logs(org_id);
CREATE INDEX IF NOT EXISTS integration_logs_integration_id_idx ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS integration_logs_created_at_idx ON integration_logs(created_at DESC);
