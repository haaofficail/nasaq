import { Hono } from "hono";
import { z } from "zod";
import { db, pool } from "@nasaq/db/client";
import {
  flowerVariants, flowerBatches, flowerVariantPricing,
  flowerSubstitutions, flowerRecipeComponents,
} from "@nasaq/db/schema";
import { eq, and, desc, asc, sql, count, lte, gte, gt, isNull, or } from "drizzle-orm";
import { getOrgId, getUserId } from "../lib/helpers";
import { insertAuditLog } from "../lib/audit";

export const flowerMasterRouter = new Hono();

// ─── Grade multipliers (reference values used to auto-populate new variants)
const GRADE_MULTIPLIERS: Record<string, number> = {
  premium_plus: 1.5,
  premium:      1.2,
  grade_a:      1.0,
  grade_b:      0.8,
  grade_c:      0.65,
};

// ─── Origin multipliers + shelf life adjustments
const ORIGIN_MULTIPLIERS: Record<string, number> = {
  // أفريقيا
  netherlands:   1.35,
  kenya:         1.10,
  ethiopia:      1.00,
  zimbabwe:      1.05,
  tanzania:      0.95,
  south_africa:  1.15,
  // أمريكا اللاتينية
  ecuador:       1.25,
  colombia:      1.15,
  brazil:        1.00,
  // أوروبا
  france:        1.30,
  spain:         1.05,
  italy:         1.15,
  // الشرق الأوسط
  turkey:        1.05,
  israel:        1.15,
  // آسيا
  japan:         1.40,
  china:         0.95,
  india:         0.90,
  thailand:      1.05,
  malaysia:      1.00,
  vietnam:       0.90,
  indonesia:     0.95,
  australia:     1.20,
  // محلي الخليج
  local_saudi:   0.85,
  local_uae:     0.85,
  local_kuwait:  0.85,
  local_bahrain: 0.85,
  local_qatar:   0.85,
  local_oman:    0.85,
  other:         1.00,
};

const ORIGIN_SHELF_ADJUST: Record<string, number> = {
  // أفريقيا
  netherlands:   2,   // سلسلة تبريد ممتازة
  kenya:         0,
  ethiopia:      0,
  zimbabwe:      0,
  tanzania:      0,
  south_africa:  1,
  // أمريكا اللاتينية
  ecuador:       1,
  colombia:      0,
  brazil:       -1,   // شحن طويل، استوائي
  // أوروبا
  france:        1,
  spain:         0,
  italy:         1,
  // الشرق الأوسط
  turkey:        0,
  israel:        1,
  // آسيا
  japan:         2,   // سلسلة تبريد ممتازة
  china:         0,
  india:        -1,
  thailand:      0,
  malaysia:      0,
  vietnam:      -1,
  indonesia:    -1,
  australia:     1,
  // محلي الخليج — سلسلة تبريد قصيرة
  local_saudi:  -1,
  local_uae:    -1,
  local_kuwait: -1,
  local_bahrain:-1,
  local_qatar:  -1,
  local_oman:   -1,
  other:         0,
};

// ─── Arabic display labels
const TYPE_AR: Record<string, string> = {
  rose: "وردة", tulip: "توليب", lily: "زنبق", orchid: "أوركيد",
  carnation: "قرنفل", baby_rose: "وردة صغيرة", hydrangea: "هيدرنجيا",
  peony: "فاوانيا", sunflower: "عباد الشمس", gypsophila: "جبسوفيليا",
  chrysanthemum: "أقحوان",
  dahlia: "دالية", freesia: "فريزيا", iris: "أيريس", lisianthus: "ليزيانثوس",
  anthurium: "أنثوريوم", statice: "ستاتيس", ranunculus: "رانونكيولوس",
  delphinium: "ديلفينيوم", anemone: "أنيمون", alstroemeria: "ألسترومريا",
  snapdragon: "ذبابية", narcissus: "نرجس", jasmine: "ياسمين",
  gardenia: "قاردينيا", protea: "بروتيا", calla_lily: "كالا ليلي",
  gerbera: "جيربيرا", matthiola: "مثيولا", waxflower: "شمع الزهور",
  bird_of_paradise: "طائر الجنة",
};
const COLOR_AR: Record<string, string> = {
  red: "أحمر", pink: "وردي", white: "أبيض", yellow: "أصفر", orange: "برتقالي",
  purple: "بنفسجي", lavender: "لافندر", peach: "خوخي", coral: "مرجاني",
  burgundy: "عنابي", cream: "كريمي", bi_color: "ثنائي اللون", mixed: "مخلوط",
  blue: "أزرق", green: "أخضر", champagne: "شامبانيا", black: "أسود", silver: "فضي",
  other: "أخرى",
};
const ORIGIN_AR: Record<string, string> = {
  netherlands:   "هولندا",
  kenya:         "كينيا",
  ethiopia:      "إثيوبيا",
  zimbabwe:      "زيمبابوي",
  tanzania:      "تنزانيا",
  south_africa:  "جنوب أفريقيا",
  ecuador:       "الإكوادور",
  colombia:      "كولومبيا",
  brazil:        "البرازيل",
  france:        "فرنسا",
  spain:         "إسبانيا",
  italy:         "إيطاليا",
  turkey:        "تركيا",
  israel:        "إسرائيل",
  japan:         "اليابان",
  china:         "الصين",
  india:         "الهند",
  thailand:      "تايلاند",
  malaysia:      "ماليزيا",
  vietnam:       "فيتنام",
  indonesia:     "إندونيسيا",
  australia:     "أستراليا",
  local_saudi:   "محلي — السعودية",
  local_uae:     "محلي — الإمارات",
  local_kuwait:  "محلي — الكويت",
  local_bahrain: "محلي — البحرين",
  local_qatar:   "محلي — قطر",
  local_oman:    "محلي — عُمان",
  other:         "أخرى",
};
const GRADE_AR: Record<string, string> = {
  premium_plus: "ممتاز+", premium: "ممتاز", grade_a: "الدرجة أ", grade_b: "الدرجة ب", grade_c: "الدرجة ج",
};
const SIZE_AR: Record<string, string> = {
  xs: "XS", small: "صغير", medium: "وسط", large: "كبير", xl: "XL",
};
const BLOOM_AR: Record<string, string> = {
  bud: "برعم", semi_open: "نصف مفتوح", open: "مفتوح", full_bloom: "مفتوح كلياً",
};

function buildDisplayName(v: {
  flowerType: string; color: string; origin: string; grade: string; size: string; bloomStage: string;
}) {
  return `${TYPE_AR[v.flowerType] ?? v.flowerType} ${COLOR_AR[v.color] ?? v.color} — ${ORIGIN_AR[v.origin] ?? v.origin} — ${GRADE_AR[v.grade] ?? v.grade} — ${BLOOM_AR[v.bloomStage] ?? v.bloomStage}`;
}

