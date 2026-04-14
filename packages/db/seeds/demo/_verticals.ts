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
    { type: "rose",      color: "red",    origin: "هولندا",  grade: "A", size: "medium", nameAr: "ورد روز أحمر", nameEn: "Red Rose", price: 8  },
    { type: "rose",      color: "white",  origin: "كينيا",   grade: "A", size: "medium", nameAr: "ورد أبيض",     nameEn: "White Rose", price: 6 },
    { type: "lily",      color: "white",  origin: "هولندا",  grade: "A", size: "large",  nameAr: "ليلى بيضاء",   nameEn: "White Lily", price: 12 },
    { type: "sunflower", color: "yellow", origin: "إيران",   grade: "B", size: "large",  nameAr: "زنبق أصفر",    nameEn: "Sunflower",  price: 5  },
    { type: "orchid",    color: "purple", origin: "تايلاند", grade: "A", size: "small",  nameAr: "أوركيد بنفسجي",nameEn: "Purple Orchid", price: 35 },
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
  const payStatuses = ["paid", "paid", "paid", "pending", "pending"];

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
         (org_id, customer_id, status, payment_status, payment_method,
          pickup_date, return_date, rental_days,
          daily_rate, total_rental_cost, tax_amount, total_amount,
          source)
       VALUES ($1,$2,$3,$4,'cash',$5,$6,$7,$8,$9,$10,$11,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id,
        status, payStatus,
        iso(startDate), iso(endDate), days,
        fmt(dailyRate), fmt(totalRentalCost), fmt(taxAmount), fmt(totalAmount),
      ]
    );
  }
}

// ─── SALON ───────────────────────────────────────────────────────────────────
// Tables: service_orders, salon_supplies, client_salon_profile

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

  // 3. Client salon profiles (columns: org_id, client_id, hair_type, skin_type, allergies, notes)
  for (const cust of customers.slice(0, 10)) {
    await client.query(
      `INSERT INTO client_salon_profile
         (org_id, client_id, hair_type, skin_type, allergies, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (org_id, client_id) DO NOTHING`,
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
         VALUES ($1,$2,$3,$4,$5)`,
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
