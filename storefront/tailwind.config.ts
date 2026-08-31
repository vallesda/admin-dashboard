import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Colours are declared once as CSS custom properties in globals.css and
      // referenced here, so a token can never drift between the two files.
      colors: {
        brand: 'rgb(var(--brand) / <alpha-value>)',
        'brand-dark': 'rgb(var(--brand-dark) / <alpha-value>)',
        'brand-soft': 'rgb(var(--brand-soft) / <alpha-value>)',
        /*
         * Los cuatro suelos del manual. No hay `gold`: ese color no existe en
         * la identidad — se había deducido muestreando un PNG.
         */
        turquoise: 'rgb(var(--turquoise) / <alpha-value>)',
        coral: 'rgb(var(--coral) / <alpha-value>)',
        scarlet: 'rgb(var(--scarlet) / <alpha-value>)',
        sun: 'rgb(var(--sun) / <alpha-value>)',
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        sand: 'rgb(var(--sand) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: { container: '1360px' },
      // The system's one easing curve, so a component cannot invent its own.
      // Declared in globals.css and referenced here for the same reason the
      // colours are: one value, two consumers, no drift.
      transitionTimingFunction: { board: 'var(--ease-out-expo)' },
      // `sm` is declared explicitly so it stops falling through to
      // Tailwind's 2px default while `--radius-sm` sat unused in globals.css.
      borderRadius: { sm: '2px', DEFAULT: '4px', md: '6px', lg: '8px' },
    },
  },
  plugins: [],
};

export default config;