// ─── Schemas
const variantSchema = z.object({
  flowerType:  z.enum(["rose","tulip","lily","orchid","carnation","baby_rose","hydrangea","peony","sunflower","gypsophila","chrysanthemum","dahlia","freesia","iris","lisianthus","anthurium","statice","ranunculus","delphinium","anemone","alstroemeria","snapdragon","narcissus","jasmine","gardenia","protea","calla_lily","gerbera","matthiola","waxflower","bird_of_paradise"]),
  color:       z.enum(["red","pink","white","yellow","orange","purple","lavender","peach","coral","burgundy","cream","bi_color","mixed","blue","green","champagne","black","silver","other"]),
  origin:      z.enum(["netherlands","kenya","ethiopia","zimbabwe","tanzania","south_africa","ecuador","colombia","brazil","france","spain","italy","turkey","israel","japan","china","india","thailand","malaysia","vietnam","indonesia","australia","local_saudi","local_uae","local_kuwait","local_bahrain","local_qatar","local_oman","other"]),
  grade:       z.enum(["premium_plus","premium","grade_a","grade_b","grade_c"]),
  size:        z.enum(["xs","small","medium","large","xl"]),
  bloomStage:  z.enum(["bud","semi_open","open","full_bloom"]),
  displayNameAr: z.string().optional().nullable(),
  displayNameEn: z.string().optional().nullable(),
  basePricePerStem: z.string().optional(),
  shelfLifeDays: z.number().int().optional(),
  notesAr: z.string().optional().nullable(),
  notesEn: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const batchSchema = z.object({
  variantId:        z.string().uuid(),
  locationId:       z.string().uuid().optional().nullable(),
  supplierId:       z.string().uuid().optional().nullable(),
  batchNumber:      z.string().optional(),
  // استلام بالبنش — الطريقة الصحيحة للورد الطبيعي
  bunchesReceived:  z.number().int().min(1).optional(),
  stemsPerBunch:    z.number().int().min(1).optional(),
  costPerBunch:     z.string().optional(),
  // fallback: إدخال مباشر بالسيقان
  quantityReceived: z.number().int().min(1).optional(),
  unitCost:         z.string().optional(),
  receivedAt:       z.string().optional(),
  expiryEstimated:  z.string(),
  currentBloomStage: z.enum(["bud","semi_open","open","full_bloom"]).optional(),
  qualityStatus:    z.enum(["fresh","good","acceptable","expiring","expired","damaged"]).optional(),
  notes:            z.string().optional().nullable(),
});

const pricingSchema = z.object({
  variantId:                 z.string().uuid(),
  pricePerStem:              z.string(),
  costPerStem:               z.string().optional().nullable(),
  markupPercent:             z.string().optional().nullable(),
  originMultiplierOverride:  z.string().optional().nullable(),
  gradeMultiplierOverride:   z.string().optional().nullable(),
  effectiveFrom:             z.string().optional().nullable(),
  effectiveTo:               z.string().optional().nullable(),
  notes:                     z.string().optional().nullable(),
});

const substitutionSchema = z.object({
  primaryVariantId:       z.string().uuid(),
  substituteVariantId:    z.string().uuid(),
  gradeDirection:         z.enum(["up","same","down"]).optional(),
  compatibilityScore:     z.number().int().min(1).max(10).optional(),
  priceAdjustmentPercent: z.string().optional(),
  isAutoAllowed:          z.boolean().optional(),
  notes:                  z.string().optional().nullable(),
});

const recipeComponentSchema = z.object({
  variantId:                 z.string().uuid(),
  serviceId:                 z.string().uuid().optional().nullable(),
  packageRef:                z.string().optional().nullable(),
  quantity:                  z.string().optional(),
  unit:                      z.string().optional(),
  isOptional:                z.boolean().optional(),
  substitutionVariantIds:    z.array(z.string().uuid()).optional(),
  showToCustomer:            z.boolean().optional(),
  customerLabelAr:           z.string().optional().nullable(),
  sortOrder:                 z.number().int().optional(),
});

// ============================================================
// VARIANTS
// ============================================================

flowerMasterRouter.get("/variants", async (c) => {
  const type     = c.req.query("type");
  const color    = c.req.query("color");
  const origin   = c.req.query("origin");
  const grade    = c.req.query("grade");
  const active   = c.req.query("active");
  const mode     = c.req.query("mode") ?? "detailed"; // 'detailed' | 'simplified'

  const conditions: any[] = [];
  if (type)   conditions.push(eq(flowerVariants.flowerType, type as any));
  if (color)  conditions.push(eq(flowerVariants.color, color as any));
  if (origin) conditions.push(eq(flowerVariants.origin, origin as any));
  if (grade)  conditions.push(eq(flowerVariants.grade, grade as any));
  if (active !== undefined) conditions.push(eq(flowerVariants.isActive, active !== "false"));

  const rows = await db
    .select()
    .from(flowerVariants)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(flowerVariants.flowerType), asc(flowerVariants.grade), asc(flowerVariants.color));

  if (mode === "simplified") {
    return c.json({
      data: rows.map((r) => ({
        id: r.id,
        label: r.displayNameAr ?? buildDisplayName(r),
        type: r.flowerType,
        isActive: r.isActive,
      })),
    });
  }

  return c.json({ data: rows });
});

flowerMasterRouter.get("/variants/:id", async (c) => {
  const [variant] = await db
    .select()
    .from(flowerVariants)
    .where(eq(flowerVariants.id, c.req.param("id")));
  if (!variant) return c.json({ error: "Variant not found" }, 404);

  // Enrich with org pricing (if authenticated)
  let pricing = null;
  try {
    const orgId = getOrgId(c);
    const [p] = await db
      .select()
      .from(flowerVariantPricing)
      .where(and(
        eq(flowerVariantPricing.orgId, orgId),
        eq(flowerVariantPricing.variantId, variant.id),
        eq(flowerVariantPricing.isActive, true),
      ));
    pricing = p ?? null;
  } catch {}

  return c.json({ data: { ...variant, pricing } });
});

flowerMasterRouter.post("/variants", async (c) => {
  const body = variantSchema.parse(await c.req.json());

  // Auto-set multipliers from origin + grade
  const originMult = ORIGIN_MULTIPLIERS[body.origin] ?? 1.0;
  const gradeMult  = GRADE_MULTIPLIERS[body.grade] ?? 1.0;
  // Auto-calculate shelf life = base 7 days + origin adjustment
  const baseShelf = body.shelfLifeDays ?? 7;
  const shelfAdj  = ORIGIN_SHELF_ADJUST[body.origin] ?? 0;

  const displayNameAr = body.displayNameAr ?? buildDisplayName(body);

  const [variant] = await db
    .insert(flowerVariants)
    .values({
      ...body,
      displayNameAr,
      originPriceMultiplier: String(originMult),
      gradePriceMultiplier:  String(gradeMult),
      shelfLifeDays: baseShelf + shelfAdj,
    })
    .returning();

  return c.json({ data: variant }, 201);
});

flowerMasterRouter.put("/variants/:id", async (c) => {
  const body = variantSchema.partial().parse(await c.req.json());
  const updates: any = { ...body, updatedAt: new Date() };

  // Re-derive display name if identity changed
  const [existing] = await db.select().from(flowerVariants).where(eq(flowerVariants.id, c.req.param("id")));
  if (!existing) return c.json({ error: "Variant not found" }, 404);
  if (!body.displayNameAr) {
    const merged = { ...existing, ...body };
    updates.displayNameAr = buildDisplayName(merged as any);
  }

  const [updated] = await db
    .update(flowerVariants)
    .set(updates)
    .where(eq(flowerVariants.id, c.req.param("id")))
    .returning();

  return c.json({ data: updated });
});

flowerMasterRouter.patch("/variants/:id/toggle", async (c) => {
  const [existing] = await db.select({ isActive: flowerVariants.isActive }).from(flowerVariants)
    .where(eq(flowerVariants.id, c.req.param("id")));
  if (!existing) return c.json({ error: "Variant not found" }, 404);
  const [updated] = await db.update(flowerVariants)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(eq(flowerVariants.id, c.req.param("id"))).returning();
  return c.json({ data: updated });
});

// GET /flower-master/enums — attribute options for UI dropdowns
flowerMasterRouter.get("/enums", async (c) => {
  return c.json({
    data: {
      flowerTypes: Object.entries(TYPE_AR).map(([v, l]) => ({ value: v, label: l })),
      colors:      Object.entries(COLOR_AR).map(([v, l]) => ({ value: v, label: l })),
      origins:     Object.entries(ORIGIN_AR).map(([v, l]) => ({ value: v, label: l, multiplier: ORIGIN_MULTIPLIERS[v] })),
      grades:      Object.entries(GRADE_AR).map(([v, l]) => ({ value: v, label: l, multiplier: GRADE_MULTIPLIERS[v] })),
      sizes:       Object.entries(SIZE_AR).map(([v, l]) => ({ value: v, label: l })),
      bloomStages: Object.entries(BLOOM_AR).map(([v, l]) => ({ value: v, label: l })),
    },
  });
});

// ============================================================
// BATCHES (FEFO)
// ============================================================

flowerMasterRouter.get("/batches", async (c) => {
  const orgId = getOrgId(c);
  const variantId   = c.req.query("variantId");
  const quality     = c.req.query("quality");
  const locationId  = c.req.query("locationId");
  const activeOnly  = c.req.query("active") !== "false";

  const conditions: any[] = [eq(flowerBatches.orgId, orgId)];
  if (variantId)  conditions.push(eq(flowerBatches.variantId, variantId));
  if (quality)    conditions.push(eq(flowerBatches.qualityStatus, quality as any));
  if (locationId) conditions.push(eq(flowerBatches.locationId, locationId));
  if (activeOnly) conditions.push(eq(flowerBatches.isActive, true));

  // FEFO: order by expiry ASC — consume oldest first
  const batches = await db
    .select()
    .from(flowerBatches)
    .where(and(...conditions))
    .orderBy(asc(flowerBatches.expiryEstimated));

  // Attach variant display name
  const variantIds = [...new Set(batches.map((b) => b.variantId))];
  let variantMap: Record<string, any> = {};
  if (variantIds.length > 0) {
    const variants = await db.select({
      id: flowerVariants.id,
      displayNameAr: flowerVariants.displayNameAr,
      flowerType: flowerVariants.flowerType,
    }).from(flowerVariants);
    variantMap = Object.fromEntries(variants.map((v) => [v.id, v]));
  }

  return c.json({
    data: batches.map((b) => ({
      ...b,
      variant: variantMap[b.variantId] ?? null,
      daysUntilExpiry: Math.ceil((new Date(b.expiryEstimated).getTime() - Date.now()) / 86400000),
    })),
  });
});

flowerMasterRouter.get("/batches/expiring", async (c) => {
  const orgId   = getOrgId(c);
  const days    = parseInt(c.req.query("days") ?? "3");
  const cutoff  = new Date(Date.now() + days * 86400000);

  const batches = await db
    .select({
      id:                 flowerBatches.id,
      org_id:             flowerBatches.orgId,
      variant_id:         flowerBatches.variantId,
      batch_number:       flowerBatches.batchNumber,
      quantity_remaining: flowerBatches.quantityRemaining,
      unit_cost:          flowerBatches.unitCost,
      expiry_date:        flowerBatches.expiryEstimated,
      quality_status:     flowerBatches.qualityStatus,
      display_name_ar:    flowerVariants.displayNameAr,
      flower_type:        flowerVariants.flowerType,
      color:              flowerVariants.color,
    })
    .from(flowerBatches)
    .innerJoin(flowerVariants, eq(flowerBatches.variantId, flowerVariants.id))
    .where(and(
      eq(flowerBatches.orgId, orgId),
      eq(flowerBatches.isActive, true),
      lte(flowerBatches.expiryEstimated, cutoff),
      gt(flowerBatches.quantityRemaining, 0),
    ))
    .orderBy(asc(flowerBatches.expiryEstimated));

  return c.json({
    data: batches.map((b) => ({
      ...b,
      expiry_date: b.expiry_date?.toISOString() ?? null,
      days_until_expiry: Math.ceil((new Date(b.expiry_date!).getTime() - Date.now()) / 86400000),
    })),
  });
});

// FEFO view for a specific variant — ordered list of available batches
flowerMasterRouter.get("/batches/fefo/:variantId", async (c) => {
  const orgId     = getOrgId(c);
  const variantId = c.req.param("variantId");

  const batches = await db
    .select()
    .from(flowerBatches)
    .where(and(
      eq(flowerBatches.orgId, orgId),
      eq(flowerBatches.variantId, variantId),
      eq(flowerBatches.isActive, true),
      gt(flowerBatches.quantityRemaining, 0),
    ))
    .orderBy(asc(flowerBatches.expiryEstimated));

  const totalRemaining = batches.reduce((s, b) => s + b.quantityRemaining, 0);

  return c.json({
    data: {
      variantId,
      totalRemaining,
      batches: batches.map((b) => ({
        ...b,
        daysUntilExpiry: Math.ceil((new Date(b.expiryEstimated).getTime() - Date.now()) / 86400000),
      })),
    },
  });
});

flowerMasterRouter.post("/batches", async (c) => {
  const orgId = getOrgId(c);
  const body  = batchSchema.parse(await c.req.json());

  // حساب عدد السيقان: إما من البنشات × سيقان/بنش، أو مدخل مباشراً
  const derivedStems = body.bunchesReceived && body.stemsPerBunch
    ? body.bunchesReceived * body.stemsPerBunch
    : body.quantityReceived;

  if (!derivedStems || derivedStems < 1) {
    return c.json({ error: "يجب إدخال عدد البنشات أو عدد السيقان" }, 400);
  }

  // تكلفة الساق المشتقة من تكلفة البنش
  const derivedUnitCost = body.costPerBunch && body.stemsPerBunch
    ? String(Number(body.costPerBunch) / body.stemsPerBunch)
    : body.unitCost;

  // Auto-generate batch number if not provided
  const batchNumber = body.batchNumber ?? `BTC-${Date.now().toString(36).toUpperCase()}`;

  const [batch] = await db
    .insert(flowerBatches)
    .values({
      orgId,
      variantId:         body.variantId,
      locationId:        body.locationId,
      supplierId:        body.supplierId,
      batchNumber,
      quantityReceived:  derivedStems,
      quantityRemaining: derivedStems,
      unitCost:          derivedUnitCost,
      receivedAt:        body.receivedAt ? new Date(body.receivedAt) : new Date(),
      expiryEstimated:   new Date(body.expiryEstimated),
      currentBloomStage: body.currentBloomStage,
      qualityStatus:     body.qualityStatus,
      notes:             body.notes,
      // حقول البنش الجديدة (تُحفظ للمرجعية والتدقيق)
      ...(body.bunchesReceived && { bunchesReceived: body.bunchesReceived } as any),
      ...(body.stemsPerBunch   && { stemsPerBunch: body.stemsPerBunch }     as any),
      ...(body.costPerBunch    && { costPerBunch: body.costPerBunch }        as any),
    })
    .returning();

  return c.json({ data: batch }, 201);
});

flowerMasterRouter.patch("/batches/:id", async (c) => {
  const orgId = getOrgId(c);
  const body  = z.object({
    quantityRemaining: z.number().int().optional(),
    currentBloomStage: z.enum(["bud","semi_open","open","full_bloom"]).optional(),
    qualityStatus:     z.enum(["fresh","good","acceptable","expiring","expired","damaged"]).optional(),
    notes:             z.string().optional().nullable(),
    isActive:          z.boolean().optional(),
  }).parse(await c.req.json());

  const [updated] = await db
    .update(flowerBatches)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(flowerBatches.id, c.req.param("id")), eq(flowerBatches.orgId, orgId)))
    .returning();

  if (!updated) return c.json({ error: "Batch not found" }, 404);
  return c.json({ data: updated });
});

