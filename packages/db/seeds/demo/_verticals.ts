/**
 * Special Verticals — بيانات عميقة للأنواع التي لها جداول متخصصة
 * يستخدم الأعمدة الفعلية الموجودة في قاعدة البيانات.
 */

import { pick, rand, fmt, iso, randomDate, nextBookingNumber } from "./_shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrgCustomers(client: any, orgId: string) {
  const r = await client.query(
    `SELECT id, name, phone FROM customers WHERE org_id = $1 LIMIT 30`,
    [orgId]
  );
  return r.rows as Array<{ id: string; name: string; phone: string }>;
}

async function getOrgServices(client: any, orgId: string) {
  const r = await client.query(
    `SELECT id, name, base_price, duration_minutes FROM services WHERE org_id = $1`,
    [orgId]
  );
  return r.rows as Array<{ id: string; name: string; base_price: string; duration_minutes: number }>;
}

// ─── FLOWER SHOP ─────────────────────────────────────────────────────────────
// Tables: flower_orders, flower_batches, flower_variants (global master)

export async function seedFlowerVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. Flower variants (global master table — no org_id, no service_id)
  const flowerVariants = [
    { type: "rose",      color: "red",    origin: "dutch",    grade: "A", size: "medium", nameAr: "ورد روز أحمر", nameEn: "Red Rose",      price: 8  },
    { type: "rose",      color: "white",  origin: "kenyan",   grade: "A", size: "medium", nameAr: "ورد أبيض",     nameEn: "White Rose",    price: 6  },
    { type: "lily",      color: "white",  origin: "dutch",    grade: "A", size: "large",  nameAr: "ليلى بيضاء",   nameEn: "White Lily",    price: 12 },
    { type: "sunflower", color: "yellow", origin: "other",    grade: "B", size: "large",  nameAr: "زنبق أصفر",    nameEn: "Sunflower",     price: 5  },
    { type: "orchid",    color: "purple", origin: "thailand", grade: "A", size: "small",  nameAr: "أوركيد بنفسجي",nameEn: "Purple Orchid", price: 35 },
  ];

  const variantIds: string[] = [];
  for (const v of flowerVariants) {
    const r = await client.query(
      `INSERT INTO flower_variants
         (flower_type, color, origin, grade, size, display_name_ar, display_name_en, base_price_per_stem, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [v.type, v.color, v.origin, v.grade, v.size, v.nameAr, v.nameEn, fmt(v.price)]
    );
    if (r.rows[0]) variantIds.push(r.rows[0].id);
    else {
      // Already exists — fetch it
      const existing = await client.query(
        `SELECT id FROM flower_variants WHERE flower_type=$1 AND color=$2 AND origin=$3 LIMIT 1`,
        [v.type, v.color, v.origin]
      );
      if (existing.rows[0]) variantIds.push(existing.rows[0].id);
    }
  }

  // 2. Flower batches (using variant_id)
  for (let i = 0; i < variantIds.length; i++) {
    const vid = variantIds[i];
    const qty = rand(50, 200);
    await client.query(
      `INSERT INTO flower_batches
         (org_id, variant_id, batch_number, quantity_received, quantity_remaining,
          unit_cost, received_at, expiry_estimated, quality_status, is_active)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7,'good',true)
       ON CONFLICT DO NOTHING`,
      [
        orgId, vid,
        `BATCH-${rand(1000, 9999)}`,
        qty,
        fmt(flowerVariants[i]?.price || 10),
        iso(randomDate(14)),
        iso(new Date(Date.now() + rand(3, 14) * 86400000)),
      ]
    );
  }

  // 3. Flower orders
  const statuses = ["new", "confirmed", "in_preparation", "ready", "delivered", "delivered", "cancelled"];
  // Valid values per chk_flower_orders_payment_status: unpaid|paid|partially_paid|refunded
  const payStatuses = ["paid", "paid", "paid", "unpaid", "unpaid"];

  for (let i = 0; i < 20; i++) {
    const cust = pick(customers);
    const orderDate = randomDate(60);
    const subtotal = rand(150, 800);
    const vatAmount = subtotal * 0.15;
    const total = subtotal + vatAmount;
    const payStatus = pick(payStatuses);
    const paidAmount = payStatus === "paid" ? total : 0;

    await client.query(
      `INSERT INTO flower_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, status, payment_status, paid_amount,
          delivery_date, subtotal, vat_amount, total,
          delivery_type, items)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pickup',$13)
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `FO-2026-${rand(1000, 9999)}`,
        pick(statuses), payStatus, fmt(paidAmount),
        iso(new Date(orderDate.getTime() + rand(1, 5) * 86400000)),
        fmt(subtotal), fmt(vatAmount), fmt(total),
        JSON.stringify([{ name: "باقة زهور", qty: 1, price: subtotal }]),
      ]
    );
  }
}

