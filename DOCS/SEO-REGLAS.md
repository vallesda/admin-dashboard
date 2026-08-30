# Reglas de SEO

> Las reglas que hay que seguir al escribir páginas en esta tienda. El
> diagnóstico y el plan están en [SEO.md](SEO.md); esto es el manual de uso.
>
> Formato: cada regla dice **qué**, **por qué** y **dónde se rompe**. Una regla
> sin la segunda parte se olvida a la primera prisa.

---

## `SEO-01` · Una página, un `<title>` propio

Cada ruta declara su título en `generateMetadata` o en `export const metadata`.
Ninguna hereda el del layout salvo que su contenido sea genuinamente el del
sitio entero.

**Por qué.** El título es lo que Google enseña y la señal principal de qué trata
la página. Dos páginas con el mismo título compiten entre sí y ninguna gana.

**Se rompe** cuando alguien crea una ruta nueva y no añade metadata. La portada
lo tuvo así hasta hoy.

---

## `SEO-02` · El patrón del título local es *qué eres · dónde estás · marca*

```text
Pescadería en San Pedro Garza García — mariscos y pescado fresco
Mariscos en San Pedro Garza García · Amor a Mar
```

**Por qué.** En búsqueda local la ciudad es tan determinante como el producto.
Un título sin localidad compite contra todo México.

**No se rompe al revés:** amontonar «pescadería mariscos seafood pescado fresco
San Pedro Monterrey» está penalizado desde hace más de una década y a un cliente
le lee a desesperado.

---

## `SEO-03` · Descripciones escritas, no plantillas

La `description` de un producto sale de lo que el negocio escribió, enriquecida
con **origen** y **presentación** — datos que el catálogo ya tiene.

**Por qué.** «Atún aleta amarilla · lomo limpio · Ensenada» son exactamente los
términos por los que alguien busca. Una plantilla con el nombre interpolado no
aporta ninguno.

**Se rompía aquí:** el catálogo guardaba `origin` y `presentation` y no llegaban
al resultado de búsqueda.

---

## `SEO-04` · Una URL por contenido, con canónica

Toda página declara `alternates.canonical`. El catálogo filtrado no declara una
canónica distinta por filtro.

**Por qué.** Sin canónica, la misma ficha alcanzable desde dos rutas se reparte
su propia autoridad entre las dos.

---

## `SEO-05` · `metadataBase` siempre configurado

**Por qué.** Sin él, Next resuelve las URLs de Open Graph como relativas y
**los enlaces compartidos salen sin imagen**. Para esta tienda, cuyo canal es
WhatsApp, no es un detalle de buscadores: es cómo se ve el negocio cuando
alguien lo recomienda.

Vive en `app/layout.tsx` y sale de `SITE_URL` en `lib/shop.ts`.

---

## `SEO-06` · Un `<h1>` por página, y que diga lo mismo que el título

**Por qué.** El `<h1>` es la confirmación en la página de lo que promete la
etiqueta. Cuando discrepan, Google se queda con la duda y a veces reescribe el
título por su cuenta.

**Estado:** se cumple en las 11 páginas. Al añadir una, comprobarlo.

---

## `SEO-07` · Toda imagen de contenido lleva `alt` real

El `alt` sale del catálogo, no se inventa en el componente. Una imagen
puramente decorativa lleva `alt=""`, que es distinto de no llevarlo.

**Por qué.** Accesibilidad primero; el buscador es la consecuencia. Un `alt`
vacío declarado dice «esto no aporta información», y un `alt` ausente dice «se
me olvidó».

---

## `SEO-08` · Los datos estructurados describen lo que la página dice

| Esquema | Dónde | Estado |
|---|---|:--:|
| `WebSite` + `SearchAction` | layout | ✅ |
| `Store` (negocio local) | layout | ⏸ espera dirección real |
| `Product` + `Offer` | ficha de producto | ✅ |
| `BreadcrumbList` | ficha de producto | ✅ |
| `FAQPage` | preguntas frecuentes | ✅ |

