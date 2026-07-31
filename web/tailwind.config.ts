import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#F5F2E8', 50: '#FBFAF5', 100: '#F5F2E8', 200: '#EAE4D3', 300: '#DCD3BC' },
        ink: { DEFAULT: '#14110C', 700: '#2A251C', 500: '#4B4437', 300: '#7C7466' },
        ember: { DEFAULT: '#C2571F', 600: '#A8481A', 400: '#DE7A44', 100: '#F6E3D6' },
        moss: { DEFAULT: '#3F4A34', 400: '#5C6A4C', 100: '#E4E8DD' },
        night: { DEFAULT: '#0E0C09', 800: '#171410', 700: '#211D17', 600: '#2E2921' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: { xl: '14px', '2xl': '20px', '3xl': '28px' },
      boxShadow: {
        soft: '0 1px 2px rgba(20,17,12,.04), 0 8px 24px -12px rgba(20,17,12,.12)',
        lift: '0 18px 48px -24px rgba(20,17,12,.35)',
        glass: 'inset 0 1px 0 rgba(255,255,255,.35), 0 24px 64px -32px rgba(0,0,0,.6)',
      },
      keyframes: {
        'door-left': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-102%)' } },
        'door-right': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(102%)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        'pulse-ring': { '0%': { transform: 'scale(.8)', opacity: '.7' }, '100%': { transform: 'scale(1.8)', opacity: '0' } },
      },
      animation: {
        'door-left': 'door-left 1.4s cubic-bezier(.22,1,.36,1) forwards',
        'door-right': 'door-right 1.4s cubic-bezier(.22,1,.36,1) forwards',
        shimmer: 'shimmer 1.8s infinite',
        float: 'float 5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
