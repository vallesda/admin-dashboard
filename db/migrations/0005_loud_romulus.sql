ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "image_url" DROP NOT NULL;--> statement-breakpoint
-- `phone` is mandatory (INV-CUS-01), but the six tutorial customers predate the
-- column. Adding it NOT NULL in one step would fail on those rows, so: add it
-- nullable, mark the legacy rows, then tighten.
--
-- The placeholder is deliberately not a plausible phone number: whoever opens
-- the customer list must see immediately that it is missing data, not a real
-- contact. These rows disappear with `invoices` in F4.
ALTER TABLE "customers" ADD COLUMN "phone" varchar(32);--> statement-breakpoint
UPDATE "customers" SET "phone" = 'SIN TELEFONO' WHERE "phone" IS NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");