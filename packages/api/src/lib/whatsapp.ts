import { log } from "./logger";

// ============================================================
// WHATSAPP SERVICE — Unifonic WhatsApp API | Twilio WhatsApp
// ENV:
//   UNIFONIC_APP_SID      — Unifonic App SID (also used for SMS)
//   UNIFONIC_SENDER_ID    — WhatsApp sender number (e.g. "966xxxxxxxxx")
//   TWILIO_ACCOUNT_SID    — Twilio account SID
//   TWILIO_AUTH_TOKEN     — Twilio auth token
//   TWILIO_WHATSAPP_FROM  — Twilio WhatsApp sender (e.g. "whatsapp:+14155238886")
// ============================================================

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const normalised = phone.startsWith("+") ? phone : `+${phone}`;

  // ── Unifonic WhatsApp ────────────────────────────────────
  const unifonicSid    = process.env.UNIFONIC_APP_SID;
  const unifonicSender = process.env.UNIFONIC_WHATSAPP_SENDER ?? process.env.UNIFONIC_SENDER_ID ?? "";

  if (unifonicSid && unifonicSender) {
    try {
      const res = await fetch("https://el.cloud.unifonic.com/rest/WhatsApp/messages", {
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
      const res = await fetch(
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
    (process.env.UNIFONIC_APP_SID && process.env.UNIFONIC_WHATSAPP_SENDER) ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM)
  );
}

// ── Check if SMS provider is configured ──────────────────────
export function isSmsConfigured(): boolean {
  return !!(
    process.env.UNIFONIC_APP_SID ||
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM)
  );
}
