import 'server-only';

/**
 * Los canales por los que el negocio contesta.
 *
 * Duplicados del `lib/shop.ts` de la tienda a propósito, no por descuido: la
 * tienda va a mudarse a su propio repositorio y el panel no puede importar de
 * ella. Son dos líneas, y lo que evitan es un acoplamiento entre despliegues
 * que después habría que deshacer.
 *
 * Si cambian, cambian en los dos sitios. Es el precio de la separación, y está
 * declarado aquí para que quien edite uno sepa que existe el otro.
 */
export const WHATSAPP_LABEL = '(81) 2916 2142';
export const WHATSAPP_URL = 'https://wa.me/528129162142';
