# SRS — Especificación de requisitos

Pescadería en línea · México · B2C · entrega local · español.

Convención de IDs y reglas de gobierno: ver [README.md](README.md).
Vocabulario: ver [GLOSARIO.md](GLOSARIO.md).

**Prioridad** MoSCoW: `M` imprescindible · `S` importante · `C` deseable · `W` fuera del MVP.

---

## 1. Alcance

### 1.1 Qué es el sistema

Dos superficies sobre una sola base de datos:

- **Panel de administración** — catálogo, inventario por lotes, pedidos, entrega,
  facturación. Lo usa el personal de la pescadería.
- **Tienda pública** — catálogo, carrito, checkout con ventana de entrega,
  seguimiento. La usa el consumidor final.

El panel se construye primero: sin catálogo ni inventario no hay nada que vender.

### 1.2 Contexto de negocio

Venta de pescado y marisco fresco con **reparto propio** en una zona delimitada
por códigos postales, con **ventanas horarias** y **cadena de frío controlada**.
Producto de **peso fijo** (paquetes cerrados). Cliente **consumidor final**.
Moneda **MXN**. Todo en **español**.

Tres características del producto condicionan todo el diseño y lo separan de un
ecommerce genérico:

1. **Es perecedero.** El inventario no es un número: son lotes con caducidad que
   se despachan por FEFO. Lo que no se vende, se merma.
2. **Es de origen animal y trazable por obligación.** Hay que poder contestar
   *"¿a qué clientes les vendí el lote L-334?"* en minutos.
3. **La entrega es la propuesta de valor.** No hay paquetería: hay una ventana
   horaria, una hora de corte y un camión frío.

### 1.3 Actores

| Actor | Descripción | Rol técnico |
|---|---|---|
| Visitante | No autenticado. Explora y comprueba cobertura. | — |
| Cliente | Autenticado. Compra y hace seguimiento. | — |
| Staff | Recibe mercancía, surte pedidos, registra merma. | `staff` |
| Administrador | Todo lo de staff + catálogo, precios, cancelaciones, slots. | `admin` |
| Propietario | Todo + usuarios, retiradas sanitarias, datos fiscales. | `owner` |
| Repartidor | Registra salida, temperatura, entrega o no-entrega. | `staff` |
| Sistema | Jobs: corte, caducidad, vencimiento de pagos, conciliación. | — |

### 1.4 Matriz de permisos (`RNF-SEG-002`)

| Acción | staff | admin | owner |
|---|:--:|:--:|:--:|
| Ver catálogo e inventario | ✅ | ✅ | ✅ |
| Recibir mercancía / alta de lote | ✅ | ✅ | ✅ |
| Registrar merma | ✅ | ✅ | ✅ |
| Surtir pedido, salida a ruta, entrega | ✅ | ✅ | ✅ |
| Crear/editar producto y variante | ❌ | ✅ | ✅ |
| **Cambiar precios** | ❌ | ✅ | ✅ |
| Ajuste de inventario por conteo | ❌ | ✅ | ✅ |
| **Cancelar pedido con reembolso** | ❌ | ✅ | ✅ |
| Gestionar zonas, ventanas y slots | ❌ | ✅ | ✅ |
| Ver y editar datos fiscales de cliente | ❌ | ❌ | ✅ |
| Timbrar / cancelar CFDI | ❌ | ✅ | ✅ |
| **Retirada sanitaria de lote** | ❌ | ❌ | ✅ |
| Alta de usuario administrativo y roles | ❌ | ❌ | ✅ |

---

## 2. Reglas de negocio transversales

