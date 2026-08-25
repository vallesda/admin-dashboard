# Arquitectura — el estado construido

> Estado: Fase 0 completada · Next 16.3.2 · React 19.2.8 · Postgres (Neon) · Drizzle 0.45

**Este documento describe el presente: lo que ya está construido y funcionando.**
Lo que se va a construir vive en el resto de la documentación —
ver el índice en [README.md](README.md):
[SRS](SRS.md) · [MODELO-DATOS](MODELO-DATOS.md) · [FLUJOS](FLUJOS.md) ·
[HISTORIAS](HISTORIAS.md) · [PLAN](PLAN.md) · [GLOSARIO](GLOSARIO.md)

> **Nota:** el negocio quedó definido después de escribir este documento —
> pescadería en línea en México, entrega local con ventanas horarias, B2C, en
> español. El §5 «Arquitectura objetivo» y el §6 «Roadmap» de abajo quedan
> **superados** por [PLAN.md](PLAN.md), que corrige dos decisiones: la entrega
> pasa antes que los pedidos, y la columna `rol` sube a la primera fase.

## 1. Qué es este proyecto

Es el tutorial oficial **Next.js Learn** ("Acme Dashboard"), completado hasta el
capítulo de autenticación. El historial de git lo confirma capítulo por capítulo:

```
aa69f4e  first commit
9590be0  First commit, adds pages and layout
88165b0  Add storage and data fetching
6f3bfbe  Server Actions, Error handling, Pagination, Data Mutations
fb8a4b4  add accessibility to forms
c7c9f0c  auth login and logout
```

El capítulo de Customers quedó sin terminar: `/dashboard/customers` es un stub de
una línea, y tanto `fetchFilteredCustomers()` como `app/ui/customers/table.tsx`
son código muerto que nadie importa.

## 2. Arquitectura actual

### Rutas

```
app/
├── page.tsx                        /                     landing
├── login/page.tsx                  /login
└── dashboard/
    ├── layout.tsx                  shell con SideNav
    ├── (overview)/                 route group (no añade segmento a la URL)
    │   ├── page.tsx                /dashboard
    │   └── loading.tsx             ← aislado al overview gracias al grupo
    ├── customers/page.tsx          /dashboard/customers   (STUB)
    └── invoices/
        ├── page.tsx                /dashboard/invoices    lista + búsqueda + paginación
        ├── error.tsx               error boundary
        ├── create/page.tsx
        └── [id]/edit/
            ├── page.tsx
            └── not-found.tsx
```

El route group `(overview)` existe precisamente para que `loading.tsx` aplique
solo a `/dashboard` y no se herede en las rutas hijas.

### Tres patrones de carga de datos conviven

**1. Streaming por componente** (`/dashboard`). La página es `async` pero no
espera nada; cada hijo que consulta la BD va envuelto en su propio `<Suspense>`
con su skeleton. La consulta vive en la hoja, no en la página.

**2. Await en página + un Suspense** (`/dashboard/invoices`). `fetchInvoicesPages`
se espera a nivel de página porque `<Pagination>` lo necesita; la tabla hace
streaming. El `key={query + currentPage}` del Suspense es funcional, no
decorativo: fuerza el remontaje para que el skeleton reaparezca en cada búsqueda.

**3. Await paralelo** (formularios). `Promise.all([fetchInvoiceById, fetchCustomers])`.

### La URL es el estado

No hay estado global. `search.tsx` escribe `?query=` con `useDebouncedCallback`
de 300 ms y siempre resetea `page=1`; `pagination.tsx` escribe `?page=`. El
servidor lee ambos de `searchParams`. Esto hace las búsquedas compartibles por
enlace y elimina la sincronización cliente/servidor.

### Mutaciones

Server Actions en `app/lib/actions.ts` con validación Zod, `useActionState` para
el estado del formulario y errores por campo con `aria-describedby` +
`aria-live="polite"`. Tras cada mutación, `revalidatePath` y `redirect`.

### Autenticación

| Archivo | Rol |
|---|---|
| `auth.config.ts` | Config edge-safe. El callback `authorized` protege `/dashboard`. |
| `auth.ts` | Instancia completa: provider Credentials + bcrypt. |
| `proxy.ts` | El middleware de Next 16 (renombrado de `middleware.ts`). |

Sesión por JWT. No hay `app/api/auth/[...nextauth]/route.ts`: el login pasa por
la server action `authenticate` y el logout por una action inline en `sidenav.tsx`.

