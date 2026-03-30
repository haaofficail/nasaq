/**
 * VAT Calculation — Single Source of Truth
 *
 * PROBLEM SOLVED: VAT logic was duplicated in finance.ts, bookings.ts, POS, invoices.
 * ALL engines must use these functions. No inline VAT math anywhere else.
 */

export const DEFAULT_VAT_RATE = 0.15;

/** المبلغ شامل الضريبة → استخرج الضريبة */
export function extractVat(totalInclusive: number, rate = DEFAULT_VAT_RATE): {
  base: number;
  vat: number;
  total: number;
} {
  const base  = totalInclusive / (1 + rate);
  const vat   = totalInclusive - base;
  return {
    base:  round2(base),
    vat:   round2(vat),
    total: round2(totalInclusive),
  };
}

/** المبلغ قبل الضريبة → احسب الضريبة */
export function addVat(baseAmount: number, rate = DEFAULT_VAT_RATE): {
  base: number;
  vat: number;
  total: number;
} {
  const vat   = baseAmount * rate;
  const total = baseAmount + vat;
  return {
    base:  round2(baseAmount),
    vat:   round2(vat),
    total: round2(total),
  };
}

/** تحقق إذا كان السعر شامل الضريبة أم لا ثم احسب */
export function calcVat(amount: number, vatInclusive: boolean, rate = DEFAULT_VAT_RATE) {
  return vatInclusive ? extractVat(amount, rate) : addVat(amount, rate);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
