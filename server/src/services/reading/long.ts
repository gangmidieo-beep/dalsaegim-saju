// 정통사주 A4 40장(10/23) — 26장을 AI 가 나눠 쓰는 장편 생성기.
// · 계산 자료(lifetimeDeep)는 system 에 한 번 넣고 프롬프트 캐시로 재사용 → 입력 비용 절감
// · 장 묶음(약 4,500자)마다 한 번 호출, 동시에 READING_CONCURRENCY(기본 4)개
// · 실패(429·5xx·JSON 깨짐)는 최대 3번 재시도, 그래도 안 되면 그 장만 계산 초안으로 채운다(풀이가 비지 않게)
// · 목표의 60% 미만으로 짧은 장, 금지 표현이 들어간 장은 한 번 다시 쓴다
// · 묶음이 끝날 때마다 onProgress 로 진행률(N/26장)을 저장한다
import { lifetimeDeep, type LongChapter, type LifetimeDeep } from '@dalsaegim/content';
import { calcSaju } from '@dalsaegim/engine';
import type { Chapter, Closing, Person, ReadingContent } from './generate.ts';

const BANNED = [/사망|죽(는|을|음)/, /이혼(하게|할 수밖에|이 확정)/, /파산/, /(암|중병)에 걸/, /(매수|매도)(하세요|하라|하시)/, /(사세요|파세요)/, /수익(을|이)? ?보장/, /종목/, /반드시|무조건|100%/];
const KRW_PER_USD = 1450;
const price = () => ({ inp: +(process.env.AI_PRICE_IN_PER_M ?? 2), out: +(process.env.AI_PRICE_OUT_PER_M ?? 10) });
export type Usage = { in: number; out: number; cacheWrite: number; cacheRead: number; calls: number };
export const usageKrw = (u: Usage) => Math.round(((u.in * price().inp + u.cacheWrite * price().inp * 1.25 + u.cacheRead * price().inp * 0.1 + u.out * price().out) / 1e6) * KRW_PER_USD);
export const longOn = () => process.env.READING_LONG !== 'off';
const scale = () => Math.max(0.3, Math.min(1.5, +(process.env.READING_LEN_SCALE ?? 0.82)));

const RULES = `당신은 사주 서비스 "달새김사주"의 정통사주 감정서 작가 "달새김"이다. A4 40장 분량의 개인 감정서를 장별로 나눠 쓰는 중이다.
문체: 다정하고 세련된 해요체(~해요, ~예요). 독자는 사주를 잘 모르는 20~40대가 중심이라 한자 용어는 처음 나올 때 쉬운 말로 풀어 준다. 문단은 3~5문장, 문단 사이 빈 줄(\\n\\n).
정확성: 아래 [계산 자료]의 간지·십성·운성·오행·지수·연도·달만 쓴다. 새 숫자·새 간지·새 연도를 지어내지 않는다. 자료에 없는 내용은 일반론으로 쓰되 단정하지 않는다.
깊이: 장마다 '근거(어느 기둥·어떤 기운 때문인지) → 해석 → 실제 생활 예시 → 실천 조언' 순서로 "내 얘기 같다"는 느낌을 준다. 다른 장과 같은 문장·같은 예시를 반복하지 않는다(장마다 주어진 범위만).
금지: 죽음·이혼 확정·파산·큰 병 단정, 의료 진단·처방, "반드시·무조건·100%", 투자 종목·매수·매도 권유, 수익 보장, 공포 조장. 다른 운세 서비스·책 문장을 흉내 내지 않는다.
이름은 "OOO 님"으로 부른다. 희망적으로 마무리하되 과장하지 않는다.
출력은 JSON 하나만: {"chapters":[{"id":"L01","title":"(주어진 제목 그대로)","say":"한 줄 요약(40자 안팎)","body":"본문","highlight":"공유용 한 문장"}]${'${INTRO}'}}`;

type Draft = { id: string; title: string; say: string; body: string; highlight: string };
const len = (s: string) => s.replace(/\s/g, '').length;
const bodyLenTarget = (c: LongChapter) => Math.round(c.len * scale());