| ID | Regla |
|---|---|
| `RN-001` | **Nunca se vende producto que no exista físicamente.** Toda venta descuenta de un lote concreto; sin lote asignado no hay venta. |
| `RN-002` | **Nunca se sobrevende un slot de reparto.** La capacidad del slot es un límite duro verificado en la base de datos, no en la aplicación. |
| `RN-003` | **El IVA depende del producto, no del sistema.** Pescados, crustáceos y moluscos van a tasa **0 %** (LIVA art. 2-A). **Caviar, salmón ahumado, angulas y alimentos preparados para consumo en el lugar van al 16 %.** No existe una tasa por defecto: cada variante declara su clase de impuesto. |
| `RN-004` | **FEFO estricto.** Se despacha siempre el lote de caducidad más próxima entre los disponibles. |
| `RN-005` | **Nunca se acepta producto devuelto de vuelta al stock vendible.** Pescado fresco que salió a ruta no se revende. Se reembolsa y se merma. |
| `RN-006` | **Toda merma tiene motivo.** Un movimiento de merma sin motivo es merma invisible, y la merma es el KPI que decide si el negocio gana dinero. |
| `RN-007` | **Pasada la hora de corte, el slot no admite ni cambios ni cancelaciones del cliente.** A partir de ahí el producto ya está comprometido y manipulado. |
| `RN-008` | **La falta de datos fiscales nunca bloquea una venta.** Se timbra a público en general. |
| `RN-009` | **El precio y la tasa de impuesto de una línea de pedido son hechos históricos**, no cálculos derivables. Se congelan en el pedido. |
| `RN-010` | **Un código postal pertenece a exactamente una zona de entrega.** Si no, la tarifa sería ambigua. |
| `RN-011` | **Una transición de estado sin registro no ocurrió.** Toda transición escribe en la bitácora dentro de la misma transacción. |

---

## 3. Requisitos funcionales

### 3.1 Catálogo (`CAT`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-CAT-001` | Gestionar categorías jerárquicas con orden de presentación. | M |
| `RF-CAT-002` | Crear, editar y despublicar productos con identidad comercial (nombre, descripción, slug). | M |
| `RF-CAT-003` | Registrar los datos de **etiquetado de pesca** del producto: especie, nombre científico, origen, zona FAO, método de producción (salvaje/acuicultura) y arte de pesca. | M |
| `RF-CAT-004` | Gestionar variantes vendibles (SKU) con presentación y estado de conservación. | M |
| `RF-CAT-005` | Registrar en la variante `unidad_venta`, `peso_neto_g`, `precio_por_kg` y tolerancia de peso, **aunque el MVP facture por peso fijo**. Habilita catch-weight sin migración. | M |
| `RF-CAT-006` | Mostrar en la ficha el precio por kilogramo junto al precio del paquete. | S |
| `RF-CAT-007` | Registrar los parámetros de frío de la variante: si requiere frío, rango de temperatura y vida útil en horas. | M |
| `RF-CAT-008` | Gestionar imágenes de producto con texto alternativo **obligatorio** y una principal. | M |
| `RF-CAT-009` | Buscar catálogo por nombre y especie con coincidencia parcial. | M |
| `RF-CAT-010` | Despublicar por temporada o veda sin borrar el producto ni su historial. | M |
| `RF-CAT-011` | Gestionar proveedores con RFC, contacto y certificaciones. | S |
| `RF-CAT-012` | Registrar las claves SAT de la variante: ProdServ, unidad y objeto de impuesto. | M |
| `RF-CAT-013` | Mantener el catálogo de clases de impuesto con su base legal citable. | M |
| `RF-CAT-014` | **Cada variante debe declarar una clase de impuesto vigente.** Sin valor por defecto: guardar sin clase es un error visible. Realiza `RN-003`. | M |
| `RF-CAT-015` | Mantener tasas de impuesto **con vigencia por fecha**, para absorber una reforma fiscal sin desplegar código. | S |

### 3.2 Inventario y lotes (`INV`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-INV-001` | Registrar recepción de mercancía creando un lote con código, proveedor, fecha de captura, caducidad, temperatura de recepción, cantidad y coste. | M |
| `RF-INV-002` | Mantener una proyección de existencias por variante con disponible y reservado, consultable en tiempo constante. | M |
| `RF-INV-003` | Registrar **todo** movimiento de existencias en un ledger *append-only* con tipo, cantidad con signo, lote, referencia y usuario. | M |
| `RF-INV-004` | Registrar merma con **motivo obligatorio** de un catálogo cerrado. Realiza `RN-006`. | M |
| `RF-INV-005` | Ajustar existencias por conteo físico, generando el movimiento compensatorio correspondiente. | M |
| `RF-INV-006` | Asignar lotes a las líneas de un pedido por **FEFO estricto**. Realiza `RN-004`. | M |
| `RF-INV-007` | Impedir asignar lotes retenidos, retirados o caducados, incluso manualmente. | M |
| `RF-INV-008` | Marcar diariamente los lotes caducados y proponerlos para merma, sin borrarlos. | M |
| `RF-INV-009` | **Trazabilidad bidireccional**: dado un lote, listar pedidos y clientes; dado un pedido, listar lotes. | M |
| `RF-INV-010` | Retener un lote, bloqueando su asignación sin alterar sus existencias. | M |
| `RF-INV-011` | Ejecutar una **retirada sanitaria**: retirar el lote y obtener la lista de clientes afectados con su contacto. | M |
| `RF-INV-012` | Conciliar diariamente la proyección de existencias contra la suma del ledger y alertar de cualquier discrepancia. | M |
| `RF-INV-013` | Alertar cuando una variante baje de su punto de reorden. | C |
| `RF-INV-014` | Informe de merma por motivo, periodo y variante. | S |

