# Backlog de historias de usuario

Historias organizadas por fase de entrega. Cada historia cita requisitos y contiene criterios Dado/Cuando/Entonces.

Estimación: 1, 2, 3, 5, 8 puntos. El backlog es deliberadamente pequeño: se escribe detalle cuando la fase está próxima.

---

## Fase 0 — Foundation del dominio

### HU-IAM-001 — Roles reales en admin

*Realiza:* `RF-IAM-001`, `RF-IAM-002`, `RF-IAM-003` · **3 pts**

> Como owner quiero que cada usuario administrativo tenga un rol persistido para que las acciones sensibles se autoricen en servidor.

- **Dado** un `staff`, **cuando** invoca una action de admin directamente, **entonces** recibe autorización denegada y no hay mutación.
- **Dado** un login válido, **cuando** se crea la sesión, **entonces** incluye role pero no password hash.
- **Dado** un usuario inactivo, **cuando** intenta login, **entonces** no obtiene sesión.

### HU-DEV-001 — Estructura por bounded context

*Realiza:* `RNF-DEV-004` · **2 pts**

- **Dado** el repo, **cuando** se agrega Catalog, **entonces** sus queries/actions/services/validators viven bajo `modules/catalog`.
- **Dado** una nueva entidad persistente, **cuando** se modela, **entonces** vive en el archivo de schema de su context.
- `app/lib/actions.ts`, `data.ts` y `definitions.ts` dejan de ser el destino para nuevo código ecommerce.

### HU-DEV-002 — Quality gate mínimo

*Realiza:* `RNF-DEV-001`, `RNF-DEV-002` · **2 pts**

- `pnpm typecheck`, `pnpm lint`, `pnpm build` verdes.
- La app sigue desplegable después del refactor estructural.
- No se modifica el comportamiento legacy salvo lo necesario para Identity.

---

## Fase 1 — Catalog

### HU-CAT-001 — Categorías

*Realiza:* `RF-CAT-001` · **2 pts**

> Como admin quiero organizar productos en categorías simples para administrar el catálogo.

- **Dado** nombre/slug válidos, **cuando** creo Category, **entonces** aparece en el selector de Product.
- **Dado** slug repetido, **cuando** guardo, **entonces** veo error accionable.
- **Dado** Category inactiva, **cuando** consulto el storefront futuro, **entonces** no debe utilizarse para navegación pública.

### HU-CAT-002 — Crear Product/SKU

*Realiza:* `RF-CAT-002`, `RF-CAT-003`, `RF-CAT-008` · **5 pts**

> Como admin quiero dar de alta una presentación vendible con SKU y precio para poder manejarla como unidad comercial.

- **Dado** “Salmón premium 500 g”, **cuando** lo creo con SKU `SAL-500` y precio `$349.00`, **entonces** DB guarda `price_cents=34900`.
- **Dado** SKU duplicado, **cuando** guardo, **entonces** se rechaza.
- **Dado** precio `0` o negativo, **cuando** guardo, **entonces** se rechaza.
- **Dado** Product nuevo, **cuando** se crea, **entonces** queda `draft` y posee Inventory en cero.

### HU-CAT-003 — Buscar, editar y paginar

*Realiza:* `RF-CAT-004` · **3 pts**

- búsqueda por nombre o SKU;
- `query/page` permanecen en URL;
- editar cambia catálogo actual sin tocar Orders históricos;
- formulario muestra errores por campo.

### HU-CAT-004 — Publicar y archivar

*Realiza:* `RF-CAT-005`, `RF-CAT-006`, `RF-CAT-007`, `RN-007` · **3 pts**

- `draft → active` hace vendible el Product;
- archivar lo retira de ventas nuevas;
- Product con Orders históricos no se borra físicamente.

**Criterio de salida F1:** el negocio puede crear, buscar, editar, activar y archivar SKUs reales desde `/admin/products`.

---

## Fase 2 — Inventory

### HU-INV-001 — Inventario visible

*Realiza:* `RF-INV-001`, `RF-INV-002`, `RF-INV-008` · **3 pts**

> Como staff quiero ver on-hand, reservado y disponible para saber qué puedo vender.

- **Dado** `onHand=20`, `reserved=3`, **cuando** veo el listado, **entonces** `available=17`.
- `available` no existe como columna.
- Product bajo threshold se marca como low stock.

### HU-INV-002 — Recibir stock

*Realiza:* `RF-INV-003`, `RN-009` · **3 pts**

- **Dado** onHand 5, **cuando** recibo 10, **entonces** onHand=15.
- existe Movement `receive` con `onHandDelta=+10`;
- actor y timestamp quedan registrados;
- un fallo intermedio hace rollback.

### HU-INV-003 — Ajuste con auditoría

*Realiza:* `RF-INV-004`, `RN-009` · **3 pts**

- ajuste exige nota;
- no permite dejar `onHand < reserved`;
- crea Movement `adjustment`;
- nunca edita movimientos anteriores.

**Criterio de salida F2:** el negocio puede recibir y corregir stock y explicar cualquier cambio desde el ledger.

---

## Fase 3 — Customers + Sales

### HU-CLI-001 — Customer simple

*Realiza:* `RF-CLI-001`, `RF-CLI-002`, `RF-CLI-004` · **2 pts**

