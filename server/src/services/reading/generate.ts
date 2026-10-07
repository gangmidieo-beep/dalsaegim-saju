// 유료 풀이 생성 — 결제 완료 → readings(queued) → 워커가 생성 → done.
// 1) 엔진·콘텐츠 계산으로 "사실"(지수·좋은 달·키워드·성향)을 먼저 만든다 → 무료 요약과 유료 풀이 숫자가 항상 같다.
// 2) READING_AI=live + ANTHROPIC_API_KEY + ANTHROPIC_MODEL 이면 AI 가 그 사실을 바탕으로 문장을 쓴다(비용 보고·승인 후 켬).
//    꺼져 있으면 계산 결과와 문구 DB 로 만든 "엔진 풀이"(generatedBy: engine)로 흐름이 끝까지 돈다.
import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { calcSaju, branchRelations, kstParts, type SajuResult } from '@dalsaegim/engine';
import {
  moneyFlow, newYearPreview, sajuMap, sajuMbti, pathResult, nextMonths, monthFortune, todayFortune, toRanges, MONEY_KINDS, type MoneyKind,
} from '@dalsaegim/content';
import R from '../../../../packages/content/data/reading.json' with { type: 'json' };
import { schema as S, type Db } from '../../db/index.ts';

export type Chapter = { id: string; title: string; say: string; body: string; highlight: string };
export type Closing = { title: string; body: string; tips: string[] };
export type ReadingContent = { productId: string; title: string; intro: string; chapters: Chapter[]; closing: Closing; facts?: unknown; generatedBy: 'ai' | 'engine' };
export type Person = { name: string; gender: 'M' | 'F'; year: number; month: number; day: number; calendar: 'solar' | 'lunar'; leap?: boolean; hour?: number | null };
export type OrderMeta = { cat?: string; sub?: string; q?: string; mbti?: string } | null;

export const chaptersFor = (productId: string) => (R.chapters as Record<string, string[]>)[productId] ?? R.chapters.lifetime;
const sajuOfP = (p: Person) => calcSaju({ year: p.year, month: p.month, day: p.day, hour: p.hour ?? null, calendar: p.calendar, leapMonth: p.leap, gender: p.gender, timeUnknown: p.hour == null });

/* ---------- 금지어·품질 검사 ---------- */
const BANNED = [/사망|죽(는|을|음)/, /이혼(하게|할 수밖에|이 확정)/, /파산/, /(암|중병)에 걸/, /(매수|매도)(하세요|하라|하시)/, /(사세요|파세요)/, /수익(을|이)? ?보장/, /종목/, /반드시|무조건|100%/];
export function checkQuality(c: ReadingContent, names: string[], expected: string[]): string[] {
  const issues: string[] = [];
  if (c.chapters.length !== expected.length) issues.push(`장 수 ${c.chapters.length}/${expected.length}`);
  const all = [c.intro, c.closing.body, ...c.closing.tips, ...c.chapters.map((x) => `${x.say} ${x.body} ${x.highlight}`)].join('\n');
  for (const n of names) if (!all.includes(n)) issues.push(`이름 누락: ${n}`);
  for (const re of BANNED) if (re.test(all)) issues.push(`금지 표현: ${re.source}`);
  c.chapters.forEach((ch, i) => { if ((ch.body ?? '').length < 150) issues.push(`${i + 1}장 분량 부족`); });
  if (/하오\.|구려\.|하시게\./.test(all)) issues.push('달새김 말투(해요체) 아님');
  return issues;
}

