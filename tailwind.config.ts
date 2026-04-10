import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        object: 'var(--color-object)',
        utility: 'var(--color-utility)',
        'utility-2': 'var(--color-utility-2)',
        border: 'var(--color-border)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          dark: 'var(--color-accent-dark)',
          darker: 'var(--color-accent-darker)',
        },
        foreground: {
          DEFAULT: 'var(--color-foreground)',
          muted: 'var(--color-foreground-muted)',
          subtle: 'var(--color-foreground-subtle)',
        },
        destructive: 'var(--color-destructive)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
      },
      spacing: {
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
      },
      borderRadius: {
        sm: '16px',
        md: '20px',
        lg: '24px',
      },
      transitionDuration: {
        fast: '120ms',
        standard: '180ms',
        slow: '240ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
        enter: 'cubic-bezier(0, 0, 0.2, 1)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