### 3.3 Entrega (`ENT`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-ENT-001` | Gestionar zonas de entrega con coste de envío, mínimo de pedido y umbral de envío gratis. | M |
| `RF-ENT-002` | Asignar códigos postales a zonas, garantizando que **un CP pertenece a una sola zona**. Realiza `RN-010`. | M |
| `RF-ENT-003` | Comprobar cobertura por CP y responder con la zona o con un mensaje de "aún no llegamos". | M |
| `RF-ENT-004` | Definir ventanas de entrega recurrentes por zona y día de la semana, con capacidad y hora de corte. | M |
| `RF-ENT-005` | Generar automáticamente los slots de las próximas N fechas a partir de las ventanas. | M |
| `RF-ENT-006` | Ofrecer al cliente solo slots abiertos, con corte no vencido y con capacidad libre. | M |
| `RF-ENT-007` | Reservar plaza de slot de forma **atómica**, impidiendo la sobreventa. Realiza `RN-002`. | M |
| `RF-ENT-008` | Cerrar un slot al alcanzarse su hora de corte. | M |
| `RF-ENT-009` | Cancelar o reducir la capacidad de un **slot concreto** sin afectar a la ventana ni a las demás fechas. | M |
| `RF-ENT-010` | Gestionar días no laborables, globales o por zona. | S |
| `RF-ENT-011` | Generar la hoja de ruta de un slot con los pedidos ordenados. | M |
| `RF-ENT-012` | Registrar la salida a ruta con temperatura, y **bloquearla si está fuera de rango**. | M |
| `RF-ENT-013` | Registrar entrega o no-entrega con evidencia y, en la no-entrega, motivo obligatorio. | M |
| `RF-ENT-014` | Reprogramar un pedido no entregado a un nuevo slot, solo si el producto sigue apto. | M |

### 3.4 Pedidos (`PED`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-PED-001` | Crear un pedido con folio legible, cliente, dirección, slot y líneas. | M |
| `RF-PED-002` | Reservar slot y existencias en **una sola transacción** al crear el pedido. | M |
| `RF-PED-003` | Congelar en cada línea el SKU, nombre, presentación, unidad, peso y precio del momento de compra. Realiza `RN-009`. | M |
| `RF-PED-004` | Implementar la máquina de estados de cumplimiento con sus transiciones legales, rechazando cualquier otra. | M |
| `RF-PED-005` | Mantener el **estado de pago como máquina independiente** del estado de cumplimiento. | M |
| `RF-PED-006` | Registrar toda transición en una bitácora *append-only* con usuario, motivo y metadatos. Realiza `RN-011`. | M |
| `RF-PED-007` | Convertir la reserva en venta al surtir, asignando lotes y moviendo el ledger. | M |
| `RF-PED-008` | Liberar reserva de slot y existencias en toda cancelación previa al surtido. | M |
| `RF-PED-009` | **Congelar la tasa de impuesto aplicada por línea**, no solo el precio. Realiza `RN-009`. | M |
| `RF-PED-010` | Calcular el total como subtotal + impuestos + envío − descuento, verificado por la base de datos. | M |
| `RF-PED-011` | Permitir al cliente cancelar **solo antes de la hora de corte**. Realiza `RN-007`. | M |
| `RF-PED-012` | Cancelar administrativamente con reembolso y, si el producto ya fue manipulado, generar merma. | M |
| `RF-PED-013` | Dar de alta pedidos telefónicos desde el panel. | S |
| `RF-PED-014` | Guardar un **snapshot de la dirección** de entrega, independiente de la dirección editable del cliente. | M |
| `RF-PED-015` | Tablero operativo del día con pedidos por slot, estado y faltantes. | M |
| `RF-PED-016` | Exponer al cliente una línea de tiempo del pedido derivada de la bitácora. | S |

