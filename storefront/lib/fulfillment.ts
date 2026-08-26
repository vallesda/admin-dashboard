/**
 * How ordering and delivery work, as told to the shopper.
 *
 * Static on purpose: the backend does not model delivery zones, days or cut-off
 * times yet (`orders.fulfillment_type` only knows `pickup` and `delivery`), so
 * there is nothing to read this from. When that changes, this file is what the
 * real data replaces.
 *
 * It lives apart from the component so the shop can correct a day or a phone
 * number without opening a `.tsx` file.
 *
 * IMPORTANT — nothing here promises a schedule the business has not committed
 * to. `ZONES`, `DAYS` and `CUTOFF` are null until someone fills them in, and the
 * section renders the honest version instead of inventing one. Setting them to
 * a string is all that is needed to show them.
 */

export const STEPS = [
  {
    title: 'Elige',
    body: 'Escoges del producto disponible ese día. Lo que ves en el catálogo es lo que hay: si algo se agota, deja de aparecer.',
  },
  {
    title: 'Preparamos tu pedido',
    body: 'Limpiamos, cortamos y empacamos en frío. Cada pedido se prepara el mismo día en que sale, no antes.',
  },
  {
    title: 'Recibe o recoge',
    body: 'Te contactamos para confirmar horario y punto de entrega. Puedes recibirlo en tu domicilio o pasar por él.',
  },
] as const;

/** Delivery coverage, once the shop defines it. Null hides the line. */
export const ZONES: string | null = null;

/** Delivery and pickup days, once defined. Null hides the line. */
export const DAYS: string | null = null;

/** Order cut-off time, once defined. Null hides the line. */
export const CUTOFF: string | null = null;
