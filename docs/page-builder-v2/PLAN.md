# Page Builder v2 — Implementation Plan
**Date:** 2026-04-20
**Status:** Awaiting approval before production code begins

---

## ٢. هل apps/dashboard يستخدم UI library؟

**الإجابة: لا. لا توجد أي UI library خارجية.**

الـ dashboard يعتمد على:
- Tailwind CSS فقط
- مكتبة مكونات مخصصة في `apps/dashboard/src/components/ui/`:
  `ModernInput`, `ModernSelect`, `FilterBar`, `DataTable`, `Skeleton`, `StatCard`, `StatusBadge`, `Toaster`, `RichTextEditor`, `Calendar`, `TimePicker`, `ImageUpload`, `Pagination`, `BookingCard`, `Breadcrumb`, `BulkActionBar`, `CommandPalette`, `CSVImport`, `DurationInput`, `EditableCell`, `SearchInput`
- Lucide React للأيقونات فقط
- لا Radix UI، لا MUI، لا Ant Design، لا Headless UI

**قرار shadcn/ui:**
كما هو في الـ spec: `shadcn/ui` يُثبَّت في `packages/ui-v2/` معزول تماماً عن الـ dashboard الحالي.
لن يُمسّ `apps/dashboard/src/components/ui/` — packages/ui-v2 للـ Page Builder فقط.

---

## Current State (from AUDIT.md)

| Component | Status |
|-----------|--------|
| Puck (@measured/puck) | NOT installed |
| shadcn/ui | NOT installed — يُثبَّت في packages/ui-v2/ |
| Testing (Vitest/Jest/Playwright) | NOT installed anywhere |
| packages/page-builder-v2 | package.json + tsconfig.json created (no code yet) |
| Routing /dashboard/pages-v2 | Does not exist |
| DB tables pages_v2 / page_versions_v2 | Do not exist |
| API /api/v2/pages | Does not exist |

---

## Architecture Decisions

### 1. shadcn/ui في packages/ui-v2/ معزول
يُثبَّت Radix UI + shadcn components في package مستقل.
`packages/ui-v2/` لا يُستورَد من `apps/dashboard` الحالي — فقط من `packages/page-builder-v2`.

### 2. Puck version
Pin to `0.20.2` (latest stable at audit time).

### 3. Testing stack
**Unit + integration:** Vitest (fastest for ESM monorepos, compatible with Vite)
**E2E:** Playwright (standard for webapp-testing skill)
**Location:** `packages/page-builder-v2/src/__tests__/` و `packages/api/src/__tests__/v2/`

### 4. No build step for packages
Dashboard imports via workspace:* — Vite handles transpilation. Same pattern as `@nasaq/db`.

---

## ٣. مصادر البلوكات الـ 28

| # | البلوك | المصدر | URL |
|---|--------|--------|-----|
| 1 | Hero Minimal | shadcnblocks.com | https://www.shadcnblocks.com/group/hero |
| 2 | Hero Showcase | shadcnblocks.com | https://www.shadcnblocks.com/group/hero |
| 3 | Hero Gallery | shadcnblocks.com | https://www.shadcnblocks.com/group/hero |
| 4 | Hero Video | shadcn.io/blocks | https://ui.shadcn.com/blocks |
| 5 | Hero Split | shadcnblocks.com | https://www.shadcnblocks.com/group/hero |
| 6 | Products Grid | shadcnblocks.com | https://www.shadcnblocks.com/group/ecommerce |
| 7 | Products Carousel | shadcnblocks.com | https://www.shadcnblocks.com/group/ecommerce |
| 8 | Products Featured | shadcnblocks.com | https://www.shadcnblocks.com/group/ecommerce |
| 9 | Categories Grid | hyperui.dev | https://www.hyperui.dev/components/ecommerce/categories |
| 10 | Categories Carousel | hyperui.dev | https://www.hyperui.dev/components/ecommerce/categories |
| 11 | Features 3col | shadcnblocks.com | https://www.shadcnblocks.com/group/feature |
| 12 | Features 4cards | shadcnblocks.com | https://www.shadcnblocks.com/group/feature |
| 13 | Features List | shadcn.io/blocks | https://ui.shadcn.com/blocks |
| 14 | Testimonials Cards | shadcnblocks.com | https://www.shadcnblocks.com/group/testimonial |
| 15 | Testimonials Slider | shadcnblocks.com | https://www.shadcnblocks.com/group/testimonial |
| 16 | FAQ Accordion | shadcnblocks.com | https://www.shadcnblocks.com/group/faq |
| 17 | Stats Simple | material-tailwind.com | https://www.material-tailwind.com/blocks/stats-sections |
| 18 | Stats Detailed | material-tailwind.com | https://www.material-tailwind.com/blocks/stats-sections |
| 19 | Gallery Grid | shadcnblocks.com | https://www.shadcnblocks.com/group/gallery |
| 20 | Gallery Carousel | shadcnblocks.com | https://www.shadcnblocks.com/group/gallery |
| 21 | CTA Image-bg | shadcnblocks.com | https://www.shadcnblocks.com/group/cta |
| 22 | CTA Color-bg | shadcnblocks.com | https://www.shadcnblocks.com/group/cta |
| 23 | Contact Simple | hyperui.dev | https://www.hyperui.dev/components/marketing/contact-sections |
| 24 | Contact With-Map | hyperui.dev | https://www.hyperui.dev/components/marketing/contact-sections |
| 25 | Footer Minimal | shadcnblocks.com | https://www.shadcnblocks.com/group/footer |
| 26 | Footer Comprehensive | shadcnblocks.com | https://www.shadcnblocks.com/group/footer |
| 27 | Header Simple | hyperui.dev | https://www.hyperui.dev/components/application-ui/navbars |
| 28 | Header Megamenu | shadcn.io/blocks | https://ui.shadcn.com/blocks |

