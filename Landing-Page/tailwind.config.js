/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0E0905',
          800: '#1B1208',
          700: '#2A1E14',
          600: '#3B2C20',
        },
        sand: {
          50: '#FAF7F1',
          100: '#F4EFE8',
          200: '#EAE2D5',
          300: '#D9CDB9',
          400: '#B5A99B',
          500: '#5C544F',
        },
        peri: {
          50: '#EDEDFC',
          100: '#D8D9F8',
          200: '#B6B8F1',
          300: '#9495EB',
          400: '#7C7DF5',
          500: '#5E60E8',
          600: '#4F4FE5',
          700: '#3D3DC9',
        },
        cream: {
          50: '#FBF4E3',
          100: '#F8E9C9',
          200: '#F2D7A4',
          300: '#E5B86F',
          400: '#D29742',
        },
        leaf: {
          400: '#4ED178',
          500: '#22B561',
        },
        rose: {
          dark: '#7C2D2D',
          mid: '#9B3838',
          light: '#D86666',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      animation: {
        'shimmer': 'shimmer 8s linear infinite',
        'float': 'float 7s ease-in-out infinite',
        'float-slow': 'float 11s ease-in-out infinite',
        'breathe': 'breathe 5s ease-in-out infinite',
        'orbit': 'orbit 30s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.06)', opacity: '0.75' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
