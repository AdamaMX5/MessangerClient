/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          sidebar:  '#202225',
          channels: '#2F3136',
          chat:     '#36393F',
          input:    '#40444B',
          text:     '#DCDDDE',
          muted:    '#72767D',
          blurple:  '#5865F2',
          green:    '#3BA55C',
          yellow:   '#FAA61A',
          red:      '#ED4245',
          gray:     '#747F8D',
          hover:    '#34373C',
          active:   '#3C3F45',
        },
      },
    },
  },
  plugins: [],
}
