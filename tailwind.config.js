/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
      },
      colors: {
        discord: {
          sidebar:  '#05060E',
          channels: '#0A0D1D',
          chat:     '#070919',
          input:    '#111528',
          text:     '#D4D8EE',
          muted:    '#5E6788',
          blurple:  '#F5A825',
          green:    '#34D49B',
          yellow:   '#F5C842',
          red:      '#F07070',
          gray:     '#3E4A65',
          hover:    '#0D1027',
          active:   '#13183A',
        },
      },
      boxShadow: {
        'amber-glow': '0 0 20px 4px rgba(245, 168, 37, 0.22)',
        'amber-sm':   '0 0 10px 2px rgba(245, 168, 37, 0.14)',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.45' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 2.4s ease-in-out infinite',
        'slide-up':  'slide-up 0.18s ease-out both',
      },
    },
  },
  plugins: [],
}
