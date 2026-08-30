import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/shop';

/**
 * Qué puede rastrear un robot.
 *
 * El curso de SEO de Next lo enseña con un archivo estático en `public/`; el App
 * Router tiene esta API, que además puede leer el origen de la configuración en
 * vez de repetirlo.
 *
 * Se bloquea lo que no aporta nada a nadie buscando y sí gasta presupuesto de
 * rastreo: el carrito, la confirmación de un pedido —que además lleva datos de
 * una persona— y la API. `/pedido` ya trae su propio `robots: noindex` por
 * página; esto evita que el robot llegue siquiera a pedirla.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/checkout', '/pedido/', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
