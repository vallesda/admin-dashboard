import type { Metadata } from 'next';

import Container from '@/components/ui/container';
import Section from '@/components/ui/section';
import SectionHeader from '@/components/ui/section-header';
import { ButtonLink } from '@/components/ui/button';
import ValueProps from '@/components/merchandising/value-props';
import HowItWorks from '@/components/merchandising/how-it-works';

export const metadata: Metadata = {
  title: 'Cómo funciona',
  description:
    'Cómo elegimos el producto, cómo preparamos tu pedido y cómo lo recibes. El catálogo cambia con lo que llega ese día.',
};

/**
 * Cómo funciona.
 *
 * The four reasons and the three steps used to sit on the homepage, between the
 * catalogue and the shop's own selection. They are the two longest reads on the
 * site and they were being served to someone who arrived to buy fish — the
 * homepage now goes hero → catalogue → occasions → the week's catch and stops
 * selling before it starts explaining.
 *
 * Both blocks are the same components, unchanged. Moving them cost nothing
 * because `ValueProps` and `HowItWorks` already owned their own `Section`
 * rhythm and heading; the homepage was only ever their host.
 */
export default function Page() {
  return (
    <>
      <Section rhythm="sm" labelledBy="como-funciona-intro" className="pb-0">
        <Container>
          <SectionHeader
            id="como-funciona-intro"
            as="h1"
            title={
              <>
                Cómo <em>funciona</em>
              </>
            }
            lede="Compras del producto que llegó ese día, no de una bodega. Aquí está por qué el catálogo cambia, cómo preparamos cada pedido y cómo llega hasta ti."
          />
        </Container>
      </Section>

      <ValueProps />

      <HowItWorks />

      <Section rhythm="sm" labelledBy="como-funciona-cta">
        <Container>
          <div className="border-t border-border pt-8">
            <h2 id="como-funciona-cta" className="text-2xl md:text-3xl">
              ¿Listo para pedir?
            </h2>
            <p className="mt-3 max-w-[52ch] text-muted">
              El catálogo de hoy es lo que hay hoy. Si algo se agota, deja de
              aparecer.
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
