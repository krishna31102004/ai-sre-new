/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#090e1b",
        panel: "#101827",
        line: "#263249",
      },
    },
  },
  plugins: [],
};
