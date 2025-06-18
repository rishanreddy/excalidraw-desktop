/** @type {import('tailwindcss/tailwind-config')} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
        colors: {
            primary: {
              DEFAULT: 'var(--color-primary)',
              darker: 'var(--color-primary-darker)',
              darkest: 'var(--color-primary-darkest)',
              light: 'var(--color-primary-light)'
            },
            bg: {
              primary: 'var(--bg-primary)',
              secondary: 'var(--bg-secondary)'
            },
            text: {
              primary: 'var(--text-primary)',
              secondary: 'var(--text-secondary)'
            },
            border: {
              DEFAULT: 'var(--border-color)'
            }
        }
    }
  },
  plugins: []
}
