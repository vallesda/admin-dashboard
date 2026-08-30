ALTER TABLE "order_items" ADD COLUMN "supply_type" "supply_type" DEFAULT 'fresh' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "promised_for" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promised_for" timestamp with time zone;