// 유료 풀이 생성 — 결제 완료 → readings(queued) → 워커가 생성 → done.
// 1) 엔진·콘텐츠 계산으로 "사실"(지수·좋은 달·키워드·성향)을 먼저 만든다 → 무료 요약과 유료 풀이 숫자가 항상 같다.
// 2) READING_AI=live + ANTHROPIC_API_KEY + ANTHROPIC_MODEL 이면 AI 가 그 사실을 바탕으로 문장을 쓴다(비용 보고·승인 후 켬).
//    꺼져 있으면 계산 결과와 문구 DB 로 만든 "엔진 풀이"(generatedBy: engine)로 흐름이 끝까지 돈다.
import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { calcSaju, branchRelations, kstParts, type SajuResult } from '@dalsaegim/engine';
import {
  moneyFlow, newYearPreview, sajuMap, sajuMbti, pathResult, nextMonths, monthFortune, todayFortune, toRanges, MONEY_KINDS, type MoneyKind,
  wealthReport, marriageReport, careerReport, tarotReading, parseCards, monthsLabel, lifetimeReport, type Basis, type SajuTable,
} from '@dalsaegim/content';
import R from '../../../../packages/content/data/reading.json' with { type: 'json' };
import { generateLong, longOn } from './long.ts';
import { schema as S, type Db } from '../../db/index.ts';

export type Chapter = { id: string; title: string; say: string; body: string; highlight: string; points?: string[]; basis?: Basis[]; part?: number; partTitle?: string };
/** 화면에 그릴 계산 자료 — 사주 구성표·3년 흐름·행운(프리미엄 재물 리포트) */
export type Visual = { table: SajuTable; flow?: { points: { y: number; m: number; score: number }[]; top: { y: number; m: number; score: number }[]; low: { y: number; m: number; score: number }[] }; lucky?: Record<string, unknown>; flowAt?: number; luckyAt?: number;
  // 정통사주: 오행 막대 · 평생 대운표 · 앞으로 10년 흐름
  elements?: { el: string; pct: number }[]; elementsAt?: number; daeun?: { text: string; hanja: string; fromAge: number; toAge: number; fromYear: number; toYear: number; theme: string; score: number; now: boolean }[]; daeunAt?: number; years?: { y: number; score: number }[]; yearsAt?: number;
  seun?: { y: number; gz: string; sip: string; score: number; love: number; work: number; wealth: number }[]; seunAt?: number; wolun?: { y: number; m: number; gz: string; sip: string; love: number; work: number; wealth: number }[]; wolunAt?: number };
