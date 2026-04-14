/**
 * Shared helpers and data for the comprehensive demo seed system.
 * All helpers operate on a raw pg PoolClient (raw SQL, per guardrails).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ServiceDef {
  category: string;
  name: string;
  price: number;
  minPrice?: number;
  duration: number; // minutes
}

export interface OrgConfig {
  slug: string;
  name: string;
  businessType: string;
  city: string;
  phone: string;
  email: string;
  ownerName: string;
  tagline: string;
  description: string;
  vatNumber?: string;
  crNumber?: string;
  enabledCapabilities: string[];
  categories: string[];
  services: ServiceDef[];
  hasPos: boolean;
}

// ─── Shared customer pool ───────────────────────────────────────────────────

export const CUSTOMER_POOL = [
  { name: "أحمد محمد العتيبي",      phone: "+966500011001", city: "الرياض" },
  { name: "سعود خالد المطيري",      phone: "+966500011002", city: "جدة" },
  { name: "نورة سعد الشمري",        phone: "+966500011003", city: "الرياض" },
  { name: "خديجة عبدالله الزهراني", phone: "+966500011004", city: "الدمام" },
  { name: "عبدالرحمن فيصل الدوسري", phone: "+966500011005", city: "مكة" },
  { name: "فاطمة حمد الغامدي",      phone: "+966500011006", city: "الرياض" },
  { name: "محمد عبدالعزيز القحطاني",phone: "+966500011007", city: "الطائف" },
  { name: "ريم سلطان الحربي",       phone: "+966500011008", city: "جدة" },
  { name: "بدر ناصر العنزي",        phone: "+966500011009", city: "الرياض" },
  { name: "هنوف تركي القرشي",       phone: "+966500011010", city: "المدينة" },
  { name: "يوسف علي الجهني",        phone: "+966500011011", city: "الرياض" },
  { name: "لمياء سعيد البقمي",      phone: "+966500011012", city: "تبوك" },
  { name: "طلال منصور السهلي",      phone: "+966500011013", city: "جدة" },
  { name: "منال ضيف الله الرشيدي",  phone: "+966500011014", city: "الرياض" },
  { name: "سلطان جابر الوادي",      phone: "+966500011015", city: "الأحساء" },
  { name: "غادة ماجد الثبيتي",      phone: "+966500011016", city: "الرياض" },
  { name: "حمد صالح الخثلان",       phone: "+966500011017", city: "الدمام" },
  { name: "هلا راشد العمري",        phone: "+966500011018", city: "جدة" },
  { name: "وليد عمر الحازمي",       phone: "+966500011019", city: "الرياض" },
  { name: "رنا أحمد الصاعدي",       phone: "+966500011020", city: "أبها" },
  { name: "زياد خليل الشهري",       phone: "+966500011021", city: "الرياض" },
  { name: "دلال حسن المالكي",       phone: "+966500011022", city: "جدة" },
  { name: "عمر عبدالكريم الدخيل",   phone: "+966500011023", city: "الرياض" },
  { name: "ميساء سامي الزيد",       phone: "+966500011024", city: "الدمام" },
  { name: "حسين محمد الحمدان",      phone: "+966500011025", city: "الجبيل" },
  { name: "أميرة ناصر النجدي",      phone: "+966500011026", city: "الرياض" },
  { name: "فهد عبدالله المحيسن",    phone: "+966500011027", city: "بريدة" },
  { name: "رهف عطا الله العمري",    phone: "+966500011028", city: "جدة" },
  { name: "تركي إبراهيم المنيع",    phone: "+966500011029", city: "الرياض" },
  { name: "شهد محمد الشهراني",      phone: "+966500011030", city: "الطائف" },
];

// ─── Internal notes pool ─────────────────────────────────────────────────────

export const INTERNAL_NOTES = [
  "عميل متميز — الأولوية الأولى",
  "تأكيد تلقائي من الموقع",
  "يفضل التواصل واتساب",
  "حجز مكرر — عميل منتظم",
  "ملاحظة: تسليم مبكر مطلوب",
  "مراجعة تفاصيل الخدمة قبل الموعد",
  "دفعة أولى مستلمة نقداً",
  null, null, null, // variety
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/** Random date within the last `daysBack` days, optional min offset */
export function randomDate(daysBack = 90, daysAhead = 0): Date {
  const now = Date.now();
  const range = (daysBack + daysAhead) * 24 * 60 * 60 * 1000;
  const offset = daysAhead * 24 * 60 * 60 * 1000;
  return new Date(now - offset - Math.random() * range);
}

