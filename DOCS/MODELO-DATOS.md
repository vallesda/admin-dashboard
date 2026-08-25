# Modelo de datos

Modelo objetivo del MVP con enfoque DDD.  
Convenciones: [README.md](README.md).  
Requisitos: [SRS.md](SRS.md).

---

## 1. Convenciones

### Identificadores

- entidades: UUID como PK;
- `Order.orderNumber`: identidad secuencial para humanos;
- SKU/slug: identificadores de negocio únicos.

### Dinero

Enteros de centavos:

```text
price_cents = 34900 → $349.00 MXN
```

No `float`. Moneda única del MVP: MXN; no se necesita columna `currency` hasta que exista una segunda moneda real.

### Tiempo

- `timestamptz` para `created_at`, `updated_at`, pagos/estados;
- UI formatea en `es-MX`;
- no derivar fechas locales con `toISOString().split('T')[0]`.

### Borrado

- Product: `status = archived`;
- Order: nunca se borra;
- InventoryMovement: no se edita desde aplicación;
- Customer: no se borra mientras exista historia; políticas de anonimización pueden entrar después.

### Source of truth

- Drizzle schema define persistencia;
- `available` es derivado, no columna;
- `OrderItem` es snapshot histórico.

---

## 2. Aggregate map

```text
Category
   │
   └── Product ────────────────┐
                               │
                               ▼
                          Inventory
                               │
                               └── InventoryMovement

Customer ──────┐
               ▼
             Order
               │
               └── OrderItem ───── snapshot de Product

AdminUser ── actor de mutaciones

Payment ─── extensión posterior de Order
```

Aggregate roots principales:

- `Product`
- `Inventory` (por Product)
- `Customer`
- `Order`
- `AdminUser`

`OrderItem` solo existe dentro de `Order`.

---

## 3. Identity & Access

### E-AdminUser — `admin_users`

```text
id              uuid PK
name            varchar(255) NOT NULL
email           text NOT NULL UNIQUE
password_hash   text NOT NULL
role            enum('staff','admin','owner') NOT NULL DEFAULT 'staff'
active          boolean NOT NULL DEFAULT true
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()
```

Índices:

```text
UNIQUE(email)
(role)
```

Invariantes:

| ID | Invariante |
|---|---|
| `INV-USR-01` | `email` único |
| `INV-USR-02` | usuario `active=false` no puede autenticarse |
| `INV-USR-03` | el hash nunca se incluye en session/read models |

---

## 4. Catalog

### E-Category — `categories`

```text
id          uuid PK
name        varchar(120) NOT NULL
slug        varchar(140) NOT NULL UNIQUE
sort_order  integer NOT NULL DEFAULT 0
active      boolean NOT NULL DEFAULT true
created_at  timestamptz NOT NULL DEFAULT now()
updated_at  timestamptz NOT NULL DEFAULT now()
```

El MVP usa categorías planas. `parent_id` no se agrega preventivamente.

### E-Product — `products`

El Product **es el SKU vendible**.

```text
id                uuid PK
category_id       uuid NULL FK → categories.id ON DELETE RESTRICT
sku               varchar(64) NOT NULL UNIQUE
name              varchar(255) NOT NULL
slug              varchar(255) NOT NULL UNIQUE
description       text NULL

price_cents       integer NOT NULL
cost_cents        integer NULL

image_url         text NULL
unit_type         enum('piece','pack') NOT NULL
net_weight_grams  integer NULL

status            enum('draft','active','archived') NOT NULL DEFAULT 'draft'

created_at        timestamptz NOT NULL DEFAULT now()
updated_at        timestamptz NOT NULL DEFAULT now()
```

Índices:

```text
UNIQUE(sku)
UNIQUE(slug)
(status)
(category_id, status)
(name)     -- iniciar simple; trigram solo si datos lo justifican
```

Invariantes:

| ID | Invariante |
|---|---|
| `INV-PRO-01` | `price_cents > 0` |
| `INV-PRO-02` | `cost_cents IS NULL OR cost_cents >= 0` |
| `INV-PRO-03` | `net_weight_grams IS NULL OR net_weight_grams > 0` |
| `INV-PRO-04` | `sku` y `slug` son únicos |
| `INV-PRO-05` | Product `archived` no vuelve a ser vendible sin transición explícita de negocio |
| `INV-PRO-06` | Solo `active` se puede añadir a un nuevo Order |

### Por qué no ProductVariant

En el MVP:

```text
SALMON-500  Salmón premium 500 g
SALMON-1KG  Salmón premium 1 kg
```

son dos Products.

Esto evita desde el primer release:

```text
product_variants
options
option_values
variant_images
variant_prices
variant_inventory
```

Si la UX futura necesita “Salmón → elegir 500 g / 1 kg”, se introduce Product como identidad comercial + Variant como SKU mediante una migración deliberada.

---

## 5. Inventory

### E-Inventory — `inventory`

Una fila por Product.

