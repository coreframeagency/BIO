/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#1D1D1B',
          shell: '#EAE4DA',
          green: '#245E55',
          greenDark: '#1a4740',
          greenLight: '#e8f2f0',
          lavender: '#808BC5',
          mustard: '#EAC119',
          sky: '#9ED6DF',
          pink: '#EAA7C7',
          tangerine: '#ED773C',
          red: '#C63F3E',
        },
        ui: {
          bg: '#EAE4DA',
          surface: '#FFFFFF',
          border: '#D4CEC6',
          muted: '#8B8580',
          subtle: '#F5F2EE',
        },
      },
      fontFamily: {
        serif: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
