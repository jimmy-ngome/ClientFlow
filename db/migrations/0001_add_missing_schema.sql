-- Add missing columns to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "phones" text;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "city" varchar(100);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "found_by" varchar(100);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "contacted_by" varchar(100);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "developed_by" varchar(100);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "to_callback" boolean;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "delivered_on_time" boolean;
--> statement-breakpoint

-- Migrate old phone data to new phones column
UPDATE "clients" SET "phones" = '["' || "phone" || '"]' WHERE "phone" IS NOT NULL AND "phones" IS NULL;
--> statement-breakpoint

-- Drop old phone column
ALTER TABLE "clients" DROP COLUMN IF EXISTS "phone";
--> statement-breakpoint

-- Create tags table
CREATE TABLE IF NOT EXISTS "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"color" varchar(7) DEFAULT '#3b82f6' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- Create client_tags junction table
CREATE TABLE IF NOT EXISTS "client_tags" (
	"client_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "client_tags_pkey" PRIMARY KEY("client_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
