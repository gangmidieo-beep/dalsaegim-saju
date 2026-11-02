// 전 상품 30~40쪽 풀이(11/3 사장님 결정: 가격 비례, 반복으로 채우지 않음) — 계산 풀이(엔진)를 뼈대로 AI 가 장마다 깊게 다시 쓰고,
// 상품군별로 '앞으로 12달 달력(월운표)·상황별 실천 가이드·자주 묻는 질문' 장을 더한다.
// · 계산 자료는 system 에 한 번(프롬프트 캐시) · 장 묶음 약 4,500자씩 병렬 호출 · 실패한 장은 계산 풀이 그대로(빈 풀이 없음)
// · 비용: 1건당 약 300~1,500원(상품별, gpt-6.1-sol 기준 추정 — 11/3 보고). READING_DEEP=off 로 끌 수 있다.
import { createHash } from 'node:crypto';
import { calcSaju } from '@dalsaegim/engine';
import { wolunOf } from '@dalsaegim/content';
import type { Chapter, Person, ReadingContent } from './generate.ts';
import { aiCall, aiFatal, type SystemPart } from '../ai.ts';

export const deepOn = (id: string) => process.env.READING_DEEP !== 'off' && id !== 'lifetime' && !!familyOf(id);
type Fam = 'love' | 'money' | 'work' | 'self' | 'year' | 'month' | 'tarot';
export function familyOf(id: string): Fam | null {
  if (id === 'tarot_some') return 'tarot';
  if (['love_flow', 'reunion', 'gunghap', 'adult_gunghap', 'marriage'].includes(id)) return 'love';
  if (id.startsWith('money_') && id !== 'money_pack') return 'money';
  if (['career', 'path_deep'].includes(id)) return 'work';
  if (id === 'mbti_deep') return 'self';
  if (id === 'newyear_2027') return 'year';
  if (id === 'month_detail') return 'month';
  return null;
}
type Extra = { key: 'monthly' | 'guide' | 'faq' | 'talk'; title: string; brief: string; len: number };
const EXTRAS: Record<Fam, Extra[]> = {
  love: [
    { key: 'monthly', title: '앞으로 12달, 달마다 읽는 마음의 흐름', brief: '아래 월운표의 12달을 석 달씩 묶어, 달마다 연애·관계 기운이 어떤지와 그달에 해 볼 일 하나씩. 점수는 표의 값만', len: 3200 },
    { key: 'guide', title: '지금 내 상황에 맞춘 실천 가이드', brief: '솔로·썸·연애 중·이별 뒤 등 상황별로 이번 달 할 일과 피할 일, 대화 예시 문장', len: 2200 },
    { key: 'faq', title: '자주 묻는 질문 다섯 가지', brief: '이 풀이를 받은 사람이 가장 궁금해할 질문 5개와 사주 근거를 담은 답(예: 언제 연락할까, 이 사람이 맞을까 — 단정하지 않기)', len: 2200 },
  ],
  money: [
    { key: 'monthly', title: '앞으로 12달 돈의 흐름 달력', brief: '월운표의 12달을 석 달씩 묶어 달마다 재물·일 기운과 그달의 돈 관리 포인트(늘리기·지키기·쉬어 가기). 종목·매수매도 권유 금지', len: 3200 },
    { key: 'guide', title: '돈을 지키는 습관과 점검표', brief: '이 사주에서 돈이 새기 쉬운 패턴, 지키는 습관 5가지, 매달 점검할 질문 5가지', len: 2200 },
    { key: 'faq', title: '자주 묻는 질문 다섯 가지', brief: '재물운을 본 사람이 궁금해할 질문 5개와 근거 있는 답(언제 모을까, 부업·이직, 큰돈 쓰기 좋은 때 등 — 보장 표현 금지)', len: 2200 },
  ],
  work: [
    { key: 'monthly', title: '앞으로 12달 일의 흐름 달력', brief: '월운표 12달을 석 달씩 묶어 일·성취 기운과 그달에 할 일(지원·면접·협상·쉼)', len: 3200 },
    { key: 'guide', title: '선택 앞에서 쓰는 점검표', brief: '이직·창업·잔류 같은 선택 앞에서 이 사주가 스스로에게 물어야 할 질문과 판단 기준', len: 2200 },
    { key: 'faq', title: '자주 묻는 질문 다섯 가지', brief: '진로·일 풀이를 본 사람이 궁금해할 질문 5개와 근거 있는 답(합격 보장 금지)', len: 2200 },
  ],
  self: [
    { key: 'monthly', title: '앞으로 12달, 나를 쓰는 법', brief: '월운표 12달을 석 달씩 묶어 그 시기에 강점을 살리는 방법', len: 2800 },
    { key: 'guide', title: '관계·일·쉼에서 나답게 지내는 법', brief: '사주와 MBTI가 같은 축·다른 축을 생활 장면(회의·연애·휴식)으로 풀고 실천 5가지', len: 2200 },
    { key: 'faq', title: '자주 묻는 질문 다섯 가지', brief: '사주와 MBTI가 다를 때 등 궁금해할 질문 5개와 답', len: 2000 },
  ],
  year: [
    { key: 'monthly', title: '2027년 열두 달 달력', brief: '2027년 1~12월을 석 달씩 묶어 달마다 기운과 할 일. 점수는 자료의 값만', len: 3400 },
    { key: 'guide', title: '분야별 한 해 계획표', brief: '재물·연애·일·건강 습관 분야별 상반기/하반기 할 일', len: 2200 },
    { key: 'faq', title: '자주 묻는 질문 다섯 가지', brief: '신년운세를 본 사람이 궁금해할 질문 5개와 답', len: 2000 },
  ],
  month: [
    { key: 'guide', title: '그달을 보내는 실천 가이드', brief: '고른 달의 초·중·말 열흘마다 할 일과 피할 일, 관계·돈·일 각각 한 가지', len: 2400 },
    { key: 'faq', title: '자주 묻는 질문 다섯 가지', brief: '월간운세를 본 사람이 궁금해할 질문 5개와 답', len: 2000 },
  ],
  tarot: [
    { key: 'talk', title: '카드가 건네는 대화법', brief: '고른 세 장의 키워드로 그 사람과 나눌 수 있는 대화 예시 문장 5개와, 피하면 좋은 말 3개. 상대 마음은 단정하지 않는다', len: 1800 },
    { key: 'faq', title: '자주 묻는 질문 다섯 가지', brief: '썸 타로를 본 사람이 궁금해할 질문 5개와 답(카드는 상징이라는 점 유지)', len: 1800 },
  ],
};
const BASE_LEN: Record<Fam, number> = { love: 3400, money: 2700, work: 3000, self: 3000, year: 2300, month: 2400, tarot: 1400 }; // 가격 비례 목표: 4,900원 ≈ 17~20쪽, 9,900~19,900원 ≈ 28~32쪽
const BANNED = [/사망|죽음/, /이혼(하게|할 수밖에|이 확정)/, /파산/, /(암|중병)에 걸/, /(매수|매도)(하세요|하라|하시)/, /(사세요|파세요)/, /수익(을|이)? ?보장/, /종목/, /반드시|무조건|100%/, /합격(을|이)? ?보장/];
const RULES = `당신은 사주 서비스 "달새김사주"의 풀이 작가 "달새김"이다. 한 사람을 위한 개인 풀이 책(A4 30~40쪽)을 장별로 나눠 쓰는 중이다.
문체: 다정하고 세련된 해요체. 사주를 잘 모르는 20~50대가 읽는다. 한자 용어는 처음 나올 때 쉬운 말로. 문단은 3~5문장, 문단 사이 빈 줄(\\n\\n).
정확성: [계산 자료]의 간지·십성·지수·연도·달만 쓴다. 새 숫자·새 연도를 지어내지 않는다. 시기는 언제나 'YYYY년 M월'처럼 연도를 붙인다.
깊이: 장마다 '근거(어느 기운·어느 달 때문인지) → 해석 → 실제 생활 장면 예시 → 실천 조언'. 다른 장과 같은 문장·예시를 반복하지 않는다. 같은 위로 문장을 되풀이하지 않는다.
관계: 다른 사람의 실제 마음·의도를 단정하지 않는다("~일 수 있어요", "대화로 확인해요"). 서로 반대되는 행동 조언을 하지 않는다 — 계산 자료의 좋은 달·조심할 달 기준으로 한 방향을 준다.
금지: 죽음·이혼 확정·파산·큰 병 단정, 의료 진단, "반드시·무조건·100%", 투자 종목·매수·매도 권유, 수익·합격 보장, 공포 조장. 다른 운세 서비스 문장을 흉내 내지 않는다.
이름은 "OOO 님". 출력은 JSON 하나만: {"chapters":[{"id":"D01","title":"(주어진 제목 그대로)","say":"한 줄 요약(40자 안팎)","body":"본문","highlight":"핵심 한 문장(본문과 다른 문장)"}]}`;
type Draft = { id: string; title: string; say: string; body: string; highlight: string };
type Plan = { id: string; title: string; brief: string; len: number; draft: string; extra?: Extra['key'] };
const len = (s: string) => s.replace(/\s/g, '').length;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> { for (let i = 0; ; i++) { try { return await fn(); } catch (e) { if (i >= n - 1 || aiFatal(e)) throw e; await sleep((process.env.NODE_ENV === 'test' ? 5 : 2500) * (i + 1)); } } }
async function pool<T>(xs: T[], n: number, fn: (x: T, i: number) => Promise<void>) { let k = 0; await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => { while (k < xs.length) { const i = k++; await fn(xs[i], i); } })); }
function batches(plan: Plan[], max = 4600) { const out: Plan[][] = []; let cur: Plan[] = [], sum = 0; for (const c of plan) { if (cur.length && sum + c.len > max) { out.push(cur); cur = []; sum = 0; } cur.push(c); sum += c.len; } if (cur.length) out.push(cur); return out; }

