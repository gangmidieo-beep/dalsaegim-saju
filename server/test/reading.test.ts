// 유료 풀이 — 장 구성, 계산된 사실(무료 요약과 같은 숫자), 프롬프트 규칙, 엔진 풀이, 품질 검사, AI 응답 처리, 결제→워커→조회
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { openDb } from '../src/db/index.ts';
import { buildApp } from '../src/app.ts';
import { calcSaju } from '@dalsaegim/engine';
import { moneyFlow, toRanges } from '@dalsaegim/content';
import { buildFacts, buildPrompt, chaptersFor, checkQuality, engineContent, generateReading, startReadingWorker } from '../src/services/reading/generate.ts';
import { friendReply, topicOf } from '../src/services/friend.ts';
import brand from '../../brand.config.json' with { type: 'json' };

const PAID = brand.products.filter((p: any) => p.kind === 'reading');
const ME = { name: '김서윤', gender: 'F' as const, year: 1996, month: 4, day: 2, calendar: 'solar' as const, hour: 9 };
const YOU = { name: '이준호', gender: 'M' as const, year: 1994, month: 11, day: 2, calendar: 'lunar' as const, hour: null };
const sj = (p: typeof ME | typeof YOU) => calcSaju({ ...p, hour: p.hour ?? null, timeUnknown: p.hour == null });
const NOW = new Date('2026-10-07T03:00:00Z');

describe('장 구성·사실·프롬프트', () => {
  it('유료 상품 모두 장 목록이 있다(투자운은 대표님 문구 그대로)', () => {
    for (const p of PAID) expect(chaptersFor(p.id).length).toBeGreaterThanOrEqual(5);
    expect(chaptersFor('money_invest')).toEqual(['올해 나의 투자 흐름', '달새김이 보는 올해의 시장 이야기', '시장과 나의 흐름이 만나는 시기', '이번 달, 조금 더 신중해야 할 때', '나에게 맞는 돈의 리듬']);
  });
  it('사실: 무료 요약과 같은 좋은 달·지수', () => {
    const f = buildFacts('money_wealth', [ME], [sj(ME)], null, null, NOW);
    const free = moneyFlow(sj(ME), 'wealth', 2026, 'r', { now: NOW });
    expect(f.lines.join()).toContain(`좋은 달 ${toRanges(free.good)}`);
    expect(f.lines.join()).toContain(`지수 ${free.score}`);
  });
  it('투자운: 시장 노트가 있으면 반영, 없으면 공식 정보 확인 안내', () => {
    const withNote = buildFacts('money_invest', [ME], [sj(ME)], null, { body: '금리 흐름을 지켜보는 해', flow: Array(12).fill(60) }, NOW);
    expect(withNote.paras.join()).toContain('금리 흐름을 지켜보는 해');
    const without = buildFacts('money_invest', [ME], [sj(ME)], null, null, NOW);
    expect(without.paras.join()).toContain('공식 자료');
  });
  it('궁합은 두 사람, 고민의 길은 질문, MBTI 는 유형', () => {
    expect(buildFacts('gunghap', [ME, YOU], [sj(ME), sj(YOU)], null, null, NOW).lines.join()).toContain('이준호');
    expect(buildFacts('path_deep', [ME], [sj(ME)], { cat: 'work', sub: 'move', q: '이직 시기' }, null, NOW).lines.join()).toContain('이직 시기');
    expect(buildFacts('mbti_deep', [ME], [sj(ME)], { mbti: 'ENFP' }, null, NOW).lines.join()).toContain('ENFP');
  });
  it('프롬프트: 달새김 말투·투자 금지 규칙·사실·장 순서', () => {
    const f = buildFacts('money_invest', [ME], [sj(ME)], null, null, NOW);
    const p = buildPrompt({ id: 'money_invest', title: '올해 나의 투자 흐름' }, [ME], f, chaptersFor('money_invest'), null, NOW);
    expect(p.system).toContain('해요체');
    expect(p.system).toContain('종목·매수·매도');
    expect(p.user).toContain('김서윤');
    expect(p.user).toContain('1. 올해 나의 투자 흐름');
  });
  it('엔진 풀이(AI 없이)도 이름·분량·금지어 검사를 통과', () => {
    for (const p of PAID) {
      const people = p.people === 2 ? [ME, YOU] : [ME];
      const f = buildFacts(p.id, people, people.map(sj), { cat: 'love', sub: 'crush', q: '고백 타이밍', mbti: 'ISTJ' }, null, NOW);
      const c = engineContent({ id: p.id, title: p.title }, people, f);
      expect(c.chapters).toHaveLength(chaptersFor(p.id).length);
      const issues = checkQuality(c, ['김서윤'], chaptersFor(p.id)).filter((x) => !x.includes('분량'));
      expect(issues, p.id).toEqual([]);
    }
  });
  it('품질 검사: 투자 권유·단정 표현을 잡는다', () => {
    const f = buildFacts('money_invest', [ME], [sj(ME)], null, null, NOW);
    const c = engineContent({ id: 'money_invest', title: '투자' }, [ME], f);
    const bad = { ...c, chapters: c.chapters.map((x, i) => (i === 0 ? { ...x, body: x.body + ' 이 종목은 지금 매수하세요.' } : x)) };
    expect(checkQuality(bad, ['김서윤'], chaptersFor('money_invest')).join()).toContain('금지 표현');
  });
  it('AI 응답(가짜) → 두 번에 나눠 호출, 장 합치기, 원가 계산', async () => {
    Object.assign(process.env, { READING_AI: 'live', ANTHROPIC_API_KEY: 'test', ANTHROPIC_MODEL: 'test-model' });
    let n = 0;
    const fake = (async (_u: string, init: any) => {
      n++;
      const body = JSON.parse(init.body);
      const line = body.messages[0].content.split('\n').find((l: string) => l.startsWith('장 목록'));
      const titles = [...line.matchAll(/\d+\. ([^/]+?)(?= \/|$)/g)].map((m: any) => m[1].trim());
      const ch = titles.map((t: string) => ({ title: t, say: '한 줄', body: '김서윤 님은 꽃과 덩굴처럼 부드럽지만 끝내 닿는 힘이 있어요. '.repeat(8), highlight: '부드럽지만 강해요' }));
      const json = { intro: n === 1 ? '김서윤 님, 반가워요.' : '', chapters: ch, closing: n === 2 ? { title: '달새김이 남기는 말', body: '김서윤 님의 시간이 빛나기를.', tips: ['아침 산책'] } : { title: '', body: '', tips: [] } };
      return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(json) }], usage: { input_tokens: 2000, output_tokens: 3000 } }));
    }) as unknown as typeof fetch;
    const g = await generateReading({ id: 'newyear_2027', title: '2027 신년운세' }, [ME], { http: fake, now: NOW });
    for (const k of ['READING_AI', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']) delete process.env[k];
    expect(n).toBe(2);
    expect(g.content.chapters).toHaveLength(9);
    expect(g.content.generatedBy).toBe('ai');
    expect(g.tokensIn).toBe(4000);
    expect(g.costKrw).toBeGreaterThan(0);
    expect(g.issues).toEqual([]);
  });
});

