ALTER TYPE "public"."unit_type" ADD VALUE 'kg';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "public_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "short_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "origin" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "presentation" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "storage_instructions" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "preparation_suggestions" text[];--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_seasonal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_public_token_unique" UNIQUE("public_token");