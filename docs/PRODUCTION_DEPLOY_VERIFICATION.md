# PRODUCTION DEPLOY VERIFICATION — نسق
**تاريخ المراجعة:** 2026-03-22

---

## 1. حالة الإنتاج الحالية

| المعيار | الحالة | التفصيل |
|---|---|---|
| Site live | ✅ | nasaqpro.tech يرد 200 |
| API live | ✅ | /api/v1/health → `{"status":"ok","version":"0.1.0"}` |
| Dashboard bundle | ⚠️ قديم | `index-ClboZ65P.js` — build قديم بدون أي صفحة جديدة |
| SSH port 22 | ❌ مغلق | `Operation timed out` من بيئة Claude Code |
| Git commits | ❌ صفر | لا commit منذ آخر نشر |
| Migrations | ❌ صفر | 8 migrations لم تُنفَّذ |

---

## 2. آخر Commit في Production

```
7b27c6b إضافة نظام متطلبات الخدمة: موظفون + أصول + نص حر
```

هذا هو **أحدث commit في git**. لا توجد commits بعده. جميع التعديلات اللاحقة موجودة كـ untracked/modified files فقط.

---

## 3. فرع الإنتاج

- **المستخدم:** `main`
- **Remote:** `server  nasaq-server:/var/www/nasaq.git` (SSH bare repo)
- **Deploy mechanism:** `git push server main` → post-receive hook على السيرفر

---

## 4. مسار النشر الكامل (مكوناته وحالة كل خطوة)

```
[local] git add -A          → ❌ لم يُشغَّل
[local] git commit          → ❌ لم يُشغَّل
[local] git push server main → ❌ لم يُشغَّل + SSH blocked
[server] post-receive hook  → ❌ لم يُشغَّل
[server] git checkout main  → ❌ لم يُشغَّل
[server] pnpm install       → ❌ لم يُشغَّل
[server] vite build         → ❌ لم يُشغَّل
[server] drizzle migrate    → ❌ لم يُشغَّل
[server] pm2 restart        → ❌ لم يُشغَّل
```

**النتيجة:** لم تُنفَّذ ولو خطوة واحدة من عملية النشر للتعديلات الجديدة.

---

## 5. لماذا SSH مغلق؟

| السبب المحتمل | الاحتمال |
|---|---|
| Firewall Hostinger يمنع IP معين | 🔴 مرتفع |
| SSH daemon معطل على السيرفر | 🟡 متوسط |
| Rate limiting بسبب محاولات سابقة | 🟡 متوسط |

**الاختبار:** Port 22 → timeout. Port 2222 → timeout. Port 443 + 80 → مفتوحان (HTTPS يعمل).

**الحل:** تشغيل `bash deploy.sh "..."` من جهاز المستخدم مباشرة (ليس من بيئة Claude Code).

---

## 6. ملف post-receive Hook على السيرفر

المتوقع أن يكون في `/var/www/nasaq.git/hooks/post-receive`:
```bash
#!/bin/bash
# تُشغَّل تلقائياً عند git push
GIT_DIR=/var/www/nasaq.git
WORK_TREE=/var/www/nasaq

export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

git --work-tree=$WORK_TREE --git-dir=$GIT_DIR checkout -f main
cd $WORK_TREE
pnpm install --frozen-lockfile
cd apps/dashboard && npx vite build && cd ../..
pnpm --filter @nasaq/db run migrate
pm2 restart nasaq-api
echo "✅ Deploy complete"
```

**لا يمكن التحقق منه الآن بسبب SSH timeout** — يُفترض وجوده من الإعداد السابق.

---

## 7. Environment Variables

| المتغير | الحالة |
|---|---|
| DATABASE_URL | ✅ موجود (API يعمل ويتصل بـ DB) |
| PORT | ✅ 3000 |
| DASHBOARD_URL | ✅ موجود |
| Twilio / R2 / WhatsApp / Moyasar | ⚠️ غير مكتملة (pending من الإعداد) |

---

## 8. Cache Issues

| النوع | الحالة |
|---|---|
| Browser cache | ⚠️ يجب مسحه عند زيارة الموقع بعد النشر |
| CDN cache | لا يوجد CDN — Nginx مباشر |
| Service Worker | لا يوجد SW |
| Vite asset hashing | ✅ الـ hash سيتغير عند rebuild فيُبطل cache تلقائياً |

---

## 9. خطوات النشر الصحيحة

### من جهاز المستخدم (بعد pull من هذا الجهاز إذا لزم):

```bash
# الخطوة 1: نشر الكود (من terminal على جهازك أنت)
cd /path/to/nasaq
bash deploy.sh "تحديث النظام المالي الكامل + محاسبة + خزينة + تسوية"

# الخطوة 2: الدخول للسيرفر وتطبيق migrations
ssh nasaq-server
cd /var/www/nasaq
export NVM_DIR="/root/.nvm" && . "$NVM_DIR/nvm.sh"
pnpm --filter @nasaq/db run migrate

# الخطوة 3: seed chart of accounts لكل منشأة
# احصل على الـ orgIds:
psql -U nasaq_user -d nasaq -c "SELECT id FROM organizations;"
# لكل id:
pnpm tsx packages/db/seeds/seed-chart-of-accounts.ts <ORG_ID>

# الخطوة 4: التحقق
pm2 logs nasaq-api --lines 20
curl https://nasaqpro.tech/api/v1/accounting/chart-of-accounts \
  -H "Authorization: Bearer TOKEN"
```
