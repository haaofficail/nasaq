/**
 * HeroVideo Block — Page Builder v2
 *
 * Source reference: shadcnblocks.com/blocks/hero (Cinematic Video Hero)
 * Adapted for: RTL, IBM Plex Sans Arabic, ترميز OS CSS variables, no emojis
 *
 * Design: Cinematic Immersive — full-bleed video background with a diagonal
 * brand-tinted gradient, bold Arabic typography, and optional mute control.
 *
 * Video policy compliance:
 *   - autoPlay + muted  → required by Chrome/Safari for silent autoplay
 *   - playsInline       → required by iOS to prevent fullscreen takeover
 *   - preload="metadata" → loads only metadata (duration/dimensions), not full video
 *   - poster            → shown before video loads (acts as fallback on slow connections)
 *
 * Accessibility:
 *   - aria-label on video element
 *   - prefers-reduced-motion: video marked with data attribute; JS pauses it
 *   - muteToggle button has aria-label
 *
 * RTL compliance:
 *   - dir="rtl" on root
 *   - ps-/pe- logical padding (never pl-/pr-)
 *   - alignment: right→text-start/items-start, left→text-end/items-end, center→text-center/items-center
 */

import React, { useRef, useState, useEffect } from "react";
import type { ComponentConfig } from "@measured/puck";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HeroVideoProps {
  heading:        string;
  subheading:     string;
  ctaText:        string;
  ctaLink:        string;
  videoUrl:       string;
  posterUrl?:     string;
  overlayOpacity: number;                       // 0–100
  overlayColor:   "black" | "brand" | "none";
  alignment:      "right" | "center" | "left";
  muteToggle:     boolean;
}

// ── Maps ───────────────────────────────────────────────────────────────────────

const ALIGN_CLASSES: Record<HeroVideoProps["alignment"], string> = {
  right:  "text-start items-start",
  center: "text-center items-center",
  left:   "text-end items-end",
};

const OVERLAY_BG: Record<HeroVideoProps["overlayColor"], string> = {
  black: "rgba(0, 0, 0, 1)",
  brand: "var(--color-primary, #5b9bd5)",
  none:  "transparent",
};

// ── Component ──────────────────────────────────────────────────────────────────

