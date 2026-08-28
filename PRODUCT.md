# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hogares en San Pedro Garza García, Nuevo León, que compran pescado y marisco
fresco para cocinar en casa. Dos situaciones confirmadas, sin prioridad entre
ellas:

- **Por ocasión** — van a preparar algo concreto (ceviche el sábado, una cena
  para dos) y buscan la pieza correcta para eso.
- **Recurrente** — despensa semanal de pescado y marisco, por conveniencia y
  confianza más que por ocasión.

Solo B2C. La venta a restaurantes y chefs está explícitamente fuera de alcance.

Segundo usuario, interno: el personal de la pescadería que opera el negocio
desde el panel de administración — da de alta producto, registra entradas de
inventario y hace avanzar los pedidos.

## Product Purpose

Vender pescado y marisco fresco en línea con la selección y el manejo de una
pescadería, no de un anaquel de supermercado. El producto son dos superficies
sobre el mismo dominio:

- **Tienda** — el comprador explora el producto disponible ese día, arma su
  pedido y elige entre recoger o recibir a domicilio.
- **Panel** — la pescadería mantiene catálogo e inventario y trabaja los pedidos
  hasta entregarlos.

Éxito es que un pedido colocado en la tienda llegue completo y en frío, y que la
pescadería pueda operarlo sin salirse del panel.

## Positioning

Cuatro afirmaciones que el negocio sostiene y que un competidor de anaquel no
podría copiar con verdad:

- **Curaduría por pieza** — no se vende todo lo que llega. Se elige pieza por
  pieza y lo que no pasa el filtro no entra al catálogo. Como consecuencia
  directa, el catálogo cambia con lo que el mar dio ese día: el comprador compra
  de la captura, no de una bodega.
- **Manejo a medida** — limpieza, corte y empaque como el cliente lo pide, listo
  para cocinar. Es el oficio de la pescadería, no un empaque estándar.
- **Trazabilidad de origen** — cada pieza dice de dónde viene, cómo está cortada
  y en qué presentación.
- **Cadena de frío propia** — refrigerado desde que llega hasta que se entrega,
  con entrega local propia en lugar de paquetería.

## Operating Context

- El catálogo es volátil por diseño: refleja lo disponible ese día y una pieza
  agotada deja de aparecer.
- Dos modalidades de entrega: **recoger en tienda** y **entrega a domicilio**.
- Tras colocar el pedido, la pescadería contacta al comprador por teléfono para
  confirmar horario y punto de entrega.
- El pago **no ocurre en línea**: se cobra al recibir o al recoger.
- Solo español, `es-MX`. Precios en `MXN`, formateados con `Intl`.

## Capabilities and Constraints

**Construido y en uso**

- Catálogo con SKU, categorías y colecciones; fotografía de producto subida
  desde el panel.
- Inventario con ledger de movimientos append-only (garantizado por trigger de
  Postgres) y reserva de stock bajo bloqueo de fila, para evitar sobreventa.
- Pedidos con **dos máquinas de estado ortogonales**: cumplimiento
  (`pending → confirmed → preparing → ready → completed`, más `cancelled`) y
  pago (`unpaid → paid → refunded`). Separadas a propósito: un pedido entregado
  al que se le reembolsa una pieza sigue siendo un pedido entregado.
- Checkout público que reutiliza el mismo caso de uso que el pedido manual del
  panel. El pedido se consulta por token opaco, nunca por número consecutivo.
- Control de acceso por rol (`staff`, `admin`, `owner`) aplicado en el servidor.

**Restricciones y decisiones abiertas**

- **Cobertura, días de entrega y hora de corte: sin definir.** El backend no los
  modela y la tienda no los promete. No deben inventarse.
- **Costo de entrega: sin modelar.** Todo pedido se crea con envío en cero y la
  tienda dice que se confirma aparte.
- **Proveedor de pago: sin elegir.** Es lo que bloquea cobrar en línea.
- La interfaz todavía no respeta los roles que el servidor sí aplica: un `staff`
  ve acciones que le devuelven error al pulsarlas.
