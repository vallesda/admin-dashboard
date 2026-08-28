import type { Metadata } from 'next';

import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
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
      <Heading as="h1" className="mb-8">
        Confirma tu pedido
      </Heading>
      <CheckoutForm />
    </Container>
  );
}
