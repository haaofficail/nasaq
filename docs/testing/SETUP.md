# Test Database Setup

Integration tests hit a real PostgreSQL database — no mocks.

## Requirements

- PostgreSQL 17 (local or Docker)
- pnpm

## Local Setup (macOS)

```bash
# Install PostgreSQL 17 via Homebrew
brew install postgresql@17
brew services start postgresql@17
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

# Create test database
createdb tarmiz_test

# Apply base schema (drizzle-kit generated migrations)
cd packages/db
for f in migrations/0000_*.sql migrations/0001_*.sql migrations/0002_*.sql \
          migrations/0003_*.sql migrations/0004_*.sql migrations/0005_*.sql \
          migrations/0006_*.sql; do
  [ -f "$f" ] && psql postgresql://$(whoami)@localhost:5432/tarmiz_test -f "$f"
done

# Baseline: mark migrations 004–142 as applied (schema already in drizzle output)
psql postgresql://$(whoami)@localhost:5432/tarmiz_test -c "
  CREATE TABLE IF NOT EXISTS _nasaq_migrations (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  INSERT INTO _nasaq_migrations (filename) VALUES
    ('0000_icy_diamondback.sql'),('0001_purple_ozymandias.sql'),
    ('0002_motionless_prodigy.sql'),('0003_parched_husk.sql'),
    ('0004_high_la_nuit.sql'),('0005_neat_talon.sql'),
    ('0006_typical_lord_tyger.sql')
  ON CONFLICT DO NOTHING;
"
# ... then paste the full baseline INSERT from .github/workflows/test.yml

# Apply new migrations (143+)
DATABASE_URL="postgresql://$(whoami)@localhost:5432/tarmiz_test" pnpm tsx scripts/migrate.ts

# Run tests
cd ../packages/api
TEST_DATABASE_URL="postgresql://$(whoami)@localhost:5432/tarmiz_test" pnpm test
```

## Environment Variables

| Variable | Description |
|---|---|
| `TEST_DATABASE_URL` | Postgres connection string for tests (preferred) |
| `DATABASE_URL` | Fallback if TEST_DATABASE_URL not set |

Both can be set in `packages/api/.env.test`.

## Why drizzle-kit migrations as baseline?

The numbered migrations (004–142) were written for a production DB that already had schema from earlier manual SQL. Running them on a fresh DB fails because early migrations reference tables created later. The drizzle-kit migrations (0000–0006) capture the full schema state and are the canonical source of truth for fresh setups. New migrations (143+) are applied on top.

## Known Schema Differences (test vs production)

| Table | Column | Difference | Migration |
|---|---|---|---|
| `booking_payment_links` | `payment_id` | FK to `payments(id)` dropped | 144 |
| `booking_records` | `coupon_code`, `utm_*`, `is_recurring`, etc. | Added | 143 |

## Test Isolation

Each test runs inside a PostgreSQL transaction that is rolled back after the test. No cleanup between tests is needed.