- Sin pruebas automatizadas. Decisión explícita del negocio: llegan cuando el
  MVP esté completo.
- **Clase de impuesto por producto: sin implementar.** La investigación fiscal
  documentada indica que pescados y mariscos van a IVA 0%, pero que caviar,
  salmón ahumado y angulas están gravados al 16%. Hoy el esquema no distingue,
  así que vender cualquiera de esos tres exigiría modelarlo antes.

## Brand Commitments

- **Nombre:** Amor a Mar.
- **Logo:** `storefront/public/brand/amoramar-logo.png`, también usado como
  icono de pestaña.
- **Verde de marca:** `#024F55`. Aportado por el usuario como constante de
  identidad.
- **Idioma:** solo español, sin i18n. Tanto la tienda como el panel.
- **Voz:** se describen prácticas, nunca certificaciones. Ninguna copia del
  producto afirma algo que el negocio no haya establecido — sin premios, sin
  superlativos, sin cifras que nadie midió. Esta regla está sostenida a lo largo
  del código y es la más fácil de romper por accidente.

## Evidence on Hand

**Real y disponible**

- Fotografía editorial versionada en `storefront/public/editorial/`:
  `hero-barco.jpg`, `sashimi.jpg`, `ceviche.jpg`, `parrilla.jpg`,
  `cena-para-dos.jpg`.
- Fotografía de producto real en Vercel Blob, subida desde el panel.
- Catálogo real: 7 productos activos en 3 categorías (Pescados, Mariscos,
  Producto Fresco).
- Pedidos reales en base de datos, incluida la máquina de estados en operación.
- Panel desplegado en `https://admin-dashboard-pi-indol-54.vercel.app`
  (pendiente de configurarle variables de entorno).
- Documentación de dominio en `DOCS/`: SRS, modelo de datos, flujos, historias y
  plan, con IDs trazables.

**Ausencias que el trabajo futuro no debe fabricar**

- No hay testimonios, reseñas ni casos de cliente.
- No hay prensa, premios ni certificaciones.
- No hay foto de la sección editorial *About*: el código espera
  `storefront/public/editorial/nosotros.jpg` y degrada con elegancia sin ella.
- No hay calendario de entregas ni zonas de cobertura publicables.

## Product Principles

1. **El catálogo dice la verdad del día.** Lo que se muestra es lo que hay. Un
   producto agotado desaparece en lugar de aceptar un pedido que no se puede
   cumplir.
2. **Nunca prometer lo que el negocio no ha establecido.** Ante la duda entre un
   dato inventado y un hueco honesto, gana el hueco. Aplica a fechas de entrega,
   costos de envío, cobertura y cualquier afirmación de marca.
3. **El dinero y el inventario se calculan en el servidor.** El carrito del
   navegador solo lleva identificadores y cantidades; el precio y la reserva se
   resuelven en la transacción, de modo que manipular el cliente no cambia lo
   que se cobra ni lo que se aparta.
4. **Comprar primero, narrativa después.** El comprador llega a un producto
   comprable antes que a cualquier historia sobre el mar.
5. **Fallar en voz alta.** El modo de fallo caro de este producto ha sido el
   silencioso — inventario invisible, categorías que se borran solas, 404 que
   responden 200. Un error visible siempre es preferible a uno callado.

## Accessibility & Inclusion

Sin estándar formal comprometido por el negocio, pero con práctica establecida y
sostenida en el código, que el trabajo futuro debe preservar:

- Errores de formulario asociados con `aria-describedby` y anunciados con
  `role="alert"` o `aria-live`, no descubiertos al tabular de vuelta.
- El estado activo nunca se comunica solo con color: siempre acompañado de peso
  tipográfico, una regla o `aria-current`.
- Iconos decorativos marcados `aria-hidden` cuando el texto contiguo ya carga el
  significado.
- Secciones etiquetadas con `aria-labelledby`.
- Se respeta `prefers-reduced-motion`.
