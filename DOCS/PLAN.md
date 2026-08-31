# Plan de desarrollo

Roadmap de un modular monolith DDD con entregas pequeñas.  
Cada fase termina en una aplicación **usable y desplegable**.

---

## 1. Grafo de dependencias

```text
F0 Foundation
     │
     ▼
F1 Catalog
     │
     ▼
F2 Inventory
     │
     ▼
F3 Customers + Sales
     │
     ▼
F4 Dashboard real + retirar legacy
     │
     ▼
F5 Storefront
     │
     ▼
F6 Payments

Extensiones posteriores:
ProductVariant · Lots/FEFO · Delivery · CFDI · Discounts
```

No se construye Storefront antes de tener Order + Inventory funcionando desde el admin.

---

## 2. Estrategia de implementación

La unidad recomendada es **PR pequeño y desplegable**.

Un PR debe preferir una rebanada vertical:

```text
schema
→ query/service/action
→ UI
→ validation
→ tests relevantes
→ build
```

sobre PRs gigantes “backend first” que no producen comportamiento visible.

---

## 3. Fase 0 — Foundation

Objetivo: preparar el repo para crecer por bounded contexts sin romper lo que ya funciona.

| Feature | Contenido | Historias |
|---|---|---|
| `F0.01` | Crear `modules/` y reglas de dependencia | HU-DEV-001 |
| `F0.02` | `AdminUser` + role persistido + session role | HU-IAM-001 |
| `F0.03` | `requireRole` real, sin fallback owner | HU-IAM-001 |
| `F0.04` | Normalizar `money`, errores y validators compartidos | — |
| `F0.05` | Quality gate/CI mínimo | HU-DEV-002 |

**Criterio de salida**

```text
login funciona
role real llega a sesión
staff no puede ejecutar acción admin
pnpm typecheck
pnpm lint
pnpm build
deploy
```

---

## 4. Fase 1 — Catalog

| Feature | Contenido | Historias |
|---|---|---|
| `F1.01` | `categories` | HU-CAT-001 |
| `F1.02` | `products` como SKU vendible | HU-CAT-002 |
| `F1.03` | fila Inventory=0 al crear Product | HU-CAT-002 |
| `F1.04` | `/admin/products` lista/search/pagination | HU-CAT-003 |
| `F1.05` | create/edit form | HU-CAT-002, HU-CAT-003 |
| `F1.06` | publish/archive | HU-CAT-004 |
| `F1.07` | navegación admin nueva | — |

**Criterio de salida**

Un admin puede crear:

```text
Salmón premium 500 g
SKU SAL-500
$349.00 MXN
pack
500 g
```

buscarlo, editarlo, activarlo y archivarlo.

**Deploy.**

---

## 5. Fase 2 — Inventory

| Feature | Contenido | Historias |
|---|---|---|
| `F2.01` | `inventory` + constraints | HU-INV-001 |
| `F2.02` | `inventory_movements` | HU-INV-002, HU-INV-003 |
| `F2.03` | receiveStock service/action/UI | HU-INV-002 |
| `F2.04` | adjustStock con nota | HU-INV-003 |
| `F2.05` | `/admin/inventory` | HU-INV-001 |
| `F2.06` | low-stock read model | HU-INV-001 |

**Criterio de salida**

```text
recibir +20 → onHand 20
ajustar -3 → onHand 17
ledger explica ambos cambios
available siempre derivado
```

**Deploy.**

---

## 6. Fase 3 — Customers + Sales

Esta fase valida el dominio central de ecommerce **sin storefront**.

| Feature | Contenido | Historias |
|---|---|---|
| `F3.01` | Customer real | HU-CLI-001 |
| `F3.02` | Orders + OrderItems | HU-SAL-001 |
| `F3.03` | createOrder transaction + reservation | HU-SAL-001 |
| `F3.04` | orders list/search/detail | HU-SAL-002 |
| `F3.05` | order state machine | HU-SAL-003 |
| `F3.06` | completeOrder → sale movement | HU-SAL-004 |
| `F3.07` | cancelOrder → release movement | HU-SAL-005 |
| `F3.08` | manual payment status | HU-SAL-006 |
| `F3.09` | pickup/delivery snapshot simple | HU-SAL-007 |

**Criterio de salida**

Caso completo:

```text
Inventory SAL-500: onHand 10, reserved 0

crear Order #101 quantity 2
→ onHand 10
→ reserved 2
→ available 8

completar
→ onHand 8
→ reserved 0
→ movement sale -2/-2

Product cambia a $399
→ Order #101 sigue mostrando $349
```

Caso cancelación:

```text
crear Order #102 quantity 3
→ reserved +3

cancelar
→ reserved -3
→ onHand intacto
```