// ─── HOTEL ───────────────────────────────────────────────────────────────────
// Tables: hotel_reservations, room_units, room_types

export async function seedHotelVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. Room types (columns: org_id, name, name_en, max_occupancy, price_per_night, is_active)
  const roomTypeData = [
    { name: "غرفة قياسية",  nameEn: "Standard Room",   pricePerNight: 450, maxOccupancy: 2 },
    { name: "غرفة ديلوكس",  nameEn: "Deluxe Room",     pricePerNight: 650, maxOccupancy: 2 },
    { name: "جناح تنفيذي",  nameEn: "Executive Suite", pricePerNight: 1200, maxOccupancy: 3 },
    { name: "جناح ملكي",    nameEn: "Royal Suite",     pricePerNight: 2500, maxOccupancy: 4 },
  ];

  const roomTypeIds: string[] = [];
  for (const rt of roomTypeData) {
    const r = await client.query(
      `INSERT INTO room_types
         (org_id, name, name_en, price_per_night, max_occupancy, is_active)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, rt.name, rt.nameEn, fmt(rt.pricePerNight), rt.maxOccupancy]
    );
    if (r.rows[0]) roomTypeIds.push(r.rows[0].id);
  }

  // 2. Room units (columns: org_id, room_type_id, room_number, floor, status, is_active)
  let roomNum = 101;
  for (const [idx] of roomTypeData.entries()) {
    const count = [8, 6, 3, 2][idx] || 4;
    const typeId = roomTypeIds[idx];
    if (!typeId) continue;
    for (let i = 0; i < count; i++) {
      await client.query(
        `INSERT INTO room_units
           (org_id, room_type_id, room_number, floor, status, is_active)
         VALUES ($1,$2,$3,$4,'available',true)
         ON CONFLICT DO NOTHING`,
        [orgId, typeId, String(roomNum), Math.ceil(roomNum / 10) - 9]
      );
      roomNum++;
    }
  }

  // 3. Hotel reservations
  const statuses = ["confirmed", "checked_in", "checked_out", "checked_out", "cancelled"];

  for (let i = 0; i < 25; i++) {
    const cust = pick(customers);
    const checkIn = randomDate(60);
    const nights = rand(1, 5);
    const checkOut = new Date(checkIn.getTime() + nights * 86400000);
    const status = pick(statuses);
    const rtData = pick(roomTypeData);
    const pricePerNight = rtData.pricePerNight;
    const totalRoomCost = pricePerNight * nights;
    const taxAmount = totalRoomCost * 0.15;
    const totalAmount = totalRoomCost + taxAmount;
    const payStatus = ["checked_out", "confirmed"].includes(status) ? "paid" :
                       status === "checked_in" ? "partially_paid" : "pending";

    await client.query(
      `INSERT INTO hotel_reservations
         (org_id, customer_id, guest_name, guest_phone, status, payment_status,
          check_in_date, check_out_date, nights,
          price_per_night, total_room_cost, tax_amount, total_amount,
          adults, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        status, payStatus,
        iso(checkIn), iso(checkOut), nights,
        fmt(pricePerNight), fmt(totalRoomCost), fmt(taxAmount), fmt(totalAmount),
        rand(1, rtData.maxOccupancy),
      ]
    );
  }
}

// ─── CAR RENTAL ──────────────────────────────────────────────────────────────
// Tables: car_rental_reservations, assets

