// GPT(OpenAI) 키로도 풀이·상담·정통사주 40장이 돌아가는지(10/24 — 인수 대표님은 GPT 사용). 가짜 OpenAI 응답, 비용 0.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { aiProvider, aiModel, aiCall, aiCostKrw } from '../src/services/ai.ts';
import { generateLong } from '../src/services/reading/long.ts';
import { generateReading, liveAI } from '../src/services/reading/generate.ts';
import { friendLive } from '../src/services/friend.ts';

const KEYS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'AI_PROVIDER', 'AI_MODEL', 'FRIEND_MODEL', 'FRIEND_MODEL_FREE', 'READING_AI', 'FRIEND_AI', 'READING_LONG_MODEL', 'AI_DAILY_CAP_KRW'];
const saved: Record<string, string | undefined> = {};
beforeEach(() => { for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; } });
afterEach(() => { for (const k of KEYS) { if (saved[k] == null) delete process.env[k]; else process.env[k] = saved[k]; } });

function fakeGPT() {
  const calls: any[] = [];
  const http = (async (url: string, init: any) => {
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers.authorization).toBe('Bearer sk-test');
    const req = JSON.parse(init.body); calls.push(req);
    const msg = req.messages.at(-1).content as string;
    const ids = [...msg.matchAll(/- (L\d\d) 「([^」]+)」 본문 약 (\d+)자/g)].map((m) => ({ id: m[1], title: m[2], len: +m[3] }));
    const text = ids.length
      ? JSON.stringify({ chapters: ids.map((c) => ({ id: c.id, title: c.title, say: '요약', body: '김서윤 님, ' + '흐름을 차분히 살펴보면 좋아요. '.repeat(Math.ceil(c.len / 17)), highlight: '한 문장' })) })
      : JSON.stringify({ reply: '그 말이 듣고 싶었군요! 고생했어요.', memory: { category: 'growth', title: '위로', summary: '위로를 나눔' } });
    return new Response(JSON.stringify({ choices: [{ message: { content: text }, finish_reason: 'stop' }], usage: { prompt_tokens: 6000, completion_tokens: 3000, prompt_tokens_details: { cached_tokens: 5000 }, completion_tokens_details: { reasoning_tokens: 200 } } }));
  }) as unknown as typeof fetch;
  return { http, calls };
}
const person = { name: '김서윤', gender: 'F' as const, year: 1996, month: 4, day: 2, calendar: 'solar' as const, hour: 9 };

describe('AI 업체 고르기', () => {
  it('OpenAI 키만 있으면 GPT, 둘 다 있으면 AI_PROVIDER, 다른 업체 모델 이름은 무시', () => {
    expect(aiProvider()).toBeNull();
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(aiProvider()).toBe('openai');
    expect(aiModel('reading')).toBe('gpt-6.1-sol');
    expect(aiModel('friendFree')).toBe('gpt-6-luna');
    process.env.FRIEND_MODEL_FREE = 'claude-haiku-5-5'; // 예전 Claude 값이 남아 있어도
    expect(aiModel('friendFree')).toBe('gpt-6-luna');
    process.env.AI_MODEL = 'gpt-6-astra';
    expect(aiModel('long')).toBe('gpt-6-astra');
    process.env.ANTHROPIC_API_KEY = 'a';
    expect(aiProvider()).toBe('anthropic');
    process.env.AI_PROVIDER = 'openai';
    expect(aiProvider()).toBe('openai');
  });
  it('요금 — gpt-6.1-sol 입력 $2·캐시 $0.10·출력 $10', () => {
    expect(aiCostKrw('gpt-6.1-sol', { in: 1_000_000, out: 0, cacheRead: 0, cacheWrite: 0 })).toBe(2900);
    expect(aiCostKrw('gpt-6.1-sol', { in: 0, out: 0, cacheRead: 1_000_000, cacheWrite: 0 })).toBe(145);
    expect(aiCostKrw('gpt-6-luna', { in: 0, out: 1_000_000, cacheRead: 0, cacheWrite: 0 })).toBe(725);
  });
});