/* ---------- 사실(계산 결과) ---------- */
type Facts = { lines: string[]; paras: string[]; keywords: string[]; tips: string[]; sections?: string[][] };
const kindOf = (id: string): MoneyKind | null => (id.startsWith('money_') && id !== 'money_pack' ? (id.slice(6) as MoneyKind) : null);
export function buildFacts(productId: string, people: Person[], sajus: SajuResult[], meta: OrderMeta, market: { body: string; flow: number[] | null } | null, now = new Date()): Facts {
  const id = 'r';
  const s = sajus[0];
  const p0 = people[0];
  const year = kstParts(now).year;
  const map = sajuMap(s, id, now);
  const base = [`일간 ${map.dayMaster.char}(${map.dayMaster.hanja}) — ${map.dayMaster.title}`, `오행 ${map.elements.map((e) => `${e.el} ${e.pct}%`).join(' · ')} / 가장 강한 기운 ${map.strongest}, 채우면 좋은 기운 ${map.need}`];
  const paras: string[] = [`${p0.name} 님은 ${map.dayMaster.image}의 기운을 타고났어요. ${map.dayMaster.line}`];
  const lines = [...base];
  let keywords: string[] = [...map.dayMaster.keywords];
  let tips: string[] = [map.elementAdvice];
  const money = (k: MoneyKind) => {
    const f = moneyFlow(s, k, year, id, { market: k === 'invest' ? market?.flow ?? null : null, now });
    lines.push(`${f.series}: 지수 ${f.score} / ${f.subs.map((x) => `${x.label} ${x.score}`).join(', ')} / 좋은 달 ${toRanges(f.good)} / 신중한 달 ${toRanges(f.careful)} / 키워드 ${f.keywords.join(', ')}`);
    paras.push(`${f.series} — ${f.headline}. ${f.summary}`, `올해 ${f.title}에서 기운이 살아나는 달은 ${toRanges(f.good)}이고, 한 템포 쉬어 가면 좋은 달은 ${toRanges(f.careful)}이에요. ${f.tips[0]}`);
    if (f.invest) {
      lines.push(`투자 성향: ${f.invest.style.style}(신중함 ${f.invest.style.carePct}%, 도전성 ${f.invest.style.boldPct}%) / 시장과 만나는 시기 ${f.invest.meet}${market ? '' : ' (시장 노트 없음 — 개인 흐름 기준)'}`);
      paras.push(`${p0.name} 님의 투자 성향은 ${f.invest.style.style}이에요. ${f.invest.style.text}`,
        market ? `달새김이 보는 올해의 시장 이야기: ${market.body}` : '올해 시장 이야기는 운영팀이 정리하는 대로 이곳에 채워져요. 시장의 큰 흐름은 뉴스와 공식 자료로 꼭 함께 확인해 주세요.',
        `시장과 나의 흐름이 만나는 시기는 ${f.invest.meet}예요. ${f.invest.thisMonth}`,
        '사주는 결과를 맞히는 도구가 아니라, 내 마음과 판단의 리듬을 살피는 참고예요. 무엇에 언제 투자할지는 정보와 원칙으로 정해 주세요.');
      if (productId === 'money_invest') sectionsOut = [
        [`${f.series} — ${f.headline}. ${f.summary}`, `${p0.name} 님의 투자 성향은 ${f.invest.style.style}이에요. ${f.invest.style.text}`],
        [market ? `달새김이 보는 올해의 시장 이야기: ${market.body}` : '올해 시장 이야기는 운영팀이 정리하는 대로 이곳에 채워져요. 시장의 큰 흐름은 뉴스와 공식 자료로 꼭 함께 확인해 주세요.'],
        [`시장과 나의 흐름이 만나는 시기는 ${f.invest.meet}예요. 이때는 미리 공부해 둔 것을 원칙 안에서 작게 시도해 보기 좋아요.`, `반대로 ${toRanges(f.careful)}에는 나의 흐름이 잠시 낮아져요.`],
        [f.invest.thisMonth, f.tips[0]],
        [...f.tips.slice(1), '사주는 결과를 맞히는 도구가 아니라, 내 마음과 판단의 리듬을 살피는 참고예요. 무엇에 언제 투자할지는 정보와 원칙으로 정해 주세요.'],
      ];
    }
    keywords = [...f.keywords, ...keywords];
    tips = [...f.tips, ...tips];
  };
  let sectionsOut: string[][] | undefined;
  const k = kindOf(productId);
  if (k) money(k);
  else if (productId === 'money_pack') MONEY_KINDS.forEach(money);
  else if (productId === 'newyear_2027' || productId === 'month_detail') {
    const ny = newYearPreview(s, 2027, id);
    if (productId === 'newyear_2027') {
      lines.push(`2027 정미년: 총운 ${ny.total} / ${ny.fields.map((f) => `${f.label} ${f.score}`).join(', ')} / 좋은 달 ${ny.good} / 키워드 ${ny.keyword}`);
      paras.push(`2027년은 ${ny.yearPillar.text}(${ny.yearPillar.hanja})년이에요. ${p0.name} 님에게는 '${ny.keyword}'이 열쇠가 되는 해예요.`,
        ...[[1, 3], [4, 6], [7, 9], [10, 12]].map(([a, b]) => { const ms = ny.months.slice(a - 1, b); const best = ms.reduce((x, y) => (y.score > x.score ? y : x)); return `${a}~${b}월에는 ${best.month}월의 기운이 가장 밝아요. 이 시기에는 미뤄 둔 일을 하나씩 꺼내 보세요.`; }),
        `분야별로 보면 ${ny.fields.map((f) => `${f.label} ${f.score}점`).join(', ')}이에요. 가장 기운이 좋은 달은 ${ny.good}이에요.`);
      keywords = [ny.keyword, ...keywords];
      const area = (id: string) => map.areas.find((a) => a.id === id)!.line;
      const q = [[1, 3], [4, 6], [7, 9], [10, 12]].map(([a, b]) => { const ms = ny.months.slice(a - 1, b); const best = ms.reduce((x, y) => (y.score > x.score ? y : x)); const low = ms.reduce((x, y) => (y.score < x.score ? y : x)); return `${a}~${b}월 가운데 ${best.month}월의 기운이 가장 밝고, ${low.month}월은 한 템포 쉬어 가면 좋아요. 밝은 달에는 미뤄 둔 일을 꺼내고, 쉬어 가는 달에는 정리와 준비에 마음을 써 보세요.`; });
      const f = (id: string) => ny.fields.find((x) => x.id === id)!.score;
      sectionsOut = [
        [`${p0.name} 님은 ${map.dayMaster.image}의 기운을 타고났어요. ${map.dayMaster.line}`, `2027년은 ${ny.yearPillar.text}(${ny.yearPillar.hanja})년, ${p0.name} 님에게 한 해 총운은 ${ny.total}점이에요. '${ny.keyword}'이 한 해의 열쇠가 되고, 가장 기운이 좋은 달은 ${ny.good}이에요.`],
        [q[0]], [q[1]], [q[2]], [q[3]],
        [`연애와 관계 지수는 ${f('love')}점이에요. ${area('love')}`, map.dayMaster.love],
        [`일 ${f('work')}점, 재물 ${f('wealth')}점의 흐름이에요. ${area('work')}`, area('money'), map.dayMaster.work],
        [`몸과 마음 지수는 ${f('health')}점이에요. ${map.elementAdvice}`, area('growth')],
        [map.period.now ? `지금은 ${map.period.now.fromYear}~${map.period.now.toYear}년 ${map.period.now.text} 대운, '${map.period.now.theme}'예요.` : `${p0.name} 님의 2027년이 차곡차곡 새겨지기를 바라요.`, `좋은 달(${ny.good})을 달력에 표시해 두고, 그때마다 하고 싶은 일을 하나씩 꺼내 보세요.`],
      ];
    } else {
      const mf = monthFortune(s, now, id);
      const k0 = kstParts(now);
      const days = Array.from({ length: 28 }, (_, i) => ({ d: i + 1, t: todayFortune(s, new Date(Date.UTC(k0.year, k0.month - 1, i + 1, 3)), id).total }));
      const best = [...days].sort((a, b) => b.t - a.t).slice(0, 3).map((x) => x.d).sort((a, b) => a - b);
      const low = [...days].sort((a, b) => a.t - b.t).slice(0, 3).map((x) => x.d).sort((a, b) => a - b);
      lines.push(`${mf.month}월: 지수 ${mf.total} / 좋은 날 ${best.join(', ')}일 / 조심할 날 ${low.join(', ')}일 / 키워드 ${mf.keyword}`);
      paras.push(mf.line, `이번 달 기운이 좋은 날은 ${best.join(', ')}일, 속도를 늦추면 좋은 날은 ${low.join(', ')}일이에요.`);
      keywords = [mf.keyword, ...keywords];
    }
  } else if (productId === 'love_flow' || productId === 'gunghap' || productId === 'adult_gunghap') {
    const nm = nextMonths(s, 'love', id, now);
    const good = [...nm].sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.month);
    lines.push(`연애 흐름(앞으로 12달): 좋은 달 ${toRanges(good)}`);
    paras.push(map.dayMaster.love, `앞으로 열두 달 중 마음이 닿기 쉬운 달은 ${toRanges(good)}이에요.`, map.areas.find((a) => a.id === 'love')!.line);
    if (sajus[1]) {
      const m2 = sajuMap(sajus[1], id, now);
      const rel = branchRelations(s.pillars.day.branch, sajus[1].pillars.day.branch);
      lines.push(`두 번째 사람 ${people[1].name}: 일간 ${m2.dayMaster.char} — ${m2.dayMaster.title} / 일지 관계: ${rel.join(', ') || '특별한 합충 없음'}`);
      paras.push(`${people[1].name} 님은 ${m2.dayMaster.image}의 기운이에요. ${m2.dayMaster.love}`,
        rel.includes('combine') || rel.includes('halfCombine') ? '두 사람의 일지가 서로 끌어당기는 합의 관계라, 함께 있을 때 편안함이 커요.'
          : rel.includes('clash') ? '두 사람의 일지가 서로 부딪히는 관계라, 다름을 인정하는 대화가 관계의 열쇠예요.' : '두 사람의 일지는 담백한 관계라, 함께 쌓는 시간만큼 깊어져요.');
    }
  } else if (productId === 'path_deep' && meta?.cat && meta.sub && meta.q) {
    const pr = pathResult(s, meta.cat, meta.sub, meta.q, id, now);
    lines.push(`고민: ${pr.cat.label} > ${pr.sub.label} > ${pr.q} / ${pr.label} 흐름 평균 ${pr.avg} / 좋은 시기 ${pr.good} / 신중한 시기 ${pr.careful}`);
    paras.push(`${p0.name} 님이 고른 고민은 '${pr.q}'예요. ${pr.headline}`, pr.reason, `좋은 시기는 ${pr.good}, 신중하면 좋은 시기는 ${pr.careful}이에요.`, ...pr.hints);
  } else if (productId === 'mbti_deep' && meta?.mbti) {
    const mb = sajuMbti(s, meta.mbti, id);
    lines.push(`MBTI ${mb.mbti}(${mb.info.nick}) / 사주로 본 성향 ${mb.sajuType} / 일치도 ${mb.match}%`);
    paras.push(`${mb.title}. ${mb.line}`, mb.love, mb.work, mb.money);
    keywords = [...mb.info.traits, ...keywords];
  }
  // 공통 — 사주지도
  paras.push(...map.areas.map((a) => `${a.label}: ${a.line}`));
  if (map.period.now) paras.push(`지금은 ${map.period.now.fromYear}~${map.period.now.toYear}년 ${map.period.now.text} 대운, '${map.period.now.theme}'예요.${map.period.next ? ` 다음 ${map.period.next.fromYear}년부터는 '${map.period.next.theme}'로 이어져요.` : ''}`);
  return { lines, paras, keywords: [...new Set(keywords)], tips: [...new Set(tips)], sections: sectionsOut };
}