export async function seedCarRentalVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. Vehicles as assets (columns: org_id, name, status, is_active, serial_number, notes)
  const vehicles = [
    { name: "تويوتا كامري 2024",    serial: "CAM-001", dailyRate: 220 },
    { name: "تويوتا هايلاندر 2023", serial: "HLX-001", dailyRate: 380 },
    { name: "هوندا سيفيك 2024",     serial: "CIV-001", dailyRate: 180 },
    { name: "فورد إكسبلورر 2023",   serial: "EXP-001", dailyRate: 420 },
    { name: "لكزس ES350 2024",      serial: "LXS-001", dailyRate: 750 },
    { name: "تويوتا يارس 2024",     serial: "YRS-001", dailyRate: 120 },
  ];

  for (const v of vehicles) {
    await client.query(
      `INSERT INTO assets (org_id, name, serial_number, status, is_active, notes)
       VALUES ($1,$2,$3,'available',true,$4)
       ON CONFLICT DO NOTHING`,
      [orgId, v.name, v.serial, `معدل الإيجار اليومي: ${v.dailyRate} ريال`]
    );
  }

  // 2. Car rental reservations
  const statuses = ["confirmed", "picked_up", "completed", "completed", "completed", "cancelled"];

  for (let i = 0; i < 20; i++) {
    const cust = pick(customers);
    const startDate = randomDate(60);
    const days = rand(1, 7);
    const endDate = new Date(startDate.getTime() + days * 86400000);
    const status = pick(statuses);
    const vehicle = pick(vehicles);
    const dailyRate = vehicle.dailyRate;
    const totalRentalCost = dailyRate * days;
    const taxAmount = totalRentalCost * 0.15;
    const totalAmount = totalRentalCost + taxAmount;
    const payStatus = ["completed", "active"].includes(status) ? "paid" :
                       status === "confirmed" ? "partially_paid" : "pending";

    await client.query(
      `INSERT INTO car_rental_reservations
         (org_id, customer_id, driver_name, driver_phone, status, payment_status, payment_method,
          pickup_date, return_date, rental_days,
          daily_rate, total_rental_cost, tax_amount, total_amount,
          source)
       VALUES ($1,$2,$3,$4,$5,$6,'cash',$7,$8,$9,$10,$11,$12,$13,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        status, payStatus,
        iso(startDate), iso(endDate), days,
        fmt(dailyRate), fmt(totalRentalCost), fmt(taxAmount), fmt(totalAmount),
      ]
    );
  }
}

// ─── SALON ───────────────────────────────────────────────────────────────────
// Tables: service_orders, salon_supplies, client_beauty_profiles

export async function seedSalonVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  // 1. Service orders (type must be: kiosk|newborn_reception|custom_arrangement|field_execution|custom_decor)
  // (order_kind must be: sale|booking|project)
  // (status must be: draft|confirmed|deposit_pending|scheduled|preparing|ready|dispatched|in_setup|completed_on_site|returned|inspected|closed|cancelled)
  const statuses = ["closed", "closed", "closed", "scheduled", "cancelled"];

  for (let i = 0; i < 35; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const eventDate = randomDate(60);
    const status = pick(statuses);
    const total = Number(svc.base_price) * 1.15;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, service_id,
          event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,'custom_arrangement','booking',$6,$7,$8,$9)`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `SAL-${rand(1000, 9999)}`,
        status, svc.id,
        iso(eventDate), fmt(total),
      ]
    );
  }

  // 2. Salon supplies (columns: org_id, name, category, unit, quantity, cost_per_unit, is_active)
  const supplies = [
    { name: "أكسجين شعر 30vol", category: "chemicals", unit: "liter",  qty: 10, cost: 25 },
    { name: "صبغة Wella N5",    category: "chemicals", unit: "tube",   qty: 50, cost: 35 },
    { name: "كيراتين برازيلي",   category: "chemicals", unit: "ml",     qty: 5000, cost: 180 },
    { name: "أسيتون إزالة",     category: "chemicals", unit: "liter",  qty: 8,  cost: 15 },
    { name: "قفازات بلاستيك",   category: "tools",     unit: "box",    qty: 20, cost: 22 },
    { name: "قطن تنظيف",        category: "tools",     unit: "pack",   qty: 30, cost: 12 },
  ];

  for (const s of supplies) {
    await client.query(
      `INSERT INTO salon_supplies (org_id, name, category, unit, quantity, cost_per_unit, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT DO NOTHING`,
      [orgId, s.name, s.category, s.unit, s.qty, fmt(s.cost)]
    );
  }

  // 3. Client beauty profiles (table: client_beauty_profiles, PK unique on org_id + customer_id)
  for (const cust of customers.slice(0, 10)) {
    await client.query(
      `INSERT INTO client_beauty_profiles
         (org_id, customer_id, hair_type, skin_type, allergies, preferences)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (org_id, customer_id) DO NOTHING`,
      [
        orgId, cust.id,
        pick(["طبيعي", "جاف", "دهني", "مختلط"]),
        pick(["طبيعية", "حساسة", "دهنية", "جافة"]),
        pick([null, "حساسية للأمونيا", "حساسية للعطور", null]),
        pick([null, "تفضل الأسلوب الكلاسيكي", "تفضل الألوان الداكنة", null]),
      ]
    );
  }
}

// ─── BARBER ──────────────────────────────────────────────────────────────────

export async function seedBarberVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["closed", "closed", "closed", "scheduled", "cancelled"];

  for (let i = 0; i < 40; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const total = Number(svc.base_price) * 1.15;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, service_id, event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,'custom_arrangement','booking',$6,$7,$8,$9)`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `BAR-${rand(1000, 9999)}`,
        pick(statuses), svc.id,
        iso(randomDate(60)), fmt(total),
      ]
    );
  }
}

// ─── SPA ─────────────────────────────────────────────────────────────────────

export async function seedSpaVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["closed", "closed", "scheduled", "cancelled"];

  for (let i = 0; i < 30; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const total = Number(svc.base_price) * 1.15;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, service_id, event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,'custom_arrangement','booking',$6,$7,$8,$9)`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `SPA-${rand(1000, 9999)}`,
        pick(statuses), svc.id,
        iso(randomDate(60)), fmt(total),
      ]
    );
  }
}

