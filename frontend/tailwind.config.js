import { COLORS } from './src/constants/colors.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { brand: COLORS },
      fontFamily: { display: ['Fredoka', 'ui-rounded', 'system-ui', 'sans-serif'] },
      boxShadow: { pop: '4px 4px 0 0 #141414', 'pop-sm': '3px 3px 0 0 #141414', soft: '0 6px 0 0 rgba(20,20,20,.9), 0 14px 22px rgba(20,20,20,.12)' },
    },
  },
  plugins: [],
};
