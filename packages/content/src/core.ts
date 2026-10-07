// 달새김 계산 공통 — 시드·고르기·점수. AI 호출 없음. 같은 사람·같은 날·같은 항목은 항상 같은 결과.
import { calcSaju, relation, branchRelations, kstParts, type SajuResult, type Pillar } from '@dalsaegim/engine';
import W from '../data/weights.json' with { type: 'json' };

export type { SajuResult, Pillar };
export type ProfileInput = {
  id: string; year: number; month: number; day: number; hour: number | null;
  calendar: 'solar' | 'lunar'; leap: boolean; gender: 'M' | 'F';
};
export const sajuOf = (p: ProfileInput) =>
  calcSaju({ year: p.year, month: p.month, day: p.day, hour: p.hour, calendar: p.calendar, leapMonth: p.leap, gender: p.gender, timeUnknown: p.hour == null });

/* ---------- 시드 ---------- */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  // 마무리 섞기(비슷한 문자열이 비슷한 값이 되지 않게)
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
export const rand = (seed: string) => hash(seed) / 4294967296;
export const pick = <T>(arr: readonly T[], seed: string): T => arr[hash(seed) % arr.length];
export function pickN<T>(arr: readonly T[], n: number, seed: string): T[] {
  return arr.map((_, i) => i).sort((a, b) => hash(`${seed}:${a}`) - hash(`${seed}:${b}`)).slice(0, n).map((i) => arr[i]);
}
export const ymd = (d: Date) => { const k = kstParts(d); return `${k.year}${String(k.month).padStart(2, '0')}${String(k.day).padStart(2, '0')}`; };
export const kstYear = (d: Date) => kstParts(d).year;

/* ---------- 점수 ----------
   차원(dim) 점수 = 기본 3 + 천간 십신 가중치 + 지지 십신(×0.4) + 원국 일지·연지와의 합충 + 12운성 + 부족한 오행이 들어오는지.
   차원 목록과 가중치는 data/weights.json — 코드에서 숫자를 바꾸지 않는다. */
export type Dim = keyof typeof W.tenGod['비견'];
export const DIMS = Object.keys(W.tenGod['비견']) as Dim[];
export function rawDims(saju: SajuResult, target: Pillar, seed: string, jitter = W.jitter): Record<Dim, number> {
  const rel = relation(saju, target);
  const tg = W.tenGod as Record<string, Record<Dim, number>>;
  const out = {} as Record<Dim, number>;
  const er = saju.elementRatio;
  const te = rel.targetElement;
  const elem = er.missing.includes(te) ? W.element.missing : te === er.weakest ? W.element.weakest : te === er.strongest ? W.element.strongest : 0;
  const stage = (W.twelveStage as Record<string, number>)[rel.twelveStage] ?? 0;
  for (const d of DIMS) {
    let x = W.base + (tg[rel.tenGod]?.[d] ?? 0) + (tg[rel.branchTenGod]?.[d] ?? 0) * W.branchTenGodFactor + stage * W.stageFactor + elem;
    for (const [pillar, weight] of Object.entries(W.pillarWeight)) {
      const p = saju.pillars[pillar as 'day' | 'year'];
      if (!p) continue;
      for (const r of branchRelations(p.branch, target.branch)) x += ((W.branch as Record<string, Record<string, number>>)[r]?.[d] ?? 0) * weight;
    }
    x += (rand(`${seed}:${d}`) * 2 - 1) * jitter;
    out[d] = x;
  }
  return out;
}
// 원점수(대략 1~5.5) → 55~96점
export const toScore = (raw: number) => Math.max(W.score.min, Math.min(W.score.max, Math.round(W.score.min + ((raw - W.score.rawMin) / (W.score.rawMax - W.score.rawMin)) * (W.score.max - W.score.min))));
export const toStars = (raw: number) => Math.max(1, Math.min(5, Math.round(raw))) as 1 | 2 | 3 | 4 | 5;
export type Band = '1' | '2' | '3' | '4' | '5';
export const bandOf = (score: number): Band => String(1 + W.bands.filter((b) => score > b).length) as Band;
export const tenGodOf = (saju: SajuResult, target: Pillar) => relation(saju, target).tenGod as string;
export const ELEMENT_KO = ['목', '화', '토', '금', '수'] as const;
export const ELEMENT_NAME: Record<string, string> = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' };
// 부족한(없으면 가장 약한) 오행
export const needElement = (saju: SajuResult) => (saju.elementRatio.missing[0] ?? saju.elementRatio.weakest) as string;
export const LUCKY = W.lucky as Record<string, { color: string; hex: string; numbers: number[]; direction: string; item: string }>;