- crear con nombre + teléfono;
- email opcional;
- buscar por contacto;
- no se crea password.

### HU-SAL-001 — Crear pedido manual

*Realiza:* `RF-SAL-001`…`RF-SAL-006` · **8 pts**

> Como staff quiero registrar una venta de WhatsApp/teléfono para probar el dominio real antes del storefront.

- **Dado** Product activo con available 5, **cuando** creo Order de quantity 2, **entonces** `reserved` sube 2 y available baja a 3.
- OrderItem copia nombre, SKU y precio.
- el cliente no puede enviar un precio distinto al Product.
- dos órdenes concurrentes por la última unidad no producen oversell.
- cualquier fallo revierte Order, Items, Inventory y Movements.

### HU-SAL-002 — Listado y detalle

*Realiza:* `RF-SAL-007` · **3 pts**

- buscar por order number/customer/status;
- paginación;
- detalle muestra snapshots, totales y estados.

### HU-SAL-003 — Máquina de estados

*Realiza:* `RF-SAL-008` · **3 pts**

- transiciones `TR-ORD-*` válidas pasan;
- `pending → completed` directo se rechaza;
- `completed/cancelled` no vuelven a abrirse.

### HU-SAL-004 — Completar pedido

*Realiza:* `RF-SAL-009`, `RF-INV-007` · **5 pts**

- **Dado** 2 unidades reservadas, **cuando** `ready → completed`, **entonces** `onHand -=2` y `reserved -=2`.
- Movement `sale` contiene ambos deltas.
- fallo de inventario impide completar Order.

### HU-SAL-005 — Cancelar pedido

*Realiza:* `RF-SAL-010`, `RF-INV-006` · **5 pts**

- cancelar Order abierto libera todas sus reservas;
- movement `release` por Product;
- cancelar Order terminal se rechaza;
- paymentStatus no cambia automáticamente.

### HU-SAL-006 — Pago manual independiente

*Realiza:* `RF-SAL-011`, `RN-006` · **2 pts**

- admin puede `unpaid → paid`;
- admin puede `paid → refunded`;
- cambiar pago no mueve Inventory ni estado operativo.

### HU-SAL-007 — Fulfillment simple

*Realiza:* `RF-SAL-012` · **2 pts**

- pickup no requiere address;
- delivery requiere snapshot de address;
- editar Customer después no cambia la dirección histórica.

**Criterio de salida F3:** se puede operar una venta real completamente desde el admin sin depender de storefront ni gateway.

---

## Fase 4 — Dashboard real + retiro del tutorial

### HU-ADM-001 — Métricas reales

*Realiza:* `RF-ADM-001`, `RF-ADM-002`, `RF-ADM-003` · **3 pts**

- open orders excluye terminales;
- sales today usa Orders `completed`;
- low stock usa Inventory;
- recent orders viene de Sales.

### HU-DEV-003 — Retirar invoices/revenue

*Realiza:* `RF-ADM-003` · **3 pts**

- `/dashboard/invoices` deja de ser dependencia del negocio;
- `invoices` y `revenue` se eliminan solo después de tener Orders/dashboard equivalentes;
- no quedan imports/types/queries legacy muertos;
- build verde.

**Criterio de salida F4:** el panel ya es una aplicación ecommerce, no una adaptación visual del tutorial.

---

## Fase 5 — Storefront

### HU-TDA-001 — Catálogo público

*Realiza:* `RF-TDA-001`, `RF-TDA-002` · **3 pts**

- solo active;
- precio MXN;
- disponibilidad derivada;
- no expone datos administrativos/costo.

### HU-TDA-002 — Carrito sin reserva

*Realiza:* `RF-TDA-003`, `RF-TDA-006` · **3 pts**

- añadir al carrito no cambia Inventory;
- cantidades se pueden editar/remover;
- agotado se detecta de nuevo en checkout.

### HU-TDA-003 — Checkout reutiliza Sales

*Realiza:* `RF-TDA-004`, `RF-TDA-005`, `RN-010` · **8 pts**

- server revalida precio/stock;
- crea Customer si corresponde;
- llama al mismo caso de uso que el pedido manual;
- reserva Inventory exactamente una vez;
- payload manipulado no cambia total.

**Criterio de salida F5:** un visitante puede crear un Order real desde la tienda sin duplicar dominio.

---

## Fase 6 — Payments

### HU-PAG-001 — Payment provider

*Realiza:* `RF-PAG-001`, `RF-PAG-003` · **5 pts**

- Payment vinculado a Order;
- provider id único;
- Order payment status se actualiza por comando de Sales.

### HU-PAG-002 — Webhook idempotente

*Realiza:* `RF-PAG-002` · **5 pts**

- firma inválida → rechazo;
- mismo webhook 3 veces → un efecto;
- fallo de provider no altera stock directamente.

### HU-PAG-003 — Reembolso

*Realiza:* `RF-PAG-004` · **3 pts**

- se registra en Payments;
- Order pasa a `refunded`;
- estado operativo permanece igual.

---

## Historias que NO se escriben todavía

Hasta que haya evidencia:

```text
ProductVariant
Lot/FEFO
Supplier
PurchaseOrder
Warehouse
CustomerAccount
Discount
Subscription
CFDI
DeliverySlot
Route
```

Cuando uno entre al alcance, primero se agrega al SRS y modelo, después se crean historias.
