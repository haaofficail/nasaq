import { log } from "./logger";

// ============================================================
// SMS SERVICE — Unifonic (primary) | Twilio (fallback)
// ENV:
//   UNIFONIC_APP_SID   — Unifonic application SID
//   UNIFONIC_SENDER_ID — Sender ID (e.g. "Nasaq")
//   TWILIO_ACCOUNT_SID — Twilio account SID (fallback)
//   TWILIO_AUTH_TOKEN  — Twilio auth token
//   TWILIO_FROM        — Twilio phone number
// ============================================================

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function sendSms(phone: string, message: string): Promise<boolean> {
  const normalised = phone.startsWith("+") ? phone : `+${phone}`;

  // ── Unifonic ──────────────────────────────────────────────
  const unifonicSid    = process.env.UNIFONIC_APP_SID;
  const unifonicSender = process.env.UNIFONIC_SENDER_ID ?? "Nasaq";

  if (unifonicSid) {
    try {
      const res = await fetchWithTimeout("https://el.cloud.unifonic.com/rest/SMS/messages", {
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
        log.info({ phone: normalised, provider: "unifonic" }, "[sms] sent");
        return true;
      }
      log.warn({ phone: normalised, data }, "[sms] unifonic failed");
    } catch (err) {
      log.error({ err, phone: normalised }, "[sms] unifonic error");
    }
  }

  // ── Twilio fallback ───────────────────────────────────────
  const twilioSid   = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom  = process.env.TWILIO_FROM;

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
          body: new URLSearchParams({ To: normalised, From: twilioFrom, Body: message }),
        },
      );
      if (res.ok) {
        log.info({ phone: normalised, provider: "twilio" }, "[sms] sent");
        return true;
      }
      log.warn({ phone: normalised, status: res.status }, "[sms] twilio failed");
    } catch (err) {
      log.error({ err, phone: normalised }, "[sms] twilio error");
    }
  }

  // ── No provider configured ────────────────────────────────
  log.warn({ phone: normalised, message }, "[sms] no provider configured — logging only");
  return false;
}
