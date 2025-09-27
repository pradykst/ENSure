import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2962FF',
        secondary: '#651FFF',
        accent: '#00E5FF',
        dark: '#1A1A2E',
        bg: '#FFFFFF',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg,#2962FF 0%,#651FFF 100%)',
      },
      boxShadow: { brand: '0 8px 24px rgba(41,98,255,0.18)' },
      borderRadius: { xl: '12px', '2xl': '16px' },
    },
  },
  plugins: [],
} satisfies Config;
