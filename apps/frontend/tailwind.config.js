/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        elevated: "rgb(var(--color-elevated) / <alpha-value>)",
        line: "rgb(255 255 255 / calc(0.07 * <alpha-value>))",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        healthy: "rgb(var(--color-healthy) / <alpha-value>)",
        firing: "rgb(var(--color-firing) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          2: "rgb(var(--color-ink-2) / <alpha-value>)",
          3: "rgb(var(--color-ink-3) / <alpha-value>)",
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
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
      },
      borderRadius: {
        glass: "0.625rem",
      },
      boxShadow: {
        glow: "0 0 28px rgba(76, 141, 255, 0.18)",
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
