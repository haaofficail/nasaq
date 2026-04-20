# Test Coverage Report

Last updated: 2026-04-20

## Summary

| Test File | Tests | Status |
|---|---|---|
| `canonical/booking-records.test.ts` | 43 | PASS |
| `canonical/booking-engines.test.ts` | 15 | PASS |
| `pages-v2-routes.test.ts` | 13 | PASS |
| `pagebuilder-sources.test.ts` | 24 | PASS |
| **Total** | **95** | **95/95 PASS** |

## Canonical Booking System Coverage

### booking-records.test.ts (43 tests)

| Group | Tests |
|---|---|
| إنشاء حجز (create) | 4 |
| إلغاء واسترداد (cancel + refund) | 3 |
| كشف التعارض (conflict detection) | 5 |
| تحولات الحالة (status transitions) | 5 |
| عزل المستأجرين (multi-tenant isolation) | 4 |
| الحجوزات المتكررة (recurring bookings) | 3 |
| كوبون و UTM | 3 |
| PDPL / الخصوصية | 2 |
| المناطق الزمنية (timezone) | 2 |
| بنود الحجز (booking lines) | 3 |
| روابط الدفع (payment links) | 3 |
| race condition | 1 |
| E2E flows | 3 |
| **Total** | **43** |

### booking-engines.test.ts (15 tests)

| Engine | Tests |
|---|---|
| Appointment Engine (`appointment_bookings`) | 5 |
| Stay Engine (`stay_bookings`) | 3 |
| Table Engine (`table_reservations`) | 3 |
| Event Engine (`event_bookings`) | 4 |
| **Total** | **15** |

## Bugs Found During Phase 2.5

### Bug 1 — booking_payment_links FK mismatch

- **Symptom**: 4 payment link tests failed with FK violation on `payment_id`
- **Root cause**: Drizzle-kit migration still had `FOREIGN KEY (payment_id) REFERENCES payments(id)` but `canonical-bookings.ts` removed it in Phase 1.5 (payments table stays in legacy schema until Phase 3)
- **Fix**: Migration `144_drop_payment_link_payment_fk.sql` — drops constraint with `IF EXISTS`
- **Commit**: `fix: drop payment_id FK from booking_payment_links — schema/migration mismatch`

### Bug 2 — Test DB setup: early migrations reference tables created later

- **Symptom**: `migrate.ts` failed at migration 008 with `relation "flower_packages" does not exist`; same for `menu_categories`, `attendance_schedules`, etc.
- **Root cause**: Numbered migrations 004–142 were written for a production DB that already had these tables from manual SQL. They cannot run on a fresh DB from drizzle-kit alone.
- **Fix**: CI workflow baselines migrations 004–142 (schema already present from drizzle-kit output), then runs only 143+ via migrate.ts
- **Commit**: `test: add CI workflow with correct baseline strategy for test DB`

## Test Strategy

- **No mocks** — all tests hit real PostgreSQL
- **Transaction rollback isolation** — each test wraps in BEGIN/ROLLBACK
- **`describe.skipIf(skipIfNoDb)`** — tests skip gracefully when no DB is configured
- **Drizzle ORM** used for all DB operations (same as production code)