// ─── MAINTENANCE / WORKSHOP ───────────────────────────────────────────────────

export async function seedMaintenanceVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["closed", "closed", "preparing", "scheduled", "cancelled"];

  for (let i = 0; i < 25; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const total = Number(svc.base_price) * 1.15;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, service_id, event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,'field_execution','project',$6,$7,$8,$9)`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `SO-${rand(1000, 9999)}`,
        pick(statuses), svc.id,
        iso(randomDate(60)), fmt(total),
      ]
    );
  }
}

// ─── EVENTS / PHOTOGRAPHY ────────────────────────────────────────────────────
// Tables: event_quotations, event_quotation_items

export async function seedEventsVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["accepted", "accepted", "sent", "draft", "rejected"];
  const eventTypes = ["زفاف", "خطوبة", "مؤتمر", "يوم ميلاد", "حفل تخرج", "فعالية شركاتية"];

  for (let i = 0; i < 20; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const status = pick(statuses);
    const eventDate = randomDate(90);
    const subtotal = Number(svc.base_price);
    const vatRate = 15;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    const r = await client.query(
      `INSERT INTO event_quotations
         (org_id, quotation_number, client_name, client_phone, status,
          title, event_date, subtotal, vat_rate, vat_amount, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId,
        `EQ-2026-${rand(1000, 9999)}`,
        cust.name, cust.phone,
        status,
        `عرض سعر — ${pick(eventTypes)}`,
        iso(eventDate),
        fmt(subtotal), vatRate, fmt(vatAmount), fmt(total),
      ]
    );
    if (!r.rows[0]) continue;

    // Quotation items (columns: quotation_id, org_id, description, qty, unit_price, total_price)
    await client.query(
      `INSERT INTO event_quotation_items
         (quotation_id, org_id, description, qty, unit_price, total_price)
       VALUES ($1,$2,$3,1,$4,$4)
       ON CONFLICT DO NOTHING`,
      [r.rows[0].id, orgId, svc.name, fmt(subtotal)]
    );
  }
}

// ─── SCHOOL ──────────────────────────────────────────────────────────────────
// Tables: students, student_attendance, school_settings

export async function seedSchoolVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. School settings (columns: org_id, school_name, school_type, education_level, setup_status)
  await client.query(
    `INSERT INTO school_settings
       (org_id, school_name, school_type, education_level, setup_status)
     VALUES ($1,$2,'private','primary','complete')
     ON CONFLICT (org_id) DO NOTHING`,
    [orgId, "مدرسة ترميز النموذجية"]
  );

  // 2. Class rooms (required by student_attendance FK)
  const grades = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"];
  const classRoomIds: Record<string, string> = {};

  for (const grade of grades) {
    const r = await client.query(
      `INSERT INTO class_rooms (org_id, grade, name, capacity, is_active)
       VALUES ($1,$2,$3,30,true)
       RETURNING id`,
      [orgId, grade, `فصل ${grade}`]
    );
    classRoomIds[grade] = r.rows[0].id;
  }

  // 3. Students
  const genders = ["male", "female"];

  for (const cust of customers.slice(0, 20)) {
    const grade = pick(grades);
    const classRoomId = classRoomIds[grade];

    const r = await client.query(
      `INSERT INTO students
         (org_id, class_room_id, full_name, grade, gender, guardian_name, guardian_phone, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       RETURNING id`,
      [orgId, classRoomId, cust.name, grade, pick(genders), `ولي أمر ${cust.name}`, cust.phone]
    );

    if (!r.rows[0]) continue;
    const studentId = r.rows[0].id;

    // 4. Attendance records (class_room_id required)
    for (let d = 0; d < rand(10, 20); d++) {
      const attendDate = randomDate(60);
      await client.query(
        `INSERT INTO student_attendance
           (org_id, student_id, class_room_id, attendance_date, status)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (org_id, student_id, attendance_date) DO NOTHING`,
        [
          orgId, studentId, classRoomId,
          iso(attendDate).slice(0, 10),
          pick(["present", "present", "present", "absent", "late"]),
        ]
      );
    }
  }
}

// ─── MEDICAL ─────────────────────────────────────────────────────────────────

