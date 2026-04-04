# Codebase Audit — نسق
**Date:** 2026-04-04 | **Auditor:** ln-620 + 10 workers | **Overall Score: 4.8 / 10**

---

## Executive Summary

نسق has a solid architectural foundation: consistent `orgId` session enforcement, correct RBAC middleware, a well-designed GL posting engine, and zero TypeScript compile errors. However, the audit found **4 CRITICAL issues including two real-money race conditions in production**, a **financial integrity gap** in the property module, and a **security score of 3.0/10** driven by 5 HIGH CVEs.

---

## Scores by Category

| Category | Score | C | H | M | L |
|----------|-------|---|---|---|---|
| Security | 3.0/10 | 0 | 5 | 4 | 0 |
| Concurrency | 3.5/10 | 2 | 2 | 3 | 2 |
| Code Quality — Dashboard | 4.3/10 | 0 | 18 | 24 | 9 |
| Dependencies | 4.0/10 | 0 | 6 | 6 | 0 |
| Code Principles — API | 4.5/10 | 1 | 2 | 4 | 2 |
| Code Quality — API | 5.5/10 | 1 | 5 | 10 | 6 |
| Code Principles — Dashboard | 5.5/10 | 1 | 2 | 4 | 2 |
| Dead Code | 5.0/10 | 0 | 3 | 4 | 3 |
| Observability | 6.0/10 | 0 | 1 | 3 | 3 |
| Lifecycle | 7.5/10 | 0 | 0 | 0 | 6 |
| **Overall** | **4.8/10** | **5** | **44** | **62** | **33** |

---

## CRITICAL Issues — Fix Before Next Release

### C1 — Treasury Balance TOCTOU (`routes/treasury.ts`)
`POST /treasury/receipt` and `POST /treasury/payment` read balance, compute new value, then open a transaction to write — the read is **outside** the transaction. Two concurrent vouchers read the same stale balance; one write is silently lost. Payment path can go negative even after check passes.
**Fix:** Wrap read + compute + write in `db.transaction()` with `SELECT ... FOR UPDATE` on account row. **Effort: M**

### C2 — Stay Engine Double-Booking (`engines/stay/index.ts`)
Availability overlap check and `INSERT` are two separate statements with no transaction or lock. Two simultaneous reservations for the same unit on overlapping dates both pass.
**Fix:** Wrap check + insert in `db.transaction()` with `FOR UPDATE` on unit row. **Effort: M**

### C3 — Property Module Missing GL Entries (`routes/property.ts`)
6 payment/invoice routes record money without calling `autoJournal` or `postCashSale`:
- `POST /invoices/:id/pay` (line 1092)
- `POST /payments` (line 1161)
- `POST /payments/quick` (line 2470)
- `POST /construction/:id/payments` (line 2172)
- `POST /invoices/generate` (line 954)
- `POST /invoices/generate-for-contract/:id` (line 1008)

All other financial modules (bookings, finance, HR, POS) correctly use the GL engine.
**Fix:** Add `autoJournal()` after each write. **Effort: L**

### C4 — Booking Number Race in 4 Engines (`lib/booking-number.ts`)
Appointment, stay, table, and event engines use `SELECT COUNT(*) + 1` outside any transaction. Concurrent requests produce duplicate booking numbers.
**Fix:** Replace with `crypto.randomUUID()` matching `bookings.ts`. **Effort: S**

### C5 — Emoji in Production Code (Constitution Violation)
`ServicesPage.tsx:13-22` defines `SERVICE_TYPES` with emoji icons (`"🔧"`, `"🏠"`, `"🎁"`). `PublicFlowerPage.tsx` uses `"🎁"` as fallback. Constitution: **لا emoji أبداً**.
**Fix:** Replace with Lucide icons. **Effort: S**

---

## HIGH Issues

### Security
| # | Finding | Location | CVE |
|---|---------|----------|-----|
| H1 | `xlsx@0.18.5` Prototype Pollution + ReDoS — no upstream patch, replace with `exceljs` | dashboard deps | CVE-2023-30533 |
| H2 | `music-metadata` via Baileys — infinite loop DoS | api transitive | CVE-2026-32256 |
| H3 | `picomatch` via tailwindcss — ReDoS + method injection | dashboard transitive | CVE-2026-33671/72 |
| H4 | `lodash` via recharts — code injection | dashboard transitive | CVE-2026-4800 |
| H5 | Moyasar webhook secret optional — silently accepts when `MOYASAR_WEBHOOK_SECRET` absent | `routes/payments.ts:319` | — |

### Concurrency
| # | Finding | Location |
|---|---------|----------|
| H6 | Payment webhook not atomically idempotent — two concurrent webhooks both process | `routes/payments.ts` |
| H7 | Supply deduction uses read-compute-write without lock | `routes/bookings.ts` |

### Code Quality — API
| # | Finding | Location |
|---|---------|----------|
| H8 | N+1: `syncOrgEntitlements` runs one query per feature in a loop | `lib/entitlements-sync.ts:140` |
| H9 | God module: 2,487 lines covering 15 sub-domains | `routes/property.ts` |
| H10 | God module: 1,747 lines | `routes/finance.ts` |
| H11 | God module: 1,699 lines | `routes/hr.ts` |
| H12 | `PLAN_PRICES` defined in 3 inconsistent places | `subscription.ts`, `billing.ts` |

