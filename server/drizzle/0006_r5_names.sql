-- R5(10/21) 대표님 수정지시서 — 상품 이름·배지 정리(가짜 순위 배지 없음, 카드당 배지 1개), 서월 개명
UPDATE "products" SET "title" = '달빛 상담사 서월 이용권 · 질문 10회', "card_copy" = '상담사 6명 누구에게나 질문 10회 · 90일 동안 사용' WHERE "id" = 'friend_pass';--> statement-breakpoint
UPDATE "products" SET "title" = '프리미엄 재물사주', "badge" = 'PREMIUM', "card_copy" = '돈의 흐름을 깊게 읽는 나만의 기록 — 들어오는 길·새는 길·모으는 리듬' WHERE "id" = 'money_wealth';--> statement-breakpoint
UPDATE "products" SET "badge" = '묶음 할인', "card_copy" = '재물·사업·투자·부동산 4가지 풀이를 한 번에 — 각각 따로 열어 봐요' WHERE "id" = 'money_pack';--> statement-breakpoint
UPDATE "products" SET "badge" = '시즌 추천' WHERE "id" = 'newyear_2027';--> statement-breakpoint
UPDATE "products" SET "badge" = '대표' WHERE "id" = 'love_flow';--> statement-breakpoint
UPDATE "products" SET "badge" = NULL WHERE "id" = 'gunghap';