// Consume quantity from FEFO-ordered batches
flowerMasterRouter.post("/batches/consume", async (c) => {
  const orgId = getOrgId(c);
  const { variantId, quantity } = z.object({
    variantId: z.string().uuid(),
    quantity:  z.number().int().min(1),
  }).parse(await c.req.json());

  // Load FEFO-sorted batches
  const batches = await db
    .select()
    .from(flowerBatches)
    .where(and(
      eq(flowerBatches.orgId, orgId),
      eq(flowerBatches.variantId, variantId),
      eq(flowerBatches.isActive, true),
      gt(flowerBatches.quantityRemaining, 0),
    ))
    .orderBy(asc(flowerBatches.expiryEstimated));

  let remaining = quantity;
  const consumed: { batchId: string; qty: number }[] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityRemaining, remaining);
    await db.update(flowerBatches)
      .set({ quantityRemaining: batch.quantityRemaining - take, updatedAt: new Date() })
      .where(eq(flowerBatches.id, batch.id));
    consumed.push({ batchId: batch.id, qty: take });
    remaining -= take;
  }

  if (remaining > 0) {
    return c.json({ error: "Insufficient stock", shortage: remaining }, 422);
  }

  return c.json({ data: { consumed, totalConsumed: quantity } });
});

// ============================================================
// PRICING
// ============================================================

