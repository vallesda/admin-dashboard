import type { Metadata } from 'next';
import { Newsreader, Instrument_Sans } from 'next/font/google';

import './globals.css';

/**
 * Two faces, two jobs.
 *
 * Newsreader carries the editorial voice — headlines, campaign copy. Instrument
 * Sans carries everything functional: prices, navigation, buttons. Keeping them
 * separate is what stops the storefront reading like a generic Tailwind site.
 */
const display = Newsreader({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Amor a Mar — Pescados y mariscos frescos',
    template: '%s · Amor a Mar',
  },
  description:
    'Selección fresca de pescados y mariscos, preparada para ti y entregada en refrigeración.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-MX" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
