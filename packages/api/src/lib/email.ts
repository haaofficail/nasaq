import { log } from "./logger";

// ============================================================
// EMAIL SERVICE — Resend
// ENV:
//   RESEND_API_KEY  — Resend API key
//   EMAIL_FROM      — Sender address (e.g. "نسق <noreply@nasaqpro.tech>")
// ============================================================

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM ?? "نسق <noreply@nasaqpro.tech>";

  if (!apiKey) {
    log.warn({ to: opts.to, subject: opts.subject }, "[email] RESEND_API_KEY not configured — skipping");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to:      Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html:    opts.html,
        ...(opts.text    && { text:     opts.text }),
        ...(opts.replyTo && { reply_to: opts.replyTo }),
      }),
    });

    if (res.ok) {
      const data = await res.json() as { id?: string };
      log.info({ to: opts.to, subject: opts.subject, id: data.id }, "[email] sent");
      return true;
    }

    const err = await res.text();
    log.error({ to: opts.to, subject: opts.subject, status: res.status, err }, "[email] resend failed");
    return false;
  } catch (err) {
    log.error({ err, to: opts.to }, "[email] send error");
    return false;
  }
}

// ── Helper: simple Arabic email template ─────────────────────
export function buildEmailHtml(opts: {
  orgName?: string;
  title: string;
  body: string;
  cta?: { label: string; url: string };
}): string {
  const cta = opts.cta
    ? `<div style="text-align:center;margin:24px 0">
         <a href="${opts.cta.url}"
            style="background:#5b9bd5;color:#fff;padding:12px 32px;border-radius:8px;
                   text-decoration:none;font-size:15px;font-weight:600;display:inline-block">
           ${opts.cta.label}
         </a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${opts.title}</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif;direction:rtl">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;
              box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden">
    <div style="background:#5b9bd5;padding:24px 32px">
      <span style="color:#fff;font-size:20px;font-weight:700">نسق</span>
      ${opts.orgName ? `<span style="color:#e0edfa;font-size:13px;margin-right:12px">${opts.orgName}</span>` : ""}
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 16px;color:#1a2233;font-size:18px">${opts.title}</h2>
      <div style="color:#4a5568;font-size:15px;line-height:1.7;white-space:pre-wrap">${opts.body}</div>
      ${cta}
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e8ecf0;
                color:#94a3b8;font-size:12px;text-align:center">
      نسق — منصة إدارة الأعمال · هذا البريد أُرسل تلقائياً
    </div>
  </div>
</body></html>`;
}
