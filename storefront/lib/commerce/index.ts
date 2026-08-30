import 'server-only';

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
import { api, CommerceError } from './api-client';
import type {
  Bundle,
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
  return api.get<Paginated<Product>>(
    `/api/v1/catalog/products${qs ? `?${qs}` : ''}`,
  );
}

export async function getProduct(handle: string): Promise<Product | null> {
  try {
    return await api.get<Product>(`/api/v1/catalog/products/${handle}`);
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
    return await api.get<Bundle>(`/api/v1/catalog/packages/${handle}`);
  } catch (error) {
    if (error instanceof CommerceError && error.status === 404) return null;
    throw error;
  }
}

export async function getProductRecommendations(
  handle: string,
): Promise<Product[]> {
  return api.get<Product[]>(`/api/v1/catalog/products/${handle}/related`);
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
 * Reads a placed order by its token. Returns null when the token is unknown, so
 * a wrong link renders a real 404 rather than an error page.
 */
export async function getOrder(token: string): Promise<Order | null> {
  try {
    return await api.get<Order>(`/api/v1/orders/${token}`, {
      authenticated: true,
      // Never cached: the status changes as the shop works the order.
      revalidate: 0,
    });
  } catch (error) {
    if (error instanceof CommerceError && error.status === 404) return null;
    throw error;
  }
}
