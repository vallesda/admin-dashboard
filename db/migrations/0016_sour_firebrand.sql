/*
 * La pertenencia a categorías pasa de una columna a una tabla puente.
 *
 * El traspaso va PRIMERO y el `DROP` después, en la misma migración: entre
 * las dos sentencias no puede quedar una ventana donde la clasificación de
 * doce productos no exista en ningún sitio.
 *
 * `WHERE category_id IS NOT NULL` porque la columna era opcional — un producto
 * sin clasificar sigue sin clasificar, no se le inventa una fila.
 */
INSERT INTO "product_categories" ("product_id", "category_id")
SELECT "id", "category_id" FROM "products" WHERE "category_id" IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "category_id";
