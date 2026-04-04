# Architectural Guardrails — نسق

## Core Principle

All business data flows through a single path:

```
API → Validation → Service Layer → DB
```

**Never** write directly to sensitive tables from scripts, SQL files, or seed files.

---

## What Is Forbidden

Direct writes to sensitive tables from:
- Bash/curl scripts
- Seed scripts (unless reference/lookup data)
- Manual SQL outside approved migrations or repair scripts
- Any code path that bypasses the API layer

---

## What Is Allowed

| Path | Allowed Action |
|---|---|
| `packages/db/migrations/` | Schema DDL changes (CREATE TABLE, ALTER TABLE) |
| `packages/db/schema/` | Drizzle schema definitions |
| `scripts/repairs/` | Approved data repair scripts (explicit approval required) |
| `packages/db/seeds/reference/` | Lookup/reference data only (capability_registry, plan_capabilities, etc.) |

---

## Sensitive Tables

Direct INSERT/UPDATE/DELETE is forbidden on these tables outside allowed paths:

**Orders & Operations**
- `flower_orders`, `bookings`, `booking_items`

**Financial**
- `invoices`, `invoice_items`, `invoice_payments`
- `journal_entries`, `journal_entry_lines`, `payments`

**Capabilities & Permissions**
- `organization_capability_overrides`, `role_permissions`, `roles`

**Inventory**
- `inventory_movements`, `stock_movements`, `flower_batches`

**Customer Activity**
- `customers`

**Approvals**
- `approvals`, `approval_logs`

**Delivery**
- `fulfillments`, `allocations`

---

## How to Enable a Capability (Official Method)

Use `capability-service.ts`:

```typescript
import { enableCapability } from "@/lib/capability-service";

await enableCapability({
  orgId: "...",
  capabilityKey: "accounting",
  reason: "Upgraded to pro plan",
  setBy: userId,
});
```

Do **not** write directly to `organization_capability_overrides`.

---

## How to Modify Permissions (Official Method)

Use `permission-service.ts` or the team API:

```typescript
import { assignPermissionsToRole } from "@/lib/permission-service";

await assignPermissionsToRole({
  roleId: "...",
  orgId: "...",
  permissions: ["bookings:create", "bookings:edit", "bookings:view"],
  actorId: userId,
  reason: "Role setup",
});
```

Or via API: `PUT /api/v1/team/roles/:id/permissions`

Do **not** write directly to `role_permissions`.

---

## How to Run a Simulation / Seed Business Data (Official Method)

Use the API simulation layer — authenticate as a real user and call the API:

```typescript
// 1. Authenticate
const loginRes = await fetch("http://localhost:3000/api/v1/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "...", password: "..." }),
});
const { token } = await loginRes.json();

// 2. Create data via API
const orderRes = await fetch("http://localhost:3000/api/v1/flower-builder/orders", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ ... }),
});
```

This ensures all business rules, financial entries, and audit logs are created correctly.

---

## Approved vs Forbidden Patterns

| Pattern | Status | Reason |
|---|---|---|
| `enableCapability({ orgId, capabilityKey })` | Approved | Goes through service layer + audit |
| `INSERT INTO organization_capability_overrides` | Forbidden | Bypasses service layer, no audit |
| `assignPermissionsToRole({ roleId, permissions })` | Approved | Goes through service layer + audit |
| `INSERT INTO role_permissions` | Forbidden | Bypasses cache invalidation + audit |
| `POST /api/v1/bookings` | Approved | Full validation + financial entries |
| `INSERT INTO bookings` | Forbidden | Bypasses all business rules |
| `INSERT INTO plan_capabilities` (in migration) | Approved | Reference data in migration |
| `INSERT INTO plan_capabilities` (in seed script) | Approved if in `seeds/reference/` | Reference data only |

---

## Violation Detection

Run the architectural scanner to detect violations:

```bash
npx tsx scripts/architecture/scan-violations.ts
```

The scanner checks all `.ts`, `.js`, `.sh`, `.sql` files and reports direct writes to sensitive tables.

---

## Capability Resolution Chain

When resolving an org's capabilities, the system follows this chain (priority: last wins):

1. **businessType defaults** — base capabilities for the org's business type
2. **plan capabilities** — capabilities included in the org's subscription plan (`plan_capabilities` table)
3. **operatingProfile additions** — extra capabilities unlocked by the org's operating profile
4. **stored enabledCapabilities** — backward-compat cache on the organizations row
5. **org_capability_overrides** — explicit force-on or force-off overrides

All modifications should go through `capability-service.ts` to ensure cache invalidation and audit logging.
