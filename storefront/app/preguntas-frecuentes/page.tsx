import type { Metadata } from 'next';
import Link from 'next/link';

import ColorField from '@/components/ui/color-field';
import Heading from '@/components/ui/heading';
import { ButtonLink } from '@/components/ui/button';
import { jsonLdScript } from '@/lib/shop';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description:
    'Cómo funciona el catálogo, cómo se prepara tu pedido, cómo se entrega y cómo se paga en Amor a Mar.',
};

/**
 * Preguntas frecuentes.
 *
 * ## The rule this page is written under
 *
 * Every answer states something the system actually does, and nothing it does
 * not. That is not caution for its own sake — delivery zones, delivery days and
 * an order cut-off time are genuinely NOT modelled in the backend
 * (`lib/fulfillment.ts` holds them as `null` on purpose), and a FAQ is exactly
 * where an invented "entregamos de 9 a 6" would be read as a promise and held
 * against the shop.
 *
 * So where the business has not decided, the answer says the truth: it is
 * confirmed by phone. That is worse marketing and better service.
 *
 * ## Why native `<details>`
 *
 * Same reasoning as the product page's detail sections: the browser gives
 * keyboard support, find-in-page and correct semantics for free, and a
 * hand-rolled accordion has to re-earn all three. It also means this page works
 * with no JavaScript at all, which for a page someone opens while deciding
 * whether to trust the shop is the right default.
 */
/**
 * Una pregunta.
 *
 * `a` es JSX porque la respuesta lleva enlaces y énfasis; `plain` es la misma
 * respuesta en texto llano, que es lo único que entiende el esquema `FAQPage`
 * de schema.org. Se escribe a mano en vez de extraerse del JSX a la fuerza: un
 * extractor produciría frases mutiladas, y esto es lo que Google va a enseñar
 * literalmente en el resultado de búsqueda.
 */
type Faq = { q: string; a: React.ReactNode; plain: string };

