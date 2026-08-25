# Documentación del proyecto — Ecommerce de pescadería

Panel de administración primero; tienda pública después. El objetivo es construir un **MVP vendible, desplegable y extensible** sin convertir el primer release en una plataforma genérica de ecommerce.

La arquitectura sigue un enfoque **Domain-Driven Design pragmático** sobre un **modular monolith** en Next.js. DDD aquí significa: vocabulario explícito, bounded contexts claros, reglas de negocio cerca del dominio, transacciones bien definidas y dependencias controladas. **No** significa microservicios ni capas ceremoniosas.

## Principios del proyecto

1. **Deploy primero.** Cada fase termina en `typecheck`, `lint`, `build` y una versión desplegable.
2. **Admin primero.** Catálogo e inventario deben funcionar antes del storefront.
3. **Un SKU = un Product en el MVP.** No hay `ProductVariant`; “Salmón 500 g” y “Salmón 1 kg” son productos vendibles distintos.
4. **Peso y precio fijos.** El MVP vende piezas o paquetes estandarizados. Catch-weight queda fuera.
5. **Dinero en centavos enteros.** Nunca `float`.
6. **Inventario auditable.** Se mantiene una proyección rápida (`inventory`) y un historial de cambios (`inventory_movements`).
7. **Pedidos históricos son snapshots.** Cambiar un producto no reescribe una venta pasada.
8. **Estado operativo y estado de pago son independientes.**
9. **Server Actions son adaptadores, no el dominio.** Autorizan, validan y delegan a servicios.
10. **No borrar historia de negocio.** Productos vendidos se archivan; pedidos no se eliminan.
11. **Storefront y admin comparten el mismo dominio.** No son dos backends.
12. **Agregar complejidad solo cuando aparezca una necesidad real.**

---

## Los documentos

| Archivo | Qué contiene | Cambia cuando… |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura actual, arquitectura objetivo y límites de los bounded contexts | cambia una decisión estructural |
| [GLOSARIO.md](GLOSARIO.md) | Lenguaje ubicuo: términos del negocio ↔ identificadores de código | aparece o cambia un concepto |
| [SRS.md](SRS.md) | Alcance, requisitos funcionales/no funcionales y reglas de negocio | cambia el producto o una regla |
| [MODELO-DATOS.md](MODELO-DATOS.md) | Agregados, entidades, columnas, relaciones, invariantes y estados | cambia el modelo persistente |
| [FLUJOS.md](FLUJOS.md) | Casos de uso end-to-end y fronteras transaccionales | cambia una operación |
| [HISTORIAS.md](HISTORIAS.md) | Backlog priorizado con criterios de aceptación | se planifica implementación |
| [PLAN.md](PLAN.md) | Roadmap de fases/PRs, Definition of Done, deuda y trazabilidad | cambia el orden de construcción |

La separación es por **ritmo de cambio**. El SRS dice *qué debe hacer*; el modelo dice *qué debe ser verdad en datos*; los flujos dicen *cómo ocurre*; las historias dicen *qué implementamos ahora*.

---

## Bounded contexts

| Código | Bounded context | Responsabilidad | MVP admin |
|---|---|---|:--:|
| `IAM` | Identity & Access | usuarios administrativos, sesión y roles | ✅ |
| `CAT` | Catalog | categorías y productos vendibles | ✅ |
| `INV` | Inventory | existencias, reservas y movimientos | ✅ |
| `CLI` | Customers | identidad comercial/contacto del comprador | ✅ al construir pedidos |
| `SAL` | Sales | pedidos, líneas, estados, totales | ✅ |
| `ADM` | Admin Read Models | métricas y vistas operativas; no posee datos de dominio | ✅ |
| `TDA` | Storefront | superficie pública que orquesta CAT/INV/SAL | después del admin |
| `PAG` | Payments | integración con proveedor de pago | después del storefront |
| `DEL` | Delivery | logística/ventanas/rutas | extensión futura |

`ADM` y `TDA` son **capas de aplicación/read-models**, no dueños de las entidades centrales. No deben duplicar reglas de negocio.

### Dependencias permitidas

```text
IAM

CAT ───────────────┐
                   │
INV ───── depends on CAT
                   │
CLI ───────────────┤
                   ▼
                 SAL
                  │
          ┌───────┴────────┐
          ▼                ▼
         ADM              TDA
                           │
                           ▼
                          PAG

DEL  ← extensión futura de SAL/TDA
```

