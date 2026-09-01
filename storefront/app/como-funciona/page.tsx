import type { Metadata } from 'next';

import ColorField from '@/components/ui/color-field';
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
 * homepage now goes hero → catalogue → the week's catch and stops selling
 * before it starts explaining.
 *
 * ## El ritmo de la página
 *
 * Cuatro campos seguidos, cada uno de un color, sin aire de crema entre ellos:
 *
 *   crema      — la pregunta: por qué el catálogo cambia
 *   rejilla    — las cuatro razones, una tarjeta por color
 *   verde      — los tres pasos, con los tres ojos de la marca
 *   crema      — la salida al catálogo
 *
 * La entrada es crema y no un color, aunque lo pareciera al revés: la primera
 * tarjeta de la rejilla es menta, y sobre un campo menta desaparecía. Es la
 * misma estructura de la lámina del manual —un panel claro con el título y el
 * mosaico de color debajo— y deja que las cuatro tarjetas sean lo primero que
 * el ojo encuentra.
 *
 * Antes eran tres bloques de texto sobre crema separados por el mismo ritmo
 * vertical, y la página no tenía forma: nada decía dónde acababa una idea y
 * empezaba otra salvo un filete de 1px. El color hace ese trabajo sin gastar
 * una sola palabra, y lo hace antes de que nadie lea.
 *
 * El cierre vuelve a crema a propósito. Terminar en color habría dejado el
 * botón compitiendo con su propio fondo; sobre crema, el verde del botón es lo
 * único saturado que queda en pantalla.
 */
export default function Page() {
  return (
    <>
      <ColorField
        tone="cream"
        id="como-funciona-intro"
        as="h1"
        title={
          <>
            Cómo <em>funciona</em>
          </>
        }
        lede="Compras del producto que llegó ese día, no de una bodega. Aquí está por qué el catálogo cambia, cómo preparamos cada pedido y cómo llega hasta ti."
      />

      <ValueProps />

      <HowItWorks />

      <ColorField
        tone="cream"
        id="como-funciona-cta"
        title="¿Listo para pedir?"
        lede="El catálogo de hoy es lo que hay hoy. Si algo se agota, deja de aparecer."
      >
        <ButtonLink href="/search">Ver lo que hay</ButtonLink>
      </ColorField>
    </>
  );
}
