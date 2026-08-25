# Flujos

Cada flujo declara actor, disparador, reglas y frontera transaccional.  
Requisitos: [SRS.md](SRS.md).  
Modelo: [MODELO-DATOS.md](MODELO-DATOS.md).

---

## 1. Identity & Access

### `FLU-IAM-01` — Login administrativo

**Actor:** staff/admin/owner  
**Disparador:** envía email/password  
**Realiza:** `RF-IAM-001`, `RNF-SEG-001`, `RNF-SEG-002`

1. Zod valida formato.
2. Se busca `AdminUser` por email.
3. `active=false` → rechazo.
4. bcrypt compara password.
5. Session/JWT recibe únicamente `id`, `name`, `email`, `role`.
6. Se redirige a `/admin`.

**Errores**
- credenciales inválidas → mensaje genérico;
- usuario inactivo → no sesión;
- hash nunca se serializa.

---

## 2. Catalog

### `FLU-CAT-01` — Crear Product

**Actor:** admin/owner  
**Disparador:** “Nuevo producto”  
**Realiza:** `RF-CAT-002`, `RF-CAT-003`, `RF-CAT-008`, `RN-001`, `RN-002`

1. Form: SKU, nombre, slug, descripción, categoría, precio, costo opcional, unidad/peso, imagen.
2. `createProductAction` verifica `requireRole('admin')`.
3. Zod valida input.
4. Catalog service convierte precio de UI a centavos de forma segura.
5. DB valida SKU/slug únicos y precio > 0.
6. Se crea Product como `draft`.
7. Se crea/asegura su fila Inventory en cero.
8. `revalidatePath('/admin/products')`.
9. Redirect al detalle/lista.

**Errores**
- SKU/slug duplicado;
- precio <= 0;
- categoría inexistente.

### `FLU-CAT-02` — Editar Product

**Actor:** admin/owner  
**Realiza:** `RF-CAT-002`, `RF-CAT-003`

Se pueden cambiar datos actuales del catálogo. Nada toca OrderItems históricos.

### `FLU-CAT-03` — Publicar/archivar

**Actor:** admin/owner  
**Realiza:** `RF-CAT-005`, `RF-CAT-006`, `RF-CAT-007`, `RN-007`

- `draft → active`: producto vendible.
- `active/draft → archived`: deja de venderse.
- nunca `DELETE` de un Product con historia.

### `FLU-CAT-04` — Buscar y paginar

**Actor:** staff/admin/owner  
**Realiza:** `RF-CAT-004`, `RNF-REND-003`

1. `Search` actualiza `?query=`.
2. Debounce y reset de `page=1`.
3. Server Component recibe `searchParams`.
4. `catalog/queries.ts` consulta página + total.
5. URL es compartible/reproducible.

---

## 3. Inventory

### `FLU-INV-01` — Recibir stock

**Actor:** staff/admin/owner  
**Disparador:** llega producto o se registra entrada  
**Realiza:** `RF-INV-003`, `RN-009`

Transacción:

```text
BEGIN
  lock inventory row
  inventory.onHand += quantity
  insert movement(receive, +quantity, 0)
COMMIT
```

**Errores**
- cantidad <= 0;
- Product inexistente/archivado si negocio decide bloquear recepción;
- fallo de DB → no existe movimiento sin proyección ni viceversa.

### `FLU-INV-02` — Ajuste manual

**Actor:** admin/owner  
**Realiza:** `RF-INV-004`, `RN-009`

1. Se captura nueva cantidad o delta y **nota obligatoria**.
2. Service calcula el cambio.
3. Si el resultado produce `onHand < reserved`, se rechaza.
4. Se actualiza Inventory.
5. Se inserta `adjustment`.

Nunca se edita un movimiento anterior para “corregirlo”.

### `FLU-INV-03` — Consultar inventario

**Actor:** staff/admin/owner  
**Realiza:** `RF-INV-001`, `RF-INV-002`, `RF-INV-008`

Lista:

```text
Product | SKU | onHand | reserved | available | threshold | status
```

Filtro de bajo stock:

```text
available <= lowStockThreshold
```

---

## 4. Customers

### `FLU-CLI-01` — Crear/seleccionar Customer

**Actor:** staff/admin/owner  
**Realiza:** `RF-CLI-001`, `RF-CLI-002`

Durante pedido manual:

1. buscar por nombre/teléfono/email;
2. seleccionar existente o crear uno;
3. Customer solo necesita nombre + teléfono;
4. no se crea password ni cuenta.

---

## 5. Sales

### `FLU-SAL-01` — Crear pedido manual

**Actor:** staff/admin/owner  
**Disparador:** venta por teléfono, WhatsApp o mostrador  
**Realiza:** `RF-SAL-001`…`RF-SAL-006`, `RN-003`…`RN-005`, `RN-008`

Input:

```text
customerId
items: [{ productId, quantity }]
fulfillmentType
deliveryAddress?
notes?
```

El formulario **no envía precios autoritativos**.

Transacción:

```text
BEGIN

1. validar Customer
2. cargar Products
3. validar status=active
4. lock Inventory de todos los Products
5. validar available >= quantity
6. calcular snapshots y totales desde Product
7. crear Order
8. crear OrderItems
9. inventory.reserved += quantity
10. insertar movement reserve por línea

COMMIT
```

Resultado:

