// ============================================================
// Moyasar Payment Gateway Client
// وثائق: https://moyasar.com/docs
// ============================================================

const MOYASAR_API = "https://api.moyasar.com/v1";

function getSecretKey(): string {
  const key = process.env.MOYASAR_SECRET_KEY;
  if (!key || key === "__FILL__") throw new Error("MOYASAR_SECRET_KEY غير مضبوط");
  return key;
}

function authHeader(): string {
  return "Basic " + Buffer.from(`${getSecretKey()}:`).toString("base64");
}

async function moyasarFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MOYASAR_API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...options.headers,
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.message || body?.type || `Moyasar error ${res.status}`);
  }
  return body as T;
}

// ============================================================
// TYPES
// ============================================================

export interface MoyasarPayment {
  id: string;
  status: "initiated" | "paid" | "failed" | "authorized" | "captured" | "refunded" | "voided";
  amount: number;           // هللات (SAR × 100)
  currency: string;
  description: string;
  callback_url?: string;
  metadata?: Record<string, string>;
  source: {
    type: string;
    message?: string;
    transaction_url?: string;  // رابط إتمام الدفع (credit card)
    company?: string;
    name?: string;
    number?: string;           // آخر 4 أرقام
    token?: string;
    gateway_id?: string;
  };
  invoice_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentParams {
  amount: number;           // هللات
  currency?: string;
  description: string;
  callback_url: string;
  publishable_api_key: string;
  metadata?: Record<string, string>;
  source: {
    type: "creditcard" | "applepay" | "stcpay";
    token?: string;
    company?: string;
    name?: string;
    number?: string;
    cvc?: string;
    month?: string;
    year?: string;
    "3ds"?: boolean;
  };
}

// ============================================================
// PAYMENT FORM (hosted redirect) — الأبسط والأكثر أماناً
// ============================================================

/** أنشئ رابط صفحة الدفع المستضافة عند Moyasar */
export function buildMoyasarPaymentUrl(params: {
  publishableKey: string;
  amount: number;       // هللات
  currency: string;
  description: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}): string {
  const base = "https://payment.moyasar.com/v2";
  const q = new URLSearchParams({
    publishable_api_key: params.publishableKey,
    amount: String(params.amount),
    currency: params.currency,
    description: params.description,
    callback_url: params.callbackUrl,
    ...(params.metadata
      ? Object.fromEntries(
          Object.entries(params.metadata).map(([k, v]) => [`metadata[${k}]`, v])
        )
      : {}),
  });
  return `${base}?${q.toString()}`;
}

// ============================================================
// FETCH PAYMENT BY ID
// ============================================================

export async function fetchPayment(id: string): Promise<MoyasarPayment> {
  return moyasarFetch<MoyasarPayment>(`/payments/${id}`);
}

// ============================================================
// REFUND
// ============================================================

export async function refundPayment(id: string, amount?: number): Promise<MoyasarPayment> {
  return moyasarFetch<MoyasarPayment>(`/payments/${id}/refund`, {
    method: "POST",
    body: JSON.stringify(amount ? { amount } : {}),
  });
}

// ============================================================
// LIST PAYMENTS (admin use)
// ============================================================

export async function listPayments(page = 1, perPage = 50): Promise<{ payments: MoyasarPayment[] }> {
  return moyasarFetch<{ payments: MoyasarPayment[] }>(
    `/payments?page=${page}&per_page=${perPage}`
  );
}

// ============================================================
// HELPERS
// ============================================================

/** تحويل من ريال إلى هللات */
export function sarToHalala(sar: number): number {
  return Math.round(sar * 100);
}

/** تحويل من هللات إلى ريال */
export function halalaToSar(halala: number): number {
  return halala / 100;
}
