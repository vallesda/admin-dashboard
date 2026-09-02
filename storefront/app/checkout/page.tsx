import type { Metadata } from 'next';

import Container from '@/components/ui/container';
import SectionHeader from '@/components/ui/section-header';
import CheckoutForm from './checkout-form';
import { RHYTHM } from '@/components/ui/section';

export const metadata: Metadata = {
  title: 'Checkout',
  // A checkout page has nothing to gain from search traffic and everything to
  // lose from a half-filled one being indexed.
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Container className={RHYTHM.sm}>
      <SectionHeader
        as="h1"
        title={
          <>
            Confirma tu <em>pedido</em>
          </>
        }
        /*
         * Decía «Pagas con tarjeta al confirmar», y con el checkout por pasos
         * eso dejó de ser cierto: se paga al final, después de revisar. Lo que
         * sigue valiendo la pena decir aquí es lo que el comprador no puede
         * deducir de la pantalla — que después hay una llamada.
         */
        lede="Tres pasos y te llevamos a pagar. Después te llamamos para acordar el horario y el punto de entrega."
        className="mb-10"
      />
      <CheckoutForm />
    </Container>
  );
}
