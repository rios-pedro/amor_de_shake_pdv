/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f6e9ae",
          100: "#f5df7c",
          200: "#eed667",
          300: "#e8cd56",
          400: "#e0be25",
          500: "#dcb509",
          600: "#c9a60d",
          700: "#b19310",
          900: "#8f7916",
        },
      },
    },
  },
  plugins: [],
}
