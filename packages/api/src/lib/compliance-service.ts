import { db } from "@nasaq/db/client";
import { securityIncidents } from "@nasaq/db/schema";

// ============================================================
// Security Incident Logging (PDPL المادة 20)
// الحوادث الجسيمة تستوجب الإخطار لـ NDMO خلال 72 ساعة
// ============================================================

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export interface SecurityIncidentInput {
  orgId?: string | null;
  type: string;
  description: string;
  severity: IncidentSeverity;
  affectedData?: string;
  actionsTaken?: string;
}

export async function logSecurityIncident(input: SecurityIncidentInput) {
  const [incident] = await db.insert(securityIncidents).values({
    orgId:        input.orgId ?? null,
    type:         input.type,
    description:  input.description,
    severity:     input.severity,
    affectedData: input.affectedData ?? null,
    actionsTaken: input.actionsTaken ?? null,
    detectedAt:   new Date(),
  }).returning();

  // الحوادث الجسيمة (high/critical) → تسجيل تحذير فوري
  if (input.severity === "high" || input.severity === "critical") {
    console.warn(
      `[SECURITY INCIDENT] severity=${input.severity} type=${input.type}` +
      ` orgId=${input.orgId ?? "platform"} — NDMO notification may be required within 72h`
    );
  }

  return incident;
}

// ============================================================
// ZATCA Invoice Payload Generator
// واجهة قابلة للتوسعة لنظام فاتورة الإلكترونية
// تجهيز البيانات للمرحلة الثانية من ZATCA
// ============================================================

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;   // الافتراضي 0.15
}

export interface OrderForInvoice {
  id: string;
  orgId: string;
  invoiceNumber?: string;
  date: Date | string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  customerName?: string;
  customerVatNumber?: string;
  sellerVatNumber?: string;
  sellerName?: string;
  sellerCR?: string;          // رقم السجل التجاري
}

export interface ZatcaInvoicePayload {
  invoiceNumber: string;
  issueDate: string;           // YYYY-MM-DD
  sellerOrgId: string;
  sellerName: string | null;
  sellerVatNumber: string | null;
  sellerCR: string | null;
  buyerName: string | null;
  buyerVatNumber: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    lineSubtotal: number;
    lineTax: number;
    lineTotal: number;
  }>;
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: "SAR";
  zatcaPhase: 1 | 2;
  xmlPayload: null;            // يُولَّد بواسطة ZATCA SDK في المرحلة الثانية
}

export function generateInvoicePayload(order: OrderForInvoice): ZatcaInvoicePayload {
  const defaultVat = 0.15;

  const items = order.items.map((item) => {
    const rate      = item.vatRate ?? defaultVat;
    const subtotal  = item.quantity * item.unitPrice;
    const tax       = subtotal * rate;
    return {
      name:         item.name,
      quantity:     item.quantity,
      unitPrice:    item.unitPrice,
      vatRate:      rate,
      lineSubtotal: subtotal,
      lineTax:      tax,
      lineTotal:    subtotal + tax,
    };
  });

  return {
    invoiceNumber:    order.invoiceNumber ?? `INV-${order.id.slice(0, 8).toUpperCase()}`,
    issueDate:        new Date(order.date).toISOString().split("T")[0],
    sellerOrgId:      order.orgId,
    sellerName:       order.sellerName ?? null,
    sellerVatNumber:  order.sellerVatNumber ?? null,
    sellerCR:         order.sellerCR ?? null,
    buyerName:        order.customerName ?? null,
    buyerVatNumber:   order.customerVatNumber ?? null,
    items,
    subtotal:         order.subtotal,
    vatAmount:        order.vatAmount,
    total:            order.total,
    currency:         "SAR",
    zatcaPhase:       1,      // المرحلة الأولى: إصدار الفاتورة
    xmlPayload:       null,   // المرحلة الثانية: تكامل ZATCA API
  };
}
