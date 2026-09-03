/*
 * Dos índices sobre expresiones, y la validación de una restricción pendiente.
 *
 * Los dos índices son sobre **expresiones**, no sobre columnas, que es la razón
 * de que no existieran: `customers_phone_idx` y la fila de `inventory` ya
 * estaban ahí, pero ninguna de las dos consultas los podía usar porque filtran
 * por el resultado de una operación, no por el valor guardado.
 */

/*
 * 1. Buscar cliente por teléfono, en cada checkout.
 *
 * `findByPhone` filtra por `regexp_replace(phone, '\D', '', 'g')`, y una
 * función alrededor de la columna inutiliza el índice de la columna: medido con
 * EXPLAIN ANALYZE, hacía Seq Scan sobre `customers`. Con 26 filas no se nota;
 * está en el camino del endpoint más caro del sistema y crece con cada cliente.
 *
 * `IMMUTABLE` es requisito de Postgres para indexar una expresión, y
 * `regexp_replace` de tres argumentos lo es. El cuarto argumento —las banderas—
 * la vuelve `STABLE`, así que la forma de abajo repite el patrón `'g'` dentro
 * del literal en vez de pasarlo aparte.
 */
CREATE INDEX IF NOT EXISTS customers_phone_digits_idx
  ON customers (regexp_replace(phone, '\D', '', 'g'));
--> statement-breakpoint

/*
 * 2. Productos bajo mínimo, en cada carga del panel.
 *
 * La consulta filtra por `(on_hand - reserved) <= coalesce(low_stock_threshold, 0)`,
 * otra expresión sin índice, y el panel es `force-dynamic` — o sea que se
 * ejecuta en cada visita a `/dashboard`.
 *
 * El índice cubre lo disponible; el umbral se compara después. No es la
 * cobertura perfecta (haría falta un índice parcial por umbral, que cambia por
 * producto) pero convierte el escaneo en un recorrido ordenado, que es donde
 * está la diferencia.
 */
CREATE INDEX IF NOT EXISTS inventory_available_idx
  ON inventory ((on_hand - reserved));
--> statement-breakpoint

/*
 * 3. La restricción que quedó a medias.
 *
 * `orders_cash_is_pickup_only` se añadió `NOT VALID`, o sea que la regla se
 * aplica a lo que se escriba desde entonces pero **no** garantiza que los datos
 * viejos la cumplan. La bloqueaba una sola fila: el pedido #42, `on_site` con
 * `delivery`, anterior a la regla.
 *
 * Se corrige esa fila a `pickup` —que es lo que el pago en efectivo implica, y
 * la razón de ser de la restricción— y se valida. A partir de aquí la garantía
 * cubre toda la tabla, no sólo el futuro.
 */
UPDATE orders SET fulfillment_type = 'pickup'
  WHERE payment_mode = 'on_site' AND fulfillment_type <> 'pickup';
--> statement-breakpoint
ALTER TABLE orders VALIDATE CONSTRAINT orders_cash_is_pickup_only;