```text
product_id           uuid PK FK → products.id ON DELETE RESTRICT
on_hand              integer NOT NULL DEFAULT 0
reserved             integer NOT NULL DEFAULT 0
low_stock_threshold  integer NOT NULL DEFAULT 0
updated_at           timestamptz NOT NULL DEFAULT now()
```

Valor derivado:

```text
available = on_hand - reserved
```

Invariantes:

| ID | Invariante |
|---|---|
| `INV-STK-01` | `on_hand >= 0` |
| `INV-STK-02` | `reserved >= 0` |
| `INV-STK-03` | `reserved <= on_hand` |
| `INV-STK-04` | existe como máximo una fila por Product |
| `INV-STK-05` | `available` no se persiste |

### E-InventoryMovement — `inventory_movements`

Ledger operativo.

```text
id               bigserial PK
product_id       uuid NOT NULL FK → products.id ON DELETE RESTRICT
type             enum('receive','adjustment','reserve','release','sale') NOT NULL

on_hand_delta    integer NOT NULL DEFAULT 0
reserved_delta   integer NOT NULL DEFAULT 0

order_id         uuid NULL
note             text NULL
created_by       uuid NULL FK → admin_users.id ON DELETE SET NULL
created_at       timestamptz NOT NULL DEFAULT now()
```

Índices:

```text
(product_id, created_at DESC)
(order_id)
(type, created_at DESC)
```

Invariantes:

| ID | Invariante |
|---|---|
| `INV-MOV-01` | no puede tener ambos deltas en cero |
| `INV-MOV-02` | `receive`: `on_hand_delta > 0`, `reserved_delta = 0` |
| `INV-MOV-03` | `reserve`: `on_hand_delta = 0`, `reserved_delta > 0`, `order_id NOT NULL` |
| `INV-MOV-04` | `release`: `on_hand_delta = 0`, `reserved_delta < 0`, `order_id NOT NULL` |
| `INV-MOV-05` | `sale`: `on_hand_delta < 0` y `reserved_delta = on_hand_delta`, `order_id NOT NULL` |
| `INV-MOV-06` | `adjustment` requiere `note` |
| `INV-MOV-07` | cada movimiento y actualización de `inventory` ocurren en la misma transacción |

### Semántica de movimientos

Estado inicial:

```text
onHand = 20
reserved = 0
available = 20
```

Reserva de 2:

```text
movement reserve:
onHandDelta = 0
reservedDelta = +2

resultado:
onHand = 20
reserved = 2
available = 18
```

Venta de esas 2:

```text
movement sale:
onHandDelta = -2
reservedDelta = -2

resultado:
onHand = 18
reserved = 0
available = 18
```

Cancelación antes de completar:

```text
movement release:
onHandDelta = 0
reservedDelta = -2
```

---

## 6. Customers

### E-Customer — `customers`

```text
id          uuid PK
name        varchar(255) NOT NULL
phone       varchar(32) NOT NULL
email       varchar(255) NULL
created_at  timestamptz NOT NULL DEFAULT now()
updated_at  timestamptz NOT NULL DEFAULT now()
```

Índices:

```text
(name)
(phone)
(email)
```

No se exige email único en el MVP: el negocio puede tener compras familiares/compartidas y no se quiere convertir una regla de UX en identidad global antes de necesitarla.

Invariantes:

| ID | Invariante |
|---|---|
| `INV-CUS-01` | `name` y `phone` obligatorios |
| `INV-CUS-02` | Customer no implica cuenta autenticada |
| `INV-CUS-03` | cambiar contacto no altera snapshots de Orders pasados |

---

## 7. Sales

### E-Order — `orders`

```text
id                    uuid PK
order_number          bigint GENERATED AS IDENTITY UNIQUE

customer_id           uuid NOT NULL FK → customers.id ON DELETE RESTRICT

status                enum(
                        'pending',
                        'confirmed',
                        'preparing',
                        'ready',
                        'completed',
                        'cancelled'
                      ) NOT NULL DEFAULT 'pending'

payment_status        enum('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid'

fulfillment_type      enum('pickup','delivery') NOT NULL DEFAULT 'pickup'

customer_name         varchar(255) NOT NULL
customer_phone        varchar(32) NOT NULL
customer_email        varchar(255) NULL
delivery_address      text NULL

subtotal_cents        integer NOT NULL
delivery_fee_cents    integer NOT NULL DEFAULT 0
total_cents           integer NOT NULL

notes                 text NULL

created_at            timestamptz NOT NULL DEFAULT now()
updated_at            timestamptz NOT NULL DEFAULT now()
completed_at          timestamptz NULL
cancelled_at          timestamptz NULL
```

Índices:

```text
UNIQUE(order_number)
(status, created_at DESC)
(payment_status, created_at DESC)
(customer_id, created_at DESC)
(created_at DESC, id)
```

Invariantes:

| ID | Invariante |
|---|---|
| `INV-ORD-01` | `subtotal_cents >= 0`, `delivery_fee_cents >= 0` |
| `INV-ORD-02` | `total_cents = subtotal_cents + delivery_fee_cents` |
| `INV-ORD-03` | `fulfillment_type='delivery' ⇒ delivery_address IS NOT NULL` |
| `INV-ORD-04` | `completed` y `cancelled` son terminales |
| `INV-ORD-05` | `completed_at` solo existe para `completed` |
| `INV-ORD-06` | `cancelled_at` solo existe para `cancelled` |
| `INV-ORD-07` | estado de pago no determina estado operativo |

### E-OrderItem — `order_items`

```text
id                uuid PK
order_id          uuid NOT NULL FK → orders.id ON DELETE RESTRICT
product_id        uuid NOT NULL FK → products.id ON DELETE RESTRICT

product_name      varchar(255) NOT NULL
sku               varchar(64) NOT NULL
unit_price_cents  integer NOT NULL
quantity          integer NOT NULL
line_total_cents  integer NOT NULL
```

Índices:

```text
(order_id)
(product_id)
```

Invariantes:

| ID | Invariante |
|---|---|
| `INV-ITM-01` | `quantity > 0` |
| `INV-ITM-02` | `unit_price_cents > 0` |
| `INV-ITM-03` | `line_total_cents = unit_price_cents * quantity` |
| `INV-ITM-04` | snapshot (`product_name`, `sku`, `unit_price_cents`) no se recalcula después de crear Order |
| `INV-ITM-05` | no se edita un OrderItem independientemente de su Order |

---

## 8. Máquina de estados de Order

### Estados

- `ST-ORD-pending`
- `ST-ORD-confirmed`
- `ST-ORD-preparing`
- `ST-ORD-ready`
- `ST-ORD-completed`
- `ST-ORD-cancelled`

### Transiciones

| ID | Desde | Hacia |
|---|---|---|
| `TR-ORD-01` | pending | confirmed |
| `TR-ORD-02` | pending | cancelled |
| `TR-ORD-03` | confirmed | preparing |
| `TR-ORD-04` | confirmed | cancelled |
| `TR-ORD-05` | preparing | ready |
| `TR-ORD-06` | preparing | cancelled |
| `TR-ORD-07` | ready | completed |
| `TR-ORD-08` | ready | cancelled |

No existe transición desde `completed` o `cancelled`.

### Efectos sobre Inventory

Crear Order:
: reserva unidades.

Cancelar:
: libera reserva de todas las líneas que no fueron vendidas.

Completar:
: convierte cada reserva en venta.

Todo ocurre dentro de la misma transacción que cambia Order.

---

## 9. Estado de pago

Máquina independiente:

```text
unpaid → paid → refunded
```

Para el admin MVP es manual.

No se permite:

```text
refunded → paid
```

Cuando entre un gateway se agrega `Payment` y, si se necesita, estados `pending`/`failed` mediante migración.

---

## 10. Payment — extensión post-MVP

### E-Payment — `payments`

No se crea hasta la fase de integración.

Diseño esperado:

```text
id                   uuid PK
order_id             uuid NOT NULL FK → orders.id
provider              text NOT NULL
provider_payment_id   text NOT NULL
amount_cents          integer NOT NULL
status                enum('pending','paid','failed','refunded')
created_at            timestamptz NOT NULL
updated_at            timestamptz NOT NULL
```

Constraint futuro:

```text
UNIQUE(provider, provider_payment_id)
```

Sales continúa siendo dueño de `Order.paymentStatus`; Payments traduce eventos externos a comandos de Sales.

---

## 11. Legacy y migración

Durante F1/F2 permanecen:

```text
users
customers
invoices
revenue
```

de `legacy.ts`.

Estrategia:

1. `admin_users` reemplaza `users` para identidad administrativa.
2. catálogo/inventario nacen sin tocar invoices.
3. al entrar Sales se migra/reemplaza `customers` del tutorial.
4. `orders`/`order_items` reemplazan invoices.
5. al cerrar Sales se eliminan `invoices` y `revenue`.

Nunca se crea un modelo `Invoice` ecommerce solo para preservar el tutorial.

---

## 12. Índices mínimos

MVP:

```text
products.sku UNIQUE
products.slug UNIQUE
products(status)
products(category_id, status)

inventory PK(product_id)

inventory_movements(product_id, created_at DESC)
inventory_movements(order_id)

customers(name)
customers(phone)
customers(email)

orders(order_number) UNIQUE
orders(status, created_at DESC)
orders(customer_id, created_at DESC)
orders(created_at DESC, id)

order_items(order_id)
order_items(product_id)
```

No se agrega `pg_trgm`, full-text search ni keyset pagination antes de que el volumen lo exija. OFFSET pagination es suficiente para el primer release.

---

## 13. Qué puede agregarse sin romper el núcleo

Después:

```text
ProductVariant       → divide identidad comercial de SKU
Lot                  → trazabilidad/caducidad
Warehouse            → inventario multiubicación
Address               → direcciones guardadas
DeliverySlot          → capacidad/ventanas
Payment               → proveedor externo
Discount              → pricing/promotions
```

Todos se conectan a agregados existentes; ninguno exige rehacer el significado de OrderItem snapshot o Inventory reservation.