**قاعدة الاستخدام:** كل بلوك يُنسخ كـ reference design فقط — يُعاد كتابته بالكامل بـ RTL + Arabic defaults + CSS variables.

---

## ٣. Block Adaptation Rules for RTL (مفصّلة)

### القاعدة 1 — Logical Properties إجبارية
```tsx
// ✓ CORRECT
className="ps-4 pe-6 ms-2 me-3 border-s-2"
// ps = padding-inline-start, pe = padding-inline-end
// ms = margin-inline-start, me = margin-inline-end
// border-s = border-inline-start

// ✗ WRONG — ممنوع تماماً
className="pl-4 pr-6 ml-2 mr-3 border-l-2"
```

### القاعدة 2 — Text Alignment
```tsx
// ✓ CORRECT
className="text-start"     // يصير right في RTL
className="text-end"       // يصير left في RTL

// ✗ WRONG
className="text-left"
className="text-right"
```

### القاعدة 3 — Direction Icons (أيقونات الاتجاه)
```tsx
// في RTL: "التالي" يكون ChevronLeft وليس ChevronRight
// ✓ CORRECT
<ChevronLeft className="rtl:rotate-0 ltr:hidden" />  // زر "التالي" في RTL
<ChevronRight className="ltr:rotate-0 rtl:hidden" /> // زر "التالي" في LTR

// أو باستخدام CSS transform:
<ChevronRight className="rtl:-scale-x-100" />  // يُعكس تلقائياً في RTL
```

### القاعدة 4 — Grid وFlex اتجاه
```tsx
// ✓ CORRECT — flex-row-reverse تلقائي في RTL
<div dir="rtl" className="flex gap-4">  // العناصر تبدأ من اليمين
  
// Carousels: اتجاه التمرير معكوس
// ✓ في RTL scroll-start من اليمين
className="overflow-x-auto scroll-smooth"
// + JS: scrollLeft يكون سالب في بعض المتصفحات لـ RTL — يجب معالجته
```

### القاعدة 5 — Typography العربية
```tsx
// Font
style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
// أو via CSS variable
className="font-[family-name:var(--font-body)]"

// Line height — مهم للعربية
className="leading-[1.75]"    // body text
className="leading-[1.4]"     // headings

// Letter spacing — صفر للعربية
className="tracking-normal"   // لا tracking موجب للعربية
```

### القاعدة 6 — CSS Variables (لا hardcode للألوان)
```tsx
// ✓ CORRECT
style={{ color: "var(--color-primary)", background: "var(--color-bg)" }}
// أو Tailwind arbitrary:
className="text-[var(--color-primary)] bg-[var(--color-bg)]"

// ✗ WRONG
className="text-blue-500"   // hardcoded
style={{ color: "#5b9bd5" }} // hardcoded
```

### القاعدة 7 — Images
```tsx
// ✓ CORRECT — lazy loading + aspect ratio محدد
<img
  src={src}
  alt={alt}
  loading="lazy"
  className="w-full h-full object-cover"
/>
// أو: width + height attributes لمنع layout shift

// ✗ WRONG — لا أبعاد، لا lazy
<img src={src} />
```

### القاعدة 8 — لا Emoji مطلقاً
```tsx
// ✗ WRONG
<p>✨ أهلاً وسهلاً</p>
<span>🛍️ المنتجات</span>

// ✓ CORRECT — استخدم Lucide icons
<ShoppingBag className="w-5 h-5" /> <span>المنتجات</span>
```

### القاعدة 9 — dir="rtl" على Root كل بلوك
```tsx
// كل بلوك يبدأ بـ:
<section dir="rtl" className="w-full ...">
```

