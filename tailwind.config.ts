import type { Config } from 'tailwindcss';

const config: Config = {
  /**
   * `modules/**` is the important entry here, and its absence was a real bug.
   *
   * Most of the admin's UI does not live under `app/` — the tables, the status
   * badges, the forms and the dashboard lists are all in `modules/<dominio>/components`
   * — and none of that was ever scanned. Any utility used *only* there was
   * silently dropped from the stylesheet, so the class was in the markup and the
   * rule was not in the CSS.
   *
   * What that cost, measured against the generated sheet: every status badge
   * background (`bg-green-100`, `bg-amber-100`, `bg-red-100`, `bg-blue-100`,
   * `bg-orange-100`, `bg-purple-100`), the form error borders (`border-red-200`),
   * `focus:ring-2` on module inputs, `overflow-x-auto` on the tables that need
   * to scroll on a phone, `md:grid-cols-2` on the forms, `object-cover`,
   * `cursor-pointer` and `font-semibold`. Order status, product status and stock
   * level — the three things this panel exists to communicate at a glance — were
   * rendering as unstyled text.
   *
   * `lib/**` is included for the same reason: it is on the same side of the line
   * and a helper that returns a class name would fail the same way.
   */
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './modules/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /**
       * Semantic tokens for the admin.
       *
       * Declared once as RGB triplets in `app/ui/global.css` and referenced here,
       * so a value can never drift between the two files — the same arrangement
       * the storefront uses.
       *
       * These are roles, not colours. `bg-surface` says "this is a raised
       * working surface"; `bg-gray-50` said only "this is a grey", which is how
       * the panel ended up with three different greys doing the job of one.
       */
      colors: {
        /** The page ground. Everything the operator reads sits on this. */
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        /** A working surface lifted off the canvas: tables, panels, cards. */
        surface: 'rgb(var(--surface) / <alpha-value>)',
        /** Recessed: table headers, toolbars, the sunken half of a control. */
        subtle: 'rgb(var(--subtle) / <alpha-value>)',

        /** Primary text. */
        ink: 'rgb(var(--ink) / <alpha-value>)',
        /** Secondary text: column labels, hints, units, timestamps. */
        'ink-muted': 'rgb(var(--ink-muted) / <alpha-value>)',
        /** Tertiary: placeholders, disabled, decorative separators. */
        'ink-subtle': 'rgb(var(--ink-subtle) / <alpha-value>)',

        /** A divider. WCAG asks nothing of it, so it stays a hairline. */
        line: 'rgb(var(--line) / <alpha-value>)',
        /** The boundary of an interactive control — under the 3:1 floor. */
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',

        /**
         * Status. Four roles, each with a solid ink value and a soft background,
         * so a badge never has to invent a pair.
         */
        ok: 'rgb(var(--ok) / <alpha-value>)',
        'ok-soft': 'rgb(var(--ok-soft) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        'warn-soft': 'rgb(var(--warn-soft) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        'danger-soft': 'rgb(var(--danger-soft) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
        'info-soft': 'rgb(var(--info-soft) / <alpha-value>)',

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
         *
         * In the panel the green is an *accent*, not a surface: primary action,
         * active navigation, focus ring. A tool someone reads for eight hours
         * should be neutral; the brand's job here is to say which button
         * commits.
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
      /** The one shadow the panel uses, for surfaces that genuinely float. */
      boxShadow: {
        pop: '0 8px 28px rgb(15 26 26 / 0.12)',
      },

      /** Still used by the revenue-chart skeleton in `app/ui/skeletons.tsx`. */
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },

      /*
       * `keyframes` used to be declared at `theme` level rather than inside
       * `extend`, which REPLACED Tailwind's defaults instead of adding to them.
       * The generated sheet held exactly one `@keyframes` block — `shimmer` — so
       * `animate-spin` emitted an `animation` property naming a `spin` animation
       * that did not exist, and the upload spinner in the image picker has never
       * turned. Here it adds rather than replaces.
       */
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;
