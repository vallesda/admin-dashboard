# Plan de pruebas

> Estado al 30 de agosto de 2026: **148 pruebas en tres capas**, corriendo con
> `pnpm test` y en CI. Este documento dice qué se prueba, con qué capa, y qué
> falta.
>
> Documentación por funcionalidad: [features/](features/README.md).

---

## 1. La decisión de fondo: tres capas, no una

Un sistema de comercio tiene tres clases de verdad y cada una se rompe de forma
distinta:

| Capa | Qué verifica | Con qué | Coste |
|---|---|---|---|
| **Dominio** | reglas puras: qué transición es legal, cuánto cuesta un envío, cuándo llega un encargo | funciones, sin nada más | milisegundos |
| **Base** | que el dominio *escriba* lo que dice, y que los `CHECK` y triggers muerdan | PostgreSQL real, en proceso | ~2 s toda la suite |
| **Componente** | que la interfaz diga la verdad que el dominio calculó | React en `happy-dom` | ~200 ms |

**Lo que no hay, a propósito:** pruebas de extremo a extremo con navegador
dentro de la suite. Se verifican a mano con CDP cuando toca, porque un runner de
navegador triplica el tiempo de CI para cubrir lo que la capa de base ya cubre
con más precisión.

### 1.1 Por qué PostgreSQL de verdad y no un mock de Drizzle

Casi todo lo que hay que probar en este sistema **vive en la base**:

- el `CHECK` que impide reservar más de lo que hay (`RN-003`);
- los triggers que hacen el libro de inventario inmodificable;
- los `ON DELETE RESTRICT` que protegen la historia de un pedido;
- la unicidad de un código postal por zona;
- que un producto por encargo lleve su ciclo completo, o ninguno.

Un mock de Drizzle probaría que el mock funciona. **PGlite** —Postgres 18
compilado a WebAssembly— corre dentro del proceso de Vitest: sin servidor, sin
contenedor, sin variable de entorno. `test/db.ts` levanta una base vacía, le
aplica **las 14 migraciones reales del repositorio** y la tira al terminar.

Efecto secundario valioso: si alguien genera una migración que se come un
`CHECK`, la suite falla.

### 1.2 Por qué no contra la base de trabajo

Ya pasó tres veces en este proyecto: pruebas manuales dejaron categorías
inventadas, pedidos «QA» y un pago con un id de sesión que Stripe no conoce. Una
suite apuntada ahí lo haría en cada corrida.

### 1.3 El truco que lo hace posible

`vitest.config.mts` redirige `@/db` a una base efímera. Todo el código de
dominio —servicios, consultas, acciones— corre **sin modificar**. La
alternativa era inyectar la conexión por parámetro en ~40 firmas, que es la
clase de contorsión que hace que un dominio deje de leerse.

> **Detalle que costó una hora:** el alias tiene que ir en forma de *array* y
> antes del genérico. En forma de objeto, `'@'` se comía `@/db` por prefijo y
> las pruebas acababan hablando con la base de trabajo en `:5432`.

---

## 2. Qué se prueba hoy

### 2.1 Dominio — 119 pruebas

| Archivo | Qué cubre |
|---|---|
| `modules/sales/state-machine.test.ts` | las cuatro puertas P1–P4 entre pedido y pago, en todas sus combinaciones |
| `modules/sales/validators.test.ts` | efectivo sólo en mostrador, dirección obligatoria a domicilio, producto repetido |
| `modules/sales/address.test.ts` | código postal, los 32 estados, la línea compuesta |
| `modules/payments/projection.test.ts` | qué estado de pago produce cada combinación del libro |
| `modules/payments/validators.test.ts` | cobro manual, reembolso parcial, exención con motivo |
| `modules/payments/stripe.test.ts` | traducción de estados y etiquetas de método |
| `modules/delivery/quote.test.ts` | tarifa, umbral de gratis, fuera de cobertura, exención |
| `modules/catalog/preorder.test.ts` | el ciclo semanal, husos horarios, cruce de domingo |
| `lib/stripe.test.ts` | la lista blanca de URLs de retorno |

**Una propiedad, no sólo casos:** `state-machine.test.ts` comprueba que las
puertas **nunca amplían** la máquina operativa — para las 36 combinaciones de
estados × 5 de pago × 2 de modo. Un caso suelto no habría cazado un `||` mal
puesto.

### 2.2 Base de datos — 68 pruebas

| Archivo | Qué cubre |
|---|---|
| `test/schema.test.ts` | las invariantes que viven en la base: `reserved <= on_hand`, libro inmodificable, forma de cada movimiento, ciclo de encargo completo, un CP por zona |
| `modules/sales/order-flow.test.ts` | el flujo entero: apartar, no vender de más, completar, cancelar, y el caso por encargo |
| `modules/delivery/zone-flow.test.ts` | servicio y consultas de zonas, choque de códigos, desactivar sin borrar, borrado impedido |
| `modules/inventory/stock-flow.test.ts` | recibir y ajustar: no bajar de lo reservado, no dejar negativo, el libro que queda |
| `modules/catalog/product-flow.test.ts` | alta y edición: nace borrador con inventario en cero, SKU y URL repetidos, categorías que se reemplazan |
| `modules/storefront/checkout.test.ts` | un cobro que no abre cancela el pedido y devuelve la reserva |

