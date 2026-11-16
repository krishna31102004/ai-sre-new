/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        elevated: "rgb(var(--color-elevated) / <alpha-value>)",
        line: "rgb(var(--color-ink) / 0.08)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        healthy: "rgb(var(--color-healthy) / <alpha-value>)",
        firing: "rgb(var(--color-firing) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          2: "rgb(var(--color-ink) / 0.64)",
          3: "rgb(var(--color-ink) / 0.42)",
        },
      },
      screens: {
        nav: "900px",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.23, 1, 0.32, 1)",
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", '"Times New Roman"', "serif"],
        sans: ["Geist", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        display: ["clamp(36px, 4.4vw, 64px)", { lineHeight: "0.98", letterSpacing: "-0.01em" }],
        h1: ["44px", { lineHeight: "48px", letterSpacing: "-0.01em" }],
        "h1-m": ["34px", { lineHeight: "38px", letterSpacing: "-0.01em" }],
        h2: ["28px", { lineHeight: "34px", letterSpacing: "-0.01em" }],
        "h2-m": ["24px", { lineHeight: "30px", letterSpacing: "-0.01em" }],
        h3: ["20px", { lineHeight: "26px", letterSpacing: "-0.01em" }],
        lead: ["17px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        "lead-m": ["16px", { lineHeight: "26px", letterSpacing: "-0.01em" }],
        body: ["14px", { lineHeight: "22px", letterSpacing: "0" }],
        small: ["13px", { lineHeight: "20px", letterSpacing: "0" }],
        label: ["12px", { lineHeight: "16px", letterSpacing: "0" }],
        data: ["13px", { lineHeight: "20px", letterSpacing: "0" }],
        "data-sm": ["12px", { lineHeight: "16px", letterSpacing: "0" }],
        "data-lg": ["24px", { lineHeight: "30px", letterSpacing: "-0.02em" }],
        "data-lg-m": ["22px", { lineHeight: "28px", letterSpacing: "-0.02em" }],
        "data-xl": ["44px", { lineHeight: "48px", letterSpacing: "-0.03em" }],
        "data-xl-m": ["40px", { lineHeight: "44px", letterSpacing: "-0.03em" }],
        "data-hero": ["clamp(64px, 11vw, 128px)", { lineHeight: "1", letterSpacing: "-0.04em" }],
      },
      borderRadius: {
        glass: "0.625rem",
      },
      boxShadow: {
        glow: "0 0 28px rgba(255, 106, 61, 0.18)",
        lift: "0 18px 48px rgba(0, 0, 0, 0.28)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 180ms ease-out",
        "accordion-up": "accordion-up 180ms ease-out",
      },
    },
  },
  plugins: [],
};
