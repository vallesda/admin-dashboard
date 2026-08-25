# Plan de desarrollo

Roadmap, features, deuda técnica y matriz de trazabilidad.
Índice de IDs en [README.md](README.md).

---

## 1. Grafo de dependencias

```
                      ┌────────────────────────┐
                      │ F1  Catálogo + fiscal  │  base de todo; incluye el rol real
                      └────┬──────────────┬────┘
                           │              │
            ┌──────────────▼───┐     ┌────▼─────────────────┐
            │ F2  Inventario   │     │ F3  Entrega          │  ← paralelizables
            │     y lotes      │     │     zonas/CP/slots   │
            └──────────────┬───┘     └────┬─────────────────┘
                           └───────┬──────┘
                           ┌───────▼────────┐
                           │ F4  Pedidos    │  mata invoices y revenue
                           └───┬────────┬───┘
                     ┌─────────▼──┐  ┌──▼─────────────┐
                     │ F5 Tienda  │  │ F6  Pagos      │
                     └─────────┬──┘  └──┬─────────────┘
                               └───┬────┘
                           ┌───────▼────────┐
                           │ F7  CFDI 4.0   │
                           └───────┬────────┘
                           ┌───────▼────────┐
                           │ F8 Endurecim.  │
                           └────────────────┘
```

## 2. Dos desviaciones respecto a `ARCHITECTURE.md` §6

**1. Entrega (F3) antes que Pedidos (F4).** `pedidos.slot_id` es `NOT NULL`: un
pedido de producto fresco sin ventana de entrega no existe. Construir pedidos
primero obligaría a un `slot_id` que admita nulos temporalmente y después a una
migración de datos. Además F2 y F3 no se tocan entre sí, así que se pueden hacer
en paralelo si hay dos personas.

**2. La columna `rol` sube a F1** (en `ARCHITECTURE.md` estaba en la Fase 3). Es
un `ALTER TABLE` más un enum, de coste casi nulo. Mientras no exista,
`requireRole()` devuelve `'owner'` por defecto (`app/lib/auth-guard.ts:52`) y
**cada server action escrita en F1–F3 se escribe sin poder verificarse**.
Dejarla para más tarde significa auditar decenas de acciones después, en vez de
comprobarlas una a una según se escriben.

---

## 3. Fases

Cada fase entrega funcionalidad y **cierra con un criterio verificable**, no con
una lista de tareas terminadas.

### F1 — Catálogo, fiscalidad y saneamiento del patrón de formularios

| Feature | Contenido | Historias |
|---|---|---|
| `F1.01` | Columna `rol` y RBAC real en las acciones | HU-ADM-001 |
| `F1.02` | Categorías | HU-CAT-001 |
| `F1.03` | Productos con etiquetado de pesca | HU-CAT-002 |
| `F1.04` | Variantes con unidad, peso y frío | HU-CAT-003 |
| `F1.05` | Imágenes con `alt` obligatorio | HU-CAT-005 |
| `F1.06` | Clases y tasas de impuesto con vigencia | HU-CAT-004 |
| `F1.07` | Proveedores | — |
| `F1.08` | Búsqueda con `pg_trgm` **en la migración** | HU-CAT-006 |
| `F1.09` | **Renderizado de errores de formulario** | HU-CAT-007 |
| `F1.10` | Limpieza: código muerto, moneda `es-MX`, fechas, unique de correo | HU-CAT-008 |

**Criterio de salida**
1. Alta de "Filete de huachinango 500 g" con `IVA_0` y "Salmón ahumado 200 g" con `IVA_16`, ambos con claves SAT.
2. Buscar "huachi" y comprobar con `EXPLAIN` **sobre una base recién migrada** que usa el índice GIN.
3. Enviar un formulario con un campo inválido y ver el mensaje en pantalla, anunciado por lector de pantalla.
4. `fetchFilteredCustomers` y `app/ui/customers/table.tsx` ya no existen.
5. `typecheck`, `lint` y `build` en cero.

> **Por qué `DT-001` va aquí y no "cuando haya tiempo":** todos los formularios de
> F2–F7 se escribirán copiando `create-form.tsx`. Si sale de F1 con el bug de
> errores invisibles, se replica veinte veces.

### F2 — Inventario, lotes y merma

| Feature | Contenido | Historias |
|---|---|---|
| `F2.01` | Tablas `lotes`, `inventario`, `movimientos_inventario` | — |
| `F2.02` | Ledger *append-only* con permisos revocados | HU-INV-003 |
| `F2.03` | Recepción de mercancía con lote y caducidad | HU-INV-001 |
| `F2.04` | Registro de merma con motivo obligatorio | HU-INV-002 |
| `F2.05` | Ajuste por conteo físico | — |
| `F2.06` | Función de asignación FEFO | HU-INV-004 |
| `F2.07` | Job de caducados y conciliación diaria | HU-INV-005 |
| `F2.08` | Retención y retirada sanitaria | HU-INV-006 |

