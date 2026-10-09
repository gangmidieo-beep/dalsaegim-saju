CREATE TABLE "charms" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"wish" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "letters" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"user_id" text NOT NULL,
	"profile_id" text,
	"persona" text NOT NULL,
	"feeling" text NOT NULL,
	"topic" text,
	"input" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"ai" boolean DEFAULT false NOT NULL,
	"cost_krw" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moon_letters" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"date" text,
	"theme" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "letter_notify_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "charms_user" ON "charms" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "letters_user" ON "letters" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "moon_letters_date" ON "moon_letters" USING btree ("date");