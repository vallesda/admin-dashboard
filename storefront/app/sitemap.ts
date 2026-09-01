import type { MetadataRoute } from 'next';

import { getCollections, getProducts } from '@/lib/commerce';
import { SITE_URL } from '@/lib/shop';

/**
 * El mapa del sitio, generado en cada petición.
 *
 * Dinámico y no estático, que es lo que recomienda el curso y aquí es
 * especialmente cierto: **el catálogo cambia todos los días**. Un producto que
 * entra el martes y se agota el jueves nunca aparecería en un archivo escrito a
 * mano, y sin sitemap sólo se descubre siguiendo enlaces desde la portada —
 * demasiado lento para 48 horas de vida.
 *
 * `priority` es una señal relativa dentro del propio sitio, no una promesa a
 * Google: la portada y el catálogo por encima de las páginas informativas,
 * porque son las que tienen que ganar la búsqueda local.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/nosotros`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/como-funciona`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/preguntas-frecuentes`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  /*
   * El catálogo puede fallar y el mapa del sitio no debe caerse con él: un
   * sitemap con las cinco páginas fijas es infinitamente mejor que un 500, que
   * Google interpreta como «este sitio no tiene mapa».
   */
  const [products, collections] = await Promise.all([
    getProducts().then((page) => page.items).catch(() => []),
    getCollections().catch(() => []),
  ]);

  return [
    ...staticRoutes,
    ...collections.map((collection) => ({
      url: `${SITE_URL}/search/${collection.handle}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/product/${product.handle}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    /*
      Los paquetes salen del mapa mientras su zona esté desmontada.

      La ruta `/paquete/[handle]` sigue abriendo, pero ya no hay ningún enlace
      hacia ella desde el sitio. Publicar en el sitemap una página a la que
      nadie puede llegar navegando es exactamente lo que un buscador lee como
      página huérfana, y no ayuda a posicionar la que sí importa.

      Para devolverlos, ver la nota en `app/page.tsx`.
    */
  ];
}
