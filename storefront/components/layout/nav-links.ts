/**
 * The informational pages, in one list.
 *
 * The navbar, the mobile drawer and the footer all need them, and three copies
 * of the same four entries drift the first time one is renamed — which is
 * exactly what happened to the collection list before it was read from the
 * catalogue.
 *
 * They are deliberately separate from the catalogue links. A category answers
 * "what do you sell"; these answer "how does this work" and "who are you", and
 * a shopper is never looking for both at the same moment.
 *
 * El orden va de quiénes somos a cómo se compra y termina en las dudas
 * sueltas: quien llega a este grupo suele estar decidiendo si confía en la
 * pescadería antes de mirar la mecánica del pedido.
 */
export const INFO_LINKS = [
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/como-funciona', label: 'Cómo funciona' },
  { href: '/preguntas-frecuentes', label: 'Preguntas frecuentes' },
] as const;

/**
 * Los canales públicos de la tienda.
 *
 * Reexportados desde `lib/shop.ts`, que es la fuente única del NAP. Estaban
 * escritos aquí *además* de allí, y el enlace de WhatsApp una tercera vez a
 * mano en la página de Nosotros: tres copias del mismo número es cómo se
 * consigue que una de ellas se quede vieja.
 */
export {
  INSTAGRAM_URL,
  INSTAGRAM_HANDLE,
  WHATSAPP_URL,
  WHATSAPP_LABEL,
} from '@/lib/shop';
