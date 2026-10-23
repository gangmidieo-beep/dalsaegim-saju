// 정통사주(사주지도 전체 풀이) 10/23 보충 — 장 제목과 내용이 맞고, 분량이 충분하고, 금지 표현이 없어야 한다.
import { describe, it, expect } from 'vitest';
import { generateReading, checkQuality, chaptersFor } from '../src/services/reading/generate.ts';

const people = [
  { name: '김서윤', gender: 'F' as const, year: 1996, month: 4, day: 2, calendar: 'solar' as const, hour: 9 },
  { name: '박준', gender: 'M' as const, year: 1985, month: 11, day: 20, calendar: 'lunar' as const, hour: null },
  { name: '이하늘', gender: 'F' as const, year: 2001, month: 7, day: 15, calendar: 'solar' as const, hour: 23 },
];
describe('정통사주 리포트', () => {
  for (const p of people) it(`${p.name} — 9장, 장마다 제목에 맞는 내용·충분한 분량`, async () => {
    const r = await generateReading({ id: 'lifetime', title: '나의 사주지도 전체 풀이' }, [p], { now: new Date('2026-10-23T03:00:00Z') });
    const c = r.content;
    expect(c.chapters.map((x) => x.title)).toEqual(chaptersFor('lifetime'));
    expect(checkQuality(c, [p.name], chaptersFor('lifetime'))).toEqual([]);
    const lens = c.chapters.map((x) => x.body.replace(/\s/g, '').length);
    for (const n of lens) expect(n).toBeGreaterThan(300);
    expect(lens.reduce((a, b) => a + b, 0)).toBeGreaterThan(4000);
    expect(new Set(c.chapters.map((x) => x.body)).size).toBe(9); // 같은 내용 반복 없음
    const must = ['일간', '오행', '배우자', '재물', '월주', '연주', '대운', '10년', '한 문장'];
    c.chapters.forEach((x, i) => expect(x.body).toContain(must[i]));
    expect(c.visual?.daeun?.length).toBeGreaterThan(5);
    expect(c.visual?.elements?.length).toBe(5);
    expect(c.visual?.years?.length).toBe(10);
    expect(JSON.stringify(c.chapters)).not.toMatch(/undefined|NaN|\bnull\b|[가-힣]라',|공간가/);
  });
});
