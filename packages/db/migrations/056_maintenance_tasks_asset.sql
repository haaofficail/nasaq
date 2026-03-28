-- migration 056: link maintenance tasks to specific asset units
ALTER TABLE maintenance_tasks
  ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS maintenance_tasks_asset_idx ON maintenance_tasks(asset_id);

COMMENT ON COLUMN maintenance_tasks.asset_id IS 'Optional: the specific asset unit this task is about';