/* ---------- 프롬프트 ---------- */
export function buildPrompt(product: { id: string; title: string }, people: Person[], facts: Facts, titles: string[], meta: OrderMeta, now = new Date()) {
  const system = `당신은 사주 서비스 "달새김사주"의 풀이 작가 "달새김"이다.
독자는 20~30대 여성이 중심. 다정하고 세련된 해요체(~해요, ~예요). 과장된 신비주의·공포 금지, 쉬운 말, 한 문단 3~5문장.
장마다 근거(어떤 기운·어떤 달 때문인지)를 한 줄 넣어 "내 얘기 같다"는 느낌을 준다. 아래 '계산된 사실'의 숫자·달·키워드와 반드시 일치하게 쓴다(새 숫자를 지어내지 않는다).
단정 금지(죽음·이혼 확정·파산·큰 병), 의료 조언 금지, "반드시·무조건" 금지.
돈·투자 주제: 사주로 결과를 예측하지 않는다. 종목·매수·매도·수익 보장 표현 금지. 시장 이야기는 주어진 시장 노트 내용만 쓰고, 없으면 "공식 정보로 함께 확인"을 권한다.
다른 운세 사이트·책의 문장을 흉내 내지 말고 모두 새로 쓴다. 이름은 "OOO 님"으로 부른다. 희망적으로 마무리하고 실천 조언은 구체적으로.
출력은 JSON 하나만: {"intro": string, "chapters": [{"title": string, "say": string(한 줄 요약), "body": string(350~600자, 문단은 \\n\\n), "highlight": string(공유용 한 문장)}], "closing": {"title": "달새김이 남기는 말", "body": string, "tips": [실천 조언 3개]}}`;
  const user = `상품: ${product.title}
사람: ${people.map((p) => `${p.name}(${p.gender === 'M' ? '남' : '여'}, ${p.calendar === 'lunar' ? '음력' : '양력'} ${p.year}.${p.month}.${p.day}${p.hour == null ? ', 시간 모름' : ` ${p.hour}시`})`).join(' / ')}
오늘: ${now.toISOString().slice(0, 10)}${meta?.q ? `\n고민: ${meta.q}` : ''}${meta?.mbti ? `\nMBTI: ${meta.mbti}` : ''}
계산된 사실:
${facts.lines.map((l) => `- ${l}`).join('\n')}
참고 문장(그대로 베끼지 말고 소화해서): ${facts.paras.slice(0, 8).join(' ')}
장 목록(이 순서·제목 그대로): ${titles.map((t, i) => `${i + 1}. ${t}`).join(' / ')}`;
  return { system, user };
}

