// ============================================================
// INTEGRATION EVENT BUS — ناقل أحداث التكاملات
//
// كل حدث في النظام يُطلق events للتكاملات المفعّلة لهذه المنشأة
// ============================================================

import { pool } from "@nasaq/db/client";
import { logIntegration } from "./logger";
import { decryptJson } from "../encryption";

export type IntegrationEvent =
  | { type: "booking.created";   payload: BookingPayload }
  | { type: "booking.confirmed"; payload: BookingPayload }
  | { type: "booking.cancelled"; payload: BookingPayload }
  | { type: "booking.completed"; payload: BookingPayload }
  | { type: "payment.confirmed"; payload: PaymentPayload }
  | { type: "payment.refunded";  payload: PaymentPayload }
  | { type: "order.created";     payload: OrderPayload }
  | { type: "order.cancelled";   payload: OrderPayload };

export interface BookingPayload {
  orgId: string;
  bookingId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName: string;
  startTime: string;
  endTime?: string;
  totalAmount: number;
  currency?: string;
  reference?: string;
}

export interface PaymentPayload {
  orgId: string;
  paymentId: string;
  bookingId?: string;
  orderId?: string;
  amount: number;
  currency?: string;
  method?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface OrderPayload {
  orgId: string;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
  currency?: string;
}

// Fetch all active integrations for an org
async function getActiveIntegrations(orgId: string): Promise<Array<{ id: string; provider: string; credentials: unknown; config: unknown }>> {
  const result = await pool.query<{ id: string; provider: string; credentials: unknown; config: unknown }>(
    "SELECT id, provider, credentials, config FROM integrations WHERE org_id = $1 AND status = 'active'",
    [orgId]
  );
  return result.rows.map((r) => ({
    ...r,
    credentials: decryptJson(r.credentials as string | null) ?? {},
  }));
}

// Fire and forget — never throws, logs errors to console + integration_logs
async function safeDispatch(fn: () => Promise<void>, label: string, orgId?: string, integrationId?: string): Promise<void> {
  try {
    await fn();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[EventBus] ${label}:`, message);
    if (orgId) {
      logIntegration({
        orgId,
        integrationId,
        direction: "outbound",
        endpoint: label,
        statusCode: 500,
        errorMessage: message,
      }).catch(() => {});
    }
  }
}

// ── Main dispatch function ─────────────────────────────────
export async function dispatchIntegrationEvent(event: IntegrationEvent): Promise<void> {
  const orgId = event.payload.orgId;
  const integrations = await getActiveIntegrations(orgId).catch(() => []);

  const tasks: Promise<void>[] = [];

  for (const integration of integrations) {
    const creds = integration.credentials as Record<string, string>;
    const cfg = integration.config as Record<string, unknown>;
    const sd = (fn: () => Promise<void>, label: string) =>
      safeDispatch(fn, label, orgId, integration.id);

    switch (event.type) {
      // ── Booking Created ─────────────────────────────────
      case "booking.created": {
        const p = event.payload;

        // Google Calendar: create event
        if (integration.provider === "google_calendar") {
          tasks.push(sd(async () => {
            const { GoogleCalendarProvider } = await import("./providers/calendar/google");
            const provider = new GoogleCalendarProvider({ orgId, integrationId: integration.id, credentials: creds, config: cfg });
            await provider.createEvent({
              summary: `حجز: ${p.serviceName} — ${p.customerName}`,
              startDateTime: p.startTime,
              endDateTime: p.endTime ?? p.startTime,
              description: `رقم الحجز: ${p.bookingId}`,
            });
          }, "google_calendar.createEvent"));
        }

        // WhatsApp Meta: send confirmation
        if (integration.provider === "whatsapp_meta" && p.customerPhone) {
          tasks.push(sd(async () => {
            const { WhatsAppMetaProvider } = await import("./providers/messaging/whatsapp_meta");
            const provider = new WhatsAppMetaProvider({ orgId, integrationId: integration.id, credentials: creds, config: cfg });
            await provider.sendTemplateMessage({
              to: p.customerPhone!,
              templateName: (cfg.booking_confirmation_template as string) ?? "booking_confirmation",
            });
          }, "whatsapp_meta.sendTemplate"));
        }

        // Facebook Pixel: Purchase event
        if (integration.provider === "facebook_pixel") {
          tasks.push(sd(async () => {
            const { FacebookPixelProvider } = await import("./providers/analytics/facebook");
            const provider = new FacebookPixelProvider({ orgId, integrationId: integration.id, credentials: creds, config: cfg });
            await provider.sendServerEvent({
              eventName: "Purchase",
              userEmail: p.customerEmail,
              userPhone: p.customerPhone,
              value: p.totalAmount,
              currency: p.currency ?? "SAR",
              orderId: p.bookingId,
              contentName: p.serviceName,
            });
          }, "facebook_pixel.Purchase"));
        }

        // Automation triggers (Zapier/Make/n8n)
        if (["zapier", "make", "n8n"].includes(integration.provider)) {
          tasks.push(sd(async () => {
            const webhookUrl = creds.webhook_url;
            if (!webhookUrl) return;
            await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "booking.created", ...p }),
              signal: AbortSignal.timeout(30000),
            });
            await logIntegration({ orgId, integrationId: integration.id, direction: "outbound", endpoint: webhookUrl, method: "POST", requestBody: { event: "booking.created" }, statusCode: 200 });
          }, `${integration.provider}.webhook`));
        }
        break;
      }

      // ── Booking Cancelled ─────────────────────────────
      case "booking.cancelled": {
        const p = event.payload;

        // Google Calendar: delete event
        if (integration.provider === "google_calendar" && cfg.calendar_event_id) {
          tasks.push(sd(async () => {
            const { GoogleCalendarProvider } = await import("./providers/calendar/google");
            const provider = new GoogleCalendarProvider({ orgId, integrationId: integration.id, credentials: creds, config: cfg });
            await provider.deleteEvent(cfg.calendar_event_id as string);
          }, "google_calendar.deleteEvent"));
        }

        // Automation triggers
        if (["zapier", "make", "n8n"].includes(integration.provider)) {
          tasks.push(sd(async () => {
            const webhookUrl = creds.webhook_url;
            if (!webhookUrl) return;
            await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "booking.cancelled", ...p }), signal: AbortSignal.timeout(30000) });
          }, `${integration.provider}.webhook`));
        }
        break;
      }

      // ── Payment Confirmed ─────────────────────────────
      case "payment.confirmed": {
        const p = event.payload;

        // Accounting: Qoyod
        if (integration.provider === "qoyod" && p.bookingId) {
          tasks.push(sd(async () => {
            const { QoyodProvider } = await import("./providers/accounting/qoyod");
            const provider = new QoyodProvider({ orgId, integrationId: integration.id, credentials: creds, config: cfg });
            await provider.createInvoice({
              contactName: "عميل",
              reference: p.bookingId ?? p.paymentId,
              date: new Date().toISOString().slice(0, 10),
              dueDate: new Date().toISOString().slice(0, 10),
              lines: [{ description: "دفعة حجز", quantity: 1, unitPrice: p.amount }],
            });
          }, "qoyod.createInvoice"));
        }

        // Facebook Pixel
        if (integration.provider === "facebook_pixel") {
          tasks.push(sd(async () => {
            const { FacebookPixelProvider } = await import("./providers/analytics/facebook");
            const provider = new FacebookPixelProvider({ orgId, integrationId: integration.id, credentials: creds, config: cfg });
            await provider.sendServerEvent({ eventName: "Purchase", userEmail: p.customerEmail, userPhone: p.customerPhone, value: p.amount, currency: p.currency ?? "SAR", orderId: p.paymentId });
          }, "facebook_pixel.Purchase"));
        }

        // Automation triggers
        if (["zapier", "make", "n8n"].includes(integration.provider)) {
          tasks.push(sd(async () => {
            const webhookUrl = creds.webhook_url;
            if (!webhookUrl) return;
            await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "payment.confirmed", ...p }), signal: AbortSignal.timeout(30000) });
          }, `${integration.provider}.webhook`));
        }
        break;
      }

      // ── Order Created ─────────────────────────────────
      case "order.created": {
        const p = event.payload;

        // Shipping
        if (["smsa", "aramex", "dhl", "fedex"].includes(integration.provider)) {
          tasks.push(sd(async () => {
            await logIntegration({ orgId, integrationId: integration.id, direction: "outbound", endpoint: `/shipping/${integration.provider}/create`, method: "POST", requestBody: { orderId: p.orderId }, statusCode: 202 });
          }, `${integration.provider}.shipping`));
        }

        // Automation
        if (["zapier", "make", "n8n"].includes(integration.provider)) {
          tasks.push(sd(async () => {
            const webhookUrl = creds.webhook_url;
            if (!webhookUrl) return;
            await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "order.created", ...p }), signal: AbortSignal.timeout(30000) });
          }, `${integration.provider}.webhook`));
        }
        break;
      }
    }
  }

  // Run all tasks concurrently (fire and forget per task)
  await Promise.allSettled(tasks);
}
