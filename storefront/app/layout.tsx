import type { Metadata } from 'next';
import { Newsreader, Instrument_Sans } from 'next/font/google';

import './globals.css';
import { CartProvider } from '@/components/cart/cart-context';
import CartDrawer from '@/components/cart/cart-drawer';
import AnnouncementBar from '@/components/layout/announcement-bar';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';

/**
 * Newsreader carries the editorial voice; Instrument Sans carries everything
 * functional. Keeping them apart is most of what stops the storefront reading
 * like a generic Tailwind site.
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
    'Selección fresca de pescados y mariscos, preparada para ti y entregada con cadena de frío.',
};

/**
 * Root layout — persistent shell only.
 *
 * No marketing lives here. The homepage owns its own sections, so a collection
 * or product page inherits navigation and cart without inheriting a hero.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-MX" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">
        <CartProvider>
          <AnnouncementBar />
          <Navbar />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
