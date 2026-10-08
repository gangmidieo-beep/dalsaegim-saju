// 내 고민의 길 — 고민 → 세부 상황 → 궁금한 핵심(3단계) → 사주 흐름 분석 → AI 상담·기록·관련 운세로 연결.
// 사주가 결정을 대신하지 않는다: "시기의 리듬"과 "참고할 점"을 보여 준다.
import { monthlyPillar, kstParts, type SajuResult } from '@dalsaegim/engine';
import { rawDims, toScore, bandOf, pickN, type Dim } from './core';
import { sajuMap } from './map';
import { toRanges } from './money';
import P from '../data/path.json' with { type: 'json' };

export type PathSub = { id: string; label: string; q: string[]; product: string; dim?: Dim; when?: string };
export type PathCat = { id: string; label: string; icon: string; dim: Dim; when: string; sub: PathSub[] };
export const PATH_WHEN = P.when as Record<'3' | '6' | '12', string>;
export type Horizon = 3 | 6 | 12;
export const PATHS = P.categories as PathCat[];
const DIM_LABEL: Partial<Record<Dim, string>> = { love: '연애', work: '일', wealth: '재물', expand: '사업', invest: '투자', move: '이사', spend: '지출', family: '가족', growth: '성장', health: '컨디션', partner: '관계' };
const MAP_AREA: Record<string, 'love' | 'money' | 'work' | 'family' | 'growth'> = { love: 'love', work: 'work', money: 'money', family: 'family', future: 'growth', self: 'growth' };
const V_DIM: Partial<Record<Dim, string>> = { love: '연애', work: '직장', wealth: '재물', expand: '사업', invest: '투자', move: '이사', spend: '재물', family: '가족', growth: '성장', health: '건강', partner: '관계' };
const V_SUB: Record<string, string> = { move: '이직', job: '취업', biz: '창업', exam: '합격', marry: '결혼', new: '인연', crush: '연애' };
const MEM_CAT: Record<string, string> = { future: 'growth', self: 'growth' };
// 결과 한 줄 — 가장 좋은 두 달의 평균 점수대에 따라
const VERDICT: Record<number, string> = { 5: '강하게 들어옵니다', 4: '또렷하게 열립니다', 3: '서서히 열립니다', 2: '천천히 준비되는 때예요', 1: '쉬어 가며 힘을 모을 때예요' };

// 앞으로 12달의 흐름(이번 달부터)
export function nextMonths(saju: SajuResult, dim: Dim, profileId: string, now = new Date()) {
  const k = kstParts(now);
  return Array.from({ length: 12 }, (_, i) => {
    const m0 = k.month - 1 + i;
    const y = k.year + Math.floor(m0 / 12);
    const m = (m0 % 12) + 1;
    const raw = rawDims(saju, monthlyPillar(new Date(Date.UTC(y, m - 1, 15, 3))), `${y}${m}:${profileId}:p`, 0.25);
    return { year: y, month: m, score: toScore(raw[dim]) };
  });
}

