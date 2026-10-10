ALTER TABLE "charms" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "charms" ADD COLUMN "status" text DEFAULT 'start' NOT NULL;--> statement-breakpoint
ALTER TABLE "charms" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "charms" ADD COLUMN "progress_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "charms" ADD COLUMN "memory_id" text;--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "recall" text;--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "memory_id" text;--> statement-breakpoint
UPDATE "users" SET "name" = NULL WHERE "name" LIKE '% 테스트 계정';
