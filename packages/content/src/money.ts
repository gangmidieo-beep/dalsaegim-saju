// 돈의 흐름 시리즈 — 재물 · 사업 · 투자 · 부동산. 무료 요약(지수·월별 흐름·좋은/신중한 달·키워드)은 계산만으로.
// 투자운은 예측하지 않는다: 관리자가 쓴 시장 흐름(market) 과 개인 흐름을 나란히 보여 주는 참고 정보.
import { monthlyPillar, yearPillarOf, kstParts, type SajuResult } from '@dalsaegim/engine';
import { rawDims, toScore, bandOf, pick, pickN, ymd, needElement, LUCKY, hash, type Dim, type Band } from './core';
import M from '../data/money.json' with { type: 'json' };

export const MONEY_KINDS = ['wealth', 'business', 'invest', 'estate'] as const;
export type MoneyKind = (typeof MONEY_KINDS)[number];
export const MONEY_META = M.meta as Record<MoneyKind, { title: string; series: string; q: string; subs: [string, Dim][] }>;
// 대표 지수 = 차원 가중 평균
const MAIN: Record<MoneyKind, Partial<Record<Dim, number>>> = {
  wealth: { wealth: 0.5, income: 0.25, save: 0.25 },
  business: { expand: 0.4, work: 0.3, partner: 0.3 },
  invest: { invest: 0.5, risk: 0.3, wealth: 0.2 },
  estate: { buy: 0.3, rent: 0.2, move: 0.2, document: 0.3 },
};
const mix = (raw: Record<Dim, number>, w: Partial<Record<Dim, number>>) => Object.entries(w).reduce((s, [d, k]) => s + raw[d as Dim] * (k as number), 0);
const kstNoon = (y: number, m: number, d = 15) => new Date(Date.UTC(y, m - 1, d, 3));

export type MonthPoint = { month: number; score: number };
export function moneyFlow(saju: SajuResult, kind: MoneyKind, year: number, profileId: string, opts: { market?: number[] | null; now?: Date } = {}) {
  const seed = `${year}:${profileId}:${kind}`;
  const yp = yearPillarOf(kstNoon(year, 6));
  const yRaw = rawDims(saju, yp, `${seed}:y`, 0.2);
  const months = Array.from({ length: 12 }, (_, i) => {
    const mRaw = rawDims(saju, monthlyPillar(kstNoon(year, i + 1)), `${seed}:m${i}`, 0.25);
    const blend = Object.fromEntries(Object.keys(mRaw).map((d) => [d, yRaw[d as Dim] * 0.4 + mRaw[d as Dim] * 0.6])) as Record<Dim, number>;
    return { month: i + 1, raw: blend, score: toScore(mix(blend, MAIN[kind])) };
  });
  const avgRaw = (d: Dim) => months.reduce((s, m) => s + m.raw[d], 0) / 12;
  const score = toScore(mix(yRaw, MAIN[kind]) * 0.5 + months.reduce((s, m) => s + mix(m.raw, MAIN[kind]), 0) / 12 * 0.5);
  const band = bandOf(score);
  const sorted = [...months].sort((a, b) => b.score - a.score || a.month - b.month);
  const good = sorted.slice(0, 3).map((m) => m.month).sort((a, b) => a - b);
  const careful = sorted.slice(-3).map((m) => m.month).sort((a, b) => a - b);
  const subs = MONEY_META[kind].subs.map(([label, d]) => ({ label, score: toScore(yRaw[d] * 0.5 + avgRaw(d) * 0.5) }));
  const flow: MonthPoint[] = months.map(({ month, score }) => ({ month, score }));
  const now = opts.now ?? new Date();
  const curMonth = kstParts(now).year === year ? kstParts(now).month : null;
  const res = {
    kind, year, title: MONEY_META[kind].title, series: MONEY_META[kind].series,
    score, band, subs, flow, good, careful,
    headline: pick((M.headline as Record<MoneyKind, Record<Band, string[]>>)[kind][band], `${seed}:h`),
    summary: (M.summary as Record<MoneyKind, Record<Band, string>>)[kind][band],
    keywords: pickN((M.keywords as Record<MoneyKind, string[]>)[kind], 4, `${seed}:k`),
    tips: pickN((M.tips as Record<MoneyKind, string[]>)[kind], 3, `${seed}:t`),
    word: pick((M.word as Record<MoneyKind, string[]>)[kind], `${seed}:w`),
    yearPillar: yp,
    invest: kind === 'invest' ? investExtra(saju, flow, careful, opts.market ?? null, curMonth, seed) : null,
  };
  return res;
}
export type MoneyFlow = ReturnType<typeof moneyFlow>;

