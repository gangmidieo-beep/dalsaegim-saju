// 신년운세 무료 미리보기 — 한 해 총운 지수 · 분야별 지수 · 좋은 달 · 키워드 1개. 상세는 유료 풀이(AI).
import { monthlyPillar, yearPillarOf, type SajuResult } from '@dalsaegim/engine';
import { rawDims, toScore, bandOf, pick, tenGodOf } from './core';
import { FIELDS, FIELD_LABEL } from './today';
import { toRanges } from './money';
import T from '../data/today.json' with { type: 'json' };

export function newYearPreview(saju: SajuResult, year: number, profileId: string) {
  const yp = yearPillarOf(new Date(Date.UTC(year, 5, 15, 3)));
  const yRaw = rawDims(saju, yp, `${year}:${profileId}:ny`, 0.2);
  const months = Array.from({ length: 12 }, (_, i) => {
    const r = rawDims(saju, monthlyPillar(new Date(Date.UTC(year, i, 15, 3))), `${year}:${profileId}:ny${i}`, 0.25);
    return { month: i + 1, score: toScore(FIELDS.reduce((s, f) => s + (yRaw[f] * 0.4 + r[f] * 0.6), 0) / FIELDS.length) };
  });
  const total = toScore(FIELDS.reduce((s, f) => s + yRaw[f], 0) / FIELDS.length * 0.5 + months.reduce((s, m) => s + m.score, 0) / 12 / 96 * 5 * 0.5);
  const good = [...months].sort((a, b) => b.score - a.score).slice(0, 3).map((m) => m.month);
  const tg = tenGodOf(saju, yp);
  return {
    year, yearPillar: yp, total, band: bandOf(total), months, good: toRanges(good),
    fields: FIELDS.map((f) => ({ id: f, label: FIELD_LABEL[f], score: toScore(yRaw[f]) })),
    keyword: pick((T.keywords as Record<string, string[]>)[tg], `${year}:${profileId}:kw`),
    tenGod: tg,
  };
}
