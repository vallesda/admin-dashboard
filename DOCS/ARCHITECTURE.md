# Arquitectura

> Estado base: Next.js 16.3.2 · React 19.2.8 · PostgreSQL · Drizzle ORM · Auth.js · Zod · Tailwind

Este documento describe dos cosas claramente separadas:

1. **Arquitectura actual**: lo que ya existe en el repositorio.
2. **Arquitectura objetivo**: cómo evolucionará el repo hacia el ecommerce DDD sin reescribirlo.

El alcance funcional vive en [SRS.md](SRS.md); el esquema objetivo en [MODELO-DATOS.md](MODELO-DATOS.md).

---

## 1. Estado actual

El proyecto parte del tutorial oficial de Next.js Dashboard. Hoy ya demuestra de extremo a extremo:

- App Router;
- layouts y route groups;
- Server Components;
- Client Components solo donde hay interacción;
- streaming con `Suspense`;
- búsqueda/paginación con estado en la URL;
- Server Actions;
- Zod;
- Auth.js con Credentials;
- bcrypt;
- PostgreSQL;
- Drizzle + migrations;
- seed por script;
- `typecheck`, `lint`, `build`.

### Rutas heredadas

```text
app/
├── page.tsx
├── login/
└── dashboard/
    ├── (overview)/
    ├── invoices/
    └── customers/
```

El flujo funcional más completo es `invoices`: lista, búsqueda, paginación, alta, edición y borrado. Se usa como **scaffold de interacción**, no como modelo de dominio final.

### Persistencia heredada

```text
users
customers
invoices
revenue
```

Estas tablas están modeladas en `db/schema/legacy.ts`. `invoices` y `revenue` no pertenecen al dominio ecommerce objetivo.

---

## 2. Lo que se conserva

La migración a ecommerce **no es una reescritura**.

Se conservan como decisiones estructurales:

```text
Next.js App Router
Server Components por defecto
Client Components en hojas interactivas
Server Actions para comandos internos
Route Handlers para boundaries externas
Suspense + skeletons
URL como estado de búsqueda/paginación
Auth.js
PostgreSQL
Drizzle
Zod
Tailwind
pnpm
```

También se conserva la regla de dinero en enteros: `34900` representa `$349.00 MXN`.

---

## 3. Arquitectura objetivo: modular monolith DDD

```text
┌──────────────────────────────────────────────────────────┐
│                     Next.js application                  │
│                                                          │
│  Admin UI                       Storefront UI             │
│     │                               │                    │
│     └──────────────┬────────────────┘                    │
│                    ▼                                     │
│            Application adapters                          │
│        Server Actions / Route Handlers                   │
│                    │                                     │
│                    ▼                                     │
│              Domain modules                              │
│  IAM · Catalog · Inventory · Customers · Sales          │
│                    │                                     │
│                    ▼                                     │
│            Drizzle / PostgreSQL                          │
└──────────────────────────────────────────────────────────┘
```

No hay comunicación HTTP interna entre módulos. No hay microservicios. Las fronteras de DDD son **fronteras de ownership y reglas**, no procesos separados.

---

## 4. Bounded contexts y ownership

### IAM — Identity & Access

Posee:

- `AdminUser`
- roles `staff | admin | owner`
- autorización de mutaciones

No posee clientes de la tienda.

### CAT — Catalog

Posee:

- `Category`
- `Product`

`Product` es el **aggregate root** de catálogo y representa directamente un SKU vendible en el MVP.

Ejemplo:

```text
Product: Salmón premium 500 g
sku: SAL-500
price: 34900
```

No existe `ProductVariant`.

### INV — Inventory

Posee:

- `Inventory`
- `InventoryMovement`

`Inventory` es una proyección mutable por `productId`. `InventoryMovement` explica cada cambio.

Regla central:

```text
available = onHand - reserved
```

### CLI — Customers

Posee:

- `Customer`

En el MVP no existe autenticación de cliente. Es un registro de contacto/comprador usado por Sales.

### SAL — Sales

Posee:

- `Order`
- `OrderItem`
- máquina de estados del pedido
- estado de pago manual del MVP
- snapshots y totales

`Order` es aggregate root; `OrderItem` no se modifica independientemente.

### ADM — Admin Read Models

No posee tablas de negocio. Construye vistas como:

- ventas de hoy;
- pedidos abiertos;
- productos con bajo stock;
- pedidos recientes.

