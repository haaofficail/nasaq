import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../../../db/migrations/158_restore_smart_guardian_tables.sql", import.meta.url),
  "utf8",
);

describe("Smart Guardian restore migration", () => {
  it("restores the tables used by Guardian runtime paths", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS guardian_issues");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS guardian_fixes");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS guardian_scans");
  });

  it("guards columns used by scheduler, scanner, engine, and admin routes", () => {
    for (const column of [
      "ADD COLUMN IF NOT EXISTS type",
      "ADD COLUMN IF NOT EXISTS status",
      "ADD COLUMN IF NOT EXISTS started_at",
      "ADD COLUMN IF NOT EXISTS completed_at",
      "ADD COLUMN IF NOT EXISTS duration_ms",
      "ADD COLUMN IF NOT EXISTS total_checks",
      "ADD COLUMN IF NOT EXISTS issues_found",
      "ADD COLUMN IF NOT EXISTS auto_fixed",
      "ADD COLUMN IF NOT EXISTS critical_count",
      "ADD COLUMN IF NOT EXISTS high_count",
      "ADD COLUMN IF NOT EXISTS medium_count",
      "ADD COLUMN IF NOT EXISTS low_count",
      "ADD COLUMN IF NOT EXISTS fingerprint",
      "ADD COLUMN IF NOT EXISTS occurrences",
      "ADD COLUMN IF NOT EXISTS issue_id",
    ]) {
      expect(migration).toContain(column);
    }
  });

  it("restores the Guardian lookup indexes", () => {
    for (const index of [
      "idx_guardian_issues_tenant",
      "idx_guardian_issues_status",
      "idx_guardian_issues_severity",
      "idx_guardian_issues_code",
      "idx_guardian_issues_fp",
      "idx_guardian_issues_last_seen",
      "idx_guardian_fixes_issue",
      "idx_guardian_scans_started",
    ]) {
      expect(migration).toContain(`CREATE INDEX IF NOT EXISTS ${index}`);
    }
  });
});
