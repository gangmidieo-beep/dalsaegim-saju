-- 11/1 대표님 상품명 짧게(추천 상품명 변경안) — 관리자가 이미 바꾼 이름은 그대로
UPDATE "products" SET "title" = '프리미엄 재물운', "updated_at" = now() WHERE "id" = 'money_wealth' AND "title" = '프리미엄 재물사주';
--> statement-breakpoint
UPDATE "products" SET "title" = '사업운', "updated_at" = now() WHERE "id" = 'money_business' AND "title" = '올해의 사업 흐름';
--> statement-breakpoint
UPDATE "products" SET "title" = '투자운', "updated_at" = now() WHERE "id" = 'money_invest' AND "title" = '올해 나의 투자 흐름';
--> statement-breakpoint
UPDATE "products" SET "title" = '부동산운', "updated_at" = now() WHERE "id" = 'money_estate' AND "title" = '올해의 집과 자리 흐름';
--> statement-breakpoint
UPDATE "products" SET "title" = '재물운 4종 패키지', "updated_at" = now() WHERE "id" = 'money_pack' AND "title" = '돈의 흐름 4종 한 번에';
--> statement-breakpoint
UPDATE "products" SET "title" = '연애운', "updated_at" = now() WHERE "id" = 'love_flow' AND "title" = '올해 나의 연애운';
--> statement-breakpoint
UPDATE "products" SET "title" = '궁합', "updated_at" = now() WHERE "id" = 'gunghap' AND "title" = '두 사람의 궁합';
--> statement-breakpoint
UPDATE "products" SET "title" = '재회운', "updated_at" = now() WHERE "id" = 'reunion' AND "title" = '재회운 — 다시 닿을 수 있을까';
--> statement-breakpoint
UPDATE "products" SET "title" = '결혼운', "updated_at" = now() WHERE "id" = 'marriage' AND "title" = '결혼운 — 나의 배우자와 결혼 시기';
--> statement-breakpoint
UPDATE "products" SET "title" = '썸 타로', "updated_at" = now() WHERE "id" = 'tarot_some' AND "title" = '썸 타로 — 그 사람의 마음';
--> statement-breakpoint
UPDATE "products" SET "title" = '종합사주·사주지도', "updated_at" = now() WHERE "id" = 'lifetime' AND "title" = '나의 사주지도 전체 풀이';
--> statement-breakpoint
UPDATE "products" SET "title" = '월간운세', "updated_at" = now() WHERE "id" = 'month_detail' AND "title" = '월간운세 — 원하는 달 상세운세';
--> statement-breakpoint
UPDATE "products" SET "title" = '직업운', "updated_at" = now() WHERE "id" = 'career' AND "title" = '직업운 — 나에게 맞는 일과 이직 시기';
--> statement-breakpoint
UPDATE "products" SET "title" = '고민 심층분석', "updated_at" = now() WHERE "id" = 'path_deep' AND "title" = '고민의 길 심층분석';
--> statement-breakpoint
UPDATE "products" SET "title" = '사주 × MBTI', "updated_at" = now() WHERE "id" = 'mbti_deep' AND "title" = '사주 × MBTI 심층';
--> statement-breakpoint
UPDATE "products" SET "title" = '달빛 상담 이용권', "updated_at" = now() WHERE "id" = 'friend_pass' AND "title" = '달빛 상담 이용권 · 질문 10회';
--> statement-breakpoint
UPDATE "products" SET "title" = '속궁합', "updated_at" = now() WHERE "id" = 'adult_gunghap' AND "title" = '두 사람의 속궁합';