/* ---------- 엔진 풀이(AI 없이) ---------- */
export function engineContent(product: { id: string; title: string }, people: Person[], facts: Facts): ReadingContent {
  const titles = chaptersFor(product.id);
  const name = people[0]?.name ?? '고객';
  // 장별 문단: 상품이 장 구성을 직접 준 경우(sections) 그대로, 아니면 고르게 나눈다
  const base = Math.floor(facts.paras.length / titles.length), extra = facts.paras.length % titles.length;
  const starts = titles.map((_, i) => i * base + Math.min(i, extra));
  const chapters = titles.map((title, i) => {
    const chunk = facts.sections?.[i] ?? facts.paras.slice(starts[i], starts[i] + base + (i < extra ? 1 : 0));
    const body = (chunk.length ? chunk : facts.paras.slice(0, 2)).join('\n\n');
    return { id: `c${i + 1}`, title, say: facts.keywords[i % facts.keywords.length] ?? title, body: `${name} 님, ${body}`, highlight: (chunk[0] ?? body).split(/(?<=요\.)\s/)[0] };
  });
  return {
    productId: product.id, title: product.title, generatedBy: 'engine',
    intro: `${name} 님의 사주와 올해의 흐름을 바탕으로 '${product.title}'을 정리했어요. 숫자와 시기는 무료 요약과 같은 계산에서 나왔어요.`,
    chapters,
    closing: { title: '달새김이 남기는 말', body: `오늘 읽은 흐름을 기록해 두면, 몇 달 뒤 실제로 어땠는지 함께 돌아볼 수 있어요. ${name} 님의 시간이 차곡차곡 새겨지기를 바라요.`, tips: facts.tips.slice(0, 3) },
  };
}

