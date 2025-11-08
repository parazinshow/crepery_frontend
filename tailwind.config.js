/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{vue,js}",
    "./layouts/**/*.{vue,js}",
    "./pages/**/*.{vue,js}",
    "./app.{vue,js}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: '#0ea5e9',
      },
    },
  },
  plugins: [
  ],
}