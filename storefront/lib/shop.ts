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
/**
 * Normaliza un origen escrito a mano.
 *
 * Un valor de configuración que se teclea en un panel web llega como llega:
 * `amoramar.vercel.app` sin esquema, con comillas alrededor, con un espacio
 * pegado. `new URL()` rechaza los tres, y como `metadataBase` se evalúa al
 * cargar el módulo del layout, el error no degrada una página: **impide
 * recolectar la configuración de todas** y tumba el `next build` entero.
 *
 * Devuelve `null` en vez de lanzar para que quien llama pueda seguir bajando
 * por sus alternativas: un origen mal escrito no debe ser más fatal que uno
 * ausente.
 */
function normalizeOrigin(raw: string | undefined): string | null {
  const value = raw?.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
  if (!value) return null;

  // Sin esquema no hay URL válida. Se asume `https` salvo en desarrollo, donde
  // el puerto local no habla TLS y forzarlo daría un error más confuso todavía.
  const withScheme = /^https?:\/\//.test(value)
    ? value
    : `${/^(localhost|127\.0\.0\.1)(:|$)/.test(value) ? 'http' : 'https'}://${value}`;

  try {
    return new URL(withScheme).origin;
  } catch {
    console.error(
      `[shop] NEXT_PUBLIC_STORE_URL no es una URL válida: ${JSON.stringify(raw)}. ` +
        'Se ignora y se usa el origen por defecto.',
    );
    return null;
  }
}

function resolveSiteUrl(): string {
  /*
   * `??` no bastaba. Una variable **definida y vacía** —que es lo que produce un
   * campo en blanco en el panel de Vercel— vale `''`, no `undefined`, así que el
   * valor por defecto nunca entraba.
   */
  const explicit =
    normalizeOrigin(process.env.NEXT_PUBLIC_STORE_URL) ??
    normalizeOrigin(process.env.STORE_URL);
  if (explicit) return explicit;

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
  const vercel = normalizeOrigin(
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  );
  if (vercel) return vercel;

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
 * **Completado el 2 de septiembre de 2026**, con la ficha de Google que
 * compartió el negocio. Hasta entonces estuvo entero en `null` a propósito:
 * inventar una calle o un teléfono es peor que dejarlo vacío, porque Google los
 * contrasta con el Perfil de Empresa y una discrepancia daña el posicionamiento
 * local en lugar de ayudarlo.
 *
 * Esto es lo que enciende `localBusinessJsonLd()`, que devolvía `null` mientras
 * faltaran calle y código postal. Era la señal local que le faltaba al sitio.
 *
 * Los tipos siguen admitiendo `null` en cada campo, y eso se queda: la
 * degradación elegante que había —sin dirección, sin dato estructurado— es la
 * que impide que un valor borrado emita un negocio a medias.
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
  /*
   * Escrito como lo escribe Google, no como suena mejor.
   *
   * La ficha dice «Rio Amazonas 132 Oriente, Plaza Amazonas 132-Local 1A, Del
   * Valle, 66220 San Pedro Garza García». Aquí se sigue esa forma —incluido el
   * local— porque el NAP se compara contra el Perfil de Empresa y una variante
   * «más limpia» es exactamente la discrepancia que le dice a Google que son
   * dos negocios distintos.
   */
  streetAddress: 'Río Amazonas 132 Ote., Local 1A, Col. Del Valle',
  postalCode: '66220',
  phone: '(81) 8244 0518',
  phoneE164: '+528182440518',
  /*
   * Del marcador de su propio enlace de Maps, no del centro del mapa.
   *
   * El `embed` que compartió el negocio lleva dos pares de coordenadas: el
   * encuadre de la cámara (`!2d…!3d…`, que depende del zoom) y el lugar
   * (`!8m2!3d…!4d…`). Son distintas —el centro cae ~250 m al poniente— y la
   * que vale para `geo` es la del lugar.
   */
  latitude: 25.6601568,
  longitude: -100.3652582,
  /*
   * Vacío a propósito: el horario no está confirmado por el negocio.
   *
   * `localBusinessJsonLd()` omite `openingHoursSpecification` cuando esto está
   * vacío, y un horario inventado es peor que ninguno — Google lo enseña en el
   * resultado y alguien se planta en la puerta un domingo.
   */
  openingHours: [],
};

/**
 * La ficha del negocio en Google, tal y como la compartió.
 *
 * Vive aquí y no en el componente del mapa porque la usan tres sitios: el
 * mapa, el enlace de «cómo llegar» y `sameAs` de los datos estructurados, que
 * es lo que le dice a Google que esta ficha y este sitio son la misma entidad.
 */
export const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/GnTzYhSAeT6YrkMFA';

/**
 * El `src` del iframe de Google Maps, tal cual lo entrega el propio Google.
 *
 * No se construye a mano. Ese `pb=` codifica encuadre, zoom e identificador del
 * lugar en un formato que Google no documenta, así que la única forma correcta
 * de cambiarlo es volver a copiar el «insertar mapa» desde la ficha.
 */
export const GOOGLE_MAPS_EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3596.3357802774854!2d-100.36783312408205!3d25.660161612792642!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8662bd7545ca0b8f%3A0xebfc74a68a9449ea!2sAmor%20a%20Mar%20Honest%20Seafood!5e0!3m2!1ses!2smx!4v1788393086602!5m2!1ses!2smx';

export const INSTAGRAM_URL = 'https://www.instagram.com/amoramarmx/';
export const INSTAGRAM_HANDLE = '@amoramarmx';

/**
 * El WhatsApp de la tienda, que **no** es el mismo número que el fijo.
 *
 * Vive aquí y no en `nav-links.ts` porque es NAP: sale en el pie, en la página
 * de contacto y en la ficha de Google, y la cabecera de este archivo dice que
 * hay una sola fuente. Estaba duplicado en dos sitios y con el enlace escrito a
 * mano en un tercero — que es exactamente cómo un número acaba desincronizado.
 */
export const WHATSAPP_LABEL = '(81) 2916 2142';
export const WHATSAPP_URL = 'https://wa.me/528129162142';

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
    // `sameAs` incluye la ficha de Google: es la señal más directa de que este
    // sitio y ese Perfil de Empresa son el mismo negocio.
    sameAs: [INSTAGRAM_URL, GOOGLE_MAPS_URL],
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
