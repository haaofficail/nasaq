// ============================================================
// Onboarding — نظام Bootstrap الديناميكي
// POST /onboarding/flower-full-setup   { profileKey?: string }
// GET  /onboarding/status
// GET  /onboarding/profiles
// ============================================================

import { Hono } from "hono";
import { pool } from "@nasaq/db/client";
import { getOrgId, getUserId } from "../lib/helpers";

export const onboardingRouter = new Hono();

// ── GET /onboarding/status ────────────────────────────────────
onboardingRouter.get("/status", async (c) => {
  const orgId = getOrgId(c);
  const { rows: [org] } = await pool.query(
    `SELECT has_demo_data FROM organizations WHERE id = $1`,
    [orgId]
  );
  return c.json({ data: { hasSetup: org?.has_demo_data ?? false } });
});

// ── GET /onboarding/profiles ──────────────────────────────────
onboardingRouter.get("/profiles", async (c) => {
  const orgId = getOrgId(c);
  const { rows: [org] } = await pool.query(
    `SELECT business_type FROM organizations WHERE id = $1`,
    [orgId]
  );
  const businessType = org?.business_type ?? "flower_shop";

  const { rows } = await pool.query(
    `SELECT mp.id, mp.profile_key, mp.name, mp.description, mp.version
     FROM master_template_profiles mp
     JOIN master_business_templates mt ON mp.template_id = mt.id
     WHERE mt.business_type = $1 AND mp.is_active = true
     ORDER BY mp.version DESC`,
    [businessType]
  );
  return c.json({ data: rows });
});

