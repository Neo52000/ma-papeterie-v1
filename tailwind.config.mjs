/** @type {import('tailwindcss').Config} */
// Design tokens STRICTLY identical to v5 — visual parity is a hard requirement.
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#121c2a',
          50: 'rgba(18, 28, 42, 0.04)',
          100: 'rgba(18, 28, 42, 0.08)',
          300: 'rgba(18, 28, 42, 0.3)',
          400: 'rgba(18, 28, 42, 0.4)',
        },
        accent: {
          DEFAULT: '#fd761a',
          hover: '#e8651a',
        },
        'bg-soft': '#fafaf9',
        border: '#e5e5e3',
        success: '#16a34a',
        danger: '#dc2626',
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1rem',
        badge: '0.4rem',
        btn: '0.5rem',
      },
      boxShadow: {
        card: '0 20px 40px rgba(18, 28, 42, 0.04)',
        'card-hover': '0 24px 48px rgba(18, 28, 42, 0.08)',
      },
      letterSpacing: {
        label: '0.08em',
      },
    },
  },
  plugins: [forms, typography],
};