**Criterio de salida**
1. Recibir 20 unidades crea un lote con caducidad, temperatura y coste, y las existencias marcan 20.
2. Registrar 3 de merma por rotura de frío deja 17, y el ledger suma exactamente 17.
3. Un lote caducado desaparece del disponible sin borrarse.
4. Un `UPDATE` directo sobre el ledger es rechazado por permisos.
5. La conciliación existencias↔ledger pasa en verde.

### F3 — Entrega local *(paralelizable con F2)*

| Feature | Contenido | Historias |
|---|---|---|
| `F3.01` | Zonas, CP y consulta de cobertura | HU-ENT-001 |
| `F3.02` | Ventanas recurrentes y generación de slots | HU-ENT-002 |
| `F3.03` | Reserva atómica de plaza | HU-ENT-003 |
| `F3.04` | Motor de hora de corte con horario de verano | HU-ENT-004 |
| `F3.05` | Cancelación y capacidad de un slot concreto | HU-ENT-005 |
| `F3.06` | Direcciones con referencias visuales | — |
| `F3.07` | Días no laborables | — |

**Criterio de salida**
1. Un CP fuera de cobertura devuelve "aún no llegamos a tu zona" con el CP repetido.
2. Un slot lleno no se ofrece, y `reservados <= capacidad` resiste dos reservas concurrentes.
3. Pasada la hora de corte el slot queda cerrado automáticamente, con horario de verano correcto.
4. Cancelar un slot concreto no afecta al mismo día de la semana siguiente.

### F4 — Pedidos, máquina de estados y muerte de `invoices`

| Feature | Contenido | Historias |
|---|---|---|
| `F4.01` | Tablas de pedidos, líneas, lotes por línea y bitácora | — |
| `F4.02` | Snapshot completo de precio y **tasa** | HU-PED-001 |
| `F4.03` | Reserva atómica de slot + existencias | HU-PED-002 |
| `F4.04` | Transiciones `TR-PED-01..13` | HU-PED-003 |
| `F4.05` | Surtido con FEFO y conversión a venta | HU-PED-004 |
| `F4.06` | No-entrega, reprogramación y merma | HU-PED-005 |
| `F4.07` | Job de corte y hoja de surtido | — |
| `F4.08` | Pedido telefónico desde el panel | HU-PED-007 |
| `F4.09` | `DROP` de `invoices` y `revenue`; vista de ventas | HU-PED-006 |

**Criterio de salida**
1. Pedido con dos líneas —una `IVA_0`, otra `IVA_16`— cuyo total valida por restricción.
2. El surtido asigna el lote de caducidad más próxima y mueve el ledger a `venta`.
3. Una no-entrega no reprogramable genera merma con motivo y reembolso.
4. Cambiar el precio de una variante después no altera ningún pedido histórico.
5. `invoices` y `revenue` ya no existen, y la aplicación compila y arranca.

> **Por qué el pedido telefónico va aquí y no en F5:** da una rebanada
> verticalmente completa y probable **sin depender** de la tienda pública ni de la
> pasarela, y es un canal real de una pescadería.

### F5 — Tienda pública B2C

| Feature | Contenido | Historias |
|---|---|---|
| `F5.01` | Cobertura por CP antes de navegar | HU-TDA-001 |
| `F5.02` | Catálogo público y ficha | — |
| `F5.03` | Carrito con validación de disponibilidad | HU-TDA-002 |
| `F5.04` | Checkout: dirección → slot → pago | HU-TDA-003 |
| `F5.05` | Cuenta de cliente y direcciones | — |
| `F5.06` | Seguimiento y cancelación antes del corte | HU-TDA-004 |
| `F5.07` | Correos transaccionales | — |

**Criterio de salida:** un usuario sin acceso al panel completa una compra de
extremo a extremo, ve su pedido avanzar por la línea de tiempo y lo cancela antes
del corte recuperando la reserva.

### F6 — Pagos

| Feature | Contenido | Historias |
|---|---|---|
| `F6.01` | Mercado Pago (tarjeta) | — |
| `F6.02` | SPEI y OXXO con referencia | — |
| `F6.03` | Webhooks firmados e idempotentes | HU-PAG-001 |
| `F6.04` | Vencimiento de referencias | HU-PAG-002 |
| `F6.05` | Reembolsos totales y parciales | HU-PAG-003 |

**Criterio de salida**
1. Una referencia OXXO no pagada al llegar el corte cancela el pedido y libera slot y existencias.
2. Reenviar el mismo webhook tres veces produce un único efecto.
3. Un reembolso parcial por calidad se registra **sin** cambiar el estado `entregado`.