Puede leer varios bounded contexts porque es un read-model.

### TDA — Storefront

No crea un segundo dominio. Orquesta:

```text
Catalog → disponibilidad de Inventory → creación de Order
```

### PAG — Payments

Extensión posterior. Integra un proveedor externo mediante adapter/webhook y actualiza el estado de pago del pedido mediante Sales.

---

## 5. Estructura de proyecto objetivo

DDD no requiere una carpeta `domain/` dentro de cada carpeta. Para este tamaño se prefiere un layout corto por bounded context:

```text
app/
├── (auth)/
│   └── login/
├── (admin)/
│   └── admin/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── products/
│       ├── inventory/
│       ├── orders/
│       └── customers/
├── (store)/
│   ├── page.tsx
│   ├── products/
│   ├── cart/
│   └── checkout/
└── api/
    └── webhooks/
        └── payments/

modules/
├── identity/
│   ├── service.ts
│   └── validators.ts
├── catalog/
│   ├── actions.ts
│   ├── queries.ts
│   ├── service.ts
│   ├── validators.ts
│   └── components/
├── inventory/
│   ├── actions.ts
│   ├── queries.ts
│   ├── service.ts
│   ├── validators.ts
│   └── components/
├── customers/
│   ├── actions.ts
│   ├── queries.ts
│   └── validators.ts
├── sales/
│   ├── actions.ts
│   ├── queries.ts
│   ├── service.ts
│   ├── validators.ts
│   └── components/
└── admin/
    └── queries.ts

db/
├── index.ts
├── schema/
│   ├── index.ts
│   ├── legacy.ts
│   ├── identity.ts
│   ├── catalog.ts
│   ├── inventory.ts
│   ├── customers.ts
│   └── sales.ts
└── migrations/

lib/
├── auth/
├── env.ts
├── errors.ts
└── money.ts
```

### Responsabilidad de cada archivo

`actions.ts`
: Adapter Next.js. `use server`, autorización, parseo de input, llamada al servicio, `revalidatePath`/`redirect`.

`service.ts`
: Casos de uso y reglas de negocio. No importa React. Es donde vive una transacción.

`queries.ts`
: Lecturas/read-models. Puede devolver formas específicas para tablas del admin.

`validators.ts`
: Schemas Zod de entrada. No duplican el schema de DB; validan intención de usuario.

`components/`
: Componentes propios del bounded context.

---

## 6. Flujo de lectura

Ejemplo `GET /admin/products`:

```text
Page (Server Component)
     │
     ▼
catalog/queries.ts
     │
     ▼
Drizzle
     │
     ▼
PostgreSQL
```

No se crea una API REST interna para que un Server Component consulte la misma app.

La búsqueda/paginación mantiene el patrón existente de estado en URL:

```text
/admin/products?query=salmon&page=2
```

---

## 7. Flujo de comando

Ejemplo de alta de producto:

```text
Client Form
   │
   ▼
createProductAction()
   │
   ├─ requireRole('admin')
   ├─ Zod
   ▼
catalog/service.createProduct()
   │
   ▼
Drizzle
   │
   ▼
PostgreSQL
```

La action no contiene SQL ni reglas como “un producto archivado no puede publicarse”. Esas reglas pertenecen a Catalog.

---

## 8. Transacciones

Se usa una transacción cuando una operación debe ser **todo o nada**.

### Crear pedido

```text
BEGIN

1. validar Customer
2. leer Products activos
3. validar Inventory.available
4. calcular precios desde Product
5. crear Order
6. crear OrderItems con snapshot
7. reservar Inventory
8. insertar InventoryMovements

COMMIT
```

Si cualquiera falla, no existe pedido parcialmente creado ni stock parcialmente reservado.

### Cancelar pedido

```text
BEGIN

1. validar transición
2. Order → cancelled
3. liberar reserved
4. insertar movement release

COMMIT
```

El estado de pago se trata por separado.

---

## 9. Dependencias entre módulos

Reglas:

- `inventory` puede referenciar `catalog.Product.id`.
- `sales` puede leer `catalog`, `inventory`, `customers`.
- `catalog` nunca importa `sales`.
- `inventory` no conoce componentes de `sales`.
- `admin` puede hacer queries cruzadas, pero no es dueño de mutaciones de negocio.
- componentes React no importan `db/index.ts` directamente.
- `actions.ts` no escribe tablas de otro contexto con SQL ad hoc.