export function HeroVideoBlock({
  heading,
  subheading,
  ctaText,
  ctaLink,
  videoUrl,
  posterUrl = "",
  overlayOpacity,
  overlayColor,
  alignment,
  muteToggle,
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const overlayValue = Math.min(100, Math.max(0, overlayOpacity)) / 100;
  const alignClass   = ALIGN_CLASSES[alignment];

  // ── Detect prefers-reduced-motion ──────────────────────────────────────────
  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mediaQuery?.matches) {
      setReducedMotion(true);
      try {
        videoRef.current?.pause();
      } catch {
        // jsdom doesn't implement HTMLMediaElement.pause()
      }
    }
  }, []);

  // ── Ensure muted property is set imperatively (React limitation) ───────────
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
    }
  }, []);

  // ── Mute toggle handler ────────────────────────────────────────────────────
  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section
      dir="rtl"
      data-reduced-motion={reducedMotion ? "true" : undefined}
      className="relative w-full overflow-hidden"
      style={{
        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
        minHeight: "clamp(480px, 65vw, 780px)",
      }}
    >
      {/* ── Video / Fallback background ──────────────────────────────────── */}
      {videoUrl ? (
        <video
          ref={videoRef}
          data-video=""
          src={videoUrl}
          poster={posterUrl || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="فيديو الخلفية"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        />
      ) : (
        /* Fallback gradient when no video set */
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #0D2138 0%, #2F6190 40%, #5b9bd5 100%)",
          }}
        />
      )}

      {/* ── Overlay ──────────────────────────────────────────────────────── */}
      <div
        data-overlay=""
        data-overlay-color={overlayColor}
        className="absolute inset-0"
        style={{
          opacity:    overlayValue,
          background: OVERLAY_BG[overlayColor],
        }}
      />

      {/* ── Cinematic diagonal gradient — brand tint from bottom ─────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.25) 45%, transparent 75%), " +
            "linear-gradient(135deg, color-mix(in srgb, var(--color-primary, #5b9bd5) 18%, transparent) 0%, transparent 50%)",
        }}
      />

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div
        data-content=""
        className={`relative z-10 flex flex-col gap-6 ps-8 pe-8 py-20 md:ps-16 md:pe-16 md:py-32 max-w-5xl mx-auto w-full justify-end h-full ${alignClass} text-white`}
        style={{ minHeight: "inherit" }}
      >
        {/* Heading */}
        <h1
          className="font-bold tracking-tight"
          style={{
            fontSize:      "clamp(2.2rem, 5.5vw, 4.5rem)",
            lineHeight:    "1.08",
            letterSpacing: "-0.025em",
            textShadow:    "0 2px 24px rgba(0,0,0,0.45)",
          }}
        >
          {heading}
        </h1>

        {/* Subheading */}
        <p
          className="max-w-xl leading-relaxed text-white/85"
          style={{
            fontSize:   "clamp(0.95rem, 2vw, 1.2rem)",
            lineHeight: "1.85",
          }}
        >
          {subheading}
        </p>

        {/* CTA */}
        {ctaText && (
          <a
            href={ctaLink || "#"}
            className="inline-flex items-center justify-center self-auto rounded-xl px-8 py-3.5 text-base font-bold text-white transition-all duration-200 active:scale-[0.98]"
            style={{
              width:      "fit-content",
              background: "var(--color-primary, #5b9bd5)",
              boxShadow:  "0 4px 28px color-mix(in srgb, var(--color-primary, #5b9bd5) 45%, transparent)",
            }}
          >
            {ctaText}
          </a>
        )}
      </div>

      {/* ── Mute toggle ──────────────────────────────────────────────────── */}
      {muteToggle && (
        <button
          data-mute-toggle=""
          onClick={handleMuteToggle}
          aria-label={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
          className="absolute bottom-6 start-6 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white transition-all duration-200 hover:bg-black/60"
        >
          {/* Speaker icon — CSS-only, no emoji */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
            aria-hidden="true"
          >
            {isMuted ? (
              /* Muted: speaker with X */
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </>
            ) : (
              /* Unmuted: speaker with waves */
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </>
            )}
          </svg>
        </button>
      )}
    </section>
  );
}

// ── Puck Component Config ──────────────────────────────────────────────────────

export const HeroVideoConfig: ComponentConfig<HeroVideoProps> = {
  label: "Hero — فيديو خلفية",
  fields: {
    heading: {
      type: "text",
      label: "العنوان الرئيسي",
    },
    subheading: {
      type: "textarea",
      label: "النص الوصفي",
    },
    ctaText: {
      type: "text",
      label: "نص الزر",
    },
    ctaLink: {
      type: "text",
      label: "رابط الزر",
    },
    videoUrl: {
      type: "text",
      label: "رابط الفيديو (MP4)",
    },
    posterUrl: {
      type: "text",
      label: "صورة الـ Poster (Fallback)",
    },
    overlayOpacity: {
      type: "number",
      label: "شفافية الطبقة (0–100)",
      min: 0,
      max: 100,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    overlayColor: {
      type: "select",
      label: "لون الطبقة",
      options: [
        { value: "black", label: "أسود" },
        { value: "brand", label: "لون البراند" },
        { value: "none",  label: "بدون لون" },
      ],
    },
    alignment: {
      type: "select",
      label: "محاذاة النص",
      options: [
        { value: "right",  label: "يمين" },
        { value: "center", label: "وسط" },
        { value: "left",   label: "يسار" },
      ],
    },
    muteToggle: {
      type: "radio",
      label: "زر كتم الصوت",
      options: [
        { value: true,  label: "إظهار" },
        { value: false, label: "إخفاء" },
      ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  },
  defaultProps: {
    heading:        "قصة منتجاتنا في حركة",
    subheading:     "اكتشف جودة المنتجات عبر تجربة بصرية استثنائية",
    ctaText:        "شاهد المزيد",
    ctaLink:        "#",
    videoUrl:       "",
    posterUrl:      "",
    overlayOpacity: 40,
    overlayColor:   "black",
    alignment:      "center",
    muteToggle:     false,
  },
  render: (props) => <HeroVideoBlock {...props} />,
};
