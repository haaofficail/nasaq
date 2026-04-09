# حل تعارض الدمج لملف WhatsAppGatewayTab

إذا ظهر لك تعارض عند الدمج في الملف:

`apps/dashboard/src/pages/admin/WhatsAppGatewayTab.tsx`

اتبع الخطوات التالية من سطر الأوامر:

```bash
git checkout <your-branch>
git fetch origin
git rebase origin/main
```

إذا ظهر تعارض في الملف نفسه:

```bash
# افتح الملف وعدّل أقسام <<<<<<< ======= >>>>>>>
# ثم:
git add apps/dashboard/src/pages/admin/WhatsAppGatewayTab.tsx
git rebase --continue
```

بعد انتهاء الـ rebase:

```bash
pnpm -C apps/dashboard exec tsc --noEmit
git push --force-with-lease
```

## ما الذي نحتفظ به داخل الملف عند حل التعارض؟

1. منطق polling يجب أن يمسح أي interval قديم قبل إنشاء جديد.
2. لا يتم إيقاف polling مبكرًا قبل وصول حالة `qr_ready`.
3. زر البدء لا يبقى في حالة تحميل إذا أصبحت الحالة `qr_ready` أو فشل الانتقال ثم عاد `disconnected` بعد محاولة فعلية.

## حل سريع من GitHub UI

- افتح PR → `Resolve conflicts`.
- احذف علامات التعارض.
- احتفظ بالنسخة التي تحتوي منطق `prevStatusRef` ومعالجة `starting` الانتقالية.
- اضغط `Mark as resolved` ثم `Commit merge`.

## إذا أردت Copilot يحاول الإصلاح تلقائياً

داخل نفس PR أضف تعليقًا بهذا النص:

```text
@copilot please resolve merge conflicts in apps/dashboard/src/pages/admin/WhatsAppGatewayTab.tsx
```

ثم راجع التغييرات المقترحة قبل الدمج النهائي.
