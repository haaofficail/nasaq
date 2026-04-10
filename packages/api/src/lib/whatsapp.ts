import { log } from "./logger";
import { sendViaBaileys } from "./whatsappBaileys";

// ============================================================
// WHATSAPP SERVICE — Meta Cloud API | Unifonic | Twilio
// ENV:
//   META_WA_TOKEN         — Meta WhatsApp Cloud API token (permanent)
//   META_WA_PHONE_ID      — Meta phone number ID
//   UNIFONIC_APP_SID      — Unifonic App SID
//   UNIFONIC_WHATSAPP_SENDER / UNIFONIC_SENDER_ID
//   TWILIO_ACCOUNT_SID    — Twilio account SID
//   TWILIO_AUTH_TOKEN     — Twilio auth token
//   TWILIO_WHATSAPP_FROM  — Twilio WhatsApp sender (e.g. "whatsapp:+14155238886")
// ============================================================

/** Fetch with a hard timeout (default 15s) */
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Send WhatsApp message.
 * Priority: Baileys QR session (per-org) → Meta Cloud → Unifonic → Twilio
 */
export async function sendWhatsApp(phone: string, message: string, orgId?: string): Promise<boolean> {
  const normalised = phone.startsWith("+") ? phone : `+${phone}`;

  // ── Baileys QR session (org's own WhatsApp number) ────────
  if (orgId) {
    const sent = await sendViaBaileys(orgId, normalised, message).catch(() => false);
    if (sent) return true;
  }

  // ── Meta WhatsApp Cloud API (highest priority) ────────────
  const metaToken   = process.env.META_WA_TOKEN;
  const metaPhoneId = process.env.META_WA_PHONE_ID;

  if (metaToken && metaPhoneId) {
    try {
      const res = await fetchWithTimeout(
        `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${metaToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to:   normalised.replace("+", ""),
            type: "text",
            text: { body: message },
          }),
        },
      );
      const data = await res.json() as { messages?: { id: string }[] };
      if (data.messages?.length) {
        log.info({ phone: normalised, provider: "meta-wa" }, "[whatsapp] sent");
        return true;
      }
      log.warn({ phone: normalised, data }, "[whatsapp] meta failed");
    } catch (err) {
      log.error({ err, phone: normalised }, "[whatsapp] meta error");
    }
  }

  // ── Unifonic WhatsApp ────────────────────────────────────
  const unifonicSid    = process.env.UNIFONIC_APP_SID;
  const unifonicSender = process.env.UNIFONIC_WHATSAPP_SENDER ?? process.env.UNIFONIC_SENDER_ID ?? "";

  if (unifonicSid && unifonicSender) {
    try {
      const res = await fetchWithTimeout("https://el.cloud.unifonic.com/rest/WhatsApp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          AppSid:      unifonicSid,
          SenderID:    unifonicSender,
          Body:        message,
          Recipient:   normalised,
          responseType: "JSON",
        }),
      });
      const data = await res.json() as { Success?: boolean; Message?: string };
      if (data.Success) {
        log.info({ phone: normalised, provider: "unifonic-wa" }, "[whatsapp] sent");
        return true;
      }
      log.warn({ phone: normalised, data }, "[whatsapp] unifonic failed");
    } catch (err) {
      log.error({ err, phone: normalised }, "[whatsapp] unifonic error");
    }
  }

  // ── Twilio WhatsApp fallback ─────────────────────────────
  const twilioSid   = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom  = process.env.TWILIO_WHATSAPP_FROM;

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const res = await fetchWithTimeout(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/x-www-form-urlencoded",
            "Authorization": `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            To:   `whatsapp:${normalised}`,
            From: twilioFrom,
            Body: message,
          }),
        },
      );
      if (res.ok) {
        log.info({ phone: normalised, provider: "twilio-wa" }, "[whatsapp] sent");
        return true;
      }
      log.warn({ phone: normalised, status: res.status }, "[whatsapp] twilio failed");
    } catch (err) {
      log.error({ err, phone: normalised }, "[whatsapp] twilio error");
    }
  }

  log.warn({ phone: normalised }, "[whatsapp] no provider configured — not sent");
  return false;
}

// ── Check if WhatsApp provider is configured ─────────────────
export function isWhatsAppConfigured(): boolean {
  return !!(
    (process.env.META_WA_TOKEN && process.env.META_WA_PHONE_ID) ||
    (process.env.UNIFONIC_APP_SID && (process.env.UNIFONIC_WHATSAPP_SENDER ?? process.env.UNIFONIC_SENDER_ID)) ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM)
  );
}

// ── Return active provider name ───────────────────────────────
export function whatsAppProvider(): string | null {
  if (process.env.META_WA_TOKEN && process.env.META_WA_PHONE_ID)            return "meta";
  if (process.env.UNIFONIC_APP_SID && (process.env.UNIFONIC_WHATSAPP_SENDER ?? process.env.UNIFONIC_SENDER_ID)) return "unifonic";
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)      return "twilio";
  return null;
}

// ── Check if SMS provider is configured ──────────────────────
export function isSmsConfigured(): boolean {
  return !!(
    process.env.UNIFONIC_APP_SID ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM)
  );
}
