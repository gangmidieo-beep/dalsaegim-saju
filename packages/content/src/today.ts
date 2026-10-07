// 오늘의 운세 · 이번 달 미리보기 — 엔진 계산 + 문구 DB(달새김 말투). AI 없음.
import { dailyPillar, monthlyPillar, kstParts, lunarOf, type SajuResult } from '@dalsaegim/engine';
import { rawDims, toScore, toStars, bandOf, pick, pickN, ymd, tenGodOf, needElement, LUCKY, type Band } from './core';
import T from '../data/today.json' with { type: 'json' };

// 화면 순서: 연애 · 재물 · 직장 · 건강
export const FIELDS = ['love', 'wealth', 'work', 'health'] as const;
export type Field = (typeof FIELDS)[number];
export const FIELD_LABEL: Record<Field, string> = { love: '연애운', wealth: '재물운', work: '직장운', health: '건강운' };
const TOTAL_W: Record<Field, number> = { love: 0.25, wealth: 0.27, work: 0.28, health: 0.2 };

export function todayFortune(saju: SajuResult, date: Date, profileId: string) {
  const seed = `${ymd(date)}:${profileId}`;
  const dp = dailyPillar(date);
  const raw = rawDims(saju, dp, seed);
  const total = toScore(FIELDS.reduce((s, f) => s + raw[f] * TOTAL_W[f], 0));
  const band = bandOf(total);
  const F = T.fields as Record<Field, { summary: Record<Band, string[]>; detail: Record<Band, string[]> }>;
  const fields = Object.fromEntries(FIELDS.map((f) => {
    const stars = toStars(raw[f]);
    const b = String(stars) as Band;
    const adv = (T.advice as Record<Field, { do: string[]; avoid: string[] }>)[f];
    return [f, {
      stars, score: toScore(raw[f]),
      summary: pick(F[f].summary[b], `${seed}:${f}:s`),
      detail: pickN(F[f].detail[b], 2, `${seed}:${f}:d`),
      do: pick(adv.do, `${seed}:${f}:do`), avoid: pick(adv.avoid, `${seed}:${f}:av`),
    }];
  })) as Record<Field, { stars: 1 | 2 | 3 | 4 | 5; score: number; summary: string; detail: string[]; do: string; avoid: string }>;
  const tg = tenGodOf(saju, dp);
  const el = needElement(saju);
  const L = LUCKY[el];
  return {
    date: ymd(date), total, band, stars: toStars(1 + ((total - 55) / 41) * 4),
    headline: pick((T.headline as Record<Band, string[]>)[band], `${seed}:h`),
    brief: pick((T.brief as Record<Band, string[]>)[band], `${seed}:b`),
    word: pick((T.word as Record<Band, string[]>)[band], `${seed}:w`),
    keyword: pick((T.keywords as Record<string, string[]>)[tg], `${seed}:k`),
    fields,
    lucky: { element: el, color: L.color, hex: L.hex, number: pick(L.numbers, `${seed}:n`), direction: L.direction, item: L.item },
    dayPillar: dp, tenGod: tg, lunar: lunarOf(date), timeUnknown: saju.timeUnknown,
  };
}
export type TodayFortune = ReturnType<typeof todayFortune>;

export function monthFortune(saju: SajuResult, date: Date, profileId: string) {
  const k = kstParts(date);
  const mp = monthlyPillar(date);
  const seed = `${k.year}${k.month}:${profileId}:m`;
  const raw = rawDims(saju, mp, seed);
  const total = toScore(FIELDS.reduce((s, f) => s + raw[f] * TOTAL_W[f], 0));
  const band = bandOf(total);
  return {
    year: k.year, month: k.month, pillar: mp, total, band,
    line: pick((T.month as Record<Band, string[]>)[band], seed),
    keyword: pick((T.keywords as Record<string, string[]>)[tenGodOf(saju, mp)], `${seed}:k`),
    fields: Object.fromEntries(FIELDS.map((f) => [f, toScore(raw[f])])) as Record<Field, number>,
  };
}