describe('AI 사주친구(키 없음 → 계산 답변)', () => {
  it('주제 분류', () => {
    expect(topicOf('이직할까 고민이에요').id).toBe('work');
    expect(topicOf('전세 계약이 걱정돼요').id).toBe('money');
    expect(topicOf('그냥요', 'love').id).toBe('love');
  });
  it('답변·기록 초안·비용 0', async () => {
    const r = await friendReply({ profile: { id: 'p1', name: '김서윤', gender: 'F', birthYear: 1996, birthMonth: 4, birthDay: 2, calendar: 'solar', leap: false, birthHour: 9 }, history: [], text: '남자친구와 계속 만나도 될까요', memories: [], now: NOW });
    expect(r.ai).toBe(false);
    expect(r.reply).toContain('김서윤 님');
    expect(r.draft.summary).toContain('연애·관계 고민');
    expect(r.costKrw).toBe(0);
  });
});

describe('결제 → 풀이 생성 → 결과 조회 (엔진 풀이)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>['app'];
  let db: any, close: () => Promise<void>;
  beforeAll(async () => { const o = await openDb({ dir: 'memory' }); db = o.db; close = o.close; ({ app } = await buildApp({ db })); }, 120_000);
  afterAll(async () => { await app.close(); await close(); });
  it('주문(mock) → 워커 → done, 내 이름으로 풀이, 원가는 숨김, 남의 주문은 못 봄', async () => {
    const t = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'rd-1' } })).json().token;
    const h = { authorization: `Bearer ${t}` };
    const prof = (await app.inject({ method: 'POST', url: '/profiles', headers: h, payload: { ...ME, isMain: true } })).json();
    const o = (await app.inject({ method: 'POST', url: '/orders', headers: h, payload: { productId: 'money_invest', profileId: prof.id } })).json();
    expect((await app.inject({ url: `/readings/${o.id}`, headers: h })).json().status).toBe('queued');
    const w = startReadingWorker(db, { warn: () => {} });
    await w.tick(); w.stop();
    const r = (await app.inject({ url: `/readings/${o.id}`, headers: h })).json();
    expect(r.status).toBe('done');
    expect(r.content.chapters[1].title).toBe('달새김이 보는 올해의 시장 이야기');
    expect(r.content.generatedBy).toBe('engine');
    expect(JSON.stringify(r.content)).toContain('김서윤');
    expect(r.costKrw).toBeUndefined();
    const other = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'rd-2' } })).json().token;
    expect((await app.inject({ url: `/readings/${o.id}`, headers: { authorization: `Bearer ${other}` } })).statusCode).toBe(404);
  });
});
