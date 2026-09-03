import 'server-only';

import { headers } from 'next/headers';

/**
 * De quién viene esta petición, para poder contarla.
 *
 * ## Por qué no vale cualquier cabecera
 *
 * `x-forwarded-for` la puede escribir el cliente. Si se lee tal cual, cualquiera
 * pone una IP distinta en cada petición y el límite deja de existir — con el
 * agravante de que **parece** que hay límite.
 *
 * Vercel resuelve esto: su proxy **sobrescribe** `x-forwarded-for` con la IP
 * real de la conexión y añade `x-real-ip`, así que lo que llegue al código ya
 * viene de la plataforma y no del visitante. Lo que sí importa es leer el
 * **primer** elemento de la lista, que es el cliente; los siguientes son
 * intermediarios y son precisamente los que un atacante podría haber inyectado
 * antes de que Vercel añadiera el suyo.
 *
 * ## Fuera de Vercel
 *
 * En local no hay proxy y no hay cabecera: se devuelve `null` y quien llama
 * decide. Ese caso está separado a propósito de «hay cabecera pero no la
 * entiendo», porque no son lo mismo: uno es desarrollo y el otro sería un
 * despliegue mal configurado del que conviene enterarse.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();

  const forwarded = h.get('x-forwarded-for');

  if (forwarded) {
    // El primero de la lista es el cliente. `split` y no `indexOf` porque una
    // sola IP sin comas es igual de válida.
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return h.get('x-real-ip')?.trim() || null;
}
