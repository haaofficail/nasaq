/**
 * ContactSimple Block — Page Builder v2 (Day 15)
 *
 * Design: "Clean Form"
 * Light card on subtle blue-tinted background. Name, email, message fields.
 * Validation: empty required fields show error state. Demo mode (no endpoint) shows
 * success immediately on submit.
 *
 * RTL: dir=rtl, ps-/pe-
 */
import React, { useState } from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ─────────────────────────────────────────────────────

export interface ContactSimpleProps {
  heading:        string;
  subheading:     string;
  nameLabel:      string;
  emailLabel:     string;
  messageLabel:   string;
  submitLabel:    string;
  submitEndpoint: string;
}

// ── Main component ─────────────────────────────────────────────

export function ContactSimpleBlock({
  heading,
  subheading,
  nameLabel,
  emailLabel,
  messageLabel,
  submitLabel,
  submitEndpoint,
}: ContactSimpleProps) {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [message,  setMessage]  = useState("");
  const [hasError, setHasError] = useState(false);
  const [success,  setSuccess]  = useState(false);

  function handleSubmit() {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setHasError(true);
      return;
    }
    setHasError(false);

    if (!submitEndpoint) {
      // Demo mode: show success immediately
      setSuccess(true);
      return;
    }

    // Real endpoint: fire and forget (no network in this scope)
    fetch(submitEndpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email, message }),
    })
      .then(() => setSuccess(true))
      .catch(() => setHasError(true));
  }

  return (
    <section
      dir="rtl"
      data-block="contact-simple"
      className="w-full py-16 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "linear-gradient(180deg, #F0F6FC 0%, #ffffff 100%)",
      }}
    >
      <div className="max-w-xl mx-auto">
        {/* Header */}
        {(heading || subheading) && (
          <div className="mb-10 text-center">
            {heading && (
              <h2
                className="font-bold"
                style={{
                  fontSize:      "clamp(1.6rem, 3vw, 2.2rem)",
                  color:         "#0D2138",
                  letterSpacing: "-0.03em",
                }}
              >
                {heading}
              </h2>
            )}
            {subheading && (
              <p
                className="mt-2"
                style={{ color: "#2F6190", fontSize: "0.95rem", lineHeight: "1.7" }}
              >
                {subheading}
              </p>
            )}
          </div>
        )}

        {/* Success state */}
        {success && (
          <div
            data-success-state=""
            className="rounded-2xl text-center py-12 px-8"
            style={{
              background: "#E3EFF9",
              border:     "1.5px solid #C9DDEF",
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#5b9bd5" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-8 h-8">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p
              className="font-bold"
              style={{ color: "#0D2138", fontSize: "1.2rem" }}
            >
              تم إرسال رسالتك بنجاح
            </p>
            <p className="mt-1" style={{ color: "#2F6190", fontSize: "0.9rem" }}>
              سنتواصل معك في أقرب وقت ممكن
            </p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <div
            data-contact-form=""
            data-error={hasError ? "true" : undefined}
            className="rounded-2xl p-8"
            style={{
              background: "#ffffff",
              boxShadow:  "0 4px 32px rgba(91,155,213,0.12)",
              border:     "1.5px solid #C9DDEF",
            }}
          >
            {hasError && (
              <p
                className="mb-4 text-center rounded-xl py-2 px-4"
                style={{
                  background: "#fff0f0",
                  color:      "#c0392b",
                  fontSize:   "0.875rem",
                  border:     "1px solid #f5c6cb",
                }}
              >
                يرجى ملء جميع الحقول المطلوبة
              </p>
            )}

            {/* Name */}
            <div className="mb-5">
              <label
                htmlFor="contact-name"
                className="block mb-1 font-medium"
                style={{ color: "#0D2138", fontSize: "0.9rem" }}
              >
                {nameLabel}
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl py-3 ps-4 pe-4 outline-none transition-all"
                style={{
                  background: "#F0F6FC",
                  border:     "1.5px solid #C9DDEF",
                  color:      "#0D2138",
                  fontSize:   "0.95rem",
                  fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                }}
              />
            </div>

            {/* Email */}
            <div className="mb-5">
              <label
                htmlFor="contact-email"
                className="block mb-1 font-medium"
                style={{ color: "#0D2138", fontSize: "0.9rem" }}
              >
                {emailLabel}
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl py-3 ps-4 pe-4 outline-none transition-all"
                style={{
                  background: "#F0F6FC",
                  border:     "1.5px solid #C9DDEF",
                  color:      "#0D2138",
                  fontSize:   "0.95rem",
                  fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                }}
              />
            </div>

            {/* Message */}
            <div className="mb-6">
              <label
                htmlFor="contact-message"
                className="block mb-1 font-medium"
                style={{ color: "#0D2138", fontSize: "0.9rem" }}
              >
                {messageLabel}
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl py-3 ps-4 pe-4 outline-none transition-all resize-none"
                style={{
                  background: "#F0F6FC",
                  border:     "1.5px solid #C9DDEF",
                  color:      "#0D2138",
                  fontSize:   "0.95rem",
                  fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                }}
              />
            </div>

            {/* Submit */}
            <button
              data-submit-btn=""
              type="button"
              onClick={handleSubmit}
              className="w-full rounded-xl py-3 font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{
                background: "#5b9bd5",
                color:      "#ffffff",
                fontSize:   "1rem",
                border:     "none",
                cursor:     "pointer",
                fontFamily: "'IBM Plex Sans Arabic', sans-serif",
              }}
            >
              {submitLabel}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const ContactSimpleConfig: ComponentConfig<ContactSimpleProps> = {
  label: "تواصل — نموذج بسيط",
  fields: {
    heading:        { type: "text",     label: "العنوان" },
    subheading:     { type: "textarea", label: "النص التوضيحي" },
    nameLabel:      { type: "text",     label: "تسمية حقل الاسم" },
    emailLabel:     { type: "text",     label: "تسمية حقل البريد" },
    messageLabel:   { type: "text",     label: "تسمية حقل الرسالة" },
    submitLabel:    { type: "text",     label: "نص زر الإرسال" },
    submitEndpoint: { type: "text",     label: "رابط الإرسال (اتركه فارغاً للعرض التوضيحي)" },
  },
  defaultProps: {
    heading:        "تواصل معنا",
    subheading:     "نحن هنا للإجابة على جميع استفساراتك",
    nameLabel:      "الاسم الكامل",
    emailLabel:     "البريد الإلكتروني",
    messageLabel:   "رسالتك",
    submitLabel:    "أرسل الرسالة",
    submitEndpoint: "",
  },
  render: (props) => <ContactSimpleBlock {...props} />,
};
