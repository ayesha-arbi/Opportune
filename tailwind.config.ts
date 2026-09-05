import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FBF4F4",
        surface: "#FFFFFF",
        "surface-soft": "#F5E9EA",
        "surface-muted": "#EDD9DB",
        "text-primary": "#241A1C",
        "text-secondary": "#4A3638",
        "text-tertiary": "#7A6062",
        "text-muted": "#A98D8F",
        "text-disabled": "#C9B3B4",
        accent: "#C98F97",
        "accent-soft": "#F0DCDF",
        "accent-dark": "#9E6870",
        success: "#5C7A66",
        "success-soft": "#E4EDE6",
        warning: "#A97C50",
        "warning-soft": "#F1E5D9",
        error: "#A65C5C",
        "error-soft": "#F3E0E0",
        app: {
          border: "rgba(36,26,28,0.08)",
          "border-strong": "rgba(36,26,28,0.15)",
        },
        tag: "#F3E4E6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument)", "Georgia", "serif"],
      },
      boxShadow: {
        small: "0 4px 16px rgba(36,26,28,0.04)",
        medium: "0 8px 32px rgba(36,26,28,0.06)",
      },
      maxWidth: {
        chat: "720px",
        onboard: "440px",
      },
    },
  },
  plugins: [],
};

export default config;
