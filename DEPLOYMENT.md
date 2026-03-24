# دليل تفعيل نسق — من الصفر للموقع الحي

## المتطلبات

قبل تبدأ، تحتاج تنزّل هذي الأدوات على جهازك:

1. **Node.js 20+** — https://nodejs.org (اختر LTS)
2. **pnpm** — بعد تنزيل Node، افتح Terminal واكتب: `npm install -g pnpm`
3. **Git** — https://git-scm.com

---

## الخطوة 1: فك الضغط وتجهيز المشروع

```bash
# 1. فك ضغط الملف
unzip nasaq-final-complete.zip -d nasaq
cd nasaq

# 2. تنزيل المكتبات
pnpm install
```

---

## الخطوة 2: إنشاء قاعدة البيانات (Neon DB — مجاني)

1. روح https://neon.tech واسجّل حساب مجاني (بـ GitHub أو بريدك)
2. اضغط "Create a project"
   - Project name: `nasaq`
   - Region: اختر `AWS Middle East (Bahrain)` — أقرب للسعودية
3. بعد الإنشاء، انسخ الـ **Connection string** — يكون شكله كذا:
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/nasaq?sslmode=require
   ```

---

## الخطوة 3: إعداد المتغيرات

```bash
# انسخ ملف المثال
cp .env.example .env
```

افتح `.env` وعدّل:

```env
# ضع الرابط اللي نسخته من Neon
DATABASE_URL=postgresql://username:password@ep-xxx.aws.neon.tech/nasaq?sslmode=require

# الباقي اتركه كما هو للتطوير
PORT=3000
NODE_ENV=development
DASHBOARD_URL=http://localhost:5173
```

---

## الخطوة 4: إنشاء الجداول وملء البيانات

```bash
# ينشئ 69 جدول في قاعدة البيانات
pnpm db:push

# يملأ بيانات محفل التجريبية (خدمات + عملاء + مواقع + أدوار...)
pnpm db:seed
```

بعد الـ seed يعطيك:
- **Org ID** — احفظه
- **Owner ID** — احفظه

---

## الخطوة 5: تشغيل المشروع محلياً

```bash
# يشغل الـ API على localhost:3000 والـ Dashboard على localhost:5173
pnpm dev
```

افتح المتصفح:
- لوحة التحكم: http://localhost:5173
- API Health: http://localhost:3000/api/v1/health

---

## الخطوة 6: النشر على الإنترنت (Production)

### الخيار الأسهل: Railway (يدعم السعودية)

**للـ API:**

1. روح https://railway.app واسجّل بـ GitHub
2. اضغط "New Project" → "Deploy from GitHub repo"
3. ارفع المشروع على GitHub أولاً:
   ```bash
   git init
   git add .
   git commit -m "Initial commit — Nasaq v3.0"
   
   # أنشئ repo على GitHub ثم:
   git remote add origin https://github.com/username/nasaq.git
   git push -u origin main
   ```
4. في Railway:
   - اربط الـ repo
   - Root Directory: `packages/api`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - أضف Environment Variable:
     - `DATABASE_URL` = رابط Neon
     - `NODE_ENV` = production
     - `PORT` = 3000

5. Railway يعطيك رابط: `https://nasaq-api-production.up.railway.app`

**للـ Dashboard:**

1. روح https://vercel.com واسجّل بـ GitHub
2. اضغط "Import Project" واختر الـ repo
3. Framework Preset: Vite
4. Root Directory: `apps/dashboard`
5. Environment Variables:
   - `VITE_API_URL` = رابط Railway اللي حصلت عليه
6. Vercel يعطيك رابط: `https://nasaq-dashboard.vercel.app`

### ربط دومين مخصص (almahfal.com مثلاً)

في Vercel:
1. Settings → Domains → Add
2. اكتب: `dashboard.almahfal.com`
3. Vercel يعطيك CNAME record
4. روح لمزود الدومين (GoDaddy/Namecheap) وأضف:
   - Type: CNAME
   - Name: dashboard
   - Value: cname.vercel-dns.com

---

## الخطوة 7: تفعيل الخدمات الخارجية (اختياري)

### بوابة الدفع — Moyasar
1. سجّل في https://moyasar.com
2. أضف في `.env`:
   ```
   MOYASAR_API_KEY=sk_live_xxxxx
   MOYASAR_PUBLISHABLE_KEY=pk_live_xxxxx
   ```

### واتساب — 360dialog أو WATI
1. سجّل في https://www.360dialog.com
2. اربط رقم واتساب الأعمال
3. أضف API Token في `.env`

### SMS — Unifonic
1. سجّل في https://www.unifonic.com
2. أضف App ID و Token في `.env`

### تخزين الملفات — Cloudflare R2
1. سجّل في https://dash.cloudflare.com
2. أنشئ R2 Bucket: `nasaq-files`
3. أضف المفاتيح في `.env`

---

## ملخص الروابط بعد التفعيل

| الخدمة | الرابط |
|--------|--------|
| لوحة التحكم | https://dashboard.almahfal.com |
| API | https://api.nasaq.sa |
| قاعدة البيانات | Neon Dashboard |
| صفحة الحجز | https://almahfal.nasaq.sa/book/خدمة |
| تتبع الحجز | https://almahfal.nasaq.sa/track/TOKEN |
| الماركت بليس | https://nasaq.sa/marketplace |

---

## الأوامر المهمة

```bash
pnpm dev              # تشغيل التطوير (API + Dashboard)
pnpm dev:api          # تشغيل API فقط
pnpm dev:dashboard    # تشغيل Dashboard فقط
pnpm db:push          # مزامنة Schema مع قاعدة البيانات
pnpm db:seed          # ملء بيانات تجريبية
pnpm db:studio        # فتح Drizzle Studio (متصفح قاعدة البيانات)
pnpm build            # بناء للإنتاج
```
