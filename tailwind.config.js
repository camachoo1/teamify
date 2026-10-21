/** @type {import('tailwindcss').Config} */

// Colors are CSS variables (see src/index.css) so light and dark themes
// share one set of class names
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        surface: token('surface'),
        sunk: token('sunk'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        accent: token('accent'),
        'accent-ink': token('accent-ink'),
        gold: token('gold'),
        ok: token('ok'),
        bad: token('bad'),
        // Kept as an alias so older class names follow the theme
        primary: token('accent'),
      },
      fontFamily: {
        display: [
          '"Big Shoulders Display"',
          '"Arial Narrow"',
          'Impact',
          'sans-serif',
        ],
        sans: [
          'Figtree',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
      },
      borderRadius: {
        panel: '22px',
      },
      animation: {
        deal: 'deal 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-in': 'fadeIn 0.2s ease-out both',
      },
      keyframes: {
        deal: {
          '0%': { transform: 'translateY(14px) rotate(-1.5deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
