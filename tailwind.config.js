/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 深绿毛毡主色
        felt: {
          DEFAULT: '#1a472a',
          dark: '#12351f',
          deeper: '#0d2817',
          light: '#245c38',
        },
        // 金色点缀
        gold: {
          DEFAULT: '#d4af37',
          light: '#e8cf6d',
          dark: '#a8862a',
        },
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,.4)',
      },
    },
  },
  plugins: [],
}