const GROUPS: { title: React.ReactNode; id: string; items: Faq[] }[] = [
  {
    id: 'catalogo',
    title: (
      <>
        El <em>catálogo</em>
      </>
    ),
    items: [
      {
        q: '¿Por qué el catálogo cambia de un día a otro?',
        plain:
          'Vendemos de la captura, no de una bodega. Elegimos pieza por pieza lo que entra, y lo que no pasa el filtro no se publica. Lo que ves disponible ahora es lo que hay ahora.',
        a: (
          <p>
            Porque vendemos de la captura, no de una bodega. Elegimos pieza por
            pieza lo que entra, y lo que no pasa el filtro no se publica. Lo que
            ves disponible ahora es lo que hay ahora.
          </p>
        ),
      },
      {
        q: 'Vi un producto ayer y hoy ya no está. ¿Qué pasó?',
        plain:
          'Se agotó. Un producto sin existencias deja de aparecer en lugar de aceptarte un pedido que no podríamos cumplir. El inventario se actualiza conforme llega producto fresco.',
        a: (
          <p>
            Se agotó. Un producto sin existencias deja de aparecer en lugar de
            aceptarte un pedido que no podríamos cumplir. Vuelve a consultar:
            el inventario se actualiza conforme llega producto fresco.
          </p>
        ),
      },
      {
        q: '¿Qué significa la etiqueta «De temporada»?',
        plain:
          'Que es una pieza que no vamos a tener siempre. No es una promoción ni una cuenta regresiva: sólo avisa que su disponibilidad depende de la temporada.',
        a: (
          <p>
            Que es una pieza que no vamos a tener siempre. No es una promoción
            ni una cuenta regresiva: solo avisa que su disponibilidad depende de
            la temporada.
          </p>
        ),
      },
      {
        q: '¿Qué quiere decir «presentación» y «origen»?',
        plain:
          'La presentación es cómo viene la pieza —lomo limpio, entero limpio, filete— y el origen es de dónde viene. Son los dos datos que distinguen dos cortes del mismo pescado.',
        a: (
          <p>
            La presentación es cómo viene la pieza — lomo limpio, entero limpio,
            filete — y el origen es de dónde viene. Son los dos datos que
            distinguen dos cortes del mismo pescado, y por eso van en la ficha y
            en la tarjeta del catálogo.
          </p>
        ),
      },
      {
        q: '¿Los precios incluyen todo?',
        plain:
          'Los precios están en pesos mexicanos y son por la presentación que indica cada producto. El costo de entrega, si aplica, se calcula por tu código postal al confirmar el pedido.',
        a: (
          <p>
            Los precios están en pesos mexicanos (MXN) y son por la presentación
            que indica cada producto. El costo de entrega, si aplica, se confirma
            aparte junto con tu pedido.
          </p>
        ),
      },
    ],
  },
  {
    id: 'pedido',
    title: (
      <>
        Tu <em>pedido</em>
      </>
    ),
    items: [
      {
        q: '¿Cómo hago un pedido?',
        plain:
          'Agregas al carrito desde el catálogo o desde la ficha del producto y confirmas en el checkout con tu nombre y teléfono. No necesitas crear una cuenta.',
        a: (
          <p>
            Agregas al carrito desde el catálogo o desde la ficha del producto y
            confirmas en el checkout con tu nombre y teléfono. No necesitas
            crear una cuenta.
          </p>
        ),
      },
      {
        q: '¿Puedo pedir un corte especial?',
        plain:
          'Sí. En el checkout hay un campo de notas para indicar cómo quieres la limpieza o el corte. Si es algo que no ves en el catálogo, escríbenos por WhatsApp.',
        a: (
          <p>
            Sí. En el checkout hay un campo de notas para indicar cómo quieres
            la limpieza o el corte. Si es algo que no ves en el catálogo,
            escríbenos por{' '}
            <a
              href="https://wa.me/528129162142"
              className="text-brand underline underline-offset-4"
            >
              WhatsApp
            </a>
            .
          </p>
        ),
      },
      {
        q: '¿Cuándo se prepara mi pedido?',
        plain:
          'El mismo día en que sale, no antes. Limpiamos, cortamos y empacamos en frío para que llegue listo para cocinar.',
        a: (
          <p>
            El mismo día en que sale, no antes. Limpiamos, cortamos y empacamos
            en frío para que llegue listo para cocinar.
          </p>
        ),
      },
      {
        q: '¿Cómo veo el estado de mi pedido?',
        plain:
          'Al confirmar recibes un enlace propio a tu pedido. Guárdalo: es la única forma de volver a verlo, y por eso no lo publicamos en ningún listado.',
        a: (
          <p>
            Al confirmar recibes un enlace propio a tu pedido. Guárdalo: es la
            única forma de volver a verlo, y por eso no lo publicamos en ningún
            listado.
          </p>
        ),
      },
      {
        q: '¿Puedo cancelar o cambiar un pedido?',
        plain:
          'Escríbenos por WhatsApp citando tu número de pedido. Mientras no esté preparado, se puede ajustar.',
        a: (
          <p>
            Escríbenos por{' '}
            <a
              href="https://wa.me/528129162142"
              className="text-brand underline underline-offset-4"
            >
              WhatsApp
            </a>{' '}
            citando tu número de pedido. Mientras no esté preparado, se puede
            ajustar.
          </p>
        ),
      },
    ],
  },
  {
    id: 'entrega',
    title: (
      <>
        Entrega y <em>pago</em>
      </>
    ),
    items: [
      {
        q: '¿Cómo recibo mi pedido?',
        plain:
          'Hay dos modalidades: recoger en tienda o entrega a domicilio. Eliges cuál al confirmar el pedido.',
        a: (
          <p>
            Hay dos modalidades: <strong>recoger en tienda</strong> o{' '}
            <strong>entrega a domicilio</strong>. Eliges cuál al confirmar el
            pedido.
          </p>
        ),
      },
      {
        q: '¿A qué zonas entregan y en qué horario?',
        plain:
          'Entregamos en la zona metropolitana de Monterrey. Al escribir tu código postal en el checkout te decimos si llegamos y cuánto cuesta el envío. Te contactamos por teléfono para confirmar el horario.',
        a: (
          <>
            <p>
              Te contactamos por teléfono para confirmar el horario y el punto
              de entrega de cada pedido.
            </p>
            <p className="mt-2">
              No publicamos un calendario ni un mapa de cobertura porque
              todavía no los tenemos definidos, y preferimos un hueco honesto a
              una promesa que no podamos sostener.
            </p>
          </>
        ),
      },
      {
        q: '¿Cómo se mantiene el frío?',
        plain:
          'Refrigerado desde que llega hasta que se entrega, con entrega local propia en lugar de paquetería. Esa es la razón de no enviar fuera de la zona en la que podemos garantizarlo.',
        a: (
          <p>
            Refrigerado desde que llega hasta que se entrega, con entrega local
            propia en lugar de paquetería. Esa es la razón de no enviar fuera de
            la zona en la que podemos garantizarlo.
          </p>
        ),
      },
      {
        q: '¿Cómo y cuándo se paga?',
        plain:
          'Si recoges en tienda, pagas en efectivo al recogerlo. Si pides a domicilio, el pago es en línea con tarjeta al confirmar.',
        a: (
          <p>
            <strong>No se cobra nada en línea.</strong> Confirmas tu pedido en
            el sitio y el pago se hace al recibirlo o al recogerlo. No pedimos
            datos de tarjeta en ningún momento.
          </p>
        ),
      },
      {
        q: '¿Cuánto cuesta la entrega?',
        plain:
          'Depende de tu código postal. Cada zona tiene su tarifa y algunas incluyen envío gratis a partir de cierto monto; el checkout te lo dice antes de que confirmes.',
        a: (
          <p>
            Se confirma junto con tu pedido. Por eso el resumen del checkout no
            muestra un cargo de envío: mostrar «$0.00» sería prometer una
            entrega gratis que no hemos establecido.
          </p>
        ),
      },
    ],
  },
];