/* ---------- AI 호출 ---------- */
export const liveAI = () => process.env.READING_AI === 'live' && !!process.env.ANTHROPIC_API_KEY && !!process.env.ANTHROPIC_MODEL;
const KRW_PER_USD = 1400;
export async function callClaude(system: string, messages: { role: 'user' | 'assistant'; content: string }[], http: typeof fetch, opts: { model?: string; maxTokens?: number } = {}) {
  const r = await http('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: opts.model ?? process.env.ANTHROPIC_MODEL, max_tokens: opts.maxTokens ?? 8000, system, messages }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) throw new Error(`AI 호출 실패 ${r.status}`);
  const j = (await r.json()) as any;
  const text = (j.content ?? []).map((c: any) => c.text ?? '').join('');
  return { text, tokensIn: j.usage?.input_tokens ?? 0, tokensOut: j.usage?.output_tokens ?? 0 };
}
export const parseJson = (text: string) => JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
const rate = () => ({ inp: +(process.env.AI_PRICE_IN_PER_M ?? 3), out: +(process.env.AI_PRICE_OUT_PER_M ?? 15) });
export const costKrwOf = (tin: number, tout: number) => Math.round(((tin * rate().inp + tout * rate().out) / 1e6) * KRW_PER_USD);

export async function generateReading(product: { id: string; title: string }, people: Person[], opts: { meta?: OrderMeta; market?: { body: string; flow: number[] | null } | null; http?: typeof fetch; now?: Date } = {}) {
  const ps = people.length ? people : [{ name: '달님', gender: 'F', year: 1995, month: 5, day: 15, calendar: 'solar', hour: null } as Person];
  const sajus = ps.map(sajuOfP);
  const facts = buildFacts(product.id, ps, sajus, opts.meta ?? null, opts.market ?? null, opts.now);
  const titles = chaptersFor(product.id);
  if (!liveAI()) { const content = engineContent(product, ps, facts); return { content: { ...content, facts: facts.lines }, tokensIn: 0, tokensOut: 0, costKrw: 0, issues: [] as string[] }; }
  const half = Math.ceil(titles.length / 2);
  let tokensIn = 0, tokensOut = 0, intro = '';
  const chapters: Chapter[] = [];
  let closing: Closing = { title: '달새김이 남기는 말', body: '', tips: [] };
  for (const [k, part] of [titles.slice(0, half), titles.slice(half)].entries()) {
    const { system, user } = buildPrompt(product, ps, facts, part, opts.meta ?? null, opts.now);
    const note = k === 0 ? '\n이번에는 intro 와 위 장들만 쓰고 closing 은 {"title":"","body":"","tips":[]}.' : '\n이번에는 위 장들과 closing 만 쓰고 intro 는 빈 문자열.';
    let res;
    for (let attempt = 0; ; attempt++) {
      try { const c = await callClaude(system, [{ role: 'user', content: user + note }], opts.http ?? fetch); res = { json: parseJson(c.text), ...c }; break; } catch (e) { if (attempt >= 2) throw e; }
    }
    tokensIn += res.tokensIn; tokensOut += res.tokensOut;
    if (k === 0) intro = res.json.intro ?? ''; else if (res.json.closing?.body) closing = { title: res.json.closing.title || closing.title, body: res.json.closing.body, tips: res.json.closing.tips ?? [] };
    for (const c of res.json.chapters ?? []) chapters.push({ id: `c${chapters.length + 1}`, title: c.title, say: c.say, body: c.body, highlight: c.highlight });
  }
  const content: ReadingContent = { productId: product.id, title: product.title, intro, chapters, closing, facts: facts.lines, generatedBy: 'ai' };
  return { content, tokensIn, tokensOut, costKrw: costKrwOf(tokensIn, tokensOut), issues: checkQuality(content, ps.map((p) => p.name), titles) };
}

/* ---------- 워커: 3초마다 대기 풀이를 최대 3개씩 ---------- */
export function startReadingWorker(db: Db, log: { warn: (m: string) => void }, http?: typeof fetch) {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await db.update(S.readings).set({ status: 'queued' }).where(and(eq(S.readings.status, 'generating'), lt(S.readings.createdAt, new Date(Date.now() - 600_000))));
      const list = await db.select().from(S.readings).where(eq(S.readings.status, 'queued')).limit(3);
      if (list.length) await db.update(S.readings).set({ status: 'generating' }).where(inArray(S.readings.id, list.map((x) => x.id)));
      await Promise.all(list.map((r) => runOne(db, r, http).catch((e) => log.warn(`[reading] ${r.id} 실패: ${e.message}`))));
    } finally { busy = false; }
  };
  const t = setInterval(tick, 3000);
  t.unref?.();
  return { tick, stop: () => clearInterval(t) };
}