describe('GPT 로 호출', () => {
  it('요청 모양: developer 지시·JSON 모드·추론 낮음·캐시 키, 사용량은 캐시 따로', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const { http, calls } = fakeGPT();
    const c = await aiCall({ system: [{ text: '규칙 JSON' }, { text: '계산 자료', cache: true }], messages: [{ role: 'user', content: '안녕' }], kind: 'reading', http, json: true, cacheKey: 'k1' });
    expect(calls[0]).toMatchObject({ model: 'gpt-6.1-sol', reasoning_effort: 'low', response_format: { type: 'json_object' }, prompt_cache_key: 'k1' });
    expect(calls[0].messages[0]).toEqual({ role: 'developer', content: '규칙 JSON\n\n계산 자료' });
    expect(calls[0].max_completion_tokens).toBeGreaterThan(8000);
    expect(c.usage).toEqual({ in: 1000, out: 3000, cacheRead: 5000, cacheWrite: 0 });
    expect(c.costKrw).toBe(Math.round((1000 * 2 + 5000 * 0.1 + 3000 * 10) / 1e6 * 1450));
  });
  it('정통사주 40장·상담이 GPT 로 켜진다', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'; process.env.READING_AI = 'live';
    expect(liveAI()).toBe(true); expect(friendLive()).toBe(true);
    process.env.FRIEND_AI = 'off';
    expect(friendLive()).toBe(false);
    const { http, calls } = fakeGPT();
    const g = await generateLong({ id: 'lifetime', title: '정통' }, [person], { http, now: new Date('2026-10-23T03:00:00Z') });
    expect(g.content.chapters).toHaveLength(26);
    expect(g.issues).toEqual([]);
    expect(new Set(calls.map((x) => x.prompt_cache_key)).size).toBe(1);
    expect(g.costKrw).toBeGreaterThan(0);
    const r = await generateReading({ id: 'love_flow', title: '연애' }, [person], { http, now: new Date('2026-10-23T03:00:00Z') });
    expect(r.content.generatedBy).toBe('ai');
  });
});

describe('하루 AI 한도(AI_DAILY_CAP_KRW)', () => {
  it('한도에 닿으면 AI 를 더 부르지 않고 계산 풀이·기본 답변으로', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'; process.env.READING_AI = 'live';
    const { aiSpentToday, aiCapReached } = await import('../src/services/ai.ts');
    process.env.AI_DAILY_CAP_KRW = String(aiSpentToday() + 1);
    expect(aiCapReached()).toBe(false);
    const { http, calls } = fakeGPT();
    await aiCall({ system: 'x', messages: [{ role: 'user', content: '안녕' }], kind: 'reading', http, json: true });
    expect(aiCapReached()).toBe(true);
    expect(liveAI()).toBe(false); expect(friendLive()).toBe(false);
    await expect(aiCall({ system: 'x', messages: [{ role: 'user', content: '안녕' }], kind: 'reading', http })).rejects.toThrow(/한도/);
    expect(calls).toHaveLength(1);
    const r = await generateReading({ id: 'love_flow', title: '연애' }, [person], { http, now: new Date('2026-10-23T03:00:00Z') });
    expect(r.content.generatedBy).not.toBe('ai');
    delete process.env.AI_DAILY_CAP_KRW;
    expect(liveAI()).toBe(true);
  });
});

describe('AI 실패 처리', () => {
  it('잔액 부족(insufficient_quota)은 다시 부르지 않고 코드와 함께 실패, 정통사주는 9장 계산 풀이로', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'; process.env.READING_AI = 'live';
    let n = 0;
    const http = (async () => { n++; return new Response(JSON.stringify({ error: { code: 'insufficient_quota', type: 'insufficient_quota' } }), { status: 429 }); }) as unknown as typeof fetch;
    await expect(aiCall({ system: 'x', messages: [{ role: 'user', content: '안녕' }], kind: 'reading', http })).rejects.toThrow('AI 호출 실패 429 insufficient_quota');
    expect(n).toBe(1);
    const g = await generateReading({ id: 'lifetime', title: '정통' }, [person], { http, now: new Date('2026-10-23T03:00:00Z') });
    expect(g.content.chapters).toHaveLength(9);
    expect(g.issues[0]).toMatch(/AI 장편 실패.*9장.*insufficient_quota/);
  });
  it('분당 한도(rate_limit)는 기다렸다 다시', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    let n = 0;
    const http = (async () => (++n < 2
      ? new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded' } }), { status: 429, headers: { 'retry-after': '0' } })
      : new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":1}' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } })))) as unknown as typeof fetch;
    const c = await aiCall({ system: 'x', messages: [{ role: 'user', content: '안녕' }], kind: 'reading', http });
    expect(c.text).toBe('{"ok":1}'); expect(n).toBe(2);
  }, 20_000);
});
