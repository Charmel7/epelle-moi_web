/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Palette Épelle-Moi — noir/blanc strict comme l'original Flutter
        'em-black': '#000000',
        'em-white': '#ffffff',
        'em-surface': '#0a0a0a',
        'em-border': 'rgba(255,255,255,0.12)',
      },
      animation: {
        'shake': 'shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both',
        'pulse-once': 'pulseOnce 0.6s ease-in-out',
        'fade-in': 'fadeIn 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
