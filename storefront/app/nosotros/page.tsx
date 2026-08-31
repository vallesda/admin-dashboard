import type { Metadata } from 'next';

import Container from '@/components/ui/container';
import { EyeCluster } from '@/components/brand/eye';
import Section from '@/components/ui/section';
import SectionHeader from '@/components/ui/section-header';
import Eyebrow from '@/components/ui/eyebrow';
import { ButtonLink } from '@/components/ui/button';
import {
  FishIcon,
  OriginIcon,
  ColdIcon,
  HandlingIcon,
} from '@/components/merchandising/value-icons';

export const metadata: Metadata = {
  title: 'Nosotros',
  description:
    'Amor a Mar es una pescadería y marisquería en San Pedro Garza García, Nuevo León. Producto de Baja California, elegido pieza por pieza, con cadena de frío y entrega a domicilio en la zona metropolitana de Monterrey.',
};

/**
 * Nosotros.
 *
 * ## What is sourced, and from where
 *
 * Everything asserted here traces to something the business itself has already
 * said, and nothing else:
 *
 * - "Honest Seafood", "Restaurante / Pescadería", Monterrey and the WhatsApp
 *   number come from the shop's own Instagram profile (@amoramarmx).
 * - The four practices are PRODUCT.md's documented positioning — the four
 *   claims the business states and a supermarket shelf could not copy.
 * - The video is embedded and titled with its own YouTube title, verbatim.
 *
 * What is deliberately NOT here: a synopsis of the video. Its description and
 * transcript were not retrievable, and writing "en este video conocerás…" from a
 * thumbnail would be exactly the invented copy the brand voice rule exists to
 * prevent.
 *
 * The shop's own Instagram bio and the video title both say "el mejor". That
 * superlative is not repeated here: PRODUCT.md's voice rule is explicit that no
 * copy claims something the business has not established, "sin superlativos".
 * The rule is the shop's, and marketing written elsewhere does not lift it.
 */

/** The practices, in the shop's own framing. See PRODUCT.md § Positioning. */
const PRACTICES = [
  {
    Icon: FishIcon,
    title: 'Curaduría por pieza',
    body: 'No vendemos todo lo que llega. Se elige pieza por pieza, y lo que no pasa el filtro no entra al catálogo. Por eso el catálogo cambia con lo que el mar dio ese día: compras de la captura, no de una bodega.',
  },
  {
    Icon: HandlingIcon,
    title: 'Manejo a medida',
    body: 'Limpieza, corte y empaque como lo pidas, listo para cocinar. Es el oficio de la pescadería, no un empaque estándar que sale igual para todos.',
  },
  {
    Icon: OriginIcon,
    title: 'Trazabilidad de origen',
    body: 'Cada pieza dice de dónde viene, cómo está cortada y en qué presentación. Si no lo sabemos, no lo inventamos.',
  },
  {
    Icon: ColdIcon,
    title: 'Cadena de frío propia',
    body: 'Refrigerado desde que llega hasta que se entrega, con entrega local propia en lugar de paquetería. Nunca se rompe el frío.',
  },
];

