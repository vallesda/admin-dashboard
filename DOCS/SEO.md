# SEO — dónde estamos y el plan

> Auditoría del storefront hecha contra el código, más lo aplicable del
> [curso de SEO de Next.js](https://nextjs.org/learn/seo).
> Objetivo declarado: aparecer cuando alguien en **San Pedro Garza García, Nuevo León**
> busca dónde comprar **pescado y mariscos frescos**.

---

## 1. Sobre el curso, antes de citarlo

Vale la pena decirlo porque cambia qué se copia de ahí: **el curso enseña SEO correcto con
código desactualizado.** Está escrito para el Pages Router —`next/head`, `getServerSideProps`,
`pages/sitemap.xml.js`, `passHref`— y este proyecto usa App Router en Next 16, donde todo eso se
hace con `generateMetadata`, `app/sitemap.ts` y `app/robots.ts`.

Y una corrección de fondo: el curso mide interactividad con **FID**, que Google retiró en marzo de
2024. La métrica vigente es **INP** (Interaction to Next Paint). Optimizar para FID hoy es
optimizar para algo que ya nadie puntúa.

Lo que sí vale entero del curso, y que este plan sigue:

- el HTML inicial tiene que traer el contenido (rendering strategy importa);
- `<title>` y `description` únicos por página, con palabras clave reales;
- sitemap dinámico, no estático;
- datos estructurados en JSON-LD;
- un `<h1>` por página, alineado con el título;
- enlaces internos de verdad, con `href`;
- Core Web Vitals como factor de ranking.

---

## 2. Dónde estamos

Mejor de lo que suele estar un proyecto a esta altura, y con tres agujeros caros.

| Pieza | Estado |
|---|---|
| Render en servidor, HTML completo para el robot | 🟢 App Router, todo server-side |
| `<title>` con plantilla y `description` por página | 🟢 en 10 páginas |
| Un `<h1>` por página | 🟢 verificado en las 11 |
| `alt` en imágenes de producto | 🟢 sale del catálogo, no inventado |
| Enlaces internos con `next/link` | 🟢 |
| URLs limpias (`/product/salmon-500-g`) | 🟢 |
| JSON-LD de producto | 🟡 existe, pero le falta media ficha |
| `metadataBase` | 🔴 **no existe** |
| `app/sitemap.ts` | 🔴 **no existe** |
| `app/robots.ts` | 🔴 **no existe** |
| Metadata propia de la portada | 🔴 **no tiene** |
| URL canónica | 🔴 en ninguna página |
| Imagen para compartir (`opengraph-image`) | 🔴 |
| **JSON-LD de negocio local** | 🔴 **no existe** |
| **«San Pedro Garza García» en el sitio** | 🔴 **no aparece ni una vez** |

---

## 3. Los tres agujeros caros

### 3.1 Sin `metadataBase`, compartir el sitio está roto 🔴

La página de producto declara `openGraph` con la imagen del producto, y no hay `metadataBase` en
ningún lado. Sin esa base, Next resuelve las URLs de Open Graph como **relativas**, y ni WhatsApp
ni Facebook ni Google saben qué hacer con `/imagenes/salmon.jpg`.

Consecuencia concreta: **hoy, un link de Amor a Mar pegado en WhatsApp sale sin imagen.** Para una
pescadería en Monterrey, donde el canal es WhatsApp, eso no es un detalle de SEO: es el 80 % de
cómo se comparte el negocio.

Es una línea de código.

### 3.2 Nada le dice a Google que el catálogo existe 🔴

Sin `sitemap.ts`, las páginas de producto y de categoría sólo se descubren siguiendo enlaces desde
la portada. El catálogo **cambia todos los días** —es la premisa del negocio— así que un producto
que entra y sale en 48 horas puede no llegar a indexarse nunca.

El curso lo dice con todas sus letras: sitemap dinámico, no estático. Aquí es especialmente cierto.

Y sin `robots.ts` no hay declaración de qué no rastrear. `/pedido/[token]` ya trae su propio
`robots: { index: false }` —bien puesto—, pero `/checkout` y `/api` andan sueltos.

### 3.3 El sitio no dice dónde está 🔴

Este es el que importa para lo que pediste. Busqué «San Pedro» en todo el storefront: **cero
resultados.** «Monterrey» aparece en la página *Nosotros* y en la zona horaria. No hay dirección,
no hay teléfono con formato, no hay horario, no hay coordenadas, no hay `LocalBusiness`.

Google no puede posicionarte en San Pedro Garza García por una ciudad que no nombras.

---

## 4. La parte local — y la verdad incómoda

Voy a ser directo porque cambia dónde conviene poner el esfuerzo:

> **No vas a llegar al mapa de Google por escribir mejor código.** El bloque de tres negocios que
> sale arriba en «pescadería cerca de mí» lo decide el **Perfil de Empresa de Google** —antes
> Google My Business—: categoría, dirección verificada, proximidad de quien busca, y **reseñas**.
> El sitio web es una señal de apoyo, no la principal.

Lo que sí hace el código, y hace bien:

1. **confirma** ante Google que el negocio de la ficha y este sitio son el mismo (NAP idéntico +
   `LocalBusiness` + `sameAs` a Instagram);
2. **gana el resultado orgánico** debajo del mapa, que es donde caen las búsquedas más largas
   («dónde comprar atún fresco en San Pedro», «pescadería que entregue a domicilio Valle Oriente»);
3. **convierte** al que llega.

Así que el plan tiene dos carriles, y el primero no es mío:

**Carril del negocio (sin código, y es el de mayor retorno)**

- crear o reclamar el **Perfil de Empresa de Google**, categoría principal *Pescadería* (`Fish
  store`), secundarias *Marisquería* y *Tienda de alimentos gourmet*;
- verificar el domicilio real en San Pedro Garza García;
- horario, fotos del mostrador y del producto, y el WhatsApp como contacto;
- **pedir reseñas sistemáticamente.** Es la palanca más grande y la más lenta;
- el mismo nombre, dirección y teléfono —carácter por carácter— en el sitio, Instagram, Google y
  cualquier directorio.

**Carril del código** — el resto de este documento.

---

## 5. Palabras clave

No sirve elegirlas por gusto. La estructura que propongo separa tres intenciones distintas, porque
una sola página no puede ganar las tres:

| Intención | Ejemplo de búsqueda | Qué página la atiende |
|---|---|---|
| **Local + compra** | «pescadería san pedro garza garcía», «mariscos frescos san pedro» | **Portada** |
| **Producto** | «comprar atún fresco monterrey», «salmón fresco a domicilio» | Producto y categoría |
| **Informativa** | «cómo saber si un pescado es fresco» | *Cómo funciona*, FAQ, futuro blog |

Y una decisión de vocabulario que conviene tomar a conciencia:

- **«mariscos»** y **«pescadería»** son las que usa un cliente mexicano buscando comprar. Son las
  que hay que ganar.
- **«seafood»** casi no se busca en español desde Monterrey, salvo en «seafood market», que sí
  aparece — de hecho el título del video en *Nosotros* ya lo usa. Sirve como término secundario en
  la marca, **no** como el eje.
- **«pescado fresco»** y **«pescado de calidad»** son el intento más común y el más competido; se
  gana con contenido y reseñas, no con etiquetas.

Lo que no hay que hacer: repetir «pescadería San Pedro Garza García mariscos frescos» en cada
`<title>`. Google lleva una década penalizando eso, y para el cliente lee a desesperado.

---

## 6. El plan — Fase 8

### `F8.01` · Los cimientos que faltan 🔴

| Tarea | Detalle |
|---|---|
| `metadataBase` en el layout raíz | arregla las imágenes al compartir, hoy rotas |
| `app/sitemap.ts` dinámico | productos, categorías, paquetes y páginas fijas, con `lastModified` |
| `app/robots.ts` | permite todo salvo `/checkout`, `/pedido`, `/api`; apunta al sitemap |
| `alternates.canonical` por página | una URL por contenido; el catálogo filtrado no debe competir consigo mismo |

Barato, mecánico, y hasta que no esté nada de lo demás rinde.

### `F8.02` · Que el sitio diga dónde está 🔴

Un solo módulo de constantes con el NAP —nombre, calle, colonia, San Pedro Garza García, Nuevo
León, C.P., teléfono, horario, coordenadas— del que salgan a la vez:

- el **JSON-LD `LocalBusiness`** en el layout (subtipo más preciso: `Store` con
  `additionalType` de pescadería), con `geo`, `openingHoursSpecification`, `areaServed` y `sameAs`
  al Instagram real;
- el **pie de página**, con la dirección visible y enlazada a Google Maps;
- la página *Nosotros*, que hoy dice «Monterrey» y debería decir la colonia y el municipio.

Una sola fuente para las tres cosas, porque **NAP inconsistente es peor que NAP ausente**: Google
lo lee como dos negocios distintos.

### `F8.03` · Portada con identidad local 🔴

Hoy la portada hereda el título del layout. Debe declarar el suyo, con el patrón que funciona en
local: *qué eres · dónde estás · marca*, sin amontonar.

> **Pescadería en San Pedro Garza García — Amor a Mar**
> *Pescados y mariscos frescos, seleccionados pieza por pieza. Entrega a domicilio en San Pedro y
> zona metropolitana de Monterrey.*

Y en el cuerpo, no sólo en la etiqueta: una línea visible que diga dónde está el mostrador. Google
lee la página, no sólo la cabecera.

### `F8.04` · Datos estructurados que hoy faltan 🟡

| Esquema | Dónde | Qué gana |
|---|---|---|
| `LocalBusiness` | layout | la señal local principal |
| `Product` **completo** | producto | `sku`, `brand`, `offers.url`, `itemCondition`, `priceValidUntil` — hoy le falta todo eso y sin ello no califica para resultado enriquecido |
| `BreadcrumbList` | producto y categoría | la ruta bajo el resultado |
| **`FAQPage`** | preguntas frecuentes | **16 preguntas ya escritas**; es un resultado enriquecido gratis |
| `WebSite` + `SearchAction` | layout | caja de búsqueda en el resultado |

El `FAQPage` es el de mejor relación esfuerzo/resultado: el contenido ya existe. Requiere un
retoque, porque hoy las respuestas son JSX y el esquema necesita texto plano.

### `F8.05` · Contenido que responde a búsquedas locales 🟡

Lo que de verdad mueve la aguja a mediano plazo, y lo único de esta lista que no es técnico:

- una página por zona de reparto real —ahora que `DEL` existe, las zonas son contenido: «Entrega
  en San Pedro Garza García», «Entrega en Valle Oriente»— **siempre que digan algo verdadero y
  distinto**. Veinte páginas clonadas con el nombre cambiado son *doorway pages*, y eso sí se
  penaliza;
- las fichas de producto con texto propio: origen, temporada, cómo se corta, cómo se guarda. El
  catálogo ya tiene `origin`, `presentation` y `storageInstructions` y **no se están usando en la
  descripción de SEO**;
- la página *Cómo funciona* apuntando a la cadena de frío y la selección, que es la diferencia real
  contra un supermercado.

### `F8.06` · Core Web Vitals 🟡

Con INP, no con FID. Puntos concretos ya detectados en este proyecto:

- la **primera imagen del catálogo no tiene `priority`** — está anotado desde hace sesiones y es
  exactamente el LCP de la página que más importa;
- `next/image` con `sizes` correcto en las rejillas;
- reservar altura en las tarjetas para no mover el layout (CLS);
- medir con datos de campo, no de laboratorio: `useReportWebVitals` mandando a la analítica.

### `F8.07` · Medición 🟢

Sin esto, todo lo anterior es fe:

- **Google Search Console** con la propiedad verificada y el sitemap enviado;
- seguimiento de posición para el puñado de búsquedas de §5, no para cien;
- las llamadas y rutas que reporta el Perfil de Empresa, que es donde se ve el efecto local.

---

## 7. Orden recomendado

```text
Semana 1   F8.01 + F8.02      cimientos y NAP        ← sin esto lo demás no rinde
Semana 1   Perfil de Empresa   (negocio, en paralelo) ← la palanca más grande
Semana 2   F8.03 + F8.04      portada y esquemas
Semana 2   F8.07              Search Console
Después    F8.05 + F8.06      contenido y velocidad  ← lo lento y lo que compone
```

`F8.01` y `F8.02` se pueden hacer hoy salvo una cosa: **necesito la dirección real, el teléfono y
el horario.** No los voy a inventar; un NAP falso es peor que ninguno, porque Google lo contrasta
con la ficha y la discrepancia daña.

---

## 8. Una deuda que dejé yo

Las zonas de reparto que cargué probando `DEL` son de **Ciudad de México** (Centro y Roma, C.P.
06500). Son datos de prueba míos y hay que sustituirlos por los códigos postales reales de San
Pedro Garza García y la zona metropolitana antes de que la tienda salga. Mientras estén así, el
checkout a domicilio le dice «no entregamos ahí» a todo cliente de Nuevo León.

---

## 9. Lo que no voy a prometer

- **Nada de esto da resultados en dos semanas.** El SEO local se mueve en meses, y las reseñas son
  el componente más lento.
- **El código no gana el mapa.** Gana el resultado orgánico de debajo y sostiene la ficha. Si hay
  que elegir dónde poner una tarde, ponla en el Perfil de Empresa y en pedir reseñas.
- **«Pescado fresco Monterrey» es competido.** Contra cadenas y agregadores, la vía realista es
  ganar primero lo específico —San Pedro, colonias, productos concretos— y crecer desde ahí.
