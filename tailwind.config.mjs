/** @type {import('tailwindcss').Config} */
// Design tokens aligned with V5 (Lovable site `ma-papeterie.lovable.app`).
// Extracted from V5's compiled CSS on 2026-05-01. The previous "STRICTLY
// identical to v5" comment was wishful — V1 was running a navy+orange
// palette while V5 was actually navy+gold. Phase 5.1 closes that gap.
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // V5 --primary: 215 85% 35% navy blue. Brand colour, used for
        // headings, nav links, primary CTAs.
        primary: {
          DEFAULT: '#0e3675',
          light: '#1d52a3', // --primary-light 215 75% 45%
          dark: '#0a2a5e', // --primary-dark 215 90% 25%
          glow: '#1359ae', // --primary-glow 215 85% 50%
          50: 'rgba(14, 54, 117, 0.04)',
          100: 'rgba(14, 54, 117, 0.08)',
          300: 'rgba(14, 54, 117, 0.3)',
          400: 'rgba(14, 54, 117, 0.4)',
        },
        // V5 --accent: 45 95% 65% golden yellow. Secondary CTA, badges,
        // attention-grabbers.
        accent: {
          DEFAULT: '#facc15',
          hover: '#eab308',
          light: '#fde047', // --accent-light 45 90% 75%
          dark: '#f5b800', // --accent-dark 45 98% 55%
        },
        // Foreground / background neutral pair. V5 picks a slight blue tint
        // on text (215 25% 15%) rather than pure black.
        foreground: '#1f2937',
        'bg-soft': '#fafafa',
        border: '#dde1e6', // V5 --border 220 15% 88%
        success: '#16a34a',
        danger: '#dc2626',
      },
      fontFamily: {
        // V5 ships Poppins everywhere; we used to split display/body across
        // Poppins+Inter. Aligning means dropping Inter from the bundle.
        display: ['Poppins', 'sans-serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1rem',
        badge: '0.4rem',
        btn: '0.5rem',
      },
      boxShadow: {
        // V5 --shadow-card uses the foreground tint at low opacity.
        card: '0 2px 16px -4px rgba(31, 41, 55, 0.10)',
        'card-hover': '0 10px 30px -10px rgba(14, 54, 117, 0.30)',
      },
      letterSpacing: {
        label: '0.08em',
      },
    },
  },
  plugins: [forms, typography],
};
