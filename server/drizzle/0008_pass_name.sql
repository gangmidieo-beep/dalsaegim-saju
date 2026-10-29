-- 10/28 검수 17 — 상담사 6명 공통 이용권이라 '서월 이용권' 대신 '달빛 상담 이용권'(관리자가 이미 바꾼 이름은 그대로)
UPDATE "products" SET "title" = '달빛 상담 이용권 · 질문 10회' WHERE "id" = 'friend_pass' AND "title" = '달빛 상담사 서월 이용권 · 질문 10회';
