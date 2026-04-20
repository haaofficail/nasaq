/**
 * ContactWithMap Block — Page Builder v2 (Day 15)
 *
 * Design: "Location Hero"
 * Two-column layout: contact info + map on the right, form on the left (RTL reversed).
 * Dark navy left panel with address / phone / email / hours.
 * Embedded map or placeholder. Contact form with same validation as ContactSimple.
 *
 * RTL: dir=rtl, ps-/pe-
 */
import React, { useState } from "react";
import type { ComponentConfig } from "@measured/puck";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

export interface ContactWithMapProps {
  heading:        string;
  subheading:     string;
  address:        string;
  phone:          string;
  email:          string;
  workingHours:   string;
  mapEmbedUrl:    string;
  nameLabel:      string;
  emailLabel:     string;
  messageLabel:   string;
  submitLabel:    string;
  submitEndpoint: string;
}

// ── Main component ─────────────────────────────────────────────

export function ContactWithMapBlock({
  heading,
  subheading,
  address,
  phone,
  email,
  workingHours,
  mapEmbedUrl,
  nameLabel,
  emailLabel,
  messageLabel,
  submitLabel,
  submitEndpoint,
}: ContactWithMapProps) {
  const [name,    setName]    = useState("");
  const [mail,    setMail]    = useState("");
  const [msg,     setMsg]     = useState("");
  const [hasError, setHasError] = useState(false);
  const [success,  setSuccess]  = useState(false);

  function handleSubmit() {
    if (!name.trim() || !mail.trim() || !msg.trim()) {
      setHasError(true);
      return;
    }
    setHasError(false);
    if (!submitEndpoint) {
      setSuccess(true);
      return;
    }
    fetch(submitEndpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email: mail, message: msg }),
    })
      .then(() => setSuccess(true))
      .catch(() => setHasError(true));
  }

  return (
    <section
      dir="rtl"
      data-block="contact-with-map"
      className="w-full py-16 ps-6 pe-6"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        background: "#F0F6FC",
      }}
    >
      <div className="max-w-5xl mx-auto">
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

        {/* Two-column grid */}
        <div className="grid grid-cols-1 gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>

          {/* Contact info + Map */}
          <div
            data-contact-info=""
            className="rounded-2xl overflow-hidden"
            style={{ minHeight: "400px" }}
          >
            {/* Info panel */}
            <div
              className="py-8 ps-8 pe-8"
              style={{ background: "#0D2138" }}
            >
              <h3
                className="font-bold mb-6"
                style={{ color: "#ffffff", fontSize: "1.1rem" }}
              >
                معلومات التواصل
              </h3>

              <div className="flex flex-col gap-5">
                {address && (
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="mt-0.5 flex-shrink-0" style={{ color: "#5b9bd5" }} aria-hidden="true" />
                    <p style={{ color: "#C9DDEF", fontSize: "0.9rem", lineHeight: "1.6" }}>
                      {address}
                    </p>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="flex-shrink-0" style={{ color: "#5b9bd5" }} aria-hidden="true" />
                    <p style={{ color: "#C9DDEF", fontSize: "0.9rem" }}>{phone}</p>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="flex-shrink-0" style={{ color: "#5b9bd5" }} aria-hidden="true" />
                    <p style={{ color: "#C9DDEF", fontSize: "0.9rem" }}>{email}</p>
                  </div>
                )}
                {workingHours && (
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="flex-shrink-0" style={{ color: "#5b9bd5" }} aria-hidden="true" />
                    <p style={{ color: "#C9DDEF", fontSize: "0.9rem" }}>{workingHours}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Map */}
            <div style={{ height: "220px", background: "#0a1a2e", overflow: "hidden" }}>
              {mapEmbedUrl ? (
                <iframe
                  src={mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="الموقع على الخريطة"
                />
              ) : (
                <div
                  data-map-placeholder=""
                  className="w-full h-full flex flex-col items-center justify-center gap-3"
                  style={{ background: "#0a1a2e" }}
                >
                  <MapPin size={32} style={{ color: "rgba(91,155,213,0.4)" }} aria-hidden="true" />
                  <p style={{ color: "rgba(91,155,213,0.5)", fontSize: "0.8rem" }}>
                    أضف رابط خريطة Google لعرض موقعك
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <div>
            {success ? (
              <div
                data-success-state=""
                className="rounded-2xl text-center py-12 px-8 h-full flex flex-col items-center justify-center"
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
                <p className="font-bold" style={{ color: "#0D2138", fontSize: "1.2rem" }}>
                  تم إرسال رسالتك بنجاح
                </p>
                <p className="mt-1" style={{ color: "#2F6190", fontSize: "0.9rem" }}>
                  سنتواصل معك في أقرب وقت ممكن
                </p>
              </div>
            ) : (
              <div
                data-contact-form=""
                data-error={hasError ? "true" : undefined}
                className="rounded-2xl p-8 h-full"
                style={{
                  background: "#ffffff",
                  boxShadow:  "0 4px 32px rgba(91,155,213,0.12)",
                  border:     "1.5px solid #C9DDEF",
                }}
              >
                {hasError && (
                  <p
                    className="mb-4 text-center rounded-xl py-2 ps-4 pe-4"
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
                <div className="mb-4">
                  <label className="block mb-1 font-medium" style={{ color: "#0D2138", fontSize: "0.9rem" }}>
                    {nameLabel}
                  </label>
                  <input
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl py-3 ps-4 pe-4 outline-none"
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
                <div className="mb-4">
                  <label className="block mb-1 font-medium" style={{ color: "#0D2138", fontSize: "0.9rem" }}>
                    {emailLabel}
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={mail}
                    onChange={(e) => setMail(e.target.value)}
                    className="w-full rounded-xl py-3 ps-4 pe-4 outline-none"
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
                  <label className="block mb-1 font-medium" style={{ color: "#0D2138", fontSize: "0.9rem" }}>
                    {messageLabel}
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    className="w-full rounded-xl py-3 ps-4 pe-4 outline-none resize-none"
                    style={{
                      background: "#F0F6FC",
                      border:     "1.5px solid #C9DDEF",
                      color:      "#0D2138",
                      fontSize:   "0.95rem",
                      fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                    }}
                  />
                </div>

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
        </div>
      </div>
    </section>
  );
}

// ── Puck config ────────────────────────────────────────────────

export const ContactWithMapConfig: ComponentConfig<ContactWithMapProps> = {
  label: "تواصل — مع خريطة",
  fields: {
    heading:        { type: "text",     label: "العنوان" },
    subheading:     { type: "textarea", label: "النص التوضيحي" },
    address:        { type: "textarea", label: "العنوان" },
    phone:          { type: "text",     label: "رقم الهاتف" },
    email:          { type: "text",     label: "البريد الإلكتروني" },
    workingHours:   { type: "text",     label: "ساعات العمل" },
    mapEmbedUrl:    { type: "text",     label: "رابط تضمين خريطة Google" },
    nameLabel:      { type: "text",     label: "تسمية حقل الاسم" },
    emailLabel:     { type: "text",     label: "تسمية حقل البريد" },
    messageLabel:   { type: "text",     label: "تسمية حقل الرسالة" },
    submitLabel:    { type: "text",     label: "نص زر الإرسال" },
    submitEndpoint: { type: "text",     label: "رابط الإرسال (اتركه فارغاً للعرض التوضيحي)" },
  },
  defaultProps: {
    heading:        "موقعنا وتواصل معنا",
    subheading:     "زورونا أو تواصلوا معنا عبر القنوات التالية",
    address:        "طريق الملك فهد، حي العليا، الرياض 12211",
    phone:          "0114567890",
    email:          "info@example.com",
    workingHours:   "الأحد – الخميس: 9 صباحاً – 6 مساءً",
    mapEmbedUrl:    "",
    nameLabel:      "الاسم الكامل",
    emailLabel:     "البريد الإلكتروني",
    messageLabel:   "رسالتك",
    submitLabel:    "أرسل",
    submitEndpoint: "",
  },
  render: (props) => <ContactWithMapBlock {...props} />,
};