### Excepción pragmática

Crear un pedido cruza Sales + Inventory. En un modular monolith es correcto coordinar ambos dentro de **una transacción de aplicación**. No se introduce event bus solo para simular independencia física que todavía no existe.

---

## 10. Tipos y validación

La fuente de verdad persistente es Drizzle:

```ts
type Product = typeof products.$inferSelect;
type NewProduct = typeof products.$inferInsert;
```

No se crea un `app/lib/definitions.ts` global para repetir manualmente cada entidad.

Zod modela **inputs**, no reemplaza al schema:

```text
Drizzle → qué existe
Zod     → qué puede pedir un usuario
Service → qué está permitido por negocio
DB      → qué jamás puede violarse
```

---

## 11. Seguridad

Dos capas:

1. `auth.config.ts`/proxy protege navegación.
2. Cada Server Action verifica sesión o rol.

Esto es obligatorio porque una mutación se puede invocar sin utilizar la pantalla que muestra el botón.

3. Las páginas que **escriben** catálogo o configuran reparto comprueban rol
   también a nivel de página, no sólo escondiendo el botón.

El punto 3 se añadió el 3 de septiembre de 2026. Los `<Can role="admin">`
ocultaban los botones, pero un `staff` que tecleara `/dashboard/products/create`
veía el formulario entero y sólo se enteraba al enviarlo. Las nueve pantallas de
alta y edición de producto, categoría, paquete y zona devuelven `<Forbidden>`
desde el principio.

Las de **lectura** —pedidos, inventario, clientes, listados de catálogo y el
panel de inicio— siguen abiertas a `staff` a propósito: es lo que dice la tabla
de abajo, y el panel de inicio muestra pedidos abiertos, ventas del día y bajo
stock, que son cifras operativas, no márgenes.

Matriz base:

| Acción | staff | admin | owner |
|---|:--:|:--:|:--:|
| Ver catálogo/inventario/pedidos | ✅ | ✅ | ✅ |
| Recibir stock | ✅ | ✅ | ✅ |
| Actualizar estado operativo de pedido | ✅ | ✅ | ✅ |
| Crear/editar/archivar producto | ❌ | ✅ | ✅ |
| Ajuste manual de inventario | ❌ | ✅ | ✅ |
| Cancelar pedido / cambiar pago manual | ❌ | ✅ | ✅ |
| Gestionar usuarios/roles | ❌ | ❌ | ✅ |

---

## 12. Estrategia de transición desde el tutorial

No se convierte `Invoice` lentamente en `Order`.

### Etapa A

Se mantienen las tablas legacy para que el demo existente siga funcionando mientras nacen:

```text
admin_users
categories
products
inventory
inventory_movements
```

### Etapa B

Se construyen:

```text
customers
orders
order_items
```

y la UI `/admin/orders` reemplaza funcionalmente a `/dashboard/invoices`.

### Etapa C

Cuando Orders demuestra:

- lista;
- búsqueda;
- creación;
- detalle;
- cambio de estado;
- cancelación;
- reserva/liberación de inventario;

se eliminan:

```text
invoices
revenue
UI de invoices
tipos/queries legacy asociados
```

`revenue` se reemplaza por métricas derivadas de `orders`.

---

## 13. Decisiones que NO tomamos todavía

### Variantes

No. Cada Product es vendible directamente.

### Lotes/FEFO

No. `InventoryMovement` da auditoría suficiente para el primer release. Si la operación exige trazabilidad sanitaria por lote, se agrega un bounded context/subdominio de lotes con evidencia real.

### Microservicios

No. No resuelven ningún problema actual y complican transacciones de stock/orden.

### Event sourcing

No. `inventory_movements` es un audit ledger, pero `inventory` sigue siendo la proyección autoritativa para disponibilidad. No se reconstruye todo el sistema desde eventos.

### API pública

No para el admin/storefront internos. Route Handlers se reservan para integraciones externas y, posteriormente, webhooks.

---

## 14. Quality gates

Cada PR:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Cuando entren reglas de inventario/pedido se agregan tests:

- unitarios para transiciones y cálculo de dinero;
- integración DB para reserva/cancelación concurrente;
- smoke/e2e solo en los recorridos de mayor valor.

La arquitectura debe favorecer releases pequeños; una fase que solo “prepara infraestructura” durante semanas está mal cortada.
