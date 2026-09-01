'use client';

import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import Button, { ButtonLink } from '@/components/ui/button';

/**
 * Qué se ve cuando una página falla.
 *
 * No existía, y su ausencia se notaba mucho más de lo que parece: sin este
 * archivo Next sirve su 500 en crudo —una pantalla en blanco, sin cabecera, sin
 * marca, sin salida— así que un catálogo que no responde no dejaba la tienda
 * sin productos, la dejaba sin tienda.
 *
 * Al vivir bajo el layout raíz, la cabecera y el pie siguen dibujándose: el
 * cliente ve la pescadería, entiende que el fallo es temporal y tiene a dónde
 * ir. Eso es lo que separa una degradación de una caída.
 *
 * El teléfono es deliberado. Si el catálogo está caído no hay nada que este
 * sitio pueda venderle a nadie, pero el mostrador sigue abierto.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="py-20">
      <div className="mx-auto max-w-lg text-center">
        <Heading as="h1" size="section">
          No pudimos cargar esta página
        </Heading>

        <p className="mt-4 text-base text-foreground/70">
          Es un problema nuestro, no tuyo, y suele durar poco. Vuelve a
          intentarlo en un momento.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Reintentar</Button>
          <ButtonLink href="/" variant="secondary">
            Ir al inicio
          </ButtonLink>
        </div>

        {/*
          El digest es lo único que conecta esta pantalla con la línea concreta
          del log del servidor. Sin él, un cliente que reporta el fallo no da
          nada con lo que buscarlo.
        */}
        {error.digest && (
          <p className="mt-8 text-xs text-foreground/40">
            Referencia: {error.digest}
          </p>
        )}
      </div>
    </Container>
  );
}