/** Format date as ISO string */
export function iso(d: Date): string {
  return d.toISOString();
}

/** Random integer between min and max (inclusive) */
export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Format number to 2dp string */
export function fmt(n: number): string {
  return n.toFixed(2);
}

/** Calculate VAT (15%) */
export function calcVat(subtotal: number, vatRate = 15): { vatAmount: number; total: number } {
  const vatAmount = subtotal * (vatRate / 100);
  return { vatAmount, total: subtotal + vatAmount };
}

/** Generate booking number */
let bookingSeq = 1000;
export function nextBookingNumber(prefix = "NSQ"): string {
  return `${prefix}-2026-${String(bookingSeq++).padStart(4, "0")}`;
}

/** Generate invoice number */
let invoiceSeq = 1000;
export function nextInvoiceNumber(): string {
  return `INV-2026-${String(invoiceSeq++).padStart(4, "0")}`;
}

/** Generate journal entry number */
let jeSeq = 1000;
export function nextJeNumber(): string {
  return `JE-2026-${String(jeSeq++).padStart(5, "0")}`;
}

/** Generate POS transaction number */
let posSeq = 1000;
export function nextPosNumber(): string {
  return `POS-2026-${String(posSeq++).padStart(5, "0")}`;
}

/**
 * Generate a ZATCA-compliant Base64 TLV QR code string.
 * TLV fields: tag(1)=sellerName, tag(2)=vatNumber, tag(3)=date, tag(4)=total, tag(5)=vat
 */
export function generateZatcaQr(
  sellerName: string,
  vatNumber: string,
  invoiceDate: string,
  totalAmount: number,
  vatAmount: number
): string {
  function tlv(tag: number, value: string): Buffer {
    const valueBytes = Buffer.from(value, "utf8");
    return Buffer.concat([Buffer.from([tag]), Buffer.from([valueBytes.length]), valueBytes]);
  }
  const tlvData = Buffer.concat([
    tlv(1, sellerName),
    tlv(2, vatNumber),
    tlv(3, invoiceDate),
    tlv(4, totalAmount.toFixed(2)),
    tlv(5, vatAmount.toFixed(2)),
  ]);
  return tlvData.toString("base64");
}

// ─── Core seeding functions ───────────────────────────────────────────────────