export function pathResult(saju: SajuResult, catId: string, subId: string, q: string, profileId: string, now = new Date(), horizon: Horizon = 6) {
  const cat = PATHS.find((c) => c.id === catId)!;
  const sub = cat.sub.find((s) => s.id === subId)!;
  const dim = (sub.dim ?? cat.dim) as Dim;
  const flow = nextMonths(saju, dim, profileId, now);
  const sorted = [...flow].sort((a, b) => b.score - a.score);
  const label2 = (xs: typeof flow) => {
    const y0 = flow[0].year;
    const byYear = [...new Set(xs.map((x) => x.year))].sort();
    return byYear.map((y) => `${y === y0 ? '' : `${y}년 `}${toRanges(xs.filter((x) => x.year === y).map((x) => x.month))}`).join(', ');
  };
  const goodL = label2(sorted.slice(0, 3));
  const carefulL = label2(sorted.slice(-2));
  const avg = Math.round(flow.slice(0, 6).reduce((s, x) => s + x.score, 0) / 6);
  const band = bandOf(avg);
  const map = sajuMap(saju, profileId, now);
  const area = map.areas.find((a) => a.id === MAP_AREA[cat.id])!;
  const label = DIM_LABEL[dim] ?? cat.label;
  const k = kstParts(now);
  // 고른 기간(3·6·12개월) 안에서 가장 좋은 연속 두 달
  const win = flow.slice(0, horizon);
  let bi = 0;
  for (let i = 1; i < win.length - 1; i++) if (win[i].score + win[i + 1].score > win[bi].score + win[bi + 1].score) bi = i;
  const b1 = win[bi], b2 = win[bi + 1];
  const ym = (x: { year: number; month: number }) => `${x.year}년 ${x.month}월`;
  const bestLabel = b1.year === b2.year ? `${b1.year}년 ${b1.month}월 ~ ${b2.month}월` : `${ym(b1)} ~ ${ym(b2)}`;
  const half = b1.month <= 6 ? '상반기' : '하반기';
  const verdict = `${b1.year}년 ${half}에\n'${V_SUB[sub.id] ?? V_DIM[dim] ?? cat.label}운이 ${VERDICT[bandOf(Math.round((b1.score + b2.score) / 2))]}.'`;
  const chart = flow.slice(0, Math.max(4, horizon));
  const date = `${k.year}.${String(k.month).padStart(2, '0')}.${String(k.day).padStart(2, '0')}`;
  return {
    cat: { id: cat.id, label: cat.label }, sub: { id: sub.id, label: sub.label }, q,
    dim, label, flow, avg, band,
    mood: (P.mood as Record<string, string>)[band],
    headline: `앞으로 6개월, ${label}의 흐름은 ${(P.mood as Record<string, string>)[band]}이에요.`,
    good: goodL, careful: carefulL,
    goodIdx: sorted.slice(0, 3).map((x) => flow.indexOf(x) + 1), carefulIdx: sorted.slice(-2).map((x) => flow.indexOf(x) + 1),
    reason: area.line,
    horizon, when: PATH_WHEN[String(horizon) as '3' | '6' | '12'], best: bestLabel, bestIdx: [bi + 1, bi + 2], verdict, chart,
    hints: pickN((P.hints as Record<string, string[]>)[cat.id], 3, `${profileId}:${subId}:${q}`),
    product: sub.product,
    memory: { category: MEM_CAT[catId] ?? catId, title: `${sub.label} — ${q}`, summary: `${date} · ${cat.label} · ${sub.label}, '${q}' 고민을 고민의 길에서 살펴봄`, sajuNote: `가장 좋은 시기 ${bestLabel} / 신중한 시기 ${carefulL}` },
    friendPrompt: `${sub.label} 고민이에요. "${q}" 에 대해 더 이야기하고 싶어요.`,
  };
}
export type PathResult = ReturnType<typeof pathResult>;

// 홈 "지금 주목해볼 길" 1~2개 — 나이대 기본 관심 + 올해 흐름이 강한 분야 + 기록이 많은 분야
export function recommendPaths(saju: SajuResult, profileId: string, recentCategories: string[] = [], now = new Date()) {
  const age = kstParts(now).year - saju.solarDate.year + 1;
  const base: Record<string, number> = age < 30 ? { love: 3, work: 2.5, future: 2.2, self: 2, money: 1.5, family: 1 }
    : age < 40 ? { work: 3, money: 2.5, love: 2, family: 2, self: 1.5, future: 1.2 }
    : { money: 3, family: 2.5, work: 2, self: 1.5, love: 1, future: 0.8 };
  const score = PATHS.map((c) => {
    const f = nextMonths(saju, c.dim, profileId, now).slice(0, 3);
    const lift = f.reduce((s, x) => s + x.score, 0) / 3 / 30;
    const rec = recentCategories.filter((x) => x === c.id).length * 0.8;
    return { id: c.id, label: c.label, icon: c.icon, s: base[c.id] + lift + rec };
  }).sort((a, b) => b.s - a.s);
  return score.slice(0, 2).map(({ id, label, icon }) => ({ id, label, icon }));
}