### F7 — CFDI 4.0

| Feature | Contenido | Historias |
|---|---|---|
| `F7.01` | Datos fiscales del cliente | — |
| `F7.02` | Integración con PAC y timbrado tras entrega | HU-FIS-001 |
| `F7.03` | Público en general | HU-FIS-002 |
| `F7.04` | Cancelación con motivo y retención 5 años | HU-FIS-003 |

**Criterio de salida**
1. Un pedido mixto (0 % y 16 %) genera un XML aceptado por el PAC de pruebas, cuadrando al centavo.
2. Un pedido sin datos fiscales se timbra a público en general.
3. Cancelación con motivo `02` registrada.

### F8 — Endurecimiento, RBAC en interfaz y reportes

| Feature | Contenido | Historias |
|---|---|---|
| `F8.01` | Matriz de permisos aplicada en toda la interfaz | HU-ADM-002 |
| `F8.02` | Paginación keyset y `COUNT(*) OVER ()` | HU-REP-002 |
| `F8.03` | Panel del día | HU-REP-001 |
| `F8.04` | Conciliación automatizada y alertas | — |
| `F8.05` | Prueba de restauración cronometrada | HU-ADM-003 |
| `F8.06` | Revisión completa de accesibilidad | — |

**Criterio de salida**
1. Un `staff` no ve ni puede invocar la edición de precios, comprobado también por POST directo.
2. El tablero responde dentro de `RNF-REND-001` con 10⁵ pedidos sembrados.
3. Existe un informe de restauración con fecha y duración real.

---

## 4. Definición de Hecho

Aplica a **toda** feature, sin excepción:

- `typecheck`, `lint` y `build` en cero.
- Migración generada, aplicada y **con plan de reversión** (`RNF-DAT-005`).
- Los invariantes se expresan como **restricciones nombradas de la base de datos**, no solo como validación en la aplicación.
- `requireRole()` en cada acción nueva (`RNF-SEG-001`).
- Errores de formulario **visibles y anunciados** (`RNF-A11Y-001`).
- Textos en español; dinero y fechas con `Intl` en `es-MX`/`MXN` (`RNF-A11Y-005`).
- Los IDs `RF-*` realizados, citados en el commit y en la cabecera de la migración.
- La matriz de trazabilidad de este documento, actualizada.
- Lo construido, movido de `PLAN.md` a `ARCHITECTURE.md`.

---

## 5. Deuda técnica

Entra en el mismo grafo de IDs que el resto: con fase asignada, no como lista de
lamentos al final de un documento.

| ID | Deuda | Dónde | Fase |
|---|---|---|:--:|
| `DT-001` | Errores de formulario producidos pero **nunca renderizados** | `app/ui/invoices/create-form.tsx:17`, `edit-form.tsx:25` | F1 |
| `DT-002` | `WHERE` duplicado → dos escaneos por carga | `app/lib/data.ts` | F4 (muere con la tabla) |
| `DT-003` | Desfase de un día por `toISOString()` sobre columna `DATE` | `app/lib/actions.ts:59` | F1 |
| `DT-004` | `pg_trgm` solo en `scripts/baseline.ts`, ausente de la migración | `db/migrations/` | F1 |
| `DT-005` | Código muerto: `fetchFilteredCustomers`, `app/ui/customers/table.tsx` | `app/lib/data.ts` | F1 (borrar) |
| `DT-006` | `customers.email` sin `UNIQUE` | `db/schema/legacy.ts:33` | F1 |
| `DT-007` | `fetchInvoicesPages` fuera de `<Suspense>` bloquea el shell | `app/dashboard/invoices/page.tsx` | F4 |
| `DT-008` | `formatCurrency` fijado a `en-US`/`USD` | `app/lib/utils.ts:4` | F1 |
| `DT-009` | `requireRole()` es no-op por el fallback `?? 'owner'` | `app/lib/auth-guard.ts:52` | F1 |

---

## 6. Fuera del MVP

