/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html','./src/**/*.{ts,tsx,js,jsx}'],
    theme: {
      extend: {
        colors: {
          bg: '#0B1220', panel: 'rgba(255,255,255,0.05)', ink: '#E8EEF6',
          card: 'rgba(255,255,255,0.06)', accent: '#3EF08E'
        },
      },
    },
    plugins: [],
  }