### القاعدة 10 — Absolute Positioning
```tsx
// ✓ CORRECT — logical
className="start-0 end-auto"   // = right: 0 في RTL
className="end-0 start-auto"   // = left: 0 في RTL

// ✗ WRONG
className="left-0"
className="right-0"
```

---

## ٣. Testing Coverage Targets

| Layer | Tool | Coverage Target | ما يُختبر |
|-------|------|----------------|-----------|
| Block logic (props, rendering) | Vitest + Testing Library | **80%+** | defaultProps, field updates, conditional rendering |
| Block RTL compliance | Vitest custom matchers | **100%** | لا `pl-`/`pr-`/`ml-`/`mr-`/`text-left`/`text-right` |
| API routes | Vitest + supertest | **100%** happy path + error cases | auth, orgId scope, zod validation |
| UI components | Vitest | **60%+** | mount، interaction، visual states |
| E2E flows | Playwright | Key flows only | create→edit→save→publish→view on storefront |

### RTL Lint Rule (automated)
سيُضاف custom ESLint rule أو Vitest snapshot test يرفض أي بلوك يحتوي على:
`/\b(pl|pr|ml|mr)-\d+\b/` أو `text-(left|right)` في JSX

---

## ٣. Rollback Plan

### Scenario 1 — DB migration فشلت
```bash
# rollback تلقائي عبر Drizzle:
pnpm db:migrate --rollback
# الجداول pages_v2 و page_versions_v2 مستقلة تماماً
# فشلها لا يؤثر على v1 أبداً
```

### Scenario 2 — API routes عطّلت v1
- v2 routes في `/api/v2/*` — v1 في `/website/*` — zero namespace overlap
- لو حصل تعارض: نعطّل route التسجيل في `packages/api/src/index.ts` بسطر واحد
- Feature flag `page_builder_v2` = false يوقف كل شيء فوراً دون deploy

### Scenario 3 — الـ editor أعطى بيانات خاطئة تخرّب صفحات v1
- مستحيل هيكلياً: v2 يكتب فقط في `pages_v2.draftData`/`publishedData`
- v1 يقرأ من `sitePages.blocks` — جداول مختلفة تماماً

### Scenario 4 — الـ dogfooding client واجه مشكلة إنتاجية
1. Feature flag off فوراً عبر Admin override (ثوانٍ)
2. العميل يرجع لـ v1 تلقائياً (لم يُمسّ)
3. نحلل logs → نطبّق `systematic-debugging` skill → نُصلح → نُعيد التفعيل

### Scenario 5 — Puck breaking change في update مستقبلي
- الإصدار مثبّت: `0.20.2` في `package.json` مع `exact version` (بدون `^`)
- لا update تلقائي — أي upgrade يمر عبر PR + full test suite

---

## ٤. استراتيجية الإطلاق التجريبي (3 مراحل)

### المرحلة 1 — Organizations الجديدة فقط (نهاية الأسبوع 5)

**الآلية:**
```typescript
// عند تسجيل org جديدة — يُفعَّل تلقائياً
await db.insert(organizationCapabilityOverrides).values({
  orgId: newOrg.id,
  capabilityKey: "page_builder_v2",
  enabled: true,
  reason: "new_org_default",
  setBy: "system",
});
```

**المعيار للانتقال للمرحلة 2:**
- 0 critical bugs خلال أسبوعين من تفعيل الـ orgs الجديدة
- Auto-save يعمل بدون فقدان بيانات
- RTL verified على Safari iOS + Chrome Android

---

### المرحلة 2 — Opt-in للـ Orgs الموجودة (بعد أسبوعين)

**الآلية:** زر في الداشبورد تحت "الموقع الإلكتروني":
```
┌─────────────────────────────────────────────┐
│  منشئ الصفحات v2 متاح الآن                  │
│  بناء أسرع، تصميم أجمل، تحكم أكثر           │
│                                              │
│  [جرّب الإصدار الجديد]  [لاحقاً]             │
└─────────────────────────────────────────────┘
```

الضغط على "جرّب" → يُفعّل `page_builder_v2` للـ org عبر:
```
POST /api/v1/settings/enable-feature
body: { feature: "page_builder_v2" }
```

**ملاحظات:**
- v1 لا يُحذف — يبقى متاحاً تحت `/dashboard/website`
- v2 يُضاف كخيار موازٍ تحت `/dashboard/pages-v2`
- الـ org تختار متى تنتقل

---

### المرحلة 3 — الإطلاق الكامل (بعد شهر من المرحلة 1)