| Excluido | Por qué |
|---|---|
| **Catch-weight real** (facturar el peso pesado) | El modelo **ya lo soporta** (`unidad_venta`, `precio_por_kg_centavos`, `peso_neto_g`, `peso_tolerancia_bps`, `peso_real_g`), pero el *flujo* exige autorización y captura diferida en la pasarela, un estado extra y ajuste de importe tras el pesaje. Multiplica la complejidad del proveedor de pago para una ganancia que el peso fijo ya cubre. **El coste de aplazarlo es cero porque el esquema está preparado** — ese es justamente el punto. |
| **Paquetería nacional** | Rompe la cadena de frío propia, que es la propuesta de valor. Metería estados de tránsito, transportistas y seguimiento externo. |
| **B2B: listas de precios, crédito, pedidos recurrentes** | El negocio es B2C. Precios por cliente convierte cada consulta de catálogo en una resolución de lista; el crédito añade una contabilidad entera. |
| **Suscripciones / cajas semanales** | Requiere pagos recurrentes, previsión de compra y su propia máquina de estados. |
| **Multi-almacén y transferencias** | Una sola cámara en el MVP. El tipo `transferencia` ya está en el enum del ledger para que añadirlo no obligue a migrar. |
| **Motor de promociones y cupones apilables** | El MVP tiene un `descuento_centavos` plano. Un motor de reglas es un producto en sí. |
| **Devolución física de producto** | Pescado fresco devuelto no se revende nunca. Incluir devoluciones daría una funcionalidad que sería un **error sanitario** usar. |
| **App nativa del repartidor** | La web responsive cubre entrega, evidencia y temperatura. Una app añade tiendas de aplicaciones, firmas y ciclos de despliegue. |
| **i18n y multimoneda** | Requisito de negocio: todo en español, MXN. `moneda char(3)` se conserva por higiene de esquema, no como promesa de soporte. |
| **Reseñas, listas de deseos, recomendaciones** | Parecen MVP en un ecommerce genérico. Aquí no mueven ni una venta frente a *"¿llegas a mi CP y qué llegó hoy fresco?"*. |
| **Multi-tenancy, event sourcing, webhooks salientes, motor de búsqueda dedicado** | Ya descartados en `ARCHITECTURE.md` §7. `pg_trgm` aguanta el volumen previsto. |

---

## 7. Matriz de trazabilidad

Vista inversa: de requisito a feature. **Se mantiene solo aquí** — los `RF` nunca
listan sus historias en línea, porque se desincronizaría.

| Módulo | Requisitos | Flujos | Historias | Features |
|---|---|---|---|---|
| **CAT** | RF-CAT-001…015 | FLU-CAT-01, FLU-CAT-02, FLU-TDA-02, FLU-TDA-03 | HU-CAT-001…008 | F1.02–F1.10 |
| **INV** | RF-INV-001…014 | FLU-INV-01…04, FLU-PED-02 | HU-INV-001…006 | F2.01–F2.08 |
| **ENT** | RF-ENT-001…014 | FLU-ENT-01…04, FLU-PED-01, FLU-PED-03 | HU-ENT-001…005 | F3.01–F3.07 |
| **PED** | RF-PED-001…016 | FLU-PED-01…05, FLU-TDA-05 | HU-PED-001…007 | F4.01–F4.09 |
| **CLI** | RF-CLI-001…007 | FLU-CLI-01, FLU-CLI-02 | — | F3.06, F5.05 |
| **PAG** | RF-PAG-001…007 | FLU-PAG-01, FLU-PAG-02 | HU-PAG-001…003 | F6.01–F6.05 |
| **FIS** | RF-FIS-001…007 | FLU-FIS-01, FLU-FIS-02 | HU-FIS-001…003 | F7.01–F7.04 |
| **TDA** | RF-TDA-001…009 | FLU-TDA-01…07 | HU-TDA-001…004 | F5.01–F5.07 |
| **ADM** | RF-ADM-001…003 | FLU-ADM-01 | HU-ADM-001…003 | F1.01, F8.01, F8.05 |
| **REP** | RF-REP-001…003 | FLU-REP-01 | HU-REP-001, HU-REP-002 | F8.02–F8.04 |

### Reglas de negocio y dónde se hacen cumplir

| Regla | Se aplica en |
|---|---|
| `RN-001` nunca se vende lo que no existe | `INV-MOV-04`, `INV-PIL-01`, F2.06 |
| `RN-002` nunca se sobrevende un slot | `INV-SLOT-01` (CHECK), F3.03 |
| `RN-003` el IVA depende del producto | `INV-VAR-02`, F1.06 |
| `RN-004` FEFO estricto | índice parcial de `lotes`, F2.06 |
| `RN-005` nunca vuelve al stock vendible | ausencia del estado `devuelto`, F4.06 |
| `RN-006` toda merma tiene motivo | `INV-MOV-02` (CHECK), F2.04 |
| `RN-007` pasado el corte no hay cambios | `INV-SLOT-02`, F3.04 |
| `RN-008` la falta de datos fiscales no bloquea | `INV-FIS-03`, F7.03 |
| `RN-009` precio y tasa son hechos históricos | `INV-ITM-02`, F4.02 |
| `RN-010` un CP, una zona | `zonas_cp.cp` como PK, F3.01 |
| `RN-011` transición sin registro no ocurrió | `INV-EVT-01`, F4.04 |
