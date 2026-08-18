import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        'brand-ink': 'rgb(var(--brand-ink) / <alpha-value>)',
        receita: 'rgb(var(--receita) / <alpha-value>)',
        despesa: 'rgb(var(--despesa) / <alpha-value>)',
        investimento: 'rgb(var(--investimento) / <alpha-value>)',
        alerta: 'rgb(var(--alerta) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI',
          'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
        num: [
          'ui-rounded', '-apple-system', 'SF Pro Rounded', 'Segoe UI',
          'Roboto', 'sans-serif',
        ],
      },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
        tab: '3.5rem',
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(.96) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up .28s cubic-bezier(.32,.72,0,1)',
        'fade-in': 'fade-in .18s ease-out',
        'pop-in': 'pop-in .18s cubic-bezier(.32,.72,0,1)',
      },
    },
  },
  plugins: [],
}

export default config
