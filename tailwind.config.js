/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',

    './app.vue',
    './components/**/*.{vue,js,ts}',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './error.vue',

    './node_modules/flowbite/**/*.js',
    './node_modules/flowbite-vue/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Colors Shana gave me as example
        // given: {
        //   'base-beige': '#fcefd3',
        //   'highlights-brown': '#e2a165',
        //   'blush-pink': '#ffebeb',
        //   blue: '#112f69',
        //   'background-1': '#F5EEE6',
        //   'background-2': '#FAF2EB',
        //   'background-3': '#FAF6F0',
        //   'background-4': '#FFF3EF',
        //   'text-1': '#3B2F2F',
        //   'text-2': '#4E2E1E',
        // },
        primary: {
          50: '#FFF3EF',
          100: '#EBDDD8',
          200: '#D8C7C1',
          300: '#C4B1A9',
          400: '#B09B92',
          500: '#9D867B',
          600: '#897064',
          700: '#755A4C',
          800: '#624435',
          900: '#4E2E1E',
        },
      },
      fontFamily: {
        abhaya: ['"Abhaya Libre"', 'serif'],
        alice: ['"Alice"', 'serif'],
        garamond: ['"EB Garamond"', 'serif'],
      },
    },
  },
  plugins: [require('flowbite/plugin')],
}