export type Closing = { title: string; body: string; tips: string[] };
/** 결과 맨 위 요약 카드(대표님 V88 리포트 틀) — 막대는 엔진이 계산한 지수, 단계는 실제 좋은 달·날 */
export type Summary = { tone: 'love' | 'money' | 'saju' | 'time'; headline: string; lead: string; metrics: { label: string; score: number; note?: string }[]; steps: { label: string; text: string }[]; action: string; cards?: { id: number; rev: boolean }[] };
export type ReadingContent = { productId: string; title: string; intro: string; chapters: Chapter[]; closing: Closing; facts?: unknown; visual?: Visual; summary?: Summary; who?: string[]; generatedBy: 'ai' | 'engine' };
export type Person = { name: string; gender: 'M' | 'F'; year: number; month: number; day: number; calendar: 'solar' | 'lunar'; leap?: boolean; hour?: number | null };
export type OrderMeta = { cat?: string; sub?: string; q?: string; mbti?: string; ym?: string; cards?: string } | null;

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
type ChapterMeta = { points: string[]; basis: Basis[]; say: string; highlight: string };
type Facts = { lines: string[]; paras: string[]; keywords: string[]; tips: string[]; sections?: string[][]; meta?: ChapterMeta[]; visual?: Visual; summary?: Summary };
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
  let summaryOut: Summary | undefined;
  let metaOut: ChapterMeta[] | undefined;
  let visual: Visual | undefined;
  const k = kindOf(productId);
  if (k) money(k);
  else if (productId === 'money_pack') MONEY_KINDS.forEach(money);
  // 프리미엄 재물 리포트(재물 흐름·돈의 흐름 4종) — 7장 + 사주 구성표 근거 + 3년 흐름 + 행운
  if (productId === 'money_wealth' || productId === 'money_pack') {
    const rep = wealthReport(s, p0.name, id, now);
    const POSL: Record<string, string> = { hour: '시주', day: '일주', month: '월주', year: '연주' };
    const cellOf = (b: Basis) => { const c = rep.table.find((x) => x.key === b.pos); if (!c || c.empty) return ''; return b.part === 'stem' ? `${POSL[b.pos]} 천간 ${c.stem.han}(${c.stem.sip})` : b.part === 'branch' ? `${POSL[b.pos]} 지지 ${c.branch.han}(${c.branch.sip}·${c.shinsal}${c.gwiin.length ? `·${c.gwiin.join('·')}` : ''})` : `${POSL[b.pos]} 전체`; };
    lines.push(`사주 구성표: ${rep.table.map((c) => (c.empty ? `${c.label} 모름` : `${c.label} ${c.stem.han}${c.branch.han}(천간 ${c.stem.sip}/지지 ${c.branch.sip}, ${c.stage}, ${c.shinsal}${c.gwiin.length ? `, ${c.gwiin.join('·')}` : ''})`)).join(' / ')}`,
      `3년 재물 흐름 강한 시기 TOP3: ${rep.flow.top.map((x) => `${x.y}년 ${x.m}월(${x.score}점)`).join(', ')} / 낮은 시기: ${rep.flow.low.map((x) => `${x.y}년 ${x.m}월`).join(', ')}`,
      `행운(재미): 색 ${rep.lucky.color} · 숫자 ${rep.lucky.number.join('·')} · 방향 ${rep.lucky.direction} · 모양 ${rep.lucky.shape} · 물건 ${rep.lucky.item}`,
      ...rep.chapters.map((c, i) => `${i + 1}장 근거 표시: ${c.basis.length ? c.basis.map((b) => `${'①②③'[b.n - 1]} ${cellOf(b)}`).join(', ') : '없음'} (본문에서 같은 번호로 가리킬 것)`));
    sectionsOut = rep.chapters.map((c) => c.paras);
    if (productId === 'money_pack' && market) sectionsOut[3] = [...sectionsOut[3].slice(0, 3), `달새김이 보는 올해의 시장 이야기: ${market.body}`, sectionsOut[3][3]];
    metaOut = rep.chapters.map((c) => ({ points: c.points, basis: c.basis, say: c.say, highlight: c.highlight }));
    visual = { table: rep.table, flow: rep.flow, lucky: rep.lucky, flowAt: 2, luckyAt: 6 };
    keywords = [...rep.keywords, ...keywords];
  }
  else if (productId === 'lifetime') {
    // 정통사주(사주지도 전체 풀이) — 9장 각각 제목에 맞는 내용 + 원국표·오행·평생 대운·10년 흐름·행운(10/23 보충)
    const rep = lifetimeReport(s, p0.name, id, now);
    lines.push(...rep.facts);
    sectionsOut = rep.chapters.map((c) => c.paras);
    metaOut = rep.chapters.map((c) => ({ points: c.points, basis: c.basis, say: c.say, highlight: c.highlight }));
    visual = { table: rep.table, elements: rep.elements, elementsAt: 1, daeun: rep.daeun, daeunAt: 6, years: rep.years, yearsAt: 7, lucky: rep.lucky, luckyAt: 8 };
    keywords = [...rep.keywords, ...keywords];
  }
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
      // 월간운세 — 고객이 고른 달(meta.ym, 없으면 이번 달). 그 달의 날짜별 흐름을 초순·중순·하순으로
      const k0 = kstParts(now);
      const [yy, mm] = meta?.ym ? meta.ym.split('-').map(Number) : [k0.year, k0.month];
      const ref = new Date(Date.UTC(yy, mm - 1, 15, 3));
      const mf = monthFortune(s, ref, id);
      const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
      const days = Array.from({ length: last }, (_, i) => ({ d: i + 1, t: todayFortune(s, new Date(Date.UTC(yy, mm - 1, i + 1, 3)), id).total }));
      const topD = (xs: typeof days, n: number) => [...xs].sort((a, b) => b.t - a.t).slice(0, n).map((x) => x.d).sort((a, b) => a - b);
      const lowD = (xs: typeof days, n: number) => [...xs].sort((a, b) => a.t - b.t).slice(0, n).map((x) => x.d).sort((a, b) => a - b);
      const best = topD(days, 3), low = lowD(days, 3);
      const parts = [days.slice(0, 10), days.slice(10, 20), days.slice(20)];
      const avgT = (xs: typeof days) => Math.round(xs.reduce((a, x) => a + x.t, 0) / xs.length);
      const FL: Record<string, string> = { love: '연애·관계', work: '일', wealth: '재물', health: '몸과 마음' };
      const fl = Object.entries(mf.fields).sort((a, b) => b[1] - a[1]);
      const label = `${yy}년 ${mm}월`;
      lines.push(`${label}: 지수 ${mf.total} / 분야 ${fl.map(([k, v]) => `${FL[k] ?? k} ${v}`).join(', ')} / 좋은 날 ${best.join(', ')}일 / 조심할 날 ${low.join(', ')}일 / 키워드 ${mf.keyword}`);
      const partLine = (xs: typeof days, nm: string) => { const a = avgT(xs), b = topD(xs, 2), w = lowD(xs, 1); return [`${nm}의 평균 흐름은 ${a}점이에요. ${a >= 70 ? '기운이 밝게 열리는 구간이라 미뤄 둔 일을 시작하기 좋아요.' : a >= 60 ? '잔잔하게 이어지는 구간이라 하던 일을 차분히 다지기 좋아요.' : '한 템포 쉬어 가는 구간이라 무리한 약속은 줄이는 게 좋아요.'}`, `이 구간에서 가장 좋은 날은 ${b.join('·')}일이고, ${w[0]}일에는 컨디션과 말에 조금 더 신경 써 주세요.`]; };
      sectionsOut = [
        [`${p0.name} 님의 ${label} 흐름은 ${mf.total}점이에요. ${mf.line}`, `이달의 키워드는 '${mf.keyword}'예요. 분야별로는 ${FL[fl[0][0]] ?? fl[0][0]}(${fl[0][1]}점)의 기운이 가장 밝고, ${FL[fl[fl.length - 1][0]] ?? ''}(${fl[fl.length - 1][1]}점)은 조금 아껴 써야 해요.`],
        partLine(parts[0], '1~10일'), partLine(parts[1], '11~20일'), partLine(parts[2], `21~${last}일`),
        [`${label}에 기운이 가장 좋은 날은 ${best.join(', ')}일이에요. 중요한 약속·고백·계약·면접처럼 마음을 정하는 일은 이 날에 두면 좋아요.`, `속도를 늦추면 좋은 날은 ${low.join(', ')}일이에요. 이 날에는 큰 결정보다 정리와 휴식을 먼저 챙겨 보세요.`, map.elementAdvice],
      ];
      keywords = [mf.keyword, ...keywords];
      summaryOut = { tone: 'time', headline: `${label}, '${mf.keyword}'의 한 달`, lead: mf.line,
        metrics: fl.slice(0, 3).map(([k, v]) => ({ label: FL[k] ?? k, score: v })),
        steps: [['초순 1~10일', parts[0]], ['중순 11~20일', parts[1]], [`하순 21~${last}일`, parts[2]]].map(([l, xs]) => ({ label: l as string, text: `좋은 날 ${topD(xs as typeof days, 2).join('·')}일 · 흐름 ${avgT(xs as typeof days)}점` })),
        action: `${best[0]}일을 달력에 표시하고, 미뤄 둔 일 하나를 그날로 옮겨 보세요.` };
    }
  } else if (productId === 'love_flow' || productId === 'reunion') {
    // 연애·재회 — 사랑을 깊게(대표님 요청: 2030 여성 타깃, 사랑 상품 특히 신경)
    const nm = nextMonths(s, 'love', id, now);
    const pm = nextMonths(s, 'partner', id, now);
    const top = (xs: typeof nm, n: number) => [...xs].sort((a, b) => b.score - a.score).slice(0, n).map((x) => x.month);
    const low = (xs: typeof nm, n: number) => [...xs].sort((a, b) => a.score - b.score).slice(0, n).map((x) => x.month);
    const good = toRanges(top(nm, 3)), careful = toRanges(low(nm, 2));
    const meet = toRanges(top(pm, 2)), rest = toRanges(low(pm, 2));
    const now3 = nm.slice(0, 3);
    const trend = now3[2].score > now3[0].score + 4 ? '조금씩 올라가는' : now3[2].score < now3[0].score - 4 ? '잠시 숨을 고르는' : '잔잔하게 이어지는';
    const loveArea = map.areas.find((a) => a.id === 'love')!.line;
    const EL: Record<string, string> = { 목: '따뜻하게 이끌어 주고 성장을 응원하는', 화: '밝고 표현이 솔직한', 토: '듬직하고 약속을 잘 지키는', 금: '단정하고 기준이 분명한', 수: '깊이 들어 주고 마음을 잘 읽는' };
    lines.push(`연애 흐름(앞으로 12달): 좋은 달 ${good} / 신중한 달 ${careful} / 관계가 가까워지는 달 ${meet} / 거리를 두면 좋은 달 ${rest} / 이번 석 달 ${trend} 흐름`);
    if (productId === 'love_flow') {
      sectionsOut = [
        [map.dayMaster.love, loveArea, `${p0.name} 님은 마음을 정하면 깊어지는 편이라, 시작의 속도보다 '편안함'을 먼저 확인할 때 연애가 오래가요.`],
        [`앞으로 석 달, ${p0.name} 님의 연애 흐름은 ${trend} 모습이에요. 이번 달 연애 지수는 ${nm[0].score}점, 석 달 뒤에는 ${now3[2].score}점이에요.`, `지금 만나는 사람이 있다면 큰 결정보다 일상의 대화를 늘리고, 혼자라면 새로운 자리에 한 번씩 나가 보는 것만으로 충분해요.`],
        [`앞으로 열두 달 중 마음이 닿기 쉬운 달은 ${good}이에요. 고백·관계를 정리하는 대화·소개처럼 중요한 순간은 이 달에 두면 좋아요.`, `${careful}에는 마음이 쉽게 흔들리거나 오해가 생기기 쉬워요. 이때는 결론을 미루고 듣는 쪽을 맡아 보세요.`],
        [`관계를 지키는 열쇠는 '${map.need}' 기운이에요. ${map.elementAdvice}`, `서운함은 쌓아 두기보다 좋은 달에 짧고 부드럽게 꺼내 보세요. 다툼이 있었다면 '누가 맞나'보다 '어떻게 하고 싶나'를 먼저 말하는 게 좋아요.`],
        [`${p0.name} 님에게 잘 맞는 사람은 ${EL[map.need] ?? '마음을 잘 알아주는'} 사람이에요. 부족한 ${map.need} 기운을 채워 주는 사람 곁에서 ${p0.name} 님이 가장 편안해져요.`, `새로운 인연이 들어오기 좋은 달은 ${meet}이에요. 이 시기에는 지인의 소개나 오래 알던 사람에게서 인연이 시작되기 쉬워요.`],
      ];
    } else {
      sectionsOut = [
        [map.dayMaster.love, `사주로 보면 ${p0.name} 님은 관계에서 '${map.strongest}' 기운이 강하게 드러나요. 그래서 마음이 깊은 만큼, 서운함도 오래 남는 편이에요.`, loveArea],
        [`두 사람의 흐름이 다시 가까워지기 쉬운 달은 ${meet}이고, 연애 기운 전체가 살아나는 달은 ${good}이에요. 다시 연락해 보고 싶다면 이 시기가 가장 자연스러워요.`, `${rest}에는 관계의 기운이 잠시 낮아져요. 이때 보내는 연락은 마음과 다르게 전해지기 쉬워요.`],
        [`연락하기 전에 '다시 만나서 무엇을 다르게 하고 싶은지' 한 줄로 적어 보세요. 그 한 줄이 분명할수록 대화가 다시 이어지기 쉬워요.`, `첫 연락은 긴 고백보다 짧은 안부가 좋아요. 답이 늦어도 ${careful}에는 재촉하지 말고 기다려 주세요.`],
        [`같은 이유로 세 번 이상 헤어졌거나, 만나는 동안 내가 계속 작아졌다면 그건 '때'보다 '관계'의 문제일 수 있어요.`, `${careful}에 마음이 유난히 무겁다면 정리의 신호일 수 있어요. 정리도 사랑의 한 방식이에요.`],
        [`어떤 선택을 하든 먼저 ${p0.name} 님을 지켜 주세요. 채우면 좋은 기운은 '${map.need}'이에요. ${map.elementAdvice}`, `좋은 달(${good})에는 나를 위한 시간을 먼저 쓰세요. 나를 아끼는 사람에게 좋은 인연이 다시 찾아와요.`],
      ];
    }
    keywords = ['연애', '인연', ...keywords];
  } else if (productId === 'gunghap' || productId === 'adult_gunghap') {
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
    // 장 제목과 내용이 맞게 — 타고난 기운 / 만나는 방식 / 연애 / 일과 돈 / 균형
    const AX = ['에너지 방향(E·I)', '정보를 받는 방식(S·N)', '판단 기준(T·F)', '생활 리듬(J·P)'];
    const same = AX.filter((_, i) => mb.mbti[i] === mb.sajuType[i]);
    const diff = AX.filter((_, i) => mb.mbti[i] !== mb.sajuType[i]);
    sectionsOut = [
      [`${p0.name} 님은 ${map.dayMaster.image}의 기운을 타고났어요. ${map.dayMaster.line}`, `지금 고른 MBTI는 ${mb.mbti}, '${mb.info.nick}'이에요. 사주로 읽은 성향은 ${mb.sajuType}에 가까워요.`],
      [`사주와 MBTI는 네 가지 축 가운데 ${same.length}가지가 같은 쪽을 가리켜요. ${mb.title}. ${mb.line}`, same.length ? `${same.join('·')}은 사주와 지금의 성향이 같은 쪽을 가리켜요. 이 부분은 ${p0.name} 님의 가장 단단한 강점이에요.` : '네 가지 축이 모두 사주와 다르게 나타나요. 타고난 기질과 지금의 모습 사이에 오래 다듬어 온 노력이 있다는 뜻이에요.', diff.length ? `${diff.join('·')}은 서로 다르게 나타나요. 상황에 따라 다른 모습이 나오는 건 자연스러운 일이에요.` : ''].filter(Boolean),
      [mb.love, map.areas.find((a) => a.id === 'love')!.line],
      [mb.work, mb.money, map.areas.find((a) => a.id === 'money')!.line],
      [`채우면 좋은 기운은 '${map.need}'이에요. ${map.elementAdvice}`, `${mb.info.traits.join('·')}이 ${p0.name} 님의 무기예요. 지칠 때는 사주가 말하는 본래의 리듬(${mb.sajuType})으로 잠시 돌아가 보세요.`],
    ];
  } else if (productId === 'marriage') {
    const r = marriageReport(s, p0.name, id, now);
    lines.push(...r.facts);
    sectionsOut = r.sections;
    keywords = ['결혼', '배우자', ...keywords];
    summaryOut = { tone: 'love', headline: `결혼의 기운이 가까워지는 때 · ${r.good}`, lead: r.sections[1][0],
      metrics: r.metrics, steps: [{ label: '인연이 들어오는 달', text: r.meet }, { label: '약속·결정하기 좋은 달', text: r.good }, { label: '서두르지 않을 달', text: r.careful }], action: r.action };
  } else if (productId === 'career') {
    const r = careerReport(s, p0.name, id, now);
    lines.push(...r.facts);
    sectionsOut = r.sections;
    keywords = ['일', '진로', ...keywords];
    summaryOut = { tone: 'money', headline: `이직·취업이 열리는 달 · ${r.good}`, lead: r.sections[0][0], metrics: r.metrics, steps: r.steps, action: r.action };
  } else if (productId === 'tarot_some') {
    const cards = parseCards(meta?.cards) ?? parseCards('6,47,19')!;
    const r = tarotReading(cards, p0.name, s, id, now);
    lines.push(...r.facts);
    sectionsOut = r.sections;
    keywords = cards.map((d) => (d.rev ? d.card.rkw : d.card.kw));
    summaryOut = { tone: 'love', headline: r.verdict, lead: `세 장의 흐름: ${keywords.join(' → ')}`, metrics: r.metrics,
      steps: [{ label: '지금 분위기', text: r.verdict }, { label: '마음이 닿기 쉬운 달', text: r.good }, { label: '서두르지 않을 달', text: r.careful }], action: r.action,
      cards: cards.map((d) => ({ id: d.card.id, rev: d.rev })) };
  }
  // 요약 카드가 따로 없는 상품 — 엔진 지수(앞으로 12달 평균)와 실제 좋은 달로 채운다
  if (!summaryOut) {
    const M = (d: Parameters<typeof nextMonths>[1]) => nextMonths(s, d, id, now);
    const avg6 = (xs: { score: number }[]) => Math.round(xs.slice(0, 6).reduce((a, x) => a + x.score, 0) / 6);
    const thirds = (xs: { year: number; month: number; score: number }[], labels: [string, string, string]) =>
      [xs.slice(0, 4), xs.slice(4, 8), xs.slice(8, 12)].map((g, i) => { const b = [...g].sort((x, y) => y.score - x.score)[0]; return { label: labels[i], text: `${monthsLabel([b], now)}에 기운이 가장 밝아요` }; });
    const goodOf = (xs: { year: number; month: number; score: number }[], n = 3) => monthsLabel([...xs].sort((a, b) => b.score - a.score).slice(0, n), now);
    const action = tips[0] ?? map.elementAdvice;
    if (productId === 'love_flow' || productId === 'reunion' || productId === 'gunghap' || productId === 'adult_gunghap') {
      const love = M('love'), partner = M('partner'), growth = M('growth'), family = M('family');
      const blend = love.map((x, i) => ({ ...x, score: Math.round((x.score + partner[i].score) / 2) }));
      const L = productId === 'reunion' ? [['다시 닿을 기운', partner], ['마음의 온도', love], ['나를 지키는 힘', growth]] as const
        : productId === 'love_flow' ? [['연애 기운', love], ['관계의 깊이', partner], ['나를 아끼는 힘', growth]] as const
          : [['끌림', love], ['관계의 리듬', partner], ['함께하는 안정', family]] as const;
      summaryOut = { tone: 'love', headline: `마음이 닿기 쉬운 달 · ${goodOf(blend)}`, lead: map.dayMaster.love,
        metrics: L.map(([label, xs]) => ({ label, score: avg6(xs) })), steps: thirds(blend, ['가까운 넉 달', '그다음 넉 달', '한 해의 끝 무렵']), action: sectionsOut?.[3]?.[1] ?? action };
    } else if (productId === 'newyear_2027') {
      const ny = newYearPreview(s, 2027, id);
      const b = (a: number, z: number) => [...ny.months.slice(a - 1, z)].sort((x, y) => y.score - x.score)[0].month;
      summaryOut = { tone: 'time', headline: `2027년, '${ny.keyword}'이 열쇠가 되는 해`, lead: `한 해 총운 ${ny.total}점 · 가장 기운이 좋은 달 ${ny.good}`,
        metrics: [...ny.fields].sort((a, z) => z.score - a.score).slice(0, 3).map((f) => ({ label: f.label, score: f.score })),
        steps: [{ label: '1~4월', text: `${b(1, 4)}월에 시작의 기운이 가장 밝아요` }, { label: '5~8월', text: `${b(5, 8)}월에 힘이 가장 크게 붙어요` }, { label: '9~12월', text: `${b(9, 12)}월에 거두기 좋아요` }],
        action: `좋은 달(${ny.good})을 달력에 표시하고, 그때 할 일을 하나씩 미리 적어 두세요.` };
    } else if (productId.startsWith('money_')) {
      const kind = (kindOf(productId) ?? 'wealth') as MoneyKind;
      const f = moneyFlow(s, kind, year, id, { now });
      const fl = f.flow;
      summaryOut = { tone: 'money', headline: `${f.title}, ${f.headline}`, lead: f.summary, metrics: f.subs.slice(0, 3),
        steps: [[1, 4], [5, 8], [9, 12]].map(([a, z]) => { const b = [...fl.slice(a - 1, z)].sort((x, y) => y.score - x.score)[0]; return { label: `${a}~${z}월`, text: `${b.month}월에 흐름이 가장 좋아요` }; }),
        action: f.tips[0] ?? action };
    } else {
      const work = M('work'), wealth = M('wealth'), love = M('love');
      const best = work.map((x, i) => ({ ...x, score: Math.round((x.score + wealth[i].score + love[i].score) / 3) }));
      const mbtiMatch = productId === 'mbti_deep' && meta?.mbti ? sajuMbti(s, meta.mbti, id).match : null;
      summaryOut = { tone: 'saju', headline: `${map.dayMaster.title}`, lead: map.dayMaster.line,
        metrics: [...(mbtiMatch != null ? [{ label: '사주·MBTI 일치도', score: mbtiMatch }] : []), { label: '일과 성취', score: avg6(work) }, { label: '재물의 흐름', score: avg6(wealth) }, { label: '관계와 사랑', score: avg6(love) }].slice(0, 3),
        steps: map.period.now ? [{ label: '지금의 큰 흐름', text: `${map.period.now.fromYear}~${map.period.now.toYear}년 · ${map.period.now.theme}` }, ...(map.period.next ? [{ label: '다음 큰 흐름', text: `${map.period.next.fromYear}년부터 · ${map.period.next.theme}` }] : []), { label: '앞으로 좋은 달', text: goodOf(best) }]
          : thirds(best, ['가까운 넉 달', '그다음 넉 달', '한 해의 끝 무렵']),
        action: `채우면 좋은 기운은 '${map.need}'이에요. ${map.elementAdvice}` };
    }
  }
  // 공통 — 사주지도
  paras.push(...map.areas.map((a) => `${a.label}: ${a.line}`));
  if (map.period.now) paras.push(`지금은 ${map.period.now.fromYear}~${map.period.now.toYear}년 ${map.period.now.text} 대운, '${map.period.now.theme}'예요.${map.period.next ? ` 다음 ${map.period.next.fromYear}년부터는 '${map.period.next.theme}'로 이어져요.` : ''}`);
  return { lines, paras, keywords: [...new Set(keywords)], tips: [...new Set(tips)], sections: sectionsOut, meta: metaOut, visual, summary: summaryOut };
}

