ALTER TABLE "subscriptions" ADD COLUMN "credits" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "adult_at" timestamp with time zone;--> statement-breakpoint
UPDATE "products" SET "title" = 'AI 사주친구 이용권 · 질문 10회', "card_copy" = '내 사주와 기록을 아는 상담 친구에게 10번 더 묻기 · 90일 동안' WHERE "id" = 'friend_pass';--> statement-breakpoint
UPDATE "products" SET "title" = '월간운세 — 원하는 달 상세운세', "card_copy" = '1월~12월 중 궁금한 달을 골라, 날짜별 흐름과 좋은 날' WHERE "id" = 'month_detail';--> statement-breakpoint
UPDATE "products" SET "visible" = true, "card_copy" = '성인 인증 후 · 두 사람의 친밀감과 표현의 결' WHERE "id" = 'adult_gunghap';
--> statement-breakpoint
UPDATE "products" SET "sort" = 23 WHERE "id" = 'adult_gunghap';
