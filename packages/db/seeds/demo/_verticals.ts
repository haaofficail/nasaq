/**
 * Special Verticals — بيانات عميقة للأنواع التي لها جداول متخصصة
 * تستخدم الجداول الفعلية الموجودة في قاعدة البيانات فقط.
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
// Tables: flower_orders, flower_batches, flower_variants

export async function seedFlowerVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  // 1. Flower batches (وردود واردة)
  const flowers = [
    { name: "ورد روز أحمر هولندي",  origin: "هولندا", costPerUnit: 8,  qty: 200 },
    { name: "ورد أبيض كلاسيكي",     origin: "كينيا",  costPerUnit: 6,  qty: 150 },
    { name: "ليلى بيضاء",            origin: "هولندا", costPerUnit: 12, qty: 80  },
    { name: "زنبق أصفر",             origin: "إيران",  costPerUnit: 5,  qty: 120 },
    { name: "أوركيد بنفسجي",         origin: "تايلاند",costPerUnit: 35, qty: 40  },
  ];

  for (const f of flowers) {
    await client.query(
      `INSERT INTO flower_batches
         (org_id, batch_number, origin_country, quantity_received, quantity_remaining,
          cost_per_unit, total_cost, received_at, expiry_date, status)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,'active')
       ON CONFLICT DO NOTHING`,
      [
        orgId,
        `BATCH-${rand(1000,9999)}`,
        f.origin, f.qty,
        fmt(f.costPerUnit), fmt(f.qty * f.costPerUnit),
        iso(randomDate(14)),
        iso(new Date(Date.now() + rand(3,14) * 86400000)),
      ]
    );
  }

  // 2. Flower orders
  const statuses = ["new","confirmed","in_preparation","ready","delivered","delivered","cancelled"];
  const payStatuses = ["paid","paid","paid","partially_paid","pending"];

  for (let i = 0; i < 20; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const status = pick(statuses);
    const payStatus = pick(payStatuses);
    const orderDate = randomDate(60);
    const subtotal = Number(svc.base_price) * rand(1,2);
    const vatAmount = subtotal * 0.15;
    const total = subtotal + vatAmount;
    const paidAmount = payStatus === "paid" ? total : payStatus === "partially_paid" ? total * 0.5 : 0;

    await client.query(
      `INSERT INTO flower_orders
         (org_id, customer_id, order_number, status, payment_status,
          delivery_date, subtotal, vat_amount, total_amount, paid_amount,
          delivery_type, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pickup','dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id,
        `FO-2026-${rand(1000,9999)}`,
        status, payStatus,
        iso(new Date(orderDate.getTime() + rand(1,5) * 86400000)),
        fmt(subtotal), fmt(vatAmount), fmt(total), fmt(paidAmount),
      ]
    );
  }

  // 3. Flower variants (تنويعات الأسعار)
  for (const svc of services.slice(0, 3)) {
    for (const size of ["small","medium","large"]) {
      await client.query(
        `INSERT INTO flower_variants
           (org_id, service_id, size, price, min_price, is_active)
         VALUES ($1,$2,$3,$4,$5,true)
         ON CONFLICT DO NOTHING`,
        [
          orgId, svc.id, size,
          fmt(Number(svc.base_price) * (size === "small" ? 0.7 : size === "large" ? 1.4 : 1)),
          fmt(Number(svc.base_price) * 0.6),
        ]
      );
    }
  }
}

// ─── HOTEL ───────────────────────────────────────────────────────────────────
// Tables: hotel_reservations, room_units, room_types

export async function seedHotelVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. Room types
  const roomTypeData = [
    { name: "غرفة قياسية",  nameEn: "Standard Room", basePrice: 450, capacity: 2 },
    { name: "غرفة ديلوكس",  nameEn: "Deluxe Room",   basePrice: 650, capacity: 2 },
    { name: "جناح تنفيذي",  nameEn: "Executive Suite", basePrice: 1200, capacity: 3 },
    { name: "جناح ملكي",    nameEn: "Royal Suite",    basePrice: 2500, capacity: 4 },
  ];

  const roomTypeIds: string[] = [];
  for (const rt of roomTypeData) {
    const r = await client.query(
      `INSERT INTO room_types
         (org_id, name, name_en, base_price, capacity, is_active)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, rt.name, rt.nameEn, fmt(rt.basePrice), rt.capacity]
    );
    if (r.rows[0]) roomTypeIds.push(r.rows[0].id);
  }

  // 2. Room units
  let roomNum = 101;
  for (const [idx, rt] of roomTypeData.entries()) {
    const count = [8, 6, 3, 2][idx] || 4;
    const typeId = roomTypeIds[idx];
    if (!typeId) continue;
    for (let i = 0; i < count; i++) {
      await client.query(
        `INSERT INTO room_units
           (org_id, room_type_id, room_number, floor, status, is_active)
         VALUES ($1,$2,$3,$4,'available',true)
         ON CONFLICT DO NOTHING`,
        [orgId, typeId, String(roomNum++), Math.ceil((roomNum - 100) / 10)]
      );
    }
  }

  // 3. Hotel reservations
  const statuses = ["confirmed","checked_in","checked_out","checked_out","cancelled"];

  for (let i = 0; i < 25; i++) {
    const cust = pick(customers);
    const checkIn = randomDate(60);
    const nights = rand(1, 5);
    const checkOut = new Date(checkIn.getTime() + nights * 86400000);
    const status = pick(statuses);
    const rtData = pick(roomTypeData);
    const subtotal = rtData.basePrice * nights;
    const vatAmount = subtotal * 0.15;
    const total = subtotal + vatAmount;
    const paidAmount = ["checked_out","confirmed"].includes(status) ? total :
                        status === "checked_in" ? total * 0.5 : 0;

    await client.query(
      `INSERT INTO hotel_reservations
         (org_id, customer_id, reservation_number, status, payment_status,
          check_in_date, check_out_date, nights,
          subtotal, vat_amount, total_amount, paid_amount,
          adults, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id,
        nextBookingNumber("HTL"),
        status,
        paidAmount >= total ? "paid" : paidAmount > 0 ? "partially_paid" : "pending",
        iso(checkIn), iso(checkOut), nights,
        fmt(subtotal), fmt(vatAmount), fmt(total), fmt(paidAmount),
        rand(1, rtData.capacity),
      ]
    );
  }
}

// ─── CAR RENTAL ──────────────────────────────────────────────────────────────
// Tables: car_rental_reservations, assets, vehicle_units

export async function seedCarRentalVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. Vehicles as assets
  const vehicles = [
    { name: "تويوتا كامري 2024",   code: "CAM-001", dailyRate: 220, plate: "أ ب ج 1234" },
    { name: "تويوتا هايلاندر 2023", code: "HLX-001", dailyRate: 380, plate: "د ه و 2345" },
    { name: "هوندا سيفيك 2024",    code: "CIV-001", dailyRate: 180, plate: "ز ح ط 3456" },
    { name: "فورد إكسبلورر 2023",  code: "EXP-001", dailyRate: 420, plate: "ي ك ل 4567" },
    { name: "لكزس ES350 2024",     code: "LXS-001", dailyRate: 750, plate: "م ن س 5678" },
    { name: "تويوتا يارس 2024",    code: "YRS-001", dailyRate: 120, plate: "ع غ ف 6789" },
  ];

  for (const v of vehicles) {
    await client.query(
      `INSERT INTO assets
         (org_id, name, asset_code, category, status, daily_rate, is_active)
       VALUES ($1,$2,$3,'vehicle','available',$4,true)
       ON CONFLICT DO NOTHING`,
      [orgId, v.name, v.code, fmt(v.dailyRate)]
    );
  }

  // 2. Car rental reservations
  const statuses = ["confirmed","active","completed","completed","completed","cancelled"];

  for (let i = 0; i < 20; i++) {
    const cust = pick(customers);
    const startDate = randomDate(60);
    const days = rand(1, 7);
    const endDate = new Date(startDate.getTime() + days * 86400000);
    const status = pick(statuses);
    const vehicle = pick(vehicles);
    const subtotal = vehicle.dailyRate * days;
    const vatAmount = subtotal * 0.15;
    const total = subtotal + vatAmount;
    const paidAmount = ["completed","active"].includes(status) ? total :
                        status === "confirmed" ? total * 0.3 : 0;

    await client.query(
      `INSERT INTO car_rental_reservations
         (org_id, customer_id, reservation_number, status, payment_status,
          pickup_date, return_date, rental_days,
          subtotal, vat_amount, total_amount, paid_amount, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id,
        nextBookingNumber("CAR"),
        status,
        paidAmount >= total ? "paid" : paidAmount > 0 ? "partially_paid" : "pending",
        iso(startDate), iso(endDate), days,
        fmt(subtotal), fmt(vatAmount), fmt(total), fmt(paidAmount),
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

  // 1. Service orders (appointments)
  const statuses = ["completed","completed","completed","scheduled","cancelled","no_show"];

  for (let i = 0; i < 35; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const scheduledAt = randomDate(60);
    const status = pick(statuses);
    const subtotal = Number(svc.base_price);
    const vatAmount = subtotal * 0.15;
    const total = subtotal + vatAmount;
    const paidAmount = status === "completed" ? total : status === "scheduled" ? total * 0.3 : 0;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, order_number, status, payment_status,
          scheduled_at, subtotal, vat_amount, total_amount, paid_amount, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id,
        `SAL-${rand(1000,9999)}`,
        status,
        paidAmount >= total ? "paid" : paidAmount > 0 ? "partially_paid" : "pending",
        iso(scheduledAt),
        fmt(subtotal), fmt(vatAmount), fmt(total), fmt(paidAmount),
      ]
    );
  }

  // 2. Salon supplies
  const supplies = [
    { name: "أكسجين شعر 30vol", unit: "liter",  qty: 10, cost: 25 },
    { name: "صبغة Wella N5",    unit: "tube",   qty: 50, cost: 35 },
    { name: "كيراتين برازيلي",   unit: "ml",     qty: 5000, cost: 180 },
    { name: "أسيتون إزالة",     unit: "liter",  qty: 8,  cost: 15 },
    { name: "قفازات بلاستيك",   unit: "box",    qty: 20, cost: 22 },
    { name: "قطن تنظيف",        unit: "pack",   qty: 30, cost: 12 },
  ];

  for (const s of supplies) {
    await client.query(
      `INSERT INTO salon_supplies
         (org_id, name, unit, quantity_in_stock, cost_per_unit, is_active)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT DO NOTHING`,
      [orgId, s.name, s.unit, s.qty, fmt(s.cost)]
    );
  }

  // 3. Client salon profiles (beauty history)
  for (const cust of customers.slice(0, 10)) {
    await client.query(
      `INSERT INTO client_salon_profile
         (org_id, customer_id, hair_type, skin_type, allergies, preferred_stylist_notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (org_id, customer_id) DO NOTHING`,
      [
        orgId, cust.id,
        pick(["طبيعي","جاف","دهني","مختلط"]),
        pick(["طبيعية","حساسة","دهنية","جافة"]),
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

  const statuses = ["completed","completed","completed","scheduled","cancelled"];

  for (let i = 0; i < 40; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const scheduledAt = randomDate(60);
    const status = pick(statuses);
    const subtotal = Number(svc.base_price);
    const vatAmount = subtotal * 0.15;
    const total = subtotal + vatAmount;
    const paidAmount = status === "completed" ? total : 0;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, order_number, status, payment_status,
          scheduled_at, subtotal, vat_amount, total_amount, paid_amount, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id,
        `BAR-${rand(1000,9999)}`,
        status,
        paidAmount > 0 ? "paid" : "pending",
        iso(scheduledAt),
        fmt(subtotal), fmt(vatAmount), fmt(total), fmt(paidAmount),
      ]
    );
  }
}

// ─── SPA ─────────────────────────────────────────────────────────────────────

export async function seedSpaVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["completed","completed","scheduled","cancelled"];

  for (let i = 0; i < 30; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const scheduledAt = randomDate(60);
    const status = pick(statuses);
    const subtotal = Number(svc.base_price);
    const vatAmount = subtotal * 0.15;
    const total = subtotal + vatAmount;
    const paidAmount = status === "completed" ? total : status === "scheduled" ? total * 0.5 : 0;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, order_number, status, payment_status,
          scheduled_at, subtotal, vat_amount, total_amount, paid_amount, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id,
        `SPA-${rand(1000,9999)}`,
        status,
        paidAmount >= total ? "paid" : paidAmount > 0 ? "partially_paid" : "pending",
        iso(scheduledAt),
        fmt(subtotal), fmt(vatAmount), fmt(total), fmt(paidAmount),
      ]
    );
  }
}

// ─── MAINTENANCE / WORKSHOP ───────────────────────────────────────────────────
// Tables: service_orders, work_orders

export async function seedMaintenanceVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["completed","completed","in_progress","scheduled","cancelled"];
  const kinds = ["maintenance","repair","inspection","installation"];

  for (let i = 0; i < 25; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const scheduledAt = randomDate(60);
    const status = pick(statuses);
    const subtotal = Number(svc.base_price);
    const vatAmount = subtotal * 0.15;
    const total = subtotal + vatAmount;
    const paidAmount = status === "completed" ? total : 0;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, order_number, status, kind, payment_status,
          scheduled_at, subtotal, vat_amount, total_amount, paid_amount, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id,
        `SO-${rand(1000,9999)}`,
        status, pick(kinds),
        paidAmount > 0 ? "paid" : "pending",
        iso(scheduledAt),
        fmt(subtotal), fmt(vatAmount), fmt(total), fmt(paidAmount),
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

  const statuses = ["approved","approved","sent","draft","rejected"];
  const eventTypes = ["زفاف","خطوبة","مؤتمر","يوم ميلاد","حفل تخرج","فعالية شركاتية"];

  for (let i = 0; i < 20; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const status = pick(statuses);
    const eventDate = randomDate(90);
    const subtotal = Number(svc.base_price);
    const vatAmount = subtotal * 0.15;
    const total = subtotal + vatAmount;

    const r = await client.query(
      `INSERT INTO event_quotations
         (org_id, customer_id, quotation_number, status, event_type, event_date,
          subtotal, vat_amount, total_amount, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'dashboard')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId, cust.id,
        `EQ-2026-${rand(1000,9999)}`,
        status, pick(eventTypes),
        iso(eventDate),
        fmt(subtotal), fmt(vatAmount), fmt(total),
      ]
    );
    if (!r.rows[0]) continue;

    // Quotation items
    await client.query(
      `INSERT INTO event_quotation_items
         (quotation_id, org_id, name, quantity, unit_price, total_price)
       VALUES ($1,$2,$3,1,$4,$4)
       ON CONFLICT DO NOTHING`,
      [r.rows[0].id, orgId, svc.name, fmt(subtotal)]
    );
  }
}

// ─── SCHOOL ──────────────────────────────────────────────────────────────────
// Tables: students, subjects, student_attendance, school_settings

export async function seedSchoolVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. Students (linked to customers)
  const grades = ["الأول الابتدائي","الثاني الابتدائي","الثالث الابتدائي",
                  "الرابع الابتدائي","الخامس الابتدائي","السادس الابتدائي"];

  for (const cust of customers.slice(0, 20)) {
    const r = await client.query(
      `INSERT INTO students
         (org_id, customer_id, name, grade_level, status)
       VALUES ($1,$2,$3,$4,'active')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, cust.id, cust.name, pick(grades)]
    );

    if (!r.rows[0]) continue;
    const studentId = r.rows[0].id;

    // 2. Attendance records per student
    for (let d = 0; d < rand(10, 20); d++) {
      const attendDate = randomDate(60);
      await client.query(
        `INSERT INTO student_attendance
           (org_id, student_id, attendance_date, status)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [
          orgId, studentId,
          iso(attendDate).slice(0, 10),
          pick(["present","present","present","absent","late"]),
        ]
      );
    }
  }

  // 3. Subjects
  const subjectList = [
    { name: "الرياضيات", nameEn: "Mathematics" },
    { name: "اللغة العربية", nameEn: "Arabic Language" },
    { name: "اللغة الإنجليزية", nameEn: "English Language" },
    { name: "العلوم", nameEn: "Science" },
    { name: "الدراسات الاجتماعية", nameEn: "Social Studies" },
    { name: "التربية الإسلامية", nameEn: "Islamic Studies" },
  ];

  for (const subj of subjectList) {
    await client.query(
      `INSERT INTO subjects (org_id, name, name_en, is_active)
       VALUES ($1,$2,$3,true)
       ON CONFLICT DO NOTHING`,
      [orgId, subj.name, subj.nameEn]
    );
  }

  // 4. School settings
  await client.query(
    `INSERT INTO school_settings
       (org_id, academic_year, grading_system, passing_grade)
     VALUES ($1,'2025-2026','percentage',60)
     ON CONFLICT (org_id) DO NOTHING`,
    [orgId]
  );
}

// ─── MEDICAL ─────────────────────────────────────────────────────────────────
// Tables: service_orders (appointments)

export async function seedMedicalVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["completed","completed","scheduled","cancelled"];

  for (let i = 0; i < 30; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const scheduledAt = randomDate(60);
    const status = pick(statuses);
    const subtotal = Number(svc.base_price);
    const vatAmount = subtotal * 0.15;
    const total = subtotal + vatAmount;
    const paidAmount = status === "completed" ? total : 0;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, order_number, status, payment_status,
          scheduled_at, subtotal, vat_amount, total_amount, paid_amount, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id,
        `MED-${rand(1000,9999)}`,
        status,
        paidAmount > 0 ? "paid" : "pending",
        iso(scheduledAt),
        fmt(subtotal), fmt(vatAmount), fmt(total), fmt(paidAmount),
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
