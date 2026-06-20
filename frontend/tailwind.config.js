/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f4ff",
          100: "#e0eaff",
          500: "#4f6ef7",
          600: "#3b55e6",
          700: "#2d44cc",
          900: "#1a2a80",
        },
        yes:  { 500: "#22c55e", 600: "#16a34a", 100: "#dcfce7" },
        no:   { 500: "#ef4444", 600: "#dc2626", 100: "#fee2e2" },
        surface: "#0f1117",
        card:    "#181c26",
        border:  "#252a3a",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