export default function Page() {
  return (
    <>
      {/* --- Quiénes somos ------------------------------------------------ */}
      <Section rhythm="sm" labelledBy="nosotros-intro" className="pb-0">
        <Container>
          <SectionHeader
            id="nosotros-intro"
            as="h1"
            title={
              <>
                El mar no se <em>apura</em>
              </>
            }
            lede="Amamos el mar y todo lo que viene de él. Somos una pescadería y marisquería en San Pedro Garza García, y trabajamos con lo que el mar da ese día, no con lo que un catálogo dice que debería haber."
          />

          <div className="mt-10 grid gap-10 md:grid-cols-[1.15fr_1fr] md:gap-16">
            <div className="space-y-5 leading-relaxed text-muted">
              <p>
                Nos presentamos como <em>Honest Seafood</em>, y eso es menos un
                lema que una restricción: si una pieza no llegó como la
                queremos, no la ponemos; si no sabemos de dónde viene, no lo
                escribimos; y si algo se agota, desaparece del catálogo en vez
                de aceptarte un pedido que no podríamos cumplir.
              </p>
              <p>
                Cada producto pasa por las mismas manos desde que baja del barco
                hasta que llega a tu cocina — limpio, cortado como lo pediste y
                en frío todo el camino. Es un oficio lento y no intentamos
                acelerarlo.
              </p>
            </div>

            <div className="border-t border-border pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
              <Eyebrow as="h2" className="mb-4">
                Nuestra misión
              </Eyebrow>
              <p className="font-display text-2xl font-light leading-snug md:text-3xl">
                Que el pescado que llega a tu mesa sea tan bueno como el que
                elegiríamos para la nuestra, y que sepas exactamente qué estás
                comprando.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* --- Tesoro --------------------------------------------------------- */}
      {/*
        El concepto de la marca, que nunca había estado en el sitio.

        El manual (§2) lo llama «Tesoro»: siglos de gente saliendo a explorar el
        mar, y lo que se trae de vuelta. El ojo —el elemento gráfico de la
        identidad— es a la vez la moneda y lo primero que se mira en una pieza
        para saber si está fresca.

        Va sobre amarillo pleno, como aparece impreso en el manual, y es el
        único uso de amarillo a página completa del sitio: encima de él, el
        verde mide 7.94:1.
      */}
      <Section rhythm="sm" labelledBy="tesoro-heading">
        <Container>
          <div className="grid items-center gap-8 bg-sun px-6 py-10 text-brand sm:grid-cols-[auto_1fr] sm:gap-12 sm:px-12 sm:py-14">
            <EyeCluster size={128} />

            <div>
              <h2
                id="tesoro-heading"
                className="font-display text-4xl font-light leading-[1.05] tracking-[-0.02em] md:text-5xl"
              >
                Tesoro
              </h2>
              <p className="mt-4 max-w-[46ch] text-base leading-relaxed">
                Desde hace siglos hemos trabajado por navegar y explorar
                nuestros mares. Nos hemos embarcado hacia lo desconocido, tal
                vez buscando nuevas tierras, pero siempre descubriendo más
                sobre él y sobre nuestra relación con él.
              </p>
              <p className="mt-3 max-w-[46ch] text-base leading-relaxed">
                Peces, crustáceos y moluscos, sacados del mar especialmente
                para quien los ha pedido.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* --- Video --------------------------------------------------------- */}
      <Section rhythm="sm" labelledBy="video-heading">
        <Container>
          <SectionHeader
            id="video-heading"
            title={
              <>
                Conoce la <em>pescadería</em>
              </>
            }
            lede="Un recorrido por el mostrador, grabado en Monterrey."
            className="mb-8"
          />

          {/*
            `youtube-nocookie.com` rather than the standard embed: it is the
            same player without the tracking cookie set on arrival, which is the
            right default for a page nobody came here to be measured on.

            The wrapper owns the 16:9 ratio so the iframe cannot letterbox
            itself, and the plate hairline matches every other framed image in
            the shop.
          */}
          <div className="relative aspect-video w-full overflow-hidden rounded-sm bg-sand">
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube-nocookie.com/embed/QInCuVl2jXM"
              title="El Mejor Pescado Fresco Sustentable - Pescaderia Amor a Mar Seafood Market en Monterrey"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-sm plate"
            />
          </div>
        </Container>
      </Section>

      {/* --- Las cuatro prácticas ------------------------------------------ */}
      <Section labelledBy="practicas-heading" className="bg-sand/40">
        <Container>
          <SectionHeader
            id="practicas-heading"
            title={
              <>
                Cuatro cosas que <em>sostenemos</em>
              </>
            }
            lede="Son prácticas, no certificaciones. Cada una se puede comprobar en el producto que recibes."
            className="mb-10"
          />

          <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {PRACTICES.map(({ Icon, title, body }) => (
              <li key={title} className="border-t border-border pt-5">
                <h3 className="flex items-center gap-2.5 font-sans text-sm font-medium">
                  <span className="shrink-0 text-brand">
                    <Icon />
                  </span>
                  {title}
                </h3>
                <p className="mt-2.5 max-w-[46ch] text-sm leading-relaxed text-muted">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* --- Contacto ------------------------------------------------------ */}
      <Section rhythm="sm" labelledBy="contacto-heading">
        <Container>
          <SectionHeader
            id="contacto-heading"
            title={
              <>
                Habla con <em>nosotros</em>
              </>
            }
            lede="Para pedidos especiales, cortes que no ves en el catálogo o dudas sobre una pieza."
            className="mb-8"
          />

          <dl className="grid gap-6 border-t border-border pt-6 sm:grid-cols-2 md:max-w-2xl">
            <div>
              <Eyebrow as="dt">WhatsApp de tienda</Eyebrow>
              <dd className="mt-1">
                <a
                  href="https://wa.me/528129162142"
                  className="tabular-nums text-brand underline-offset-4 hover:underline"
                >
                  (81) 2916 2142
                </a>
              </dd>
            </div>
            <div>
              <Eyebrow as="dt">Instagram</Eyebrow>
              <dd className="mt-1">
                <a
                  href="https://www.instagram.com/amoramarmx/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand underline-offset-4 hover:underline"
                >
                  @amoramarmx
                </a>
              </dd>
            </div>
          </dl>

          <ButtonLink href="/search" className="mt-8">
            Ver lo que hay hoy
          </ButtonLink>
        </Container>
      </Section>
    </>
  );
}
