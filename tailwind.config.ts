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
        primary: "#8c30e8",
        "primary-light": "#a855f7",
        "primary-dark": "#7c3aed",
        "background-light": "#f7f6f8",
        "background-dark": "#191121",
        "user-bubble": "#ffebd9",
        "card-light": "#ffffff",
        "card-dark": "#1f1629",
        "border-light": "#ede7f3",
        "border-dark": "#2d2138",
        "text-primary": "#140e1b",
        "text-secondary": "#734e97",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
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
        "primary-sm": "0 4px 14px 0 rgba(140, 48, 232, 0.15)",
        "primary-lg": "0 10px 40px 0 rgba(140, 48, 232, 0.2)",
        soft: "0 2px 8px 0 rgba(0, 0, 0, 0.04)",
        "soft-lg": "0 4px 16px 0 rgba(0, 0, 0, 0.08)",
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
