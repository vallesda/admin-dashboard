CREATE TYPE "public"."movement_type" AS ENUM('receive', 'adjustment', 'reserve', 'release', 'sale');--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"type" "movement_type" NOT NULL,
	"on_hand_delta" integer DEFAULT 0 NOT NULL,
	"reserved_delta" integer DEFAULT 0 NOT NULL,
	"order_id" uuid,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_not_empty" CHECK ("inventory_movements"."on_hand_delta" <> 0 OR "inventory_movements"."reserved_delta" <> 0),
	CONSTRAINT "inventory_movements_receive_shape" CHECK ("inventory_movements"."type" <> 'receive' OR ("inventory_movements"."on_hand_delta" > 0 AND "inventory_movements"."reserved_delta" = 0)),
	CONSTRAINT "inventory_movements_reserve_shape" CHECK ("inventory_movements"."type" <> 'reserve' OR ("inventory_movements"."on_hand_delta" = 0 AND "inventory_movements"."reserved_delta" > 0 AND "inventory_movements"."order_id" IS NOT NULL)),
	CONSTRAINT "inventory_movements_release_shape" CHECK ("inventory_movements"."type" <> 'release' OR ("inventory_movements"."on_hand_delta" = 0 AND "inventory_movements"."reserved_delta" < 0 AND "inventory_movements"."order_id" IS NOT NULL)),
	CONSTRAINT "inventory_movements_sale_shape" CHECK ("inventory_movements"."type" <> 'sale' OR ("inventory_movements"."on_hand_delta" < 0 AND "inventory_movements"."reserved_delta" = "inventory_movements"."on_hand_delta" AND "inventory_movements"."order_id" IS NOT NULL)),
	CONSTRAINT "inventory_movements_adjustment_note" CHECK ("inventory_movements"."type" <> 'adjustment' OR ("inventory_movements"."note" IS NOT NULL AND length(btrim("inventory_movements"."note")) > 0))
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_movements_product_created_idx" ON "inventory_movements" USING btree ("product_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inventory_movements_order_idx" ON "inventory_movements" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_type_created_idx" ON "inventory_movements" USING btree ("type","created_at" DESC NULLS LAST);--> statement-breakpoint
-- Append-only ledger.
--
-- A REVOKE UPDATE/DELETE would not be enough: the table owner keeps implicit
-- privileges regardless of grants, and the application connects as the owner on
-- Neon. A trigger blocks the operation for every role, owner included.
--
-- Correcting a mistake means inserting a compensating `adjustment`, so the
-- history explains itself instead of being quietly rewritten.
CREATE OR REPLACE FUNCTION inventory_movements_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'inventory_movements is append-only: % is not allowed. Insert a compensating adjustment instead.',
    TG_OP
    USING ERRCODE = '0A000';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER inventory_movements_no_update
  BEFORE UPDATE ON "inventory_movements"
  FOR EACH ROW EXECUTE FUNCTION inventory_movements_append_only();
--> statement-breakpoint
CREATE TRIGGER inventory_movements_no_delete
  BEFORE DELETE ON "inventory_movements"
  FOR EACH ROW EXECUTE FUNCTION inventory_movements_append_only();