export async function seedMedicalVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["closed", "closed", "scheduled", "cancelled"];

  for (let i = 0; i < 30; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const total = Number(svc.base_price) * 1.15;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, service_id, event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,'custom_arrangement','booking',$6,$7,$8,$9)`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `MED-${rand(1000, 9999)}`,
        pick(statuses), svc.id,
        iso(randomDate(60)), fmt(total),
      ]
    );
  }
}

// ─── FOOD & BEVERAGE ─────────────────────────────────────────────────────────
// Tables: menu_categories, menu_items, restaurant_tables, loyalty_stamps

async function seedFoodVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);

  // Detect sub-type from org business_type
  const typeRes = await client.query(
    `SELECT business_type FROM organizations WHERE id = $1`,
    [orgId]
  );
  const businessType: string = typeRes.rows[0]?.business_type ?? "restaurant";

  // ── Menu Categories ───────────────────────────────────────────────────────
  type MenuCatDef = { name: string; name_en: string };
  const catsByType: Record<string, MenuCatDef[]> = {
    restaurant: [
      { name: "المقبلات",    name_en: "Starters" },
      { name: "الأطباق الرئيسية", name_en: "Main Dishes" },
      { name: "الشوايات",   name_en: "Grills" },
      { name: "السلطات",    name_en: "Salads" },
      { name: "الحلويات",   name_en: "Desserts" },
    ],
    cafe: [
      { name: "القهوة والمشروبات الساخنة", name_en: "Hot Drinks" },
      { name: "المشروبات الباردة",         name_en: "Cold Drinks" },
      { name: "الحلويات والكيك",           name_en: "Sweets & Cake" },
      { name: "الوجبات الخفيفة",           name_en: "Snacks" },
    ],
    bakery: [
      { name: "الخبز والمعجنات", name_en: "Bread & Pastries" },
      { name: "الكيك والتورتات", name_en: "Cakes & Tarts" },
      { name: "الحلويات الشرقية", name_en: "Oriental Sweets" },
      { name: "المشروبات",       name_en: "Drinks" },
    ],
    catering: [
      { name: "باقات الأفراح",   name_en: "Wedding Packages" },
      { name: "باقات الفعاليات", name_en: "Event Packages" },
      { name: "الوجبات الجاهزة", name_en: "Ready Meals" },
      { name: "المشروبات",       name_en: "Drinks" },
    ],
  };
  const cats = catsByType[businessType] ?? catsByType.restaurant;

  const catIds: string[] = [];
  for (let i = 0; i < cats.length; i++) {
    const r = await client.query(
      `INSERT INTO menu_categories (org_id, name, name_en, sort_order, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, cats[i].name, cats[i].name_en, i + 1]
    );
    if (r.rows[0]) catIds.push(r.rows[0].id);
  }
  if (catIds.length === 0) return;

  // ── Menu Items ────────────────────────────────────────────────────────────
  type MenuItemDef = { name: string; price: number; popular?: boolean; prep?: number };
  const itemsByType: Record<string, MenuItemDef[][]> = {
    restaurant: [
      // Starters
      [
        { name: "حراق إصبعه",       price: 18, popular: true, prep: 10 },
        { name: "سلطة فتوش",        price: 14, prep: 5 },
        { name: "حمص بالزيت",       price: 12, prep: 5 },
        { name: "متبل",             price: 12, prep: 5 },
      ],
      // Main
      [
        { name: "مندي دجاج",        price: 55, popular: true, prep: 40 },
        { name: "كبسة لحم",         price: 75, popular: true, prep: 45 },
        { name: "هريس باللحم",      price: 45, prep: 35 },
        { name: "مكلوبة",           price: 50, prep: 40 },
      ],
      // Grills
      [
        { name: "مشويات مشكلة",     price: 95, popular: true, prep: 30 },
        { name: "دجاج مشوي",        price: 60, prep: 25 },
        { name: "كباب عراقي",       price: 65, prep: 20 },
      ],
      // Salads
      [
        { name: "سلطة قيصر",        price: 22, prep: 10 },
        { name: "سلطة خضراء",       price: 18, prep: 8 },
      ],
      // Desserts
      [
        { name: "أم علي",           price: 20, popular: true, prep: 15 },
        { name: "كنافة",            price: 22, prep: 10 },
        { name: "بسبوسة",           price: 16, prep: 5 },
      ],
    ],
    cafe: [
      // Hot
      [
        { name: "قهوة عربية",       price: 12, popular: true, prep: 5 },
        { name: "كابتشينو",         price: 18, popular: true, prep: 5 },
        { name: "لاتيه",            price: 20, prep: 5 },
        { name: "موكا",             price: 22, prep: 5 },
        { name: "شاي كرك",         price: 10, prep: 5 },
      ],
      // Cold
      [
        { name: "فرابتشينو",        price: 24, popular: true, prep: 7 },
        { name: "آيس لاتيه",        price: 22, prep: 5 },
        { name: "عصير طازج",        price: 18, prep: 5 },
        { name: "سموذي فراولة",     price: 22, prep: 7 },
      ],
      // Sweets
      [
        { name: "تشيز كيك",         price: 28, popular: true, prep: 3 },
        { name: "براونيز",          price: 20, prep: 3 },
        { name: "كروف",            price: 22, prep: 3 },
      ],
      // Snacks
      [
        { name: "سندويش كلوب",      price: 30, prep: 10 },
        { name: "باستا دجاج",       price: 35, prep: 15 },
        { name: "بيتزا صغيرة",      price: 32, prep: 20 },
      ],
    ],
    bakery: [
      // Bread
      [
        { name: "خبز التميس",       price: 8,  popular: true, prep: 20 },
        { name: "كرواسون زبدة",     price: 12, prep: 15 },
        { name: "خبز الثوم",        price: 10, prep: 15 },
      ],
      // Cake
      [
        { name: "كيك الشوكولاتة",   price: 35, popular: true, prep: 3 },
        { name: "تورتة الفراولة",   price: 45, prep: 3 },
        { name: "كيك الريد فيلفت",  price: 40, prep: 3 },
        { name: "كب كيك مشكل",      price: 25, prep: 3 },
      ],
      // Oriental
      [
        { name: "بقلاوة",           price: 30, popular: true, prep: 3 },
        { name: "معمول تمر",        price: 28, prep: 3 },
        { name: "بسبوسة",           price: 22, prep: 3 },
      ],
      // Drinks
      [
        { name: "قهوة سادة",        price: 10, prep: 5 },
        { name: "شاي بالنعناع",     price: 8,  prep: 5 },
        { name: "عصير برتقال",      price: 15, prep: 5 },
      ],
    ],
    catering: [
      [
        { name: "باقة فرح اقتصادية (50 شخص)",    price: 2500, popular: true, prep: 120 },
        { name: "باقة فرح مميزة (100 شخص)",      price: 5000, prep: 120 },
      ],
      [
        { name: "باقة فعالية ذهبية (30 شخص)",    price: 1800, popular: true, prep: 90 },
        { name: "باقة فعالية فضية (50 شخص)",     price: 2800, prep: 90 },
      ],
      [
        { name: "صحن كبسة دجاج",    price: 35, prep: 40 },
        { name: "صحن مندي لحم",     price: 55, popular: true, prep: 45 },
        { name: "صحن أرز بالخضار",  price: 25, prep: 30 },
      ],
      [
        { name: "طقم مشروبات باردة", price: 80, prep: 10 },
        { name: "قهوة وتمر للحفلات", price: 120, prep: 15 },
      ],
    ],
  };
  const itemGroups = itemsByType[businessType] ?? itemsByType.restaurant;

  for (let ci = 0; ci < catIds.length && ci < itemGroups.length; ci++) {
    const group = itemGroups[ci];
    for (let si = 0; si < group.length; si++) {
      const item = group[si];
      await client.query(
        `INSERT INTO menu_items
           (org_id, category_id, name, price, is_available, is_active, is_popular, preparation_time, sort_order)
         VALUES ($1,$2,$3,$4,true,true,$5,$6,$7)
         ON CONFLICT DO NOTHING`,
        [orgId, catIds[ci], item.name, item.price, item.popular ?? false, item.prep ?? 15, si + 1]
      );
    }
  }

  // ── Restaurant Tables ─────────────────────────────────────────────────────
  if (businessType === "restaurant" || businessType === "cafe") {
    const sections = businessType === "restaurant"
      ? ["داخلي", "داخلي", "داخلي", "خارجي", "خارجي", "VIP", "VIP", "عائلي", "عائلي", "عائلي"]
      : ["قاعة رئيسية", "قاعة رئيسية", "قاعة رئيسية", "تيراس", "تيراس", "VIP", "VIP", "داخلي", "داخلي", "داخلي"];
    const caps  = [2, 4, 4, 4, 2, 6, 8, 6, 6, 4];
    for (let t = 0; t < 10; t++) {
      await client.query(
        `INSERT INTO restaurant_tables (org_id, number, section, capacity, status)
         VALUES ($1,$2,$3,$4,'available')
         ON CONFLICT (org_id, number) DO NOTHING`,
        [orgId, t + 1, sections[t], caps[t]]
      );
    }
  }

  // ── Loyalty Stamps ────────────────────────────────────────────────────────
  const stampCusts = customers.slice(0, 15);
  for (const c of stampCusts) {
    const stampsCount = rand(1, 12);
    const freeRedeemed = Math.floor(stampsCount / 10);
    await client.query(
      `INSERT INTO loyalty_stamps
         (org_id, customer_id, stamps_count, stamps_goal, free_items_redeemed, last_stamp_at)
       VALUES ($1,$2,$3,10,$4,NOW() - INTERVAL '1 day' * $5)
       ON CONFLICT (org_id, customer_id) DO NOTHING`,
      [orgId, c.id, stampsCount, freeRedeemed, rand(1, 30)]
    );
  }
}

