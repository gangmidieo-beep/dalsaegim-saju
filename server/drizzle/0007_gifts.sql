CREATE TABLE "gifts" (
	"site_id" text DEFAULT 'dalsaegim' NOT NULL,
	"code" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"from_name" text,
	"image" text NOT NULL,
	"user_id" text,
	"opens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "gifts_user_created" ON "gifts" USING btree ("user_id","created_at");