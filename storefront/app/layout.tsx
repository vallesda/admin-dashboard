import type { Metadata } from 'next';
import { Spectral, Figtree } from 'next/font/google';

import './globals.css';
import { getProducts } from '@/lib/commerce';
import {
  LOCALITY,
  REGION,
  SHOP_NAME,
  SITE_URL,
  localBusinessJsonLd,
  websiteJsonLd,
} from '@/lib/shop';
import { CartProvider } from '@/components/cart/cart-context';
import CartDrawer from '@/components/cart/cart-drawer';
import AnnouncementBar from '@/components/layout/announcement-bar';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';

/**
 * Las tipografías, y la sustitución que hay detrás.
 *
 * El manual de identidad especifica **Arrus** (Richard Lipton, Bitstream, 1991)
 * como principal y **Vito** (Thomas Gabriel, Dots&Stripes, 2015) como
 * secundaria. Ninguna de las dos está en Google Fonts ni tiene licencia web en
 * este proyecto, así que aquí van sus parientes más cercanos disponibles:
 *
 * - **Spectral** por Arrus. El manual describe Arrus como caligráfica con
 *   influencia de las formas inscripciones clásicas; Spectral comparte ese
 *   remate afilado y la misma tensión entre trazo grueso y fino. Es la
 *   sustitución más justa de las dos.
 * - **Figtree** por Vito. Vito es una grotesca cálida «con estilo de los 60»;
 *   Figtree tiene la misma temperatura y la misma altura de x, y cubre los
 *   pesos que el manual usa para títulos, subtítulos y texto.
 *
 * **Esto es una aproximación declarada, no la marca.** El día que se licencien
 * Arrus y Vito, el cambio es este archivo y nada más: el resto del sitio habla
 * con `--font-display` y `--font-sans`.
 *
 * Lo que **no** se sustituye es el logotipo. El manual lo define como Arrus con
 * un tratamiento hecho a mano, «para dar un aspecto de sello, como las monedas
 * del mar» — eso es un dibujo, no una fuente, y se usa como imagen.
 */
const display = Spectral({
  subsets: ['latin'],
  // La cursiva es funcional, no decorativa: los títulos de sección ponen en
  // cursiva el sustantivo del que trata la banda. Sin la cursiva real el
  // navegador inclinaría la redonda, y una serif sesgada a 48px se ve mal.
  style: ['normal', 'italic'],
  weight: ['300', '400', '500'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Figtree({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  /*
   * `metadataBase` faltaba, y su ausencia rompía algo que no se ve desde el
   * navegador: sin una base, Next resuelve las URLs de Open Graph como
   * relativas, y ni WhatsApp ni Facebook ni Google saben qué hacer con
   * `/imagenes/salmon.jpg`. En la práctica, un enlace de la tienda pegado en
   * WhatsApp salía sin imagen — que para una pescadería de Monterrey es el
   * canal principal.
   */
  metadataBase: new URL(SITE_URL),
  title: {
    // El patrón que funciona en búsqueda local: qué eres · dónde estás · marca.
    default: `Pescadería en ${LOCALITY} — ${SHOP_NAME}`,
    template: `%s · ${SHOP_NAME}`,
  },
  description: `Pescados y mariscos frescos en ${LOCALITY}, ${REGION}. Seleccionados pieza por pieza, con cadena de frío y entrega a domicilio en la zona metropolitana de Monterrey.`,
  applicationName: SHOP_NAME,
  // Google no las usa para posicionar desde 2009. Se omiten a propósito: repetir
  // «pescadería mariscos seafood» en una etiqueta que nadie lee es la clase de
  // señal que sí se penaliza cuando aparece en el resto de la página.
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: SHOP_NAME,
    url: SITE_URL,
  },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};

/**
 * Root layout — persistent shell only.
 *
 * No marketing lives here. The homepage owns its own sections, so a collection
 * or product page inherits navigation and cart without inheriting a hero.
 *
 * The catalogue is fetched once here for the cart's suggestions. It is a small,
 * cached list, and the failure is swallowed on purpose: suggestions are a
 * nicety, and a catalogue hiccup must not blank out every page of the site.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalogue = await getProducts()
    .then((page) => page.items)
    .catch(() => []);

  return (
    <html lang="es-MX" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">
        {/*
          Datos estructurados de todo el sitio.
          
          `WebSite` habilita la caja de búsqueda en el resultado de Google.
          `Store` es la señal local: sólo se emite cuando hay domicilio
          verificable, porque una dirección inventada le dice a Google que este
          sitio y la ficha del negocio son entidades distintas — daña en lugar
          de ayudar. Ver `lib/shop.ts`.
        */}
        <JsonLd data={websiteJsonLd()} />
        <JsonLd data={localBusinessJsonLd()} />

        <CartProvider>
          <AnnouncementBar />
          <Navbar />
          <main>{children}</main>
          <Footer />
          <CartDrawer catalogue={catalogue} />
        </CartProvider>
      </body>
    </html>
  );
}

/**
 * Un bloque de JSON-LD, o nada.
 *
 * Acepta `null` para que quien lo llama no tenga que envolver cada uso en un
 * condicional — y para que «no hay dato que publicar» sea un caso normal en vez
 * de una excepción que alguien acabe rellenando con datos falsos.
 */
function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
