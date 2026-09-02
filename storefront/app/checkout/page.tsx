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
        lede="Pagas con tarjeta al confirmar. Después te llamamos para acordar el horario y el punto de entrega."
        className="mb-10"
      />
      <CheckoutForm />
    </Container>
  );
}
