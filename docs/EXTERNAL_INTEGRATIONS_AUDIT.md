# External Integrations Audit — نسق

## الوضع الحالي

### ما يوجد
- **WhatsApp Messaging** (`packages/api/src/routes/messaging.ts`): تكامل جزئي مع WhatsApp
- **Marketplace** (`packages/db/schema/marketplace.ts`): marketplace listings + RFP داخلي فقط
- **Platform API Keys** (`packages/api/src/routes/platform.ts`): API keys للمطورين
- **Webhooks** (`platform.ts`): جدول webhooks لكن للإرسال الصادر فقط، بدون ingestion للوارد
- **Automation** (`packages/db/schema/automation.ts`): قواعد أتمتة داخلية

### ما **لا** يوجد
- لا يوجد integration module مستقل
- لا يوجد provider registry (قائمة بالمزودين المدعومين)
- لا يوجد credentials store آمن للتكاملات الخارجية
- لا يوجد webhook ingestion pipeline (استقبال من خارجي)
- لا يوجد mapping layer (ربط كيانات خارجية بداخلية)
- لا يوجد sync jobs management
- لا يوجد retry/error logging للتكاملات
- لا يوجد GatherIn integration
- لا يوجد HungerStation integration
- لا يوجد delivery aggregators integration
- لا يوجد OTA/booking channel integration (booking.com, airbnb etc.)
- لا يوجد capability gating (أي تكاملات تناسب أي business type)

---

## ما يجب بناؤه

### Integration Module (جديد كلياً)

#### 1) Provider Registry
قائمة ثابتة بالمزودين المدعومين مع نوع التكامل:

| Provider | Type | Applicable To |
|----------|------|---------------|
| gatherin | booking_channel | events, hotel, services |
| hungerstation | food_delivery | restaurant, cafe, bakery |
| toyou | delivery | retail, flower_shop, restaurant |
| smsa | delivery | retail, flower_shop |
| naq | delivery | all |
| booking_com | ota | hotel |
| airbnb | ota | hotel |
| custom_webhook | webhook | all |
| whatsapp | messaging | all |
| google_calendar | calendar | salon, spa, fitness, services |
| zapier | automation | all |

#### 2) DB Schema جديد: `packages/db/schema/integrations.ts`
جداول: `integrationConfigs`, `integrationWebhookLogs`, `integrationSyncJobs`, `integrationMappings`

#### 3) API Routes جديدة: `packages/api/src/routes/integrations.ts`
- `GET /integrations/providers` — قائمة المزودين
- `GET /integrations/configs` — تكاملات الـ org الحالية
- `POST /integrations/configs` — تفعيل تكامل
- `PUT /integrations/configs/:id` — تحديث credentials
- `DELETE /integrations/configs/:id` — تعطيل
- `POST /integrations/webhook/ingest/:providerId` — استقبال webhook
- `GET /integrations/webhook-logs` — سجل الـ webhooks
- `POST /integrations/sync/:configId` — تشغيل sync يدوي
- `GET /integrations/sync-jobs` — سجل الـ sync jobs

#### 4) UI: `IntegrationsPage.tsx`
- قائمة المزودين مع حالة التفعيل
- نماذج الإعداد لكل مزود
- سجل webhooks وأخطاء الـ sync

---

## نمط Provider-Based Architecture

```
ExternalProvider
  └── IntegrationConfig (per tenant/branch)
        ├── credentials: encrypted JSON
        ├── mappings: external_id → internal_id
        ├── enabled: bool
        └── lastSyncAt

InboundWebhook → ingestion handler → mapping → internal entity creation/update
OutboundSync → scheduler → provider client → external update
```

---

## Capability Gating
التكاملات يجب أن تظهر فقط إذا:
1. `businessType` الخاص بـ org يدعم المزود
2. خطة الاشتراك تسمح (pro/enterprise فقط لبعض التكاملات)
3. التكامل مفعّل في `capabilities` settings

---

## قرارات معمارية

| القرار | السبب |
|--------|-------|
| لا نخزن أسرار التكامل في plaintext | أمان |
| webhook ingestion يعمل بدون auth | الخارجي لا يملك token |
| Mapping layer مستقل عن business logic | يسهل إضافة مزودين جدد |
| Retry logic في sync jobs | موثوقية |
| كل webhook log يُحفظ حتى لو fail | auditability |
