CREATE TYPE "public"."supply_type" AS ENUM('fresh', 'stocked', 'preorder');--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "supply_type" "supply_type" DEFAULT 'fresh' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preorder_cutoff_weekday" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preorder_cutoff_hour" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preorder_arrival_weekday" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preorder_note" text;--> statement-breakpoint
CREATE INDEX "products_supply_status_idx" ON "products" USING btree ("supply_type","status");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_preorder_needs_cycle" CHECK (("products"."supply_type" = 'preorder') = (
        "products"."preorder_cutoff_weekday" IS NOT NULL
        AND "products"."preorder_cutoff_hour" IS NOT NULL
        AND "products"."preorder_arrival_weekday" IS NOT NULL
      ));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_preorder_weekday_range" CHECK (("products"."preorder_cutoff_weekday" IS NULL OR "products"."preorder_cutoff_weekday" BETWEEN 0 AND 6)
        AND ("products"."preorder_arrival_weekday" IS NULL OR "products"."preorder_arrival_weekday" BETWEEN 0 AND 6)
        AND ("products"."preorder_cutoff_hour" IS NULL OR "products"."preorder_cutoff_hour" BETWEEN 0 AND 23));