- Order creado;
- stock físico igual;
- `reserved` aumenta;
- `available` disminuye;
- OrderItem conserva precio/nombre/SKU.

**Errores**
- Product archivado/draft;
- cantidad <= 0;
- stock insuficiente;
- Customer inexistente;
- delivery sin dirección;
- concurrencia: solo una transacción puede ganar la última disponibilidad.

### `FLU-SAL-02` — Ver lista/detalle

**Actor:** staff/admin/owner  
**Realiza:** `RF-SAL-007`

Lista paginada por fecha con búsqueda por:

- order number;
- customer name;
- phone;
- status.

Detalle contiene:

- customer snapshot;
- items snapshot;
- totales;
- estado;
- payment status;
- notas.

### `FLU-SAL-03` — Avanzar estado operativo

**Actor:** staff/admin/owner  
**Realiza:** `RF-SAL-008`

El service valida la tabla `TR-ORD-*`.

Ejemplo:

```text
pending → confirmed → preparing → ready → completed
```

No se permite saltar de `pending` a `completed`.

### `FLU-SAL-04` — Completar pedido

**Actor:** staff/admin/owner  
**Realiza:** `RF-SAL-009`, `RN-004`

Transacción:

```text
BEGIN
  validar ready → completed

  por cada OrderItem:
    lock inventory
    onHand -= quantity
    reserved -= quantity
    movement sale(-quantity, -quantity)

  Order.status = completed
  Order.completedAt = now()
COMMIT
```

Si el stock reservado no existe, falla la operación completa: indica corrupción/inconsistencia que debe investigarse.

### `FLU-SAL-05` — Cancelar pedido

**Actor:** admin/owner  
**Realiza:** `RF-SAL-010`, `RN-004`, `RN-006`

Transacción:

```text
BEGIN
  validar estado no terminal

  por cada OrderItem reservado:
    inventory.reserved -= quantity
    movement release(0, -quantity)

  Order.status = cancelled
  Order.cancelledAt = now()
COMMIT
```

`paymentStatus` no cambia automáticamente.

Si estaba `paid`, el admin trata el reembolso por separado.

### `FLU-SAL-06` — Marcar pago manual

**Actor:** admin/owner  
**Realiza:** `RF-SAL-011`, `RN-006`

- `unpaid → paid`
- `paid → refunded`

No mueve Inventory.

---

## 6. Admin dashboard

### `FLU-ADM-01` — Dashboard operativo

**Actor:** staff/admin/owner  
**Realiza:** `RF-ADM-001`…`RF-ADM-003`

Read-models derivados:

```text
Open orders
Sales today
Low stock products
Recent orders
```

Definiciones:

- open orders = no `completed/cancelled`;
- sales today = suma de `totalCents` de Orders `completed` hoy;
- low stock = `available <= threshold`.

No se escribe en una tabla `revenue`.

---

## 7. Storefront — después del admin

### `FLU-TDA-01` — Explorar productos

**Actor:** visitante  
**Realiza:** `RF-TDA-001`, `RF-TDA-002`

Lee Catalog y disponibilidad de Inventory. Solo Products `active`.

### `FLU-TDA-02` — Añadir al carrito

**Actor:** visitante  
**Realiza:** `RF-TDA-003`, `RF-TDA-006`

El carrito no reserva stock.

Puede mostrar disponibilidad observada, pero no la considera garantía hasta checkout.

### `FLU-TDA-03` — Checkout

**Actor:** comprador  
**Realiza:** `RF-TDA-004`, `RF-TDA-005`

1. datos de cliente;
2. pickup/delivery + dirección si aplica;
3. items;
4. servidor revalida Products, precios e Inventory;
5. llama al **mismo Sales service** de `FLU-SAL-01`;
6. reserva stock al crear Order.

No se duplica lógica “createStoreOrder” que calcule precios distinto al admin.

---

## 8. Payments — extensión

### `FLU-PAG-01` — Confirmación por webhook

**Actor:** proveedor de pago  
**Realiza:** `RF-PAG-001`…`RF-PAG-003`

Route Handler:

1. verifica firma;
2. asegura idempotencia por provider payment id;
3. persiste Payment;
4. llama al comando de Sales para cambiar `paymentStatus`;
5. devuelve 2xx.

Reenviar el mismo webhook no duplica efecto.

### `FLU-PAG-02` — Reembolso

Payment registra la operación externa; Sales cambia `paymentStatus = refunded`. Order operativo conserva su estado.

---

## 9. Flujo de error normativo

Toda mutación debe distinguir:

**ValidationError**
: input inválido; error por campo.

**AuthorizationError**
: sesión/rol insuficiente.

**DomainError**
: transición inválida, stock insuficiente, Product no vendible.

**InfrastructureError**
: DB/provider inesperado; log técnico y mensaje genérico al usuario.

No se expone SQL ni stacktrace en UI.

---

## 10. Fronteras transaccionales resumidas

| Operación | Transacción |
|---|:--:|
| create/edit Product | una escritura simple |
| receive stock | Inventory + Movement |
| adjust stock | Inventory + Movement |
| create Order | Order + Items + Inventory + Movements |
| update Order status no terminal | Order |
| complete Order | Order + Inventory + Movements |
| cancel Order | Order + Inventory + Movements |
| mark paid/refunded manual | Order |
| dashboard | read-only |
