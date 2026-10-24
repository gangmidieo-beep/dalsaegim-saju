// AI 호출 한 곳 — Claude(Anthropic) 또는 GPT(OpenAI) 중 키가 있는 쪽으로 보낸다(10/24: 인수 대표님은 GPT 사용).
// · OPENAI_API_KEY 만 있으면 GPT, ANTHROPIC_API_KEY 만 있으면 Claude. 둘 다 있으면 AI_PROVIDER=openai|anthropic 로 고른다(기본 Claude).
// · 모델은 AI_MODEL(유료 풀이) · FRIEND_MODEL(이용권 상담) · FRIEND_MODEL_FREE(무료 상담) · READING_LONG_MODEL(정통사주 40장).
//   비우면 업체별 권장 모델. 다른 업체 모델 이름이 들어 있으면(예: GPT 인데 claude-…) 무시하고 권장 모델을 쓴다.
// · 비용(원)은 모델별 공식 요금으로 계산해 관리자 화면 원가에 쓴다. AI_PRICE_IN_PER_M·AI_PRICE_OUT_PER_M 로 덮어쓸 수 있다.
export type AiProvider = 'anthropic' | 'openai';
export type AiKind = 'reading' | 'long' | 'friend' | 'friendFree';
export type AiUsage = { in: number; out: number; cacheWrite: number; cacheRead: number };
export type SystemPart = { text: string; cache?: boolean };

export function aiProvider(): AiProvider | null {
  const a = !!process.env.ANTHROPIC_API_KEY, o = !!process.env.OPENAI_API_KEY;
  const want = process.env.AI_PROVIDER;
  if (want === 'openai' && o) return 'openai';
  if (want === 'anthropic' && a) return 'anthropic';
  return a ? 'anthropic' : o ? 'openai' : null;
}
const DEFAULTS: Record<AiProvider, Record<AiKind, string>> = {
  anthropic: { reading: 'claude-sonnet-5-5', long: 'claude-sonnet-5-5', friend: 'claude-sonnet-5-5', friendFree: 'claude-haiku-5-5' },
  openai: { reading: 'gpt-6.1-sol', long: 'gpt-6.1-sol', friend: 'gpt-6.1-sol', friendFree: 'gpt-6-luna' },
};
const fits = (p: AiProvider, m?: string) => !!m && (p === 'anthropic' ? /^claude/i.test(m) : !/^claude/i.test(m));
export function aiModel(kind: AiKind, p = aiProvider()): string {
  if (!p) return '';
  const env = process.env;
  const base = [env.AI_MODEL, p === 'anthropic' ? env.ANTHROPIC_MODEL : env.OPENAI_MODEL].find((m) => fits(p, m));
  const pick = (...xs: (string | undefined)[]) => xs.find((m) => fits(p, m));
  if (kind === 'long') return pick(env.READING_LONG_MODEL, base) ?? DEFAULTS[p].long;
  if (kind === 'friend') return pick(env.FRIEND_MODEL, base) ?? DEFAULTS[p].friend;
  if (kind === 'friendFree') return pick(env.FRIEND_MODEL_FREE) ?? DEFAULTS[p].friendFree;
  return base ?? DEFAULTS[p].reading;
}

// 공식 요금(1백만 토큰당 달러: 입력·캐시 읽기·출력) — 2026-10 확인. Claude 캐시 쓰기는 입력의 1.25배.
const PRICE: [RegExp, number, number, number][] = [
  [/claude-haiku/i, 0.1, 0.01, 0.5], [/claude-sonnet/i, 2, 0.2, 10], [/claude-opus/i, 5, 0.5, 25],
  [/gpt-6-luna/i, 0.1, 0.01, 0.5], [/gpt-6\.1-sol|gpt-.*-sol/i, 2, 0.1, 10], [/gpt-6-astra/i, 10, 1, 50],
];
const KRW_PER_USD = 1450;
export function aiCostKrw(model: string, u: AiUsage) {
  const row = PRICE.find(([re]) => re.test(model));
  const inp = +(process.env.AI_PRICE_IN_PER_M ?? row?.[1] ?? 2), out = +(process.env.AI_PRICE_OUT_PER_M ?? row?.[3] ?? 10);
  const cached = row?.[2] ?? inp * 0.1;
  return Math.round(((u.in * inp + u.cacheWrite * inp * 1.25 + u.cacheRead * cached + u.out * out) / 1e6) * KRW_PER_USD);
}

