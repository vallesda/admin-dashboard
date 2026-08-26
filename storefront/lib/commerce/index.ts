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
 */
import { api } from './api-client';
import type { Collection, Paginated, Product } from './types';

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

export async function getProductRecommendations(
  handle: string,
): Promise<Product[]> {
  return api.get<Product[]>(`/api/v1/catalog/products/${handle}/related`);
}