/** Seed chart of accounts for an org. Returns account map: systemKey → id */
export async function seedChartOfAccounts(client: any, orgId: string): Promise<Record<string, string>> {
  const accounts = [
    { code: "1111", systemKey: "MAIN_CASH",     name: "الصندوق الرئيسي",              nameEn: "Main Cash",          type: "asset",    nb: "debit",  level: 4 },
    { code: "1112", systemKey: "MAIN_BANK",     name: "الحساب البنكي الرئيسي",        nameEn: "Main Bank Account",  type: "asset",    nb: "debit",  level: 4 },
    { code: "1120", systemKey: "AR",            name: "ذمم العملاء",                  nameEn: "Accounts Receivable",type: "asset",    nb: "debit",  level: 3 },
    { code: "2120", systemKey: "DEFERRED_REV",  name: "التزامات العربون",             nameEn: "Deferred Revenue",   type: "liability",nb: "credit", level: 3 },
    { code: "2130", systemKey: "VAT_PAYABLE",   name: "ضريبة القيمة المضافة المخرجات",nameEn: "VAT Payable",        type: "liability",nb: "credit", level: 3 },
    { code: "4100", systemKey: "SERVICE_REV",   name: "إيراد الخدمات",               nameEn: "Service Revenue",    type: "revenue",  nb: "credit", level: 2 },
    { code: "4200", systemKey: "SALES_REV",     name: "إيراد المبيعات",              nameEn: "Sales Revenue",      type: "revenue",  nb: "credit", level: 2 },
    { code: "5100", systemKey: "SALARIES_EXP",  name: "رواتب وأجور",                 nameEn: "Salaries & Wages",   type: "expense",  nb: "debit",  level: 2 },
    { code: "5200", systemKey: "RENT_EXP",      name: "إيجار",                        nameEn: "Rent Expense",       type: "expense",  nb: "debit",  level: 2 },
    { code: "5700", systemKey: "SUPPLIES_EXP",  name: "مستلزمات وإمدادات",           nameEn: "Supplies",           type: "expense",  nb: "debit",  level: 2 },
  ];

  const map: Record<string, string> = {};
  for (const a of accounts) {
    const r = await client.query(
      `INSERT INTO chart_of_accounts
         (org_id, code, name, name_en, type, normal_balance, level, is_posting_allowed, is_system_account, system_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9)
       ON CONFLICT (org_id, code) DO UPDATE SET updated_at = NOW()
       RETURNING id, system_key`,
      [orgId, a.code, a.name, a.nameEn, a.type, a.nb, a.level, !!a.systemKey, a.systemKey || null]
    );
    if (a.systemKey) map[a.systemKey] = r.rows[0].id;
  }
  return map;
}

/** Create org with proper capabilities and defaults */
export async function createOrg(client: any, cfg: OrgConfig): Promise<string | null> {
  const existing = await client.query(`SELECT id FROM organizations WHERE slug = $1`, [cfg.slug]);
  if (existing.rows[0]) {
    console.log(`  → already exists (${cfg.slug}), skipping`);
    return null;
  }

  const r = await client.query(
    `INSERT INTO organizations
       (name, slug, subdomain, phone, email, business_type, plan, subscription_status,
        trial_ends_at, city, tagline, description, onboarding_completed, has_demo_data,
        enabled_capabilities, vat_number, commercial_register,
        operating_profile, service_delivery_modes)
     VALUES ($1,$2,$3,$4,$5,$6,'pro','active',NOW()+INTERVAL '365 days',
             $7,$8,$9,true,true,$10,$11,$12,$13,$14)
     RETURNING id`,
    [
      cfg.name, cfg.slug, cfg.slug, cfg.phone, cfg.email, cfg.businessType,
      cfg.city, cfg.tagline, cfg.description,
      JSON.stringify(cfg.enabledCapabilities),
      cfg.vatNumber || `3${rand(10,99)}${rand(1000000,9999999)}00003`,
      cfg.crNumber || `10${rand(10000000,99999999)}`,
      cfg.businessType,
      JSON.stringify(["on_site"]),
    ]
  );
  return r.rows[0].id;
}

/** Create owner + staff users */
export async function createTeam(client: any, orgId: string, ownerName: string, ownerPhone: string, ownerEmail: string) {
  const staffNames = [
    { name: "سلمى المنصور",    role: "employee" },
    { name: "ماجد العسيري",   role: "employee" },
    { name: "رنا الشاوي",      role: "employee" },
    { name: "هاني الرفاعي",    role: "employee" },
  ];

  await client.query(
    `INSERT INTO users (org_id, name, phone, email, type, status)
     VALUES ($1,$2,$3,$4,'owner','active')
     ON CONFLICT DO NOTHING`,
    [orgId, ownerName, ownerPhone, ownerEmail]
  );

  for (const s of staffNames.slice(0, 2)) {
    const phone = `+9665000${rand(10000, 99999)}`;
    await client.query(
      `INSERT INTO users (org_id, name, phone, email, type, status)
       VALUES ($1,$2,$3,$4,$5,'active')
       ON CONFLICT DO NOTHING`,
      [orgId, s.name, phone, `staff-${phone.slice(-5)}@demo.sa`, s.role]
    );
  }
}