### 3.5 Clientes (`CLI`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-CLI-001` | Alta e inicio de sesión de clientes. | M |
| `RF-CLI-002` | Gestionar múltiples direcciones por cliente con una predeterminada. | M |
| `RF-CLI-003` | Capturar **referencias visuales** de la dirección, destacadas en la interfaz. | M |
| `RF-CLI-004` | Exigir teléfono de contacto: sin teléfono no hay entrega local. | M |
| `RF-CLI-005` | Validar que el CP de la dirección esté dentro de la cobertura antes de permitir el checkout. | M |
| `RF-CLI-006` | Consultar el historial de pedidos del cliente. | S |
| `RF-CLI-007` | Dar de baja un cliente mediante **anonimización**, nunca borrado, preservando la obligación fiscal. | S |

### 3.6 Pagos (`PAG`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-PAG-001` | Cobrar con tarjeta vía Mercado Pago. | M |
| `RF-PAG-002` | Aceptar transferencia SPEI con referencia. | M |
| `RF-PAG-003` | Aceptar pago en efectivo con referencia OXXO. | S |
| `RF-PAG-004` | Procesar confirmaciones asíncronas del proveedor mediante webhooks **firmados e idempotentes**. | M |
| `RF-PAG-005` | Cancelar el pedido y liberar reserva y slot si la referencia vence o llega el corte sin pago. | M |
| `RF-PAG-006` | Registrar reembolsos totales y parciales con motivo, **sin alterar el estado de cumplimiento**. | M |
| `RF-PAG-007` | Impedir que la suma de reembolsos supere el total del pedido. | M |

### 3.7 Fiscal (`FIS`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-FIS-001` | Capturar datos fiscales del cliente: RFC, razón social, régimen y CP fiscal, los cuatro obligatorios juntos. | M |
| `RF-FIS-002` | Emitir CFDI 4.0 tras confirmar la entrega, a través de un PAC. | M |
| `RF-FIS-003` | Timbrar a **público en general** cuando no se solicite factura. Realiza `RN-008`. | M |
| `RF-FIS-004` | Reflejar en el CFDI la tasa **congelada en cada línea**, permitiendo mezclar 0 % y 16 % en un mismo comprobante. | M |
| `RF-FIS-005` | Cancelar un CFDI con motivo, conservando el registro. | M |
| `RF-FIS-006` | Entregar XML y PDF al cliente y conservarlos 5 años. | M |
| `RF-FIS-007` | Cuadrar el total del CFDI con el total del pedido al centavo. | M |

### 3.8 Tienda (`TDA`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-TDA-001` | Solicitar el CP y comunicar la cobertura antes de que el visitante invierta tiempo. | M |
| `RF-TDA-002` | Explorar el catálogo por categoría con búsqueda y paginación. | M |
| `RF-TDA-003` | Ficha de producto con origen, especie, presentación, peso, precio y precio por kg. | M |
| `RF-TDA-004` | Carrito con validación de disponibilidad en el momento de añadir. | M |
| `RF-TDA-005` | Checkout: dirección → slot → método de pago, con revalidación en servidor de cada paso. | M |
| `RF-TDA-006` | Mostrar el mínimo de pedido y el coste de envío de la zona antes de pagar. | M |
| `RF-TDA-007` | Seguimiento del pedido por línea de tiempo. | S |
| `RF-TDA-008` | Cancelación por el cliente antes del corte. | M |
| `RF-TDA-009` | Correos transaccionales: confirmación, pago recibido, salida a ruta, entrega. | S |

### 3.9 Administración (`ADM`) y reportes (`REP`)

| ID | Requisito | Prio |
|---|---|:--:|
| `RF-ADM-001` | Gestionar usuarios administrativos con rol. | M |
| `RF-ADM-002` | **Verificar rol dentro de cada server action**, no solo en el middleware. | M |
| `RF-ADM-003` | Ocultar en la interfaz lo que el rol no puede ejecutar. | S |
| `RF-REP-001` | Panel del día: pedidos por slot, merma del día, faltantes, alertas de frío. | M |
| `RF-REP-002` | Ventas por periodo desde pedidos **entregados**, no desde pedidos creados. | S |
| `RF-REP-003` | Rotación y merma por variante y por proveedor. | C |