flowerMasterRouter.get("/pricing", async (c) => {
  const orgId = getOrgId(c);
  const rows  = await db
    .select()
    .from(flowerVariantPricing)
    .where(and(eq(flowerVariantPricing.orgId, orgId), eq(flowerVariantPricing.isActive, true)))
    .orderBy(desc(flowerVariantPricing.createdAt));
  return c.json({ data: rows });
});

flowerMasterRouter.post("/pricing", async (c) => {
  const orgId = getOrgId(c);
  const body  = pricingSchema.parse(await c.req.json());

  // Deactivate previous price for this variant
  await db.update(flowerVariantPricing)
    .set({ isActive: false })
    .where(and(
      eq(flowerVariantPricing.orgId, orgId),
      eq(flowerVariantPricing.variantId, body.variantId),
      eq(flowerVariantPricing.isActive, true),
    ));

  const [row] = await db
    .insert(flowerVariantPricing)
    .values({
      orgId,
      ...body,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
      effectiveTo:   body.effectiveTo   ? new Date(body.effectiveTo)   : null,
      isActive: true,
    })
    .returning();

  return c.json({ data: row }, 201);
});

flowerMasterRouter.delete("/pricing/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  await db.update(flowerVariantPricing)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(flowerVariantPricing.id, id), eq(flowerVariantPricing.orgId, orgId)));
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "flower_pricing", resourceId: id });
  return c.json({ success: true });
});

// ============================================================
// SUBSTITUTIONS
// ============================================================

flowerMasterRouter.get("/substitutions", async (c) => {
  const orgId      = getOrgId(c);
  const variantId  = c.req.query("variantId");

  const conditions: any[] = [eq(flowerSubstitutions.orgId, orgId), eq(flowerSubstitutions.isActive, true)];
  if (variantId) conditions.push(eq(flowerSubstitutions.primaryVariantId, variantId));

  const rows = await db
    .select()
    .from(flowerSubstitutions)
    .where(and(...conditions))
    .orderBy(desc(flowerSubstitutions.compatibilityScore));

  return c.json({ data: rows });
});

flowerMasterRouter.post("/substitutions", async (c) => {
  const orgId = getOrgId(c);
  const body  = substitutionSchema.parse(await c.req.json());
  const [row] = await db
    .insert(flowerSubstitutions)
    .values({ orgId, ...body })
    .returning();
  return c.json({ data: row }, 201);
});

flowerMasterRouter.delete("/substitutions/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  await db.update(flowerSubstitutions)
    .set({ isActive: false })
    .where(and(eq(flowerSubstitutions.id, id), eq(flowerSubstitutions.orgId, orgId)));
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "flower_substitution", resourceId: id });
  return c.json({ success: true });
});

// ============================================================
// RECIPE COMPONENTS
// ============================================================

flowerMasterRouter.get("/recipes", async (c) => {
  const orgId     = getOrgId(c);
  const serviceId = c.req.query("serviceId");

  const conditions: any[] = [eq(flowerRecipeComponents.orgId, orgId), eq(flowerRecipeComponents.isActive, true)];
  if (serviceId) conditions.push(eq(flowerRecipeComponents.serviceId, serviceId));

  const rows = await db
    .select()
    .from(flowerRecipeComponents)
    .where(and(...conditions))
    .orderBy(asc(flowerRecipeComponents.sortOrder));

  return c.json({ data: rows });
});

flowerMasterRouter.post("/recipes", async (c) => {
  const orgId = getOrgId(c);
  const body  = recipeComponentSchema.parse(await c.req.json());
  const [row] = await db
    .insert(flowerRecipeComponents)
    .values({ orgId, ...body })
    .returning();
  return c.json({ data: row }, 201);
});

flowerMasterRouter.delete("/recipes/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  await db.update(flowerRecipeComponents)
    .set({ isActive: false })
    .where(and(eq(flowerRecipeComponents.id, id), eq(flowerRecipeComponents.orgId, orgId)));
  insertAuditLog({ orgId, userId: getUserId(c), action: "deleted", resource: "flower_recipe", resourceId: id });
  return c.json({ success: true });
});