/** Create default booking pipeline */
export async function createPipeline(client: any, orgId: string) {
  await client.query(
    `INSERT INTO booking_pipeline_stages
       (org_id, name, color, sort_order, is_default, is_terminal) VALUES
       ($1,'طلب جديد','#9E9E9E',1,true,false),
       ($1,'تأكيد أولي','#FF9800',2,false,false),
       ($1,'عربون مدفوع','#2196F3',3,false,false),
       ($1,'تأكيد نهائي','#4CAF50',4,false,false),
       ($1,'مكتمل','#4CAF50',5,false,true),
       ($1,'ملغي','#F44336',6,false,true)
     ON CONFLICT DO NOTHING`,
    [orgId]
  );
}

/** Create categories + services. Returns map: categoryName → id, serviceId list */
export async function createCatalog(
  client: any,
  orgId: string,
  categories: string[],
  services: ServiceDef[]
): Promise<{ catMap: Record<string, string>; serviceIds: string[] }> {
  const catMap: Record<string, string> = {};

  for (let i = 0; i < categories.length; i++) {
    const r = await client.query(
      `INSERT INTO categories (org_id, name, sort_order)
       VALUES ($1,$2,$3) RETURNING id`,
      [orgId, categories[i], i + 1]
    );
    catMap[categories[i]] = r.rows[0].id;
  }

  const serviceIds: string[] = [];
  for (const svc of services) {
    const r = await client.query(
      `INSERT INTO services
         (org_id, category_id, name, base_price, min_price, duration_minutes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`,
      [
        orgId,
        catMap[svc.category] || null,
        svc.name,
        svc.price,
        svc.minPrice || null,
        svc.duration,
      ]
    );
    serviceIds.push(r.rows[0].id);
  }

  return { catMap, serviceIds };
}

/** Create 25 customers for an org. Returns their ids */
export async function createCustomers(client: any, orgId: string): Promise<Array<{ id: string; name: string; phone: string }>> {
  const ids: Array<{ id: string; name: string; phone: string }> = [];
  for (const c of CUSTOMER_POOL) {
    const r = await client.query(
      `INSERT INTO customers (org_id, name, phone, city, source, is_demo)
       VALUES ($1,$2,$3,$4,'demo',true)
       RETURNING id`,
      [orgId, c.name, c.phone, c.city]
    );
    ids.push({ id: r.rows[0].id, name: c.name, phone: c.phone });
  }
  return ids;
}

/** Booking statuses and their weights */
const STATUS_DIST: Array<[string, string, number]> = [
  // [booking_status, payment_status, weight]
  ["completed",       "paid",              30],
  ["completed",       "paid",              10],
  ["fully_confirmed", "paid",              15],
  ["fully_confirmed", "partially_paid",     8],
  ["confirmed",       "pending",            8],
  ["pending",         "pending",            5],
  ["cancelled",       "pending",            4],
  ["no_show",         "pending",            2],
];

function pickStatus(): [string, string] {
  const total = STATUS_DIST.reduce((s, r) => s + r[2], 0);
  let rand2 = Math.random() * total;
  for (const [bs, ps, w] of STATUS_DIST) {
    rand2 -= w;
    if (rand2 <= 0) return [bs, ps];
  }
  return ["completed", "paid"];
}

/** Payment methods distribution (must match payment_method enum values) */
const PAY_METHODS = ["cash", "mada", "bank_transfer", "visa_master", "cash", "cash", "mada", "apple_pay"];

/**
 * Create N bookings with full financial chain:
 * booking → payment → invoice → invoice_items → journal_entry → journal_entry_lines
 */