---

## 4. Requisitos no funcionales

Cada uno con criterio verificable. Sin relleno.

### 4.1 Cadena de frío (`FRIO`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-FRIO-001` | Toda transición de custodia física (recepción, salida a ruta, entrega) registra temperatura. Fuera del rango de la variante, la transición se **bloquea** y exige motivo de excepción registrado. | Intentar salida a ruta con 8 °C sobre producto de 0–4 °C → rechazo + evento registrado. |
| `RNF-FRIO-002` | Un lote retenido o retirado nunca se asigna, ni manualmente. | El índice parcial lo excluye y la función de asignación lo revalida. |
| `RNF-FRIO-003` | Una merma por rotura de cadena de frío genera alerta en el panel del día, atribuida a un usuario. | Registrar la merma y ver la alerta. |

### 4.2 Tiempo, corte y concurrencia (`TIEMPO`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-TIEMPO-001` | Todo instante en `timestamptz`; presentación con `Intl` en `es-MX` y `America/Mexico_City`. Prohibido derivar fechas con `toISOString().split('T')[0]` (`DT-003`). | Un pedido creado a las 23:30 CST muestra su fecha local correcta, no la del día siguiente. |
| `RNF-TIEMPO-002` | La hora de corte se evalúa **solo en el servidor**, con horario de verano incluido. Un slot vencido no es reservable aunque el HTML esté cacheado. | Enviar el formulario con un slot vencido → error de dominio, no reserva. |
| `RNF-TIEMPO-003` | La reserva de slot y de existencias es **una sola transacción** con bloqueo de fila. | Dos checkouts simultáneos por la última plaza: uno gana, el otro recibe un mensaje accionable. Nunca sobreventa. |
| `RNF-TIEMPO-004` | Los jobs (corte, caducidad, vencimiento) son idempotentes. | Ejecutar dos veces no duplica transiciones ni movimientos. |

### 4.3 Caducidad y FEFO (`CAD`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-CAD-001` | Asignación FEFO estricta entre lotes disponibles. | Con lotes que caducan el 3 y el 5, el pedido consume el del 3. |
| `RNF-CAD-002` | No se asigna un lote cuya caducidad sea anterior a la fecha de entrega más el margen de vida útil. | Un lote que caduca hoy no puede surtir un pedido de mañana. |
| `RNF-CAD-003` | Job diario que marca caducados; dejan de contar como disponibles sin borrarse. | Ejecutar el job y comprobar existencias y persistencia del lote. |
| `RNF-CAD-004` | Trazabilidad bidireccional de lote en < 1 s. | Consultar clientes de un lote con 10⁶ movimientos sembrados. |

### 4.4 Rendimiento (`REND`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-REND-001` | Catálogo p95 < 300 ms con 10⁴ variantes; tablero del día p95 < 500 ms con 10⁵ pedidos y 10⁶ movimientos. | Medición con datos sembrados. |
| `RNF-REND-002` | `pg_trgm` y sus índices GIN **se crean en la migración**, no solo en `scripts/baseline.ts` (`DT-004`). Hoy una base nueva no los tiene y toda búsqueda es escaneo secuencial. | Base limpia + `pnpm db:migrate` + `EXPLAIN` muestra uso del índice GIN. |
| `RNF-REND-003` | Ningún listado ejecuta el mismo `WHERE` dos veces: total con `COUNT(*) OVER ()` (`DT-002`) y paginación keyset para pedidos. | Revisión de consultas + `EXPLAIN`. |
| `RNF-REND-004` | Patrón de búsqueda normativo ya existente: debounce de 300 ms, reset de `page=1`, estado en la URL (`app/ui/search.tsx`). **Reutilizar, no reimplementar.** | Revisión de código. |
| `RNF-REND-005` | Toda página con datos usa `<Suspense>` + skeleton de `app/ui/skeletons.tsx`. Ninguna consulta se espera a nivel de página salvo que el shell la necesite, y en ese caso se documenta (`DT-007`). | Revisión de código. |

### 4.5 Accesibilidad (`A11Y`)

