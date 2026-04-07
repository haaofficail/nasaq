/**
 * seed-flower-suppliers.ts
 * ────────────────────────────────────────────────────────────────
 * زرع موردين حقيقيين مع دفعات ورد مرتبطة:
 *  - 6 موردين (هولندا، كينيا، إكوادور، تايلاند، سعودي، متنوع)
 *  - 8 دفعات ورد مرتبطة بموردين وأصناف فعلية
 *  - رحلة كاملة: مورد → دفعة → صنف → هدر (اختياري)
 *
 * Usage:
 *   pnpm --filter @nasaq/db tsx seeds/seed-flower-suppliers.ts [org-slug]
 *   Default slug: ward-aljawri
 * ────────────────────────────────────────────────────────────────
 */

import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const TARGET_SLUG = process.argv[2] ?? "ward-aljawri";

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log(`\n>>> زرع الموردين للمنشأة: ${TARGET_SLUG}\n`);

    const { rows: [org] } = await client.query(
      `SELECT id, name FROM organizations WHERE slug = $1`, [TARGET_SLUG]
    );
    if (!org) throw new Error(`منشأة غير موجودة: ${TARGET_SLUG}`);
    const orgId = org.id;
    console.log(`    المنشأة: ${org.name} (${orgId})`);

    // ─── 1. الموردون الستة ─────────────────────────────────────────────────────
    const supplierDefs = [
      {
        code: "SUP-NKH",
        name: "شركة النخيل للزهور",
        name_en: "Al-Nakheel Flowers Co.",
        contact_name: "أحمد النخيل",
        phone: "+966114523100",
        email: "orders@nakheel-flowers.sa",
        city: "الرياض",
        country: "SA",
        flower_specialty: "ورود هولندية فاخرة",
        flower_origin: "هولندا",
        quality_score: 8.5,
        on_time_rate: 92.0,
        avg_delivery_days: 4.0,
        payment_terms_days: 30,
        notes: "مورد رئيسي للورد الهولندي منذ 2018. يستورد مباشرة من مزاد Royal FloraHolland",
      },
      {
        code: "SUP-KNY",
        name: "أزهار كينيا العربية",
        name_en: "Kenya Flowers Arabia",
        contact_name: "محمد الكندي",
        phone: "+966125891200",
        email: "supply@kenyaflowers-arabia.com",
        city: "جدة",
        country: "SA",
        flower_specialty: "ورود كينية وجربيرا",
        flower_origin: "كينيا",
        quality_score: 7.8,
        on_time_rate: 88.0,
        avg_delivery_days: 5.5,
        payment_terms_days: 15,
        notes: "يستورد من مزارع Oserian وSian Roses في كينيا. أسعار تنافسية للكميات الكبيرة",
      },
      {
        code: "SUP-ECU",
        name: "إكوادور للورد الملكي",
        name_en: "Ecuador Royal Roses",
        contact_name: "خالد الشمري",
        phone: "+966112267890",
        email: "info@ecuador-roses.sa",
        city: "الرياض",
        country: "SA",
        flower_specialty: "ورود إكوادورية فاخرة وطويلة الساق",
        flower_origin: "إكوادور",
        quality_score: 9.2,
        on_time_rate: 95.0,
        avg_delivery_days: 6.0,
        payment_terms_days: 45,
        notes: "تخصص في الورد الإكوادوري الفاخر من مزارع Nevado وRosaprima. ساق طويل 60-80 سم",
      },
      {
        code: "SUP-ORC",
        name: "بيت الأوركيد الخليجي",
        name_en: "Gulf Orchid House",
        contact_name: "نورة العمري",
        phone: "+966138904321",
        email: "orchids@gulforchid.com",
        city: "الدمام",
        country: "SA",
        flower_specialty: "أوركيد وزهور استوائية فاخرة",
        flower_origin: "تايلاند واليابان",
        quality_score: 9.0,
        on_time_rate: 90.0,
        avg_delivery_days: 7.0,
        payment_terms_days: 30,
        notes: "المورد الحصري للأوركيد التايلاندي واليابانيالفاخر في المنطقة الشرقية",
      },
      {
        code: "SUP-JWH",
        name: "الجوهرة للأزهار",
        name_en: "Al-Jawhra Flowers",
        contact_name: "سلمى الجوهري",
        phone: "+966125671800",
        email: "jawhra@flowers.sa",
        city: "جدة",
        country: "SA",
        flower_specialty: "زهور متنوعة وليلية وتيوليب",
        flower_origin: "متنوع",
        quality_score: 7.5,
        on_time_rate: 85.0,
        avg_delivery_days: 3.5,
        payment_terms_days: 14,
        notes: "مستورد عام لأصناف متنوعة: تيوليب هولندي، ليلية فرنسية، قرنفل كولومبي",
      },
      {
        code: "SUP-SAU",
        name: "المزارع السعودية للزهور",
        name_en: "Saudi Flower Farms",
        contact_name: "فهد القحطاني",
        phone: "+966135001234",
        email: "farm@saudiflowers.sa",
        city: "الأحساء",
        country: "SA",
        flower_specialty: "ورود محلية وعباد الشمس",
        flower_origin: "السعودية",
        quality_score: 7.0,
        on_time_rate: 96.0,
        avg_delivery_days: 1.5,
        payment_terms_days: 7,
        notes: "منتج محلي في الأحساء. توريد سريع اليوم التالي. مناسب لاحتياجات الطوارئ والكميات الصغيرة",
      },
    ];

    const supplierIds: Record<string, string> = {};
    for (const s of supplierDefs) {
      const { rows } = await client.query(
        `INSERT INTO suppliers
           (org_id, code, name, name_en, contact_name, phone, email,
            city, country, flower_specialty, flower_origin,
            quality_score, on_time_rate, avg_delivery_days,
            payment_terms_days, notes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'active')
         ON CONFLICT (org_id, code) WHERE code IS NOT NULL DO UPDATE
           SET name=$3, flower_origin=$11, quality_score=$12,
               on_time_rate=$13, avg_delivery_days=$14, notes=$16
         RETURNING id`,
        [orgId, s.code, s.name, s.name_en, s.contact_name, s.phone, s.email,
         s.city, s.country, s.flower_specialty, s.flower_origin,
         s.quality_score, s.on_time_rate, s.avg_delivery_days,
         s.payment_terms_days, s.notes]
      );
      supplierIds[s.code] = rows[0].id;
      console.log(`    ✓ مورد: ${s.name} (${rows[0].id})`);
    }

    // ─── 2. جلب أصناف الورد الموجودة ──────────────────────────────────────────
    const { rows: variants } = await client.query(
      `SELECT id, flower_type, color, origin, grade, display_name_ar
       FROM flower_variants
       ORDER BY flower_type, origin, color`
    );

    const findVariant = (type: string, color: string, origin: string) =>
      variants.find(v => v.flower_type === type && v.color === color && v.origin === origin)?.id;

    const redDutch     = findVariant("rose", "red",      "dutch");
    const whiteDutch   = findVariant("rose", "white",    "dutch");
    const pinkDutch    = findVariant("rose", "pink",     "dutch");
    const pinkKenyan   = findVariant("rose", "pink",     "kenyan");
    const yellowDutch  = findVariant("rose", "yellow",   "dutch");
    const orangeEcu    = findVariant("rose", "orange",   "ecuadorian");
    const burgundyEcu  = findVariant("rose", "burgundy", "ecuadorian");
    const orchidWhite  = findVariant("orchid", "white",  "thailand");
    const orchidPurple = findVariant("orchid", "purple", "thailand");
    const sunflower    = findVariant("sunflower", "yellow", "kenyan") ||
                         variants.find(v => v.flower_type === "sunflower")?.id;

    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
    const daysLater = (n: number) => new Date(now.getTime() + n * 86400000).toISOString();

    // ─── 3. الدفعات المرتبطة بالموردين ────────────────────────────────────────
    type BatchDef = {
      supplierCode: string;
      variantId: string | undefined;
      batchNumber: string;
      bunches: number;
      stemsPerBunch: number;
      costPerStem: number;
      receivedAgo: number;   // قبل كم يوم
      expiryDays: number;    // كم يوم حتى الانتهاء من الآن
      bloomStage: string;
      qualityStatus: string;
      notes?: string;
    };

    const batchDefs: BatchDef[] = [
      // ── النخيل — هولندا ──
      {
        supplierCode: "SUP-NKH", variantId: redDutch,
        batchNumber: "NKH-2026-041", bunches: 30, stemsPerBunch: 25,
        costPerStem: 8.50, receivedAgo: 7, expiryDays: 5,
        bloomStage: "semi_open", qualityStatus: "good",
        notes: "شحنة الثلاثاء المعتادة، جودة ممتازة",
      },
      {
        supplierCode: "SUP-NKH", variantId: whiteDutch,
        batchNumber: "NKH-2026-042", bunches: 20, stemsPerBunch: 25,
        costPerStem: 7.00, receivedAgo: 10, expiryDays: 2,
        bloomStage: "open", qualityStatus: "expiring",
        notes: "قريبة الانتهاء — يُوصى بالبيع بسعر مخفض",
      },
      // ── كينيا العربية ──
      {
        supplierCode: "SUP-KNY", variantId: pinkKenyan,
        batchNumber: "KNY-2026-018", bunches: 25, stemsPerBunch: 20,
        costPerStem: 5.50, receivedAgo: 3, expiryDays: 9,
        bloomStage: "bud", qualityStatus: "fresh",
        notes: "وردي كيني ناعم — مناسب للباقات النسائية",
      },
      {
        supplierCode: "SUP-KNY", variantId: sunflower,
        batchNumber: "KNY-2026-019", bunches: 10, stemsPerBunch: 10,
        costPerStem: 4.00, receivedAgo: 2, expiryDays: 10,
        bloomStage: "bud", qualityStatus: "fresh",
        notes: "عباد الشمس الكيني",
      },
      // ── إكوادور ──
      {
        supplierCode: "SUP-ECU", variantId: orangeEcu,
        batchNumber: "ECU-2026-023", bunches: 20, stemsPerBunch: 25,
        costPerStem: 9.00, receivedAgo: 4, expiryDays: 10,
        bloomStage: "bud", qualityStatus: "fresh",
        notes: "برتقالي إكوادوري — ساق 70 سم ممتاز",
      },
      {
        supplierCode: "SUP-ECU", variantId: burgundyEcu,
        batchNumber: "ECU-2026-024", bunches: 15, stemsPerBunch: 25,
        costPerStem: 9.50, receivedAgo: 6, expiryDays: 8,
        bloomStage: "semi_open", qualityStatus: "good",
        notes: "كرزي داكن — مطلوب للمناسبات الفاخرة",
      },
      // ── بيت الأوركيد ──
      {
        supplierCode: "SUP-ORC", variantId: orchidWhite,
        batchNumber: "ORC-2026-007", bunches: 8, stemsPerBunch: 5,
        costPerStem: 22.00, receivedAgo: 3, expiryDays: 18,
        bloomStage: "semi_open", qualityStatus: "fresh",
        notes: "أوركيد أبيض تايلاندي — عمر صلاحية 3 أسابيع",
      },
      // ── المزارع السعودية ──
      {
        supplierCode: "SUP-SAU", variantId: yellowDutch,
        batchNumber: "SAU-2026-012", bunches: 12, stemsPerBunch: 20,
        costPerStem: 6.00, receivedAgo: 1, expiryDays: 7,
        bloomStage: "bud", qualityStatus: "fresh",
        notes: "توريد محلي سريع — أصفر مناسب للهدايا والمناسبات",
      },
    ];

    let batchCount = 0;
    for (const b of batchDefs) {
      if (!b.variantId) {
        console.log(`    ⚠  تخطي دفعة (صنف غير موجود): ${b.batchNumber}`);
        continue;
      }
      const qty = b.bunches * b.stemsPerBunch;
      await client.query(
        `INSERT INTO flower_batches
           (org_id, variant_id, supplier_id, batch_number,
            bunches_received, stems_per_bunch, cost_per_bunch,
            quantity_received, quantity_remaining,
            unit_cost, received_at, expiry_estimated,
            current_bloom_stage, quality_status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT DO NOTHING`,
        [
          orgId, b.variantId, supplierIds[b.supplierCode], b.batchNumber,
          b.bunches, b.stemsPerBunch, (b.costPerStem * b.stemsPerBunch).toFixed(2),
          qty,
          b.costPerStem.toFixed(2),
          daysAgo(b.receivedAgo),
          daysLater(b.expiryDays),
          b.bloomStage, b.qualityStatus,
          b.notes || null,
        ]
      );
      batchCount++;
      console.log(`    ✓ دفعة ${b.batchNumber}: ${qty} ساق من ${b.supplierCode}`);
    }

    // ─── 4. سجل هدر مرتبط بمورد (عبر الدفعة) ─────────────────────────────────
    if (pinkKenyan) {
      const { rows: [knyBatch] } = await client.query(
        `SELECT id FROM flower_batches WHERE org_id=$1 AND batch_number='KNY-2026-018' LIMIT 1`,
        [orgId]
      );
      if (knyBatch) {
        await client.query(
          `INSERT INTO flower_waste_logs (org_id, variant_id, batch_id, quantity_type, quantity, reason, notes)
           VALUES ($1,$2,$3,'stems',15,'natural_expiry','تلف طبيعي عند تقطيع الساق الزائدة')
           ON CONFLICT DO NOTHING`,
          [orgId, pinkKenyan, knyBatch.id]
        );
        console.log(`    ✓ هدر مرتبط: 15 ساق من دفعة KNY-2026-018`);
      }
    }

    // ─── 5. تحديث إجمالي المشتريات لكل مورد ──────────────────────────────────
    await client.query(`
      UPDATE suppliers s
      SET total_purchases = (
        SELECT COALESCE(SUM(b.quantity_received * b.unit_cost::NUMERIC), 0)
        FROM flower_batches b WHERE b.supplier_id = s.id AND b.org_id = s.org_id
      ),
      last_delivery_at = (
        SELECT MAX(received_at) FROM flower_batches b
        WHERE b.supplier_id = s.id AND b.org_id = s.org_id
      )
      WHERE s.org_id = $1
    `, [orgId]);
    console.log(`    ✓ تحديث إجمالي المشتريات لكل مورد`);

    await client.query("COMMIT");

    // ─── التحقق ────────────────────────────────────────────────────────────────
    const { rows: supplierCheck } = await client.query(
      `SELECT s.name, COUNT(b.id) AS batches, COALESCE(SUM(b.quantity_received),0) AS total_stems
       FROM suppliers s
       LEFT JOIN flower_batches b ON b.supplier_id=s.id AND b.org_id=s.org_id
       WHERE s.org_id=$1 GROUP BY s.id, s.name ORDER BY s.name`,
      [orgId]
    );
    console.log("\n─── تحقق نهائي ───────────────────────────────────────────");
    for (const r of supplierCheck) {
      const icon = Number(r.batches) > 0 ? "✓" : "○";
      console.log(`  ${icon} ${r.name}: ${r.batches} دفعة / ${r.total_stems} ساق`);
    }

    const { rows: [wasteCheck] } = await client.query(
      `SELECT COUNT(*) AS cnt FROM flower_waste_logs wl
       JOIN flower_batches b ON b.id=wl.batch_id
       JOIN suppliers s ON s.id=b.supplier_id
       WHERE wl.org_id=$1`,
      [orgId]
    );
    console.log(`  ✓ هدر مرتبط بمورد عبر الدفعة: ${wasteCheck.cnt} سجل`);
    console.log("──────────────────────────────────────────────────────────\n");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("فشل الزرع:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
