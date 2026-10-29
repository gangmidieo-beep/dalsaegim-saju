import { describe, it, expect } from 'vitest';
import { fixJosa } from '../src/josa';
describe('따옴표 뒤 조사', () => {
  it('받침에 맞춘다', () => {
    expect(fixJosa("'꿈꾸는 중재자'이에요")).toBe("'꿈꾸는 중재자'예요");
    expect(fixJosa("이달의 키워드는 '경쟁'예요.")).toBe("이달의 키워드는 '경쟁'이에요.");
    expect(fixJosa("'기회'이 열쇠")).toBe("'기회'가 열쇠");
    expect(fixJosa("'수(물)'이에요")).toBe("'수(물)'예요");
    expect(fixJosa("'목(나무)'이에요")).toBe("'목(나무)'이에요");
    expect(fixJosa("'길'으로 가요")).toBe("'길'로 가요");
    expect(fixJosa("'산'로 가요")).toBe("'산'으로 가요");
    expect(fixJosa("'INFP'이에요")).toBe("'INFP'이에요");
    expect(fixJosa("'경쟁'이번 달")).toBe("'경쟁'이번 달");
    expect(fixJosa("'프리미엄 재물사주'을 정리했어요")).toBe("'프리미엄 재물사주'를 정리했어요");
  });
});
