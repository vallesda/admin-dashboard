CREATE TYPE "public"."admin_role" AS ENUM('staff', 'admin', 'owner');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'staff' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "admin_users_role_idx" ON "admin_users" USING btree ("role");--> statement-breakpoint
-- Carry the tutorial's administrative users over to admin_users.
-- Ids are preserved so any future reference stays valid; the bcrypt hash moves
-- across untouched, so existing passwords keep working.
INSERT INTO "admin_users" ("id", "name", "email", "password_hash", "role", "active")
SELECT "id", "name", "email", "password", 'staff', true
FROM "users"
ON CONFLICT ("email") DO NOTHING;
--> statement-breakpoint
-- Someone has to be able to administer the system. Promote exactly one account
-- to owner, and only when no owner exists yet, so re-running never escalates
-- privileges that an admin has since changed.
UPDATE "admin_users"
SET "role" = 'owner'
WHERE "id" = (SELECT "id" FROM "admin_users" ORDER BY "email" LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM "admin_users" WHERE "role" = 'owner');
