ALTER TABLE "memories" ADD COLUMN "visibility" text DEFAULT 'self' NOT NULL;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "photo" text;