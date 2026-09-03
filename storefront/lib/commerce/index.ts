import 'server-only';

import { unstable_rethrow } from 'next/navigation';

/**
 * Commerce facade — the seam.
 *
 * PAGES AND COMPONENTS IMPORT ONLY FROM HERE. Never from `api-client`, never
 * from the admin's modules. Keeping that rule is what makes moving this
 * storefront to its own repository a one-file change instead of a rewrite.
 *
 * The function names follow the vercel/commerce convention so the architecture
 * reads the way the reference does.
 *
 * SERVER ONLY. This module reaches the API and therefore carries the service
 * token, so it must never be pulled into a client bundle. Client components
 * import shapes from `./types` and configuration from `./constants` — both
 * plain modules with no server dependency — and receive their data as props
 * from a Server Component.
 */
import { hasAsset } from '@/lib/assets';
import { api, CommerceError } from './api-client';
import type {
  Bundle,
  DeliveryQuote,
  CheckoutInput,
  CheckoutResult,
  Collection,
  Order,
  Paginated,
  Product,
  ShelfItem,
} from './types';

export * from './types';
export * from './constants';
export { CommerceError } from './api-client';

/**
 * Quita las fotos que apuntan a un archivo que no está.
 *
 * El catálogo del mostrador nombra la foto de cada producto (`/images/products/
 * filete-salmon.png`) desde el día que se da de alta, mucho antes de que
 * alguien la tome. Servida tal cual, esa ruta devuelve 404 y deja el hueco de
 * una imagen rota en la rejilla — y una rejilla de doce huecos parece un sitio
 * averiado, no un catálogo al que le faltan fotos.
 *
 * Todos los componentes que pintan producto ya contemplan `featuredImage`
 * nulo, así que basta con no dárselo: el producto sale con el mismo trato que
 * los que nunca tuvieron foto. El día que el archivo aparece en `public/`, la
 * foto aparece con él sin tocar código.
 *
 * Sólo se comprueban las rutas locales. Una URL absoluta —las fotos viven hoy
 * en Vercel Blob— no se puede verificar sin una petición de red, y hacerla en
 * cada render sería pagar un viaje por producto para prevenir un caso que la
 * subida al blob ya descarta.
 */
function withExistingImages<T extends Product>(product: T): T {
  const url = product.featuredImage?.url;
  if (!url || !url.startsWith('/') || hasAsset(url)) return product;

  return { ...product, featuredImage: null, images: [] };
}

export async function getProducts(options?: {
  collection?: string;
  query?: string;
  page?: number;
}): Promise<Paginated<Product>> {
  const params = new URLSearchParams();
  if (options?.collection) params.set('collection', options.collection);
  if (options?.query) params.set('query', options.query);
  if (options?.page && options.page > 1) params.set('page', String(options.page));

  const qs = params.toString();
  const page = await api.get<Paginated<Product>>(
    `/api/v1/catalog/products${qs ? `?${qs}` : ''}`,
  );

  return { ...page, items: page.items.map(withExistingImages) };
}