## 3. Esquema de base de datos

Antes de la Fase 0 el esquema **solo existía dentro de un route handler**
(`app/seed/route.ts`) y no había migraciones. Cuatro tablas:

| Tabla | Columnas |
|---|---|
| `users` | id uuid PK, name, email text UNIQUE, password text |
| `customers` | id uuid PK, name, email, image_url |
| `invoices` | id uuid PK, customer_id uuid, amount int (céntimos), status varchar, date date |
| `revenue` | month varchar(4), revenue int |

La introspección en vivo reveló: **cero foreign keys**, sin CHECK en `status`
(un `varchar(255)` que acepta cualquier cadena), `revenue` **sin primary key**,
índices solo en las PKs, sin `pg_trgm`, y `reltuples = -1` en las cuatro tablas
— nunca se había ejecutado `ANALYZE`, así que el planificador operaba a ciegas.

## 4. Qué se arregló en la Fase 0

| # | Problema | Solución |
|---|---|---|
| 1 | **El proyecto no compilaba.** `createInvoice` usaba `.parse()` en vez de `.safeParse()`: 4 errores TS más un fallo de sobrecarga en `useActionState`. | `.safeParse()` + `Promise<State>` como tipo de retorno explícito. |
| 2 | **5 pools de conexión** independientes (`data.ts`, `actions.ts`, `auth.ts`, `seed`, `query`) contra el presupuesto de Neon. | `db/index.ts`: un único cliente, cacheado en `globalThis` para no filtrar pools en hot-reload. |
| 3 | **`/seed` y `/query` públicos** para cualquier anónimo. `/seed` además duplicaba invoices en cada visita. | Rutas eliminadas. El seed pasa a `scripts/seed.ts` (`pnpm db:seed`), ahora idempotente y transaccional de verdad. |
| 4 | Sin migraciones ni FKs. | Drizzle + `db/schema/`, migración baseline, FK `invoices → customers` (ON DELETE RESTRICT), CHECK en `status`, PK en `revenue`, 5 índices + `pg_trgm`, `ANALYZE`. |
| 5 | Server actions **sin verificar sesión**. | `app/lib/auth-guard.ts` con `requireSession()` / `requireRole()`, aplicado a las tres mutaciones. |
| 6 | `19.99 * 100 = 1998.9999...` | `Math.round()` en el borde de escritura. |
| 7 | El hash bcrypt llegaba a la sesión (`SELECT *`). | SELECT explícito + se devuelven solo `{id, name, email}`. |
| 8 | `?page=-5` → OFFSET negativo → 500. | Clamp en `fetchFilteredInvoices`. |
| 9 | Sleep artificial de 3 s + `console.log` en cada request. | Eliminados. |
| 10 | `next` y `react` en `"latest"` — deriva de versiones. | Fijados a 16.3.2 / 19.2.8. |

### Por qué `sql.begin` no protegía nada

El seed original envolvía todo en una transacción... que no lo era:

```ts
await sql.begin((sql) => [ seedUsers(), seedCustomers(), ... ]);
//                 ^^^ este parámetro se ignora
```

Las funciones `seedX()` cerraban sobre el `sql` del módulo, no sobre el `sql`
transaccional del callback. El trabajo corría fuera de la transacción.

## 5. Arquitectura objetivo

### Estructura por dominio

`app/lib/data.ts` (218 líneas) y `actions.ts` cortan por **tipo técnico**. Con
cuatro dominios eso degenera en archivos de más de mil líneas que nadie revisa.
Se pasa a corte por dominio:

```
db/
  index.ts                 cliente único
  schema/{legacy,products,orders,customers,users}.ts
  migrations/
app/lib/
  auth-guard.ts            requireSession() / requireRole()
  <dominio>/
    queries.ts             lecturas (server-only)
    actions.ts             'use server'
    validation.ts          Zod compartido form ↔ action
```

No se adopta `src/`: el alias `@/*` ya apunta a `./*` y mover todo obligaría a
tocar cada import sin ganancia. `validation.ts` va aparte porque hoy los
esquemas Zod viven dentro del archivo `'use server'` y no se pueden importar
desde el cliente sin arrastrar el bundle de servidor.

### Decisiones de esquema, argumentadas

