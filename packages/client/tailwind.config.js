/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: 'var(--tg-theme-bg-color)',
          'secondary-bg': 'var(--tg-theme-secondary-bg-color)',
          text: 'var(--tg-theme-text-color)',
          hint: 'var(--tg-theme-hint-color)',
          link: 'var(--tg-theme-link-color)',
          button: 'var(--tg-theme-button-color)',
          'button-text': 'var(--tg-theme-button-text-color)',
          accent: 'var(--tg-theme-accent-text-color)',
          header: 'var(--tg-theme-header-bg-color)',
          destructive: 'var(--tg-theme-destructive-text-color)',
        }
      },
      height: {
        screen: '100dvh',
      },
      minHeight: {
        screen: '100dvh',
      }
    },
  },
  plugins: [],
}
