import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#161616',
        card: '#1d1d1d',
        border: '#292929',
        button: '#1e5634',
        'button-border': '#2f784d',
      },
    },
  },
  plugins: [],
}
export default config