// ─── RENTAL ───────────────────────────────────────────────────────────────────
// Tables: rental_assets

async function seedRentalVertical(client: any, orgId: string) {
  // Check table exists first
  const tblCheck = await client.query(
    `SELECT to_regclass('public.rental_assets') AS tbl`
  );
  if (!tblCheck.rows[0]?.tbl) return;

  type AssetDef = { name: string; category: string; daily_rate: number; deposit: number };
  const assets: AssetDef[] = [
    { name: "شاشة LED 55 بوصة",        category: "أجهزة عرض",    daily_rate: 350,  deposit: 2000 },
    { name: "بروجيكتور 4K",             category: "أجهزة عرض",    daily_rate: 250,  deposit: 1500 },
    { name: "كاميرا Canon EOS R5",       category: "كاميرات",       daily_rate: 450,  deposit: 5000 },
    { name: "طاولة مستديرة 10 أشخاص",   category: "أثاث",          daily_rate: 120,  deposit: 500  },
    { name: "كرسي فولاذي",              category: "أثاث",          daily_rate: 15,   deposit: 80   },
    { name: "خيمة ضيافة 10×10م",        category: "خيم وظلال",     daily_rate: 800,  deposit: 3000 },
    { name: "مولد كهربائي 10 كيلو",      category: "معدات كهربائية", daily_rate: 600,  deposit: 2500 },
    { name: "مكيف تبريد محمول",          category: "معدات كهربائية", daily_rate: 200,  deposit: 1000 },
    { name: "نظام صوت متكامل",           category: "صوتيات",        daily_rate: 500,  deposit: 3000 },
    { name: "إضاءة LED ملونة (طقم)",     category: "إضاءة",         daily_rate: 180,  deposit: 800  },
    { name: "سيارة نقل 4 طن",           category: "مركبات",        daily_rate: 900,  deposit: 5000 },
    { name: "رافعة شوكية",              category: "معدات ثقيلة",    daily_rate: 1200, deposit: 8000 },
  ];

  // Try to detect column names (some schemas use status, some condition)
  const colRes = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'rental_assets'
     ORDER BY ordinal_position`
  );
  const cols: string[] = colRes.rows.map((r: any) => r.column_name);
  const hasStatus    = cols.includes("status");
  const hasDailyRate = cols.includes("daily_rate");
  const hasDeposit   = cols.includes("deposit_amount");
  const hasCategory  = cols.includes("category");

  if (!hasDailyRate) return; // schema doesn't match, skip silently

  for (const a of assets) {
    const parts: string[] = ["org_id", "name"];
    const vals: any[]     = [orgId, a.name];
    let idx = 3;

    if (hasCategory)  { parts.push("category");         vals.push(a.category);    idx++; }
    if (hasDailyRate) { parts.push("daily_rate");        vals.push(a.daily_rate);  idx++; }
    if (hasDeposit)   { parts.push("deposit_amount");    vals.push(a.deposit);     idx++; }
    if (hasStatus)    { parts.push("status");            vals.push("available");   idx++; }

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
    await client.query(
      `INSERT INTO rental_assets (${parts.join(", ")})
       VALUES (${placeholders})
       ON CONFLICT DO NOTHING`,
      vals
    );
  }

  // ── Seed contracts linked to rental assets ──────────────────────────────────
  // Check contracts table exists
  const contractsTblCheck = await client.query(
    `SELECT to_regclass('public.contracts') AS tbl`
  );
  if (!contractsTblCheck.rows[0]?.tbl) return;

  // Fetch the assets we just inserted (to get their IDs)
  const assetRows = await client.query(
    `SELECT id, name, daily_rate FROM rental_assets WHERE org_id = $1 ORDER BY created_at LIMIT 12`,
    [orgId]
  );
  if (!assetRows.rows.length) return;

  // Reference customers for contracts
  const custRows = await client.query(
    `SELECT id, name, phone FROM customers WHERE org_id = $1 ORDER BY created_at LIMIT 8`,
    [orgId]
  );
  const customers = custRows.rows;
  if (!customers.length) return;

  // Skip if contracts already seeded
  const existingContracts = await client.query(
    `SELECT id FROM contracts WHERE org_id = $1 LIMIT 1`, [orgId]
  );
  if (existingContracts.rows.length) return;

  type ContractDef = {
    assetIdx: number; custIdx: number;
    startOffset: number; durationDays: number;
    status: string; paymentTerms: string;
  };

  const contractDefs: ContractDef[] = [
    { assetIdx: 0,  custIdx: 0, startOffset: -60,  durationDays: 90,  status: "active",      paymentTerms: "monthly"  },
    { assetIdx: 1,  custIdx: 1, startOffset: -30,  durationDays: 60,  status: "active",      paymentTerms: "monthly"  },
    { assetIdx: 2,  custIdx: 2, startOffset: -10,  durationDays: 30,  status: "active",      paymentTerms: "one_time" },
    { assetIdx: 5,  custIdx: 3, startOffset: -5,   durationDays: 14,  status: "active",      paymentTerms: "one_time" },
    { assetIdx: 6,  custIdx: 4, startOffset: -90,  durationDays: 180, status: "active",      paymentTerms: "monthly"  },
    { assetIdx: 8,  custIdx: 0, startOffset: -120, durationDays: 90,  status: "expired",     paymentTerms: "monthly"  },
    { assetIdx: 3,  custIdx: 5, startOffset: -180, durationDays: 90,  status: "expired",     paymentTerms: "monthly"  },
    { assetIdx: 9,  custIdx: 1, startOffset:  0,   durationDays: 7,   status: "draft",       paymentTerms: "one_time" },
    { assetIdx: 11, custIdx: 6, startOffset: -25,  durationDays: 365, status: "active",      paymentTerms: "quarterly"},
    { assetIdx: 7,  custIdx: 7, startOffset: -14,  durationDays: 14,  status: "active",      paymentTerms: "one_time" },
  ];

  const now = new Date();
  let contractNum = 1001;

  for (const def of contractDefs) {
    const asset = assetRows.rows[def.assetIdx % assetRows.rows.length];
    const cust  = customers[def.custIdx % customers.length];

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + def.startOffset);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + def.durationDays);

    const dailyRate  = parseFloat(asset.daily_rate) || 200;
    const totalValue = Math.round(dailyRate * def.durationDays);

    const insertedContract = await client.query(
      `INSERT INTO contracts
         (org_id, contract_number, contract_type, title,
          party_name, party_phone,
          start_date, end_date, value, payment_terms,
          status, linked_entity_type, linked_entity_id,
          notes)
       VALUES ($1,$2,'lease',$3,$4,$5,$6,$7,$8,$9,$10,'equipment',$11,$12)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId,
        `EQ-${contractNum++}`,
        `عقد تأجير ${asset.name}`,
        cust.name,
        cust.phone || null,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        totalValue,
        def.paymentTerms,
        def.status,
        asset.id,
        `عقد تأجير ${asset.name} لمدة ${def.durationDays} يوم`,
      ]
    );

    if (!insertedContract.rows.length) continue;
    const contractId = insertedContract.rows[0].id;

    // Seed contract payments based on payment terms
    if (def.paymentTerms === "one_time") {
      const paidAt = def.status === "active" || def.status === "expired"
        ? startDate.toISOString() : null;
      await client.query(
        `INSERT INTO contract_payments
           (org_id, contract_id, due_date, amount, status, paid_at, payment_method)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT DO NOTHING`,
        [
          orgId, contractId,
          startDate.toISOString().split("T")[0],
          totalValue,
          paidAt ? "paid" : "pending",
          paidAt,
          paidAt ? "bank_transfer" : null,
        ]
      );
    } else {
      // Monthly/quarterly — split into installments
      const installCount = def.paymentTerms === "monthly"
        ? Math.ceil(def.durationDays / 30)
        : Math.ceil(def.durationDays / 90);
      const installAmount = Math.round(totalValue / installCount);
      const intervalDays  = def.paymentTerms === "monthly" ? 30 : 90;

      for (let i = 0; i < installCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + i * intervalDays);
        const isPast   = dueDate < now;
        const paidAt   = isPast && def.status !== "draft" ? dueDate.toISOString() : null;

        await client.query(
          `INSERT INTO contract_payments
             (org_id, contract_id, due_date, amount, status, paid_at, payment_method)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT DO NOTHING`,
          [
            orgId, contractId,
            dueDate.toISOString().split("T")[0],
            installAmount,
            paidAt ? "paid" : (isPast ? "overdue" : "pending"),
            paidAt,
            paidAt ? "cash" : null,
          ]
        );
      }
    }
  }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

