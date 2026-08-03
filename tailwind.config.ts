import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "primary-light": "rgb(var(--color-primary-light) / <alpha-value>)",
        "primary-dark": "rgb(var(--color-primary-dark) / <alpha-value>)",
        "background-light": "rgb(var(--color-canvas) / <alpha-value>)",
        "background-dark": "rgb(var(--color-canvas-dark) / <alpha-value>)",
        "bg-light": "rgb(var(--color-canvas) / <alpha-value>)",
        "bg-dark": "rgb(var(--color-canvas-dark) / <alpha-value>)",
        "user-bubble": "rgb(var(--color-user-bubble) / <alpha-value>)",
        "card-light": "rgb(var(--color-surface) / <alpha-value>)",
        "card-dark": "rgb(var(--color-surface-dark) / <alpha-value>)",
        "border-light": "rgb(var(--color-border) / <alpha-value>)",
        "border-dark": "rgb(var(--color-border-dark) / <alpha-value>)",
        "text-primary": "rgb(var(--color-ink) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-muted) / <alpha-value>)",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      fontFamily: {
        display: [
          "Manrope",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
        "18": "4.5rem",
        "22": "5.5rem",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        full: "9999px",
      },
      boxShadow: {
        "primary-sm": "0 6px 18px rgba(255, 0, 255, 0.18)",
        "primary-lg": "0 18px 44px rgba(255, 0, 255, 0.22)",
        soft: "0 1px 2px rgba(30, 22, 42, 0.04), 0 6px 24px rgba(30, 22, 42, 0.05)",
        "soft-lg": "0 2px 4px rgba(30, 22, 42, 0.04), 0 20px 48px rgba(30, 22, 42, 0.09)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
      },
      minHeight: {
        touch: "44px",
        "screen-safe":
          "calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
      },
      minWidth: {
        touch: "44px",
      },
      maxWidth: {
        container: "1200px",
        content: "720px",
        prose: "65ch",
      },
      screens: {
        xs: "375px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "fade-in-up": "fadeInUp 0.4s ease-out forwards",
        "slide-in-right": "slideInRight 0.3s ease-out forwards",
        "slide-in-left": "slideInLeft 0.3s ease-out forwards",
        "bounce-gentle": "bounceGentle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        bounceGentle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