**Deploy.**

---

## 7. Fase 4 — Dashboard real y retiro de legacy

| Feature | Contenido | Historias |
|---|---|---|
| `F4.01` | cards con Orders reales | HU-ADM-001 |
| `F4.02` | recent orders | HU-ADM-001 |
| `F4.03` | low stock | HU-ADM-001 |
| `F4.04` | retirar Invoice UI | HU-DEV-003 |
| `F4.05` | retirar `invoices`/`revenue` tras migración segura | HU-DEV-003 |
| `F4.06` | borrar types/queries/components muertos del tutorial | HU-DEV-003 |

**Criterio de salida**

La navegación principal es:

```text
Dashboard
Products
Inventory
Orders
Customers
```

Ninguna métrica depende de `revenue` ni de `invoices`.

**Deploy.**

---

## 8. Fase 5 — Storefront

| Feature | Contenido | Historias |
|---|---|---|
| `F5.01` | route group `(store)` + layout | — |
| `F5.02` | catálogo público | HU-TDA-001 |
| `F5.03` | product detail simple | HU-TDA-001 |
| `F5.04` | cart | HU-TDA-002 |
| `F5.05` | checkout customer/fulfillment | HU-TDA-003 |
| `F5.06` | checkout llama a Sales service | HU-TDA-003 |
| `F5.07` | order confirmation | — |

**Criterio de salida**

Un usuario no autenticado:

```text
explora
→ agrega al carrito
→ checkout
→ crea Order
→ Inventory queda reservado
```

Misma transacción/caso de uso que el admin.

**Deploy.**

---

## 9. Fase 6 — Payments

Proveedor concreto se decide cuando el storefront esté listo.

| Feature | Contenido | Historias |
|---|---|---|
| `F6.01` | adapter de provider | HU-PAG-001 |
| `F6.02` | `payments` | HU-PAG-001 |
| `F6.03` | Route Handler webhook | HU-PAG-002 |
| `F6.04` | idempotencia/firma | HU-PAG-002 |
| `F6.05` | refund | HU-PAG-003 |

**Criterio de salida**

Una confirmación externa cambia el dinero, no el inventario directamente.

---

## 9bis. Fase 6 — Pagos

El desglose completo vive en [PAGOS.md](PAGOS.md) §14, porque las decisiones que lo
sostienen (Checkout alojado, pedido primero, `paymentStatus` como proyección, la tienda
sin llaves de Stripe) necesitan argumentarse y no caben en una tabla.

Resumen del estado:

- `F6.01`–`F6.16`: **implementados**.
- `F6.16` abre `DT-008`: hay `pnpm test` con 60 pruebas de dominio puro (las puertas
  P1–P4, la proyección del estado de pago, los validadores de cobro y reembolso, y la
  lista blanca de URLs de retorno). Sigue faltando CI y cualquier prueba que toque la
  base de datos.
- Verificación contra Stripe real: **bloqueada** hasta que exista cuenta de Stripe MX.
  Sin `STRIPE_SECRET_KEY` el checkout cae al camino de «pagar al recibir», que es una
  degradación deliberada y no un fallo.

**Criterio de salida**

```text
un comprador paga con tarjeta         → el pedido se confirma solo
un comprador aparta y paga al recoger → avanza sin pagar, pero no se entrega sin cobro
un admin devuelve $180 de $540        → reembolso parcial con autor y fecha
un admin devuelve efectivo            → misma fila en el libro, sin llamar a Stripe
el mismo evento llega tres veces      → el pedido cambia una sola vez
```

---

## 10. Definition of Done

Aplica a cada feature:

- [ ] comportamiento trazable a `RF-*`/`RN-*`;
- [ ] schema/migration revisados si cambia persistencia;
- [ ] constraints para invariantes simples;
- [ ] autorización en Server Action;
- [ ] Zod para input externo;
- [ ] regla de negocio en service, no en componente;
- [ ] transacción cuando la operación cruza Order/Inventory;
- [ ] errores de formulario visibles;
- [ ] loading/error state cuando aplica;
- [ ] dinero en centavos;
- [ ] queries paginadas cuando listan colecciones;
- [ ] tests para regla/transacción crítica, en la capa que corresponda (ver [PLAN-PRUEBAS.md](PLAN-PRUEBAS.md));
- [ ] **actualizado el documento de la funcionalidad** en [features/](features/README.md);
- [ ] `pnpm typecheck`;
- [ ] `pnpm lint`;
- [ ] `pnpm build`;
- [ ] deploy/preview verificado;
- [ ] docs actualizados si cambió el dominio.

---

## 11. Testing strategy

### Unit

Primero:

```text
canTransitionOrder()
calculateOrderTotals()
inventoryAvailable()
movement semantics
```

### Integration DB

Imprescindible al entrar Sales:

```text
createOrder reserves atomically
insufficient stock rolls back
cancelOrder releases
completeOrder sells
concurrent last-unit orders do not oversell
```

### E2E

Mantener pocos recorridos de alto valor:

1. admin login → create Product;
2. receive stock;
3. create manual Order → complete;
4. storefront checkout cuando F5 exista.

No buscar 100% coverage. Buscar protección de dinero, stock y estados.

---

## 12. Deuda técnica y backlog

Estado a cierre de F4.

### Resuelta

| ID | Deuda | Cerrada en |
|---|---|---|
| `DT-001` | `app/lib/actions.ts` global del tutorial | F4 — borrado; `authenticate` vive en `modules/identity` |
| `DT-002` | `app/lib/data.ts` global | F4 — borrado; cada contexto tiene su `queries.ts` |
| `DT-003` | `app/lib/definitions.ts` duplica formas manuales | F4 — borrado; los tipos salen del schema Drizzle |
| `DT-004` | `invoices` domina navegación y dashboard | F4 — UI retirada, tabla dropeada |
| `DT-005` | tabla `revenue` es dato derivable | F4 — dropeada; las métricas salen de Orders |
| `DT-007` | roles no persistidos | F0 — `admin_users.role` + `requireRole` real |
| `DT-009` | la UI no respeta roles | F5 — `RoleProvider` + `<Can>`; los botones de `admin` no se dibujan para `staff`, y las rutas de owner responden con una pantalla de rechazo en lugar de un error de servidor |
| `DT-010` | alta de usuarios solo por SQL | F5 — `/dashboard/users`: crear, editar rol, activar/desactivar y restablecer contraseña |

### Pendiente

| ID | Deuda | Impacto | Prioridad |
|---|---|---|---|
| `DT-008` | **Sin CI; tests sólo de dominio puro** | `pnpm test` cubre las reglas (60 pruebas), pero nada corre solo en un push y nada prueba una transacción real contra Postgres | 🔴 alta |
| `DT-006` | 5 clientes del tutorial sin usar, con `phone = 'SIN TELEFONO'` | ensucian la lista de clientes reales | 🟡 media |
| `DT-011` | `backfillInventory()` existe pero nada lo invoca | reparación masiva sin punto de entrada | 🟢 baja |
| `DT-012` | Un pedido no se puede corregir tras crearlo | cambiar una cantidad obliga a cancelar y rehacer | 🟡 media |
| `DT-013` | Navegación en `/dashboard`, no en `/admin` (`F1.07`) | desvío respecto a la estructura objetivo | 🟢 baja |

**Notas de contexto**

`DT-006` — uno de los seis clientes del tutorial (`Evil Rabbit`) **tiene un pedido real**, así que no se pueden borrar en bloque: hay que conservar los que estén referenciados.

`DT-008` — los bugs que aparecieron operando (`itemCount` siempre 0, la categoría que se borraba al editar, el producto invisible sin inventario) **fallaban en silencio**. Ese es exactamente el tipo que un test de dominio atrapa y una revisión manual no.

---

## 13. Matriz de trazabilidad resumida

| Fase | Requisitos principales |
|---|---|
| F0 | RF-IAM-001..004, RNF-SEG-001..004, RNF-DEV-001..004 |
| F1 | RF-CAT-001..008 |
| F2 | RF-INV-001..008, RN-003, RN-009 |
| F3 | RF-CLI-001..004, RF-SAL-001..012, RN-004..008 |
| F4 | RF-ADM-001..004 |
| F5 | RF-TDA-001..006, RN-010 |
| F6 | RF-PAG-001..004 |

---

## 14. Criterios para permitir complejidad nueva

Una feature fuera del MVP solo entra si responde una pregunta concreta.

### ProductVariant

Entrar cuando:

> “Necesitamos que una ficha comercial agrupe múltiples SKUs y compartir contenido/imágenes entre ellos.”

### Lots/FEFO

Entrar cuando:

> “Necesitamos saber qué recepción/caducidad específica abasteció cada venta o despachar por expiración.”

### Multiple warehouses

Entrar cuando:

> “Tenemos más de una ubicación física con disponibilidad independiente.”

### Delivery slots

Entrar cuando:

> “La capacidad de reparto por franja limita ventas.”

### Customer accounts

Entrar cuando:

> “El valor de historial/direcciones guardadas justifica login y recovery.”

### CFDI

Entrar cuando:

> “El flujo de facturación debe integrarse en producto y no resolverse fuera del sistema.”

Hasta entonces, no se agregan tablas “por si acaso”.