export async function createBookings(
  client: any,
  orgId: string,
  orgName: string,
  customers: Array<{ id: string; name: string; phone: string }>,
  serviceIds: string[],
  services: ServiceDef[],
  accounts: Record<string, string>,
  count = 40,
  sellerVatNumber?: string,
  sellerCR?: string,
  sellerCity?: string
) {
  const resolvedVat = sellerVatNumber || `310${rand(10000000,99999999)}00003`;
  const resolvedCR  = sellerCR  || `10${rand(10000000,99999999)}`;
  const resolvedAddr = sellerCity ? `${sellerCity}، المملكة العربية السعودية` : "الرياض، المملكة العربية السعودية";
  for (let i = 0; i < count; i++) {
    const customer = pick(customers);
    const svcIdx = rand(0, services.length - 1);
    const svc = services[svcIdx];
    const svcId = serviceIds[svcIdx];
    const [bookingStatus, paymentStatus] = pickStatus();

    const eventDate = randomDate(90, bookingStatus === "pending" ? -7 : 0); // future for pending
    const subtotal = svc.price * rand(1, 3);
    const discount = Math.random() < 0.15 ? Math.round(subtotal * 0.1) : 0;
    const taxable = subtotal - discount;
    const { vatAmount, total } = calcVat(taxable);
    const paidAmount = paymentStatus === "paid" ? total :
                       paymentStatus === "partially_paid" ? Math.round(total * 0.5) : 0;
    const balanceDue = total - paidAmount;

    const bookingNum = nextBookingNumber();

    const bRes = await client.query(
      `INSERT INTO bookings
         (org_id, customer_id, booking_number, status, payment_status, event_date,
          subtotal, discount_amount, vat_amount, total_amount, deposit_amount, paid_amount, balance_due,
          source, internal_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'dashboard',$14)
       RETURNING id`,
      [
        orgId, customer.id, bookingNum, bookingStatus, paymentStatus,
        iso(eventDate),
        fmt(subtotal), fmt(discount), fmt(vatAmount), fmt(total),
        fmt(paidAmount * 0.3), fmt(paidAmount), fmt(balanceDue),
        pick(INTERNAL_NOTES),
      ]
    );
    const bookingId = bRes.rows[0].id;

    // Booking item (service line)
    await client.query(
      `INSERT INTO booking_items
         (booking_id, service_id, service_name, quantity, unit_price, total_price)
       VALUES ($1,$2,$3,1,$4,$5)`,
      [bookingId, svcId, svc.name, fmt(svc.price), fmt(subtotal)]
    );

    // Only create financial records for paid/partially_paid
    if (paidAmount <= 0) continue;

    const payMethod = pick(PAY_METHODS);

    // Booking payment record
    await client.query(
      `INSERT INTO payments (org_id, booking_id, customer_id, amount, method, status, type, paid_at)
       VALUES ($1,$2,$3,$4,$5,'completed','payment',$6)`,
      [orgId, bookingId, customer.id, fmt(paidAmount), payMethod, iso(eventDate)]
    );

    // Invoice
    const invoiceNum = nextInvoiceNumber();
    const qrCode = generateZatcaQr(orgName, resolvedVat, iso(eventDate), total, vatAmount);

    const iRes = await client.query(
      `INSERT INTO invoices
         (org_id, booking_id, customer_id, invoice_number, invoice_type, uuid, status,
          issue_date,
          seller_name, seller_vat_number, seller_cr, seller_address,
          buyer_name, buyer_phone,
          subtotal, discount_amount, taxable_amount, vat_rate, vat_amount, total_amount, paid_amount,
          paid_at, qr_code, source_type)
       VALUES ($1,$2,$3,$4,'simplified',gen_random_uuid(),$5,
               $6,
               $7,$8,$9,$10,
               $11,$12,
               $13,$14,$15,15,$16,$17,$17,
               $18,$19,'booking')
       RETURNING id`,
      [
        orgId, bookingId, customer.id, invoiceNum,
        paymentStatus === "paid" ? "paid" : "partially_paid",
        iso(eventDate),
        orgName, resolvedVat, resolvedCR, resolvedAddr,
        customer.name, customer.phone,
        fmt(subtotal), fmt(discount), fmt(taxable), fmt(vatAmount), fmt(total),
        paymentStatus === "paid" ? iso(eventDate) : null,
        qrCode,
      ]
    );
    const invoiceId = iRes.rows[0].id;

    // Invoice items
    await client.query(
      `INSERT INTO invoice_items
         (invoice_id, description, quantity, unit_price, discount_amount, taxable_amount, vat_rate, vat_amount, total_amount)
       VALUES ($1,$2,1,$3,$4,$5,15,$6,$7)`,
      [invoiceId, svc.name, fmt(subtotal), fmt(discount), fmt(taxable), fmt(vatAmount), fmt(total)]
    );

    // Invoice payment
    await client.query(
      `INSERT INTO invoice_payments (invoice_id, org_id, amount, payment_method, payment_date)
       VALUES ($1,$2,$3,$4,$5)`,
      [invoiceId, orgId, fmt(paidAmount), payMethod, iso(eventDate)]
    );

    // Journal entry (debit: cash/AR, credit: service revenue + VAT payable)
    if (accounts.SERVICE_REV && accounts.VAT_PAYABLE && (accounts.MAIN_CASH || accounts.AR)) {
      const jeNum = nextJeNumber();
      const cashAccountId = payMethod === "bank_transfer" ? accounts.MAIN_BANK : accounts.MAIN_CASH;
      const drAccountId = cashAccountId || accounts.AR;

      const jeRes = await client.query(
        `INSERT INTO journal_entries
           (org_id, entry_number, date, description, reference, source_type, source_id, status, posted_at)
         VALUES ($1,$2,$3,$4,$5,'invoice',$6,'posted',$7)
         RETURNING id`,
        [
          orgId, jeNum, iso(eventDate),
          `إيراد فاتورة ${invoiceNum} — ${customer.name}`,
          invoiceNum, invoiceId, iso(eventDate),
        ]
      );
      const jeId = jeRes.rows[0].id;

      // Debit: cash (full total)
      await client.query(
        `INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
         VALUES ($1,$2,$3,0,$4,1)`,
        [jeId, drAccountId, fmt(paidAmount), `استلام دفعة — ${bookingNum}`]
      );

      // Credit: service revenue (taxable amount)
      const revenueAccount = accounts.SERVICE_REV;
      const creditRevenue = paidAmount / 1.15;
      const creditVat = paidAmount - creditRevenue;

      await client.query(
        `INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
         VALUES ($1,$2,0,$3,$4,2)`,
        [jeId, revenueAccount, fmt(creditRevenue), `إيراد خدمة — ${svc.name}`]
      );

      // Credit: VAT payable
      await client.query(
        `INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description, line_order)
         VALUES ($1,$2,0,$3,$4,3)`,
        [jeId, accounts.VAT_PAYABLE, fmt(creditVat), `ضريبة قيمة مضافة 15%`]
      );
    }
  }
}

