import type { Metadata } from 'next';
import Link from 'next/link';

import Container from '@/components/ui/container';
import Section from '@/components/ui/section';
import SectionHeader from '@/components/ui/section-header';
import { ButtonLink } from '@/components/ui/button';

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
type Faq = { q: string; a: React.ReactNode };

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
        a: (
          <p>
            El mismo día en que sale, no antes. Limpiamos, cortamos y empacamos
            en frío para que llegue listo para cocinar.
          </p>
        ),
      },
      {
        q: '¿Cómo veo el estado de mi pedido?',
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

export default function Page() {
  return (
    <>
      <Section rhythm="sm" labelledBy="faq-intro" className="pb-0">
        <Container>
          <SectionHeader
            id="faq-intro"
            as="h1"
            title={
              <>
                Preguntas <em>frecuentes</em>
              </>
            }
            lede="Cómo funciona el catálogo, cómo preparamos tu pedido y cómo se entrega y se paga. Si algo no está aquí, escríbenos."
          />
        </Container>
      </Section>

      {/*
        One band for all three groups, not one band each. Three stacked
        `Section`s put their own vertical rhythm end to end and opened ~130px of
        empty cream between "El catálogo" and "Tu pedido" — the page read as
        three unrelated screens rather than one list of answers.
      */}
      <Section rhythm="sm">
        <Container>
          <div className="flex flex-col gap-12">
            {GROUPS.map((group) => (
              <section key={group.id} aria-labelledby={`${group.id}-heading`}>
                <SectionHeader
                  id={`${group.id}-heading`}
                  size="sub"
                  title={group.title}
                  className="mb-6"
                />

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
        </Container>
      </Section>

      <Section rhythm="sm" labelledBy="faq-cta">
        <Container>
          <div className="border-t border-border pt-8">
            <h2 id="faq-cta" className="text-2xl md:text-3xl">
              ¿No encontraste tu respuesta?
            </h2>
            <p className="mt-3 max-w-[52ch] text-muted">
              Escríbenos por WhatsApp al{' '}
              <a
                href="https://wa.me/528129162142"
                className="tabular-nums text-brand underline underline-offset-4"
              >
                (81) 2916 2142
              </a>{' '}
              o revisa{' '}
              <Link
                href="/como-funciona"
                className="text-brand underline underline-offset-4"
              >
                cómo funciona
              </Link>
              .
            </p>
            <ButtonLink href="/search" className="mt-6">
              Ver lo que hay hoy
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}

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
