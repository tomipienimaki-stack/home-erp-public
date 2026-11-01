/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      colors: {
        cream: {
          50:  '#FBF8F2',
          100: '#F5EFE3',
          200: '#EBE0CC',
        },
        forest: {
          50:  '#EEF3EF',
          100: '#D4E1D6',
          400: '#5A8068',
          500: '#3F6650',
          600: '#2D4A3E',
          700: '#1F362C',
        },
        terracotta: {
          50:  '#FBEEE7',
          100: '#F4D6C5',
          400: '#D89274',
          500: '#C97B5A',
          600: '#A95E40',
        },
        sun: {
          100: '#FBEFC2',
          400: '#E9B949',
          500: '#D49E1F',
        },
        ink: {
          500: '#5B5B57',
          700: '#3A3A37',
          900: '#1E1E1C',
        },
      },
      boxShadow: {
        soft: '0 6px 24px -8px rgba(45, 74, 62, 0.18)',
        glow: '0 0 0 6px rgba(201, 123, 90, 0.15)',
        inner: 'inset 0 1px 2px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