/** Create POS transactions for retail/service orgs with POS capability */
export async function createPosTransactions(
  client: any,
  orgId: string,
  orgName: string,
  customers: Array<{ id: string; name: string; phone: string }>,
  services: ServiceDef[],
  accounts: Record<string, string>,
  count = 50
) {
  for (let i = 0; i < count; i++) {
    const customer = pick([...customers, null as any]); // 30% guest
    const isGuest = !customer || Math.random() < 0.3;
    const svc = pick(services);
    const qty = rand(1, 3);
    const subtotal = svc.price * qty;
    const discount = Math.random() < 0.1 ? Math.round(subtotal * 0.05) : 0;
    const taxable = subtotal - discount;
    const vatAmount = taxable * 0.15;
    const total = taxable + vatAmount;
    const payMethod = pick(PAY_METHODS);
    const txDate = randomDate(60);
    const txNum = nextPosNumber();

    const items = JSON.stringify([{
      id: `demo-item-${i}`,
      name: svc.name,
      qty,
      price: svc.price,
      total: svc.price * qty,
    }]);

    const payments = JSON.stringify([{ method: payMethod, amount: total }]);

    await client.query(
      `INSERT INTO pos_transactions
         (org_id, transaction_number, type, customer_id, customer_name, customer_phone,
          items, subtotal, discount_type, discount_value, discount_amount,
          tax_percent, tax_amount, total_amount, payments, change_amount,
          notes, status, created_at)
       VALUES ($1,$2,'sale',$3,$4,$5,$6,$7,
               $8,$9,$10,15,$11,$12,$13,0,$14,'completed',$15)
       ON CONFLICT (org_id, transaction_number) DO NOTHING`,
      [
        orgId, txNum,
        isGuest ? null : customer.id,
        isGuest ? "زائر" : customer.name,
        isGuest ? null : customer.phone,
        items,
        fmt(subtotal),
        discount > 0 ? "fixed" : null,
        discount > 0 ? discount : 0,
        fmt(discount),
        fmt(vatAmount), fmt(total),
        payments,
        null,
        iso(txDate),
      ]
    );

    // Journal entry for POS
    if (accounts.SERVICE_REV && accounts.VAT_PAYABLE && accounts.MAIN_CASH) {
      const jeNum = nextJeNumber();
      const drAccount = payMethod === "bank_transfer" ? accounts.MAIN_BANK : accounts.MAIN_CASH;
      const revenueAccount = accounts.SALES_REV || accounts.SERVICE_REV;

      const jeRes = await client.query(
        `INSERT INTO journal_entries
           (org_id, entry_number, date, description, reference, source_type, status, posted_at)
         VALUES ($1,$2,$3,$4,$5,'pos','posted',$3)
         RETURNING id`,
        [orgId, jeNum, iso(txDate), `نقطة بيع — ${txNum}`, txNum]
      );
      const jeId = jeRes.rows[0].id;

      const creditRevenue = total / 1.15;
      const creditVat = total - creditRevenue;

      await client.query(
        `INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, line_order)
         VALUES ($1,$2,$3,0,1),($1,$4,0,$5,2),($1,$6,0,$7,3)`,
        [jeId, drAccount, fmt(total), revenueAccount, fmt(creditRevenue), accounts.VAT_PAYABLE, fmt(creditVat)]
      );
    }
  }
}