export async function latestMarket(db: Db, now = new Date()) {
  const y = kstParts(now).year;
  const [n] = await db.select().from(S.marketNotes).where(and(eq(S.marketNotes.year, y), eq(S.marketNotes.published, true))).orderBy(desc(S.marketNotes.updatedAt)).limit(1);
  return n ? { title: n.title, body: n.body, flow: (n.flow as number[] | null) ?? null, month: n.month, updatedAt: n.updatedAt } : null;
}

export async function runOne(db: Db, r: typeof S.readings.$inferSelect, http?: typeof fetch) {
  const [p] = await db.select().from(S.products).where(eq(S.products.id, r.productId));
  const [o] = await db.select().from(S.orders).where(eq(S.orders.id, r.orderId));
  const ids = (r.profileId ?? '').split('+').filter(Boolean);
  const profs = ids.length ? await db.select().from(S.profiles).where(inArray(S.profiles.id, ids)) : [];
  const people: Person[] = ids.map((id) => profs.find((x) => x.id === id)).filter(Boolean).map((x: any) => ({
    name: x.name, gender: x.gender, year: x.birthYear, month: x.birthMonth, day: x.birthDay, calendar: x.calendar, leap: x.leap, hour: x.birthHour,
  }));
  try {
    const market = r.productId === 'money_invest' || r.productId === 'money_pack' ? await latestMarket(db) : null;
    const g = await generateReading({ id: r.productId, title: p?.title ?? r.productId }, people, { meta: (o?.meta as OrderMeta) ?? null, market, http });
    await db.update(S.readings).set({
      status: 'done', content: { ...g.content, issues: g.issues } as any, model: g.content.generatedBy === 'ai' ? process.env.ANTHROPIC_MODEL ?? null : 'engine',
      tokensIn: g.tokensIn, tokensOut: g.tokensOut, costKrw: g.costKrw, doneAt: new Date(),
    }).where(eq(S.readings.id, r.id));
  } catch (e) {
    await db.update(S.readings).set({ status: 'failed' }).where(eq(S.readings.id, r.id));
    throw e;
  }
}