**Por qué la disciplina importa más que el esquema.** Los datos estructurados se
publican como declaración: si la ficha dice `InStock` y la página dice
«Agotado», Google puede retirar los resultados enriquecidos del sitio entero.
`availability` se calcula del mismo dato que pinta el botón, nunca aparte.

**Regla dura:** *no se publica como dato estructurado nada que la página no diga
en palabras.*

---

## `SEO-09` · El NAP tiene una sola fuente

Nombre, dirección y teléfono salen de `lib/shop.ts` y de ahí van al pie de
página, a los datos estructurados y a cualquier otro sitio.

**Por qué.** Google contrasta el sitio con el Perfil de Empresa. Dos versiones
de la dirección le dicen que son dos negocios, que es lo contrario de lo que se
busca. **Un NAP inconsistente es peor que uno ausente.**

**Corolario:** mientras no haya dirección verificable, `localBusinessJsonLd()`
devuelve `null` y no se publica nada. Inventar una calle para «tener el
esquema» haría daño, no bien.

---

## `SEO-10` · El sitemap es dinámico y tolera fallos

`app/sitemap.ts` consulta el catálogo en cada revalidación y **nunca lanza**: si
la API falla, devuelve las páginas fijas.

**Por qué.** El catálogo cambia a diario y un producto puede vivir 48 horas; un
archivo escrito a mano no lo alcanza. Y un sitemap que devuelve 500 le dice a
Google que el sitio no tiene mapa, que es peor que uno incompleto.

---

## `SEO-11` · Se bloquea lo que no aporta a nadie buscando

`/checkout`, `/pedido/` y `/api/` están en `robots.ts`. La página de un pedido
lleva además su propio `robots: { index: false }`.

**Por qué.** Presupuesto de rastreo, y sobre todo: la confirmación de un pedido
lleva el nombre y la dirección de una persona.

---

## `SEO-12` · Nada de leer la hora durante el render

**Por qué.** `Date.now()` en el cuerpo de un componente es impuro: React puede
volver a renderizar y obtener otra respuesta. Ya rompió dos veces en este
proyecto y el linter lo caza.

**Consecuencia práctica:** `priceValidUntil` del esquema `Product` **no se
publica** todavía. Su sitio correcto es el bloque `seo` que arma el admin, fuera
de React por completo. Está anotado, no resuelto con una supresión.

---

## `SEO-13` · El rendimiento se mide con INP, no con FID

**Por qué.** Google retiró FID en marzo de 2024. El curso de Next todavía lo
enseña, y optimizar para FID hoy es optimizar para algo que ya nadie puntúa.

Pendientes concretos: `priority` en la primera imagen del catálogo (es el LCP de
la página que más importa), `sizes` correcto en las rejillas, y altura reservada
en las tarjetas para no mover el layout.

---

## `SEO-14` · Contenido local sólo si dice algo verdadero y distinto

Una página por zona de reparto es buena idea **si cada una dice algo propio**.
Veinte páginas clonadas con el nombre del municipio cambiado son *doorway
pages*, y eso sí se penaliza.

---

## `SEO-15` · El código no gana el mapa

El bloque de tres negocios que sale arriba lo decide el **Perfil de Empresa**:
categoría, dirección verificada, proximidad y reseñas. El sitio confirma la
entidad, gana el resultado orgánico de debajo y convierte al que llega.

**Por qué está aquí.** Para que nadie invierta una semana en etiquetas creyendo
que va a mover el mapa. Si hay que elegir dónde poner una tarde, va al Perfil de
Empresa y a pedir reseñas.

---

## Al crear una página nueva

```text
□ título propio, con localidad si compite en búsqueda local   (SEO-01, SEO-02)
□ description escrita, no plantilla                            (SEO-03)
□ alternates.canonical                                         (SEO-04)
□ un <h1> alineado con el título                               (SEO-06)
□ alt real en las imágenes de contenido                        (SEO-07)
□ ¿va en el sitemap? añadirla a app/sitemap.ts                  (SEO-10)
□ ¿debe bloquearse? añadirla a app/robots.ts                    (SEO-11)
□ ¿hay esquema que aplique y que la página diga en palabras?    (SEO-08)
```
