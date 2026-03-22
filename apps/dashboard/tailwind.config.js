/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#5b9bd5",
          dark: "#1a1a2e",
          accent: "#f59e0b",
          light: "#e8f0fa",
          50: "#EBF3FB",
          100: "#D6E7F7",
          200: "#ADCFEF",
          300: "#85B7E7",
          400: "#5b9bd5",
          500: "#4a8ac4",
          600: "#3979B3",
          700: "#2d6a9f",
          800: "#1a1a2e",
          900: "#0f0f1a",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "Tajawal", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in-up": "fadeInUp 0.7s ease forwards",
        "fade-in": "fadeIn 0.6s ease forwards",
        "slide-up": "slideUp 0.5s ease forwards",
        "counter": "counter 1.5s ease forwards",
        "orbit-slow": "orbit 20s linear infinite",
        "orbit-medium": "orbit 14s linear infinite",
        "orbit-fast": "orbit 9s linear infinite",
        "orbit-reverse": "orbitReverse 18s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        orbitReverse: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(-360deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