Regla: una dependencia apunta hacia un contexto que posee el dato; no se crean ciclos entre módulos.

---

## Convención de identificadores

| Prefijo | Qué es | Se define en |
|---|---|---|
| `RF-<CTX>-<NNN>` | Requisito funcional | SRS.md |
| `RNF-<CAT>-<NNN>` | Requisito no funcional | SRS.md |
| `RN-<NNN>` | Regla de negocio transversal | SRS.md |
| `E-<Nombre>` | Entidad/agregado persistente | MODELO-DATOS.md |
| `INV-<ENT>-<NN>` | Invariante | MODELO-DATOS.md |
| `ST-ORD-<estado>` | Estado de pedido | MODELO-DATOS.md |
| `TR-ORD-<NN>` | Transición legal de pedido | MODELO-DATOS.md |
| `FLU-<CTX>-<NN>` | Flujo/caso de uso | FLUJOS.md |
| `HU-<CTX>-<NNN>` | Historia de usuario | HISTORIAS.md |
| `F<fase>.<NN>` | Feature de roadmap | PLAN.md |
| `DT-<NNN>` | Deuda técnica | PLAN.md |

### Categorías RNF

`SEG` seguridad · `DAT` integridad/transacciones · `REND` rendimiento · `A11Y` accesibilidad · `DEV` calidad de desarrollo/deploy · `OBS` observabilidad.

---

## Lenguaje del código

**Decisión:** interfaz y documentación en español; identificadores de código y base de datos en **inglés**.

Ejemplos:

- Producto → `Product`, tabla `products`
- Pedido → `Order`, tabla `orders`
- Movimiento de inventario → `InventoryMovement`, tabla `inventory_movements`

Motivo: el repo, Next.js, Drizzle y la base heredada ya están en inglés; mantener el dominio técnico en inglés reduce traducciones entre capas y hace el código más estándar. Los conceptos mexicanos específicos que aparezcan después —por ejemplo CFDI— se modelarán explícitamente en su contexto de integración, sin forzar el MVP a resolverlos ahora.

---

## Reglas de gobierno

1. Un concepto de negocio tiene **un nombre canónico** en [GLOSARIO.md](GLOSARIO.md).
2. Una regla que cambia dinero, stock o estado vive en un `service.ts` del contexto propietario, no en un componente React.
3. Toda mutación:
   - verifica sesión/rol en servidor;
   - valida input;
   - ejecuta reglas del dominio;
   - usa transacción si toca más de un agregado/proyección;
   - revalida solo las rutas afectadas.
4. Las queries pueden cruzar contexts para read-models del admin; las mutaciones no deben escribir datos ajenos sin pasar por el servicio propietario.
5. Drizzle schema es la fuente de verdad de tipos persistentes. Evitar un `definitions.ts` global duplicando entidades.
6. Un requisito nuevo entra al SRS antes de provocar nuevas tablas.
7. Una feature terminada se refleja en `ARCHITECTURE.md`; `PLAN.md` describe lo que falta.
8. La deuda técnica debe tener `DT-*`, impacto y fase objetivo.

---

## Qué deliberadamente NO forma parte del MVP

- `ProductVariant`
- lotes, FEFO y caducidad por lote
- proveedores y órdenes de compra
- múltiples almacenes
- catch-weight / peso variable
- customer accounts
- direcciones guardadas
- descuentos/cupones
- suscripciones
- motor fiscal/CFDI
- múltiples monedas
- marketplace/multi-tenant
- event bus / microservicios
- Elasticsearch/Redis
- sistema completo de devoluciones
- logística con rutas y ventanas

Ninguno está prohibido para siempre. Solo requiere evidencia de negocio antes de entrar al núcleo.

---

## Estado de partida

El repo parte del dashboard de Next.js Learn, ya modernizado con Next.js 16, React 19, Auth.js, PostgreSQL, Drizzle, Zod y Server Actions. Las tablas `users`, `customers`, `invoices` y `revenue` son **legacy del tutorial** y sirven como referencia de UI/CRUD mientras aterriza el dominio ecommerce.

El siguiente trabajo es **Fase 1: foundation + catálogo**, definido en [PLAN.md](PLAN.md).
