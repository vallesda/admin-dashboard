'use client';

import { useEffect, useState } from 'react';

import type { DeliveryQuote } from '@/lib/commerce/types';
import { quoteDeliveryAction } from './actions';

/**
 * Cotiza el envío mientras el cliente escribe su código postal.
 *
 * Vivía dentro de `CheckoutForm`, entre el carrito y el marcado, y era la única
 * lógica de verdad del archivo: cuándo pedir, qué respuesta descartar y cuándo
 * lo que hay en pantalla ha dejado de valer. Sacarla la vuelve legible de una
 * vez y probable sin montar un formulario de setecientas líneas.
 *
 * ## Las dos decisiones que importan
 *
 * **La cotización se guarda etiquetada con el código postal que la produjo.**
 * Guardar sólo la cotización obligaba a borrarla a mano cada vez que el campo
 * cambiaba, y borrar estado desde un efecto es una cascada de renders. Con la
 * etiqueta, «¿esto sirve para lo que hay escrito ahora?» se **deriva** en vez de
 * sincronizarse, y desaparece toda una clase de error: la cotización de «0650»
 * no puede quedarse en pantalla cuando el campo ya dice «06500».
 *
 * **`ignore` descarta las respuestas que quedaron atrás.** Al escribir se
 * disparan varias peticiones y no llegan en orden; sin esto, la del código
 * postal anterior puede pisar a la del actual.
 */
export type DeliveryQuoteState = {
  /** La cotización vigente, o `null` si todavía no hay una que sirva. */
  quote: DeliveryQuote | null;
  /** Hay una petición en curso para lo que está escrito ahora. */
  loading: boolean;
};

export function useDeliveryQuote({
  enabled,
  postalCode,
  subtotalCents,
}: {
  /** Sólo se cotiza a domicilio: recoger en tienda no tiene envío. */
  enabled: boolean;
  postalCode: string;
  subtotalCents: number;
}): DeliveryQuoteState {
  const [fetched, setFetched] = useState<{
    postalCode: string;
    quote: DeliveryQuote | null;
  } | null>(null);

  // Cinco dígitos: por debajo de eso no hay nada que preguntar, y preguntar
  // igual sería una petición por tecla.
  const wants = enabled && /^[0-9]{5}$/.test(postalCode);

  useEffect(() => {
    if (!wants) return;

    let ignore = false;

    quoteDeliveryAction(postalCode, subtotalCents).then((result) => {
      if (!ignore) setFetched({ postalCode, quote: result });
    });

    return () => {
      ignore = true;
    };
  }, [wants, postalCode, subtotalCents]);

  const fresh = wants && fetched?.postalCode === postalCode;

  return {
    quote: fresh ? fetched.quote : null,
    loading: wants && !fresh,
  };
}
