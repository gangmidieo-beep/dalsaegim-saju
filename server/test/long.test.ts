// 정통사주 A4 40장 생성기 — 가짜 AI 로 흐름 검사(실제 비용 0)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateLong, batchesOf, usageKrw } from '../src/services/reading/long.ts';
import { generateReading } from '../src/services/reading/generate.ts';
import { LONG_OUTLINE } from '@dalsaegim/content';

const person = { name: '김서윤', gender: 'F' as const, year: 1996, month: 4, day: 2, calendar: 'solar' as const, hour: 9 };
type Mode = { fail?: Set<number>; banned?: string; short?: string };
function fakeAI(mode: Mode = {}) {
  const calls: any[] = [];
  let n = 0;
  const http = (async (_url: string, init: any) => {
    const req = JSON.parse(init.body);
    calls.push(req);
    const k = n++;
    if (mode.fail?.has(k)) return new Response('{"error":"overloaded"}', { status: 529 });
    const ids = [...req.messages[0].content.matchAll(/- (L\d\d) 「([^」]+)」 본문 약 (\d+)자/g)].map((m) => ({ id: m[1], title: m[2], len: +m[3] }));
    const chapters = ids.map((c) => ({
      id: c.id, title: c.title, say: `${c.title} 요약`, highlight: '김서윤 님의 빛나는 한 문장이에요.',
      body: c.id === mode.banned && !req.messages[0].content.includes('금지 표현이 있었다') ? '이 달에는 반드시 성공해요. ' + '가'.repeat(c.len)
        : c.id === mode.short && !req.messages[0].content.includes('짧았다') ? '김서윤 님, 짧아요.'
          : `김서윤 님, ${c.title} 이야기예요. ` + '사주의 흐름을 차분히 살펴보면 좋아요. '.repeat(Math.ceil(c.len / 22)),
    }));
    const text = JSON.stringify({ chapters, ...(req.system[0].text.includes('"intro"') ? { intro: '김서윤 님, 반가워요. 지금부터 긴 감정서를 함께 읽어요.' } : {}) });
    return new Response(JSON.stringify({ content: [{ type: 'text', text }], usage: { input_tokens: 800, output_tokens: 4000, cache_creation_input_tokens: k === 0 ? 5000 : 0, cache_read_input_tokens: k === 0 ? 0 : 5000 } }), { status: 200 });
  }) as unknown as typeof fetch;
  return { http, calls };
}

beforeAll(() => { process.env.ANTHROPIC_API_KEY = 'test'; process.env.ANTHROPIC_MODEL = 'claude-sonnet-5-5'; });
afterAll(() => { for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'READING_AI']) delete process.env[k]; });

describe('정통사주 장편(40장)', () => {
  it('목차 26장 · 약 5만 자 · 묶음은 4,600자 이하', () => {
    expect(LONG_OUTLINE.length).toBe(26);
    const total = LONG_OUTLINE.reduce((a, c) => a + c.len, 0);
    expect(total).toBeGreaterThan(48000);
    for (const b of batchesOf(LONG_OUTLINE)) expect(b.reduce((a, c) => a + c.len, 0) <= 4600 || b.length === 1).toBe(true);
  });
  it('26장을 모두 쓰고, 계산 자료는 캐시로 한 번만 보내고, 진행률을 알린다', async () => {
    const { http, calls } = fakeAI();
    const prog: number[] = [];
    const g = await generateLong({ id: 'lifetime', title: '나의 사주지도 전체 풀이' }, [person], { http, now: new Date('2026-10-23T03:00:00Z'), onProgress: (d) => { prog.push(d); } });
    expect(g.content.chapters).toHaveLength(26);
    expect(g.content.chapters.map((c) => c.title)).toEqual(LONG_OUTLINE.map((c) => c.title));
    expect(g.content.intro).toContain('반가워요');
    expect(g.issues).toEqual([]);
    expect(g.totalChars).toBeGreaterThan(40000);
    expect(calls[0].system[1].cache_control).toEqual({ type: 'ephemeral' });
    expect(calls[0].system[1].text).toContain('[계산 자료]');
    expect(calls[0].system[1].text).toContain('[seun]');
    expect(calls.length).toBe(batchesOf(LONG_OUTLINE).length);
    expect(prog.at(-1)).toBe(26);
    expect(g.costKrw).toBeGreaterThan(0);
    expect((g.content as any).parts).toHaveLength(4);
    expect(g.content.visual?.daeun?.length).toBeGreaterThan(5);
  });
  it('금지 표현·짧은 장은 다시 쓰고, 끝까지 실패한 묶음은 계산 초안으로 채운다', async () => {
    const { http } = fakeAI({ banned: 'L14', short: 'L02', fail: new Set([2, 3, 4]) });
    const g = await generateLong({ id: 'lifetime', title: '정통' }, [person], { http, now: new Date('2026-10-23T03:00:00Z') });
    expect(g.content.chapters).toHaveLength(26);
    const all = g.content.chapters.map((c) => c.body).join('\n');
    expect(all).not.toMatch(/반드시/);
    expect(g.content.chapters[1].body.length).toBeGreaterThan(1000);
    for (const c of g.content.chapters) expect(c.body.length).toBeGreaterThan(30);
  });
  it('AI 가 켜져 있으면 generateReading 이 장편으로, 꺼져 있으면 9장 계산 풀이로', async () => {
    const { http } = fakeAI();
    process.env.READING_AI = 'live';
    const on = await generateReading({ id: 'lifetime', title: '정통' }, [person], { http, now: new Date('2026-10-23T03:00:00Z') });
    expect(on.content.chapters).toHaveLength(26);
    expect(on.content.summary).toBeTruthy();
    expect(on.costKrw).toBeGreaterThan(0);
    delete process.env.READING_AI;
    const off = await generateReading({ id: 'lifetime', title: '정통' }, [person], { now: new Date('2026-10-23T03:00:00Z') });
    expect(off.content.chapters).toHaveLength(9);
  });
  it('비용 계산 — 캐시 읽기는 10%, 쓰기는 125%', () => {
    expect(usageKrw({ in: 0, out: 1_000_000, cacheWrite: 0, cacheRead: 0, calls: 1 })).toBe(14500);
    expect(usageKrw({ in: 0, out: 0, cacheWrite: 0, cacheRead: 1_000_000, calls: 1 })).toBe(290);
  });
});
