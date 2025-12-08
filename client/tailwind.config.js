/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'do-first': {
          light: '#fef2f2',
          DEFAULT: '#ef4444',
          dark: '#b91c1c',
        },
        'schedule': {
          light: '#fefce8',
          DEFAULT: '#eab308',
          dark: '#a16207',
        },
        'delegate': {
          light: '#eff6ff',
          DEFAULT: '#3b82f6',
          dark: '#1d4ed8',
        },
        'eliminate': {
          light: '#f0fdf4',
          DEFAULT: '#22c55e',
          dark: '#15803d',
        },
      },
    },
  },
  plugins: [],
}