El código actual ya es cuidadoso en accesibilidad. El objetivo es **no perderlo**.

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-A11Y-001` | WCAG 2.2 AA. Todo campo con etiqueta; errores con `aria-describedby` + `aria-live` **y efectivamente renderizados**. Cierra `DT-001`: hoy los formularios producen errores de validación que **nunca se pintan**. | Enviar el formulario vacío muestra el mensaje por campo y un lector de pantalla lo anuncia. |
| `RNF-A11Y-002` | Texto alternativo obligatorio en imágenes de producto, garantizado por la base de datos. | Intentar guardar una imagen sin `alt` → rechazo. |
| `RNF-A11Y-003` | Los skeletons exponen región live; tras un redirect el foco va al encabezado del destino. | Recorrido con lector de pantalla. |
| `RNF-A11Y-004` | El estado del pedido nunca se comunica solo por color: icono + texto. | Revisión visual en escala de grises. |
| `RNF-A11Y-005` | Interfaz en español con `lang="es-MX"`; números, fechas y moneda con `Intl`. `formatCurrency` está hoy fijado a `en-US`/`USD` (`DT-008`): es una **reescritura**, no una traducción. | Revisión de código. |

### 4.6 Seguridad y privacidad (`SEG`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-SEG-001` | `requireRole()` dentro de **cada** server action. Las server actions son endpoints POST invocables directamente y no pasan por el middleware. | POST directo con sesión `staff` a una acción de `admin` → error de autorización. |
| `RNF-SEG-002` | Matriz de permisos §1.4 aplicada en servidor y reflejada en la interfaz. | Recorrido por rol. |
| `RNF-SEG-003` | Datos personales mínimos. Teléfono y dirección visibles solo para roles operativos y solo en pedidos activos. El hash de contraseña jamás sale del servidor. | Revisión de la sesión y de las consultas. |
| `RNF-SEG-004` | Webhooks de pago con verificación de firma e idempotencia por referencia única. | Reenviar el mismo webhook tres veces produce un único efecto. |
| `RNF-SEG-005` | RFC y datos fiscales son datos personales sensibles: acceso restringido a `owner` y registrado. | Revisión de permisos. |
| `RNF-SEG-006` | Validación compartida cliente↔servidor, pero **la autoridad es siempre el servidor**. Ninguna regla de negocio (corte, existencias, tasa) se decide en el cliente. | Revisión de código. |

### 4.7 Integridad, respaldo y retención (`DAT`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-DAT-001` | El ledger de inventario y la bitácora de pedidos son *append-only*: `UPDATE`/`DELETE` revocados al rol de aplicación. Corregir es un movimiento compensatorio. | Un `UPDATE` directo es rechazado por permisos. |
| `RNF-DAT-002` | Respaldo con recuperación a un punto en el tiempo, retención ≥ 7 días. **Prueba de restauración trimestral con tiempo medido y anotado.** RTO 4 h, RPO 5 min. | Informe de restauración con fecha y duración real. Un respaldo no probado no es un respaldo. |
| `RNF-DAT-003` | Retención fiscal: XML y PDF de CFDI se conservan 5 años (CFF art. 30), aunque el cliente se dé de baja. La baja es anonimización, no borrado. | Anonimizar un cliente y comprobar que sus CFDI persisten. |
| `RNF-DAT-004` | Conciliación diaria de existencias contra el ledger. Cualquier discrepancia alerta y **no se autocorrige en silencio**. | Introducir una discrepancia y ver la alerta. |
| `RNF-DAT-005` | Toda migración es reversible o lleva plan de reversión escrito. Ninguna migración destructiva sin respaldo verificado del mismo día. | Revisión de cada PR de migración. |

### 4.8 Disponibilidad y observabilidad (`DISPO`, `OBS`)

| ID | Requisito | Verificación |
|---|---|---|
| `RNF-DISPO-001` | La ventana crítica va desde la apertura del sitio hasta la hora de corte de cada zona. Fuera de ella se aceptan mantenimiento y degradación. Define cuándo se puede desplegar. | Calendario de despliegue documentado. |
| `RNF-OBS-001` | Toda transición de estado y toda merma quedan atribuidas a un usuario identificado y con marca de tiempo. `console.error` deja de ser la única traza. | Auditar una transición y una merma de extremo a extremo. |