### Code Quality — Dashboard
| # | Finding | Location |
|---|---------|----------|
| H13 | WebsitePage: 1,609 lines, 272 branch points | `pages/WebsitePage.tsx` |
| H14 | 18 page files over 1,000 lines | codebase-wide |
| H15 | 1,038 uses of `: any` in `api.ts` — eliminates type safety app-wide | `lib/api.ts` |
| H16 | Serial API calls in ServiceFormPage.save() — 15+ sequential round-trips | `pages/ServiceFormPage.tsx` |

### Dead Code
| # | Finding | Impact |
|---|---------|--------|
| H17 | `capability-matrix.ts` never imported; `admin.ts` duplicates it | Capability drift |
| H18 | `quota-tracker.ts` — quota enforcement never runs anywhere | Plan limits unenforced |
| H19 | `engines/` entire directory — zero runtime wiring in `index.ts` | Dead future arch |

---

## Selected MEDIUM Issues

| # | Category | Finding | Location |
|---|----------|---------|----------|
| M1 | Observability | No request duration middleware — `api_latency_ms` never populated | `src/index.ts` |
| M2 | Observability | `requestId` never included in any of the 87 pino log calls | all routes |
| M3 | Observability | Only 10 of 70 route files use pino logger | routes/ |
| M4 | Observability | 104 `console.error/warn` in production code | whatsapp-qr, property, automation |
| M5 | Principles/API | 854 inline `c.json({error:...})` bypassing `apiErr()` — no requestId | 69 files |
| M6 | Principles/API | 5 silent `catch {}` blocks — no logging | flower-master, pos, media, billing |
| M7 | Principles/API | `contracts.ts` 100% raw `pool.query` SQL | `routes/contracts.ts` |
| M8 | Principles/Dash | `SERVICE_TYPES` duplicated in ServicesPage + ServiceFormPage | 2 files |
| M9 | Principles/Dash | `BUSINESS_TYPES` duplicated in SettingsPage + ProfileSettingsPage | 2 files |
| M10 | Principles/Dash | Missing loading states in SchoolAccountPage, SchoolSetupPage | 2 files |
| M11 | Security | File upload MIME from client-supplied `file.type`, not magic bytes | `routes/file-upload.ts` |
| M12 | Security | `status` field not enum-validated in online-orders, flower-builder | 2 routes |

---

## Advisory Findings

| # | Category | Finding |
|---|----------|---------|
| A1 | Lifecycle | Migration failure doesn't crash server — app runs with incomplete schema |
| A2 | Lifecycle | No hard timeout on `server.close()` |
| A3 | Lifecycle | `pm2 wait_ready: false` — zero-downtime reload not possible |
| A4 | Lifecycle | `prettyJSON()` middleware active in production — CPU overhead |
| A5 | Principles/Dash | Hardcoded `#5b9bd5` in 7 property pages — use `bg-brand-500` |
| A6 | Dead Code | `navigate` unused in StorefrontPage — possible broken UX |
| A7 | Dead Code | `recoverMut` never triggered in RentalAnalyticsPage |
| A8 | Dependencies | `pdfmake` + `sharp` — zero imports in source (remove both) |
| A9 | Dependencies | `@types/dompurify` deprecated — remove devDependency |

---

## Strengths

- Zero TypeScript compile errors (`tsc --noEmit` passes clean)
- Multi-tenant isolation consistent — `getOrgId(c)` in all 67 route files
- RBAC correctly layered at every level
- GL posting engine well-designed and used correctly in bookings, finance, HR, POS
- No hardcoded secrets — all credentials from `process.env`
- No XSS — React JSX auto-escaping, no `dangerouslySetInnerHTML`
- Brand name consistently "نسق" — never "ناسق"
- Graceful shutdown correctly implemented
- `platform_audit_log` + 25-check diagnostics engine solid foundation

---

## Prioritized Action Plan

### P0 — This Sprint (before next release)
1. Fix Treasury TOCTOU — transaction + FOR UPDATE (2h)
2. Fix Stay engine double-booking — transaction + FOR UPDATE (2h)
3. Add GL entries to 6 property payment routes (4h)
4. Fix booking number race — use randomUUID in 4 engines (1h)
5. Replace `xlsx` with `exceljs` (3h)
6. Make `MOYASAR_WEBHOOK_SECRET` required — 503 when absent (30min)
7. Remove emoji from ServicesPage + PublicFlowerPage (30min)

### P1 — Next Sprint
8. Upgrade recharts → v3 (fixes lodash CVE)
9. Upgrade tailwindcss → v4 (fixes picomatch CVEs)
10. Batch-fix `syncOrgEntitlements` N+1 — one bulk upsert
11. Add request duration middleware — populate `api_latency_ms`
12. Add `requestId` to all pino log calls
13. Wire or delete `quota-tracker.ts`
14. Remove `pdfmake` and `sharp`

### P2 — Backlog
15. Extract `SERVICE_TYPES` / `BUSINESS_TYPES` to `constants.ts`
16. Migrate `contracts.ts` to Drizzle ORM
17. Replace 854 inline error responses with `apiErr()`
18. Type `api.ts` — remove `: any` declarations
19. Split `property.ts` (2487L), `finance.ts` (1747L), `hr.ts` (1699L) into sub-routers
20. Split god page files into sub-components

---

*Generated by ln-620-codebase-auditor v5.0.0 — 2026-04-04*