/**
 * Las mismas 15 preguntas, en el vocabulario de schema.org.
 *
 * `FAQPage` es de los pocos resultados enriquecidos que se gana sin escribir
 * contenido nuevo: el texto ya existía. Google puede desplegar las preguntas
 * bajo el resultado, lo que ocupa más pantalla y responde antes de que nadie
 * tenga que entrar.
 *
 * Se emite `plain`, no el JSX: el esquema pide texto y esto es literalmente lo
 * que Google va a enseñar.
 */
function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.plain },
      })),
    ),
  };
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd()) }}
      />

      <ColorField
        tone="coral"
        id="faq-intro"
        as="h1"
        title={
          <>
            Preguntas <em>frecuentes</em>
          </>
        }
        lede="Cómo funciona el catálogo, cómo preparamos tu pedido y cómo se entrega y se paga. Si algo no está aquí, escríbenos."
      />

      {/*
        One band for all three groups, not one band each. Three stacked
        sections put their own vertical rhythm end to end and opened ~130px of
        empty cream between "El catálogo" and "Tu pedido" — the page read as
        three unrelated screens rather than one list of answers.

        ## Por qué las respuestas se quedan sobre crema

        Los campos de color de esta página son la entrada y la salida; el centro
        no. Coral y turquesa sostienen texto —6.09 y 5.18— pero eso es el
        mínimo para leer una etiqueta, no para leer treinta respuestas seguidas.
        El color aquí marca los grupos, no los fondos: una barra de 3px por
        grupo, que es información —dónde empieza cada tema— y no decoración.
      */}
      <ColorField tone="cream">
        <div className="flex flex-col gap-16">
          {GROUPS.map((group, i) => (
            <section key={group.id} aria-labelledby={`${group.id}-heading`}>
              {/*
                La barra, no un filete gris. Tres colores para tres temas, y a
                3px de alto es una superficie, no texto: no le aplica el mínimo
                de 4.5 que sí descarta al coral como tinta.
              */}
              <div
                aria-hidden="true"
                className={`h-[3px] w-16 ${GROUP_BARS[i % GROUP_BARS.length]}`}
              />

              <Heading
                id={`${group.id}-heading`}
                size="section"
                className="mb-8 mt-5"
              >
                {group.title}
              </Heading>

              <div className="max-w-[68ch] border-t border-border">
                {group.items.map((item) => (
                  <details key={item.q} className="group border-b border-border">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 font-sans text-base font-medium marker:content-[''] hover:text-brand">
                      {item.q}
                      <span
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-muted transition-transform duration-200 ease-board group-open:rotate-180"
                      >
                        <ChevronIcon />
                      </span>
                    </summary>
                    <div className="pb-5 leading-relaxed text-muted">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </ColorField>

      <ColorField
        tone="mint"
        id="faq-cta"
        title="¿No encontraste tu respuesta?"
      >
        <p className="max-w-[54ch] text-lg leading-relaxed">
          Escríbenos por WhatsApp al{' '}
          <a
            href="https://wa.me/528129162142"
            className="tabular-nums underline underline-offset-4"
          >
            (81) 2916 2142
          </a>{' '}
          o revisa{' '}
          <Link href="/como-funciona" className="underline underline-offset-4">
            cómo funciona
          </Link>
          .
        </p>
        <ButtonLink href="/search" className="mt-8">
          Ver lo que hay
        </ButtonLink>
      </ColorField>
    </>
  );
}

/** Un color por grupo, fijo. Ver la nota sobre por qué son barras y no fondos. */
const GROUP_BARS = ['bg-brand', 'bg-turquoise', 'bg-coral'] as const;

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <path
        d="M4 6.5 8 10.5 12 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
