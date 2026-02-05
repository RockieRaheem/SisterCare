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
        "background-light": "#f7f6f8",
        "background-dark": "#191121",
        "user-bubble": "#ffebd9",
        "card-light": "#ffffff",
        "card-dark": "#1f1629",
        "border-light": "#ede7f3",
        "border-dark": "#2d2138",
        "text-primary": "#140e1b",
        "text-secondary": "#734e97",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        "primary-sm": "0 4px 14px 0 rgba(140, 48, 232, 0.15)",
        "primary-lg": "0 10px 40px 0 rgba(140, 48, 232, 0.2)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
