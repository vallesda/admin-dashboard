import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
      colors: {
        /**
         * Brand palette, built around the company green #024F55.
         *
         * Named `brand`, not `blue`: redefining `blue` would have been a
         * one-line change, but every `bg-blue-600` in the codebase would then
         * render green, and the next person to read it would not believe their
         * eyes.
         *
         * The ramp holds hue ~184° and drops saturation as it lightens, so the
         * light steps read as the same colour rather than as washed-out cyan.
         * 600 is the exact brand value; lighter steps are for hover and for the
         * active-link state.
         */
        brand: {
          50: '#F0F9F9',
          100: '#DAEFF1',
          300: '#59B9C0',
          400: '#258C93',
          500: '#096A71',
          600: '#024F55',
          700: '#01383C',
        },
      },
    },
    keyframes: {
      shimmer: {
        '100%': {
          transform: 'translateX(100%)',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;