/** Create monthly expenses */
export async function createExpenses(
  client: any,
  orgId: string,
  accounts: Record<string, string>,
  monthlyRent = 8000,
  monthlySalaries = 15000
) {
  const expenseList = [
    { category: "rent", amount: monthlyRent, desc: "إيجار المقر الشهري", account: "RENT_EXP" },
    { category: "salaries", amount: monthlySalaries, desc: "رواتب شهر مارس 2026", account: "SALARIES_EXP" },
    { category: "salaries", amount: monthlySalaries, desc: "رواتب شهر فبراير 2026", account: "SALARIES_EXP" },
    { category: "supplies", amount: rand(500, 2000), desc: "مستلزمات تشغيلية", account: "SUPPLIES_EXP" },
    { category: "marketing", amount: rand(1000, 5000), desc: "تسويق — إعلانات سوشيال ميديا", account: null },
    { category: "utilities", amount: rand(300, 800), desc: "فاتورة الكهرباء والإنترنت", account: null },
  ];

  for (const exp of expenseList) {
    const expDate = randomDate(60);
    await client.query(
      `INSERT INTO expenses
         (org_id, category, description, amount, expense_date, chart_of_account_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        orgId,
        exp.category,
        exp.desc,
        fmt(exp.amount),
        iso(expDate),
        exp.account && accounts[exp.account] ? accounts[exp.account] : null,
      ]
    );
  }
}