// ============================================================
// POS Catalog — variants with Arabic name, real stock, and selling price
flowerMasterRouter.get("/pos-catalog", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT
       v.id                                                                AS variant_id,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color)       AS display_name,
       v.flower_type,
       v.color,
       v.grade,
       COALESCE(
         SUM(b.quantity_remaining) FILTER (WHERE b.is_active AND b.quantity_remaining > 0),
         0
       )::integer                                                          AS total_stock,
       COALESCE(p.price_per_stem, v.base_price_per_stem, 0)::numeric      AS sell_price
     FROM flower_variants v
     LEFT JOIN flower_batches b
            ON b.variant_id = v.id AND b.org_id = $1
     LEFT JOIN flower_variant_pricing p
            ON p.variant_id = v.id AND p.org_id = $1 AND p.is_active = true
     WHERE v.is_active = true
     GROUP BY v.id, v.display_name_ar, v.flower_type, v.color, v.grade,
              v.base_price_per_stem, p.price_per_stem
     ORDER BY total_stock DESC, v.flower_type ASC`,
    [orgId]
  );
  return c.json({ data: rows });
});

// REPORTS
// ============================================================

// Stock summary by variant — FEFO-aware remaining quantities
flowerMasterRouter.get("/reports/stock", async (c) => {
  const orgId = getOrgId(c);

  const result = await pool.query(
    `SELECT
       v.id                AS variant_id,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color) AS display_name_ar,
       v.flower_type,
       v.color,
       v.origin,
       v.grade,
       v.size,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.is_active AND b.quantity_remaining > 0), 0)           AS total_remaining,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.is_active AND b.quality_status IN ('fresh','good')), 0) AS good_stock,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.is_active AND b.quality_status = 'expiring'), 0)       AS expiring_stock,
       COUNT(b.id) FILTER (WHERE b.is_active AND b.quantity_remaining > 0)                                       AS batch_count,
       MIN(b.expiry_estimated) FILTER (WHERE b.is_active AND b.quantity_remaining > 0)                           AS next_expiry
     FROM flower_variants v
     LEFT JOIN flower_batches b ON b.variant_id = v.id AND b.org_id = $1
     WHERE v.is_active = TRUE
     GROUP BY v.id
     ORDER BY total_remaining DESC`,
    [orgId],
  );

  return c.json({ data: result.rows });
});

// Origin analysis — cost, quality, shelf life by origin
flowerMasterRouter.get("/reports/origins", async (c) => {
  const orgId = getOrgId(c);

  const result = await pool.query(
    `SELECT
       v.origin,
       COUNT(DISTINCT v.id)                                                          AS variant_count,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.is_active), 0)            AS total_stock,
       COALESCE(AVG(b.unit_cost::NUMERIC) FILTER (WHERE b.is_active), 0)            AS avg_unit_cost,
       COALESCE(SUM(b.quantity_remaining * b.unit_cost::NUMERIC)
                FILTER (WHERE b.is_active), 0)                                       AS total_stock_value,
       COUNT(b.id) FILTER (WHERE b.is_active AND b.quality_status = 'expiring')     AS expiring_batches
     FROM flower_variants v
     LEFT JOIN flower_batches b ON b.variant_id = v.id AND b.org_id = $1
     WHERE v.is_active = TRUE
     GROUP BY v.origin
     ORDER BY total_stock DESC`,
    [orgId],
  );

  return c.json({ data: result.rows });
});

// Grade analysis — pricing preference and stock by grade
flowerMasterRouter.get("/reports/grades", async (c) => {
  const orgId = getOrgId(c);

  const result = await pool.query(
    `SELECT
       v.grade,
       COUNT(DISTINCT v.id)                                                    AS variant_count,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.is_active), 0)      AS total_stock,
       COALESCE(AVG(p.price_per_stem::NUMERIC) FILTER (WHERE p.is_active), 0) AS avg_selling_price,
       COALESCE(AVG(b.unit_cost::NUMERIC) FILTER (WHERE b.is_active), 0)      AS avg_cost
     FROM flower_variants v
     LEFT JOIN flower_batches b ON b.variant_id = v.id AND b.org_id = $1
     LEFT JOIN flower_variant_pricing p ON p.variant_id = v.id AND p.org_id = $1 AND p.is_active
     WHERE v.is_active = TRUE
     GROUP BY v.grade
     ORDER BY v.grade`,
    [orgId],
  );

  return c.json({ data: result.rows });
});

// Consumption report — how much of each variant was consumed (inferred from received - remaining)
flowerMasterRouter.get("/reports/consumption", async (c) => {
  const orgId = getOrgId(c);

  const result = await pool.query(
    `SELECT
       v.id              AS variant_id,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color) AS display_name,
       v.flower_type,
       v.origin,
       v.grade,
       COALESCE(SUM(b.quantity_received), 0)                            AS total_received,
       COALESCE(SUM(b.quantity_received - b.quantity_remaining), 0)     AS total_consumed,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.is_active), 0) AS current_stock,
       COALESCE(SUM((b.quantity_received - b.quantity_remaining) * b.unit_cost::NUMERIC), 0) AS total_cost_consumed
     FROM flower_variants v
     LEFT JOIN flower_batches b ON b.variant_id = v.id AND b.org_id = $1
     WHERE v.is_active = TRUE
     GROUP BY v.id
     HAVING COALESCE(SUM(b.quantity_received), 0) > 0
     ORDER BY total_consumed DESC`,
    [orgId],
  );

  return c.json({ data: result.rows });
});

// ─── Intelligence: Waste + Margin + Demand Velocity ───────────────────────────

// GET /flower-master/reports/intelligence
flowerMasterRouter.get("/reports/intelligence", async (c) => {
  const orgId = getOrgId(c);

  const waste = await pool.query(
    `SELECT
       v.id AS variant_id,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color) AS display_name,
       v.flower_type, v.color, v.origin, v.grade,
       COUNT(b.id) FILTER (WHERE b.expiry_estimated < NOW() AND b.quantity_remaining > 0) AS waste_batches,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.expiry_estimated < NOW() AND b.quantity_remaining > 0), 0) AS waste_units,
       COALESCE(SUM(b.quantity_remaining * b.unit_cost::NUMERIC) FILTER (WHERE b.expiry_estimated < NOW() AND b.quantity_remaining > 0), 0) AS waste_cost,
       COALESCE(SUM(b.quantity_received), 0) AS total_received,
       CASE
         WHEN SUM(b.quantity_received) > 0
         THEN ROUND((COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.expiry_estimated < NOW() AND b.quantity_remaining > 0), 0)::NUMERIC / NULLIF(SUM(b.quantity_received), 0)) * 100, 1)
         ELSE 0
       END AS waste_rate_pct,
       COALESCE(AVG(b.unit_cost::NUMERIC), 0) AS avg_purchase_cost,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.is_active AND b.expiry_estimated > NOW()), 0) AS current_stock
     FROM flower_variants v
     LEFT JOIN flower_batches b ON b.variant_id = v.id AND b.org_id = $1
     WHERE v.is_active = TRUE
     GROUP BY v.id, v.display_name_ar, v.flower_type, v.color, v.origin, v.grade
     ORDER BY waste_cost DESC`,
    [orgId]
  );

  const velocity = await pool.query(
    `SELECT
       v.id AS variant_id,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color) AS display_name,
       v.flower_type,
       COALESCE(SUM(b.quantity_received - b.quantity_remaining) FILTER (WHERE b.created_at >= NOW() - INTERVAL '30 days'), 0) AS consumed_last_30d,
       ROUND(COALESCE(SUM(b.quantity_received - b.quantity_remaining) FILTER (WHERE b.created_at >= NOW() - INTERVAL '30 days'), 0)::NUMERIC / 4.3, 1) AS weekly_demand,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.is_active AND b.expiry_estimated > NOW()), 0) AS current_stock
     FROM flower_variants v
     LEFT JOIN flower_batches b ON b.variant_id = v.id AND b.org_id = $1
     WHERE v.is_active = TRUE
     GROUP BY v.id, v.display_name_ar, v.flower_type
     HAVING COALESCE(SUM(b.quantity_received), 0) > 0
     ORDER BY weekly_demand DESC
     LIMIT 20`,
    [orgId]
  );

  const margin = await pool.query(
    `SELECT
       v.id AS variant_id,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color) AS display_name,
       v.flower_type, v.grade,
       COALESCE(AVG(b.unit_cost::NUMERIC), 0) AS avg_cost,
       COALESCE(MIN(p.price_per_stem), 0) AS min_price,
       COALESCE(MAX(p.price_per_stem), 0) AS max_price,
       CASE
         WHEN COALESCE(MIN(p.price_per_stem), 0) > 0
         THEN ROUND(((COALESCE(MIN(p.price_per_stem), 0) - COALESCE(AVG(b.unit_cost::NUMERIC), 0)) / NULLIF(COALESCE(MIN(p.price_per_stem), 0), 0)) * 100, 1)
         ELSE 0
       END AS margin_pct
     FROM flower_variants v
     LEFT JOIN flower_batches b ON b.variant_id = v.id AND b.org_id = $1 AND b.is_active
     LEFT JOIN flower_variant_pricing p ON p.variant_id = v.id AND p.org_id = $1
     WHERE v.is_active = TRUE
     GROUP BY v.id, v.display_name_ar, v.flower_type, v.grade
     ORDER BY margin_pct DESC`,
    [orgId]
  );

  const expiring = await pool.query(
    `SELECT
       v.id AS variant_id,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color) AS display_name,
       b.id AS batch_id, b.batch_number, b.quantity_remaining,
       b.expiry_estimated, b.quality_status, b.unit_cost,
       (b.expiry_estimated::DATE - CURRENT_DATE) AS days_left
     FROM flower_variants v
     JOIN flower_batches b ON b.variant_id = v.id AND b.org_id = $1
     WHERE b.is_active AND b.quantity_remaining > 0
       AND b.expiry_estimated <= NOW() + INTERVAL '7 days'
       AND b.expiry_estimated > NOW()
     ORDER BY b.expiry_estimated ASC`,
    [orgId]
  );

  return c.json({ data: { waste: waste.rows, velocity: velocity.rows, margin: margin.rows, expiring: expiring.rows } });
});

// ═══════════════════════════════════════════════════════════
// محرك التصريف الذكي — Disposal Engine
// ═══════════════════════════════════════════════════════════

// GET /flower-master/disposal/rules
flowerMasterRouter.get("/disposal/rules", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT * FROM flower_disposal_rules WHERE org_id = $1 ORDER BY sort_order ASC, min_age_days ASC`,
    [orgId]
  );
  return c.json({ data: rows });
});

// POST /flower-master/disposal/rules
flowerMasterRouter.post("/disposal/rules", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { rows } = await pool.query(
    `INSERT INTO flower_disposal_rules
       (org_id, name, min_age_days, max_age_days, discount_percent, auto_apply, show_as_sale, display_label_ar, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
       COALESCE((SELECT MAX(sort_order)+1 FROM flower_disposal_rules WHERE org_id=$1), 0))
     RETURNING *`,
    [orgId, body.name, body.minAgeDays ?? 0, body.maxAgeDays ?? 999,
     body.discountPercent ?? 0, body.autoApply ?? true,
     body.showAsSale ?? true, body.displayLabelAr ?? "عرض خاص"]
  );
  return c.json({ data: rows[0] }, 201);
});

