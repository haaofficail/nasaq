# WhatsApp QR Release Checklist (Admin)

## قبل فتح PR جديد

- تأكد أن `apps/dashboard/src/pages/admin/WhatsAppGatewayTab.tsx` لا يحتوي تعارضات.
- تأكد أن `packages/api/src/lib/whatsappBaileys.ts` يعيد `lastError` عبر `getBaileysState`.
- تأكد أن `POST /admin/wa/qr/start` ينتظر `initBaileys` (`await`) ولا يعمل fire-and-forget.

## فحوصات سريعة

```bash
pnpm -C apps/dashboard exec tsc --noEmit
pnpm -C packages/api exec tsc --noEmit
```

## بعد فتح PR

- أضف وصف واضح للمشكلة والأثر.
- أرفق خطوات اختبار يدوي لظهور QR والاتصال والانفصال.
- عند وجود تعارضات: نفّذ rebase على `main` ثم أعد الرفع بـ `--force-with-lease`.
