import { redirect } from 'next/navigation';

/**
 * Confirmation messages for operations that finish on a *different* page.
 *
 * Creating a product redirects to the product list, and a redirect throws away
 * every scrap of client state — including whatever the form knew about how the
 * save went. So the outcome travels in the URL and a listener on the other side
 * turns it back into a toast.
 *
 * ## Codes, never text
 *
 * The URL carries `?flash=product.created`, not the sentence. A toast rendered
 * from free text in a query string is a phishing surface: anyone can send a
 * member of staff a link that pops an official-looking "Tu sesión expiró,
 * vuelve a entrar en …" inside the real admin panel. A code that has to match
 * this table can only ever say one of the things below.
 *
 * Unknown codes are ignored rather than shown, for the same reason.
 */
export const FLASH = {
  'category.created': { tone: 'ok', message: 'Categoría creada.' },
  'category.updated': { tone: 'ok', message: 'Categoría actualizada.' },
  'product.created': { tone: 'ok', message: 'Producto creado como borrador.' },
  'product.updated': { tone: 'ok', message: 'Producto actualizado.' },
  'customer.created': { tone: 'ok', message: 'Cliente creado.' },
  'customer.updated': { tone: 'ok', message: 'Cliente actualizado.' },
  'order.created': { tone: 'ok', message: 'Pedido registrado e inventario apartado.' },
  'package.created': {
    tone: 'ok',
    message: 'Paquete creado. Ahora agrégale productos.',
  },
  'package.updated': { tone: 'ok', message: 'Paquete actualizado.' },
  'user.created': { tone: 'ok', message: 'Cuenta creada. Ya puede entrar.' },
  'user.updated': { tone: 'ok', message: 'Cuenta actualizada.' },
} as const satisfies Record<string, { tone: 'ok' | 'info'; message: string }>;

export type FlashCode = keyof typeof FLASH;

/** The query key. Short, because it rides on URLs a person may read aloud. */
export const FLASH_PARAM = 'flash';

export function flashMessage(code: string | null | undefined) {
  if (!code) return null;
  return code in FLASH ? FLASH[code as FlashCode] : null;
}

/**
 * Finishes an action by navigating somewhere and announcing what happened.
 *
 * `redirect()` works by throwing, so this never returns and must be the last
 * thing an action does.
 *
 * The destination's existing query string is preserved. Row actions are not the
 * only callers: an edit reached from `?query=atun&page=2` should land back on
 * that filtered page, not on an unfiltered page one — losing a shopper's place
 * is annoying, losing an operator's place mid-audit is a real cost.
 */
export function redirectWithFlash(path: string, code: FlashCode): never {
  const [pathname, search] = path.split('?');
  const params = new URLSearchParams(search);
  params.set(FLASH_PARAM, code);
  redirect(`${pathname}?${params.toString()}`);
}
