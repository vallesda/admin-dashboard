import { supplyOf, type Product } from '@/lib/commerce/types';
import SupplyTag from '@/components/ui/supply-tag';

/**
 * Las etiquetas que van sobre la foto de un producto.
 *
 * Dos preguntas distintas, y por eso dos sitios: a la izquierda **qué le pasa a
 * esta compra** —agotado, por encargo, de temporada— y a la derecha **qué es la
 * pieza**, que no cambia con la existencia del día.
 *
 * ## Por qué vive fuera de la tarjeta
 *
 * Concentra una regla de negocio —cuál de las tres etiquetas gana— y esa regla
 * no debería estar enterrada en un componente de doscientas líneas junto al
 * precio, la imagen y el botón. Aquí se puede leer de una vez y se puede probar
 * sin montar una tarjeta entera.
 *
 * ## La disposición
 *
 * **En móvil se apilan en columna, a la izquierda.** Es la única disposición
 * que no depende del ancho de la tarjeta: dos etiquetas enfrentadas necesitan
 * saber cuánto mide cada una para decidir si caben, y una columna no lo
 * necesita. Además el ojo las lee en orden en vez de a saltos entre esquinas.
 *
 * Desde `sm` vuelven a la fila enfrentada, donde la tarjeta ya tiene ancho.
 * `flex-wrap` cubre los anchos intermedios: si no caben, la de la derecha baja
 * a una segunda línea —`sm:ml-auto` la mantiene pegada a su lado— en vez de
 * pisar a la otra.
 *
 * `pointer-events-none` porque el enlace de la tarjeta es un `::after` que
 * cubre toda la superficie: cualquier cosa dibujada encima le roba la zona de
 * toque, y en móvil eso es una esquina que no responde.
 */
export default function ProductBadges({ product }: { product: Product }) {
  const soldOut = !product.availableForSale;
  const supply = supplyOf(product);

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-2">
      {/*
        Una sola etiqueta a la izquierda, y el orden de este ternario **es** la
        regla:

        1. **Agotado** gana a todo. Da igual lo demás si no se puede comprar.
        2. **Por encargo** gana a «de temporada»: de temporada describe el
           producto, por encargo cambia lo que le pasa a quien lo compra.
        3. **De temporada** cuando ninguna de las anteriores aplica.

        La disponibilidad se dice con palabras, nunca sólo con la foto en gris:
        el color y la desaturación no sobreviven a una pantalla en blanco y
        negro ni al sol de mediodía.
      */}
      {soldOut ? (
        <span className="rounded-sm bg-foreground/85 px-2 py-1 text-xs text-background backdrop-blur-[2px]">
          Agotado
        </span>
      ) : supply.type === 'preorder' ? (
        <span className="rounded-sm bg-foreground px-2 py-1 text-xs font-medium text-background">
          {supply.shortNotice ?? 'Por encargo'}
        </span>
      ) : product.seasonal ? (
        <span className="rounded-sm bg-sun px-2 py-1 text-xs font-medium text-brand">
          De temporada
        </span>
      ) : null}

      {/*
        Lo que es la pieza. Se muestra también cuando está agotada: seguirá
        siendo congelado mañana.
      */}
      <SupplyTag supply={supply} className="sm:ml-auto" />
    </div>
  );
}