/* ---------- 프롬프트 ---------- */
export function buildPrompt(product: { id: string; title: string }, people: Person[], facts: Facts, titles: string[], meta: OrderMeta, now = new Date()) {
  const all = chaptersFor(product.id);
  const refs = facts.sections ? titles.map((t) => { const i = all.indexOf(t); return i >= 0 && facts.sections![i] ? `[${t}] ${facts.sections![i].join(' ')}` : ''; }).filter(Boolean).join('\n') : '';
  const system = `당신은 사주 서비스 "달새김사주"의 풀이 작가 "달새김"이다.
독자는 20~30대 여성이 중심. 다정하고 세련된 해요체(~해요, ~예요). 과장된 신비주의·공포 금지, 쉬운 말, 한 문단 3~5문장.
장마다 근거(어떤 기운·어떤 달 때문인지)를 한 줄 넣어(사실에 'N장 근거 표시'가 있으면 본문에 ①②③ 번호를 그대로 써서 사주 구성표의 그 자리를 가리킨다) "내 얘기 같다"는 느낌을 준다. 아래 '계산된 사실'의 숫자·달·키워드와 반드시 일치하게 쓴다(새 숫자를 지어내지 않는다).
단정 금지(죽음·이혼 확정·파산·큰 병), 의료 조언 금지, "반드시·무조건" 금지.
돈·투자 주제: 사주로 결과를 예측하지 않는다. 종목·매수·매도·수익 보장 표현 금지. 시장 이야기는 주어진 시장 노트 내용만 쓰고, 없으면 "공식 정보로 함께 확인"을 권한다.
다른 운세 사이트·책의 문장을 흉내 내지 말고 모두 새로 쓴다. 이름은 "OOO 님"으로 부른다. 희망적으로 마무리하고 실천 조언은 구체적으로.
출력은 JSON 하나만: {"intro": string, "chapters": [{"title": string, "say": string(한 줄 요약), "body": string(${product.id === 'lifetime' ? '600~900자' : '350~600자'}, 문단은 \\n\\n), "highlight": string(공유용 한 문장)}], "closing": {"title": "달새김이 남기는 말", "body": string, "tips": [실천 조언 3개]}}`;
  const user = `상품: ${product.title}
사람: ${people.map((p) => `${p.name}(${p.gender === 'M' ? '남' : '여'}, ${p.calendar === 'lunar' ? '음력' : '양력'} ${p.year}.${p.month}.${p.day}${p.hour == null ? ', 시간 모름' : ` ${p.hour}시`})`).join(' / ')}
오늘: ${now.toISOString().slice(0, 10)}${meta?.q ? `\n고민: ${meta.q}` : ''}${meta?.mbti ? `\nMBTI: ${meta.mbti}` : ''}
계산된 사실:
${facts.lines.map((l) => `- ${l}`).join('\n')}
참고 문장(그대로 베끼지 말고 소화해서): ${facts.paras.slice(0, 8).join(' ')}
장 목록(이 순서·제목 그대로): ${titles.map((t, i) => `${i + 1}. ${t}`).join(' / ')}${refs ? `\n장별 초안(계산으로 만든 내용 — 숫자·달·십성·대운은 그대로 살리고 문장은 새로 다듬어 더 깊게):\n${refs}` : ''}`;
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
    const m = facts.meta?.[i];
    return { id: `c${i + 1}`, title, say: m?.say ?? facts.keywords[i % facts.keywords.length] ?? title, body: m || body.startsWith(name) ? body : `${name} 님, ${body}`, highlight: m?.highlight ?? (chunk[0] ?? body).split(/(?<=요\.)\s/)[0], ...(m ? { points: m.points, basis: m.basis } : {}) };
  });
  return {
    productId: product.id, title: product.title, generatedBy: 'engine', ...(facts.visual ? { visual: facts.visual } : {}), ...(facts.summary ? { summary: facts.summary } : {}),
    intro: product.id === 'tarot_some' ? `${name} 님이 직접 고른 카드 3장의 해석에, 사주로 본 '마음이 닿기 쉬운 달'을 함께 묶었어요. 카드는 지금 이 순간의 분위기를 비추는 거울이에요.`
      : `${name} 님의 사주와 올해의 흐름을 바탕으로 '${product.title}'을 정리했어요. 숫자와 시기는 무료 요약과 같은 계산에서 나왔어요.`,
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

export async function generateReading(product: { id: string; title: string }, people: Person[], opts: { meta?: OrderMeta; market?: { body: string; flow: number[] | null } | null; http?: typeof fetch; now?: Date; onProgress?: (done: number, total: number) => Promise<void> | void } = {}) {
  const ym = product.id === 'month_detail' ? opts.meta?.ym : undefined;
  if (ym) product = { ...product, title: `${ym.slice(0, 4)}년 ${Number(ym.slice(5))}월 상세운세` }; // 고른 달이 제목에 보이게
  const ps = people.length ? people : [{ name: '달님', gender: 'F', year: 1995, month: 5, day: 15, calendar: 'solar', hour: null } as Person];
  const sajus = ps.map(sajuOfP);
  const facts = buildFacts(product.id, ps, sajus, opts.meta ?? null, opts.market ?? null, opts.now);
  const titles = chaptersFor(product.id);
  // 정통사주 A4 40장 — AI 가 켜져 있으면 26장 장편(long.ts), 꺼져 있으면 아래 9장 계산 풀이
  if (product.id === 'lifetime' && liveAI() && longOn()) {
    const g = await generateLong(product, ps, { http: opts.http, now: opts.now, onProgress: opts.onProgress });
    return { content: { ...g.content, ...(facts.summary ? { summary: facts.summary } : {}) } as ReadingContent, tokensIn: g.usage.in + g.usage.cacheWrite + g.usage.cacheRead, tokensOut: g.usage.out, costKrw: g.costKrw, issues: g.issues };
  }
  if (!liveAI() || product.id === 'tarot_some') { const content = engineContent(product, ps, facts); return { content: { ...content, who: ps.map((p) => p.name), facts: facts.lines }, tokensIn: 0, tokensOut: 0, costKrw: 0, issues: [] as string[] }; }
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
  // 근거 번호·소제목·그림 자료는 계산값 그대로 붙인다(AI 가 바꾸지 못하게)
  chapters.forEach((c, i) => { const m = facts.meta?.[i]; if (m) Object.assign(c, { points: m.points, basis: m.basis }); });
  const content: ReadingContent = { productId: product.id, title: product.title, intro, chapters, closing, who: ps.map((p) => p.name), facts: facts.lines, ...(facts.visual ? { visual: facts.visual } : {}), ...(facts.summary ? { summary: facts.summary } : {}), generatedBy: 'ai' };
  return { content, tokensIn, tokensOut, costKrw: costKrwOf(tokensIn, tokensOut), issues: checkQuality(content, ps.map((p) => p.name), titles) };
}

/* ---------- 워커: 3초마다 대기 풀이를 최대 3개씩 ---------- */
export function startReadingWorker(db: Db, log: { warn: (m: string) => void }, http?: typeof fetch) {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await db.update(S.readings).set({ status: 'queued' }).where(and(eq(S.readings.status, 'generating'), lt(S.readings.createdAt, new Date(Date.now() - 1_200_000))));
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
    const onProgress = async (done: number, total: number) => { await db.update(S.readings).set({ content: { progress: { done, total } } as any }).where(eq(S.readings.id, r.id)); };
    const g = await generateReading({ id: r.productId, title: p?.title ?? r.productId }, people, { meta: (o?.meta as OrderMeta) ?? null, market, http, onProgress });
    await db.update(S.readings).set({
      status: 'done', content: { ...g.content, issues: g.issues } as any, model: g.content.generatedBy === 'ai' ? process.env.ANTHROPIC_MODEL ?? null : 'engine',
      tokensIn: g.tokensIn, tokensOut: g.tokensOut, costKrw: g.costKrw, doneAt: new Date(),
    }).where(eq(S.readings.id, r.id));
  } catch (e) {
    await db.update(S.readings).set({ status: 'failed' }).where(eq(S.readings.id, r.id));
    throw e;
  }
}