// PUT /flower-master/disposal/rules/:id
flowerMasterRouter.put("/disposal/rules/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const { rows } = await pool.query(
    `UPDATE flower_disposal_rules
     SET name=$3, min_age_days=$4, max_age_days=$5, discount_percent=$6,
         auto_apply=$7, show_as_sale=$8, display_label_ar=$9, is_active=$10,
         updated_at=NOW()
     WHERE id=$1 AND org_id=$2
     RETURNING *`,
    [id, orgId, body.name, body.minAgeDays, body.maxAgeDays,
     body.discountPercent, body.autoApply, body.showAsSale,
     body.displayLabelAr, body.isActive ?? true]
  );
  if (!rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: rows[0] });
});

// DELETE /flower-master/disposal/rules/:id
flowerMasterRouter.delete("/disposal/rules/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  await pool.query(
    `DELETE FROM flower_disposal_rules WHERE id=$1 AND org_id=$2`,
    [id, orgId]
  );
  return c.json({ success: true });
});

// POST /flower-master/disposal/apply — apply rules to all active batches
flowerMasterRouter.post("/disposal/apply", async (c) => {
  const orgId = getOrgId(c);

  // Get active rules
  const { rows: rules } = await pool.query(
    `SELECT * FROM flower_disposal_rules WHERE org_id=$1 AND is_active=TRUE ORDER BY min_age_days ASC`,
    [orgId]
  );

  if (rules.length === 0) return c.json({ data: { updated: 0, message: "لا توجد قواعد تصريف مفعّلة" } });

  // Get all active batches with age
  const { rows: batches } = await pool.query(
    `SELECT id,
       EXTRACT(DAY FROM NOW() - received_at)::INTEGER AS age_days,
       quantity_remaining
     FROM flower_batches
     WHERE org_id=$1 AND is_active=TRUE AND quantity_remaining > 0`,
    [orgId]
  );

  let updated = 0;
  for (const batch of batches) {
    const ageDays = batch.age_days as number;
    // Find matching rule (highest discount for age range)
    const matchingRule = rules
      .filter((r: any) => ageDays >= Number(r.min_age_days) && ageDays <= Number(r.max_age_days))
      .sort((a: any, b: any) => Number(b.discount_percent) - Number(a.discount_percent))[0];

    const discountPct = matchingRule ? Number(matchingRule.discount_percent) : 0;
    const labelAr = matchingRule?.show_as_sale ? (matchingRule.display_label_ar || "عرض خاص") : null;

    await pool.query(
      `UPDATE flower_batches
       SET disposal_discount_pct=$2, disposal_label_ar=$3, disposal_applied_at=NOW()
       WHERE id=$1`,
      [batch.id, discountPct, labelAr]
    );
    updated++;
  }

  return c.json({ data: { updated, rulesApplied: rules.length, message: `تم تطبيق الخصومات على ${updated} دفعة` } });
});

// GET /flower-master/today-bundle — auto-generate bundle from near-expiry flowers
flowerMasterRouter.get("/today-bundle", async (c) => {
  const orgId = getOrgId(c);

  // Find near-expiry batches (2-5 days left), sorted by urgency
  const { rows: nearExpiry } = await pool.query(
    `SELECT
       b.id AS batch_id, b.batch_number, b.quantity_remaining, b.unit_cost,
       b.expiry_estimated, b.disposal_discount_pct,
       (b.expiry_estimated::DATE - CURRENT_DATE) AS days_left,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color) AS display_name,
       v.flower_type, v.color, v.id AS variant_id,
       COALESCE(p.price_per_stem, v.base_price_per_stem, 10) AS sale_price
     FROM flower_batches b
     JOIN flower_variants v ON v.id = b.variant_id
     LEFT JOIN flower_variant_pricing p ON p.variant_id = b.variant_id AND p.org_id = b.org_id AND p.is_active
     WHERE b.org_id=$1 AND b.is_active AND b.quantity_remaining >= 5
       AND b.expiry_estimated BETWEEN NOW() + INTERVAL '1 day' AND NOW() + INTERVAL '6 days'
     ORDER BY b.expiry_estimated ASC
     LIMIT 6`,
    [orgId]
  );

  if (nearExpiry.length === 0) {
    return c.json({ data: null, message: "لا يوجد ورد قارب الانتهاء في الوقت الحالي" });
  }

  // Build bundle composition (take 10-20 stems from each)
  let totalOriginalPrice = 0;
  const composition = nearExpiry.slice(0, 4).map((batch: any) => {
    const qty = Math.min(12, Math.floor(batch.quantity_remaining * 0.6));
    const stemPrice = Number(batch.sale_price);
    const lineTotal = qty * stemPrice;
    totalOriginalPrice += lineTotal;
    return {
      batchId: batch.batch_id,
      variantId: batch.variant_id,
      displayName: batch.display_name,
      qty,
      stemPrice,
      lineTotal,
      daysLeft: batch.days_left,
    };
  });

  const discountPct = 30; // bundle discount
  const salePrice = Math.round(totalOriginalPrice * (1 - discountPct / 100));
  const estimatedCost = nearExpiry.slice(0, 4).reduce((sum: number, b: any) => {
    const qty = Math.min(12, Math.floor(b.quantity_remaining * 0.6));
    return sum + qty * Number(b.unit_cost);
  }, 0);

  return c.json({
    data: {
      composition,
      originalPrice: Math.round(totalOriginalPrice),
      salePrice,
      discountPct,
      estimatedMargin: Math.round(salePrice - estimatedCost),
      marginPct: salePrice > 0 ? Math.round(((salePrice - estimatedCost) / salePrice) * 100) : 0,
      expiresInDays: nearExpiry[0]?.days_left,
    }
  });
});

// POST /flower-master/today-bundle/publish
flowerMasterRouter.post("/today-bundle/publish", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();

  await pool.query(
    `INSERT INTO flower_today_bundles
       (org_id, bundle_date, name_ar, composition, original_price, sale_price, discount_pct, is_published)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, TRUE)
     ON CONFLICT (org_id, bundle_date) WHERE is_sold = FALSE
     DO UPDATE SET name_ar=$2, composition=$3, original_price=$4, sale_price=$5,
                   discount_pct=$6, is_published=TRUE`,
    [orgId, body.nameAr || "باقة اليوم", JSON.stringify(body.composition || []),
     body.originalPrice || 0, body.salePrice || 0, body.discountPct || 30]
  );

  return c.json({ data: { published: true } });
});

