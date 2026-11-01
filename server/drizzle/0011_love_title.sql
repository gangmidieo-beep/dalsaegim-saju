-- 11/1 대표님 변경안: '연애·관계의 흐름'(이전에 바꾼 이름) → '연애운'
UPDATE "products" SET "title" = '연애운', "updated_at" = now() WHERE "id" = 'love_flow' AND "title" = '연애·관계의 흐름';