**الآلية:**
```typescript
// migration script يُشغَّل مرة واحدة
// يُفعّل page_builder_v2 لكل org لم تفعّله بعد
UPDATE organization_capability_overrides
SET enabled = true
WHERE capability_key = 'page_builder_v2'
  AND org_id NOT IN (SELECT org_id FROM ... WHERE enabled = true);

// أو: يصبح default في plan_capabilities للـ free plan وما فوق
INSERT INTO plan_capabilities (plan_code, capability_key, enabled)
VALUES ('free', 'page_builder_v2', true);
```

**شروط الانتقال للمرحلة 3:**
- نسبة رضا المرحلة 2: لا شكاوى critical
- Test coverage 80%+ verified
- Playwright E2E suite تمر 100%
- وقت تحميل الـ editor < 2 ثانية

---

### جدول زمني للإطلاق

| المرحلة | التوقيت | الـ Orgs المستهدفة | Exit Criteria |
|---------|---------|-------------------|---------------|
| 1 — جديدة فقط | نهاية Week 5 | كل org جديدة بعد اليوم X | 0 critical bugs / أسبوعان |
| 2 — Opt-in | Week 5 + أسبوعان | أي org موجودة تختار | لا شكاوى data loss |
| 3 — كامل | Week 5 + شهر | جميع الـ orgs | Test suite 100% |

---

### Rollback لكل مرحلة

| المرحلة | الـ Rollback |
|---------|-------------|
| 1 | `UPDATE capability_overrides SET enabled=false WHERE reason='new_org_default'` |
| 2 | كل org تضغط "رجوع لـ v1" في الإعدادات |
| 3 | إيقاف feature flag عبر Admin panel — يرجع الجميع لـ v1 فوراً |

---

## File Structure (complete)

```
packages/ui-v2/                       NEW — shadcn/ui معزول للـ page builder
├── package.json
├── components.json                   shadcn config
└── src/
    └── components/                   shadcn components المستخدمة في البلوكات

packages/page-builder-v2/
├── package.json                      ✓ done
├── tsconfig.json                     ✓ done
└── src/
    ├── index.ts
    ├── config/puck-config.ts
    ├── blocks/
    │   ├── hero/         (5 variants)
    │   ├── products/     (3 variants)
    │   ├── categories/   (2 variants)
    │   ├── features/     (3 variants)
    │   ├── testimonials/ (2 variants)
    │   ├── faq/          (1 variant)
    │   ├── stats/        (2 variants)
    │   ├── gallery/      (2 variants)
    │   ├── cta/          (2 variants)
    │   ├── contact/      (2 variants)
    │   ├── footer/       (2 variants)
    │   └── header/       (2 variants)
    ├── plugins/
    │   ├── rtl-plugin.ts
    │   ├── brand-kit-plugin.ts
    │   └── data-binding-plugin.ts
    └── __tests__/

packages/db/schema/
└── page-builder-v2.ts               new tables (pages_v2, page_versions_v2)

packages/api/src/routes/
└── pages-v2.ts                      /api/v2/pages/* endpoints

apps/dashboard/src/features/page-builder-v2/
├── PageBuilderPage.tsx
├── PagesListPage.tsx
├── components/ (Editor, PageSettingsDrawer, VersionHistoryDrawer, PublishButton)
├── hooks/ (usePageBuilder, useAutoSave)
└── utils/blockAdapter.ts
```

---

## Week-by-Week Execution

### Week 1 — Foundation

| Day | Output | Verification |
|-----|--------|-------------|
| 1 | AUDIT.md + PLAN.md | Approved ✓ |
| 2 | packages/ui-v2 + packages/page-builder-v2 scaffold + Puck 0.20.2 + shadcn/ui + IBM Plex Sans Arabic | `pnpm tsc` passes |
| 3 | DB schema + migration + Vitest + Playwright setup | Migration runs, test runner green |
| 4 | API CRUD /api/v2/pages — tests pass 100% | All route tests passing |
| 5 | HeroMinimal block end-to-end في editor | create→edit→save→renders on storefront |

### Weeks 2-5
كما في الـ spec الأصلي.

---

## Testing Coverage Targets (مكرر للوضوح)

| Layer | Target |
|-------|--------|
| Block logic | 80%+ |
| RTL compliance (automated lint) | 100% |
| API routes | 100% happy + error paths |
| UI components | 60%+ |
| E2E (Playwright) | create→edit→publish→view |

---

## Brand Kit CSS Variables

```css
:root {
  --color-primary: #5b9bd5;
  --color-accent:  #C9A85C;
  --color-text:    #2C1810;
  --color-bg:      #FFFFFF;
  --font-heading:  'IBM Plex Sans Arabic', sans-serif;
  --font-body:     'IBM Plex Sans Arabic', sans-serif;
  --radius:        8px;
}
```

---

## Status

**جاهز للموافقة.**
بعد الموافقة أبدأ Day 2 فوراً.