// GET /flower-master/freshness-board — لوحة الطزاجة اليوم
flowerMasterRouter.get("/freshness-board", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT
       b.id, b.batch_number, b.quantity_remaining, b.unit_cost,
       b.expiry_estimated, b.quality_status, b.disposal_discount_pct, b.disposal_label_ar,
       b.received_at,
       EXTRACT(DAY FROM NOW() - b.received_at)::INTEGER AS age_days,
       (b.expiry_estimated::DATE - CURRENT_DATE) AS days_until_expiry,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color) AS display_name,
       v.flower_type, v.color, v.shelf_life_days,
       COALESCE(p.price_per_stem, v.base_price_per_stem, 10) AS base_price,
       COALESCE(p.price_per_stem, v.base_price_per_stem, 10) * (1 - b.disposal_discount_pct/100) AS effective_price,
       ROUND((EXTRACT(DAY FROM NOW() - b.received_at)::NUMERIC / NULLIF(v.shelf_life_days, 0)) * 100, 1) AS age_pct
     FROM flower_batches b
     JOIN flower_variants v ON v.id = b.variant_id
     LEFT JOIN flower_variant_pricing p ON p.variant_id = b.variant_id AND p.org_id = b.org_id AND p.is_active
     WHERE b.org_id=$1 AND b.is_active AND b.quantity_remaining > 0
     ORDER BY age_days DESC, b.quantity_remaining DESC`,
    [orgId]
  );
  return c.json({ data: rows });
});

// ═══════════════════════════════════════════════════════════
// طبقة الذكاء — Intelligence Layer
// ═══════════════════════════════════════════════════════════

// ── تنبيهات الخسارة الاستباقية ────────────────────────────
flowerMasterRouter.get("/loss-alerts", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(
    `SELECT
       b.id, b.batch_number, b.quantity_remaining, b.unit_cost,
       b.expiry_estimated, b.disposal_discount_pct, b.disposal_label_ar,
       b.received_at,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color) AS display_name,
       v.flower_type, v.color,
       COALESCE(p.price_per_stem, v.base_price_per_stem, 10) AS sale_price,
       (b.expiry_estimated::DATE - CURRENT_DATE) AS days_left,
       EXTRACT(DAY FROM NOW() - b.received_at)::INTEGER AS age_days,
       ROUND(b.quantity_remaining * b.unit_cost::NUMERIC, 2) AS cost_at_risk,
       ROUND(b.quantity_remaining * COALESCE(p.price_per_stem, v.base_price_per_stem, 10) *
         (b.disposal_discount_pct::NUMERIC / 100), 2) AS revenue_loss_if_discounted,
       ROUND(b.quantity_remaining * COALESCE(p.price_per_stem, v.base_price_per_stem, 10), 2) AS revenue_loss_if_wasted
     FROM flower_batches b
     JOIN flower_variants v ON v.id = b.variant_id
     LEFT JOIN flower_variant_pricing p ON p.variant_id = b.variant_id AND p.org_id = b.org_id AND p.is_active
     WHERE b.org_id = $1 AND b.is_active AND b.quantity_remaining > 0
       AND b.expiry_estimated <= NOW() + INTERVAL '3 days' AND b.expiry_estimated > NOW()
     ORDER BY b.expiry_estimated ASC`,
    [orgId]
  );
  const totalCostAtRisk = rows.reduce((s: number, r: any) => s + Number(r.cost_at_risk || 0), 0);
  const totalRevenueIfWasted = rows.reduce((s: number, r: any) => s + Number(r.revenue_loss_if_wasted || 0), 0);
  const undiscountedCount = rows.filter((r: any) => Number(r.disposal_discount_pct) === 0).length;
  let recommendation = null;
  if (rows.length > 0) {
    if (undiscountedCount > 0) {
      recommendation = `${undiscountedCount} دفعة لم يُطبَّق عليها خصم — طبّق التصريف الآن لاسترجاع ${Math.round(totalCostAtRisk * 0.6)} ر.س`;
    } else {
      recommendation = `كل الدفعات مُصرَّفة — راجع قائمة التوصيل لتسريع البيع`;
    }
  }
  return c.json({
    data: rows,
    summary: { batchCount: rows.length, totalCostAtRisk: Math.round(totalCostAtRisk), totalRevenueIfWasted: Math.round(totalRevenueIfWasted), undiscountedCount, recommendation }
  });
});

// ── مناسبات الورد الذكية ───────────────────────────────────
const SYSTEM_OCCASIONS = [
  // ── سعودية ──
  { name_ar: "عيد الحب",                   date_month: 2,  date_day: 14, icon: "💝", color: "rose",   category: "عالمية",  sales_multiplier: 4.0, stock_increase_pct: 200, lead_days: 21 },
  { name_ar: "يوم الأم",                   date_month: 3,  date_day: 21, icon: "🌸", color: "pink",   category: "عالمية",  sales_multiplier: 3.0, stock_increase_pct: 150, lead_days: 14 },
  { name_ar: "اليوم الوطني السعودي",       date_month: 9,  date_day: 23, icon: "🇸🇦", color: "green",  category: "سعودية",  sales_multiplier: 2.0, stock_increase_pct: 80,  lead_days: 10 },
  { name_ar: "يوم تأسيس المملكة",          date_month: 2,  date_day: 22, icon: "👑", color: "violet", category: "سعودية",  sales_multiplier: 1.5, stock_increase_pct: 50,  lead_days: 7  },
  { name_ar: "موسم التخرج (يونيو)",        date_month: 6,  date_day: 1,  icon: "🎓", color: "blue",   category: "موسمي",   sales_multiplier: 2.5, stock_increase_pct: 100, lead_days: 14 },
  { name_ar: "موسم الأعراس (مارس-مايو)",   date_month: 3,  date_day: 15, icon: "💒", color: "rose",   category: "موسمي",   sales_multiplier: 2.2, stock_increase_pct: 80,  lead_days: 14 },
  // ── عالمية ──
  { name_ar: "يوم المرأة العالمي",         date_month: 3,  date_day: 8,  icon: "♀️", color: "pink",   category: "عالمية",  sales_multiplier: 2.8, stock_increase_pct: 120, lead_days: 14 },
  { name_ar: "عيد الميلاد",                date_month: 12, date_day: 25, icon: "🎄", color: "green",  category: "عالمية",  sales_multiplier: 1.8, stock_increase_pct: 70,  lead_days: 10 },
  { name_ar: "رأس السنة الميلادية",        date_month: 12, date_day: 31, icon: "🎆", color: "amber",  category: "عالمية",  sales_multiplier: 1.8, stock_increase_pct: 60,  lead_days: 7  },
  { name_ar: "يوم الصداقة العالمي",        date_month: 7,  date_day: 30, icon: "🤝", color: "amber",  category: "عالمية",  sales_multiplier: 1.6, stock_increase_pct: 50,  lead_days: 7  },
  { name_ar: "عيد الأب العالمي",           date_month: 6,  date_day: 16, icon: "👔", color: "blue",   category: "عالمية",  sales_multiplier: 1.8, stock_increase_pct: 60,  lead_days: 10 },
  { name_ar: "يوم الأرض",                  date_month: 4,  date_day: 22, icon: "🌍", color: "green",  category: "عالمية",  sales_multiplier: 1.2, stock_increase_pct: 20,  lead_days: 5  },
  // ── موسمي ──
  { name_ar: "موسم الربيع (مارس)",         date_month: 3,  date_day: 21, icon: "🌼", color: "amber",  category: "موسمي",   sales_multiplier: 1.5, stock_increase_pct: 40,  lead_days: 7  },
  { name_ar: "موسم الصيف (يوليو)",         date_month: 7,  date_day: 1,  icon: "☀️", color: "amber",  category: "موسمي",   sales_multiplier: 1.3, stock_increase_pct: 30,  lead_days: 7  },
  { name_ar: "موسم الأعمال (سبتمبر)",      date_month: 9,  date_day: 1,  icon: "💼", color: "blue",   category: "موسمي",   sales_multiplier: 1.4, stock_increase_pct: 30,  lead_days: 7  },
  { name_ar: "يوم المعلم العالمي",         date_month: 10, date_day: 5,  icon: "📚", color: "blue",   category: "عالمية",  sales_multiplier: 1.6, stock_increase_pct: 50,  lead_days: 7  },
  { name_ar: "موسم الفالنتاين التجاري",    date_month: 2,  date_day: 7,  icon: "🎁", color: "rose",   category: "موسمي",   sales_multiplier: 2.0, stock_increase_pct: 80,  lead_days: 7  },
];

function calcUpcoming(allOcc: any[], daysAhead: number) {
  const today = new Date();
  const results: any[] = [];
  for (const occ of allOcc) {
    const thisYear = new Date(today.getFullYear(), occ.date_month - 1, occ.date_day);
    const nextYear = new Date(today.getFullYear() + 1, occ.date_month - 1, occ.date_day);
    const target = thisYear >= today ? thisYear : nextYear;
    const daysUntil = Math.ceil((target.getTime() - today.getTime()) / 86400000);
    if (daysUntil <= daysAhead) {
      results.push({ ...occ, next_date: target.toISOString().split("T")[0], days_until: daysUntil, is_urgent: daysUntil <= (occ.lead_days || 14) });
    }
  }
  return results.sort((a, b) => a.days_until - b.days_until);
}

flowerMasterRouter.get("/occasions/upcoming", async (c) => {
  const orgId = getOrgId(c);
  const daysAhead = parseInt(c.req.query("days") || "60");
  const { rows } = await pool.query(`SELECT * FROM flower_occasions WHERE org_id=$1 AND is_active=TRUE`, [orgId]);
  const all = [
    ...SYSTEM_OCCASIONS.map(o => ({ ...o, id: `sys_${o.name_ar}`, is_system: true })),
    ...rows,
  ];
  return c.json({ data: calcUpcoming(all, daysAhead) });
});

flowerMasterRouter.get("/occasions", async (c) => {
  const orgId = getOrgId(c);
  const { rows } = await pool.query(`SELECT * FROM flower_occasions WHERE org_id=$1 ORDER BY date_month, date_day`, [orgId]);
  return c.json({ data: rows, systemOccasions: SYSTEM_OCCASIONS });
});

flowerMasterRouter.post("/occasions", async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.json();
  const { rows } = await pool.query(
    `INSERT INTO flower_occasions (org_id,name_ar,name_en,icon,color,date_month,date_day,lead_days,sales_multiplier,stock_increase_pct,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [orgId, body.nameAr, body.nameEn||null, body.icon||"star", body.color||"rose",
     body.dateMonth, body.dateDay, body.leadDays||14, body.salesMultiplier||2.0, body.stockIncreasePct||50, body.notes||null]
  );
  return c.json({ data: rows[0] }, 201);
});

