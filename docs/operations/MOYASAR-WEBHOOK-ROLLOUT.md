# Moyasar Webhook Signature Verification — Rollout Plan

## Background

Moyasar webhook signature verification was added in Phase 3.C with feature flag support to allow safe production rollout.

**Why feature flag:**
Moyasar's documentation does not specify the exact signature format. Our implementation assumes HMAC-SHA256 on raw body (industry standard — Stripe, GitHub, Adyen). Feature flag allows observation before enforcement.

## Environment Variable

`MOYASAR_WEBHOOK_VERIFICATION` = `log` | `strict` | `disabled`

- `log` (default): verify signature, log result, process webhook regardless
- `strict`: reject invalid signatures with 401
- `disabled`: skip verification entirely (emergency kill switch)

## Rollout Phases

### Phase 1 — Deploy in log mode (Day 0)

**Action:**
Deploy with `MOYASAR_WEBHOOK_VERIFICATION=log`

**Expected behavior:**
- All webhooks processed normally
- Each webhook logs structured entry with `isValid` true/false
- No webhook rejections

**Success criteria:**
- Zero 500 errors from webhook handler
- Log entries visible in production logs

### Phase 2 — Monitor for 7 days (Days 1–7)

**Daily check:**

```
grep "moyasar_webhook_received" <production-logs> | jq '{isValid, mode, hasSignature}'
```

**What to look for:**

| Observation | Action |
|---|---|
| `isValid: true` on all webhooks | Continue monitoring |
| `isValid: false` on some webhooks | Investigate — may be signature format mismatch |
| `hasSignature: false` on some webhooks | Moyasar may not always send signature — note which event types |
| Any 500 errors | Investigate `moyasar_webhook_processing_failed` entries |

**Gate to Phase 3:**
- 7 consecutive days with `isValid: true` on all signed webhooks
- Zero processing errors

### Phase 3 — Switch to strict mode (Day 8+)

**Action:**
Change env var (no redeploy needed if using runtime env):

```
MOYASAR_WEBHOOK_VERIFICATION=strict
```

**Expected behavior:**
- Webhooks with invalid or missing signatures → 401
- Moyasar will retry rejected webhooks (up to 6 attempts)

**Rollback:**
If legitimate webhooks are being rejected:

```
MOYASAR_WEBHOOK_VERIFICATION=log
```

Revert to log mode immediately, investigate signatures, then re-attempt strict.

## Emergency Kill Switch

If webhook processing causes production incidents:

```
MOYASAR_WEBHOOK_VERIFICATION=disabled
```

This bypasses all signature verification. Use only as last resort — disables security enforcement.

## Log Fields Reference

Every webhook logs `moyasar_webhook_received` with:

| Field | Type | Description |
|---|---|---|
| `hasSignature` | boolean | Whether `x-moyasar-signature` header was present |
| `signaturePreview` | string | First 10 chars of signature (safe to log) |
| `bodyLength` | number | Raw body byte length |
| `bodyPreview` | string | First 100 chars of raw body |
| `isValid` | boolean | Whether HMAC-SHA256 verification passed |
| `mode` | string | Current verification mode |

On processing failure, logs `moyasar_webhook_processing_failed` with:

| Field | Type | Description |
|---|---|---|
| `paymentId` | string | Moyasar payment ID from payload |
| `err` | string | Error message |

## Implementation Notes

- Signature verified via `verifyMoyasarSignature()` in `packages/api/src/lib/moyasar-webhook.ts`
- Uses `crypto.timingSafeEqual()` to prevent timing attacks
- Raw body read via `c.req.text()` before any JSON parsing — stream consumed once
- Processing errors return 500 so Moyasar retries (6 attempts, exponential backoff)
