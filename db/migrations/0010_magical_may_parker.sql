CREATE TYPE "public"."payment_mode" AS ENUM('online', 'on_site');--> statement-breakpoint
CREATE TYPE "public"."payment_attempt_status" AS ENUM('created', 'processing', 'succeeded', 'failed', 'expired', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('stripe', 'cash', 'terminal', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."refund_reason" AS ENUM('requested_by_customer', 'duplicate', 'fraudulent', 'other');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'requires_action', 'succeeded', 'failed', 'canceled');--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'processing' BEFORE 'paid';--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'partially_refunded' BEFORE 'refunded';--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"status" "payment_attempt_status" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'mxn' NOT NULL,
	"stripe_session_id" varchar(255),
	"stripe_payment_intent_id" varchar(255),
	"stripe_charge_id" varchar(255),
	"payment_method_type" varchar(64),
	"hosted_voucher_url" text,
	"expires_at" timestamp with time zone,
	"actor_id" uuid,
	"note" text,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "payments_stripe_session_id_unique" UNIQUE("stripe_session_id"),
	CONSTRAINT "payments_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_cents" > 0),
	CONSTRAINT "payments_manual_has_actor" CHECK ("payments"."provider" = 'stripe' OR "payments"."actor_id" IS NOT NULL),
	CONSTRAINT "payments_paid_at_matches_status" CHECK (("payments"."status" = 'succeeded') = ("payments"."paid_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" "refund_reason" DEFAULT 'requested_by_customer' NOT NULL,
	"note" text,
	"status" "refund_status" NOT NULL,
	"stripe_refund_id" varchar(255),
	"failure_reason" text,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_stripe_refund_id_unique" UNIQUE("stripe_refund_id"),
	CONSTRAINT "refunds_amount_positive" CHECK ("refunds"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"type" varchar(128) NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_mode" "payment_mode" DEFAULT 'on_site' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_actor_id_admin_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_actor_id_admin_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_status_created_idx" ON "payments" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payments_provider_paid_idx" ON "payments" USING btree ("provider","paid_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "refunds_order_idx" ON "refunds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "refunds_payment_idx" ON "refunds" USING btree ("payment_id");