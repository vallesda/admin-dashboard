CREATE TYPE "public"."delivery_fee_reason" AS ENUM('none', 'zone', 'free_over_threshold', 'waived');--> statement-breakpoint
CREATE TABLE "delivery_zone_postal_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"postal_code" varchar(5) NOT NULL,
	CONSTRAINT "delivery_zone_postal_codes_shape" CHECK ("delivery_zone_postal_codes"."postal_code" ~ '^[0-9]{5}$')
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"fee_cents" integer NOT NULL,
	"free_over_cents" integer,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_zones_fee_non_negative" CHECK ("delivery_zones"."fee_cents" >= 0),
	CONSTRAINT "delivery_zones_free_over_positive" CHECK ("delivery_zones"."free_over_cents" IS NULL OR "delivery_zones"."free_over_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_zone_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_zone_name" varchar(120);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee_reason" "delivery_fee_reason" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee_note" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee_waived_by" uuid;--> statement-breakpoint
ALTER TABLE "delivery_zone_postal_codes" ADD CONSTRAINT "delivery_zone_postal_codes_zone_id_delivery_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_zone_postal_codes_code_idx" ON "delivery_zone_postal_codes" USING btree ("postal_code");--> statement-breakpoint
CREATE INDEX "delivery_zone_postal_codes_zone_idx" ON "delivery_zone_postal_codes" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "delivery_zones_active_sort_idx" ON "delivery_zones" USING btree ("active","sort_order");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_delivery_zones_id_fk" FOREIGN KEY ("delivery_zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_fee_waived_by_admin_users_id_fk" FOREIGN KEY ("delivery_fee_waived_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_waived_fee_has_reason" CHECK ("orders"."delivery_fee_reason" <> 'waived' OR (
        "orders"."delivery_fee_note" IS NOT NULL
        AND length(btrim("orders"."delivery_fee_note")) > 0
        AND "orders"."delivery_fee_cents" = 0
      ));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_has_no_delivery_fee" CHECK ("orders"."fulfillment_type" <> 'pickup' OR (
        "orders"."delivery_fee_cents" = 0 AND "orders"."delivery_fee_reason" = 'none'
      ));