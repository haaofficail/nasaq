/**
 * API Response Types
 *
 * كل endpoint له interface صريح — لا any[] في response types.
 * هذا يضمن أن أي خطأ في اسم الحقل يظهر كخطأ TypeScript عند البناء.
 *
 * النمط:
 *   - الحقول بـ camelCase للـ Drizzle responses، وsnake_case للـ raw SQL responses
 *   - كل domain في section مستقل
 *   - أضف interface جديد لكل endpoint جديد قبل استخدامه
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

export type ISODateString = string; // "2025-01-15T10:30:00.000Z"
export type UUID = string;

// ─── Flower Master ────────────────────────────────────────────────────────────

/**
 * GET /flower-master/pos-catalog
 * Raw SQL join: variant + pricing + batches → snake_case
 */
export interface FlowerVariantPOS {
  variant_id: UUID;
  display_name: string;          // COALESCE(display_name_ar, flower_type + ' ' + color)
  flower_type: string;
  color: string;
  grade: string | null;
  total_stock: number;           // SUM from active batches
  sell_price: number;            // COALESCE(pricing.price_per_stem, variant.base_price_per_stem)
}

/**
 * GET /flower-master/variants
 * Drizzle select → camelCase
 */
export interface FlowerVariant {
  id: UUID;
  flowerType: string;
  color: string;
  origin: string;
  grade: string;
  size: string;
  bloomStage: string;
  displayNameAr?: string;
  basePricePerStem?: string;
  shelfLifeDays?: number;
  isActive: boolean;
  originPriceMultiplier?: string;
  gradePriceMultiplier?: string;
  bunchSize?: number;
}

/**
 * GET /flower-master/batches
 * Drizzle select → camelCase
 */
export interface FlowerBatch {
  id: UUID;
  variantId: UUID;
  batchNumber: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost?: string;
  expiryEstimated: string;
  currentBloomStage: string;
  qualityStatus: string;
  notes?: string;
  daysUntilExpiry?: number;
  variant?: { displayNameAr?: string; flowerType?: string };
}

/** GET /flower-master/batches/expiring — same shape as FlowerBatch */
export type FlowerBatchExpiring = FlowerBatch;

/**
 * GET /flower-master/pricing
 * Drizzle select → camelCase; numeric fields returned as strings by pg driver
 */
export interface FlowerPricing {
  id: UUID;
  variantId: UUID;
  pricePerStem: string;          // pg returns numeric as string
  costPerStem?: string;
  markupPercent?: string;
  notes?: string;
}

/**
 * GET /flower-master/reports/stock
 * Raw SQL → snake_case; numeric fields returned as strings by pg driver
 */
export interface FlowerStockRow {
  variant_id: UUID;
  display_name_ar?: string;
  flower_type: string;
  total_remaining: string;
  batch_count: string;
  expiring_stock: string;
  avg_unit_cost?: string;
}

/**
 * GET /flower-master/reports/intelligence
 */
export interface FlowerIntelligence {
  waste: Array<{
    flower_type: string;
    color: string;
    waste_units: string;
    waste_cost: string;
    waste_rate_pct: string;
  }>;
  velocity: Array<{
    flower_type: string;
    color: string;
    weekly_demand: string;
  }>;
  margin: Array<{
    flower_type: string;
    color: string;
    min_price: string;
    margin_pct: string;
  }>;
  expiring: FlowerBatch[];
}

// ─── Arrangements (Flower Packages) ──────────────────────────────────────────

/** GET /arrangements */
export interface FlowerArrangement {
  id: UUID;
  name: string;
  description: string | null;
  category: string;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
  components: string[];           // display strings e.g. ["50× وردة حمراء"]
  items_breakdown: Array<{        // structured for margin calc
    variantId: UUID;
    qty: number;
    unitCost: number;
  }> | null;
  totalOrders?: number;           // joined stat (may not always be present)
  total_orders?: number;
}

/** GET /arrangements/stats */
export interface FlowerArrangementStats {
  total: number;
  active: number;
  with_cost?: number;
  avg_margin?: number | null;
  avgPrice?: number | null;
  totalOrders?: number;
}

// ─── Flower Builder ───────────────────────────────────────────────────────────

/** GET /flower-builder/catalog */
export interface FlowerBuilderCatalogItem {
  id: UUID;
  name: string;
  type: "packaging" | "gift" | "card" | "delivery";
  price: number;
  is_active: boolean;
  stock: number | null;
}

export interface FlowerBuilderCatalog {
  packaging: FlowerBuilderCatalogItem[];
  gift: FlowerBuilderCatalogItem[];
  card: FlowerBuilderCatalogItem[];
  delivery: FlowerBuilderCatalogItem[];
  [key: string]: FlowerBuilderCatalogItem[]; // index signature for Object.values()
}
