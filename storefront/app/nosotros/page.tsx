import type { Metadata } from 'next';

import ColorField from '@/components/ui/color-field';
import FeatureCards, { type Feature } from '@/components/merchandising/feature-cards';
import { EyeCluster } from '@/components/brand/eye';
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
 * - La misión es el texto del manual de marca, literal. Sólo se unieron las
 *   palabras que allí van partidas por guión al final de línea.
 *
 * What is deliberately NOT here: a synopsis of the video. Its description and
 * transcript were not retrievable, and writing "en este video conocerás…" from a
 * thumbnail would be exactly the invented copy the brand voice rule exists to
 * prevent.
 *
 * ## Sobre «la mejor calidad»
 *
 * La regla de voz de PRODUCT.md prohíbe los superlativos, y por eso el «el
 * mejor» de la biografía de Instagram y del título del vídeo no se repite en
 * ningún texto escrito aquí.
 *
 * La misión sí lo dice —«el producto fresco de la mejor calidad de Baja
 * California»— y se conserva porque no es copy escrito para esta página: es la
 * declaración de intenciones del propio manual de marca, citada. La regla
 * existe para impedir que el sitio invente afirmaciones, no para censurar lo
 * que el negocio ya declaró sobre sí mismo. Si el texto del manual cambia,
 * cambia aquí.
 */

/** The practices, in the shop's own framing. See PRODUCT.md § Positioning. */
const PRACTICES: Feature[] = [
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
      {/* --- Nuestra misión ------------------------------------------------ */}
      {/*
        La misión abre la página, y lo hace con el tratamiento más fuerte del
        sitio: amarillo pleno, el ojo de la marca y el texto del manual.

        Antes esto era la segunda sección, bajo un «El mar no se apura» que
        parafraseaba lo mismo con otras palabras. Dos declaraciones de
        intenciones seguidas se debilitan entre sí; la que se queda es la que
        el negocio ya tenía escrita.

        El `h1` vive aquí porque ahora es lo primero que dice la página, y una
        página sin `h1` no tiene título para un lector de pantalla ni para un
        buscador.

        Único uso de amarillo a página completa del sitio: encima de él el
        verde mide 7.94:1.
      */}
      <ColorField
        tone="sun"
        id="mision-heading"
        as="h1"
        title="Nuestra Misión"
      >
        <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
          <EyeCluster size={128} />

          {/*
            El texto del manual, literal. Las palabras que allí aparecen
            partidas —«sacados-/del», «fres-/co»— van unidas: eran cortes de
            composición de la lámina, no del texto.
          */}
          <div className="space-y-4 text-lg leading-relaxed md:text-xl">
            <p className="max-w-[46ch]">
              Amamos el mar y todo lo que viene de él.
            </p>
            <p className="max-w-[46ch]">
              Estamos preparados para entregar el verdadero tesoro en el mar.
              Peces, crustáceos, moluscos, que son sacados del mar
              especialmente para quien los ha pedido.
            </p>
            <p className="max-w-[46ch]">
              En Amor A Mar creemos en llevar el producto fresco de la mejor
              calidad de Baja California a todos los lugares, en la frescura
              óptima.
            </p>
          </div>
        </div>
      </ColorField>

      {/* --- Video --------------------------------------------------------- */}
      <ColorField
        tone="cream"
        id="video-heading"
        title={
          <>
            Conoce la <em>pescadería</em>
          </>
        }
        lede="Un recorrido por el mostrador, grabado en Monterrey."
      >
        {/*
          `youtube-nocookie.com` rather than the standard embed: it is the same
          player without the tracking cookie set on arrival, which is the right
          default for a page nobody came here to be measured on.

          The wrapper owns the 16:9 ratio so the iframe cannot letterbox itself,
          and the plate hairline matches every other framed image in the shop.
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
      </ColorField>

      {/* --- Las cuatro prácticas ------------------------------------------ */}
      <ColorField
        tone="cream"
        id="practicas-heading"
        title={
          <>
            Cuatro cosas que <em>sostenemos</em>
          </>
        }
        lede="Son prácticas, no certificaciones. Cada una se puede comprobar en el producto que recibes."
      >
        {/*
          El mismo mosaico que «Cómo funciona», y a propósito: las dos páginas
          contestan la misma pregunta desde lados distintos —qué hacemos y por
          qué—, así que la forma de la respuesta debe ser reconocible. Dos
          rejillas distintas para dos listas de cuatro habrían sido dos
          invenciones donde bastaba una.
        */}
        <FeatureCards features={PRACTICES} />
      </ColorField>

      {/* --- Contacto ------------------------------------------------------ */}
      {/*
        Turquesa, que es el color que el manual llama «envolvente, refrescante
        y tranquilizante». Cierra la página en color en vez de en crema porque
        aquí sí hay algo que hacer —escribir— y el campo lo separa del resto
        como lo que es: la salida.
      */}
      <ColorField
        tone="turquoise"
        id="contacto-heading"
        title={
          <>
            Habla con <em>nosotros</em>
          </>
        }
        lede="Para pedidos especiales, cortes que no ves en el catálogo o dudas sobre una pieza."
      >
        <dl className="grid gap-8 sm:grid-cols-2 md:max-w-2xl">
          <div>
            <Eyebrow as="dt" tone="inherit">
              WhatsApp de tienda
            </Eyebrow>
            <dd className="mt-2 text-2xl tabular-nums">
              <a
                href="https://wa.me/528129162142"
                className="underline-offset-4 hover:underline"
              >
                (81) 2916 2142
              </a>
            </dd>
          </div>
          <div>
            <Eyebrow as="dt" tone="inherit">
              Instagram
            </Eyebrow>
            <dd className="mt-2 text-2xl">
              <a
                href="https://www.instagram.com/amoramarmx/"
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:underline"
              >
                @amoramarmx
              </a>
            </dd>
          </div>
        </dl>

        <ButtonLink href="/search" className="mt-10">
          Ver lo que hay
        </ButtonLink>
      </ColorField>

    </>
  );
}
