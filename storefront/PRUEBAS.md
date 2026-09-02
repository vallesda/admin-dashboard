# Pruebas de la tienda

> Hermano de `DOCS/PLAN-PRUEBAS.md`, que cubre el panel. Vive aquí y no allí
> porque esta carpeta va a mudarse a su propio repositorio, y un plan al otro
> lado sería una dependencia que habría que deshacer justo entonces.

---

## 1. En qué se parece al panel, y en qué no

**Igual:** el DOM se pide por archivo con `@vitest-environment happy-dom` en la
cabecera, nunca por patrón en la configuración. `environmentMatchGlobs` dejó de
aplicarse en Vitest 4 **en silencio** y las pruebas morían con «document is not
defined»; una directiva dentro del archivo que la necesita no se puede
desincronizar de la configuración.

**Distinto:** aquí no hay base de datos. La tienda no habla con Postgres —le
pide todo al panel por HTTP— así que no hay PGlite, ni migraciones, ni
`fileParallelism: false`. La suite entera arranca en menos de medio segundo, y
eso cambia cómo se escribe: no hay que racionar pruebas.

Dos piezas hacen falta para que esto funcione, y las dos se descubren tarde:

- **`test/server-only-stub.ts`.** El paquete `server-only` lanza al importarse
  fuera de un Server Component. Sin el doble, cualquier componente que toque
  `lib/commerce` es imposible de probar: la importación muere antes de llegar a
  la prueba.
- **`test/render.tsx`.** Cualquier cosa que dibuje un producto acaba montando
  `ProductCartControl`, que exige `CartProvider` y lanza sin él. Usa
  `renderWithProviders` y olvídate.

---

## 2. Qué se prueba hoy — 70 pruebas

| Archivo | Qué protege |
|---|---|
| `lib/commerce/api-client.test.ts` | la costura entre los dos servicios: sobres de error, el token que sólo viaja cuando se pide, catálogo cacheable y escrituras nunca |
| `lib/slug.test.ts` | que el enlace a una categoría acentuada exista de verdad |
| `lib/commerce/smoke.test.ts` | la degradación cuando la API no manda `supply` |
| `components/product/product-badges.component.test.tsx` | cuál etiqueta gana: agotado ▸ por encargo ▸ de temporada |
| `components/layout/collection-nav.component.test.tsx` | cuál categoría se marca, y que se diga con `aria-current` |
| `components/grid/product-grid.component.test.tsx` | el estado vacío se dice con palabras y no finge ser una lista |
| `app/checkout/actions.test.ts` | lo que el navegador **no** decide: el pago siempre en línea, sólo ids y cantidades, las URLs de retorno del entorno |
| `app/checkout/use-delivery-quote.test.ts` | cuándo preguntar y cuándo una cotización dejó de valer |
| `app/checkout/fulfillment-fields.component.test.tsx` | la dirección aparece con «domicilio»; el estado fijo **sí se envía** pese a estar deshabilitado |
| `app/checkout/order-summary.component.test.tsx` | el envío entra en el total; fuera de cobertura no deja confirmar |

---

## 3. La regla que decide qué se prueba

**Lo que falla en silencio.** Un componente que no dibuja se ve; una etiqueta
que dice «De temporada» sobre un producto agotado, no — y manda al cliente al
carrito a frustrarse. Ésas son las que valen una prueba.

De ahí que no haya pruebas de que un `<span>` tenga una clase: eso falla
ruidosamente, en la pantalla, la primera vez que alguien mira.

---

## 4. Cómo se hace probable un componente

Dos veces ha hecho falta el mismo movimiento, y es el patrón a seguir:
**separar la carga de datos del dibujo.**

`CollectionNav` pedía las categorías y las pintaba en la misma función, así que
comprobar cuál queda marcada exigía levantar la API. Ahora `CollectionNav` sólo
pide, y `CollectionNavList` sólo pinta. La segunda se prueba con una lista en la
mano; la primera no necesita prueba.

Lo mismo con `ProductBadges`, que salió de `ProductCard`: una regla de negocio
—cuál etiqueta gana— enterrada entre el precio, la imagen y el botón, imposible
de ejercitar sin montar una tarjeta entera.

Si algo cuesta de probar, casi siempre es que hace dos cosas.

El checkout fue el caso extremo: 729 líneas donde la única lógica de verdad
—cuándo cotizar el envío, qué respuesta descartar— estaba mezclada con el
marcado de tres formularios. Ahora son cuatro zonas y un hook, y el índice cabe
en 159 líneas:

```
checkout-form.tsx        el índice: la elección de entrega y el código postal
customer-fields.tsx      quién es y cómo se le llama
fulfillment-fields.tsx   cómo lo recibe y a dónde
order-summary.tsx        qué se lleva, cuánto suma y el botón
use-delivery-quote.ts    cuánto cuesta el envío a ese código postal
field.tsx                el campo que usan las tres zonas
```

Partirlo destapó dos cosas que nadie buscaba: 34 líneas de `MEXICAN_STATES`
muertas desde que el estado se fijó, y que la acción reenviaba las líneas del
carrito **tal cual llegaban**, con los campos extra que trajeran.

---

## 5. Lo que falta, por prioridad

### 🔴 Alto

| Qué | Por qué duele |
|---|---|
| El carrito: agregar, sumar cantidades, sobrevivir a un `localStorage` bloqueado | es el primer paso del embudo y no tiene ni una prueba |
| Extremo a extremo: ver, agregar, pagar | el único camino que gana dinero, y el único sin verificar |

### 🟡 Medio

| Qué |
|---|
| `cart-drawer` — el subtotal y el estado vacío |
| `product-description` — la selección de variante y el precio que cambia con ella |
| La ficha: que oculte una fila cuando el campo viene `null` en vez de dejar el rótulo suelto |

### 🟢 Bajo

| Qué | Por qué puede esperar |
|---|---|
| Hero, pie, páginas informativas | contenido fijo; un cambio se ve al mirar |
| SEO: sitemap y robots | se verifican en el build |

---

## 6. Comandos

```bash
pnpm test          # desde storefront/
pnpm test:watch

pnpm --filter ./storefront test   # desde la raíz, que es como corre en CI
```
