/*
 * Las dos restricciones de abajo se añaden NOT VALID a propósito.
 *
 * Existen pedidos anteriores a esta regla: llevan la dirección como una sola
 * línea de texto libre y no hay forma honesta de partir una frase en calle,
 * colonia y código postal. Y el pedido #42 es «a domicilio» con pago al
 * recibir, combinación que a partir de ahora no se ofrece.
 *
 * NOT VALID significa: la regla se aplica a todo lo que se escriba desde ahora,
 * y las filas históricas se quedan como están. Reescribirlas sería inventar
 * datos; rechazar la migración sería peor.
 *
 * Para validarlas más adelante, una vez corregidas a mano:
 *   ALTER TABLE orders VALIDATE CONSTRAINT orders_delivery_needs_address_parts;
 *   ALTER TABLE orders VALIDATE CONSTRAINT orders_cash_is_pickup_only;
 */
ALTER TABLE "orders" ADD COLUMN "delivery_street" varchar(160);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_ext_number" varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_int_number" varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_neighborhood" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_city" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_state" varchar(64);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_postal_code" varchar(5);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_references" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_needs_address_parts" CHECK ("orders"."fulfillment_type" <> 'delivery' OR (
        "orders"."delivery_street" IS NOT NULL AND length(btrim("orders"."delivery_street")) > 0
        AND "orders"."delivery_ext_number" IS NOT NULL AND length(btrim("orders"."delivery_ext_number")) > 0
        AND "orders"."delivery_neighborhood" IS NOT NULL AND length(btrim("orders"."delivery_neighborhood")) > 0
        AND "orders"."delivery_city" IS NOT NULL AND length(btrim("orders"."delivery_city")) > 0
        AND "orders"."delivery_state" IS NOT NULL AND length(btrim("orders"."delivery_state")) > 0
        AND "orders"."delivery_postal_code" ~ '^[0-9]{5}$'
      )) NOT VALID;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cash_is_pickup_only" CHECK ("orders"."payment_mode" <> 'on_site' OR "orders"."fulfillment_type" = 'pickup') NOT VALID;