**Dinero: enteros de céntimos, no `NUMERIC`.** Mantiene la convención existente,
evita que postgres.js devuelva `NUMERIC` como string, y JS es exacto en enteros
hasta 2^53. Se añade `currency char(3)` desde el día uno: meter moneda después
obliga a reescribir cada fila y cada consulta.

**Variantes en tabla propia.** `products` (identidad) → `product_variants` (SKU,
precio, stock). Un ecommerce sin variantes no existe, y añadirlas más tarde
obliga a migrar todos los pedidos históricos.

**Inventario: columna `stock` + tabla `inventory_movements`.** La columna da
lecturas O(1) para el listado; el ledger explica *por qué* cambió el stock. Solo
ledger sería más puro pero cada listado tendría que agregar; solo columna no
deja auditar.

**Pedidos con snapshot de precio.** `order_items.unit_price_cents` congela el
precio en el momento de la compra. Sin esto, cambiar el precio de un producto
reescribe el histórico de ventas — error clásico e irreversible.

**Estados como enum de Postgres**, no `varchar(255)`.

**`timestamptz` + `created_at`/`updated_at` en todo**, y `deleted_at` en products
y customers: nunca se borra un producto que aparece en pedidos históricos.

**`invoices` se conserva durante la transición.** Es la única prueba viva de que
el CRUD, la búsqueda y la paginación funcionan. Se retira al cerrar la Fase 2.

### RBAC

Columna `role` enum (`owner|admin|staff`). El helper `requireRole()` se invoca
**dentro de cada server action**, no solo en el middleware: el callback
`authorized` protege *páginas*, pero las server actions son endpoints POST que
se pueden invocar directamente sin pasar por él. Defensa en profundidad.

## 6. Roadmap

| Fase | Contenido | Criterio de salida |
|---|---|---|
| **0** ✅ | Cimientos: build, migraciones, FKs, índices, auth en actions | `typecheck`/`lint`/`build` en 0, `/seed` y `/query` en 404 |
| **1** | Catálogo: products, variants, inventory + CRUD + imágenes | Alta de producto con 2 variantes y stock en el listado |
| **2** | Pedidos: orders, order_items, máquina de estados; retirar `invoices` | Pedido que descuenta stock vía ledger |
| **3** | Clientes y RBAC: direcciones, historial, roles en UI y actions | Un `staff` no puede borrar productos |
| **4** | Escalado: paginación keyset sobre `(date,id)`, `COUNT(*) OVER ()`, tests | Búsqueda estable con 10⁵ filas |

### Deuda técnica pendiente (documentada, no urgente)

- **Fechas con desfase de un día.** La columna es `DATE`, se escribe con
  `toISOString()` (UTC) y se formatea en zona local: para usuarios en UTC
  negativo la fecha retrocede un día. Se corrige al pasar a `timestamptz`.
- **Búsqueda que no encuentra lo que ves.** `invoices.date::text ILIKE` compara
  contra `YYYY-MM-DD`, pero la UI muestra `Jan 1, 2024`.
- **WHERE duplicado** en `fetchFilteredInvoices` y `fetchInvoicesPages`: dos
  escaneos por carga. Se colapsa con `COUNT(*) OVER ()` en la Fase 4.
- **`fetchInvoicesPages` fuera del Suspense** bloquea el shell.
- **Código muerto**: `fetchFilteredCustomers` y `app/ui/customers/table.tsx`.

## 7. Fuera de alcance del MVP

Procesamiento de pagos (el admin registra, no cobra) · multi-tenancy (meterlo
ahora dobla la complejidad de cada consulta) · i18n (decisión firme: el producto
es monolingüe en español, ver [GLOSARIO.md](GLOSARIO.md)) · motor de búsqueda dedicado
(`pg_trgm` aguanta hasta ~10⁵ filas) · event sourcing · webhooks · devoluciones
parciales.

## 8. Comandos

```bash
pnpm dev            # servidor de desarrollo
pnpm typecheck      # tsc --noEmit
pnpm lint
pnpm build

pnpm db:generate    # genera migración desde db/schema/
pnpm db:migrate     # aplica migraciones pendientes
pnpm db:studio      # explorador visual
pnpm db:seed        # inserta datos de ejemplo (idempotente)
```

En una base **ya existente** creada por el tutorial, ejecutar una sola vez:

```bash
node --env-file=.env --experimental-strip-types scripts/baseline.ts
```

Añade las restricciones que faltaban y registra la migración 0000 como aplicada.
Una base nueva no lo necesita: le basta `pnpm db:migrate`.