flowerMasterRouter.put("/occasions/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const { rows } = await pool.query(
    `UPDATE flower_occasions SET name_ar=$3,name_en=$4,icon=$5,color=$6,date_month=$7,date_day=$8,
     lead_days=$9,sales_multiplier=$10,stock_increase_pct=$11,notes=$12,is_active=$13
     WHERE id=$1 AND org_id=$2 RETURNING *`,
    [id,orgId,body.nameAr,body.nameEn||null,body.icon||"star",body.color||"rose",
     body.dateMonth,body.dateDay,body.leadDays||14,body.salesMultiplier||2.0,body.stockIncreasePct||50,body.notes||null,body.isActive??true]
  );
  if (!rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ data: rows[0] });
});

flowerMasterRouter.delete("/occasions/:id", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  await pool.query(`UPDATE flower_occasions SET is_active=FALSE WHERE id=$1 AND org_id=$2`, [id, orgId]);
  return c.json({ success: true });
});

// ── ذكاء العملاء ──────────────────────────────────────────
flowerMasterRouter.get("/customers/intelligence", async (c) => {
  const orgId = getOrgId(c);
  const limit = parseInt(c.req.query("limit") || "50");
  const { rows } = await pool.query(
    `WITH cust AS (
       SELECT customer_phone, customer_name,
         COUNT(*) AS order_count,
         SUM(total::NUMERIC) AS total_spent,
         AVG(total::NUMERIC) AS avg_order_value,
         MAX(created_at) AS last_order_at,
         MIN(created_at) AS first_order_at,
         MODE() WITHIN GROUP (ORDER BY order_type) AS favorite_order_type,
         CASE WHEN COUNT(*)>1
           THEN EXTRACT(DAY FROM (MAX(created_at)-MIN(created_at)))/NULLIF(COUNT(*)-1,0)
           ELSE NULL END AS avg_days_between_orders
       FROM flower_orders
       WHERE org_id=$1 AND status NOT IN ('cancelled')
       GROUP BY customer_phone, customer_name
     )
     SELECT *, EXTRACT(DAY FROM NOW()-last_order_at)::INTEGER AS days_since_last_order,
       CASE WHEN avg_days_between_orders IS NOT NULL
         AND EXTRACT(DAY FROM NOW()-last_order_at) > avg_days_between_orders*0.9
         THEN TRUE ELSE FALSE END AS is_due_return,
       CASE WHEN order_count>=10 THEN 'vip' WHEN order_count>=5 THEN 'regular'
         WHEN order_count>=2 THEN 'returning' ELSE 'new' END AS customer_tier
     FROM cust ORDER BY last_order_at DESC LIMIT $2`,
    [orgId, limit]
  );
  const due = rows.filter((r: any) => r.is_due_return).length;
  const vips = rows.filter((r: any) => r.customer_tier === "vip").length;
  const dormant = rows.filter((r: any) => Number(r.days_since_last_order) > 60).length;
  return c.json({
    data: rows,
    summary: {
      totalCustomers: rows.length,
      dueReturn: due,
      vipCount: vips,
      dormantCount: dormant,
      avgOrderValue: rows.length > 0
        ? Math.round(rows.reduce((s: number, r: any) => s + Number(r.avg_order_value||0), 0) / rows.length)
        : 0,
    }
  });
});

// ── تفاصيل عميل محدد (بالجوال) ───────────────────────────
flowerMasterRouter.get("/customers/:phone/orders", async (c) => {
  const orgId = getOrgId(c);
  const phone = c.req.param("phone");
  const { rows } = await pool.query(
    `SELECT id, order_number, total, status, delivery_type, delivery_address,
            gift_message, packaging, created_at, delivered_at, items
     FROM flower_orders
     WHERE org_id=$1 AND customer_phone=$2
     ORDER BY created_at DESC
     LIMIT 50`,
    [orgId, phone]
  );
  return c.json({ data: rows });
});

// ── هوامش الربح الحقيقية ──────────────────────────────────
flowerMasterRouter.get("/margins", async (c) => {
  const orgId = getOrgId(c);
  const { rows: packages } = await pool.query(
    `SELECT fp.id, fp.name, fp.base_price AS price, fp.category_tag AS category, fp.is_active,
            COALESCE(fp.items_breakdown, '[]'::jsonb) AS items_breakdown,
            fp.calculated_cost,
       (SELECT COALESCE(json_agg(vd),'[]') FROM (
         SELECT v.id AS variant_id,
           COALESCE(v.display_name_ar, v.flower_type||' '||v.color) AS variant_name,
           ROUND(AVG(b.unit_cost::NUMERIC),2) AS avg_unit_cost
         FROM flower_variants v
         JOIN flower_batches b ON b.variant_id=v.id AND b.org_id=$1 AND b.is_active = true AND b.quantity_remaining>0
         GROUP BY v.id, v.display_name_ar, v.flower_type, v.color
       ) vd) AS variant_costs
     FROM flower_packages fp WHERE fp.org_id=$1 ORDER BY fp.name`,
    [orgId]
  );
  const enriched = packages.map((pkg: any) => {
    const vcMap: Record<string, number> = {};
    for (const v of (pkg.variant_costs || [])) vcMap[v.variant_id] = Number(v.avg_unit_cost || 0);
    let cost = 0;
    for (const item of (pkg.items_breakdown || [])) {
      cost += (vcMap[item.variantId] || Number(item.unitCost || 0)) * Number(item.qty || 0);
    }
    const price = Number(pkg.price || 0);
    const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : null;
    return { ...pkg, variant_costs: undefined, real_cost: Math.round(cost*100)/100, margin_pct: margin,
      margin_amount: Math.round(price - cost),
      cost_status: margin===null?"unknown":margin<0?"loss":margin<20?"low":margin<40?"fair":"healthy" };
  });
  const known = enriched.filter((p: any) => p.margin_pct !== null);
  return c.json({
    data: enriched,
    summary: {
      avgMargin: known.length ? Math.round(known.reduce((s: number, p: any) => s+(p.margin_pct||0), 0)/known.length) : null,
      lossCount: enriched.filter((p: any) => p.cost_status==="loss").length,
      lowMarginCount: enriched.filter((p: any) => p.cost_status==="low").length,
      healthyCount: enriched.filter((p: any) => p.cost_status==="healthy").length,
    }
  });
});

flowerMasterRouter.patch("/packages/:id/breakdown", async (c) => {
  const orgId = getOrgId(c);
  const id = c.req.param("id");
  const { breakdown } = await c.req.json();
  await pool.query(
    `UPDATE flower_packages SET items_breakdown=$3::jsonb, cost_updated_at=NOW() WHERE id=$1 AND org_id=$2`,
    [id, orgId, JSON.stringify(breakdown || [])]
  );
  return c.json({ success: true });
});
