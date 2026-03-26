// ============================================================
// BARCODE ENGINE — محرك الباركود المركزي
//
// يُستخدم في:
//   - توليد باركود فريد لكل خدمة/منتج
//   - البحث عبر الكتالوج + المخزون بالباركود
//   - التحقق من تفرد الباركود داخل المنشأة
// ============================================================

import { pool } from "@nasaq/db/client";

// ── Generate a unique CODE128-compatible barcode string ──────────────
// Format: ORG_PREFIX (3 chars) + TIMESTAMP (6 chars) + RANDOM (4 digits)
// Example: "NSQ" + "231015" + "4872" → "NSQ2310154872"
export function generateBarcodeString(): string {
  const ts = Date.now().toString().slice(-8); // last 8 digits of timestamp
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `NSQ${ts}${rand}`;
}

// ── Validate that a barcode is unique within an org ──────────────────
export async function isBarcodeUnique(orgId: string, barcode: string, excludeServiceId?: string): Promise<boolean> {
  // Check services table
  const svcResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM services
     WHERE org_id = $1 AND barcode = $2 ${excludeServiceId ? "AND id != $3" : ""}`,
    excludeServiceId ? [orgId, barcode, excludeServiceId] : [orgId, barcode],
  );
  if (parseInt(svcResult.rows[0]?.count ?? "0") > 0) return false;

  // Check inventory_products table
  const invResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM inventory_products
     WHERE org_id = $1 AND barcode = $2`,
    [orgId, barcode],
  );
  if (parseInt(invResult.rows[0]?.count ?? "0") > 0) return false;

  return true;
}

// ── Universal barcode lookup across all item types ───────────────────
export interface BarcodeMatch {
  type: "service" | "inventory_product";
  id: string;
  name: string;
  barcode: string;
  sku?: string | null;
  price?: number;
  unit?: string;
  currentStock?: number;
  imageUrl?: string | null;
}

export async function lookupByBarcode(orgId: string, barcode: string): Promise<BarcodeMatch | null> {
  // 1. Search services/catalog
  const svcRes = await pool.query<{
    id: string; name: string; barcode: string; base_price: string; image_url: string | null;
  }>(
    `SELECT id, name, barcode, base_price,
            (SELECT url FROM service_media WHERE service_id = services.id AND type = 'image' ORDER BY sort_order LIMIT 1) AS image_url
     FROM services
     WHERE org_id = $1 AND barcode = $2 AND status != 'archived'
     LIMIT 1`,
    [orgId, barcode],
  );

  if (svcRes.rows.length > 0) {
    const s = svcRes.rows[0];
    return {
      type: "service",
      id:   s.id,
      name: s.name,
      barcode: s.barcode,
      price:  parseFloat(s.base_price),
      imageUrl: s.image_url,
    };
  }

  // 2. Search inventory products
  const invRes = await pool.query<{
    id: string; name: string; barcode: string; sku: string | null;
    selling_price: string; unit: string; current_stock: string;
  }>(
    `SELECT id, name, barcode, sku, selling_price, unit, current_stock
     FROM inventory_products
     WHERE org_id = $1 AND barcode = $2 AND is_active = true
     LIMIT 1`,
    [orgId, barcode],
  );

  if (invRes.rows.length > 0) {
    const p = invRes.rows[0];
    return {
      type: "inventory_product",
      id:   p.id,
      name: p.name,
      barcode: p.barcode,
      sku:  p.sku,
      price: parseFloat(p.selling_price ?? "0"),
      unit: p.unit,
      currentStock: parseFloat(p.current_stock ?? "0"),
    };
  }

  return null;
}
