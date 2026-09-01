/**
 * Quién es y dónde está la pescadería.
 *
 * Una sola fuente para el NAP —nombre, dirección, teléfono— porque va a salir en
 * tres sitios a la vez: el pie de página, los datos estructurados y la ficha de
 * Google. **Un NAP inconsistente es peor que uno ausente**: Google contrasta el
 * sitio con el Perfil de Empresa y una discrepancia le dice que son dos
 * negocios distintos, que es exactamente lo contrario de lo que buscamos.
 *
 * Ver DOCS/SEO.md §4.
 */

/**
 * El origen público. Sin esto, Next resuelve las URLs de Open Graph como
 * relativas y un enlace compartido en WhatsApp sale sin imagen.
 *
 * `??` no bastaba. Una variable **definida y vacía** —que es lo que produce un
 * campo en blanco en el panel de Vercel— vale `''`, no `undefined`, así que el
 * valor por defecto nunca entraba y `new URL('')` tumbaba el build entero en
 * `app/layout.tsx`. Se comprueba que haya contenido, no que exista.
 */
function resolveSiteUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_STORE_URL?.trim() || process.env.STORE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  /*
   * El huevo y la gallina del primer despliegue: la URL pública no se conoce
   * hasta que el proyecto existe, y sin ella no hay despliegue que la revele.
   * El dominio de producción que asigna Vercel rompe el ciclo y es estable
   * entre despliegues, a diferencia de `VERCEL_URL`, que cambia en cada uno.
   *
   * Sigue leyéndose del entorno y nunca de la petición: la propiedad que
   * protege `storeOrigin()` en el checkout —que un preview no pueda convencer
   * al admin de rebotar clientes a otro sitio— se mantiene intacta.
   */
  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3001';
}

export const SITE_URL = resolveSiteUrl();

export const SHOP_NAME = 'Amor a Mar';

/** Dónde vive el negocio. Decide en qué búsquedas locales puede competir. */
export const LOCALITY = 'San Pedro Garza García';
export const REGION = 'Nuevo León';
export const REGION_CODE = 'NL';
export const COUNTRY = 'MX';
export const TIME_ZONE = 'America/Monterrey';

/**
 * El domicilio verificable del mostrador.
 *
 * **Deliberadamente incompleto.** Inventar una calle o un teléfono sería peor
 * que dejarlo vacío: Google los contrasta con la ficha del negocio y una
 * dirección falsa daña el posicionamiento local en lugar de ayudarlo.
 *
 * Mientras estos campos sigan en `null`, `localBusinessJsonLd()` devuelve
 * `null` y no se emite ningún dato estructurado de negocio local. Es una
 * ausencia consciente, no un olvido: completarlos es lo único que separa a este
 * sitio de tener la señal local que le falta.
 */
export const ADDRESS: {
  streetAddress: string | null;
  postalCode: string | null;
  phone: string | null;
  /** Formato E.164, que es el que esperan los datos estructurados. */
  phoneE164: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Día y horas, en el formato de schema.org. */
  openingHours: { days: string[]; opens: string; closes: string }[];
} = {
  streetAddress: null,
  postalCode: null,
  phone: null,
  phoneE164: null,
  latitude: null,
  longitude: null,
  openingHours: [],
};

export const INSTAGRAM_URL = 'https://www.instagram.com/amoramarmx/';

/**
 * Los municipios a los que llega el reparto.
 *
 * Alimenta `areaServed` en los datos estructurados y la copia de la portada. No
 * sale de las zonas de reparto configuradas a propósito: aquello es el precio
 * del envío y esto es una declaración de mercado, y mezclarlas haría que
 * apagar una zona por una semana borrara al negocio de su propia descripción.
 */
export const AREA_SERVED = [
  'San Pedro Garza García',
  'Monterrey',
  'Santa Catarina',
  'Guadalupe',
  'San Nicolás de los Garza',
] as const;

/** Si hay dirección verificable para publicar. */
export function hasVerifiedAddress(): boolean {
  return Boolean(ADDRESS.streetAddress && ADDRESS.postalCode);
}

/**
 * El negocio, en el vocabulario de schema.org.
 *
 * Devuelve `null` mientras no haya domicilio real. El resto del sitio ya
 * funciona sin esto; lo que no funciona sin esto es la búsqueda local.
 */
export function localBusinessJsonLd(): Record<string, unknown> | null {
  if (!hasVerifiedAddress()) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${SITE_URL}/#negocio`,
    name: SHOP_NAME,
    description: `Pescadería y marisquería en ${LOCALITY}. Pescados y mariscos frescos seleccionados pieza por pieza, con entrega a domicilio en la zona metropolitana de Monterrey.`,
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image`,
    telephone: ADDRESS.phoneE164 ?? undefined,
    priceRange: '$$',
    currenciesAccepted: 'MXN',
    address: {
      '@type': 'PostalAddress',
      streetAddress: ADDRESS.streetAddress,
      addressLocality: LOCALITY,
      addressRegion: REGION_CODE,
      postalCode: ADDRESS.postalCode,
      addressCountry: COUNTRY,
    },
    ...(ADDRESS.latitude != null && ADDRESS.longitude != null
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: ADDRESS.latitude,
            longitude: ADDRESS.longitude,
          },
        }
      : {}),
    ...(ADDRESS.openingHours.length > 0
      ? {
          openingHoursSpecification: ADDRESS.openingHours.map((h) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: h.days,
            opens: h.opens,
            closes: h.closes,
          })),
        }
      : {}),
    areaServed: AREA_SERVED.map((name) => ({ '@type': 'City', name })),
    // `sameAs` es cómo se le dice a Google que esta cuenta de Instagram y este
    // sitio son el mismo negocio. Es barato y es de las señales que más
    // consolidan una entidad local.
    sameAs: [INSTAGRAM_URL],
  };
}

/** El sitio, con su buscador — habilita la caja de búsqueda en el resultado. */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#sitio`,
    name: SHOP_NAME,
    url: SITE_URL,
    inLanguage: 'es-MX',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?query={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Migas para el resultado de búsqueda. */
export function breadcrumbJsonLd(
  trail: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: `${SITE_URL}${step.path}`,
    })),
  };
}
