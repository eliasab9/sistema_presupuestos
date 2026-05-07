-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text,
	"name" text NOT NULL,
	"attention" text,
	"email" text,
	"phone" text,
	"cuit" text,
	"address" text,
	"locality" text,
	"province" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"budget_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone,
	"number" text NOT NULL,
	"date" text NOT NULL,
	"valid_until" text NOT NULL,
	"exchange_rate" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'ARS' NOT NULL,
	"payment_terms" text,
	"commercial_validity" text,
	"general_notes" text,
	"iva_condition" text,
	"pide_number" text,
	"responsable" text,
	"customer_id" uuid,
	"customer_snapshot" jsonb,
	"seller_id" uuid,
	"subtotal_labor" numeric(16, 2) DEFAULT '0' NOT NULL,
	"subtotal_bearings" numeric(16, 2) DEFAULT '0' NOT NULL,
	"subtotal_spare_parts" numeric(16, 2) DEFAULT '0' NOT NULL,
	"subtotal_machining" numeric(16, 2) DEFAULT '0' NOT NULL,
	"subtotal_general" numeric(16, 2) DEFAULT '0' NOT NULL,
	"subtotal_items" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total_tax" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total_final" numeric(16, 2) DEFAULT '0' NOT NULL,
	"all_sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"taxes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "templates_company_id_idx" ON "templates" USING btree ("company_id" text_ops);--> statement-breakpoint
CREATE INDEX "customers_company_id_idx" ON "customers" USING btree ("company_id" text_ops);--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "budgets_company_id_idx" ON "budgets" USING btree ("company_id" text_ops);--> statement-breakpoint
CREATE INDEX "budgets_created_at_idx" ON "budgets" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "budgets_customer_id_idx" ON "budgets" USING btree ("customer_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "budgets_number_idx" ON "budgets" USING btree ("number" text_ops);--> statement-breakpoint
CREATE INDEX "budgets_status_idx" ON "budgets" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "sellers_company_id_idx" ON "sellers" USING btree ("company_id" text_ops);
*/