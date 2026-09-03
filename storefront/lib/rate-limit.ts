import 'server-only';

/**
 * Un límite de peticiones por clave, en memoria.
 *
 * ## Qué protege
 *
 * `createOrder` **aparta inventario antes de cobrar** —correcto para producto
 * perecedero— y `placeOrder` es un Server Action público: sin sesión y sin
 * captcha. Sin un freno, repetirlo aparta el catálogo entero hasta que venza la
 * sesión de Stripe o corra el barrido del día siguiente. Para una pescadería con
 * una captura al día, eso es cerrar la tienda.
 *
 * ## Por qué en memoria, y qué NO cubre
 *
 * Es una decisión consciente del negocio, no un descuido, así que conviene que
 * el límite real quede escrito:
 *
 * - **El caso accidental queda resuelto del todo.** Alguien que pulsa
 *   «Confirmar» cinco veces seguidas, o un cliente impaciente que recarga: la
 *   segunda petición ya cae en el mismo proceso que la primera.
 * - **El caso deliberado queda a medias.** Cada instancia de Vercel lleva su
 *   propio `Map`, así que bajo carga —que es justo cuando la plataforma levanta
 *   más instancias— el límite efectivo se multiplica por cuantas haya. Un bot
 *   paciente y distribuido lo esquiva.
 *
 * Se eligió esto porque cuesta cero, no añade latencia ni dependencias en el
 * camino del checkout, y cubre lo que de verdad va a pasar. Cuando haga falta
 * más, **sólo cambia el cuerpo de `hit`**: la firma es la misma que expone un
 * contador en Redis, así que quien la llama no se entera.
 *
 * ## Sin temporizadores
 *
 * La limpieza ocurre al consultar, no con un `setInterval`. Un temporizador en
 * un entorno sin servidor mantiene viva una instancia que debería poder morir, y
 * en el peor caso se ejecuta cuando ya nadie escucha.
 */

type Bucket = { count: number; resetAt: number };

/**
 * Vive en el módulo, no en la petición.
 *
 * Es lo que hace que dos peticiones del mismo visitante se vean entre sí — y
 * también el motivo de que el límite sea por instancia y no global.
 */
const buckets = new Map<string, Bucket>();

/** Sin esto, una ráfaga de claves distintas hace crecer el `Map` sin fin. */
const MAX_KEYS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  /** Cuántas peticiones quedan en la ventana actual. */
  remaining: number;
  /** Segundos hasta que la ventana se reinicie. Para el mensaje al usuario. */
  retryAfter: number;
};

/**
 * Registra una petición contra `key` y dice si se permite.
 *
 * Ventana fija y no deslizante a propósito: la deslizante necesita guardar la
 * marca de tiempo de cada petición, y aquí el objetivo es frenar una ráfaga, no
 * medirla con precisión.
 */
export function hit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();

  /*
   * Purga perezosa. Sólo se paga cuando el mapa se ha hecho grande, y recorrerlo
   * entero es barato comparado con dejarlo crecer: son claves de texto y cubos
   * de dos números.
   */
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;

  const retryAfter = Math.ceil((existing.resetAt - now) / 1000);

  if (existing.count > limit) {
    return { ok: false, remaining: 0, retryAfter };
  }

  return { ok: true, remaining: limit - existing.count, retryAfter };
}

/** Vacía el contador. Existe para las pruebas, que si no se contaminan entre sí. */
export function resetRateLimits(): void {
  buckets.clear();
}