// 투자 성향: 원국 십신 분포로 안정·균형·신중·도전
export function investStyle(saju: SajuResult) {
  const c = saju.tenGods.counts as Record<string, number>;
  const careful = (c['정재'] ?? 0) + (c['정관'] ?? 0) + (c['정인'] ?? 0) + (c['편인'] ?? 0) * 0.8;
  const bold = (c['편재'] ?? 0) + (c['상관'] ?? 0) + (c['겁재'] ?? 0) + (c['편관'] ?? 0) * 0.6;
  const total = Math.max(1, careful + bold);
  const carePct = Math.round(35 + (careful / total) * 55);
  const boldPct = Math.round(35 + (bold / total) * 55);
  const style = carePct >= 72 ? '안정형' : boldPct >= 72 ? '도전형' : carePct > boldPct ? '신중형' : '균형형';
  return { style, carePct, boldPct, text: (M.styles as Record<string, string>)[style] };
}

function investExtra(saju: SajuResult, flow: MonthPoint[], careful: number[], market: number[] | null, curMonth: number | null, seed: string) {
  const median = [...flow].map((f) => f.score).sort((a, b) => a - b)[6];
  // 시장과 나의 흐름이 만나는 시기: 나의 흐름이 중간 이상 + 시장 흐름 55 이상인 달(시장 노트가 없으면 나의 흐름 상위 달)
  const ranked = [...flow].sort((a, b) => b.score - a.score);
  const meet = market
    ? flow.filter((f) => f.score >= median && (market[f.month - 1] ?? 0) >= 55).sort((a, b) => (b.score + (market[b.month - 1] ?? 0)) - (a.score + (market[a.month - 1] ?? 0))).slice(0, 4).map((f) => f.month)
    : ranked.slice(0, 3).map((f) => f.month);
  const meetRange = toRanges(meet.length ? meet : ranked.slice(0, 3).map((f) => f.month));
  let mood: 'careful' | 'steady' | 'good' = 'steady';
  if (curMonth) {
    const me = flow[curMonth - 1].score;
    const mk = market?.[curMonth - 1];
    if (careful.includes(curMonth) || (mk != null && mk < 45)) mood = 'careful';
    else if (me >= median && (mk == null || mk >= 55)) mood = 'good';
  }
  return {
    titles: M.invest_titles,
    style: investStyle(saju),
    market, meet: meetRange, curMonth, mood,
    thisMonth: pick((M.this_month as Record<string, string[]>)[mood], `${seed}:tm:${curMonth}`),
  };
}
// [3,4,5,9] → "3~5월, 9월"
export function toRanges(ms: number[]) {
  const s = [...new Set(ms)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(i === j ? `${s[i]}월` : `${s[i]}~${s[j]}월`);
    i = j;
  }
  return out.join(', ');
}

/* ---------- 오늘의 재물 보너스: 행운번호 ---------- */
// 1~45 중 6개. 같은 사람·같은 날·같은 회차는 항상 같은 번호. 하루 1회 "다른 번호 받기"(round 1).
export function luckyNumbers(saju: SajuResult, date: Date, profileId: string, round = 0) {
  const seed = `${ymd(date)}:${profileId}:lucky:${round}`;
  const el = needElement(saju);
  const ends = LUCKY[el].numbers.map((n) => n % 10);
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const favored = pool.filter((n) => ends.includes(n % 10));
  const first = favored[hash(`${seed}:f`) % favored.length]; // 나에게 필요한 기운의 숫자 하나는 꼭
  const rest = pool.filter((n) => n !== first).sort((a, b) => hash(`${seed}:${a}`) - hash(`${seed}:${b}`)).slice(0, 5);
  return {
    numbers: [first, ...rest].sort((a, b) => a - b),
    element: el,
    keywords: pickN(M.luck.keywords, 4, `${seed}:k`),
    word: pick(M.luck.word, `${ymd(date)}:${profileId}:w`),
    notice: '재미를 위한 행운번호예요. 당첨을 예측하거나 보장하지 않아요.',
  };
}
