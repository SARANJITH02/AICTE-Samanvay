/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aicte: {
          navy: '#0c2340',
          blue: '#1a4480',
          light: '#e1f3f8',
          accent: '#d9381e',
          gold: '#c2850c'
        }
      }
    },
  },
  plugins: [],
}