### 2.3 Componentes — 10 pruebas

| Archivo | Qué cubre |
|---|---|
| `modules/sales/components/order-badges.component.test.tsx` | que el estado se diga **con palabras** y no sólo con color, en los 11 estados |
| `modules/catalog/components/product-form/selling-section.component.test.tsx` | el ciclo de encargo aparece y desaparece con el tipo de abastecimiento |

La segunda no se podía escribir hasta hace poco: vivía dentro de un formulario
de 688 líneas que había que montar entero —con su acción de servidor— para
llegar a tres campos. Partirlo en secciones fue lo que la hizo posible, y de
paso destapó una duplicación real: los radios se marcaban desde `product` y el
ciclo se mostraba desde `supply`, dos fuentes para el mismo hecho.

El DOM se pide por archivo con `@vitest-environment happy-dom` en la cabecera,
no por patrón en la configuración: `environmentMatchGlobs` dejó de aplicarse en
Vitest 4 **en silencio** y las pruebas morían con «document is not defined».

---

## 3. Lo que estas pruebas ya encontraron

Tres bugs reales, ninguno visible a ojo:

**`isForeignKeyViolation` nunca funcionaba.** Comprobaba el código `23503`, pero
`ON DELETE RESTRICT` levanta `23001` (`restrict_violation`) — que es el único
caso que este proyecto usa. Borrar una zona con pedidos detrás mostraba un
volcado de SQL en vez del mensaje escrito para el operador.

**El error del driver viene envuelto.** Drizzle mete el fallo original en
`cause`, así que mirar sólo el nivel superior hacía que `isUniqueViolation`
devolviera `false` **siempre**. Un SKU duplicado llegaba como «Failed query:
insert into products…».

**El nombre de la restricción cambia por driver.** `postgres.js` lo llama
`constraint_name`; PGlite, `constraint`. Sin leer los dos, la comprobación más
específica habría discrepado entre pruebas y producción.

Y dos veces la prueba estaba mal y el sistema bien, que también cuenta: intentar
completar un pedido sin cobro (puerta P3) y registrar un cobro manual sin autor
(`payments_manual_has_actor`). Las dos restricciones hicieron su trabajo.

---

## 4. Lo que falta, por prioridad

### 4.1 🔴 Alto — reglas con dinero o stock detrás

| Qué | Capa | Por qué duele |
|---|---|---|
| `modules/payments/service` — cobro, reembolso parcial, proyección **contra base** | base | la proyección se prueba pura; que *escriba* bien, no |
| `modules/payments/webhook` — dedup de eventos, fulfilment idempotente | base | ~330 líneas que **nunca se han ejecutado** |
| ~~`modules/inventory/service`~~ — **hecho**, `stock-flow.test.ts` | base | era la operación más peligrosa del panel y ya no está desnuda |
| Concurrencia: dos pedidos por la última pieza | base | el `FOR UPDATE` existe y nadie lo ha comprobado |
| `modules/identity/service` — auto-bloqueo y último owner | base | por diseño la UI los hace inalcanzables; sólo una prueba los ejercita |

### 4.2 🟡 Medio — comportamiento visible

| Qué | Capa |
|---|---|
| Acciones con autorización: que un `staff` no pueda cobrar ni cancelar | base |
| ~~`product-form`~~ — **hecho** tras partir el formulario en secciones | componente |
| `checkout-form` — domicilio deja una sola forma de pago | componente |
| `money-panel` — el libro se lee en orden y el reembolso fallido sale rojo | componente |
| `stale-holds-list` — el estado vacío dice lo que significa | componente |

### 4.3 🟢 Bajo

| Qué | Por qué puede esperar |
|---|---|
| Consultas de listado y paginación | fallan ruidosamente, no en silencio |
| Componentes puramente presentacionales | una prueba de que un `<span>` tiene una clase no protege nada |
| SEO: sitemap y robots | se verifican en el build |

---

## 5. Cómo se escribe una prueba aquí

**Una prueba dice por qué importa, no sólo qué hace.** El nombre describe la
regla de negocio, no la función:

```ts
it('cuenta lo ya reservado, no sólo lo físico', …)   // sí
it('createOrder throws when quantity > available', …) // no
```

**El comentario explica la consecuencia, no el código.** Si la prueba existe
para proteger algo concreto, se dice:

```ts
// Sin el filtro de `stockBearingLines`, el `sale` empujaría `reserved` a −2 y
// el CHECK rechazaría la transacción: el pedido sería incompletable.
```

**Se prueba la regla, no la implementación.** `RN-003` se comprueba pidiendo de
más y verificando que no queda rastro — pedido, reserva ni movimiento. Si mañana
cambia cómo se calcula el disponible, la prueba sigue valiendo.

**Cada prueba empieza de cero.** `resetDatabase()` vacía todo entre pruebas con
`RESTART IDENTITY`, así que el orden no importa y `orderNumber` empieza en 1
siempre.

---

## 6. Comandos

```bash
pnpm test          # las tres capas
pnpm test:watch    # en desarrollo
pnpm test:ui       # navegador con el detalle de cada prueba
```

CI corre `typecheck`, `lint`, `test` y los dos builds en cada push y cada PR.
Nada necesita base de datos ni red.