// ── POST /onboarding/flower-full-setup ───────────────────────
onboardingRouter.post("/flower-full-setup", async (c) => {
  const orgId  = getOrgId(c);
  const userId = getUserId(c);

  const body = await c.req.json().catch(() => ({}));
  const profileKey: string = body.profileKey ?? "flower_events";

  // Idempotency check + get business_type
  const { rows: [org] } = await pool.query(
    `SELECT has_demo_data, business_type FROM organizations WHERE id = $1`,
    [orgId]
  );
  if (org?.has_demo_data) {
    return c.json({ error: "تم إعداد المتجر مسبقاً", alreadySetup: true }, 409);
  }

  // Find active profile
  const { rows: [profile] } = await pool.query(
    `SELECT mp.id, mp.version, mp.name
     FROM master_template_profiles mp
     JOIN master_business_templates mt ON mp.template_id = mt.id
     WHERE mt.business_type = $1 AND mp.profile_key = $2 AND mp.is_active = true
     ORDER BY mp.version DESC LIMIT 1`,
    [org?.business_type ?? "flower_shop", profileKey]
  );

  if (!profile) {
    return c.json({ error: "لم يتم العثور على قالب للإعداد" }, 404);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── 1. تصنيفات ────────────────────────────────────────────
    const { rows: masterCats } = await client.query(
      `SELECT id, name, name_en, sort_order FROM master_categories
       WHERE profile_id = $1 ORDER BY sort_order`,
      [profile.id]
    );
    const catMap: Record<string, string> = {}; // master cat id → org cat id
    let categoriesCreated = 0;
    for (const cat of masterCats) {
      const slug = cat.name
        .replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]/g, "").toLowerCase()
        + "-" + Date.now().toString(36).slice(-4);
      const { rows: [ins] } = await client.query(
        `INSERT INTO categories (org_id, name, name_en, slug, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,true) ON CONFLICT DO NOTHING RETURNING id`,
        [orgId, cat.name, cat.name_en, slug, cat.sort_order]
      );
      if (ins) { catMap[cat.id] = ins.id; categoriesCreated++; }
    }

    // ── 2. إضافات ─────────────────────────────────────────────
    const { rows: masterAddons } = await client.query(
      `SELECT * FROM master_addons WHERE profile_id = $1 ORDER BY sort_order`,
      [profile.id]
    );
    let addonsCreated = 0;
    for (const a of masterAddons) {
      await client.query(
        `INSERT INTO addons (org_id, name, name_en, description, price, price_mode, type, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)`,
        [orgId, a.name, a.name_en, a.description, a.price, a.price_mode, a.type, a.sort_order]
      );
      addonsCreated++;
    }

    // ── 3. مسميات وظيفية ──────────────────────────────────────
    const { rows: masterJTs } = await client.query(
      `SELECT * FROM master_job_titles WHERE profile_id = $1 ORDER BY sort_order`,
      [profile.id]
    );
    let jobTitlesCreated = 0;
    for (const jt of masterJTs) {
      await client.query(
        `INSERT INTO job_titles (org_id, name, name_en, system_role, color, sort_order, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,true) ON CONFLICT DO NOTHING`,
        [orgId, jt.name, jt.name_en, jt.system_role, jt.color, jt.sort_order]
      );
      jobTitlesCreated++;
    }

    // ── 4. منتجات ─────────────────────────────────────────────
    const { rows: masterProducts } = await client.query(
      `SELECT * FROM master_products WHERE profile_id = $1 ORDER BY sort_order`,
      [profile.id]
    );
    let productsCreated = 0;
    for (const p of masterProducts) {
      const catId = p.category_id ? catMap[p.category_id] ?? null : null;
      const slug = p.name
        .replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]/g, "").toLowerCase()
        + "-" + Math.random().toString(36).slice(2, 6);
      await client.query(
        `INSERT INTO services
           (org_id, category_id, name, slug, description, base_price,
            offering_type, service_type, status, sort_order, is_template, is_demo)
         VALUES ($1,$2,$3,$4,$5,$6,'product','product','active',$7,false,false)
         ON CONFLICT DO NOTHING`,
        [orgId, catId, p.name, slug, p.description, String(p.base_price), p.sort_order]
      );
      productsCreated++;
    }

    // ── 5. خدمات عادية ────────────────────────────────────────
    const { rows: regularSvcs } = await client.query(
      `SELECT * FROM master_services
       WHERE profile_id = $1 AND service_type = 'regular'
       ORDER BY sort_order`,
      [profile.id]
    );
    let regularServicesCreated = 0;
    for (const s of regularSvcs) {
      const catId = s.category_id ? catMap[s.category_id] ?? null : null;
      const slug = s.name
        .replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]/g, "").toLowerCase()
        + "-" + Math.random().toString(36).slice(2, 6);
      await client.query(
        `INSERT INTO services
           (org_id, category_id, name, slug, description, base_price,
            duration_minutes, offering_type, service_type, status, sort_order, is_template, is_demo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'service','active',$9,false,false)
         ON CONFLICT DO NOTHING`,
        [orgId, catId, s.name, slug, s.description,
         String(s.base_price), s.duration_minutes, s.offering_type, s.sort_order]
      );
      regularServicesCreated++;
    }

    // ── 6. خطط التجهيز + البنود ───────────────────────────────
    const { rows: masterPlans } = await client.query(
      `SELECT * FROM master_setup_plans WHERE profile_id = $1 ORDER BY sort_order`,
      [profile.id]
    );
    const planMap: Record<string, string> = {};
    let templatesCreated = 0;
    for (const plan of masterPlans) {
      const { rows: [ins] } = await client.query(
        `INSERT INTO event_package_templates
           (org_id, name, type, worker_count, setup_notes, is_active)
         VALUES ($1,$2,$3,$4,$5,true) RETURNING id`,
        [orgId, plan.name, plan.type, plan.worker_count, plan.setup_notes]
      );
      planMap[plan.id] = ins.id;
      templatesCreated++;

      const { rows: items } = await client.query(
        `SELECT * FROM master_setup_plan_items WHERE plan_id = $1 ORDER BY sort_order`,
        [plan.id]
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO event_package_template_items
             (template_id, org_id, item_type, asset_category, description,
              quantity, unit, unit_cost_estimate, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [ins.id, orgId, item.item_type, item.asset_category, item.description,
           item.quantity, item.unit, item.unit_cost_estimate, item.sort_order]
        );
      }
    }

    // ── 7. خدمات ميدانية ──────────────────────────────────────
    const { rows: fieldSvcs } = await client.query(
      `SELECT * FROM master_services
       WHERE profile_id = $1 AND service_type = 'field_service'
       ORDER BY sort_order`,
      [profile.id]
    );
    let fieldServicesCreated = 0;
    for (const s of fieldSvcs) {
      const orgPlanId = s.setup_plan_id ? planMap[s.setup_plan_id] ?? null : null;
      await client.query(
        `INSERT INTO services
           (org_id, name, service_type, short_description, base_price,
            deposit_percent, status, is_bookable, template_id, created_by)
         VALUES ($1,$2,'field_service',$3,$4,$5,'active',false,$6,$7)`,
        [orgId, s.name, s.description, s.base_price, s.deposit_percent, orgPlanId, userId]
      );
      fieldServicesCreated++;
    }

    // ── 8. تنسيقات/باقات ──────────────────────────────────────
    const { rows: masterArrs } = await client.query(
      `SELECT * FROM master_arrangements WHERE profile_id = $1 ORDER BY sort_order`,
      [profile.id]
    );
    let arrangementsCreated = 0;
    for (const arr of masterArrs) {
      const slug = arr.name
        .replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]/g, "").toLowerCase()
        + "-" + Date.now().toString(36).slice(-4)
        + "-" + Math.floor(Math.random() * 1000);
      await client.query(
        `INSERT INTO flower_packages
           (org_id, name, slug, description, category_tag, base_price, components, linked_to_inventory)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,false)`,
        [orgId, arr.name, slug, arr.description, arr.category_tag,
         arr.base_price, JSON.stringify(arr.components)]
      );
      arrangementsCreated++;
    }

    // ── 9. موردون ─────────────────────────────────────────────
    const { rows: masterSups } = await client.query(
      `SELECT ms.*,
        COALESCE(
          json_agg(mc.name) FILTER (WHERE mc.name IS NOT NULL),
          '[]'
        )::jsonb AS category_names
       FROM master_suppliers ms
       LEFT JOIN master_supplier_categories msc ON msc.supplier_id = ms.id
       LEFT JOIN master_categories mc ON mc.id = msc.category_id
       WHERE ms.profile_id = $1
       GROUP BY ms.id ORDER BY ms.sort_order`,
      [profile.id]
    );
    let suppliersCreated = 0;
    for (const sup of masterSups) {
      await client.query(
        `INSERT INTO suppliers
           (org_id, name, name_en, code, phone, categories, notes, status, is_active)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,'active',true)
         ON CONFLICT (org_id, code) DO NOTHING`,
        [orgId, sup.name, sup.name_en, sup.code, sup.phone,
         JSON.stringify(sup.category_names), sup.notes]
      );
      suppliersCreated++;
    }

    // ── 10. تحديث المنشأة ─────────────────────────────────────
    await client.query(
      `UPDATE organizations SET
         has_demo_data        = true,
         bootstrap_profile_id = $2,
         bootstrap_version    = $3
       WHERE id = $1`,
      [orgId, profile.id, profile.version]
    );

    await client.query("COMMIT");

    const total = productsCreated + regularServicesCreated + fieldServicesCreated;
    return c.json({
      data: {
        profile: profile.name,
        created: {
          categories:      categoriesCreated,
          addons:          addonsCreated,
          jobTitles:       jobTitlesCreated,
          products:        productsCreated,
          regularServices: regularServicesCreated,
          setupPlans:      templatesCreated,
          fieldServices:   fieldServicesCreated,
          arrangements:    arrangementsCreated,
          suppliers:       suppliersCreated,
        },
        message: `تم إعداد متجرك بنجاح — ${total} خدمة ومنتج، ${arrangementsCreated} تنسيق، ${templatesCreated} خطة تجهيز، ${suppliersCreated} مورد`,
      },
    }, 201);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[onboarding] flower-full-setup error:", err);
    return c.json({ error: "حدث خطأ أثناء الإعداد، يرجى المحاولة مرة أخرى" }, 500);
  } finally {
    client.release();
  }
});