/** 계산 풀이(base)를 뼈대로 30~40쪽 풀이를 만든다. 실패한 장은 base 그대로. */
export async function generateDeep(base: ReadingContent, people: Person[], factLines: string[], opts: { http?: typeof fetch; now?: Date; onProgress?: (done: number, total: number) => Promise<void> | void } = {}) {
  const fam = familyOf(base.productId)!;
  const http = opts.http ?? fetch;
  const now = opts.now ?? new Date();
  const p0 = people[0];
  const saju = calcSaju({ year: p0.year, month: p0.month, day: p0.day, hour: p0.hour ?? null, calendar: p0.calendar, leapMonth: p0.leap, gender: p0.gender, timeUnknown: p0.hour == null });
  const wolun = wolunOf(saju, 'r', now); // buildFacts 와 같은 시드('r') — 요약의 좋은 달과 표가 어긋나지 않게
  const scale = Math.max(0.3, Math.min(1.5, +(process.env.READING_DEEP_SCALE ?? 1)));
  const extras = EXTRAS[fam];
  const plan: Plan[] = [
    ...base.chapters.map((c, i) => ({ id: `D${String(i + 1).padStart(2, '0')}`, title: c.title, brief: `계산 풀이의 같은 장을 훨씬 깊게(근거·예시·실천). 핵심: ${c.say}`, len: Math.round(BASE_LEN[fam] * scale), draft: c.body })),
    ...extras.map((e, j) => ({ id: `D${String(base.chapters.length + j + 1).padStart(2, '0')}`, title: e.title, brief: e.brief, len: Math.round(e.len * scale), draft: '', extra: e.key })),
  ];
  const facts = [
    ...factLines,
    ...(base.summary ? [`요약: ${base.summary.headline} / ${base.summary.lead}`, ...base.summary.steps.map((s) => `${s.label}: ${s.text}`), ...base.summary.metrics.map((m) => `${m.label} ${m.score}`)] : []),
    `[앞으로 12달 월운표]\n${wolun.map((w) => `${w.y}년 ${w.m}월 ${w.gz} 천간 ${w.sip}: 연애 ${w.love}·일 ${w.work}·재물 ${w.wealth}`).join('\n')}`,
  ].join('\n');
  const person = `${p0.name}(${p0.gender === 'M' ? '남' : '여'}, ${p0.calendar === 'lunar' ? '음력' : '양력'} ${p0.year}.${p0.month}.${p0.day})${people[1] ? ` · 상대 ${people[1].name}` : ''} / 오늘 ${now.toISOString().slice(0, 10)} / 상품 '${base.title}'`;
  const sys: SystemPart[] = [{ text: RULES }, { text: `[대상] ${person}\n\n[목차]\n${plan.map((c, i) => `${i + 1}. ${c.title} — ${c.brief}`).join('\n')}\n\n[계산 자료]\n${facts}`, cache: true }];
  const ck = `deep:${createHash('sha256').update(facts + base.productId).digest('hex').slice(0, 24)}`;
  const userFor = (cs: Plan[], note = '') => `이번에 쓸 장(이 순서, 제목 그대로):\n${cs.map((c) => `- ${c.id} 「${c.title}」 본문 약 ${c.len}자 · 쓸 범위: ${c.brief}${c.draft ? `\n  계산 풀이 초안(사실만 가져오고 문장은 새로, 훨씬 깊게): ${c.draft.slice(0, 1400)}` : ''}`).join('\n')}${note}`;
  let krw = 0, tin = 0, tout = 0;
  const call = async (cs: Plan[], note = '') => {
    const c = await aiCall({ system: sys, messages: [{ role: 'user', content: userFor(cs, note) }], kind: 'long', http, maxTokens: 8000, json: true, cacheKey: ck });
    krw += c.costKrw; tin += c.usage.in + c.usage.cacheRead + c.usage.cacheWrite; tout += c.usage.out;
    return JSON.parse(c.text.slice(c.text.indexOf('{'), c.text.lastIndexOf('}') + 1)) as { chapters?: Draft[] };
  };
  const got = new Map<string, Draft>();
  const issues: string[] = [];
  const bs = batches(plan);
  let done = 0;
  const conc = Math.max(1, +(process.env.READING_CONCURRENCY ?? 4));
  let fatal = ''; // 키 만료·잔액 부족이면 더 부르지 않는다
  // 첫 묶음은 혼자 먼저(계산 자료 캐시를 만들고, 키 만료·잔액 부족이면 여기서 바로 멈춘다) → 나머지는 동시에
  const one = async (cs: Plan[], bi: number) => {
    if (fatal) return;
    try { const j = await retry(() => call(cs)); for (const d of j.chapters ?? []) if (d && cs.some((x) => x.id === d.id) && typeof d.body === 'string') got.set(d.id, d); } catch (e) { issues.push(`묶음 ${bi + 1} 실패: ${(e as Error).message}`); if (aiFatal(e)) fatal = (e as Error).message; }
    done += cs.length; await opts.onProgress?.(Math.min(done, plan.length), plan.length);
  };
  await one(bs[0], 0);
  await pool(bs.slice(1), conc, (cs, i) => one(cs, i + 1));
  const bad = (d?: Draft) => !d || BANNED.some((re) => re.test(`${d.body} ${d.say} ${d.highlight}`));
  const redo = fatal ? [] : plan.filter((c) => bad(got.get(c.id)) || len(got.get(c.id)!.body) < c.len * 0.5);
  await pool(redo, conc, async (c) => {
    try { const j = await retry(() => call([c], '\n앞서 쓴 글이 짧거나 금지 표현이 있었다. 규칙을 지켜 목표 분량으로 새로 쓴다.'), 2); const d = (j.chapters ?? []).find((x) => x?.id === c.id); if (d?.body) got.set(c.id, d); } catch (e) { issues.push(`${c.id} 다시 쓰기 실패: ${(e as Error).message}`); }
  });
  const monthlyAt = plan.findIndex((c) => c.extra === 'monthly');
  const chapters: Chapter[] = [];
  plan.forEach((c, i) => {
    const d = got.get(c.id);
    if (bad(d)) {
      issues.push(`${c.id} 계산 풀이로 대체`);
      if (i < base.chapters.length) chapters.push({ ...base.chapters[i], id: `c${chapters.length + 1}` });
      else if (c.extra === 'monthly') chapters.push({ id: `c${chapters.length + 1}`, title: c.title, say: '앞으로 12달', body: wolun.map((w) => `${w.y}년 ${w.m}월 — 연애 ${w.love} · 일 ${w.work} · 재물 ${w.wealth}`).join('\n\n'), highlight: '' });
      return; // 가이드·질문 장은 AI 가 없으면 싣지 않는다(빈말로 채우지 않음)
    }
    const m = i < base.chapters.length ? base.chapters[i] : null;
    chapters.push({ id: `c${chapters.length + 1}`, title: c.title, say: d!.say ?? '', body: d!.body.includes(p0.name) ? d!.body : `${p0.name} 님, ${d!.body}`, highlight: d!.highlight ?? '', ...(m?.points ? { points: m.points } : {}), ...(m?.basis ? { basis: m.basis } : {}) });
  });
  const visual = { ...(base.visual ?? {}), wolun, wolunAt: monthlyAt >= 0 ? chapters.findIndex((c) => c.title === plan[monthlyAt].title) : undefined } as ReadingContent['visual'];
  const content: ReadingContent = { ...base, chapters, visual, generatedBy: 'ai' };
  const fell = issues.filter((x) => x.endsWith('대체')).length;
  return { content, costKrw: krw, tokensIn: tin, tokensOut: tout, issues, fell, total: plan.length, fatal, chars: chapters.reduce((a, c) => a + len(c.body), 0) };
}
