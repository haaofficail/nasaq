import { log } from "./logger";
import nodemailer from "nodemailer";

// ============================================================
// EMAIL SERVICE — SMTP (primary) | Resend (fallback)
// ENV:
//   SMTP_HOST     — e.g. smtp.hostinger.com
//   SMTP_PORT     — e.g. 465 (SSL) or 587 (TLS)
//   SMTP_USER     — e.g. info@tarmizos.com
//   SMTP_PASS     — password
//   SMTP_FROM     — e.g. "Tarmiz OS <info@tarmizos.com>"
//   RESEND_API_KEY — fallback if no SMTP configured
// ============================================================

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,  // SSL for 465, STARTTLS for 587
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  const from = process.env.SMTP_FROM
    ?? process.env.EMAIL_FROM
    ?? "Tarmiz OS <info@tarmizos.com>";

  const toArr = Array.isArray(opts.to) ? opts.to : [opts.to];

  // ── SMTP ──────────────────────────────────────────────────
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: toArr.join(", "),
        subject: opts.subject,
        html: opts.html,
        ...(opts.text    && { text:    opts.text }),
        ...(opts.replyTo && { replyTo: opts.replyTo }),
      });
      log.info({ to: opts.to, subject: opts.subject, provider: "smtp" }, "[email] sent");
      return true;
    } catch (err) {
      log.error({ err, to: opts.to, provider: "smtp" }, "[email] smtp failed");
    }
  }

  // ── Resend fallback ───────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: toArr,
          subject: opts.subject,
          html: opts.html,
          ...(opts.text    && { text:     opts.text }),
          ...(opts.replyTo && { reply_to: opts.replyTo }),
        }),
      });
      if (res.ok) {
        log.info({ to: opts.to, subject: opts.subject, provider: "resend" }, "[email] sent");
        return true;
      }
      log.warn({ to: opts.to, status: res.status }, "[email] resend failed");
    } catch (err) {
      log.error({ err, to: opts.to }, "[email] resend error");
    }
  }

  log.warn({ to: opts.to }, "[email] no provider configured");
  return false;
}

// ── OTP Email Template ────────────────────────────────────────
export function buildOtpEmail(code: string): { subject: string; html: string; text: string } {
  const subject = `${code} — رمز التحقق في ترميز OS`;
  const text    = `رمز التحقق الخاص بك: ${code}\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.`;
  const html    = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif;direction:rtl">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;
              box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden">
    <div style="background:#5b9bd5;padding:24px 32px">
      <span style="color:#fff;font-size:20px;font-weight:700">ترميز OS</span>
    </div>
    <div style="padding:32px;text-align:center">
      <h2 style="margin:0 0 8px;color:#1a2233;font-size:18px">رمز التحقق</h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 28px">أدخل هذا الرمز لإتمام تسجيل الدخول</p>
      <div style="background:#f0f7ff;border:2px dashed #5b9bd5;border-radius:12px;
                  padding:20px 32px;display:inline-block;margin:0 auto">
        <span style="font-size:36px;font-weight:700;color:#5b9bd5;letter-spacing:0.25em;
                     font-family:monospace">${code}</span>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:24px 0 0">
        صالح لمدة <strong>5 دقائق</strong> · لا تشاركه مع أحد
      </p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e8ecf0;
                color:#94a3b8;font-size:12px;text-align:center">
      ترميز OS — نظام إدارة الأعمال · هذا البريد أُرسل تلقائياً
    </div>
  </div>
</body></html>`;
  return { subject, html, text };
}

// ── Generic Arabic Email Template ────────────────────────────
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
      <span style="color:#fff;font-size:20px;font-weight:700">ترميز OS</span>
      ${opts.orgName ? `<span style="color:#e0edfa;font-size:13px;margin-right:12px">${opts.orgName}</span>` : ""}
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 16px;color:#1a2233;font-size:18px">${opts.title}</h2>
      <div style="color:#4a5568;font-size:15px;line-height:1.7;white-space:pre-wrap">${opts.body}</div>
      ${cta}
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e8ecf0;
                color:#94a3b8;font-size:12px;text-align:center">
      ترميز OS — منصة إدارة الأعمال · هذا البريد أُرسل تلقائياً
    </div>
  </div>
</body></html>`;
}