/** 대화 한 번 — system 은 앞쪽(바뀌지 않는 부분)부터. json=true 면 JSON 한 개만 받는다. */
// 하루 AI 사용 한도(원). 테스트 기간처럼 결제가 가짜(MOCK)일 때 누구나 유료 풀이를 만들 수 있으므로 상한을 둔다.
// 한도를 넘으면 AI 를 부르지 않고 오류 → 풀이는 계산 초안으로, 상담은 짧은 기본 답변으로 대신한다. 비우면 한도 없음.
const spent = { day: '', krw: 0 };
const kstDay = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
export function aiSpentToday() { if (spent.day !== kstDay()) { spent.day = kstDay(); spent.krw = 0; } return spent.krw; }
export const aiDailyCap = () => { const v = Number(process.env.AI_DAILY_CAP_KRW); return Number.isFinite(v) && v > 0 ? v : null; };
export const aiCapReached = () => { const c = aiDailyCap(); return c != null && aiSpentToday() >= c; };
/** 실패 응답에서 업체 오류 코드(insufficient_quota·rate_limit_exceeded·overloaded_error 등)를 꺼내 메시지에 붙인다 */
async function failOf(r: Response) {
  let code = '';
  try { const j = (await r.json()) as any; code = j?.error?.code || j?.error?.type || ''; } catch { /* 본문 없음 */ }
  const wait = Number(r.headers.get('retry-after')) || 0;
  return Object.assign(new Error(`AI 호출 실패 ${r.status}${code ? ` ${code}` : ''}`), { status: r.status, code, wait });
}
/** 잠깐 막힌 것(분당 한도·과부하)만 기다렸다 다시. 잔액 부족(insufficient_quota)·키 오류는 바로 실패 */
async function withRetry(go: () => Promise<Response>): Promise<Response> {
  for (let i = 0; ; i++) {
    const r = await go();
    if (r.ok) return r;
    const e = await failOf(r);
    const temporary = (r.status === 429 && e.code !== 'insufficient_quota') || r.status === 529 || r.status === 503 || r.status === 500;
    if (!temporary || i >= 3) throw e;
    await new Promise((s) => setTimeout(s, Math.min(30_000, (e.wait || 2 ** i * 4) * 1000 + Math.random() * 1000)));
  }
}
export async function aiCall(o: {
  system: string | SystemPart[]; messages: { role: 'user' | 'assistant'; content: string }[]; kind: AiKind; http?: typeof fetch;
  maxTokens?: number; json?: boolean; cacheKey?: string; timeoutMs?: number; model?: string;
}): Promise<{ text: string; usage: AiUsage; model: string; costKrw: number }> {
  const p = aiProvider();
  if (!p) throw new Error('AI 키가 없어요');
  const cap = aiDailyCap();
  if (cap != null && aiCapReached()) throw Object.assign(new Error(`오늘 AI 사용 한도(${cap}원)에 닿았어요`), { status: 429 });
  const http = o.http ?? fetch;
  const model = o.model && fits(p, o.model) ? o.model : aiModel(o.kind, p);
  const parts: SystemPart[] = typeof o.system === 'string' ? [{ text: o.system }] : o.system;
  const signal = AbortSignal.timeout(o.timeoutMs ?? 240_000);
  let text = '', u: AiUsage = { in: 0, out: 0, cacheWrite: 0, cacheRead: 0 };
  if (p === 'anthropic') {
    const r = await withRetry(() => http(process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages', {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: o.maxTokens ?? 8000, system: parts.map((s) => ({ type: 'text', text: s.text, ...(s.cache ? { cache_control: { type: 'ephemeral' } } : {}) })), messages: o.messages }),
    }));
    const j = (await r.json()) as any;
    text = (j.content ?? []).map((c: any) => c.text ?? '').join('');
    u = { in: j.usage?.input_tokens ?? 0, out: j.usage?.output_tokens ?? 0, cacheWrite: j.usage?.cache_creation_input_tokens ?? 0, cacheRead: j.usage?.cache_read_input_tokens ?? 0 };
  } else {
    // GPT — Chat Completions. 추론 토큰도 출력 한도(max_completion_tokens)에 포함되므로 넉넉히 잡는다.
    // 같은 앞부분(system)은 OpenAI 가 자동으로 캐시한다(prompt_cache_key 로 같은 풀이끼리 묶음).
    const effort = process.env.AI_REASONING || 'low';
    const r = await withRetry(() => http(process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model, reasoning_effort: effort, max_completion_tokens: Math.round((o.maxTokens ?? 8000) * 1.6),
        messages: [{ role: 'developer', content: parts.map((s) => s.text).join('\n\n') }, ...o.messages],
        ...(o.json ? { response_format: { type: 'json_object' } } : {}),
        ...(o.cacheKey ? { prompt_cache_key: o.cacheKey } : {}),
      }),
    }));
    const j = (await r.json()) as any;
    text = j.choices?.[0]?.message?.content ?? '';
    const cached = j.usage?.prompt_tokens_details?.cached_tokens ?? 0;
    u = { in: (j.usage?.prompt_tokens ?? 0) - cached, out: j.usage?.completion_tokens ?? 0, cacheWrite: 0, cacheRead: cached };
    if (j.choices?.[0]?.finish_reason === 'length' && !text) throw new Error('AI 응답이 길이 제한에 걸렸어요');
  }
  const costKrw = aiCostKrw(model, u);
  aiSpentToday(); spent.krw += costKrw;
  return { text, usage: u, model, costKrw };
}