async function call(system: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[], user: string, http: typeof fetch, u: Usage, maxTokens = 8000) {
  const r = await http(process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.READING_LONG_MODEL || process.env.ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!r.ok) { const e = new Error(`AI 호출 실패 ${r.status}`) as Error & { status?: number }; e.status = r.status; throw e; }
  const j = (await r.json()) as any;
  u.calls++; u.in += j.usage?.input_tokens ?? 0; u.out += j.usage?.output_tokens ?? 0;
  u.cacheWrite += j.usage?.cache_creation_input_tokens ?? 0; u.cacheRead += j.usage?.cache_read_input_tokens ?? 0;
  const text = (j.content ?? []).map((c: any) => c.text ?? '').join('');
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) { if (i >= tries - 1) throw e; await sleep((process.env.NODE_ENV === 'test' ? 5 : 2500) * (i + 1)); }
  }
}
async function pool<T>(items: T[], n: number, fn: (x: T, i: number) => Promise<void>) {
  let k = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (k < items.length) { const i = k++; await fn(items[i], i); } }));
}
/** 목표 글자 수로 장을 묶는다(한 번 호출에 약 4,500자) */
export function batchesOf(outline: LongChapter[], max = 4600) {
  const out: LongChapter[][] = [];
  let cur: LongChapter[] = [], sum = 0;
  for (const c of outline) {
    if (cur.length && sum + c.len > max) { out.push(cur); cur = []; sum = 0; }
    cur.push(c); sum += c.len;
  }
  if (cur.length) out.push(cur);
  return out;
}

