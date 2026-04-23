/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
      fontFamily: {
        sans: ['"Canva Sans"', '"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        'bradesco-red': '#cc092f',
        'bradesco-purple': '#7d046d',
        'bradesco-purple-dark': '#cc092f'
      }
    },
  },
  plugins: [],
}