export async function getProduct(handle: string): Promise<Product | null> {
  try {
    return withExistingImages(
      await api.get<Product>(`/api/v1/catalog/products/${encodeURIComponent(handle)}`),
    );
  } catch (error) {
    // A missing product is a 404 page, not an error page.
    if (error instanceof Error && 'status' in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Featured products for the "Más vendidos" block.
 *
 * Filtered client-side from the first page rather than through a dedicated
 * endpoint: the catalogue is small, and one cached request serves both the
 * grid and this block.
 */
export async function getFeaturedProducts(limit = 3): Promise<Product[]> {
  const { items } = await getProducts();
  return items.filter((p) => p.featured).slice(0, limit);
}

export async function getProductsByCollection(
  handle: string,
): Promise<Product[]> {
  const { items } = await getProducts({ collection: handle });
  return items;
}

export async function getCollections(): Promise<Collection[]> {
  return api.get<Collection[]>('/api/v1/catalog/collections');
}

/**
 * Las categorías que van en los menús.
 *
 * Existe como función propia para que el filtro no se escriba tres veces —en
 * la barra, en las pastillas y en el pie— porque el día que se escriba una
 * cuarta, o que alguien corrija una de las tres, los menús empiezan a
 * discrepar entre sí y nadie lo nota hasta que lo ve un cliente.
 *
 * `getCollections` sigue devolviendo la lista entera: la usan la validación de
 * `/search/[collection]` y el sitemap, que tienen que seguir viendo las que no
 * salen en el menú.
 */
export async function getNavCollections(): Promise<Collection[]> {
  /*
   * El menú degrada a vacío si el catálogo no responde.
   *
   * El navbar vive en el layout raíz, así que lo renderiza **toda** página. Sin
   * esto, un admin caído no dejaba la tienda sin productos: la dejaba sin
   * tienda —500 en `/nosotros`, en `/preguntas-frecuentes`, en todo—, porque el
   * error nace en el layout y ningún `error.tsx` de página puede atraparlo.
   *
   * `unstable_rethrow` es imprescindible aquí y no un adorno: `connection()`
   * aborta el prerender lanzando un error interno de Next, y un `catch` normal
   * se lo tragaría y rompería el build. Sólo se absorben los errores de verdad.
   */
  try {
    const collections = await getCollections();
    return collections.filter((c) => c.showInNav);
  } catch (error) {
    unstable_rethrow(error);
    console.error('[commerce] catálogo no disponible para el menú:', error);
    return [];
  }
}

/**
 * The home shelf: featured categories and curated packages, already merged and
 * ordered by the admin.
 *
 * Replaces `lib/occasions.ts`, a hardcoded list of four entries with no data
 * behind them — their pages showed the whole catalogue under an apology because
 * there was nothing to filter by. The shop curates these now.
 */
export async function getShelf(): Promise<ShelfItem[]> {
  return api.get<ShelfItem[]>('/api/v1/catalog/shelf');
}

/** One package and every line in it. Null when the slug is unknown. */
export async function getPackage(handle: string): Promise<Bundle | null> {
  try {
    const bundle = await api.get<Bundle>(
      `/api/v1/catalog/packages/${encodeURIComponent(handle)}`,
    );
    // Las líneas del paquete son productos, y la página del paquete pinta sus
    // fotos igual que la rejilla. Sin esto, un paquete sería el único sitio
    // del sitio donde una foto ausente sigue rompiéndose.
    return {
      ...bundle,
      lines: bundle.lines.map((line) => ({
        ...line,
        product: withExistingImages(line.product),
      })),
    };
  } catch (error) {
    if (error instanceof CommerceError && error.status === 404) return null;
    throw error;
  }
}

export async function getProductRecommendations(
  handle: string,
): Promise<Product[]> {
  const items = await api.get<Product[]>(
    `/api/v1/catalog/products/${encodeURIComponent(handle)}/related`,
  );
  return items.map(withExistingImages);
}

/**
 * Places an order. The only write this storefront can perform.
 *
 * Sends product ids and quantities — never prices or totals. The admin
 * recomputes every peso from its own catalogue inside the same transaction that
 * reserves the stock, so a tampered cart in localStorage cannot change what is
 * charged.
 *
 * Authenticated: this moves real inventory, and an open endpoint would let
 * anyone exhaust it with orders nobody intends to pay for.
 */
export async function createOrder(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  return api.post<CheckoutResult>('/api/v1/checkout', input, {
    authenticated: true,
  });
}

/**
 * Cotiza el envío para un código postal y un subtotal.
 *
 * Vista previa para el checkout: el importe que se cobra lo vuelve a calcular la
 * API al crear el pedido, desde el mismo código postal. Nunca se manda de vuelta
 * — la tienda pregunta cuánto cuesta, no lo propone.
 */
export async function quoteDelivery(
  postalCode: string,
  subtotalCents: number,
): Promise<DeliveryQuote | null> {
  try {
    return await api.get<DeliveryQuote>(
      `/api/v1/delivery/quote?postalCode=${encodeURIComponent(postalCode)}&subtotal=${subtotalCents}`,
      { authenticated: true },
    );
  } catch {
    // Un fallo aquí no puede bloquear la compra: el checkout muestra «lo
    // calculamos al confirmar» y la API decide al crear el pedido.
    return null;
  }
}

/**
 * Confirms a payment from the page the shopper lands on after paying.
 *
 * Belt to the webhook's braces (DOCS/PAGOS.md §11.1). The webhook is the
 * authority and always runs; this exists because webhooks are sometimes delayed
 * and the shopper is looking at the screen *now* — without it, somebody pays
 * and comes back to an order that says "Pendiente".
 *
 * Returns the order either way. A confirmation that fails is not the shopper's
 * problem: the order is real, the webhook will settle it, and showing an error
 * page over a payment that went through would be the worse outcome.
 */
export async function confirmOrder(
  token: string,
  sessionId: string,
): Promise<Order | null> {
  try {
    return await api.post<Order>(
      `/api/v1/orders/${encodeURIComponent(token)}/confirm`,
      { sessionId },
      { authenticated: true },
    );
  } catch (error) {
    console.error('confirmOrder failed:', error);
    return null;
  }
}

/**
 * Reads a placed order by its token. Returns null when the token is unknown, so
 * a wrong link renders a real 404 rather than an error page.
 */
export async function getOrder(token: string): Promise<Order | null> {
  try {
    return await api.get<Order>(`/api/v1/orders/${encodeURIComponent(token)}`, {
      authenticated: true,
      // Never cached: the status changes as the shop works the order.
      revalidate: 0,
    });
  } catch (error) {
    if (error instanceof CommerceError && error.status === 404) return null;
    throw error;
  }
}
