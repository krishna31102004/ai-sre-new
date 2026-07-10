/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0f172a",
        panel: "#172033",
        line: "#29364d",
      },
    },
  },
  plugins: [],
};
