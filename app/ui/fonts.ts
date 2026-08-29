import { Inter } from 'next/font/google';

/**
 * One typeface for the whole panel.
 *
 * Lusitana — a display serif — used to carry every page title, the breadcrumbs,
 * the dashboard metric figures and the "Pedidos recientes" heading. On a tool
 * whose content is dense numeric tables that was a costume: it slowed the
 * headings down, it never once made a figure easier to read, and it was the only
 * thing on the screen suggesting the panel and the storefront were the same kind
 * of surface. They are not — the shop is editorial, this is an instrument.
 *
 * Inter is a UI face with a large x-height and, more to the point here, real
 * tabular figures — which `global.css` turns on for every table in the panel.
 */
export const inter = Inter({ subsets: ['latin'] });
