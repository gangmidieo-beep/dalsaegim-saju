CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"action" text NOT NULL,
	"target" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"slot" text NOT NULL,
	"title" text NOT NULL,
	"copy" text,
	"image_url" text,
	"link" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"user_id" text NOT NULL,
	"profile_id" text,
	"topic" text,
	"source" text,
	"messages" jsonb NOT NULL,
	"turns" integer DEFAULT 0 NOT NULL,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"cost_krw" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text,
	"session_id" text,
	"name" text NOT NULL,
	"props" jsonb,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"referrer" text,
	"platform" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"flow" jsonb,
	"sources" text,
	"published" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"user_id" text NOT NULL,
	"profile_id" text,
	"kind" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"happened_on" text NOT NULL,
	"ref_id" text,
	"saju_note" text,
	"feedback" text,
	"feedback_note" text,
	"feedback_at" timestamp with time zone,
	"followup_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"profile_id" text,
	"product_id" text NOT NULL,
	"kind" text NOT NULL,
	"amount" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"method" text,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"refund_status" text,
	"provider_ref" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products" (
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"series" text,
	"adult" boolean DEFAULT false NOT NULL,
	"people" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"card_copy" text,
	"detail" text,
	"price" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"badge" text,
	"visible" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"meta" jsonb,
	"list_price" integer,
	"show_discount" boolean DEFAULT true NOT NULL,
	"button_label" text,
	"result_title" text,
	"detail_copy" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"relation" text,
	"gender" text NOT NULL,
	"birth_year" integer NOT NULL,
	"birth_month" integer NOT NULL,
	"birth_day" integer NOT NULL,
	"calendar" text NOT NULL,
	"leap" boolean DEFAULT false NOT NULL,
	"birth_hour" integer,
	"blood_type" text,
	"mbti" text,
	"meta" jsonb,
	"is_main" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readings" (
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"profile_id" text,
	"product_id" text NOT NULL,
	"status" text NOT NULL,
	"content" jsonb,
	"model" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"cost_krw" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"code" text PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"path" text NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"user_id" text,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan" text NOT NULL,
	"status" text NOT NULL,
	"channel" text NOT NULL,
	"amount" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"renewed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"canceled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text,
	"provider" text,
	"provider_id" text,
	"email" text,
	"name" text,
	"platform" text,
	"marketing" boolean,
	"memory_ai" boolean DEFAULT true NOT NULL,
	"merged_into" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "chats_user" ON "chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "events_name_created" ON "events" USING btree ("name","created_at");--> statement-breakpoint
CREATE INDEX "memories_user" ON "memories" USING btree ("user_id","happened_on");--> statement-breakpoint
CREATE INDEX "orders_user" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_created" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "profiles_user" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subs_user" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_device" ON "users" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "users_provider" ON "users" USING btree ("provider","provider_id");