const VERTICAL_MAP: Record<string, (client: any, orgId: string) => Promise<void>> = {
  flower_shop:      seedFlowerVertical,
  hotel:            seedHotelVertical,
  car_rental:       seedCarRentalVertical,
  salon:            seedSalonVertical,
  barber:           seedBarberVertical,
  spa:              seedSpaVertical,
  fitness:          seedSalonVertical,
  school:           seedSchoolVertical,
  education:        seedSchoolVertical,
  medical:          seedMedicalVertical,
  maintenance:      seedMaintenanceVertical,
  workshop:         seedMaintenanceVertical,
  events:           seedEventsVertical,
  event_organizer:  seedEventsVertical,
  events_vendor:    seedEventsVertical,
  photography:      seedEventsVertical,
  restaurant:       seedFoodVertical,
  cafe:             seedFoodVertical,
  bakery:           seedFoodVertical,
  catering:         seedFoodVertical,
  rental:           seedRentalVertical,
};

export async function seedVertical(client: any, orgId: string, businessType: string) {
  const fn = VERTICAL_MAP[businessType];
  if (fn) {
    try {
      await fn(client, orgId);
    } catch (err: any) {
      // Don't fail the whole seed if a vertical has a schema issue
      console.warn(`    [vertical:${businessType}] warning: ${err.message}`);
    }
  }
}