export async function generateLong(product: { id: string; title: string }, people: Person[], opts: { http?: typeof fetch; now?: Date; onProgress?: (done: number, total: number) => Promise<void> | void } = {}) {
  const http = opts.http ?? fetch;
  const p0 = people[0];
  const saju = calcSaju({ year: p0.year, month: p0.month, day: p0.day, hour: p0.hour ?? null, calendar: p0.calendar, leapMonth: p0.leap, gender: p0.gender, timeUnknown: p0.hour == null });
  const deep: LifetimeDeep = lifetimeDeep(saju, p0.name, 'r', opts.now);
  const outline = deep.outline;
  const u: Usage = { in: 0, out: 0, cacheWrite: 0, cacheRead: 0, calls: 0 };
  const factsAll = Object.entries(deep.facts).map(([k, v]) => `[${k}]\n${v}`).join('\n\n');
  const person = `${p0.name}(${p0.gender === 'M' ? '남' : '여'}, ${p0.calendar === 'lunar' ? '음력' : '양력'} ${p0.year}.${p0.month}.${p0.day}${p0.hour == null ? ', 태어난 시간 모름' : ` ${p0.hour}시`}) / 오늘 ${(opts.now ?? new Date()).toISOString().slice(0, 10)}`;
  const toc = outline.map((c, i) => `${i + 1}. ${c.title} — ${c.brief}`).join('\n');
  const sys = (intro: boolean) => [
    { type: 'text' as const, text: RULES.replace('${INTRO}', intro ? ',"intro":"감정서 첫머리 인사(300~400자)","closing":{"title":"달새김이 남기는 말","body":"(빈 문자열)","tips":[]}' : '') },
    { type: 'text' as const, text: `[대상] ${person}\n\n[전체 목차 — 각 장은 자기 범위만 쓴다]\n${toc}\n\n[계산 자료]\n${factsAll}`, cache_control: { type: 'ephemeral' as const } },
  ];
  const draftOf = (c: LongChapter) => deep.fallback(c).join(' ');
  const userFor = (cs: LongChapter[], note = '') => `이번에 쓸 장(이 순서, 제목 그대로):\n${cs.map((c) => `- ${c.id} 「${c.title}」 본문 약 ${bodyLenTarget(c)}자(공백 포함) · 쓸 범위: ${c.brief}\n  집중할 계산 자료: ${c.facts.join(', ')}\n  참고 초안(사실만 가져오고 문장은 새로, 훨씬 깊게): ${draftOf(c).slice(0, 1200)}`).join('\n')}${note}`;

  const got = new Map<string, Draft>();
  const issues: string[] = [];
  let intro = '';
  const batches = batchesOf(outline);
  let done = 0;
  const conc = Math.max(1, +(process.env.READING_CONCURRENCY ?? 4));
  await pool(batches, conc, async (cs, bi) => {
    try {
      const j = await withRetry(() => call(sys(bi === 0), userFor(cs, bi === 0 ? '\n첫 묶음이므로 intro 도 함께 쓴다.' : ''), http, u));
      if (bi === 0 && typeof j.intro === 'string') intro = j.intro;
      for (const c of (j.chapters ?? []) as Draft[]) if (c && cs.some((x) => x.id === c.id) && typeof c.body === 'string') got.set(c.id, c);
    } catch (e) { issues.push(`묶음 ${bi + 1} 실패: ${(e as Error).message}`); }
    done += cs.length;
    await opts.onProgress?.(Math.min(done, outline.length), outline.length);
  });
  // 짧거나 금지 표현이 있거나 빠진 장 — 한 번 다시 쓴다
  const redo = outline.filter((c) => { const d = got.get(c.id); return !d || len(d.body) < bodyLenTarget(c) * 0.6 * 0.8 || BANNED.some((re) => re.test(`${d.body} ${d.say} ${d.highlight}`)); });
  await pool(redo, conc, async (c) => {
    const prev = got.get(c.id);
    const why = !prev ? '' : BANNED.some((re) => re.test(prev.body)) ? '\n앞서 쓴 글에 금지 표현이 있었다. 금지 규칙을 지켜 새로 쓴다.' : `\n앞서 쓴 글이 ${len(prev.body)}자로 짧았다. 목표 분량을 채워 더 깊게 쓴다.`;
    try { const j = await withRetry(() => call(sys(false), userFor([c], why), http, u), 2); const d = (j.chapters ?? []).find((x: Draft) => x?.id === c.id); if (d?.body) got.set(c.id, d); } catch (e) { issues.push(`${c.id} 다시 쓰기 실패: ${(e as Error).message}`); }
  });
  // 그래도 없거나 금지 표현이 남은 장은 계산 초안으로
  const chapters: (Chapter & { part: number; partTitle: string })[] = outline.map((c, i) => {
    const d = got.get(c.id);
    const bad = !d || BANNED.some((re) => re.test(`${d.body} ${d.say} ${d.highlight}`));
    if (bad) issues.push(`${c.id} 계산 초안으로 대체`);
    const body = bad ? deep.fallback(c).join('\n\n') : d!.body;
    const meta = c.draft != null ? deep.base.chapters[c.draft] : null;
    return { id: `c${i + 1}`, title: c.title, say: bad ? (meta?.say ?? c.title) : d!.say ?? '', body: bad || body.includes(p0.name) ? body : `${p0.name} 님, ${body}`, highlight: bad ? (meta?.highlight ?? '') : d!.highlight ?? '', part: c.part, partTitle: c.partTitle,
      ...(meta && c.draft != null && meta.basis.length ? { basis: meta.basis } : {}) };
  });
  for (const c of outline) { const d = got.get(c.id); if (d && len(d.body) < bodyLenTarget(c) * 0.5 * 0.8) issues.push(`${c.id} 분량 부족 ${len(d.body)}자`); }
  const b9 = deep.base.chapters[8];
  const closing: Closing = { title: '달새김이 남기는 말', body: `${p0.name} 님의 사주 감정서를 끝까지 읽어 주셔서 고마워요. 사주는 정해진 답이 아니라 나를 이해하는 지도예요. 마음에 남은 한 줄을 기록해 두고, 몇 달 뒤 실제로 어땠는지 함께 돌아봐요.`, tips: [b9.paras[1] ?? '', b9.paras[2] ?? '', b9.paras[3] ?? ''].filter(Boolean).map((t) => t.split(/(?<=요\.)\s/)[0]) };
  const content: ReadingContent & { parts: string[]; long: true } = {
    productId: product.id, title: product.title, generatedBy: 'ai', long: true, parts: deep.parts,
    intro: intro || `${p0.name} 님의 사주 여덟 글자를 처음부터 끝까지 풀어 쓴 정통 감정서예요. 타고난 설계도, 사랑·돈·일·사람, 대운·세운·월운의 흐름, 운을 새기는 습관까지 차례로 담았어요.`,
    chapters, closing, who: people.map((p) => p.name), visual: deep.visual as any, facts: Object.values(deep.facts),
  };
  return { content, usage: u, costKrw: usageKrw(u), issues, totalChars: chapters.reduce((a, c) => a + c.body.length, 0) };
}
