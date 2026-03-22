import { Hono } from "hono";
import { z } from "zod";
import { db, pool } from "@nasaq/db/client";
import {
  flowerVariants, flowerBatches, flowerVariantPricing,
  flowerSubstitutions, flowerRecipeComponents,
} from "@nasaq/db/schema";
import { eq, and, desc, asc, sql, count, lte, gte, gt, isNull, or } from "drizzle-orm";
import { getOrgId } from "../lib/helpers";

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
  quantityReceived: z.number().int().min(1),
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
    .select()
    .from(flowerBatches)
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
      daysUntilExpiry: Math.ceil((new Date(b.expiryEstimated).getTime() - Date.now()) / 86400000),
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

  // Auto-generate batch number if not provided
  const batchNumber = body.batchNumber ?? `BTC-${Date.now().toString(36).toUpperCase()}`;

  const [batch] = await db
    .insert(flowerBatches)
    .values({
      orgId,
      ...body,
      batchNumber,
      quantityRemaining: body.quantityReceived, // starts equal to received
      receivedAt:        body.receivedAt ? new Date(body.receivedAt) : new Date(),
      expiryEstimated:   new Date(body.expiryEstimated),
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
  await db.update(flowerVariantPricing)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(flowerVariantPricing.id, c.req.param("id")), eq(flowerVariantPricing.orgId, orgId)));
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
  await db.update(flowerSubstitutions)
    .set({ isActive: false })
    .where(and(eq(flowerSubstitutions.id, c.req.param("id")), eq(flowerSubstitutions.orgId, orgId)));
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
  await db.update(flowerRecipeComponents)
    .set({ isActive: false })
    .where(and(eq(flowerRecipeComponents.id, c.req.param("id")), eq(flowerRecipeComponents.orgId, orgId)));
  return c.json({ success: true });
});

// ============================================================
// REPORTS
// ============================================================

// Stock summary by variant — FEFO-aware remaining quantities
flowerMasterRouter.get("/reports/stock", async (c) => {
  const orgId = getOrgId(c);

  const result = await pool.query(
    `SELECT
       v.id                AS variant_id,
       COALESCE(v.display_name_ar, v.flower_type || ' ' || v.color) AS display_name,
       v.flower_type,
       v.color,
       v.origin,
       v.grade,
       v.size,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.is_active AND b.quantity_remaining > 0), 0)           AS total_remaining,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.is_active AND b.quality_status IN ('fresh','good')), 0) AS good_stock,
       COALESCE(SUM(b.quantity_remaining) FILTER (WHERE b.is_active AND b.quality_status = 'expiring'), 0)       AS expiring_stock,
       COUNT(b.id) FILTER (WHERE b.is_active AND b.quantity_remaining > 0)                                       AS active_batches,
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
